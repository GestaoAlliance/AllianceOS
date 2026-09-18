
create or replace function public.migrar_responsavel_legado(
  p_legacy_name text,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_profile public.profiles%rowtype;
  v_tasks jsonb;
  v_task jsonb;
  v_out jsonb := '[]'::jsonb;
  v_assignees jsonb;
  v_ids jsonb;
  v_count integer := 0;
  v_now timestamptz := now();
begin
  if auth.uid() is null or not app.sou_admin() then
    raise exception 'Esta ação exige papel de administrador.';
  end if;
  if nullif(trim(p_legacy_name),'') is null then
    raise exception 'Nome legado é obrigatório.';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_profile_id and ativo
  for share;

  if not found then
    raise exception 'Usuário real não encontrado ou inativo.';
  end if;

  select valor into v_tasks
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null
  for update;

  if v_tasks is null or jsonb_typeof(v_tasks) <> 'array' then
    raise exception 'Estado de tarefas não encontrado.';
  end if;

  for v_task in select value from jsonb_array_elements(v_tasks)
  loop
    if exists (
      select 1
      from jsonb_array_elements_text(coalesce(v_task->'assignees','[]'::jsonb)) a(value)
      where lower(trim(a.value)) = lower(trim(p_legacy_name))
    ) then
      select coalesce(jsonb_agg(
        case when lower(trim(a.value)) = lower(trim(p_legacy_name))
             then to_jsonb(v_profile.nome)
             else to_jsonb(a.value) end
      ), '[]'::jsonb)
      into v_assignees
      from jsonb_array_elements_text(coalesce(v_task->'assignees','[]'::jsonb)) a(value);

      v_ids := coalesce(v_task->'assigneeIds','[]'::jsonb);
      if not exists (
        select 1 from jsonb_array_elements_text(v_ids) x(value)
        where x.value = p_profile_id::text
      ) then
        v_ids := v_ids || to_jsonb(p_profile_id::text);
      end if;

      v_task := v_task
        || jsonb_build_object('assignees',v_assignees,'assigneeIds',v_ids)
        || jsonb_build_object(
          'history',
          jsonb_build_array(jsonb_build_object(
            'at', v_now::text,
            'text', 'Responsável legado "'||trim(p_legacy_name)||'" vinculado a '||v_profile.nome||' pela Administração.'
          )) || coalesce(v_task->'history','[]'::jsonb)
        );
      v_count := v_count + 1;
    end if;
    v_out := v_out || jsonb_build_array(v_task);
  end loop;

  if v_count > 0 then
    update public.operacional_estado
      set valor=v_out, atualizado_em=v_now
    where chave='central.tasks.vitor-gutierrez' and dono is null;
  end if;

  insert into public.legacy_member_links(legacy_name,profile_id,migrado_por,migrado_em,tarefas_migradas)
  values(trim(p_legacy_name),p_profile_id,auth.uid(),v_now,v_count)
  on conflict(legacy_name) do update set
    profile_id=excluded.profile_id,
    migrado_por=excluded.migrado_por,
    migrado_em=excluded.migrado_em,
    tarefas_migradas=excluded.tarefas_migradas;

  insert into public.notifications(user_id,actor_id,kind,title,body,event_key)
  values(
    p_profile_id, auth.uid(), 'legacy_migration',
    'Tarefas migradas para sua conta',
    v_count||' tarefa(s) vinculada(s) à sua conta.',
    'legacy:'||lower(trim(p_legacy_name))||':'||p_profile_id::text
  )
  on conflict do nothing;

  insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
  values(
    auth.uid(),'interface','migrar_responsavel_legado','membro',p_profile_id::text,
    jsonb_build_object('nome_legado',trim(p_legacy_name),'tarefas_migradas',v_count)
  );

  return jsonb_build_object(
    'nome_legado',trim(p_legacy_name),
    'usuario',jsonb_build_object('id',v_profile.id,'nome',v_profile.nome,'email',v_profile.email),
    'tarefas_migradas',v_count
  );
end
$$;

revoke all on function public.migrar_responsavel_legado(text,uuid) from public;
revoke execute on function public.migrar_responsavel_legado(text,uuid) from anon;
grant execute on function public.migrar_responsavel_legado(text,uuid) to authenticated;

create or replace function public.consolidar_lista_em_destino(
  p_source_list uuid,
  p_dest_list uuid
)
returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
declare
  v_source public.task_lists%rowtype;
  v_dest public.task_lists%rowtype;
  v_source_brand text;
  v_dest_brand text;
  v_tasks jsonb;
  v_task jsonb;
  v_out jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_now timestamptz := now();
begin
  if auth.uid() is null or not app.sou_admin() then
    raise exception 'Esta ação exige papel de administrador.';
  end if;
  if p_source_list = p_dest_list then
    raise exception 'A lista de origem e a lista de destino devem ser diferentes.';
  end if;

  select * into v_source
  from public.task_lists
  where id=p_source_list
  for update;
  if not found then raise exception 'Lista de origem não encontrada.'; end if;
  select nome into v_source_brand from public.brands where id=v_source.brand_id;

  select * into v_dest
  from public.task_lists
  where id=p_dest_list and arquivado_em is null
  for share;
  if not found then raise exception 'Lista de destino não encontrada ou arquivada.'; end if;
  select nome into v_dest_brand from public.brands where id=v_dest.brand_id;

  select valor into v_tasks
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null
  for update;
  if v_tasks is null or jsonb_typeof(v_tasks) <> 'array' then
    raise exception 'Estado de tarefas não encontrado.';
  end if;

  for v_task in select value from jsonb_array_elements(v_tasks)
  loop
    if (
      v_task->>'listId' = p_source_list::text
      or (
        coalesce(v_task->>'listId','') = ''
        and lower(trim(coalesce(v_task->>'project','Operação'))) = lower(trim(v_source.nome))
        and lower(trim(coalesce(v_task->>'brand',''))) = lower(trim(v_source_brand))
      )
    ) then
      v_task := v_task
        || jsonb_build_object(
          'listId',v_dest.id::text,
          'project',v_dest.nome,
          'brand',v_dest_brand,
          'campaignId',v_dest.campanha_id
        )
        || jsonb_build_object(
          'history',
          jsonb_build_array(jsonb_build_object(
            'at',v_now::text,
            'text','Tarefa movida da lista "'||v_source.nome||'" para "'||v_dest.nome||'" pela limpeza administrativa.'
          )) || coalesce(v_task->'history','[]'::jsonb)
        );
      v_count := v_count + 1;
    end if;
    v_out := v_out || jsonb_build_array(v_task);
  end loop;

  if v_count = 0 then
    raise exception 'Nenhuma tarefa foi encontrada na lista de origem.';
  end if;

  update public.operacional_estado
    set valor=v_out, atualizado_em=v_now
  where chave='central.tasks.vitor-gutierrez' and dono is null;

  update public.task_lists
    set arquivado_em=v_now, arquivado_por=auth.uid(), atualizado_em=v_now
  where id=p_source_list;

  insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
  values(
    auth.uid(),'interface','consolidar_lista','lista',p_source_list::text,
    jsonb_build_object(
      'lista_origem',v_source.nome,
      'lista_destino_id',v_dest.id,
      'lista_destino',v_dest.nome,
      'tarefas_movidas',v_count
    )
  );

  return jsonb_build_object(
    'lista_origem',jsonb_build_object('id',v_source.id,'nome',v_source.nome),
    'lista_destino',jsonb_build_object('id',v_dest.id,'nome',v_dest.nome),
    'tarefas_movidas',v_count,
    'origem_arquivada',true
  );
end
$$;

revoke all on function public.consolidar_lista_em_destino(uuid,uuid) from public;
revoke execute on function public.consolidar_lista_em_destino(uuid,uuid) from anon;
grant execute on function public.consolidar_lista_em_destino(uuid,uuid) to authenticated;

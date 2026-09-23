create or replace function app.close_expired_campaigns()
returns jsonb
language plpgsql
security definer
set search_path = 'public','app','pg_temp'
as $function$
declare
  v_state jsonb;
  v_out jsonb := '[]'::jsonb;
  v_campaign jsonb;
  v_changed boolean := false;
  v_now timestamptz := now();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_end date;
  v_before text;
  v_closed jsonb := '[]'::jsonb;
  v_service uuid := 'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid;
  v_end_raw text;
  v_status_norm text;
begin
  select valor into v_state
  from public.operacional_estado
  where chave='central.campaigns.vitor-gutierrez' and dono is null
  for update;

  if v_state is null or jsonb_typeof(v_state)<>'array' then
    return jsonb_build_object('encerradas',v_closed,'quantidade',0);
  end if;

  for v_campaign in select value from jsonb_array_elements(v_state)
  loop
    v_end := null;
    v_end_raw := coalesce(v_campaign->>'endAt',v_campaign->>'end','');
    begin
      if v_end_raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then
        v_end := left(v_end_raw,10)::date;
      end if;
    exception when others then
      v_end := null;
    end;

    v_before := coalesce(v_campaign->>'status','');
    v_status_norm := translate(lower(v_before),
      'çãáàâäéèêëíìîïóòôöõúùûü',
      'caaaaeeeeiiiiooooouuuu'
    );

    if nullif(v_campaign->>'archivedAt','') is null
       and v_end is not null
       and v_end<v_today
       and v_status_norm='em execucao'
    then
      v_campaign :=
        v_campaign
        || jsonb_build_object(
          'status','encerrada',
          'endedAt',coalesce(nullif(v_campaign->>'endedAt',''),v_now::text)
        )
        || jsonb_build_object(
          'history',
          jsonb_build_array(jsonb_build_object(
            'at',v_now,
            'by','Gestão Alliance',
            'authorId',v_service::text,
            'authorType','servico',
            'origin','job',
            'campo','status',
            'antes',v_before,
            'depois','encerrada',
            'text','status: '||v_before||' → encerrada (data final ultrapassada).'
          )) || coalesce(v_campaign->'history','[]'::jsonb)
        );

      insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
      values(
        v_service,'job','encerrar_campanha_automaticamente','campanha',v_campaign->>'id',
        jsonb_build_object('campo','status','antes',v_before,'depois','encerrada','data_fim',v_end_raw)
      );

      insert into public.notifications(user_id,actor_id,kind,title,body,task_id,event_key)
      select
        p.id,v_service,'campaign_closed',
        'Campanha encerrada: '||coalesce(v_campaign->>'name','Campanha'),
        'A data final da campanha foi ultrapassada.',
        null,
        'campaign-closed:'||(v_campaign->>'id')||':'||v_end_raw
      from public.profiles p
      where p.ativo=true and coalesce(p.tipo_membro,'usuario')='usuario'
      on conflict do nothing;

      v_closed := v_closed || jsonb_build_array(jsonb_build_object(
        'id',v_campaign->>'id','nome',v_campaign->>'name','antes',v_before,
        'depois','encerrada','fim',v_end_raw
      ));
      v_changed := true;
    end if;

    v_out := v_out || jsonb_build_array(v_campaign);
  end loop;

  if v_changed then
    perform alliance_data.commit_operational_payload(
      'central.campaigns.vitor-gutierrez',
      v_out
    );
  end if;

  return jsonb_build_object(
    'encerradas',v_closed,
    'quantidade',jsonb_array_length(v_closed),
    'executado_em',v_now
  );
end
$function$;

create or replace function app.reimport_clickup_batch(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = 'public','app','pg_temp'
as $function$
declare
  v_count int := coalesce(jsonb_array_length(p_rows),0);
  v_actor uuid := 'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid;
  v_out jsonb;
begin
  if jsonb_typeof(p_rows)<>'array' then
    raise exception 'p_rows precisa ser array JSON';
  end if;

  with src as (
    select jsonb_object_agg(r->>'id',r) m
    from jsonb_array_elements(p_rows) r
  ),
  state as (
    select valor
    from public.operacional_estado
    where chave='central.tasks.vitor-gutierrez' and dono is null
    for update
  )
  select jsonb_agg(
    case
      when t->>'source'='clickup-backup' and (select m ? (t->>'id') from src) then
        t
        || jsonb_build_object(
          'description',coalesce((select m->(t->>'id')->>'description' from src),''),
          'assignees',coalesce((select m->(t->>'id')->'assignees' from src),'[]'::jsonb),
          'clickupAssigneeEmails',coalesce((select m->(t->>'id')->'assigneeEmails' from src),'[]'::jsonb),
          'clickupPriorityOriginal',(select m->(t->>'id')->'priority' from src),
          'clickupStatusOriginal',(select m->(t->>'id')->'status' from src),
          'clickupParentOriginal',(select m->(t->>'id')->'parent' from src),
          'clickupUrl',(select m->(t->>'id')->'url' from src),
          'clickupReimportedAt',now()::text
        )
        || case
             when (select m->(t->>'id')->'priority' from src) is not null
             then jsonb_build_object('priority',(select m->(t->>'id')->>'priority' from src))
             else '{}'::jsonb
           end
        || jsonb_build_object(
          'history',
            (case when coalesce(t->>'description','') is distinct from coalesce((select m->(t->>'id')->>'description' from src),'')
               then jsonb_build_array(jsonb_build_object(
                 'at',now(),'by','Gestão Alliance','authorId',v_actor::text,'authorType','servico','origin','job',
                 'campo','descrição','antes',coalesce(t->>'description',''),
                 'depois',coalesce((select m->(t->>'id')->>'description' from src),''),
                 'text','descrição: reimportada do ClickUp pelo ID original.'
               )) else '[]'::jsonb end)
            ||
            (case when (select m->(t->>'id')->'priority' from src) is not null
                       and coalesce(t->>'priority','') is distinct from coalesce((select m->(t->>'id')->>'priority' from src),'')
               then jsonb_build_array(jsonb_build_object(
                 'at',now(),'by','Gestão Alliance','authorId',v_actor::text,'authorType','servico','origin','job',
                 'campo','prioridade','antes',t->>'priority',
                 'depois',(select m->(t->>'id')->>'priority' from src),
                 'text','prioridade: reimportada do ClickUp pelo ID original.'
               )) else '[]'::jsonb end)
            ||
            (case when coalesce(t->'assignees','[]'::jsonb) is distinct from coalesce((select m->(t->>'id')->'assignees' from src),'[]'::jsonb)
               then jsonb_build_array(jsonb_build_object(
                 'at',now(),'by','Gestão Alliance','authorId',v_actor::text,'authorType','servico','origin','job',
                 'campo','responsáveis','antes',coalesce(t->'assignees','[]'::jsonb),
                 'depois',coalesce((select m->(t->>'id')->'assignees' from src),'[]'::jsonb),
                 'text','responsáveis: reimportados do ClickUp pelo ID original.'
               )) else '[]'::jsonb end)
            || coalesce(t->'history','[]'::jsonb)
        )
      else t
    end
    order by ord
  )
  into v_out
  from state,lateral jsonb_array_elements(state.valor) with ordinality e(t,ord);

  perform alliance_data.commit_operational_payload(
    'central.tasks.vitor-gutierrez',
    coalesce(v_out,'[]'::jsonb)
  );

  insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
  values(
    v_actor,'job','reimportar_dados_clickup','tarefa_lote',
    'clickup-batch-'||extract(epoch from now())::bigint,
    jsonb_build_object(
      'tarefas_reimportadas',v_count,
      'fonte','ClickUp conectado',
      'preservou_ids',true,
      'criou_duplicatas',false,
      'write_authority','alliance_data'
    )
  );

  return jsonb_build_object('reimportadas',v_count);
end
$function$;

create or replace function app.sync_profile_assignees_from_clickup()
returns trigger
language plpgsql
security definer
set search_path = 'public','app','pg_temp'
as $function$
declare
  v_inv public.equipe_convites%rowtype;
  v_changed int := 0;
  v_out jsonb;
begin
  if not coalesce(new.ativo,false) or coalesce(new.tipo_membro,'usuario')<>'usuario' then
    return new;
  end if;

  select * into v_inv
  from public.equipe_convites
  where lower(email)=lower(new.email);

  with state as (
    select valor
    from public.operacional_estado
    where chave='central.tasks.vitor-gutierrez' and dono is null
    for update
  )
  select
    jsonb_agg(
      case
        when t->>'source'='clickup-backup'
         and (
           exists(
             select 1 from jsonb_array_elements_text(coalesce(t->'clickupAssigneeEmails','[]'::jsonb)) e
             where lower(e)=lower(new.email)
           )
           or exists(
             select 1 from jsonb_array_elements_text(coalesce(t->'assignees','[]'::jsonb)) a
             where lower(trim(a)) in (
               lower(trim(coalesce(v_inv.nome_clickup,''))),
               lower(trim(coalesce(v_inv.nome,'')))
             )
             and trim(coalesce(v_inv.nome,''))<>''
           )
         )
         and not exists(
           select 1 from jsonb_array_elements_text(coalesce(t->'assigneeIds','[]'::jsonb)) i
           where i=new.id::text
         )
        then
          t
          || jsonb_build_object(
            'assigneeIds',
            coalesce(t->'assigneeIds','[]'::jsonb) || jsonb_build_array(new.id::text)
          )
          || jsonb_build_object(
            'history',
            jsonb_build_array(jsonb_build_object(
              'at',now(),
              'by','Gestão Alliance',
              'authorId','a02201ec-96d3-433f-b779-b81a4ee10066',
              'authorType','servico',
              'origin','job',
              'campo','responsável',
              'antes',coalesce(t->'assigneeIds','[]'::jsonb),
              'depois',coalesce(t->'assigneeIds','[]'::jsonb)||jsonb_build_array(new.id::text),
              'text','responsável legado vinculado automaticamente ao usuário real '||new.nome||'.'
            )) || coalesce(t->'history','[]'::jsonb)
          )
        else t
      end
      order by ord
    ),
    count(*) filter (
      where t->>'source'='clickup-backup'
        and (
          exists(
            select 1 from jsonb_array_elements_text(coalesce(t->'clickupAssigneeEmails','[]'::jsonb)) e
            where lower(e)=lower(new.email)
          )
          or exists(
            select 1 from jsonb_array_elements_text(coalesce(t->'assignees','[]'::jsonb)) a
            where lower(trim(a)) in (
              lower(trim(coalesce(v_inv.nome_clickup,''))),
              lower(trim(coalesce(v_inv.nome,'')))
            )
            and trim(coalesce(v_inv.nome,''))<>''
          )
        )
        and not exists(
          select 1 from jsonb_array_elements_text(coalesce(t->'assigneeIds','[]'::jsonb)) i
          where i=new.id::text
        )
    )
  into v_out,v_changed
  from state,lateral jsonb_array_elements(state.valor) with ordinality e(t,ord);

  if coalesce(v_changed,0)>0 then
    perform alliance_data.commit_operational_payload(
      'central.tasks.vitor-gutierrez',
      coalesce(v_out,'[]'::jsonb)
    );

    insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
    values(
      'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid,
      'job',
      'migrar_responsavel_legado_automaticamente',
      'membro',
      new.id::text,
      jsonb_build_object(
        'email',new.email,
        'nome',new.nome,
        'tarefas_migradas',v_changed,
        'write_authority','alliance_data'
      )
    );
  end if;

  return new;
end
$function$;

create or replace function public.consolidar_lista_em_destino(
  p_source_list uuid,
  p_dest_list uuid
)
returns jsonb
language plpgsql
set search_path = 'public','pg_temp'
as $function$
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
  if p_source_list=p_dest_list then
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
  if v_tasks is null or jsonb_typeof(v_tasks)<>'array' then
    raise exception 'Estado de tarefas não encontrado.';
  end if;

  for v_task in select value from jsonb_array_elements(v_tasks)
  loop
    if (
      v_task->>'listId'=p_source_list::text
      or (
        coalesce(v_task->>'listId','')=''
        and lower(trim(coalesce(v_task->>'project','Operação')))=lower(trim(v_source.nome))
        and lower(trim(coalesce(v_task->>'brand','')))=lower(trim(v_source_brand))
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
      v_count := v_count+1;
    end if;
    v_out := v_out || jsonb_build_array(v_task);
  end loop;

  if v_count=0 then
    raise exception 'Nenhuma tarefa foi encontrada na lista de origem.';
  end if;

  perform alliance_data.commit_operational_payload(
    'central.tasks.vitor-gutierrez',
    v_out
  );

  update public.task_lists
     set arquivado_em=v_now,
         arquivado_por=auth.uid(),
         atualizado_em=v_now
   where id=p_source_list;

  insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
  values(
    auth.uid(),'interface','consolidar_lista','lista',p_source_list::text,
    jsonb_build_object(
      'lista_origem',v_source.nome,
      'lista_destino_id',v_dest.id,
      'lista_destino',v_dest.nome,
      'tarefas_movidas',v_count,
      'write_authority','alliance_data'
    )
  );

  return jsonb_build_object(
    'lista_origem',jsonb_build_object('id',v_source.id,'nome',v_source.nome),
    'lista_destino',jsonb_build_object('id',v_dest.id,'nome',v_dest.nome),
    'tarefas_movidas',v_count,
    'origem_arquivada',true
  );
end
$function$;

create or replace function public.migrar_responsavel_legado(
  p_legacy_name text,
  p_profile_id uuid
)
returns jsonb
language plpgsql
set search_path = 'public','pg_temp'
as $function$
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
  where id=p_profile_id and ativo
  for share;

  if not found then
    raise exception 'Usuário real não encontrado ou inativo.';
  end if;

  select valor into v_tasks
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null
  for update;

  if v_tasks is null or jsonb_typeof(v_tasks)<>'array' then
    raise exception 'Estado de tarefas não encontrado.';
  end if;

  for v_task in select value from jsonb_array_elements(v_tasks)
  loop
    if exists(
      select 1
      from jsonb_array_elements_text(coalesce(v_task->'assignees','[]'::jsonb)) a(value)
      where lower(trim(a.value))=lower(trim(p_legacy_name))
    ) then
      select coalesce(jsonb_agg(
        case when lower(trim(a.value))=lower(trim(p_legacy_name))
             then to_jsonb(v_profile.nome)
             else to_jsonb(a.value) end
      ),'[]'::jsonb)
      into v_assignees
      from jsonb_array_elements_text(coalesce(v_task->'assignees','[]'::jsonb)) a(value);

      v_ids := coalesce(v_task->'assigneeIds','[]'::jsonb);
      if not exists(
        select 1 from jsonb_array_elements_text(v_ids) x(value)
        where x.value=p_profile_id::text
      ) then
        v_ids := v_ids || to_jsonb(p_profile_id::text);
      end if;

      v_task := v_task
        || jsonb_build_object('assignees',v_assignees,'assigneeIds',v_ids)
        || jsonb_build_object(
          'history',
          jsonb_build_array(jsonb_build_object(
            'at',v_now::text,
            'text','Responsável legado "'||trim(p_legacy_name)||'" vinculado a '||v_profile.nome||' pela Administração.'
          )) || coalesce(v_task->'history','[]'::jsonb)
        );
      v_count := v_count+1;
    end if;
    v_out := v_out || jsonb_build_array(v_task);
  end loop;

  if v_count>0 then
    perform alliance_data.commit_operational_payload(
      'central.tasks.vitor-gutierrez',
      v_out
    );
  end if;

  insert into public.legacy_member_links(
    legacy_name,profile_id,migrado_por,migrado_em,tarefas_migradas
  )
  values(trim(p_legacy_name),p_profile_id,auth.uid(),v_now,v_count)
  on conflict(legacy_name) do update set
    profile_id=excluded.profile_id,
    migrado_por=excluded.migrado_por,
    migrado_em=excluded.migrado_em,
    tarefas_migradas=excluded.tarefas_migradas;

  insert into public.notifications(user_id,actor_id,kind,title,body,event_key)
  values(
    p_profile_id,auth.uid(),'legacy_migration',
    'Tarefas migradas para sua conta',
    v_count||' tarefa(s) vinculada(s) à sua conta.',
    'legacy:'||lower(trim(p_legacy_name))||':'||p_profile_id::text
  )
  on conflict do nothing;

  insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
  values(
    auth.uid(),'interface','migrar_responsavel_legado','membro',p_profile_id::text,
    jsonb_build_object(
      'nome_legado',trim(p_legacy_name),
      'tarefas_migradas',v_count,
      'write_authority','alliance_data'
    )
  );

  return jsonb_build_object(
    'nome_legado',trim(p_legacy_name),
    'usuario',jsonb_build_object(
      'id',v_profile.id,'nome',v_profile.nome,'email',v_profile.email
    ),
    'tarefas_migradas',v_count
  );
end
$function$;

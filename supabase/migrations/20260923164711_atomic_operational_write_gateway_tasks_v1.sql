create or replace function alliance_data.commit_operational_payload(
  p_source_key text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_rows integer;
  v_status alliance_data.sync_status%rowtype;
begin
  if p_source_key not in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    raise exception 'Fonte operacional não suportada: %', p_source_key;
  end if;

  if jsonb_typeof(coalesce(p_payload,'[]'::jsonb)) <> 'array' then
    raise exception 'Payload operacional deve ser um array JSON.';
  end if;

  update public.operacional_estado
     set valor = coalesce(p_payload,'[]'::jsonb),
         atualizado_em = clock_timestamp()
   where chave = p_source_key
     and dono is null;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'Estado operacional canônico ausente ou duplicado para %', p_source_key;
  end if;

  select *
    into v_status
  from alliance_data.sync_status
  where source_key = p_source_key;

  if v_status.source_key is null
     or not coalesce(v_status.in_sync,false)
     or v_status.source_count is distinct from v_status.mirror_count
     or v_status.source_hash is distinct from v_status.mirror_hash
  then
    raise exception 'Espelho operacional não confirmou consistência para %', p_source_key;
  end if;

  return coalesce(p_payload,'[]'::jsonb);
end
$function$;

revoke all on function alliance_data.commit_operational_payload(text,jsonb)
from public, anon, authenticated;
grant execute on function alliance_data.commit_operational_payload(text,jsonb)
to service_role;

create or replace function alliance_data.mirror_operacional_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_old_key text;
  v_new_key text;
  v_key text;
  v_error text;
  v_strict boolean := false;
  v_strict_flag text;
begin
  if tg_op <> 'INSERT' then v_old_key := old.chave; end if;
  if tg_op <> 'DELETE' then v_new_key := new.chave; end if;

  if v_old_key in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    v_key := v_old_key;
  elsif v_new_key in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    v_key := v_new_key;
  else
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  v_strict_flag := case v_key
    when 'central.tasks.vitor-gutierrez' then 'tasks_mirror_strict_write'
    when 'central.campaigns.vitor-gutierrez' then 'campaigns_mirror_strict_write'
    when 'central.deliveries.workspace.v1' then 'deliveries_mirror_strict_write'
    else null
  end;

  if v_strict_flag is not null then
    select f.enabled
      into v_strict
    from public.system_feature_flags f
    where f.key = v_strict_flag;
  end if;

  begin
    perform alliance_data.refresh_operational_mirror(v_key);
    if v_new_key is distinct from v_old_key
       and v_new_key in (
         'central.tasks.vitor-gutierrez',
         'central.campaigns.vitor-gutierrez',
         'central.deliveries.workspace.v1'
       ) then
      perform alliance_data.refresh_operational_mirror(v_new_key);
    end if;
  exception when others then
    v_error := sqlerrm;
    begin
      insert into alliance_data.sync_status (
        source_key, entity, in_sync, last_error, last_error_at, updated_at
      ) values (
        coalesce(v_new_key,v_old_key,'unknown'),
        case
          when coalesce(v_new_key,v_old_key)='central.tasks.vitor-gutierrez' then 'tasks'
          when coalesce(v_new_key,v_old_key)='central.campaigns.vitor-gutierrez' then 'campaigns'
          when coalesce(v_new_key,v_old_key)='central.deliveries.workspace.v1' then 'deliveries'
          else 'unknown'
        end,
        false, v_error, clock_timestamp(), clock_timestamp()
      )
      on conflict (source_key) do update set
        in_sync=false,
        last_error=excluded.last_error,
        last_error_at=excluded.last_error_at,
        updated_at=excluded.updated_at;
    exception when others then null;
    end;

    if coalesce(v_strict,false) then
      raise;
    end if;

    raise warning 'Alliance data mirror failed for %: %', coalesce(v_new_key,v_old_key), v_error;
  end;

  if tg_op='DELETE' then return old; end if;
  return new;
end
$function$;

insert into public.system_feature_flags(key,enabled,config,updated_at)
values
(
  'tasks_mirror_strict_write',
  true,
  jsonb_build_object(
    'mode','atomic',
    'source_key','central.tasks.vitor-gutierrez',
    'rollback_on_mirror_error',true,
    'enabled_at',now()
  ),
  now()
),
(
  'campaigns_mirror_strict_write',
  false,
  jsonb_build_object(
    'mode','shadow',
    'source_key','central.campaigns.vitor-gutierrez',
    'rollback_on_mirror_error',true
  ),
  now()
),
(
  'deliveries_mirror_strict_write',
  false,
  jsonb_build_object(
    'mode','shadow',
    'source_key','central.deliveries.workspace.v1',
    'rollback_on_mirror_error',true
  ),
  now()
)
on conflict (key) do update
set enabled=excluded.enabled,
    config=excluded.config,
    updated_at=excluded.updated_at;

create or replace function public.salvar_tarefas_acessiveis(p_tasks jsonb)
returns jsonb
language plpgsql
security definer
set search_path = 'public','app','pg_catalog'
as $function$
declare
  v_current jsonb := '[]'::jsonb;
  v_preserved jsonb := '[]'::jsonb;
  v_merged jsonb := '[]'::jsonb;
  v_allowed text[];
begin
  if not app.estou_ativo() or app.eh_externo() then
    raise exception 'Sem permissão para alterar tarefas.';
  end if;

  if jsonb_typeof(coalesce(p_tasks,'[]'::jsonb)) <> 'array' then
    raise exception 'Formato inválido de tarefas.';
  end if;

  select coalesce(valor,'[]'::jsonb)
    into v_current
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null
  for update;

  if app.sou_admin() then
    perform alliance_data.commit_operational_payload(
      'central.tasks.vitor-gutierrez',
      coalesce(p_tasks,'[]'::jsonb)
    );
    return coalesce(p_tasks,'[]'::jsonb);
  end if;

  select array_agg(lower(nome))
    into v_allowed
  from public.brands
  where ativo=true and app.pode_acessar_marca(id);

  if coalesce(array_length(v_allowed,1),0)=0 then
    raise exception 'Nenhuma marca disponível para esta conta.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_tasks,'[]'::jsonb)) t
    where lower(coalesce(t->>'brand','')) <> all(v_allowed)
  ) then
    raise exception 'A tentativa contém tarefas de uma marca sem acesso.';
  end if;

  select coalesce(jsonb_agg(t),'[]'::jsonb)
    into v_preserved
  from jsonb_array_elements(coalesce(v_current,'[]'::jsonb)) t
  where lower(coalesce(t->>'brand','')) <> all(v_allowed);

  v_merged := coalesce(v_preserved,'[]'::jsonb) || coalesce(p_tasks,'[]'::jsonb);

  perform alliance_data.commit_operational_payload(
    'central.tasks.vitor-gutierrez',
    v_merged
  );

  return coalesce(p_tasks,'[]'::jsonb);
end;
$function$;

revoke execute on function public.salvar_tarefas_acessiveis(jsonb)
from public, anon;
grant execute on function public.salvar_tarefas_acessiveis(jsonb)
to authenticated, service_role;

update alliance_data.data_catalog
set metadata = coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object(
    'write_gateway','alliance_data.commit_operational_payload',
    'strict_write',true,
    'write_mode','atomic_dual_write',
    'write_authority','operacional_estado'
  ),
  notes='Leitura pelo espelho e escrita atômica: operacional_estado continua autoridade, mas a transação só confirma quando o mirror alliance_data fica consistente.',
  updated_at=now()
where id='operation.tasks';

-- AllianceOS operational data atomic cutover checkpoint
-- Safe/idempotent checkpoint for tasks, campaigns and deliveries.

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

drop trigger if exists alliance_data_operational_mirror on public.operacional_estado;
create trigger alliance_data_operational_mirror
after insert or update or delete on public.operacional_estado
for each row execute function alliance_data.mirror_operacional_estado();

insert into public.system_feature_flags(key,enabled,config,updated_at)
values
('tasks_mirror_read',true,jsonb_build_object('rollout','tasks-read-only','fallback','operacional_estado','source_key','central.tasks.vitor-gutierrez','require_hash_match',true),now()),
('campaigns_mirror_read',true,jsonb_build_object('rollout','campaigns-read-only','fallback','operacional_estado','source_key','central.campaigns.vitor-gutierrez','require_hash_match',true),now()),
('deliveries_mirror_read',true,jsonb_build_object('rollout','deliveries-read-only','fallback','operacional_estado','source_key','central.deliveries.workspace.v1','require_hash_match',true),now()),
('tasks_mirror_strict_write',true,jsonb_build_object('mode','atomic','source_key','central.tasks.vitor-gutierrez','rollback_on_mirror_error',true),now()),
('campaigns_mirror_strict_write',true,jsonb_build_object('mode','atomic','source_key','central.campaigns.vitor-gutierrez','rollback_on_mirror_error',true),now()),
('deliveries_mirror_strict_write',true,jsonb_build_object('mode','atomic','source_key','central.deliveries.workspace.v1','rollback_on_mirror_error',true),now())
on conflict (key) do update
set enabled=excluded.enabled,
    config=coalesce(public.system_feature_flags.config,'{}'::jsonb) || excluded.config,
    updated_at=excluded.updated_at;

create or replace view alliance_data.operational_health
with (security_invoker = true)
as
select
  s.entity,
  s.source_key,
  s.source_count,
  s.mirror_count,
  s.source_hash,
  s.mirror_hash,
  s.in_sync,
  s.last_success_at,
  s.last_error,
  s.last_error_at,
  r.key as feature_flag,
  coalesce(r.enabled,false) as mirror_read_enabled,
  coalesce((r.config->>'require_hash_match')::boolean,true) as require_hash_match,
  case
    when coalesce(r.enabled,false)
      and coalesce(s.in_sync,false)
      and (
        not coalesce((r.config->>'require_hash_match')::boolean,true)
        or s.source_hash = s.mirror_hash
      )
    then 'mirror'
    else 'legacy_fallback'
  end as active_read_source,
  'operacional_estado'::text as write_authority,
  w.key as strict_write_flag,
  coalesce(w.enabled,false) as strict_write_enabled,
  case when coalesce(w.enabled,false) then 'atomic_dual_write' else 'shadow_mirror' end as write_mode
from alliance_data.sync_status s
left join public.system_feature_flags r
  on r.key = case s.entity
    when 'tasks' then 'tasks_mirror_read'
    when 'campaigns' then 'campaigns_mirror_read'
    when 'deliveries' then 'deliveries_mirror_read'
    else null
  end
left join public.system_feature_flags w
  on w.key = case s.entity
    when 'tasks' then 'tasks_mirror_strict_write'
    when 'campaigns' then 'campaigns_mirror_strict_write'
    when 'deliveries' then 'deliveries_mirror_strict_write'
    else null
  end;

create index if not exists alliance_data_deliveries_target_task_idx
  on alliance_data.deliveries(target_task_id)
  where target_task_id is not null;

alter function app.current_actor_uuid() set search_path = '';

update alliance_data.data_catalog
set metadata = coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object(
    'read_source','alliance_data',
    'write_gateway','alliance_data.commit_operational_payload',
    'strict_write',true,
    'write_mode','atomic_dual_write',
    'write_authority','operacional_estado',
    'fallback','operacional_estado',
    'hash_guard',true
  ),
  notes='Leitura pelo espelho e escrita atômica: operacional_estado continua autoridade, mas a transação só confirma quando o mirror alliance_data fica consistente.',
  updated_at=now()
where id in ('operation.tasks','operation.campaigns','operation.deliveries');

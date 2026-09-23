update public.system_feature_flags
set enabled=true,
    config=coalesce(config,'{}'::jsonb)
      || jsonb_build_object(
        'mode','atomic',
        'rollback_on_mirror_error',true,
        'enabled_at',now()
      ),
    updated_at=now()
where key in ('campaigns_mirror_strict_write','deliveries_mirror_strict_write');

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
where id in ('operation.campaigns','operation.deliveries');

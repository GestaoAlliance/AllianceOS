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
  f.key as feature_flag,
  coalesce(f.enabled,false) as mirror_read_enabled,
  coalesce((f.config->>'require_hash_match')::boolean,true) as require_hash_match,
  case
    when coalesce(f.enabled,false)
      and coalesce(s.in_sync,false)
      and (
        not coalesce((f.config->>'require_hash_match')::boolean,true)
        or s.source_hash = s.mirror_hash
      )
    then 'mirror'
    else 'legacy_fallback'
  end as active_read_source,
  'operacional_estado'::text as write_authority
from alliance_data.sync_status s
left join public.system_feature_flags f
  on f.key = case s.entity
    when 'tasks' then 'tasks_mirror_read'
    when 'campaigns' then 'campaigns_mirror_read'
    when 'deliveries' then 'deliveries_mirror_read'
    else null
  end;

update alliance_data.data_catalog
set metadata = coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object(
      'read_source','alliance_data',
      'write_authority','operacional_estado',
      'fallback','operacional_estado',
      'hash_guard',true,
      'rollout','read_only_mirror'
    ),
    notes = case id
      when 'operation.tasks' then 'Espelho físico ativo para leitura com validação de hash e fallback automático; escrita oficial permanece em operacional_estado.'
      when 'operation.campaigns' then 'Espelho físico ativo para leitura com validação de hash e fallback automático; escrita oficial permanece em operacional_estado.'
      when 'operation.deliveries' then 'Espelho físico ativo para leitura com validação de hash e fallback automático; escrita oficial permanece em operacional_estado.'
      else notes
    end,
    updated_at = now()
where id in ('operation.tasks','operation.campaigns','operation.deliveries');

create index if not exists alliance_data_deliveries_target_task_idx
  on alliance_data.deliveries(target_task_id)
  where target_task_id is not null;

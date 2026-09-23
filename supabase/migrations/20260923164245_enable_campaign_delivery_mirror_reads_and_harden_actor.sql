create or replace function app.current_actor_uuid()
returns uuid
language plpgsql
stable
set search_path = ''
as $function$
declare
  v text;
begin
  begin
    v := current_setting('request.jwt.claim.sub', true);
    if nullif(v, '') is not null then
      return v::uuid;
    end if;
  exception when others then
    null;
  end;
  return auth.uid();
end
$function$;

insert into public.system_feature_flags (key, enabled, config, updated_at)
values (
  'deliveries_mirror_read',
  true,
  jsonb_build_object(
    'rollout','deliveries-read-only',
    'fallback','operacional_estado',
    'source_key','central.deliveries.workspace.v1',
    'require_hash_match',true,
    'enabled_at',now()
  ),
  now()
)
on conflict (key) do update
set enabled = excluded.enabled,
    config = excluded.config,
    updated_at = excluded.updated_at;

update public.system_feature_flags
set enabled = true,
    config = coalesce(config,'{}'::jsonb)
      || jsonb_build_object(
        'rollout','campaigns-read-only',
        'fallback','operacional_estado',
        'source_key','central.campaigns.vitor-gutierrez',
        'require_hash_match',true,
        'enabled_at',now()
      ),
    updated_at = now()
where key = 'campaigns_mirror_read';

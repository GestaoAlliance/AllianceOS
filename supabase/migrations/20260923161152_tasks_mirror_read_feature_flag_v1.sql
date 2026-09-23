create table if not exists public.system_feature_flags (
  key text primary key,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.system_feature_flags enable row level security;
revoke all on public.system_feature_flags from public, anon, authenticated;
grant select, insert, update, delete on public.system_feature_flags to service_role;

insert into public.system_feature_flags(key,enabled,config)
values(
  'tasks_mirror_read',
  false,
  jsonb_build_object(
    'fallback','operacional_estado',
    'source_key','central.tasks.vitor-gutierrez',
    'require_hash_match',true
  )
)
on conflict (key) do nothing;

create or replace function public.alliance_task_mirror_sync_payload()
returns table(
  chave text,
  valor jsonb,
  atualizado_em timestamptz,
  in_sync boolean,
  source_count integer,
  mirror_count integer,
  source_hash text,
  mirror_hash text
)
language sql
security invoker
set search_path = ''
as $$
  select
    s.source_key as chave,
    coalesce(
      (
        select jsonb_agg(t.raw order by t.source_position)
        from alliance_data.tasks t
        where t.source_key=s.source_key
      ),
      '[]'::jsonb
    ) as valor,
    s.source_updated_at as atualizado_em,
    s.in_sync,
    s.source_count,
    s.mirror_count,
    s.source_hash,
    s.mirror_hash
  from alliance_data.sync_status s
  where s.source_key='central.tasks.vitor-gutierrez'
  limit 1
$$;

revoke all on function public.alliance_task_mirror_sync_payload() from public, anon, authenticated;
grant execute on function public.alliance_task_mirror_sync_payload() to service_role;

create index if not exists system_feature_flags_enabled_idx
  on public.system_feature_flags(enabled);

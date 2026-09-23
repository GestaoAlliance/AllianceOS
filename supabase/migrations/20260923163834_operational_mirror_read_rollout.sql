create or replace function alliance_data.operational_payload(
  p_source_key text,
  p_flag_key text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_enabled boolean := false;
  v_require_hash boolean := true;
  v_in_sync boolean := false;
  v_source_hash text;
  v_mirror_hash text;
  v_payload jsonb;
begin
  select f.enabled,
         coalesce((f.config->>'require_hash_match')::boolean, true)
    into v_enabled, v_require_hash
  from public.system_feature_flags f
  where f.key = p_flag_key;

  if coalesce(v_enabled,false) then
    select s.in_sync, s.source_hash, s.mirror_hash
      into v_in_sync, v_source_hash, v_mirror_hash
    from alliance_data.sync_status s
    where s.source_key = p_source_key;

    if coalesce(v_in_sync,false)
       and (not v_require_hash or v_source_hash = v_mirror_hash) then
      if p_source_key = 'central.tasks.vitor-gutierrez' then
        select coalesce(jsonb_agg(t.raw order by t.source_position),'[]'::jsonb)
          into v_payload
        from alliance_data.tasks t
        where t.source_key = p_source_key;
      elsif p_source_key = 'central.campaigns.vitor-gutierrez' then
        select coalesce(jsonb_agg(c.raw order by c.source_position),'[]'::jsonb)
          into v_payload
        from alliance_data.campaigns c
        where c.source_key = p_source_key;
      elsif p_source_key = 'central.deliveries.workspace.v1' then
        select coalesce(jsonb_agg(d.raw order by d.source_position),'[]'::jsonb)
          into v_payload
        from alliance_data.deliveries d
        where d.source_key = p_source_key;
      end if;

      if v_payload is not null then
        return v_payload;
      end if;
    end if;
  end if;

  select coalesce(o.valor,'[]'::jsonb)
    into v_payload
  from public.operacional_estado o
  where o.chave = p_source_key and o.dono is null
  limit 1;

  return coalesce(v_payload,'[]'::jsonb);
end;
$$;

revoke all on function alliance_data.operational_payload(text,text) from public;
revoke all on function alliance_data.operational_payload(text,text) from anon;
revoke all on function alliance_data.operational_payload(text,text) from authenticated;

create or replace function public.ler_tarefas_acessiveis()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'app', 'pg_catalog'
as $$
declare
  v_tasks jsonb := '[]'::jsonb;
  v_allowed text[];
begin
  if not app.estou_ativo() or app.eh_externo() then
    return '[]'::jsonb;
  end if;

  v_tasks := alliance_data.operational_payload(
    'central.tasks.vitor-gutierrez',
    'tasks_mirror_read'
  );

  if app.sou_admin() then
    return coalesce(v_tasks,'[]'::jsonb);
  end if;

  select array_agg(lower(nome))
    into v_allowed
  from public.brands
  where ativo=true and app.pode_acessar_marca(id);

  if coalesce(array_length(v_allowed,1),0)=0 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(t)
    from jsonb_array_elements(coalesce(v_tasks,'[]'::jsonb)) t
    where lower(coalesce(t->>'brand','')) = any(v_allowed)
  ),'[]'::jsonb);
end;
$$;

create or replace function public.ler_campanhas_acessiveis()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'app', 'pg_catalog'
as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_allowed text[];
begin
  if not app.estou_ativo() or app.eh_externo() then
    return '[]'::jsonb;
  end if;

  v_items := alliance_data.operational_payload(
    'central.campaigns.vitor-gutierrez',
    'campaigns_mirror_read'
  );

  if app.sou_admin() then
    return coalesce(v_items,'[]'::jsonb);
  end if;

  select array_agg(lower(nome))
    into v_allowed
  from public.brands
  where ativo=true and app.pode_acessar_marca(id);

  if coalesce(array_length(v_allowed,1),0)=0 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(x)
    from jsonb_array_elements(coalesce(v_items,'[]'::jsonb)) x
    where lower(coalesce(x->>'brand','')) = any(v_allowed)
  ),'[]'::jsonb);
end;
$$;

create or replace function public.ler_entregas_acessiveis()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'app', 'pg_catalog'
as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_allowed text[];
begin
  if not app.estou_ativo() or app.eh_externo() then
    return '[]'::jsonb;
  end if;

  v_items := alliance_data.operational_payload(
    'central.deliveries.workspace.v1',
    'deliveries_mirror_read'
  );

  if app.sou_admin() then
    return coalesce(v_items,'[]'::jsonb);
  end if;

  select array_agg(lower(nome))
    into v_allowed
  from public.brands
  where ativo=true and app.pode_acessar_marca(id);

  if coalesce(array_length(v_allowed,1),0)=0 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(x)
    from jsonb_array_elements(coalesce(v_items,'[]'::jsonb)) x
    where lower(coalesce(x->>'brand','')) = any(v_allowed)
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.ler_campanhas_acessiveis() from public;
revoke all on function public.ler_campanhas_acessiveis() from anon;
grant execute on function public.ler_campanhas_acessiveis() to authenticated;

revoke all on function public.ler_entregas_acessiveis() from public;
revoke all on function public.ler_entregas_acessiveis() from anon;
grant execute on function public.ler_entregas_acessiveis() to authenticated;

insert into public.system_feature_flags(key,enabled,config,updated_at,updated_by)
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
  now(),
  null
)
on conflict (key) do update set
  enabled=true,
  config=coalesce(public.system_feature_flags.config,'{}'::jsonb)
    || jsonb_build_object(
      'rollout','deliveries-read-only',
      'fallback','operacional_estado',
      'source_key','central.deliveries.workspace.v1',
      'require_hash_match',true
    ),
  updated_at=now();

update public.system_feature_flags
set enabled=true,
    config=coalesce(config,'{}'::jsonb)
      || jsonb_build_object(
        'rollout','campaigns-read-only',
        'fallback','operacional_estado',
        'source_key','central.campaigns.vitor-gutierrez',
        'require_hash_match',true
      ),
    updated_at=now()
where key='campaigns_mirror_read';

create or replace view alliance_data.operational_mirror_health
with (security_invoker = true)
as
select
  s.entity,
  s.source_key,
  f.key as feature_flag,
  coalesce(f.enabled,false) as read_enabled,
  s.source_count,
  s.mirror_count,
  s.source_hash,
  s.mirror_hash,
  s.in_sync,
  (s.source_hash = s.mirror_hash) as hash_match,
  s.last_success_at,
  s.last_error,
  s.updated_at
from alliance_data.sync_status s
left join public.system_feature_flags f
  on f.config->>'source_key' = s.source_key;

comment on view alliance_data.operational_mirror_health is
  'Saúde dos espelhos operacionais do AllianceOS e estado dos feature flags de leitura.';

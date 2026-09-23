create table if not exists alliance_data.traffic_creatives (
  id uuid primary key default extensions.gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  source_system text not null default 'allianceos',
  source_key text not null,
  source_row integer,
  asset_ref text,
  asset_url text,
  traffic_name text,
  description text,
  model text,
  funnel text,
  observation text,
  audience text,
  format text,
  generation text,
  copy_variant text,
  cta_variant text,
  produced boolean not null default false,
  edited boolean not null default false,
  in_traffic boolean not null default false,
  lifecycle_status text not null default 'BACKLOG'
    check(lifecycle_status in ('BACKLOG','PRONTO','EM_TRAFEGO','EM_TESTE','VENCEDOR','PERDEDOR','PAUSADO','ARQUIVADO')),
  campaign_id text references alliance_data.campaigns(id),
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(brand_id,source_system,source_key)
);

create table if not exists alliance_data.traffic_tests (
  id uuid primary key default extensions.gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  hypothesis text,
  status text not null default 'PLANEJADO'
    check(status in ('PLANEJADO','EM_TESTE','VENCEDOR','PERDEDOR','PAUSADO','ENCERRADO')),
  campaign_id text references alliance_data.campaigns(id),
  meta_campaign_id text,
  meta_adset_id text,
  budget numeric(14,2),
  target_cpa numeric(14,2),
  target_roas numeric(12,4),
  started_at date,
  ended_at date,
  notes text,
  created_by uuid references public.profiles(id),
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alliance_data.traffic_test_creatives (
  test_id uuid not null references alliance_data.traffic_tests(id) on delete cascade,
  creative_id uuid not null references alliance_data.traffic_creatives(id) on delete cascade,
  variant_label text,
  is_control boolean not null default false,
  meta_ad_id text,
  created_at timestamptz not null default now(),
  primary key(test_id,creative_id)
);

create table if not exists alliance_data.traffic_content_candidates (
  id uuid primary key default extensions.gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  source_system text not null default 'allianceos',
  source_key text not null,
  source_row integer,
  post_date date,
  post_url text,
  asset_url text,
  metrics jsonb not null default '{}'::jsonb,
  traffic_status text,
  stage text not null default 'C1_C2' check(stage in ('C1','C2','C1_C2','DESCARTADO','PROMOVIDO')),
  promoted_creative_id uuid references alliance_data.traffic_creatives(id),
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(brand_id,source_system,source_key)
);

create index if not exists traffic_creatives_brand_status_idx
  on alliance_data.traffic_creatives(brand_id,lifecycle_status)
  where archived_at is null;
create index if not exists traffic_creatives_brand_meta_ad_idx
  on alliance_data.traffic_creatives(brand_id,meta_ad_id)
  where meta_ad_id is not null and archived_at is null;
create index if not exists traffic_creatives_campaign_idx
  on alliance_data.traffic_creatives(campaign_id)
  where campaign_id is not null and archived_at is null;
create index if not exists traffic_tests_brand_status_idx
  on alliance_data.traffic_tests(brand_id,status,created_at desc)
  where archived_at is null;
create index if not exists traffic_tests_campaign_idx
  on alliance_data.traffic_tests(campaign_id)
  where campaign_id is not null and archived_at is null;
create index if not exists traffic_test_creatives_creative_idx
  on alliance_data.traffic_test_creatives(creative_id);
create index if not exists traffic_content_candidates_brand_date_idx
  on alliance_data.traffic_content_candidates(brand_id,post_date desc)
  where archived_at is null;

alter table alliance_data.traffic_creatives enable row level security;
alter table alliance_data.traffic_tests enable row level security;
alter table alliance_data.traffic_test_creatives enable row level security;
alter table alliance_data.traffic_content_candidates enable row level security;

drop policy if exists traffic_creatives_read on alliance_data.traffic_creatives;
create policy traffic_creatives_read on alliance_data.traffic_creatives
for select to authenticated
using (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id));

drop policy if exists traffic_creatives_insert on alliance_data.traffic_creatives;
create policy traffic_creatives_insert on alliance_data.traffic_creatives
for insert to authenticated
with check (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id));

drop policy if exists traffic_creatives_update on alliance_data.traffic_creatives;
create policy traffic_creatives_update on alliance_data.traffic_creatives
for update to authenticated
using (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id))
with check (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id));

drop policy if exists traffic_tests_read on alliance_data.traffic_tests;
create policy traffic_tests_read on alliance_data.traffic_tests
for select to authenticated
using (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id));

drop policy if exists traffic_tests_insert on alliance_data.traffic_tests;
create policy traffic_tests_insert on alliance_data.traffic_tests
for insert to authenticated
with check (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id));

drop policy if exists traffic_tests_update on alliance_data.traffic_tests;
create policy traffic_tests_update on alliance_data.traffic_tests
for update to authenticated
using (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id))
with check (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id));

drop policy if exists traffic_test_creatives_read on alliance_data.traffic_test_creatives;
create policy traffic_test_creatives_read on alliance_data.traffic_test_creatives
for select to authenticated
using (exists(
  select 1 from alliance_data.traffic_tests t
  where t.id=test_id and app.pode_acessar_marca(t.brand_id)
));

drop policy if exists traffic_test_creatives_insert on alliance_data.traffic_test_creatives;
create policy traffic_test_creatives_insert on alliance_data.traffic_test_creatives
for insert to authenticated
with check (exists(
  select 1 from alliance_data.traffic_tests t
  where t.id=test_id and app.pode_acessar_marca(t.brand_id)
));

drop policy if exists traffic_test_creatives_update on alliance_data.traffic_test_creatives;
create policy traffic_test_creatives_update on alliance_data.traffic_test_creatives
for update to authenticated
using (exists(
  select 1 from alliance_data.traffic_tests t
  where t.id=test_id and app.pode_acessar_marca(t.brand_id)
))
with check (exists(
  select 1 from alliance_data.traffic_tests t
  where t.id=test_id and app.pode_acessar_marca(t.brand_id)
));

drop policy if exists traffic_candidates_read on alliance_data.traffic_content_candidates;
create policy traffic_candidates_read on alliance_data.traffic_content_candidates
for select to authenticated
using (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id));

drop policy if exists traffic_candidates_insert on alliance_data.traffic_content_candidates;
create policy traffic_candidates_insert on alliance_data.traffic_content_candidates
for insert to authenticated
with check (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id));

drop policy if exists traffic_candidates_update on alliance_data.traffic_content_candidates;
create policy traffic_candidates_update on alliance_data.traffic_content_candidates
for update to authenticated
using (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id))
with check (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id));

grant usage on schema alliance_data to authenticated;
grant select,insert,update on alliance_data.traffic_creatives to authenticated;
grant select,insert,update on alliance_data.traffic_tests to authenticated;
grant select,insert,update on alliance_data.traffic_test_creatives to authenticated;
grant select,insert,update on alliance_data.traffic_content_candidates to authenticated;
revoke all on alliance_data.traffic_creatives,alliance_data.traffic_tests,alliance_data.traffic_test_creatives,alliance_data.traffic_content_candidates from anon;

create or replace function alliance_data.touch_traffic_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=clock_timestamp(); return new; end
$$;

drop trigger if exists traffic_creatives_touch on alliance_data.traffic_creatives;
create trigger traffic_creatives_touch before update on alliance_data.traffic_creatives
for each row execute function alliance_data.touch_traffic_updated_at();

drop trigger if exists traffic_tests_touch on alliance_data.traffic_tests;
create trigger traffic_tests_touch before update on alliance_data.traffic_tests
for each row execute function alliance_data.touch_traffic_updated_at();

drop trigger if exists traffic_candidates_touch on alliance_data.traffic_content_candidates;
create trigger traffic_candidates_touch before update on alliance_data.traffic_content_candidates
for each row execute function alliance_data.touch_traffic_updated_at();

create or replace function alliance_data.traffic_norm_name(p_text text)
returns text
language sql
immutable
set search_path=''
as $$
  select lower(regexp_replace(coalesce(p_text,''),'[^a-zA-Z0-9]+','','g'))
$$;

create or replace function public.listar_central_criativos(
  p_brand_id uuid,
  p_dias integer default 30
)
returns table(
  id uuid,
  brand_id uuid,
  source_key text,
  asset_ref text,
  asset_url text,
  traffic_name text,
  model text,
  funnel text,
  observation text,
  audience text,
  format text,
  generation text,
  copy_variant text,
  cta_variant text,
  produced boolean,
  edited boolean,
  in_traffic boolean,
  lifecycle_status text,
  campaign_id text,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  test_id uuid,
  test_name text,
  test_status text,
  spend numeric,
  conversions numeric,
  revenue numeric,
  impressions bigint,
  clicks bigint,
  cpa numeric,
  roas numeric,
  ctr numeric,
  cpm numeric,
  last_metric_day date
)
language sql
stable
security invoker
set search_path=''
as $$
  select
    c.id,c.brand_id,c.source_key,c.asset_ref,c.asset_url,c.traffic_name,c.model,c.funnel,
    c.observation,c.audience,c.format,c.generation,c.copy_variant,c.cta_variant,
    c.produced,c.edited,c.in_traffic,c.lifecycle_status,c.campaign_id,
    c.meta_campaign_id,c.meta_adset_id,c.meta_ad_id,
    lt.test_id,lt.test_name,lt.test_status,
    coalesce(m.spend,0)::numeric,
    coalesce(m.conversions,0)::numeric,
    coalesce(m.revenue,0)::numeric,
    coalesce(m.impressions,0)::bigint,
    coalesce(m.clicks,0)::bigint,
    case when coalesce(m.conversions,0)>0 then m.spend/m.conversions else null end::numeric as cpa,
    case when coalesce(m.spend,0)>0 then m.revenue/m.spend else null end::numeric as roas,
    case when coalesce(m.impressions,0)>0 then (m.clicks::numeric/m.impressions::numeric)*100 else null end::numeric as ctr,
    case when coalesce(m.impressions,0)>0 then (m.spend/m.impressions::numeric)*1000 else null end::numeric as cpm,
    m.last_metric_day
  from alliance_data.traffic_creatives c
  left join lateral (
    select t.id test_id,t.name test_name,t.status test_status
    from alliance_data.traffic_test_creatives tc
    join alliance_data.traffic_tests t on t.id=tc.test_id
    where tc.creative_id=c.id and t.archived_at is null
    order by t.created_at desc
    limit 1
  ) lt on true
  left join lateral (
    select
      sum(a.spend)::numeric spend,
      sum(a.conversions)::numeric conversions,
      sum(a.revenue)::numeric revenue,
      sum(a.impressions)::bigint impressions,
      sum(a.clicks)::bigint clicks,
      max(a.dia) last_metric_day
    from public.meta_ad_insights_daily a
    where a.brand_id=c.brand_id
      and a.dia >= current_date-greatest(1,least(coalesce(p_dias,30),365))+1
      and (
        (c.meta_ad_id is not null and a.ad_id=c.meta_ad_id)
        or (
          c.meta_ad_id is null
          and alliance_data.traffic_norm_name(a.ad_name)=alliance_data.traffic_norm_name(coalesce(nullif(c.traffic_name,''),c.asset_ref))
        )
      )
  ) m on true
  where c.brand_id=p_brand_id
    and c.archived_at is null
  order by
    case c.lifecycle_status when 'EM_TESTE' then 0 when 'EM_TRAFEGO' then 1 when 'PRONTO' then 2 else 3 end,
    c.source_row nulls last,c.created_at;
$$;

create or replace function public.listar_testes_criativos(
  p_brand_id uuid,
  p_dias integer default 30
)
returns table(
  id uuid,
  name text,
  hypothesis text,
  status text,
  started_at date,
  ended_at date,
  target_cpa numeric,
  target_roas numeric,
  notes text,
  creative_count bigint,
  spend numeric,
  conversions numeric,
  revenue numeric,
  cpa numeric,
  roas numeric
)
language sql
stable
security invoker
set search_path=''
as $$
  select
    t.id,t.name,t.hypothesis,t.status,t.started_at,t.ended_at,t.target_cpa,t.target_roas,t.notes,
    count(distinct tc.creative_id)::bigint,
    coalesce(sum(a.spend),0)::numeric,
    coalesce(sum(a.conversions),0)::numeric,
    coalesce(sum(a.revenue),0)::numeric,
    case when coalesce(sum(a.conversions),0)>0 then sum(a.spend)/sum(a.conversions) else null end::numeric,
    case when coalesce(sum(a.spend),0)>0 then sum(a.revenue)/sum(a.spend) else null end::numeric
  from alliance_data.traffic_tests t
  left join alliance_data.traffic_test_creatives tc on tc.test_id=t.id
  left join alliance_data.traffic_creatives c on c.id=tc.creative_id
  left join public.meta_ad_insights_daily a
    on a.brand_id=t.brand_id
   and a.dia >= current_date-greatest(1,least(coalesce(p_dias,30),365))+1
   and a.ad_id=coalesce(nullif(tc.meta_ad_id,''),nullif(c.meta_ad_id,''))
  where t.brand_id=p_brand_id and t.archived_at is null
  group by t.id,t.name,t.hypothesis,t.status,t.started_at,t.ended_at,t.target_cpa,t.target_roas,t.notes,t.created_at
  order by
    case t.status when 'EM_TESTE' then 0 when 'PLANEJADO' then 1 when 'VENCEDOR' then 2 else 3 end,
    t.created_at desc;
$$;

create or replace function public.listar_candidatos_criativos(p_brand_id uuid)
returns table(
  id uuid,
  post_date date,
  post_url text,
  asset_url text,
  metrics jsonb,
  traffic_status text,
  stage text,
  promoted_creative_id uuid
)
language sql
stable
security invoker
set search_path=''
as $$
  select c.id,c.post_date,c.post_url,c.asset_url,c.metrics,c.traffic_status,c.stage,c.promoted_creative_id
  from alliance_data.traffic_content_candidates c
  where c.brand_id=p_brand_id and c.archived_at is null
  order by c.post_date desc nulls last,c.created_at desc;
$$;

create or replace function public.criar_teste_criativo(
  p_brand_id uuid,
  p_creative_id uuid,
  p_nome text,
  p_hipotese text default null,
  p_meta_ad_id text default null,
  p_meta_adset_id text default null,
  p_meta_campaign_id text default null,
  p_target_cpa numeric default null,
  p_target_roas numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare v_id uuid;
begin
  if not app.pode_acessar_marca(p_brand_id) then raise exception 'Sem acesso à marca'; end if;
  if not exists(select 1 from alliance_data.traffic_creatives c where c.id=p_creative_id and c.brand_id=p_brand_id and c.archived_at is null) then
    raise exception 'Criativo não encontrado';
  end if;
  insert into alliance_data.traffic_tests(
    brand_id,name,hypothesis,status,meta_campaign_id,meta_adset_id,target_cpa,target_roas,started_at,created_by
  ) values(
    p_brand_id,coalesce(nullif(trim(p_nome),''),'Teste de criativo'),nullif(trim(p_hipotese),''),
    'EM_TESTE',nullif(trim(p_meta_campaign_id),''),nullif(trim(p_meta_adset_id),''),
    p_target_cpa,p_target_roas,current_date,(select auth.uid())
  ) returning id into v_id;

  insert into alliance_data.traffic_test_creatives(test_id,creative_id,variant_label,meta_ad_id)
  values(v_id,p_creative_id,'A',nullif(trim(p_meta_ad_id),''));

  update alliance_data.traffic_creatives
  set lifecycle_status='EM_TESTE',in_traffic=true,
      meta_ad_id=coalesce(nullif(trim(p_meta_ad_id),''),meta_ad_id),
      meta_adset_id=coalesce(nullif(trim(p_meta_adset_id),''),meta_adset_id),
      meta_campaign_id=coalesce(nullif(trim(p_meta_campaign_id),''),meta_campaign_id)
  where id=p_creative_id;

  return v_id;
end
$$;

create or replace function public.vincular_criativo_meta(
  p_creative_id uuid,
  p_meta_ad_id text default null,
  p_meta_adset_id text default null,
  p_meta_campaign_id text default null,
  p_campaign_id text default null
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
begin
  update alliance_data.traffic_creatives c
  set meta_ad_id=nullif(trim(p_meta_ad_id),''),
      meta_adset_id=nullif(trim(p_meta_adset_id),''),
      meta_campaign_id=nullif(trim(p_meta_campaign_id),''),
      campaign_id=nullif(trim(p_campaign_id),''),
      in_traffic=case when nullif(trim(p_meta_ad_id),'') is not null then true else c.in_traffic end,
      lifecycle_status=case when nullif(trim(p_meta_ad_id),'') is not null and c.lifecycle_status in ('BACKLOG','PRONTO') then 'EM_TRAFEGO' else c.lifecycle_status end
  where c.id=p_creative_id
    and app.pode_acessar_marca(c.brand_id);
  if not found then raise exception 'Criativo não encontrado ou sem acesso'; end if;
end
$$;

create or replace function public.atualizar_status_teste_criativo(
  p_test_id uuid,
  p_status text,
  p_notes text default null
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare v_status text:=upper(trim(coalesce(p_status,'')));
begin
  if v_status not in ('PLANEJADO','EM_TESTE','VENCEDOR','PERDEDOR','PAUSADO','ENCERRADO') then
    raise exception 'Status inválido';
  end if;

  update alliance_data.traffic_tests t
  set status=v_status,
      notes=coalesce(p_notes,t.notes),
      started_at=case when v_status='EM_TESTE' then coalesce(t.started_at,current_date) else t.started_at end,
      ended_at=case when v_status in ('VENCEDOR','PERDEDOR','ENCERRADO') then coalesce(t.ended_at,current_date) else t.ended_at end
  where t.id=p_test_id and app.pode_acessar_marca(t.brand_id);
  if not found then raise exception 'Teste não encontrado ou sem acesso'; end if;

  if v_status in ('VENCEDOR','PERDEDOR','PAUSADO','EM_TESTE') then
    update alliance_data.traffic_creatives c
    set lifecycle_status=case
      when v_status='VENCEDOR' then 'VENCEDOR'
      when v_status='PERDEDOR' then 'PERDEDOR'
      when v_status='PAUSADO' then 'PAUSADO'
      else 'EM_TESTE' end
    from alliance_data.traffic_test_creatives tc
    where tc.test_id=p_test_id and tc.creative_id=c.id;
  end if;
end
$$;

revoke all on function public.listar_central_criativos(uuid,integer) from public,anon;
revoke all on function public.listar_testes_criativos(uuid,integer) from public,anon;
revoke all on function public.listar_candidatos_criativos(uuid) from public,anon;
revoke all on function public.criar_teste_criativo(uuid,uuid,text,text,text,text,text,numeric,numeric) from public,anon;
revoke all on function public.vincular_criativo_meta(uuid,text,text,text,text) from public,anon;
revoke all on function public.atualizar_status_teste_criativo(uuid,text,text) from public,anon;

grant execute on function public.listar_central_criativos(uuid,integer) to authenticated,service_role;
grant execute on function public.listar_testes_criativos(uuid,integer) to authenticated,service_role;
grant execute on function public.listar_candidatos_criativos(uuid) to authenticated,service_role;
grant execute on function public.criar_teste_criativo(uuid,uuid,text,text,text,text,text,numeric,numeric) to authenticated,service_role;
grant execute on function public.vincular_criativo_meta(uuid,text,text,text,text) to authenticated,service_role;
grant execute on function public.atualizar_status_teste_criativo(uuid,text,text) to authenticated,service_role;

insert into alliance_data.data_catalog(
  id,domain,entity,source_schema,source_object,storage_model,brand_scoped,status,notes,metadata,updated_at
) values (
  'traffic.creative_lab','traffic','creative_lab','alliance_data','traffic_creatives','canonical',true,'ready',
  'Laboratório de criativos ligado a campanhas, Meta Ads, testes e candidatos C1/C2.',
  jsonb_build_object(
    'source_file','Central de criativos - VermeFree',
    'metrics_source','public.meta_ad_insights_daily',
    'rpc_creatives','public.listar_central_criativos',
    'rpc_tests','public.listar_testes_criativos',
    'rpc_candidates','public.listar_candidatos_criativos'
  ),now()
)
on conflict(id) do update set
  notes=excluded.notes,metadata=excluded.metadata,status=excluded.status,updated_at=excluded.updated_at;

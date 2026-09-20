-- AllianceOS MCP audit repairs — 2026-09-20
-- No rows are deleted. Legacy fields are preserved for compatibility.

alter table public.campaign_results
  add column if not exists fonte_receita text;

alter table public.campaign_results
  alter column canal drop not null;

alter table public.campaign_results
  drop constraint if exists campaign_results_campaign_id_canal_data_key;

create unique index if not exists campaign_results_identity_uq
  on public.campaign_results (
    campaign_id,
    coalesce(fonte_receita,''),
    coalesce(canal,''),
    data
  );

create table if not exists public.campaign_revenue_sources (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  brand_id uuid not null references public.brands(id),
  nome text not null,
  responsavel text,
  investimento_previsto numeric(14,2) not null default 0 check (investimento_previsto >= 0),
  meta_faturamento numeric(14,2) not null default 0 check (meta_faturamento >= 0),
  roas_alvo numeric(14,4) check (roas_alvo is null or roas_alvo >= 0),
  ativa boolean not null default true,
  origem text not null default 'interface' check (origem in ('interface','mcp')),
  criado_por uuid references auth.users(id) default auth.uid(),
  atualizado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  arquivado_em timestamptz,
  arquivado_por uuid references auth.users(id),
  unique (campaign_id,nome)
);

alter table public.campaign_revenue_sources enable row level security;

drop policy if exists campaign_revenue_sources_read on public.campaign_revenue_sources;
create policy campaign_revenue_sources_read on public.campaign_revenue_sources
  for select to authenticated
  using (app.estou_ativo() and not app.eh_externo());

drop policy if exists campaign_revenue_sources_insert on public.campaign_revenue_sources;
create policy campaign_revenue_sources_insert on public.campaign_revenue_sources
  for insert to authenticated
  with check (app.estou_ativo() and not app.eh_externo());

drop policy if exists campaign_revenue_sources_update on public.campaign_revenue_sources;
create policy campaign_revenue_sources_update on public.campaign_revenue_sources
  for update to authenticated
  using (app.estou_ativo() and not app.eh_externo())
  with check (app.estou_ativo() and not app.eh_externo());

grant select,insert,update on public.campaign_revenue_sources to authenticated;
revoke all on public.campaign_revenue_sources from anon;
revoke delete,truncate on public.campaign_revenue_sources from authenticated,anon,public;

-- Copy structured legacy metas_por_canal into metas_por_fonte without removing the old field.
update public.operacional_estado o
set valor = migrated.valor,
    atualizado_em = now()
from (
  select src.ctid,
         jsonb_agg(
           case
             when jsonb_typeof(c.item->'tapStructured')='object'
              and coalesce(jsonb_typeof(c.item#>'{tapStructured,metas_por_canal}'),'')='array'
              and coalesce(jsonb_array_length(c.item#>'{tapStructured,metas_por_fonte}'),0)=0
             then jsonb_set(
               c.item,
               '{tapStructured,metas_por_fonte}',
               coalesce((
                 select jsonb_agg(
                   jsonb_build_object(
                     'fonte',coalesce(x->>'fonte',x->>'canal'),
                     'investimento',coalesce((x->>'investimento')::numeric,0),
                     'meta_faturamento',coalesce((x->>'meta_faturamento')::numeric,0),
                     'roas_alvo',case when nullif(x->>'roas_alvo','') is null then null else (x->>'roas_alvo')::numeric end,
                     'responsavel',x->>'responsavel'
                   )
                 )
                 from jsonb_array_elements(c.item#>'{tapStructured,metas_por_canal}') x
               ),'[]'::jsonb),
               true
             )
             else c.item
           end
           order by c.ord
         ) as valor
  from public.operacional_estado src
  cross join lateral jsonb_array_elements(src.valor) with ordinality c(item,ord)
  where src.chave='central.campaigns.vitor-gutierrez' and src.dono is null
  group by src.ctid
) migrated
where o.ctid=migrated.ctid;

-- Seed the editable revenue-source entity from all structured TAPs.
with campaigns as (
  select c.item
  from public.operacional_estado o
  cross join lateral jsonb_array_elements(o.valor) c(item)
  where o.chave='central.campaigns.vitor-gutierrez' and o.dono is null
), plans as (
  select c.item->>'id' as campaign_id,
         c.item->>'brand' as brand,
         p.item
  from campaigns c
  cross join lateral jsonb_array_elements(coalesce(c.item#>'{tapStructured,metas_por_fonte}','[]'::jsonb)) p(item)
)
insert into public.campaign_revenue_sources
  (campaign_id,brand_id,nome,responsavel,investimento_previsto,meta_faturamento,roas_alvo,ativa,origem)
select p.campaign_id,b.id,p.item->>'fonte',nullif(p.item->>'responsavel',''),
       coalesce((p.item->>'investimento')::numeric,0),
       coalesce((p.item->>'meta_faturamento')::numeric,0),
       case when nullif(p.item->>'roas_alvo','') is null then null else (p.item->>'roas_alvo')::numeric end,
       true,'mcp'
from plans p
join public.brands b on lower(trim(b.nome))=lower(trim(p.brand))
where nullif(trim(p.item->>'fonte'),'') is not null
on conflict (campaign_id,nome) do update set
  responsavel=excluded.responsavel,
  investimento_previsto=excluded.investimento_previsto,
  meta_faturamento=excluded.meta_faturamento,
  roas_alvo=excluded.roas_alvo,
  ativa=true,
  atualizado_em=now();

-- Repair only unambiguous legacy map links by exact campaign name + brand.
with campaigns as (
  select c.item->>'id' as id,c.item->>'name' as name,c.item->>'brand' as brand
  from public.operacional_estado o
  cross join lateral jsonb_array_elements(o.valor) c(item)
  where o.chave='central.campaigns.vitor-gutierrez' and o.dono is null
), valid_ids as (
  select id from campaigns
), matches as (
  select n.id,min(c.id) as campaign_id
  from public.planning_map_nodes n
  join public.planning_maps m on m.id=n.map_id
  join public.brands b on b.id=m.brand_id
  join campaigns c on lower(trim(c.brand))=lower(trim(b.nome))
                  and lower(trim(c.name))=lower(trim(n.texto))
  where n.campaign_id is not null
    and not exists (select 1 from valid_ids v where v.id=n.campaign_id)
  group by n.id
  having count(*)=1
)
update public.planning_map_nodes n
set campaign_id=m.campaign_id,atualizado_em=now()
from matches m
where n.id=m.id;

-- Copy embedded mcp-delivery-* entries to the official delivery state. Keep embedded copies.
with task_state as (
  select valor
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null
), legacy as (
  select t.item as task,d.item as delivery
  from task_state s
  cross join lateral jsonb_array_elements(s.valor) t(item)
  cross join lateral jsonb_array_elements(coalesce(t.item->'deliveries','[]'::jsonb)) d(item)
  where d.item->>'id' like 'mcp-delivery-%'
), delivery_state as (
  select ctid,coalesce(valor,'[]'::jsonb) valor
  from public.operacional_estado
  where chave='central.deliveries.workspace.v1' and dono is null
), additions as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',l.delivery->>'id',
      'sourceTaskId',l.task->>'id',
      'targetTaskId','',
      'title','Entrega · '||coalesce(l.task->>'title','Tarefa'),
      'taskTitle',coalesce(l.task->>'title','Tarefa'),
      'project',l.task->>'project',
      'brand',l.task->>'brand',
      'from',coalesce(l.delivery->>'author','MCP'),
      'to',coalesce(l.task#>>'{assignees,0}','Equipe'),
      'note',coalesce(l.delivery->>'text',l.delivery->>'note',''),
      'status',coalesce(l.delivery->>'status','enviado'),
      'createdAt',coalesce(l.delivery->>'at',now()::text),
      'updatedAt',coalesce(l.delivery->>'at',now()::text),
      'version',1,
      'completeTask',false,
      'files',coalesce(l.delivery->'files','[]'::jsonb),
      'links',coalesce(l.delivery->'links','[]'::jsonb),
      'events',jsonb_build_array(jsonb_build_object('at',coalesce(l.delivery->>'at',now()::text),'by',coalesce(l.delivery->>'author','MCP'),'authorId',l.delivery->>'authorId','origin','mcp','text','Entrega legada migrada para a coleção oficial.')),
      'origin','mcp'
    )
  ),'[]'::jsonb) as items
  from legacy l,delivery_state d
  where not exists (
    select 1 from jsonb_array_elements(d.valor) current
    where current->>'id'=l.delivery->>'id'
  )
)
update public.operacional_estado d
set valor=d.valor+a.items,atualizado_em=now()
from delivery_state ds,additions a
where d.ctid=ds.ctid and jsonb_array_length(a.items)>0;

-- No physical deletion/truncate through Data API for AllianceOS-managed entities.
revoke delete,truncate on public.task_lists from authenticated,anon,public;
revoke delete,truncate on public.operacional_estado from authenticated,anon,public;
revoke delete,truncate on public.planning_months from authenticated,anon,public;
revoke delete,truncate on public.planning_maps from authenticated,anon,public;
revoke delete,truncate on public.planning_map_nodes from authenticated,anon,public;
revoke delete,truncate on public.alliance_clients from authenticated,anon,public;
revoke delete,truncate on public.alliance_automations from authenticated,anon,public;
revoke delete,truncate on public.campaign_results from authenticated,anon,public;
revoke delete,truncate on public.alliance_tags from authenticated,anon,public;
revoke delete,truncate on public.alliance_channels from authenticated,anon,public;
revoke delete,truncate on public.equipe_convites from authenticated,anon,public;

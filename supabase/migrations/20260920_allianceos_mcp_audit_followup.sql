-- AllianceOS MCP audit follow-up: indexes + legacy revenue source materialization.

create index if not exists campaign_revenue_sources_brand_idx
  on public.campaign_revenue_sources(brand_id);
create index if not exists campaign_revenue_sources_criado_por_idx
  on public.campaign_revenue_sources(criado_por);
create index if not exists campaign_revenue_sources_atualizado_por_idx
  on public.campaign_revenue_sources(atualizado_por);
create index if not exists campaign_revenue_sources_arquivado_por_idx
  on public.campaign_revenue_sources(arquivado_por);

-- Materialize legacy METAS rows as revenue-source entities.
with campaigns as (
  select c.item
  from public.operacional_estado o
  cross join lateral jsonb_array_elements(o.valor) c(item)
  where o.chave='central.campaigns.vitor-gutierrez'
    and o.dono is null
    and jsonb_typeof(c.item->'tap')='array'
),
meta_sections as (
  select c.item as campaign,s.item as section
  from campaigns c
  cross join lateral jsonb_array_elements(c.item->'tap') s(item)
  where upper(trim(s.item->>'title'))='METAS'
),
rows as (
  select m.campaign,r.item as row
  from meta_sections m
  cross join lateral jsonb_array_elements(coalesce(m.section->'rows','[]'::jsonb)) r(item)
),
goals as (
  select campaign,
         trim(regexp_replace(row->>0,'^meta faturamento\s*[—-]\s*','','i')) as fonte,
         case
           when regexp_replace(row->>1,'[^0-9,.-]','','g') ~ ',[0-9]{1,2}$'
             then replace(replace(regexp_replace(row->>1,'[^0-9,.-]','','g'),'.',''),',','.')::numeric
           when regexp_replace(row->>1,'[^0-9,.-]','','g') ~ '^[0-9]{1,3}(\.[0-9]{3})+$'
             then replace(regexp_replace(row->>1,'[^0-9,.-]','','g'),'.','')::numeric
           else nullif(replace(regexp_replace(row->>1,'[^0-9,.-]','','g'),',','.'),'')::numeric
         end as meta,
         nullif(trim(row->>2),'') as responsavel
  from rows
  where row->>0 ~* '^meta faturamento\s*[—-]'
    and trim(regexp_replace(row->>0,'^meta faturamento\s*[—-]\s*','','i')) !~* '^total$'
),
investments as (
  select campaign,
         trim(regexp_replace(row->>0,'^investimento\s*[—-]\s*','','i')) as fonte,
         case
           when regexp_replace(row->>1,'[^0-9,.-]','','g') ~ ',[0-9]{1,2}$'
             then replace(replace(regexp_replace(row->>1,'[^0-9,.-]','','g'),'.',''),',','.')::numeric
           when regexp_replace(row->>1,'[^0-9,.-]','','g') ~ '^[0-9]{1,3}(\.[0-9]{3})+$'
             then replace(regexp_replace(row->>1,'[^0-9,.-]','','g'),'.','')::numeric
           else nullif(replace(regexp_replace(row->>1,'[^0-9,.-]','','g'),',','.'),'')::numeric
         end as investimento
  from rows
  where row->>0 ~* '^investimento\s*[—-]'
),
roas as (
  select campaign,
         max(nullif(replace(regexp_replace(row->>1,'[^0-9,.-]','','g'),',','.'),'')::numeric) as roas_alvo
  from rows
  where lower(trim(row->>0))='roas alvo'
  group by campaign
)
insert into public.campaign_revenue_sources
  (campaign_id,brand_id,nome,responsavel,investimento_previsto,meta_faturamento,roas_alvo,ativa,origem)
select g.campaign->>'id',
       b.id,
       g.fonte,
       g.responsavel,
       coalesce(i.investimento,0),
       coalesce(g.meta,0),
       r.roas_alvo,
       true,
       'mcp'
from goals g
join public.brands b on lower(trim(b.nome))=lower(trim(g.campaign->>'brand'))
left join investments i
  on i.campaign=g.campaign and lower(trim(i.fonte))=lower(trim(g.fonte))
left join roas r on r.campaign=g.campaign
where nullif(g.fonte,'') is not null
on conflict (campaign_id,nome) do update set
  responsavel=excluded.responsavel,
  investimento_previsto=excluded.investimento_previsto,
  meta_faturamento=excluded.meta_faturamento,
  roas_alvo=coalesce(excluded.roas_alvo,public.campaign_revenue_sources.roas_alvo),
  ativa=true,
  atualizado_em=now();

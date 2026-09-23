create schema if not exists alliance_data;

revoke all on schema alliance_data from public;
revoke all on schema alliance_data from anon;
revoke all on schema alliance_data from authenticated;
grant usage on schema alliance_data to service_role;

create or replace view alliance_data.tasks_current
with (security_invoker = true)
as
select
  e.ord::bigint as source_position,
  o.chave as source_key,
  o.atualizado_em as source_updated_at,
  e.item->>'id' as id,
  b.id as brand_id,
  coalesce(b.nome, nullif(trim(e.item->>'brand'), '')) as brand_name,
  e.item->>'title' as title,
  e.item->>'description' as description,
  e.item->>'status' as status,
  e.item->>'priority' as priority,
  e.item->>'due' as due_date_text,
  e.item->>'dueAt' as due_at_text,
  e.item->>'start' as start_date_text,
  nullif(e.item->>'campaignId','') as campaign_id,
  nullif(e.item->>'campaignSource','') as campaign_source,
  nullif(e.item->>'project','') as project,
  nullif(e.item->>'listId','') as list_id,
  nullif(e.item->>'parentTaskId','') as parent_task_id,
  nullif(e.item->>'channel','') as channel,
  coalesce(e.item->'assigneeIds','[]'::jsonb) as assignee_ids,
  coalesce(e.item->'assignees','[]'::jsonb) as assignees,
  coalesce(e.item->'subtasks','[]'::jsonb) as subtasks,
  coalesce(e.item->'dependencies','[]'::jsonb) as dependencies,
  coalesce(e.item->'checklist','[]'::jsonb) as checklist,
  coalesce(e.item->'attachments','[]'::jsonb) as attachments,
  coalesce(e.item->'comments','[]'::jsonb) as comments,
  coalesce(e.item->'deliveries','[]'::jsonb) as embedded_deliveries,
  coalesce(e.item->'tags','[]'::jsonb) as tags,
  coalesce(e.item->'history','[]'::jsonb) as history,
  nullif(e.item->>'archivedAt','') as archived_at_text,
  nullif(e.item->>'archivedBy','') as archived_by,
  (nullif(e.item->>'archivedAt','') is not null) as is_archived,
  e.item as raw
from public.operacional_estado o
cross join lateral jsonb_array_elements(o.valor) with ordinality as e(item, ord)
left join public.brands b
  on lower(b.nome) = lower(trim(coalesce(e.item->>'brand','')))
where o.chave = 'central.tasks.vitor-gutierrez'
  and o.dono is null
  and jsonb_typeof(o.valor) = 'array';

create or replace view alliance_data.campaigns_current
with (security_invoker = true)
as
select
  e.ord::bigint as source_position,
  o.chave as source_key,
  o.atualizado_em as source_updated_at,
  e.item->>'id' as id,
  b.id as brand_id,
  coalesce(b.nome, nullif(trim(e.item->>'brand'), '')) as brand_name,
  e.item->>'name' as name,
  e.item->>'status' as status,
  e.item->>'type' as type,
  e.item->>'objective' as objective,
  e.item->>'goal' as goal,
  e.item->>'start' as start_date_text,
  e.item->>'startAt' as start_at_text,
  e.item->>'end' as end_date_text,
  e.item->>'endAt' as end_at_text,
  e.item->>'monthId' as month_id,
  e.item->>'monthRef' as month_ref,
  e.item->>'clientId' as client_id,
  e.item->'budget' as budget,
  e.item->'channels' as channels,
  e.item->'products' as products,
  e.item->'offer' as offer,
  e.item->'benefits' as benefits,
  e.item->'schedule' as schedule,
  e.item->'tags' as tags,
  coalesce(e.item->'history','[]'::jsonb) as history,
  nullif(e.item->>'archivedAt','') as archived_at_text,
  (nullif(e.item->>'archivedAt','') is not null) as is_archived,
  e.item as raw
from public.operacional_estado o
cross join lateral jsonb_array_elements(o.valor) with ordinality as e(item, ord)
left join public.brands b
  on lower(b.nome) = lower(trim(coalesce(e.item->>'brand','')))
where o.chave = 'central.campaigns.vitor-gutierrez'
  and o.dono is null
  and jsonb_typeof(o.valor) = 'array';

create or replace view alliance_data.deliveries_current
with (security_invoker = true)
as
select
  e.ord::bigint as source_position,
  o.chave as source_key,
  o.atualizado_em as source_updated_at,
  e.item->>'id' as id,
  b.id as brand_id,
  coalesce(b.nome, nullif(trim(e.item->>'brand'), '')) as brand_name,
  coalesce(e.item->>'title', e.item->>'taskTitle') as title,
  e.item->>'taskTitle' as task_title,
  e.item->>'status' as status,
  nullif(e.item->>'sourceTaskId','') as source_task_id,
  nullif(e.item->>'targetTaskId','') as target_task_id,
  e.item->>'project' as project,
  e.item->>'from' as sender,
  e.item->>'to' as recipient,
  e.item->>'note' as note,
  e.item->'files' as files,
  e.item->'links' as links,
  coalesce(e.item->'events','[]'::jsonb) as events,
  e.item->>'createdAt' as created_at_text,
  e.item->>'updatedAt' as updated_at_text,
  nullif(e.item->>'archivedAt','') as archived_at_text,
  nullif(e.item->>'archivedBy','') as archived_by,
  (nullif(e.item->>'archivedAt','') is not null) as is_archived,
  e.item as raw
from public.operacional_estado o
cross join lateral jsonb_array_elements(o.valor) with ordinality as e(item, ord)
left join public.brands b
  on b.id::text = nullif(e.item->>'brandId','')
  or (
    nullif(e.item->>'brandId','') is null
    and lower(b.nome) = lower(trim(coalesce(e.item->>'brand','')))
  )
where o.chave = 'central.deliveries.workspace.v1'
  and o.dono is null
  and jsonb_typeof(o.valor) = 'array';

create or replace view alliance_data.brand_operational_summary
with (security_invoker = true)
as
with t as (
  select brand_id, count(*)::bigint as tasks,
         count(*) filter (where not is_archived)::bigint as active_tasks
  from alliance_data.tasks_current
  group by brand_id
),
c as (
  select brand_id, count(*)::bigint as campaigns,
         count(*) filter (where not is_archived)::bigint as active_campaigns
  from alliance_data.campaigns_current
  group by brand_id
),
d as (
  select brand_id, count(*)::bigint as deliveries,
         count(*) filter (where not is_archived)::bigint as active_deliveries
  from alliance_data.deliveries_current
  group by brand_id
)
select
  b.id as brand_id,
  b.nome as brand_name,
  coalesce(t.tasks,0) as tasks,
  coalesce(t.active_tasks,0) as active_tasks,
  coalesce(c.campaigns,0) as campaigns,
  coalesce(c.active_campaigns,0) as active_campaigns,
  coalesce(d.deliveries,0) as deliveries,
  coalesce(d.active_deliveries,0) as active_deliveries
from public.brands b
left join t on t.brand_id=b.id
left join c on c.brand_id=b.id
left join d on d.brand_id=b.id
where b.ativo;

revoke all on all tables in schema alliance_data from public;
revoke all on all tables in schema alliance_data from anon;
revoke all on all tables in schema alliance_data from authenticated;
grant select on all tables in schema alliance_data to service_role;

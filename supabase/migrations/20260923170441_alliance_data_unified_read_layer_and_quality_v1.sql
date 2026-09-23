revoke all on schema alliance_data from public,anon,authenticated;
grant usage on schema alliance_data to service_role;

create or replace view alliance_data.brands_current
with (security_invoker=true)
as select * from public.brands;

create or replace view alliance_data.profiles_current
with (security_invoker=true)
as select * from public.profiles;

create or replace view alliance_data.task_lists_current
with (security_invoker=true)
as select * from public.task_lists;

create or replace view alliance_data.campaign_results_current
with (security_invoker=true)
as select * from public.campaign_results;

create or replace view alliance_data.campaign_versions_history
with (security_invoker=true)
as select * from public.campaign_versions;

create or replace view alliance_data.campaign_month_baselines_current
with (security_invoker=true)
as select * from public.campaign_month_baselines;

create or replace view alliance_data.planning_months_current
with (security_invoker=true)
as select * from public.planning_months;

create or replace view alliance_data.planning_maps_current
with (security_invoker=true)
as select * from public.planning_maps;

create or replace view alliance_data.planning_map_nodes_current
with (security_invoker=true)
as select * from public.planning_map_nodes;

create or replace view alliance_data.notifications_current
with (security_invoker=true)
as select * from public.notifications;

create or replace view alliance_data.task_audit_history
with (security_invoker=true)
as select * from public.task_action_audit;

create or replace view alliance_data.operational_data_quality
with (security_invoker=true)
as
select
  'tasks'::text as entity,
  count(*)::bigint as row_count,
  count(*) filter (where brand_id is null)::bigint as missing_brand,
  count(*) filter (where nullif(trim(title),'') is null)::bigint as missing_required_name,
  count(*) filter (
    where nullif(campaign_id,'') is not null
      and not exists(select 1 from alliance_data.campaigns c where c.id=tasks.campaign_id)
  )::bigint as orphan_relation,
  0::bigint as inline_payload_chars
from alliance_data.tasks
union all
select
  'campaigns',
  count(*)::bigint,
  count(*) filter (where brand_id is null)::bigint,
  count(*) filter (where nullif(trim(name),'') is null)::bigint,
  0::bigint,
  0::bigint
from alliance_data.campaigns
union all
select
  'deliveries',
  count(*)::bigint,
  count(*) filter (where brand_id is null)::bigint,
  count(*) filter (where nullif(trim(title),'') is null)::bigint,
  count(*) filter (
    where coalesce(nullif(target_task_id,''),nullif(source_task_id,'')) is not null
      and not exists(
        select 1 from alliance_data.tasks t
        where t.id=coalesce(nullif(deliveries.target_task_id,''),nullif(deliveries.source_task_id,''))
      )
  )::bigint,
  coalesce((
    select sum(df.inline_data_chars)
    from alliance_data.delivery_files df
  ),0)::bigint
from alliance_data.deliveries;

grant select on alliance_data.brands_current to service_role;
grant select on alliance_data.profiles_current to service_role;
grant select on alliance_data.task_lists_current to service_role;
grant select on alliance_data.campaign_results_current to service_role;
grant select on alliance_data.campaign_versions_history to service_role;
grant select on alliance_data.campaign_month_baselines_current to service_role;
grant select on alliance_data.planning_months_current to service_role;
grant select on alliance_data.planning_maps_current to service_role;
grant select on alliance_data.planning_map_nodes_current to service_role;
grant select on alliance_data.notifications_current to service_role;
grant select on alliance_data.task_audit_history to service_role;
grant select on alliance_data.operational_data_quality to service_role;
grant select on alliance_data.operational_health to service_role;

insert into alliance_data.data_catalog(
  id,domain,entity,source_schema,source_object,storage_model,brand_scoped,status,notes,metadata,updated_at
) values
('identity.brands','identity','brands','public','brands','canonical',false,'active','Cadastro central de marcas do AllianceOS.',jsonb_build_object('read_view','alliance_data.brands_current'),now()),
('identity.profiles','identity','profiles','public','profiles','canonical',false,'active','Perfis e identidade dos usuários internos.',jsonb_build_object('read_view','alliance_data.profiles_current'),now()),
('operation.task_lists','operation','task_lists','public','task_lists','canonical',true,'active','Listas relacionais de tarefas.',jsonb_build_object('read_view','alliance_data.task_lists_current'),now()),
('performance.campaign_results','performance','campaign_results','public','campaign_results','canonical',true,'active','Resultados consolidados das campanhas.',jsonb_build_object('read_view','alliance_data.campaign_results_current'),now()),
('history.campaign_versions','history','campaign_versions','public','campaign_versions','canonical',true,'active','Histórico imutável de versões de campanha.',jsonb_build_object('read_view','alliance_data.campaign_versions_history'),now()),
('history.campaign_month_baselines','history','campaign_month_baselines','public','campaign_month_baselines','canonical',true,'active','Fotografia original mensal das campanhas.',jsonb_build_object('read_view','alliance_data.campaign_month_baselines_current'),now()),
('planning.months','planning','planning_months','public','planning_months','canonical',true,'active','Planejamento mensal.',jsonb_build_object('read_view','alliance_data.planning_months_current'),now()),
('planning.maps','planning','planning_maps','public','planning_maps','canonical',true,'active','Mapas de planejamento.',jsonb_build_object('read_view','alliance_data.planning_maps_current'),now()),
('planning.map_nodes','planning','planning_map_nodes','public','planning_map_nodes','canonical',true,'active','Nós dos mapas de planejamento.',jsonb_build_object('read_view','alliance_data.planning_map_nodes_current'),now()),
('history.task_audit','history','task_action_audit','public','task_action_audit','canonical',true,'active','Auditoria operacional de ações em tarefas e entidades relacionadas.',jsonb_build_object('read_view','alliance_data.task_audit_history'),now()),
('system.notifications','system','notifications','public','notifications','canonical',false,'active','Notificações do workspace.',jsonb_build_object('read_view','alliance_data.notifications_current'),now())
on conflict(id) do update set
  domain=excluded.domain,
  entity=excluded.entity,
  source_schema=excluded.source_schema,
  source_object=excluded.source_object,
  storage_model=excluded.storage_model,
  brand_scoped=excluded.brand_scoped,
  status=excluded.status,
  notes=excluded.notes,
  metadata=excluded.metadata,
  updated_at=excluded.updated_at;

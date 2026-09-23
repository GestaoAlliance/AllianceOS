create table if not exists alliance_data.external_source_catalog (
  source text primary key,
  display_name text not null,
  category text not null,
  default_scope text not null default 'brand' check(default_scope in ('brand','global','mixed')),
  data_classification text not null default 'internal' check(data_classification in ('public','internal','confidential','restricted')),
  system_of_record boolean not null default false,
  knowledge_eligible boolean not null default false,
  supports_incremental boolean not null default false,
  supports_webhook boolean not null default false,
  preferred_connector text,
  default_sync_interval interval,
  lifecycle_status text not null default 'available' check(lifecycle_status in ('available','planned','deprecated','paused')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alliance_data.external_connections (
  id uuid primary key default extensions.gen_random_uuid(),
  source text not null references alliance_data.external_source_catalog(source),
  brand_id uuid references public.brands(id) on delete cascade,
  scope_key text generated always as (coalesce(brand_id::text,'global')) stored,
  external_account_key text not null default 'default',
  external_account_name text,
  connector_type text not null default 'unknown'
    check(connector_type in ('chat_connector','alliance_native','webhook','n8n','manual','unknown')),
  connection_status text not null default 'unverified'
    check(connection_status in ('verified','unverified','not_connected','error','paused')),
  sync_status text not null default 'not_configured'
    check(sync_status in ('not_configured','schema_ready','manual_snapshot','active','error','paused')),
  secrets_location text not null default 'none'
    check(secrets_location in ('none','supabase_vault','edge_function_secrets','external_platform')),
  secret_refs jsonb not null default '[]'::jsonb,
  last_verified_at timestamptz,
  last_sync_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  cursor jsonb not null default '{}'::jsonb,
  coverage jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source,scope_key,external_account_key)
);

create table if not exists alliance_data.external_sync_contracts (
  id uuid primary key default extensions.gen_random_uuid(),
  source text not null references alliance_data.external_source_catalog(source),
  object_type text not null,
  target_schema text,
  target_table text,
  canonical_entity text,
  sync_direction text not null default 'inbound'
    check(sync_direction in ('inbound','outbound','bidirectional')),
  sync_mode text not null default 'incremental'
    check(sync_mode in ('snapshot','incremental','webhook','event','manual')),
  external_key text,
  incremental_field text,
  default_frequency interval,
  pii_classification text not null default 'none'
    check(pii_classification in ('none','low','moderate','high')),
  knowledge_policy text not null default 'exclude'
    check(knowledge_policy in ('exclude','metadata_only','summary','fulltext')),
  retention_policy text not null default 'current_plus_history',
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source,object_type)
);

create table if not exists alliance_data.external_sync_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  connection_id uuid not null references alliance_data.external_connections(id) on delete cascade,
  object_type text,
  trigger_type text not null default 'manual'
    check(trigger_type in ('manual','cron','webhook','backfill','agent')),
  status text not null default 'running'
    check(status in ('running','success','partial','failed','cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_read bigint not null default 0,
  rows_written bigint not null default 0,
  rows_skipped bigint not null default 0,
  rows_failed bigint not null default 0,
  cursor_before jsonb not null default '{}'::jsonb,
  cursor_after jsonb not null default '{}'::jsonb,
  error text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists alliance_data.external_objects (
  id uuid primary key default extensions.gen_random_uuid(),
  source text not null references alliance_data.external_source_catalog(source),
  connection_id uuid references alliance_data.external_connections(id) on delete set null,
  brand_id uuid references public.brands(id) on delete cascade,
  scope_key text generated always as (coalesce(brand_id::text,'global')) stored,
  object_type text not null,
  external_id text not null,
  external_parent_id text,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  observed_at timestamptz not null default now(),
  ingested_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  content_hash text generated always as (md5(payload::text)) stored,
  metadata jsonb not null default '{}'::jsonb,
  unique(source,scope_key,object_type,external_id)
);

create table if not exists alliance_data.external_entity_map (
  id uuid primary key default extensions.gen_random_uuid(),
  source text not null references alliance_data.external_source_catalog(source),
  brand_id uuid references public.brands(id) on delete cascade,
  scope_key text generated always as (coalesce(brand_id::text,'global')) stored,
  object_type text not null,
  external_id text not null,
  canonical_type text not null,
  canonical_id text not null,
  mapping_method text not null default 'manual'
    check(mapping_method in ('manual','exact','rule','import','agent_suggested')),
  confidence numeric(5,4),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source,scope_key,object_type,external_id,canonical_type,canonical_id)
);

create index if not exists external_connections_brand_source_idx
  on alliance_data.external_connections(brand_id,source);
create index if not exists external_sync_runs_conn_time_idx
  on alliance_data.external_sync_runs(connection_id,started_at desc);
create index if not exists external_objects_source_brand_type_idx
  on alliance_data.external_objects(source,brand_id,object_type,observed_at desc);
create index if not exists external_objects_external_lookup_idx
  on alliance_data.external_objects(source,object_type,external_id);
create index if not exists external_entity_map_canonical_idx
  on alliance_data.external_entity_map(canonical_type,canonical_id)
  where is_active;

alter table alliance_data.external_source_catalog enable row level security;
alter table alliance_data.external_connections enable row level security;
alter table alliance_data.external_sync_contracts enable row level security;
alter table alliance_data.external_sync_runs enable row level security;
alter table alliance_data.external_objects enable row level security;
alter table alliance_data.external_entity_map enable row level security;

drop policy if exists external_source_catalog_admin_read on alliance_data.external_source_catalog;
create policy external_source_catalog_admin_read
on alliance_data.external_source_catalog for select to authenticated
using (app.sou_admin());

drop policy if exists external_sync_contracts_admin_read on alliance_data.external_sync_contracts;
create policy external_sync_contracts_admin_read
on alliance_data.external_sync_contracts for select to authenticated
using (app.sou_admin());

drop policy if exists external_connections_scoped_read on alliance_data.external_connections;
create policy external_connections_scoped_read
on alliance_data.external_connections for select to authenticated
using (
  app.sou_admin()
  or (brand_id is not null and app.pode_acessar_marca(brand_id))
);

drop policy if exists external_objects_scoped_read on alliance_data.external_objects;
create policy external_objects_scoped_read
on alliance_data.external_objects for select to authenticated
using (
  app.sou_admin()
  or (brand_id is not null and app.pode_acessar_marca(brand_id))
);

drop policy if exists external_entity_map_scoped_read on alliance_data.external_entity_map;
create policy external_entity_map_scoped_read
on alliance_data.external_entity_map for select to authenticated
using (
  app.sou_admin()
  or (brand_id is not null and app.pode_acessar_marca(brand_id))
);

drop policy if exists external_sync_runs_scoped_read on alliance_data.external_sync_runs;
create policy external_sync_runs_scoped_read
on alliance_data.external_sync_runs for select to authenticated
using (
  exists(
    select 1
    from alliance_data.external_connections c
    where c.id=connection_id
      and (
        app.sou_admin()
        or (c.brand_id is not null and app.pode_acessar_marca(c.brand_id))
      )
  )
);

revoke all on all tables in schema alliance_data from anon;
revoke insert,update,delete,truncate,references,trigger
on alliance_data.external_source_catalog,
   alliance_data.external_connections,
   alliance_data.external_sync_contracts,
   alliance_data.external_sync_runs,
   alliance_data.external_objects,
   alliance_data.external_entity_map
from authenticated;

insert into alliance_data.external_source_catalog(
  source,display_name,category,default_scope,data_classification,system_of_record,
  knowledge_eligible,supports_incremental,supports_webhook,preferred_connector,
  default_sync_interval,lifecycle_status,metadata
)
values
('shopify','Shopify','ecommerce','brand','confidential',true,true,true,true,'alliance_native',interval '15 minutes','available',
 jsonb_build_object('canonical_targets',jsonb_build_array('shopify_orders','shopify_order_items','shopify_inventory','shopify_fulfillments','shopify_sessions_daily'))),
('activecampaign','ActiveCampaign','crm_email','mixed','restricted',true,true,true,true,'alliance_native',interval '30 minutes','available',
 jsonb_build_object('contact_pii',true,'campaign_metrics',true)),
('google_drive','Google Drive','files_knowledge','mixed','confidential',true,true,true,true,'alliance_native',interval '15 minutes','available',
 jsonb_build_object('documents_target','alliance_data.documents','knowledge_target','alliance_data.knowledge_chunks')),
('gmail','Gmail','email','global','restricted',true,false,true,true,'alliance_native',interval '15 minutes','available',
 jsonb_build_object('knowledge_default','exclude','ingest_only_explicit_workflows',true)),
('meta_ads','Meta Ads','paid_media','brand','confidential',true,true,true,true,'n8n',interval '1 hour','available',
 jsonb_build_object('canonical_targets',jsonb_build_array('meta_campaign_insights_daily','meta_adset_insights_daily','meta_ad_insights_daily'))),
('instagram','Instagram','social','brand','confidential',true,true,true,true,'n8n',interval '6 hours','available',
 jsonb_build_object('canonical_targets',jsonb_build_array('instagram_snapshots'))),
('whatsapp','WhatsApp / Meta WABA','messaging','brand','restricted',true,false,true,true,'n8n',interval '1 hour','available',
 jsonb_build_object('canonical_targets',jsonb_build_array('meta_whatsapp','meta_whatsapp_templates'))),
('sendflow','Sendflow','messaging','mixed','restricted',false,false,false,true,'webhook',null,'available',
 jsonb_build_object('purpose','whatsapp_groups')),
('unnichat','UnniChat','messaging','mixed','restricted',false,false,false,true,'webhook',null,'available',
 jsonb_build_object('purpose','individual_whatsapp')),
('google_ads','Google Ads','paid_media','brand','confidential',true,true,true,true,'n8n',interval '1 hour','planned','{}'::jsonb)
on conflict(source) do update set
  display_name=excluded.display_name,
  category=excluded.category,
  default_scope=excluded.default_scope,
  data_classification=excluded.data_classification,
  system_of_record=excluded.system_of_record,
  knowledge_eligible=excluded.knowledge_eligible,
  supports_incremental=excluded.supports_incremental,
  supports_webhook=excluded.supports_webhook,
  preferred_connector=excluded.preferred_connector,
  default_sync_interval=excluded.default_sync_interval,
  lifecycle_status=excluded.lifecycle_status,
  metadata=excluded.metadata,
  updated_at=now();

insert into alliance_data.external_sync_contracts(
  source,object_type,target_schema,target_table,canonical_entity,sync_direction,sync_mode,
  external_key,incremental_field,default_frequency,pii_classification,knowledge_policy,retention_policy,metadata
)
values
('shopify','orders','public','shopify_orders','commerce.order','inbound','incremental','shopify_order_id','updated_at',interval '15 minutes','moderate','metadata_only','full_history','{}'),
('shopify','order_items','public','shopify_order_items','commerce.order_item','inbound','incremental','shopify_line_item_id','updated_at',interval '15 minutes','low','exclude','full_history','{}'),
('shopify','inventory','public','shopify_inventory','commerce.inventory','inbound','snapshot','inventory_item_id','updated_at',interval '15 minutes','none','exclude','current_plus_history','{}'),
('shopify','fulfillments','public','shopify_fulfillments','commerce.fulfillment','inbound','incremental','shopify_fulfillment_id','updated_at',interval '15 minutes','moderate','metadata_only','full_history','{}'),
('shopify','sessions_daily','public','shopify_sessions_daily','commerce.session_metrics','inbound','incremental','metric_date','metric_date',interval '1 day','none','summary','full_history','{}'),
('activecampaign','campaigns',null,null,'marketing.email_campaign','inbound','incremental','campaign_id','updated_at',interval '30 minutes','none','summary','full_history',jsonb_build_object('storage','external_objects_until_typed_table_needed')),
('activecampaign','contacts',null,null,'crm.contact','inbound','incremental','contact_id','updated_at',interval '30 minutes','high','exclude','current_plus_history',jsonb_build_object('storage','external_objects','pii_minimize',true)),
('google_drive','folders',null,null,'knowledge.folder','inbound','incremental','file_id','modified_time',interval '15 minutes','none','metadata_only','current_plus_history',jsonb_build_object('storage','external_objects')),
('google_drive','documents','alliance_data','documents','knowledge.document','inbound','incremental','file_id','modified_time',interval '15 minutes','moderate','fulltext','full_history','{}'),
('gmail','messages',null,null,'communication.email','inbound','incremental','message_id','internal_date',interval '15 minutes','high','exclude','current_plus_history',jsonb_build_object('ingest_only_explicit_workflows',true)),
('meta_ads','campaign_insights','public','meta_campaign_insights_daily','marketing.ad_campaign_metric','inbound','incremental','campaign_id','date_start',interval '1 hour','none','summary','full_history','{}'),
('meta_ads','adset_insights','public','meta_adset_insights_daily','marketing.adset_metric','inbound','incremental','adset_id','date_start',interval '1 hour','none','summary','full_history','{}'),
('meta_ads','ad_insights','public','meta_ad_insights_daily','marketing.ad_metric','inbound','incremental','ad_id','date_start',interval '1 hour','none','summary','full_history','{}'),
('instagram','snapshots','public','instagram_snapshots','social.instagram_snapshot','inbound','snapshot','account_id','snapshot_date',interval '6 hours','none','summary','full_history','{}'),
('whatsapp','number_quality','public','meta_whatsapp','messaging.whatsapp_number','inbound','snapshot','phone_number_id','snapshot_date',interval '1 hour','none','exclude','full_history','{}'),
('whatsapp','templates','public','meta_whatsapp_templates','messaging.whatsapp_template','inbound','incremental','template_id','updated_at',interval '1 hour','none','metadata_only','current_plus_history','{}'),
('sendflow','group_events',null,null,'messaging.group_event','inbound','webhook','event_id','event_at',null,'moderate','exclude','full_history',jsonb_build_object('storage','external_objects')),
('unnichat','message_events',null,null,'messaging.message_event','inbound','webhook','event_id','event_at',null,'high','exclude','full_history',jsonb_build_object('storage','external_objects'))
on conflict(source,object_type) do update set
  target_schema=excluded.target_schema,
  target_table=excluded.target_table,
  canonical_entity=excluded.canonical_entity,
  sync_direction=excluded.sync_direction,
  sync_mode=excluded.sync_mode,
  external_key=excluded.external_key,
  incremental_field=excluded.incremental_field,
  default_frequency=excluded.default_frequency,
  pii_classification=excluded.pii_classification,
  knowledge_policy=excluded.knowledge_policy,
  retention_policy=excluded.retention_policy,
  metadata=excluded.metadata,
  updated_at=now();

-- Verified connector observations. No credentials are stored here.
insert into alliance_data.external_connections(
  source,brand_id,external_account_key,external_account_name,connector_type,
  connection_status,sync_status,secrets_location,last_verified_at,coverage,metadata
)
select 'shopify',b.id,'botanikabrasil.com.br','Botanika Brasil','chat_connector',
       'verified','manual_snapshot','external_platform',now(),
       jsonb_build_object('orders_total_observed',3868),
       jsonb_build_object('currency','BRL','timezone','-03','country','Brazil','native_alliance_sync',false)
from public.brands b where b.slug='botanika'
on conflict(source,scope_key,external_account_key) do update set
  external_account_name=excluded.external_account_name,
  connector_type=excluded.connector_type,
  connection_status=excluded.connection_status,
  sync_status=excluded.sync_status,
  secrets_location=excluded.secrets_location,
  last_verified_at=excluded.last_verified_at,
  coverage=excluded.coverage,
  metadata=excluded.metadata,
  updated_at=now();

insert into alliance_data.external_connections(
  source,brand_id,external_account_key,external_account_name,connector_type,
  connection_status,sync_status,secrets_location,last_verified_at,coverage,metadata
)
select 'activecampaign',b.id,'connected-account','Botanika ActiveCampaign','chat_connector',
       'verified','manual_snapshot','external_platform',now(),
       jsonb_build_object('campaigns_total_observed',84,'contacts_total_observed',114011),
       jsonb_build_object('native_alliance_sync',false,'contact_pii_not_copied',true)
from public.brands b where b.slug='botanika'
on conflict(source,scope_key,external_account_key) do update set
  external_account_name=excluded.external_account_name,
  connector_type=excluded.connector_type,
  connection_status=excluded.connection_status,
  sync_status=excluded.sync_status,
  secrets_location=excluded.secrets_location,
  last_verified_at=excluded.last_verified_at,
  coverage=excluded.coverage,
  metadata=excluded.metadata,
  updated_at=now();

insert into alliance_data.external_connections(
  source,brand_id,external_account_key,external_account_name,connector_type,
  connection_status,sync_status,secrets_location,last_verified_at,coverage,metadata
)
values
('gmail',null,'primary','Alliance Workspace Gmail','chat_connector','verified','manual_snapshot','external_platform',now(),
 jsonb_build_object('profile_verified',true),jsonb_build_object('native_alliance_sync',false,'message_ingestion_default','disabled'))
on conflict(source,scope_key,external_account_key) do update set
  external_account_name=excluded.external_account_name,
  connector_type=excluded.connector_type,
  connection_status=excluded.connection_status,
  sync_status=excluded.sync_status,
  secrets_location=excluded.secrets_location,
  last_verified_at=excluded.last_verified_at,
  coverage=excluded.coverage,
  metadata=excluded.metadata,
  updated_at=now();

insert into alliance_data.external_connections(
  source,brand_id,external_account_key,external_account_name,connector_type,
  connection_status,sync_status,secrets_location,last_verified_at,coverage,metadata
)
select 'google_drive',b.id,x.drive_id,x.account_name,'chat_connector',
       x.connection_status,x.sync_status,'external_platform',
       case when x.connection_status='verified' then now() else null end,
       x.coverage,x.metadata
from public.brands b
join (
  values
  ('botanika','0AFdA5bpyMdo3Uk9PVA','Botanika Drive','verified','manual_snapshot',
    jsonb_build_object('brand_folders_detected',true),
    jsonb_build_object('representative_folder_id','1uimmspvCzxO2dQLAlMp_3t561t9WVc53','representative_folder_name','Hair Botanika','native_document_sync',false)),
  ('revita','0AFDZM2KaC49hUk9PVA','Revita Drive','verified','manual_snapshot',
    jsonb_build_object('brand_folders_detected',true),
    jsonb_build_object('representative_folder_id','1fA9R32vdHvaHe1gVi0dyKjvFMMucibhG','representative_folder_name','00. Lançamento Revita Derma','marketing_folder_id','1uw_gOsed3DrWdh-LjrupeR9AB05TFk32','native_document_sync',false)),
  ('vermefree','0AJHwaAQvWccYUk9PVA','VermeFree Drive','verified','manual_snapshot',
    jsonb_build_object('brand_folders_detected',true),
    jsonb_build_object('representative_folder_id','1z3jFJ0jFyrjqdDlfLr7NwM-cmNhGe3uh','representative_folder_name','08-05 a 20-05 — Lançamento VermeFree','native_document_sync',false)),
  ('shoty','not-found','Shoty Drive','unverified','not_configured',
    jsonb_build_object('brand_folders_detected',false),
    jsonb_build_object('discovery_result','no_folder_match_found','native_document_sync',false))
) as x(slug,drive_id,account_name,connection_status,sync_status,coverage,metadata)
on b.slug=x.slug
on conflict(source,scope_key,external_account_key) do update set
  external_account_name=excluded.external_account_name,
  connector_type=excluded.connector_type,
  connection_status=excluded.connection_status,
  sync_status=excluded.sync_status,
  secrets_location=excluded.secrets_location,
  last_verified_at=excluded.last_verified_at,
  coverage=excluded.coverage,
  metadata=excluded.metadata,
  updated_at=now();

-- Planned native connections per brand, explicit rather than ambiguous empty tables.
insert into alliance_data.external_connections(
  source,brand_id,external_account_key,external_account_name,connector_type,
  connection_status,sync_status,secrets_location,coverage,metadata
)
select s.source,b.id,'default',b.nome||' '||s.display_name,'unknown',
       'not_connected','schema_ready','none',
       jsonb_build_object('target_schema_ready',true),
       jsonb_build_object('requires_credentials_or_existing_automation_bridge',true)
from public.brands b
cross join (
  select source,display_name
  from alliance_data.external_source_catalog
  where source in ('meta_ads','instagram','whatsapp')
) s
where b.ativo
on conflict(source,scope_key,external_account_key) do nothing;

insert into alliance_data.external_connections(
  source,brand_id,external_account_key,external_account_name,connector_type,
  connection_status,sync_status,secrets_location,coverage,metadata
)
select s.source,null,'global',s.display_name,'unknown','not_connected','not_configured','none',
       '{}'::jsonb,jsonb_build_object('requires_connector_configuration',true)
from alliance_data.external_source_catalog s
where s.source in ('sendflow','unnichat','google_ads')
on conflict(source,scope_key,external_account_key) do nothing;

-- Safe, non-PII observations for inventory/audit.
insert into alliance_data.external_objects(
  source,connection_id,brand_id,object_type,external_id,observed_at,payload,metadata
)
select c.source,c.id,c.brand_id,'shop','botanikabrasil.com.br',now(),
       jsonb_build_object(
         'name','Botanika Brasil',
         'domain','botanikabrasil.com.br',
         'currency','BRL',
         'timezone','-03',
         'country','Brazil',
         'orders_total_observed',3868
       ),
       jsonb_build_object('snapshot_kind','connector_verification')
from alliance_data.external_connections c
where c.source='shopify' and c.external_account_key='botanikabrasil.com.br'
on conflict(source,scope_key,object_type,external_id) do update set
  connection_id=excluded.connection_id,
  observed_at=excluded.observed_at,
  payload=excluded.payload,
  metadata=excluded.metadata,
  ingested_at=now();

insert into alliance_data.external_objects(
  source,connection_id,brand_id,object_type,external_id,observed_at,payload,metadata
)
select c.source,c.id,c.brand_id,'account_summary','connected-account',now(),
       jsonb_build_object('campaigns_total_observed',84,'contacts_total_observed',114011),
       jsonb_build_object('snapshot_kind','connector_verification','pii_copied',false)
from alliance_data.external_connections c
where c.source='activecampaign' and c.external_account_key='connected-account'
on conflict(source,scope_key,object_type,external_id) do update set
  connection_id=excluded.connection_id,
  observed_at=excluded.observed_at,
  payload=excluded.payload,
  metadata=excluded.metadata,
  ingested_at=now();

insert into alliance_data.external_objects(
  source,connection_id,brand_id,object_type,external_id,external_parent_id,observed_at,payload,metadata
)
select c.source,c.id,c.brand_id,'folder',
       c.metadata->>'representative_folder_id',
       null,now(),
       jsonb_build_object(
         'name',c.metadata->>'representative_folder_name',
         'drive_id',c.external_account_key
       ),
       jsonb_build_object('snapshot_kind','drive_discovery')
from alliance_data.external_connections c
where c.source='google_drive'
  and c.connection_status='verified'
  and nullif(c.metadata->>'representative_folder_id','') is not null
on conflict(source,scope_key,object_type,external_id) do update set
  connection_id=excluded.connection_id,
  observed_at=excluded.observed_at,
  payload=excluded.payload,
  metadata=excluded.metadata,
  ingested_at=now();

-- Keep legacy registry compatible but make status semantics explicit.
update public.integration_sources i
set meta=coalesce(i.meta,'{}'::jsonb)
  || case
    when i.source='shopify' and b.slug='botanika' then
      jsonb_build_object('connector_verified',true,'connector_type','chat_connector','native_sync',false,'orders_total_observed',3868)
    when i.source='shopify' then
      jsonb_build_object('connector_verified',false,'native_sync',false,'note','Connected Shopify connector currently points to Botanika')
    when i.source='google_drive' and b.slug in ('botanika','revita','vermefree') then
      jsonb_build_object('connector_verified',true,'connector_type','chat_connector','native_sync',false,'document_ingestion',false)
    when i.source='google_drive' and b.slug='shoty' then
      jsonb_build_object('connector_verified',false,'native_sync',false,'discovery_result','no_folder_match_found')
    else '{}'::jsonb
  end,
  updated_at=now()
from public.brands b
where b.id=i.brand_id
  and i.source in ('shopify','google_drive');

insert into public.integration_sources(
  brand_id,source,status,last_sync_at,last_success_at,last_error,meta,created_at,updated_at
)
select b.id,'activecampaign','pendente',null,null,null,
       jsonb_build_object(
         'schema_ready',true,
         'connector_verified',true,
         'connector_type','chat_connector',
         'native_sync',false,
         'campaigns_total_observed',84,
         'contacts_total_observed',114011,
         'pii_copied',false
       ),
       now(),now()
from public.brands b
where b.slug='botanika'
on conflict(brand_id,source) do update set
  meta=public.integration_sources.meta||excluded.meta,
  updated_at=now();

create or replace view alliance_data.external_source_health
with (security_invoker=true)
as
select
  c.id connection_id,
  c.source,
  s.display_name,
  s.category,
  c.brand_id,
  b.nome brand_name,
  c.external_account_key,
  c.external_account_name,
  c.connector_type,
  c.connection_status,
  c.sync_status,
  c.last_verified_at,
  c.last_sync_at,
  c.last_success_at,
  c.last_error,
  c.coverage,
  c.metadata,
  coalesce((
    select jsonb_build_object(
      'status',r.status,
      'started_at',r.started_at,
      'finished_at',r.finished_at,
      'rows_read',r.rows_read,
      'rows_written',r.rows_written,
      'rows_failed',r.rows_failed
    )
    from alliance_data.external_sync_runs r
    where r.connection_id=c.id
    order by r.started_at desc
    limit 1
  ),'{}'::jsonb) last_run,
  case
    when c.connection_status='error' or c.sync_status='error' then 'error'
    when c.connection_status='verified' and c.sync_status='active' then 'healthy'
    when c.connection_status='verified' and c.sync_status='manual_snapshot' then 'accessible_not_automated'
    when c.connection_status='verified' and c.sync_status='schema_ready' then 'connected_not_syncing'
    when c.connection_status='not_connected' and c.sync_status='schema_ready' then 'schema_ready_connection_missing'
    when c.connection_status='unverified' then 'unverified'
    else 'not_configured'
  end health_status
from alliance_data.external_connections c
join alliance_data.external_source_catalog s on s.source=c.source
left join public.brands b on b.id=c.brand_id;

create or replace view alliance_data.external_data_inventory
with (security_invoker=true)
as
select
  o.source,
  o.brand_id,
  b.nome brand_name,
  o.object_type,
  count(*)::bigint object_count,
  max(o.observed_at) last_observed_at,
  max(o.ingested_at) last_ingested_at
from alliance_data.external_objects o
left join public.brands b on b.id=o.brand_id
where not o.is_deleted
group by o.source,o.brand_id,b.nome,o.object_type;

insert into alliance_data.data_catalog(
  id,domain,entity,source_schema,source_object,storage_model,brand_scoped,status,notes,metadata,updated_at
)
values
('external.sources','integrations','external_sources','alliance_data','external_source_catalog','canonical',true,'ready',
 'Catálogo canônico de fontes externas, conexões, contratos, snapshots, mapeamentos e histórico de sincronização. Credenciais nunca são armazenadas nessas tabelas.',
 jsonb_build_object(
   'health_view','alliance_data.external_source_health',
   'inventory_view','alliance_data.external_data_inventory',
   'credentials_policy','vault_or_platform_only',
   'connection_vs_sync_separated',true
 ),now())
on conflict(id) do update set
  notes=excluded.notes,
  metadata=excluded.metadata,
  status=excluded.status,
  updated_at=excluded.updated_at;

create table if not exists alliance_data.task_assignees (
  task_id text not null,
  position integer not null,
  profile_id uuid,
  display_name text,
  primary key (task_id, position),
  constraint task_assignees_task_fkey
    foreign key (task_id) references alliance_data.tasks(id)
    on delete cascade deferrable initially deferred,
  constraint task_assignees_profile_fkey
    foreign key (profile_id) references public.profiles(id)
    deferrable initially deferred
);

create table if not exists alliance_data.task_dependencies (
  task_id text not null,
  position integer not null,
  depends_on_task_id text not null,
  primary key (task_id, position),
  constraint task_dependencies_task_fkey
    foreign key (task_id) references alliance_data.tasks(id)
    on delete cascade deferrable initially deferred,
  constraint task_dependencies_target_fkey
    foreign key (depends_on_task_id) references alliance_data.tasks(id)
    deferrable initially deferred
);

create table if not exists alliance_data.task_tags (
  task_id text not null,
  position integer not null,
  tag_id uuid,
  name text,
  color text,
  raw jsonb not null default '{}'::jsonb,
  primary key (task_id, position),
  constraint task_tags_task_fkey
    foreign key (task_id) references alliance_data.tasks(id)
    on delete cascade deferrable initially deferred
);

create table if not exists alliance_data.campaign_channels (
  campaign_id text not null,
  position integer not null,
  channel text not null,
  primary key (campaign_id, position),
  constraint campaign_channels_campaign_fkey
    foreign key (campaign_id) references alliance_data.campaigns(id)
    on delete cascade deferrable initially deferred
);

create table if not exists alliance_data.campaign_products (
  campaign_id text not null,
  position integer not null,
  sku text,
  name text,
  price numeric,
  discount numeric,
  raw jsonb not null default '{}'::jsonb,
  primary key (campaign_id, position),
  constraint campaign_products_campaign_fkey
    foreign key (campaign_id) references alliance_data.campaigns(id)
    on delete cascade deferrable initially deferred
);

create table if not exists alliance_data.delivery_files (
  delivery_id text not null,
  position integer not null,
  file_id text,
  name text,
  mime_type text,
  size_bytes bigint,
  has_inline_data boolean not null default false,
  inline_data_chars bigint not null default 0,
  drive_file_id text,
  drive_folder_id text,
  raw_metadata jsonb not null default '{}'::jsonb,
  primary key (delivery_id, position),
  constraint delivery_files_delivery_fkey
    foreign key (delivery_id) references alliance_data.deliveries(id)
    on delete cascade deferrable initially deferred
);

create table if not exists alliance_data.delivery_links (
  delivery_id text not null,
  position integer not null,
  link_id text,
  label text,
  url text,
  primary key (delivery_id, position),
  constraint delivery_links_delivery_fkey
    foreign key (delivery_id) references alliance_data.deliveries(id)
    on delete cascade deferrable initially deferred
);

create table if not exists alliance_data.delivery_events (
  delivery_id text not null,
  position integer not null,
  occurred_at timestamptz,
  actor_id uuid,
  actor_name text,
  origin text,
  field text,
  message text,
  before_value jsonb,
  after_value jsonb,
  raw jsonb not null default '{}'::jsonb,
  primary key (delivery_id, position),
  constraint delivery_events_delivery_fkey
    foreign key (delivery_id) references alliance_data.deliveries(id)
    on delete cascade deferrable initially deferred
);

alter table alliance_data.task_assignees enable row level security;
alter table alliance_data.task_dependencies enable row level security;
alter table alliance_data.task_tags enable row level security;
alter table alliance_data.campaign_channels enable row level security;
alter table alliance_data.campaign_products enable row level security;
alter table alliance_data.delivery_files enable row level security;
alter table alliance_data.delivery_links enable row level security;
alter table alliance_data.delivery_events enable row level security;

revoke all on alliance_data.task_assignees from public,anon,authenticated;
revoke all on alliance_data.task_dependencies from public,anon,authenticated;
revoke all on alliance_data.task_tags from public,anon,authenticated;
revoke all on alliance_data.campaign_channels from public,anon,authenticated;
revoke all on alliance_data.campaign_products from public,anon,authenticated;
revoke all on alliance_data.delivery_files from public,anon,authenticated;
revoke all on alliance_data.delivery_links from public,anon,authenticated;
revoke all on alliance_data.delivery_events from public,anon,authenticated;

grant select,insert,update,delete on alliance_data.task_assignees to service_role;
grant select,insert,update,delete on alliance_data.task_dependencies to service_role;
grant select,insert,update,delete on alliance_data.task_tags to service_role;
grant select,insert,update,delete on alliance_data.campaign_channels to service_role;
grant select,insert,update,delete on alliance_data.campaign_products to service_role;
grant select,insert,update,delete on alliance_data.delivery_files to service_role;
grant select,insert,update,delete on alliance_data.delivery_links to service_role;
grant select,insert,update,delete on alliance_data.delivery_events to service_role;

create index if not exists task_assignees_profile_idx
  on alliance_data.task_assignees(profile_id) where profile_id is not null;
create index if not exists task_dependencies_target_idx
  on alliance_data.task_dependencies(depends_on_task_id);
create index if not exists task_tags_tag_idx
  on alliance_data.task_tags(tag_id) where tag_id is not null;
create index if not exists campaign_channels_channel_idx
  on alliance_data.campaign_channels(channel);
create index if not exists campaign_products_sku_idx
  on alliance_data.campaign_products(sku) where sku is not null;
create index if not exists delivery_files_drive_idx
  on alliance_data.delivery_files(drive_file_id) where drive_file_id is not null;
create index if not exists delivery_events_time_idx
  on alliance_data.delivery_events(occurred_at desc) where occurred_at is not null;
create index if not exists delivery_events_actor_idx
  on alliance_data.delivery_events(actor_id) where actor_id is not null;

create or replace function alliance_data.refresh_relational_facets(p_source_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_source_key='central.tasks.vitor-gutierrez' then
    delete from alliance_data.task_assignees
    where task_id in (select id from alliance_data.tasks where source_key=p_source_key);
    delete from alliance_data.task_dependencies
    where task_id in (select id from alliance_data.tasks where source_key=p_source_key);
    delete from alliance_data.task_tags
    where task_id in (select id from alliance_data.tasks where source_key=p_source_key);

    insert into alliance_data.task_assignees(task_id,position,profile_id,display_name)
    select
      t.id,
      gs.n+1,
      alliance_data.try_uuid(nullif(t.assignee_ids->>gs.n,'')),
      nullif(t.assignees->>gs.n,'')
    from alliance_data.tasks t
    cross join lateral generate_series(
      0,
      greatest(
        jsonb_array_length(coalesce(t.assignee_ids,'[]'::jsonb)),
        jsonb_array_length(coalesce(t.assignees,'[]'::jsonb))
      ) - 1
    ) gs(n)
    where t.source_key=p_source_key;

    insert into alliance_data.task_dependencies(task_id,position,depends_on_task_id)
    select t.id,d.ord::int,d.dep_id
    from alliance_data.tasks t
    cross join lateral jsonb_array_elements_text(coalesce(t.dependencies,'[]'::jsonb))
      with ordinality d(dep_id,ord)
    where t.source_key=p_source_key
      and nullif(d.dep_id,'') is not null;

    insert into alliance_data.task_tags(task_id,position,tag_id,name,color,raw)
    select
      t.id,
      x.ord::int,
      alliance_data.try_uuid(nullif(x.item->>'id','')),
      coalesce(x.item->>'nome',x.item->>'name'),
      coalesce(x.item->>'cor',x.item->>'color'),
      x.item
    from alliance_data.tasks t
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(t.tags)='array' then t.tags else '[]'::jsonb end
    ) with ordinality x(item,ord)
    where t.source_key=p_source_key;

  elsif p_source_key='central.campaigns.vitor-gutierrez' then
    delete from alliance_data.campaign_channels
    where campaign_id in (select id from alliance_data.campaigns where source_key=p_source_key);
    delete from alliance_data.campaign_products
    where campaign_id in (select id from alliance_data.campaigns where source_key=p_source_key);

    insert into alliance_data.campaign_channels(campaign_id,position,channel)
    select c.id,x.ord::int,x.channel
    from alliance_data.campaigns c
    cross join lateral jsonb_array_elements_text(
      case when jsonb_typeof(c.channels)='array' then c.channels else '[]'::jsonb end
    ) with ordinality x(channel,ord)
    where c.source_key=p_source_key;

    insert into alliance_data.campaign_products(campaign_id,position,sku,name,price,discount,raw)
    select
      c.id,
      x.ord::int,
      nullif(x.item->>'sku',''),
      nullif(x.item->>'name',''),
      case when coalesce(x.item->>'price','') ~ '^-?[0-9]+([.][0-9]+)?$'
        then (x.item->>'price')::numeric else null end,
      case when coalesce(x.item->>'discount','') ~ '^-?[0-9]+([.][0-9]+)?$'
        then (x.item->>'discount')::numeric else null end,
      x.item
    from alliance_data.campaigns c
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(c.products)='array' then c.products else '[]'::jsonb end
    ) with ordinality x(item,ord)
    where c.source_key=p_source_key;

  elsif p_source_key='central.deliveries.workspace.v1' then
    delete from alliance_data.delivery_files
    where delivery_id in (select id from alliance_data.deliveries where source_key=p_source_key);
    delete from alliance_data.delivery_links
    where delivery_id in (select id from alliance_data.deliveries where source_key=p_source_key);
    delete from alliance_data.delivery_events
    where delivery_id in (select id from alliance_data.deliveries where source_key=p_source_key);

    insert into alliance_data.delivery_files(
      delivery_id,position,file_id,name,mime_type,size_bytes,
      has_inline_data,inline_data_chars,drive_file_id,drive_folder_id,raw_metadata
    )
    select
      d.id,
      x.ord::int,
      nullif(x.item->>'id',''),
      nullif(x.item->>'name',''),
      coalesce(nullif(x.item->>'type',''),nullif(x.item->>'mimeType','')),
      case when coalesce(x.item->>'size','') ~ '^[0-9]+$'
        then (x.item->>'size')::bigint else null end,
      x.item ? 'dataUrl',
      case when x.item ? 'dataUrl' then length(x.item->>'dataUrl')::bigint else 0 end,
      coalesce(nullif(x.item->>'driveFileId',''),nullif(x.item->>'drive_file_id','')),
      coalesce(nullif(x.item->>'driveFolderId',''),nullif(x.item->>'drive_folder_id','')),
      x.item - 'dataUrl'
    from alliance_data.deliveries d
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(d.files)='array' then d.files else '[]'::jsonb end
    ) with ordinality x(item,ord)
    where d.source_key=p_source_key;

    insert into alliance_data.delivery_links(delivery_id,position,link_id,label,url)
    select
      d.id,
      x.ord::int,
      nullif(x.item->>'id',''),
      nullif(x.item->>'label',''),
      nullif(x.item->>'url','')
    from alliance_data.deliveries d
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(d.links)='array' then d.links else '[]'::jsonb end
    ) with ordinality x(item,ord)
    where d.source_key=p_source_key;

    insert into alliance_data.delivery_events(
      delivery_id,position,occurred_at,actor_id,actor_name,origin,field,
      message,before_value,after_value,raw
    )
    select
      d.id,
      x.ord::int,
      alliance_data.try_timestamptz(nullif(x.item->>'at','')),
      alliance_data.try_uuid(nullif(x.item->>'authorId','')),
      nullif(x.item->>'by',''),
      nullif(x.item->>'origin',''),
      nullif(x.item->>'campo',''),
      nullif(x.item->>'text',''),
      x.item->'antes',
      x.item->'depois',
      x.item
    from alliance_data.deliveries d
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(d.events)='array' then d.events else '[]'::jsonb end
    ) with ordinality x(item,ord)
    where d.source_key=p_source_key;
  end if;
end;
$function$;

revoke all on function alliance_data.refresh_relational_facets(text)
from public,anon,authenticated;
grant execute on function alliance_data.refresh_relational_facets(text)
to service_role;

select alliance_data.refresh_relational_facets('central.tasks.vitor-gutierrez');
select alliance_data.refresh_relational_facets('central.campaigns.vitor-gutierrez');
select alliance_data.refresh_relational_facets('central.deliveries.workspace.v1');

insert into alliance_data.data_catalog(
  id,domain,entity,source_schema,source_object,storage_model,brand_scoped,status,notes,metadata,updated_at
) values
('operation.task_assignees','operation','task_assignees','alliance_data','task_assignees','canonical',true,'active','Relação normalizada tarefa ↔ responsável, derivada do estado canônico.',jsonb_build_object('derived_from','operation.tasks'),now()),
('operation.task_dependencies','operation','task_dependencies','alliance_data','task_dependencies','canonical',true,'active','Grafo normalizado de dependências entre tarefas.',jsonb_build_object('derived_from','operation.tasks'),now()),
('operation.task_tags','operation','task_tags','alliance_data','task_tags','canonical',true,'active','Tags normalizadas por tarefa.',jsonb_build_object('derived_from','operation.tasks'),now()),
('operation.campaign_channels','operation','campaign_channels','alliance_data','campaign_channels','canonical',true,'active','Canais normalizados por campanha.',jsonb_build_object('derived_from','operation.campaigns'),now()),
('operation.campaign_products','operation','campaign_products','alliance_data','campaign_products','canonical',true,'active','Produtos e condições comerciais normalizados por campanha.',jsonb_build_object('derived_from','operation.campaigns'),now()),
('operation.delivery_files','operation','delivery_files','alliance_data','delivery_files','canonical',true,'active','Metadados normalizados de arquivos de entrega; conteúdo base64 não é duplicado.',jsonb_build_object('derived_from','operation.deliveries','inline_payload_copied',false),now()),
('operation.delivery_links','operation','delivery_links','alliance_data','delivery_links','canonical',true,'active','Links normalizados por entrega.',jsonb_build_object('derived_from','operation.deliveries'),now()),
('operation.delivery_events','history','delivery_events','alliance_data','delivery_events','canonical',true,'active','Linha do tempo normalizada de eventos das entregas.',jsonb_build_object('derived_from','operation.deliveries'),now())
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

alter table alliance_data.knowledge_chunks
  add column if not exists embedding_claimed_at timestamptz,
  add column if not exists embedding_attempts integer not null default 0,
  add column if not exists embedding_error text;

alter table alliance_data.knowledge_chunks
  alter column embedding type extensions.vector(384)
  using case
    when embedding is null then null
    when extensions.vector_dims(embedding)=384 then embedding::extensions.vector(384)
    else null
  end;

drop index if exists alliance_data.knowledge_chunks_embedding_hnsw_idx;
create index if not exists knowledge_chunks_embedding_hnsw_idx
  on alliance_data.knowledge_chunks
  using hnsw (embedding extensions.vector_ip_ops);

create table if not exists alliance_data.agent_roles (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alliance_data.agent_role_permissions (
  role_id text not null references alliance_data.agent_roles(id) on delete cascade,
  capability text not null,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(role_id,capability)
);

create table if not exists alliance_data.agent_definitions (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  role_id text not null references alliance_data.agent_roles(id),
  status text not null default 'draft' check(status in ('draft','active','paused','archived')),
  scope_mode text not null default 'explicit' check(scope_mode in ('alliance','explicit')),
  instructions text,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alliance_data.agent_brand_access (
  agent_id uuid not null references alliance_data.agent_definitions(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  access_level text not null default 'read' check(access_level in ('read','write','admin')),
  created_at timestamptz not null default now(),
  primary key(agent_id,brand_id)
);

create table if not exists alliance_data.agent_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  agent_id uuid references alliance_data.agent_definitions(id),
  actor_id uuid references public.profiles(id),
  brand_id uuid references public.brands(id),
  request_id text,
  status text not null default 'running' check(status in ('running','completed','failed','cancelled')),
  input_summary text,
  output_summary text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists agent_runs_request_id_uidx
  on alliance_data.agent_runs(request_id)
  where request_id is not null;
create index if not exists agent_runs_agent_time_idx
  on alliance_data.agent_runs(agent_id,started_at desc);
create index if not exists agent_runs_brand_time_idx
  on alliance_data.agent_runs(brand_id,started_at desc);

insert into alliance_data.agent_roles(id,name,description)
values
('observer','Observer','Somente leitura de contexto, conhecimento e dados operacionais.'),
('operator','Operator','Leitura completa e ações operacionais limitadas.'),
('orchestrator','Orchestrator','Coordenação entre áreas, integrações e ações operacionais com auditoria.')
on conflict(id) do update set name=excluded.name,description=excluded.description,updated_at=now();

insert into alliance_data.agent_role_permissions(role_id,capability,allowed)
values
('observer','read.tasks',true),('observer','read.campaigns',true),('observer','read.deliveries',true),
('observer','read.knowledge',true),('observer','search.knowledge',true),
('operator','read.tasks',true),('operator','read.campaigns',true),('operator','read.deliveries',true),
('operator','read.knowledge',true),('operator','search.knowledge',true),('operator','write.tasks',true),
('operator','write.campaigns',true),('operator','write.deliveries',true),('operator','write.comments',true),
('orchestrator','read.tasks',true),('orchestrator','read.campaigns',true),('orchestrator','read.deliveries',true),
('orchestrator','read.knowledge',true),('orchestrator','search.knowledge',true),('orchestrator','write.tasks',true),
('orchestrator','write.campaigns',true),('orchestrator','write.deliveries',true),('orchestrator','write.comments',true),
('orchestrator','manage.lists',true),('orchestrator','manage.planning',true),('orchestrator','execute.integrations',true)
on conflict(role_id,capability) do update set allowed=excluded.allowed;

alter table alliance_data.agent_roles enable row level security;
alter table alliance_data.agent_role_permissions enable row level security;
alter table alliance_data.agent_definitions enable row level security;
alter table alliance_data.agent_brand_access enable row level security;
alter table alliance_data.agent_runs enable row level security;

drop policy if exists agent_roles_admin_read on alliance_data.agent_roles;
create policy agent_roles_admin_read on alliance_data.agent_roles for select to authenticated using (app.sou_admin());
drop policy if exists agent_role_permissions_admin_read on alliance_data.agent_role_permissions;
create policy agent_role_permissions_admin_read on alliance_data.agent_role_permissions for select to authenticated using (app.sou_admin());
drop policy if exists agent_definitions_admin_read on alliance_data.agent_definitions;
create policy agent_definitions_admin_read on alliance_data.agent_definitions for select to authenticated using (app.sou_admin());
drop policy if exists agent_brand_access_admin_read on alliance_data.agent_brand_access;
create policy agent_brand_access_admin_read on alliance_data.agent_brand_access for select to authenticated using (app.sou_admin());
drop policy if exists agent_runs_scoped_read on alliance_data.agent_runs;
create policy agent_runs_scoped_read on alliance_data.agent_runs for select to authenticated using (
  app.sou_admin() or actor_id=auth.uid() or (brand_id is not null and app.pode_acessar_marca(brand_id))
);

create or replace function alliance_data.refresh_operational_knowledge(p_source_key text)
returns integer
language plpgsql
security definer
set search_path=''
as $function$
declare v_type text; v_count integer:=0;
begin
  if p_source_key='central.tasks.vitor-gutierrez' then
    v_type:='task';
    with src as (
      select t.brand_id,t.id::text source_id,t.title,
        concat_ws(E'\n',nullif(t.description,''),'Status: '||coalesce(t.status,''),
          'Prioridade: '||coalesce(t.priority,''),'Projeto: '||coalesce(t.project,''),
          case when t.due_at is not null then 'Prazo: '||t.due_at::text else null end,
          case when t.campaign_id is not null then 'Campanha: '||t.campaign_id else null end,
          case when jsonb_array_length(coalesce(t.assignees,'[]'::jsonb))>0 then 'Responsáveis: '||t.assignees::text else null end
        ) content,
        jsonb_build_object('status',t.status,'priority',t.priority,'project',t.project,'campaign_id',t.campaign_id,
          'task_list_id',t.task_list_id,'parent_task_id',t.parent_task_id,'due_at',t.due_at,'archived',t.is_archived) metadata
      from alliance_data.tasks t where t.source_key=p_source_key
    ), prepared as (
      select *,md5(coalesce(title,'')||E'\n'||coalesce(content,'')) content_hash from src
    )
    insert into alliance_data.knowledge_chunks(brand_id,source_type,source_id,chunk_index,title,content,content_hash,metadata)
    select brand_id,v_type,source_id,0,title,content,content_hash,metadata from prepared
    on conflict(source_type,source_id,chunk_index) do update set
      brand_id=excluded.brand_id,title=excluded.title,content=excluded.content,metadata=excluded.metadata,
      embedding=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding end,
      embedding_model=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_model end,
      embedding_dimensions=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_dimensions end,
      embedding_updated_at=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_updated_at end,
      embedding_claimed_at=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_claimed_at end,
      embedding_attempts=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then 0 else alliance_data.knowledge_chunks.embedding_attempts end,
      embedding_error=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_error end,
      content_hash=excluded.content_hash,updated_at=clock_timestamp();
    delete from alliance_data.knowledge_chunks k where k.source_type=v_type and not exists(select 1 from alliance_data.tasks t where t.id::text=k.source_id);

  elsif p_source_key='central.campaigns.vitor-gutierrez' then
    v_type:='campaign';
    with src as (
      select c.brand_id,c.id::text source_id,c.name title,
        concat_ws(E'\n',nullif(c.objective,''),nullif(c.goal,''),'Status: '||coalesce(c.status,''),
          'Tipo: '||coalesce(c.type,''),'Mês: '||coalesce(c.month_ref,''),
          case when c.offer is not null then 'Oferta: '||c.offer::text else null end,
          case when c.products is not null then 'Produtos: '||c.products::text else null end,
          case when c.channels is not null then 'Canais: '||c.channels::text else null end
        ) content,
        jsonb_build_object('status',c.status,'type',c.type,'month_ref',c.month_ref,'start_at',c.start_at,'end_at',c.end_at,'archived',c.is_archived) metadata
      from alliance_data.campaigns c where c.source_key=p_source_key
    ), prepared as (
      select *,md5(coalesce(title,'')||E'\n'||coalesce(content,'')) content_hash from src
    )
    insert into alliance_data.knowledge_chunks(brand_id,source_type,source_id,chunk_index,title,content,content_hash,metadata)
    select brand_id,v_type,source_id,0,title,content,content_hash,metadata from prepared
    on conflict(source_type,source_id,chunk_index) do update set
      brand_id=excluded.brand_id,title=excluded.title,content=excluded.content,metadata=excluded.metadata,
      embedding=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding end,
      embedding_model=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_model end,
      embedding_dimensions=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_dimensions end,
      embedding_updated_at=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_updated_at end,
      embedding_claimed_at=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_claimed_at end,
      embedding_attempts=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then 0 else alliance_data.knowledge_chunks.embedding_attempts end,
      embedding_error=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_error end,
      content_hash=excluded.content_hash,updated_at=clock_timestamp();
    delete from alliance_data.knowledge_chunks k where k.source_type=v_type and not exists(select 1 from alliance_data.campaigns c where c.id::text=k.source_id);

  elsif p_source_key='central.deliveries.workspace.v1' then
    v_type:='delivery';
    with src as (
      select d.brand_id,d.id::text source_id,d.title,
        concat_ws(E'\n',nullif(d.note,''),'Status: '||coalesce(d.status,''),'Projeto: '||coalesce(d.project,''),
          case when d.sender is not null then 'De: '||d.sender else null end,
          case when d.recipient is not null then 'Para: '||d.recipient else null end
        ) content,
        jsonb_build_object('status',d.status,'project',d.project,'source_task_id',d.source_task_id,
          'target_task_id',d.target_task_id,'created_at',d.created_at,'updated_at',d.updated_at,'archived',d.is_archived) metadata
      from alliance_data.deliveries d where d.source_key=p_source_key
    ), prepared as (
      select *,md5(coalesce(title,'')||E'\n'||coalesce(content,'')) content_hash from src
    )
    insert into alliance_data.knowledge_chunks(brand_id,source_type,source_id,chunk_index,title,content,content_hash,metadata)
    select brand_id,v_type,source_id,0,title,content,content_hash,metadata from prepared
    on conflict(source_type,source_id,chunk_index) do update set
      brand_id=excluded.brand_id,title=excluded.title,content=excluded.content,metadata=excluded.metadata,
      embedding=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding end,
      embedding_model=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_model end,
      embedding_dimensions=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_dimensions end,
      embedding_updated_at=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_updated_at end,
      embedding_claimed_at=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_claimed_at end,
      embedding_attempts=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then 0 else alliance_data.knowledge_chunks.embedding_attempts end,
      embedding_error=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_error end,
      content_hash=excluded.content_hash,updated_at=clock_timestamp();
    delete from alliance_data.knowledge_chunks k where k.source_type=v_type and not exists(select 1 from alliance_data.deliveries d where d.id::text=k.source_id);
  else
    return 0;
  end if;

  select count(*) into v_count from alliance_data.knowledge_chunks where source_type=v_type;
  return v_count;
end
$function$;

revoke all on function alliance_data.refresh_operational_knowledge(text) from public,anon,authenticated;
grant execute on function alliance_data.refresh_operational_knowledge(text) to service_role;

create or replace function alliance_data.sync_operational_knowledge_from_status()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  if tg_op='UPDATE'
     and new.source_hash is not distinct from old.source_hash
     and new.in_sync is not distinct from old.in_sync then
    return new;
  end if;
  if coalesce(new.in_sync,false) then
    perform alliance_data.refresh_operational_knowledge(new.source_key);
  end if;
  return new;
end
$function$;

drop trigger if exists sync_status_refresh_knowledge on alliance_data.sync_status;
create trigger sync_status_refresh_knowledge
after insert or update of source_hash,in_sync on alliance_data.sync_status
for each row execute function alliance_data.sync_operational_knowledge_from_status();

select alliance_data.refresh_operational_knowledge('central.tasks.vitor-gutierrez');
select alliance_data.refresh_operational_knowledge('central.campaigns.vitor-gutierrez');
select alliance_data.refresh_operational_knowledge('central.deliveries.workspace.v1');

insert into alliance_data.data_catalog(id,domain,entity,source_schema,source_object,storage_model,brand_scoped,status,notes,metadata,updated_at)
values(
  'agents.governance','agents','agent_governance','alliance_data','agent_definitions','canonical',true,'ready',
  'Governança para agentes com papéis, capacidades, escopo por marca e auditoria de execuções.',
  jsonb_build_object('roles',jsonb_build_array('observer','operator','orchestrator'),'default_role','observer','writes_require_explicit_role',true),
  now()
)
on conflict(id) do update set notes=excluded.notes,metadata=excluded.metadata,status=excluded.status,updated_at=excluded.updated_at;

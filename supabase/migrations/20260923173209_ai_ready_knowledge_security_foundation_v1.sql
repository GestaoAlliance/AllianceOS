create extension if not exists vector with schema extensions;

alter table alliance_data.tasks enable row level security;
alter table alliance_data.campaigns enable row level security;
alter table alliance_data.deliveries enable row level security;
alter table alliance_data.sync_status enable row level security;

do $policies$
declare t text;
begin
  foreach t in array array['tasks','campaigns','deliveries','activity_events','decisions','documents','learnings']
  loop
    execute format('drop policy if exists %I on alliance_data.%I',t||'_brand_read',t);
    execute format(
      'create policy %I on alliance_data.%I for select to authenticated using (app.estou_ativo() and not app.eh_externo() and ((brand_id is null and app.sou_admin()) or (brand_id is not null and app.pode_acessar_marca(brand_id))))',
      t||'_brand_read',t
    );
  end loop;

  drop policy if exists sync_status_admin_read on alliance_data.sync_status;
  create policy sync_status_admin_read on alliance_data.sync_status for select to authenticated using (app.sou_admin());

  drop policy if exists data_catalog_admin_read on alliance_data.data_catalog;
  create policy data_catalog_admin_read on alliance_data.data_catalog for select to authenticated using (app.sou_admin());

  drop policy if exists task_assignees_parent_read on alliance_data.task_assignees;
  create policy task_assignees_parent_read on alliance_data.task_assignees for select to authenticated using (
    exists(select 1 from alliance_data.tasks t where t.id=task_id and app.pode_acessar_marca(t.brand_id))
  );
  drop policy if exists task_dependencies_parent_read on alliance_data.task_dependencies;
  create policy task_dependencies_parent_read on alliance_data.task_dependencies for select to authenticated using (
    exists(select 1 from alliance_data.tasks t where t.id=task_id and app.pode_acessar_marca(t.brand_id))
  );
  drop policy if exists task_tags_parent_read on alliance_data.task_tags;
  create policy task_tags_parent_read on alliance_data.task_tags for select to authenticated using (
    exists(select 1 from alliance_data.tasks t where t.id=task_id and app.pode_acessar_marca(t.brand_id))
  );
  drop policy if exists campaign_channels_parent_read on alliance_data.campaign_channels;
  create policy campaign_channels_parent_read on alliance_data.campaign_channels for select to authenticated using (
    exists(select 1 from alliance_data.campaigns c where c.id=campaign_id and app.pode_acessar_marca(c.brand_id))
  );
  drop policy if exists campaign_products_parent_read on alliance_data.campaign_products;
  create policy campaign_products_parent_read on alliance_data.campaign_products for select to authenticated using (
    exists(select 1 from alliance_data.campaigns c where c.id=campaign_id and app.pode_acessar_marca(c.brand_id))
  );
  drop policy if exists delivery_files_parent_read on alliance_data.delivery_files;
  create policy delivery_files_parent_read on alliance_data.delivery_files for select to authenticated using (
    exists(select 1 from alliance_data.deliveries d where d.id=delivery_id and app.pode_acessar_marca(d.brand_id))
  );
  drop policy if exists delivery_links_parent_read on alliance_data.delivery_links;
  create policy delivery_links_parent_read on alliance_data.delivery_links for select to authenticated using (
    exists(select 1 from alliance_data.deliveries d where d.id=delivery_id and app.pode_acessar_marca(d.brand_id))
  );
  drop policy if exists delivery_events_parent_read on alliance_data.delivery_events;
  create policy delivery_events_parent_read on alliance_data.delivery_events for select to authenticated using (
    exists(select 1 from alliance_data.deliveries d where d.id=delivery_id and app.pode_acessar_marca(d.brand_id))
  );
end
$policies$;

revoke all on all tables in schema alliance_data from anon;
revoke insert,update,delete,truncate,references,trigger on all tables in schema alliance_data from authenticated;

create table if not exists alliance_data.knowledge_chunks(
  id uuid primary key default extensions.gen_random_uuid(),
  brand_id uuid references public.brands(id),
  source_type text not null,
  source_id text not null,
  chunk_index integer not null default 0,
  title text,
  content text not null,
  content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    to_tsvector('portuguese',coalesce(title,'')||' '||coalesce(content,''))
  ) stored,
  embedding extensions.vector,
  embedding_model text,
  embedding_dimensions integer,
  embedding_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type,source_id,chunk_index)
);
alter table alliance_data.knowledge_chunks enable row level security;
drop policy if exists knowledge_chunks_brand_read on alliance_data.knowledge_chunks;
create policy knowledge_chunks_brand_read on alliance_data.knowledge_chunks
for select to authenticated
using (
  app.estou_ativo() and not app.eh_externo()
  and ((brand_id is null and app.sou_admin()) or (brand_id is not null and app.pode_acessar_marca(brand_id)))
);

create index if not exists knowledge_chunks_brand_idx on alliance_data.knowledge_chunks(brand_id,source_type,source_id);
create index if not exists knowledge_chunks_fts_idx on alliance_data.knowledge_chunks using gin(search_vector);
create index if not exists knowledge_chunks_hash_idx on alliance_data.knowledge_chunks(content_hash);

create or replace function alliance_data.touch_knowledge_chunk()
returns trigger language plpgsql set search_path='' as $f$
begin
  new.updated_at:=clock_timestamp();
  if new.content_hash is null or new.content_hash='' then
    new.content_hash:=md5(coalesce(new.title,'')||E'\n'||coalesce(new.content,''));
  end if;
  if new.embedding is not null then
    new.embedding_dimensions:=extensions.vector_dims(new.embedding);
  else
    new.embedding_dimensions:=null;
  end if;
  return new;
end
$f$;

drop trigger if exists knowledge_chunks_touch on alliance_data.knowledge_chunks;
create trigger knowledge_chunks_touch before insert or update on alliance_data.knowledge_chunks
for each row execute function alliance_data.touch_knowledge_chunk();

create or replace view alliance_data.agent_context with(security_invoker=true) as
select 'task'::text record_type,t.id::text record_id,t.brand_id,t.title,
       concat_ws(E'\n',nullif(t.description,''),'Status: '||coalesce(t.status,''),'Prioridade: '||coalesce(t.priority,'')) content,
       t.status,coalesce(t.due_at,t.source_updated_at) relevant_at,
       jsonb_build_object('campaign_id',t.campaign_id,'list_id',t.task_list_id,'project',t.project,'archived',t.is_archived) metadata
from alliance_data.tasks t
union all
select 'campaign',c.id::text,c.brand_id,c.name,
       concat_ws(E'\n',nullif(c.objective,''),nullif(c.goal,''),'Status: '||coalesce(c.status,''),'Tipo: '||coalesce(c.type,'')),
       c.status,coalesce(c.start_at,c.source_updated_at),
       jsonb_build_object('month_ref',c.month_ref,'end_at',c.end_at,'archived',c.is_archived)
from alliance_data.campaigns c
union all
select 'delivery',d.id::text,d.brand_id,d.title,
       concat_ws(E'\n',nullif(d.note,''),'Status: '||coalesce(d.status,''),'Projeto: '||coalesce(d.project,'')),
       d.status,coalesce(d.updated_at,d.created_at,d.source_updated_at),
       jsonb_build_object('source_task_id',d.source_task_id,'target_task_id',d.target_task_id,'archived',d.is_archived)
from alliance_data.deliveries d
union all
select 'decision',x.id::text,x.brand_id,x.title,
       concat_ws(E'\n',x.decision,nullif(x.rationale,''),nullif(x.expected_outcome,''),nullif(x.actual_outcome,'')),
       x.status,x.decided_at,x.metadata
from alliance_data.decisions x
union all
select 'learning',l.id::text,l.brand_id,l.title,
       concat_ws(E'\n',l.learning,'Categoria: '||coalesce(l.category,'')),
       l.status,l.created_at,
       l.metadata||jsonb_build_object('confidence',l.confidence,'source_type',l.source_type,'source_id',l.source_id)
from alliance_data.learnings l
union all
select 'document',d.id::text,d.brand_id,d.title,coalesce(d.extracted_text,''),
       'active'::text,d.updated_at,
       d.metadata||jsonb_build_object('document_type',d.document_type,'source_system',d.source_system,'source_id',d.source_id,'external_url',d.external_url)
from alliance_data.documents d;

create or replace function alliance_data.search_agent_context(p_query text,p_brand_id uuid default null,p_limit integer default 20)
returns table(record_type text,record_id text,brand_id uuid,title text,content text,status text,relevant_at timestamptz,metadata jsonb,rank real)
language sql stable security invoker set search_path='' as $f$
with q as (select websearch_to_tsquery('portuguese',trim(p_query)) query)
select a.record_type,a.record_id,a.brand_id,a.title,a.content,a.status,a.relevant_at,a.metadata,
       ts_rank_cd(to_tsvector('portuguese',coalesce(a.title,'')||' '||coalesce(a.content,'')),q.query)::real rank
from alliance_data.agent_context a cross join q
where nullif(trim(p_query),'') is not null
  and (p_brand_id is null or a.brand_id=p_brand_id)
  and to_tsvector('portuguese',coalesce(a.title,'')||' '||coalesce(a.content,'')) @@ q.query
order by rank desc,a.relevant_at desc nulls last
limit greatest(1,least(coalesce(p_limit,20),100))
$f$;

create or replace function alliance_data.sync_knowledge_record()
returns trigger language plpgsql security definer set search_path='' as $f$
declare v_source_type text; v_source_id text; v_brand_id uuid; v_title text; v_content text; v_metadata jsonb; v_hash text;
begin
  v_source_type:=case tg_table_name when 'documents' then 'document' when 'decisions' then 'decision' when 'learnings' then 'learning' else null end;
  if v_source_type is null then if tg_op='DELETE' then return old; else return new; end if; end if;
  if tg_op='DELETE' then
    delete from alliance_data.knowledge_chunks where source_type=v_source_type and source_id=old.id::text;
    return old;
  end if;
  v_source_id:=new.id::text; v_brand_id:=new.brand_id;
  if tg_table_name='documents' then
    v_title:=new.title; v_content:=coalesce(new.extracted_text,'');
    v_metadata:=coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('document_type',new.document_type,'source_system',new.source_system,'source_id',new.source_id,'external_url',new.external_url);
  elsif tg_table_name='decisions' then
    v_title:=new.title; v_content:=concat_ws(E'\n',new.decision,nullif(new.rationale,''),nullif(new.expected_outcome,''),nullif(new.actual_outcome,''));
    v_metadata:=coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('status',new.status,'campaign_id',new.campaign_id,'decided_at',new.decided_at);
  else
    v_title:=new.title; v_content:=new.learning;
    v_metadata:=coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('category',new.category,'status',new.status,'source_type',new.source_type,'source_id',new.source_id,'confidence',new.confidence,'evidence',new.evidence);
  end if;
  v_hash:=md5(coalesce(v_title,'')||E'\n'||coalesce(v_content,''));
  insert into alliance_data.knowledge_chunks(brand_id,source_type,source_id,chunk_index,title,content,content_hash,metadata)
  values(v_brand_id,v_source_type,v_source_id,0,v_title,coalesce(v_content,''),v_hash,coalesce(v_metadata,'{}'::jsonb))
  on conflict(source_type,source_id,chunk_index) do update set
    brand_id=excluded.brand_id,title=excluded.title,content=excluded.content,content_hash=excluded.content_hash,metadata=excluded.metadata,
    embedding=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding end,
    embedding_model=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_model end,
    embedding_dimensions=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_dimensions end,
    embedding_updated_at=case when alliance_data.knowledge_chunks.content_hash is distinct from excluded.content_hash then null else alliance_data.knowledge_chunks.embedding_updated_at end,
    updated_at=clock_timestamp();
  return new;
end
$f$;

drop trigger if exists documents_sync_knowledge on alliance_data.documents;
create trigger documents_sync_knowledge after insert or update or delete on alliance_data.documents for each row execute function alliance_data.sync_knowledge_record();
drop trigger if exists decisions_sync_knowledge on alliance_data.decisions;
create trigger decisions_sync_knowledge after insert or update or delete on alliance_data.decisions for each row execute function alliance_data.sync_knowledge_record();
drop trigger if exists learnings_sync_knowledge on alliance_data.learnings;
create trigger learnings_sync_knowledge after insert or update or delete on alliance_data.learnings for each row execute function alliance_data.sync_knowledge_record();

create or replace function alliance_data.search_knowledge_keywords(p_query text,p_brand_id uuid default null,p_limit integer default 20)
returns table(id uuid,brand_id uuid,source_type text,source_id text,chunk_index integer,title text,content text,metadata jsonb,rank real)
language sql stable security invoker set search_path='' as $f$
with q as (select websearch_to_tsquery('portuguese',trim(p_query)) query)
select k.id,k.brand_id,k.source_type,k.source_id,k.chunk_index,k.title,k.content,k.metadata,ts_rank_cd(k.search_vector,q.query)::real
from alliance_data.knowledge_chunks k cross join q
where nullif(trim(p_query),'') is not null and (p_brand_id is null or k.brand_id=p_brand_id) and k.search_vector@@q.query
order by ts_rank_cd(k.search_vector,q.query) desc,k.updated_at desc
limit greatest(1,least(coalesce(p_limit,20),100))
$f$;

create or replace function alliance_data.search_knowledge_semantic(p_query_embedding extensions.vector,p_embedding_model text default null,p_brand_id uuid default null,p_limit integer default 20)
returns table(id uuid,brand_id uuid,source_type text,source_id text,chunk_index integer,title text,content text,metadata jsonb,similarity double precision)
language sql stable security invoker set search_path='' as $f$
select k.id,k.brand_id,k.source_type,k.source_id,k.chunk_index,k.title,k.content,k.metadata,
       (1-(k.embedding OPERATOR(extensions.<=>) p_query_embedding))::double precision
from alliance_data.knowledge_chunks k
where k.embedding is not null
  and extensions.vector_dims(k.embedding)=extensions.vector_dims(p_query_embedding)
  and (p_embedding_model is null or k.embedding_model=p_embedding_model)
  and (p_brand_id is null or k.brand_id=p_brand_id)
order by k.embedding OPERATOR(extensions.<=>) p_query_embedding
limit greatest(1,least(coalesce(p_limit,20),100))
$f$;

revoke all on function alliance_data.search_agent_context(text,uuid,integer) from anon,public;
revoke all on function alliance_data.search_knowledge_keywords(text,uuid,integer) from anon,public;
revoke all on function alliance_data.search_knowledge_semantic(extensions.vector,text,uuid,integer) from anon,public;
grant execute on function alliance_data.search_agent_context(text,uuid,integer),alliance_data.search_knowledge_keywords(text,uuid,integer),alliance_data.search_knowledge_semantic(extensions.vector,text,uuid,integer) to authenticated,service_role;

do $public_policies$
declare t text; has_brand boolean; pol text;
begin
  foreach t in array array[
    'agenda_publica','botanika_jun26_captura','compra_aprovada','disparos_manual','emails','instagram_snapshots',
    'integration_sources','meta_ad_insights_daily','meta_adset_insights_daily','meta_campaign_insights_daily',
    'meta_whatsapp','meta_whatsapp_templates','shopify_fulfillment_events','shopify_fulfillment_items',
    'shopify_fulfillment_order_items','shopify_fulfillment_orders','shopify_fulfillment_tracking','shopify_fulfillments',
    'shopify_inventory','shopify_order_items','shopify_orders','shopify_sessions_daily','system_feature_flags'
  ] loop
    select exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=t and c.column_name='brand_id') into has_brand;
    pol:=t||'_scoped_read';
    execute format('drop policy if exists %I on public.%I',pol,t);
    if has_brand then
      execute format('create policy %I on public.%I for select to authenticated using (app.estou_ativo() and not app.eh_externo() and app.pode_acessar_marca(brand_id))',pol,t);
    else
      execute format('create policy %I on public.%I for select to authenticated using (app.sou_admin())',pol,t);
    end if;
  end loop;
end
$public_policies$;

create or replace function public.convite_de(p_email text)
returns jsonb language plpgsql stable security definer set search_path='public','pg_temp' as $f$
declare e text:=lower(trim(coalesce(p_email,''))); c public.equipe_convites%rowtype; primeiro boolean; v_self_account boolean:=false;
begin
  if e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then return jsonb_build_object('erro','email'); end if;
  if auth.uid() is not null then
    select exists(select 1 from auth.users u where u.id=auth.uid() and lower(coalesce(u.email,''))=e) into v_self_account;
  end if;
  select not exists(select 1 from public.profiles) into primeiro;
  if primeiro then
    return jsonb_build_object('convidado',true,'nome','Administrador Alliance','ja_tem_conta',case when auth.uid() is not null then v_self_account else null end);
  end if;
  select * into c from public.equipe_convites where lower(email)=e;
  return jsonb_build_object('convidado',c.email is not null,'nome',coalesce(c.nome,''),'ja_tem_conta',case when auth.uid() is not null then v_self_account else null end);
end
$f$;
revoke execute on function public.convite_de(text) from public;
grant execute on function public.convite_de(text) to anon,authenticated,service_role;

insert into alliance_data.data_catalog(id,domain,entity,source_schema,source_object,storage_model,brand_scoped,status,notes,metadata,updated_at)
values(
  'knowledge.chunks','knowledge','knowledge_chunks','alliance_data','knowledge_chunks','canonical',true,'ready',
  'Base para RAG e agentes: busca textual ativa, pgvector preparado e embeddings opcionais/provider-agnostic.',
  jsonb_build_object('fts',true,'vector_ready',true,'auto_sync',true,'embedding_dimension_dynamic',true,'vector_index_deferred_until_model_selected',true),
  now()
)
on conflict(id) do update set notes=excluded.notes,metadata=excluded.metadata,status=excluded.status,updated_at=excluded.updated_at;

insert into alliance_data.data_catalog(id,domain,entity,source_schema,source_object,storage_model,brand_scoped,status,notes,metadata,updated_at)
values(
  'security.rpc_surface','security','rpc_surface','public','functions','canonical',false,'active',
  'RPCs SECURITY DEFINER autenticados são a camada intencional de autorização do AllianceOS. convite_de permanece anônimo para descoberta de convite, mas não revela existência de conta.',
  jsonb_build_object('reviewed_at',now(),'anon_rpc','convite_de','account_enumeration_removed',true),
  now()
)
on conflict(id) do update set notes=excluded.notes,metadata=excluded.metadata,status=excluded.status,updated_at=excluded.updated_at;

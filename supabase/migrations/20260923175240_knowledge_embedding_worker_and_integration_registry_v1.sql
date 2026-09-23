alter table public.integration_sources
  drop constraint if exists integration_sources_source_check;
alter table public.integration_sources
  add constraint integration_sources_source_check
  check (source = any(array[
    'shopify'::text,'meta_ads'::text,'instagram'::text,'whatsapp'::text,'email'::text,
    'activecampaign'::text,'sendflow'::text,'unnichat'::text,'google_ads'::text,
    'google_drive'::text,'other'::text
  ]));

create or replace function public.ai_validate_worker_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
  select exists(
    select 1
    from vault.decrypted_secrets s
    where s.name='knowledge_worker_token'
      and s.decrypted_secret=p_token
  )
$function$;

create or replace function public.ai_claim_knowledge_chunks(p_limit integer default 50)
returns table(id uuid,title text,content text,content_hash text)
language plpgsql
security definer
set search_path=''
as $function$
begin
  return query
  with picked as (
    select k.id
    from alliance_data.knowledge_chunks k
    where k.embedding is null
      and k.embedding_attempts < 10
      and (
        k.embedding_claimed_at is null
        or k.embedding_claimed_at < clock_timestamp()-interval '10 minutes'
      )
    order by k.updated_at asc,k.id
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,50),100))
  )
  update alliance_data.knowledge_chunks k
     set embedding_claimed_at=clock_timestamp(),
         embedding_attempts=k.embedding_attempts+1,
         embedding_error=null
    from picked
   where k.id=picked.id
  returning k.id,k.title,k.content,k.content_hash;
end
$function$;

create or replace function public.ai_complete_knowledge_embedding(
  p_id uuid,
  p_content_hash text,
  p_embedding extensions.vector(384),
  p_model text
)
returns boolean
language plpgsql
security definer
set search_path=''
as $function$
declare v_rows integer;
begin
  update alliance_data.knowledge_chunks
     set embedding=p_embedding,
         embedding_model=coalesce(nullif(p_model,''),'gte-small'),
         embedding_dimensions=384,
         embedding_updated_at=clock_timestamp(),
         embedding_claimed_at=null,
         embedding_error=null,
         updated_at=clock_timestamp()
   where id=p_id
     and content_hash=p_content_hash;
  get diagnostics v_rows=row_count;
  return v_rows=1;
end
$function$;

create or replace function public.ai_fail_knowledge_embedding(p_id uuid,p_error text)
returns void
language sql
security definer
set search_path=''
as $function$
  update alliance_data.knowledge_chunks
     set embedding_claimed_at=null,
         embedding_error=left(coalesce(p_error,'unknown_error'),1000),
         updated_at=clock_timestamp()
   where id=p_id
$function$;

revoke all on function public.ai_validate_worker_token(text) from public,anon,authenticated;
revoke all on function public.ai_claim_knowledge_chunks(integer) from public,anon,authenticated;
revoke all on function public.ai_complete_knowledge_embedding(uuid,text,extensions.vector,text) from public,anon,authenticated;
revoke all on function public.ai_fail_knowledge_embedding(uuid,text) from public,anon,authenticated;
grant execute on function public.ai_validate_worker_token(text) to service_role;
grant execute on function public.ai_claim_knowledge_chunks(integer) to service_role;
grant execute on function public.ai_complete_knowledge_embedding(uuid,text,extensions.vector,text) to service_role;
grant execute on function public.ai_fail_knowledge_embedding(uuid,text) to service_role;

create or replace function public.buscar_conhecimento_semantico(
  p_query_embedding extensions.vector(384),
  p_brand_id uuid default null,
  p_limit integer default 20
)
returns table(
  id uuid,brand_id uuid,source_type text,source_id text,chunk_index integer,
  title text,content text,metadata jsonb,similarity double precision
)
language sql
stable
security invoker
set search_path=''
as $function$
  select *
  from alliance_data.search_knowledge_semantic(
    p_query_embedding,
    'gte-small',
    p_brand_id,
    p_limit
  )
$function$;

revoke all on function public.buscar_conhecimento_semantico(extensions.vector,uuid,integer) from public,anon;
grant execute on function public.buscar_conhecimento_semantico(extensions.vector,uuid,integer) to authenticated,service_role;

do $secret$
begin
  if not exists(select 1 from vault.secrets where name='knowledge_worker_token') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32),'hex'),
      'knowledge_worker_token',
      'Internal token for AllianceOS knowledge embedding worker'
    );
  end if;
end
$secret$;

create or replace function app.enqueue_knowledge_embeddings(p_limit integer default 50)
returns bigint
language plpgsql
security definer
set search_path=''
as $function$
declare v_token text; v_request_id bigint;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name='knowledge_worker_token'
  limit 1;

  if v_token is null then
    raise exception 'knowledge_worker_token ausente';
  end if;

  select net.http_post(
    url:='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/knowledge-embeddings',
    headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',v_token),
    body:=jsonb_build_object('limit',greatest(1,least(coalesce(p_limit,50),100)))
  )
  into v_request_id;

  return v_request_id;
end
$function$;

revoke all on function app.enqueue_knowledge_embeddings(integer) from public,anon,authenticated;
grant execute on function app.enqueue_knowledge_embeddings(integer) to service_role;

do $cron$
declare r record;
begin
  for r in select jobid from cron.job where jobname='alliance-knowledge-embeddings'
  loop
    perform cron.unschedule(r.jobid);
  end loop;

  perform cron.schedule(
    'alliance-knowledge-embeddings',
    '* * * * *',
    'select app.enqueue_knowledge_embeddings(100);'
  );
end
$cron$;

insert into public.integration_sources(
  brand_id,source,status,last_sync_at,last_success_at,last_error,meta,created_at,updated_at
)
select b.id,s.source,'pendente',null,null,null,s.meta,now(),now()
from public.brands b
cross join (
  values
    ('shopify'::text,jsonb_build_object('schema_ready',true,'tables',jsonb_build_array('shopify_orders','shopify_order_items','shopify_inventory','shopify_fulfillments','shopify_sessions_daily'))),
    ('meta_ads',jsonb_build_object('schema_ready',true,'tables',jsonb_build_array('meta_campaign_insights_daily','meta_adset_insights_daily','meta_ad_insights_daily'))),
    ('instagram',jsonb_build_object('schema_ready',true,'tables',jsonb_build_array('instagram_snapshots'))),
    ('whatsapp',jsonb_build_object('schema_ready',true,'tables',jsonb_build_array('meta_whatsapp','meta_whatsapp_templates'))),
    ('google_drive',jsonb_build_object('schema_ready',true,'delivery_flow',true,'document_ingestion',false))
) as s(source,meta)
where b.ativo
on conflict(brand_id,source) do nothing;

insert into alliance_data.data_catalog(
  id,domain,entity,source_schema,source_object,storage_model,brand_scoped,status,notes,metadata,updated_at
)
values(
  'knowledge.embeddings','knowledge','knowledge_embeddings','alliance_data','knowledge_chunks','canonical',true,'ready',
  'Embeddings automáticos usando gte-small nativo do Supabase Edge Runtime, sem API externa paga.',
  jsonb_build_object('model','gte-small','dimensions',384,'worker','knowledge-embeddings','search_function','knowledge-search','cron','alliance-knowledge-embeddings'),
  now()
)
on conflict(id) do update set notes=excluded.notes,metadata=excluded.metadata,status=excluded.status,updated_at=excluded.updated_at;

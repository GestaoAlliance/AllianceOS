create index if not exists agent_brand_access_brand_idx
  on alliance_data.agent_brand_access(brand_id);
create index if not exists agent_definitions_created_by_idx
  on alliance_data.agent_definitions(created_by)
  where created_by is not null;
create index if not exists agent_definitions_role_idx
  on alliance_data.agent_definitions(role_id);
create index if not exists agent_runs_actor_idx
  on alliance_data.agent_runs(actor_id)
  where actor_id is not null;

create index if not exists external_entity_map_brand_idx
  on alliance_data.external_entity_map(brand_id)
  where brand_id is not null;
create index if not exists external_objects_brand_idx
  on alliance_data.external_objects(brand_id)
  where brand_id is not null;
create index if not exists external_objects_connection_idx
  on alliance_data.external_objects(connection_id)
  where connection_id is not null;

drop policy if exists agent_runs_scoped_read on alliance_data.agent_runs;
create policy agent_runs_scoped_read
on alliance_data.agent_runs for select to authenticated
using (
  app.sou_admin()
  or actor_id=(select auth.uid())
  or (brand_id is not null and app.pode_acessar_marca(brand_id))
);

drop policy if exists external_source_catalog_admin_read on alliance_data.external_source_catalog;
create policy external_source_catalog_internal_read
on alliance_data.external_source_catalog for select to authenticated
using (app.estou_ativo() and not app.eh_externo());

create or replace function alliance_data.begin_external_sync(
  p_connection_id uuid,
  p_object_type text default null,
  p_trigger_type text default 'manual',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_run_id uuid;
begin
  if p_trigger_type not in ('manual','cron','webhook','backfill','agent') then
    raise exception 'trigger_type inválido: %',p_trigger_type;
  end if;

  if not exists(
    select 1 from alliance_data.external_connections c where c.id=p_connection_id
  ) then
    raise exception 'Conexão externa não encontrada';
  end if;

  insert into alliance_data.external_sync_runs(
    connection_id,object_type,trigger_type,status,metadata
  )
  values(
    p_connection_id,nullif(p_object_type,''),p_trigger_type,'running',coalesce(p_metadata,'{}'::jsonb)
  )
  returning id into v_run_id;

  update alliance_data.external_connections
  set last_sync_at=clock_timestamp(),
      sync_status=case when sync_status='paused' then 'paused' else 'active' end,
      last_error=null,
      updated_at=clock_timestamp()
  where id=p_connection_id;

  return v_run_id;
end
$function$;

create or replace function alliance_data.upsert_external_object(
  p_connection_id uuid,
  p_object_type text,
  p_external_id text,
  p_payload jsonb,
  p_external_parent_id text default null,
  p_source_created_at timestamptz default null,
  p_source_updated_at timestamptz default null,
  p_is_deleted boolean default false,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_source text;
  v_brand_id uuid;
  v_id uuid;
begin
  select c.source,c.brand_id into v_source,v_brand_id
  from alliance_data.external_connections c
  where c.id=p_connection_id;

  if v_source is null then
    raise exception 'Conexão externa não encontrada';
  end if;

  if nullif(trim(p_object_type),'') is null or nullif(trim(p_external_id),'') is null then
    raise exception 'object_type e external_id são obrigatórios';
  end if;

  insert into alliance_data.external_objects(
    source,connection_id,brand_id,object_type,external_id,external_parent_id,
    source_created_at,source_updated_at,observed_at,ingested_at,is_deleted,payload,metadata
  )
  values(
    v_source,p_connection_id,v_brand_id,p_object_type,p_external_id,p_external_parent_id,
    p_source_created_at,p_source_updated_at,clock_timestamp(),clock_timestamp(),
    coalesce(p_is_deleted,false),coalesce(p_payload,'{}'::jsonb),coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict(source,scope_key,object_type,external_id) do update set
    connection_id=excluded.connection_id,
    external_parent_id=excluded.external_parent_id,
    source_created_at=coalesce(excluded.source_created_at,alliance_data.external_objects.source_created_at),
    source_updated_at=coalesce(excluded.source_updated_at,alliance_data.external_objects.source_updated_at),
    observed_at=excluded.observed_at,
    ingested_at=excluded.ingested_at,
    is_deleted=excluded.is_deleted,
    payload=excluded.payload,
    metadata=excluded.metadata
  returning id into v_id;

  return v_id;
end
$function$;

create or replace function alliance_data.complete_external_sync(
  p_run_id uuid,
  p_status text,
  p_rows_read bigint default 0,
  p_rows_written bigint default 0,
  p_rows_skipped bigint default 0,
  p_rows_failed bigint default 0,
  p_cursor_after jsonb default '{}'::jsonb,
  p_error text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_connection_id uuid;
begin
  if p_status not in ('success','partial','failed','cancelled') then
    raise exception 'status final inválido: %',p_status;
  end if;

  update alliance_data.external_sync_runs
  set status=p_status,
      finished_at=clock_timestamp(),
      rows_read=greatest(coalesce(p_rows_read,0),0),
      rows_written=greatest(coalesce(p_rows_written,0),0),
      rows_skipped=greatest(coalesce(p_rows_skipped,0),0),
      rows_failed=greatest(coalesce(p_rows_failed,0),0),
      cursor_after=coalesce(p_cursor_after,'{}'::jsonb),
      error=left(p_error,2000),
      metadata=metadata||coalesce(p_metadata,'{}'::jsonb)
  where id=p_run_id
    and status='running'
  returning connection_id into v_connection_id;

  if v_connection_id is null then
    raise exception 'Execução de sync não encontrada ou já finalizada';
  end if;

  update alliance_data.external_connections
  set sync_status=case
        when p_status='success' then 'active'
        when p_status='partial' then 'active'
        when p_status='failed' then 'error'
        else sync_status
      end,
      connection_status=case
        when p_status in ('success','partial') then
          case when connection_status='not_connected' then 'verified' else connection_status end
        else connection_status
      end,
      last_success_at=case when p_status in ('success','partial') then clock_timestamp() else last_success_at end,
      last_error=case when p_status='failed' then left(p_error,2000) else null end,
      cursor=case when p_status in ('success','partial') then coalesce(p_cursor_after,'{}'::jsonb) else cursor end,
      updated_at=clock_timestamp()
  where id=v_connection_id;
end
$function$;

revoke all on function alliance_data.begin_external_sync(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function alliance_data.upsert_external_object(uuid,text,text,jsonb,text,timestamptz,timestamptz,boolean,jsonb) from public,anon,authenticated;
revoke all on function alliance_data.complete_external_sync(uuid,text,bigint,bigint,bigint,bigint,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function alliance_data.begin_external_sync(uuid,text,text,jsonb) to service_role;
grant execute on function alliance_data.upsert_external_object(uuid,text,text,jsonb,text,timestamptz,timestamptz,boolean,jsonb) to service_role;
grant execute on function alliance_data.complete_external_sync(uuid,text,bigint,bigint,bigint,bigint,jsonb,text,jsonb) to service_role;

update alliance_data.data_catalog
set metadata=coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object(
    'sync_api',jsonb_build_object(
      'begin','alliance_data.begin_external_sync',
      'upsert','alliance_data.upsert_external_object',
      'complete','alliance_data.complete_external_sync'
    ),
    'idempotent_external_object_key',jsonb_build_array('source','brand_scope','object_type','external_id')
  ),
  updated_at=now()
where id='external.sources';

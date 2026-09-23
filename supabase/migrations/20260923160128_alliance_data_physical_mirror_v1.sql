create table if not exists alliance_data.tasks (
  id text primary key,
  source_key text not null,
  source_position bigint not null,
  source_updated_at timestamptz,
  brand_id uuid references public.brands(id),
  brand_name text,
  title text,
  description text,
  status text,
  priority text,
  due_date_text text,
  due_at_text text,
  start_date_text text,
  campaign_id text,
  campaign_source text,
  project text,
  list_id text,
  parent_task_id text,
  channel text,
  assignee_ids jsonb not null default '[]'::jsonb,
  assignees jsonb not null default '[]'::jsonb,
  subtasks jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  embedded_deliveries jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  archived_at_text text,
  archived_by text,
  is_archived boolean not null default false,
  raw jsonb not null,
  mirrored_at timestamptz not null default now()
);

create table if not exists alliance_data.campaigns (
  id text primary key,
  source_key text not null,
  source_position bigint not null,
  source_updated_at timestamptz,
  brand_id uuid references public.brands(id),
  brand_name text,
  name text,
  status text,
  type text,
  objective text,
  goal text,
  start_date_text text,
  start_at_text text,
  end_date_text text,
  end_at_text text,
  month_id text,
  month_ref text,
  client_id text,
  budget jsonb,
  channels jsonb,
  products jsonb,
  offer jsonb,
  benefits jsonb,
  schedule jsonb,
  tags jsonb,
  history jsonb not null default '[]'::jsonb,
  archived_at_text text,
  is_archived boolean not null default false,
  raw jsonb not null,
  mirrored_at timestamptz not null default now()
);

create table if not exists alliance_data.deliveries (
  id text primary key,
  source_key text not null,
  source_position bigint not null,
  source_updated_at timestamptz,
  brand_id uuid references public.brands(id),
  brand_name text,
  title text,
  task_title text,
  status text,
  source_task_id text,
  target_task_id text,
  project text,
  sender text,
  recipient text,
  note text,
  files jsonb,
  links jsonb,
  events jsonb not null default '[]'::jsonb,
  created_at_text text,
  updated_at_text text,
  archived_at_text text,
  archived_by text,
  is_archived boolean not null default false,
  raw jsonb not null,
  mirrored_at timestamptz not null default now()
);

create table if not exists alliance_data.sync_status (
  source_key text primary key,
  entity text not null,
  source_updated_at timestamptz,
  source_count integer not null default 0,
  mirror_count integer not null default 0,
  source_hash text,
  mirror_hash text,
  in_sync boolean not null default false,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists alliance_data_tasks_brand_idx on alliance_data.tasks(brand_id);
create index if not exists alliance_data_tasks_campaign_idx on alliance_data.tasks(campaign_id);
create index if not exists alliance_data_tasks_status_idx on alliance_data.tasks(status);
create index if not exists alliance_data_tasks_source_position_idx on alliance_data.tasks(source_key, source_position);
create index if not exists alliance_data_campaigns_brand_idx on alliance_data.campaigns(brand_id);
create index if not exists alliance_data_campaigns_status_idx on alliance_data.campaigns(status);
create index if not exists alliance_data_campaigns_month_idx on alliance_data.campaigns(month_ref);
create index if not exists alliance_data_campaigns_source_position_idx on alliance_data.campaigns(source_key, source_position);
create index if not exists alliance_data_deliveries_brand_idx on alliance_data.deliveries(brand_id);
create index if not exists alliance_data_deliveries_source_task_idx on alliance_data.deliveries(source_task_id);
create index if not exists alliance_data_deliveries_status_idx on alliance_data.deliveries(status);
create index if not exists alliance_data_deliveries_source_position_idx on alliance_data.deliveries(source_key, source_position);

revoke all on alliance_data.tasks from public, anon, authenticated;
revoke all on alliance_data.campaigns from public, anon, authenticated;
revoke all on alliance_data.deliveries from public, anon, authenticated;
revoke all on alliance_data.sync_status from public, anon, authenticated;
grant select, insert, update, delete on alliance_data.tasks to service_role;
grant select, insert, update, delete on alliance_data.campaigns to service_role;
grant select, insert, update, delete on alliance_data.deliveries to service_role;
grant select, insert, update, delete on alliance_data.sync_status to service_role;

create or replace function alliance_data.refresh_operational_mirror(p_key text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_value jsonb;
  v_updated_at timestamptz;
  v_source_count integer := 0;
  v_mirror_count integer := 0;
  v_source_hash text;
  v_mirror_hash text;
  v_entity text;
begin
  if p_key not in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    return;
  end if;

  select o.valor, o.atualizado_em
    into v_value, v_updated_at
  from public.operacional_estado o
  where o.chave = p_key and o.dono is null
  limit 1;

  v_value := coalesce(v_value, '[]'::jsonb);
  if jsonb_typeof(v_value) <> 'array' then
    raise exception 'Canonical operational state % is not an array', p_key;
  end if;

  v_source_count := jsonb_array_length(v_value);
  v_source_hash := md5(v_value::text);

  if p_key = 'central.tasks.vitor-gutierrez' then
    v_entity := 'tasks';
    delete from alliance_data.tasks where source_key = p_key;

    insert into alliance_data.tasks (
      id, source_key, source_position, source_updated_at, brand_id, brand_name,
      title, description, status, priority, due_date_text, due_at_text, start_date_text,
      campaign_id, campaign_source, project, list_id, parent_task_id, channel,
      assignee_ids, assignees, subtasks, dependencies, checklist, attachments, comments,
      embedded_deliveries, tags, history, archived_at_text, archived_by, is_archived, raw, mirrored_at
    )
    select
      e.item->>'id', p_key, e.ord::bigint, v_updated_at, b.id,
      coalesce(b.nome, nullif(trim(e.item->>'brand'),'')),
      e.item->>'title', e.item->>'description', e.item->>'status', e.item->>'priority',
      e.item->>'due', e.item->>'dueAt', e.item->>'start',
      nullif(e.item->>'campaignId',''), nullif(e.item->>'campaignSource',''),
      nullif(e.item->>'project',''), nullif(e.item->>'listId',''),
      nullif(e.item->>'parentTaskId',''), nullif(e.item->>'channel',''),
      coalesce(e.item->'assigneeIds','[]'::jsonb), coalesce(e.item->'assignees','[]'::jsonb),
      coalesce(e.item->'subtasks','[]'::jsonb), coalesce(e.item->'dependencies','[]'::jsonb),
      coalesce(e.item->'checklist','[]'::jsonb), coalesce(e.item->'attachments','[]'::jsonb),
      coalesce(e.item->'comments','[]'::jsonb), coalesce(e.item->'deliveries','[]'::jsonb),
      coalesce(e.item->'tags','[]'::jsonb), coalesce(e.item->'history','[]'::jsonb),
      nullif(e.item->>'archivedAt',''), nullif(e.item->>'archivedBy',''),
      nullif(e.item->>'archivedAt','') is not null, e.item, clock_timestamp()
    from jsonb_array_elements(v_value) with ordinality as e(item, ord)
    left join public.brands b on lower(b.nome)=lower(trim(coalesce(e.item->>'brand','')))
    where nullif(e.item->>'id','') is not null;

    select count(*)::int, md5(coalesce(jsonb_agg(raw order by source_position),'[]'::jsonb)::text)
      into v_mirror_count, v_mirror_hash
    from alliance_data.tasks where source_key=p_key;

  elsif p_key = 'central.campaigns.vitor-gutierrez' then
    v_entity := 'campaigns';
    delete from alliance_data.campaigns where source_key = p_key;

    insert into alliance_data.campaigns (
      id, source_key, source_position, source_updated_at, brand_id, brand_name,
      name, status, type, objective, goal, start_date_text, start_at_text,
      end_date_text, end_at_text, month_id, month_ref, client_id, budget, channels,
      products, offer, benefits, schedule, tags, history, archived_at_text, is_archived,
      raw, mirrored_at
    )
    select
      e.item->>'id', p_key, e.ord::bigint, v_updated_at, b.id,
      coalesce(b.nome, nullif(trim(e.item->>'brand'),'')),
      e.item->>'name', e.item->>'status', e.item->>'type', e.item->>'objective', e.item->>'goal',
      e.item->>'start', e.item->>'startAt', e.item->>'end', e.item->>'endAt',
      e.item->>'monthId', e.item->>'monthRef', e.item->>'clientId',
      e.item->'budget', e.item->'channels', e.item->'products', e.item->'offer',
      e.item->'benefits', e.item->'schedule', e.item->'tags',
      coalesce(e.item->'history','[]'::jsonb), nullif(e.item->>'archivedAt',''),
      nullif(e.item->>'archivedAt','') is not null, e.item, clock_timestamp()
    from jsonb_array_elements(v_value) with ordinality as e(item, ord)
    left join public.brands b on lower(b.nome)=lower(trim(coalesce(e.item->>'brand','')))
    where nullif(e.item->>'id','') is not null;

    select count(*)::int, md5(coalesce(jsonb_agg(raw order by source_position),'[]'::jsonb)::text)
      into v_mirror_count, v_mirror_hash
    from alliance_data.campaigns where source_key=p_key;

  elsif p_key = 'central.deliveries.workspace.v1' then
    v_entity := 'deliveries';
    delete from alliance_data.deliveries where source_key = p_key;

    insert into alliance_data.deliveries (
      id, source_key, source_position, source_updated_at, brand_id, brand_name,
      title, task_title, status, source_task_id, target_task_id, project,
      sender, recipient, note, files, links, events, created_at_text, updated_at_text,
      archived_at_text, archived_by, is_archived, raw, mirrored_at
    )
    select
      e.item->>'id', p_key, e.ord::bigint, v_updated_at, b.id,
      coalesce(b.nome, nullif(trim(e.item->>'brand'),'')),
      coalesce(e.item->>'title',e.item->>'taskTitle'), e.item->>'taskTitle', e.item->>'status',
      nullif(e.item->>'sourceTaskId',''), nullif(e.item->>'targetTaskId',''),
      e.item->>'project', e.item->>'from', e.item->>'to', e.item->>'note',
      e.item->'files', e.item->'links', coalesce(e.item->'events','[]'::jsonb),
      e.item->>'createdAt', e.item->>'updatedAt', nullif(e.item->>'archivedAt',''),
      nullif(e.item->>'archivedBy',''), nullif(e.item->>'archivedAt','') is not null,
      e.item, clock_timestamp()
    from jsonb_array_elements(v_value) with ordinality as e(item, ord)
    left join lateral (
      select bx.id, bx.nome
      from public.brands bx
      where bx.id::text = nullif(e.item->>'brandId','')
         or (
           nullif(e.item->>'brandId','') is null
           and lower(bx.nome)=lower(trim(coalesce(e.item->>'brand','')))
         )
      order by case when bx.id::text = nullif(e.item->>'brandId','') then 0 else 1 end
      limit 1
    ) b on true
    where nullif(e.item->>'id','') is not null;

    select count(*)::int, md5(coalesce(jsonb_agg(raw order by source_position),'[]'::jsonb)::text)
      into v_mirror_count, v_mirror_hash
    from alliance_data.deliveries where source_key=p_key;
  end if;

  insert into alliance_data.sync_status (
    source_key, entity, source_updated_at, source_count, mirror_count,
    source_hash, mirror_hash, in_sync, last_success_at, last_error, last_error_at, updated_at
  ) values (
    p_key, v_entity, v_updated_at, v_source_count, v_mirror_count,
    v_source_hash, v_mirror_hash,
    (v_source_count=v_mirror_count and v_source_hash=v_mirror_hash),
    clock_timestamp(), null, null, clock_timestamp()
  )
  on conflict (source_key) do update set
    entity=excluded.entity,
    source_updated_at=excluded.source_updated_at,
    source_count=excluded.source_count,
    mirror_count=excluded.mirror_count,
    source_hash=excluded.source_hash,
    mirror_hash=excluded.mirror_hash,
    in_sync=excluded.in_sync,
    last_success_at=excluded.last_success_at,
    last_error=null,
    last_error_at=null,
    updated_at=excluded.updated_at;
end;
$$;

revoke all on function alliance_data.refresh_operational_mirror(text) from public, anon, authenticated;

create or replace function alliance_data.mirror_operacional_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_key text;
  v_new_key text;
  v_key text;
  v_error text;
begin
  if tg_op <> 'INSERT' then v_old_key := old.chave; end if;
  if tg_op <> 'DELETE' then v_new_key := new.chave; end if;

  if v_old_key in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    v_key := v_old_key;
  elsif v_new_key in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    v_key := v_new_key;
  else
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  begin
    perform alliance_data.refresh_operational_mirror(v_key);
    if v_new_key is distinct from v_old_key
       and v_new_key in (
         'central.tasks.vitor-gutierrez',
         'central.campaigns.vitor-gutierrez',
         'central.deliveries.workspace.v1'
       ) then
      perform alliance_data.refresh_operational_mirror(v_new_key);
    end if;
  exception when others then
    v_error := sqlerrm;
    begin
      insert into alliance_data.sync_status (
        source_key, entity, in_sync, last_error, last_error_at, updated_at
      ) values (
        coalesce(v_new_key,v_old_key,'unknown'),
        case
          when coalesce(v_new_key,v_old_key)='central.tasks.vitor-gutierrez' then 'tasks'
          when coalesce(v_new_key,v_old_key)='central.campaigns.vitor-gutierrez' then 'campaigns'
          when coalesce(v_new_key,v_old_key)='central.deliveries.workspace.v1' then 'deliveries'
          else 'unknown'
        end,
        false, v_error, clock_timestamp(), clock_timestamp()
      )
      on conflict (source_key) do update set
        in_sync=false,
        last_error=excluded.last_error,
        last_error_at=excluded.last_error_at,
        updated_at=excluded.updated_at;
    exception when others then null;
    end;
    raise warning 'Alliance data mirror failed for %: %', coalesce(v_new_key,v_old_key), v_error;
  end;

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function alliance_data.mirror_operacional_estado() from public, anon, authenticated;

drop trigger if exists alliance_data_operational_mirror on public.operacional_estado;
create trigger alliance_data_operational_mirror
after insert or update or delete on public.operacional_estado
for each row
execute function alliance_data.mirror_operacional_estado();

select alliance_data.refresh_operational_mirror('central.tasks.vitor-gutierrez');
select alliance_data.refresh_operational_mirror('central.campaigns.vitor-gutierrez');
select alliance_data.refresh_operational_mirror('central.deliveries.workspace.v1');

create or replace view alliance_data.mirror_health
with (security_invoker = true)
as
select source_key, entity, source_updated_at, source_count, mirror_count,
       source_hash, mirror_hash, in_sync, last_success_at, last_error,
       last_error_at, updated_at
from alliance_data.sync_status;

revoke all on alliance_data.mirror_health from public, anon, authenticated;
grant select on alliance_data.mirror_health to service_role;

create or replace function alliance_data.replace_canonical_payload(
  p_source_key text,
  p_payload jsonb,
  p_source_updated_at timestamptz default clock_timestamp()
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_source_count integer := 0;
  v_mirror_count integer := 0;
  v_source_hash text;
  v_mirror_hash text;
  v_entity text;
begin
  if p_source_key not in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    raise exception 'Fonte operacional não suportada: %', p_source_key;
  end if;

  if jsonb_typeof(coalesce(p_payload,'[]'::jsonb)) <> 'array' then
    raise exception 'Payload operacional deve ser um array JSON.';
  end if;

  p_payload := coalesce(p_payload,'[]'::jsonb);
  v_source_count := jsonb_array_length(p_payload);
  v_source_hash := md5(p_payload::text);

  if p_source_key='central.tasks.vitor-gutierrez' then
    v_entity := 'tasks';
    delete from alliance_data.tasks where source_key=p_source_key;
    insert into alliance_data.tasks (
      id, source_key, source_position, source_updated_at, brand_id, brand_name,
      title, description, status, priority, due_date_text, due_at_text, start_date_text,
      campaign_id, campaign_source, project, list_id, parent_task_id, channel,
      assignee_ids, assignees, subtasks, dependencies, checklist, attachments, comments,
      embedded_deliveries, tags, history, archived_at_text, archived_by, is_archived, raw, mirrored_at
    )
    select
      e.item->>'id', p_source_key, e.ord::bigint, p_source_updated_at, b.id,
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
    from jsonb_array_elements(p_payload) with ordinality as e(item,ord)
    left join public.brands b on lower(b.nome)=lower(trim(coalesce(e.item->>'brand','')))
    where nullif(e.item->>'id','') is not null;

    select count(*)::int,
           md5(coalesce(jsonb_agg(raw order by source_position),'[]'::jsonb)::text)
      into v_mirror_count,v_mirror_hash
    from alliance_data.tasks where source_key=p_source_key;

  elsif p_source_key='central.campaigns.vitor-gutierrez' then
    v_entity := 'campaigns';
    delete from alliance_data.campaigns where source_key=p_source_key;
    insert into alliance_data.campaigns (
      id, source_key, source_position, source_updated_at, brand_id, brand_name,
      name, status, type, objective, goal, start_date_text, start_at_text,
      end_date_text, end_at_text, month_id, month_ref, client_id, budget, channels,
      products, offer, benefits, schedule, tags, history, archived_at_text, is_archived,
      raw, mirrored_at
    )
    select
      e.item->>'id', p_source_key, e.ord::bigint, p_source_updated_at, b.id,
      coalesce(b.nome, nullif(trim(e.item->>'brand'),'')),
      e.item->>'name', e.item->>'status', e.item->>'type', e.item->>'objective', e.item->>'goal',
      e.item->>'start', e.item->>'startAt', e.item->>'end', e.item->>'endAt',
      e.item->>'monthId', e.item->>'monthRef', e.item->>'clientId',
      e.item->'budget', e.item->'channels', e.item->'products', e.item->'offer',
      e.item->'benefits', e.item->'schedule', e.item->'tags',
      coalesce(e.item->'history','[]'::jsonb), nullif(e.item->>'archivedAt',''),
      nullif(e.item->>'archivedAt','') is not null, e.item, clock_timestamp()
    from jsonb_array_elements(p_payload) with ordinality as e(item,ord)
    left join public.brands b on lower(b.nome)=lower(trim(coalesce(e.item->>'brand','')))
    where nullif(e.item->>'id','') is not null;

    select count(*)::int,
           md5(coalesce(jsonb_agg(raw order by source_position),'[]'::jsonb)::text)
      into v_mirror_count,v_mirror_hash
    from alliance_data.campaigns where source_key=p_source_key;

  elsif p_source_key='central.deliveries.workspace.v1' then
    v_entity := 'deliveries';
    delete from alliance_data.deliveries where source_key=p_source_key;
    insert into alliance_data.deliveries (
      id, source_key, source_position, source_updated_at, brand_id, brand_name,
      title, task_title, status, source_task_id, target_task_id, project,
      sender, recipient, note, files, links, events, created_at_text, updated_at_text,
      archived_at_text, archived_by, is_archived, raw, mirrored_at
    )
    select
      e.item->>'id', p_source_key, e.ord::bigint, p_source_updated_at, b.id,
      coalesce(b.nome, nullif(trim(e.item->>'brand'),'')),
      coalesce(e.item->>'title',e.item->>'taskTitle'), e.item->>'taskTitle', e.item->>'status',
      nullif(e.item->>'sourceTaskId',''), nullif(e.item->>'targetTaskId',''),
      e.item->>'project', e.item->>'from', e.item->>'to', e.item->>'note',
      e.item->'files', e.item->'links', coalesce(e.item->'events','[]'::jsonb),
      e.item->>'createdAt', e.item->>'updatedAt', nullif(e.item->>'archivedAt',''),
      nullif(e.item->>'archivedBy',''), nullif(e.item->>'archivedAt','') is not null,
      e.item, clock_timestamp()
    from jsonb_array_elements(p_payload) with ordinality as e(item,ord)
    left join lateral (
      select bx.id,bx.nome
      from public.brands bx
      where bx.id::text=nullif(e.item->>'brandId','')
         or (
           nullif(e.item->>'brandId','') is null
           and lower(bx.nome)=lower(trim(coalesce(e.item->>'brand','')))
         )
      order by case when bx.id::text=nullif(e.item->>'brandId','') then 0 else 1 end
      limit 1
    ) b on true
    where nullif(e.item->>'id','') is not null;

    select count(*)::int,
           md5(coalesce(jsonb_agg(raw order by source_position),'[]'::jsonb)::text)
      into v_mirror_count,v_mirror_hash
    from alliance_data.deliveries where source_key=p_source_key;
  end if;

  if v_source_count is distinct from v_mirror_count
     or v_source_hash is distinct from v_mirror_hash then
    raise exception
      'Falha de integridade ao materializar %: source_count %, mirror_count %, source_hash %, mirror_hash %',
      p_source_key,v_source_count,v_mirror_count,v_source_hash,v_mirror_hash;
  end if;

  insert into alliance_data.sync_status (
    source_key,entity,source_updated_at,source_count,mirror_count,
    source_hash,mirror_hash,in_sync,last_success_at,last_error,last_error_at,updated_at
  ) values (
    p_source_key,v_entity,p_source_updated_at,v_source_count,v_mirror_count,
    v_source_hash,v_mirror_hash,true,clock_timestamp(),null,null,clock_timestamp()
  )
  on conflict(source_key) do update set
    entity=excluded.entity,
    source_updated_at=excluded.source_updated_at,
    source_count=excluded.source_count,
    mirror_count=excluded.mirror_count,
    source_hash=excluded.source_hash,
    mirror_hash=excluded.mirror_hash,
    in_sync=true,
    last_success_at=excluded.last_success_at,
    last_error=null,
    last_error_at=null,
    updated_at=excluded.updated_at;
end;
$function$;

revoke all on function alliance_data.replace_canonical_payload(text,jsonb,timestamptz)
from public,anon,authenticated;
grant execute on function alliance_data.replace_canonical_payload(text,jsonb,timestamptz)
to service_role;

create or replace function alliance_data.project_operational_payload(p_source_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_payload jsonb;
  v_rows integer;
  v_prev text;
  v_updated_at timestamptz;
begin
  if p_source_key='central.tasks.vitor-gutierrez' then
    select coalesce(jsonb_agg(raw order by source_position),'[]'::jsonb)
      into v_payload
    from alliance_data.tasks
    where source_key=p_source_key;
  elsif p_source_key='central.campaigns.vitor-gutierrez' then
    select coalesce(jsonb_agg(raw order by source_position),'[]'::jsonb)
      into v_payload
    from alliance_data.campaigns
    where source_key=p_source_key;
  elsif p_source_key='central.deliveries.workspace.v1' then
    select coalesce(jsonb_agg(raw order by source_position),'[]'::jsonb)
      into v_payload
    from alliance_data.deliveries
    where source_key=p_source_key;
  else
    raise exception 'Fonte operacional não suportada: %',p_source_key;
  end if;

  v_prev := current_setting('alliance_data.projecting_legacy',true);
  perform set_config('alliance_data.projecting_legacy','on',true);

  update public.operacional_estado
     set valor=v_payload,
         atualizado_em=clock_timestamp()
   where chave=p_source_key
     and dono is null
  returning atualizado_em into v_updated_at;

  get diagnostics v_rows=row_count;

  if coalesce(v_prev,'')='' then
    perform set_config('alliance_data.projecting_legacy','off',true);
  else
    perform set_config('alliance_data.projecting_legacy',v_prev,true);
  end if;

  if v_rows<>1 then
    raise exception 'Estado legado de compatibilidade ausente ou duplicado para %',p_source_key;
  end if;

  update alliance_data.sync_status
     set source_updated_at=v_updated_at,
         source_count=jsonb_array_length(v_payload),
         mirror_count=jsonb_array_length(v_payload),
         source_hash=md5(v_payload::text),
         mirror_hash=md5(v_payload::text),
         in_sync=true,
         last_success_at=clock_timestamp(),
         last_error=null,
         last_error_at=null,
         updated_at=clock_timestamp()
   where source_key=p_source_key;

  return v_payload;
end;
$function$;

revoke all on function alliance_data.project_operational_payload(text)
from public,anon,authenticated;
grant execute on function alliance_data.project_operational_payload(text)
to service_role;

create or replace function alliance_data.refresh_operational_mirror(p_key text)
returns void
language plpgsql
set search_path = ''
as $function$
declare
  v_value jsonb;
  v_updated_at timestamptz;
begin
  if p_key not in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    return;
  end if;

  select o.valor,o.atualizado_em
    into v_value,v_updated_at
  from public.operacional_estado o
  where o.chave=p_key and o.dono is null
  limit 1;

  perform alliance_data.replace_canonical_payload(
    p_key,
    coalesce(v_value,'[]'::jsonb),
    coalesce(v_updated_at,clock_timestamp())
  );
end;
$function$;

create or replace function alliance_data.mirror_operacional_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_old_key text;
  v_new_key text;
  v_key text;
  v_error text;
  v_strict boolean := false;
  v_strict_flag text;
begin
  if current_setting('alliance_data.projecting_legacy',true)='on' then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  if tg_op<>'INSERT' then v_old_key:=old.chave; end if;
  if tg_op<>'DELETE' then v_new_key:=new.chave; end if;

  if v_old_key in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    v_key:=v_old_key;
  elsif v_new_key in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    v_key:=v_new_key;
  else
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  v_strict_flag:=case v_key
    when 'central.tasks.vitor-gutierrez' then 'tasks_mirror_strict_write'
    when 'central.campaigns.vitor-gutierrez' then 'campaigns_mirror_strict_write'
    when 'central.deliveries.workspace.v1' then 'deliveries_mirror_strict_write'
    else null
  end;

  if v_strict_flag is not null then
    select f.enabled into v_strict
    from public.system_feature_flags f
    where f.key=v_strict_flag;
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
    v_error:=sqlerrm;
    begin
      insert into alliance_data.sync_status(
        source_key,entity,in_sync,last_error,last_error_at,updated_at
      ) values (
        coalesce(v_new_key,v_old_key,'unknown'),
        case
          when coalesce(v_new_key,v_old_key)='central.tasks.vitor-gutierrez' then 'tasks'
          when coalesce(v_new_key,v_old_key)='central.campaigns.vitor-gutierrez' then 'campaigns'
          when coalesce(v_new_key,v_old_key)='central.deliveries.workspace.v1' then 'deliveries'
          else 'unknown'
        end,
        false,v_error,clock_timestamp(),clock_timestamp()
      )
      on conflict(source_key) do update set
        in_sync=false,
        last_error=excluded.last_error,
        last_error_at=excluded.last_error_at,
        updated_at=excluded.updated_at;
    exception when others then null;
    end;

    if coalesce(v_strict,false) then
      raise;
    end if;

    raise warning 'Alliance data mirror failed for %: %',coalesce(v_new_key,v_old_key),v_error;
  end;

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;

create or replace function alliance_data.commit_operational_payload(
  p_source_key text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_projected jsonb;
  v_legacy jsonb;
begin
  perform alliance_data.replace_canonical_payload(
    p_source_key,
    coalesce(p_payload,'[]'::jsonb),
    clock_timestamp()
  );

  v_projected:=alliance_data.project_operational_payload(p_source_key);

  select o.valor into v_legacy
  from public.operacional_estado o
  where o.chave=p_source_key and o.dono is null
  limit 1;

  if v_projected is distinct from coalesce(p_payload,'[]'::jsonb)
     or v_legacy is distinct from coalesce(p_payload,'[]'::jsonb) then
    raise exception 'Falha na projeção de compatibilidade para %',p_source_key;
  end if;

  return v_projected;
end;
$function$;

revoke all on function alliance_data.commit_operational_payload(text,jsonb)
from public,anon,authenticated;
grant execute on function alliance_data.commit_operational_payload(text,jsonb)
to service_role;

create or replace view alliance_data.operational_health
with (security_invoker=true)
as
select
  s.entity,
  s.source_key,
  s.source_count,
  s.mirror_count,
  s.source_hash,
  s.mirror_hash,
  s.in_sync,
  s.last_success_at,
  s.last_error,
  s.last_error_at,
  r.key as feature_flag,
  coalesce(r.enabled,false) as mirror_read_enabled,
  coalesce((r.config->>'require_hash_match')::boolean,true) as require_hash_match,
  case
    when coalesce(r.enabled,false)
      and coalesce(s.in_sync,false)
      and (
        not coalesce((r.config->>'require_hash_match')::boolean,true)
        or s.source_hash=s.mirror_hash
      )
    then 'alliance_data'
    else 'operacional_estado_fallback'
  end as active_read_source,
  'alliance_data'::text as write_authority,
  w.key as strict_write_flag,
  coalesce(w.enabled,false) as strict_write_enabled,
  case when coalesce(w.enabled,false) then 'canonical_atomic' else 'compatibility_ingest' end as write_mode,
  'operacional_estado'::text as compatibility_projection
from alliance_data.sync_status s
left join public.system_feature_flags r
  on r.key=case s.entity
    when 'tasks' then 'tasks_mirror_read'
    when 'campaigns' then 'campaigns_mirror_read'
    when 'deliveries' then 'deliveries_mirror_read'
    else null end
left join public.system_feature_flags w
  on w.key=case s.entity
    when 'tasks' then 'tasks_mirror_strict_write'
    when 'campaigns' then 'campaigns_mirror_strict_write'
    when 'deliveries' then 'deliveries_mirror_strict_write'
    else null end;

update alliance_data.data_catalog
set storage_model='canonical',
    metadata=coalesce(metadata,'{}'::jsonb)
      || jsonb_build_object(
        'read_source','alliance_data',
        'write_authority','alliance_data',
        'compatibility_projection','operacional_estado',
        'compatibility_ingress',true,
        'canonical_gateway','alliance_data.commit_operational_payload',
        'atomic_projection',true,
        'hash_guard',true
      ),
    notes='Fonte canônica relacional em alliance_data. operacional_estado é mantido como projeção/entrada de compatibilidade temporária, com validação atômica e hash.',
    updated_at=now()
where id in ('operation.tasks','operation.campaigns','operation.deliveries');

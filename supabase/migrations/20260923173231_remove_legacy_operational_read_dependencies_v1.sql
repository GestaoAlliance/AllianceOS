create or replace function alliance_data.current_payload(p_source_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare v_payload jsonb;
begin
  if p_source_key='central.tasks.vitor-gutierrez' then
    select coalesce(jsonb_agg(t.raw order by t.source_position),'[]'::jsonb) into v_payload
    from alliance_data.tasks t where t.source_key=p_source_key;
  elsif p_source_key='central.campaigns.vitor-gutierrez' then
    select coalesce(jsonb_agg(c.raw order by c.source_position),'[]'::jsonb) into v_payload
    from alliance_data.campaigns c where c.source_key=p_source_key;
  elsif p_source_key='central.deliveries.workspace.v1' then
    select coalesce(jsonb_agg(d.raw order by d.source_position),'[]'::jsonb) into v_payload
    from alliance_data.deliveries d where d.source_key=p_source_key;
  else
    raise exception 'Fonte operacional não suportada: %',p_source_key;
  end if;
  return coalesce(v_payload,'[]'::jsonb);
end
$function$;

create or replace function alliance_data.locked_current_payload(p_source_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $function$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_source_key,0));
  return alliance_data.current_payload(p_source_key);
end
$function$;

revoke all on function alliance_data.current_payload(text) from public,anon,authenticated;
revoke all on function alliance_data.locked_current_payload(text) from public,anon,authenticated;
grant execute on function alliance_data.current_payload(text),alliance_data.locked_current_payload(text) to service_role;

create or replace function alliance_data.commit_operational_payload(p_source_key text,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare v_projected jsonb; v_legacy jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_source_key,0));
  perform alliance_data.replace_canonical_payload(p_source_key,coalesce(p_payload,'[]'::jsonb),clock_timestamp());
  v_projected:=alliance_data.project_operational_payload(p_source_key);
  select o.valor into v_legacy from public.operacional_estado o where o.chave=p_source_key and o.dono is null limit 1;
  if v_projected is distinct from coalesce(p_payload,'[]'::jsonb)
     or v_legacy is distinct from coalesce(p_payload,'[]'::jsonb) then
    raise exception 'Falha na projeção de compatibilidade para %',p_source_key;
  end if;
  return v_projected;
end
$function$;

revoke all on function alliance_data.commit_operational_payload(text,jsonb) from public,anon,authenticated;
grant execute on function alliance_data.commit_operational_payload(text,jsonb) to service_role;

do $do$
declare v_def text; v_new text;
begin
  select pg_get_functiondef('app.close_expired_campaigns()'::regprocedure) into v_def;
  if position('public.operacional_estado' in v_def)>0 then
    v_new:=replace(v_def,
'  select valor into v_state
  from public.operacional_estado
  where chave=''central.campaigns.vitor-gutierrez'' and dono is null
  for update;',
'  v_state := alliance_data.locked_current_payload(''central.campaigns.vitor-gutierrez'');');
    if v_new=v_def then raise exception 'Patch close_expired_campaigns não encontrou trecho esperado'; end if;
    execute v_new;
  end if;

  select pg_get_functiondef('app.generate_due_notifications()'::regprocedure) into v_def;
  if position('public.operacional_estado' in v_def)>0 then
    v_new:=replace(v_def,
'  select valor into v_state
  from public.operacional_estado
  where chave=''central.tasks.vitor-gutierrez'' and dono is null;',
'  v_state := alliance_data.current_payload(''central.tasks.vitor-gutierrez'');');
    if v_new=v_def then raise exception 'Patch generate_due_notifications não encontrou trecho esperado'; end if;
    execute v_new;
  end if;

  select pg_get_functiondef('app.reimport_clickup_batch(jsonb)'::regprocedure) into v_def;
  if position('public.operacional_estado' in v_def)>0 then
    v_new:=replace(v_def,
'  state as (
    select valor
    from public.operacional_estado
    where chave=''central.tasks.vitor-gutierrez'' and dono is null
    for update
  )',
'  state as (
    select alliance_data.locked_current_payload(''central.tasks.vitor-gutierrez'') as valor
  )');
    if v_new=v_def then raise exception 'Patch reimport_clickup_batch não encontrou trecho esperado'; end if;
    execute v_new;
  end if;

  select pg_get_functiondef('app.sync_profile_assignees_from_clickup()'::regprocedure) into v_def;
  if position('public.operacional_estado' in v_def)>0 then
    v_new:=replace(v_def,
'  with state as (
    select valor
    from public.operacional_estado
    where chave=''central.tasks.vitor-gutierrez'' and dono is null
    for update
  )',
'  with state as (
    select alliance_data.locked_current_payload(''central.tasks.vitor-gutierrez'') as valor
  )');
    if v_new=v_def then raise exception 'Patch sync_profile_assignees_from_clickup não encontrou trecho esperado'; end if;
    execute v_new;
  end if;

  select pg_get_functiondef('public.consolidar_lista_em_destino(uuid,uuid)'::regprocedure) into v_def;
  if position('public.operacional_estado' in v_def)>0 then
    v_new:=replace(v_def,
'  select valor into v_tasks
  from public.operacional_estado
  where chave=''central.tasks.vitor-gutierrez'' and dono is null
  for update;',
'  v_tasks := alliance_data.locked_current_payload(''central.tasks.vitor-gutierrez'');');
    if v_new=v_def then raise exception 'Patch consolidar_lista_em_destino não encontrou trecho esperado'; end if;
    execute v_new;
  end if;

  select pg_get_functiondef('public.migrar_responsavel_legado(text,uuid)'::regprocedure) into v_def;
  if position('public.operacional_estado' in v_def)>0 then
    v_new:=replace(v_def,
'  select valor into v_tasks
  from public.operacional_estado
  where chave=''central.tasks.vitor-gutierrez'' and dono is null
  for update;',
'  v_tasks := alliance_data.locked_current_payload(''central.tasks.vitor-gutierrez'');');
    if v_new=v_def then raise exception 'Patch migrar_responsavel_legado não encontrou trecho esperado'; end if;
    execute v_new;
  end if;
end
$do$;

update alliance_data.data_catalog
set metadata=coalesce(metadata,'{}'::jsonb)
  ||jsonb_build_object('legacy_operational_read_dependency',false,'transaction_lock','advisory_xact_lock','canonical_read_function','alliance_data.current_payload'),
  updated_at=now()
where id in('operation.tasks','operation.campaigns','operation.deliveries');

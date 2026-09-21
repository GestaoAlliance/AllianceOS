-- AllianceOS — history timestamp/duplicate refinement — 2026-09-21
-- Preserves every history record. Only flags consecutive duplicate render events.

do $$
declare
  tasks jsonb;
  task jsonb;
  history jsonb;
  item jsonb;
  rebuilt_tasks jsonb := '[]'::jsonb;
  rebuilt_history jsonb;
  previous_text text;
  current_text text;
  raw_at text;
  iso_at text;
  task_idx int;
  hist_idx int;
begin
  select valor into tasks
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null
  for update;

  tasks:=coalesce(tasks,'[]'::jsonb);

  for task_idx in 0..greatest(jsonb_array_length(tasks)-1,-1) loop
    task:=tasks->task_idx;
    history:=coalesce(task->'history','[]'::jsonb);
    rebuilt_history:='[]'::jsonb;
    previous_text:=null;

    if jsonb_typeof(history)='array' then
      for hist_idx in 0..greatest(jsonb_array_length(history)-1,-1) loop
        item:=history->hist_idx;
        raw_at:=nullif(item->>'at','');

        -- Any value in an "at" field that is not a parseable ISO timestamp becomes null + provenance.
        if raw_at is not null then
          if raw_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T]' then
            begin
              iso_at:=to_char(raw_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
              item:=jsonb_set(item,'{at}',to_jsonb(iso_at),true);
            exception when others then
              item:=item||jsonb_build_object('at',null,'atOriginal',coalesce(item->>'atOriginal',raw_at),'dataDesconhecida',true);
            end;
          else
            item:=item||jsonb_build_object('at',null,'atOriginal',coalesce(item->>'atOriginal',raw_at),'dataDesconhecida',true);
          end if;
        end if;

        current_text:=coalesce(item->>'text','');
        if previous_text is not null and current_text=previous_text and current_text<>'' then
          item:=item||jsonb_build_object('duplicado',true,'duplicadoDe',greatest(hist_idx-1,0)::text,'duplicadoMotivo','evento consecutivo idêntico');
        else
          -- Do not erase prior metadata; explicitly mark reviewed non-consecutive repeats as canonical.
          if item ? 'duplicado' then
            item:=item||jsonb_build_object('duplicado',false,'duplicadoMotivo','revisado: repetição não consecutiva');
          end if;
        end if;

        rebuilt_history:=rebuilt_history||jsonb_build_array(item);
        previous_text:=current_text;
      end loop;
    end if;

    task:=jsonb_set(task,'{history}',rebuilt_history,true);
    rebuilt_tasks:=rebuilt_tasks||jsonb_build_array(task);
  end loop;

  update public.operacional_estado
  set valor=rebuilt_tasks,atualizado_em=clock_timestamp()
  where chave='central.tasks.vitor-gutierrez' and dono is null;
end $$;

-- Normalize every existing official delivery timestamp/event that came from PostgreSQL-style text.
do $$
declare
  deliveries jsonb;
  delivery jsonb;
  events jsonb;
  event jsonb;
  rebuilt jsonb := '[]'::jsonb;
  rebuilt_events jsonb;
  raw_at text;
  iso_at text;
  i int;
  j int;
begin
  select valor into deliveries
  from public.operacional_estado
  where chave='central.deliveries.workspace.v1' and dono is null
  for update;

  deliveries:=coalesce(deliveries,'[]'::jsonb);

  for i in 0..greatest(jsonb_array_length(deliveries)-1,-1) loop
    delivery:=deliveries->i;

    for raw_at in
      select value from (values (delivery->>'createdAt'),(delivery->>'updatedAt')) v(value)
      where nullif(value,'') is not null
    loop
      null; -- validation happens below per field
    end loop;

    raw_at:=nullif(delivery->>'createdAt','');
    if raw_at is not null and raw_at !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then
      begin
        iso_at:=to_char(raw_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
        delivery:=delivery||jsonb_build_object('createdAt',iso_at,'createdAtOriginal',coalesce(delivery->>'createdAtOriginal',raw_at));
      exception when others then
        delivery:=delivery||jsonb_build_object('createdAt',null,'createdAtOriginal',coalesce(delivery->>'createdAtOriginal',raw_at),'createdAtDesconhecida',true);
      end;
    end if;

    raw_at:=nullif(delivery->>'updatedAt','');
    if raw_at is not null and raw_at !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then
      begin
        iso_at:=to_char(raw_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
        delivery:=delivery||jsonb_build_object('updatedAt',iso_at,'updatedAtOriginal',coalesce(delivery->>'updatedAtOriginal',raw_at));
      exception when others then
        delivery:=delivery||jsonb_build_object('updatedAt',null,'updatedAtOriginal',coalesce(delivery->>'updatedAtOriginal',raw_at),'updatedAtDesconhecida',true);
      end;
    end if;

    events:=coalesce(delivery->'events','[]'::jsonb);
    rebuilt_events:='[]'::jsonb;
    if jsonb_typeof(events)='array' then
      for j in 0..greatest(jsonb_array_length(events)-1,-1) loop
        event:=events->j;
        raw_at:=nullif(event->>'at','');
        if raw_at is not null and raw_at !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then
          begin
            iso_at:=to_char(raw_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
            event:=event||jsonb_build_object('at',iso_at,'atOriginal',coalesce(event->>'atOriginal',raw_at));
          exception when others then
            event:=event||jsonb_build_object('at',null,'atOriginal',coalesce(event->>'atOriginal',raw_at),'dataDesconhecida',true);
          end;
        end if;
        rebuilt_events:=rebuilt_events||jsonb_build_array(event);
      end loop;
    end if;
    delivery:=jsonb_set(delivery,'{events}',rebuilt_events,true);
    rebuilt:=rebuilt||jsonb_build_array(delivery);
  end loop;

  update public.operacional_estado
  set valor=rebuilt,atualizado_em=clock_timestamp()
  where chave='central.deliveries.workspace.v1' and dono is null;
end $$;

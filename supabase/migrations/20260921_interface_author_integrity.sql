-- AllianceOS author integrity follow-up — 2026-09-21
-- Migration events are attributed to the registered non-assignable service account.

do $$
declare
  tasks jsonb;
  deliveries jsonb;
  ti integer;
  hi integer;
  di integer;
  ei integer;
  t jsonb;
  h jsonb;
  d jsonb;
  e jsonb;
  new_history jsonb;
  new_events jsonb;
begin
  select coalesce(valor,'[]'::jsonb) into tasks
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null;

  if jsonb_array_length(coalesce(tasks,'[]'::jsonb))>0 then
    for ti in 0..jsonb_array_length(tasks)-1 loop
      t:=tasks->ti;
      new_history:='[]'::jsonb;
      if jsonb_array_length(coalesce(t->'history','[]'::jsonb))>0 then
        for hi in 0..jsonb_array_length(coalesce(t->'history','[]'::jsonb))-1 loop
          h:=coalesce(t->'history','[]'::jsonb)->hi;
          if h->>'by'='Migração AllianceOS' then
            h:=h||jsonb_build_object(
              'by','Gestão Alliance',
              'authorId','a02201ec-96d3-433f-b779-b81a4ee10066',
              'authorType','servico',
              'byOriginal','Migração AllianceOS'
            );
          end if;
          new_history:=new_history||jsonb_build_array(h);
        end loop;
        t:=jsonb_set(t,'{history}',new_history,true);
      end if;
      tasks:=jsonb_set(tasks,array[ti::text],t,true);
    end loop;

    update public.operacional_estado
    set valor=tasks,atualizado_em=now()
    where chave='central.tasks.vitor-gutierrez' and dono is null;
  end if;

  select coalesce(valor,'[]'::jsonb) into deliveries
  from public.operacional_estado
  where chave='central.deliveries.workspace.v1' and dono is null;

  if jsonb_array_length(coalesce(deliveries,'[]'::jsonb))>0 then
    for di in 0..jsonb_array_length(deliveries)-1 loop
      d:=deliveries->di;
      new_events:='[]'::jsonb;
      if jsonb_array_length(coalesce(d->'events','[]'::jsonb))>0 then
        for ei in 0..jsonb_array_length(coalesce(d->'events','[]'::jsonb))-1 loop
          e:=coalesce(d->'events','[]'::jsonb)->ei;
          if e->>'by'='Migração AllianceOS' then
            e:=e||jsonb_build_object(
              'by','Gestão Alliance',
              'authorId','a02201ec-96d3-433f-b779-b81a4ee10066',
              'authorType','servico',
              'byOriginal','Migração AllianceOS'
            );
          end if;
          new_events:=new_events||jsonb_build_array(e);
        end loop;
        d:=jsonb_set(d,'{events}',new_events,true);
      end if;
      deliveries:=jsonb_set(deliveries,array[di::text],d,true);
    end loop;

    update public.operacional_estado
    set valor=deliveries,atualizado_em=now()
    where chave='central.deliveries.workspace.v1' and dono is null;
  end if;
end $$;

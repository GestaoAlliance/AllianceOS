create or replace function app.generate_due_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_state jsonb; v_task jsonb; v_due timestamptz; v_raw text; v_user_text text; v_user uuid;
  v_inserted integer := 0; v_now timestamptz := now();
  v_service uuid := 'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid;
begin
  select valor into v_state from public.operacional_estado where chave='central.tasks.vitor-gutierrez' and dono is null;
  if v_state is null or jsonb_typeof(v_state) <> 'array' then return jsonb_build_object('criadas',0,'executado_em',v_now); end if;
  for v_task in select value from jsonb_array_elements(v_state)
  loop
    if nullif(v_task->>'archivedAt','') is not null or coalesce(v_task->>'status','')='feito' then continue; end if;
    v_raw := coalesce(nullif(v_task->>'dueAt',''),nullif(v_task->>'due','')); if v_raw is null then continue; end if;
    begin
      if v_raw ~ '^\d{4}-\d{2}-\d{2}$' then v_due := (v_raw||'T18:00:00-03:00')::timestamptz; else v_due := v_raw::timestamptz; end if;
    exception when others then continue; end;
    if v_due < v_now or v_due > v_now + interval '24 hours' then continue; end if;
    for v_user_text in select value #>> '{}' from jsonb_array_elements(coalesce(v_task->'assigneeIds','[]'::jsonb))
    loop
      begin v_user := v_user_text::uuid; exception when others then continue; end;
      if not exists(select 1 from public.profiles p where p.id=v_user and p.ativo=true and coalesce(p.tipo_membro,'usuario')='usuario') then continue; end if;
      insert into public.notifications(user_id,actor_id,kind,title,body,task_id,event_key)
      values(v_user,v_service,'task_due_soon','Prazo próximo: '||coalesce(v_task->>'title','Tarefa'),'Prazo: '||v_raw,v_task->>'id','due:'||(v_task->>'id')||':'||v_raw)
      on conflict do nothing;
      if found then v_inserted := v_inserted + 1; end if;
    end loop;
  end loop;
  return jsonb_build_object('criadas',v_inserted,'executado_em',v_now);
end $$;

revoke all on function app.generate_due_notifications() from public, anon, authenticated;
grant execute on function app.generate_due_notifications() to service_role;

do $$ declare r record; begin
  for r in select jobid from cron.job where jobname='alliance_generate_due_notifications' loop perform cron.unschedule(r.jobid); end loop;
end $$;

select cron.schedule('alliance_generate_due_notifications','*/15 * * * *','select app.generate_due_notifications();');

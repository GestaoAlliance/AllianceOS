create or replace function app.enqueue_notification(
  p_user_id uuid,p_actor_id uuid,p_kind text,p_title text,p_body text,p_task_id text,p_event_key text,p_window interval default interval '24 hours'
) returns bigint language plpgsql security definer set search_path=public,app,pg_temp as $$
declare existing_id bigint;created_id bigint;caller uuid:=auth.uid();
begin
  if caller is not null then
    if caller<>p_actor_id then raise exception 'actor_id precisa ser o usuário autenticado';end if;
    if not exists(select 1 from public.profiles p where p.id=caller and p.ativo=true and coalesce(p.tipo_membro,'usuario')='usuario' and p.papel<>'externo') then raise exception 'usuário sem permissão para gerar notificações';end if;
  end if;
  if not exists(select 1 from public.profiles p where p.id=p_user_id and p.ativo=true and coalesce(p.tipo_membro,'usuario')='usuario') then return null;end if;
  select id into existing_id from public.notifications where user_id=p_user_id and kind=p_kind and coalesce(task_id,'')=coalesce(p_task_id,'') and ((p_event_key is not null and event_key=p_event_key) or (p_event_key is null and created_at>=now()-p_window)) and archived_at is null order by created_at desc limit 1;
  if existing_id is not null then return existing_id;end if;
  insert into public.notifications(user_id,actor_id,kind,title,body,task_id,event_key) values(p_user_id,p_actor_id,p_kind,p_title,p_body,p_task_id,p_event_key) returning id into created_id;
  return created_id;
end $$;
revoke all on function app.enqueue_notification(uuid,uuid,text,text,text,text,text,interval) from public,anon;
grant execute on function app.enqueue_notification(uuid,uuid,text,text,text,text,text,interval) to authenticated,service_role;

create or replace function public.enqueue_notification(
  p_user_id uuid,p_kind text,p_title text,p_body text default null,p_task_id text default null,p_event_key text default null,p_window interval default interval '24 hours'
) returns bigint language plpgsql security definer set search_path=public,app,pg_temp as $$
declare caller uuid:=auth.uid();
begin
  if caller is null then raise exception 'authentication_required';end if;
  return app.enqueue_notification(p_user_id,caller,p_kind,p_title,p_body,p_task_id,p_event_key,p_window);
end $$;
revoke all on function public.enqueue_notification(uuid,text,text,text,text,text,interval) from public,anon;
grant execute on function public.enqueue_notification(uuid,text,text,text,text,text,interval) to authenticated;

create or replace function app.generate_due_notifications()
returns jsonb language plpgsql security definer set search_path=public,app,pg_temp as $$
declare v_state jsonb;v_task jsonb;v_due timestamptz;v_raw text;v_user_text text;v_user uuid;v_inserted integer:=0;v_now timestamptz:=now();v_service uuid:='a02201ec-96d3-433f-b779-b81a4ee10066'::uuid;v_existing bigint;
begin
  select valor into v_state from public.operacional_estado where chave='central.tasks.vitor-gutierrez' and dono is null;
  if v_state is null or jsonb_typeof(v_state)<>'array' then return jsonb_build_object('criadas',0,'executado_em',v_now);end if;
  for v_task in select value from jsonb_array_elements(v_state) loop
    if nullif(v_task->>'archivedAt','') is not null or coalesce(v_task->>'status','')='feito' then continue;end if;
    v_raw:=coalesce(nullif(v_task->>'dueAt',''),nullif(v_task->>'due',''));if v_raw is null then continue;end if;
    begin if v_raw~'^\d{4}-\d{2}-\d{2}$' then v_due:=(v_raw||'T18:00:00-03:00')::timestamptz;else v_due:=v_raw::timestamptz;end if;exception when others then continue;end;
    if v_due<v_now or v_due>v_now+interval '24 hours' then continue;end if;
    for v_user_text in select value#>>'{}' from jsonb_array_elements(coalesce(v_task->'assigneeIds','[]'::jsonb)) loop
      begin v_user:=v_user_text::uuid;exception when others then continue;end;
      if not exists(select 1 from public.profiles p where p.id=v_user and p.ativo=true and coalesce(p.tipo_membro,'usuario')='usuario') then continue;end if;
      select id into v_existing from public.notifications where user_id=v_user and kind='task_due_soon' and coalesce(task_id,'')=coalesce(v_task->>'id','') and event_key='due:'||(v_task->>'id')||':'||v_raw and archived_at is null limit 1;
      if v_existing is null then
        perform app.enqueue_notification(v_user,v_service,'task_due_soon','Prazo próximo: '||coalesce(v_task->>'title','Tarefa'),'Prazo: '||v_raw,v_task->>'id','due:'||(v_task->>'id')||':'||v_raw,interval '24 hours');
        v_inserted:=v_inserted+1;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('criadas',v_inserted,'executado_em',v_now);
end $$;

drop policy if exists notifications_insert_internal on public.notifications;
revoke insert on public.notifications from anon,authenticated;

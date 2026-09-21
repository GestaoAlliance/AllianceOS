alter table public.task_action_audit
  drop constraint if exists task_action_audit_origin_check;

alter table public.task_action_audit
  add constraint task_action_audit_origin_check
  check (origin = any (array['interface'::text,'mcp'::text,'job'::text,'migration'::text]));

alter table public.task_lists
  drop constraint if exists task_lists_nome_len_check;

alter table public.task_lists
  add constraint task_lists_nome_len_check
  check (char_length(trim(nome)) <= 150);

create extension if not exists pg_cron;

create or replace function app.close_expired_campaigns()
returns jsonb
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_state jsonb;
  v_out jsonb := '[]'::jsonb;
  v_campaign jsonb;
  v_changed boolean := false;
  v_now timestamptz := now();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_end date;
  v_before text;
  v_closed jsonb := '[]'::jsonb;
  v_service uuid := 'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid;
  v_end_raw text;
begin
  select valor into v_state from public.operacional_estado
  where chave='central.campaigns.vitor-gutierrez' and dono is null for update;
  if v_state is null or jsonb_typeof(v_state) <> 'array' then return jsonb_build_object('encerradas',v_closed,'quantidade',0); end if;
  for v_campaign in select value from jsonb_array_elements(v_state)
  loop
    v_end := null; v_end_raw := coalesce(v_campaign->>'endAt',v_campaign->>'end','');
    begin if v_end_raw ~ '^\d{4}-\d{2}-\d{2}' then v_end := left(v_end_raw,10)::date; end if; exception when others then v_end := null; end;
    v_before := coalesce(v_campaign->>'status','');
    if nullif(v_campaign->>'archivedAt','') is null and v_end is not null and v_end < v_today and lower(unaccent(coalesce(v_before,'')))='em execucao' then
      v_campaign := v_campaign || jsonb_build_object('status','encerrada','endedAt',coalesce(nullif(v_campaign->>'endedAt',''),v_now::text))
        || jsonb_build_object('history',jsonb_build_array(jsonb_build_object('at',v_now,'by','Gestão Alliance','authorId',v_service::text,'authorType','servico','origin','job','campo','status','antes',v_before,'depois','encerrada','text','status: '||v_before||' → encerrada (data final ultrapassada).')) || coalesce(v_campaign->'history','[]'::jsonb));
      insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
      values(v_service,'job','encerrar_campanha_automaticamente','campanha',v_campaign->>'id',jsonb_build_object('campo','status','antes',v_before,'depois','encerrada','data_fim',v_end_raw));
      insert into public.notifications(user_id,actor_id,kind,title,body,task_id,event_key)
      select p.id,v_service,'campaign_closed','Campanha encerrada: '||coalesce(v_campaign->>'name','Campanha'),'A data final da campanha foi ultrapassada.',null,'campaign-closed:'||(v_campaign->>'id')||':'||v_end_raw
      from public.profiles p where p.ativo=true and coalesce(p.tipo_membro,'usuario')='usuario' on conflict do nothing;
      v_closed := v_closed || jsonb_build_array(jsonb_build_object('id',v_campaign->>'id','nome',v_campaign->>'name','antes',v_before,'depois','encerrada','fim',v_end_raw)); v_changed := true;
    end if;
    v_out := v_out || jsonb_build_array(v_campaign);
  end loop;
  if v_changed then update public.operacional_estado set valor=v_out, atualizado_em=v_now where chave='central.campaigns.vitor-gutierrez' and dono is null; end if;
  return jsonb_build_object('encerradas',v_closed,'quantidade',jsonb_array_length(v_closed),'executado_em',v_now);
end $$;

revoke all on function app.close_expired_campaigns() from public, anon, authenticated;
grant execute on function app.close_expired_campaigns() to service_role;

do $$ declare r record; begin
  for r in select jobid from cron.job where jobname='alliance_close_expired_campaigns' loop perform cron.unschedule(r.jobid); end loop;
end $$;

select cron.schedule('alliance_close_expired_campaigns','5 3 * * *','select app.close_expired_campaigns();');

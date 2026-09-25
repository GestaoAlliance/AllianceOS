
create or replace function public.agent_campaign_focus(
  p_brand_id uuid,
  p_campaign_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_campaign jsonb := '{}'::jsonb;
  v_tasks jsonb := '[]'::jsonb;
  v_overdue jsonb := '[]'::jsonb;
  v_workload jsonb := '[]'::jsonb;
  v_results jsonb := '[]'::jsonb;
  v_deliveries jsonb := '[]'::jsonb;
  v_task_ids text[] := '{}'::text[];
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão inválida';
  end if;
  if p_brand_id is null or not app.pode_acessar_marca(p_brand_id) then
    raise exception 'Acesso negado à marca';
  end if;

  select jsonb_build_object(
    'id',c.id,'brand_id',c.brand_id,'brand_name',c.brand_name,
    'name',c.name,'status',c.status,'type',c.type,
    'start_at',c.start_at,'end_at',c.end_at,'month_ref',c.month_ref,
    'objective',c.objective,'goal',c.goal,'budget',c.budget,
    'offer',c.offer,'products',c.products,'channels',c.channels,
    'benefits',c.benefits,'schedule',c.schedule,
    'tap',c.raw->'tap','sobre_evento',c.raw->'sobre_evento',
    'equipe',c.raw->'equipe','fases',c.raw->'fases',
    'cronograma',c.raw->'cronograma','metas_por_fonte',c.raw->'metas_por_fonte'
  )
  into v_campaign
  from alliance_data.campaigns c
  where c.id=p_campaign_id
    and c.brand_id=p_brand_id
    and not coalesce(c.is_archived,false)
  limit 1;

  if v_campaign is null or v_campaign='{}'::jsonb then
    return jsonb_build_object(
      'campaign',null,'tasks','[]'::jsonb,'overdue_tasks','[]'::jsonb,
      'workload','[]'::jsonb,'results','[]'::jsonb,'deliveries','[]'::jsonb,
      'date',v_today
    );
  end if;

  select coalesce(array_agg(t.id),'{}'::text[])
  into v_task_ids
  from alliance_data.tasks_current t
  where t.brand_id=p_brand_id
    and t.campaign_id=p_campaign_id
    and not coalesce(t.is_archived,false);

  select coalesce(jsonb_agg(to_jsonb(x) order by
      case x.priority when 'urgente' then 1 when 'alta' then 2 when 'normal' then 3 when 'baixa' then 4 else 5 end,
      x.due_date_text nulls last,x.title
    ),'[]'::jsonb)
  into v_tasks
  from (
    select distinct on (t.id)
      t.id,t.title,t.description,t.status,t.priority,t.due_date_text,t.due_at_text,
      t.start_date_text,t.project,t.list_id,t.parent_task_id,t.channel,
      t.assignees,t.subtasks,t.dependencies,t.checklist,t.attachments,t.comments,t.tags
    from alliance_data.tasks_current t
    where t.brand_id=p_brand_id
      and t.campaign_id=p_campaign_id
      and not coalesce(t.is_archived,false)
    order by t.id
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.due_date_text,x.title),'[]'::jsonb)
  into v_overdue
  from (
    select distinct on (t.id)
      t.id,t.title,t.status,t.priority,t.due_date_text,t.assignees,t.parent_task_id
    from alliance_data.tasks_current t
    where t.brand_id=p_brand_id
      and t.campaign_id=p_campaign_id
      and not coalesce(t.is_archived,false)
      and lower(coalesce(t.status,'')) not in ('feito','concluida','concluído','concluído','concluida')
      and t.due_date_text ~ '^\d{4}-\d{2}-\d{2}$'
      and t.due_date_text::date < v_today
    order by t.id
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.open_tasks desc,x.overdue_tasks desc,x.person),'[]'::jsonb)
  into v_workload
  from (
    select a.person,
      count(distinct t.id)::int as open_tasks,
      count(distinct t.id) filter (
        where t.due_date_text ~ '^\d{4}-\d{2}-\d{2}$'
          and t.due_date_text::date < v_today
      )::int as overdue_tasks,
      count(distinct t.id) filter (where lower(coalesce(t.status,''))='fazendo')::int as doing_tasks,
      jsonb_agg(distinct jsonb_build_object(
        'id',t.id,'title',t.title,'status',t.status,'priority',t.priority,'due_date',t.due_date_text
      )) as tasks
    from alliance_data.tasks_current t
    cross join lateral jsonb_array_elements_text(coalesce(t.assignees,'[]'::jsonb)) a(person)
    where t.brand_id=p_brand_id
      and t.campaign_id=p_campaign_id
      and not coalesce(t.is_archived,false)
      and lower(coalesce(t.status,'')) not in ('feito','concluida','concluído')
    group by a.person
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.data desc nulls last),'[]'::jsonb)
  into v_results
  from (
    select distinct on (r.id)
      r.id,r.campaign_id,r.canal,r.data,r.faturamento,r.investimento,
      r.fonte_receita,r.observacoes,r.origem
    from alliance_data.campaign_results_current r
    where r.brand_id=p_brand_id
      and r.campaign_id=p_campaign_id
      and r.arquivado_em is null
    order by r.id,r.data desc nulls last
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at desc nulls last),'[]'::jsonb)
  into v_deliveries
  from (
    select distinct on (d.id)
      d.id,d.title,d.task_title,d.status,d.project,d.sender,d.recipient,d.note,
      d.files,d.links,d.events,d.created_at,d.updated_at,d.source_task_id,d.target_task_id
    from alliance_data.deliveries d
    where d.brand_id=p_brand_id
      and not coalesce(d.is_archived,false)
      and (
        d.source_task_id=any(v_task_ids)
        or d.target_task_id=any(v_task_ids)
      )
    order by d.id,d.updated_at desc nulls last
  ) x;

  return jsonb_build_object(
    'campaign',v_campaign,
    'tasks',v_tasks,
    'open_task_count',(
      select count(distinct t.id)::int
      from alliance_data.tasks_current t
      where t.brand_id=p_brand_id and t.campaign_id=p_campaign_id
        and not coalesce(t.is_archived,false)
        and lower(coalesce(t.status,'')) not in ('feito','concluida','concluído')
    ),
    'overdue_tasks',v_overdue,
    'overdue_count',jsonb_array_length(v_overdue),
    'workload',v_workload,
    'results',v_results,
    'deliveries',v_deliveries,
    'date',v_today
  );
end
$function$;

revoke all on function public.agent_campaign_focus(uuid,text) from public;
grant execute on function public.agent_campaign_focus(uuid,text) to authenticated;

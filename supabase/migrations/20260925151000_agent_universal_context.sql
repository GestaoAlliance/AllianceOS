-- Universal live context for the AllianceOS agent.
-- Keeps the agent grounded in current operational data instead of hard-coded answers.

create or replace function public.agent_universal_context(
  p_brand_id uuid,
  p_query text,
  p_limit integer default 8
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit,8), 16));
  v_tokens text[];
  v_brand jsonb := '{}'::jsonb;
  v_campaigns jsonb := '[]'::jsonb;
  v_tasks jsonb := '[]'::jsonb;
  v_deliveries jsonb := '[]'::jsonb;
  v_results jsonb := '[]'::jsonb;
  v_people jsonb := '[]'::jsonb;
  v_workload jsonb := '[]'::jsonb;
  v_lists jsonb := '[]'::jsonb;
  v_planning jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão inválida';
  end if;
  if p_brand_id is null then
    if not app.sou_admin() then
      raise exception 'Selecione uma marca para esta consulta';
    end if;
    v_brand := jsonb_build_object('id',null,'name','Todas as marcas','slug','all');
  elsif not app.pode_acessar_marca(p_brand_id) then
    raise exception 'Acesso negado à marca';
  else
    select jsonb_build_object('id',b.id,'name',b.nome,'slug',b.slug,'active',b.ativo)
    into v_brand
    from public.brands b where b.id=p_brand_id;
  end if;

  select coalesce(array_agg(tok),'{}'::text[]) into v_tokens
  from (
    select distinct tok
    from unnest(regexp_split_to_array(lower(coalesce(p_query,'')), '[^[:alnum:]À-ÿ]+')) tok
    where length(tok) >= 3
      and tok not in (
        'qual','quais','como','onde','quando','quem','que','com','sem','uma','umas','uns',
        'para','por','dos','das','nos','nas','esse','essa','este','esta','isso','aqui',
        'agora','mais','sobre','fala','falo','quero','saber','tem','estao','está','estão',
        'seria','seriam','pode','podem','deve','devem'
      )
  ) q;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc, x.start_at desc nulls last),'[]'::jsonb)
  into v_campaigns
  from (
    select c.id,c.brand_id,c.brand_name,c.name,c.status,c.type,c.objective,c.goal,c.start_at,c.end_at,c.month_ref,
           c.budget,c.offer,c.products,c.channels,c.benefits,c.schedule,
           c.raw->'tap' as tap,
           c.raw->'sobre_evento' as sobre_evento,
           c.raw->'equipe' as equipe,
           c.raw->'fases' as fases,
           c.raw->'cronograma' as cronograma,
           c.raw->'metas_por_fonte' as metas_por_fonte,
           (select count(*)::int from unnest(v_tokens) t
            where lower(concat_ws(' ',c.brand_name,c.name,c.status,c.type,c.objective,c.goal,c.month_ref,
              c.offer::text,c.products::text,c.channels::text,c.schedule::text,
              c.raw->>'sobre_evento',c.raw->>'cronograma',c.raw->>'equipe')) like '%'||t||'%') as score
    from alliance_data.campaigns c
    where (p_brand_id is null or c.brand_id=p_brand_id)
      and not coalesce(c.is_archived,false)
    order by score desc,c.start_at desc nulls last
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc, x.due_date_text nulls last),'[]'::jsonb)
  into v_tasks
  from (
    select t.id,t.brand_id,t.brand_name,t.title,t.description,t.status,t.priority,t.due_date_text,t.due_at_text,
           t.start_date_text,t.campaign_id,t.project,t.list_id,t.parent_task_id,t.channel,
           t.assignees,t.subtasks,t.dependencies,t.checklist,t.attachments,t.comments,t.tags,
           (select count(*)::int from unnest(v_tokens) tok
            where lower(concat_ws(' ',t.brand_name,t.title,t.description,t.status,t.priority,t.due_date_text,
              t.project,t.channel,t.assignees::text,t.tags::text,t.comments::text,t.checklist::text,
              t.dependencies::text,t.subtasks::text)) like '%'||tok||'%') as score
    from alliance_data.tasks_current t
    where (p_brand_id is null or t.brand_id=p_brand_id)
      and not coalesce(t.is_archived,false)
    order by score desc,t.due_date_text nulls last
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc, x.updated_at desc nulls last),'[]'::jsonb)
  into v_deliveries
  from (
    select d.id,d.brand_id,d.brand_name,d.title,d.task_title,d.status,d.project,d.sender,d.recipient,d.note,
           d.files,d.links,d.events,d.created_at,d.updated_at,d.source_task_id,d.target_task_id,
           (select count(*)::int from unnest(v_tokens) tok
            where lower(concat_ws(' ',d.brand_name,d.title,d.task_title,d.status,d.project,d.sender,d.recipient,
              d.note,d.files::text,d.links::text,d.events::text)) like '%'||tok||'%') as score
    from alliance_data.deliveries d
    where (p_brand_id is null or d.brand_id=p_brand_id)
      and not coalesce(d.is_archived,false)
    order by score desc,d.updated_at desc nulls last
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc, x.data desc nulls last),'[]'::jsonb)
  into v_results
  from (
    select r.id,r.campaign_id,c.name as campaign_name,r.brand_id,c.brand_name,r.canal,r.data,
           r.faturamento,r.investimento,r.fonte_receita,r.observacoes,r.origem,
           (select count(*)::int from unnest(v_tokens) tok
            where lower(concat_ws(' ',c.brand_name,c.name,r.campaign_id,r.canal,r.fonte_receita,r.observacoes,r.origem)) like '%'||tok||'%') as score
    from alliance_data.campaign_results_current r
    left join alliance_data.campaigns c on c.id=r.campaign_id
    where (p_brand_id is null or r.brand_id=p_brand_id)
      and r.arquivado_em is null
    order by score desc,r.data desc nulls last
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc, x.nome),'[]'::jsonb)
  into v_people
  from (
    select p.id,p.nome,p.email,p.cargo,p.papel::text as papel,p.ativo,p.tipo_membro,
           a.nome as area,
           (select count(*)::int from unnest(v_tokens) tok
            where lower(concat_ws(' ',p.nome,p.email,p.cargo,p.papel::text,a.nome,p.tipo_membro)) like '%'||tok||'%') as score
    from alliance_data.profiles_current p
    left join public.areas a on a.id=p.area_id
    where p.ativo
      and (p_brand_id is null or exists (
        select 1 from public.profile_brands pb
        where pb.profile_id=p.id and pb.brand_id=p_brand_id
      ))
    order by score desc,p.nome
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.open_tasks desc, x.overdue_tasks desc, x.person),'[]'::jsonb)
  into v_workload
  from (
    select a.person,
           count(*)::int as open_tasks,
           count(*) filter (
             where t.due_date_text ~ '^\d{4}-\d{2}-\d{2}$'
               and t.due_date_text::date < (now() at time zone 'America/Sao_Paulo')::date
           )::int as overdue_tasks,
           count(*) filter (where lower(coalesce(t.status,''))='fazendo')::int as doing_tasks,
           jsonb_agg(jsonb_build_object(
             'id',t.id,'title',t.title,'brand',t.brand_name,'status',t.status,
             'priority',t.priority,'due_date',t.due_date_text,'project',t.project
           ) order by t.due_date_text nulls last) as tasks
    from alliance_data.tasks_current t
    cross join lateral jsonb_array_elements_text(coalesce(t.assignees,'[]'::jsonb)) a(person)
    where (p_brand_id is null or t.brand_id=p_brand_id)
      and not coalesce(t.is_archived,false)
      and lower(coalesce(t.status,'')) <> 'feito'
    group by a.person
    order by open_tasks desc,overdue_tasks desc,a.person
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc, x.nome),'[]'::jsonb)
  into v_lists
  from (
    select l.id,l.nome,l.brand_id,b.nome as brand_name,l.campanha_id,
           (select count(*)::int from unnest(v_tokens) tok
            where lower(concat_ws(' ',b.nome,l.nome,l.campanha_id)) like '%'||tok||'%') as score
    from alliance_data.task_lists_current l
    left join public.brands b on b.id=l.brand_id
    where (p_brand_id is null or l.brand_id=p_brand_id)
      and l.arquivado_em is null
    order by score desc,l.nome
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.ano desc,x.mes desc,x.brand_name),'[]'::jsonb)
  into v_planning
  from (
    select pm.id,pm.brand_id,b.nome as brand_name,pm.ano,pm.mes,pm.meta1,pm.meta2,pm.meta3,pm.meta_ativa,
           pm.ticket_medio_previsto,pm.origem
    from alliance_data.planning_months_current pm
    left join public.brands b on b.id=pm.brand_id
    where (p_brand_id is null or pm.brand_id=p_brand_id)
      and pm.arquivado_em is null
    order by pm.ano desc,pm.mes desc,b.nome
    limit 12
  ) x;

  return jsonb_build_object(
    'brand',coalesce(v_brand,'{}'::jsonb),
    'query_tokens',to_jsonb(v_tokens),
    'campaigns',v_campaigns,
    'tasks',v_tasks,
    'deliveries',v_deliveries,
    'results',v_results,
    'people',v_people,
    'workload',v_workload,
    'lists',v_lists,
    'planning',v_planning,
    'generated_at',now()
  );
end
$function$;

revoke all on function public.agent_universal_context(uuid,text,integer) from public;
grant execute on function public.agent_universal_context(uuid,text,integer) to authenticated;

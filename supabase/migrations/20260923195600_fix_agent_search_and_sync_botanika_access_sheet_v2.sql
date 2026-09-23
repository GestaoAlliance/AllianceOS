create or replace function public.buscar_conhecimento_semantico(
  p_query_embedding extensions.vector,
  p_brand_id uuid default null,
  p_limit integer default 20
)
returns table(
  id uuid,
  brand_id uuid,
  source_type text,
  source_id text,
  chunk_index integer,
  title text,
  content text,
  metadata jsonb,
  similarity double precision
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Sessão inválida'; end if;
  if p_brand_id is null then
    if not app.sou_admin() then raise exception 'Selecione uma marca para consultar a memória'; end if;
  elsif not app.pode_acessar_marca(p_brand_id) then
    raise exception 'Acesso negado à marca';
  end if;

  return query
  select s.id,s.brand_id,s.source_type,s.source_id,s.chunk_index,s.title,s.content,s.metadata,s.similarity
  from alliance_data.search_knowledge_semantic(
    p_query_embedding,'gte-small',p_brand_id,greatest(1,least(coalesce(p_limit,20),100))
  ) s;
end;
$$;

revoke all on function public.buscar_conhecimento_semantico(extensions.vector,uuid,integer) from public,anon;
grant execute on function public.buscar_conhecimento_semantico(extensions.vector,uuid,integer) to authenticated;

create or replace function public.agent_task_summary(p_brand_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_brand text;
  v_open integer;
  v_overdue integer;
  v_today_count integer;
  v_doing integer;
  v_review integer;
  v_tasks jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Sessão inválida'; end if;
  if p_brand_id is null or not app.pode_acessar_marca(p_brand_id) then raise exception 'Acesso negado à marca'; end if;

  select nome into v_brand from public.brands where id=p_brand_id;

  select
    count(*) filter (where not is_archived and lower(coalesce(status,'')) <> 'feito'),
    count(*) filter (where not is_archived and lower(coalesce(status,'')) <> 'feito' and due_date_text ~ '^\d{4}-\d{2}-\d{2}$' and due_date_text::date < v_today),
    count(*) filter (where not is_archived and lower(coalesce(status,'')) <> 'feito' and due_date_text ~ '^\d{4}-\d{2}-\d{2}$' and due_date_text::date = v_today),
    count(*) filter (where not is_archived and lower(coalesce(status,''))='fazendo'),
    count(*) filter (where not is_archived and lower(coalesce(status,''))='em revisão')
  into v_open,v_overdue,v_today_count,v_doing,v_review
  from alliance_data.tasks_current
  where brand_id=p_brand_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'title',x.title,'status',x.status,'priority',x.priority,
    'due_date',x.due_date_text,'due_at',x.due_at_text,'assignees',x.assignees,'project',x.project
  ) order by x.due_date_text,x.priority desc),'[]'::jsonb)
  into v_tasks
  from (
    select id,title,status,priority,due_date_text,due_at_text,assignees,project
    from alliance_data.tasks_current
    where brand_id=p_brand_id
      and not is_archived
      and lower(coalesce(status,'')) <> 'feito'
      and due_date_text ~ '^\d{4}-\d{2}-\d{2}$'
      and due_date_text::date < v_today
    order by due_date_text asc,
      case lower(coalesce(priority,'')) when 'urgente' then 1 when 'alta' then 2 when 'média' then 3 when 'media' then 3 else 4 end,
      title
    limit 8
  ) x;

  return jsonb_build_object(
    'brand_id',p_brand_id,'brand_name',coalesce(v_brand,'Marca'),'date',v_today,
    'open',coalesce(v_open,0),'overdue',coalesce(v_overdue,0),'due_today',coalesce(v_today_count,0),
    'doing',coalesce(v_doing,0),'review',coalesce(v_review,0),
    'overdue_tasks',coalesce(v_tasks,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.agent_task_summary(uuid) from public,anon;
grant execute on function public.agent_task_summary(uuid) to authenticated;

update public.access_center_entries
set category = case
  when source_sheet='Central de Acessos' and source_row between 3 and 5 then 'Contas Google'
  when source_sheet='Central de Acessos' and source_row between 6 and 7 then 'Acessos gerais'
  when source_sheet='Central de Acessos' and source_row between 9 and 17 then 'Contas de Servidor, Domínio e Páginas'
  when source_sheet='Central de Acessos' and source_row between 18 and 22 then 'Ferramentas de CRM'
  when source_sheet='Central de Acessos' and source_row between 23 and 25 then 'Servidor, n8n e banco de dados'
  when source_sheet='Central de Acessos' and source_row between 26 and 27 then 'Plataformas de Pagamentos e Dashboards'
  when source_sheet='Central de Acessos' and source_row between 28 and 31 then 'Ferramentas de IA'
  when source_sheet='Central de Acessos' and source_row between 32 and 34 then 'Conta de Anúncios'
  when source_sheet='Central de Acessos' and source_row=35 then 'Linhas Telefônicas'
  when source_sheet='Central de Acessos' and source_row=37 then 'Dados da empresa'
  else category
end
where brand_id='91a66f9e-6dc8-40c8-b7ca-33b8b39676f4'::uuid;

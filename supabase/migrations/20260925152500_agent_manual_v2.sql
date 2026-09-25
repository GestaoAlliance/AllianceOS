-- AllianceOS Agent Manual v2
-- Adds query-aware retrieval for the persistent operating manual and expands
-- the ontology used by Workers AI. Existing records are updated, never deleted.

create or replace function public.agent_knowledge_context(
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
  v_limit integer := greatest(1, least(coalesce(p_limit,8), 20));
  v_tokens text[];
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão inválida';
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
        'seria','seriam','pode','podem','deve','devem','entao','então'
      )
  ) q;

  with scored as (
    select
      k.*,
      case when k.always_include then 1000 else 0 end
      + coalesce((
          select count(*) * 50
          from unnest(k.keywords) kw
          where lower(coalesce(p_query,'')) like '%' || lower(kw) || '%'
        ),0)
      + coalesce((
          select count(*) * 8
          from unnest(v_tokens) tok
          where lower(concat_ws(' ',k.title,k.category,k.content)) like '%' || tok || '%'
        ),0) as score
    from alliance_data.agent_knowledge k
    where not k.is_archived
  ),
  picked as (
    select *
    from scored
    where always_include or score > 0
    order by always_include desc,score desc,priority asc,key
    limit (
      select count(*) filter (where always_include) + v_limit
      from scored
    )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key',key,'title',title,'category',category,'content',content,
        'examples',examples,'priority',priority,'always_include',always_include,
        'version',version,'score',score
      )
      order by always_include desc,priority asc,score desc,key
    ),
    '[]'::jsonb
  )
  into v_result
  from picked;

  return v_result;
end
$function$;

revoke all on function public.agent_knowledge_context(text,integer) from public;
grant execute on function public.agent_knowledge_context(text,integer) to authenticated;

create or replace function public.agent_instruction_context(
  p_query text default '',
  p_limit integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_sections jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão inválida';
  end if;

  v_sections := public.agent_knowledge_context(
    coalesce(p_query,''),
    greatest(5, least(coalesce(p_limit,12), 20))
  );

  return jsonb_build_object(
    'manual_name','AllianceOS Agent Operating Manual',
    'manual_version','2',
    'generated_at',now(),
    'sections',coalesce(v_sections,'[]'::jsonb)
  );
end
$function$;

revoke all on function public.agent_instruction_context(text,integer) from public;
grant execute on function public.agent_instruction_context(text,integer) to authenticated;

insert into alliance_data.agent_knowledge
  (key,title,category,content,keywords,examples,priority,always_include,is_archived,created_at,updated_at)
values
(
  'status_priority_semantics',
  'Status, prioridades e bloqueios',
  'tasks',
  $$Use os valores reais do AllianceOS e preserve o idioma PT-BR. Prioridades operacionais: urgente, alta, normal e baixa. Uma tarefa concluída não deve ser tratada como aberta. Uma tarefa bloqueada deve ser explicada junto com a dependência ou motivo de bloqueio quando esse dado existir. Não deduza prioridade apenas pelo nome da tarefa. Ao interpretar atrasos, só considere atraso quando houver prazo vencido e a tarefa ainda estiver aberta.$$,
  array['status','prioridade','urgente','alta','normal','baixa','bloqueada','bloqueado','atrasada','atrasado','concluida','concluída'],
  '[]'::jsonb,82,false,false,now(),now()
),
(
  'maps_lists_entities',
  'Mapas mentais, listas e entidades',
  'planning',
  $$Mapa mental é uma representação visual do planejamento e pode conter nós que apontam para campanhas ou itens estruturais. Um nó visual não é automaticamente uma entidade nova. Não conte duplicações visuais como campanhas distintas. Listas organizam tarefas e podem estar vinculadas a uma campanha; uma lista não é uma campanha. Ao responder quantidades, nomes ou relações, use a entidade canônica correspondente e trate o mapa como visualização/planejamento.$$,
  array['mapa','mapa mental','no','nó','nos','nós','lista','listas','duplicada','duplicado','planejamento'],
  '[]'::jsonb,85,false,false,now(),now()
),
(
  'time_period_semantics',
  'Hoje, semana, mês e próximos dias',
  'core',
  $$Interprete tempo usando America/Sao_Paulo. "Hoje" é a data corrente nesse fuso. "Esta semana", "essa semana" e "semana atual" significam segunda-feira a domingo. "Próximos dias" significa a janela imediatamente futura a partir de hoje; priorize eventos/campanhas que começam ou permanecem ativos nessa janela. Para uma campanha com início e fim, considere-a no período quando as datas se sobrepõem ao intervalo perguntado. Preserve hora e fuso quando disponíveis e nunca invente datas ausentes.$$,
  array['hoje','semana','essa semana','esta semana','proximos dias','próximos dias','mes','mês','periodo','período','data','prazo'],
  '[]'::jsonb,58,true,false,now(),now()
),
(
  'cross_domain_diagnosis',
  'Diagnóstico cruzando campanhas, tarefas e entregas',
  'operations',
  $$Perguntas amplas como "o que está crítico?", "o que falta?", "onde estamos atrasados?", "o que preciso olhar hoje?" e "como está a operação?" exigem cruzar domínios. Considere campanhas ativas, janela de datas, tarefas abertas/atrasadas, dependências, prioridade, entregas e aprovações, responsáveis, carga do time e resultados quando disponíveis. Cite os sinais concretos que sustentam a conclusão. Se não houver dados suficientes para um diagnóstico, diga quais dados estão faltando.$$,
  array['critico','crítico','falta','atrasado','atrasada','operacao','operação','hoje','risco','olhar','atenção','atencao'],
  '[]'::jsonb,42,false,false,now(),now()
)
on conflict (key) do update
set title=excluded.title,
    category=excluded.category,
    content=excluded.content,
    keywords=excluded.keywords,
    examples=excluded.examples,
    priority=excluded.priority,
    always_include=excluded.always_include,
    is_archived=false,
    archived_at=null,
    archived_by=null,
    updated_at=now();

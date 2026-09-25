
insert into alliance_data.agent_knowledge
(key,title,category,content,keywords,examples,priority,always_include)
values
(
'campaign_scope_discipline',
'Disciplina de escopo em perguntas sobre campanha',
'campaigns',
$$Quando uma campanha específica estiver em foco, perguntas subsequentes sobre tarefas, atrasos, responsáveis, carga, entregas, resultados, risco ou criticidade devem usar PRIMEIRO o recorte daquela campanha.

Regras:
- “o que falta nessa campanha?” = tarefas abertas ligadas à campanha, deduplicadas por ID;
- “tem algo atrasado?” depois de falar da campanha = atrasos da campanha, não da marca inteira;
- “quem está mais sobrecarregado nela?” = carga calculada apenas pelas tarefas da campanha;
- “o que está mais crítico hoje?” em contexto de campanha = bloqueios, atrasos e prazos da campanha;
- só use totais da marca quando o usuário pedir explicitamente visão geral/da marca/time inteiro;
- ao comparar campanha x perpétuo, compare apenas a campanha em foco com as frentes perpétuas ativas; campanhas encerradas só entram se ainda gerarem um bloqueio operacional atual relevante;
- nunca repita a mesma tarefa, campanha ou pessoa para preencher uma resposta;
- listas operacionais devem ser curtas: até 8 itens, com contagem do restante;
- se o usuário pedir 5 pontos, responda exatamente 5 pontos, priorizando objetivo/período, meta, oferta/produtos, execução/responsáveis e riscos/próximos passos.$$,
array['campanha','nessa','nela','dela','falta','atrasado','atrasada','sobrecarregado','sobrecarregada','critico','crítico','perpetuo','perpétuo','resumo','pontos'],
jsonb_build_array(
  jsonb_build_object('user','quem está mais sobrecarregado nela?','rule','usar workload da campanha em foco, não workload geral da marca'),
  jsonb_build_object('user','tem alguma coisa atrasada?','rule','listar somente atrasos da campanha quando a conversa ainda está nela')
),58,false
)
on conflict(key) do update set
  title=excluded.title,
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

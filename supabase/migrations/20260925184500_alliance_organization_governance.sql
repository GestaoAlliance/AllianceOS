
create table if not exists alliance_data.org_areas (
  key text primary key,
  name text not null unique,
  head_seat_code text null,
  head_name text null,
  description text null,
  display_order integer not null default 100,
  is_active boolean not null default true,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alliance_data.org_seats (
  code text primary key,
  title text not null,
  level text null,
  area_key text null references alliance_data.org_areas(key),
  subarea text null,
  occupant_name text null,
  profile_id uuid null references public.profiles(id),
  scope text null,
  mission text null,
  summary text null,
  authority text null,
  escalation text null,
  source_document text not null default 'Organograma Alliance',
  is_active boolean not null default true,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists alliance_data.org_kpis (
  id uuid primary key default gen_random_uuid(),
  owner_seat_code text not null references alliance_data.org_seats(code),
  name text not null,
  frequency text null,
  formula text null,
  target_note text null,
  source_document text not null default 'Organograma Alliance',
  is_active boolean not null default true,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_seat_code,name)
);

create table if not exists alliance_data.management_rituals (
  code text primary key,
  name text not null,
  owner_seat_code text null references alliance_data.org_seats(code),
  owner_name text null,
  frequency text null,
  timing text null,
  duration text null,
  objective text null,
  prerequisites text null,
  agenda text null,
  outputs text null,
  rules text null,
  participants text null,
  registration text null,
  status_model text null,
  source_document text not null default 'Organograma Alliance',
  is_active boolean not null default true,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table alliance_data.org_areas enable row level security;
alter table alliance_data.org_seats enable row level security;
alter table alliance_data.org_kpis enable row level security;
alter table alliance_data.management_rituals enable row level security;
revoke all on alliance_data.org_areas from anon, authenticated;
revoke all on alliance_data.org_seats from anon, authenticated;
revoke all on alliance_data.org_kpis from anon, authenticated;
revoke all on alliance_data.management_rituals from anon, authenticated;

with src as (
 select * from jsonb_to_recordset($areas$[{"key":"strategy_growth","name":"Estratégia & Growth","head_seat_code":"C02","head_name":"Gabriel","description":"Definir onde crescer, quais alavancas priorizar e garantir que metas e apostas estratégicas produzam o resultado esperado.","display_order":1},{"key":"governance_admin","name":"Governança & Administração","head_seat_code":"C03","head_name":"Vanessa","description":"Organização administrativa, políticas, regras, controles e estrutura institucional.","display_order":2},{"key":"operations_pmo","name":"Operações & PMO","head_seat_code":"C04","head_name":"Vitor","description":"Transformar estratégia em execução previsível, no prazo e com qualidade.","display_order":3},{"key":"marketing_cro","name":"Marketing & CRO","head_seat_code":"C06","head_name":"Pedro","description":"Gerar aquisição eficiente e maximizar conversão e receita.","display_order":4},{"key":"content_influencers","name":"Conteúdo & Influenciadores","head_seat_code":null,"head_name":null,"description":"Gerar conteúdo consistente e construir base ativa de influenciadores que gere conteúdo, alcance e resultado.","display_order":5},{"key":"technology_automations","name":"Tecnologia & Automações","head_seat_code":"C13","head_name":"Sarah","description":"Garantir que automações, integrações e infraestrutura funcionem com estabilidade e reduzam trabalho manual.","display_order":6},{"key":"support_cx","name":"Suporte & CX","head_seat_code":null,"head_name":null,"description":"Resolver dúvidas e problemas rapidamente, garantir boa experiência e aproveitar oportunidades de venda assistida.","display_order":7},{"key":"marketplaces_channels","name":"Marketplaces & Canais","head_seat_code":null,"head_name":null,"description":"Fazer os canais de marketplace crescerem com operação saudável e resultado financeiro consistente. Hoje: TikTok Shop.","display_order":8}]$areas$::jsonb) as x(
   key text,name text,head_seat_code text,head_name text,description text,display_order integer
 )
)
insert into alliance_data.org_areas(key,name,head_seat_code,head_name,description,display_order,is_active,archived_at,updated_at)
select key,name,head_seat_code,head_name,description,display_order,true,null,now() from src
on conflict(key) do update set
 name=excluded.name,head_seat_code=excluded.head_seat_code,head_name=excluded.head_name,
 description=excluded.description,display_order=excluded.display_order,is_active=true,archived_at=null,updated_at=now();

with src as (
 select * from jsonb_to_recordset($seats$[{"code":"C01","title":"CEO","level":"C-Level","area_key":null,"subarea":null,"occupant_name":"Gabriel","profile_id":null,"scope":null,"mission":"Definir a direção geral da Alliance e garantir crescimento, prioridades claras e alinhamento executivo.","summary":"Direção geral, prioridades macro, recursos e decisões executivas relevantes.","authority":"Definir prioridades macro; tomar decisões executivas relevantes; aprovar investimentos relevantes dentro de sua alçada; aprovar alterações importantes na liderança; definir o direcionamento geral; resolver conflitos de prioridade entre áreas executivas.","escalation":"Questões societárias e matérias reservadas à governança seguem para Sócios / Governança."},{"code":"C02","title":"CMO — Chief Marketing Officer","level":"C-Level","area_key":"strategy_growth","subarea":null,"occupant_name":"Gabriel","profile_id":null,"scope":null,"mission":"Definir a estratégia de marketing, crescimento e geração de receita da operação Alliance, transformando objetivos de negócio em direcionamentos claros para campanhas, ofertas, canais e áreas executoras.","summary":"CMO decide onde e como crescer. Operações transforma isso em execução.","authority":"Definir estratégias de Marketing e Growth; definir prioridades de crescimento; propor e aprovar campanhas dentro da alçada; definir ofertas e mecânicas comerciais; redirecionar estratégias; solicitar projetos a Operações & PMO; determinar hipóteses estratégicas a testar.","escalation":"Escala para CEO em mudanças relevantes na direção do negócio, investimentos extraordinários, novos negócios, decisões com impacto significativo em orçamento/estrutura ou conflitos estratégicos fora de Marketing/Growth."},{"code":"C03","title":"CAO — Chief Administrative Officer","level":"C-Level","area_key":"governance_admin","subarea":null,"occupant_name":"Vanessa","profile_id":null,"scope":null,"mission":"Garantir que a Alliance funcione com organização, governança, regras claras, controles e estrutura administrativa adequada.","summary":"CAO garante que a empresa esteja organizada, controlada e governada.","authority":"Definir e exigir padrões administrativos; cobrar conformidade com regras internas; estruturar políticas e controles; solicitar correção de falhas administrativas; organizar documentos, acessos e regras institucionais; participar da aprovação de mudanças relevantes de estrutura.","escalation":"Escala para CEO / Sócios conforme o assunto; questões societárias, jurídicas relevantes, despesas extraordinárias, conflitos entre sócios e políticas empresariais seguem à governança."},{"code":"C04","title":"Head de Operações & PMO","level":"Head","area_key":"operations_pmo","subarea":null,"occupant_name":"Vitor","profile_id":"395ed61f-dde7-4fb6-a6da-ea5301304765","scope":null,"mission":"Transformar a estratégia da Alliance em execução organizada, previsível e mensurável, garantindo que áreas, projetos, prioridades e recursos trabalhem de forma coordenada.","summary":"O Head de Operações é dono da máquina de execução, não de executar pessoalmente tudo que passa por ela.","authority":"Priorizar tarefas e projetos dentro das diretrizes estratégicas; redistribuir execução entre áreas conforme capacidade; cobrar entregas e prazos; definir padrões operacionais; solicitar correções; bloquear entrega fora do critério mínimo; convocar responsáveis; reorganizar cronogramas; estabelecer rituais, checkpoints e controles.","escalation":"Escala para CMO em mudança estratégica/oferta/meta; para CAO em governança/regras; para CEO em conflito executivo, recursos relevantes ou decisão de alto impacto."},{"code":"C05","title":"Gestor de Projetos","level":"Gestor","area_key":"operations_pmo","subarea":"Gestão de Projetos / PMO","occupant_name":"Vitor","profile_id":"395ed61f-dde7-4fb6-a6da-ea5301304765","scope":null,"mission":"Garantir que cada projeto sob sua responsabilidade saia do planejamento e chegue à conclusão dentro do escopo, prazo e padrão esperado.","summary":"Head de Operações olha o sistema inteiro. Gestor de Projetos garante que cada projeto específico aconteça.","authority":"Organizar cronograma; cobrar responsáveis; solicitar atualização de tarefas; convocar alinhamentos do projeto; reorganizar sequência de atividades; sinalizar risco; bloquear passagem de etapa quando requisitos não forem cumpridos; escalar atraso ou impedimento. Não altera sozinho estratégia, oferta ou meta.","escalation":"Escala para Head de Operações & PMO em conflito de prioridade, atraso crítico, falta de capacidade, dependência não resolvida, mudança relevante de escopo ou problemas entre áreas."},{"code":"C06","title":"Head de Marketing & CRO","level":"Head","area_key":"marketing_cro","subarea":null,"occupant_name":"Pedro","profile_id":"be1e4ffc-fd6e-40fb-8b3c-d6f888d90db9","scope":null,"mission":"Garantir que a estratégia de marketing definida pelo CMO seja convertida em execução de aquisição, conversão e otimização, coordenando Performance, E-commerce/CRO e Estratégia Criativa.","summary":"O Head de Marketing & CRO é dono da máquina de aquisição e conversão.","authority":"Definir prioridades internas de Marketing & CRO; propor redistribuição de investimento dentro da alçada; solicitar criativos e alterações em páginas/funis; pausar configurações tecnicamente incorretas; definir testes de CRO; exigir correção antes de go-live; organizar execução das cadeiras da área.","escalation":"Escala para CMO em mudança de estratégia, oferta, posicionamento, budget relevante, meta ou canal; para Head de Operações & PMO em capacidade, prazo, prioridade, dependências e atrasos."},{"code":"C07","title":"Gestor de Tráfego","level":"Gestor","area_key":"marketing_cro","subarea":"Performance","occupant_name":"Pedro","profile_id":"be1e4ffc-fd6e-40fb-8b3c-d6f888d90db9","scope":null,"mission":"Planejar, executar e otimizar mídia paga para gerar aquisição e receita dentro das metas e estratégias definidas.","summary":"O Gestor de Tráfego é dono da mídia paga e da eficiência da aquisição.","authority":"Pausar anúncios; aumentar/reduzir investimento dentro dos limites aprovados; testar estruturas; redistribuir verba taticamente; interromper anúncios com problema técnico; solicitar novos criativos; ajustar segmentações; corrigir configurações.","escalation":"Escala para Head de Marketing & CRO em mudança relevante de estratégia, aumento expressivo de verba, performance persistentemente abaixo da meta, problemas graves de tracking ou necessidade de mudança de oferta/página."},{"code":"C08","title":"Gestor de E-commerce & CRO","level":"Gestor","area_key":"marketing_cro","subarea":"E-commerce & CRO","occupant_name":"Pedro","profile_id":"be1e4ffc-fd6e-40fb-8b3c-d6f888d90db9","scope":null,"mission":"Garantir que a experiência de compra e o funil de conversão estejam funcionando corretamente e sejam continuamente otimizados para aumentar conversão e receita.","summary":"O Gestor de E-commerce & CRO é dono da experiência de compra e da conversão do site.","authority":"Corrigir problemas de e-commerce; implementar alterações aprovadas; propor testes; bloquear go-live se oferta estiver tecnicamente incorreta; ajustar elementos de conversão; solicitar suporte técnico; recomendar alterações no funil. Não altera sozinho oferta comercial aprovada.","escalation":"Escala para Head de Marketing & CRO em alteração estratégica, desenvolvimento relevante, impacto em outras áreas, investimento ou risco significativo de receita; para CMO em mudança de oferta/mecânica comercial estratégica."},{"code":"C09","title":"Especialista de Copy & Estratégia Criativa","level":"Especialista","area_key":"marketing_cro","subarea":"Copy & Estratégia Criativa","occupant_name":"Pedro","profile_id":"be1e4ffc-fd6e-40fb-8b3c-d6f888d90db9","scope":null,"mission":"Transformar estratégia, oferta e conhecimento do público em mensagens, ângulos e direcionamentos criativos capazes de gerar atenção, desejo e conversão.","summary":"O Especialista de Copy & Estratégia Criativa é dono da mensagem e do direcionamento criativo para conversão.","authority":"Propor novos ângulos e variações; definir estrutura de copy no direcionamento aprovado; recomendar mudanças de mensagem; solicitar ativos criativos; eliminar variações tecnicamente fracas antes da produção. Não altera sozinho posicionamento macro, oferta ou promessa estratégica.","escalation":"Escala para Head de Marketing & CRO; mudanças significativas de mensagem, oferta, conflito estratégia-execução ou recursos relevantes podem subir ao CMO via Head."},{"code":"C10","title":"Gestor de Conteúdo & Social Media","level":"Gestor","area_key":"content_influencers","subarea":"Conteúdo & Social","occupant_name":"Ítalo","profile_id":"6152b7f8-2175-43df-8590-836f1e81e45f","scope":null,"mission":"Garantir a presença orgânica das marcas nos canais sociais, transformando direcionamentos estratégicos e campanhas em conteúdo planejado, produzido, publicado e consistente.","summary":"O Gestor de Conteúdo & Social é dono da presença orgânica e da execução editorial das marcas.","authority":"Organizar calendário editorial; distribuir conteúdos ao longo do calendário dentro da estratégia aprovada; adaptar formatos; realizar ajustes editoriais; propor conteúdos, formatos e tendências; priorizar produção. Não altera sozinho posicionamento, oferta, promessa, campanha macro ou identidade.","escalation":"Escala para Head de Operações & PMO / Gestor de Projetos em prioridade, prazo, dependências ou capacidade; para Marketing/CMO em mensagem estratégica, campanha ou posicionamento."},{"code":"C11","title":"Gestora de Influenciadores","level":"Gestora","area_key":"content_influencers","subarea":"Influenciadores","occupant_name":"Ana","profile_id":"392babaa-28f6-4771-96bb-0a4588a59655","scope":null,"mission":"Construir e gerir uma rede de influenciadores capaz de gerar conteúdo, alcance, relacionamento e resultado para as marcas da Alliance.","summary":"A Gestora de Influenciadores é dona do relacionamento e do ciclo de vida do creator depois que ele entra no pipeline.","authority":"Conduzir relacionamento; negociar dentro das políticas e limites definidos; cobrar entregas; selecionar creators após prospecção; priorizar creators; solicitar correção/regravação; recomendar encerramento; propor ações. Não aprova sozinha condições financeiras extraordinárias ou mudança macro de campanha.","escalation":"Escala para CMO/Marketing em condições excepcionais, creators estratégicos, mudança relevante de campanha, ações especiais ou investimento fora do padrão; para Operações & PMO em atrasos, bloqueios, prioridades e dependências."},{"code":"C12","title":"Analista de Prospecção de Influenciadores (Hunter)","level":"Analista","area_key":"content_influencers","subarea":"Influenciadores","occupant_name":"Lívia","profile_id":null,"scope":null,"mission":"Manter um fluxo constante de novos influenciadores qualificados entrando no pipeline para que a Alliance tenha continuamente novas oportunidades de parceria.","summary":"O Hunter é dono da entrada do funil de influenciadores; a Ana é dona da oportunidade depois que ela é qualificada.","authority":"Prospectar perfis; iniciar contato conforme roteiro/política; descartar perfis claramente fora dos critérios; qualificar oportunidades; priorizar pesquisas. Não fecha condições extraordinárias, aprova contrato, promete pagamento/comissão fora do padrão ou altera briefing.","escalation":"Escala para Gestora de Influenciadores em creator relevante, dúvida de qualificação, negociação, condição comercial, exceção ou oportunidade especial; capacidade/prioridade pode subir para Operações."},{"code":"C13","title":"Head de Automações & Infraestrutura","level":"Head","area_key":"technology_automations","subarea":null,"occupant_name":"Sarah","profile_id":"32431a2b-20a0-49ea-abcb-2a2194094b19","scope":null,"mission":"Garantir que a infraestrutura tecnológica, as automações e as integrações da Alliance funcionem de forma confiável, organizada e escalável, apoiando todas as áreas da empresa.","summary":"O Head de Automações & Infraestrutura é dono da confiabilidade e evolução da camada tecnológica operacional da Alliance.","authority":"Definir padrões técnicos; organizar prioridades internas; interromper automação com erro/risco; solicitar adequação de acessos; propor troca de ferramenta; definir arquitetura operacional na alçada; exigir testes antes de automação crítica em produção.","escalation":"Escala para Head de Operações & PMO em prioridade, excesso de demanda, impacto operacional e dependências; para CEO/CMO/CAO em investimento relevante, risco empresarial, mudança estrutural de ferramenta ou segurança."},{"code":"C14","title":"Gestora de Automações","level":"Gestora","area_key":"technology_automations","subarea":"Automações","occupant_name":"Sarah","profile_id":"32431a2b-20a0-49ea-abcb-2a2194094b19","scope":null,"mission":"Construir, configurar, operar e manter automações que reduzam trabalho manual e garantam execução consistente dos processos da Alliance.","summary":"A Gestora de Automações é dona da execução e confiabilidade dos fluxos automatizados.","authority":"Criar e ajustar fluxos dentro do escopo aprovado; pausar automação com erro; corrigir regras técnicas; rejeitar ativação sem dados/configuração mínima; solicitar informações faltantes; propor automatização de tarefas repetitivas. Não altera sozinha conteúdo estratégico, oferta ou público.","escalation":"Escala para Head de Automações & Infraestrutura em falha estrutural, nova ferramenta, integração complexa, risco técnico ou recorrência; para Operações & PMO em atraso de briefing, informação faltante, prioridade ou dependência."},{"code":"C15","title":"Gestora de Infraestrutura & Integrações","level":"Gestora","area_key":"technology_automations","subarea":"Infraestrutura & Integrações","occupant_name":"Sarah","profile_id":"32431a2b-20a0-49ea-abcb-2a2194094b19","scope":null,"mission":"Garantir que ferramentas, contas, acessos e integrações utilizadas pela Alliance estejam corretamente estruturados, conectados e disponíveis para a operação.","summary":"A Gestora de Infraestrutura & Integrações é dona da base técnica que permite às outras áreas trabalharem.","authority":"Criar e organizar acessos conforme política; configurar integrações aprovadas; remover/corrigir acessos inadequados conforme procedimento; pausar integração com risco; propor substituição de ferramentas; exigir padrão mínimo de segurança e organização.","escalation":"Escala para Head de Automações & Infraestrutura em incidente crítico, risco de segurança, integração complexa, custo relevante ou mudança de arquitetura; para CAO/Governança em acesso sensível, permissão institucional, desligamento ou credenciais."},{"code":"C16","title":"Analista de CX & Atendimento — Botanika","level":"Analista","area_key":"support_cx","subarea":null,"occupant_name":"Lissia","profile_id":null,"scope":"Botanika","mission":"Garantir que cada cliente da Botanika tenha atendimento rápido, claro e resolutivo durante toda a jornada, contribuindo para satisfação, retenção e conversão de oportunidades comerciais.","summary":"A Analista de CX & Atendimento é dona da experiência do cliente no contato direto com a marca e da resolução de primeiro nível.","authority":"Orientar clientes dentro das políticas; conduzir atendimento e venda assistida; resolver problemas dentro das regras; solicitar informações; escalar incidentes; sugerir melhoria de script/processo/experiência. Não cria descontos excepcionais, altera regras comerciais ou promete compensações fora da política.","escalation":"Escala para Operações & PMO em recorrência, urgência, conflito ou falta de responsável; para Marketing & CRO em site/oferta/checkout/cupom; para Tecnologia & Automações em ferramenta, WhatsApp, integração ou automação."},{"code":"C17","title":"Analista de CX & Atendimento — VermeFree","level":"Analista","area_key":"support_cx","subarea":null,"occupant_name":"Poly","profile_id":"1795825b-d339-4c4e-aad2-1a5ef7167035","scope":"VermeFree","mission":"Garantir que cada cliente da VermeFree tenha atendimento rápido, claro e resolutivo durante toda a jornada, contribuindo para satisfação, retenção e conversão de oportunidades comerciais.","summary":"A cadeira é a mesma função de CX; o que muda é o escopo de atendimento da marca.","authority":"Resolver demandas dentro das políticas; conduzir venda assistida; orientar clientes; escalar problemas; solicitar apoio; propor melhorias. Não cria exceções comerciais ou compensações fora das regras definidas.","escalation":"Segue a lógica da C16: Operações & PMO para bloqueios/recorrência/urgência; Marketing & CRO para site/oferta/cupom/checkout; Tecnologia & Automações para ferramentas, WhatsApp, integrações e automações."},{"code":"C18","title":"Gestora de TikTok Shop","level":"Gestora","area_key":"marketplaces_channels","subarea":"TikTok Shop","occupant_name":"Mafe","profile_id":null,"scope":"TikTok Shop","mission":"Garantir que a operação de TikTok Shop funcione de forma organizada, rentável e em crescimento, conectando catálogo, ofertas, conteúdo, afiliados, operação comercial e acompanhamento de resultados.","summary":"A Gestora de TikTok Shop é dona da operação e do crescimento do canal TikTok Shop.","authority":"Organizar operação diária; ajustar configurações operacionais nas regras aprovadas; cadastrar/atualizar produtos; propor campanhas e promoções; priorizar oportunidades; interagir com afiliados; solicitar materiais; corrigir erros operacionais. Não altera sozinha estratégia macro, preços/margens, grandes descontos, investimento extraordinário, posicionamento ou oferta estratégica.","escalation":"Escala para Operações & PMO em bloqueio, conflito, atraso, estoque, dependências e risco operacional; para Marketing/CMO em promoção, desconto, estratégia comercial, campanha ou crescimento; para Tecnologia em integração, API, sistema, ferramenta ou automação."}]$seats$::jsonb) as x(
   code text,title text,level text,area_key text,subarea text,occupant_name text,
   profile_id uuid,scope text,mission text,summary text,authority text,escalation text
 )
)
insert into alliance_data.org_seats(
 code,title,level,area_key,subarea,occupant_name,profile_id,scope,mission,summary,authority,escalation,
 source_document,is_active,archived_at,updated_at
)
select code,title,level,area_key,subarea,occupant_name,profile_id,scope,mission,summary,authority,escalation,
 'Organograma Alliance — PDF/CSV 25-09-2026',true,null,now()
from src
on conflict(code) do update set
 title=excluded.title,level=excluded.level,area_key=excluded.area_key,subarea=excluded.subarea,
 occupant_name=excluded.occupant_name,profile_id=excluded.profile_id,scope=excluded.scope,
 mission=excluded.mission,summary=excluded.summary,authority=excluded.authority,escalation=excluded.escalation,
 source_document=excluded.source_document,is_active=true,archived_at=null,updated_at=now();

with src as (
 select * from jsonb_to_recordset($kpis$[{"owner_seat_code":"C02","name":"Atingimento da meta"},{"owner_seat_code":"C02","name":"Crescimento da receita"},{"owner_seat_code":"C02","name":"Forecast"},{"owner_seat_code":"C02","name":"Gap projetado"},{"owner_seat_code":"C02","name":"Sucesso das campanhas estratégicas"},{"owner_seat_code":"C02","name":"Resultado das iniciativas de Growth"},{"owner_seat_code":"C04","name":"Entregas no prazo"},{"owner_seat_code":"C04","name":"Saúde do portfólio"},{"owner_seat_code":"C04","name":"Aging de bloqueios"},{"owner_seat_code":"C04","name":"Retrabalho"},{"owner_seat_code":"C04","name":"Projetos/campanhas no prazo"},{"owner_seat_code":"C05","name":"Projetos no prazo"},{"owner_seat_code":"C05","name":"Tarefas atrasadas"},{"owner_seat_code":"C05","name":"Marcos cumpridos"},{"owner_seat_code":"C05","name":"Bloqueios escalados corretamente"},{"owner_seat_code":"C05","name":"Projetos atualizados corretamente"},{"owner_seat_code":"C06","name":"MER"},{"owner_seat_code":"C06","name":"Receita atribuída"},{"owner_seat_code":"C06","name":"CAC geral"},{"owner_seat_code":"C06","name":"Conversão"},{"owner_seat_code":"C06","name":"Velocidade de testes"},{"owner_seat_code":"C06","name":"Win rate de testes"},{"owner_seat_code":"C07","name":"ROAS"},{"owner_seat_code":"C07","name":"CAC / CPA"},{"owner_seat_code":"C07","name":"Budget executado vs planejado"},{"owner_seat_code":"C07","name":"Testes de mídia realizados"},{"owner_seat_code":"C07","name":"CTR (diagnóstico)"},{"owner_seat_code":"C07","name":"CPC (diagnóstico)"},{"owner_seat_code":"C07","name":"CPM (diagnóstico)"},{"owner_seat_code":"C08","name":"Taxa de conversão"},{"owner_seat_code":"C08","name":"Receita por sessão"},{"owner_seat_code":"C08","name":"Taxa de conclusão de checkout"},{"owner_seat_code":"C08","name":"Testes de CRO"},{"owner_seat_code":"C08","name":"Incidentes críticos no funil"},{"owner_seat_code":"C09","name":"Conceitos/ângulos testados"},{"owner_seat_code":"C09","name":"Taxa de conceitos vencedores"},{"owner_seat_code":"C09","name":"Performance dos criativos gerados a partir dos briefs"},{"owner_seat_code":"C09","name":"Briefs entregues no prazo"},{"owner_seat_code":"C10","name":"Conteúdo no prazo"},{"owner_seat_code":"C10","name":"Taxa de conteúdos vencedores"},{"owner_seat_code":"C10","name":"Alcance orgânico"},{"owner_seat_code":"C10","name":"Engajamento por alcance"},{"owner_seat_code":"C11","name":"Creators ativos"},{"owner_seat_code":"C11","name":"Taxa de ativação"},{"owner_seat_code":"C11","name":"Taxa de entrega"},{"owner_seat_code":"C11","name":"Receita de creators"},{"owner_seat_code":"C12","name":"Creators qualificados"},{"owner_seat_code":"C12","name":"Taxa de resposta"},{"owner_seat_code":"C12","name":"Taxa de qualificação"},{"owner_seat_code":"C12","name":"Handoffs realizados para a Gestora de Influenciadores"},{"owner_seat_code":"C13","name":"Taxa de sucesso"},{"owner_seat_code":"C13","name":"Incidentes críticos"},{"owner_seat_code":"C13","name":"Tempo de resolução"},{"owner_seat_code":"C13","name":"Entregas no prazo"},{"owner_seat_code":"C13","name":"Documentação"},{"owner_seat_code":"C13","name":"Horas economizadas"},{"owner_seat_code":"C14","name":"Taxa de sucesso dos fluxos"},{"owner_seat_code":"C14","name":"Execuções com erro"},{"owner_seat_code":"C14","name":"Tempo de correção"},{"owner_seat_code":"C14","name":"Automações entregues no prazo"},{"owner_seat_code":"C15","name":"Disponibilidade das integrações"},{"owner_seat_code":"C15","name":"Incidentes de integração"},{"owner_seat_code":"C15","name":"Tempo de resolução"},{"owner_seat_code":"C15","name":"Acessos críticos irregulares"},{"owner_seat_code":"C15","name":"Documentação"},{"owner_seat_code":"C16","name":"Primeira resposta"},{"owner_seat_code":"C16","name":"Resolução"},{"owner_seat_code":"C16","name":"Taxa de resolução"},{"owner_seat_code":"C16","name":"Backlog fora do SLA"},{"owner_seat_code":"C16","name":"CSAT"},{"owner_seat_code":"C16","name":"Conversão assistida"},{"owner_seat_code":"C16","name":"Receita via atendimento"},{"owner_seat_code":"C17","name":"Primeira resposta"},{"owner_seat_code":"C17","name":"Resolução"},{"owner_seat_code":"C17","name":"Taxa de resolução"},{"owner_seat_code":"C17","name":"Backlog fora do SLA"},{"owner_seat_code":"C17","name":"CSAT"},{"owner_seat_code":"C17","name":"Conversão assistida"},{"owner_seat_code":"C17","name":"Receita via atendimento"},{"owner_seat_code":"C18","name":"GMV"},{"owner_seat_code":"C18","name":"Receita líquida"},{"owner_seat_code":"C18","name":"Pedidos"},{"owner_seat_code":"C18","name":"Conversão"},{"owner_seat_code":"C18","name":"Afiliados ativos"},{"owner_seat_code":"C18","name":"Receita via afiliados"},{"owner_seat_code":"C18","name":"Produtos com erro/bloqueio"},{"owner_seat_code":"C18","name":"Incidentes críticos"}]$kpis$::jsonb) as x(owner_seat_code text,name text)
)
insert into alliance_data.org_kpis(owner_seat_code,name,source_document,is_active,archived_at,updated_at)
select owner_seat_code,name,'Organograma Alliance — PDF/CSV 25-09-2026',true,null,now() from src
on conflict(owner_seat_code,name) do update set is_active=true,archived_at=null,updated_at=now();

with src as (
 select * from jsonb_to_recordset($rituals$[{"code":"R01","name":"Daily Operacional por Marca","owner_seat_code":"C04","owner_name":"Vitor","frequency":"Segunda a sexta-feira","timing":"A partir de 09:15","duration":"Até 15 min por marca","objective":"Identificar rapidamente o que pode impedir a marca de entregar o necessário naquele dia e sair com prioridades, responsáveis, prazos e bloqueios claros. A Daily não é prestação de contas.","prerequisites":"Tarefas críticas, atrasadas, bloqueios, entregas do dia, riscos, dependências e status de projetos/campanhas atualizados no sistema antes da reunião.","agenda":"2 min visão do dia; 8 min riscos e bloqueios; 3 min dependências e decisões; 2 min fechamento.","outputs":"Prioridades do dia, bloqueios, responsáveis, próxima ação, prazo, decisões e escalonamentos. Nova ação deve virar tarefa/registro.","rules":"Problema que exija mais de 2 minutos sai da Daily e vira follow-up. Não revisar todas as tarefas, fazer análise longa de KPIs, brainstorming ou retrospectiva.","participants":"Apenas pessoas com frentes ativas naquela marca. C-Level somente quando houver assunto que exija decisão.","registration":"Gerar/atualizar tarefas, bloqueios, responsáveis, prazos, decisões e incidentes.","status_model":null},{"code":"R02","name":"Reunião Semanal de Performance & Planejamento por Marca","owner_seat_code":"C04","owner_name":"Vitor","frequency":"Semanal, às quintas-feiras","timing":null,"duration":"60 min por marca","objective":"Avaliar performance da marca, revisar KPIs, identificar desvios, gerar ideias/oportunidades, tomar decisões e transformar isso em plano de ação.","prerequisites":"KPIs, forecast, gap, campanhas e projetos atualizados; principais desvios identificados. Cada responsável chega sabendo Resultado → Referência/Meta → Tendência → Problema → Hipótese → Possível ação.","agenda":"00–08 visão executiva; 08–35 KPIs das áreas; 35–48 ideias e oportunidades; 48–56 planejamento e priorização; 56–60 fechamento.","outputs":"Decisões, ações, responsáveis, prazos, GAPs, hipóteses, ideias classificadas e escalonamentos.","rules":"KPI saudável = validação rápida; desvio = diagnóstico; ideia não fica solta; ação sempre tem dono e prazo; problema complexo vira GAP/War Room; não fazer caça aos culpados.","participants":"Responsáveis pelas áreas ativas na marca; normalmente CMO, Operações & PMO, Marketing & CRO, Conteúdo, Influenciadores, Tecnologia, CX e Marketplaces quando aplicável.","registration":"KPIs, diagnósticos, decisões, GAPs, ideias, hipóteses, projetos, tarefas, responsáveis, prazos e resultados.","status_model":"Ideia = APROVADA / VALIDAR / BACKLOG / DESCARTADA"},{"code":"R03","name":"Planejamento Mensal Estratégico por Marca","owner_seat_code":"C02","owner_name":"Gabriel + Vitor","frequency":"Mensal, antes do início do próximo mês","timing":"Preferencialmente na última semana do mês corrente","duration":"90 min por marca","objective":"Definir direcionamento da marca para o próximo mês: metas, objetivos, prioridades, alavancas, campanhas, iniciativas, ofertas, lançamentos, calendário e riscos.","prerequisites":"Meta atual, realizado, forecast, gap, KPIs, aprendizados do mês, campanhas anteriores, sazonalidades, datas comerciais, lançamentos, restrições e backlog de ideias.","agenda":"00–15 fechamento estratégico; 15–35 objetivos/metas; 35–65 campanhas/ações/iniciativas; 65–80 priorização/calendário; 80–90 fechamento.","outputs":"Plano Mensal com meta, objetivos, prioridades, calendário, campanhas, iniciativas, TAPs a criar, responsáveis, datas e riscos.","rules":"Planejamento define O QUÊ e POR QUÊ; detalhamento operacional acontece depois. Não aprovar mais iniciativas do que a capacidade suporta.","participants":"Núcleo: Gabriel (CMO), Vitor (Operações & PMO), Pedro (Marketing & CRO); demais responsáveis conforme relevância.","registration":"Mês, marca, meta, objetivos, prioridades, calendário, campanhas, iniciativas, TAPs, riscos e decisões.","status_model":"Iniciativa = APROVADA / VALIDAR / BACKLOG / DESCARTADA"},{"code":"R04","name":"Kickoff de Projeto / Campanha","owner_seat_code":"C05","owner_name":"Vitor","frequency":"Sob demanda","timing":null,"duration":"30–45 min; padrão 45 min","objective":"Transformar iniciativa aprovada em plano de execução claro, com objetivo, escopo, entregas, responsáveis, prazos, dependências, riscos, go-live e QA.","prerequisites":"Objetivo, resultado esperado/meta, data, oferta/conceito quando aplicável e TAP ou briefing estratégico aprovado.","agenda":"00–05 contexto/objetivo; 05–12 escopo; 12–25 entregáveis/responsáveis; 25–33 timeline/marcos/dependências; 33–38 riscos; 38–42 QA/go-live; 42–45 fechamento.","outputs":"Objetivo, meta, escopo, fora de escopo, go-live, entregáveis, responsáveis, prazos, marcos, dependências, riscos, critérios de QA e próxima ação.","rules":"Nenhuma entrega sai sem responsável e prazo; uma entrega = um dono principal; kickoff não é brainstorming estratégico; mudança relevante depois do kickoff = mudança de escopo.","participants":"Somente pessoas com entrega, dependência ou decisão naquele projeto.","registration":"Projeto com nome, marca, TAP, objetivo, meta, prioridade, datas, responsável, áreas, marcos, tarefas, dependências, riscos e QA.","status_model":null},{"code":"R05","name":"Preflight / Go-Live","owner_seat_code":"C05","owner_name":"Vitor","frequency":"Sob demanda, antes de todo go-live relevante","timing":"T-24h + Go/No-Go T-60/T-30 min","duration":"Go/No-Go de até 15 min","objective":"Garantir que todos os componentes críticos estejam corretos, testados e sincronizados antes de entrarem no ar. Pergunta central: está realmente pronto para o go-live?","prerequisites":"Execução substancialmente concluída: oferta, copy, criativos, página, configurações, automações, tracking e CX informado.","agenda":"Validar Oferta & Comercial, E-commerce & CRO, Performance & Tracking, Copy & Criativos, Conteúdo, Influenciadores, Tecnologia & Automações, CX e Marketplaces.","outputs":"Checklist por área, pendências, bloqueadores, decisão final e horário de aprovação.","rules":"Bloqueador crítico = NO-GO. Não produzir durante o Preflight; mudança depois exige revalidação; erro relevante que escapar deve melhorar checklist futuro.","participants":"Somente responsáveis pelas frentes críticas daquele go-live; cada cadeira valida tecnicamente sua própria frente.","registration":"Projeto, marca, go-live, checklist, status por área, pendências, bloqueadores, decisão final e horário de aprovação.","status_model":"Item = APROVADO / PENDÊNCIA NÃO BLOQUEANTE / BLOQUEADOR; decisão = GO / GO COM RESSALVA / NO-GO"},{"code":"R06","name":"GAP / War Room","owner_seat_code":"C04","owner_name":"Vitor + dono do resultado afetado","frequency":"Sob demanda","timing":null,"duration":"30–60 min + checkpoints curtos","objective":"Corrigir rapidamente um desvio relevante de resultado, campanha, faturamento, operação, tecnologia ou projeto.","prerequisites":"Problema quantificado, meta, realizado, forecast, gap, dados, KPIs afetados, período e contexto.","agenda":"00–10 definir GAP; 10–20 diagnóstico; 20–30 hipóteses; 30–45 plano de recuperação; 45–55 priorização P0/P1/P2/P3; 55–60 fechamento.","outputs":"Problema, tamanho do gap, KPIs, diagnóstico, hipóteses, ações, prioridade, responsáveis, prazos, impacto esperado, próximo checkpoint e critério de encerramento.","rules":"GAP só fecha quando o resultado se recupera; não abrir para qualquer oscilação; hipótese não é fato; toda ação tem dono e prazo; GAP não é brainstorming.","participants":"Somente quem pode explicar, decidir ou executar sobre o problema.","registration":"Registrar GAP, diagnóstico, hipóteses, plano de recuperação, responsáveis, prazos, checkpoints e resultado.","status_model":"ABERTO / EM RECUPERAÇÃO / RECUPERADO / ENCERRADO"},{"code":"R07","name":"Encerramento & Post-mortem","owner_seat_code":"C05","owner_name":"Vitor","frequency":"Sob demanda, após projetos/campanhas relevantes","timing":"Idealmente até 3 dias úteis após os dados necessários estarem disponíveis","duration":"30–45 min","objective":"Avaliar resultado final, identificar acertos, erros e causas, registrar aprendizados e transformar aprendizado em melhoria.","prerequisites":"Objetivo original, meta, resultado, KPIs, atrasos, bloqueios, incidentes, mudanças de escopo, decisões e GAPs.","agenda":"00–05 plano original; 05–15 resultado; 15–25 o que funcionou; 25–35 o que não funcionou e causa-raiz; 35–40 decisões de aprendizado; 40–45 fechamento.","outputs":"Resultado final, atingimento, aprendizados positivos/negativos, causas-raiz, decisões, melhorias, ações e atualização de processo/checklist quando necessário.","rules":"Aprendizado precisa virar decisão, padrão ou ação; não caça aos culpados; separar evidência de opinião; registrar também o que funcionou; projeto só fecha com resultado e aprendizado.","participants":"Somente pessoas relevantes para explicar o resultado, gerar aprendizado e decidir mudanças futuras.","registration":"Projeto, objetivo, resultado, atingimento, o que funcionou/não funcionou, causas, repetir/ajustar/parar/testar/padronizar, ações de melhoria e aprendizados.","status_model":"REPETIR / AJUSTAR / PARAR / TESTAR NOVAMENTE / PADRONIZAR"}]$rituals$::jsonb) as x(
  code text,name text,owner_seat_code text,owner_name text,frequency text,timing text,duration text,
  objective text,prerequisites text,agenda text,outputs text,rules text,participants text,registration text,status_model text
 )
)
insert into alliance_data.management_rituals(
 code,name,owner_seat_code,owner_name,frequency,timing,duration,objective,prerequisites,agenda,outputs,rules,
 participants,registration,status_model,source_document,is_active,archived_at,updated_at
)
select code,name,owner_seat_code,owner_name,frequency,timing,duration,objective,prerequisites,agenda,outputs,rules,
 participants,registration,status_model,'Organograma Alliance — PDF/CSV 25-09-2026',true,null,now()
from src
on conflict(code) do update set
 name=excluded.name,owner_seat_code=excluded.owner_seat_code,owner_name=excluded.owner_name,
 frequency=excluded.frequency,timing=excluded.timing,duration=excluded.duration,objective=excluded.objective,
 prerequisites=excluded.prerequisites,agenda=excluded.agenda,outputs=excluded.outputs,rules=excluded.rules,
 participants=excluded.participants,registration=excluded.registration,status_model=excluded.status_model,
 source_document=excluded.source_document,is_active=true,archived_at=null,updated_at=now();

create or replace function public.agent_organization_context(
  p_query text default '',
  p_limit integer default 8
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_tokens text[];
  v_seats jsonb := '[]'::jsonb;
  v_areas jsonb := '[]'::jsonb;
  v_kpis jsonb := '[]'::jsonb;
  v_rituals jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Sessão inválida'; end if;

  select coalesce(array_agg(tok),'{}'::text[]) into v_tokens
  from (
    select distinct tok
    from unnest(regexp_split_to_array(lower(coalesce(p_query,'')), '[^[:alnum:]À-ÿ]+')) tok
    where length(tok)>=3
  ) q;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc,x.code),'[]'::jsonb) into v_seats
  from (
    select s.code,s.title,s.level,a.name as area,s.subarea,s.occupant_name,s.profile_id,s.scope,
           s.mission,s.summary,s.authority,s.escalation,
           (select count(*) from unnest(v_tokens) t where
              lower(concat_ws(' ',s.code,s.title,s.level,a.name,s.subarea,s.occupant_name,s.scope,
                s.mission,s.summary,s.authority,s.escalation)) like '%'||t||'%')::int as score
    from alliance_data.org_seats s
    left join alliance_data.org_areas a on a.key=s.area_key
    where s.is_active and s.archived_at is null
    order by score desc,s.code
    limit greatest(6,least(coalesce(p_limit,8),18))
  ) x;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.display_order),'[]'::jsonb) into v_areas
  from alliance_data.org_areas a where a.is_active and a.archived_at is null;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc,x.owner_seat_code,x.name),'[]'::jsonb) into v_kpis
  from (
    select k.owner_seat_code,s.title as owner_title,s.occupant_name as owner_name,k.name,k.frequency,k.formula,k.target_note,
           (select count(*) from unnest(v_tokens) t where lower(concat_ws(' ',k.name,s.title,s.occupant_name)) like '%'||t||'%')::int as score
    from alliance_data.org_kpis k
    join alliance_data.org_seats s on s.code=k.owner_seat_code
    where k.is_active and k.archived_at is null
    order by score desc,k.owner_seat_code,k.name
    limit 30
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc,x.code),'[]'::jsonb) into v_rituals
  from (
    select r.code,r.name,r.owner_seat_code,r.owner_name,r.frequency,r.timing,r.duration,r.objective,
           r.prerequisites,r.agenda,r.outputs,r.rules,r.participants,r.registration,r.status_model,
           (select count(*) from unnest(v_tokens) t where
             lower(concat_ws(' ',r.code,r.name,r.owner_name,r.frequency,r.objective,r.prerequisites,
               r.agenda,r.outputs,r.rules,r.participants,r.registration,r.status_model)) like '%'||t||'%')::int as score
    from alliance_data.management_rituals r
    where r.is_active and r.archived_at is null
    order by score desc,r.code
    limit 7
  ) x;

  return jsonb_build_object(
    'areas',v_areas,
    'seats',v_seats,
    'kpis',v_kpis,
    'rituals',v_rituals,
    'management_cycle','Planejar → Estruturar → Executar → Validar → Medir → Corrigir → Aprender',
    'generated_at',now()
  );
end
$function$;

revoke all on function public.agent_organization_context(text,integer) from public;
grant execute on function public.agent_organization_context(text,integer) to authenticated;

insert into alliance_data.agent_knowledge
(key,title,category,content,keywords,examples,priority,always_include)
values
('org_governance_model','Organograma, cadeiras e autoridade','organization',
'Use o contexto estruturado organization_context para responder sobre organograma, área, cadeira, ocupante, missão, autoridade, escalonamento e responsabilidade. Cadeira é diferente de pessoa: uma pessoa pode acumular várias cadeiras. Não conclua que cargo único do perfil representa todas as suas cadeiras. Ao perguntar quem decide algo, use authority e escalation da cadeira mais aderente ao tema; quando a decisão extrapolar a alçada, indique o escalonamento descrito no organograma.',
array['organograma','cadeira','cadeiras','area','área','autoridade','decide','decisão','escalonar','escalonamento','responsavel','responsável','cargo','papel'],
'[]'::jsonb,56,true),
('ritual_management_model','Rituais de gestão e ciclo operacional','organization',
'O ciclo de gestão da Alliance é Planejar → Estruturar → Executar → Validar → Medir → Corrigir → Aprender. Os rituais R01 a R07 têm objetivo, dono, frequência, pré-requisitos, agenda, saídas e regras próprias no organization_context. A Daily não existe para descobrir status; o status deve estar atualizado no sistema antes. Ação nova precisa virar registro/tarefa. Kickoff exige estratégia minimamente definida. Preflight valida prontidão e pode resultar em NO-GO. GAP/War Room trata desvios relevantes e só encerra quando a recuperação for comprovada. Post-mortem transforma aprendizado em decisão, padrão ou ação.',
array['daily','ritual','rituais','kickoff','preflight','go-live','war room','gap','post-mortem','post mortem','planejamento mensal','reuniao','reunião'],
'[]'::jsonb,57,true),
('performance_ownership_model','KPIs por cadeira e gestão de performance','organization',
'Os KPIs do organograma possuem dono por cadeira. Use organization_context.kpis para indicar quem acompanha qual indicador. Não atribua KPI a uma pessoa apenas pelo nome: primeiro identifique a cadeira. Em visão semanal, cada dono explica Resultado → Referência/Meta → Tendência → Problema → Hipótese → Possível ação. KPI saudável recebe validação rápida; desvio pede diagnóstico e ação com responsável e prazo.',
array['kpi','kpis','indicador','indicadores','performance','meta','dono','owner','métrica','métricas'],
'[]'::jsonb,59,false)
on conflict(key) do update set
 title=excluded.title,category=excluded.category,content=excluded.content,keywords=excluded.keywords,
 examples=excluded.examples,priority=excluded.priority,always_include=excluded.always_include,
 is_archived=false,archived_at=null,archived_by=null,updated_at=now();

(()=>{
  'use strict';
  const VERSION=1;
  const AREA_LABELS={
    home:'Início',tasks:'Tarefas',campaigns:'Campanhas',deliveries:'Entregas',
    clients:'Clientes',automations:'Automações',notifications:'Notificações',
    reports:'Relatórios',settings:'Configurações'
  };
  const TOURS={
    home:[
      ['nav:home','Início é seu ponto de partida','Abra esta área no começo do dia para enxergar o que pede atenção antes de mergulhar na execução.'],
      ['workspace','Troque o contexto pela marca','O seletor muda o sistema inteiro para a marca escolhida. Use isso antes de revisar tarefas, campanhas e entregas.'],
      ['globalSearch','Ache qualquer coisa sem navegar','Busque tarefas, campanhas e entregas daqui. É o atalho mais rápido quando você já sabe o que procura.'],
      ['view','Sua rotina começa pelo resumo','Use o painel para decidir o que precisa acontecer agora. Depois vá para Tarefas para executar.']
    ],
    tasks:[
      ['nav:tasks','Tarefas é onde o trabalho acontece','Tudo que tem dono, prazo e execução deve terminar aqui — não perdido em conversas.'],
      ['text:Minhas tarefas','Comece por “Minhas tarefas”','No dia a dia, veja primeiro o que está atribuído a você. Isso reduz ruído e deixa a prioridade clara.'],
      ['text:Lista','Escolha a visão que ajuda você','Lista é ótima para executar; Quadro ajuda a acompanhar fluxo; Por campanha organiza o trabalho pelo contexto estratégico.'],
      ['text:Nova tarefa','Crie trabalho com contexto','Ao criar uma tarefa, defina responsável, prazo, prioridade e campanha. Checklist deve ser obrigatório quando for critério real de conclusão.'],
      ['taskFilters','Use filtros antes de procurar manualmente','Filtre por pessoa, status, prioridade e campanha para reduzir a tela ao que importa agora.']
    ],
    campaigns:[
      ['nav:campaigns','Campanhas conectam estratégia e execução','Use Campanhas para centralizar objetivo, metas, oferta, cronograma e tudo que precisa virar tarefa.'],
      ['view','Comece pelo mapa e pelo contexto','Estruture a campanha antes de espalhar tarefas. O mapa ajuda a organizar frentes e decisões sem perder a visão do todo.'],
      ['workspace','Planeje dentro da marca certa','Campanhas pertencem a uma marca. Confira o seletor antes de criar ou revisar o planejamento.'],
      ['globalSearch','Volte rápido para uma campanha','Depois que a operação crescer, use a busca global para localizar uma campanha específica em segundos.']
    ],
    deliveries:[
      ['nav:deliveries','Entregas mostram o que realmente foi produzido','Aqui você acompanha arquivos, links, revisões e aprovações — sempre ligados à execução.'],
      ['view','Use a entrega como evidência de conclusão','Não feche trabalho importante só porque “foi feito”. Registre o material final e o status da aprovação.'],
      ['workspace','Revise por marca','Troque a marca para conferir rapidamente o que está pendente de envio, revisão ou aprovação naquela operação.']
    ],
    clients:[
      ['nav:clients','Clientes guarda o contexto de cada operação','Use esta área para consultar quem é o cliente, contato, status e relação com as campanhas.'],
      ['fullView','Consulte antes de tomar decisões','Quando faltar contexto sobre uma marca ou cliente, venha aqui antes de buscar informação em mensagens antigas.'],
      ['workspace','A marca continua sendo seu filtro principal','O seletor lateral mantém o restante do AllianceOS no contexto certo enquanto você consulta os dados do cliente.']
    ],
    automations:[
      ['nav:automations','Automações cuida do que não deve depender de trabalho manual','Use esta área para saber quais processos estão ativos, por qual canal e quando rodaram pela última vez.'],
      ['fullView','Confira status e última execução','No dia a dia, procure automações pausadas, com execução antiga ou que precisam de revisão antes de campanhas importantes.'],
      ['workspace','Automação também tem contexto de marca','Antes de investigar um fluxo, confirme qual marca está ativa para evitar mexer no processo errado.']
    ],
    notifications:[
      ['nav:notifications','Notificações é sua caixa de atenção','Use esta área para ver mudanças que exigem ação: prazo, revisão, dependência, aprovação ou movimentação importante.'],
      ['topBell','O sino mostra o que chegou agora','Durante o dia, o sino é o atalho. Entre aqui quando houver itens novos em vez de ficar conferindo todas as áreas.'],
      ['view','Resolva e siga em frente','Trate a notificação como entrada de trabalho: abra o item relacionado, tome a ação e volte para a sua fila.']
    ],
    reports:[
      ['nav:reports','Relatórios transforma execução em leitura de resultado','Use esta área para comparar o que foi planejado com o que realmente aconteceu.'],
      ['reportCard','Planejado × realizado','Acompanhe meta, faturamento, investimento e ROAS. Divergências aqui devem virar investigação, não ajuste manual sem contexto.'],
      ['workspace','Leia o resultado da marca certa','Troque a marca antes de analisar números. Isso evita misturar operações e tirar conclusões erradas.']
    ],
    settings:[
      ['nav:settings','Configurações adapta o AllianceOS à operação','Use esta área para perfil, preferências, módulos e comportamento padrão do sistema.'],
      ['view','Mude regra aqui, não no improviso','Quando algo precisar valer para a rotina inteira, prefira configurar o sistema em vez de criar combinações paralelas.'],
      ['workspace','Configurações podem depender da marca','Algumas escolhas são específicas por marca. Confira o contexto antes de alterar módulos ou visualizações padrão.']
    ]
  };

  const ACTION_LABELS={
    'task-create':'Criar tarefa',
    'task-detail':'Usar uma tarefa',
    'mind-map':'Mapa mental',
    'campaign-assistant':'Criar campanha pelo mapa',
    'campaign-create':'Criar campanha',
    'campaign-detail':'Dentro da campanha',
    'campaign-tap':'TAP da campanha',
    'campaign-offer':'Oferta da campanha',
    'campaign-schedule':'Cronograma da campanha',
    'campaign-tasks':'Tarefas da campanha'
  };

  const ACTION_TOURS={
    'task-create':[
      ['field:#newTitle','Escreva o resultado, não só a atividade','Prefira um título que deixe claro o que precisa ficar pronto. “Criar copy do disparo de sexta” é melhor do que “Copy”.'],
      ['field:#newAssignee','Toda tarefa precisa ter dono','Escolha quem executa. Apoio e colaboradores podem entrar depois, mas deve existir uma pessoa claramente responsável pela entrega.'],
      ['field:#newDue','Prazo inclui horário','Use data e hora quando o trabalho precisa estar pronto antes de uma publicação, reunião, disparo ou dependência.'],
      ['field:#newCampaign','Vincule ao contexto certo','Se a tarefa nasceu de uma campanha, vincule aqui. Assim ela aparece no progresso, no fluxo e na leitura daquela campanha.'],
      ['field:#newDependency','Use dependência quando existe ordem real','Vincule outra tarefa apenas quando esta realmente não puder começar antes da anterior. O AllianceOS usa isso para bloquear e liberar o fluxo automaticamente.'],
      ['field:#newDescription','Briefing é o que evita retrabalho','Escreva contexto, links, resultado esperado e critério de aceite. A pessoa deve conseguir executar sem precisar perguntar o básico no WhatsApp.'],
      ['field:#newConferenceRequired','Checklist pode virar trava de qualidade','Ative a lista de conferência quando os itens forem obrigatórios para considerar a execução correta — site no ar, preço conferido, cupom validado, disparo revisado.'],
      ['field:#newDeliveryRequired','Entrega obrigatória protege o resultado','Ative quando a tarefa precisa terminar com um material registrado: arte, copy, link, arquivo, relatório ou outra evidência.'],
      ['css:#newTaskForm .new-actions','Crie só quando o contexto estiver claro','Antes de confirmar, confira dono, prazo, campanha e resultado esperado. Isso faz a tarefa nascer pronta para execução.']
    ],
    'task-detail':[
      ['css:#taskDetailDrawer .r10-task-head, #taskDetailDrawer .tdetail-main','Esta é a ficha viva da tarefa','Título, objetivo, materiais, entrega e histórico ficam concentrados aqui. A tarefa deve carregar o contexto necessário para alguém executar sem depender de conversa paralela.'],
      ['css:#taskDetailDrawer .r10-objective-card, #taskDetailDrawer .description-area','Comece pelo objetivo','Leia o resultado esperado antes de executar. Se estiver incompleto, ajuste aqui em vez de criar contexto paralelo em mensagens.'],
      ['css:#taskDetailDrawer .r10-materials-card, #taskDetailDrawer .v3-attachment-drop','Materiais são insumos para trabalhar','Arquivos, referências e documentos que ajudam na execução ficam aqui. Eles não substituem a entrega final da tarefa.'],
      ['css:#taskDetailDrawer .r10-delivery-card, #taskDetailDrawer .v5-delivery-section','Sua entrega é o resultado final','Registre aqui o que foi produzido: arquivo, link, texto ou outro resultado. Quando a entrega for obrigatória, a tarefa não conclui sem isso.'],
      ['css:#taskDetailDrawer .r10-status-card, #taskDetailDrawer .tdetail-side','Status e informações mantêm a tarefa confiável','Responsável, status, prioridade e prazo devem refletir a realidade. É isso que alimenta as visões, alertas e acompanhamento do time.'],
      ['css:#taskDetailDrawer .r10-context-card, #taskDetailDrawer .tdetail-side','Confira o contexto da tarefa','Lista, cliente e campanha mostram onde essa execução pertence. Evite mover uma tarefa de contexto sem entender o impacto no planejamento.'],
      ['css:#taskDetailDrawer .r10-dependencies-card, #taskDetailDrawer #detailAddDependency','Dependências explicam a ordem do trabalho','Veja o que precisa acontecer antes e o que esta tarefa libera depois. Use dependência somente quando existir uma ordem real de execução.'],
      ['css:#taskDetailDrawer .r10-completion-card, #taskDetailDrawer #v3CompleteTaskBtn','Concluir tem significado','Ao concluir, o AllianceOS valida dependências, conferências e entrega. Se houver próxima etapa, ela é liberada automaticamente pelo fluxo.'],
      ['css:#taskDetailDrawer .r10-observations-card, #taskDetailDrawer #newCommentText','Decisões importantes ficam registradas','Use Observações para aprovações, mudanças e decisões que outra pessoa precisa entender depois. Isso evita perder contexto em mensagens externas.']
    ],
    'mind-map':[
      ['css:.ref-strategy-tabs','O mapa é o começo da estratégia','Use esta sequência: Mapa mental → Campanhas → Mês → Semana. Primeiro organize a ideia; depois transforme em execução.'],
      ['css:.mp-cerca','Pense visualmente antes de criar trabalho','O mapa serve para quebrar a estratégia em frentes, campanhas, conteúdos, CRM e ideias sem perder a visão do todo.'],
      ['css:.mp-fer','A barra de ferramentas cria elementos livres','Notas, formas, texto e nós soltos ajudam a rascunhar. Para estruturar uma campanha, prefira os nós da árvore.'],
      ['css:[data-fer="no"]','Nó é uma ideia que pode ganhar estrutura','Crie um nó quando precisar abrir uma nova frente. Tab cria filho, Enter cria irmão e F2 renomeia rapidamente.'],
      ['css:#planAddCampaignBtn','Campanha nasce do planejamento','Use “Nova campanha” quando a ideia já precisa de datas, meta, verba, oferta e TAP. O assistente cria a estrutura conectada.'],
      ['css:[data-alliance-import-map]','Mapas também podem ser importados','Se existir um planejamento em JSON, importe por aqui. Os vínculos de campanha ficam preservados quando os IDs são válidos.'],
      ['css:.mp-dica','Atalhos aceleram muito o trabalho','Tab cria filho · Enter cria irmão · F2 renomeia · Espaço fecha ramo · botão direito abre ações · F ativa tela cheia.']
    ],
    'campaign-assistant':[
      ['css:.as-cx','Este assistente cria a campanha completa','Ele não cria apenas um nome: monta formato, datas, oferta, meta, verba, canais e o esqueleto do TAP.'],
      ['css:.as-ops','Comece pelo formato da ação','Escolha o tipo que mais se aproxima da estratégia. O formato traz uma estrutura inicial que você pode refinar depois.'],
      ['css:.as-passos','Siga o assistente na ordem','Cada etapa resolve uma parte do planejamento. Evite pular contexto só para chegar mais rápido ao botão de criar.'],
      ['css:.as-resumo','Confira os números antes de confirmar','O resumo ajuda a validar soma de meta, verba e ROAS. Se não fechar com a estratégia, ajuste antes de criar.'],
      ['css:.as-bts','Confirmar cria o contexto conectado','Ao concluir, a campanha passa a existir no mapa, na área Campanhas e no planejamento com o TAP correspondente.']
    ],
    'campaign-create':[
      ['field:#campaignName','Dê um nome que identifique a ação','O nome deve ser reconhecível no mapa, nas tarefas e nos relatórios. Evite nomes genéricos que se repetem todo mês.'],
      ['field:#campaignType','Formato define o tipo de operação','Escolha o formato que melhor representa a ação. Isso ajuda a equipe a entender rapidamente como ela funciona.'],
      ['field:#campaignStart','Datas definem a janela da campanha','Início e fim organizam cronograma, leitura mensal e urgência das tarefas.'],
      ['field:#campaignOwner','Toda campanha precisa de uma referência','O responsável não precisa executar tudo, mas é quem acompanha se a operação inteira está caminhando.'],
      ['field:#campaignGoal','Meta e verba precisam conversar','A meta e o investimento formam a leitura de ROAS esperado. Depois, o TAP detalha esses valores por fonte.'],
      ['field:#campaignObjective','Registre a direção estratégica','Objetivo, oferta e canais evitam que a campanha vire apenas uma lista de tarefas sem contexto.'],
      ['css:#campaignForm button[type="submit"]','Crie para depois detalhar o TAP','Depois da campanha existir, use o workspace para completar oferta, cronograma, TAP e tarefas.']
    ],
    'campaign-detail':[
      ['css:#campaignWorkspace .cw-top','Esta é a central da campanha','Aqui você acompanha contexto, período, responsável, status e tudo que pertence a esta ação.'],
      ['css:#campaignWorkspace .cw-tabs','As abas contam a campanha inteira','Resumo mostra o todo; Oferta explica o que vende; Cronograma organiza quando; TAP é a fonte estruturada; Tarefas mostra a execução.'],
      ['css:[data-cw-pane="summary"].active','Use o Resumo para bater o olho','Antes de uma reunião ou revisão, comece aqui para ver estratégia, números, oferta e progresso de tarefas.'],
      ['css:#cwEdit','Edite o básico sem mexer no histórico','Use “Editar campanha” para dados gerais. Para estrutura operacional detalhada, prefira editar o TAP.'],
      ['css:[data-cw-tab="tap"]','O TAP é a fonte de verdade operacional','Quando objetivo, oferta, metas por fonte ou cronograma mudarem, mantenha o TAP atualizado para o restante da campanha refletir isso.'],
      ['css:[data-cw-tab="tasks"]','Execução deve continuar ligada à campanha','As tarefas vinculadas aparecem aqui e alimentam o progresso da campanha.']
    ],
    'campaign-tap':[
      ['css:[data-cw-tab="tap"].active','Você está no TAP','O TAP concentra a estrutura operacional da campanha. É aqui que planejamento deixa de ser ideia e vira regra de execução.'],
      ['css:[data-cw-pane="tap"].active .tap-section','Edite a seção certa, não um resumo paralelo','As informações daqui alimentam outras partes da interface. Alterar o TAP mantém a campanha consistente.'],
      ['css:[data-cw-pane="tap"].active .tap-table','Tabelas do TAP são operacionais','Use linhas para responsáveis, fases, metas e cronograma. Mantenha nomes e números claros para a equipe e para o MCP.'],
      ['css:[data-cw-pane="tap"].active','Revise o TAP antes de gerar tarefas','Antes de distribuir execução, confira se oferta, metas, responsáveis e prazos representam o plano real.']
    ],
    'campaign-offer':[
      ['css:[data-cw-tab="offer"].active','Oferta é o que a campanha vende','Revise produto, preço, desconto, benefício, frete, brinde e bônus. Uma oferta incompleta gera tarefa correta executando estratégia errada.'],
      ['css:[data-cw-pane="offer"].active','Use esta aba para conferência rápida','A fonte detalhada continua sendo o TAP, mas esta visão facilita validar o que vai chegar ao cliente.']
    ],
    'campaign-schedule':[
      ['css:[data-cw-tab="schedule"].active','Cronograma organiza o ritmo da campanha','Aqui você confere o que acontece, em qual canal, quando e com qual responsável.'],
      ['css:[data-cw-pane="schedule"].active','Transforme cronograma em execução real','Se algo no cronograma exige trabalho, garanta que exista uma tarefa correspondente com dono e prazo.']
    ],
    'campaign-tasks':[
      ['css:[data-cw-tab="tasks"].active','Estas são as tarefas da campanha','Só entram aqui tarefas realmente vinculadas à campanha. Isso permite medir progresso sem depender do nome da lista.'],
      ['css:[data-cw-pane="tasks"].active','Use esta visão para cobrar o fluxo, não pessoas no escuro','Veja o que está aberto, concluído ou travado e entre na tarefa para entender a causa antes de cobrar.']
    ]
  };

  const $=(s,r=document)=>r.querySelector(s);
  const visible=(el)=>{
    if(!el||!(el instanceof Element))return false;
    const r=el.getBoundingClientRect(),st=getComputedStyle(el);
    return r.width>2&&r.height>2&&st.display!=='none'&&st.visibility!=='hidden'&&Number(st.opacity||1)>0;
  };
  const norm=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
  const byText=(value)=>{
    const want=norm(value);
    const nodes=[...document.querySelectorAll('button,a,[role="tab"],h1,h2,h3,strong,label,span')].filter(visible);
    return nodes.find(el=>norm(el.textContent)===want)||nodes.find(el=>norm(el.textContent).includes(want))||null;
  };
  const activeView=()=>{
    const candidates=[
      '#alliance-full-view:not([hidden])','#tasksView','#campaignsView','#deliveriesView','#homeView',
      '#notificationsView','#painelView','.view.active','.page.active','main .content'
    ];
    for(const s of candidates){
      const el=$(s);if(visible(el))return el;
    }
    return [...document.querySelectorAll('main,section')].find(visible)||document.body;
  };
  const target=(token)=>{
    if(!token)return null;
    if(token.startsWith('nav:'))return $('.ref2-nav-btn[data-key="'+token.slice(4)+'"]');
    if(token.startsWith('css:'))return $(token.slice(4));
    if(token.startsWith('field:')){
      const el=$(token.slice(6));
      return el?.closest('.newfield,.camp-field,.tfield,.v3-new-conference')||el;
    }
    if(token.startsWith('section:')){
      const el=$(token.slice(8));
      return el?.closest('.tsection,.v3-section,.tap-section,.cw-card')||el;
    }
    if(token==='workspace')return $('.ref2-workspace');
    if(token==='globalSearch')return $('#globalSearch')||$('.ref2-search input')||$('input[placeholder*="Buscar tarefas"]');
    if(token==='topBell')return $('.ref2-top-bell');
    if(token==='fullView')return $('#alliance-full-view:not([hidden])')||activeView();
    if(token==='reportCard')return $('#alliance-plan-real-card')||activeView();
    if(token==='view')return activeView();
    if(token==='taskFilters'){
      const i=$('input[placeholder*="Buscar tarefa"]')||$('input[placeholder*="descrição"]');
      return i?.parentElement||i||activeView();
    }
    if(token.startsWith('text:')){
      const el=byText(token.slice(5));
      if(!el)return null;
      if(norm(el.textContent)==='lista'&&el.parentElement?.querySelectorAll('button').length>2)return el.parentElement;
      return el;
    }
    return null;
  };
  const uid=()=>window.AllianceOSSession?.user?.id||window.user?.id||'browser';
  const isAction=key=>Object.prototype.hasOwnProperty.call(ACTION_TOURS,key);
  const guideSteps=key=>isAction(key)?ACTION_TOURS[key]:TOURS[key];
  const guideLabel=key=>isAction(key)?ACTION_LABELS[key]:AREA_LABELS[key];
  const doneKey=key=>isAction(key)
    ? 'allianceos.action-guide.v1.'+uid()+'.'+key
    : 'allianceos.context-guide.v'+VERSION+'.'+uid()+'.'+key;
  const isDone=key=>{try{return localStorage.getItem(doneKey(key))==='1'}catch{return false}};
  const markDone=key=>{try{localStorage.setItem(doneKey(key),'1')}catch{}};

  let currentArea='home',active=null,index=0,raf=0;
  let rootEl,focusEl,cardEl,blockerEl,launcherEl;

  function ensureUi(){
    if(!launcherEl){
      launcherEl=document.createElement('button');
      launcherEl.id='allianceContextGuideLauncher';
      launcherEl.type='button';
      launcherEl.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H20v17H8.5A3.5 3.5 0 0 0 5 22z"/><path d="M5 5.5V22"/><path d="M9 7h7M9 11h5"/></svg><span>Guia</span>';
      launcherEl.addEventListener('click',()=>start(detectAction()||currentArea,true));
      document.body.appendChild(launcherEl);
    }
  }
  function buildTourUi(){
    rootEl=document.createElement('div');rootEl.id='allianceContextGuide';
    blockerEl=document.createElement('div');blockerEl.className='cg-blocker';
    focusEl=document.createElement('div');focusEl.className='cg-focus';
    cardEl=document.createElement('aside');cardEl.className='cg-card';
    rootEl.append(blockerEl,focusEl,cardEl);document.body.appendChild(rootEl);
  }
  function close(mark=true){
    if(mark&&active)markDone(active);
    cancelAnimationFrame(raf);
    rootEl?.remove();rootEl=focusEl=cardEl=blockerEl=null;active=null;index=0;
    setTimeout(scanActions,120);
  }
  function areaFromNav(){
    return $('.ref2-nav-btn.active[data-key]')?.dataset.key||currentArea||'home';
  }
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function placeCard(rect){
    const w=Math.min(380,window.innerWidth-32),gap=18;
    cardEl.style.width=w+'px';
    cardEl.style.left='16px';cardEl.style.top='16px';
    const cr=cardEl.getBoundingClientRect();
    let left=rect.left,top=rect.bottom+gap;
    if(top+cr.height>window.innerHeight-16)top=rect.top-cr.height-gap;
    if(top<16){
      top=clamp(rect.top+(rect.height-cr.height)/2,16,window.innerHeight-cr.height-16);
      left=rect.right+gap;
      if(left+w>window.innerWidth-16)left=rect.left-w-gap;
    }
    left=clamp(left,16,window.innerWidth-w-16);
    top=clamp(top,16,window.innerHeight-cr.height-16);
    cardEl.style.left=Math.round(left)+'px';cardEl.style.top=Math.round(top)+'px';
  }
  function paint(){
    if(!active||!rootEl)return;
    const steps=guideSteps(active)||[],step=steps[index];
    let el=target(step?.[0]);
    if(el&&!visible(el))el=null;
    if(el){
      const r=el.getBoundingClientRect(),pad=8;
      focusEl.hidden=false;
      focusEl.style.left=Math.round(r.left-pad)+'px';
      focusEl.style.top=Math.round(r.top-pad)+'px';
      focusEl.style.width=Math.round(r.width+pad*2)+'px';
      focusEl.style.height=Math.round(r.height+pad*2)+'px';
      placeCard({left:r.left-pad,top:r.top-pad,right:r.right+pad,bottom:r.bottom+pad,width:r.width+pad*2,height:r.height+pad*2});
    }else{
      const fallback=active==='task-detail'
        ? ($('#taskDetailDrawer .r10-workspace')||$('#taskDetailDrawer .r10-main')||$('#taskDetailDrawer .tdetail-layout'))
        : null;
      if(fallback&&visible(fallback)){
        const r=fallback.getBoundingClientRect(),pad=8;
        focusEl.hidden=false;
        focusEl.style.left=Math.round(r.left-pad)+'px';
        focusEl.style.top=Math.round(r.top-pad)+'px';
        focusEl.style.width=Math.round(r.width+pad*2)+'px';
        focusEl.style.height=Math.round(r.height+pad*2)+'px';
        placeCard({left:r.left-pad,top:r.top-pad,right:r.right+pad,bottom:r.bottom+pad,width:r.width+pad*2,height:r.height+pad*2});
      }else{
        focusEl.hidden=true;
        cardEl.classList.add('centered');
        cardEl.style.left='50%';cardEl.style.top='50%';
      }
    }
  }
  function render(){
    const steps=guideSteps(active)||[],step=steps[index];if(!step){close(true);return}
    cardEl.classList.remove('centered');
    const last=index===steps.length-1;
    cardEl.innerHTML=
      '<div class="cg-kicker">'+(isAction(active)?'PRIMEIRA VEZ · ':'')+guideLabel(active)+' · '+(index+1)+' de '+steps.length+'</div>'+
      '<h3>'+step[1]+'</h3><p>'+step[2]+'</p>'+
      '<div class="cg-progress">'+steps.map((_,i)=>'<i class="'+(i<=index?'on':'')+'"></i>').join('')+'</div>'+
      '<div class="cg-actions">'+
        '<button type="button" class="cg-skip">Pular guia</button>'+
        '<div>'+ (index?'<button type="button" class="cg-back">Voltar</button>':'')+
        '<button type="button" class="cg-next">'+(last?'Concluir':'Próximo')+' <span>→</span></button></div>'+
      '</div>';
    cardEl.querySelector('.cg-skip').onclick=()=>close(true);
    cardEl.querySelector('.cg-back')?.addEventListener('click',()=>{index--;renderStep()});
    cardEl.querySelector('.cg-next').onclick=()=>{if(last)close(true);else{index++;renderStep()}};
    requestAnimationFrame(paint);
  }
  function renderStep(){
    const step=(guideSteps(active)||[])[index],el=target(step?.[0]);
    if(el&&visible(el)&&!el.closest('.ref2-nav'))el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
    render();
    setTimeout(paint,320);
  }
  function start(key,force=false){
    if(!guideSteps(key)||document.getElementById('allianceOnboardingRoot'))return;
    if(!force&&isDone(key))return;
    if(rootEl)close(false);
    active=key;index=0;buildTourUi();renderStep();
  }
  function detectAction(){
    if(visible($('#newTaskModal.open')))return 'task-create';
    if(visible($('#taskDetailDrawer.open')))return 'task-detail';
    if(visible($('.as-fundo')))return 'campaign-assistant';
    if(visible($('#campaignModal.open')))return 'campaign-create';
    const workspace=$('#campaignWorkspace.active');
    if(visible(workspace)){
      if(visible($('[data-cw-tab="tap"].active')))return 'campaign-tap';
      if(visible($('[data-cw-tab="offer"].active')))return 'campaign-offer';
      if(visible($('[data-cw-tab="schedule"].active')))return 'campaign-schedule';
      if(visible($('[data-cw-tab="tasks"].active')))return 'campaign-tasks';
      return 'campaign-detail';
    }
    const planning=$('#planningView');
    const mindActive=visible($('.ref-strategy-tabs [data-strategy-tab="mind"].active'))||
      visible($('#planningView [data-plan-pane="mind"].active'))||
      visible($('#planningView .mp-cerca'));
    if(visible(planning)&&mindActive)return 'mind-map';
    return null;
  }
  let actionScanTimer=0;
  function scanActions(){
    clearTimeout(actionScanTimer);
    actionScanTimer=setTimeout(()=>{
      if(active||document.getElementById('allianceOnboardingRoot'))return;
      const key=detectAction();
      if(key&&!isDone(key))start(key,false);
    },180);
  }

  function maybe(area){
    currentArea=area;
    if(!TOURS[area]||isDone(area)||document.getElementById('allianceOnboardingRoot'))return;
    setTimeout(()=>start(area,false),650);
  }
  function boot(){
    ensureUi();
    const nav=$('.ref2-nav');
    if(!nav){setTimeout(boot,250);return}
    currentArea=areaFromNav();
    nav.addEventListener('click',e=>{
      const b=e.target.closest('.ref2-nav-btn[data-key]');if(!b)return;
      currentArea=b.dataset.key;setTimeout(()=>maybe(currentArea),120);
    },true);
    window.addEventListener('resize',()=>active&&paint());
    window.addEventListener('scroll',()=>active&&paint(),true);
    window.addEventListener('allianceos:auth',()=>setTimeout(()=>{currentArea=areaFromNav();maybe(currentArea);scanActions()},900));

    document.addEventListener('click',e=>{
      const tab=e.target.closest?.('[data-cw-tab],[data-strategy-tab],#newCampaignBtn,#planAddCampaignBtn,[data-task-id],[data-inline-new]');
      if(tab)setTimeout(scanActions,220);
    },true);

    new MutationObserver(()=>scanActions()).observe(document.body,{
      childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']
    });

    setTimeout(()=>{currentArea=areaFromNav();maybe(currentArea);scanActions()},1200);
  }
  window.AllianceOSContextGuide={
    start,
    reset:(key)=>{try{localStorage.removeItem(doneKey(key||detectAction()||currentArea))}catch{}},
    resetAll:()=>{
      try{
        const prefixA='allianceos.context-guide.',prefixB='allianceos.action-guide.';
        Object.keys(localStorage).filter(k=>k.startsWith(prefixA)||k.startsWith(prefixB)).forEach(k=>localStorage.removeItem(k));
      }catch{}
    },
    current:()=>detectAction()||currentArea
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
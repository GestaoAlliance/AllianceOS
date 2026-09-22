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
  const doneKey=area=>'allianceos.context-guide.v'+VERSION+'.'+uid()+'.'+area;
  const isDone=area=>{try{return localStorage.getItem(doneKey(area))==='1'}catch{return false}};
  const markDone=area=>{try{localStorage.setItem(doneKey(area),'1')}catch{}};

  let currentArea='home',active=null,index=0,raf=0;
  let rootEl,focusEl,cardEl,blockerEl,launcherEl;

  function ensureUi(){
    if(!launcherEl){
      launcherEl=document.createElement('button');
      launcherEl.id='allianceContextGuideLauncher';
      launcherEl.type='button';
      launcherEl.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H20v17H8.5A3.5 3.5 0 0 0 5 22z"/><path d="M5 5.5V22"/><path d="M9 7h7M9 11h5"/></svg><span>Guia</span>';
      launcherEl.addEventListener('click',()=>start(currentArea,true));
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
    const steps=TOURS[active]||[],step=steps[index];
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
      focusEl.hidden=true;
      cardEl.classList.add('centered');
      cardEl.style.left='50%';cardEl.style.top='50%';
    }
  }
  function render(){
    const steps=TOURS[active]||[],step=steps[index];if(!step){close(true);return}
    cardEl.classList.remove('centered');
    const last=index===steps.length-1;
    cardEl.innerHTML=
      '<div class="cg-kicker">'+AREA_LABELS[active]+' · '+(index+1)+' de '+steps.length+'</div>'+
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
    const step=(TOURS[active]||[])[index],el=target(step?.[0]);
    if(el&&visible(el)&&!el.closest('.ref2-nav'))el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
    render();
    setTimeout(paint,220);
  }
  function start(area,force=false){
    if(!TOURS[area]||document.getElementById('allianceOnboardingRoot'))return;
    if(!force&&isDone(area))return;
    close(false);active=area;index=0;buildTourUi();renderStep();
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
    window.addEventListener('allianceos:auth',()=>setTimeout(()=>{currentArea=areaFromNav();maybe(currentArea)},900));
    setTimeout(()=>{currentArea=areaFromNav();maybe(currentArea)},1200);
  }
  window.AllianceOSContextGuide={start,reset:(area)=>{try{localStorage.removeItem(doneKey(area||currentArea))}catch{}},current:()=>currentArea};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
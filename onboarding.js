(function(){
  'use strict';

  const VERSION=2;
  const STEPS=[
    ['Boas-vindas','Seu espaço no AllianceOS'],
    ['Seu perfil','Quem é você na operação'],
    ['Suas marcas','Onde você trabalha'],
    ['O sistema','Onde cada coisa acontece'],
    ['Nosso fluxo','Como o trabalho anda'],
    ['Pronto','Seu AllianceOS está preparado']
  ];

  const esc=(v)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const initials=(v)=>String(v||'?').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';

  const icons={
    home:'<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></svg>',
    tasks:'<svg viewBox="0 0 24 24"><path d="M9 6h12M9 12h12M9 18h12"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/></svg>',
    campaign:'<svg viewBox="0 0 24 24"><path d="M4 13v-2l12-5v12L4 13Z"/><path d="M8 14v5h4l-1-4"/><path d="M18 8c1 .8 2 2 2 4s-1 3.2-2 4"/></svg>',
    delivery:'<svg viewBox="0 0 24 24"><path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3"/><path d="M9 12h6"/></svg>',
    clients:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6"/><path d="M15 15c3 0 5 1.5 5 5"/></svg>',
    automations:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/></svg>',
    bell:'<svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 21h4"/></svg>',
    brand:'<svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>'
  };

  function root(){
    let el=document.getElementById('allianceOnboardingRoot');
    if(!el){el=document.createElement('div');el.id='allianceOnboardingRoot';document.body.appendChild(el)}
    return el;
  }

  function brandVisual(b){
    if(b?.foto_url)return '<span class="ob-brand-logo"><img src="'+esc(b.foto_url)+'" alt=""></span>';
    return '<span class="ob-brand-logo fallback" style="--ob-brand:'+esc(b?.cor||'#252a2e')+'">'+esc((b?.nome||'M').trim()[0]||'M')+'</span>';
  }

  function areaIcon(name){
    const n=String(name||'').toLowerCase();
    if(n.includes('design'))return '✦';
    if(n.includes('tráfego')||n.includes('trafego'))return '↗';
    if(n.includes('social'))return '◫';
    if(n.includes('autom'))return '⚡';
    if(n.includes('atend'))return '◌';
    if(n.includes('gest'))return '◎';
    return '•';
  }

  function run({client,data,session}){
    return new Promise((resolve)=>{
      const profile=data?.perfil||{};
      const areas=Array.isArray(data?.areas)?data.areas:[];
      const brands=Array.isArray(data?.marcas)?data.marcas:[];
      const userKey='allianceos.onboarding.step.'+(profile.id||session?.user?.id||'user');
      let stored=0;
      try{stored=Number(sessionStorage.getItem(userKey)||0)||0}catch{}
      const fallbackName=String(profile.nome||session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||session?.user?.email?.split('@')[0]||'');
      const fallbackCargo=String(profile.cargo||session?.user?.user_metadata?.cargo||'');
      const state={
        step:Math.max(0,Math.min(STEPS.length-1,stored)),
        name:fallbackName,
        cargo:fallbackCargo,
        areaId:String(profile.area_id||''),
        brandIds:new Set(brands.filter(b=>b.selecionada!==false).map(b=>String(b.id))),
        busy:false,
        error:''
      };

      function persistStep(){try{sessionStorage.setItem(userKey,String(state.step))}catch{}}
      function progress(){
        return STEPS.map((s,i)=>'<div class="ob-rail-step '+(i===state.step?'active':i<state.step?'done':'')+'"><span>'+(i<state.step?'✓':(i+1))+'</span><div><b>'+esc(s[0])+'</b><small>'+esc(s[1])+'</small></div></div>').join('');
      }
      function top(){
        const pct=Math.round(((state.step+1)/STEPS.length)*100);
        return '<div class="ob-mobile-progress"><span>Etapa '+(state.step+1)+' de '+STEPS.length+'</span><div><i style="width:'+pct+'%"></i></div></div>';
      }
      function message(){return state.error?'<div class="ob-error">'+esc(state.error)+'</div>':''}

      function welcome(){
        const area=areas.find(a=>String(a.id)===state.areaId);
        const selected=brands.filter(b=>state.brandIds.has(String(b.id)));
        const displayName=state.name||session?.user?.email?.split('@')[0]||'você';
        const firstName=String(displayName).trim().split(/\s+/)[0]||'você';
        const avatar=profile.foto_url?'<img src="'+esc(profile.foto_url)+'" alt="">':esc(initials(displayName));
        const brandPreview=selected.slice(0,4).map(b=>brandVisual(b)).join('');
        return '<section class="ob-step ob-welcome">'+
          '<div class="ob-kicker">PRIMEIRO ACESSO · 2 MIN</div>'+
          '<div class="ob-welcome-person">'+
            '<div class="ob-welcome-avatar">'+avatar+'</div>'+
            '<div class="ob-welcome-copy">'+
              '<h1>Bem-vindo, '+esc(firstName)+'.</h1>'+
              '<p class="ob-lead">Vamos ajustar seu contexto para você entrar no AllianceOS vendo só o que realmente faz parte da sua rotina.</p>'+
              '<div class="ob-person-meta">'+
                '<span><small>FUNÇÃO</small><b>'+esc(state.cargo||'Definir agora')+'</b></span>'+
                '<span><small>ÁREA</small><b>'+esc(area?.nome||'Definir agora')+'</b></span>'+
                '<span class="brands"><small>MARCAS</small><b>'+selected.length+' selecionada'+(selected.length===1?'':'s')+'</b><i>'+brandPreview+'</i></span>'+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div class="ob-welcome-grid">'+
            '<article><span>01</span><div><b>Seu contexto</b><p>Perfil, área e marcas corretas.</p></div></article>'+
            '<article><span>02</span><div><b>Menos ruído</b><p>Só o que é relevante para você.</p></div></article>'+
            '<article><span>03</span><div><b>Mesmo processo</b><p>Uma lógica única de execução.</p></div></article>'+
          '</div>'+
          '<div class="ob-note"><b>Configuração rápida</b><span>Você pode alterar tudo depois nas configurações.</span></div>'+
        '</section>';
      }

      function profileStep(){
        const areaCards=areas.map(a=>'<button type="button" class="ob-area '+(String(a.id)===state.areaId?'selected':'')+'" data-ob-area="'+esc(a.id)+'"><span>'+areaIcon(a.nome)+'</span><b>'+esc(a.nome)+'</b></button>').join('');
        return '<section class="ob-step">'+
          '<div class="ob-kicker">SEU PERFIL</div>'+
          '<h1>Como você entra na operação?</h1>'+
          '<p class="ob-lead">Isso ajuda o AllianceOS a organizar responsáveis, filtros e contexto das tarefas.</p>'+
          '<div class="ob-profile-card">'+
            '<div class="ob-profile-avatar">'+(profile.foto_url?'<img src="'+esc(profile.foto_url)+'" alt="">':esc(initials(state.name)))+'</div>'+
            '<div class="ob-fields">'+
              '<label><span>Seu nome</span><input id="obName" maxlength="120" value="'+esc(state.name)+'" placeholder="Seu nome"></label>'+
              '<label><span>Cargo / função</span><input id="obCargo" maxlength="120" value="'+esc(state.cargo)+'" placeholder="Ex.: Designer, Gestor, Social Media"></label>'+
            '</div>'+
          '</div>'+
          '<div class="ob-subtitle"><b>Sua área de atuação</b><span>Escolha a área que mais representa sua função principal.</span></div>'+
          '<div class="ob-areas">'+areaCards+'</div>'+
          message()+
        '</section>';
      }

      function brandsStep(){
        const cards=brands.map(b=>{
          const selected=state.brandIds.has(String(b.id));
          return '<button type="button" class="ob-brand '+(selected?'selected':'')+'" data-ob-brand="'+esc(b.id)+'">'+
            brandVisual(b)+
            '<span class="ob-brand-copy"><b>'+esc(b.nome)+'</b><small>'+esc(b.descricao||'Workspace da marca')+'</small></span>'+
            '<span class="ob-brand-check">'+(selected?'✓':'')+'</span>'+
          '</button>';
        }).join('');
        return '<section class="ob-step">'+
          '<div class="ob-kicker">SUAS MARCAS</div>'+
          '<h1>Com quais marcas você trabalha?</h1>'+
          '<p class="ob-lead">Selecione as marcas que fazem parte da sua rotina. Essa escolha define os contextos que aparecem no seletor lateral e o que você acessa no dia a dia.</p>'+
          '<div class="ob-security-note"><span>⌁</span><div><b>Escolha seu contexto</b><small>Selecione as marcas que realmente fazem parte da sua rotina. Você poderá ajustar isso depois nas configurações.</small></div></div>'+
          '<div class="ob-brands">'+cards+'</div>'+
          '<div class="ob-selection-count">'+state.brandIds.size+' selecionada'+(state.brandIds.size===1?'':'s')+'</div>'+
          message()+
        '</section>';
      }

      const moduleData=[
        ['home','Início','Resumo da sua operação: o que vence, o que pede atenção e como está a semana.'],
        ['tasks','Tarefas','É onde a execução acontece: responsável, prazo, prioridade, lista, dependências e entrega.'],
        ['campaign','Campanhas','O contexto estratégico: objetivo, cronograma, responsáveis, metas e progresso da campanha.'],
        ['delivery','Entregas','Tudo que precisa ser enviado, revisado ou aprovado fica registrado aqui e ligado à tarefa.'],
        ['clients','Clientes','Informações e contexto dos clientes/marcas, centralizados para a equipe.'],
        ['automations','Automações','Processos automáticos e integrações que mantêm a operação rodando sem trabalho manual repetitivo.'],
        ['bell','Notificações','Avisos que realmente pedem sua atenção: prazo, revisão, dependência e movimentações importantes.'],
        ['brand','Seletor de marca','Troca o contexto inteiro do sistema. Escolha uma marca ou a visão geral Alliance.']
      ];

      function modulesStep(){
        return '<section class="ob-step">'+
          '<div class="ob-kicker">CONHEÇA O SISTEMA</div>'+
          '<h1>Cada lugar tem uma função clara.</h1>'+
          '<p class="ob-lead">O AllianceOS foi desenhado para você não precisar adivinhar onde procurar ou onde registrar alguma coisa.</p>'+
          '<div class="ob-modules">'+moduleData.map(m=>'<article><span class="ob-module-icon">'+icons[m[0]]+'</span><div><b>'+esc(m[1])+'</b><p>'+esc(m[2])+'</p></div></article>').join('')+'</div>'+
        '</section>';
      }

      function workflowStep(){
        return '<section class="ob-step">'+
          '<div class="ob-kicker">COMO TRABALHAMOS</div>'+
          '<h1>A operação segue um fluxo.</h1>'+
          '<p class="ob-lead">O objetivo é que contexto, execução e aprovação estejam conectados — sem informação solta no WhatsApp ou na cabeça de alguém.</p>'+
          '<div class="ob-flow">'+
            '<article><span>1</span><b>Campanha dá o contexto</b><p>Objetivo, datas, marca e direção do trabalho.</p></article>'+
            '<i>→</i>'+
            '<article><span>2</span><b>Tarefa vira execução</b><p>Responsável, prazo, prioridade e dependências ficam explícitos.</p></article>'+
            '<i>→</i>'+
            '<article><span>3</span><b>Entrega registra o resultado</b><p>Arquivo, link, revisão, ajustes e aprovação ficam ligados à tarefa.</p></article>'+
            '<i>→</i>'+
            '<article><span>4</span><b>Concluído de verdade</b><p>Só termina quando os requisitos da tarefa foram cumpridos.</p></article>'+
          '</div>'+
          '<div class="ob-rules">'+
            '<div><span>✓</span><p><b>Prazo é compromisso.</b> Se mudou, atualize no sistema.</p></div>'+
            '<div><span>✓</span><p><b>Responsável é uma pessoa.</b> Toda tarefa precisa ter dono claro.</p></div>'+
            '<div><span>✓</span><p><b>Dependências ficam visíveis.</b> Se você depende de alguém, registre.</p></div>'+
            '<div><span>✓</span><p><b>Entrega acontece na tarefa.</b> Evite deixar o resultado final perdido em conversas.</p></div>'+
          '</div>'+
        '</section>';
      }

      function readyStep(){
        const area=areas.find(a=>String(a.id)===state.areaId);
        const selected=brands.filter(b=>state.brandIds.has(String(b.id)));
        return '<section class="ob-step ob-ready">'+
          '<div class="ob-ready-mark">✓</div>'+
          '<div class="ob-kicker">TUDO PRONTO</div>'+
          '<h1>Seu AllianceOS está preparado.</h1>'+
          '<p class="ob-lead">Você já pode entrar na operação. O sistema vai usar essas informações para mostrar o contexto certo para você.</p>'+
          '<div class="ob-summary">'+
            '<div><small>Perfil</small><b>'+esc(state.name)+'</b><span>'+esc(state.cargo||'Sem cargo informado')+'</span></div>'+
            '<div><small>Área</small><b>'+esc(area?.nome||'—')+'</b><span>Função principal</span></div>'+
            '<div class="wide"><small>Marcas</small><div class="ob-summary-brands">'+selected.map(b=>brandVisual(b)+'<b>'+esc(b.nome)+'</b>').join('')+'</div></div>'+
          '</div>'+
          '<div class="ob-last-tip"><span>⌘</span><div><b>Dica para começar</b><p>Abra <strong>Tarefas</strong>, confira o que está atribuído a você e use o seletor de marca na lateral para trocar de contexto.</p></div></div>'+
          message()+
        '</section>';
      }

      function content(){
        if(state.step===0)return welcome();
        if(state.step===1)return profileStep();
        if(state.step===2)return brandsStep();
        if(state.step===3)return modulesStep();
        if(state.step===4)return workflowStep();
        return readyStep();
      }

      function nav(){
        const back=state.step>0?'<button type="button" class="ob-btn ghost" id="obBack">Voltar</button>':'<span></span>';
        const label=state.step===0?'Começar':state.step===STEPS.length-1?'Entrar no AllianceOS':'Continuar';
        return '<footer class="ob-footer">'+back+'<div class="ob-footer-right"><span>Etapa '+(state.step+1)+' de '+STEPS.length+'</span><button type="button" class="ob-btn primary" id="obNext" '+(state.busy?'disabled':'')+'>'+(state.busy?'Salvando…':label)+' <i>→</i></button></div></footer>';
      }

      function draw(){
        root().innerHTML='<main class="ob-shell">'+
          '<aside class="ob-rail">'+
            '<div class="ob-logo"><span><img src="/api/brand-icon?format=svg&v=20260922-3" alt=""></span><b>AllianceOS</b></div>'+
            '<div class="ob-rail-copy"><small>CONFIGURAÇÃO RÁPIDA</small><h2>Seu contexto.</h2><p>6 etapas · cerca de 2 min</p></div>'+
            '<div class="ob-rail-steps">'+progress()+'</div>'+
            '<div class="ob-rail-help"><span>?</span><div><b>Ficou com dúvida?</b><small>Você pode rever essas orientações depois nas configurações.</small></div></div>'+
          '</aside>'+
          '<section class="ob-main">'+top()+'<div class="ob-content">'+content()+'</div>'+nav()+'</section>'+
        '</main>';
        bind();
      }

      function capture(){
        const n=document.getElementById('obName');if(n)state.name=n.value.trim();
        const c=document.getElementById('obCargo');if(c)state.cargo=c.value.trim();
      }

      function validateStep(){
        state.error='';
        capture();
        if(state.step===1){
          if(!state.name){state.error='Informe seu nome para continuar.';return false}
          if(!state.areaId){state.error='Selecione sua área de atuação.';return false}
        }
        if(state.step===2&&state.brandIds.size===0){state.error='Selecione pelo menos uma marca.';return false}
        return true;
      }

      async function finish(){
        if(state.busy)return;
        state.error='';capture();
        if(!state.name){state.error='Informe seu nome.';draw();return}
        if(!state.areaId){state.error='Selecione sua área de atuação.';draw();return}
        if(!state.brandIds.size){state.error='Selecione pelo menos uma marca.';draw();return}
        state.busy=true;draw();
        try{
          const {data:result,error}=await client.rpc('concluir_onboarding',{
            p_nome:state.name,
            p_cargo:state.cargo||null,
            p_area_id:state.areaId,
            p_brand_ids:Array.from(state.brandIds)
          });
          if(error)throw error;
          try{sessionStorage.removeItem(userKey)}catch{}
          document.getElementById('allianceOnboardingRoot')?.remove();
          resolve(result||true);
        }catch(err){
          state.busy=false;
          state.error=err?.message||String(err);
          draw();
        }
      }

      function bind(){
        document.getElementById('obBack')?.addEventListener('click',()=>{
          capture();state.error='';state.step=Math.max(0,state.step-1);persistStep();draw();
        });
        document.getElementById('obNext')?.addEventListener('click',async()=>{
          if(state.step===STEPS.length-1){await finish();return}
          if(!validateStep()){draw();return}
          state.step=Math.min(STEPS.length-1,state.step+1);persistStep();draw();
        });
        document.querySelectorAll('[data-ob-area]').forEach(btn=>btn.addEventListener('click',()=>{
          capture();state.areaId=String(btn.dataset.obArea||'');state.error='';draw();
        }));
        document.querySelectorAll('[data-ob-brand]').forEach(btn=>btn.addEventListener('click',()=>{
          const id=String(btn.dataset.obBrand||'');
          if(state.brandIds.has(id))state.brandIds.delete(id);else state.brandIds.add(id);
          state.error='';draw();
        }));
      }

      document.documentElement.classList.add('alliance-onboarding-open');
      draw();
    });
  }

  window.AllianceOSOnboarding={version:VERSION,run};
})();
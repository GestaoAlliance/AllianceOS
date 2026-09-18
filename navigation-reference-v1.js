
(() => {
  'use strict';
  const q=(s,r=document)=>r.querySelector(s);
  const byId=(id)=>document.getElementById(id);
  const svg=(body)=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+body+'</svg>';
  const ICONS={
    home:svg('<path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-6h4v6"/>'),
    tasks:svg('<path d="M7 6h13M7 12h13M7 18h9"/><path d="m3.5 6 .8.8L6 5.2M3.5 12l.8.8L6 11.2M3.5 18l.8.8L6 17.2"/>'),
    campaigns:svg('<path d="m4 13 14-7v12L4 13Z"/><path d="M8 15.5 9.8 20h3.4l-1.5-5.8"/><path d="M18 9.5h2M18 14.5h2"/>'),
    deliveries:svg('<rect x="4" y="7" width="16" height="13" rx="2"/><path d="m7 7 2-3h6l2 3M9 12h6"/>'),
    clients:svg('<path d="M7.5 19v-1.2A4.8 4.8 0 0 1 12.3 13h.4a4.8 4.8 0 0 1 4.8 4.8V19"/><circle cx="12.5" cy="8.5" r="3"/><path d="M5 17.5a3.8 3.8 0 0 1 3-3.7M20 17.5a3.8 3.8 0 0 0-3-3.7"/>'),
    automations:svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'),
    notifications:svg('<path d="M18 9a6 6 0 0 0-12 0c0 5.8-2.5 7-2.5 7h17S18 14.8 18 9Z"/><path d="M10 20h4"/>'),
    reports:svg('<path d="M5 20V11M10 20V7M15 20v-5M20 20V4"/><path d="M3 20h19"/>'),
    settings:svg('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1A7 7 0 0 0 14.7 6L14.4 3H9.6L9.3 6a7 7 0 0 0-1.7 1.1l-2.5-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1A7 7 0 0 0 9.3 18l.3 3h4.8l.3-3a7 7 0 0 0 1.7-1.1l2.5 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/>'),
    search:svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
    bell:svg('<path d="M18 9a6 6 0 0 0-12 0c0 5.8-2.5 7-2.5 7h17S18 14.8 18 9Z"/><path d="M10 20h4"/>')
  };
  const toast=(msg)=>{
    if(typeof window.showToast==='function'){window.showToast(msg);return}
    const n=document.createElement('div');n.textContent=msg;
    Object.assign(n.style,{position:'fixed',right:'24px',bottom:'24px',zIndex:'9999',padding:'11px 14px',borderRadius:'10px',background:'#111519',color:'#fff',font:'600 11px Inter,system-ui'});
    document.body.appendChild(n);setTimeout(()=>n.remove(),1600);
  };
  function ensureBrands(select){
    ['Botanika','Revita','VermeFree','Shoty','Todas as marcas'].forEach(name=>{
      if(![...select.options].some(o=>o.textContent.trim()===name)){
        const o=document.createElement('option');o.textContent=name;o.value=name;select.appendChild(o);
      }
    });
  }
  function setup(){
    const sidebar=q('.sidebar'), toolbar=q('.global-toolbar'), legacyNav=q('.nav',sidebar);
    if(!sidebar||!toolbar||!legacyNav)return;

    // Keep legacy controls alive but visually isolated.
    const targets={
      home:byId('homeNav'), tasks:byId('tasksNav'), campaigns:byId('campaignsNav'),
      planning:byId('planningNav'), deliveries:byId('deliveriesNav'), notifications:byId('notificationsBtn'),
      reports:byId('painelNav'), settings:byId('customizeSidebarBtn')
    };

    q('.ref2-sidebar-head',sidebar)?.remove();
    q('.ref2-nav',sidebar)?.remove();
    q('.ref2-sidebar-space',sidebar)?.remove();
    q('.ref2-workspace',sidebar)?.remove();

    const head=document.createElement('div');head.className='ref2-sidebar-head';
    head.innerHTML='<div class="ref2-sidebar-logo">✱</div><div class="ref2-sidebar-name">AllianceOS</div>';

    const nav=document.createElement('nav');nav.className='ref2-nav';
    const items=[
      ['home','Início','home',targets.home],
      ['tasks','Tarefas','tasks',targets.tasks],
      ['campaigns','Campanhas','campaigns',targets.campaigns],
      ['deliveries','Entregas','deliveries',targets.deliveries],
      ['clients','Clientes','clients',null],
      ['automations','Automações','automations',null],
      ['notifications','Notificações','notifications',targets.notifications],
      ['reports','Relatórios','reports',targets.reports],
      ['settings','Configurações','settings',targets.settings]
    ];
    const btns=new Map();
    const setActive=(key)=>btns.forEach((b,k)=>b.classList.toggle('active',k===key));
    items.forEach(([key,label,icon,target])=>{
      const b=document.createElement('button');b.type='button';b.className='ref2-nav-btn';b.dataset.key=key;
      b.innerHTML='<span class="ref2-nav-icon">'+ICONS[icon]+'</span><span class="ref2-nav-label">'+label+'</span>'+
        (key==='notifications'?'<span class="ref2-nav-badge">37</span>':'');
      b.addEventListener('click',()=>{
        setActive(key);
        if(target)target.click();
        else toast(label+' · módulo em preparação.');
      });
      if(target)target.addEventListener('click',()=>setActive(key),true);
      btns.set(key,b);nav.appendChild(b);
    });
    if(targets.planning)targets.planning.addEventListener('click',()=>setActive('campaigns'),true);
    const initial=[['home',targets.home],['tasks',targets.tasks],['campaigns',targets.campaigns],['campaigns',targets.planning],['deliveries',targets.deliveries],['notifications',targets.notifications],['reports',targets.reports],['settings',targets.settings]]
      .find(([,el])=>el?.classList.contains('active'))?.[0]||'home';
    setActive(initial);

    const space=document.createElement('div');space.className='ref2-sidebar-space';
    const workspace=document.createElement('button');workspace.type='button';workspace.className='ref2-workspace';
    workspace.innerHTML='<span class="ref2-workspace-icon">♛</span><span class="ref2-workspace-copy"><strong>Botanika</strong><span>6 membros</span></span><span class="ref2-workspace-arrow">›</span>';

    sidebar.prepend(head);
    head.insertAdjacentElement('afterend',nav);
    nav.insertAdjacentElement('afterend',space);
    space.insertAdjacentElement('afterend',workspace);

    // Preserve original functional nodes before rebuilding toolbar.
    const brand=byId('brandSelect');
    const search=byId('globalSearch');
    if(brand)brand.remove();
    if(search)search.remove();
    toolbar.replaceChildren();

    const topLogo=document.createElement('div');topLogo.className='ref2-top-logo';
    topLogo.innerHTML='<div class="ref2-top-logo-icon">✱</div><div class="ref2-top-logo-name">AllianceOS</div>';

    const brandWrap=document.createElement('div');brandWrap.className='ref2-brand-wrap';
    if(brand){
      ensureBrands(brand);
      brand.className='ref2-brand-select';
      brandWrap.appendChild(brand);
      const caret=document.createElement('span');caret.className='ref2-brand-caret';
      caret.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg>';
      brandWrap.appendChild(caret);
      const syncWorkspace=()=>{const s=q('.ref2-workspace-copy strong');if(s)s.textContent=/todas/i.test(brand.value)?'Todas as marcas':brand.value};
      brand.addEventListener('change',syncWorkspace);syncWorkspace();
      workspace.addEventListener('click',()=>brand.focus());
    }

    const team=document.createElement('button');team.type='button';team.className='ref2-team';team.setAttribute('aria-label','Equipe Botanika · 6 membros');
    team.innerHTML='<span class="ref2-team-avatar">PL</span><span class="ref2-team-avatar">SN</span><span class="ref2-team-avatar more">+4</span>';
    team.addEventListener('click',()=>toast('Equipe Botanika · 6 membros'));

    const searchWrap=document.createElement('label');searchWrap.className='ref2-search';
    searchWrap.innerHTML=ICONS.search;
    if(search){
      search.className='ref2-search-input';
      search.placeholder='Buscar tarefas, campanhas, entregas...';
      searchWrap.appendChild(search);
    }
    const cmd=document.createElement('span');cmd.className='ref2-command';cmd.innerHTML='<kbd>⌘</kbd><kbd>K</kbd>';searchWrap.appendChild(cmd);

    const actions=document.createElement('div');actions.className='ref2-top-actions';
    const bell=document.createElement('button');bell.type='button';bell.className='ref2-top-bell';bell.setAttribute('aria-label','Notificações');
    bell.innerHTML=ICONS.bell+'<span class="ref2-top-badge">37</span>';bell.addEventListener('click',()=>targets.notifications?.click());
    const profile=document.createElement('button');profile.type='button';profile.className='ref2-profile';profile.setAttribute('aria-label','Perfil');
    profile.innerHTML='<span class="ref2-avatar">VG</span><svg class="ref2-chevron" viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg>';
    profile.addEventListener('click',()=>toast('Vitor Gutierrez'));
    actions.append(bell,profile);

    toolbar.append(topLogo,brandWrap,team,searchWrap,actions);

    /* AllianceOS strategy bridge
       Mapa mental -> campanha/TAP -> tarefas, usando as mesmas chaves central.* */
    const uid=()=>window.user?.id||'vitor-gutierrez';
    const readList=(key)=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
    const normalize=(v)=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/campanha\s+/g,'').replace(/[^a-z0-9]+/g,' ').trim();
    const activeBrand=()=>{
      const v=brand?.value||'';
      return !v||/todas/i.test(v)?'':v;
    };
    const campaigns=()=>readList('central.campaigns.'+uid());
    const tasks=()=>readList('central.tasks.'+uid());

    function syncTaskCampaignIds(){
      const cs=campaigns(), ts=tasks();
      if(!cs.length||!ts.length)return;
      let changed=false;
      for(const t of ts){
        if(t.campaignId)continue;
        const project=normalize(t.project);
        if(!project)continue;
        const c=cs.find(c=>(!t.brand||!c.brand||t.brand===c.brand)&&normalize(c.name)===project);
        if(c){t.campaignId=c.id;changed=true}
      }
      if(changed)localStorage.setItem('central.tasks.'+uid(),JSON.stringify(ts));
    }

    function syncCampaignNodesIntoOpenMap(){
      const M=window.MapaMental;
      if(!M||typeof M.campanhasNoMapa!=='function'||typeof M.virarCampanha!=='function')return;
      const brandNow=activeBrand();
      const current=new Set((M.campanhasNoMapa()||[]).map(String));
      const palette=[0,4,2,6,5,3,1,7];
      campaigns()
        .filter(c=>!brandNow||c.brand===brandNow)
        .forEach((c,i)=>{
          if(!c?.id||current.has(String(c.id)))return;
          M.virarCampanha(null,{nome:c.name||'Campanha',cor:palette[i%palette.length],campId:c.id});
          current.add(String(c.id));
        });
    }

    function openStrategyMap(){
      syncTaskCampaignIds();
      if(targets.planning)targets.planning.click();
      else window.__centralShowPlanning?.();
      setActive('campaigns');
      setTimeout(()=>{
        window.MapaMental?.recarregar?.();
        setTimeout(syncCampaignNodesIntoOpenMap,80);
      },60);
    }

    function installCampaignStrategyTab(){
      const tabs=document.querySelector('#campaignsView .camp-tabs');
      if(!tabs||tabs.querySelector('[data-ref-strategy-map]'))return;
      const b=document.createElement('button');
      b.type='button';b.className='camp-tab';b.dataset.refStrategyMap='1';b.textContent='Mapa mental';
      b.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();openStrategyMap()});
      tabs.appendChild(b);
    }

    installCampaignStrategyTab();
    targets.campaigns?.addEventListener('click',()=>{
      setTimeout(()=>{installCampaignStrategyTab();syncTaskCampaignIds()},40);
    });
    brand?.addEventListener('change',()=>{
      if(document.getElementById('planningView')?.classList.contains('active')){
        setTimeout(()=>{window.MapaMental?.recarregar?.();setTimeout(syncCampaignNodesIntoOpenMap,80)},40);
      }
    });
    document.getElementById('campaignForm')?.addEventListener('submit',()=>{
      setTimeout(syncTaskCampaignIds,120);
    });

  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();


(() => {
  'use strict';

  /* AllianceOS OAuth consent screen
     Isolated from the normal app: only runs on /oauth/consent. */
  async function renderOAuthConsent(){
    const authorizationId=new URLSearchParams(location.search).get('authorization_id');
    document.documentElement.style.background='#f4f6f8';
    document.body.innerHTML=`
      <main id="oauthConsentRoot" style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f4f6f8;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#15191d">
        <section style="width:min(520px,100%);background:#fff;border:1px solid #e3e8eb;border-radius:22px;box-shadow:0 18px 60px rgba(25,32,38,.08);padding:30px">
          <div style="display:flex;align-items:center;gap:13px;margin-bottom:24px">
            <div style="width:46px;height:46px;border-radius:13px;background:#111519;color:#fff;display:grid;place-items:center;font-size:23px">✱</div>
            <div><strong style="display:block;font-size:20px;letter-spacing:-.03em">AllianceOS</strong><span style="font-size:12px;color:#8a939b">Conectar aplicativo</span></div>
          </div>
          <div id="oauthStatus" style="font-size:13px;color:#69737b">Carregando solicitação de acesso…</div>
          <div id="oauthLogin" hidden>
            <h1 style="font-size:24px;letter-spacing:-.04em;margin:0 0 8px">Entrar para autorizar</h1>
            <p style="font-size:13px;line-height:1.5;color:#747e86;margin:0 0 18px">Entre com sua conta do AllianceOS. Esta tela existe apenas para autorizações OAuth.</p>
            <label style="display:block;font-size:11px;font-weight:700;margin-bottom:6px">E-mail</label>
            <input id="oauthEmail" type="email" autocomplete="email" style="box-sizing:border-box;width:100%;height:46px;border:1px solid #dce2e6;border-radius:11px;padding:0 12px;margin-bottom:12px;font:inherit">
            <label style="display:block;font-size:11px;font-weight:700;margin-bottom:6px">Senha</label>
            <input id="oauthPassword" type="password" autocomplete="current-password" style="box-sizing:border-box;width:100%;height:46px;border:1px solid #dce2e6;border-radius:11px;padding:0 12px;margin-bottom:14px;font:inherit">
            <button id="oauthSignIn" type="button" style="width:100%;height:46px;border:0;border-radius:11px;background:#111519;color:#fff;font-weight:750;cursor:pointer">Entrar</button>
            <button id="oauthMagic" type="button" style="width:100%;height:42px;margin-top:9px;border:1px solid #dce2e6;border-radius:11px;background:#fff;color:#343b41;font-weight:650;cursor:pointer">Enviar link mágico por e-mail</button>
            <p id="oauthLoginMsg" style="min-height:18px;font-size:11px;color:#7a848c;margin:10px 0 0"></p>
          </div>
          <div id="oauthDecision" hidden>
            <h1 style="font-size:24px;letter-spacing:-.04em;margin:0 0 8px">Autorizar acesso?</h1>
            <p style="font-size:13px;line-height:1.5;color:#747e86;margin:0 0 18px"><strong id="oauthClientName" style="color:#242a2f"></strong> quer acessar o AllianceOS em seu nome.</p>
            <div style="border:1px solid #e3e8eb;border-radius:13px;padding:14px;margin-bottom:18px;background:#fafbfc">
              <div style="font-size:10px;font-weight:800;color:#89929a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Permissões solicitadas</div>
              <div id="oauthScopes" style="font-size:12px;line-height:1.6;color:#3b4349"></div>
            </div>
            <p style="font-size:11px;line-height:1.5;color:#858e96;margin:0 0 18px">O aplicativo terá somente as permissões que sua conta já possui. As políticas de acesso do AllianceOS continuam valendo.</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <button id="oauthDeny" type="button" style="height:46px;border:1px solid #dce2e6;border-radius:11px;background:#fff;color:#343b41;font-weight:700;cursor:pointer">Negar</button>
              <button id="oauthApprove" type="button" style="height:46px;border:0;border-radius:11px;background:#111519;color:#fff;font-weight:750;cursor:pointer">Autorizar</button>
            </div>
            <button id="oauthSignOut" type="button" style="display:block;margin:14px auto 0;border:0;background:transparent;color:#8a939b;font-size:11px;cursor:pointer">Sair desta conta</button>
          </div>
          <div id="oauthError" hidden style="padding:13px;border-radius:10px;background:#fff2f2;color:#a73a43;font-size:12px;line-height:1.5"></div>
        </section>
      </main>`;

    const status=document.getElementById('oauthStatus');
    const login=document.getElementById('oauthLogin');
    const decision=document.getElementById('oauthDecision');
    const errorBox=document.getElementById('oauthError');
    const showError=(msg)=>{status.hidden=true;login.hidden=true;decision.hidden=true;errorBox.hidden=false;errorBox.textContent=msg};

    if(!authorizationId){showError('Solicitação OAuth inválida: authorization_id ausente.');return}

    try{
      const cfgRes=await fetch('https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config');
      if(!cfgRes.ok)throw new Error('Não foi possível carregar a configuração pública do Supabase.');
      const cfg=await cfgRes.json();
      const mod=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
      const sb=mod.createClient(cfg.url,cfg.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

      async function loadConsent(){
        status.hidden=false;status.textContent='Verificando sua sessão…';login.hidden=true;decision.hidden=true;errorBox.hidden=true;
        const {data:{session}}=await sb.auth.getSession();
        if(!session){
          status.hidden=true;login.hidden=false;
          return;
        }
        const {data,error}=await sb.auth.oauth.getAuthorizationDetails(authorizationId);
        if(error)throw error;
        if(data && !('authorization_id' in data) && data.redirect_url){location.assign(data.redirect_url);return}
        const client=data?.client||data?.oauth_client||{};
        document.getElementById('oauthClientName').textContent=client.name||client.client_name||'Um aplicativo MCP';
        const scope=String(data?.scope||'').trim();
        document.getElementById('oauthScopes').textContent=scope?scope.split(/\s+/).join(' · '):'Acesso à conta conforme suas permissões atuais';
        status.hidden=true;decision.hidden=false;
      }

      document.getElementById('oauthSignIn').onclick=async()=>{
        const msg=document.getElementById('oauthLoginMsg');msg.textContent='Entrando…';
        const email=document.getElementById('oauthEmail').value.trim();
        const password=document.getElementById('oauthPassword').value;
        const {error}=await sb.auth.signInWithPassword({email,password});
        if(error){msg.textContent=error.message;return}
        msg.textContent='';await loadConsent();
      };
      document.getElementById('oauthMagic').onclick=async()=>{
        const msg=document.getElementById('oauthLoginMsg');
        const email=document.getElementById('oauthEmail').value.trim();
        if(!email){msg.textContent='Digite seu e-mail primeiro.';return}
        msg.textContent='Enviando…';
        const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});
        msg.textContent=error?error.message:'Link enviado. Abra o e-mail neste navegador para continuar.';
      };
      document.getElementById('oauthApprove').onclick=async()=>{
        const btn=document.getElementById('oauthApprove');btn.disabled=true;btn.textContent='Autorizando…';
        const {data,error}=await sb.auth.oauth.approveAuthorization(authorizationId);
        if(error){btn.disabled=false;btn.textContent='Autorizar';showError(error.message);return}
        location.assign(data.redirect_url);
      };
      document.getElementById('oauthDeny').onclick=async()=>{
        const {data,error}=await sb.auth.oauth.denyAuthorization(authorizationId);
        if(error){showError(error.message);return}
        location.assign(data.redirect_url);
      };
      document.getElementById('oauthSignOut').onclick=async()=>{await sb.auth.signOut();await loadConsent()};
      await loadConsent();
    }catch(err){showError(err?.message||String(err))}
  }

  if(location.pathname==='/oauth/consent'){
    renderOAuthConsent();
    return;
  }
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

    /* Unified strategy navigation
       One hierarchy: Mapa mental -> Campanhas -> Mês -> Semana.
       Campaign details remain the dedicated workspace already used by the app. */
    function strategyButtons(active){
      const defs=[
        ['mind','Mapa mental'],
        ['campaigns','Campanhas'],
        ['month','Mês'],
        ['week','Semana']
      ];
      const wrap=document.createElement('div');
      wrap.className='plan-tabs ref-strategy-tabs';
      wrap.setAttribute('aria-label','Navegação da estratégia');
      for(const [key,label] of defs){
        const b=document.createElement('button');
        b.type='button';
        b.className='plan-tab'+(key===active?' active':'');
        b.dataset.strategyTab=key;
        b.textContent=label;
        b.addEventListener('click',()=>{
          if(key==='campaigns'){
            syncTaskCampaignIds();
            window.__centralShowCampaigns?.();
            setActive('campaigns');
            setTimeout(()=>installUnifiedStrategyNav('campaigns'),30);
            return;
          }
          if(targets.planning)targets.planning.click();
          else window.__centralShowPlanning?.();
          setActive('campaigns');
          setTimeout(()=>{
            const legacy=document.querySelector('#planningView [data-plan-tab="'+key+'"]');
            if(legacy)legacy.click();
            if(key==='mind'){
              window.MapaMental?.recarregar?.();
              setTimeout(syncCampaignNodesIntoOpenMap,80);
            }
            installUnifiedStrategyNav(key);
          },45);
        });
        wrap.appendChild(b);
      }
      return wrap;
    }

    function installUnifiedStrategyNav(active){
      const planning=document.getElementById('planningView');
      const campaignsView=document.getElementById('campaignsView');

      // Planning already owns the map/month/week panes. Replace its visible
      // tabs with the canonical four-item strategy order, while keeping the
      // original buttons hidden so their existing render handlers remain alive.
      if(planning){
        const old=planning.querySelector('.plan-tabs:not(.ref-strategy-tabs)');
        if(old)old.classList.add('ref-strategy-legacy');
        let nav=planning.querySelector('.ref-strategy-tabs');
        if(!nav && old){
          nav=strategyButtons(active==='campaigns'?'mind':active||'mind');
          old.insertAdjacentElement('afterend',nav);
        }
        if(nav){
          nav.querySelectorAll('[data-strategy-tab]').forEach(b=>b.classList.toggle('active',b.dataset.strategyTab===(active||'mind')));
        }
      }

      // Campaigns is the list/directory. Its old "Visão geral / Calendário"
      // toggle is redundant with Campanhas / Mês, so keep it functional but hidden.
      if(campaignsView){
        const toolbar=campaignsView.querySelector('.camp-toolbar');
        const oldTabs=campaignsView.querySelector('.camp-tabs');
        if(oldTabs)oldTabs.classList.add('ref-strategy-legacy');
        let nav=campaignsView.querySelector('.ref-strategy-tabs');
        if(!nav && toolbar){
          nav=strategyButtons(active||'campaigns');
          toolbar.insertAdjacentElement('beforebegin',nav);
        }
        if(nav){
          nav.querySelectorAll('[data-strategy-tab]').forEach(b=>b.classList.toggle('active',b.dataset.strategyTab===(active||'campaigns')));
        }
      }
    }

    function openStrategyMap(){
      syncTaskCampaignIds();
      if(targets.planning)targets.planning.click();
      else window.__centralShowPlanning?.();
      setActive('campaigns');
      setTimeout(()=>{
        document.querySelector('#planningView [data-plan-tab="mind"]')?.click();
        window.MapaMental?.recarregar?.();
        setTimeout(syncCampaignNodesIntoOpenMap,80);
        installUnifiedStrategyNav('mind');
      },60);
    }

    installUnifiedStrategyNav(
      document.getElementById('planningView')?.classList.contains('active')?'mind':
      document.getElementById('campaignsView')?.classList.contains('active')?'campaigns':'mind'
    );

    targets.planning?.addEventListener('click',()=>{
      setTimeout(()=>installUnifiedStrategyNav('mind'),35);
    });
    targets.campaigns?.addEventListener('click',()=>{
      setTimeout(()=>{syncTaskCampaignIds();installUnifiedStrategyNav('campaigns')},40);
    });
    brand?.addEventListener('change',()=>{
      if(document.getElementById('planningView')?.classList.contains('active')){
        setTimeout(()=>{window.MapaMental?.recarregar?.();setTimeout(syncCampaignNodesIntoOpenMap,80)},40);
      }
    });
    document.getElementById('campaignForm')?.addEventListener('submit',()=>{
      setTimeout(syncTaskCampaignIds,120);
    });

    // Expose the root flow for any future breadcrumb/back buttons.
    window.AllianceOSStrategy={
      mapa:openStrategyMap,
      campanhas:()=>{window.__centralShowCampaigns?.();setTimeout(()=>installUnifiedStrategyNav('campaigns'),30)},
      mes:()=>document.querySelector('.ref-strategy-tabs [data-strategy-tab="month"]')?.click(),
      semana:()=>document.querySelector('.ref-strategy-tabs [data-strategy-tab="week"]')?.click()
    };

  }
  function openTaskDeepLink(){
    const id=new URLSearchParams(location.search).get('task');
    if(!id)return;
    setTimeout(()=>{
      window.__centralShowTasks?.();
      setTimeout(()=>window.openTaskDetail?.(id),120);
    },160);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{setup();openTaskDeepLink()},{once:true});
  }else{
    setup();openTaskDeepLink();
  }
})();



/* AllianceOS Administration V1
   Camada RLS da interface: diretório real, auditoria, notificações e administração.
   Não duplica a persistência de tarefas; opera sobre as estruturas existentes. */
(() => {
  'use strict';

  const APP_URL='https://alliance-os-sooty.vercel.app';
  const CONFIG_URL='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
  const TASKS_KEY='central.tasks.vitor-gutierrez';
  let sb=null;
  let loading=null;
  let state={me:null,profiles:[],invites:[],links:[],brands:[],lists:[],tasks:[],notifications:[]};

  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const short=v=>String(v||'').split('|')[0].trim();
  const initials=v=>{const p=short(v).split(/\s+/).filter(Boolean);return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase()||'—'};
  const toast=msg=>{
    if(typeof window.showToast==='function'){window.showToast(msg);return}
    const n=document.createElement('div');n.textContent=msg;
    Object.assign(n.style,{position:'fixed',right:'24px',bottom:'24px',zIndex:'100001',padding:'11px 14px',borderRadius:'10px',background:'#111519',color:'#fff',font:'600 12px Inter,system-ui',boxShadow:'0 12px 34px rgba(0,0,0,.22)'});
    document.body.appendChild(n);setTimeout(()=>n.remove(),2200);
  };
  const nowIso=()=>new Date().toISOString();
  const taskLink=id=>APP_URL+'/?task='+encodeURIComponent(id)+'#tasks';

  function installStyle(){
    if(document.getElementById('alliance-admin-style'))return;
    const st=document.createElement('style');st.id='alliance-admin-style';
    st.textContent=[
      '.ao-admin-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(18,22,25,.42);backdrop-filter:blur(4px);display:flex;justify-content:flex-end}',
      '.ao-admin-panel{width:min(900px,94vw);height:100%;background:#f6f7f8;border-left:1px solid #dde2e5;box-shadow:-24px 0 70px rgba(18,22,25,.16);display:flex;flex-direction:column;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171b1e}',
      '.ao-admin-head{background:#fff;border-bottom:1px solid #e2e6e9;padding:20px 22px 0;display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap}',
      '.ao-admin-title{flex:1;min-width:220px}.ao-admin-title h2{margin:0;font-size:22px;letter-spacing:-.04em}.ao-admin-title p{margin:5px 0 16px;color:#7b848b;font-size:12px}',
      '.ao-admin-close{width:36px;height:36px;border:1px solid #dfe4e7;border-radius:10px;background:#fff;font-size:20px;color:#687178}',
      '.ao-admin-tabs{width:100%;display:flex;gap:4px;overflow:auto}.ao-admin-tab{border:0;background:transparent;padding:10px 12px;border-bottom:2px solid transparent;font-size:11px;font-weight:750;color:#7c858c}.ao-admin-tab.active{color:#171b1e;border-bottom-color:#171b1e}',
      '.ao-admin-body{padding:22px;overflow:auto;display:grid;gap:16px}',
      '.ao-card{background:#fff;border:1px solid #e1e5e8;border-radius:16px;padding:16px;box-shadow:0 7px 24px rgba(28,35,40,.035)}',
      '.ao-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.ao-card-head h3{margin:0;font-size:13px}.ao-card-head span{font-size:10px;color:#8b949b}',
      '.ao-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ao-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.ao-field{display:grid;gap:6px}.ao-field label{font-size:10px;font-weight:750;color:#667078}.ao-field input,.ao-field select{width:100%;height:40px;border:1px solid #dce1e4;border-radius:9px;background:#fff;padding:0 10px;color:#242a2f;outline:none}.ao-field select[multiple]{height:92px;padding:7px 9px}',
      '.ao-btn{height:39px;border:1px solid #d9dfe2;border-radius:9px;background:#fff;padding:0 12px;font-weight:750;font-size:11px;color:#353c41}.ao-btn.primary{background:#171b1e;border-color:#171b1e;color:#fff}.ao-btn.danger{color:#a23e43}.ao-btn:disabled{opacity:.45;cursor:not-allowed}',
      '.ao-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid #edf0f2}.ao-row:first-child{border-top:0}.ao-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#eef1f2;font-size:10px;font-weight:850;flex:0 0 auto}.ao-row-main{min-width:0;flex:1}.ao-row-main b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ao-row-main span{display:block;font-size:9px;color:#858e95;margin-top:2px}.ao-chip{font-size:9px;border:1px solid #dfe4e7;border-radius:999px;padding:4px 7px;color:#69727a;background:#fafbfb}.ao-chip.warn{background:#fff7ec;color:#9a6624;border-color:#f0dfc4}.ao-chip.ok{background:#edf7f1;color:#377154;border-color:#d2e8db}',
      '.ao-legacy{display:grid;grid-template-columns:minmax(0,1fr) minmax(210px,.8fr) auto;gap:10px;align-items:end;padding:12px 0;border-top:1px solid #edf0f2}.ao-legacy:first-child{border-top:0}.ao-legacy-name b{display:block;font-size:11px}.ao-legacy-name span{font-size:9px;color:#879098}',
      '.ao-list-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:11px 0;border-top:1px solid #edf0f2;align-items:center}.ao-list-row:first-child{border-top:0}.ao-list-row.suspicious{background:#fffaf3;margin:0 -8px;padding:11px 8px;border-radius:10px}.ao-list-row b{font-size:11px}.ao-list-row small{display:block;color:#899198;font-size:9px;margin-top:3px}.ao-cleaner{display:grid;grid-template-columns:minmax(170px,1fr) minmax(210px,1fr) auto;gap:8px;margin-top:8px}.ao-cleaner select{height:36px;border:1px solid #dce1e4;border-radius:8px;background:#fff;padding:0 8px;font-size:10px}',
      '.ao-note{border-radius:11px;padding:11px 12px;background:#f0f3f4;color:#606a71;font-size:10px;line-height:1.5}.ao-note.warn{background:#fff6e8;color:#815f2e}',
      '.ao-notification{display:flex;gap:10px;padding:12px 0;border-top:1px solid #edf0f2}.ao-notification:first-child{border-top:0}.ao-notification.unread .ao-notif-dot{background:#b14c4c}.ao-notif-dot{width:8px;height:8px;border-radius:50%;background:#d5dade;margin-top:4px}.ao-notif-copy{flex:1;min-width:0}.ao-notif-copy b{display:block;font-size:11px}.ao-notif-copy span{display:block;font-size:9px;color:#838c93;margin-top:3px;line-height:1.45}.ao-empty{text-align:center;padding:28px 12px;color:#8b949b;font-size:11px}',
      '@media(max-width:720px){.ao-grid,.ao-grid-3{grid-template-columns:1fr}.ao-legacy,.ao-cleaner{grid-template-columns:1fr}.ao-admin-body{padding:14px}.ao-admin-panel{width:100vw}}'
    ].join('');
    document.head.appendChild(st);
  }

  async function client(){
    if(sb)return sb;
    const cfgRes=await fetch(CONFIG_URL,{cache:'no-store'});
    if(!cfgRes.ok)throw new Error('Não foi possível carregar a configuração do AllianceOS.');
    const cfg=await cfgRes.json();
    const mod=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
    sb=mod.createClient(cfg.url,cfg.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }

  async function fetchState(){
    const db=await client();
    const auth=await db.auth.getUser();
    if(auth.error||!auth.data?.user)throw new Error('Entre no AllianceOS para carregar a equipe.');
    const [profilesR,invitesR,linksR,brandsR,listsR,tasksR]=await Promise.all([
      db.from('profiles').select('id,nome,email,papel,cargo,ativo').order('nome'),
      db.from('equipe_convites').select('email,nome,nome_clickup,cargo,papel,marcas,enviado_em,aceito_em').order('nome'),
      db.from('legacy_member_links').select('legacy_name,profile_id,migrado_em,tarefas_migradas'),
      db.from('brands').select('id,nome,slug,ativo').eq('ativo',true).order('nome'),
      db.from('task_lists').select('id,nome,brand_id,campanha_id,arquivado_em,arquivado_por').order('nome'),
      db.from('operacional_estado').select('valor').eq('chave',TASKS_KEY).is('dono',null).maybeSingle()
    ]);
    for(const r of [profilesR,invitesR,linksR,brandsR,listsR,tasksR])if(r.error)throw r.error;
    state.profiles=profilesR.data||[];
    state.invites=invitesR.data||[];
    state.links=linksR.data||[];
    state.brands=brandsR.data||[];
    state.tasks=Array.isArray(tasksR.data?.valor)?tasksR.data.valor:[];
    const brandMap=new Map(state.brands.map(b=>[String(b.id),b]));
    state.lists=(listsR.data||[]).map(l=>{
      const b=brandMap.get(String(l.brand_id));
      const count=state.tasks.filter(t=>String(t.listId||'')===String(l.id)||(!t.listId&&norm(t.brand)===norm(b?.nome)&&norm(t.project||'Operação')===norm(l.nome))).length;
      return {...l,marca:b?.nome||null,marca_id:l.brand_id,tarefas:count,arquivada:!!l.arquivado_em};
    });
    state.me=state.profiles.find(p=>String(p.id)===String(auth.data.user.id))||null;

    const realNames=new Set(state.profiles.filter(p=>p.ativo).map(p=>norm(p.nome)));
    const linked=new Set(state.links.map(x=>norm(x.legacy_name)));
    const legacyMap=new Map();
    for(const t of state.tasks){
      for(const name of (Array.isArray(t.assignees)?t.assignees:[])){
        if(!name||realNames.has(norm(name))||linked.has(norm(name)))continue;
        legacyMap.set(name,(legacyMap.get(name)||0)+1);
      }
    }
    const members=[
      ...state.profiles.filter(p=>p.ativo).map(p=>({tipo:'usuario',atribuivel:true,id:String(p.id),nome:p.nome,email:p.email,papel:p.papel,cargo:p.cargo||null})),
      ...state.invites.filter(i=>!i.aceito_em).map(i=>({tipo:'convite',atribuivel:false,id:'invite:'+i.email,nome:i.nome,email:i.email,papel:i.papel,cargo:i.cargo||null,enviado_em:i.enviado_em})),
      ...[...legacyMap.entries()].map(([nome,tarefas])=>({tipo:'legado',atribuivel:false,id:'legacy:'+nome,nome,tarefas}))
    ];
    window.AllianceOSDirectory={members,lists:state.lists.map(l=>({id:String(l.id),nome:l.nome,marca:l.marca,marca_id:String(l.marca_id),campanha_id:l.campanha_id||null,arquivada:l.arquivada,tarefas:l.tarefas})),brands:state.brands};
    window.dispatchEvent(new CustomEvent('allianceos:directory',{detail:window.AllianceOSDirectory}));
    updateShell();
    return state;
  }

  async function ensure(){
    if(loading)return loading;
    loading=fetchState().finally(()=>{loading=null});
    return loading;
  }

  function updateShell(){
    const real=state.profiles.filter(p=>p.ativo);
    const count=real.length;
    document.querySelectorAll('.ref2-workspace-copy span').forEach(x=>x.textContent=count+' membro'+(count===1?'':'s'));
    const team=document.querySelector('.ref2-team');
    if(team){
      team.setAttribute('aria-label','Equipe Alliance · '+count+' membro'+(count===1?'':'s'));
      const shown=real.slice(0,2);
      team.innerHTML=shown.map(p=>'<span class="ref2-team-avatar">'+esc(initials(p.nome))+'</span>').join('')+(count>2?'<span class="ref2-team-avatar more">+'+(count-2)+'</span>':'');
    }
    if(state.me){
      const av=document.querySelector('.ref2-avatar');if(av)av.textContent=initials(state.me.nome);
      const profile=document.querySelector('.ref2-profile');if(profile)profile.setAttribute('aria-label',state.me.nome);
    }
  }

  async function refreshNotifications(){
    const db=await client();
    const r=await db.from('notifications').select('id,kind,title,body,task_id,created_at,read_at').order('created_at',{ascending:false}).limit(100);
    if(r.error)throw r.error;
    state.notifications=r.data||[];
    const unread=state.notifications.filter(n=>!n.read_at).length;
    document.querySelectorAll('.ref2-nav-badge,.ref2-top-badge').forEach(el=>{el.textContent=String(unread);el.style.display=unread?'':'none'});
    return state.notifications;
  }

  async function ensureDueNotifications(){
    if(!state.me)return;
    const db=await client();
    const now=new Date(), horizon=new Date(now.getTime()+24*60*60*1000);
    const candidates=state.tasks.filter(t=>{
      if(t.archivedAt||t.status==='feito')return false;
      if(!(Array.isArray(t.assigneeIds)&&t.assigneeIds.some(id=>String(id)===String(state.me.id))))return false;
      const raw=t.dueAt||(t.due?String(t.due)+'T23:59:59':null);if(!raw)return false;
      const d=new Date(raw);return !Number.isNaN(d.getTime())&&d<=horizon;
    }).slice(0,30);
    if(!candidates.length)return;
    const day=now.toISOString().slice(0,10);
    const keys=candidates.map(t=>'due-reminder:'+String(t.id)+':'+day);
    const existing=await db.from('notifications').select('event_key').eq('user_id',state.me.id).in('event_key',keys);
    if(existing.error)throw existing.error;
    const have=new Set((existing.data||[]).map(x=>x.event_key));
    const rows=candidates.filter((t,i)=>!have.has(keys[i])).map(t=>{
      const raw=t.dueAt||(String(t.due)+'T23:59:59'), d=new Date(raw), overdue=d<now;
      return {user_id:state.me.id,actor_id:state.me.id,kind:'task_due',title:overdue?'Tarefa com prazo vencido':'Prazo próximo',body:t.title||'Tarefa',task_id:String(t.id),event_key:'due-reminder:'+String(t.id)+':'+day};
    });
    if(rows.length){const ins=await db.from('notifications').insert(rows);if(ins.error&&!String(ins.error.message).toLowerCase().includes('duplicate'))throw ins.error}
  }

  async function recordTaskAction(action,task,details){
    try{
      await ensure();if(!state.me)return;
      const db=await client();
      const audit=await db.from('task_action_audit').insert({actor_id:state.me.id,origin:'interface',action,entity_type:'tarefa',entity_id:String(task?.id||''),details:details||{}});
      if(audit.error)console.warn('[AllianceOS audit]',audit.error.message);
      const ids=new Set((Array.isArray(task?.assigneeIds)?task.assigneeIds:[]).map(String).filter(id=>id&&id!==String(state.me.id)));
      const text=String(details?.comentario||'');
      if(text){
        const n=norm(text);
        for(const p of state.profiles.filter(x=>x.ativo)){
          if(String(p.id)===String(state.me.id))continue;
          const full='@'+norm(p.nome), first='@'+norm(String(p.nome||'').split(/\s+/)[0]);
          if(n.includes(full)||n.includes(first))ids.add(String(p.id));
        }
      }
      if(!ids.size)return;
      let title=null,body=null;
      if(action==='criar_tarefa'){title='Nova tarefa atribuída';body=task.title||'Tarefa'}
      else if(action==='comentar_tarefa'){title='Novo comentário: '+(task.title||'Tarefa');body=text.slice(0,500)}
      else if(action==='registrar_entrega'){title='Entrega registrada: '+(task.title||'Tarefa');body=String(details?.entrega||'').slice(0,500)}
      else if(action==='atualizar_tarefa'){title='Tarefa atualizada: '+(task.title||'Tarefa');body=details?.status?'Status: '+details.status:(details?.prazo?'Prazo: '+details.prazo:'Informações atualizadas')}
      else if(action==='definir_dependencia'||action==='remover_dependencia'){title='Dependência alterada: '+(task.title||'Tarefa');body='O fluxo da tarefa foi atualizado.'}
      if(!title)return;
      const stamp=Date.now();
      const rows=[...ids].map(user_id=>({user_id,actor_id:state.me.id,kind:action,title,body,task_id:String(task.id),event_key:'ui:'+action+':'+String(task.id)+':'+stamp}));
      const ins=await db.from('notifications').insert(rows);if(ins.error)console.warn('[AllianceOS notifications]',ins.error.message);
    }catch(e){console.warn('[AllianceOS interface audit]',e)}
  }

  window.AllianceOSOps=Object.assign(window.AllianceOSOps||{},{recordTaskAction});

  function legacyRows(){
    const real=new Set(state.profiles.filter(p=>p.ativo).map(p=>norm(p.nome)));
    const linked=new Set(state.links.map(x=>norm(x.legacy_name)));
    const map=new Map();
    for(const t of state.tasks)for(const name of (Array.isArray(t.assignees)?t.assignees:[])){
      if(!name||real.has(norm(name))||linked.has(norm(name)))continue;
      map.set(name,(map.get(name)||0)+1);
    }
    return [...map.entries()].map(([nome,tarefas])=>({nome,tarefas})).sort((a,b)=>b.tarefas-a.tarefas||a.nome.localeCompare(b.nome,'pt-BR'));
  }

  function panel(){
    let root=document.getElementById('allianceAdminRoot');
    if(root)return root;
    installStyle();
    root=document.createElement('div');root.id='allianceAdminRoot';root.hidden=true;
    root.innerHTML='<div class="ao-admin-backdrop"><section class="ao-admin-panel"><header class="ao-admin-head"><div class="ao-admin-title"><h2>Administração do AllianceOS</h2><p>Membros reais, migração de legado, listas e notificações.</p></div><button class="ao-admin-close" type="button" aria-label="Fechar">×</button><nav class="ao-admin-tabs"><button class="ao-admin-tab" data-ao-tab="members">Membros</button><button class="ao-admin-tab" data-ao-tab="migration">Migração</button><button class="ao-admin-tab" data-ao-tab="lists">Listas</button><button class="ao-admin-tab" data-ao-tab="notifications">Notificações</button></nav></header><div class="ao-admin-body"></div></section></div>';
    document.body.appendChild(root);
    root.querySelector('.ao-admin-close').addEventListener('click',()=>{root.hidden=true});
    root.querySelector('.ao-admin-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)root.hidden=true});
    root.querySelectorAll('[data-ao-tab]').forEach(b=>b.addEventListener('click',()=>render(b.dataset.aoTab)));
    return root;
  }

  function card(title,meta,body){return '<section class="ao-card"><div class="ao-card-head"><h3>'+esc(title)+'</h3><span>'+esc(meta||'')+'</span></div>'+body+'</section>'}
  function roleLabel(p){return p==='admin'?'Admin':'Membro'}

  function renderMembers(){
    const admin=state.me?.papel==='admin';
    const real=state.profiles.filter(p=>p.ativo);
    const pending=state.invites.filter(i=>!i.aceito_em);
    const brandOptions=state.brands.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.nome)+'</option>').join('');
    let html=card('Usuários reais',real.length+' ativos',real.length?real.map(p=>'<div class="ao-row"><span class="ao-avatar">'+esc(initials(p.nome))+'</span><div class="ao-row-main"><b>'+esc(p.nome)+'</b><span>'+esc(p.email)+' · '+esc(p.cargo||'Sem cargo')+'</span></div><span class="ao-chip ok">'+esc(roleLabel(p.papel))+'</span></div>').join(''):'<div class="ao-empty">Nenhum usuário real ativo.</div>');
    html+=card('Convites pendentes',pending.length+' pendente'+(pending.length===1?'':'s'),pending.length?pending.map(i=>'<div class="ao-row"><span class="ao-avatar">'+esc(initials(i.nome))+'</span><div class="ao-row-main"><b>'+esc(i.nome)+'</b><span>'+esc(i.email)+' · '+esc(i.cargo||'Sem cargo')+'</span></div><span class="ao-chip warn">'+esc(roleLabel(i.papel))+'</span></div>').join(''):'<div class="ao-empty">Nenhum convite pendente.</div>');
    if(admin)html+=card('Convidar membro','O convite usa o Auth do Supabase','<form id="aoInviteForm"><div class="ao-grid"><div class="ao-field"><label>Nome</label><input name="nome" required maxlength="200"></div><div class="ao-field"><label>E-mail</label><input name="email" type="email" required></div><div class="ao-field"><label>Cargo</label><input name="cargo" maxlength="200" placeholder="Ex.: Designer"></div><div class="ao-field"><label>Papel</label><select name="papel"><option value="membro">Membro</option><option value="admin">Admin</option></select></div><div class="ao-field" style="grid-column:1/-1"><label>Marcas</label><select name="marcas" multiple>'+brandOptions+'</select></div></div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="ao-btn primary" type="submit">Enviar convite</button></div></form>');
    else html+='<div class="ao-note">Somente administradores podem convidar ou migrar membros.</div>';
    return html;
  }

  function renderMigration(){
    const admin=state.me?.papel==='admin';
    if(!admin)return '<div class="ao-note">Esta área é restrita a administradores.</div>';
    const rows=legacyRows();
    if(!rows.length)return card('Responsáveis legados','0 pendentes','<div class="ao-empty">Todos os nomes legados já foram vinculados ou não existem tarefas com legado.</div>');
    const users=state.profiles.filter(p=>p.ativo);
    const options='<option value="">Escolha um usuário real</option>'+users.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.nome)+' · '+esc(p.email)+'</option>').join('');
    return card('Responsáveis legados',rows.length+' nome'+(rows.length===1?'':'s')+' para revisar','<div class="ao-note warn">A migração troca o responsável nas tarefas, adiciona o user_id real, preserva o histórico e desativa o nome legado para novas atribuições.</div><div style="margin-top:10px">'+rows.map(r=>'<div class="ao-legacy" data-legacy="'+esc(r.nome)+'"><div class="ao-legacy-name"><b>'+esc(r.nome)+'</b><span>'+r.tarefas+' tarefa'+(r.tarefas===1?'':'s')+'</span></div><div class="ao-field"><label>Vincular a</label><select data-legacy-user>'+options+'</select></div><button type="button" class="ao-btn primary" data-migrate>Vincular e migrar</button></div>').join('')+'</div>');
  }

  function renderLists(){
    const admin=state.me?.papel==='admin';
    const active=state.lists.filter(l=>!l.arquivada);
    const suspicious=active.filter(l=>l.tarefas===1);
    const brandOptions=state.brands.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.nome)+'</option>').join('');
    let html=card('Listas ativas',active.length+' listas','<div class="ao-note">Hierarquia oficial: marca → lista/campanha/frente → tarefa → subtarefa. Listas arquivadas continuam preservadas.</div>'+active.map(l=>'<div class="ao-list-row '+(l.tarefas===1?'suspicious':'')+'"><div><b>'+esc(l.nome)+'</b><small>'+esc(l.marca||'Sem marca')+' · '+l.tarefas+' tarefa'+(l.tarefas===1?' · revisar':'s')+'</small></div><div style="display:flex;gap:6px">'+(admin?'<button class="ao-btn" type="button" data-archive-list="'+esc(l.id)+'">Arquivar</button>':'')+'</div>'+(admin&&l.tarefas===1?'<div class="ao-cleaner" style="grid-column:1/-1"><div><small>Essa lista parece uma tarefa importada.</small></div><select data-clean-dest><option value="">Mover a tarefa para...</option>'+active.filter(d=>String(d.id)!==String(l.id)).map(d=>'<option value="'+esc(d.id)+'">'+esc(d.marca)+' · '+esc(d.nome)+'</option>').join('')+'</select><button class="ao-btn primary" type="button" data-clean-source="'+esc(l.id)+'">Mover e arquivar origem</button></div>':'')+'</div>').join(''));
    if(admin)html+=card('Criar lista','Sem exclusão','<form id="aoListForm"><div class="ao-grid"><div class="ao-field"><label>Nome</label><input name="nome" required maxlength="200"></div><div class="ao-field"><label>Marca</label><select name="brand_id" required>'+brandOptions+'</select></div></div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="ao-btn primary" type="submit">Criar lista</button></div></form>');
    if(suspicious.length)html+='<div class="ao-note warn">'+suspicious.length+' lista'+(suspicious.length===1?'':'s')+' com apenas uma tarefa foi/foram destacada(s) para revisão. Nada é convertido automaticamente.</div>';
    return html;
  }

  function renderNotifications(){
    const rows=state.notifications||[];
    return card('Suas notificações',rows.filter(x=>!x.read_at).length+' não lida'+(rows.filter(x=>!x.read_at).length===1?'':'s'),rows.length?rows.map(n=>'<div class="ao-notification '+(!n.read_at?'unread':'')+'" data-notification="'+n.id+'"><span class="ao-notif-dot"></span><div class="ao-notif-copy"><b>'+esc(n.title)+'</b><span>'+esc(n.body||'')+'</span></div>'+(n.task_id?'<button class="ao-btn" type="button" data-open-task="'+esc(n.task_id)+'">Abrir</button>':'')+(!n.read_at?'<button class="ao-btn" type="button" data-read="'+n.id+'">Lida</button>':'')+'</div>').join(''):'<div class="ao-empty">Nenhuma notificação.</div>');
  }

  async function render(tab){
    const root=panel(), body=root.querySelector('.ao-admin-body');
    root.querySelectorAll('[data-ao-tab]').forEach(b=>b.classList.toggle('active',b.dataset.aoTab===tab));
    body.innerHTML='<div class="ao-card"><div class="ao-empty">Carregando…</div></div>';
    try{
      await ensure();
      if(tab==='notifications')await refreshNotifications();
      body.innerHTML=tab==='members'?renderMembers():tab==='migration'?renderMigration():tab==='lists'?renderLists():renderNotifications();
      bindBody(tab,body);
    }catch(e){body.innerHTML='<div class="ao-note warn">'+esc(e?.message||e)+'</div>'}
  }

  function bindBody(tab,body){
    const invite=body.querySelector('#aoInviteForm');
    if(invite)invite.addEventListener('submit',async e=>{
      e.preventDefault();const btn=invite.querySelector('button[type=submit]');btn.disabled=true;
      try{
        const db=await client(), fd=new FormData(invite), email=String(fd.get('email')||'').trim().toLowerCase(), nome=String(fd.get('nome')||'').trim(), cargo=String(fd.get('cargo')||'').trim()||null, papel=String(fd.get('papel')||'membro'), marcas=[...invite.querySelector('[name=marcas]').selectedOptions].map(o=>o.value);
        const row={email,nome,cargo,papel,marcas,criado_por:state.me.id,enviado_em:nowIso()};
        const r=await db.from('equipe_convites').upsert(row,{onConflict:'email'});if(r.error)throw r.error;
        const otp=await db.auth.signInWithOtp({email,options:{emailRedirectTo:APP_URL}});if(otp.error)throw otp.error;
        await db.from('task_action_audit').insert({actor_id:state.me.id,origin:'interface',action:'convidar_membro',entity_type:'membro',entity_id:email,details:{nome,papel,marcas}});
        toast('Convite enviado para '+email);await fetchState();render('members');
      }catch(err){toast(err?.message||String(err));btn.disabled=false}
    });

    body.querySelectorAll('[data-migrate]').forEach(btn=>btn.addEventListener('click',async()=>{
      const row=btn.closest('[data-legacy]'), user=row.querySelector('[data-legacy-user]').value;if(!user){toast('Escolha o usuário real.');return}
      if(!confirm('Migrar todas as tarefas de "'+row.dataset.legacy+'" para o usuário escolhido?'))return;
      btn.disabled=true;
      try{const db=await client();const r=await db.rpc('migrar_responsavel_legado',{p_legacy_name:row.dataset.legacy,p_profile_id:user});if(r.error)throw r.error;toast((r.data?.tarefas_migradas||0)+' tarefa(s) migrada(s).');setTimeout(()=>location.reload(),500)}catch(e){toast(e?.message||String(e));btn.disabled=false}
    }));

    const listForm=body.querySelector('#aoListForm');
    if(listForm)listForm.addEventListener('submit',async e=>{
      e.preventDefault();const btn=listForm.querySelector('button[type=submit]');btn.disabled=true;
      try{const db=await client(),fd=new FormData(listForm);const row={nome:String(fd.get('nome')||'').trim(),brand_id:String(fd.get('brand_id')||''),criado_por:state.me.id};const r=await db.from('task_lists').insert(row).select('id').single();if(r.error)throw r.error;await db.from('task_action_audit').insert({actor_id:state.me.id,origin:'interface',action:'criar_lista',entity_type:'lista',entity_id:String(r.data.id),details:{nome:row.nome,brand_id:row.brand_id}});toast('Lista criada.');await fetchState();render('lists')}catch(err){toast(err?.message||String(err));btn.disabled=false}
    });

    body.querySelectorAll('[data-archive-list]').forEach(btn=>btn.addEventListener('click',async()=>{
      if(!confirm('Arquivar esta lista? As tarefas não serão apagadas.'))return;btn.disabled=true;
      try{const db=await client(),id=btn.dataset.archiveList;const r=await db.from('task_lists').update({arquivado_em:nowIso(),arquivado_por:state.me.id}).eq('id',id);if(r.error)throw r.error;await db.from('task_action_audit').insert({actor_id:state.me.id,origin:'interface',action:'arquivar_lista',entity_type:'lista',entity_id:id,details:{}});toast('Lista arquivada.');await fetchState();render('lists')}catch(e){toast(e?.message||String(e));btn.disabled=false}
    }));

    body.querySelectorAll('[data-clean-source]').forEach(btn=>btn.addEventListener('click',async()=>{
      const row=btn.closest('.ao-list-row'), dest=row.querySelector('[data-clean-dest]').value;if(!dest){toast('Escolha a lista de destino.');return}
      if(!confirm('Mover a tarefa para a lista escolhida e arquivar a lista de origem?'))return;btn.disabled=true;
      try{const db=await client();const r=await db.rpc('consolidar_lista_em_destino',{p_source_list:btn.dataset.cleanSource,p_dest_list:dest});if(r.error)throw r.error;toast((r.data?.tarefas_movidas||0)+' tarefa(s) movida(s).');setTimeout(()=>location.reload(),500)}catch(e){toast(e?.message||String(e));btn.disabled=false}
    }));

    body.querySelectorAll('[data-read]').forEach(btn=>btn.addEventListener('click',async()=>{
      try{const db=await client();const r=await db.from('notifications').update({read_at:nowIso()}).eq('id',Number(btn.dataset.read));if(r.error)throw r.error;await refreshNotifications();render('notifications')}catch(e){toast(e?.message||String(e))}
    }));
    body.querySelectorAll('[data-open-task]').forEach(btn=>btn.addEventListener('click',()=>{location.href=taskLink(btn.dataset.openTask)}));
  }

  async function open(tab){
    const root=panel();root.hidden=false;await render(tab||'members');
  }

  window.AllianceOSAdmin={open,openNotifications:()=>open('notifications'),refresh:async()=>{await fetchState();await refreshNotifications()}};

  function wireShell(){
    const settings=document.querySelector('.ref2-nav-btn[data-key="settings"]');
    if(settings&&!settings.dataset.aoBound){settings.dataset.aoBound='1';settings.addEventListener('click',e=>{e.stopImmediatePropagation();open('members')},true)}
    const notifications=document.querySelector('.ref2-nav-btn[data-key="notifications"]');
    if(notifications&&!notifications.dataset.aoBound){notifications.dataset.aoBound='1';notifications.addEventListener('click',e=>{e.stopImmediatePropagation();open('notifications')},true)}
    const bell=document.querySelector('.ref2-top-bell');
    if(bell&&!bell.dataset.aoBound){bell.dataset.aoBound='1';bell.addEventListener('click',e=>{e.stopImmediatePropagation();open('notifications')},true)}
    const team=document.querySelector('.ref2-team');
    if(team&&!team.dataset.aoBound){team.dataset.aoBound='1';team.addEventListener('click',e=>{e.stopImmediatePropagation();open('members')},true)}
  }

  async function start(){
    installStyle();wireShell();
    try{
      await fetchState();
      wireShell();
      await ensureDueNotifications();
      await refreshNotifications();
    }catch(e){console.warn('[AllianceOS admin]',e)}
    setInterval(()=>{refreshNotifications().catch(()=>{})},30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('focus',()=>{wireShell();refreshNotifications().catch(()=>{})});
})();

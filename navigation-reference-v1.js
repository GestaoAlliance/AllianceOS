
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
            <img src="/api/brand-icon?format=svg&v=20260922-2" alt="AllianceOS" style="width:46px;height:46px;display:block;object-fit:contain">
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
    const directory=window.AllianceOSDirectory;
    if(directory?.loaded){
      const current=select.value;
      const brands=Array.isArray(directory.brands)?directory.brands:[];
      select.replaceChildren();
      for(const b of brands){
        const o=document.createElement('option');
        o.textContent=b.nome;o.value=b.nome;o.dataset.brandId=b.id||'';o.dataset.brandPhoto=b.foto_url||'';select.appendChild(o);
      }
      const all=document.createElement('option');all.textContent='Todas as marcas';all.value='Todas as marcas';select.appendChild(all);
      const allowed=[...select.options].map(o=>o.value);
      select.value=allowed.includes(current)?current:(brands[0]?.nome||'Todas as marcas');
      return current!==select.value;
    }
    return false;
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
    head.innerHTML='<div class="ref2-sidebar-logo"><img src="/api/brand-icon?format=svg&v=20260922-2" alt="" aria-hidden="true"></div><div class="ref2-sidebar-name">AllianceOS</div>';

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
        if(key==='campaigns'){
          openStrategyMap();
          return;
        }
        if(key==='settings'){
          const liveBrand=byId('brandSelect');
          const opt=liveBrand?.selectedOptions?.[0];
          const brandId=opt?.dataset?.brandId||'';
          if(brandId&&window.AllianceOSAdmin?.openBrand)window.AllianceOSAdmin.openBrand(brandId);
          else if(window.AllianceOSAdmin?.open)window.AllianceOSAdmin.open('brands');
          else if(target)target.click();
          return;
        }
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
    const workspace=document.createElement('div');workspace.className='ref2-workspace';
    workspace.setAttribute('aria-label','Selecionar marca');
    workspace.innerHTML='<span class="ref2-workspace-icon">♛</span><span class="ref2-workspace-copy"><strong>Botanika</strong><span>6 membros</span></span><span class="ref2-workspace-arrow">⌄</span>';

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
    topLogo.innerHTML='<div class="ref2-top-logo-icon"><img src="/api/brand-icon?format=svg&v=20260922-2" alt="" aria-hidden="true"></div><div class="ref2-top-logo-name">AllianceOS</div>';

    if(brand){
      ensureBrands(brand);
      brand.className='ref2-workspace-select';
      workspace.style.setProperty('position','relative','important');
      workspace.style.setProperty('overflow','visible','important');
      brand.style.setProperty('position','absolute','important');
      brand.style.setProperty('inset','0','important');
      brand.style.setProperty('left','0','important');
      brand.style.setProperty('top','0','important');
      brand.style.setProperty('right','0','important');
      brand.style.setProperty('bottom','0','important');
      brand.style.setProperty('width','100%','important');
      brand.style.setProperty('height','100%','important');
      brand.style.setProperty('min-width','0','important');
      brand.style.setProperty('min-height','0','important');
      brand.style.setProperty('margin','0','important');
      brand.style.setProperty('padding','0','important');
      brand.style.setProperty('opacity','0','important');
      brand.style.setProperty('visibility','visible','important');
      brand.style.setProperty('cursor','pointer','important');
      brand.style.setProperty('pointer-events','none','important');
      brand.style.setProperty('z-index','6','important');
      brand.style.setProperty('border','0','important');
      brand.style.setProperty('border-radius','0','important');
      brand.style.setProperty('background','transparent','important');
      brand.style.setProperty('box-shadow','none','important');
      brand.style.setProperty('color','transparent','important');
      brand.style.setProperty('transform','none','important');
      brand.style.setProperty('appearance','auto','important');
      brand.style.setProperty('-webkit-appearance','menulist','important');
      workspace.appendChild(brand);
      const syncWorkspace=()=>{
        const value=brand.value;
        const displayValue=/todas/i.test(value)?'Todas as marcas':value;
        const directory=window.AllianceOSDirectory||{};
        const isAll=/todas/i.test(value);
        const realInfo=(directory.brands||[]).find(x=>String(x.nome||'')===String(value||''));
        const info=realInfo||(isAll?directory.allBrandsProfile:null);
        const members=(directory.members||[]).filter(x=>x?.tipo==='usuario');
        const memberships=directory.brandMemberships||[];
        const memberCount=!isAll&&realInfo
          ? members.filter(m=>m.papel==='admin'||memberships.some(x=>String(x.profile_id)===String(m.id)&&String(x.brand_id)===String(realInfo.id))).length
          : members.length;
        const title=q('.ref2-workspace-copy strong');if(title)title.textContent=displayValue;
        const sub=q('.ref2-workspace-copy span');if(sub)sub.textContent=memberCount+' membro'+(memberCount===1?'':'s');
        const icon=q('.ref2-workspace-icon');
        if(icon){
          if(info?.foto_url){
            icon.innerHTML='<img src="'+info.foto_url.replace(/"/g,'&quot;')+'" crossorigin="anonymous" data-brand-photo="1" alt="" style="'+(info?.configuracoes?.avatar_crop_version===2?'':'transform:scale(1.125);')+'">';
            icon.style.background='#fff';icon.style.color='inherit';
          }else if(info&&!isAll){
            icon.textContent=(String(info.nome||'M')[0]||'M').toUpperCase();
            icon.style.background=info.cor||'#eef1f2';icon.style.color='#fff';
          }else{
            icon.textContent='✦';icon.style.background=info?.cor||'#f1f3f4';icon.style.color='#5d6770';
          }
        }
        workspace.dataset.brand=String(value||'');
        workspace.setAttribute('aria-label','Marca atual: '+displayValue+'. '+memberCount+' membro'+(memberCount===1?'':'s')+'. Clique para trocar.');

        const cfg=(info?.configuracoes&&typeof info.configuracoes==='object')?info.configuracoes:{};
        const modules=(cfg.modules&&typeof cfg.modules==='object')?cfg.modules:{};
        btns.forEach((button,key)=>{
          const alwaysVisible=key==='settings';
          button.hidden=!alwaysVisible&&modules[key]===false;
        });
        document.documentElement.dataset.brandCompact=cfg.compact_mode===true?'true':'false';
        document.documentElement.style.setProperty('--alliance-brand-color',info?.cor||'#111519');
        document.documentElement.dataset.brandId=info?.id||'';
        document.documentElement.dataset.brandSlug=info?.slug||'';
      };
      const openDefaultView=()=>{
        const value=brand.value;
        const directory=window.AllianceOSDirectory||{};
        const isAll=/todas/i.test(value);
        const info=(directory.brands||[]).find(x=>String(x.nome||'')===String(value||''))||(isAll?directory.allBrandsProfile:null);
        const cfg=(info?.configuracoes&&typeof info.configuracoes==='object')?info.configuracoes:{};
        const view=String(cfg.default_view||'inicio');
        const map={inicio:'home',tarefas:'tasks',campanhas:'campaigns',entregas:'deliveries'};
        const key=map[view]||'home';
        const button=btns.get(key);
        if(button&&!button.hidden)button.click();
      };
      brand.addEventListener('change',()=>{syncWorkspace();openDefaultView();});syncWorkspace();
      window.addEventListener('allianceos:directory',()=>{
        const changed=ensureBrands(brand);
        syncWorkspace();
        if(changed)brand.dispatchEvent(new Event('change',{bubbles:true}));
      });

      workspace.setAttribute('role','button');
      workspace.setAttribute('tabindex','0');
      workspace.style.setProperty('cursor','pointer','important');

      // Custom brand menu instead of the browser's native select picker.
      // The native picker was opening and immediately closing in Chrome.
      const brandMenu=document.createElement('div');
      brandMenu.className='ref2-workspace-menu';
      brandMenu.setAttribute('role','listbox');
      brandMenu.hidden=true;
      Object.assign(brandMenu.style,{
        position:'absolute',
        left:'0',
        right:'0',
        bottom:'calc(100% + 8px)',
        zIndex:'9999',
        padding:'6px',
        border:'1px solid #dfe4e7',
        borderRadius:'12px',
        background:'#fff',
        boxShadow:'0 14px 34px rgba(20,28,34,.14)',
        maxHeight:'260px',
        overflowY:'auto'
      });
      workspace.appendChild(brandMenu);

      const renderBrandMenu=()=>{
        brandMenu.replaceChildren();
        [...brand.options].forEach((opt)=>{
          const value=opt.value||opt.textContent;
          const btn=document.createElement('button');
          btn.type='button';
          btn.setAttribute('role','option');
          btn.setAttribute('aria-selected',String(value===brand.value));
          const isAll=/todas/i.test(value);
          const directory=window.AllianceOSDirectory||{};
          const info=(directory.brands||[]).find(x=>String(x.nome||'')===String(value||''))||(isAll?directory.allBrandsProfile:null);
          const scale=info?.configuracoes?.avatar_crop_version===2?'':'transform:scale(1.125);';
          const avatar=info?.foto_url
            ? '<span style="width:24px;height:24px;border-radius:7px;overflow:hidden;display:grid;place-items:center;background:#f1f3f4;flex:0 0 24px;position:relative"><img src="'+info.foto_url.replace(/"/g,'&quot;')+'" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;'+scale+'"></span>'
            : '<span style="width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:'+(info?.cor||'#f1f3f4')+';color:'+(!isAll&&info?'#fff':'#657078')+';font:750 10px Inter,system-ui;flex:0 0 24px">'+(!isAll&&info?(String(info.nome||'M')[0]||'M').toUpperCase():'✦')+'</span>';
          btn.innerHTML=avatar+'<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+opt.textContent+'</span>';
          Object.assign(btn.style,{
            width:'100%',
            height:'38px',
            padding:'0 10px',
            border:'0',
            borderRadius:'9px',
            background:value===brand.value?'#f1f4f5':'transparent',
            color:'#252b30',
            textAlign:'left',
            display:'flex',alignItems:'center',gap:'9px',
            font:'600 11px/1 Inter,system-ui,sans-serif',
            cursor:'pointer'
          });
          btn.addEventListener('mouseenter',()=>{if(value!==brand.value)btn.style.background='#f7f8f9';});
          btn.addEventListener('mouseleave',()=>{btn.style.background=value===brand.value?'#f1f4f5':'transparent';});
          btn.addEventListener('click',(e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(brand.value!==value){
              brand.value=value;
              brand.dispatchEvent(new Event('change',{bubbles:true}));
            }
            brandMenu.hidden=true;
            const arrow=q('.ref2-workspace-arrow',workspace);if(arrow)arrow.textContent='⌄';
          });
          brandMenu.appendChild(btn);
        });
      };

      const setBrandMenuOpen=(open)=>{
        if(open)renderBrandMenu();
        brandMenu.hidden=!open;
        const arrow=q('.ref2-workspace-arrow',workspace);if(arrow)arrow.textContent=open?'⌃':'⌄';
      };

      workspace.addEventListener('click',(e)=>{
        if(brandMenu.contains(e.target))return;
        e.preventDefault();
        e.stopPropagation();
        setBrandMenuOpen(brandMenu.hidden);
      });
      workspace.addEventListener('keydown',(e)=>{
        if(e.key==='Enter'||e.key===' '){
          e.preventDefault();
          setBrandMenuOpen(brandMenu.hidden);
        }else if(e.key==='Escape'){
          setBrandMenuOpen(false);
        }
      });
      brandMenu.addEventListener('click',(e)=>e.stopPropagation());
      document.addEventListener('click',(e)=>{
        if(!workspace.contains(e.target))setBrandMenuOpen(false);
      });
    }

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

    // The topbar must contain ONLY search + actions. If any legacy code
    // tries to put the old brand selector back here, move the live selector
    // to the sidebar workspace and discard the legacy wrapper.
    toolbar.replaceChildren(searchWrap,actions);
    const allowedToolbarChildren=new Set([searchWrap,actions]);
    const sanitizeToolbar=()=>{
      [...toolbar.children].forEach(child=>{
        if(allowedToolbarChildren.has(child))return;
        const nestedBrand=child.matches?.('#brandSelect')?child:child.querySelector?.('#brandSelect');
        if(nestedBrand===brand && brand.parentElement!==workspace)workspace.appendChild(brand);
        child.remove();
      });
      if(brand && toolbar.contains(brand) && brand.parentElement!==workspace)workspace.appendChild(brand);
    };
    sanitizeToolbar();
    const toolbarObserver=new MutationObserver(sanitizeToolbar);
    toolbarObserver.observe(toolbar,{childList:true});

    // Canonical desktop toolbar geometry.
    // Brand selection lives in the sidebar workspace card; search now owns
    // the full available toolbar width up to the notification/profile actions.
    const setImportant=(el,prop,value)=>el?.style.setProperty(prop,value,'important');
    const alignToolbar=()=>{
      if(window.innerWidth<901)return;

      const inset=12;
      const desiredSearchActionsGap=24;

      setImportant(toolbar,'display','block');
      setImportant(toolbar,'position','sticky');
      setImportant(toolbar,'top','12px');
      setImportant(toolbar,'padding','0');
      setImportant(toolbar,'height','66px');
      setImportant(toolbar,'min-height','66px');
      setImportant(toolbar,'overflow','visible');

      setImportant(actions,'position','absolute');
      setImportant(actions,'right',inset+'px');
      setImportant(actions,'top','50%');
      setImportant(actions,'transform','translateY(-50%)');
      setImportant(actions,'margin','0');

      setImportant(searchWrap,'position','absolute');
      setImportant(searchWrap,'left',inset+'px');
      setImportant(searchWrap,'top','50%');
      setImportant(searchWrap,'transform','translateY(-50%)');
      setImportant(searchWrap,'height','46px');
      setImportant(searchWrap,'width','auto');
      setImportant(searchWrap,'min-width','0');
      setImportant(searchWrap,'max-width','none');
      setImportant(searchWrap,'margin','0');

      requestAnimationFrame(()=>{
        const barRect=toolbar.getBoundingClientRect();
        const actionsRect=actions.getBoundingClientRect();
        const rightReserve=Math.max(
          inset,
          Math.round((barRect.right-actionsRect.left)+desiredSearchActionsGap)
        );
        setImportant(searchWrap,'right',rightReserve+'px');

        requestAnimationFrame(()=>{
          const bar=toolbar.getBoundingClientRect();
          const searchRect=searchWrap.getBoundingClientRect();
          const actionRect=actions.getBoundingClientRect();
          const metrics={
            searchLeftInset:Math.round(searchRect.left-bar.left),
            searchActionsGap:Math.round(actionRect.left-searchRect.right),
            rightInset:Math.round(bar.right-actionRect.right)
          };
          window.__allianceToolbarGeometry=metrics;
          toolbar.dataset.layoutVerified=(
            Math.abs(metrics.searchLeftInset-inset)<=1 &&
            Math.abs(metrics.rightInset-inset)<=1 &&
            metrics.searchActionsGap>=desiredSearchActionsGap-1
          )?'1':'0';
          if(toolbar.dataset.layoutVerified!=='1')console.warn('[AllianceOS toolbar geometry]',metrics);
        });
      });
    };

    alignToolbar();
    window.addEventListener('resize',alignToolbar,{passive:true});

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

    function openCampaignDirectory(){
      syncTaskCampaignIds();
      window.__centralShowCampaigns?.();
      setActive('campaigns');
      setTimeout(()=>{
        const overview=document.querySelector('#campaignsView [data-camp-view="overview"]');
        if(overview) overview.click();
        document.getElementById('campaignOverviewList')?.classList.remove('hidden');
        document.getElementById('campaignWorkspace')?.classList.remove('active');
        installUnifiedStrategyNav('campaigns');
      },45);
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
            openCampaignDirectory();
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
      campanhas:openCampaignDirectory,
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

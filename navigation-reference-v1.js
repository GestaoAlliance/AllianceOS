
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
    settings:svg('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1A7 7 0 0 0 14.7 6L14.4 3H9.6L9.3 6a7 7 0 0 0-1.7 1.1l-2.5-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1A7 7 0 0 0 9.3 18l.3 3h4.8l.3-3a7 7 0 0 0 1.7-1.1l2.5 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/>')
  };
  function buttonHTML(icon,label,badge=false){
    return '<span class="icon">'+ICONS[icon]+'</span><span class="ref-nav-label">'+label+'</span>'+(badge?'<span class="ref-notification-badge">37</span>':'');
  }
  function proxy(label,icon,onClick){
    const b=document.createElement('button');
    b.type='button'; b.className='ref-nav-proxy'; b.dataset.label=label;
    b.innerHTML=buttonHTML(icon,label,false);
    b.addEventListener('click',onClick);
    return b;
  }
  function toast(msg){
    if(typeof window.showToast==='function'){window.showToast(msg);return}
    const old=q('.ref-nav-toast'); if(old)old.remove();
    const n=document.createElement('div');n.className='ref-nav-toast';n.textContent=msg;
    Object.assign(n.style,{position:'fixed',right:'24px',bottom:'24px',zIndex:'9999',padding:'11px 14px',borderRadius:'10px',background:'#111519',color:'#fff',font:'600 11px Inter,system-ui',boxShadow:'0 10px 28px rgba(0,0,0,.16)'});
    document.body.appendChild(n);setTimeout(()=>n.remove(),1800);
  }
  function ensureBrands(select){
    ['Botanika','Revita','VermeFree','Shoty','Todas as marcas'].forEach(name=>{
      if(![...select.options].some(o=>o.textContent.trim()===name)){
        const o=document.createElement('option');o.textContent=name;o.value=name;select.appendChild(o);
      }
    });
  }
  function setupSidebar(){
    const sidebar=q('.sidebar'), nav=q('.nav',sidebar); if(!sidebar||!nav)return;
    q('.brandmark',sidebar)?.setAttribute('aria-label','AllianceOS');
    const title=q('.brandtitle strong',sidebar); if(title)title.textContent='AllianceOS';

    const home=byId('homeNav'), tasks=byId('tasksNav'), campaigns=byId('campaignsNav'), deliveries=byId('deliveriesNav'),
          notices=byId('notificationsBtn'), reports=byId('painelNav'), settings=byId('customizeSidebarBtn'), planning=byId('planningNav');

    if(home){home.innerHTML=buttonHTML('home','Início');home.dataset.label='Início'}
    if(tasks){tasks.innerHTML=buttonHTML('tasks','Tarefas');tasks.dataset.label='Tarefas'}
    if(campaigns){campaigns.innerHTML=buttonHTML('campaigns','Campanhas');campaigns.dataset.label='Campanhas'}
    if(deliveries){deliveries.innerHTML=buttonHTML('deliveries','Entregas');deliveries.dataset.label='Entregas'}
    if(notices){notices.innerHTML=buttonHTML('notifications','Notificações',true);notices.dataset.label='Notificações';notices.querySelectorAll('.badge,.navcount').forEach(x=>x.remove())}
    if(reports){reports.innerHTML=buttonHTML('reports','Relatórios');reports.dataset.label='Relatórios'}
    if(settings){settings.innerHTML=buttonHTML('settings','Configurações');settings.dataset.label='Configurações'}
    if(planning)planning.style.display='none';

    const clients=proxy('Clientes','clients',()=>toast('Clientes · módulo em preparação.'));
    const automations=proxy('Automações','automations',()=>toast('Automações · módulo em preparação.'));

    nav.innerHTML='';
    [home,tasks,campaigns,deliveries,clients,automations,notices,reports,settings].filter(Boolean).forEach(x=>nav.appendChild(x));

    q('.ref-workspace-card',sidebar)?.remove();
    const card=document.createElement('button');card.type='button';card.className='ref-workspace-card';
    card.innerHTML='<span class="ref-workspace-crown">♛</span><span class="ref-workspace-copy"><strong>Botanika</strong><span>6 membros</span></span><span class="ref-workspace-arrow">›</span>';
    card.addEventListener('click',()=>q('#brandSelect')?.focus());
    const profile=q('.profile',sidebar);
    sidebar.insertBefore(card,profile||null);
  }
  function setupToolbar(){
    const toolbar=q('.global-toolbar'); if(!toolbar)return;
    const select=byId('brandSelect');
    const search=q('.global-search',toolbar)||q('.global-search');

    // Preserve the real controls and remove every legacy wrapper/control from the topbar.
    if(select){ensureBrands(select);select.remove()}
    if(search){search.remove();q('.ref-command-hint',search)?.remove()}

    toolbar.replaceChildren();

    if(select){
      const wrap=document.createElement('div');wrap.className='ref-brand-picker';wrap.appendChild(select);toolbar.appendChild(wrap);
      const updateWorkspace=()=>{
        const strong=q('.ref-workspace-copy strong');
        if(strong)strong.textContent=/todas/i.test(select.value)?'Todas as marcas':select.value;
      };
      select.addEventListener('change',updateWorkspace);updateWorkspace();
    }

    if(search){
      const input=q('input',search); if(input)input.placeholder='Buscar tarefas, campanhas, entregas...';
      const h=document.createElement('span');h.className='ref-command-hint';h.innerHTML='<kbd>⌘</kbd><kbd>K</kbd>';search.appendChild(h);
      toolbar.appendChild(search);
    }

    const actions=document.createElement('div');actions.className='ref-top-actions';
    const bell=document.createElement('button');bell.type='button';bell.className='ref-top-bell';bell.setAttribute('aria-label','Notificações');
    bell.innerHTML=ICONS.notifications+'<span class="ref-top-badge">37</span>';
    bell.addEventListener('click',()=>byId('notificationsBtn')?.click());
    const profile=document.createElement('button');profile.type='button';profile.className='ref-top-profile';profile.setAttribute('aria-label','Perfil');
    profile.innerHTML='<span class="ref-top-avatar">VG</span><svg class="ref-top-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>';
    profile.addEventListener('click',()=>toast('Perfil de Vitor Gutierrez'));
    actions.append(bell,profile);
    toolbar.appendChild(actions);
  }
  function init(){setupSidebar();setupToolbar()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

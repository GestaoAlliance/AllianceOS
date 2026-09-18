/* AllianceOS · Reference Workspace V11
   Final presentation layer inspired by the approved task/campaign reference.
   Injected after V3/V5/V7 inside the native task IIFE, preserving the real data model. */
{
  const v11Esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const v11Short = (name='') => String(name||'').split('|')[0].trim();
  const v11Initials = (name='') => v11Short(name).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || '—';
  const v11StatusLabel = (status='') => ({
    'a fazer':'Pendente','fazendo':'Em andamento','revisar':'Em revisão',
    'ajustes necessários':'Bloqueada','feito':'Concluída'
  }[status] || status || 'Pendente');
  const v11PriorityLabel = (p='') => ({urgent:'Urgente',high:'Alta',normal:'Normal',low:'Baixa'}[p] || p || 'Normal');
  const v11Date = (iso) => {
    if (!iso) return 'Sem prazo';
    const parts=String(iso).split('-');
    if(parts.length===3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return String(iso);
  };
  const v11CampaignRows = () => {
    try {
      const rows=JSON.parse(localStorage.getItem(`central.campaigns.${user.id}`)||'[]');
      return Array.isArray(rows)?rows:[];
    } catch { return []; }
  };
  const v11CampaignFor = (t) => {
    const rows=v11CampaignRows();
    if(t?.campaignId){
      const byId=rows.find(c=>String(c.id||c.name||'')===String(t.campaignId));
      if(byId) return byId;
    }
    return rows.find(c=>(!t?.brand||!c.brand||c.brand===t.brand) && c.name===t?.project) || null;
  };
  const v11Channel = (t) => {
    const c=v11CampaignFor(t);
    const raw=c?.channel||c?.canal||c?.channels||c?.canais||c?.format||'';
    if(Array.isArray(raw)) return raw[0]||'Operação';
    const txt=String(raw||'').trim();
    return txt ? txt.split(',')[0].trim() : 'Operação';
  };
  const v11Task = (id) => taskData.find(x=>String(x.id)===String(id))||null;
  const v11Deps = (t) => (t.dependencies||[]).map(v11Task).filter(Boolean);
  const v11Blocked = (t) => v11Deps(t).some(x=>x.status!=='feito');
  const v11Next = (t) => taskData.filter(x=>(x.dependencies||[]).some(id=>String(id)===String(t.id)));
  const v11SameCampaign = (t) => {
    const exactId=t?.campaignId?String(t.campaignId):'';
    let rows=taskData.filter(x=>{
      if(String(x.brand||'')!==String(t.brand||'')) return false;
      if(exactId) return String(x.campaignId||'')===exactId;
      return String(x.project||'Operação')===String(t.project||'Operação');
    });
    if(!rows.some(x=>String(x.id)===String(t.id))) rows=[t,...rows];
    if(rows.length===1){
      const root=t.parentTaskId?v11Task(t.parentTaskId):null;
      if(root) rows=[root,t,...v11Next(root)];
    }
    return [...new Map(rows.filter(Boolean).map(x=>[String(x.id),x])).values()];
  };
  function v11OrderedCampaignTasks(t){
    const rows=v11SameCampaign(t), ids=new Set(rows.map(x=>String(x.id))), out=[], seen=new Set();
    const byDue=(a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')) || String(a.title||'').localeCompare(String(b.title||''),'pt-BR');
    const roots=rows.filter(x=>!(x.dependencies||[]).some(id=>ids.has(String(id)))).sort(byDue);
    const walk=(node)=>{
      if(!node||seen.has(String(node.id))) return;
      seen.add(String(node.id)); out.push(node);
      rows.filter(x=>(x.dependencies||[]).some(id=>String(id)===String(node.id))).sort(byDue).forEach(walk);
    };
    roots.forEach(walk);
    rows.slice().sort(byDue).forEach(walk);
    return out;
  }
  function v11Avatar(name){
    const p=window.ALLIANCE_AUTH?.getProfile?.();
    const currentName=v11Short(p?.nome||'');
    const short=v11Short(name);
    if(p?.foto_url && currentName && (short===currentName || short.startsWith(currentName.split(' ')[0]))) {
      return `<span class="v11-avatar"><img src="${v11Esc(p.foto_url)}" alt=""></span>`;
    }
    return `<span class="v11-avatar">${v11Esc(v11Initials(short))}</span>`;
  }
  function v11Persist(t, rerender=true){
    try{ localStorage.setItem(taskStorageKey,JSON.stringify(taskData)); }catch{}
    try{ updateTaskCount(); }catch{}
    try{ if(rerender) renderTaskDetailBody(t); }catch{}
    try{ renderTasks(); }catch{}
  }
  function v11CampaignPane(t, tasks){
    const done=tasks.filter(x=>x.status==='feito').length, total=Math.max(tasks.length,1);
    const pct=Math.round(done/total*100);
    const c=v11CampaignFor(t);
    const subtitle=[v11Channel(t), c?.start&&c?.end?`${v11Date(c.start)} — ${v11Date(c.end)}`:''].filter(Boolean).join(' · ');
    return `<aside class="v11-flow-pane">
      <div class="v11-flow-head">
        <div class="v11-flow-title"><span class="v11-flow-icon">⌘</span><div><strong>Execução da Campanha</strong><small>${v11Esc(subtitle||t.brand||'AllianceOS')}</small></div><span class="v11-caret">⌃</span></div>
        <span class="v11-status-pill ${t.status==='feito'?'done':'active'}">${t.status==='feito'?'Concluída':'Em andamento'}</span>
        <div class="v11-progress-meta"><strong>${done} de ${total} tarefas concluídas</strong><span>${pct}%</span></div>
        <div class="v11-progress"><i style="width:${pct}%"></i></div>
      </div>
      <div class="v11-flow-list">
        ${tasks.map((x,i)=>{
          const done=x.status==='feito', blocked=!done&&v11Blocked(x), active=String(x.id)===String(t.id);
          const state=done?'done':blocked?'blocked':active?'active':'pending';
          const owner=(x.assignees||[])[0]||'Sem responsável';
          return `<button type="button" class="v11-flow-step ${state}" data-v11-task="${v11Esc(x.id)}">
            <span class="v11-step-dot">${done?'✓':i+1}</span>
            <span class="v11-step-card">
              <span class="v11-step-title">${v11Esc(x.title||'Tarefa')}</span>
              <span class="v11-step-state">${done?'Concluída':blocked?'Bloqueada':active?'Em andamento':v11StatusLabel(x.status)}</span>
              ${active?v11Avatar(owner):''}
            </span>
          </button>`;
        }).join('')}
      </div>
      <div class="v11-flow-foot"><span>${v11Esc(t.brand||'Alliance')}</span><small>${total} etapas</small></div>
    </aside>`;
  }
  function v11Hero(t,tasks){
    const index=Math.max(0,tasks.findIndex(x=>String(x.id)===String(t.id)));
    const campaign=t.project||'Operação', channel=v11Channel(t), priority=v11PriorityLabel(t.priority);
    return `<section class="v11-task-hero">
      <div class="v11-hero-toolbar">
        <button type="button" class="v11-icon-btn" data-v11-close aria-label="Voltar">←</button>
        <span class="v11-toolbar-spacer"></span>
        <button type="button" class="v11-icon-btn" aria-label="Mais opções">•••</button>
        <button type="button" class="v11-icon-btn" data-v11-prev ${index<=0?'disabled':''}>‹</button>
        <span class="v11-pager">${index+1} de ${tasks.length}</span>
        <button type="button" class="v11-icon-btn" data-v11-next ${index>=tasks.length-1?'disabled':''}>›</button>
      </div>
      <span class="v11-kicker">▣ &nbsp; TAREFA</span>
      <input class="v11-title-input" value="${v11Esc(t.title||'')}" aria-label="Título da tarefa">
      <p class="v11-subtitle">${v11Esc(t.description||`Etapa de execução da campanha ${campaign}.`)}</p>
      <div class="v11-chips">
        <span class="v11-chip channel">${v11Esc(channel)}</span>
        <span class="v11-chip campaign">▣ ${v11Esc(campaign)}</span>
        <span class="v11-chip priority ${v11Esc(t.priority||'normal')}">● ${v11Esc(priority)}</span>
      </div>
    </section>`;
  }
  function v11Card(title, icon, cls=''){
    const el=document.createElement('section');
    el.className=`v11-side-card ${cls}`.trim();
    el.innerHTML=`<div class="v11-card-title"><span>${icon}</span><strong>${v11Esc(title)}</strong></div><div class="v11-card-body"></div>`;
    return el;
  }
  function v11InfoRow(label,value,klass=''){
    return `<div class="v11-info-row ${klass}"><span>${v11Esc(label)}</span><strong>${v11Esc(value||'—')}</strong></div>`;
  }
  function v11DecorateShell(){
    const nav=document.querySelector('.sidebar .nav');
    if(!nav || nav.dataset.v11Done) return;
    nav.dataset.v11Done='1';
    document.querySelectorAll('.sidebar .navgroup').forEach(x=>x.style.display='none');
    const hidden=['painelNav','planningNav','customizeSidebarBtn'];
    hidden.forEach(id=>document.getElementById(id)?.classList.add('v11-hidden-nav'));
    const order=['homeNav','tasksNav','campaignsNav','deliveriesNav'];
    order.forEach(id=>{const el=document.getElementById(id);if(el) nav.appendChild(el);});
    const svg=(type)=>{
      const paths={
        clientes:'<circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6"></path><path d="M16 8.5a2.5 2.5 0 1 1 0 5"></path><path d="M17 14c2 .5 3.2 2 3.5 5"></path>',
        automacoes:'<path d="M12 3v4"></path><path d="M12 17v4"></path><path d="m5.6 5.6 2.8 2.8"></path><path d="m15.6 15.6 2.8 2.8"></path><path d="M3 12h4"></path><path d="M17 12h4"></path><circle cx="12" cy="12" r="3"></circle>',
        relatorios:'<path d="M5 19V9"></path><path d="M10 19V5"></path><path d="M15 19v-7"></path><path d="M20 19V3"></path>',
        config:'<circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1A7 7 0 0 0 14.7 6L14.4 3h-4.8L9.3 6a7 7 0 0 0-1.7 1.1l-2.5-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1A7 7 0 0 0 9.3 18l.3 3h4.8l.3-3a7 7 0 0 0 1.7-1.1l2.5 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"></path>'
      };
      return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[type]}</svg>`;
    };
    const proxy=(id,label,type,handler)=>{
      let b=document.getElementById(id);
      if(!b){
        b=document.createElement('button');b.type='button';b.id=id;b.className='navitem v11-proxy';
        b.innerHTML=`<span class="icon">${svg(type)}</span>${label}`;
        b.addEventListener('click',handler);
      }
      nav.appendChild(b); return b;
    };
    document.getElementById('v11ClientsNav')?.remove();
    proxy('v11AutomationsNav','Automações','automacoes',()=>showToast('Automações · área preparada no novo padrão AllianceOS.'));
    const notif=document.getElementById('notificationsBtn'); if(notif) nav.appendChild(notif);
    proxy('v11ReportsNav','Relatórios','relatorios',()=>document.getElementById('painelNav')?.click());
    proxy('v11SettingsNav','Configurações','config',()=>document.getElementById('customizeSidebarBtn')?.click());
    if(notif && !notif.querySelector('.v11-notification-badge')){
      const badge=document.createElement('span');badge.className='v11-notification-badge';badge.textContent='37';notif.appendChild(badge);
    }
    const brandTitle=document.querySelector('.brandtitle strong'); if(brandTitle) brandTitle.textContent='AllianceOS';
    const brandSub=document.querySelector('.brandtitle span'); if(brandSub) brandSub.textContent='Gestão central';
    const sync=()=>{
      const map={homeNav:null,tasksNav:null,campaignsNav:null,deliveriesNav:null,painelNav:'v11ReportsNav',customizeSidebarBtn:'v11SettingsNav'};
      document.querySelectorAll('.v11-proxy').forEach(x=>x.classList.remove('active'));
      Object.entries(map).forEach(([orig,proxyId])=>{if(proxyId && document.getElementById(orig)?.classList.contains('active')) document.getElementById(proxyId)?.classList.add('active');});
    };
    new MutationObserver(sync).observe(nav,{attributes:true,subtree:true,attributeFilter:['class']}); sync();
  }

  const v11BaseRenderDetail=renderTaskDetailBody;
  renderTaskDetailBody=function(t){
    v11BaseRenderDetail(t);
    const body=document.getElementById('taskDetailBody');
    const layout=body?.querySelector('.tdetail-layout.v3-detail-layout');
    const main=layout?.querySelector('.tdetail-main');
    const side=layout?.querySelector('.tdetail-side');
    if(!layout||!main||!side) return;
    layout.classList.add('v11-layout');

    const fieldNodes={
      status:side.querySelector('#detailStatus')?.closest('.tfield')||null,
      owner:side.querySelector('#detailPrimaryAssignee')?.closest('.tfield')||null,
      due:side.querySelector('#detailDue')?.closest('.tfield')||null,
      priority:side.querySelector('#detailPriority')?.closest('.tfield')||null,
      start:side.querySelector('#detailStart')?.closest('.tfield')||null,
      addAssignee:side.querySelector('#detailAddAssignee')?.closest('.tfield')||null,
      campaign:[...side.querySelectorAll('.tfield')].find(x=>/Campanha|planejamento/i.test(x.querySelector('label')?.textContent||''))||null,
      recurrence:side.querySelector('#detailRecurrence')?.closest('.tfield')||null
    };
    const deliveryRule=side.querySelector('.v5-delivery-rule')||null;

    const tasks=v11OrderedCampaignTasks(t);
    const flowWrap=document.createElement('div');flowWrap.innerHTML=v11CampaignPane(t,tasks);layout.insertBefore(flowWrap.firstElementChild,main);
    const heroWrap=document.createElement('div');heroWrap.innerHTML=v11Hero(t,tasks);const hero=heroWrap.firstElementChild;main.prepend(hero);
    hero.querySelector('[data-v11-close]')?.addEventListener('click',()=>document.getElementById('taskDetailClose')?.click());
    hero.querySelector('[data-v11-prev]')?.addEventListener('click',()=>{const i=tasks.findIndex(x=>String(x.id)===String(t.id));if(i>0)openTaskDetail(tasks[i-1].id);});
    hero.querySelector('[data-v11-next]')?.addEventListener('click',()=>{const i=tasks.findIndex(x=>String(x.id)===String(t.id));if(i>=0&&i<tasks.length-1)openTaskDetail(tasks[i+1].id);});
    const title=hero.querySelector('.v11-title-input');
    title?.addEventListener('input',()=>{const original=document.getElementById('taskTitleInput');if(original)original.value=title.value;});
    title?.addEventListener('blur',()=>document.getElementById('taskSaveBtn')?.click());
    title?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();title.blur();}});
    layout.querySelectorAll('[data-v11-task]').forEach(b=>b.addEventListener('click',()=>openTaskDetail(b.dataset.v11Task)));

    main.querySelectorAll('.v7-flow-summary,.v9-workspace-title').forEach(x=>x.remove());
    main.querySelectorAll('.v7-advanced-flow').forEach(x=>x.classList.add('v11-advanced-hidden'));
    const objective=main.querySelector('#detailDescription')?.closest('.tsection')||main.querySelector('.description-area')?.closest('.tsection');
    if(objective){objective.classList.add('v11-objective');const h=objective.querySelector('.tsection-head strong');if(h)h.textContent='Objetivo';const s=objective.querySelector('.tsection-head div>span,.tsection-head div>small');if(s)s.textContent='O que precisa ser entregue nesta etapa e qual resultado ela deve gerar.';}
    const incoming=main.querySelector('.v5-incoming-section'), attach=main.querySelector('#attachmentInput')?.closest('.tsection');
    if(incoming){incoming.classList.add('v11-materials');const h=incoming.querySelector('.tsection-head strong');if(h)h.textContent='Materiais e insumos';const s=incoming.querySelector('.tsection-head div>span,.tsection-head div>small');if(s)s.textContent='Briefings, referências e entregas das etapas anteriores.';if(attach){attach.classList.add('v11-materials-secondary');const ah=attach.querySelector('.tsection-head strong');if(ah)ah.textContent='Referências adicionais';}}
    else if(attach){attach.classList.add('v11-materials');const h=attach.querySelector('.tsection-head strong');if(h)h.textContent='Materiais e insumos';const s=attach.querySelector('.tsection-head div>span,.tsection-head div>small');if(s)s.textContent='Briefings, referências e arquivos usados nesta execução.';}
    const delivery=main.querySelector('.v5-delivery-section');
    if(delivery){delivery.classList.add('v11-delivery');const h=delivery.querySelector('.tsection-head strong');if(h)h.textContent='Sua entrega';const s=delivery.querySelector('.tsection-head div>span,.tsection-head div>small');if(s)s.textContent='Envie aqui o material final desta tarefa para liberar a continuidade do fluxo.';}
    const checklist=main.querySelector('#detailChecklist')?.closest('.tsection');if(checklist)checklist.classList.add('v11-secondary-section');
    const comments=main.querySelector('#newCommentText')?.closest('.tsection');
    const continuity=main.querySelector('.v3-continuity');if(continuity)continuity.classList.add('v11-engine-hidden');

    const actions=document.createElement('div');actions.className='v11-actions';
    actions.innerHTML=`<button type="button" class="v11-block-btn">⊘ &nbsp; Marcar como bloqueada</button><button type="button" class="v11-complete-btn">✓ &nbsp; ${t.status==='feito'?'Reabrir tarefa':'Concluir tarefa'}</button>`;
    main.appendChild(actions);
    actions.querySelector('.v11-complete-btn')?.addEventListener('click',()=>{(document.getElementById('v3CompleteTaskBtn')||document.querySelector('.v7-complete-proxy'))?.click();});
    actions.querySelector('.v11-block-btn')?.addEventListener('click',()=>{const status=document.getElementById('detailStatus');if(status){status.value='ajustes necessários';document.getElementById('taskSaveBtn')?.click();showToast('Tarefa marcada como bloqueada.');}});

    side.innerHTML='<div class="v11-side-stack"></div>';const stack=side.firstElementChild;

    const statusCard=v11Card('Status e informações','▣','v11-status-card');const statusBody=statusCard.querySelector('.v11-card-body');stack.appendChild(statusCard);
    [fieldNodes.status,fieldNodes.owner,fieldNodes.due,fieldNodes.priority].filter(Boolean).forEach(x=>statusBody.appendChild(x));

    const campaignCard=v11Card('Contexto da campanha','▰');const campaignBody=campaignCard.querySelector('.v11-card-body');stack.appendChild(campaignCard);
    campaignBody.innerHTML=v11InfoRow('Campanha',t.project||'Operação')+v11InfoRow('Cliente / marca',t.brand||'—')+v11InfoRow('Canal',v11Channel(t));

    const tagsCard=v11Card('Sinais e tags','◇');const tagsBody=tagsCard.querySelector('.v11-card-body');stack.appendChild(tagsCard);
    tagsBody.innerHTML=`<div class="v11-tags">${(t.tags||[]).map((tag,i)=>`<button type="button" data-v11-remove-tag="${i}">${v11Esc(tag)} ×</button>`).join('')}<button type="button" class="add" data-v11-add-tag>＋ Adicionar tag</button></div>`;
    tagsBody.querySelector('[data-v11-add-tag]')?.addEventListener('click',()=>{const value=prompt('Nova tag');if(!value?.trim())return;t.tags=[...(t.tags||[]),value.trim()];v11Persist(t,true);});
    tagsBody.querySelectorAll('[data-v11-remove-tag]').forEach(b=>b.addEventListener('click',()=>{t.tags=(t.tags||[]).filter((_,i)=>i!==Number(b.dataset.v11RemoveTag));v11Persist(t,true);}));

    const depCard=v11Card('Dependências','⌘');const depBody=depCard.querySelector('.v11-card-body');stack.appendChild(depCard);
    const deps=v11Deps(t), next=v11Next(t);
    depBody.innerHTML=`<div class="v11-dep-group"><span>Depende de</span>${deps.length?deps.map(x=>`<button type="button" data-v11-dep="${v11Esc(x.id)}"><b>${x.status==='feito'?'✓':'•'}</b><span>${v11Esc(x.title)}</span><small>${v11StatusLabel(x.status)}</small></button>`).join(''):'<em>Nenhuma dependência.</em>'}</div><div class="v11-dep-group"><span>Desbloqueia</span>${next.length?next.map(x=>`<button type="button" data-v11-dep="${v11Esc(x.id)}"><b>→</b><span>${v11Esc(x.title)}</span><small>${v11StatusLabel(x.status)}</small></button>`).join(''):'<em>Última etapa do fluxo.</em>'}</div>`;
    depBody.querySelectorAll('[data-v11-dep]').forEach(b=>b.addEventListener('click',()=>openTaskDetail(b.dataset.v11Dep)));

    const obsCard=v11Card('Observações','▣');const obsBody=obsCard.querySelector('.v11-card-body');stack.appendChild(obsCard);
    if(comments){comments.classList.add('v11-comments-section');comments.querySelector('.tsection-head')?.remove();comments.querySelector('.v3-history')?.classList.add('v11-history-hidden');obsBody.appendChild(comments);}
    else obsBody.innerHTML='<p class="v11-empty">Nenhuma observação ainda.</p>';

    const detailsCard=v11Card('Mais detalhes','⋯','v11-more-card');const detailsBody=detailsCard.querySelector('.v11-card-body');stack.appendChild(detailsCard);
    const details=document.createElement('details');details.innerHTML='<summary>Configurações avançadas <span>⌄</span></summary><div class="v11-more-body"></div>';detailsBody.appendChild(details);
    const more=details.querySelector('.v11-more-body');
    [fieldNodes.addAssignee,fieldNodes.start,fieldNodes.campaign,fieldNodes.recurrence,deliveryRule].filter(Boolean).forEach(x=>more.appendChild(x));

    side.querySelectorAll('select,input[type="date"]').forEach(el=>el.addEventListener('change',()=>document.getElementById('taskSaveBtn')?.click()));
    main.querySelector('#detailDescription')?.addEventListener('blur',()=>document.getElementById('taskSaveBtn')?.click());
  };

  setTimeout(v11DecorateShell,0);
}

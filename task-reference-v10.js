
/* AllianceOS · Task Reference V10 */
{
  const r10BaseRenderDetail = renderTaskDetailBody;
  const r10Esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});

  const r10Icon = name => {
    const paths={
      campaign:'<rect x="4" y="4" width="6" height="6" rx="1.3"/><rect x="14" y="4" width="6" height="6" rx="1.3"/><rect x="4" y="14" width="6" height="6" rx="1.3"/><path d="M17 14v6M14 17h6"/>',
      task:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
      done:'<path d="m6 12 4 4 8-8"/>',
      pending:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 12h6"/>',
      status:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/>',
      context:'<path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2M8 11h8M8 15h5"/>',
      tag:'<path d="M4 12 12 4h6l2 2v6l-8 8-8-8Z"/><circle cx="16" cy="8" r="1"/>',
      dependency:'<circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 7h4a4 4 0 0 1 4 4v4M15 17h-4a4 4 0 0 1-4-4V9"/>',
      comment:'<path d="M5 5h14v11H9l-4 3V5Z"/><path d="M8 9h8M8 12h5"/>',
      alert:'<path d="M12 4v9"/><path d="M12 17h.01"/>',
      next:'<path d="m9 6 6 6-6 6"/>',
      whatsapp:'<circle cx="12" cy="12" r="8"/><path d="M8.5 8.8c.7 3 2.7 5 5.7 5.8l1.4-1.4 2 .8-.7 2.2c-.2.6-.8 1-1.5 1C10.6 17 7 13.4 6.8 8.6c0-.7.4-1.3 1-1.5L10 6.4l.8 2-1.4 1.4Z"/>',
      folder:'<path d="M3.8 7.5h6l1.7 2H20v8.7a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.2V7.5Z"/><path d="M4 8V5.8A1.8 1.8 0 0 1 5.8 4h4l1.7 2H18"/>',
      calendar:'<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/>',
      user:'<circle cx="12" cy="8" r="3"/><path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6"/>',
      priority:'<path d="M6 19V13M12 19V9M18 19V5"/>',
      brand:'<circle cx="12" cy="12" r="8"/><path d="M8.5 12h7M12 8.5v7"/>'
    };
    return '<svg class="r10-svg" viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.task)+'</svg>';
  };

  const r10Short = v => String(v||'').split('|')[0].trim();
  const r10Initials = v => {
    const p=r10Short(v).split(/\s+/).filter(Boolean);
    return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase() || '—';
  };
  const r10AvatarInner = (name,userId) => {
    const members=window.AllianceOSDirectory?.members||[];
    const key=String(r10Short(name)||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const person=members.find(m=>m.tipo==='usuario'&&((userId&&String(m.id)===String(userId))||String(m.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()===key));
    return person?.foto_url?'<img src="'+r10Esc(person.foto_url)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">':r10Esc(r10Initials(name));
  };
  const r10Task = id => taskData.find(x=>String(x.id)===String(id))||null;
  const r10Deps = t => (t.dependencies||[]).map(r10Task).filter(Boolean);
  const r10Dependents = t => taskData.filter(x=>(x.dependencies||[]).some(id=>String(id)===String(t.id)));
  const r10Uid = () => window.user?.id || 'vitor-gutierrez';
  const r10CampaignList = () => {
    try{
      const rows=JSON.parse(localStorage.getItem('central.campaigns.'+r10Uid())||'[]');
      return Array.isArray(rows)?rows:[];
    }catch{return []}
  };
  const r10CampaignRecord = t => {
    if(!t?.campaignId)return null;
    return r10CampaignList().find(c=>String(c.id)===String(t.campaignId))||null;
  };
  const r10SameCampaign = (a,b) => {
    if(!b?.campaignId)return String(a.id)===String(b.id);
    return !!a?.campaignId && String(a.campaignId)===String(b.campaignId);
  };
  function r10CampaignTasks(t){
    let rows;
    if(t.campaignId){
      rows=taskData.filter(x=>r10SameCampaign(x,t));
    }else{
      const currentId=String(t.id);
      const related=[
        t,
        ...r10Deps(t),
        ...r10Dependents(t),
        ...(t.parentTaskId?[r10Task(t.parentTaskId)]:[]),
        ...taskData.filter(x=>String(x.parentTaskId||'')===currentId)
      ].filter(Boolean);
      const unique=new Map();
      related.forEach(x=>{if(!unique.has(String(x.id)))unique.set(String(x.id),x)});
      const directDeps=new Set((t.dependencies||[]).map(String));
      const directDependents=new Set(r10Dependents(t).map(x=>String(x.id)));
      rows=[...unique.values()].map(x=>{
        const id=String(x.id);
        let relation='Relacionada';
        if(id===currentId)relation='Tarefa atual';
        else if(directDeps.has(id))relation='Precisa acontecer antes';
        else if(directDependents.has(id))relation='Depende desta tarefa';
        else if(String(x.parentTaskId||'')===currentId)relation='Subtarefa / etapa';
        else if(String(t.parentTaskId||'')===id)relation='Tarefa principal';
        return {...x,_r10Relation:relation};
      });
    }
    const set=new Set(rows.map(x=>String(x.id))), memo=new Map(), visiting=new Set();
    function depth(x){
      const k=String(x.id);if(memo.has(k))return memo.get(k);if(visiting.has(k))return 0;visiting.add(k);
      const ds=(x.dependencies||[]).map(r10Task).filter(d=>d&&set.has(String(d.id)));
      const d=ds.length?1+Math.max.apply(null,ds.map(depth)):0;visiting.delete(k);memo.set(k,d);return d;
    }
    const relationRank={'Precisa acontecer antes':0,'Tarefa principal':1,'Tarefa atual':2,'Subtarefa / etapa':3,'Depende desta tarefa':4,'Relacionada':5};
    return rows.slice().sort((a,b)=>depth(a)-depth(b)||(relationRank[a._r10Relation]??0)-(relationRank[b._r10Relation]??0)||String(a.due||'9999').localeCompare(String(b.due||'9999'))||String(a.title||'').localeCompare(String(b.title||''),'pt-BR'));
  }
  const r10Status = t => t.status==='feito'?'Concluída':t.status==='bloqueado'?'Bloqueada':r10Deps(t).some(x=>x.status!=='feito')?'Bloqueada':t.status==='em revisão'?'Em revisão':(t.status==='fazendo'||t.status==='em andamento')?'Em andamento':'Pendente';
  const r10Priority = t => ({urgent:'Urgente',high:'Alta',alta:'Alta',normal:'Normal',low:'Baixa',baixa:'Baixa'}[String(t.priority||'').toLowerCase()]||String(t.priority||'Normal'));

  const r10Norm = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const r10BrandTone = brand => {
    const n=r10Norm(brand);
    if(n.includes('botanika'))return 'botanika';
    if(n.includes('revita'))return 'revita';
    if(n.includes('verme'))return 'vermefree';
    if(n.includes('shoty'))return 'shoty';
    return 'default';
  };
  const r10Channel = (t,campaign) => {
    const direct=t?.channel||t?.canal||campaign?.channel||campaign?.canal||campaign?.platform||campaign?.plataforma;
    if(direct)return String(direct);
    const tags=(t?.tags||[]).map(String);
    return tags.find(x=>/whatsapp|instagram|email|meta|youtube|tiktok/i.test(x))||'';
  };
  const r10TagClass = value => {
    const n=r10Norm(value);
    if(n.includes('whatsapp'))return ' whatsapp';
    if(n.includes('criacao')||n.includes('criação'))return ' creation';
    if(n.includes('conversao')||n.includes('conversão'))return ' conversion';
    if(n.includes('urgente')||n.includes('alta'))return ' priority';
    return '';
  };
  const r10MetaPill = (icon,label,kind='') => '<span class="r10-pill '+kind+'">'+r10Icon(icon)+'<span>'+r10Esc(label)+'</span></span>';

  function r10FlowHtml(t,rows){
    const campaign=r10CampaignRecord(t);
    const linked=!!t.campaignId;
    const hasStandaloneFlow=!linked&&rows.some(x=>String(x.id)!==String(t.id));
    const done=rows.filter(x=>x.status==='feito').length, pct=rows.length?Math.round(done/rows.length*100):0;
    const flowTitle=linked?'Execução da Campanha':'Fluxo da tarefa';
    const flowSubtitle=linked?(campaign?.name||t.project||'Campanha vinculada'):(hasStandaloneFlow?'Subtarefas, etapas e dependências':'Tarefa avulsa');
    const flowState=linked?(rows.every(x=>x.status==='feito')?'Concluída':'Em andamento'):(hasStandaloneFlow?'Fluxo relacionado':'Sem etapas');
    const flowIcon=linked?r10Icon('campaign'):r10Icon('task');
    let html='<aside class="r10-flow"><div class="r10-flow-head"><span class="r10-flow-icon">'+flowIcon+'</span><div class="r10-flow-head-copy"><strong>'+r10Esc(flowTitle)+'</strong><span>'+r10Esc(flowSubtitle)+'</span></div></div><span class="r10-flow-state">'+r10Esc(flowState)+'</span>';
    if(linked||hasStandaloneFlow){
      html+='<div class="r10-progress-copy"><b>'+done+' de '+rows.length+' tarefas concluídas</b><span>'+pct+'%</span></div><div class="r10-progress"><i style="width:'+pct+'%"></i></div>';
    }else{
      html+='<div class="r10-progress-copy"><b>Nenhuma etapa vinculada</b><span>—</span></div>';
    }
    html+='<div class="r10-flow-list">';
    rows.forEach(function(x,i){
      const stateClass=' status-'+r10Norm(r10Status(x)).replace(/\s+/g,'-');
      const cl=(x.status==='feito'?' done':'')+(String(x.id)===String(t.id)?' current':'')+stateClass;
      const icon=x.status==='feito'?r10Icon('done'):String(x.id)===String(t.id)?r10Icon('task'):r10Icon('pending');
      const relation=!linked&&x._r10Relation?x._r10Relation+' · ':'';
      html+='<button type="button" class="r10-step'+cl+'" data-r10-task="'+r10Esc(x.id)+'" data-number="'+(i+1)+'"><span class="r10-step-icon">'+icon+'</span><span class="r10-step-copy"><b>'+r10Esc(x.title||'Tarefa')+'</b><span>'+r10Esc(relation+r10Status(x))+'</span></span><span class="r10-step-avatar">'+r10AvatarInner((x.assignees||[])[0]||'',(x.assigneeIds||[])[0])+'</span></button>';
    });
    return html+'</div></aside>';
  }
  function r10Card(title,icon,body){
    return '<section class="r10-side-card"><div class="r10-side-card-head"><span class="r10-side-card-icon">'+icon+'</span><strong>'+r10Esc(title)+'</strong></div><div class="r10-side-card-body">'+body+'</div></section>';
  }
  function r10MoveField(root,id){const x=root.querySelector('#'+id);return x?x.closest('.tfield'):null}

  function r10RenderDetail(t){
    r10BaseRenderDetail(t);
    const body=document.getElementById('taskDetailBody'), oldLayout=body&&body.querySelector('.tdetail-layout');
    const oldMain=oldLayout&&oldLayout.querySelector('.tdetail-main'), oldSide=oldLayout&&oldLayout.querySelector('.tdetail-side');
    if(!body||!oldLayout||!oldMain||!oldSide)return;

    const campaign=r10CampaignRecord(t);
    const titleInput=document.getElementById('taskTitleInput');
    const saveButton=document.getElementById('taskSaveBtn');
    const rows=r10CampaignTasks(t), index=Math.max(0,rows.findIndex(x=>String(x.id)===String(t.id))), prev=rows[index-1], nextTask=rows[index+1];
    const briefing=oldMain.querySelector('.description-area')&&oldMain.querySelector('.description-area').closest('.v3-section');
    if(briefing){const h=briefing.querySelector('.tsection-head strong'),s=briefing.querySelector('.tsection-head span');if(h)h.textContent='Objetivo';if(s)s.textContent='Resultado esperado e orientação para execução'}
    const attachments=oldMain.querySelector('#attachmentInput')&&oldMain.querySelector('#attachmentInput').closest('.v3-section');
    if(attachments){const h=attachments.querySelector('.tsection-head strong'),s=attachments.querySelector('.tsection-head span');if(h)h.textContent='Materiais e insumos';if(s)s.textContent=String((t.attachments||[]).length)+' item(ns)'}
    const incoming=oldMain.querySelector('.v5-incoming-section'), delivery=oldMain.querySelector('.v5-delivery-section');
    const conferenceSection=oldMain.querySelector('#detailChecklist')&&oldMain.querySelector('#detailChecklist').closest('.v3-section');
    if(delivery){const h=delivery.querySelector('.tsection-head strong'),s=delivery.querySelector('.tsection-head span');if(h)h.textContent='Sua entrega';if(s)s.textContent=t.deliveryRequired?'Obrigatória para concluir a tarefa':'Envie o material final desta execução'}
    const simpleAction=oldMain.querySelector('.v7-simple-action'), comments=oldMain.querySelector('#commentList')&&oldMain.querySelector('#commentList').closest('.v3-section');
    oldMain.querySelectorAll('.v7-flow-summary,.v9-workspace-title,.v7-advanced-flow,.v3-continuity,.v5-tree-section').forEach(x=>x.classList.add('r10-engine-hidden'));

    const statusField=r10MoveField(oldSide,'detailStatus'), ownerField=r10MoveField(oldSide,'detailPrimaryAssignee'), dueField=r10MoveField(oldSide,'detailDue'), priorityField=r10MoveField(oldSide,'detailPriority'), campaignField=r10MoveField(oldSide,'detailCampaign'), startField=r10MoveField(oldSide,'detailStart'), supportField=r10MoveField(oldSide,'detailAddAssignee'), recurrenceField=r10MoveField(oldSide,'detailRecurrence');
    if(statusField){statusField.classList.add('r10-field-status','state-'+r10Norm(r10Status(t)).replace(/\s+/g,'-'));statusField.querySelector('label').textContent='Status';statusField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn status-dot"></span>')}
    if(ownerField){ownerField.classList.add('r10-field-owner');ownerField.querySelector('label').textContent='Responsável';ownerField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn owner-avatar">'+r10AvatarInner((t.assignees||[])[0]||'',(t.assigneeIds||[])[0])+'</span>')}
    if(dueField){dueField.classList.add('r10-field-due');dueField.querySelector('label').textContent='Prazo';dueField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn">'+r10Icon('calendar')+'</span>')}
    if(priorityField){priorityField.classList.add('r10-field-priority','priority-'+r10Norm(r10Priority(t)));priorityField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn">'+r10Icon('priority')+'</span>')}
    if(campaignField){campaignField.classList.add('r10-field-campaign');campaignField.querySelector('label').textContent=t.campaignId?'Campanha':'Lista';campaignField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn">'+r10Icon('folder')+'</span>')}

    const workspace=document.createElement('div');workspace.className='r10-workspace';workspace.insertAdjacentHTML('beforeend',r10FlowHtml(t,rows));

    const center=document.createElement('main');center.className='r10-main';
    const channel=r10Channel(t,campaign);
    const campaignLabel=t.campaignId?(campaign?.name||t.project||'Campanha'):'Tarefa avulsa';
    const headPills=[
      channel?r10MetaPill(channel.toLowerCase().includes('whatsapp')?'whatsapp':'tag',channel,'channel'):null,
      r10MetaPill('folder',campaignLabel,'campaign'),
      r10MetaPill('priority',r10Priority(t),'priority')
    ].filter(Boolean).join('');
    center.innerHTML='<div class="r10-main-top"><button type="button" class="r10-icon-btn" data-r10-back>←</button><div class="r10-main-nav"><button type="button" class="r10-icon-btn" data-r10-more>•••</button><button type="button" class="r10-icon-btn" '+(prev?'':'disabled')+' data-r10-prev>‹</button><span class="r10-counter">'+(index+1)+' de '+Math.max(rows.length,1)+'</span><button type="button" class="r10-icon-btn" '+(nextTask?'':'disabled')+' data-r10-next>›</button><span class="r10-save-slot"></span></div></div><header class="r10-task-head"><span class="r10-kicker">'+r10Icon('task')+'<span>TAREFA</span></span><div class="r10-title-slot"></div><p class="r10-subtitle">'+(t.description? r10Esc(String(t.description).slice(0,150)) :(t.campaignId?'Execução vinculada à campanha '+r10Esc(campaignLabel)+'.':'Tarefa avulsa, sem campanha vinculada.'))+'</p><div class="r10-pills">'+headPills+'</div></header><div class="r10-center-stack"></div>';
    const titleSlot=center.querySelector('.r10-title-slot');
    if(titleInput&&titleSlot){
      titleInput.classList.add('r10-title-input');
      titleInput.setAttribute('placeholder','Nome da tarefa');
      titleSlot.appendChild(titleInput);
    }else if(titleSlot){
      titleSlot.innerHTML='<h1 class="r10-title">'+r10Esc(t.title||'Tarefa')+'</h1>';
    }
    const saveSlot=center.querySelector('.r10-save-slot');
    if(saveButton&&saveSlot){
      saveButton.classList.add('r10-save-btn');
      saveButton.textContent='Salvar alterações';
      saveSlot.appendChild(saveButton);
    }
    const centerStack=center.querySelector('.r10-center-stack');[briefing,attachments,incoming,delivery,conferenceSection,simpleAction].filter(Boolean).forEach(x=>centerStack.appendChild(x));workspace.appendChild(center);

    const side=document.createElement('aside');side.className='r10-side';side.innerHTML='<div class="r10-side-stack"></div>';const stack=side.querySelector('.r10-side-stack');
    const info=document.createElement('section');info.className='r10-side-card';info.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('status')+'</span><strong>Status e informações</strong></div><div class="r10-side-card-body"></div>';const ib=info.querySelector('.r10-side-card-body');[statusField,ownerField,dueField,priorityField].filter(Boolean).forEach(x=>ib.appendChild(x));stack.appendChild(info);

    const context=document.createElement('section');context.className='r10-side-card';context.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('context')+'</span><strong>'+(t.campaignId?'Contexto da campanha':'Contexto da tarefa')+'</strong></div><div class="r10-side-card-body"></div>';const cb=context.querySelector('.r10-side-card-body');if(campaignField)cb.appendChild(campaignField);
    cb.insertAdjacentHTML('beforeend','<div class="r10-context-row"><span>Cliente</span><span class="r10-context-value"><i class="r10-brand-dot '+r10BrandTone(t.brand)+'"></i>'+r10Esc(t.brand||'—')+'</span></div>'+
      (channel?'<div class="r10-context-row"><span>Canal</span><span class="r10-context-value">'+r10Icon(channel.toLowerCase().includes('whatsapp')?'whatsapp':'tag')+'<span>'+r10Esc(channel)+'</span></span></div>':'')+
      '<div class="r10-context-row"><span>Tipo</span><span class="r10-context-value">'+r10Icon('task')+'<span>'+r10Esc(t.campaignId?'Execução de campanha':'Tarefa avulsa')+'</span></span></div>');
    stack.appendChild(context);

    const tags=(t.tags||[]).filter(Boolean);const defaultTags=[channel,t.brand||'Operação',r10Priority(t)].filter(Boolean);const tagList=(tags.length?tags:defaultTags).map(x=>'<span class="r10-tag'+r10TagClass(x)+'">'+r10Esc(x)+'</span>').join('');stack.insertAdjacentHTML('beforeend',r10Card('Sinais e tags',r10Icon('tag'),'<div class="r10-tags">'+tagList+'<button type="button" class="r10-add-tag">＋ Adicionar tag</button></div>'));

    const deps=r10Deps(t), dependents=r10Dependents(t);let depHtml='';
    if(deps.length){depHtml+='<div class="r10-context-row"><span>Depende de</span><div>';deps.forEach(x=>{depHtml+='<button type="button" class="r10-dep-row '+(x.status==='feito'?'':'blocked')+'" data-r10-task="'+r10Esc(x.id)+'"><span class="r10-dep-dot">'+(x.status==='feito'?'✓':'!')+'</span><span><b>'+r10Esc(x.title)+'</b><span>'+r10Esc(r10Status(x))+'</span></span></button>'});depHtml+='</div></div>'}
    if(dependents.length){depHtml+='<div class="r10-context-row"><span>Desbloqueia</span><div>';dependents.forEach(x=>{depHtml+='<button type="button" class="r10-dep-row '+(r10Status(x)==='Bloqueada'?'blocked':'')+'" data-r10-task="'+r10Esc(x.id)+'"><span class="r10-dep-dot">→</span><span><b>'+r10Esc(x.title)+'</b><span>'+r10Esc(r10Status(x))+'</span></span></button>'});depHtml+='</div></div>'}
    if(!depHtml)depHtml='<div style="font-size:9px;color:#8e979f">Sem dependências vinculadas.</div>';stack.insertAdjacentHTML('beforeend',r10Card('Dependências',r10Icon('dependency'),depHtml));

    if(comments){const card=document.createElement('section');card.className='r10-side-card';card.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('comment')+'</span><strong>Observações</strong></div><div class="r10-side-card-body"></div>';const cc=card.querySelector('.r10-side-card-body');[comments.querySelector('.v3-comment-add'),comments.querySelector('#commentList'),comments.querySelector('.v3-history')].filter(Boolean).forEach(x=>cc.appendChild(x));stack.appendChild(card)}

    const extra=document.createElement('details');extra.className='r10-side-card r10-more';extra.innerHTML='<summary>Mais opções da tarefa</summary><div class="r10-more-body"></div>';const eb=extra.querySelector('.r10-more-body');[startField,supportField,recurrenceField].filter(Boolean).forEach(x=>eb.appendChild(x));if(eb.children.length)stack.appendChild(extra);
    workspace.appendChild(side);oldLayout.replaceWith(workspace);

    workspace.querySelectorAll('[data-r10-task]').forEach(el=>el.addEventListener('click',()=>openTaskDetail(el.dataset.r10Task)));
    const back=workspace.querySelector('[data-r10-back]');if(back)back.addEventListener('click',()=>closeTaskDetail());
    const p=workspace.querySelector('[data-r10-prev]');if(p)p.addEventListener('click',()=>{if(prev)openTaskDetail(prev.id)});
    const n=workspace.querySelector('[data-r10-next]');if(n)n.addEventListener('click',()=>{if(nextTask)openTaskDetail(nextTask.id)});
    const m=workspace.querySelector('[data-r10-more]');if(m)m.addEventListener('click',()=>{extra.open=!extra.open});
  }
  renderTaskDetailBody=function(t){r10RenderDetail(t)};
}

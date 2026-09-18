
/* AllianceOS · Task Reference V10 */
{
  const r10BaseRenderDetail = renderTaskDetailBody;
  const r10Esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
  const r10Short = v => String(v||'').split('|')[0].trim();
  const r10Initials = v => {
    const p=r10Short(v).split(/\s+/).filter(Boolean);
    return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase() || '—';
  };
  const r10Task = id => taskData.find(x=>String(x.id)===String(id))||null;
  const r10Deps = t => (t.dependencies||[]).map(r10Task).filter(Boolean);
  const r10Dependents = t => taskData.filter(x=>(x.dependencies||[]).some(id=>String(id)===String(t.id)));
  const r10SameCampaign = (a,b) => {
    if(a.campaignId||b.campaignId)return !!a.campaignId&&!!b.campaignId&&String(a.campaignId)===String(b.campaignId);
    return (a.brand||'')===(b.brand||'') && (a.project||'Operação')===(b.project||'Operação');
  };
  function r10CampaignTasks(t){
    const rows=taskData.filter(x=>r10SameCampaign(x,t));
    const set=new Set(rows.map(x=>String(x.id))), memo=new Map(), visiting=new Set();
    function depth(x){
      const k=String(x.id);if(memo.has(k))return memo.get(k);if(visiting.has(k))return 0;visiting.add(k);
      const ds=(x.dependencies||[]).map(r10Task).filter(d=>d&&set.has(String(d.id)));
      const d=ds.length?1+Math.max.apply(null,ds.map(depth)):0;visiting.delete(k);memo.set(k,d);return d;
    }
    return rows.slice().sort((a,b)=>depth(a)-depth(b)||String(a.due||'9999').localeCompare(String(b.due||'9999'))||String(a.title||'').localeCompare(String(b.title||''),'pt-BR'));
  }
  const r10Status = t => t.status==='feito'?'Concluída':r10Deps(t).some(x=>x.status!=='feito')?'Bloqueada':(t.status==='fazendo'||t.status==='em andamento')?'Em andamento':'Pendente';
  const r10Priority = t => ({urgent:'Urgente',high:'Alta',alta:'Alta',normal:'Normal',low:'Baixa',baixa:'Baixa'}[String(t.priority||'').toLowerCase()]||String(t.priority||'Normal'));

  function r10FlowHtml(t,rows){
    const done=rows.filter(x=>x.status==='feito').length, pct=rows.length?Math.round(done/rows.length*100):0;
    let html='<aside class="r10-flow"><div class="r10-flow-head"><span class="r10-flow-icon">⌘</span><div class="r10-flow-head-copy"><strong>Execução da Campanha</strong><span>'+r10Esc(t.project||'Operação')+'</span></div></div><span class="r10-flow-state">Em andamento</span><div class="r10-progress-copy"><b>'+done+' de '+rows.length+' tarefas concluídas</b><span>'+pct+'%</span></div><div class="r10-progress"><i style="width:'+pct+'%"></i></div><div class="r10-flow-list">';
    rows.forEach(function(x,i){
      const cl=(x.status==='feito'?' done':'')+(String(x.id)===String(t.id)?' current':'');
      const icon=x.status==='feito'?'✓':String(x.id)===String(t.id)?'▣':'◫';
      html+='<button type="button" class="r10-step'+cl+'" data-r10-task="'+r10Esc(x.id)+'" data-number="'+(i+1)+'"><span class="r10-step-icon">'+icon+'</span><span class="r10-step-copy"><b>'+r10Esc(x.title||'Tarefa')+'</b><span>'+r10Esc(r10Status(x))+'</span></span><span class="r10-step-avatar">'+r10Esc(r10Initials((x.assignees||[])[0]||''))+'</span></button>';
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

    const rows=r10CampaignTasks(t), index=Math.max(0,rows.findIndex(x=>String(x.id)===String(t.id))), prev=rows[index-1], nextTask=rows[index+1];
    const briefing=oldMain.querySelector('.description-area')&&oldMain.querySelector('.description-area').closest('.v3-section');
    if(briefing){const h=briefing.querySelector('.tsection-head strong'),s=briefing.querySelector('.tsection-head span');if(h)h.textContent='Objetivo';if(s)s.textContent='Resultado esperado e orientação para execução'}
    const attachments=oldMain.querySelector('#attachmentInput')&&oldMain.querySelector('#attachmentInput').closest('.v3-section');
    if(attachments){const h=attachments.querySelector('.tsection-head strong'),s=attachments.querySelector('.tsection-head span');if(h)h.textContent='Materiais e insumos';if(s)s.textContent=String((t.attachments||[]).length)+' item(ns)'}
    const incoming=oldMain.querySelector('.v5-incoming-section'), delivery=oldMain.querySelector('.v5-delivery-section');
    if(delivery){const h=delivery.querySelector('.tsection-head strong'),s=delivery.querySelector('.tsection-head span');if(h)h.textContent='Sua entrega';if(s)s.textContent=t.deliveryRequired?'Obrigatória para concluir a tarefa':'Envie o material final desta execução'}
    const simpleAction=oldMain.querySelector('.v7-simple-action'), comments=oldMain.querySelector('#commentList')&&oldMain.querySelector('#commentList').closest('.v3-section');
    oldMain.querySelectorAll('.v7-flow-summary,.v9-workspace-title,.v7-advanced-flow,.v3-continuity,.v5-tree-section').forEach(x=>x.classList.add('r10-engine-hidden'));

    const statusField=r10MoveField(oldSide,'detailStatus'), ownerField=r10MoveField(oldSide,'detailPrimaryAssignee'), dueField=r10MoveField(oldSide,'detailDue'), priorityField=r10MoveField(oldSide,'detailPriority'), campaignField=r10MoveField(oldSide,'detailCampaign'), startField=r10MoveField(oldSide,'detailStart'), supportField=r10MoveField(oldSide,'detailAddAssignee'), recurrenceField=r10MoveField(oldSide,'detailRecurrence');

    const workspace=document.createElement('div');workspace.className='r10-workspace';workspace.insertAdjacentHTML('beforeend',r10FlowHtml(t,rows));

    const center=document.createElement('main');center.className='r10-main';
    center.innerHTML='<div class="r10-main-top"><button type="button" class="r10-icon-btn" data-r10-back>←</button><div class="r10-main-nav"><button type="button" class="r10-icon-btn" data-r10-more>•••</button><button type="button" class="r10-icon-btn" '+(prev?'':'disabled')+' data-r10-prev>‹</button><span class="r10-counter">'+(index+1)+' de '+Math.max(rows.length,1)+'</span><button type="button" class="r10-icon-btn" '+(nextTask?'':'disabled')+' data-r10-next>›</button></div></div><header class="r10-task-head"><span class="r10-kicker">▣ &nbsp; TAREFA</span><h1 class="r10-title">'+r10Esc(t.title||'Tarefa')+'</h1><p class="r10-subtitle">Execução vinculada a '+r10Esc(t.project||'Operação')+'.</p><div class="r10-pills"><span class="r10-pill">'+r10Esc(t.brand||'Marca')+'</span><span class="r10-pill">'+r10Esc(t.project||'Operação')+'</span><span class="r10-pill priority">'+r10Esc(r10Priority(t))+'</span></div></header><div class="r10-center-stack"></div>';
    const centerStack=center.querySelector('.r10-center-stack');[briefing,incoming,attachments,delivery,simpleAction].filter(Boolean).forEach(x=>centerStack.appendChild(x));workspace.appendChild(center);

    const side=document.createElement('aside');side.className='r10-side';side.innerHTML='<div class="r10-side-stack"></div>';const stack=side.querySelector('.r10-side-stack');
    const info=document.createElement('section');info.className='r10-side-card';info.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">◉</span><strong>Status e informações</strong></div><div class="r10-side-card-body"></div>';const ib=info.querySelector('.r10-side-card-body');[statusField,ownerField,dueField,priorityField].filter(Boolean).forEach(x=>ib.appendChild(x));stack.appendChild(info);

    const context=document.createElement('section');context.className='r10-side-card';context.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">▣</span><strong>Contexto da campanha</strong></div><div class="r10-side-card-body"></div>';const cb=context.querySelector('.r10-side-card-body');if(campaignField)cb.appendChild(campaignField);cb.insertAdjacentHTML('beforeend','<div class="r10-context-row"><span>Marca</span><span class="r10-context-value">'+r10Esc(t.brand||'—')+'</span></div><div class="r10-context-row"><span>Projeto</span><span class="r10-context-value">'+r10Esc(t.project||'Operação')+'</span></div>');stack.appendChild(context);

    const tags=(t.tags||[]).filter(Boolean);const tagList=(tags.length?tags:[t.brand||'Operação',r10Priority(t)]).map(x=>'<span class="r10-tag">'+r10Esc(x)+'</span>').join('');stack.insertAdjacentHTML('beforeend',r10Card('Sinais e tags','◇','<div class="r10-tags">'+tagList+'</div>'));

    const deps=r10Deps(t), dependents=r10Dependents(t);let depHtml='';
    if(deps.length){depHtml+='<div class="r10-context-row"><span>Depende de</span><div>';deps.forEach(x=>{depHtml+='<button type="button" class="r10-dep-row '+(x.status==='feito'?'':'blocked')+'" data-r10-task="'+r10Esc(x.id)+'"><span class="r10-dep-dot">'+(x.status==='feito'?'✓':'!')+'</span><span><b>'+r10Esc(x.title)+'</b><span>'+r10Esc(r10Status(x))+'</span></span></button>'});depHtml+='</div></div>'}
    if(dependents.length){depHtml+='<div class="r10-context-row"><span>Desbloqueia</span><div>';dependents.forEach(x=>{depHtml+='<button type="button" class="r10-dep-row '+(r10Status(x)==='Bloqueada'?'blocked':'')+'" data-r10-task="'+r10Esc(x.id)+'"><span class="r10-dep-dot">→</span><span><b>'+r10Esc(x.title)+'</b><span>'+r10Esc(r10Status(x))+'</span></span></button>'});depHtml+='</div></div>'}
    if(!depHtml)depHtml='<div style="font-size:9px;color:#8e979f">Sem dependências vinculadas.</div>';stack.insertAdjacentHTML('beforeend',r10Card('Dependências','⌘',depHtml));

    if(comments){const card=document.createElement('section');card.className='r10-side-card';card.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">▤</span><strong>Observações</strong></div><div class="r10-side-card-body"></div>';const cc=card.querySelector('.r10-side-card-body');[comments.querySelector('.v3-comment-add'),comments.querySelector('#commentList'),comments.querySelector('.v3-history')].filter(Boolean).forEach(x=>cc.appendChild(x));stack.appendChild(card)}

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

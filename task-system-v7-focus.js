/* AllianceOS · Tarefas — foco no colaborador
   A lógica de fluxo continua completa, mas a tela padrão é uma workspace de execução. */
{
  const v7Task = id => taskData.find(x=>String(x.id)===String(id)) || null;
  const v7Short = name => String(name||'').split('|')[0].trim();
  const v7Deps = t => (t.dependencies||[]).map(v7Task).filter(Boolean);
  const v7Blockers = t => v7Deps(t).filter(x=>x.status!=='feito');
  const v7Dependents = t => taskData.filter(x=>(x.dependencies||[]).some(id=>String(id)===String(t.id)));
  const v7Date = v => v ? dateBr(v) : 'Sem prazo';
  const v7Initials = name => v7Short(name||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || '—';

  function v7FlowSummary(t){
    const blockers=v7Blockers(t), parent=t.parentTaskId?v7Task(t.parentTaskId):null, next=v7Dependents(t), done=t.status==='feito';
    let headline=done?'Execução concluída':'Pronta para executar';
    let detail=done?'Esta etapa foi finalizada e o fluxo já pode seguir.':next.length?`Ao concluir, ${next.length===1?'a próxima etapa será liberada':`${next.length} próximas etapas serão liberadas`}.`:'Você pode concluir assim que terminar a execução.';
    if(blockers.length){headline=`Aguardando ${blockers.length===1?'uma etapa anterior':'etapas anteriores'}`;detail=`Antes de seguir, falta concluir: ${blockers.slice(0,2).map(x=>x.title).join(', ')}${blockers.length>2?'…':''}.`;}
    else if(parent&&!done) detail=`Etapa do fluxo “${parent.title}”. ${detail}`;
    const state=done?'done':blockers.length?'blocked':'ready';
    const icon=done?'✓':blockers.length?'!':'→';
    return `<div class="v7-flow-summary ${state}">
      <div class="v9-status-icon" aria-hidden="true">${icon}</div>
      <div class="v9-status-copy"><small>Execução</small><strong>${esc(headline)}</strong><span>${esc(detail)}</span></div>
      <button type="button" class="v7-view-flow">Ver fluxo</button>
    </div>`;
  }

  function v7SimpleComplete(t){
    if(t.deliveryRequired)return '';
    const blockers=v7Blockers(t), done=t.status==='feito';
    return `<section class="v7-simple-action ${blockers.length?'blocked':''}">
      <div><small>Próxima ação</small><strong>${done?'Tarefa concluída':'Concluir execução'}</strong><span>${done?'Se precisar, você pode reabrir a tarefa.':blockers.length?'A conclusão será liberada quando as etapas anteriores terminarem.':'Terminou o que precisava ser feito? Conclua a tarefa.'}</span></div>
      <button type="button" class="v7-complete-proxy" ${blockers.length&&!done?'disabled':''}>${done?'Reabrir tarefa':'Concluir tarefa'}</button>
    </section>`;
  }

  function v7SideSummary(t){
    const rawWho=(t.assignees||[])[0]||'Sem responsável', who=v7Short(rawWho), priority=t.priority||'Normal', campaign=t.campaign||t.project||'Sem campanha';
    return `<div class="v7-side-summary">
      <div class="v9-context-person">
        <span class="v9-context-avatar">${esc(v7Initials(rawWho))}</span>
        <div><small>Responsável pela execução</small><strong>${esc(who)}</strong></div>
      </div>
      <div class="v9-context-list">
        <div><span>Prazo</span><strong>${esc(v7Date(t.due))}</strong></div>
        <div><span>Prioridade</span><strong>${esc(priority)}</strong></div>
        <div class="wide"><span>Campanha / planejamento</span><strong>${esc(campaign)}</strong></div>
      </div>
    </div>`;
  }

  function v9WorkspaceTitle(){
    return `<div class="v9-workspace-title"><span>Execução da tarefa</span><strong>O que precisa ser feito</strong><small>Leia o briefing, use os materiais recebidos e envie a entrega quando terminar.</small></div>`;
  }

  const v7BaseRenderDetail=renderTaskDetailBody;
  renderTaskDetailBody=function(t){
    v7BaseRenderDetail(t);
    const main=document.querySelector('#taskDetailBody .tdetail-main');
    const sidePanel=document.querySelector('#taskDetailBody .tdetail-side');
    if(!main||!sidePanel)return;

    const tree=main.querySelector('.v5-tree-section');
    const dependency=main.querySelector('.v3-flow-grid')?.closest('.v3-section');
    [tree,dependency].filter(Boolean).forEach(el=>el.classList.add('v7-advanced-flow'));

    const ready=main.querySelector('.v3-ready-banner,.v3-block-banner');
    if(!main.querySelector('.v7-flow-summary')){
      const wrap=document.createElement('div');wrap.innerHTML=v7FlowSummary(t);
      const el=wrap.firstElementChild;
      if(ready)ready.insertAdjacentElement('afterend',el); else main.prepend(el);
      el.querySelector('.v7-view-flow')?.addEventListener('click',()=>{
        const open=!main.classList.contains('v7-flow-open');
        main.classList.toggle('v7-flow-open',open);
        el.querySelector('.v7-view-flow').textContent=open?'Ocultar fluxo':'Ver fluxo';
        if(open) tree?.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }

    const briefing=main.querySelector('.description-area')?.closest('.v3-section');
    const incoming=main.querySelector('.v5-incoming-section');
    const delivery=main.querySelector('.v5-delivery-section');
    if(briefing){
      if(!main.querySelector('.v9-workspace-title')){
        const title=document.createElement('div');title.innerHTML=v9WorkspaceTitle();
        briefing.insertAdjacentElement('beforebegin',title.firstElementChild);
      }
      let anchor=briefing;
      if(incoming){anchor.insertAdjacentElement('afterend',incoming);anchor=incoming;}
      if(delivery){anchor.insertAdjacentElement('afterend',delivery);anchor=delivery;}
      if(!t.deliveryRequired && !main.querySelector('.v7-simple-action')){
        const wrap=document.createElement('div');wrap.innerHTML=v7SimpleComplete(t);const action=wrap.firstElementChild;
        if(action){anchor.insertAdjacentElement('afterend',action);action.querySelector('.v7-complete-proxy')?.addEventListener('click',()=>document.getElementById('v3CompleteTaskBtn')?.click());}
      }
    }

    const continuity=main.querySelector('.v3-continuity');
    if(continuity)continuity.classList.add('v7-engine-only');

    if(!sidePanel.querySelector('.v7-side-summary')){
      const title=sidePanel.querySelector('.v3-side-title');
      if(title){
        title.querySelector('strong') && (title.querySelector('strong').textContent='Contexto');
        title.querySelector('span') && (title.querySelector('span').textContent='Informações essenciais desta execução');
      }
      const summaryWrap=document.createElement('div');summaryWrap.innerHTML=v7SideSummary(t);const summary=summaryWrap.firstElementChild;
      if(title) title.insertAdjacentElement('afterend',summary); else sidePanel.prepend(summary);

      const grid=sidePanel.querySelector('.tdetail-grid');
      if(grid){
        const details=document.createElement('details');details.className='v7-side-details';
        details.innerHTML='<summary><span>Configurações da tarefa</span><small>Status, responsáveis, datas e regras</small></summary><div class="v7-side-details-body"></div>';
        grid.parentNode.insertBefore(details,grid);
        details.querySelector('.v7-side-details-body').appendChild(grid);
      }
    }
  };
}

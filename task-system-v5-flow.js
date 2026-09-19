/* AllianceOS · Tarefas V5 — entrega obrigatória + árvore de execução
   Injetado depois do V3, ainda dentro do IIFE nativo de tarefas. */
{
  const v5Task = id => taskData.find(x=>String(x.id)===String(id)) || null;
  const v5Id = (p='x') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const v5Short = name => String(name||'').split('|')[0].trim();
  const v5Who = () => v5Short(user?.firstName || 'Equipe');
  const v5Deps = t => (t.dependencies||[]).map(v5Task).filter(Boolean);
  const v5Blockers = t => v5Deps(t).filter(x=>x.status!=='feito');
  const v5Dependents = t => taskData.filter(x=>(x.dependencies||[]).some(id=>String(id)===String(t.id)));
  const v5Parent = t => t.parentTaskId ? v5Task(t.parentTaskId) : null;
  const v5Children = t => taskData.filter(x=>String(x.parentTaskId||'')===String(t.id));

  function v5Normalize(t, setDefault=true){
    if(!t) return t;
    if(!Array.isArray(t.dependencies)) t.dependencies=[];
    if(!Array.isArray(t.deliveries)) t.deliveries=[];
    if(!Array.isArray(t.history)) t.history=[];
    if(!Array.isArray(t.assignees)) t.assignees=[];
    if(setDefault && typeof t.deliveryRequired!=='boolean') t.deliveryRequired=v5Dependents(t).length>0;
    return t;
  }
  taskData.forEach(t=>v5Normalize(t,false));
  taskData.forEach(t=>v5Normalize(t,true));

  const v5SentDeliveries = t => (v5Normalize(t).deliveries||[]).filter(d=>d&&d.status==='sent');
  const v5HasDelivery = t => v5SentDeliveries(t).length>0;
  const v5NeedsDelivery = t => !!v5Normalize(t).deliveryRequired;
  const v5Incoming = t => v5Deps(t).flatMap(source=>v5SentDeliveries(source).map(d=>({...d,sourceTaskId:source.id,sourceTitle:source.title,sourceStatus:source.status})));

  function v5Persist(render=true){
    taskData.forEach(t=>v5Normalize(t));
    localStorage.setItem(taskStorageKey,JSON.stringify(taskData));
    updateTaskCount();
    if(render) renderTasks();
  }

  function v5ConferenceProblem(t){
    v5Normalize(t);
    if(!t.conferenceRequired)return '';
    const items=t.checklist||[];
    if(!items.length)return 'A lista de conferência obrigatória está sem itens.';
    const pending=items.filter(x=>!x.done);
    return pending.length?`Confira todos os itens da lista antes de continuar (${pending.length} pendente${pending.length>1?'s':''}).`:'';
  }

  function v5CloseConferenceModal(){
    document.querySelector('.v5-conference-modal')?.remove();
    document.body.classList.remove('v5-conference-modal-open');
  }

  function v5OpenConferenceModal(t){
    v5Normalize(t);
    v5CloseConferenceModal();
    const items=Array.isArray(t.checklist)?t.checklist:[];
    const modal=document.createElement('div');
    modal.className='v5-conference-modal';
    modal.innerHTML='<div class="v5-conference-backdrop" data-v5-conference-close></div><section class="v5-conference-dialog" role="dialog" aria-modal="true" aria-label="Lista de conferência"><header class="v5-conference-head"><div><span class="v5-conference-kicker">CONFERÊNCIA FINAL</span><h2>Confira antes de concluir</h2><p>Marque cada item conferido. Seu progresso fica salvo automaticamente.</p></div><button type="button" class="v5-conference-close" data-v5-conference-close aria-label="Fechar">×</button></header><div class="v5-conference-progress"><div><strong data-v5-conference-count></strong><span>itens conferidos</span></div><div class="v5-conference-track"><span data-v5-conference-bar></span></div></div><div class="v5-conference-list">'+(items.length?items.map(item=>'<label class="v5-conference-item '+(item.done?'done':'')+'"><input type="checkbox" data-v5-conference-check="'+esc(item.id)+'" '+(item.done?'checked':'')+'><span class="v5-conference-box">✓</span><span class="v5-conference-text">'+esc(item.text)+'</span></label>').join(''):'<div class="v5-conference-empty">Esta tarefa exige conferência, mas a lista está sem itens.</div>')+'</div><footer class="v5-conference-foot"><button type="button" class="v5-conference-cancel" data-v5-conference-close>Fechar</button><button type="button" class="v5-conference-complete" data-v5-conference-complete>Concluir tarefa</button></footer></section>';
    document.body.appendChild(modal);
    document.body.classList.add('v5-conference-modal-open');

    const refresh=()=>{
      const done=items.filter(x=>x.done).length;
      const total=items.length;
      const count=modal.querySelector('[data-v5-conference-count]');
      const bar=modal.querySelector('[data-v5-conference-bar]');
      const complete=modal.querySelector('[data-v5-conference-complete]');
      if(count)count.textContent=done+' de '+total;
      if(bar)bar.style.width=(total?Math.round(done/total*100):0)+'%';
      if(complete){
        complete.disabled=!total||done!==total;
        complete.textContent=done===total&&total?'Concluir tarefa':'Confira todos os itens';
      }
    };

    modal.querySelectorAll('[data-v5-conference-check]').forEach(input=>input.addEventListener('change',()=>{
      const item=items.find(x=>String(x.id)===String(input.dataset.v5ConferenceCheck));
      if(!item)return;
      item.done=input.checked;
      input.closest('.v5-conference-item')?.classList.toggle('done',input.checked);
      v5Persist(false);
      window.AllianceOSOps?.recordTaskAction?.('marcar_item_checklist',t,{item_id:item.id,concluido:item.done});
      refresh();
    }));
    modal.querySelectorAll('[data-v5-conference-close]').forEach(btn=>btn.addEventListener('click',v5CloseConferenceModal));
    modal.querySelector('[data-v5-conference-complete]')?.addEventListener('click',()=>{
      if(items.some(x=>!x.done)||!items.length)return;
      v5CloseConferenceModal();
      if(v5Complete(t,true))closeTaskDetail();
    });
    const escClose=e=>{if(e.key==='Escape'){v5CloseConferenceModal();document.removeEventListener('keydown',escClose)}};
    document.addEventListener('keydown',escClose);
    refresh();
  }

  function v5CompletionProblem(t){
    const blockers=v5Blockers(t);
    if(blockers.length) return `Conclua antes: ${blockers.slice(0,2).map(x=>x.title).join(', ')}${blockers.length>2?'…':''}`;
    const conferenceProblem=v5ConferenceProblem(t);
    if(conferenceProblem)return conferenceProblem;
    if(v5NeedsDelivery(t) && !v5HasDelivery(t)) return 'Envie a entrega desta etapa antes de concluir.';
    return '';
  }

  function v5Complete(t,done=true){
    v5Normalize(t);
    if(done){
      const blockers=v5Blockers(t);
      if(blockers.length){showToast(`Conclua antes: ${blockers.slice(0,2).map(x=>x.title).join(', ')}${blockers.length>2?'…':''}`);return false;}
      const conferenceProblem=v5ConferenceProblem(t);
      if(conferenceProblem){v5OpenConferenceModal(t);return false;}
      if(v5NeedsDelivery(t) && !v5HasDelivery(t)){showToast('Envie a entrega desta etapa antes de concluir.');return false;}
      if(t.status!=='feito'){
        const old=t.status;t.status='feito';
        t.history.unshift({at:'Agora',text:`Status alterado de “${old}” para “feito”.`});
        if(v5HasDelivery(t)) t.history.unshift({at:'Agora',text:'Etapa concluída com entrega enviada.'});
        for(const next of v5Dependents(t)){
          v5Normalize(next);
          next.history.unshift({at:'Agora',text:`“${t.title}” foi concluída${v5HasDelivery(t)?' com entrega':''}. Esta tarefa está liberada para execução.`});
        }
      }
    } else if(t.status==='feito'){
      t.status='a fazer';
      t.history.unshift({at:'Agora',text:'Tarefa reaberta.'});
    }
    v5Persist(true);
    return true;
  }

  function v5Root(t){
    let cur=t, seen=new Set();
    while(cur?.parentTaskId && !seen.has(String(cur.id))){
      seen.add(String(cur.id));
      const p=v5Task(cur.parentTaskId); if(!p) break; cur=p;
    }
    return cur||t;
  }

  function v5Depth(t){
    let n=0,cur=t,seen=new Set();
    while(cur?.parentTaskId && n<6 && !seen.has(String(cur.id))){
      seen.add(String(cur.id));const p=v5Task(cur.parentTaskId);if(!p)break;n++;cur=p;
    }
    return n;
  }

  function v5TreeNode(node,currentId,depth=0,seen=new Set()){
    if(!node||seen.has(String(node.id))||depth>7)return '';
    seen.add(String(node.id));v5Normalize(node);
    const children=v5Children(node);
    const current=String(node.id)===String(currentId);
    const status=node.status==='feito'?'Concluída':v5Blockers(node).length?'Bloqueada':node.status;
    const delivery=v5NeedsDelivery(node)?(v5HasDelivery(node)?'Entrega enviada':'Entrega pendente'):'';
    return `<div class="v5-tree-branch" style="--tree-depth:${depth}">
      <button type="button" class="v5-tree-node ${current?'current':''} ${node.status==='feito'?'done':''}" data-v5-open-task="${esc(node.id)}">
        <span class="v5-tree-mark">${node.status==='feito'?'✓':depth?'↳':'●'}</span>
        <span class="v5-tree-main"><b>${esc(node.title)}</b><small>${esc(v5Short(node.assignees[0]||'Sem responsável'))} · ${esc(status)}${node.due?` · ${dateBr(node.due)}`:''}</small></span>
        ${delivery?`<span class="v5-tree-delivery ${v5HasDelivery(node)?'sent':'pending'}">${esc(delivery)}</span>`:''}
      </button>
      ${children.length?`<div class="v5-tree-children">${children.map(c=>v5TreeNode(c,currentId,depth+1,new Set(seen))).join('')}</div>`:''}
    </div>`;
  }

  function v5TreeHtml(t){
    const root=v5Root(t);
    return `<section class="tsection v3-section v5-tree-section"><div class="tsection-head"><div><strong>Fluxo desta execução</strong><span>As etapas continuam sendo tarefas independentes, mas fazem parte do mesmo fluxo.</span></div></div><div class="v5-tree">${v5TreeNode(root,t.id)}</div></section>`;
  }

  function v5FilesHtml(files=[]){
    return files.map(f=>{
      const name=esc(f.name||'arquivo');
      if(f.dataUrl) return `<a class="v5-material" href="${esc(f.dataUrl)}" download="${name}"><span>↓</span><b>${name}</b><small>${esc(f.sizeLabel||'arquivo')}</small></a>`;
      return `<span class="v5-material"><span>◫</span><b>${name}</b><small>${esc(f.sizeLabel||'arquivo')}</small></span>`;
    }).join('');
  }

  function v5LinksHtml(links=[]){
    return links.map(l=>`<a class="v5-material" href="${esc(l.url)}" target="_blank" rel="noopener"><span>↗</span><b>${esc(l.label||'Abrir link')}</b><small>link</small></a>`).join('');
  }

  function v5DeliveryCard(d,sourceTitle=''){
    return `<article class="v5-delivery-card"><div class="v5-delivery-card-head"><div><strong>${sourceTitle?`Entrega de “${esc(sourceTitle)}”`:'Entrega enviada'}</strong><span>${esc(d.author||'Equipe')} · ${esc(d.at||'Agora')}</span></div><span class="v5-delivery-ok">Enviado</span></div>${d.note?`<p>${esc(d.note)}</p>`:''}<div class="v5-materials">${v5FilesHtml(d.files)}${v5LinksHtml(d.links)}</div></article>`;
  }

  function v5IncomingHtml(t){
    const incoming=v5Incoming(t);
    if(!incoming.length)return '';
    return `<section class="tsection v3-section v5-incoming-section"><div class="tsection-head"><div><strong>Materiais recebidos das etapas anteriores</strong><span>O que foi entregue antes já chega nesta tarefa.</span></div><span>${incoming.length}</span></div><div class="v5-delivery-list">${incoming.map(d=>v5DeliveryCard(d,d.sourceTitle)).join('')}</div></section>`;
  }

  function v5DeliverySectionHtml(t){
    const sent=v5SentDeliveries(t), required=v5NeedsDelivery(t), blockers=v5Blockers(t);
    return `<section class="tsection v3-section v5-delivery-section"><div class="tsection-head"><div><strong>Entrega desta etapa</strong><span>${required?'Obrigatória para concluir e liberar as próximas tarefas.':'Opcional. Use para registrar o material produzido nesta tarefa.'}</span></div><span class="v5-delivery-state ${sent.length?'sent':required?'pending':''}">${sent.length?'Entrega enviada':required?'Pendente':'Opcional'}</span></div>
      ${sent.length?`<div class="v5-delivery-list">${sent.slice().reverse().map(d=>v5DeliveryCard(d)).join('')}</div>`:''}
      <div class="v5-delivery-compose">
        <div class="v5-compose-grid"><label class="v5-compose-note">Mensagem da entrega<textarea id="v5DeliveryNote" placeholder="Explique o que está sendo entregue e qualquer orientação para a próxima pessoa."></textarea></label><label>Link do material<input id="v5DeliveryLink" type="url" placeholder="https://drive.google.com/… ou Figma, Docs, etc."></label><label>Nome do link<input id="v5DeliveryLinkLabel" placeholder="Ex.: Copy aprovada"></label><label class="v5-file-field">Arquivo pequeno<input id="v5DeliveryFiles" type="file" multiple accept="image/*,.pdf,.txt,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx"><small>Até 1,2 MB no total. Para arquivos grandes, use um link.</small></label></div>
        <div class="v5-delivery-actions"><button type="button" id="v5SendDelivery">Enviar entrega</button><button type="button" class="primary" id="v5SendAndComplete" ${blockers.length?'disabled':''}>Enviar e concluir</button></div>
      </div></section>`;
  }

  function v5RuleHtml(t){
    return `<div class="v5-delivery-rule"><div><strong>Exigir entrega para concluir</strong><span>Enquanto não houver material enviado, esta tarefa não pode ser concluída nem liberar a próxima.</span></div><label class="v5-switch"><input type="checkbox" id="v5DeliveryRequired" ${v5NeedsDelivery(t)?'checked':''}><span></span></label></div>`;
  }

  function v5ReadFile(file){
    return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type||'',size:file.size,sizeLabel:`${Math.max(1,Math.round(file.size/1024))} KB`,dataUrl:String(r.result||'')});r.onerror=()=>reject(r.error||new Error('Falha ao ler arquivo'));r.readAsDataURL(file)});
  }

  async function v5SendDelivery(t,completeAfter=false){
    v5Normalize(t);
    const note=document.getElementById('v5DeliveryNote')?.value.trim()||'';
    const url=document.getElementById('v5DeliveryLink')?.value.trim()||'';
    const label=document.getElementById('v5DeliveryLinkLabel')?.value.trim()||'';
    const input=document.getElementById('v5DeliveryFiles');
    const rawFiles=[...(input?.files||[])];
    if(url){try{const parsed=new URL(url);if(!/^https?:$/.test(parsed.protocol))throw new Error();}catch{showToast('Use um link válido começando por https://');return false;}}
    const total=rawFiles.reduce((n,f)=>n+f.size,0);
    if(total>1200000){showToast('Os arquivos somam mais de 1,2 MB. Para arquivos maiores, envie um link do Drive/Figma.');return false;}
    if(!rawFiles.length&&!url&&!note){showToast('Adicione um arquivo, escreva a entrega ou informe um link.');return false;}
    let files=[];
    try{files=await Promise.all(rawFiles.map(v5ReadFile));}catch{showToast('Não foi possível preparar um dos arquivos.');return false;}
    const links=url?[{label:label||'Material da entrega',url}]:[];
    const delivery={id:v5Id('delivery'),status:'sent',author:v5Who(),at:'Agora',sentAt:new Date().toISOString(),note,files,links};
    t.deliveries.push(delivery);
    t.history.unshift({at:'Agora',text:`${v5Who()} enviou a entrega desta etapa${files.length?` com ${files.length} arquivo(s)`:''}${links.length?' e link':''}.`});
    v5Persist(false);
    if(completeAfter){
      if(v5Complete(t,true)){closeTaskDetail();return true;}
    }
    renderTaskDetailBody(t);
    showToast('Entrega enviada');
    return true;
  }

  const v5BaseRenderDetail=renderTaskDetailBody;
  renderTaskDetailBody=function(t){
    v5Normalize(t);
    v5BaseRenderDetail(t);
    const main=document.querySelector('#taskDetailBody .tdetail-main');
    const side=document.querySelector('#taskDetailBody .tdetail-grid');
    if(!main||!side)return;

    const flowSection=main.querySelector('.v3-flow-grid')?.closest('.v3-section');
    if(flowSection && !main.querySelector('.v5-tree-section')) flowSection.insertAdjacentHTML('beforebegin',v5TreeHtml(t));

    const continuity=main.querySelector('.v3-continuity');
    if(continuity){
      if(!main.querySelector('.v5-incoming-section')) continuity.insertAdjacentHTML('beforebegin',v5IncomingHtml(t));
      if(!main.querySelector('.v5-delivery-section')) continuity.insertAdjacentHTML('beforebegin',v5DeliverySectionHtml(t));
    }

    if(!side.querySelector('.v5-delivery-rule')){
      const priority=side.querySelector('#detailPriority')?.closest('.tfield');
      (priority||side.firstElementChild)?.insertAdjacentHTML(priority?'beforebegin':'afterend',v5RuleHtml(t));
    }

    const doneOption=[...(document.getElementById('detailStatus')?.options||[])].find(o=>o.value==='feito');
    const conferenceProblem=v5ConferenceProblem(t);
    if(doneOption && t.status!=='feito' && (v5NeedsDelivery(t) && !v5HasDelivery(t))){
      doneOption.disabled=true;doneOption.textContent='feito · requer entrega';
    } else if(doneOption && t.status!=='feito' && conferenceProblem){
      doneOption.disabled=false;doneOption.textContent='feito · conferir antes';
    }

    const oldComplete=document.getElementById('v3CompleteTaskBtn');
    if(oldComplete){
      const btn=oldComplete.cloneNode(true);oldComplete.replaceWith(btn);
      const blockers=v5Blockers(t);
      const deliveryPending=v5NeedsDelivery(t)&&!v5HasDelivery(t);
      if(t.status!=='feito'&&(blockers.length||deliveryPending)){
        btn.disabled=true;
        btn.textContent=deliveryPending&&!blockers.length?'Envie a entrega para concluir':'Conclua as etapas anteriores';
      }else{
        btn.disabled=false;
        btn.textContent=t.status==='feito'?'Reabrir tarefa':v5Dependents(t).length?'Concluir e liberar próximas':'Concluir tarefa';
      }
      btn.addEventListener('click',()=>{
        if(t.status==='feito'){v5Complete(t,false);return;}
        if(v5ConferenceProblem(t)){v5OpenConferenceModal(t);return;}
        if(v5Complete(t,true))closeTaskDetail();
      });
    }

    document.getElementById('v5DeliveryRequired')?.addEventListener('change',e=>{t.deliveryRequired=e.target.checked;t.history.unshift({at:'Agora',text:e.target.checked?'Entrega obrigatória ativada para esta tarefa.':'Entrega obrigatória desativada para esta tarefa.'});v5Persist(false);renderTaskDetailBody(t)});
    document.getElementById('v5SendDelivery')?.addEventListener('click',()=>v5SendDelivery(t,false));
    document.getElementById('v5SendAndComplete')?.addEventListener('click',()=>v5SendDelivery(t,true));
    document.querySelectorAll('[data-v5-open-task]').forEach(el=>el.addEventListener('click',()=>openTaskDetail(el.dataset.v5OpenTask)));
  };

  const v5BaseSaveCurrentTask=saveCurrentTask;
  saveCurrentTask=function(){
    const t=v5Task(taskState.selected);if(!t)return;
    v5Normalize(t);
    const wanted=document.getElementById('detailStatus')?.value||t.status;
    if(wanted==='feito'&&t.status!=='feito'){
      const blockers=v5Blockers(t);
      const deliveryPending=v5NeedsDelivery(t)&&!v5HasDelivery(t);
      if(blockers.length||deliveryPending){
        document.getElementById('detailStatus').value=t.status;
        showToast(blockers.length?'Conclua as etapas anteriores antes de finalizar.':'Envie a entrega desta etapa antes de concluir.');
        if(deliveryPending)document.querySelector('.v5-delivery-section')?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      if(v5ConferenceProblem(t)){
        document.getElementById('detailStatus').value=t.status;
        v5OpenConferenceModal(t);
        return;
      }
    }
    v5BaseSaveCurrentTask();
  };

  bindTaskElements=function(){
    document.querySelectorAll('[data-task-id]').forEach(el=>el.addEventListener('click',e=>{if(e.target.closest('[data-v3-toggle-done]'))return;openTaskDetail(el.dataset.taskId)}));
    document.querySelectorAll('[data-v3-toggle-done]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const t=v5Task(b.dataset.v3ToggleDone);if(t)v5Complete(t,t.status!=='feito')}));
    document.querySelectorAll('[data-inline-new]').forEach(b=>b.addEventListener('click',()=>openNewTask(b.dataset.inlineNew)));
  };

  bindDrag=function(){
    document.querySelectorAll('[data-drag-id]').forEach(card=>{card.addEventListener('dragstart',e=>{card.classList.add('dragging');e.dataTransfer.setData('text/plain',card.dataset.dragId)});card.addEventListener('dragend',()=>card.classList.remove('dragging'))});
    document.querySelectorAll('[data-v3-drop-status]').forEach(col=>{col.addEventListener('dragover',e=>e.preventDefault());col.addEventListener('drop',e=>{e.preventDefault();const t=v5Task(e.dataTransfer.getData('text/plain'));if(!t)return;const next=col.dataset.v3DropStatus;if(t.status===next)return;if(next==='feito'){if(!v5Complete(t,true))return;}else{const old=t.status;t.status=next;t.history.unshift({at:'Agora',text:`Status alterado de “${old}” para “${next}”.`});v5Persist(true)}})})
  };

  const v5BaseRenderListRow=renderListRow;
  renderListRow=function(t){
    v5Normalize(t);
    let html=v5BaseRenderListRow(t);
    const depth=Math.min(v5Depth(t),4);
    const deliveryBadge=v5NeedsDelivery(t)?`<span class="flow-pill v5-delivery-pill ${v5HasDelivery(t)?'sent':'pending'}">${v5HasDelivery(t)?'Entrega ✓':'Entrega pendente'}</span>`:'';
    html=html.replace('class="cu-row ',`class="cu-row v5-tree-row v5-depth-${depth} `);
    html=html.replace('<div class="cu-row-title">',`<div class="cu-row-title"><span class="v5-list-tree-mark" aria-hidden="true">${depth?'↳':'●'}</span>`);
    if(deliveryBadge) html=html.replace('</div><small>',`${deliveryBadge}</div><small>`);
    return html;
  };

  v5Persist(false);
}
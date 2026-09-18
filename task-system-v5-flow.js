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
      const problem=v5CompletionProblem(t);
      if(problem){showToast(problem);return false;}
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
    if(!rawFiles.length&&!url){showToast('Adicione pelo menos um arquivo ou link para enviar a entrega.');return false;}
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
    if(doneOption && t.status!=='feito' && (conferenceProblem || (v5NeedsDelivery(t) && !v5HasDelivery(t)))){
      doneOption.disabled=true;doneOption.textContent=conferenceProblem?'feito · requer conferência':'feito · requer entrega';
    }

    const oldComplete=document.getElementById('v3CompleteTaskBtn');
    if(oldComplete){
      const btn=oldComplete.cloneNode(true);oldComplete.replaceWith(btn);
      const problem=v5CompletionProblem(t);
      if(t.status!=='feito'&&problem){btn.disabled=true;btn.textContent=v5ConferenceProblem(t)?'Conclua a lista de conferência':v5NeedsDelivery(t)&&!v5HasDelivery(t)&&!v5Blockers(t).length?'Envie a entrega para concluir':'Conclua as etapas anteriores';}
      else{btn.disabled=false;btn.textContent=t.status==='feito'?'Reabrir tarefa':v5Dependents(t).length?'Concluir e liberar próximas':'Concluir tarefa';}
      btn.addEventListener('click',()=>{if(t.status==='feito')v5Complete(t,false);else if(v5Complete(t,true))closeTaskDetail()});
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
      const problem=v5CompletionProblem(t);
      if(problem){document.getElementById('detailStatus').value=t.status;showToast(problem);document.querySelector('.v5-delivery-section')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
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
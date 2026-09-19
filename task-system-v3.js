/* AllianceOS · Tarefas V3
   Este arquivo é injetado dentro do IIFE nativo de tarefas pelo build.js.
   Portanto ele usa taskData/taskState/TASK_USERS/etc. do módulo legado e
   substitui apenas a experiência de tarefas, sem duplicar a persistência. */
{
  let v3WeekOffset = 0;
  let v3NewPreset = {};
  window.AllianceOSDirectory=window.AllianceOSDirectory||{members:[],lists:[],brands:[]};

  // AllianceOS V2: status operacionais, horário, recorrência e arquivamento.
  if(Array.isArray(TASK_STATUSES)){
    TASK_STATUSES.splice(0,TASK_STATUSES.length,'a fazer','fazendo','em revisão','bloqueado','feito');
  }
  if(typeof STATUS_COLORS==='object'&&STATUS_COLORS){
    STATUS_COLORS['em revisão']='#7b61a8';
    STATUS_COLORS['bloqueado']='#b84b4b';
  }

  const v3Pad=n=>String(n).padStart(2,'0');
  const v3ToLocalInput=(iso,dateOnly)=>{
    if(iso){
      const d=new Date(iso);
      if(!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${v3Pad(d.getMonth()+1)}-${v3Pad(d.getDate())}T${v3Pad(d.getHours())}:${v3Pad(d.getMinutes())}`;
    }
    return dateOnly?`${dateOnly}T18:00`:'';
  };
  const v3FromLocalInput=(value)=>{
    if(!value)return null;
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return null;
    const off=-d.getTimezoneOffset(), sign=off>=0?'+':'-', abs=Math.abs(off);
    return `${value.length===16?value+':00':value}${sign}${v3Pad(Math.floor(abs/60))}:${v3Pad(abs%60)}`;
  };
  const v3DueLabel=(t)=>{
    const raw=t?.dueAt||t?.due;
    if(!raw)return 'Sem prazo';
    if(t?.dueAt){
      const d=new Date(t.dueAt);
      if(!Number.isNaN(d.getTime()))return `${v3Pad(d.getDate())}/${v3Pad(d.getMonth()+1)} · ${v3Pad(d.getHours())}:${v3Pad(d.getMinutes())}`;
    }
    const p=String(raw).slice(0,10).split('-');
    return p.length===3?`${p[2]}/${p[1]}`:String(raw);
  };
  const v3RecurrenceSpec=(t)=>{
    if(t?.recurrenceRule&&typeof t.recurrenceRule==='object')return {tipo:t.recurrenceRule.tipo||'nenhuma',dias_semana:Array.isArray(t.recurrenceRule.dias_semana)?t.recurrenceRule.dias_semana:[]};
    if(t?.recurrence==='weekly')return {tipo:'semanal',dias_semana:[]};
    if(t?.recurrence==='biweekly')return {tipo:'quinzenal',dias_semana:[]};
    if(t?.recurrence==='monthly')return {tipo:'mensal',dias_semana:[]};
    if(t?.recurrence==='weekdays')return {tipo:'dias_semana',dias_semana:Array.isArray(t.recurrenceDays)?t.recurrenceDays:[]};
    return {tipo:'nenhuma',dias_semana:[]};
  };
  const v3ApplyRecurrence=(t,tipo,dias=[])=>{
    const unique=[...new Set((dias||[]).map(Number).filter(x=>x>=1&&x<=7))].sort();
    t.recurrenceRule={tipo:tipo||'nenhuma',dias_semana:unique};
    t.recurrence=tipo==='semanal'?'weekly':tipo==='quinzenal'?'biweekly':tipo==='mensal'?'monthly':tipo==='dias_semana'?'weekdays':'none';
    t.recurrenceDays=unique;
  };
  const v3NextRecurringDate=(t)=>{
    const r=v3RecurrenceSpec(t);if(r.tipo==='nenhuma')return null;
    const base=String(t.due||t.dueAt||v3TodayIso()).slice(0,10);
    const [y,m,d]=base.split('-').map(Number), date=new Date(y,m-1,d,12,0,0);
    if(r.tipo==='semanal')date.setDate(date.getDate()+7);
    else if(r.tipo==='quinzenal')date.setDate(date.getDate()+14);
    else if(r.tipo==='mensal')date.setMonth(date.getMonth()+1);
    else if(r.tipo==='dias_semana'){
      for(let i=1;i<=14;i++){
        const c=new Date(date);c.setDate(date.getDate()+i);
        const wd=c.getDay()===0?7:c.getDay();
        if(r.dias_semana.includes(wd)){date.setTime(c.getTime());break}
      }
    }
    return `${date.getFullYear()}-${v3Pad(date.getMonth()+1)}-${v3Pad(date.getDate())}`;
  };
  const v3GenerateNextOccurrence=(t)=>{
    const r=v3RecurrenceSpec(t);if(r.tipo==='nenhuma')return null;
    const existing=taskData.find(x=>String(x.recurrenceGeneratedFrom||'')===String(t.id));if(existing)return existing;
    const nextDate=v3NextRecurringDate(t);if(!nextDate)return null;
    let nextDueAt=null;
    if(t.dueAt){
      const old=new Date(t.dueAt), parts=nextDate.split('-').map(Number);
      const local=new Date(parts[0],parts[1]-1,parts[2],old.getHours(),old.getMinutes(),old.getSeconds());
      nextDueAt=v3FromLocalInput(`${parts[0]}-${v3Pad(parts[1])}-${v3Pad(parts[2])}T${v3Pad(local.getHours())}:${v3Pad(local.getMinutes())}`);
    }
    const next=v3NormalizeTask({...t,id:v3Id('rec'),status:'a fazer',blockedReason:null,due:nextDate,dueAt:nextDueAt,comments:[],deliveries:[],archivedAt:null,archivedBy:null,parentTaskId:null,dependencies:[],recurrenceSeriesId:t.recurrenceSeriesId||t.id,recurrenceGeneratedFrom:t.id,history:[{at:'Agora',text:`Ocorrência recorrente criada automaticamente a partir de “${t.title}”.`}],checklist:(t.checklist||[]).map(x=>({...x,done:false})),source:'interface-generated'});
    taskData.unshift(next);return next;
  };

  const v3Id = (p='task') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const v3TodayIso = () => {
    const d = new Date();
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const v3ParseDate = (iso) => {
    if(!iso) return null;
    const [y,m,d]=String(iso).split('-').map(Number);
    if(!y||!m||!d) return null;
    return new Date(y,m-1,d,12,0,0,0);
  };
  const v3Iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const v3Short = (name) => String(name||'').split('|')[0].trim();
  const v3Task = (id) => taskData.find(x=>String(x.id)===String(id)) || null;
  const v3Campaigns = () => {
    try {
      const rows = JSON.parse(localStorage.getItem(`central.campaigns.${user.id}`) || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch { return []; }
  };
  const v3Brands = () => {
    const fromSelect=[...document.querySelectorAll('#brandSelect option')].map(o=>o.value||o.textContent).filter(x=>x&&x!=='Todas as marcas');
    return [...new Set([...fromSelect,'Botanika','Revita','VermeFree','Shoty'])];
  };
  const v3ActiveBrand = () => {
    const b = brandFilter();
    if(b) return b;
    const raw=document.getElementById('brandSelect')?.value||'';
    return raw && raw!=='Todas as marcas' ? raw : '';
  };
  const v3TeamUsers = () => {
    const directory=window.AllianceOSDirectory;
    if(directory&&Array.isArray(directory.members)){
      const live=directory.members.filter(x=>x?.tipo==='usuario'&&x?.atribuivel!==false).map(x=>x.nome).filter(Boolean);
      return [...new Set(live)].sort((a,b)=>v3Short(a).localeCompare(v3Short(b),'pt-BR'));
    }
    return [];
  };
  const v3CurrentNames = () => {
    const out=[];
    try {
      if(window.CentralEu?.nome) out.push(window.CentralEu.nome);
      const eu=window.CentralEu;
      if(eu && window.Acessos) {
        const p=(window.Acessos.equipe?.()||[]).find(x=>x.email===eu.email);
        if(p?.nomeClickup) out.push(p.nomeClickup);
        if(p?.nome) out.push(p.nome);
      }
    } catch {}
    if(user?.firstName) out.push(user.firstName);
    if(user?.firstName==='Vitor') out.push('Vitor Gutierrez');
    return [...new Set(out.filter(Boolean))];
  };

  function v3PriorityCanon(v){
    const n=String(v||'normal').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    if(n==='urgent'||n==='urgente')return 'urgente';
    if(n==='high'||n==='alta')return 'alta';
    if(n==='low'||n==='baixa')return 'baixa';
    return 'normal';
  }
  function v3PriorityLabel(v){return {urgente:'Urgente',alta:'Alta',normal:'Normal',baixa:'Baixa'}[v3PriorityCanon(v)]||'Normal';}
  function v3PriorityClass(v){return {urgente:'urgent',alta:'high',normal:'normal',baixa:'low'}[v3PriorityCanon(v)]||'normal';}

  function v3NormalizeTask(t){
    if(!Array.isArray(t.assignees)) t.assignees=[];
    if(!Array.isArray(t.dependencies)) t.dependencies=[];
    if(!Array.isArray(t.checklist)) t.checklist=[];
    if(!Array.isArray(t.attachments)) t.attachments=[];
    if(!Array.isArray(t.comments)) t.comments=[];
    if(!Array.isArray(t.history)) t.history=[];
    if(!Array.isArray(t.tags)) t.tags=[];
    if(!Array.isArray(t.subtasks)) t.subtasks=[];
    if(typeof t.conferenceRequired!=='boolean') t.conferenceRequired=false;
    if(typeof t.deliveryRequired!=='boolean') t.deliveryRequired=false;
    if(t.parentTaskId===undefined) t.parentTaskId=null;
    if(t.campaignId===undefined) t.campaignId=null;
    if(!Array.isArray(t.assigneeIds)) t.assigneeIds=[];
    if(t.archivedAt===undefined) t.archivedAt=null;
    if(t.archivedBy===undefined) t.archivedBy=null;
    if(t.blockedReason===undefined) t.blockedReason=null;
    if(t.status==='revisar'||t.status==='revisão') t.status='em revisão';
    t.priority=v3PriorityCanon(t.priority);
    if(t.dueAt&&!t.due)t.due=String(t.dueAt).slice(0,10);
    if(!t.project) t.project='Operação';
    return t;
  }

  function v3MigrateLegacySubtasks(){
    let changed=false;
    const additions=[];
    taskData.forEach(v3NormalizeTask);
    for(const parent of [...taskData]) {
      const legacy=[...(parent.subtasks||[])];
      if(!legacy.length) continue;
      for(const s of legacy) {
        let child=taskData.find(x=>x.legacySubtaskSource===`${parent.id}:${s.id}`) || additions.find(x=>x.legacySubtaskSource===`${parent.id}:${s.id}`);
        if(!child) {
          child=v3NormalizeTask({
            id:v3Id('etapa'), title:s.title||'Etapa vinculada', status:s.done?'feito':'a fazer',
            assignees:[], due:null, start:null, brand:parent.brand, project:parent.project,
            campaignId:parent.campaignId||null, priority:parent.priority||'normal',
            description:`Etapa necessária antes de “${parent.title}”.`, checklist:[], subtasks:[], attachments:[], comments:[],
            history:[{at:'Migração',text:`Esta etapa veio da antiga subtarefa de “${parent.title}”.`}],
            recurrence:'none', tags:[], source:'allianceos', parentTaskId:parent.id, dependencies:[],
            legacySubtaskSource:`${parent.id}:${s.id}`
          });
          additions.push(child); changed=true;
        }
        if(!parent.dependencies.some(id=>String(id)===String(child.id))){parent.dependencies.push(child.id);changed=true;}
      }
      parent.subtasks=[]; changed=true;
    }
    if(additions.length) taskData.push(...additions);
    if(changed) localStorage.setItem(taskStorageKey,JSON.stringify(taskData));
  }

  const v3Dependencies = (t) => (t.dependencies||[]).map(v3Task).filter(Boolean);
  const v3Blockers = (t) => v3Dependencies(t).filter(x=>x.status!=='feito');
  const v3Dependents = (t) => taskData.filter(x=>(x.dependencies||[]).some(id=>String(id)===String(t.id)));
  const v3Parent = (t) => t.parentTaskId ? v3Task(t.parentTaskId) : null;
  const v3Children = (t) => taskData.filter(x=>String(x.parentTaskId||'')===String(t.id));

  function v3HasDependencyPath(fromId,targetId,seen=new Set()){
    if(String(fromId)===String(targetId)) return true;
    if(seen.has(String(fromId))) return false;
    seen.add(String(fromId));
    const t=v3Task(fromId); if(!t) return false;
    return (t.dependencies||[]).some(id=>v3HasDependencyPath(id,targetId,seen));
  }
  const v3WouldCycle = (task,depId) => String(task.id)===String(depId) || v3HasDependencyPath(depId,task.id);

  function v3Persist(render=true){
    taskData.forEach(v3NormalizeTask);
    localStorage.setItem(taskStorageKey,JSON.stringify(taskData));
    if(render) renderTasks();
    updateTaskCount();
  }

  function v3CampaignRows(brand){
    const structured=(window.AllianceOSDirectory?.lists||[])
      .filter(l=>!l.arquivada&&(!brand||!l.marca||l.marca===brand))
      .map(l=>({id:l.id,name:l.nome,brand:l.marca,listId:l.id,campaignId:l.campanha_id||null,_structured:true}));
    if(structured.length)return structured.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    return v3Campaigns().filter(c=>!brand||!c.brand||c.brand===brand).slice().sort((a,b)=>String(b.start||'').localeCompare(String(a.start||'')) || String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
  }
  function v3CampaignLabel(c){
    const range=[dateBr(c.start),dateBr(c.end)].filter(x=>x&&x!=='Sem prazo').join(' – ');
    return `${c.name||'Campanha'}${range?` · ${range}`:''}`;
  }
  function v3CampaignOptions(brand,selectedId,selectedProject){
    const rows=v3CampaignRows(brand);
    let html='<option value="">Operação · sem campanha</option>';
    html+=rows.map(c=>{
      const id=String(c.id||c.name||'');
      const sel=(selectedId&&String(selectedId)===id)||(!selectedId&&selectedProject&&selectedProject===c.name);
      return `<option value="${esc(id)}" ${sel?'selected':''}>${esc(v3CampaignLabel(c))}</option>`;
    }).join('');
    return html;
  }
  function v3FindCampaign(value,brand){
    if(!value) return null;
    return v3CampaignRows(brand).find(c=>String(c.id||c.name||'')===String(value)) || null;
  }

  function v3AssigneeOptions(selected=''){
    const real=v3TeamUsers();
    const legacySelected=selected&&!real.includes(selected)?`<option value="${esc(selected)}" selected disabled>${esc(v3Short(selected))} · legado (migre na Administração)</option>`:'';
    return '<option value="">Sem responsável</option>'+legacySelected+real.map(n=>`<option value="${esc(n)}" ${n===selected?'selected':''}>${esc(v3Short(n))}</option>`).join('');
  }

  isOverdue = function(t){
    if(t.status==='feito'||t.archivedAt)return false;
    const raw=t.dueAt||t.due;if(!raw)return false;
    if(t.dueAt)return new Date(t.dueAt).getTime()<Date.now();
    return String(t.due)<v3TodayIso();
  };
  dateBr = function(d){
    if(!d)return 'Sem prazo';
    const str=String(d);
    if(str.includes('T')){
      const dt=new Date(str);
      if(!Number.isNaN(dt.getTime()))return `${v3Pad(dt.getDate())}/${v3Pad(dt.getMonth()+1)} · ${v3Pad(dt.getHours())}:${v3Pad(dt.getMinutes())}`;
    }
    const p=str.slice(0,10).split('-');
    return p.length===3?`${p[2]}/${p[1]}`:str;
  };
  saveTasks = function(){ v3Persist(true); };

  filteredTasks = function(){
    const q=document.getElementById('taskSearch')?.value.trim().toLowerCase()||'';
    const ass=document.getElementById('assigneeFilter')?.value||'';
    const st=document.getElementById('statusFilter')?.value||'';
    const pr=document.getElementById('priorityFilter')?.value||'';
    const proj=document.getElementById('projectFilter')?.value||'';
    const brand=brandFilter();
    const meus=v3CurrentNames();
    return taskData.filter(t=>{
      v3NormalizeTask(t);
      if(t.archivedAt&&!q)return false;
      if(brand&&t.brand!==brand)return false;
      if(taskState.onlyMe&&!t.assignees.some(a=>meus.some(m=>v3Short(a)===v3Short(m))))return false;
      if(ass&&!t.assignees.includes(ass))return false;
      if(st&&t.status!==st)return false;
      if(pr&&t.priority!==v3PriorityCanon(pr))return false;
      if(proj&&t.project!==proj)return false;
      const parent=v3Parent(t);
      const hay=`${t.title} ${t.description||''} ${t.project||''} ${t.assignees.join(' ')} ${parent?.title||''}`.toLowerCase();
      if(q&&!hay.includes(q))return false;
      return true;
    });
  };

  populateFilters = function(){
    const ass=document.getElementById('assigneeFilter');
    const proj=document.getElementById('projectFilter');
    const st=document.getElementById('statusFilter');
    if(!ass||!proj||!st)return;
    const currentA=ass.value,currentP=proj.value,currentS=st.value;
    ass.innerHTML='<option value="">Todo mundo</option>'+v3TeamUsers().map(x=>`<option value="${esc(x)}">${esc(v3Short(x))}</option>`).join('');
    const brand=brandFilter();
    const allProjects=[...new Set(taskData.filter(t=>!brand||t.brand===brand).map(t=>t.project).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    proj.innerHTML='<option value="">Todas as campanhas</option>'+allProjects.map(x=>`<option>${esc(x)}</option>`).join('');
    st.innerHTML='<option value="">Todos os status</option>'+TASK_STATUSES.map(x=>`<option>${x}</option>`).join('');
    if([...ass.options].some(o=>o.value===currentA))ass.value=currentA;
    if([...proj.options].some(o=>o.value===currentP))proj.value=currentP;
    if([...st.options].some(o=>o.value===currentS))st.value=currentS;
  };

  function v3FlowBadges(t){
    const parent=v3Parent(t), deps=v3Dependencies(t), blockers=v3Blockers(t), next=v3Dependents(t);
    const out=[];
    if(parent) out.push(`<span class="flow-pill linked">Etapa de: ${esc(parent.title)}</span>`);
    if(t.status==='bloqueado') out.push(`<span class="flow-pill blocked">Bloqueada · ${esc(t.blockedReason||'sem motivo')}</span>`);
    else if(blockers.length) out.push(`<span class="flow-pill blocked">Bloqueada por ${blockers.length}</span>`);
    else if(deps.length) out.push('<span class="flow-pill ready">Dependências concluídas</span>');
    if(next.length) out.push(`<span class="flow-pill next">Libera ${next.length}</span>`);
    return out.join('');
  }

  function v3AvatarInner(name,userId){
    const members=window.AllianceOSDirectory?.members||[];
    const key=String(v3Short(name)||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const person=members.find(m=>m.tipo==='usuario'&&((userId&&String(m.id)===String(userId))||String(m.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()===key));
    return person?.foto_url?`<img src="${esc(person.foto_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">`:initials(v3Short(name));
  }
  avatarStack = function(names,ids=[]){
    if(!names?.length)return '<span class="no-assignee">Sem responsável</span>';
    return `<div class="avatar-stack">${names.slice(0,3).map((n,i)=>`<span class="mini-av" title="${esc(v3Short(n))}">${v3AvatarInner(n,ids[i])}</span>`).join('')}${names.length>3?`<span class="mini-av more">+${names.length-3}</span>`:''}<span class="assignee-name">${esc(v3Short(names[0]))}</span></div>`;
  };
  metrics = function(t){
    const done=(t.checklist||[]).filter(x=>x.done).length,total=(t.checklist||[]).length;
    const deps=v3Dependencies(t).length;
    return `<div class="row-metrics">${total?`<span title="Checklist">✓ ${done}/${total}</span>`:''}${deps?`<span title="Dependências">↳ ${deps}</span>`:''}${(t.comments||[]).length?`<span title="Comentários">◌ ${(t.comments||[]).length}</span>`:''}</div>`;
  };

  renderListRow = function(t){
    const blockers=v3Blockers(t);
    return `<div class="cu-row ${blockers.length||t.status==='bloqueado'?'is-blocked':''}" data-task-id="${esc(t.id)}">
      <div class="cu-row-title"><button class="cu-complete ${t.status==='feito'?'done':''}" type="button" data-v3-toggle-done="${esc(t.id)}" title="${t.status==='feito'?'Reabrir tarefa':blockers.length?'Conclua as dependências primeiro':'Concluir tarefa'}">${t.status==='feito'?'✓':''}</button><div class="cu-titletext"><div class="task-title-line"><b>${esc(t.title)}</b>${v3FlowBadges(t)}</div><small>${esc(t.description||t.project||'Sem descrição')}</small></div></div>
      <div>${avatarStack(t.assignees,t.assigneeIds||[])}</div>
      <div><span class="pri ${v3PriorityClass(t.priority)}">${v3PriorityLabel(t.priority)}</span></div>
      <div><span class="due-date ${isOverdue(t)?'over':''}">${dateBr(t.due)}${isOverdue(t)?' · atrasada':''}</span></div>
      <div><span class="tag-project">${esc(t.project||'Operação')}</span></div>
      <div><span class="brand-label">${esc(t.brand||'')}</span></div>
      <div>${metrics(t)}</div>
    </div>`;
  };

  renderList = function(canvas,data){
    canvas.innerHTML=TASK_STATUSES.map(status=>{
      const rows=data.filter(t=>t.status===status);
      return `<section class="cu-list-group" style="--group-color:${STATUS_COLORS[status]}"><div class="cu-group-head"><strong>${status}</strong><span>${rows.length}</span><button class="cu-add-inline" type="button" data-inline-new="${status}">＋ Nova tarefa</button></div><div class="cu-table-head"><span>Tarefa</span><span>Responsável</span><span>Prioridade</span><span>Prazo</span><span>Campanha</span><span>Marca</span><span></span></div>${rows.length?rows.map(renderListRow).join(''):'<div class="v3-empty-row">Nenhuma tarefa aqui.</div>'}</section>`;
    }).join('');
    bindTaskElements();
  };

  renderBoard = function(canvas,data){
    canvas.innerHTML=`<div class="cu-board">${TASK_STATUSES.map(status=>{
      const rows=data.filter(t=>t.status===status);
      return `<section class="cu-column" data-v3-drop-status="${status}"><div class="cu-colhead" style="--status-color:${STATUS_COLORS[status]}"><span class="bar"></span><b>${status}</b><span>${rows.length}</span></div>${rows.map(t=>`<article class="cu-card ${(v3Blockers(t).length||t.status==='bloqueado')?'is-blocked':''}" draggable="true" data-drag-id="${esc(t.id)}" data-task-id="${esc(t.id)}"><div class="cu-card-project">${esc(t.project||'Operação')}</div><div class="cu-card-title">${esc(t.title)}</div><div class="cu-card-flow">${v3FlowBadges(t)}</div><div class="cu-card-foot">${avatarStack(t.assignees,t.assigneeIds||[])}<span class="pri ${v3PriorityClass(t.priority)}" title="${v3PriorityLabel(t.priority)}"></span><span class="due-date ${isOverdue(t)?'over':''}">${dateBr(t.due)}</span></div></article>`).join('')}</section>`;
    }).join('')}</div>`;
    bindTaskElements();bindDrag();
  };

  renderCampaign = function(canvas,data){
    const groups=[...new Set(data.map(t=>t.project||'Operação'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    canvas.innerHTML=`<div class="cu-campaigns-grid">${groups.map(g=>{
      const rows=data.filter(t=>(t.project||'Operação')===g), done=rows.filter(t=>t.status==='feito').length;
      return `<section class="cu-campaign-box"><div class="cu-campaign-head"><div><strong>${esc(g)}</strong><span>${rows[0]?.brand||''} · ${done}/${rows.length} concluídas</span></div><span class="count">${rows.length}</span></div>${rows.map(t=>`<div class="cu-campaign-row ${(v3Blockers(t).length||t.status==='bloqueado')?'is-blocked':''}" data-task-id="${esc(t.id)}"><div><b>${esc(t.title)}</b><small>${v3FlowBadges(t)} ${esc(t.status)} · ${t.assignees.map(v3Short).join(', ')||'Sem responsável'}</small></div><span class="due-date ${isOverdue(t)?'over':''}">${dateBr(t.due)}</span></div>`).join('')}</section>`;
    }).join('')}</div>`;bindTaskElements();
  };

  renderPeople = function(canvas,data){
    const names=[...new Set(data.flatMap(t=>t.assignees.length?t.assignees:['Sem responsável']))].sort((a,b)=>v3Short(a).localeCompare(v3Short(b),'pt-BR'));
    canvas.innerHTML=`<div class="cu-people">${names.map(n=>{
      const rows=data.filter(t=>(t.assignees.length?t.assignees:['Sem responsável']).includes(n));
      return `<section class="cu-person"><div class="cu-person-head"><div class="bigav">${n==='Sem responsável'?'—':v3AvatarInner(n)}</div><div><b>${esc(v3Short(n))}</b><span>${rows.filter(t=>t.status!=='feito').length} abertas · ${rows.filter(isOverdue).length} vencidas</span></div></div>${rows.map(t=>`<div class="cu-person-task ${(v3Blockers(t).length||t.status==='bloqueado')?'is-blocked':''}" data-task-id="${esc(t.id)}"><b>${esc(t.title)}</b><small>${v3FlowBadges(t)} ${esc(t.status)} · ${dateBr(t.due)} · ${esc(t.project)}</small></div>`).join('')}</section>`;
    }).join('')}</div>`;bindTaskElements();
  };

  renderWeek = function(canvas,data){
    const now=new Date(); now.setHours(12,0,0,0);
    const monday=new Date(now); monday.setDate(now.getDate()-((now.getDay()+6)%7)+(v3WeekOffset*7));
    const days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d;});
    const today=v3TodayIso();
    const firstIso=v3Iso(days[0]), lastIso=v3Iso(days[6]);
    const overdue=data.filter(t=>isOverdue(t));
    const unscheduled=data.filter(t=>t.status!=='feito'&&!t.due);
    const names=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
    canvas.innerHTML=`<div class="v3-week-head"><div><button type="button" data-week-shift="-1">‹</button><button type="button" data-week-today>Esta semana</button><button type="button" data-week-shift="1">›</button></div><strong>${dateBr(firstIso)} — ${dateBr(lastIso)}</strong><span>${unscheduled.length} sem prazo</span></div>${overdue.length?`<div class="cu-week-overdue"><b>${overdue.length} tarefa${overdue.length>1?'s':''} vencida${overdue.length>1?'s':''}</b><span>continua${overdue.length>1?'m':''} aberta${overdue.length>1?'s':''}</span><button type="button" id="showOverdueWeek">Ver na Lista</button></div>`:''}<div class="cu-week-wrap"><div class="cu-week">${days.map((d,i)=>{const iso=v3Iso(d), rows=data.filter(t=>t.due===iso);return `<section class="cu-day ${iso===today?'today':''}"><div class="cu-day-head"><div><b>${names[i]}</b><span>${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}</span></div>${iso===today?'<em>Hoje</em>':''}</div>${rows.length?rows.map(t=>`<div class="cu-week-card ${(v3Blockers(t).length||t.status==='bloqueado')?'is-blocked':''}" data-task-id="${esc(t.id)}"><div class="week-card-top"><b>${esc(t.title)}</b>${v3Blockers(t).length?'<span>bloqueada</span>':''}</div><small>${esc(t.project)} · ${t.assignees.map(v3Short).join(', ')||'Sem responsável'}</small></div>`).join(''):'<div class="v3-day-empty">Nenhuma tarefa com prazo</div>'}</section>`}).join('')}</div></div>`;
    bindTaskElements();
    document.querySelectorAll('[data-week-shift]').forEach(b=>b.addEventListener('click',()=>{v3WeekOffset+=Number(b.dataset.weekShift||0);renderTasks()}));
    document.querySelector('[data-week-today]')?.addEventListener('click',()=>{v3WeekOffset=0;renderTasks()});
    document.getElementById('showOverdueWeek')?.addEventListener('click',()=>{taskState.view='list';renderTasks()});
  };

  renderTasks = function(){
    populateFilters();
    const data=filteredTasks();
    const overdue=data.filter(isOverdue).length, open=data.filter(t=>t.status!=='feito').length, blocked=data.filter(t=>t.status==='bloqueado'||v3Blockers(t).length).length;
    const sum=document.getElementById('taskSummary'); if(sum)sum.innerHTML=`${open} abertas · <b>${overdue} vencidas</b> · ${blocked} bloqueadas`;
    document.querySelectorAll('.cu-view').forEach(b=>b.classList.toggle('active',b.dataset.view===taskState.view));
    const canvas=document.getElementById('tasksCanvas'); if(!canvas)return;
    if(!data.length){canvas.innerHTML='<div class="cu-empty"><b>Nenhuma tarefa nessa visão.</b><br><span>Ajuste os filtros ou crie uma nova tarefa.</span></div>';return;}
    if(taskState.view==='board')renderBoard(canvas,data);else if(taskState.view==='campaign')renderCampaign(canvas,data);else if(taskState.view==='people')renderPeople(canvas,data);else if(taskState.view==='week')renderWeek(canvas,data);else renderList(canvas,data);
  };

  function v3CompletionProblem(t){
    const blockers=v3Blockers(t);
    if(blockers.length)return `Conclua antes: ${blockers.slice(0,3).map(x=>x.title).join(', ')}${blockers.length>3?'…':''}`;
    if(t.conferenceRequired){
      const pending=(t.checklist||[]).filter(x=>!x.done);
      if(!(t.checklist||[]).length)return 'A lista de conferência obrigatória está sem itens.';
      if(pending.length)return `Confira os ${pending.length} item(ns) obrigatórios da lista de conferência.`;
    }
    if(t.deliveryRequired&&!(t.deliveries||[]).length)return 'Esta tarefa exige uma entrega antes da conclusão.';
    return '';
  }

  function v3Complete(t,done=true){
    if(done){
      const problem=v3CompletionProblem(t);
      if(problem){showToast(problem);return false;}
      if(t.status!=='feito'){
        const old=t.status;t.status='feito';t.history.unshift({at:'Agora',text:`Status alterado de “${old}” para “feito”.`});
        for(const next of v3Dependents(t)) next.history.unshift({at:'Agora',text:`Dependência concluída: “${t.title}”. Esta tarefa está liberada para execução.`});
        const recurring=v3GenerateNextOccurrence(t);
        if(recurring)t.history.unshift({at:'Agora',text:`Próxima ocorrência recorrente criada para ${v3DueLabel(recurring)}.`});
      }
    } else if(t.status==='feito') {
      t.status='a fazer';t.history.unshift({at:'Agora',text:'Tarefa reaberta.'});
    }
    v3Persist(true);window.AllianceOSOps?.recordTaskAction?.('atualizar_tarefa',t,{status:t.status});return true;
  }

  bindTaskElements = function(){
    document.querySelectorAll('[data-task-id]').forEach(el=>el.addEventListener('click',e=>{if(e.target.closest('[data-v3-toggle-done]'))return;openTaskDetail(el.dataset.taskId)}));
    document.querySelectorAll('[data-v3-toggle-done]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const t=v3Task(b.dataset.v3ToggleDone);if(t)v3Complete(t,t.status!=='feito')}));
    document.querySelectorAll('[data-inline-new]').forEach(b=>b.addEventListener('click',()=>openNewTask(b.dataset.inlineNew)));
  };

  bindDrag = function(){
    document.querySelectorAll('[data-drag-id]').forEach(card=>{card.addEventListener('dragstart',e=>{card.classList.add('dragging');e.dataTransfer.setData('text/plain',card.dataset.dragId)});card.addEventListener('dragend',()=>card.classList.remove('dragging'))});
    document.querySelectorAll('[data-v3-drop-status]').forEach(col=>{col.addEventListener('dragover',e=>e.preventDefault());col.addEventListener('drop',e=>{e.preventDefault();const t=v3Task(e.dataTransfer.getData('text/plain'));if(!t)return;const next=col.dataset.v3DropStatus;if(t.status===next)return;if(next==='feito'){const problem=v3CompletionProblem(t);if(problem){showToast(problem);return;}}if(next==='bloqueado'&&!t.blockedReason){t.blockedReason='Bloqueada manualmente no quadro';}const old=t.status;t.status=next;t.history.unshift({at:'Agora',text:`Status alterado de “${old}” para “${next}”.`});if(next!=='bloqueado'&&old==='bloqueado'&&t.blockedReason){t.history.unshift({at:'Agora',text:`Bloqueio encerrado. Motivo anterior: ${t.blockedReason}`});t.blockedReason=null;}if(next==='feito'){for(const x of v3Dependents(t))x.history.unshift({at:'Agora',text:`Dependência concluída: “${t.title}”.`});v3GenerateNextOccurrence(t);}v3Persist(true)})});
  };

  function v3FlowTaskRow(x,relation){
    const blocked=v3Blockers(x).length;
    return `<div class="v3-flow-task" data-flow-open="${esc(x.id)}"><button type="button" class="v3-flow-status ${x.status==='feito'?'done':''}" aria-label="Abrir tarefa">${x.status==='feito'?'✓':'↗'}</button><div><b>${esc(x.title)}</b><small>${esc(v3Short(x.assignees[0]||'Sem responsável'))} · ${dateBr(x.due)} · ${esc(x.status)}</small></div>${relation==='before'?`<button type="button" class="v3-unlink" data-unlink-dep="${esc(x.id)}" title="Desvincular">×</button>`:blocked?'<span class="v3-mini-badge">bloqueada</span>':''}</div>`;
  }

  function v3DependencyCandidates(t){
    return taskData.filter(x=>String(x.id)!==String(t.id)&&x.brand===t.brand&&x.status!=='feito'&&!t.dependencies.some(id=>String(id)===String(x.id))&&!v3WouldCycle(t,x.id));
  }

  function v3DetailCampaign(t){
    const selected=t.listId||t.campaignId||'';
    return `<select id="detailCampaign">${v3CampaignOptions(t.brand,selected,t.project)}</select>`;
  }

  openTaskDetail = function(id){
    const t=v3Task(id);if(!t)return;v3NormalizeTask(t);taskState.selected=t.id;
    const parent=v3Parent(t);
    document.getElementById('taskDetailKicker').textContent=`${t.brand||''} · ${t.project||'Operação'}${parent?` · etapa de ${parent.title}`:''} · #${String(t.id).slice(-7)}`;
    document.getElementById('taskTitleInput').value=t.title;
    renderTaskDetailBody(t);
    document.getElementById('taskDetailDrawer').classList.add('open');
  };

  renderTaskDetailBody = function(t){
    v3NormalizeTask(t);
    const body=document.getElementById('taskDetailBody');
    const deps=v3Dependencies(t), blockers=v3Blockers(t), next=v3Dependents(t), parent=v3Parent(t), completed=(t.checklist||[]).filter(x=>x.done).length, candidates=v3DependencyCandidates(t), completionProblem=v3CompletionProblem(t), recurrenceSpec=v3RecurrenceSpec(t);
    body.innerHTML=`<div class="tdetail-layout v3-detail-layout"><main class="tdetail-main">
      ${t.status==='bloqueado'?`<div class="v3-block-banner"><div><strong>Tarefa bloqueada</strong><span>${esc(t.blockedReason||'Motivo não informado')}</span></div><span>bloqueada</span></div>`:blockers.length?`<div class="v3-block-banner"><div><strong>Esta tarefa está bloqueada por dependências</strong><span>Conclua ${blockers.length===1?'a tarefa abaixo':'as tarefas abaixo'} antes de finalizar esta.</span></div><span>${blockers.length} pendente${blockers.length>1?'s':''}</span></div>`:`<div class="v3-ready-banner"><span>✓</span><div><strong>Pronta para executar</strong><small>${deps.length?'Todas as dependências foram concluídas.':'Não há dependências pendentes.'}</small></div></div>`}
      <section class="tsection v3-section" style="margin-top:0"><div class="tsection-head"><div><strong>Briefing e resultado esperado</strong><span>O que precisa ficar pronto, contexto, links e critério de aceite.</span></div></div><textarea class="description-area" id="detailDescription" placeholder="Descreva o resultado esperado desta tarefa, o contexto necessário para executar e como saber que ficou pronto.">${esc(t.description||'')}</textarea></section>
      <section class="tsection v3-section"><div class="tsection-head"><div><strong>Fluxo e dependências</strong><span>As etapas são tarefas normais e aparecem para cada responsável na lista, quadro e semana.</span></div></div>
        ${parent?`<div class="v3-parent-link" data-flow-open="${esc(parent.id)}"><span>Esta tarefa é uma etapa de</span><b>${esc(parent.title)}</b><button type="button">Abrir principal ↗</button></div>`:''}
        <div class="v3-flow-grid"><div class="v3-flow-col"><div class="v3-flow-label"><b>Precisa acontecer antes</b><span>${deps.length} tarefa${deps.length!==1?'s':''}</span></div>${deps.length?deps.map(x=>v3FlowTaskRow(x,'before')).join(''):'<div class="v3-flow-empty">Nenhuma dependência. Esta tarefa pode começar agora.</div>'}<div class="v3-flow-add"><select id="detailAddDependency"><option value="">Vincular tarefa existente…</option>${candidates.slice(0,80).map(x=>`<option value="${esc(x.id)}">${esc(x.title)} · ${esc(v3Short(x.assignees[0]||'sem responsável'))}</option>`).join('')}</select><button type="button" id="linkDependencyBtn">Vincular</button></div><button class="v3-create-step" type="button" id="createPreviousTaskBtn">+ Criar etapa anterior</button></div>
        <div class="v3-flow-col"><div class="v3-flow-label"><b>Depois desta tarefa</b><span>${next.length} tarefa${next.length!==1?'s':''}</span></div>${next.length?next.map(x=>v3FlowTaskRow(x,'after')).join(''):'<div class="v3-flow-empty">Nenhuma tarefa depende desta ainda.</div>'}</div></div>
      </section>
      <section class="tsection v3-section ${t.conferenceRequired?'v3-conference-required':''}"><div class="tsection-head"><div><strong>${t.conferenceRequired?'Lista de conferência':'Checklist interno'}</strong><span>${t.conferenceRequired?'Obrigatória: confira todos os itens antes de enviar a entrega ou concluir a tarefa.':'Use para itens pequenos da mesma execução.'}</span></div><span>${completed}/${(t.checklist||[]).length}</span></div><div id="detailChecklist">${(t.checklist||[]).map(c=>`<label class="check-row ${c.done?'done':''}"><input type="checkbox" data-check-id="${esc(c.id)}" ${c.done?'checked':''}><span>${esc(c.text)}</span><button type="button" data-remove-check="${esc(c.id)}">×</button></label>`).join('')}</div><div class="addline"><input id="newCheckText" placeholder="Adicionar item pequeno desta mesma tarefa"><button type="button" id="addCheckBtn">Adicionar</button></div></section>
      <section class="tsection v3-section"><div class="tsection-head"><div><strong>Anexos</strong><span>Arquivos e referências usados nesta execução.</span></div><span>${(t.attachments||[]).length}</span></div><label class="attachment-drop v3-attachment-drop">Adicionar arquivos<input type="file" id="attachmentInput" multiple></label><div id="attachmentList">${(t.attachments||[]).map((f,i)=>`<div class="file-pill"><span>◫</span><b>${esc(f.name)}</b><small>${esc(f.size||'')}</small><button type="button" data-remove-attachment="${i}">×</button></div>`).join('')}</div></section>
      <section class="tsection v3-section"><div class="tsection-head"><div><strong>Entrega</strong><span>${t.deliveryRequired?'Obrigatória para concluir.':'Registre o resultado final, link ou observação.'}</span></div><span>${(t.deliveries||[]).length}</span></div><div class="addline"><input id="newDeliveryText" placeholder="Cole o link ou descreva a entrega"><button type="button" id="addDeliveryBtn">Registrar entrega</button></div><div id="deliveryList">${(t.deliveries||[]).map((d,i)=>`<div class="file-pill"><span>↗</span><b>${esc(d.text||d.url||d.name||'Entrega')}</b><small>${esc(d.at||'')}</small><button type="button" data-remove-delivery="${i}">×</button></div>`).join('')}</div></section>
      <section class="tsection v3-section v3-continuity"><div class="tsection-head"><div><strong>Conclusão e continuidade</strong><span>O fluxo libera automaticamente as próximas tarefas. Não é necessário escolher “próxima tarefa”.</span></div></div>${blockers.length?`<div class="v3-continuity-note blocked">Ainda faltam ${blockers.length} dependência${blockers.length>1?'s':''}: ${blockers.slice(0,3).map(x=>esc(x.title)).join(', ')}.</div>`:`<div class="v3-continuity-note">${next.length?`Ao concluir, ${next.length===1?`“${esc(next[0].title)}” será liberada`:`${next.length} tarefas serão liberadas`} automaticamente.`:'Esta é a última etapa conhecida deste fluxo.'}</div>`}<button type="button" id="v3CompleteTaskBtn" class="v3-complete-btn ${t.status==='feito'?'secondary':''}" ${blockers.length&&t.status!=='feito'?'disabled':''}>${t.status==='feito'?'Reabrir tarefa':next.length?'Concluir e liberar próximas':'Concluir tarefa'}</button></section>
      <section class="tsection v3-section"><div class="tsection-head"><div><strong>Comentários e atividade</strong><span>Decisões e mudanças importantes ficam registradas aqui.</span></div><span>${(t.comments||[]).length} comentário(s)</span></div><div class="addline v3-comment-add"><input id="newCommentText" placeholder="Escreva um comentário"><button type="button" id="addCommentBtn">Comentar</button></div><div id="commentList">${(t.comments||[]).map(c=>`<div class="comment"><div class="cav">${v3AvatarInner(c.author)}</div><div class="comment-body"><b>${esc(c.author)}</b><p>${esc(c.text)}</p><small>${esc(c.at)}</small></div></div>`).join('')}</div><div class="v3-history">${(t.history||[]).map(h=>`<div class="activity"><b>${esc(h.at)}</b><p>${esc(h.text)}</p></div>`).join('')}</div></section>
    </main><aside class="tdetail-side"><div class="v3-side-title"><strong>Contexto da tarefa</strong><span>${esc(t.brand||'')} · ${esc(t.project||'Operação')}</span></div><div class="tdetail-grid">
      <div class="tfield"><label>Status</label><select id="detailStatus">${TASK_STATUSES.map(st=>`<option value="${st}" ${st===t.status?'selected':''} ${st==='feito'&&completionProblem&&t.status!=='feito'?'disabled':''}>${st}${st==='feito'&&completionProblem?' · com trava':''}</option>`).join('')}</select></div>
      <div class="tfield" id="detailBlockedReasonField"><label>Motivo do bloqueio</label><input id="detailBlockedReason" value="${esc(t.blockedReason||'')}" placeholder="Ex.: aguardando terceiro"><small>Obrigatório quando o status é bloqueado.</small></div>
      <div class="tfield"><label>Responsável pela execução</label><select id="detailPrimaryAssignee">${v3AssigneeOptions(t.assignees[0]||'')}</select></div>
      <div class="tfield"><label>Apoio / colaboradores</label><div class="v3-support-list">${t.assignees.slice(1).map(a=>`<span>${esc(v3Short(a))}<button type="button" data-remove-assignee="${esc(a)}">×</button></span>`).join('')||'<small>Ninguém adicionado</small>'}</div><select id="detailAddAssignee"><option value="">+ adicionar colaborador</option>${v3TeamUsers().filter(x=>!t.assignees.includes(x)).map(x=>`<option value="${esc(x)}">${esc(v3Short(x))}</option>`).join('')}</select></div>
      <div class="tfield"><label>Prioridade</label><select id="detailPriority">${["urgente","alta","normal","baixa"].map(v=>`<option value="${v}" ${v===v3PriorityCanon(t.priority)?'selected':''}>${v3PriorityLabel(v)}</option>`).join('')}</select></div>
      <div class="tfield"><label>Data de início</label><input type="date" id="detailStart" value="${t.start||''}"></div>
      <div class="tfield"><label>Prazo com horário</label><input type="datetime-local" id="detailDue" value="${v3ToLocalInput(t.dueAt,t.due)}"><small>${esc(v3DueLabel(t))}</small></div>
      <div class="tfield"><label>Campanha / planejamento</label>${v3DetailCampaign(t)}<small class="v3-field-help">Lista ligada às campanhas da ${esc(t.brand||'marca')}.</small></div>
      <div class="tfield"><label>Recorrência</label><select id="detailRecurrence"><option value="nenhuma" ${recurrenceSpec.tipo==='nenhuma'?'selected':''}>Não repetir</option><option value="semanal" ${recurrenceSpec.tipo==='semanal'?'selected':''}>Semanal</option><option value="quinzenal" ${recurrenceSpec.tipo==='quinzenal'?'selected':''}>Quinzenal</option><option value="mensal" ${recurrenceSpec.tipo==='mensal'?'selected':''}>Mensal</option><option value="dias_semana" ${recurrenceSpec.tipo==='dias_semana'?'selected':''}>Dias específicos</option></select></div>
      <div class="tfield" id="detailRecurrenceDays" ${recurrenceSpec.tipo==='dias_semana'?'':'hidden'}><label>Dias da semana</label><div class="v3-weekday-picks">${[['1','Seg'],['2','Ter'],['3','Qua'],['4','Qui'],['5','Sex'],['6','Sáb'],['7','Dom']].map(([v,l])=>`<label><input type="checkbox" value="${v}" ${recurrenceSpec.dias_semana.includes(Number(v))?'checked':''}>${l}</label>`).join('')}</div></div>
      <div class="tfield"><label class="v3-conference-toggle"><span><b>Entrega obrigatória</b><small>trava conclusão</small></span><input id="detailDeliveryRequired" type="checkbox" ${t.deliveryRequired?'checked':''}><i></i></label></div>
      <div class="v3-brand-context"><span>Marca</span><strong>${esc(t.brand||'—')}</strong><small>A marca vem do perfil em que a tarefa foi criada.</small></div>
      <button type="button" id="archiveTaskBtn" class="v3-archive-btn">${t.archivedAt?'Desarquivar tarefa':'Arquivar tarefa'}</button>
    </div></aside></div>`;
    bindDetailInteractions(t);
  };

  syncDetailDraft = function(t){
    const get=id=>document.getElementById(id);
    if(get('detailStatus')) t.status=get('detailStatus').value;
    if(get('detailBlockedReason')) t.blockedReason=get('detailBlockedReason').value.trim()||null;
    if(get('detailPriority')) t.priority=v3PriorityCanon(get('detailPriority').value);
    if(get('detailRecurrence')){
      const days=[...document.querySelectorAll('#detailRecurrenceDays input:checked')].map(x=>Number(x.value));
      v3ApplyRecurrence(t,get('detailRecurrence').value,days);
    }
    if(get('detailDeliveryRequired')) t.deliveryRequired=!!get('detailDeliveryRequired').checked;
    if(get('detailStart')) t.start=get('detailStart').value||null;
    if(get('detailDue')){
      t.dueAt=v3FromLocalInput(get('detailDue').value);
      t.due=t.dueAt?String(t.dueAt).slice(0,10):null;
    }
    if(get('detailDescription')) t.description=get('detailDescription').value;
    if(get('detailPrimaryAssignee')) {
      const primary=get('detailPrimaryAssignee').value;
      const support=(t.assignees||[]).slice(1).filter(Boolean).filter(x=>x!==primary);
      t.assignees=[primary,...support].filter(Boolean);
    }
    if(get('detailCampaign')) {
      const c=v3FindCampaign(get('detailCampaign').value,t.brand);
      t.listId=c?.listId||t.listId||null;
      t.campaignId=c?._structured?(c.campaignId||null):(c?.id||null);
      t.project=c?.name||'Operação';
    }
    t.assigneeIds=(t.assignees||[]).map(name=>(window.AllianceOSDirectory?.members||[]).find(m=>m.tipo==='usuario'&&m.nome===name)?.id).filter(Boolean);
  };

  bindDetailInteractions = function(t){
    document.getElementById('detailRecurrence')?.addEventListener('change',e=>{const box=document.getElementById('detailRecurrenceDays');if(box)box.hidden=e.target.value!=='dias_semana';});
    document.getElementById('detailStatus')?.addEventListener('change',e=>{if(e.target.value==='bloqueado')document.getElementById('detailBlockedReason')?.focus();});
    document.getElementById('archiveTaskBtn')?.addEventListener('click',()=>{syncDetailDraft(t);t.archivedAt=t.archivedAt?null:new Date().toISOString();t.archivedBy=t.archivedAt?(v3CurrentNames()[0]||'Equipe'):null;t.history.unshift({at:'Agora',text:t.archivedAt?'Tarefa arquivada.':'Tarefa desarquivada.'});v3Persist(true);window.AllianceOSOps?.recordTaskAction?.(t.archivedAt?'arquivar_tarefa':'desarquivar_tarefa',t,{});closeTaskDetail();showToast(t.archivedAt?'Tarefa arquivada':'Tarefa desarquivada');});
    document.getElementById('detailAddAssignee')?.addEventListener('change',e=>{if(e.target.value&&!t.assignees.includes(e.target.value)){syncDetailDraft(t);t.assignees.push(e.target.value);t.history.unshift({at:'Agora',text:`${v3Short(e.target.value)} foi adicionado como colaborador.`});renderTaskDetailBody(t)}});
    document.querySelectorAll('[data-remove-assignee]').forEach(b=>b.addEventListener('click',()=>{syncDetailDraft(t);t.assignees=t.assignees.filter(x=>x!==b.dataset.removeAssignee);renderTaskDetailBody(t)}));
    document.querySelectorAll('[data-check-id]').forEach(c=>c.addEventListener('change',()=>{const x=t.checklist.find(y=>String(y.id)===String(c.dataset.checkId));if(x)x.done=c.checked;syncDetailDraft(t);v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('marcar_item_checklist',t,{item_id:c.dataset.checkId,concluido:c.checked});renderTaskDetailBody(t)}));
    document.querySelectorAll('[data-remove-check]').forEach(b=>b.addEventListener('click',()=>{syncDetailDraft(t);t.checklist=t.checklist.filter(x=>String(x.id)!==String(b.dataset.removeCheck));v3Persist(false);renderTaskDetailBody(t)}));
    document.getElementById('addCheckBtn')?.addEventListener('click',()=>{const i=document.getElementById('newCheckText');if(!i.value.trim())return;syncDetailDraft(t);t.checklist.push({id:v3Id('check'),text:i.value.trim(),done:false});v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('definir_checklist',t,{itens:t.checklist.length});renderTaskDetailBody(t)});
    document.getElementById('attachmentInput')?.addEventListener('change',e=>{syncDetailDraft(t);[...e.target.files].forEach(f=>t.attachments.push({name:f.name,size:`${Math.max(1,Math.round(f.size/1024))} KB`}));v3Persist(false);renderTaskDetailBody(t)});
    document.querySelectorAll('[data-remove-attachment]').forEach(b=>b.addEventListener('click',()=>{syncDetailDraft(t);t.attachments.splice(Number(b.dataset.removeAttachment),1);v3Persist(false);renderTaskDetailBody(t)}));
    document.getElementById('addDeliveryBtn')?.addEventListener('click',()=>{const i=document.getElementById('newDeliveryText');if(!i?.value.trim())return;syncDetailDraft(t);t.deliveries=Array.isArray(t.deliveries)?t.deliveries:[];t.deliveries.unshift({id:v3Id('delivery'),text:i.value.trim(),at:'Agora',author:v3CurrentNames()[0]||user.firstName||'Equipe',source:'interface'});t.history.unshift({at:'Agora',text:'Entrega registrada.'});v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('registrar_entrega',t,{entrega:i.value.trim()});renderTaskDetailBody(t)});
    document.querySelectorAll('[data-remove-delivery]').forEach(b=>b.addEventListener('click',()=>{syncDetailDraft(t);t.deliveries.splice(Number(b.dataset.removeDelivery),1);v3Persist(false);renderTaskDetailBody(t)}));
    document.getElementById('addCommentBtn')?.addEventListener('click',()=>{const i=document.getElementById('newCommentText');if(!i.value.trim())return;syncDetailDraft(t);const text=i.value.trim();t.comments.unshift({id:v3Id('comment'),author:v3CurrentNames()[0]||user.firstName||'Equipe',text,at:'Agora',source:'interface'});v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('comentar_tarefa',t,{comentario:text});renderTaskDetailBody(t)});
    document.getElementById('linkDependencyBtn')?.addEventListener('click',()=>{const id=document.getElementById('detailAddDependency')?.value;if(!id)return;if(v3WouldCycle(t,id)){showToast('Esse vínculo criaria um ciclo de dependências.');return;}syncDetailDraft(t);if(!t.dependencies.some(x=>String(x)===String(id)))t.dependencies.push(id);const child=v3Task(id);if(child&&!child.parentTaskId)child.parentTaskId=t.id;if(t.status==='feito'){t.status='a fazer';t.history.unshift({at:'Agora',text:'Tarefa reaberta porque ganhou uma nova dependência.'})}t.history.unshift({at:'Agora',text:`Dependência adicionada: “${child?.title||id}”.`});v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('definir_dependencia',t,{tarefa_que_bloqueia:id});renderTaskDetailBody(t)});
    document.querySelectorAll('[data-unlink-dep]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();syncDetailDraft(t);const id=b.dataset.unlinkDep;t.dependencies=t.dependencies.filter(x=>String(x)!==String(id));const child=v3Task(id);if(child&&String(child.parentTaskId||'')===String(t.id))child.parentTaskId=null;t.history.unshift({at:'Agora',text:`Dependência removida: “${child?.title||id}”.`});v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('remover_dependencia',t,{tarefa_que_bloqueia:id});renderTaskDetailBody(t)}));
    document.getElementById('createPreviousTaskBtn')?.addEventListener('click',()=>{syncDetailDraft(t);v3Persist(false);closeTaskDetail();openNewTask('a fazer',{parentTaskId:t.id,blocksTaskId:t.id,brand:t.brand,campaignId:t.campaignId,project:t.project})});
    document.querySelectorAll('[data-flow-open]').forEach(el=>el.addEventListener('click',e=>{if(e.target.closest('[data-unlink-dep]'))return;syncDetailDraft(t);v3Persist(false);openTaskDetail(el.dataset.flowOpen)}));
    document.getElementById('v3CompleteTaskBtn')?.addEventListener('click',()=>{syncDetailDraft(t);if(t.status==='feito')v3Complete(t,false);else if(v3Complete(t,true))closeTaskDetail()});
  };

  saveCurrentTask = function(){
    const t=v3Task(taskState.selected);if(!t)return;
    const oldStatus=t.status, oldBlocked=t.blockedReason;
    const wanted=document.getElementById('detailStatus')?.value||t.status;
    syncDetailDraft(t);
    t.title=document.getElementById('taskTitleInput').value.trim()||t.title;
    if(wanted==='bloqueado'&&!String(t.blockedReason||'').trim()){
      t.status=oldStatus;t.blockedReason=oldBlocked;showToast('Informe o motivo do bloqueio.');renderTaskDetailBody(t);return;
    }
    if(wanted==='feito'&&oldStatus!=='feito'){
      const problem=v3CompletionProblem(t);
      if(problem){t.status=oldStatus;showToast(problem);renderTaskDetailBody(t);return;}
    }
    t.status=wanted;
    if(oldStatus!==t.status){
      if(oldStatus==='bloqueado'&&t.status!=='bloqueado'&&oldBlocked){
        t.history.unshift({at:'Agora',text:`Bloqueio encerrado. Motivo anterior: ${oldBlocked}`});
        t.blockedReason=null;
      }
      t.history.unshift({at:'Agora',text:`Status alterado de “${oldStatus}” para “${t.status}”.`});
      if(t.status==='feito'){
        for(const x of v3Dependents(t))x.history.unshift({at:'Agora',text:`Dependência concluída: “${t.title}”. Esta tarefa está liberada.`});
        const recurring=v3GenerateNextOccurrence(t);
        if(recurring)t.history.unshift({at:'Agora',text:`Próxima ocorrência recorrente criada para ${v3DueLabel(recurring)}.`});
      }
    }
    t.history.unshift({at:'Agora',text:`${v3CurrentNames()[0]||user.firstName||'Equipe'} salvou alterações na tarefa.`});
    v3Persist(true);window.AllianceOSOps?.recordTaskAction?.('atualizar_tarefa',t,{status:t.status,prazo:t.dueAt||t.due});showToast('Tarefa salva');closeTaskDetail();
  };

  let v3NewConferenceDraft=[];

  function v3RenderNewConferenceDraft(){
    const enabled=!!document.getElementById('newConferenceRequired')?.checked;
    const box=document.getElementById('newConferenceBuilder');
    const list=document.getElementById('newConferenceList');
    if(box)box.hidden=!enabled;
    if(!list)return;
    list.innerHTML=v3NewConferenceDraft.map((text,i)=>`<div class="v3-new-conference-row"><span class="v3-new-conference-check">✓</span><span>${esc(text)}</span><button type="button" data-remove-new-conference="${i}" aria-label="Remover item">×</button></div>`).join('');
    list.querySelectorAll('[data-remove-new-conference]').forEach(btn=>btn.addEventListener('click',()=>{
      v3NewConferenceDraft.splice(Number(btn.dataset.removeNewConference),1);
      v3RenderNewConferenceDraft();
    }));
  }

  function v3AddNewConferenceItem(){
    const input=document.getElementById('newConferenceItem');
    const text=input?.value.trim()||'';
    if(!text)return;
    v3NewConferenceDraft.push(text);
    input.value='';
    v3RenderNewConferenceDraft();
    input.focus();
  }

  function v3RebuildNewTaskForm(){
    const form=document.getElementById('newTaskForm');if(!form)return;
    form.innerHTML=`<div class="v3-new-head"><div><h2>Nova tarefa</h2><p>Crie uma execução clara, com responsável, prazo e vínculo com o planejamento.</p></div></div><div class="newgrid v3-new-grid">
      <div class="newfield full"><label>Título da tarefa</label><input id="newTitle" required placeholder="Ex.: Criar copy do disparo de sexta"></div>
      <div class="newfield"><label>Responsável pela execução</label><select id="newAssignee"></select></div>
      <div class="newfield"><label>Prioridade</label><select id="newPriority"><option value="urgente">Urgente</option><option value="alta">Alta</option><option value="normal" selected>Normal</option><option value="baixa">Baixa</option></select></div>
      <div class="newfield"><label>Status inicial</label><select id="newStatus">${TASK_STATUSES.filter(x=>x!=='feito').map(x=>`<option>${x}</option>`).join('')}</select></div>
      <div class="newfield"><label>Data de início</label><input id="newStart" type="date"></div>
      <div class="newfield"><label>Prazo com horário</label><input id="newDue" type="datetime-local"><small>O horário faz parte do prazo.</small></div>
      <div class="newfield"><label>Recorrência</label><select id="newRecurrence"><option value="nenhuma">Não repetir</option><option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option><option value="mensal">Mensal</option><option value="dias_semana">Dias específicos da semana</option></select></div>
      <div class="newfield full" id="newRecurrenceDays" hidden><label>Dias da semana</label><div class="v3-weekday-picks"><label><input type="checkbox" value="1">Seg</label><label><input type="checkbox" value="2">Ter</label><label><input type="checkbox" value="3">Qua</label><label><input type="checkbox" value="4">Qui</label><label><input type="checkbox" value="5">Sex</label><label><input type="checkbox" value="6">Sáb</label><label><input type="checkbox" value="7">Dom</label></div></div>
      <div class="newfield full"><label>Motivo do bloqueio <span>obrigatório se status = bloqueado</span></label><input id="newBlockedReason" placeholder="Ex.: aguardando aprovação da Meta"></div>
      <div class="newfield full"><label class="v3-conference-toggle"><span><b>Entrega obrigatória</b><small>impede conclusão sem entrega</small></span><input id="newDeliveryRequired" type="checkbox"><i></i></label></div>
      <div class="newfield"><label>Campanha / planejamento</label><select id="newCampaign"></select><small>Somente campanhas cadastradas para esta marca.</small></div>
      <div class="newfield full"><label>Depende de outra tarefa? <span>opcional</span></label><select id="newDependency"></select><small>Use quando esta tarefa só pode começar depois de outra.</small></div>
      <div class="newfield full v3-brand-field" id="newBrandField"><label>Marca</label><select id="newBrand"></select></div>
      <div class="newfield full"><label>Briefing / resultado esperado</label><textarea id="newDescription" placeholder="O que precisa ficar pronto? Inclua contexto, links e o critério para considerar esta tarefa bem executada."></textarea></div>
      <div class="newfield full v3-new-conference">
        <label class="v3-conference-toggle"><span><b>Lista de conferência</b><small>opcional</small></span><input id="newConferenceRequired" type="checkbox"><i></i></label>
        <small>Ative quando o executor precisar conferir itens obrigatórios antes de enviar a entrega ou concluir a tarefa.</small>
        <div id="newConferenceBuilder" class="v3-new-conference-builder" hidden>
          <div id="newConferenceList" class="v3-new-conference-list"></div>
          <div class="v3-new-conference-add"><input id="newConferenceItem" type="text" placeholder="Ex.: Conferir preço, cupom e condições da oferta"><button id="addNewConferenceItem" type="button">+ Adicionar item</button></div>
          <small>Todos os itens desta lista precisarão estar marcados como conferidos.</small>
        </div>
      </div>
    </div><div class="new-actions"><button type="button" id="cancelNewTask">Cancelar</button><button class="primary" type="submit">Criar tarefa</button></div>`;
    document.getElementById('newConferenceRequired')?.addEventListener('change',v3RenderNewConferenceDraft);
    document.getElementById('addNewConferenceItem')?.addEventListener('click',v3AddNewConferenceItem);
    document.getElementById('newConferenceItem')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();v3AddNewConferenceItem();}});
    document.getElementById('newRecurrence')?.addEventListener('change',e=>{
      const days=document.getElementById('newRecurrenceDays');if(days)days.hidden=e.target.value!=='dias_semana';
    });
  }

  function v3PopulateNewTaskForm(status='a fazer'){
    const active=v3NewPreset.brand||v3ActiveBrand();
    const brandField=document.getElementById('newBrandField');
    const brandSelect=document.getElementById('newBrand');
    brandSelect.innerHTML=v3Brands().map(b=>`<option ${b===active?'selected':''}>${esc(b)}</option>`).join('');
    if(active){brandSelect.value=active;brandField.style.display='none';}else brandField.style.display='grid';
    const brand=active||brandSelect.value||v3Brands()[0];
    const ass=document.getElementById('newAssignee');ass.innerHTML=v3AssigneeOptions('');
    const statusEl=document.getElementById('newStatus'); if([...statusEl.options].some(o=>o.value===status))statusEl.value=status;
    const camp=document.getElementById('newCampaign');camp.innerHTML=v3CampaignOptions(brand,v3NewPreset.campaignId,v3NewPreset.project);
    if(v3NewPreset.campaignId)camp.value=String(v3NewPreset.campaignId);
    const dep=document.getElementById('newDependency');
    const candidates=taskData.filter(t=>t.brand===brand&&t.status!=='feito'&&(!v3NewPreset.blocksTaskId||String(t.id)!==String(v3NewPreset.blocksTaskId)));
    dep.innerHTML='<option value="">Não depende de outra tarefa</option>'+candidates.slice(0,100).map(t=>`<option value="${esc(t.id)}">${esc(t.title)} · ${esc(v3Short(t.assignees[0]||'sem responsável'))}</option>`).join('');
    if(v3NewPreset.dependencyId)dep.value=String(v3NewPreset.dependencyId);
    if(v3NewPreset.blocksTaskId){dep.closest('.newfield').style.display='none';}
    document.getElementById('newBrand')?.addEventListener('change',e=>{const b=e.target.value;document.getElementById('newCampaign').innerHTML=v3CampaignOptions(b,null,null);const d=document.getElementById('newDependency');d.innerHTML='<option value="">Não depende de outra tarefa</option>'+taskData.filter(t=>t.brand===b&&t.status!=='feito').slice(0,100).map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('')});
  }

  openNewTask = function(status='a fazer',preset={}){
    v3NewPreset={...preset};
    v3NewConferenceDraft=[];
    v3PopulateNewTaskForm(status);
    const conferenceToggle=document.getElementById('newConferenceRequired');
    if(conferenceToggle)conferenceToggle.checked=false;
    v3RenderNewConferenceDraft();
    document.getElementById('newTaskModal').classList.add('open');
    setTimeout(()=>document.getElementById('newTitle')?.focus(),20);
  };
  closeNewTask = function(){document.getElementById('newTaskModal').classList.remove('open');document.getElementById('newTaskForm').reset();v3NewPreset={};};

  createTask = function(e){
    e.preventDefault();
    const title=document.getElementById('newTitle').value.trim();if(!title)return;
    const brand=v3NewPreset.brand||v3ActiveBrand()||document.getElementById('newBrand')?.value||v3Brands()[0];
    const campaign=v3FindCampaign(document.getElementById('newCampaign')?.value,brand);
    const dependencyId=document.getElementById('newDependency')?.value||'';
    const conferenceRequired=!!document.getElementById('newConferenceRequired')?.checked;
    if(conferenceRequired && !v3NewConferenceDraft.length){showToast('Adicione pelo menos um item à lista de conferência.');document.getElementById('newConferenceItem')?.focus();return;}
    const conferenceChecklist=conferenceRequired?v3NewConferenceDraft.map(text=>({id:v3Id('check'),text,done:false})):[];
    const status=document.getElementById('newStatus').value;
    const blockedReason=document.getElementById('newBlockedReason')?.value.trim()||'';
    if(status==='bloqueado'&&!blockedReason){showToast('Informe o motivo do bloqueio.');document.getElementById('newBlockedReason')?.focus();return;}
    const recurrenceTipo=document.getElementById('newRecurrence')?.value||'nenhuma';
    const recurrenceDays=[...document.querySelectorAll('#newRecurrenceDays input:checked')].map(x=>Number(x.value));
    if(recurrenceTipo==='dias_semana'&&!recurrenceDays.length){showToast('Escolha pelo menos um dia da semana.');return;}
    const localDue=document.getElementById('newDue').value||'';
    const dueAt=v3FromLocalInput(localDue);
    const selectedAssignee=document.getElementById('newAssignee').value||'';
    const selectedMember=(window.AllianceOSDirectory?.members||[]).find(m=>m.tipo==='usuario'&&m.atribuivel!==false&&m.nome===selectedAssignee);
    if(selectedAssignee&&!selectedMember){showToast('Escolha um usuário real para a atribuição.');return;}
    const id=v3Id('task');
    const t=v3NormalizeTask({
      id,title,status,blockedReason:status==='bloqueado'?blockedReason:null,assignees:[selectedAssignee].filter(Boolean),assigneeIds:selectedMember?[selectedMember.id]:[],
      due:dueAt?String(dueAt).slice(0,10):null,dueAt,start:document.getElementById('newStart').value||null,
      brand,project:campaign?.name||v3NewPreset.project||'Operação',listId:campaign?.listId||null,campaignId:campaign?._structured?(campaign.campaignId||null):(campaign?.id||v3NewPreset.campaignId||null),
      priority:v3PriorityCanon(document.getElementById('newPriority').value),description:document.getElementById('newDescription').value.trim(),
      checklist:conferenceChecklist,conferenceRequired,subtasks:[],attachments:[],comments:[],history:[{at:'Agora',text:`Tarefa criada via interface por ${v3CurrentNames()[0]||user.firstName||'Equipe'}.`},...(conferenceRequired?[{at:'Agora',text:`Lista de conferência obrigatória criada com ${conferenceChecklist.length} item(ns).`}]:[])],
      recurrence:'none',recurrenceRule:{tipo:'nenhuma',dias_semana:[]},tags:[],source:'interface',dependencies:dependencyId?[dependencyId]:[],parentTaskId:v3NewPreset.parentTaskId||null,deliveryRequired:!!document.getElementById('newDeliveryRequired')?.checked,archivedAt:null
    });
    v3ApplyRecurrence(t,recurrenceTipo,recurrenceDays);
    taskData.unshift(t);
    if(v3NewPreset.blocksTaskId){
      const parent=v3Task(v3NewPreset.blocksTaskId);
      if(parent){v3NormalizeTask(parent);if(!parent.dependencies.some(x=>String(x)===String(t.id)))parent.dependencies.push(t.id);parent.history.unshift({at:'Agora',text:`Nova etapa anterior criada: “${t.title}”.`});if(parent.status==='feito')parent.status='a fazer';}
    }
    const createdAsStep=!!v3NewPreset.blocksTaskId;v3Persist(true);window.AllianceOSOps?.recordTaskAction?.('criar_tarefa',t,{status:t.status,prazo:t.dueAt||t.due});closeNewTask();showToast(createdAsStep?'Etapa criada e vinculada':'Nova tarefa criada');
  };

  window.addEventListener('allianceos:directory',()=>{
    try{
      populateFilters();
      renderTasks();
      if(document.getElementById('newTaskModal')?.classList.contains('open'))v3PopulateNewTaskForm(document.getElementById('newStatus')?.value||'a fazer');
    }catch(e){console.warn('[AllianceOS directory refresh]',e);}
  });
  v3RebuildNewTaskForm();
  v3MigrateLegacySubtasks();
}

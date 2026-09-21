/* AllianceOS · Tarefas V3
   Este arquivo é injetado dentro do IIFE nativo de tarefas pelo build.js.
   Portanto ele usa taskData/taskState/TASK_USERS/etc. do módulo legado e
   substitui apenas a experiência de tarefas, sem duplicar a persistência. */
{
  let v3WeekOffset = 0;
  let v3NewPreset = {};
  let v3PeopleCampaignOrder = 'person-campaign';
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
    const next=v3NormalizeTask({...t,id:v3Id('rec'),status:'a fazer',blockedReason:null,due:nextDate,dueAt:nextDueAt,comments:[],deliveries:[],archivedAt:null,archivedBy:null,parentTaskId:null,dependencies:[],recurrenceSeriesId:t.recurrenceSeriesId||t.id,recurrenceGeneratedFrom:t.id,history:[{at:v3NowIso(),text:`Ocorrência recorrente criada automaticamente a partir de “${t.title}”.`}],checklist:(t.checklist||[]).map(x=>({...x,done:false})),source:'interface-generated'});
    taskData.unshift(next);return next;
  };

  const v3Id = (p='task') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const v3NowIso = () => new Date().toISOString();
  const v3NameNorm = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function v3ValidateTaskName(name,excludeId=null,brand=null){
    const value=String(name||'').trim();
    if(value.length>150){showToast('O nome da tarefa pode ter no máximo 150 caracteres.');return false;}
    const warnings=[];
    if(value.length>120)warnings.push('nome com '+value.length+' caracteres; revise para manter a listagem legível');
    const targetBrand=brand||v3Task(excludeId)?.brand||v3ActiveBrand()||'';
    const dup=taskData.find(x=>!x.archivedAt&&String(x.id)!==String(excludeId||'')&&v3NameNorm(x.title)===v3NameNorm(value)&&(!targetBrand||x.brand===targetBrand||(Array.isArray(x.brands)&&x.brands.includes(targetBrand))));
    if(dup)warnings.push('já existe uma tarefa com esse nome nesta marca (#'+String(dup.id).slice(-7)+')');
    if(warnings.length)showToast('⚠ '+warnings.join('. ')+'.');
    return true;
  }
  function v3TimeLabel(value){
    const raw=String(value||'').trim();
    if(!raw)return 'Data desconhecida';
    const d=new Date(raw);
    if(Number.isNaN(d.getTime()))return raw==='Agora'?'Data desconhecida':raw;
    const diff=Date.now()-d.getTime(),min=Math.floor(diff/60000);
    if(min>=0&&min<1)return 'Agora';
    if(min>=1&&min<60)return 'há '+min+' min';
    const hours=Math.floor(min/60);
    if(hours>=1&&hours<24)return 'há '+hours+'h';
    return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d).replace('.','');
  }
  function v3ActorInfo(){
    const name=(typeof v3CurrentNames==='function'&&v3CurrentNames()[0])||v3Short(user?.firstName||'Equipe');
    const members=window.AllianceOSDirectory?.members||[];
    const currentId=window.user?.id||user?.id||null;
    const member=(currentId?members.find(x=>String(x?.id||'')===String(currentId)):null)
      ||members.find(x=>x&&(x.nome===name||v3Short(x.nome)===v3Short(name)))
      ||null;
    return {by:member?.nome||name,authorId:member?.id||currentId||null,tipo:member?.tipo||null};
  }
  function v3HistoryOnce(t,key,text){
    t.history=Array.isArray(t.history)?t.history:[];
    if(t.history.some(h=>h&&h.eventKey===key&&!h.duplicado))return false;
    const actor=v3ActorInfo();
    t.history.unshift({at:v3NowIso(),by:actor.by,authorId:actor.authorId,text,eventKey:key,origin:'interface'});
    return true;
  }
  function v3AddHistory(t,text,key=''){
    if(key)return v3HistoryOnce(t,key,text);
    t.history=Array.isArray(t.history)?t.history:[];
    const actor=v3ActorInfo();
    t.history.unshift({at:v3NowIso(),by:actor.by,authorId:actor.authorId,text,origin:'interface'});
    return true;
  }

  const v3DeliveryStorageKey='central.deliveries.workspace.v1';
  function v3OfficialDeliveries(){
    try{const rows=JSON.parse(localStorage.getItem(v3DeliveryStorageKey)||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}
  }
  async function v3SaveOfficialDeliveries(rows){
    const value=Array.isArray(rows)?rows:[];
    if(window.AllianceOSStateSync?.save){
      await window.AllianceOSStateSync.save(v3DeliveryStorageKey,value);
      return;
    }
    localStorage.setItem(v3DeliveryStorageKey,JSON.stringify(value));
  }
  function v3OfficialDeliveryForTask(t){
    return v3OfficialDeliveries().filter(d=>String(d?.sourceTaskId||'')===String(t?.id||'')&&!d?.archivedAt&&!d?.arquivado_em);
  }
  function v3HasOfficialDelivery(t){return v3OfficialDeliveryForTask(t).length>0}
  function v3DeliveryMembers(){
    return (window.AllianceOSDirectory?.members||[]).filter(x=>x?.tipo==='usuario'&&x?.atribuivel!==false);
  }
  function v3DeliveryRecipientOptions(t){
    const members=v3DeliveryMembers(),preferred=(t.assigneeIds||[])[0]||'';
    if(!members.length)return '<option value="">Nenhum usuário disponível</option>';
    return '<option value="">Enviar para…</option>'+members.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(preferred)?'selected':''}>${esc(m.nome||m.email||'Usuário')}</option>`).join('');
  }

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
  function v3PriorityLevel(v){
    const p=v3PriorityCanon(v);
    return p==='baixa'?1:p==='normal'?2:3;
  }
  function v3PriorityTone(v){
    return {baixa:'low',normal:'normal',alta:'high',urgente:'urgent'}[v3PriorityCanon(v)]||'normal';
  }
  function v3PriorityBarsMarkup(v,className='v6-priority-bars'){
    const level=v3PriorityLevel(v);
    return '<span class="'+className+' level-'+level+'" data-priority-level="'+level+'" aria-hidden="true"><i></i><i></i><i></i></span>';
  }
  window.AlliancePriorityUI={
    canon:v3PriorityCanon,
    label:v3PriorityLabel,
    level:v3PriorityLevel,
    tone:v3PriorityTone,
    bars:v3PriorityBarsMarkup
  };

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

  function v3Descendants(t){
    const out=[],seen=new Set(),queue=[String(t.id)];
    while(queue.length){const id=queue.shift();for(const c of taskData.filter(x=>String(x.parentTaskId||'')===id)){if(seen.has(String(c.id)))continue;seen.add(String(c.id));out.push(c);queue.push(String(c.id));}}
    return out;
  }
  function v3DueMs(t){
    const raw=t?.dueAt||t?.due;if(!raw)return null;
    const text=String(raw),d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(text)?text+'T23:59:59-03:00':text);
    return Number.isNaN(d.getTime())?null:d.getTime();
  }
  function v3DeadlineWarnings(t){
    const out=[],me=v3DueMs(t),parent=v3Parent(t);
    if(me!=null&&me<Date.now()&&t.status!=='feito'&&!t.archivedAt)out.push('Prazo no passado.');
    if(parent){const pm=v3DueMs(parent);if(pm!=null&&me!=null&&me>pm)out.push('Subtarefa vence depois da tarefa mãe.');}
    for(const dep of v3Dependencies(t)){const dm=v3DueMs(dep);if(dm!=null&&me!=null&&me<dm)out.push('Vence antes da tarefa que a bloqueia: '+dep.title+'.');}
    if(me!=null)for(const child of v3Children(t)){const cm=v3DueMs(child);if(cm!=null&&cm>me)out.push('A tarefa mãe vence antes da subtarefa: '+child.title+'.');}
    return [...new Set(out)];
  }
  function v3RecordFieldChanges(t,before){
    const actor=v3ActorInfo(),fields=[['title','Nome'],['description','Descrição'],['brand','Marca'],['project','Lista'],['listId','Lista'],['campaignId','Campanha'],['assignees','Responsáveis'],['dueAt','Prazo'],['priority','Prioridade'],['parentTaskId','Tarefa mãe'],['status','Status'],['blockedReason','Motivo do bloqueio'],['deliveryRequired','Entrega obrigatória'],['archivedAt','Arquivamento']];
    t.history=Array.isArray(t.history)?t.history:[];
    for(const [key,label] of fields){const a=before?.[key]??null,b=t?.[key]??null;if(JSON.stringify(a)===JSON.stringify(b))continue;t.history.unshift({at:v3NowIso(),by:actor.by,authorId:actor.authorId,origin:'interface',campo:label.toLowerCase(),antes:a,depois:b,text:label+': '+(a??'—')+' → '+(b??'—')+'.'});}
  }


  function v3HasDependencyPath(fromId,targetId,seen=new Set()){
    if(String(fromId)===String(targetId)) return true;
    if(seen.has(String(fromId))) return false;
    seen.add(String(fromId));
    const t=v3Task(fromId); if(!t) return false;
    return (t.dependencies||[]).some(id=>v3HasDependencyPath(id,targetId,seen));
  }
  const v3WouldCycle = (task,depId) => String(task.id)===String(depId) || v3HasDependencyPath(depId,task.id);

  function v3Persist(render=true){
    const actor=v3ActorInfo();
    taskData.forEach(t=>{
      v3NormalizeTask(t);
      t.history=(Array.isArray(t.history)?t.history:[]).map(h=>{
        const x={...h};
        if(x.at){
          const d=new Date(String(x.at).replace(/^(\d{4}-\d{2}-\d{2})\s+/,'$1T'));
          if(Number.isNaN(d.getTime())){x.atOriginal=x.at;x.at=null;x.dataDesconhecida=true}else x.at=d.toISOString();
        }
        if(!x.origin)x.origin='interface';
        if(x.origin==='interface'&&!x.by)x.by=actor.by;
        if(x.origin==='interface'&&!x.authorId)x.authorId=actor.authorId;
        return x;
      });
      t.comments=(Array.isArray(t.comments)?t.comments:[]).map(c=>{
        const x={...c},d=x.at?new Date(String(x.at).replace(/^(\d{4}-\d{2}-\d{2})\s+/,'$1T')):null;
        if(d&&!Number.isNaN(d.getTime()))x.at=d.toISOString();
        else if(x.at){x.atOriginal=x.at;x.at=null;x.dataDesconhecida=true}
        if(!x.source)x.source='interface';
        if(!x.author)x.author=actor.by;
        if(!x.authorId)x.authorId=actor.authorId;
        return x;
      });
    });
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
    const members=(window.AllianceOSDirectory?.members||[]).filter(m=>m?.tipo==='usuario');
    let person=null;
    if(userId)person=members.find(m=>String(m.id)===String(userId))||null;
    const key=String(v3Short(name)||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    if(!person&&key)person=members.find(m=>String(m.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()===key)||null;
    if(!person&&key){
      const first=key.split(/\s+/)[0];
      const matches=members.filter(m=>String(m.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().split(/\s+/)[0]===first);
      if(matches.length===1)person=matches[0];
    }
    return person?.foto_url?`<img src="${esc(person.foto_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">`:initials(v3Short(person?.nome||name));
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

  function v6Icon(name){
    const p={
      blocked:'<path d="M7 3h10M7 21h10M8 3c0 4 1 6 4 9-3 3-4 5-4 9M16 3c0 4-1 6-4 9 3 3 4 5 4 9"/>',
      done:'<path d="m6.5 12 3.4 3.4 7.6-7.6"/>',
      next:'<path d="m9 6 6 6-6 6"/>',
      deps:'<path d="M7 7h4v4H7zM13 13h4v4h-4z"/><path d="M11 9h2a3 3 0 0 1 3 3v1"/>',
      calendar:'<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/>',
      folder:'<path d="M3.8 7.5h6l1.7 2H20v8.7a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.2V7.5Z"/><path d="M4 8V5.8A1.8 1.8 0 0 1 5.8 4h4l1.7 2H18"/>'
    }[name]||'';
    return '<svg class="v6-svg" viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
  }
  function v6Signal(kind,label){
    return '<span class="v6-signal '+kind+'"><span class="v6-signal-icon">'+v6Icon(kind==='delivery'?'done':kind==='ready'?'deps':kind)+'</span><span>'+esc(label)+'</span></span>';
  }
  function v6PriorityBars(priority){
    return v3PriorityBarsMarkup(priority,'v6-priority-bars');
  }
  function v4ListBadges(t){
    const deps=v3Dependencies(t), blockers=v3Blockers(t), next=v3Dependents(t);
    const out=[];
    if(t.status==='bloqueado') out.push(v6Signal('blocked','Bloqueada · '+String(t.blockedReason||'sem motivo')));
    else if(blockers.length) out.push(v6Signal('blocked','Bloqueada por '+blockers.length));
    else if(deps.length) out.push(v6Signal('ready','Dependências concluídas'));
    if(next.length) out.push(v6Signal('next','Libera '+next.length));
    return out.join('');
  }

  const v4MonthNames=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function v4Due(t){
    const raw=String(t.dueAt||t.due||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return {main:'Sem prazo',sub:'',empty:true};
    const [,m,d]=raw.split('-');
    return {main:Number(d)+' '+(v4MonthNames[Number(m)-1]||m),sub:isOverdue(t)?'Atrasada':'',empty:false};
  }
  function v4CampaignIcon(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h6l2 2h9v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6.5Z"/><path d="M3.5 9h17"/></svg>';
  }

  renderListRow = function(t){
    const blockers=v3Blockers(t),due=v4Due(t),description=String(t.description||'').trim(),parent=v3Parent(t);
    return `<div class="cu-row v4-work-row ${parent?'v4-is-subtask ':''}${blockers.length||t.status==='bloqueado'?'is-blocked':''}" data-task-id="${esc(t.id)}">
      <div class="cu-row-title">
        <!--v5-tree-->
        <button class="cu-complete ${t.status==='feito'?'done':''}" type="button" data-v3-toggle-done="${esc(t.id)}" title="${t.status==='feito'?'Reabrir tarefa':blockers.length?'Conclua as dependências primeiro':'Concluir tarefa'}">${t.status==='feito'?'✓':''}</button>
        <div class="cu-titletext">
          ${parent?`<div class="v4-subtask-context"><span>Subtarefa</span><b>de ${esc(parent.title)}</b></div>`:''}
          <div class="task-title-line"><b>${esc(t.title)}</b></div>
          <small>${esc(description||'Sem descrição adicionada')}</small>
          <!-- indicadores operacionais ficam apenas dentro da tarefa -->
        </div>
      </div>
      <div class="v4-owner">${avatarStack(t.assignees,t.assigneeIds||[])}</div>
      <div class="v4-priority"><span class="v6-priority tone-${v3PriorityTone(t.priority)}">${v6PriorityBars(t.priority)}<span>${v3PriorityLabel(t.priority)}</span></span></div>
      <div class="v4-due"><span class="v6-due ${isOverdue(t)?'over':''} ${due.empty?'empty':''}"><span class="v6-due-icon">${v6Icon('calendar')}</span><span class="v6-due-copy"><strong>${esc(due.main)}</strong>${due.sub?`<small>${esc(due.sub)}</small>`:''}</span></span></div>
      <div class="v4-campaign"><span class="v6-campaign-chip" title="${esc(t.project||'Operação')}"><span class="v6-campaign-icon">${v6Icon('folder')}</span><b>${esc(t.project||'Operação')}</b></span></div>
    </div>`;
  };

  renderList = function(canvas,data){
    const groups=TASK_STATUSES.map(status=>{
      const rows=data.filter(t=>t.status===status);
      return `<section class="cu-list-group v4-status-group ${rows.length?'':'is-empty'}" style="--group-color:${STATUS_COLORS[status]}">
        <div class="cu-group-head">
          <span class="v4-group-dot" aria-hidden="true"></span>
          <strong>${status}</strong>
          <span class="v4-group-count">${rows.length} ${rows.length===1?'tarefa':'tarefas'}</span>
          <button class="cu-add-inline" type="button" data-inline-new="${status}">＋ Nova tarefa</button>
        </div>
        ${rows.length?rows.map(renderListRow).join(''):'<div class="v4-empty-group">Nenhuma tarefa neste status.</div>'}
      </section>`;
    }).join('');
    canvas.innerHTML=`<div class="v4-list-shell">
      <div class="v4-list-header"><span>Tarefa</span><span>Responsável</span><span>Prioridade</span><span>Prazo</span><span>Campanha</span></div>
      <div class="v4-list-groups">${groups}</div>
    </div>`;
    bindTaskElements();
  };

  function v11Priority(t,showLabel=true){
    return '<span class="v11-priority tone-'+v3PriorityTone(t.priority)+'">'+v3PriorityBarsMarkup(t.priority,'v11-bars')+(showLabel?'<span>'+esc(v3PriorityLabel(t.priority))+'</span>':'')+'</span>';
  }
  function v11Date(t,showSub=true){
    const due=v4Due(t);
    return '<span class="v11-date '+(isOverdue(t)?'over ':'')+(due.empty?'empty':'')+'"><span class="v11-date-icon">'+v6Icon('calendar')+'</span><span class="v11-date-copy"><b>'+esc(due.main)+'</b>'+(showSub&&due.sub?'<small>'+esc(due.sub)+'</small>':'')+'</span></span>';
  }
  function v11Campaign(name){
    return '<span class="v11-campaign" title="'+esc(name||'Operação')+'"><span>'+v6Icon('folder')+'</span><b>'+esc(name||'Operação')+'</b></span>';
  }
  function v11Owner(t,showName=true){
    const name=t.assignees?.[0]||'Sem responsável',id=t.assigneeIds?.[0];
    if(name==='Sem responsável')return '<span class="v11-owner empty"><span class="v11-avatar">—</span>'+(showName?'<b>Sem responsável</b>':'')+'</span>';
    return '<span class="v11-owner"><span class="v11-avatar">'+v3AvatarInner(name,id)+'</span>'+(showName?'<b>'+esc(v3Short(name))+'</b>':'')+'</span>';
  }
  function v11Subtask(t){
    const parent=v3Parent(t);
    return parent?'<span class="v11-subtask">↳ Subtarefa</span>':'';
  }
  function v11Status(status){
    return '<span class="v11-status-inline"><i style="--v11-status:'+esc(STATUS_COLORS[status]||'#8e989f')+'"></i><span>'+esc(status)+'</span></span>';
  }

  renderBoard = function(canvas,data){
    const columns=TASK_STATUSES.map(status=>{
      const rows=data.filter(t=>t.status===status);
      const cards=rows.map(t=>{
        const description=String(t.description||'').trim();
        return '<article class="cu-card v11-board-card" draggable="true" data-drag-id="'+esc(t.id)+'" data-task-id="'+esc(t.id)+'">'+
          '<div class="v11-card-top">'+v11Campaign(t.project||'Operação')+v11Subtask(t)+'</div>'+
          '<div class="cu-card-title">'+esc(t.title)+'</div>'+
          '<div class="v11-card-desc">'+esc(description||'Sem descrição adicionada')+'</div>'+
          '<div class="v11-card-meta"><div>'+v11Owner(t,true)+'</div><div>'+v11Priority(t,true)+'</div></div>'+
          '<div class="v11-card-bottom">'+v11Date(t)+'</div>'+
        '</article>';
      }).join('');
      return '<section class="cu-column v11-board-column" data-v3-drop-status="'+esc(status)+'">'+
        '<div class="cu-colhead v11-board-head"><div><i style="--v11-status:'+esc(STATUS_COLORS[status]||'#8e989f')+'"></i><b>'+esc(status)+'</b></div><span>'+rows.length+'</span></div>'+
        '<div class="v11-board-list">'+(cards||'<div class="v11-board-empty">Nenhuma tarefa</div>')+'</div>'+
      '</section>';
    }).join('');
    canvas.innerHTML='<div class="v11-board-scroll"><div class="cu-board v11-board">'+columns+'</div></div>';
    bindTaskElements();bindDrag();
  };

  renderCampaign = function(canvas,data){
    const groups=[...new Set(data.map(t=>t.project||'Operação'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    canvas.innerHTML='<div class="cu-campaigns-grid v11-campaigns">'+groups.map(g=>{
      const rows=data.filter(t=>(t.project||'Operação')===g);
      const done=rows.filter(t=>t.status==='feito').length,open=rows.length-done,pct=rows.length?Math.round(done/rows.length*100):0;
      const statusGroups=TASK_STATUSES.map(status=>{
        const statusRows=rows.filter(t=>t.status===status);
        if(!statusRows.length)return '';
        return '<div class="v11-campaign-status">'+
          '<div class="v11-campaign-status-head"><i style="--v11-status:'+esc(STATUS_COLORS[status]||'#8e989f')+'"></i><b>'+esc(status)+'</b><span>'+statusRows.length+'</span></div>'+
          statusRows.map(t=>{
            const description=String(t.description||'').trim();
            return '<div class="cu-campaign-row v11-campaign-task" data-task-id="'+esc(t.id)+'">'+
              '<div class="v11-campaign-task-main">'+v11Subtask(t)+'<b>'+esc(t.title)+'</b><small>'+esc(description||'Sem descrição adicionada')+'</small></div>'+
              '<div class="v11-campaign-task-owner">'+v11Owner(t,true)+'</div>'+
              '<div class="v11-campaign-task-priority">'+v11Priority(t,true)+'</div>'+
              '<div class="v11-campaign-task-date">'+v11Date(t)+'</div>'+
            '</div>';
          }).join('')+
        '</div>';
      }).join('');
      return '<section class="cu-campaign-box v11-campaign-box">'+
        '<div class="cu-campaign-head v11-campaign-head">'+
          '<div class="v11-campaign-heading"><span class="v11-campaign-heading-icon">'+v6Icon('folder')+'</span><div><strong>'+esc(g)+'</strong><span>'+open+' abertas · '+done+' concluídas</span></div></div>'+
          '<div class="v11-progress"><span>'+done+'/'+rows.length+'</span><i><b style="width:'+pct+'%"></b></i></div>'+
        '</div>'+statusGroups+
      '</section>';
    }).join('')+'</div>';
    bindTaskElements();
  };

  renderPeople = function(canvas,data){
    const names=[...new Set(data.flatMap(t=>t.assignees.length?t.assignees:['Sem responsável']))].sort((a,b)=>v3Short(a).localeCompare(v3Short(b),'pt-BR'));
    const groups=names.map(n=>{
      const rows=data
        .filter(t=>(t.assignees.length?t.assignees:['Sem responsável']).includes(n))
        .slice()
        .sort((a,b)=>{
          const sa=TASK_STATUSES.indexOf(a.status),sb=TASK_STATUSES.indexOf(b.status);
          if(sa!==sb)return sa-sb;
          const od=Number(isOverdue(b))-Number(isOverdue(a));
          if(od)return od;
          return v3PriorityLevel(b.priority)-v3PriorityLevel(a.priority);
        });
      const done=rows.filter(t=>t.status==='feito').length;
      const open=rows.length-done;
      const late=rows.filter(isOverdue).length;
      const pct=rows.length?Math.round(done/rows.length*100):0;
      const avatar=n==='Sem responsável'?'<span class="v12-person-avatar empty">—</span>':'<span class="v12-person-avatar">'+v3AvatarInner(n)+'</span>';
      return '<section class="v12-person-group">'+
        '<div class="v12-person-head">'+
          '<div class="v12-person-ident">'+avatar+'<div><b>'+esc(v3Short(n))+'</b><span>'+open+' abertas · '+late+' atrasadas</span></div></div>'+
          '<div class="v12-person-progress"><span>'+done+'/'+rows.length+' concluídas</span><i><b style="width:'+pct+'%"></b></i></div>'+
        '</div>'+
        '<div class="v12-person-rows">'+rows.map(t=>{
          const description=String(t.description||'').trim();
          const parent=v3Parent(t);
          return '<div class="v12-person-row '+(parent?'is-subtask ':'')+'" data-task-id="'+esc(t.id)+'">'+
            '<div class="v12-person-task">'+
              (parent?'<div class="v12-subtask-line"><span>Subtarefa</span><b>de '+esc(parent.title)+'</b></div>':'')+
              '<strong>'+esc(t.title)+'</strong>'+
              '<small>'+esc(description||'Sem descrição adicionada')+'</small>'+
            '</div>'+
            '<div class="v12-person-execution">'+v11Status(t.status)+'</div>'+
            '<div class="v12-person-priority">'+v11Priority(t,true)+'</div>'+
            '<div class="v12-person-date">'+v11Date(t,false)+'</div>'+
            '<div class="v12-person-campaign">'+v11Campaign(t.project||'Operação')+'</div>'+
          '</div>';
        }).join('')+'</div>'+
      '</section>';
    }).join('');
    canvas.innerHTML='<div class="v12-people-shell">'+
      '<div class="v12-people-columns"><span>Tarefa</span><span>Execução</span><span>Prioridade</span><span>Prazo</span><span>Campanha</span></div>'+
      '<div class="v12-people-groups">'+groups+'</div>'+
    '</div>';
    bindTaskElements();
  };

  renderPeopleCampaign = function(canvas,data){
    const personNames=[...new Set(data.flatMap(t=>t.assignees.length?t.assignees:['Sem responsável']))].sort((a,b)=>v3Short(a).localeCompare(v3Short(b),'pt-BR'));
    const campaignNames=[...new Set(data.map(t=>t.project||'Operação'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));

    const taskRow=t=>{
      const description=String(t.description||'').trim();
      const parent=v3Parent(t);
      return '<div class="v13-pc-task '+(parent?'is-subtask ':'')+'" data-task-id="'+esc(t.id)+'">'+
        '<div class="v13-pc-main">'+
          (parent?'<div class="v13-pc-sub"><span>Subtarefa</span><b>de '+esc(parent.title)+'</b></div>':'')+
          '<strong>'+esc(t.title)+'</strong>'+
          '<small>'+esc(description||'Sem descrição adicionada')+'</small>'+
        '</div>'+
        '<div class="v13-pc-execution">'+v11Status(t.status)+'</div>'+
        '<div class="v13-pc-priority">'+v11Priority(t,true)+'</div>'+
        '<div class="v13-pc-date">'+v11Date(t,false)+'</div>'+
      '</div>';
    };

    const campaignBlock=(campaign,rows)=>{
      const done=rows.filter(t=>t.status==='feito').length;
      const pct=rows.length?Math.round(done/rows.length*100):0;
      return '<section class="v13-pc-campaign">'+
        '<div class="v13-pc-campaign-head">'+
          '<div class="v13-pc-campaign-title"><span>'+v6Icon('folder')+'</span><div><b>'+esc(campaign)+'</b><small>'+((rows.length-done))+' abertas · '+done+' concluídas</small></div></div>'+
          '<div class="v13-pc-progress"><span>'+done+'/'+rows.length+'</span><i><b style="width:'+pct+'%"></b></i></div>'+
        '</div>'+
        '<div class="v13-pc-columns"><span>Tarefa</span><span>Execução</span><span>Prioridade</span><span>Prazo</span></div>'+
        '<div class="v13-pc-tasks">'+rows.map(taskRow).join('')+'</div>'+
      '</section>';
    };

    const personBlock=(name,rows)=>{
      const done=rows.filter(t=>t.status==='feito').length;
      const late=rows.filter(isOverdue).length;
      const pct=rows.length?Math.round(done/rows.length*100):0;
      const avatar=name==='Sem responsável'?'<span class="v13-pc-avatar empty">—</span>':'<span class="v13-pc-avatar">'+v3AvatarInner(name)+'</span>';
      const campaigns=[...new Set(rows.map(t=>t.project||'Operação'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
      return '<section class="v13-pc-person">'+
        '<div class="v13-pc-person-head">'+
          '<div class="v13-pc-person-id">'+avatar+'<div><b>'+esc(v3Short(name))+'</b><span>'+rows.filter(t=>t.status!=='feito').length+' abertas · '+late+' atrasadas · '+campaigns.length+' campanha'+(campaigns.length===1?'':'s')+'</span></div></div>'+
          '<div class="v13-pc-person-progress"><span>'+done+'/'+rows.length+' concluídas</span><i><b style="width:'+pct+'%"></b></i></div>'+
        '</div>'+
        '<div class="v13-pc-person-campaigns">'+campaigns.map(c=>campaignBlock(c,rows.filter(t=>(t.project||'Operação')===c))).join('')+'</div>'+
      '</section>';
    };

    const personInsideCampaign=(name,rows)=>{
      const avatar=name==='Sem responsável'?'<span class="v13-pc-avatar empty">—</span>':'<span class="v13-pc-avatar">'+v3AvatarInner(name)+'</span>';
      return '<section class="v13-pc-inner-person">'+
        '<div class="v13-pc-inner-person-head">'+avatar+'<div><b>'+esc(v3Short(name))+'</b><span>'+rows.filter(t=>t.status!=='feito').length+' abertas · '+rows.filter(t=>t.status==='feito').length+' concluídas</span></div></div>'+
        '<div class="v13-pc-columns"><span>Tarefa</span><span>Execução</span><span>Prioridade</span><span>Prazo</span></div>'+
        '<div class="v13-pc-tasks">'+rows.map(taskRow).join('')+'</div>'+
      '</section>';
    };

    let body='';
    if(v3PeopleCampaignOrder==='campaign-person'){
      body=campaignNames.map(campaign=>{
        const rows=data.filter(t=>(t.project||'Operação')===campaign);
        const done=rows.filter(t=>t.status==='feito').length,pct=rows.length?Math.round(done/rows.length*100):0;
        const names=[...new Set(rows.flatMap(t=>t.assignees.length?t.assignees:['Sem responsável']))].sort((a,b)=>v3Short(a).localeCompare(v3Short(b),'pt-BR'));
        return '<section class="v13-pc-campaign-first">'+
          '<div class="v13-pc-campaign-first-head">'+
            '<div class="v13-pc-campaign-title"><span>'+v6Icon('folder')+'</span><div><b>'+esc(campaign)+'</b><small>'+names.length+' pessoa'+(names.length===1?'':'s')+' · '+(rows.length-done)+' abertas</small></div></div>'+
            '<div class="v13-pc-progress"><span>'+done+'/'+rows.length+'</span><i><b style="width:'+pct+'%"></b></i></div>'+
          '</div>'+
          '<div class="v13-pc-inner-people">'+names.map(n=>personInsideCampaign(n,rows.filter(t=>(t.assignees.length?t.assignees:['Sem responsável']).includes(n)))).join('')+'</div>'+
        '</section>';
      }).join('');
    }else{
      body=personNames.map(n=>personBlock(n,data.filter(t=>(t.assignees.length?t.assignees:['Sem responsável']).includes(n)))).join('');
    }

    canvas.innerHTML='<div class="v13-pc-shell">'+
      '<div class="v13-pc-controls"><span>Agrupar por</span><div><button type="button" data-pc-order="person-campaign" class="'+(v3PeopleCampaignOrder==='person-campaign'?'active':'')+'">Pessoa → Campanha</button><button type="button" data-pc-order="campaign-person" class="'+(v3PeopleCampaignOrder==='campaign-person'?'active':'')+'">Campanha → Pessoa</button></div></div>'+
      '<div class="v13-pc-body">'+body+'</div>'+
    '</div>';

    bindTaskElements();
    canvas.querySelectorAll('[data-pc-order]').forEach(b=>b.addEventListener('click',()=>{
      v3PeopleCampaignOrder=b.dataset.pcOrder;
      renderPeopleCampaign(canvas,data);
    }));
  };

  renderWeek = function(canvas,data){
    const now=new Date(); now.setHours(12,0,0,0);
    const monday=new Date(now); monday.setDate(now.getDate()-((now.getDay()+6)%7)+(v3WeekOffset*7));
    const days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d;});
    const today=v3TodayIso();
    const firstIso=v3Iso(days[0]), lastIso=v3Iso(days[6]);
    const overdue=data.filter(t=>isOverdue(t));
    const unscheduled=data.filter(t=>t.status!=='feito'&&!t.due);
    const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    canvas.innerHTML='<div class="v3-week-head v11-week-head"><div><button type="button" data-week-shift="-1">‹</button><button type="button" data-week-today>Esta semana</button><button type="button" data-week-shift="1">›</button></div><strong>'+dateBr(firstIso)+' — '+dateBr(lastIso)+'</strong><span>'+unscheduled.length+' sem prazo</span></div>'+
      (overdue.length?'<div class="cu-week-overdue v11-week-overdue"><div><b>'+overdue.length+' atrasada'+(overdue.length>1?'s':'')+'</b><span>Tarefas abertas fora da semana</span></div><button type="button" id="showOverdueWeek">Ver na Lista</button></div>':'')+
      '<div class="cu-week-wrap v11-week-wrap"><div class="cu-week v11-week">'+days.map((d,i)=>{
        const iso=v3Iso(d), rows=data.filter(t=>String(t.dueAt||t.due||'').slice(0,10)===iso);
        return '<section class="cu-day v11-day '+(iso===today?'today':'')+'">'+
          '<div class="cu-day-head v11-day-head"><div><span>'+names[i]+'</span><b>'+String(d.getDate()).padStart(2,'0')+'</b></div><div><small>'+rows.length+' tarefa'+(rows.length===1?'':'s')+'</small>'+(iso===today?'<em>Hoje</em>':'')+'</div></div>'+
          '<div class="v11-day-body">'+(rows.length?rows.map(t=>{
            const description=String(t.description||'').trim();
            return '<div class="cu-week-card v11-week-card" data-task-id="'+esc(t.id)+'">'+
              '<div class="v11-week-card-top">'+v11Campaign(t.project||'Operação')+v11Subtask(t)+'</div>'+
              '<b>'+esc(t.title)+'</b>'+
              '<small>'+esc(description||'Sem descrição adicionada')+'</small>'+
              '<div class="v11-week-card-foot">'+v11Owner(t,false)+v11Priority(t,true)+'</div>'+
            '</div>';
          }).join(''):'<div class="v3-day-empty v11-day-empty">Sem tarefas</div>')+'</div>'+
        '</section>';
      }).join('')+'</div></div>';
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
    if(taskState.view==='board')renderBoard(canvas,data);else if(taskState.view==='campaign')renderCampaign(canvas,data);else if(taskState.view==='people')renderPeople(canvas,data);else if(taskState.view==='people-campaign')renderPeopleCampaign(canvas,data);else if(taskState.view==='week')renderWeek(canvas,data);else renderList(canvas,data);
  };

  function v3CompletionProblem(t,ignoreChildren=false,assumeDoneIds=new Set()){
    const blockers=v3Blockers(t).filter(x=>!assumeDoneIds.has(String(x.id)));
    if(blockers.length)return 'Conclua antes: '+blockers.slice(0,3).map(x=>x.title).join(', ')+(blockers.length>3?'…':'');
    if(!ignoreChildren){
      const open=v3Descendants(t).filter(x=>!x.archivedAt&&x.status!=='feito'&&!assumeDoneIds.has(String(x.id)));
      if(open.length)return 'Há '+open.length+' subtarefa(s) aberta(s): '+open.slice(0,3).map(x=>x.title).join(', ')+'.';
    }
    if(t.conferenceRequired){
      const pending=(t.checklist||[]).filter(x=>!x.done);
      if(!(t.checklist||[]).length)return 'A lista de conferência obrigatória está sem itens.';
      if(pending.length)return 'Confira os '+pending.length+' item(ns) obrigatórios da lista de conferência.';
    }
    if(t.deliveryRequired&&!v3HasOfficialDelivery(t))return 'Esta tarefa exige uma entrega existente na coleção oficial antes da conclusão.';
    return '';
  }

  function v3Complete(t,done=true){
    if(done){
      const open=v3Descendants(t).filter(x=>!x.archivedAt&&x.status!=='feito');
      const group=new Set(open.map(x=>String(x.id)));
      if(open.length){
        const ok=window.confirm('Esta tarefa tem '+open.length+' subtarefa(s) aberta(s). Deseja concluir as subtarefas junto?');
        if(!ok){showToast('Conclusão cancelada. As subtarefas continuam abertas.');return false;}
        for(const child of [...open].reverse()){const p=v3CompletionProblem(child,true,group);if(p){showToast('Não foi possível concluir “'+child.title+'”: '+p);return false;}}
        for(const child of [...open].reverse()){const before=structuredClone(child),at=v3NowIso();child.status='feito';child.completedAt=at;child.blockedReason=null;v3RecordFieldChanges(child,before);const rec=v3GenerateNextOccurrence(child);if(rec)v3HistoryOnce(child,'recurrence-created:'+String(rec.id),'Próxima ocorrência recorrente criada para '+v3DueLabel(rec)+'.');}
      }
      const problem=v3CompletionProblem(t,true,group);if(problem){showToast(problem);return false;}
      if(t.status!=='feito'){
        const old=t.status,completedAt=v3NowIso();t.status='feito';t.completedAt=completedAt;
        v3HistoryOnce(t,'status-feito:'+completedAt,'Status alterado de “'+old+'” para “feito”.');
        for(const next of v3Dependents(t))v3HistoryOnce(next,'dependency-release:'+String(t.id)+':'+completedAt,'Dependência concluída: “'+t.title+'”. Esta tarefa está liberada para execução.');
        const recurring=v3GenerateNextOccurrence(t);if(recurring)v3HistoryOnce(t,'recurrence-created:'+String(recurring.id),'Próxima ocorrência recorrente criada para '+v3DueLabel(recurring)+'.');
      }
    }else if(t.status==='feito'){t.status='a fazer';t.completedAt=null;v3HistoryOnce(t,'reopened:'+v3NowIso(),'Tarefa reaberta.');}
    v3Persist(true);window.AllianceOSOps?.recordTaskAction?.('atualizar_tarefa',t,{status:t.status,concluir_subtarefas:done&&v3Descendants(t).length>0});return true;
  }

  bindTaskElements = function(){
    document.querySelectorAll('[data-task-id]').forEach(el=>el.addEventListener('click',e=>{if(e.target.closest('[data-v3-toggle-done]'))return;openTaskDetail(el.dataset.taskId)}));
    document.querySelectorAll('[data-v3-toggle-done]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const t=v3Task(b.dataset.v3ToggleDone);if(t)v3Complete(t,t.status!=='feito')}));
    document.querySelectorAll('[data-inline-new]').forEach(b=>b.addEventListener('click',()=>openNewTask(b.dataset.inlineNew)));
  };

  bindDrag = function(){
    document.querySelectorAll('[data-drag-id]').forEach(card=>{card.addEventListener('dragstart',e=>{card.classList.add('dragging');e.dataTransfer.setData('text/plain',card.dataset.dragId)});card.addEventListener('dragend',()=>card.classList.remove('dragging'))});
    document.querySelectorAll('[data-v3-drop-status]').forEach(col=>{col.addEventListener('dragover',e=>e.preventDefault());col.addEventListener('drop',e=>{e.preventDefault();const t=v3Task(e.dataTransfer.getData('text/plain'));if(!t)return;const next=col.dataset.v3DropStatus;if(t.status===next)return;if(next==='feito'){const problem=v3CompletionProblem(t);if(problem){showToast(problem);return;}}if(next==='bloqueado'&&!t.blockedReason){t.blockedReason='Bloqueada manualmente no quadro';}const old=t.status;t.status=next;v3AddHistory(t,`Status alterado de “${old}” para “${next}”.`);if(next!=='bloqueado'&&old==='bloqueado'&&t.blockedReason){v3AddHistory(t,`Bloqueio encerrado. Motivo anterior: ${t.blockedReason}`);t.blockedReason=null;}if(next==='feito'){const completedAt=v3NowIso();t.completedAt=completedAt;for(const x of v3Dependents(t))v3HistoryOnce(x,'dependency-release:'+String(t.id)+':'+completedAt,`Dependência concluída: “${t.title}”. Esta tarefa está liberada para execução.`);v3GenerateNextOccurrence(t);}v3Persist(true)})});
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
    return `<select id="detailCampaign" ${t.parentTaskId?'disabled title="Desvincule a subtarefa antes de mudar de lista/campanha"':''}>${v3CampaignOptions(t.brand,selected,t.project)}</select>`;
  }

  openTaskDetail = function(id){
    const t=v3Task(id);if(!t)return;v3NormalizeTask(t);taskState.selected=t.id;
    const parent=v3Parent(t);
    document.getElementById('taskDetailKicker').textContent=`${t.brand||''} · ${t.project||'Operação'}${parent?` · etapa de ${parent.title}`:''} · #${String(t.id).slice(-7)}`;
    const titleInput=document.getElementById('taskTitleInput');titleInput.value=t.title;titleInput.maxLength=150;
    renderTaskDetailBody(t);
    document.getElementById('taskDetailDrawer').classList.add('open');
  };

  renderTaskDetailBody = function(t){
    v3NormalizeTask(t);
    const body=document.getElementById('taskDetailBody');
    const deps=v3Dependencies(t), blockers=v3Blockers(t), next=v3Dependents(t), parent=v3Parent(t), completed=(t.checklist||[]).filter(x=>x.done).length, candidates=v3DependencyCandidates(t), completionProblem=v3CompletionProblem(t), recurrenceSpec=v3RecurrenceSpec(t), deadlineWarnings=v3DeadlineWarnings(t);
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
      <section class="tsection v3-section"><div class="tsection-head"><div><strong>Entrega</strong><span>${t.deliveryRequired?'Obrigatória para concluir. Só conta quando existe na coleção oficial.':'Registre o resultado final e envie para aprovação.'}</span></div><span>${v3OfficialDeliveryForTask(t).length}</span></div><div class="addline v3-delivery-add"><select id="newDeliveryRecipient" aria-label="Destinatário da entrega">${v3DeliveryRecipientOptions(t)}</select><input id="newDeliveryText" placeholder="Cole o link ou descreva a entrega"><button type="button" id="addDeliveryBtn">Registrar entrega</button></div><div id="deliveryList">${(t.deliveries||[]).map((d)=>`<div class="file-pill ${d.archivedAt?'is-archived':''}"><span>↗</span><b>${esc(d.text||d.note||d.url||d.name||'Entrega')}</b><small>${esc((d.status||'enviado')+' · '+v3TimeLabel(d.at||d.sentAt||d.createdAt))}</small>${d.migrationStatus==='pendente'?'<em>migração pendente</em>':''}<button type="button" data-archive-delivery="${esc(d.id||d.deliveryId||'')}" ${d.archivedAt?'disabled':''}>${d.archivedAt?'Arquivada':'Arquivar'}</button></div>`).join('')}</div></section>
      <section class="tsection v3-section v3-continuity"><div class="tsection-head"><div><strong>Conclusão e continuidade</strong><span>O fluxo libera automaticamente as próximas tarefas. Não é necessário escolher “próxima tarefa”.</span></div></div>${blockers.length?`<div class="v3-continuity-note blocked">Ainda faltam ${blockers.length} dependência${blockers.length>1?'s':''}: ${blockers.slice(0,3).map(x=>esc(x.title)).join(', ')}.</div>`:`<div class="v3-continuity-note">${next.length?`Ao concluir, ${next.length===1?`“${esc(next[0].title)}” será liberada`:`${next.length} tarefas serão liberadas`} automaticamente.`:'Esta é a última etapa conhecida deste fluxo.'}</div>`}<button type="button" id="v3CompleteTaskBtn" class="v3-complete-btn ${t.status==='feito'?'secondary':''}" ${blockers.length&&t.status!=='feito'?'disabled':''}>${t.status==='feito'?'Reabrir tarefa':next.length?'Concluir e liberar próximas':'Concluir tarefa'}</button></section>
      <section class="tsection v3-section"><div class="tsection-head"><div><strong>Comentários e atividade</strong><span>Decisões e mudanças importantes ficam registradas aqui.</span></div><span>${(t.comments||[]).length} comentário(s)</span></div><div class="addline v3-comment-add"><input id="newCommentText" placeholder="Escreva um comentário"><button type="button" id="addCommentBtn">Comentar</button></div><div id="commentList">${(t.comments||[]).map(c=>`<div class="comment"><div class="cav">${v3AvatarInner(c.author,c.authorId)}</div><div class="comment-body"><b>${esc(c.author)}</b><p>${esc(c.text)}</p><small>${esc(v3TimeLabel(c.at))}</small></div></div>`).join('')}</div><div class="v3-history">${(t.history||[]).filter(h=>!h?.duplicado).map(h=>`<div class="activity"><b>${esc(v3TimeLabel(h.at))}</b><p>${esc(h.text)}</p></div>`).join('')}</div></section>
    </main><aside class="tdetail-side"><div class="v3-side-title"><strong>Contexto da tarefa</strong><span>${esc(t.brand||'')} · ${esc(t.project||'Operação')}</span></div><div class="tdetail-grid">
      <div class="tfield"><label>Status</label><select id="detailStatus">${TASK_STATUSES.map(st=>`<option value="${st}" ${st===t.status?'selected':''} ${st==='feito'&&completionProblem&&t.status!=='feito'?'disabled':''}>${st}${st==='feito'&&completionProblem?' · com trava':''}</option>`).join('')}</select></div>
      <div class="tfield" id="detailBlockedReasonField"><label>Motivo do bloqueio</label><input id="detailBlockedReason" value="${esc(t.blockedReason||'')}" placeholder="Ex.: aguardando terceiro"><small>Obrigatório quando o status é bloqueado.</small></div>
      <div class="tfield"><label>Responsável pela execução</label><select id="detailPrimaryAssignee">${v3AssigneeOptions(t.assignees[0]||'')}</select></div>
      <div class="tfield"><label>Apoio / colaboradores</label><div class="v3-support-list">${t.assignees.slice(1).map(a=>`<span>${esc(v3Short(a))}<button type="button" data-remove-assignee="${esc(a)}">×</button></span>`).join('')||'<small>Ninguém adicionado</small>'}</div><select id="detailAddAssignee"><option value="">+ adicionar colaborador</option>${v3TeamUsers().filter(x=>!t.assignees.includes(x)).map(x=>`<option value="${esc(x)}">${esc(v3Short(x))}</option>`).join('')}</select></div>
      <div class="tfield"><label>Prioridade</label><select id="detailPriority">${["urgente","alta","normal","baixa"].map(v=>`<option value="${v}" ${v===v3PriorityCanon(t.priority)?'selected':''}>${v3PriorityLabel(v)}</option>`).join('')}</select></div>
      <div class="tfield"><label>Data de início</label><input type="date" id="detailStart" value="${t.start||''}"></div>
      <div class="tfield"><label>Prazo com horário</label><input type="datetime-local" id="detailDue" value="${v3ToLocalInput(t.dueAt,t.due)}"><small>${esc(v3DueLabel(t))}</small>${deadlineWarnings.length?`<small class="v3-deadline-warning">⚠ ${esc(deadlineWarnings.join(' '))}</small>`:''}</div>
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
    if(get('detailCampaign')&&!t.parentTaskId) {
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
    document.getElementById('archiveTaskBtn')?.addEventListener('click',()=>{
      syncDetailDraft(t);const before=structuredClone(t);
      if(!t.archivedAt){
        const direct=v3Children(t).filter(x=>!x.archivedAt);
        if(direct.length){
          const choice=String(window.prompt('Esta tarefa tem subtarefas ativas. Digite "arquivar" para arquivar todas junto ou "desvincular" para manter as filhas ativas como tarefas soltas.','')||'').trim().toLowerCase();
          if(choice!=='arquivar'&&choice!=='desvincular'){showToast('Arquivamento cancelado: escolha o que fazer com as subtarefas.');return;}
          if(choice==='arquivar')for(const child of v3Descendants(t)){if(child.archivedAt)continue;const cb=structuredClone(child);child.archivedAt=v3NowIso();child.archivedBy=v3ActorInfo().authorId;v3RecordFieldChanges(child,cb);}
          else for(const child of direct){const cb=structuredClone(child);child.parentTaskId=null;v3RecordFieldChanges(child,cb);}
        }
        t.archivedAt=v3NowIso();t.archivedBy=v3ActorInfo().authorId;
      }else{t.archivedAt=null;t.archivedBy=null;}
      v3RecordFieldChanges(t,before);v3Persist(true);window.AllianceOSOps?.recordTaskAction?.(t.archivedAt?'arquivar_tarefa':'desarquivar_tarefa',t,{});closeTaskDetail();showToast(t.archivedAt?'Tarefa arquivada':'Tarefa desarquivada');
    });
    document.getElementById('detailAddAssignee')?.addEventListener('change',e=>{if(e.target.value&&!t.assignees.includes(e.target.value)){syncDetailDraft(t);t.assignees.push(e.target.value);v3AddHistory(t,`${v3Short(e.target.value)} foi adicionado como colaborador.`);renderTaskDetailBody(t)}});
    document.querySelectorAll('[data-remove-assignee]').forEach(b=>b.addEventListener('click',()=>{syncDetailDraft(t);t.assignees=t.assignees.filter(x=>x!==b.dataset.removeAssignee);renderTaskDetailBody(t)}));
    document.querySelectorAll('[data-check-id]').forEach(c=>c.addEventListener('change',()=>{const x=t.checklist.find(y=>String(y.id)===String(c.dataset.checkId));if(x)x.done=c.checked;syncDetailDraft(t);v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('marcar_item_checklist',t,{item_id:c.dataset.checkId,concluido:c.checked});renderTaskDetailBody(t)}));
    document.querySelectorAll('[data-remove-check]').forEach(b=>b.addEventListener('click',()=>{syncDetailDraft(t);t.checklist=t.checklist.filter(x=>String(x.id)!==String(b.dataset.removeCheck));v3Persist(false);renderTaskDetailBody(t)}));
    document.getElementById('addCheckBtn')?.addEventListener('click',()=>{const i=document.getElementById('newCheckText');if(!i.value.trim())return;syncDetailDraft(t);t.checklist.push({id:v3Id('check'),text:i.value.trim(),done:false});v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('definir_checklist',t,{itens:t.checklist.length});renderTaskDetailBody(t)});
    document.getElementById('attachmentInput')?.addEventListener('change',e=>{syncDetailDraft(t);[...e.target.files].forEach(f=>t.attachments.push({name:f.name,size:`${Math.max(1,Math.round(f.size/1024))} KB`}));v3Persist(false);renderTaskDetailBody(t)});
    document.querySelectorAll('[data-remove-attachment]').forEach(b=>b.addEventListener('click',()=>{syncDetailDraft(t);t.attachments.splice(Number(b.dataset.removeAttachment),1);v3Persist(false);renderTaskDetailBody(t)}));
    document.getElementById('addDeliveryBtn')?.addEventListener('click',async()=>{
      const i=document.getElementById('newDeliveryText'),recipientId=document.getElementById('newDeliveryRecipient')?.value;
      const text=String(i?.value||'').trim();if(!text)return;
      const recipient=v3DeliveryMembers().find(m=>String(m.id)===String(recipientId||''));
      if(!recipient){showToast('Escolha um destinatário real para a entrega.');return}
      syncDetailDraft(t);
      const actor=v3ActorInfo(),ts=v3NowIso(),id='del-'+Date.now()+'-'+Math.random().toString(36).slice(2,10),ds=v3OfficialDeliveries();
      const links=/^https?:\/\//i.test(text)?[{id:'l-'+Math.random().toString(36).slice(2,10),label:'Link',url:text}]:[];
      const version=ds.filter(d=>String(d?.sourceTaskId||'')===String(t.id)&&String(d?.to||'')===String(recipient.nome||recipient.email||'')).length+1;
      const official={id,sourceTaskId:String(t.id),targetTaskId:'',campaignId:t.campaignId||null,campaignSource:'task',title:'Entrega · '+t.title,taskTitle:t.title,project:t.project,brand:t.brand,from:actor.by,fromId:actor.authorId,to:recipient.nome||recipient.email||'Usuário',toId:recipient.id,note:text,status:'enviado',createdAt:ts,updatedAt:ts,sentAt:ts,version,completeTask:false,files:[],links,events:[{at:ts,by:actor.by,authorId:actor.authorId,origin:'interface',text:'Entrega enviada para '+(recipient.nome||recipient.email||'Usuário')+'.'}],origin:'interface',archivedAt:null,archivedBy:null};
      ds.unshift(official);
      try{await v3SaveOfficialDeliveries(ds)}catch(e){console.error('[AllianceOS entrega] falha ao salvar coleção oficial',e);showToast('Não foi possível salvar a entrega oficial. Nada foi alterado na tarefa.');return}
      t.deliveries=Array.isArray(t.deliveries)?t.deliveries:[];
      t.deliveries.unshift({id,deliveryId:id,text:official.title,note:text,at:ts,sentAt:ts,author:actor.by,authorId:actor.authorId,to:official.to,toId:official.toId,source:'interface',status:'enviado',campaignId:official.campaignId,targetTaskId:'',links:structuredClone(links),files:[],archivedAt:null,archivedBy:null});
      v3AddHistory(t,'Entrega registrada na coleção oficial e enviada para '+official.to+'.','delivery-created:'+id);
      v3Persist(false);
      window.AllianceOSOps?.recordTaskAction?.('registrar_entrega',t,{entrega:text,delivery_id:id,destinatario:official.to});
      renderTaskDetailBody(t)
    });
    document.querySelectorAll('[data-archive-delivery]').forEach(b=>b.addEventListener('click',async()=>{
      const id=b.dataset.archiveDelivery;if(!id)return;syncDetailDraft(t);const actor=v3ActorInfo(),ts=v3NowIso(),ds=v3OfficialDeliveries(),official=ds.find(d=>String(d?.id||'')===String(id));
      if(official){official.archivedAt=official.archivedAt||ts;official.archivedBy=actor.authorId;official.updatedAt=ts;official.events=Array.isArray(official.events)?official.events:[];official.events.push({at:ts,by:actor.by,authorId:actor.authorId,origin:'interface',text:'Entrega arquivada pela interface.'});try{await v3SaveOfficialDeliveries(ds)}catch(e){console.error('[AllianceOS entrega] falha ao arquivar na coleção oficial',e);showToast('Não foi possível arquivar a entrega oficial.');return}}
      const embedded=(t.deliveries||[]).find(d=>String(d?.id||d?.deliveryId||'')===String(id));if(embedded){embedded.archivedAt=embedded.archivedAt||ts;embedded.archivedBy=actor.authorId}
      v3AddHistory(t,'Entrega arquivada pela interface.','delivery-archived:'+id);v3Persist(false);renderTaskDetailBody(t)
    }));
    document.getElementById('addCommentBtn')?.addEventListener('click',()=>{const i=document.getElementById('newCommentText');if(!i.value.trim())return;syncDetailDraft(t);const text=i.value.trim();t.comments.unshift({id:v3Id('comment'),author:v3CurrentNames()[0]||user.firstName||'Equipe',authorId:window.user?.id||null,text,at:v3NowIso(),source:'interface'});v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('comentar_tarefa',t,{comentario:text});renderTaskDetailBody(t)});
    document.getElementById('linkDependencyBtn')?.addEventListener('click',()=>{const id=document.getElementById('detailAddDependency')?.value;if(!id)return;const dependency=v3Task(id);if(!dependency){showToast('Tarefa de dependência não encontrada.');return;}if(String(dependency.brand||'')!==String(t.brand||'')){showToast('Dependência entre marcas diferentes não é permitida.');return;}if(v3WouldCycle(t,id)){showToast('Esse vínculo criaria um ciclo de dependências.');return;}syncDetailDraft(t);if(!t.dependencies.some(x=>String(x)===String(id)))t.dependencies.push(id);if(t.status==='feito'){t.status='a fazer';v3AddHistory(t,'Tarefa reaberta porque ganhou uma nova dependência.')}v3AddHistory(t,`Dependência adicionada: “${dependency.title||id}”.`);v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('definir_dependencia',t,{tarefa_que_bloqueia:id});renderTaskDetailBody(t)});
    document.querySelectorAll('[data-unlink-dep]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();syncDetailDraft(t);const id=b.dataset.unlinkDep,dependency=v3Task(id);t.dependencies=t.dependencies.filter(x=>String(x)!==String(id));v3AddHistory(t,`Dependência removida: “${dependency?.title||id}”.`);v3Persist(false);window.AllianceOSOps?.recordTaskAction?.('remover_dependencia',t,{tarefa_que_bloqueia:id});renderTaskDetailBody(t)}));
    document.getElementById('createPreviousTaskBtn')?.addEventListener('click',()=>{syncDetailDraft(t);v3Persist(false);closeTaskDetail();openNewTask('a fazer',{parentTaskId:t.id,blocksTaskId:t.id,brand:t.brand,campaignId:t.campaignId,project:t.project})});
    document.querySelectorAll('[data-flow-open]').forEach(el=>el.addEventListener('click',e=>{if(e.target.closest('[data-unlink-dep]'))return;syncDetailDraft(t);v3Persist(false);openTaskDetail(el.dataset.flowOpen)}));
    document.getElementById('v3CompleteTaskBtn')?.addEventListener('click',()=>{syncDetailDraft(t);if(t.status==='feito')v3Complete(t,false);else if(v3Complete(t,true))closeTaskDetail()});
  };

  saveCurrentTask = function(){
    const t=v3Task(taskState.selected);if(!t)return;
    const before=structuredClone(t),oldStatus=t.status,oldBlocked=t.blockedReason,wanted=document.getElementById('detailStatus')?.value||t.status;
    const dueInput=document.getElementById('detailDue')?.value||'',proposedDue=v3FromLocalInput(dueInput);
    if(proposedDue&&proposedDue!==t.dueAt&&new Date(proposedDue).getTime()<Date.now()&&!window.confirm('O prazo informado está no passado. Deseja salvar mesmo assim?')){showToast('Prazo não alterado.');return;}
    const proposedTitle=document.getElementById('taskTitleInput').value.trim()||t.title;if(!v3ValidateTaskName(proposedTitle,t.id,t.brand))return;
    syncDetailDraft(t);t.title=proposedTitle;
    if(wanted==='bloqueado'&&!String(t.blockedReason||'').trim()){Object.assign(t,before);showToast('Informe o motivo do bloqueio.');renderTaskDetailBody(t);return;}
    if(wanted==='feito'&&oldStatus!=='feito'){const problem=v3CompletionProblem(t);if(problem){t.status=oldStatus;showToast(problem+' Use o botão “Concluir tarefa” para a opção de concluir subtarefas junto.');renderTaskDetailBody(t);return;}}
    t.status=wanted;
    if(!t.parentTaskId&&(String(before.listId||'')!==String(t.listId||'')||String(before.campaignId||'')!==String(t.campaignId||'')||String(before.project||'')!==String(t.project||''))){
      for(const child of v3Descendants(t)){const cb=structuredClone(child);child.brand=t.brand;child.project=t.project;child.listId=t.listId;child.campaignId=t.campaignId;v3RecordFieldChanges(child,cb);}
    }
    if(oldStatus==='bloqueado'&&t.status!=='bloqueado')t.blockedReason=null;
    if(oldStatus!==t.status&&t.status==='feito'){const completedAt=t.completedAt||v3NowIso();t.completedAt=completedAt;for(const x of v3Dependents(t))v3HistoryOnce(x,'dependency-release:'+String(t.id)+':'+completedAt,'Dependência concluída: “'+t.title+'”. Esta tarefa está liberada para execução.');const recurring=v3GenerateNextOccurrence(t);if(recurring)v3HistoryOnce(t,'recurrence-created:'+String(recurring.id),'Próxima ocorrência recorrente criada para '+v3DueLabel(recurring)+'.');}
    v3RecordFieldChanges(t,before);
    v3Persist(true);window.AllianceOSOps?.recordTaskAction?.('atualizar_tarefa',t,{status:t.status,prazo:t.dueAt||t.due,confirmar_prazo_passado:!!(t.dueAt&&new Date(t.dueAt).getTime()<Date.now())});showToast('Tarefa salva');closeTaskDetail();
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
    const newTitle=document.getElementById('newTitle');if(newTitle)newTitle.maxLength=150;
    setTimeout(()=>newTitle?.focus(),20);
  };
  closeNewTask = function(){document.getElementById('newTaskModal').classList.remove('open');document.getElementById('newTaskForm').reset();v3NewPreset={};};

  createTask = function(e){
    e.preventDefault();
    const title=document.getElementById('newTitle').value.trim();if(!title)return;
    const brand=v3NewPreset.brand||v3ActiveBrand()||document.getElementById('newBrand')?.value||v3Brands()[0];
    if(!v3ValidateTaskName(title,null,brand))return;
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
    if(dueAt&&new Date(dueAt).getTime()<Date.now()&&!window.confirm('O prazo informado está no passado. Deseja criar a tarefa mesmo assim?')){showToast('Criação cancelada para revisar o prazo.');return;}
    const selectedAssignee=document.getElementById('newAssignee').value||'';
    const selectedMember=(window.AllianceOSDirectory?.members||[]).find(m=>m.tipo==='usuario'&&m.atribuivel!==false&&m.nome===selectedAssignee);
    if(selectedAssignee&&!selectedMember){showToast('Escolha um usuário real para a atribuição.');return;}
    const id=v3Id('task');
    const t=v3NormalizeTask({
      id,title,status,blockedReason:status==='bloqueado'?blockedReason:null,assignees:[selectedAssignee].filter(Boolean),assigneeIds:selectedMember?[selectedMember.id]:[],
      due:dueAt?String(dueAt).slice(0,10):null,dueAt,start:document.getElementById('newStart').value||null,
      brand,project:campaign?.name||v3NewPreset.project||'Operação',listId:campaign?.listId||null,campaignId:campaign?._structured?(campaign.campaignId||null):(campaign?.id||v3NewPreset.campaignId||null),
      priority:v3PriorityCanon(document.getElementById('newPriority').value),description:document.getElementById('newDescription').value.trim(),
      checklist:conferenceChecklist,conferenceRequired,subtasks:[],attachments:[],comments:[],history:[{at:v3NowIso(),text:`Tarefa criada via interface por ${v3CurrentNames()[0]||user.firstName||'Equipe'}.`},...(conferenceRequired?[{at:v3NowIso(),text:`Lista de conferência obrigatória criada com ${conferenceChecklist.length} item(ns).`}]:[])],
      recurrence:'none',recurrenceRule:{tipo:'nenhuma',dias_semana:[]},tags:[],source:'interface',dependencies:dependencyId?[dependencyId]:[],parentTaskId:v3NewPreset.parentTaskId||null,deliveryRequired:!!document.getElementById('newDeliveryRequired')?.checked,archivedAt:null
    });
    v3ApplyRecurrence(t,recurrenceTipo,recurrenceDays);
    const parent=t.parentTaskId?v3Task(t.parentTaskId):null;
    if(parent&&(parent.brand!==t.brand||String(parent.listId||'')!==String(t.listId||'')||String(parent.campaignId||'')!==String(t.campaignId||''))){showToast('Subtarefa precisa usar a mesma lista, marca e campanha da tarefa mãe.');return;}
    const dep=dependencyId?v3Task(dependencyId):null;if(dep&&dep.brand!==t.brand){showToast('Dependência entre marcas diferentes não é permitida.');return;}
    taskData.unshift(t);
    const warnings=v3DeadlineWarnings(t);if(warnings.length)showToast('⚠ '+warnings.join(' '));
    if(v3NewPreset.blocksTaskId){
      const parent=v3Task(v3NewPreset.blocksTaskId);
      if(parent){v3NormalizeTask(parent);if(!parent.dependencies.some(x=>String(x)===String(t.id)))parent.dependencies.push(t.id);v3AddHistory(parent,`Nova etapa anterior criada: “${t.title}”.`);if(parent.status==='feito')parent.status='a fazer';}
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
  const v13Views=document.querySelector('.cu-views');
  if(v13Views&&!v13Views.querySelector('[data-view="people-campaign"]')){
    const weekBtn=v13Views.querySelector('[data-view="week"]');
    const b=document.createElement('button');
    b.className='cu-view';
    b.type='button';
    b.dataset.view='people-campaign';
    b.textContent='Pessoa + campanha';
    if(weekBtn)v13Views.insertBefore(b,weekBtn);else v13Views.appendChild(b);
  }
  v3RebuildNewTaskForm();
  v3MigrateLegacySubtasks();
}

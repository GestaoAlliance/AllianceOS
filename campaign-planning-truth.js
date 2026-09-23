(()=>{
'use strict';

const CAMP_KEY='central.campaigns.vitor-gutierrez';
const TASK_KEY='central.tasks.vitor-gutierrez';
const DAY=86400000;
let scheduled=0;
let listSignature='';
let planSignature='';
let summarySignature='';
let calendarSignature='';

const esc=v=>String(v??'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const read=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const dateOnly=v=>{
  if(!v)return null;
  const s=String(v);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    const [y,m,d]=s.split('-').map(Number);
    return new Date(y,m-1,d);
  }
  const x=new Date(s);
  if(Number.isNaN(x.getTime()))return null;
  return new Date(x.getFullYear(),x.getMonth(),x.getDate());
};
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const dateBR=v=>{const d=dateOnly(v);return d?String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'):'—'};
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const monthName=d=>d.toLocaleDateString('pt-BR',{month:'long'}).replace(/^./,x=>x.toUpperCase());
const statusNorm=s=>norm(s).replace(/\s+/g,' ');
const statusLabel=s=>{
  const n=statusNorm(s);
  if(n==='em execucao'||n==='fazendo'||n==='em andamento')return'Em execução';
  if(n==='em preparacao'||n==='preparacao')return'Em preparação';
  if(n==='planejamento')return'Planejamento';
  if(n==='encerrada'||n==='encerrado'||n==='concluida'||n==='concluido'||n==='feito')return'Encerrada';
  return String(s||'Sem status');
};
const statusClass=s=>{
  const n=statusNorm(s);
  if(n.includes('exec')||n.includes('andamento'))return'running';
  if(n.includes('planej'))return'planning';
  if(n.includes('prepar'))return'review';
  if(n.includes('encerr')||n.includes('concl')||n==='feito')return'done';
  return'review';
};
const isDone=t=>{
  const n=statusNorm(t?.status);
  return n==='feito'||n==='concluida'||n==='concluido'||n==='finalizada'||n==='finalizado'||n==='done';
};
const isPerpetual=c=>norm(c?.type).includes('perpet');
const typeLabel=c=>isPerpetual(c)?'Perpétua':'Pontual';
const brand=()=>{
  const v=String(document.getElementById('brandSelect')?.value||'').trim();
  return !v||norm(v)==='todas as marcas'?'':v;
};
const monthBounds=()=>{
  const n=today();
  return {
    start:new Date(n.getFullYear(),n.getMonth(),1),
    end:new Date(n.getFullYear(),n.getMonth()+1,0),
    now:n
  };
};
const overlapsMonth=c=>{
  const b=monthBounds();
  const s=dateOnly(c.startAt||c.start);
  const e=dateOnly(c.endAt||c.end)||s;
  return !!s&&!!e&&s<=b.end&&e>=b.start;
};
const currentCampaigns=()=>{
  const b=brand();
  const q=String(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();
  const st=String(document.getElementById('campaignStatusFilter')?.value||'').trim();
  return read(CAMP_KEY).filter(c=>{
    if(c?.archivedAt)return false;
    if(!overlapsMonth(c))return false;
    if(b&&c.brand&&c.brand!==b)return false;
    if(st&&statusNorm(c.status)!==statusNorm(st))return false;
    if(q){
      const hay=[c.name,c.type,c.owner,c.offer,...(Array.isArray(c.channels)?c.channels:[])].join(' ').toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
};
const currentTasks=()=>{
  const b=brand();
  return read(TASK_KEY).filter(t=>!t?.archivedAt&&(!b||!t.brand||t.brand===b));
};
const sourceGoals=c=>{
  const rows=Array.isArray(c?.tapStructured?.metas_por_fonte)?c.tapStructured.metas_por_fonte:[];
  return rows.map(x=>({
    fonte:String(x?.fonte||'Canal'),
    meta:Number(x?.meta_faturamento||0),
    investimento:Number(x?.investimento||0),
    roas:x?.roas_alvo,
    responsavel:String(x?.responsavel||'')
  }));
};
const campaignGoal=c=>{
  const rows=sourceGoals(c);
  const total=rows.reduce((s,x)=>s+x.meta,0);
  return total>0?total:Number(c?.goal||0);
};
const campaignBudget=c=>{
  const rows=sourceGoals(c);
  const total=rows.reduce((s,x)=>s+x.investimento,0);
  return total>0?total:Number(c?.budget||0);
};
const projectNorm=v=>norm(v).replace(/campanha\s+/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const tasksFor=(c,tasks=currentTasks())=>{
  const id=String(c?.id||'');
  const name=projectNorm(c?.name);
  return tasks.filter(t=>{
    if(id&&String(t?.campaignId||'')===id)return true;
    const p=projectNorm(t?.project);
    if(!p||!name)return false;
    return p===name||p.startsWith(name)||name.startsWith(p);
  });
};
const progressFor=(c,tasks=currentTasks())=>{
  const ts=tasksFor(c,tasks);
  if(ts.length)return Math.round(ts.filter(isDone).length/ts.length*100);
  return Number.isFinite(+c?.progress)?Math.max(0,Math.min(100,+c.progress)):0;
};
const initials=v=>String(v||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const duration=c=>{
  const s=dateOnly(c.startAt||c.start),e=dateOnly(c.endAt||c.end);
  return s&&e?Math.max(1,Math.round((e-s)/DAY)+1):0;
};

const sameCollection=(a,b)=>{
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
  for(let i=0;i<a.length;i++){
    if(String(a[i]?.id||'')!==String(b[i]?.id||''))return false;
    if(String(a[i]?.updatedAt||a[i]?.updated_at||'')!==String(b[i]?.updatedAt||b[i]?.updated_at||''))return false;
  }
  return true;
};

function syncLegacyMemory(){
  const canonicalCampaigns=read(CAMP_KEY);
  const liveCampaigns=window.__centralGetCampaigns?.();
  if(Array.isArray(liveCampaigns)&&!sameCollection(liveCampaigns,canonicalCampaigns)){
    liveCampaigns.length=0;
    liveCampaigns.push(...canonicalCampaigns);
  }

  const canonicalTasks=read(TASK_KEY);
  const liveTasks=window.__centralGetTasks?.();
  if(Array.isArray(liveTasks)&&!sameCollection(liveTasks,canonicalTasks)){
    liveTasks.length=0;
    liveTasks.push(...canonicalTasks);
  }
}

function correctLegacyGoalWarning(channelGoal){
  const walker=document.createTreeWalker(document.body||document.documentElement,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    const text=String(node.nodeValue||'');
    if(!/campanhas\s+somam/i.test(text)||!/meta\s+ativa/i.test(text))continue;
    const holder=node.parentElement;
    if(!holder)continue;
    const targetMatch=text.match(/meta ativa da marca no mês\s*\(R\$\s*([\d.]+(?:,\d+)?)\)/i);
    if(!targetMatch){
      holder.remove();
      continue;
    }
    const target=Number(targetMatch[1].replace(/\./g,'').replace(',','.'))||0;
    if(!target||Math.abs(channelGoal-target)<1){
      holder.remove();
      continue;
    }
    holder.textContent='⚠ As metas dos canais perpétuos somam '+money(channelGoal)+' e não batem com a meta ativa da marca no mês ('+money(target)+').';
    holder.dataset.allianceGoalTruth='1';
  }
}

function renderRow(c,tasks){
  const pct=progressFor(c,tasks);
  const owner=String(c.owner||c.responsavel||'Sem responsável');
  return '<article class="camp-row alliance-live-campaign-row" data-live-campaign="'+esc(c.name||c.id)+'" style="--cc:'+
    esc(c.color||'#121415')+'">'+
    '<div class="camp-name"><i class="camp-color"></i><div class="camp-name-text"><b>'+esc(c.name||'Campanha')+'</b>'+
    '<small>'+esc(typeLabel(c))+' · '+esc(c.offer||c.objective||'Sem descrição comercial')+'</small></div></div>'+
    '<span class="camp-chip '+statusClass(c.status)+'">'+esc(statusLabel(c.status))+'</span>'+
    '<div><span class="camp-meta-val">'+esc(dateBR(c.startAt||c.start))+' — '+esc(dateBR(c.endAt||c.end))+'</span>'+
    '<span class="camp-meta-sub">'+duration(c)+' dia'+(duration(c)===1?'':'s')+'</span></div>'+
    '<div class="camp-owner"><i class="miniav">'+esc(initials(owner))+'</i><span>'+esc(owner.split(' ')[0])+'</span></div>'+
    '<div><span class="camp-meta-val">'+money(campaignGoal(c))+'</span><span class="camp-meta-sub">meta da ação</span></div>'+
    '<div><span class="camp-meta-val">'+money(campaignBudget(c))+'</span><span class="camp-meta-sub">verba</span></div>'+
    '<div class="camp-progress"><div class="camp-progress-line"><i style="width:'+pct+'%"></i></div><span>'+pct+'%</span></div>'+
    '<button class="camp-more" type="button" aria-label="Abrir campanha">›</button></article>';
}

function campaignList(){
  const view=document.getElementById('campaignsView');
  const root=document.getElementById('campaignList');
  if(!view||!root||!view.classList.contains('active'))return;
  if(document.getElementById('campaignWorkspace')?.classList.contains('active'))return;

  const data=currentCampaigns();
  const tasks=currentTasks();
  const perpetual=data.filter(isPerpetual);
  const punctual=data.filter(c=>!isPerpetual(c));
  const channelGoal=perpetual.reduce((s,c)=>s+campaignGoal(c),0);
  const channelBudget=perpetual.reduce((s,c)=>s+campaignBudget(c),0);
  const active=data.filter(c=>statusNorm(c.status).includes('exec')).length;
  const avg=data.length?Math.round(data.reduce((s,c)=>s+progressFor(c,tasks),0)/data.length):0;
  const kpiHtml=
    '<div class="camp-kpi"><small>Campanhas no mês</small><b>'+data.length+'</b><span>'+
      perpetual.length+' perpétua'+(perpetual.length===1?'':'s')+' · '+punctual.length+' pontual'+(punctual.length===1?'':'is')+'</span></div>'+
    '<div class="camp-kpi"><small>Meta dos canais</small><b>'+money(channelGoal)+'</b><span>somente perpétuas · sem duplicar ações pontuais</span></div>'+
    '<div class="camp-kpi"><small>Verba dos canais</small><b>'+money(channelBudget)+'</b><span>'+
      (channelBudget&&channelGoal?'ROAS alvo '+(channelGoal/channelBudget).toFixed(1).replace('.',','):'sem verba atribuída')+'</span></div>'+
    '<div class="camp-kpi"><small>Execução operacional</small><b>'+avg+'%</b><span>'+active+' campanha'+(active===1?'':'s')+' em execução</span></div>';

  const kpis=document.getElementById('campaignKpis');
  if(kpis&&kpis.innerHTML!==kpiHtml)kpis.innerHTML=kpiHtml;

  const summary=document.getElementById('campaignSummary');
  const summaryText=data.length+' campanhas · '+perpetual.length+' perpétuas · '+punctual.length+' pontuais';
  if(summary&&summary.textContent!==summaryText)summary.textContent=summaryText;

  const sub=document.getElementById('campaignListSub');
  const subText=monthName(today())+' · '+(brand()||'todas as marcas');
  if(sub&&sub.textContent!==subText)sub.textContent=subText;

  const head='<div class="camp-list-head"><span>Campanha</span><span>Status</span><span>Período</span><span>Responsável</span><span>Meta</span><span>Verba</span><span>Execução</span><span></span></div>';
  const group=(title,desc,items,kind)=>
    '<section class="alliance-campaign-group '+kind+'"><div class="alliance-campaign-group-head"><div><strong>'+title+
    '</strong><span>'+desc+'</span></div><em>'+items.length+'</em></div>'+
    (items.length?items.map(c=>renderRow(c,tasks)).join(''):'<div class="camp-empty">Nenhuma campanha neste grupo.</div>')+'</section>';

  const desired=head+
    group('Perpétuas','Canais e frentes que carregam a meta mensal.',perpetual,'perpetual')+
    group('Campanhas','Ações pontuais com começo e fim: Dia D, semana temática, lançamento e similares.',punctual,'punctual');

  if(root.innerHTML!==desired)root.innerHTML=desired;
  listSignature=JSON.stringify([data.length,perpetual.length,punctual.length,channelGoal,channelBudget]);
}

function mondayOf(d){
  const x=new Date(d);
  const wd=x.getDay();
  x.setDate(x.getDate()+(wd===0?-6:1-wd));
  x.setHours(0,0,0,0);
  return x;
}

function weekInfo(){
  const n=today(),m=mondayOf(n),s=new Date(m);s.setDate(m.getDate()+6);
  return {now:n,monday:m,sunday:s};
}

function planContext(){
  const root=document.getElementById('planContext');
  if(!root)return;
  const data=currentCampaigns(),tasks=currentTasks();
  const perpetual=data.filter(isPerpetual),punctual=data.filter(c=>!isPerpetual(c));
  const goal=perpetual.reduce((s,c)=>s+campaignGoal(c),0);
  const open=tasks.filter(t=>!isDone(t)).length;
  const done=tasks.filter(isDone).length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;
  const w=weekInfo();
  const sig=[brand(),data.length,tasks.length,goal,open,pct,iso(w.monday),iso(w.sunday)].join('|');
  const desired=
    '<div class="plan-kpi"><small>Campanhas no mês</small><b>'+data.length+'</b><span>'+perpetual.length+' perpétuas · '+punctual.length+' pontuais</span></div>'+
    '<div class="plan-kpi"><small>Meta dos canais</small><b>'+(goal?money(goal):'—')+'</b><span>somente as frentes perpétuas</span></div>'+
    '<div class="plan-kpi"><small>Tarefas abertas</small><b>'+open+'</b><span>'+pct+'% concluídas</span></div>'+
    '<div class="plan-kpi"><small>Semana atual</small><b>'+String(w.monday.getDate()).padStart(2,'0')+' — '+String(w.sunday.getDate()).padStart(2,'0')+
    '</b><span>'+monthName(w.sunday).toLowerCase()+' de '+w.sunday.getFullYear()+'</span></div>';
  if(root.innerHTML!==desired)root.innerHTML=desired;
  planSignature=sig;
  correctLegacyGoalWarning(goal);
}

function planningWeek(){
  const root=document.getElementById('planWeekGrid');
  if(!root)return;
  const data=currentCampaigns(),tasks=currentTasks(),w=weekInfo();
  const sig=[iso(w.monday),data.map(c=>[c.id,c.status,c.start,c.end]),tasks.map(t=>[t.id,t.due,t.status])].join('|');
  const names=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const html=[];
  for(let i=0;i<7;i++){
    const d=new Date(w.monday);d.setDate(w.monday.getDate()+i);
    const key=iso(d);
    const active=data.filter(c=>{
      const s=dateOnly(c.startAt||c.start),e=dateOnly(c.endAt||c.end)||s;
      return s&&e&&s<=d&&e>=d;
    });
    const due=tasks.filter(t=>iso(dateOnly(t.dueAt||t.due)||new Date(0))===key);
    html.push('<section class="plan-day '+(key===iso(w.now)?'today':'')+'"><div class="plan-day-head"><span>'+names[d.getDay()]+'</span><b>'+
      String(d.getDate()).padStart(2,'0')+'</b></div><div class="plan-day-body">'+
      '<div class="day-section"><div class="day-section-title">Campanhas</div>'+
      (active.length?active.map(c=>'<article class="week-campaign-card" data-live-campaign="'+esc(c.name||c.id)+'" style="--pc:'+
        esc(c.color||'#121415')+'"><b>'+esc(c.name)+'</b><span>'+esc(typeLabel(c))+' · '+esc(statusLabel(c.status))+'</span></article>').join('')
        :'<div class="week-empty">Nenhuma campanha ativa</div>')+'</div>'+
      '<div class="day-section"><div class="day-section-title">Tarefas com prazo</div>'+
      (due.length?due.slice(0,12).map(t=>'<div class="week-task-row"><span>✓</span><b>'+esc(t.title||'Tarefa')+'</b></div>').join('')
        :'<div class="week-empty">Sem tarefas com prazo</div>')+'</div></div></section>');
  }
  const desired=html.join('');
  if(root.innerHTML!==desired)root.innerHTML=desired;
  root.dataset.allianceWeekSig=sig;
}

function campaignCalendar(){
  const root=document.getElementById('campaignCalendar');
  if(!root)return;
  const section=document.getElementById('campaignCalendarSection');
  if(section&&getComputedStyle(section).display==='none')return;
  const data=currentCampaigns(),w=weekInfo();
  const sig=[iso(w.monday),data.map(c=>[c.id,c.start,c.end,c.status])].join('|');
  const names=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const html=[];
  for(let i=0;i<7;i++){
    const d=new Date(w.monday);d.setDate(w.monday.getDate()+i);
    const active=data.filter(c=>{
      const s=dateOnly(c.startAt||c.start),e=dateOnly(c.endAt||c.end)||s;
      return s&&e&&s<=d&&e>=d;
    });
    html.push('<section class="camp-day '+(iso(d)===iso(w.now)?'today':'')+'"><div class="camp-day-head"><b>'+names[d.getDay()]+' · '+
      String(d.getDate()).padStart(2,'0')+'</b><span>'+(iso(d)===iso(w.now)?'Hoje':monthName(d))+'</span></div>'+
      (active.length?active.map(c=>'<article class="camp-cal-item" data-live-campaign="'+esc(c.name||c.id)+'" style="--cc:'+
        esc(c.color||'#121415')+'"><b>'+esc(c.name)+'</b><span>'+esc(typeLabel(c))+' · '+esc(statusLabel(c.status))+'</span></article>').join('')
        :'<div class="alliance-calendar-empty">Sem campanha ativa</div>')+'</section>');
  }
  const desired=html.join('');
  if(root.innerHTML!==desired)root.innerHTML=desired;
  calendarSignature=sig;
}

function summary(){
  const ws=document.getElementById('campaignWorkspace');
  const pane=ws?.querySelector('[data-cw-pane="summary"]');
  const title=ws?.querySelector('.cw-title h2')?.textContent?.trim();
  if(!ws||!pane||!title)return;
  const c=read(CAMP_KEY).find(x=>norm(x.name)===norm(title));
  if(!c)return;
  const tasks=tasksFor(c,read(TASK_KEY).filter(t=>!t?.archivedAt));
  const done=tasks.filter(isDone).length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;
  const goals=sourceGoals(c);
  const goal=campaignGoal(c),budget=campaignBudget(c);
  const event=c.tapStructured?.sobre_evento||{};
  const offer=c.tapStructured?.oferta||{};
  const team=Array.isArray(c.tapStructured?.equipe)?c.tapStructured.equipe:[];
  const phases=Array.isArray(c.tapStructured?.fases)?c.tapStructured.fases.filter(x=>x?.tem!==false):[];
  const channels=[...new Set([...(Array.isArray(c.channels)?c.channels:[]),...(Array.isArray(c.tapStructured?.cronograma)?c.tapStructured.cronograma.map(x=>x?.canal).filter(Boolean):[])])];
  const context=String(c.objective||event.formato||event.observacoes||'Campanha sem contexto operacional preenchido.');
  const observation=String(event.observacoes||'').trim();
  const benefits=[
    c.offer||event.cupom_automatico||'',
    offer.frete?('Frete: '+offer.frete):'',
    offer.brinde?('Brinde: '+offer.brinde):'',
    ...(Array.isArray(c.benefits)?c.benefits:[])
  ].filter(Boolean);
  const sig=JSON.stringify([c.id,c.updatedAt,c.status,c.goal,c.budget,tasks.map(t=>[t.id,t.status]),goals,phases]);
  const alreadyTruth=pane.dataset.allianceSummary==='1'&&pane.querySelector('.alliance-summary-grid');
  if(sig===summarySignature&&alreadyTruth)return;
  summarySignature=sig;
  pane.dataset.allianceSummary='1';

  const metaRows=goals.length?goals.map(x=>
    '<div class="alliance-meta-row"><div><b>'+esc(x.fonte)+'</b><span>'+esc(x.responsavel||'Sem responsável')+'</span></div>'+
    '<strong>'+money(x.meta)+'</strong><em>'+money(x.investimento)+'</em></div>'
  ).join(''):'<div class="alliance-summary-empty">Esta campanha não tem rateio por fonte preenchido.</div>';

  const phaseRows=phases.length?phases.map(p=>{
    const d=dateOnly(p.data);
    const state=d?(d<today()?'done':iso(d)===iso(today())?'today':'next'):'next';
    return '<div class="alliance-phase '+state+'"><i></i><div><b>'+esc(p.nome||'Etapa')+'</b><span>'+esc(p.data_legada||dateBR(p.data))+'</span></div></div>';
  }).join(''):'<div class="alliance-summary-empty">Nenhuma fase estruturada ainda.</div>';

  const teamRows=team.length?team.map(x=>
    '<div class="alliance-team-row"><b>'+esc(x.quem||'Responsável')+'</b><span>'+esc(x.responsabilidade||'')+'</span></div>'
  ).join(''):'<div class="alliance-summary-empty">Equipe não detalhada nesta campanha.</div>';

  pane.innerHTML=
    '<div class="alliance-summary-grid"><main>'+
      '<section class="cw-card alliance-summary-hero"><div class="cw-card-head"><strong>O que é esta campanha</strong><span>'+esc(typeLabel(c))+'</span></div>'+
        '<div class="cw-card-body"><p class="alliance-summary-lead">'+esc(context)+'</p>'+
        (observation&&observation!==context?'<details class="alliance-context-details"><summary>Contexto e decisões</summary><p>'+esc(observation)+'</p></details>':'')+
        '<div class="alliance-summary-tags">'+channels.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div></section>'+
      '<section class="cw-card"><div class="cw-card-head"><strong>Oferta e mecânica</strong><span>o que o público recebe</span></div>'+
        '<div class="cw-card-body">'+(benefits.length?benefits.map((x,i)=>'<div class="alliance-offer-line '+(i===0?'primary':'')+'">'+esc(x)+'</div>').join('')
          :'<div class="alliance-summary-empty">Oferta ainda não detalhada.</div>')+'</div></section>'+
      '<section class="cw-card"><div class="cw-card-head"><strong>Fases e momentos críticos</strong><span>'+phases.length+' etapa'+(phases.length===1?'':'s')+'</span></div>'+
        '<div class="cw-card-body"><div class="alliance-phases">'+phaseRows+'</div></div></section>'+
      '<section class="cw-card"><div class="cw-card-head"><strong>Equipe e responsabilidades</strong><span>quem faz o quê</span></div>'+
        '<div class="cw-card-body"><div class="alliance-team-list">'+teamRows+'</div></div></section>'+
    '</main><aside>'+
      '<section class="cw-card"><div class="cw-card-head"><strong>Números da campanha</strong><span>'+pct+'% das tarefas concluídas</span></div>'+
        '<div class="cw-card-body"><div class="cw-properties">'+
          '<div class="cw-prop"><small>Meta</small><b>'+money(goal)+'</b></div>'+
          '<div class="cw-prop"><small>Verba</small><b>'+money(budget)+'</b></div>'+
          '<div class="cw-prop"><small>ROAS alvo</small><b>'+(budget?(goal/budget).toFixed(1).replace('.',','):'—')+'</b></div>'+
          '<div class="cw-prop"><small>Tarefas</small><b>'+done+'/'+tasks.length+'</b></div>'+
        '</div><div class="cw-goalbar"><i style="width:'+pct+'%;background:#121415"></i></div>'+
        '<div class="cw-small" style="margin-top:5px">Conclusão operacional · '+pct+'%</div></div></section>'+
      '<section class="cw-card"><div class="cw-card-head"><strong>Propriedades</strong></div><div class="cw-card-body"><div class="cw-properties">'+
        '<div class="cw-prop"><small>Tipo</small><b>'+esc(typeLabel(c))+'</b></div>'+
        '<div class="cw-prop"><small>Status</small><b>'+esc(statusLabel(c.status))+'</b></div>'+
        '<div class="cw-prop"><small>Marca</small><b>'+esc(c.brand||'—')+'</b></div>'+
        '<div class="cw-prop"><small>Responsável</small><b>'+esc(c.owner||'Sem responsável')+'</b></div>'+
        '<div class="cw-prop alliance-prop-wide"><small>Período</small><b>'+esc(dateBR(c.startAt||c.start))+' — '+esc(dateBR(c.endAt||c.end))+'</b></div>'+
      '</div></div></section>'+
      '<section class="cw-card alliance-meta-card"><div class="cw-card-head"><strong>Metas por canal</strong><span>meta · verba</span></div>'+
        '<div class="cw-card-body"><div class="alliance-meta-head"><span>Fonte</span><span>Meta</span><span>Verba</span></div>'+metaRows+
        '<div class="alliance-meta-total"><span>Total</span><strong>'+money(goal)+'</strong><em>'+money(budget)+'</em></div></div></section>'+
    '</aside></div>';
}

function bindDelegates(){
  if(document.documentElement.dataset.allianceCampaignDelegates==='1')return;
  document.documentElement.dataset.allianceCampaignDelegates='1';

  /* O botão "Campanhas" dentro do Planejamento pode ser recriado por
     outras camadas da interface. Delegação em capture garante que ele
     sempre abra a página canônica de Campanhas, sem depender do listener
     original do componente. */
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('.plan-tab');
    if(!tab)return;
    const label=norm(tab.textContent||'');
    if(tab.dataset.planTab==='campaigns'||label==='campanhas'){
      e.preventDefault();
      e.stopImmediatePropagation();

      /* A navegação unificada também é dona do estado visual dos quatro
         botões. Ir direto para __centralShowCampaigns abria a tela correta,
         mas deixava selecionada a aba anterior (ex.: Mês). */
      if(typeof window.AllianceOSStrategy?.campanhas==='function'){
        window.AllianceOSStrategy.campanhas();
      }else if(typeof window.__centralShowCampaigns==='function'){
        window.__centralShowCampaigns();
        document.querySelectorAll('#campaignsView .ref-strategy-tabs [data-strategy-tab]')
          .forEach(b=>b.classList.toggle('active',b.dataset.strategyTab==='campaigns'));
      }else{
        document.getElementById('campaignsNav')?.click();
      }
    }
  },true);

  document.addEventListener('click',e=>{
    const item=e.target.closest?.('[data-live-campaign]');
    if(!item)return;
    e.preventDefault();
    e.stopPropagation();
    window.openCampaignWorkspaceByName?.(item.dataset.liveCampaign);
  },true);
}

function apply(){
  syncLegacyMemory();
  bindDelegates();
  campaignList();
  campaignCalendar();
  planContext();
  planningWeek();
  summary();
}

function schedule(){
  clearTimeout(scheduled);
  scheduled=setTimeout(apply,35);
}

const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('input',e=>{if(e.target?.id==='campaignSearch')schedule()});
document.addEventListener('change',e=>{if(['campaignStatusFilter','brandSelect'].includes(e.target?.id))schedule()});
window.addEventListener('pageshow',schedule);
window.addEventListener('focus',schedule);
setInterval(schedule,1800);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
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
const validMonthRef=v=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(v||''));
const monthRefFromDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const selectedMonthRef=()=>{
  const live=String(window.AlliancePlanningMonthRef||'');
  if(validMonthRef(live))return live;
  const picker=String(document.querySelector('[data-alliance-planning-month]')?.value||'');
  if(validMonthRef(picker))return picker;
  let saved='',persistent='';
  try{saved=sessionStorage.getItem('allianceos.planning.monthRef')||''}catch{}
  try{persistent=localStorage.getItem('allianceos.planning.monthRef')||''}catch{}
  if(validMonthRef(saved))return saved;
  if(validMonthRef(persistent))return persistent;
  return monthRefFromDate(today());
};
const monthName=d=>d.toLocaleDateString('pt-BR',{month:'long'}).replace(/^./,x=>x.toUpperCase());
const selectedMonthLabel=()=>{
  const [y,m]=selectedMonthRef().split('-').map(Number);
  return monthName(new Date(y,m-1,1))+' '+y;
};
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
  const selected=String(document.getElementById('brandSelect')?.value||'').trim();
  if(selected&&norm(selected)!=='todas as marcas')return selected;
  const mapBrand=String(window.MapaMental?.marca?.()||'').trim();
  return mapBrand&&norm(mapBrand)!=='todas as marcas'?mapBrand:'';
};
const monthBounds=()=>{
  const ref=selectedMonthRef();
  const [y,m]=ref.split('-').map(Number);
  return {
    ref,
    start:new Date(y,m-1,1),
    end:new Date(y,m,0),
    now:today()
  };
};
const overlapsMonth=c=>{
  const b=monthBounds();
  const explicit=String(c?.monthRef||c?.month_ref||'').slice(0,7);
  if(validMonthRef(explicit))return explicit===b.ref;
  const s=dateOnly(c.startAt||c.start);
  const e=dateOnly(c.endAt||c.end)||s;
  return !!s&&!!e&&s<=b.end&&e>=b.start;
};
const selectedMapCampaignIds=()=>{
  const b=brand();
  const ref=selectedMonthRef();
  if(!b||!validMonthRef(ref))return new Set();
  const uid=window.user?.id||'vitor-gutierrez';
  const keys=[
    'central.planning.map.'+uid+'.'+b+'.'+ref,
    'central.planning.map.vitor-gutierrez.'+b+'.'+ref,
    'central.planning.map.shared.'+b+'.'+ref
  ];
  for(const key of keys){
    try{
      const map=JSON.parse(localStorage.getItem(key)||'null');
      const ids=(Array.isArray(map?.nos)?map.nos:[])
        .map(n=>String(n?.campId||n?.campaignId||'').trim())
        .filter(Boolean);
      if(ids.length)return new Set(ids);
    }catch{}
  }
  return new Set();
};
const currentCampaigns=()=>{
  const b=brand();
  const ref=selectedMonthRef();
  const q=String(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();
  const st=String(document.getElementById('campaignStatusFilter')?.value||'').trim();
  const mapIds=selectedMapCampaignIds();
  return read(CAMP_KEY).filter(c=>{
    if(c?.archivedAt)return false;
    if(b&&c.brand&&c.brand!==b)return false;

    // Month membership is a UNION of the canonical monthRef, the planning-map
    // link and the date overlap. The map must never hide a valid campaign that
    // already belongs to the selected month in the canonical campaign store.
    const explicit=String(c?.monthRef||c?.month_ref||'').slice(0,7);
    const byRef=validMonthRef(explicit)&&explicit===ref;
    const byMap=mapIds.has(String(c?.id||''));
    const byDate=overlapsMonth(c);
    if(!(byRef||byMap||byDate))return false;

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
  const ref=selectedMonthRef();
  const campaigns=currentCampaigns();
  const ids=new Set(campaigns.map(c=>String(c?.id||'')).filter(Boolean));
  const names=new Set(campaigns.map(c=>projectNorm(c?.name)).filter(Boolean));
  return read(TASK_KEY).filter(t=>{
    if(t?.archivedAt)return false;
    if(b&&t.brand&&t.brand!==b)return false;

    // Month membership has to be explicit. A task belongs to the selected
    // month when its own monthRef says so, its due date falls in the month,
    // or it is linked to a campaign that belongs to that month.
    const explicit=String(t?.monthRef||t?.month_ref||'').slice(0,7);
    if(validMonthRef(explicit))return explicit===ref;

    const due=dateOnly(t?.dueAt||t?.due||t?.deadline);
    if(due)return monthRefFromDate(due)===ref;

    if(t?.campaignId&&ids.has(String(t.campaignId)))return true;

    // Legacy tasks without campaignId may still carry the exact campaign
    // name in project. Exact match only: prefix matching was pulling old
    // "Perpétuo"/"Dia D" tasks from other months into October.
    const p=projectNorm(t?.project);
    return !!p&&names.has(p);
  });
};
const currentPlanningMetrics=()=>{
  const m=window.AlliancePlanningMonthMetrics;
  if(!m||m.ref!==selectedMonthRef())return null;
  const b=brand();
  if(b&&m.brand&&norm(m.brand)!==norm(b))return null;
  return m;
};
const monthlyMeta=(m,level,fallback=0)=>{
  if(!m)return Number(fallback||0);
  const direct=Number(m['meta'+level]||0);
  if(direct>0)return direct;
  const overall=Number(m['overall'+level]||0);
  if(overall>0)return overall;
  const arr=Array.isArray(m.metas)?Number(m.metas[level-1]||0):0;
  if(arr>0)return arr;
  if(Number(m.active||0)===level&&Number(m.goal||0)>0)return Number(m.goal||0);
  return Number(fallback||0);
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
const sameCampaignCollection=(a,b)=>{
  if(!Array.isArray(a)||!Array.isArray(b))return false;
  try{return JSON.stringify(a)===JSON.stringify(b)}catch{return false}
};

function syncLegacyMemory(){
  const canonicalCampaigns=read(CAMP_KEY);
  const liveCampaigns=window.__centralGetCampaigns?.();
  if(Array.isArray(liveCampaigns)&&!sameCampaignCollection(liveCampaigns,canonicalCampaigns)){
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
  const fallbackGoal=perpetual.reduce((s,c)=>s+campaignGoal(c),0);
  const fallbackBudget=perpetual.reduce((s,c)=>s+campaignBudget(c),0);
  const monthly=currentPlanningMetrics();
  // A planning_month row can exist before any monthly goal/channel row has
  // actually been configured. In that transient state it reports hasPlan=true
  // with goal/budget zero. Do not let that empty shell overwrite the real
  // perpetual campaign values; otherwise the KPI flickers between the two
  // renderers and appears/disappears for the user.
  const monthlyReady=!!(monthly?.hasPlan&&(
    Number(monthly.channelCount||0)>0||
    Number(monthly.goal||0)>0||
    Number(monthly.budget||0)>0
  ));
  const meta1=monthlyReady?monthlyMeta(monthly,1,fallbackGoal):fallbackGoal;
  const meta2=monthlyReady?monthlyMeta(monthly,2,0):0;
  const meta3=monthlyReady?monthlyMeta(monthly,3,0):0;
  const channelGoal=monthlyReady?monthlyMeta(monthly,Number(monthly.active||1),fallbackGoal):fallbackGoal;
  const channelBudget=monthlyReady?Number(monthly.budget||0):fallbackBudget;
  const active=data.filter(c=>statusNorm(c.status).includes('exec')).length;
  const avg=data.length?Math.round(data.reduce((s,c)=>s+progressFor(c,tasks),0)/data.length):0;
  const metaCard=(level,value)=>'<div class="camp-kpi camp-kpi-goal '+(Number(monthly?.active||1)===level?'active-goal':'')+'"><small>Meta '+level+'</small><b>'+(value>0?money(value):'—')+'</b><span>'+(
    Number(monthly?.active||1)===level?'meta ativa do mês':'escada de meta mensal'
  )+'</span></div>';
  const kpiHtml=
    '<div class="camp-kpi"><small>Campanhas no mês</small><b>'+data.length+'</b><span>'+
      perpetual.length+' perpétua'+(perpetual.length===1?'':'s')+' · '+punctual.length+' pontual'+(punctual.length===1?'':'is')+'</span></div>'+
    metaCard(1,meta1)+metaCard(2,meta2)+metaCard(3,meta3)+
    '<div class="camp-kpi"><small>Verba dos canais</small><b>'+money(channelBudget)+'</b><span>'+
      (channelBudget&&channelGoal?'ROAS sobre meta ativa '+(channelGoal/channelBudget).toFixed(1).replace('.',','):(monthlyReady?'investimento previsto do mês':'sem verba atribuída'))+'</span></div>'+
    '<div class="camp-kpi"><small>Execução operacional</small><b>'+avg+'%</b><span>'+active+' campanha'+(active===1?'':'s')+' em execução</span></div>';

  const kpis=document.getElementById('campaignKpis');
  if(kpis&&kpis.innerHTML!==kpiHtml)kpis.innerHTML=kpiHtml;

  const summary=document.getElementById('campaignSummary');
  const summaryText=data.length+' campanhas · '+perpetual.length+' perpétuas · '+punctual.length+' pontuais';
  if(summary&&summary.textContent!==summaryText)summary.textContent=summaryText;

  const sub=document.getElementById('campaignListSub');
  const bnd=monthBounds();
  const subText=monthName(bnd.start)+' · '+(brand()||'todas as marcas');
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
  listSignature=JSON.stringify([selectedMonthRef(),data.length,perpetual.length,punctual.length,meta1,meta2,meta3,channelGoal,channelBudget,monthly?.active]);
}

function mondayOf(d){
  const x=new Date(d);
  const wd=x.getDay();
  x.setDate(x.getDate()+(wd===0?-6:1-wd));
  x.setHours(0,0,0,0);
  return x;
}

function weekInfo(){
  const real=today();
  const ref=selectedMonthRef();
  const [y,mn]=ref.split('-').map(Number);
  let anchor=real;
  if(monthRefFromDate(real)!==ref){
    anchor=new Date(y,mn-1,1);
    let firstMonday=mondayOf(anchor);
    if(firstMonday.getMonth()!==mn-1){
      firstMonday=new Date(firstMonday);
      firstMonday.setDate(firstMonday.getDate()+7);
    }
    anchor=firstMonday;
  }
  const m=mondayOf(anchor),s=new Date(m);s.setDate(m.getDate()+6);
  return {now:anchor,monday:m,sunday:s};
}

function syncMonthChrome(){
  const label=selectedMonthLabel();
  const ref=selectedMonthRef();
  const [y,m]=ref.split('-').map(Number);
  const lower=monthName(new Date(y,m-1,1)).toLowerCase();

  const planMonth=document.getElementById('planMonthLabel');
  if(planMonth&&planMonth.textContent!==label)planMonth.textContent=label;
  const campMonth=document.getElementById('campMonthBtn');
  if(campMonth&&campMonth.textContent!==label)campMonth.textContent=label;

  const planCrumb=document.querySelector('#planningView .plan-titlebar p');
  if(planCrumb){
    const parts=String(planCrumb.textContent||'').split('/').map(x=>x.trim()).filter(Boolean);
    const prefix=parts.length>1?parts.slice(0,-1).join(' / '):'AllianceOS / Estratégia';
    const next=prefix+' / '+label;
    if(planCrumb.textContent!==next)planCrumb.textContent=next;
  }

  const monthTitle=document.querySelector('#planningView [data-plan-pane="month"] .month-toolbar strong');
  if(monthTitle&&monthTitle.textContent!==label)monthTitle.textContent=label;

  const w=weekInfo();
  const weekTitle=document.querySelector('#planningView [data-plan-pane="week"] .month-toolbar strong');
  if(weekTitle){
    const next='Semana · '+String(w.monday.getDate()).padStart(2,'0')+' — '+String(w.sunday.getDate()).padStart(2,'0')+' de '+lower;
    if(weekTitle.textContent!==next)weekTitle.textContent=next;
  }
}

function planContext(){
  const root=document.getElementById('planContext');
  if(!root)return;
  const data=currentCampaigns(),tasks=currentTasks();
  const perpetual=data.filter(isPerpetual),punctual=data.filter(c=>!isPerpetual(c));
  const fallbackGoal=perpetual.reduce((s,c)=>s+campaignGoal(c),0);
  const monthly=currentPlanningMetrics();
  const monthlyReady=!!(monthly?.hasPlan&&(
    Number(monthly.channelCount||0)>0||
    Number(monthly.goal||0)>0||
    Number(monthly.budget||0)>0
  ));
  const meta1=monthlyReady?monthlyMeta(monthly,1,fallbackGoal):fallbackGoal;
  const meta2=monthlyReady?monthlyMeta(monthly,2,0):0;
  const meta3=monthlyReady?monthlyMeta(monthly,3,0):0;
  const goal=monthlyReady?monthlyMeta(monthly,Number(monthly.active||1),fallbackGoal):fallbackGoal;
  const open=tasks.filter(t=>!isDone(t)).length;
  const done=tasks.filter(isDone).length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;
  const w=weekInfo();
  const sig=[brand(),data.length,tasks.length,meta1,meta2,meta3,goal,open,pct,iso(w.monday),iso(w.sunday)].join('|');
  const planMetaCard=(level,value)=>'<div class="plan-kpi plan-kpi-goal '+(Number(monthly?.active||1)===level?'active-goal':'')+'"><small>Meta '+level+'</small><b>'+(value>0?money(value):'—')+'</b><span>'+(
    Number(monthly?.active||1)===level?'meta ativa do mês':'escada de meta mensal'
  )+'</span></div>';
  const desired=
    '<div class="plan-kpi"><small>Campanhas no mês</small><b>'+data.length+'</b><span>'+perpetual.length+' perpétuas · '+punctual.length+' pontuais</span></div>'+
    planMetaCard(1,meta1)+planMetaCard(2,meta2)+planMetaCard(3,meta3)+
    '<div class="plan-kpi"><small>Tarefas abertas</small><b>'+open+'</b><span>'+pct+'% concluídas</span></div>'+
    '<div class="plan-kpi"><small>Semana atual</small><b>'+String(w.monday.getDate()).padStart(2,'0')+' — '+String(w.sunday.getDate()).padStart(2,'0')+
    '</b><span>'+monthName(w.sunday).toLowerCase()+' de '+w.sunday.getFullYear()+'</span></div>';
  if(root.innerHTML!==desired)root.innerHTML=desired;
  planSignature=sig;
  correctLegacyGoalWarning(fallbackGoal);
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
    const tab=e.target.closest?.('.plan-tab,[data-strategy-tab]');
    if(!tab)return;
    const label=norm(tab.textContent||'');
    if(tab.dataset.planTab==='campaigns'||tab.dataset.strategyTab==='campaigns'||label==='campanhas'){
      e.preventDefault();
      e.stopImmediatePropagation();

      // Do not delegate this back through another strategy button. Older
      // layers could recurse or reopen the previous planning pane. Switch
      // the canonical view directly and then ask the legacy renderer to draw.
      try{window.__centralShowCampaigns?.()}catch{}
      const planning=document.getElementById('planningView');
      const campaigns=document.getElementById('campaignsView');
      const home=document.getElementById('homeView');
      const tasks=document.getElementById('tasksView');
      const deliveries=document.getElementById('deliveriesView');
      home?.classList.remove('active');
      tasks?.classList.remove('active');
      deliveries?.classList.remove('active');
      planning?.classList.remove('active');
      if(campaigns){
        campaigns.hidden=false;
        campaigns.style.removeProperty('display');
        campaigns.classList.add('active');
      }
      // Reset the legacy campaign workspace state before drawing the
      // directory. The unified strategy click is captured above, so the
      // navigation-reference handler (which normally clicks this hidden
      // overview tab) never runs. Without this reset, campaignState.selected
      // can keep the last opened campaign and renderCampaigns() redraws the
      // hidden workspace instead of the directory, leaving the list blank.
      const overview=campaigns?.querySelector('[data-camp-view="overview"]');
      if(overview){
        try{overview.click()}catch{}
      }
      document.getElementById('campaignOverviewList')?.classList.remove('hidden');
      document.getElementById('campaignWorkspace')?.classList.remove('active');
      document.querySelectorAll('.ref-strategy-tabs [data-strategy-tab]')
        .forEach(b=>b.classList.toggle('active',b.dataset.strategyTab==='campaigns'));
      try{history.replaceState(null,'','#campaigns')}catch{}
      try{window.__centralRenderCampaigns?.()}catch{}
      try{campaignList()}catch{}
      schedule();
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

/* AllianceOS campaign immutable history V1 */
const CAMPAIGN_HISTORY_ENDPOINT='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/campaign-history';
const campaignHistoryCache=new Map();
const monthOriginalCache=new Map();
function allianceAuthToken(){
  try{
    const raw=localStorage.getItem('sb-lpnyrzsdiyzjnhovpduk-auth-token');
    if(!raw)return'';
    const parsed=JSON.parse(raw);
    return parsed?.access_token||parsed?.currentSession?.access_token||'';
  }catch{return''}
}
async function historyRequest(params){
  try{if(window.AllianceOSAuth?.ready)await window.AllianceOSAuth.ready}catch{}
  const token=allianceAuthToken();
  if(!token)throw new Error('Sessão não encontrada.');
  const qs=new URLSearchParams(params);
  const res=await fetch(CAMPAIGN_HISTORY_ENDPOINT+'?'+qs.toString(),{
    cache:'no-store',
    headers:{Authorization:'Bearer '+token}
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data?.error)throw new Error(data?.error||('Erro '+res.status));
  return data;
}
function activeWorkspaceCampaign(){
  const ws=document.querySelector('#campaignWorkspace.active');
  if(!ws)return null;
  const rows=read(CAMP_KEY);
  const saved=String(ws.dataset.campaignId||'');
  if(saved){
    const found=rows.find(c=>String(c?.id||'')===saved);
    if(found)return found;
  }
  const title=String(ws.querySelector('.cw-title h2')?.textContent||'').trim();
  const brandText=String(ws.querySelector('.cw-title small')?.textContent||'').split('·')[0].trim();
  const matches=rows.filter(c=>String(c?.name||'').trim()===title&&(!brandText||norm(c?.brand)===norm(brandText)));
  const found=matches[0]||rows.find(c=>String(c?.name||'').trim()===title)||null;
  if(found)ws.dataset.campaignId=String(found.id);
  return found;
}
const historyFieldLabels={
  name:'Nome',brand:'Marca',type:'Tipo',start:'Início',startAt:'Início',
  end:'Fim',endAt:'Fim',goal:'Meta',budget:'Verba',status:'Status',
  owner:'Responsável',offer:'Oferta',objective:'Objetivo',channels:'Canais',
  tapStructured:'TAP',monthRef:'Mês',monthId:'Mês',clientId:'Cliente',
  archivedAt:'Arquivamento',progress:'Progresso'
};
function historyValue(key,value){
  if(value==null||value==='')return'—';
  if(key==='goal'||key==='budget')return money(Number(value||0));
  if(key==='start'||key==='startAt'||key==='end'||key==='endAt')return dateBR(value);
  if(key==='tapStructured')return value?'TAP atualizado':'Sem TAP';
  if(Array.isArray(value))return value.map(v=>typeof v==='object'?(v?.name||v?.nome||'item'):String(v)).join(', ')||'—';
  if(typeof value==='object')return'Conteúdo estruturado atualizado';
  return String(value);
}
function historyMoment(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return String(value||'');
  return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
function campaignMonthRef(c){
  return String(c?.monthRef||c?.startAt||c?.start||'').slice(0,7);
}
function historyDiffRows(before,after,keys){
  const list=(Array.isArray(keys)&&keys.length?keys:Object.keys({...before,...after}))
    .filter(k=>!['history','updatedAt','updated_at','updatedBy'].includes(k));
  const rows=[];
  for(const key of list){
    const a=before?.[key],b=after?.[key];
    if(JSON.stringify(a)===JSON.stringify(b))continue;
    rows.push('<div class="alliance-history-diff"><b>'+esc(historyFieldLabels[key]||key)+'</b><span>'+esc(historyValue(key,a))+'</span><i>→</i><strong>'+esc(historyValue(key,b))+'</strong></div>');
  }
  return rows.join('')||'<div class="alliance-history-note">Registro técnico sem alteração visível de campo.</div>';
}
function renderMonthOriginal(c,data){
  const snap=Array.isArray(data?.snapshot)?data.snapshot:[];
  const original=snap.find(x=>String(x?.id||'')===String(c?.id||''));
  const current=c||{};
  const compareKeys=['name','type','startAt','start','endAt','end','goal','budget','status','offer'];
  let compare='';
  if(original){
    const rows=[];
    const seen=new Set();
    for(const key of compareKeys){
      const canonical=(key==='start'&&original.startAt!==undefined)||(key==='end'&&original.endAt!==undefined)?null:key;
      if(!canonical||seen.has(canonical))continue;
      seen.add(canonical);
      const a=original[canonical],b=current[canonical];
      if(JSON.stringify(a)===JSON.stringify(b))continue;
      rows.push('<div class="alliance-original-compare-row"><span>'+esc(historyFieldLabels[canonical]||canonical)+'</span><b>'+esc(historyValue(canonical,a))+'</b><i>→</i><strong>'+esc(historyValue(canonical,b))+'</strong></div>');
    }
    compare=rows.length?'<div class="alliance-original-compare"><div class="alliance-history-subtitle">O que mudou nesta campanha desde o original</div>'+rows.join('')+'</div>':'<div class="alliance-original-unchanged">Esta campanha continua igual à versão original do mês.</div>';
  }else{
    compare='<div class="alliance-original-new">Esta campanha não existia no original do mês — foi adicionada depois.</div>';
  }
  const cards=snap.length?snap.map(x=>'<article class="alliance-original-campaign '+(String(x?.id||'')===String(c?.id||'')?'is-current':'')+'"><b>'+esc(x?.name||'Campanha')+'</b><span>'+esc(String(x?.type||'Campanha'))+' · '+esc(dateBR(x?.startAt||x?.start))+' — '+esc(dateBR(x?.endAt||x?.end))+'</span><small>'+esc(statusLabel(x?.status))+' · '+money(campaignGoal(x))+'</small></article>').join(''):'<div class="alliance-history-empty">O original deste mês não tinha campanhas cadastradas.</div>';
  return '<section class="alliance-history-card alliance-original-card"><div class="alliance-history-card-head"><div><strong>Original do mês</strong><span>fotografia preservada · não muda com as edições atuais</span></div><em>'+esc(data?.captured_at?historyMoment(data.captured_at):'versão atual ainda é a original')+'</em></div>'+compare+'<div class="alliance-history-subtitle">Planejamento original completo</div><div class="alliance-original-grid">'+cards+'</div></section>';
}
function renderVersionTimeline(data){
  const versions=Array.isArray(data?.versions)?data.versions:[];
  if(!versions.length)return'<section class="alliance-history-card"><div class="alliance-history-empty">Ainda não há alterações registradas nesta campanha.</div></section>';
  return '<section class="alliance-history-card"><div class="alliance-history-card-head"><div><strong>Histórico de modificações</strong><span>interface, MCP e sistema na mesma linha do tempo</span></div><em>'+versions.length+' versão'+(versions.length===1?'':'ões')+'</em></div><div class="alliance-history-timeline">'+versions.map(v=>{
    const origin=v.origin==='mcp'?'MCP':v.origin==='job'?'Sistema':v.origin==='baseline'?'Original':'Interface';
    const actor=v.actor||v.autor||(v.origin==='baseline'?'Implantação':'Usuário');
    return '<article class="alliance-history-event '+(v.is_original?'is-original':'')+'"><div class="alliance-history-dot"></div><div class="alliance-history-event-body"><div class="alliance-history-event-head"><div><b>'+esc(v.is_original?'Versão original salva':'Campanha alterada')+'</b><span>'+esc(actor)+' · '+esc(origin)+'</span></div><time>'+esc(historyMoment(v.created_at))+'</time></div>'+historyDiffRows(v.previous_snapshot||{},v.snapshot||{},v.changed_keys)+'</div></article>';
  }).join('')+'</div></section>';
}
async function loadCampaignHistoryPane(c,pane){
  const cid=String(c?.id||''),month=campaignMonthRef(c),b=String(c?.brand||'');
  const key=cid,monthKey=norm(b)+'::'+month;
  pane.innerHTML='<div class="alliance-history-loading"><span></span>Carregando histórico sincronizado…</div>';
  try{
    let h=campaignHistoryCache.get(key);
    if(!h||Date.now()-h.at>15000){
      h={at:Date.now(),data:await historyRequest({mode:'campaign',campaign_id:cid,limit:'120'})};
      campaignHistoryCache.set(key,h);
    }
    let m=monthOriginalCache.get(monthKey);
    if(!m||Date.now()-m.at>30000){
      m={at:Date.now(),data:await historyRequest({mode:'month',brand:b,month})};
      monthOriginalCache.set(monthKey,m);
    }
    if(String(activeWorkspaceCampaign()?.id||'')!==cid)return;
    pane.innerHTML=renderMonthOriginal(c,m.data)+renderVersionTimeline(h.data);
  }catch(err){
    pane.innerHTML='<div class="alliance-history-error"><b>Não foi possível carregar o histórico.</b><span>'+esc(err?.message||String(err))+'</span></div>';
  }
}
function campaignHistoryWorkspace(){
  const ws=document.querySelector('#campaignWorkspace.active');
  const c=activeWorkspaceCampaign();
  if(!ws||!c)return;
  const tabs=ws.querySelector('.cw-tabs');
  if(!tabs)return;
  let tab=tabs.querySelector('[data-alliance-history-tab]');
  if(!tab){
    tab=document.createElement('button');
    tab.type='button';
    tab.className='cw-tab';
    tab.dataset.allianceHistoryTab='1';
    tab.textContent='Histórico';
    tabs.appendChild(tab);
  }
  let pane=ws.querySelector('[data-alliance-history-pane]');
  if(!pane){
    pane=document.createElement('div');
    pane.className='cw-pane alliance-history-pane';
    pane.dataset.allianceHistoryPane='1';
    tabs.insertAdjacentElement('afterend',pane);
  }
  if(tab.dataset.bound!=='1'){
    tab.dataset.bound='1';
    tab.addEventListener('click',()=>{
      ws.querySelectorAll('.cw-tab').forEach(x=>x.classList.remove('active'));
      ws.querySelectorAll('.cw-pane').forEach(x=>x.classList.remove('active'));
      tab.classList.add('active');
      pane.classList.add('active');
      loadCampaignHistoryPane(c,pane);
    });
  }
}

function normalizeWorkspaceActions(){
  const ws=document.querySelector('#campaignWorkspace.active');
  const top=ws?.querySelector('.cw-top');
  if(!ws||!top)return;
  const status=top.querySelector('.cw-status');
  if(!status)return;

  /* Há runtimes legados que podem recolocar uma segunda ação "Excluir"
     depois do render do workspace. Sanitizamos qualquer controle destrutivo
     duplicado do cabeçalho, independentemente de ser button/input/role=button. */
  const actionNodes=[...top.querySelectorAll('button,input[type="button"],input[type="submit"],[role="button"]')];
  const labelOf=el=>norm(el.tagName==='INPUT'?(el.value||''):(el.textContent||el.getAttribute('aria-label')||''));
  const deleteActions=actionNodes.filter(el=>labelOf(el)==='excluir');
  let canonical=top.querySelector('#cwDelete');
  if(!canonical&&deleteActions[0]){
    canonical=deleteActions[0];
    canonical.id='cwDelete';
  }
  deleteActions.forEach(el=>{if(el!==canonical)el.remove()});

  /* Se a cópia legada vier fora de .cw-top, mas ainda no topo visual do
     workspace, removemos apenas controles "Excluir" anteriores às abas. */
  const tabs=ws.querySelector('.cw-tabs');
  [...ws.children].forEach(child=>{
    if(child===top||child===tabs)return;
    if(tabs&&child.compareDocumentPosition(tabs)&Node.DOCUMENT_POSITION_PRECEDING)return;
    const nodes=[...child.querySelectorAll?.('button,input[type="button"],input[type="submit"],[role="button"]')||[]];
    nodes.filter(el=>labelOf(el)==='excluir').forEach(el=>el.remove());
  });

  const chip=status.querySelector('.camp-chip');
  if(chip){
    const nextStatus=statusLabel(chip.textContent||'Em execução');
    if(chip.textContent!==nextStatus)chip.textContent=nextStatus;
    if(!chip.classList.contains('alliance-cw-status-chip'))chip.classList.add('alliance-cw-status-chip');
  }

  const edit=top.querySelector('#cwEdit');
  if(edit)edit.classList.add('alliance-cw-action','alliance-cw-edit');
  if(canonical)canonical.classList.add('alliance-cw-action','alliance-cw-delete');
}

function apply(){
  // The planning KPI strip is month-critical, so render it before any
  // optional campaign workspace enhancement. One unrelated legacy error must
  // never leave September's counters visible while October is selected.
  try{syncLegacyMemory()}catch(e){console.warn('[AllianceOS mês] memória',e)}
  try{bindDelegates()}catch(e){console.warn('[AllianceOS mês] navegação',e)}
  try{syncMonthChrome()}catch(e){console.warn('[AllianceOS mês] cabeçalho',e)}
  try{planContext()}catch(e){console.warn('[AllianceOS mês] indicadores',e)}
  try{planningWeek()}catch(e){console.warn('[AllianceOS mês] semana',e)}
  try{campaignList()}catch(e){console.warn('[AllianceOS mês] campanhas',e)}
  try{campaignCalendar()}catch(e){console.warn('[AllianceOS mês] calendário',e)}
  try{normalizeWorkspaceActions()}catch(e){console.warn('[AllianceOS campanha] ações',e)}
  try{campaignHistoryWorkspace()}catch(e){console.warn('[AllianceOS campanha] histórico',e)}
  try{summary()}catch(e){console.warn('[AllianceOS campanha] resumo',e)}
}

let campaignViewObserver=null;
function ensureCampaignViewObserver(){
  const view=document.getElementById('campaignsView');
  if(!view)return;
  if(campaignViewObserver&&view.dataset.allianceMonthCampaignObserved==='1')return;
  try{campaignViewObserver?.disconnect()}catch{}
  view.dataset.allianceMonthCampaignObserved='1';
  let queued=false;
  campaignViewObserver=new MutationObserver(mutations=>{
    if(!view.classList.contains('active'))return;
    if(!mutations.some(m=>m.target?.closest?.('#campaignKpis,#campaignList,#campaignSummary,#campaignListSub')||m.target?.id==='campaignKpis'||m.target?.id==='campaignList'))return;
    if(queued)return;
    queued=true;
    setTimeout(()=>{
      queued=false;
      try{campaignList()}catch{}
    },0);
  });
  campaignViewObserver.observe(view,{childList:true,subtree:true,characterData:true});
}

let planContextObserver=null;
function ensurePlanContextObserver(){
  const root=document.getElementById('planContext');
  if(!root)return;
  if(planContextObserver&&root.dataset.allianceMonthKpiObserved==='1')return;
  try{planContextObserver?.disconnect()}catch{}
  root.dataset.allianceMonthKpiObserved='1';
  planContextObserver=new MutationObserver(()=>{
    // Legacy renderContext can still repaint this strip. Re-assert the
    // selected-month truth on the next task, without writing when identical.
    setTimeout(()=>{try{planContext()}catch{}},0);
  });
  planContextObserver.observe(root,{childList:true,subtree:true,characterData:true});
}

let applying=false;
function schedule(){
  clearTimeout(scheduled);
  scheduled=setTimeout(()=>{
    if(applying)return;
    applying=true;
    try{apply();ensurePlanContextObserver();ensureCampaignViewObserver()}finally{applying=false}
  },50);
}

const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('input',e=>{if(e.target?.id==='campaignSearch')schedule()});
document.addEventListener('change',e=>{if(['campaignStatusFilter','brandSelect'].includes(e.target?.id))schedule()});
window.addEventListener('allianceos:planning-month',e=>{
  const ref=String(e?.detail?.monthRef||'');
  if(validMonthRef(ref)){
    window.AlliancePlanningMonthRef=ref;
    try{sessionStorage.setItem('allianceos.planning.monthRef',ref)}catch{}
    try{localStorage.setItem('allianceos.planning.monthRef',ref)}catch{}
  }
  schedule();
});
window.addEventListener('allianceos:planning-month-changing',()=>{
  try{syncMonthChrome();planContext();planningWeek();campaignList()}catch{}
  schedule();
});
window.addEventListener('allianceos:planning-month-ready',schedule);
window.addEventListener('allianceos:planning-metrics',schedule);
window.addEventListener('allianceos:state-updated',e=>{
  const key=String(e?.detail?.key||'');
  if(key===CAMP_KEY||key===TASK_KEY||key.startsWith('central.planning.map.'))schedule();
});
document.getElementById('campaignsNav')?.addEventListener('click',()=>{
  setTimeout(schedule,0);
  setTimeout(schedule,180);
  setTimeout(schedule,700);
});
window.addEventListener('pageshow',schedule);
window.addEventListener('focus',schedule);
// No polling loop: month/campaign state is event-driven. The old 1.8s
// interval repeatedly rebuilt large views and made the planning screen feel
// stuck while the user was changing months.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
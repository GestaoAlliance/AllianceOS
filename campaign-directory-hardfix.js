(()=>{
'use strict';

const CAMP_KEY='central.campaigns.vitor-gutierrez';
const esc=v=>String(v??'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const validRef=v=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(v||''));
const readArray=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const dateOnly=v=>{
  if(!v)return null;
  const s=String(v);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
  const x=new Date(s);return Number.isNaN(x.getTime())?null:new Date(x.getFullYear(),x.getMonth(),x.getDate());
};
const dateBR=v=>{const d=dateOnly(v);return d?String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'):'—'};
const monthRef=()=>{
  const live=String(window.AlliancePlanningMonthRef||'');
  if(validRef(live))return live;
  try{
    const s=sessionStorage.getItem('allianceos.planning.monthRef')||localStorage.getItem('allianceos.planning.monthRef')||'';
    if(validRef(s))return s;
  }catch{}
  const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
};
const monthLabel=ref=>{
  const [y,m]=ref.split('-').map(Number);
  return new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long'}).replace(/^./,x=>x.toUpperCase());
};
const brand=()=>{
  const v=String(document.getElementById('brandSelect')?.value||'').trim();
  return !v||norm(v)==='todas as marcas'?'':v;
};
const mapIds=(b,ref)=>{
  const ids=new Set();
  if(!b)return ids;
  const uid=window.user?.id||'';
  const keys=[
    uid&&'central.planning.map.'+uid+'.'+b+'.'+ref,
    'central.planning.map.vitor-gutierrez.'+b+'.'+ref,
    'central.planning.map.shared.'+b+'.'+ref
  ].filter(Boolean);
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(k.startsWith('central.planning.map.')&&k.endsWith('.'+b+'.'+ref))keys.push(k);
    }
  }catch{}
  for(const key of [...new Set(keys)]){
    try{
      const m=JSON.parse(localStorage.getItem(key)||'null');
      for(const n of (Array.isArray(m?.nos)?m.nos:[])){
        const id=String(n?.campId||n?.campaignId||'').trim();
        if(id)ids.add(id);
      }
    }catch{}
  }
  return ids;
};
const campaigns=()=>{
  const ref=monthRef(),b=brand(),ids=mapIds(b,ref);
  const [y,m]=ref.split('-').map(Number);
  const first=new Date(y,m-1,1),last=new Date(y,m,0);
  return readArray(CAMP_KEY).filter(c=>{
    if(!c||c.archivedAt||c.archived_at)return false;
    if(b&&String(c.brand||c.marca||'')!==b)return false;
    const explicit=String(c.monthRef||c.month_ref||'').slice(0,7);
    if(validRef(explicit))return explicit===ref;
    if(ids.size&&ids.has(String(c.id||'')))return true;
    const s=dateOnly(c.startAt||c.start),e=dateOnly(c.endAt||c.end)||s;
    return !!s&&!!e&&s<=last&&e>=first;
  });
};
const statusClass=s=>{
  const n=norm(s);
  if(n.includes('exec')||n.includes('andamento'))return'running';
  if(n.includes('planej'))return'planning';
  if(n.includes('concl')||n.includes('encerr')||n==='feito')return'done';
  return'review';
};
const isPerpetual=c=>norm(c.type||c.tipo).includes('perpet');
const goal=c=>Number(c.goal||0);
const budget=c=>Number(c.budget||0);
const progress=c=>Math.max(0,Math.min(100,Number(c.progress||0)));
const initials=v=>String(v||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();

function row(c){
  const owner=String(c.owner||c.responsavel||'Sem responsável');
  const pct=progress(c);
  const s=dateOnly(c.startAt||c.start),e=dateOnly(c.endAt||c.end)||s;
  const days=s&&e?Math.max(1,Math.round((e-s)/86400000)+1):0;
  return '<article class="camp-row alliance-live-campaign-row" data-hard-campaign="'+esc(c.id||'')+'" data-hard-campaign-name="'+esc(c.name||c.nome||'')+'" style="--cc:'+esc(c.color||'#121415')+'">'+
    '<div class="camp-name"><i class="camp-color"></i><div class="camp-name-text"><b>'+esc(c.name||c.nome||'Campanha')+'</b><small>'+esc(isPerpetual(c)?'Perpétua':'Pontual')+' · '+esc(c.offer||c.objective||'')+'</small></div></div>'+
    '<span class="camp-chip '+statusClass(c.status)+'">'+esc(c.status||'Sem status')+'</span>'+
    '<div><span class="camp-meta-val">'+esc(dateBR(c.startAt||c.start))+' — '+esc(dateBR(c.endAt||c.end))+'</span><span class="camp-meta-sub">'+days+' dia'+(days===1?'':'s')+'</span></div>'+
    '<div class="camp-owner"><i class="miniav">'+esc(initials(owner))+'</i><span>'+esc(owner.split(' ')[0])+'</span></div>'+
    '<div><span class="camp-meta-val">'+money(goal(c))+'</span><span class="camp-meta-sub">meta da ação</span></div>'+
    '<div><span class="camp-meta-val">'+money(budget(c))+'</span><span class="camp-meta-sub">verba</span></div>'+
    '<div class="camp-progress"><div class="camp-progress-line"><i style="width:'+pct+'%"></i></div><span>'+pct+'%</span></div>'+
    '<button class="camp-more" type="button" aria-label="Abrir campanha">›</button></article>';
}

function render(){
  const view=document.getElementById('campaignsView');
  const root=document.getElementById('campaignList');
  if(!view||!root||!view.classList.contains('active'))return;
  const ws=document.getElementById('campaignWorkspace');
  if(ws?.classList.contains('active'))return;

  const data=campaigns();
  const perpetual=data.filter(isPerpetual),punctual=data.filter(c=>!isPerpetual(c));
  const totalGoal=perpetual.reduce((s,c)=>s+goal(c),0);
  const totalBudget=perpetual.reduce((s,c)=>s+budget(c),0);
  const avg=data.length?Math.round(data.reduce((s,c)=>s+progress(c),0)/data.length):0;
  const active=data.filter(c=>norm(c.status).includes('exec')).length;

  const kpis=document.getElementById('campaignKpis');
  if(kpis)kpis.innerHTML=
    '<div class="camp-kpi"><small>Campanhas no mês</small><b>'+data.length+'</b><span>'+perpetual.length+' perpétua'+(perpetual.length===1?'':'s')+' · '+punctual.length+' pontual'+(punctual.length===1?'':'is')+'</span></div>'+
    '<div class="camp-kpi"><small>Meta dos canais</small><b>'+money(totalGoal)+'</b><span>frentes perpétuas do mês</span></div>'+
    '<div class="camp-kpi"><small>Verba dos canais</small><b>'+money(totalBudget)+'</b><span>'+(totalBudget&&totalGoal?'ROAS alvo '+(totalGoal/totalBudget).toFixed(1).replace('.',','):'sem verba atribuída')+'</span></div>'+
    '<div class="camp-kpi"><small>Execução operacional</small><b>'+avg+'%</b><span>'+active+' campanha'+(active===1?'':'s')+' em execução</span></div>';

  const ref=monthRef();
  const sub=document.getElementById('campaignListSub');
  if(sub)sub.textContent=monthLabel(ref)+' · '+(brand()||'todas as marcas');
  const summary=document.getElementById('campaignSummary');
  if(summary)summary.textContent=data.length+' campanhas · '+perpetual.length+' perpétuas · '+punctual.length+' pontuais';

  const group=(title,desc,items,kind)=>
    '<section class="alliance-campaign-group '+kind+'"><div class="alliance-campaign-group-head"><div><strong>'+title+'</strong><span>'+desc+'</span></div><em>'+items.length+'</em></div>'+
    (items.length?items.map(row).join(''):'<div class="camp-empty">Nenhuma campanha neste grupo.</div>')+'</section>';

  root.innerHTML='<div class="camp-list-head"><span>Campanha</span><span>Status</span><span>Período</span><span>Responsável</span><span>Meta</span><span>Verba</span><span>Execução</span><span></span></div>'+
    group('Perpétuas','Canais e frentes que carregam a meta mensal.',perpetual,'perpetual')+
    group('Campanhas','Ações pontuais com começo e fim.',punctual,'punctual');

  document.getElementById('campaignListSection')?.style.removeProperty('display');
}

function forceDirectory(){
  const overview=document.getElementById('campaignOverviewList');
  const ws=document.getElementById('campaignWorkspace');
  overview?.classList.remove('hidden');
  ws?.classList.remove('active');
  render();
}

document.addEventListener('click',e=>{
  const tab=e.target.closest?.('[data-strategy-tab="campaigns"],[data-camp-view="overview"]');
  if(tab)setTimeout(forceDirectory,0),setTimeout(forceDirectory,120),setTimeout(forceDirectory,500);
  const item=e.target.closest?.('[data-hard-campaign]');
  if(item){
    e.preventDefault();
    const name=item.dataset.hardCampaignName||'';
    if(name)window.openCampaignWorkspaceByName?.(name);
  }
},true);

window.addEventListener('allianceos:planning-month',()=>setTimeout(forceDirectory,0));
window.addEventListener('allianceos:planning-month-ready',()=>setTimeout(forceDirectory,0));
window.addEventListener('allianceos:state-updated',e=>{
  const key=String(e?.detail?.key||'');
  if(key===CAMP_KEY||key.startsWith('central.planning.map.'))setTimeout(forceDirectory,0);
});
document.getElementById('brandSelect')?.addEventListener('change',()=>setTimeout(forceDirectory,0));
document.getElementById('campaignSearch')?.addEventListener('input',()=>setTimeout(render,0));
document.getElementById('campaignStatusFilter')?.addEventListener('change',()=>setTimeout(render,0));
window.AllianceCampaignDirectoryHardfix={render:forceDirectory};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(forceDirectory,80),{once:true});else setTimeout(forceDirectory,80);
})();
(()=>{
'use strict';

const TASK_KEY='central.tasks.vitor-gutierrez';
const CAMPAIGN_KEY='central.campaigns.vitor-gutierrez';
const DAY=86400000;
let lastSig='';

/* Evita a linha dupla no card de atenção:
   o contorno do card já fecha a seção; a divisória fica só quando há conteúdo. */
const installHomeLineFix=()=>{
  if(document.getElementById('alliance-home-line-fix'))return;
  const style=document.createElement('style');
  style.id='alliance-home-line-fix';
  style.textContent='[data-module="attention"] .cardhead{border-bottom:1px solid var(--line)!important}[data-module="attention"] #homeAtencao{border-top:0!important}[data-module="attention"] #homeAtencao>.task:first-child{border-top:0!important}';
  document.head.appendChild(style);
};

const esc=v=>String(v??'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const read=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const parseDate=value=>{
  if(!value)return null;
  const s=String(value);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    const a=s.split('-').map(Number);
    return new Date(a[0],a[1]-1,a[2]);
  }
  const d=new Date(s);
  if(Number.isNaN(d.getTime()))return null;
  return new Date(d.getFullYear(),d.getMonth(),d.getDate());
};
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const diff=value=>{const d=parseDate(value);return d?Math.round((d-today())/DAY):null};
const done=t=>['feito','concluida','concluido','done','finalizada','finalizado'].includes(norm(t?.status));
const brand=()=>{
  const v=String(document.getElementById('brandSelect')?.value||'').trim();
  return !v||/todas/i.test(v)?'':v;
};
const currentData=()=>{
  const b=brand();
  return {
    brand:b,
    tasks:read(TASK_KEY).filter(t=>!t?.archivedAt&&(!b||!t?.brand||t.brand===b)),
    campaigns:read(CAMPAIGN_KEY).filter(c=>!c?.archivedAt&&(!b||!c?.brand||c.brand===b))
  };
};
const dateBR=v=>{
  const d=parseDate(v);
  return d?String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'):'';
};
const statusLabel=s=>{
  const n=norm(s);
  if(n.includes('exec')||n.includes('andamento'))return'Em andamento';
  if(n.includes('prepar'))return'Em preparação';
  if(n.includes('planej'))return'Planejamento';
  if(n.includes('concl'))return'Concluída';
  return String(s||'');
};

function stats(tasks){
  const open=tasks.filter(t=>!done(t));
  const overdue=open.filter(t=>{const d=diff(t.dueAt||t.due);return d!=null&&d<0});
  const near=open.filter(t=>{const d=diff(t.dueAt||t.due);return d!=null&&d>=0&&d<=1});
  const now=today();
  const month=tasks.filter(t=>{
    const d=parseDate(t.dueAt||t.due);
    return d&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const monthDone=month.filter(done);
  const pct=month.length?Math.round(monthDone.length/month.length*100):0;

  const set=(key,value,note,width)=>{
    const el=document.querySelector('[data-stat="'+key+'"]');
    if(!el)return;
    const v=el.querySelector('.value');
    const n=el.querySelector('.note');
    const bar=el.querySelector('.progress i');
    if(v)v.textContent=String(value);
    if(n)n.textContent=note;
    if(bar)bar.style.width=Math.max(0,Math.min(100,width||0))+'%';
  };

  set('perto',near.length,tasks.length?'vencem hoje ou amanhã':'sem tarefas carregadas',0);
  set('vencidas',overdue.length,overdue.length?'precisam de ação hoje':'nada atrasado',0);
  set('conclusao',month.length?pct+'%':'—',
    month.length?monthDone.length+' de '+month.length+' tarefas do mês concluídas':'nenhuma tarefa com prazo neste mês',pct);
  return {overdue,near};
}

function attention(tasks,s){
  const root=document.getElementById('homeAtencao');
  if(!root)return;
  const map=new Map();
  s.overdue.concat(s.near).forEach(t=>map.set(String(t.id||t.title),t));
  const list=[...map.values()]
    .sort((a,b)=>String(a.dueAt||a.due||'9999').localeCompare(String(b.dueAt||b.due||'9999')))
    .slice(0,6);

  const html=list.length?list.map(t=>{
    const raw=t.dueAt||t.due;
    const d=diff(raw);
    const when=d<0?(d===-1?'vencida ontem':'vencida há '+Math.abs(d)+' dias'):d===0?'vence hoje':'vence amanhã';
    const people=(Array.isArray(t.assignees)?t.assignees:[]).map(x=>String(x||'').split('|')[0].trim()).filter(Boolean).join(', ')||'Sem responsável';
    return '<div class="task" data-ini-tarefa="'+esc(t.id)+'">'+
      '<span class="urgency '+(d<0?'red':'orange')+'"></span>'+
      '<div><div class="task-title">'+esc(t.title||'Tarefa')+'</div>'+
      '<div class="task-meta">'+esc(people)+' · '+esc(t.brand||'')+' · '+esc(t.project||'Sem projeto')+'</div></div>'+
      '<span class="due '+(d<0?'':'soon')+'">'+esc(when)+' · '+esc(dateBR(raw))+'</span></div>';
  }).join(''):'<div class="ini-vazio">'+(tasks.length?'Nada vencido nem vencendo nas próximas 48h.':'Nenhuma tarefa carregada ainda.')+'</div>';

  if(root.dataset.homeLive!==html){root.dataset.homeLive=html;root.innerHTML=html}
}

function related(c,tasks){
  const cid=String(c.id||'');
  const name=norm(c.name);
  return tasks.filter(t=>{
    if(cid&&String(t.campaignId||'')===cid)return true;
    const p=norm(t.project);
    return !!p&&!!name&&(p===name||p.startsWith(name)||name.startsWith(p));
  });
}

function campaignInMonth(c){
  const now=today();
  const first=new Date(now.getFullYear(),now.getMonth(),1);
  const last=new Date(now.getFullYear(),now.getMonth()+1,0);
  const start=parseDate(c.startAt||c.start);
  const end=parseDate(c.endAt||c.end)||start;
  return !!start&&!!end&&start<=last&&end>=first;
}

function campaignCards(campaigns,tasks){
  const root=document.getElementById('homeCampanhas');
  if(!root)return;
  const order={'Em andamento':0,'Em preparação':1,'Planejamento':2,'Concluída':3};
  const list=campaigns.filter(campaignInMonth).sort((a,b)=>{
    const sa=statusLabel(a.status),sb=statusLabel(b.status);
    return (order[sa]??9)-(order[sb]??9)||String(a.startAt||a.start||'').localeCompare(String(b.startAt||b.start||''));
  }).slice(0,6);

  const html=list.length?list.map(c=>{
    const ts=related(c,tasks);
    const finished=ts.filter(done).length;
    let pct=0,meta='';
    if(ts.length){
      pct=Math.round(finished/ts.length*100);
      meta=finished+' de '+ts.length+' tarefas';
    }else{
      const start=parseDate(c.startAt||c.start);
      const end=parseDate(c.endAt||c.end)||start;
      if(start&&end){
        const total=Math.max(1,Math.round((end-start)/DAY)+1);
        pct=Math.max(0,Math.min(100,Math.round(((today()-start)/DAY+1)/total*100)));
        meta=dateBR(start)+' a '+dateBR(end);
      }
    }
    return '<div class="campaign" data-ini-campanha="'+esc(c.name||c.id)+'" title="'+esc((c.brand||'')+' · '+statusLabel(c.status))+'">'+
      '<div class="campaign-top"><b>'+esc(c.name||'Campanha')+'</b><span>'+esc(c.brand||'')+'</span></div>'+
      '<div class="campaign-bar"><i style="width:'+pct+'%"></i></div>'+
      '<div class="campaign-foot"><span>'+esc(meta)+'</span><span>'+pct+'%</span></div></div>';
  }).join(''):'<div class="ini-vazio">Nenhuma campanha com data dentro deste mês.</div>';

  if(root.dataset.homeLive!==html){root.dataset.homeLive=html;root.innerHTML=html}
}

function monday(d){
  const x=new Date(d);
  const day=x.getDay();
  x.setDate(x.getDate()+(day===0?-6:1-day));
  x.setHours(0,0,0,0);
  return x;
}

function timeline(campaigns,tasks){
  const root=document.getElementById('weekTimeline');
  if(!root)return;
  const now=today();
  const mon=monday(now);
  const sun=new Date(mon);sun.setDate(mon.getDate()+6);
  const head=root.closest('.timeline-card')?.querySelector('.timeline-head strong');
  if(head){
    const month=sun.toLocaleDateString('pt-BR',{month:'long'});
    head.textContent='Esta semana · '+String(mon.getDate()).padStart(2,'0')+' — '+String(sun.getDate()).padStart(2,'0')+' de '+month;
  }

  const events=[];
  campaigns.forEach(c=>{
    const seen=new Set();
    const add=(value,label,kind)=>{
      const d=parseDate(value);
      if(!d)return;
      const key=iso(d)+'|'+label;
      if(seen.has(key))return;
      seen.add(key);
      events.push({date:iso(d),label:label,campaign:c,kind:kind||'campaign'});
    };
    const phases=[]
      .concat(Array.isArray(c.tapStructured?.fases)?c.tapStructured.fases:[])
      .concat(Array.isArray(c.tap?.fases)?c.tap.fases:[]);
    phases.forEach(p=>{if(p?.tem!==false)add(p?.data,p?.nome||c.name,'phase')});
    add(c.startAt||c.start,(c.name||'Campanha')+' · início','start');
    if(String(c.endAt||c.end||'')!==String(c.startAt||c.start||''))add(c.endAt||c.end,(c.name||'Campanha')+' · fim','end');
  });
  tasks.forEach(t=>{
    const d=parseDate(t.dueAt||t.due);
    if(d)events.push({date:iso(d),label:t.title||'Tarefa',task:t,kind:'task'});
  });

  const names=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const trim=(v,n)=>{const s=String(v||'');return s.length>n?s.slice(0,n-1)+'…':s};
  const boxes=[];
  for(let i=0;i<7;i++){
    const d=new Date(mon);d.setDate(mon.getDate()+i);
    const key=iso(d);
    const es=events.filter(e=>e.date===key).sort((a,b)=>(a.kind==='task'?1:0)-(b.kind==='task'?1:0)).slice(0,3);
    const button=e=>{
      const cls='campaign-pill'+(e.kind==='task'?' task-event':e.kind==='phase'?' main-event':'');
      return e.kind==='task'
        ?'<button class="'+cls+'" type="button" data-ini-tarefa="'+esc(e.task.id)+'">'+esc(trim(e.label,32))+'</button>'
        :'<button class="'+cls+'" type="button" data-ini-campanha="'+esc(e.campaign.name||e.campaign.id)+'">'+esc(trim(e.label,32))+'</button>';
    };
    boxes.push('<div class="milestone '+(key===iso(now)?'current':'')+'" data-date="'+key+'">'+
      (es.slice(0,2).length?'<div class="milestone-events top">'+es.slice(0,2).map(button).join('')+'</div>':'')+
      '<span class="milestone-dot"></span>'+
      '<div class="milestone-date"><span>'+names[d.getDay()]+'</span><b>'+String(d.getDate()).padStart(2,'0')+'</b>'+
      '<em class="today-badge">'+(key===iso(now)?'Hoje':'')+'</em></div>'+
      (es[2]?'<div class="milestone-events bottom">'+button(es[2])+'</div>':'')+
      '</div>');
  }
  const html=boxes.join('');
  if(root.dataset.homeLive!==html){root.dataset.homeLive=html;root.innerHTML=html}
}

function render(){
  if(!document.getElementById('homeView'))return;
  const d=currentData();
  const s=stats(d.tasks);
  attention(d.tasks,s);
  campaignCards(d.campaigns,d.tasks);
  timeline(d.campaigns,d.tasks);
  lastSig=[d.brand,d.tasks.length,d.campaigns.length,localStorage.getItem(TASK_KEY)?.length||0,localStorage.getItem(CAMPAIGN_KEY)?.length||0].join('|');
}

installHomeLineFix();

function whenReady(){
  let tries=0;
  const tick=()=>{
    tries++;
    const ok=sessionStorage.getItem('central.__public_sync_ready')==='1'||window.AllianceOSStateSync?.ready?.();
    if(ok||tries>40){render();return}
    setTimeout(tick,150);
  };
  tick();
}

document.addEventListener('DOMContentLoaded',whenReady,{once:true});
addEventListener('pageshow',whenReady);
addEventListener('focus',render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
document.addEventListener('change',e=>{if(e.target?.id==='brandSelect')setTimeout(render,0)});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-key="home"],#homeNav'))setTimeout(render,40)});
setInterval(()=>{
  const d=currentData();
  const sig=[d.brand,d.tasks.length,d.campaigns.length,localStorage.getItem(TASK_KEY)?.length||0,localStorage.getItem(CAMPAIGN_KEY)?.length||0].join('|');
  if(sig!==lastSig)render();
},2500);
if(document.readyState!=='loading')whenReady();
})();
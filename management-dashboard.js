(()=>{
'use strict';

const MANAGEMENT_AREA_ID='1e6ed5ec-8664-4c05-9dad-b2ebd70315d5';
const TASK_KEY='central.tasks.vitor-gutierrez';
const CAMPAIGN_KEY='central.campaigns.vitor-gutierrez';
const DELIVERY_KEY='central.deliveries.workspace.v1';
const DAY=86400000;
let refreshSeq=0;
let lastSignature='';

const esc=v=>String(v??'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const read=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const money=v=>Number.isFinite(Number(v))?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(v)):'—';
const pct=v=>Number.isFinite(Number(v))?Math.round(Number(v))+'%':'—';
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const parseDate=value=>{if(!value)return null;const s=String(value);if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}const d=new Date(s);if(Number.isNaN(d.getTime()))return null;d.setHours(0,0,0,0);return d};
const dateLabel=v=>{const d=parseDate(v);return d?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(d).replace('.',''):'—'};
const validMonthRef=v=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(v||''));
const monthRef=()=>{
  const api=window.AllianceOSMapSync?.month?.();
  if(validMonthRef(api))return String(api);
  const live=String(window.AlliancePlanningMonthRef||'');
  if(validMonthRef(live))return live;
  let saved='';
  try{saved=sessionStorage.getItem('allianceos.planning.monthRef')||localStorage.getItem('allianceos.planning.monthRef')||''}catch{}
  if(validMonthRef(saved))return saved;
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
};
const monthParts=()=>{const [year,month]=monthRef().split('-').map(Number);return {year,month}};
const monthLabel=()=>{
  const {year,month}=monthParts();
  return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(year,month-1,1));
};
const done=t=>['feito','concluido','concluida','done','finalizado','finalizada'].includes(norm(t?.status));
const blocked=t=>norm(t?.status).includes('bloque')||!!String(t?.blockedReason||t?.motivo_bloqueio||'').trim();
const isOverdue=t=>{const d=parseDate(t?.dueAt||t?.due||t?.prazo);return !!d&&!done(t)&&d<today()};
const isManagement=()=>{
  const p=window.AllianceOSSession?.profile||window.AllianceOSAuth?.context?.()?.perfil||{};
  return String(p.area_id||'')===MANAGEMENT_AREA_ID||['gestor','admin_gestao'].includes(norm(p.papel));
};
const firstName=()=>String(window.AllianceOSSession?.profile?.nome||window.user?.name||'Equipe').trim().split(/\s+/)[0]||'Equipe';
const currentBrand=()=>{
  const el=document.getElementById('brandSelect');
  const raw=String(el?.value||'').trim();
  if(raw&&!/todas/i.test(raw))return raw;
  const brands=window.AllianceOSSession?.brands||[];
  const first=brands.find(x=>x&&(x.nome||x.name));
  return String(first?.nome||first?.name||'').trim();
};
const brandObject=name=>(window.AllianceOSSession?.brands||[]).find(x=>norm(x?.nome||x?.name)===norm(name))||null;
const taskBrands=t=>Array.isArray(t?.brands)&&t.brands.length?t.brands:[t?.brand].filter(Boolean);
const matchesBrand=(row,brand)=>!brand||taskBrands(row).some(x=>norm(x)===norm(brand))||norm(row?.brand)===norm(brand);
const taskDue=t=>t?.dueAt||t?.due||t?.prazo||null;
const campaignMonth=c=>{
  const ref=String(c?.monthRef||c?.month_ref||'').slice(0,7);
  if(/^20\d{2}-\d{2}$/.test(ref))return ref===monthRef();
  const d=parseDate(c?.startAt||c?.start||c?.data_inicio);
  return !!d&&(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'))===monthRef();
};
const campaignTasks=(campaign,tasks)=>tasks.filter(t=>String(t?.campaignId||'')===String(campaign?.id||'')||(!t?.campaignId&&norm(t?.project)===norm(campaign?.name)));
const priorityWeight=t=>{
  const p=norm(t?.priority||t?.prioridade);
  return p==='urgente'?4:p==='alta'?3:p==='normal'?2:1;
};
const avatarHtml=(name,photo)=>{
  const initial=String(name||'?').trim().slice(0,1).toUpperCase();
  return photo?'<img class="mg-avatar" src="'+esc(photo)+'" alt="">':'<span class="mg-avatar mg-avatar-fallback">'+esc(initial)+'</span>';
};

async function loadRemote(brand){
  const client=window.AllianceOSAuth?.client;
  const bo=brandObject(brand);
  if(!client||!bo?.id)return {month:null,results:[],profiles:[],shopify:null,shopifyOrders:[]};
  const {year,month}=monthParts();
  const start=monthRef()+'-01T00:00:00-03:00';
  const end=new Date(year,month,0,23,59,59,999).toISOString();
  const monthQ=client.from('planning_months').select('id,brand_id,ano,mes,meta1,meta2,meta3,meta_ativa,ticket_medio_previsto').eq('brand_id',bo.id).eq('ano',year).eq('mes',month).is('arquivado_em',null).maybeSingle();
  const resultQ=client.from('campaign_results').select('campaign_id,brand_id,data,faturamento,investimento,canal,fonte_receita').eq('brand_id',bo.id).gte('data',start).lte('data',end).is('arquivado_em',null);
  const profileQ=client.from('profiles').select('id,nome,foto_url,cargo,area_id,ativo').eq('ativo',true);
  const shopifyRpcQ=client.rpc('get_management_shopify_snapshot',{p_brand_id:bo.id});
  const [m,r,p,s]=await Promise.all([monthQ,resultQ,profileQ,shopifyRpcQ]);
  const rpcShopify=!s.error&&s.data?{
    status:s.data.status||null,
    last_sync_at:s.data.last_sync_at||null,
    last_success_at:s.data.last_success_at||null,
    meta:{
      connector_verified:!!s.data.connected,
      sales_snapshot:s.data.snapshot||null
    }
  }:null;
  if(s.error)console.warn('[AllianceOS Gestão] Shopify RPC indisponível',s.error);
  return {
    month:m.error?null:m.data,
    results:r.error?[]:(r.data||[]),
    profiles:p.error?[]:(p.data||[]),
    shopify:rpcShopify,
    shopifyOrders:[]
  };
}

function activeGoal(month,campaigns,realizedValue){
  const realized=Math.max(0,Number(realizedValue||0));
  if(month){
    const metas=[1,2,3]
      .map(level=>({level,value:Number(month['meta'+level]||0)}))
      .filter(x=>Number.isFinite(x.value)&&x.value>0);
    if(metas.length){
      let target=metas[0];
      for(let i=0;i<metas.length-1;i++){
        if(realized>=metas[i].value)target=metas[i+1];
        else break;
      }
      if(realized>=metas[metas.length-1].value)target=metas[metas.length-1];
      const previous=metas.filter(x=>x.level<target.level&&realized>=x.value).slice(-1)[0]||null;
      return {
        value:target.value,
        level:target.level,
        label:'Meta '+String(target.level).padStart(2,'0'),
        previous,
        all:metas,
        topBeaten:realized>=metas[metas.length-1].value
      };
    }
  }
  const fallback=campaigns.reduce((s,c)=>s+Number(c?.goal||c?.meta||c?.meta_faturamento||0),0);
  return {value:fallback,level:null,label:'Meta da marca',previous:null,all:[],topBeaten:false};
}
function goalTone(progress){
  if(progress>=100)return'success';
  if(progress>=80)return'warning';
  return'neutral';
}
function goalCard(goal,realizedValue){
  const value=Number(goal?.value||0);
  const progress=value>0?(Number(realizedValue||0)/value*100):null;
  const width=progress==null?0:Math.max(0,Math.min(100,progress));
  const tone=goalTone(progress||0);
  let note='Defina as metas do mês no planejamento';
  if(value>0&&goal?.topBeaten){
    note='Meta 03 batida · '+pct(progress)+' do maior alvo';
  }else if(value>0&&goal?.previous){
    note='Meta '+String(goal.previous.level).padStart(2,'0')+' batida · agora mirando '+goal.label;
  }else if(value>0){
    note=(progress==null?'0%':pct(progress))+' da '+goal.label;
  }
  return '<article class="mg-metric mg-goal-card '+tone+'">'+
    '<div class="mg-metric-top"><span>Meta da marca</span><em class="mg-goal-badge">'+esc(goal?.label||'Meta')+' · '+esc(monthLabel())+'</em></div>'+
    '<strong>'+esc(value>0?money(value):'Não definida')+'</strong>'+
    (value>0?'<div class="mg-goal-progress"><i style="width:'+width+'%"></i></div>':'')+
    '<small>'+esc(note)+'</small>'+
  '</article>';
}
function realized(results){return results.reduce((s,r)=>s+Number(r?.faturamento||0),0)}
function shopifyCommerce(remote){
  const integration=remote?.shopify||null;
  const snap=integration?.meta?.sales_snapshot||null;
  const snapCurrent=snap&&String(snap.month||'')===monthRef();
  if(snapCurrent&&Number.isFinite(Number(snap.total_sales_month))){
    return {
      connected:integration?.meta?.connector_verified!==false,
      source:'Shopify',
      value:Number(snap.total_sales_month||0),
      net:Number(snap.net_sales_month||0),
      orders:Number(snap.orders_month||0),
      aov:Number(snap.average_order_value_month||0),
      sessions:Number(snap.sessions_month||0),
      conversion:Number(snap.conversion_rate_month||0),
      capturedAt:snap.captured_at||integration.last_success_at||integration.last_sync_at||null,
      mode:String(snap.source||'shopify')
    };
  }
  const rows=Array.isArray(remote?.shopifyOrders)?remote.shopifyOrders:[];
  if(rows.length){
    const value=rows.reduce((sum,o)=>{
      const status=norm(o?.financial_status);
      if(status==='voided'||status==='cancelled'||status==='cancelado')return sum;
      return sum+Math.max(0,Number(o?.total||0)-Number(o?.refunded_amount||0));
    },0);
    return {
      connected:true,source:'Shopify',value,net:value,orders:rows.length,
      aov:rows.length?value/rows.length:0,sessions:0,conversion:0,
      capturedAt:integration?.last_success_at||integration?.last_sync_at||null,
      mode:'shopify_orders'
    };
  }
  return {
    connected:!!integration?.meta?.connector_verified,
    source:'Shopify',value:null,net:null,orders:0,aov:0,sessions:0,conversion:0,
    capturedAt:integration?.last_success_at||integration?.last_sync_at||null,
    mode:null
  };
}
function syncLabel(at){
  if(!at)return'';
  const d=new Date(at);
  if(Number.isNaN(d.getTime()))return'';
  return 'Atualizado '+new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(d);
}
function linearForecast(value,hasData){
  if(!hasData)return null;
  const {year,month}=monthParts();
  const now=today();
  const selectedIndex=year*12+(month-1);
  const currentIndex=now.getFullYear()*12+now.getMonth();
  if(selectedIndex<currentIndex)return Number(value||0);
  if(selectedIndex>currentIndex)return Number(value||0)>0?Number(value||0):null;
  const elapsed=now.getDate(),days=new Date(year,month,0).getDate();
  return elapsed?Number(value||0)/elapsed*days:null;
}
function topAttention(tasks){
  return tasks.filter(t=>!done(t)).map(t=>{
    const d=parseDate(taskDue(t));
    const days=d?Math.round((d-today())/DAY):999;
    const score=(blocked(t)?60:0)+(days<0?45+Math.min(20,Math.abs(days)*3):days<=1?20:0)+priorityWeight(t)*5;
    const type=blocked(t)?'BLOQUEIO':days<0?'ATRASO':priorityWeight(t)>=4?'CRÍTICO':'ATENÇÃO';
    return {t,score,type,days};
  }).filter(x=>x.score>=20).sort((a,b)=>b.score-a.score).slice(0,5);
}
function campaignProgress(c,tasks){
  const rows=campaignTasks(c,tasks),finished=rows.filter(done).length;
  return {rows,finished,pct:rows.length?Math.round(finished/rows.length*100):Math.max(0,Math.min(100,Number(c?.progress||0)))};
}
function waitingForUser(tasks,deliveries,userName){
  const id=String(window.AllianceOSSession?.profile?.id||'');
  const own=tasks.filter(t=>!done(t)&&(Array.isArray(t.assigneeIds)&&t.assigneeIds.map(String).includes(id)||Array.isArray(t.assignees)&&t.assignees.some(x=>norm(x)===norm(userName))));
  const approval=own.filter(t=>/(aprovar|aprovação|aprovacao|revisar|decidir|orçamento|orcamento)/i.test(String(t.title||''))).slice(0,4);
  if(approval.length)return approval.map(t=>({title:t.title,meta:t.project||t.brand||'',due:taskDue(t),task:t}));
  return deliveries.filter(d=>!d?.archivedAt&&!d?.arquivado_em&&['enviado','aguardando aprovação','aguardando aprovacao'].includes(norm(d?.status))).filter(d=>norm(d?.to)===norm(userName)).slice(0,4).map(d=>({title:d.title||d.taskTitle||'Entrega para aprovação',meta:d.brand||'',due:d.updatedAt||d.createdAt,delivery:d}));
}
function upcoming(tasks,campaigns){
  const start=today(),end=new Date(start);end.setDate(end.getDate()+7);
  const rows=[];
  tasks.filter(t=>!done(t)&&matchesBrand(t,currentBrand())).forEach(t=>{const d=parseDate(taskDue(t));if(d&&d>=start&&d<=end)rows.push({date:d,title:t.title||'Tarefa',meta:t.project||t.brand||'',task:t})});
  campaigns.forEach(c=>{
    const d=parseDate(c.startAt||c.start||c.launch_date);
    if(d&&d>=start&&d<=end)rows.push({date:d,title:(c.type&&/dia d/i.test(c.type)?'Dia D — ':'')+(c.name||'Campanha'),meta:'Campanha',campaign:c});
  });
  return rows.sort((a,b)=>a.date-b.date).slice(0,5);
}
function capacity(tasks,profiles){
  const map=new Map();
  tasks.filter(t=>!done(t)).forEach(t=>{
    const names=Array.isArray(t.assignees)&&t.assignees.length?t.assignees:['Sem responsável'];
    names.forEach(name=>{
      const key=norm(name),x=map.get(key)||{name:String(name).split('|')[0].trim(),score:0,count:0,due:0,urgent:0};
      x.count++;x.score+=priorityWeight(t);if(isOverdue(t)){x.score+=2;x.due++}if(priorityWeight(t)>=4)x.urgent++;map.set(key,x);
    });
  });
  const max=Math.max(8,...[...map.values()].map(x=>x.score));
  return [...map.values()].sort((a,b)=>b.score-a.score).slice(0,3).map(x=>{
    const p=profiles.find(p=>norm(p.nome)===norm(x.name));
    return {...x,photo:p?.foto_url||'',cargo:p?.cargo||'',load:Math.min(100,Math.round(x.score/max*100))};
  });
}
function sectorHealth(tasks){
  const groups=new Map();
  tasks.filter(t=>!done(t)).forEach(t=>{
    const label=String(t.channel||t.canal||t.project||'Operação').split('|')[0].trim()||'Operação';
    const key=norm(label),x=groups.get(key)||{name:label,open:0,overdue:0,blocked:0,score:0};
    x.open++;if(isOverdue(t)){x.overdue++;x.score+=3}if(blocked(t)){x.blocked++;x.score+=5}x.score+=priorityWeight(t);groups.set(key,x);
  });
  return [...groups.values()].sort((a,b)=>b.score-a.score).slice(0,3);
}
function metricCard(label,value,note,kind=''){
  return '<article class="mg-metric '+kind+'"><div class="mg-metric-top"><span>'+esc(label)+'</span></div><strong>'+esc(value)+'</strong><small>'+esc(note||'')+'</small></article>';
}
function empty(text){return '<div class="mg-empty">'+esc(text)+'</div>'}

function renderShell({brand,tasks,campaigns,deliveries,remote}){
  const root=document.getElementById('homeView');if(!root)return;
  const user=firstName();
  const commerce=shopifyCommerce(remote);
  const fallbackReal=realized(remote.results);
  const hasShopify=commerce.value!=null;
  const real=hasShopify?commerce.value:fallbackReal;
  const hasResults=hasShopify||remote.results.length>0;
  const goal=activeGoal(remote.month,campaigns,real);
  const goalValue=Number(goal.value||0);
  const forecast=linearForecast(real,hasResults);
  const gap=goalValue>0&&forecast!=null?forecast-goalValue:null;
  const attention=topAttention(tasks);
  const waiting=waitingForUser(tasks,deliveries,window.AllianceOSSession?.profile?.nome||user);
  const week=upcoming(tasks,campaigns);
  const people=capacity(tasks,remote.profiles);
  const sectors=sectorHealth(tasks);
  const monthCampaigns=campaigns.filter(campaignMonth).sort((a,b)=>String(a.startAt||a.start||'').localeCompare(String(b.startAt||b.start||''))).slice(0,5);
  const completed=goalValue>0?real/goalValue*100:null;

  root.classList.add('management-dashboard-active');
  root.innerHTML=
    '<div class="mg-dashboard" data-management-dashboard>'+
      '<header class="mg-header"><div><h1>Boa '+(new Date().getHours()<12?'dia':new Date().getHours()<18?'tarde':'noite')+', '+esc(user)+'.</h1><p>Visão gerencial da '+esc(brand||'marca')+'.</p></div><div class="mg-context"><span>'+new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(new Date())+'</span><b>'+esc(brand||'Selecione uma marca')+'</b></div></header>'+
      '<section class="mg-metrics">'+
        goalCard(goal,real)+
        metricCard(
          'Realizado',
          hasResults?money(real):(commerce.connected?'Sem vendas no mês':'Shopify não conectada'),
          hasShopify
            ? commerce.orders+' pedidos · ticket '+money(commerce.aov)+' · '+goal.label
            : (remote.results.length?'Resultado do AllianceOS · '+goal.label:'Conecte a Shopify desta marca')
        )+
        metricCard(
          'Forecast',
          forecast!=null?money(forecast):'Não calculado',
          forecast!=null?'Projeção do mês contra '+goal.label:'Disponível após haver vendas no mês'
        )+
        metricCard(
          'GAP',
          gap!=null?money(gap):'—',
          gap!=null
            ? (gap<0?'Forecast '+money(Math.abs(gap))+' abaixo da '+goal.label:'Forecast '+money(gap)+' acima da '+goal.label)
            : (goalValue>0?'Sem realizado para comparar com '+goal.label:'Meta ainda não definida'),
          gap!=null&&gap<0?'risk':''
        )+
      '</section>'+
      '<section class="mg-panel mg-attention"><div class="mg-panel-head"><div><h2>Precisa da sua atenção <span>'+attention.length+'</span></h2><p>Só o que pode impactar a operação desta marca.</p></div><button type="button" data-mg-nav="tasks">Ver todas as tarefas →</button></div>'+
        (attention.length?'<div class="mg-list">'+attention.map(x=>{
          const t=x.t,assignee=Array.isArray(t.assignees)&&t.assignees.length?t.assignees[0]:'Sem responsável';
          return '<button class="mg-row" type="button" data-ini-tarefa="'+esc(t.id||'')+'"><span class="mg-dot '+(x.type==='BLOQUEIO'||x.days<0?'danger':'warn')+'"></span><div class="mg-row-main"><strong>'+esc(t.title||'Tarefa')+'</strong><small>'+esc(t.project||t.brand||'Operação')+' · '+esc(brand)+'</small></div><span class="mg-owner">'+esc(String(assignee).split('|')[0])+'</span><span class="mg-priority">'+esc(x.type)+'</span><span class="mg-date">'+esc(x.days<0?'Atrasada '+Math.abs(x.days)+'d':dateLabel(taskDue(t)))+'</span><span class="mg-chevron">›</span></button>';
        }).join('')+'</div>':empty('Nenhum ponto crítico identificado agora.'))+
      '</section>'+
      '<section class="mg-three">'+
        '<article class="mg-panel"><div class="mg-panel-head compact"><h2>Campanhas da '+esc(brand)+'</h2><button type="button" data-mg-nav="campaigns">Ver todas →</button></div>'+
          (monthCampaigns.length?'<div class="mg-campaigns">'+monthCampaigns.map(c=>{const p=campaignProgress(c,tasks);return '<button type="button" class="mg-campaign" data-ini-campanha="'+esc(c.name||c.id||'')+'"><span class="mg-status-dot"></span><div><strong>'+esc(c.name||'Campanha')+'</strong><small>'+esc(statusLabel(c.status)||'Planejamento')+'</small></div><div class="mg-progress"><i style="width:'+p.pct+'%"></i></div><b>'+p.pct+'%</b></button>'}).join('')+'</div>':empty('Nenhuma campanha desta marca no mês.'))+
        '</article>'+
        '<article class="mg-panel"><div class="mg-panel-head compact"><h2>Esperando você <span>'+waiting.length+'</span></h2><button type="button" data-mg-nav="tasks">Ver todas →</button></div>'+
          (waiting.length?'<div class="mg-simple-list">'+waiting.map(x=>'<button type="button" '+(x.task?'data-ini-tarefa="'+esc(x.task.id||'')+'"':'')+'><span class="mg-iconbox">✓</span><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.meta||brand)+'</small></div><em>'+esc(dateLabel(x.due))+'</em></button>').join('')+'</div>':empty('Nada aguardando uma ação sua.'))+
        '</article>'+
        '<article class="mg-panel"><div class="mg-panel-head compact"><h2>Próximos 7 dias</h2><button type="button" data-mg-nav="tasks">Ver todos →</button></div>'+
          (week.length?'<div class="mg-week">'+week.map(x=>'<button type="button" '+(x.task?'data-ini-tarefa="'+esc(x.task.id||'')+'"':x.campaign?'data-ini-campanha="'+esc(x.campaign.name||x.campaign.id||'')+'"':'')+'><time>'+esc(dateLabel(x.date))+'</time><span class="mg-dot"></span><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.meta||brand)+'</small></div></button>').join('')+'</div>':empty('Nenhum marco relevante nos próximos 7 dias.'))+
        '</article>'+
      '</section>'+
      '<section class="mg-two">'+
        '<article class="mg-panel"><div class="mg-panel-head compact"><h2>Setores em atenção</h2></div>'+
          (sectors.length?'<div class="mg-sector-list">'+sectors.map(s=>'<div><strong>'+esc(s.name)+'</strong><span>'+s.overdue+' atraso(s) · '+s.blocked+' bloqueio(s)</span><em class="'+(s.blocked?'danger':s.overdue?'warn':'')+'">'+(s.blocked?'Atenção':s.overdue?'Observar':'Estável')+'</em></div>').join('')+'</div>':empty('Sem gargalos setoriais identificados.'))+
        '</article>'+
        '<article class="mg-panel"><div class="mg-panel-head compact"><h2>Capacidade da equipe</h2><button type="button" data-mg-nav="organization">Ver equipe →</button></div>'+
          (people.length?'<div class="mg-capacity">'+people.map(p=>'<div>'+avatarHtml(p.name,p.photo)+'<div class="mg-person"><strong>'+esc(p.name)+'</strong><small>'+esc(p.cargo||p.count+' tarefas abertas')+'</small></div><div class="mg-load"><i style="width:'+p.load+'%"></i></div><b>'+p.load+'%</b></div>').join('')+'</div>':empty('Sem tarefas suficientes para calcular capacidade.'))+
        '</article>'+
      '</section>'+
    '</div>';
}
function statusLabel(s){const n=norm(s);if(n.includes('exec')||n.includes('andamento'))return'Em execução';if(n.includes('planej'))return'Planejamento';if(n.includes('concl'))return'Concluída';if(n.includes('risco'))return'Em risco';return String(s||'')}

async function render(){
  if(!isManagement())return;
  const home=document.getElementById('homeView');if(!home)return;
  const brand=currentBrand();
  if(!brand){
    home.classList.add('management-dashboard-active');
    home.innerHTML='<div class="mg-dashboard"><div class="mg-select-brand"><strong>Selecione uma marca</strong><span>A Home gerencial funciona dentro do contexto de cada marca.</span></div></div>';
    return;
  }
  const seq=++refreshSeq;
  const tasks=read(TASK_KEY).filter(t=>!t?.archivedAt&&matchesBrand(t,brand));
  const campaigns=read(CAMPAIGN_KEY).filter(c=>!c?.archivedAt&&norm(c?.brand)===norm(brand));
  const deliveries=read(DELIVERY_KEY).filter(d=>!d?.archivedAt&&!d?.arquivado_em&&(!d?.brand||norm(d.brand)===norm(brand)));
  let remote={month:null,results:[],profiles:[],shopify:null,shopifyOrders:[]};
  try{remote=await loadRemote(brand)}catch(e){console.warn('[AllianceOS Gestão] dados remotos indisponíveis',e)}
  if(seq!==refreshSeq)return;
  renderShell({brand,tasks,campaigns,deliveries,remote});
  lastSignature=[brand,monthRef(),tasks.length,campaigns.length,deliveries.length,remote.results.length,remote.shopify?.last_sync_at||''].join('|');
}

function nav(key){
  const selectors={
    tasks:'[data-key="tasks"],#tasksNav,[href*="#tasks"]',
    campaigns:'[data-key="campaigns"],#campaignsNav,[href*="#campaigns"]',
    organization:'[data-key="organization"],[data-key="organizacao"],#organizationNav'
  };
  document.querySelector(selectors[key]||'')?.click?.();
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-mg-nav]');if(b){e.preventDefault();nav(b.dataset.mgNav)}});
document.addEventListener('change',e=>{if(e.target?.id==='brandSelect')setTimeout(render,20)});
addEventListener('allianceos:planning-month-change',()=>setTimeout(render,20));
document.addEventListener('click',e=>{if(e.target.closest?.('[data-key="home"],#homeNav'))setTimeout(render,50)});
addEventListener('allianceos:auth',()=>setTimeout(render,30));
addEventListener('allianceos:state-ready',()=>setTimeout(render,30));
addEventListener('focus',()=>{if(document.getElementById('homeView'))render()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.getElementById('homeView'))render()});
setInterval(()=>{
  if(!isManagement()||!document.getElementById('homeView'))return;
  const brand=currentBrand(),sig=[brand,monthRef(),localStorage.getItem(TASK_KEY)?.length||0,localStorage.getItem(CAMPAIGN_KEY)?.length||0,localStorage.getItem(DELIVERY_KEY)?.length||0].join('|');
  if(sig!==lastSignature)setTimeout(render,0);
},4000);
setInterval(()=>{if(isManagement()&&document.getElementById('homeView')&&!document.hidden)render()},60000);

(async()=>{try{await window.AllianceOSAuth?.ready}catch{};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(render,40),{once:true});else setTimeout(render,40)})();
})();

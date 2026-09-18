
(() => {
  'use strict';
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>window.user?.id||'vitor-gutierrez';
  const read=(k,fallback=[])=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??fallback}catch{return fallback}};
  const activeBrand=()=>{const v=q('#brandSelect')?.value||'';return /todas/i.test(v)?'':v};
  const isoLocal=(d)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const parse=(s)=>{if(!s)return null;const [y,m,d]=String(s).split('-').map(Number);return y&&m&&d?new Date(y,m-1,d,12):null};
  const dayDiff=(s)=>{const d=parse(s);if(!d)return 9999;const h=new Date();h.setHours(12,0,0,0);return Math.round((d-h)/86400000)};
  const tasks=()=>{const a=read('central.tasks.'+uid(),[]);const b=activeBrand();return (Array.isArray(a)?a:[]).filter(t=>!b||t.brand===b)};
  const campaigns=()=>{const a=read('central.campaigns.'+uid(),[]);const b=activeBrand();return (Array.isArray(a)?a:[]).filter(c=>!b||c.brand===b)};
  const icon=(name)=>{
    const p={
      home:'<rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/>',
      camp:'<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/>',
      deliver:'<path d="M4 8.5h16v9.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5Z"/><path d="M4 9l3-5h10l3 5"/><path d="M8.5 13h2l1.2 2h.6l1.2-2h2"/>',
      auto:'<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m5.6 5.6 2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8"/>',
      bell:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 20h4"/>',
      report:'<path d="M5 19V9M10 19V5M15 19v-7M20 19V3"/>',
      settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1A7 7 0 0 0 14.7 6L14.4 3h-4.8L9.3 6a7 7 0 0 0-1.7 1.1l-2.5-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1A7 7 0 0 0 9.3 18l.3 3h4.8l.3-3a7 7 0 0 0 1.7-1.1l2.5 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p[name]+'</svg>';
  };
  function attentionCount(){
    return tasks().filter(t=>t.status!=='feito'&&t.due&&dayDiff(t.due)<=0).length;
  }
  function buildNav(){
    const side=q('.sidebar'); if(!side)return;
    side.querySelector('.v12-nav')?.remove();
    const nav=document.createElement('nav');nav.className='v12-nav';
    const entries=[
      ['Início','home','homeNav'],
      ['Campanhas','camp','campaignsNav'],
      ['Entregas','deliver','deliveriesNav'],
      ['Automações','auto',null],
      ['Notificações','bell','notificationsBtn'],
      ['Relatórios','report','painelNav'],
      ['Configurações','settings','customizeSidebarBtn']
    ];
    entries.forEach(([label,ic,target],i)=>{
      const b=document.createElement('button');b.type='button';b.className='v12-nav-btn'+(i===0?' active':'');b.dataset.v12Target=target||'';
      b.innerHTML='<span class="v12-nav-icon">'+icon(ic)+'</span><span class="v12-nav-label">'+label+'</span>'+
        (label==='Notificações'&&attentionCount()?'<span class="v12-nav-badge">'+Math.min(attentionCount(),99)+'</span>':'');
      b.addEventListener('click',()=>{
        qa('.v12-nav-btn',nav).forEach(x=>x.classList.remove('active'));b.classList.add('active');
        if(target) document.getElementById(target)?.click();
        else window.showToast?.('Automações · área preparada para a próxima conexão.');
      });
      nav.appendChild(b);
    });
    side.insertBefore(nav,q('.profile',side));
    const brandSub=q('.brandtitle span',side);if(brandSub)brandSub.textContent='Botanika · Revita · VermeFree · Shoty';
  }
  function week(){
    const now=new Date(),day=now.getDay(),delta=day===0?-6:1-day;
    const mon=new Date(now);mon.setHours(12,0,0,0);mon.setDate(now.getDate()+delta);
    return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d});
  }
  const monthName=(d)=>new Intl.DateTimeFormat('pt-BR',{month:'long'}).format(d);
  const dayName=(d)=>['DOM','SEG','TER','QUA','QUI','SEX','SÁB'][d.getDay()];
  const shortDate=(s)=>{const d=parse(s);return d?String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'):'—'};
  function greeting(){
    const h=new Date().getHours();return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
  }
  function realData(){
    const ts=tasks(),open=ts.filter(t=>t.status!=='feito');
    const overdue=open.filter(t=>t.due&&dayDiff(t.due)<0);
    const near=open.filter(t=>t.due&&dayDiff(t.due)>=0&&dayDiff(t.due)<=1);
    const now=new Date();
    const inMonth=ts.filter(t=>{const d=parse(t.due);return d&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});
    const done=inMonth.filter(t=>t.status==='feito');
    const pct=inMonth.length?Math.round(done.length/inMonth.length*100):0;
    return {ts,open,overdue,near,inMonth,done,pct};
  }
  function dayEvents(d,ts,cs){
    const iso=isoLocal(d);const out=[];
    cs.forEach(c=>{
      if(c.start===iso)out.push({type:'camp',text:(c.name||'Campanha')+' · início',name:c.name});
      if(c.end===iso&&c.end!==c.start)out.push({type:'camp',text:(c.name||'Campanha')+' · fecha',name:c.name});
    });
    ts.filter(t=>t.due===iso&&t.status!=='feito').slice(0,2).forEach(t=>out.push({type:'task',text:t.title,id:t.id,over:dayDiff(t.due)<0}));
    return out.slice(0,3);
  }
  function renderHome(){
    const root=q('#homeView');if(!root)return;
    const d=realData(),cs=campaigns(),days=week(),now=new Date();
    const att=[...d.overdue,...d.near].sort((a,b)=>String(a.due).localeCompare(String(b.due))).slice(0,6);
    const currentMonth=cs.filter(c=>{const a=parse(c.start),b=parse(c.end);if(!a||!b)return false;const key=now.getFullYear()*12+now.getMonth();return a.getFullYear()*12+a.getMonth()<=key&&b.getFullYear()*12+b.getMonth()>=key}).slice(0,5);
    const first=days[0],last=days[6];
    root.innerHTML=
      '<div class="v12-home">'+
        '<header class="v12-home-hero"><div class="v12-home-title"><h1>'+greeting()+', Vitor.</h1><p>Veja o que está acontecendo na operação e o que precisa da sua atenção.</p></div><div class="v12-date">'+
        new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(now)+'</div></header>'+
        '<section class="v12-card v12-week"><div class="v12-card-head"><strong>Esta semana · '+String(first.getDate()).padStart(2,'0')+' — '+String(last.getDate()).padStart(2,'0')+' de '+monthName(last)+'</strong><span>prazos e campanhas reais</span></div>'+
          '<div class="v12-week-grid">'+days.map(day=>{
            const ev=dayEvents(day,d.ts,cs);const today=day.toDateString()===now.toDateString();
            return '<div class="v12-day'+(today?' today':'')+'"><div class="v12-day-head"><span>'+dayName(day)+'</span><b>'+String(day.getDate()).padStart(2,'0')+'</b></div>'+
              (ev.length?ev.map(e=>'<button type="button" class="v12-event '+(e.type==='task'?'task ':'')+(e.over?'over':'')+'" '+(e.id?'data-v12-task="'+esc(e.id)+'"':'data-v12-campaign="'+esc(e.name||'')+'"')+'>'+esc(e.text)+'</button>').join(''):'<div class="v12-empty-day">sem marcos</div>')+
            '</div>';
          }).join('')+'</div></section>'+
        '<section class="v12-kpis">'+
          '<div class="v12-card v12-kpi warning"><small>Perto do vencimento</small><strong>'+d.near.length+'</strong><p>vencem hoje ou amanhã</p></div>'+
          '<div class="v12-card v12-kpi danger"><small>Tarefas vencidas</small><strong>'+d.overdue.length+'</strong><p>precisam de ação</p></div>'+
          '<div class="v12-card v12-kpi success"><small>Conclusão no mês</small><strong>'+(d.inMonth.length?d.pct+'%':'0%')+'</strong><p>'+d.done.length+' de '+d.inMonth.length+' tarefas concluídas</p><div class="v12-progress"><i style="width:'+d.pct+'%"></i></div></div>'+
        '</section>'+
        '<section class="v12-home-grid">'+
          '<div class="v12-card v12-list-card"><div class="v12-card-head"><strong>Tarefas que pedem atenção</strong><span>vencidas e próximas do prazo</span></div><div class="v12-attention">'+
            (att.length?att.map(t=>'<div class="v12-row '+(dayDiff(t.due)<0?'over':'')+'" data-v12-task="'+esc(t.id)+'"><i class="v12-dot"></i><div><b>'+esc(t.title)+'</b><span>'+esc((t.assignees||[]).map(x=>String(x).split('|')[0].trim()).join(', ')||'Sem responsável')+' · '+esc(t.brand||'')+' · '+esc(t.project||'Operação')+'</span></div><em class="v12-due">'+(dayDiff(t.due)<0?'vencida · ':'vence · ')+shortDate(t.due)+'</em></div>').join(''):'<div class="v12-empty">Nenhuma tarefa vencida ou vencendo nas próximas 48h.</div>')+
          '</div></div>'+
          '<div class="v12-card v12-campaign-card"><div class="v12-card-head"><strong>Campanhas do mês</strong><span>clique para abrir</span></div><div class="v12-campaigns">'+
            (currentMonth.length?currentMonth.map(c=>{
              const related=d.ts.filter(t=>(!c.brand||!t.brand||c.brand===t.brand)&&t.project===c.name);const done=related.filter(t=>t.status==='feito').length;const pct=related.length?Math.round(done/related.length*100):0;
              return '<div class="v12-campaign" data-v12-campaign="'+esc(c.name||'')+'"><div class="v12-campaign-top"><b>'+esc(c.name||'Campanha')+'</b><span>'+esc(c.brand||'')+'</span></div><div class="v12-bar"><i style="width:'+pct+'%"></i></div><div class="v12-campaign-foot"><span>'+done+' de '+related.length+' tarefas</span><span>'+pct+'%</span></div></div>';
            }).join(''):'<div class="v12-empty">Nenhuma campanha sincronizada neste mês.</div>')+
          '</div></div>'+
        '</section>'+
      '</div>';
  }
  function bind(){
    buildNav();renderHome();
    q('#brandSelect')?.addEventListener('change',()=>{buildNav();renderHome()});
    q('#homeView')?.addEventListener('click',e=>{
      const t=e.target.closest?.('[data-v12-task]');if(t){document.getElementById('tasksNav')?.click();setTimeout(()=>document.querySelector('[data-task-id="'+CSS.escape(t.dataset.v12Task)+'"]')?.click(),80);return}
      const c=e.target.closest?.('[data-v12-campaign]');if(c){if(window.openCampaignWorkspaceByName)window.openCampaignWorkspaceByName(c.dataset.v12Campaign);else document.getElementById('campaignsNav')?.click()}
    });
    window.addEventListener('storage',()=>{renderHome();buildNav()});
    window.addEventListener('alliance-auth-ready',()=>{setTimeout(()=>{renderHome();buildNav()},60)});
    setTimeout(()=>{renderHome();buildNav()},350);
    setTimeout(()=>{renderHome();buildNav()},1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();

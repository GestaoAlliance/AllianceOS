(() => {
  'use strict';

  const CAMP_KEY='central.campaigns.vitor-gutierrez';
  const DRAFT_KEY='ui.alliance.campaignWizardDraft.v2';
  const STEPS=[
    ['base','Dados gerais','Nome, marca e período'],
    ['evento','Evento e fases','Abertura, live e etapas'],
    ['oferta','Oferta e ticket','Mecânica comercial'],
    ['canais','Canais e metas','Verba e faturamento'],
    ['cronograma','Cronograma','Mensagens e ações'],
    ['revisao','Revisão','Conferir e criar']
  ];
  const DEFAULT_CHANNELS=[
    ['Tráfego pago','Meta Ads / mídia paga'],
    ['WhatsApp API','Base com opt-in'],
    ['WhatsApp Grupo VIP','Grupo VIP da campanha'],
    ['WhatsApp grupos antigos','Grupos antigos / ofertas'],
    ['WhatsApp alunos Dr William','Base de alunos do Dr. William'],
    ['E-mail base antiga','Compradores + leads'],
    ['E-mail base captada','Leads captados para a campanha'],
    ['Instagram Feed','Feed orgânico'],
    ['Instagram Stories','Stories orgânicos'],
    ['Influenciadores','Creators / influenciadores'],
    ['Site / LP','Site, landing page, banners e PDPs'],
    ['TikTok Shop','Canal de venda TikTok Shop'],
    ['TikTok Ads','Mídia paga no TikTok']
  ];
  const TYPE_OPTIONS=['Dia D','Lançamento','Semana temática','Grupo VIP','Recompra','Ação de GAP','Conversão e Ticket','Perpétuo','Livre'];
  const STATUS_OPTIONS=['Planejamento','Em preparação','Em execução','Leitura','Concluída'];
  let S=null;
  let layer=null;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const clone=v=>JSON.parse(JSON.stringify(v));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
  const nowIso=()=>new Date().toISOString();
  const id=(p='id')=>p+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const read=()=>{try{const x=JSON.parse(localStorage.getItem(CAMP_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const saveRows=rows=>localStorage.setItem(CAMP_KEY,JSON.stringify(rows));
  const dateRef=v=>String(v||'').slice(0,7);
  const activeBrand=()=>{
    const v=String(document.getElementById('brandSelect')?.value||'').trim();
    return !v||/todas/i.test(v)?'Botanika':v;
  };
  const selectedMonth=()=>{
    const v=String(window.AlliancePlanningMonthRef||'');
    if(/^20\d{2}-(0[1-9]|1[0-2])$/.test(v))return v;
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  };
  const addDays=(iso,days)=>{
    if(!iso)return'';
    const d=new Date(iso+'T12:00:00');
    if(Number.isNaN(d.getTime()))return iso;
    d.setDate(d.getDate()+days);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  };
  const dateBR=iso=>{
    if(!iso)return'—';
    const p=String(iso).slice(0,10).split('-');
    return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:String(iso);
  };
  const dateTimeLabel=(d,t)=>{
    if(!d)return t||'—';
    const b=dateBR(d).slice(0,5);
    return t?b+' · '+t:b;
  };
  const legacyScheduleDate=(label,year)=>{
    const raw=String(label||'');
    const iso=raw.match(/(20\d{2})-(\d{2})-(\d{2})/);
    if(iso)return iso[1]+'-'+iso[2]+'-'+iso[3];
    const br=raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?/);
    if(!br)return'';
    return String(br[3]||year||new Date().getFullYear())+'-'+String(br[2]).padStart(2,'0')+'-'+String(br[1]).padStart(2,'0');
  };
  const legacyScheduleTime=label=>{
    const raw=String(label||'');
    const t=raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if(t)return String(t[1]).padStart(2,'0')+':'+t[2];
    const h=raw.match(/\b(\d{1,2})h(?:(\d{2}))?/i);
    return h?String(h[1]).padStart(2,'0')+':'+(h[2]||'00'):'';
  };
  const pathGet=(obj,path)=>String(path||'').split('.').reduce((o,k)=>o==null?undefined:o[k],obj);
  const pathSet=(obj,path,value)=>{
    const parts=String(path||'').split('.');
    let cur=obj;
    parts.slice(0,-1).forEach(k=>{
      if(cur[k]==null)cur[k]=/^\d+$/.test(parts[parts.indexOf(k)+1]||'')?[]:{};
      cur=cur[k];
    });
    cur[parts[parts.length-1]]=value;
  };
  const section=(c,title)=>{
    const n=norm(title);
    return (Array.isArray(c?.tap)?c.tap:[]).find(x=>norm(x?.title)===n||norm(x?.title).includes(n)||n.includes(norm(x?.title)));
  };
  const sectionRow=(sec,label)=>{
    const n=norm(label);
    return (sec?.rows||[]).find(r=>norm(r?.[0])===n||norm(r?.[0]).includes(n));
  };
  const val=(x,f='')=>x==null||x===''?f:x;

  function brandOptions(){
    const set=new Set(['Botanika','VermeFree','Revita','Shoty']);
    document.querySelectorAll('#brandSelect option').forEach(o=>{
      const v=String(o.value||o.textContent||'').trim();
      if(v&&!/todas/i.test(v))set.add(v);
    });
    return [...set];
  }

  function seedPhases(start,end){
    return[
      {id:id('phase'),nome:'Captação',tem:false,data:addDays(start,-2),data_fim:addDays(start,-2),hora:'',observacoes:''},
      {id:id('phase'),nome:'Antecipação',tem:true,data:addDays(start,-1),data_fim:addDays(start,-1),hora:'',observacoes:''},
      {id:id('phase'),nome:'Abertura / oferta no ar',tem:true,data:start,data_fim:start,hora:'',observacoes:''},
      {id:id('phase'),nome:'Última chance / encerramento',tem:true,data:end,data_fim:end,hora:'23:59',observacoes:''}
    ];
  }

  function seedChannels(existingNames=[]){
    const names=new Set((existingNames||[]).map(norm));
    return DEFAULT_CHANNELS.map(([nome,base])=>({
      id:id('channel'),nome,base,enabled:names.has(norm(nome)),investimento:0,meta_faturamento:0,responsavel:'',custom:false
    }));
  }

  function blankState(noId=null){
    const ref=selectedMonth();
    const start=ref+'-01';
    const end=addDays(start,2);
    return{
      version:2,mode:'create',step:0,campaignId:null,nodeId:noId||null,openedAt:nowIso(),
      basic:{
        name:'',brand:activeBrand(),type:'Lançamento',owner:'',status:'Planejamento',
        start,end,planningStart:addDays(start,-2),objective:'',monthRef:ref
      },
      event:{
        formato:'',observacoes:'',
        liveEnabled:false,liveDate:start,liveTime:'20:00',livePlatform:'Instagram',liveNotes:'',
        activation:'midnight',offerStartDate:start,offerStartTime:'00:00'
      },
      phases:seedPhases(start,end),
      offer:{
        summary:'',cupom_automatico:'',frete:'',brinde:'',bonus_universal:'',bonus_influencer:'',
        deadlineEnabled:false,deadlineDate:end,deadlineTime:'23:59',deadlineBenefit:'',
        firstNEnabled:false,firstN:100,firstNBenefit:'',
        products:[]
      },
      ticket:{enabled:false,strategies:[]},
      channels:seedChannels([]),
      schedule:[],
      noSchedule:false
    };
  }

  function loadFromCampaign(c){
    const t=c?.tapStructured&&typeof c.tapStructured==='object'&&!Array.isArray(c.tapStructured)?c.tapStructured:{};
    const evt=t.sobre_evento||{};
    const off=t.oferta||{};
    const rules=t.regras_oferta||off.regras||{};
    const ticket=t.aumento_ticket||{};
    const oldEvent=section(c,'SOBRE O EVENTO');
    const oldOffer=section(c,'SOBRE A OFERTA');
    const oldTicket=section(c,'AUMENTO DE TICKET MÉDIO');
    const oldPhases=section(c,'FASES');
    const oldMetas=section(c,'METAS');
    const start=String(c.startAt||c.start||evt.inicio||selectedMonth()+'-01').slice(0,10);
    const end=String(c.endAt||c.end||evt.fim||start).slice(0,10);
    const state=blankState(null);
    state.mode='edit';
    state.campaignId=c.id;
    state.basic={
      name:String(c.name||evt.nome||sectionRow(oldEvent,'Nome da Campanha')?.[1]||''),
      brand:String(c.brand||activeBrand()),
      type:String(c.type||evt.tipo||'Livre'),
      owner:String(c.owner||''),
      status:String(c.status||'Planejamento'),
      start,end,
      planningStart:String(evt.inicio_planejamento||c.planningStart||start).slice(0,10),
      objective:String(c.objective||evt.observacoes||''),
      monthRef:String(c.monthRef||dateRef(start)||selectedMonth())
    };
    state.event={
      formato:String(evt.formato||sectionRow(oldEvent,'Formato da campanha')?.[1]||c.objective||''),
      observacoes:String(evt.observacoes||''),
      liveEnabled:Boolean(evt.live?.tem??evt.liveEnabled??false),
      liveDate:String(evt.live?.data||evt.liveDate||start).slice(0,10),
      liveTime:String(evt.live?.hora||evt.liveTime||'20:00').slice(0,5),
      livePlatform:String(evt.live?.plataforma||evt.livePlatform||'Instagram'),
      liveNotes:String(evt.live?.observacoes||evt.liveNotes||''),
      activation:String(evt.abertura_oferta?.modo||evt.activation||'midnight'),
      offerStartDate:String(evt.abertura_oferta?.data||evt.offerStartDate||start).slice(0,10),
      offerStartTime:String(evt.abertura_oferta?.hora||evt.offerStartTime||'00:00').slice(0,5)
    };
    const structuredPhases=Array.isArray(t.fases)?t.fases:[];
    state.phases=(structuredPhases.length?structuredPhases:(oldPhases?.rows||[]).map(r=>({
      nome:String(r[0]||'Etapa'),tem:!/^(nao|não|sem)$/i.test(String(r[1]||'')),data:'',data_fim:'',hora:'',data_legada:String(r[2]||''),observacoes:''
    }))).map(p=>({
      id:p.id||id('phase'),nome:String(p.nome||'Etapa'),tem:p.tem!==false,
      data:String(p.data||'').slice(0,10),data_fim:String(p.data_fim||p.fim||p.data||'').slice(0,10),
      hora:String(p.hora||'').slice(0,5),data_legada:String(p.data_legada||''),observacoes:String(p.observacoes||'')
    }));
    if(!state.phases.length)state.phases=seedPhases(start,end);
    const oldCupom=sectionRow(oldEvent,'Cupom automático')?.[1]||'';
    const oldBonus=sectionRow(oldEvent,'Bônus universal')?.[1]||'';
    const oldInf=sectionRow(oldEvent,'Bônus via influencer')?.[1]||'';
    const oldFrete=sectionRow(oldEvent,'Frete')?.[1]||'';
    const products=Array.isArray(off.produtos)?off.produtos:(Array.isArray(c.products)?c.products.map(p=>({nome:p.name,sku:p.sku||'',preco:p.price||0,desconto:p.discount||0,detalhe:''})):(oldOffer?.rows||[]).filter(r=>r?.[0]&&!/bonus|frete/i.test(String(r[0]))).map(r=>({nome:r[0],detalhe:r[1],desconto:String(r[2]||'').replace(/[^\d,.]/g,''),sku:'',preco:0})));
    state.offer={
      summary:String(off.descricao||c.offer||''),
      cupom_automatico:String(off.cupom_automatico||evt.cupom_automatico||oldCupom),
      frete:String(off.frete||oldFrete),
      brinde:String(off.brinde||''),
      bonus_universal:String(off.bonus_universal||oldBonus).replace(/\s+—\s+.*$/,''),
      bonus_influencer:String(off.bonus_influencer||oldInf).replace(/\s+—\s+.*$/,''),
      deadlineEnabled:Boolean(rules.deadline?.enabled||rules.deadlineEnabled),
      deadlineDate:String(rules.deadline?.data||rules.deadlineDate||end).slice(0,10),
      deadlineTime:String(rules.deadline?.hora||rules.deadlineTime||'23:59').slice(0,5),
      deadlineBenefit:String(rules.deadline?.beneficio||rules.deadlineBenefit||''),
      firstNEnabled:Boolean(rules.first_n?.enabled||rules.firstNEnabled),
      firstN:Number(rules.first_n?.quantidade||rules.firstN||100),
      firstNBenefit:String(rules.first_n?.beneficio||rules.firstNBenefit||''),
      products:(products||[]).map(p=>({id:p.id||id('product'),nome:String(p.nome||p.name||''),sku:String(p.sku||''),preco:Number(p.preco??p.price??0)||0,desconto:Number(String(p.desconto??p.discount??0).replace(',','.'))||0,detalhe:String(p.detalhe||'')}))
    };
    const ticketRows=Array.isArray(ticket.estrategias)?ticket.estrategias:(oldTicket?.rows||[]).map(r=>({nome:r[0],detalhe:r[1],desconto:r[2]}));
    state.ticket={enabled:ticket.tem!==undefined?Boolean(ticket.tem):ticketRows.length>0,strategies:(ticketRows||[]).map(x=>({id:x.id||id('ticket'),nome:String(x.nome||x.estrategia||''),detalhe:String(x.detalhe||''),desconto:String(x.desconto||'')}))};
    const structuredChannels=Array.isArray(t.canais)?t.canais:[];
    const goals=Array.isArray(t.metas_por_fonte)?t.metas_por_fonte:[];
    const channelMap=new Map();
    seedChannels(c.channels||[]).forEach(x=>channelMap.set(norm(x.nome),x));
    (Array.isArray(c.channels)?c.channels:[]).forEach(nome=>{
      const key=norm(nome);
      if(key&&!channelMap.has(key))channelMap.set(key,{id:id('channel'),nome:String(nome),base:'',enabled:true,investimento:0,meta_faturamento:0,responsavel:'',custom:true});
    });
    structuredChannels.forEach(x=>{
      const key=norm(x.nome||x.canal||x.fonte);
      const cur=channelMap.get(key)||{id:id('channel'),nome:String(x.nome||x.canal||x.fonte||''),base:'',enabled:true,investimento:0,meta_faturamento:0,responsavel:'',custom:true};
      Object.assign(cur,{enabled:x.ativo!==false&&x.enabled!==false,base:String(x.base||x.audiencia||cur.base||''),responsavel:String(x.responsavel||cur.responsavel||'')});
      channelMap.set(key,cur);
    });
    goals.forEach(g=>{
      const key=norm(g.fonte||g.canal);
      const cur=channelMap.get(key)||{id:id('channel'),nome:String(g.fonte||g.canal||''),base:'',enabled:true,investimento:0,meta_faturamento:0,responsavel:'',custom:true};
      Object.assign(cur,{enabled:true,investimento:Number(g.investimento||0),meta_faturamento:Number(g.meta_faturamento||0),responsavel:String(g.responsavel||cur.responsavel||'')});
      channelMap.set(key,cur);
    });
    if(!goals.length&&oldMetas){
      (oldMetas.rows||[]).forEach(r=>{
        let m=String(r?.[0]||'').match(/^(Investimento|Meta faturamento)\s*[—-]\s*(.+)$/i);
        if(!m)return;
        const key=norm(m[2]),cur=channelMap.get(key)||{id:id('channel'),nome:m[2],base:'',enabled:true,investimento:0,meta_faturamento:0,responsavel:'',custom:true};
        const n=Number(String(r[1]||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'))||0;
        if(norm(m[1]).includes('invest'))cur.investimento=n;else cur.meta_faturamento=n;
        cur.responsavel=String(r[2]||cur.responsavel||'');cur.enabled=true;channelMap.set(key,cur);
      });
    }
    state.channels=[...channelMap.values()];
    const cron=Array.isArray(t.cronograma)?t.cronograma:[];
    state.schedule=(cron.length?cron:(Array.isArray(c.schedule)?c.schedule.map((r,i)=>Array.isArray(r)?{id:id('schedule'),data:legacyScheduleDate(r[0],String(start).slice(0,4)),hora:legacyScheduleTime(r[0]),canal:r[1],titulo:r[2],conteudo:'',quem_faz:r[3]}:r):[])).map(x=>({
      id:x.id||id('schedule'),data:String(x.data||'').slice(0,10),hora:String(x.hora||'').slice(0,5),
      canal:String(x.canal||''),audiencia:String(x.audiencia||x.base||''),tipo:String(x.tipo||'Mensagem / disparo'),
      titulo:String(x.contexto||x.titulo||x.acao||''),copy:String(x.copy||x.mensagem||x.conteudo||''),
      quantidade:Number(x.quantidade||1)||1,quem_faz:String(x.quem_faz||((x.responsaveis||[]).join(', '))||''),
      template:String(x.template||''),link:String(x.link||x.cta||'')
    }));
    state.noSchedule=Boolean(t.sem_cronograma);
    return state;
  }

  function saveDraft(){
    if(!S||S.mode!=='create')return;
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify({savedAt:nowIso(),state:S}))}catch{}
    const el=layer?.querySelector('[data-draft-state]');
    if(el)el.textContent='Rascunho salvo automaticamente';
  }
  function clearDraft(){try{localStorage.removeItem(DRAFT_KEY)}catch{}}
  function recoverDraft(){
    try{
      const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
      if(!d?.state)return null;
      const age=Date.now()-new Date(d.savedAt||0).getTime();
      if(age>7*86400000){clearDraft();return null}
      return d.state;
    }catch{return null}
  }

  function field(label,bind,value,type='text',cls='span-4',extra=''){
    return '<label class="acw-field '+cls+'"><span>'+esc(label)+'</span><input type="'+type+'" data-bind="'+esc(bind)+'" value="'+esc(value??'')+'" '+extra+'></label>';
  }
  function textarea(label,bind,value,cls='span-12',rows=4){
    return '<label class="acw-field '+cls+'"><span>'+esc(label)+'</span><textarea data-bind="'+esc(bind)+'" rows="'+rows+'">'+esc(value??'')+'</textarea></label>';
  }
  function selectField(label,bind,value,options,cls='span-4',extra=''){
    return '<label class="acw-field '+cls+'"><span>'+esc(label)+'</span><select data-bind="'+esc(bind)+'" '+extra+'>'+options.map(x=>'<option value="'+esc(x)+'" '+(String(x)===String(value)?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>';
  }
  function boolSwitch(label,bind,checked,rerender=true){
    return '<label class="acw-switch"><input type="checkbox" data-bind="'+esc(bind)+'" data-type="bool" '+(checked?'checked':'')+' '+(rerender?'data-rerender="1"':'')+'><span>'+esc(label)+'</span></label>';
  }

  function phaseRows(){
    return '<div class="acw-card-list">'+S.phases.map((p,i)=>
      '<div class="acw-row-card '+(p.tem?'':'off')+'"><div class="acw-row-head"><div>'+boolSwitch('Esta fase existe','phases.'+i+'.tem',p.tem,true)+'</div><div class="acw-row-actions"><button type="button" class="acw-icon-btn" data-action="remove-phase" data-index="'+i+'">Remover</button></div></div>'+
      '<div class="acw-grid">'+
        field('Nome da fase','phases.'+i+'.nome',p.nome,'text','span-4')+
        field('Data inicial','phases.'+i+'.data',p.data,'date','span-2')+
        field('Data final','phases.'+i+'.data_fim',p.data_fim,'date','span-2')+
        field('Horário','phases.'+i+'.hora',p.hora,'time','span-2')+
        textarea('O que acontece nesta fase','phases.'+i+'.observacoes',p.observacoes,'span-12',2)+
      '</div></div>'
    ).join('')+'</div>';
  }

  function productRows(){
    if(!S.offer.products.length)return '<div class="acw-empty">Nenhum produto específico. Você pode deixar a oferta geral ou adicionar produtos, kits e bônus.</div>';
    return '<div class="acw-table-wrap"><table class="acw-table"><thead><tr><th>Produto</th><th>SKU</th><th>Preço</th><th>Desconto %</th><th>Detalhe</th><th></th></tr></thead><tbody>'+
      S.offer.products.map((p,i)=>'<tr>'+
        '<td><input data-bind="offer.products.'+i+'.nome" value="'+esc(p.nome)+'" placeholder="Produto / kit"></td>'+
        '<td class="medium"><input data-bind="offer.products.'+i+'.sku" value="'+esc(p.sku)+'" placeholder="SKU"></td>'+
        '<td class="medium"><input type="number" min="0" step="0.01" data-bind="offer.products.'+i+'.preco" data-type="number" value="'+esc(p.preco)+'"></td>'+
        '<td class="mini"><input type="number" min="0" max="100" step="0.1" data-bind="offer.products.'+i+'.desconto" data-type="number" value="'+esc(p.desconto)+'"></td>'+
        '<td class="wide"><input data-bind="offer.products.'+i+'.detalhe" value="'+esc(p.detalhe)+'" placeholder="Benefício, composição, condição..."></td>'+
        '<td class="mini"><button type="button" class="acw-icon-btn" data-action="remove-product" data-index="'+i+'">Remover</button></td>'+
      '</tr>').join('')+'</tbody></table></div>';
  }

  function ticketRows(){
    if(!S.ticket.enabled)return '<div class="acw-note">Marcado como “não terá estratégia de aumento de ticket”. Isso ficará registrado no TAP.</div>';
    return '<div class="acw-card-list">'+(S.ticket.strategies.length?S.ticket.strategies.map((x,i)=>
      '<div class="acw-row-card"><div class="acw-row-head"><b>Estratégia '+(i+1)+'</b><button type="button" class="acw-icon-btn" data-action="remove-ticket" data-index="'+i+'">Remover</button></div><div class="acw-grid">'+
      field('Estratégia','ticket.strategies.'+i+'.nome',x.nome,'text','span-3')+
      field('Desconto / condição','ticket.strategies.'+i+'.desconto',x.desconto,'text','span-3')+
      textarea('Como funciona','ticket.strategies.'+i+'.detalhe',x.detalhe,'span-6',2)+
      '</div></div>').join(''):'<div class="acw-empty">Adicione Order bump, desconto por volume, frete progressivo, kit, brinde ou outra mecânica.</div>')+'</div>';
  }

  function channelMetrics(){
    const on=S.channels.filter(x=>x.enabled);
    const goal=on.reduce((n,x)=>n+Number(x.meta_faturamento||0),0);
    const budget=on.reduce((n,x)=>n+Number(x.investimento||0),0);
    return{goal,budget,roas:budget?goal/budget:0,count:on.length};
  }
  function channelsTable(){
    return '<div class="acw-table-wrap"><table class="acw-table"><thead><tr><th>Usar</th><th>Canal</th><th>Base / audiência</th><th>Investimento</th><th>Meta faturamento</th><th>Responsável</th><th></th></tr></thead><tbody>'+
      S.channels.map((x,i)=>'<tr>'+
        '<td class="checkcell"><input type="checkbox" data-bind="channels.'+i+'.enabled" data-type="bool" '+(x.enabled?'checked':'')+'></td>'+
        '<td class="medium"><input data-bind="channels.'+i+'.nome" value="'+esc(x.nome)+'"></td>'+
        '<td class="wide"><input data-bind="channels.'+i+'.base" value="'+esc(x.base)+'" placeholder="Ex.: base com opt-in"></td>'+
        '<td class="medium"><input type="number" min="0" step="0.01" data-bind="channels.'+i+'.investimento" data-type="number" value="'+esc(x.investimento||0)+'"></td>'+
        '<td class="medium"><input type="number" min="0" step="0.01" data-bind="channels.'+i+'.meta_faturamento" data-type="number" value="'+esc(x.meta_faturamento||0)+'"></td>'+
        '<td class="medium"><input data-bind="channels.'+i+'.responsavel" value="'+esc(x.responsavel)+'" placeholder="Responsável"></td>'+
        '<td class="mini">'+(x.custom?'<button type="button" class="acw-icon-btn" data-action="remove-channel" data-index="'+i+'">Remover</button>':'')+'</td>'+
      '</tr>').join('')+'</tbody></table></div>';
  }

  function scheduleCard(x,i){
    const channelOptions=S.channels.filter(c=>c.enabled).map(c=>c.nome);
    const opts=[...new Set([...channelOptions,x.canal].filter(Boolean))];
    return '<div class="acw-schedule-card"><div class="acw-schedule-top">'+
      '<label><span>Data</span><input type="date" data-bind="schedule.'+i+'.data" value="'+esc(x.data)+'"></label>'+
      '<label><span>Hora</span><input type="time" data-bind="schedule.'+i+'.hora" value="'+esc(x.hora)+'"></label>'+
      '<label><span>Canal</span><select data-bind="schedule.'+i+'.canal"><option value="">Selecione</option>'+opts.map(o=>'<option '+(o===x.canal?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select></label>'+
      '<label><span>Público / base</span><input data-bind="schedule.'+i+'.audiencia" value="'+esc(x.audiencia)+'" placeholder="VIP, alunos, base antiga..."></label>'+
      '<label><span>Quantidade</span><input type="number" min="1" step="1" data-bind="schedule.'+i+'.quantidade" data-type="number" value="'+esc(x.quantidade||1)+'"></label>'+
    '</div><div class="acw-grid" style="margin-top:9px">'+
      selectField('Tipo','schedule.'+i+'.tipo',x.tipo,['Mensagem / disparo','Post / story','Live','Site / LP','Criativo / anúncio','Outro'],'span-3')+
      field('Contexto / objetivo','schedule.'+i+'.titulo',x.titulo,'text','span-6','placeholder="Ex.: abertura, prova social, última chance"')+
      field('Responsável','schedule.'+i+'.quem_faz',x.quem_faz,'text','span-3')+
      textarea('Copy, briefing ou orientação desta ação','schedule.'+i+'.copy',x.copy,'span-8',3)+
      field('Template / CTA / link','schedule.'+i+'.link',x.link,'text','span-3')+
      '<div class="acw-field span-12"><button type="button" class="acw-schedule-remove" data-action="remove-schedule" data-index="'+i+'">Remover esta ação</button></div>'+
    '</div></div>';
  }

  function scheduleMetrics(){
    const qty=S.schedule.reduce((n,x)=>n+Math.max(1,Number(x.quantidade||1)),0);
    const days=new Set(S.schedule.map(x=>x.data).filter(Boolean)).size;
    const channels=new Set(S.schedule.map(x=>x.canal).filter(Boolean)).size;
    return{qty,days,channels};
  }

  function renderPanel(){
    const key=STEPS[S.step][0];
    if(key==='base'){
      return '<div class="acw-panel active"><section class="acw-section"><div class="acw-section-head"><div><h3>Identificação da campanha</h3><p>Estes dados definem a campanha e o mês ao qual ela pertence.</p></div></div><div class="acw-grid">'+
        field('Nome da campanha','basic.name',S.basic.name,'text','span-6','required placeholder="Ex.: Lançamento NAC / Dia D Kids"')+
        selectField('Marca','basic.brand',S.basic.brand,brandOptions(),'span-3')+
        selectField('Formato','basic.type',S.basic.type,TYPE_OPTIONS,'span-3')+
        field('Responsável geral','basic.owner',S.basic.owner,'text','span-4','placeholder="Nome do responsável"')+
        selectField('Status inicial','basic.status',S.basic.status,STATUS_OPTIONS,'span-4')+
        field('Mês do planejamento','basic.monthRef',S.basic.monthRef,'month','span-4')+
        field('Início da venda / campanha','basic.start',S.basic.start,'date','span-3')+
        field('Fim da venda / campanha','basic.end',S.basic.end,'date','span-3')+
        field('Início da antecipação / preparação','basic.planningStart',S.basic.planningStart,'date','span-3')+
        textarea('Objetivo e contexto da campanha','basic.objective',S.basic.objective,'span-12',4)+
      '</div></section><section class="acw-section"><div class="acw-note">O cronograma pode começar antes da venda e terminar depois. Nenhuma campanha antiga será alterada ao criar uma nova.</div></section></div>';
    }
    if(key==='evento'){
      const activation=['midnight','live','custom','campaign_start'];
      return '<div class="acw-panel active"><section class="acw-section"><div class="acw-section-head"><div><h3>Sobre o evento</h3><p>Defina como a campanha abre e qual é o momento crítico da oferta.</p></div></div><div class="acw-grid">'+
        field('Formato / descrição do evento','event.formato',S.event.formato,'text','span-6','placeholder="Ex.: lançamento com live, Dia D de 1 dia..."')+
        '<label class="acw-field span-6"><span>Quando a oferta entra no ar?</span><select data-bind="event.activation" data-rerender="1">'+
          '<option value="midnight" '+(S.event.activation==='midnight'?'selected':'')+'>Na virada de 00h</option>'+
          '<option value="live" '+(S.event.activation==='live'?'selected':'')+'>Somente durante / a partir da live</option>'+
          '<option value="custom" '+(S.event.activation==='custom'?'selected':'')+'>Data e horário específicos</option>'+
          '<option value="campaign_start" '+(S.event.activation==='campaign_start'?'selected':'')+'>No início da campanha</option>'+
        '</select></label>'+
        field('Data em que a oferta entra','event.offerStartDate',S.event.offerStartDate,'date','span-3')+
        field('Horário','event.offerStartTime',S.event.offerStartTime,'time','span-3')+
        '<div class="acw-field span-6"><span>Live de lançamento</span>'+boolSwitch('Terá live', 'event.liveEnabled',S.event.liveEnabled,true)+'</div>'+
        (S.event.liveEnabled?field('Data da live','event.liveDate',S.event.liveDate,'date','span-3')+field('Hora da live','event.liveTime',S.event.liveTime,'time','span-3')+field('Plataforma','event.livePlatform',S.event.livePlatform,'text','span-3')+field('Observação da live','event.liveNotes',S.event.liveNotes,'text','span-3'):'')+
        textarea('Observações e decisões importantes','event.observacoes',S.event.observacoes,'span-12',3)+
      '</div></section><section class="acw-section"><div class="acw-section-head"><div><h3>Fases</h3><p>Marque explicitamente se cada fase existe, escolha os dias e adicione qualquer fase fora do padrão.</p></div><button type="button" data-action="add-phase">+ Fase</button></div>'+phaseRows()+'</section></div>';
    }
    if(key==='oferta'){
      return '<div class="acw-panel active"><section class="acw-section"><div class="acw-section-head"><div><h3>Sobre a oferta</h3><p>Registre a mecânica completa, inclusive bônus, frete e escassez.</p></div></div><div class="acw-grid">'+
        textarea('Resumo da oferta','offer.summary',S.offer.summary,'span-12',3)+
        field('Cupom / desconto automático','offer.cupom_automatico',S.offer.cupom_automatico,'text','span-4')+
        field('Frete','offer.frete',S.offer.frete,'text','span-4')+
        field('Brinde','offer.brinde',S.offer.brinde,'text','span-4')+
        field('Bônus universal','offer.bonus_universal',S.offer.bonus_universal,'text','span-6')+
        field('Bônus via influencer','offer.bonus_influencer',S.offer.bonus_influencer,'text','span-6')+
      '</div></section><section class="acw-section"><div class="acw-section-head"><div><h3>Regras de escassez</h3><p>Pode usar horário, primeiros pedidos ou os dois ao mesmo tempo.</p></div></div><div class="acw-grid">'+
        '<div class="acw-field span-12">'+boolSwitch('Benefício / oferta com prazo ou horário limite','offer.deadlineEnabled',S.offer.deadlineEnabled,true)+'</div>'+
        (S.offer.deadlineEnabled?field('Data limite','offer.deadlineDate',S.offer.deadlineDate,'date','span-3')+field('Hora limite','offer.deadlineTime',S.offer.deadlineTime,'time','span-3')+field('O que termina / muda nesse horário','offer.deadlineBenefit',S.offer.deadlineBenefit,'text','span-6'):'')+
        '<div class="acw-field span-12">'+boolSwitch('Benefício limitado aos primeiros pedidos','offer.firstNEnabled',S.offer.firstNEnabled,true)+'</div>'+
        (S.offer.firstNEnabled?field('Quantidade de primeiros pedidos','offer.firstN',S.offer.firstN,'number','span-3','min="1" data-type="number"')+field('Benefício desses primeiros pedidos','offer.firstNBenefit',S.offer.firstNBenefit,'text','span-9'):'')+
      '</div></section><section class="acw-section"><div class="acw-section-head"><div><h3>Produtos, kits e itens da oferta</h3><p>Opcional para ofertas gerais. Adicione quantos forem necessários.</p></div><button type="button" data-action="add-product">+ Produto</button></div>'+productRows()+'</section>'+
      '<section class="acw-section"><div class="acw-section-head"><div><h3>Aumento de ticket médio</h3><p>Registre se haverá estratégia e, se houver, quais serão as mecânicas.</p></div>'+boolSwitch('Terá estratégia','ticket.enabled',S.ticket.enabled,true)+'</div>'+ticketRows()+(S.ticket.enabled?'<div style="margin-top:10px"><button type="button" class="acw-inline-add" data-action="add-ticket">+ Estratégia</button></div>':'')+'</section></div>';
    }
    if(key==='canais'){
      const m=channelMetrics();
      return '<div class="acw-panel active"><section class="acw-section"><div class="acw-section-head"><div><h3>Canais, verba e meta de faturamento</h3><p>Ative somente os canais usados nesta campanha. É possível criar um novo do zero.</p></div><button type="button" data-action="add-channel">+ Canal</button></div>'+
        '<div class="acw-metrics" data-channel-metrics><div class="acw-metric"><small>Meta somada</small><b data-total-goal>'+money(m.goal)+'</b><span>'+m.count+' canais ativos</span></div><div class="acw-metric"><small>Investimento</small><b data-total-budget>'+money(m.budget)+'</b><span>verba prevista</span></div><div class="acw-metric"><small>ROAS alvo</small><b data-total-roas>'+(m.roas?m.roas.toFixed(2).replace('.',','):'—')+'</b><span>meta ÷ investimento</span></div></div>'+channelsTable()+'</section></div>';
    }
    if(key==='cronograma'){
      const m=scheduleMetrics();
      return '<div class="acw-panel active"><section class="acw-section"><div class="acw-section-head"><div><h3>Cronograma completo</h3><p>Cadastre cada mensagem ou ação com dia, hora, canal, público, quantidade e contexto.</p></div>'+boolSwitch('Esta campanha não terá cronograma','noSchedule',S.noSchedule,true)+'</div>'+
        (S.noSchedule?'<div class="acw-note">Ficará registrado explicitamente que a campanha não terá cronograma de comunicação.</div>':
        '<div class="acw-metrics"><div class="acw-metric"><small>Mensagens / ações</small><b>'+m.qty+'</b><span>soma das quantidades</span></div><div class="acw-metric"><small>Dias usados</small><b>'+m.days+'</b><span>datas com ação</span></div><div class="acw-metric"><small>Canais</small><b>'+m.channels+'</b><span>canais no cronograma</span></div></div>'+
        '<div class="acw-quick"><button type="button" data-quick-channel="WhatsApp API">+ API</button><button type="button" data-quick-channel="WhatsApp Grupo VIP">+ Grupo VIP</button><button type="button" data-quick-channel="WhatsApp grupos antigos">+ Grupos antigos</button><button type="button" data-quick-channel="WhatsApp alunos Dr William">+ Alunos Dr William</button><button type="button" data-quick-channel="E-mail base antiga">+ E-mail</button><button type="button" data-quick-channel="Instagram Stories">+ Stories</button><button type="button" data-quick-channel="Instagram Feed">+ Feed</button><button type="button" data-quick-channel="Live">+ Live</button><button type="button" data-quick-channel="Site / LP">+ Site / LP</button><button type="button" data-action="add-schedule">+ Outro</button></div>'+
        '<div class="acw-schedule-list">'+(S.schedule.length?S.schedule.map(scheduleCard).join(''):'<div class="acw-empty">Nenhuma mensagem cadastrada ainda. Use os atalhos acima para montar o cronograma.</div>')+'</div>')+
      '</section></div>';
    }
    const metrics=channelMetrics(),sched=scheduleMetrics();
    const live=S.event.liveEnabled?'Sim · '+dateTimeLabel(S.event.liveDate,S.event.liveTime):'Não';
    const opening=S.event.activation==='live'?'Na live':S.event.activation==='midnight'?'Virada de 00h':S.event.activation==='custom'?dateTimeLabel(S.event.offerStartDate,S.event.offerStartTime):'Início da campanha';
    const warnings=[];
    if(!S.channels.some(x=>x.enabled))warnings.push('Nenhum canal foi ativado.');
    if(!S.noSchedule&&!S.schedule.length)warnings.push('Cronograma ainda está vazio.');
    if(!S.offer.summary&&!S.offer.cupom_automatico)warnings.push('A oferta ainda não tem resumo ou condição principal.');
    return '<div class="acw-panel active"><div class="acw-summary"><section class="acw-section"><div class="acw-section-head"><div><h3>Conferência final</h3><p>O sistema criará campanha, TAP estruturado e cronograma sem apagar campanhas ou dados existentes.</p></div></div><div class="acw-summary-list">'+
      '<div class="acw-summary-line"><span>Campanha</span><b>'+esc(S.basic.name||'—')+'</b></div>'+
      '<div class="acw-summary-line"><span>Marca / tipo</span><b>'+esc(S.basic.brand)+' · '+esc(S.basic.type)+'</b></div>'+
      '<div class="acw-summary-line"><span>Venda</span><b>'+dateBR(S.basic.start)+' — '+dateBR(S.basic.end)+'</b></div>'+
      '<div class="acw-summary-line"><span>Antecipação começa</span><b>'+dateBR(S.basic.planningStart)+'</b></div>'+
      '<div class="acw-summary-line"><span>Live</span><b>'+esc(live)+'</b></div>'+
      '<div class="acw-summary-line"><span>Oferta entra</span><b>'+esc(opening)+'</b></div>'+
      '<div class="acw-summary-line"><span>Fases ativas</span><b>'+S.phases.filter(x=>x.tem).length+'</b></div>'+
      '<div class="acw-summary-line"><span>Canais ativos</span><b>'+S.channels.filter(x=>x.enabled).length+'</b></div>'+
      '<div class="acw-summary-line"><span>Meta / investimento</span><b>'+money(metrics.goal)+' / '+money(metrics.budget)+'</b></div>'+
      '<div class="acw-summary-line"><span>Cronograma</span><b>'+(S.noSchedule?'Sem cronograma':sched.qty+' ações em '+sched.days+' dias')+'</b></div>'+
      '</div></section><aside><section class="acw-section"><div class="acw-section-head"><div><h3>O que será salvo</h3><p>Estrutura canônica e compatibilidade com as telas atuais.</p></div></div><div class="acw-summary-list"><div class="acw-summary-line"><span>Sobre o evento</span><b>Sim</b></div><div class="acw-summary-line"><span>Fases</span><b>Sim</b></div><div class="acw-summary-line"><span>Oferta e escassez</span><b>Sim</b></div><div class="acw-summary-line"><span>Aumento de ticket</span><b>Sim</b></div><div class="acw-summary-line"><span>Metas por canal</span><b>Sim</b></div><div class="acw-summary-line"><span>Cronograma detalhado</span><b>Sim</b></div><div class="acw-summary-line"><span>TAP legado</span><b>Sincronizado</b></div></div></section>'+
      (warnings.length?'<div class="acw-warning" style="margin-top:12px">'+warnings.map(x=>'• '+esc(x)).join('<br>')+'</div>':'<div class="acw-note" style="margin-top:12px">Tudo pronto para salvar.</div>')+
      '</aside></div></div>';
  }

  function render(){
    if(!S)return;
    if(!layer){
      layer=document.createElement('div');
      layer.className='alliance-campaign-wizard-layer';
      document.body.appendChild(layer);
    }
    const meta=STEPS[S.step];
    layer.innerHTML='<div class="alliance-campaign-wizard-backdrop"></div><section class="alliance-campaign-wizard" role="dialog" aria-modal="true">'+
      '<aside class="acw-side"><div class="acw-brand"><small>ALLIANCEOS · CAMPANHAS</small><b>'+(S.mode==='edit'?'Editar campanha':'Nova campanha')+'</b><span>Preencha a estratégia inteira antes da execução.</span></div><div class="acw-steps">'+
      STEPS.map((x,i)=>'<button type="button" class="acw-step '+(i===S.step?'active ':'')+(i<S.step?'done':'')+'" data-step="'+i+'"><span class="acw-step-index">'+(i+1)+'</span><span><b>'+esc(x[1])+'</b><span>'+esc(x[2])+'</span></span></button>').join('')+
      '</div><div class="acw-draft" data-draft-state>'+(S.mode==='create'?'Rascunho salvo automaticamente':'Alterações só são gravadas ao concluir')+'</div></aside>'+
      '<main class="acw-main"><header class="acw-head"><div><small>ETAPA '+(S.step+1)+' DE '+STEPS.length+'</small><h2>'+esc(meta[1])+'</h2><p>'+esc(meta[2])+'</p></div><button type="button" class="acw-close" data-action="close" aria-label="Fechar">×</button></header><div class="acw-body">'+renderPanel()+'</div>'+
      '<footer class="acw-foot"><div class="acw-foot-left"><span>'+esc(S.basic.brand||'')+'</span><span>·</span><span>'+esc(S.basic.monthRef||'')+'</span></div><div class="acw-foot-actions">'+(S.step?'<button type="button" class="acw-btn" data-action="prev">Voltar</button>':'')+'<button type="button" class="acw-btn" data-action="close">'+(S.mode==='create'?'Salvar rascunho e fechar':'Fechar sem salvar')+'</button><button type="button" class="acw-btn primary" data-action="'+(S.step===STEPS.length-1?'finish':'next')+'">'+(S.step===STEPS.length-1?(S.mode==='edit'?'Salvar campanha':'Criar campanha'):'Continuar')+'</button></div></footer></main></section>';
    bind();
  }

  function updateChannelMetricDom(){
    if(!layer)return;
    const m=channelMetrics();
    const a=layer.querySelector('[data-total-goal]'),b=layer.querySelector('[data-total-budget]'),r=layer.querySelector('[data-total-roas]');
    if(a)a.textContent=money(m.goal);if(b)b.textContent=money(m.budget);if(r)r.textContent=m.roas?m.roas.toFixed(2).replace('.',','):'—';
  }

  function bind(){
    layer.querySelectorAll('[data-bind]').forEach(el=>{
      const apply=()=>{
        let v;
        if(el.dataset.type==='bool')v=!!el.checked;
        else if(el.dataset.type==='number'||el.type==='number')v=Number(el.value||0);
        else v=el.value;
        pathSet(S,el.dataset.bind,v);
        if(el.dataset.bind==='basic.start'){
          if(!S.basic.end||S.basic.end<S.basic.start)S.basic.end=S.basic.start;
          if(!S.event.offerStartDate)S.event.offerStartDate=S.basic.start;
        }
        if(el.dataset.bind.startsWith('channels.'))updateChannelMetricDom();
        saveDraft();
        if(el.dataset.rerender==='1')render();
      };
      el.addEventListener('input',apply);
      el.addEventListener('change',apply);
    });
    layer.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{
      const to=Number(b.dataset.step);
      if(to>S.step){
        const err=validateStep(S.step);
        if(err){toast(err);return}
      }
      S.step=to;saveDraft();render();
    }));
    layer.querySelectorAll('[data-quick-channel]').forEach(b=>b.addEventListener('click',()=>addSchedule(b.dataset.quickChannel)));
    layer.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.action,i=Number(b.dataset.index);
      if(a==='close'){saveDraft();close();return}
      if(a==='prev'){S.step=Math.max(0,S.step-1);render();return}
      if(a==='next'){const e=validateStep(S.step);if(e){toast(e);return}S.step=Math.min(STEPS.length-1,S.step+1);saveDraft();render();return}
      if(a==='finish'){finish();return}
      if(a==='add-phase'){S.phases.push({id:id('phase'),nome:'Nova fase',tem:true,data:S.basic.start,data_fim:S.basic.start,hora:'',observacoes:''});render();return}
      if(a==='remove-phase'){S.phases.splice(i,1);render();return}
      if(a==='add-product'){S.offer.products.push({id:id('product'),nome:'',sku:'',preco:0,desconto:0,detalhe:''});render();return}
      if(a==='remove-product'){S.offer.products.splice(i,1);render();return}
      if(a==='add-ticket'){S.ticket.strategies.push({id:id('ticket'),nome:'',detalhe:'',desconto:''});render();return}
      if(a==='remove-ticket'){S.ticket.strategies.splice(i,1);render();return}
      if(a==='add-channel'){S.channels.push({id:id('channel'),nome:'Novo canal',base:'',enabled:true,investimento:0,meta_faturamento:0,responsavel:'',custom:true});render();return}
      if(a==='remove-channel'){S.channels.splice(i,1);render();return}
      if(a==='add-schedule'){addSchedule('');return}
      if(a==='remove-schedule'){S.schedule.splice(i,1);render();return}
    }));
  }

  function addSchedule(channel){
    const ch=S.channels.find(x=>norm(x.nome)===norm(channel));
    S.schedule.push({
      id:id('schedule'),data:S.basic.start,hora:'',canal:channel||'',audiencia:ch?.base||'',tipo:channel==='Live'?'Live':'Mensagem / disparo',
      titulo:'',copy:'',quantidade:1,quem_faz:ch?.responsavel||'',template:'',link:''
    });
    render();
    setTimeout(()=>layer?.querySelector('.acw-schedule-card:last-child')?.scrollIntoView({behavior:'smooth',block:'center'}),30);
  }

  function validateStep(step){
    if(step===0){
      if(!String(S.basic.name||'').trim())return'Digite o nome da campanha.';
      if(!S.basic.brand)return'Selecione a marca.';
      if(!S.basic.start||!S.basic.end)return'Preencha início e fim da campanha.';
      if(S.basic.end<S.basic.start)return'A data final não pode ser anterior ao início.';
      if(!S.basic.planningStart)S.basic.planningStart=S.basic.start;
    }
    if(step===1){
      if(S.event.liveEnabled&&(!S.event.liveDate||!S.event.liveTime))return'Preencha data e hora da live.';
      if(S.event.activation==='live'&&!S.event.liveEnabled)return'Você marcou que a oferta entra na live, mas a live está desativada.';
      if(!S.phases.length)return'Adicione pelo menos uma fase, mesmo que seja marcada como “não tem”.';
    }
    if(step===3){
      if(!S.channels.some(x=>x.enabled))return'Ative pelo menos um canal para esta campanha.';
      if(S.channels.some(x=>x.enabled&&!String(x.nome||'').trim()))return'Existe um canal ativo sem nome.';
    }
    if(step===4){
      if(!S.noSchedule&&!S.schedule.length)return'Cadastre o cronograma ou marque explicitamente que a campanha não terá cronograma.';
      if(!S.noSchedule&&S.schedule.some(x=>!x.data||!x.canal||!x.titulo))return'No cronograma, cada ação precisa ter data, canal e contexto / objetivo.';
    }
    return'';
  }
  function validateAll(){
    for(let i=0;i<5;i++){const e=validateStep(i);if(e){S.step=i;render();return e}}
    return'';
  }

  function scheduleStructured(){
    return S.noSchedule?[]:S.schedule.map((x,i)=>{
      const q=Math.max(1,Number(x.quantidade||1));
      const title=(q>1?q+'x · ':'')+String(x.titulo||'Ação');
      const body=[x.audiencia?'Público: '+x.audiencia:'',x.copy].filter(Boolean).join('\n\n');
      return{
        id:x.id||id('cron'),data:x.data,hora:x.hora||'',periodo:dateTimeLabel(x.data,x.hora),
        canal:x.canal,tipo:x.tipo||'Mensagem / disparo',titulo:title,acao:title,contexto:x.titulo||'',
        conteudo:body,copy:x.copy||'',audiencia:x.audiencia||'',quantidade:q,
        quem_faz:x.quem_faz||'',responsaveis:x.quem_faz?[x.quem_faz]:[],
        template:x.template||'',link:x.link||'',cta:x.link||'',origem:'interface',atualizado_em:nowIso()
      };
    });
  }

  function teamStructured(){
    const map=new Map();
    const add=(quem,resp)=>{
      const k=norm(quem);if(!k)return;
      if(!map.has(k))map.set(k,{quem:String(quem).trim(),responsabilidade:resp});
      else if(resp&&!String(map.get(k).responsabilidade).includes(resp))map.get(k).responsabilidade+=' · '+resp;
    };
    add(S.basic.owner,'Responsável geral');
    S.channels.filter(x=>x.enabled).forEach(x=>add(x.responsavel,'Canal: '+x.nome));
    S.schedule.forEach(x=>add(x.quem_faz,'Cronograma'));
    return[...map.values()];
  }

  function structured(){
    const channels=S.channels.filter(x=>x.enabled);
    const goals=channels.map(x=>({
      fonte:x.nome,meta_faturamento:Number(x.meta_faturamento||0),investimento:Number(x.investimento||0),
      roas_alvo:Number(x.investimento||0)?Number(x.meta_faturamento||0)/Number(x.investimento||0):null,
      responsavel:x.responsavel||'',base:x.base||''
    }));
    const cron=scheduleStructured();
    return{
      sobre_evento:{
        nome:S.basic.name,tipo:S.basic.type,formato:S.event.formato||S.basic.objective,
        inicio:S.basic.start,fim:S.basic.end,inicio_planejamento:S.basic.planningStart,observacoes:S.event.observacoes||S.basic.objective,
        live:{tem:S.event.liveEnabled,data:S.event.liveDate,hora:S.event.liveTime,plataforma:S.event.livePlatform,observacoes:S.event.liveNotes},
        abertura_oferta:{modo:S.event.activation,data:S.event.offerStartDate,hora:S.event.offerStartTime},
        cupom_automatico:S.offer.cupom_automatico
      },
      fases:S.phases.map(p=>({
        id:p.id,nome:p.nome,tem:p.tem!==false,data:p.data||'',data_fim:p.data_fim||p.data||'',hora:p.hora||'',
        data_legada:p.tem===false?'—':dateTimeLabel(p.data,p.hora),observacoes:p.observacoes||''
      })),
      oferta:{
        descricao:S.offer.summary,cupom_automatico:S.offer.cupom_automatico,frete:S.offer.frete,brinde:S.offer.brinde,
        bonus_universal:S.offer.bonus_universal,bonus_influencer:S.offer.bonus_influencer,
        produtos:S.offer.products.map(p=>({id:p.id,nome:p.nome,sku:p.sku,preco:Number(p.preco||0),desconto:Number(p.desconto||0),detalhe:p.detalhe||''}))
      },
      regras_oferta:{
        activation:{modo:S.event.activation,data:S.event.offerStartDate,hora:S.event.offerStartTime},
        deadline:{enabled:S.offer.deadlineEnabled,data:S.offer.deadlineDate,hora:S.offer.deadlineTime,beneficio:S.offer.deadlineBenefit},
        first_n:{enabled:S.offer.firstNEnabled,quantidade:Number(S.offer.firstN||0),beneficio:S.offer.firstNBenefit}
      },
      aumento_ticket:{tem:S.ticket.enabled,estrategias:S.ticket.enabled?S.ticket.strategies.map(x=>({id:x.id,nome:x.nome,detalhe:x.detalhe,desconto:x.desconto})):[]},
      canais:channels.map(x=>({id:x.id,nome:x.nome,base:x.base,ativo:true,responsavel:x.responsavel})),
      metas_por_fonte:goals,
      equipe:teamStructured(),
      cronograma:cron,
      sem_cronograma:Boolean(S.noSchedule)
    };
  }

  function generatedTap(st){
    const goals=st.metas_por_fonte||[];
    const goal=goals.reduce((n,x)=>n+Number(x.meta_faturamento||0),0);
    const budget=goals.reduce((n,x)=>n+Number(x.investimento||0),0);
    const event=st.sobre_evento||{},offer=st.oferta||{},rules=st.regras_oferta||{};
    const eventRows=[
      ['Nome da Campanha',S.basic.name],
      ['Formato da campanha',event.formato||S.basic.type],
      ['Período',dateBR(S.basic.start)+' a '+dateBR(S.basic.end)],
      ['Início da antecipação',dateBR(S.basic.planningStart)],
      ['Oferta entra no ar',S.event.activation==='live'?'Na live · '+dateTimeLabel(S.event.liveDate,S.event.liveTime):dateTimeLabel(S.event.offerStartDate,S.event.offerStartTime)],
      ['Live de lançamento',S.event.liveEnabled?'Sim · '+dateTimeLabel(S.event.liveDate,S.event.liveTime)+' · '+S.event.livePlatform:'não tem'],
      ['Cupom automático',offer.cupom_automatico||'—'],
      ['Bônus universal',offer.bonus_universal||'—'],
      ['Bônus via influencer',offer.bonus_influencer||'—'],
      ['Frete',offer.frete||'—']
    ];
    const offerRows=offer.produtos.length?offer.produtos.map(p=>[p.nome,p.detalhe||((p.sku?'SKU '+p.sku+' · ':'')+(p.preco?money(p.preco):'')),p.desconto?p.desconto+'% OFF':'—']):[['Oferta geral',offer.descricao||'A definir','—']];
    if(offer.brinde)offerRows.push(['Brinde',offer.brinde,'—']);
    if(rules.deadline?.enabled)offerRows.push(['Limite por horário','Até '+dateTimeLabel(rules.deadline.data,rules.deadline.hora)+' · '+(rules.deadline.beneficio||'condição encerra'),'—']);
    if(rules.first_n?.enabled)offerRows.push(['Primeiros pedidos','Primeiros '+rules.first_n.quantidade+' · '+(rules.first_n.beneficio||'benefício especial'),'—']);
    const ticketRows=st.aumento_ticket.tem?(st.aumento_ticket.estrategias.length?st.aumento_ticket.estrategias.map(x=>[x.nome,x.detalhe,x.desconto||'—']):[['A definir','Terá estratégia de aumento de ticket','—']]):[['Não terá','Sem estratégia de aumento de ticket nesta campanha','—']];
    const metaRows=[];
    goals.forEach(x=>{if(Number(x.investimento||0))metaRows.push(['Investimento — '+x.fonte,money(x.investimento),x.responsavel||''])});
    goals.forEach(x=>metaRows.push(['Meta faturamento — '+x.fonte,money(x.meta_faturamento),x.responsavel||'']));
    metaRows.push(['Meta faturamento total',money(goal),'']);
    metaRows.push(['Investimento total',money(budget),'']);
    metaRows.push(['ROAS alvo',budget?(goal/budget).toFixed(2).replace('.',','):'—','']);
    return[
      {title:'SOBRE O EVENTO',columns:['Campo','Valor'],rows:eventRows},
      {title:'EQUIPE',columns:['Quem','Responsabilidade'],rows:(st.equipe.length?st.equipe:[{quem:S.basic.owner||'A definir',responsabilidade:'Responsável geral'}]).map(x=>[x.quem,x.responsabilidade])},
      {title:'FASES',columns:['Fase','Tem?','Data'],rows:st.fases.map(x=>[x.nome,x.tem?'sim':'não tem',x.tem?(x.data_legada||dateTimeLabel(x.data,x.hora)):'—'])},
      {title:'SOBRE A OFERTA',columns:['Produto','Detalhe','Desconto'],rows:offerRows},
      {title:'AUMENTO DE TICKET MÉDIO',columns:['Estratégia','Detalhe','Desconto'],rows:ticketRows},
      {title:'METAS',columns:['Item','Valor','Responsável'],rows:metaRows},
      {title:'CANAIS · CRONOGRAMA',columns:['Data','Canal','Ação','Responsável'],rows:st.cronograma.map(x=>[dateTimeLabel(x.data,x.hora),x.canal,x.titulo,x.quem_faz])}
    ];
  }

  function mergeTap(existing,generated){
    if(!Array.isArray(existing)||!existing.length)return generated;
    const out=existing.map(x=>clone(x));
    const titleKey=s=>norm(s?.title).replace(/^\d+\.\s*/,'');
    generated.forEach(g=>{
      const gi=out.findIndex(e=>titleKey(e)===titleKey(g)||titleKey(e).includes(titleKey(g))||titleKey(g).includes(titleKey(e)));
      if(gi<0){out.push(g);return}
      const old=out[gi],oldRows=Array.isArray(old.rows)?old.rows:[];
      const genKeys=new Set(g.rows.map(r=>norm(r?.[0])));
      const extras=oldRows.filter(r=>r?.[0]&&!genKeys.has(norm(r[0])));
      out[gi]={...old,title:g.title,columns:g.columns,rows:[...g.rows,...extras]};
    });
    return out;
  }

  async function persistCustomChannels(channels){
    const custom=(channels||[]).filter(x=>x.custom&&x.enabled&&String(x.nome||'').trim());
    if(!custom.length)return;
    try{
      if(window.AllianceOSAuth?.ready)await window.AllianceOSAuth.ready;
      const s=window.AllianceOSAuth?.client;
      if(!s)return;
      const slug=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72);
      let order=900;
      for(const x of custom){
        const payload={slug:slug(x.nome)||('canal-'+Date.now().toString(36)),nome:String(x.nome).trim(),ordem:order,ativo:true,origem:'interface'};
        order+=10;
        const r=await s.from('alliance_channels').upsert(payload,{onConflict:'slug'});
        if(r.error)console.warn('[AllianceOS canal customizado]',r.error);
      }
    }catch(e){console.warn('[AllianceOS canais] não foi possível registrar canal globalmente',e)}
  }

  function finish(){
    const err=validateAll();if(err){toast(err);return}
    const rows=read();
    const existing=S.mode==='edit'?rows.find(x=>String(x.id)===String(S.campaignId)):null;
    const st=structured();
    const metrics=channelMetrics();
    const cron=st.cronograma;
    const tap=generatedTap(st);
    const base=existing||{};
    const benefits=[...new Set([...(Array.isArray(base.benefits)?base.benefits:[]),S.offer.frete,S.offer.brinde,S.offer.bonus_universal,S.offer.bonus_influencer].filter(Boolean))];
    const finalGoal=metrics.goal>0?metrics.goal:Number(base.goal||0);
    const finalBudget=metrics.budget>0?metrics.budget:Number(base.budget||0);
    const campaign={
      ...base,
      id:existing?.id||id('camp'),
      name:String(S.basic.name).trim(),brand:S.basic.brand,type:S.basic.type,owner:S.basic.owner||'Sem responsável',
      status:S.basic.status,start:S.basic.start,end:S.basic.end,startAt:S.basic.start,endAt:S.basic.end,
      monthRef:S.basic.monthRef||dateRef(S.basic.start),planningStart:S.basic.planningStart,
      goal:finalGoal,budget:finalBudget,objective:S.basic.objective||S.event.formato,
      offer:S.offer.summary||S.offer.cupom_automatico,channels:S.channels.filter(x=>x.enabled).map(x=>x.nome),
      products:S.offer.products.map(p=>({name:p.nome,sku:p.sku,price:Number(p.preco||0),discount:Number(p.desconto||0),detail:p.detalhe||''})),
      benefits,progress:Number(base.progress||0),color:base.color||(window.Marcas?.cor?.(S.basic.brand)||'#121415'),
      schedule:cron.map(x=>[dateTimeLabel(x.data,x.hora),x.canal,x.titulo,x.quem_faz]),
      tapStructured:{...(base.tapStructured&&typeof base.tapStructured==='object'?base.tapStructured:{}),...st},
      tap:mergeTap(base.tap,tap),
      origem:'interface',origin:'interface',updatedAt:nowIso()
    };
    if(!existing){
      campaign.createdAt=nowIso();
      campaign.tapBase=clone(campaign.tap);
      rows.unshift(campaign);
    }else{
      const idx=rows.findIndex(x=>String(x.id)===String(existing.id));
      rows[idx]=campaign;
    }
    saveRows(rows);
    persistCustomChannels(S.channels.map(x=>({...x})));
    clearDraft();
    const wasEdit=S.mode==='edit';
    const nodeId=S.nodeId;
    close();
    try{
      if(!wasEdit)window.MapaMental?.virarCampanha?.(nodeId,{nome:campaign.name,cor:0,campId:campaign.id});
      window.RecarregarCampanhas?.();
      window.__centralRenderCampaigns?.();
      window.AllianceFullSystem?.refreshConsistency?.();
      window.dispatchEvent(new CustomEvent('allianceos:campaign-saved',{detail:{id:campaign.id,mode:wasEdit?'edit':'create'}}));
    }catch(e){console.warn('[AllianceOS campanha] atualização visual',e)}
    toast(wasEdit?'Campanha atualizada sem apagar os dados existentes.':'Campanha criada com TAP, metas e cronograma completos.');
    setTimeout(()=>window.openCampaignWorkspaceByName?.(campaign.name),120);
  }

  function toast(msg){
    if(typeof window.showToast==='function'){window.showToast(msg);return}
    const t=document.createElement('div');
    t.textContent=msg;Object.assign(t.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:2147483647,background:'#171b1e',color:'#fff',padding:'10px 13px',borderRadius:'9px',font:'600 11px Inter,system-ui',boxShadow:'0 10px 30px rgba(0,0,0,.2)'});
    document.body.appendChild(t);setTimeout(()=>t.remove(),3200);
  }
  function close(){layer?.remove();layer=null;S=null}

  function open(arg=null){
    const rows=read();
    const existing=arg!=null?rows.find(x=>String(x.id)===String(arg)):null;
    if(existing)S=loadFromCampaign(existing);
    else{
      const recovered=recoverDraft();
      S=recovered?recovered:blankState(arg);
      S.mode='create';S.campaignId=null;
      if(arg!=null)S.nodeId=arg;
    }
    S.step=0;
    render();
  }

  window.AllianceCampaignWizard={open,close};
  window.AssistenteCampanha=open;

  document.addEventListener('click',e=>{
    const edit=e.target.closest?.('#cwEdit');
    if(!edit)return;
    const ws=document.querySelector('#campaignWorkspace.active');
    const title=String(ws?.querySelector('.cw-title h2')?.textContent||'').trim();
    const brand=String(ws?.querySelector('.cw-title small')?.textContent||'').split('·')[0].trim();
    const c=read().find(x=>String(x.name||'').trim()===title&&(!brand||norm(x.brand)===norm(brand)));
    if(!c)return;
    e.preventDefault();e.stopImmediatePropagation();open(c.id);
  },true);
})();

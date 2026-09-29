(() => {
  'use strict';
  if (window.AllianceOSCreators) return;

  const state = {open:false, tab:'overview', loading:false, rows:[], contracts:[], shipments:[], deliverables:[], commissions:[], rewards:[], perf:[], selected:null, search:'', status:'', type:''};
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const date=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pt-BR')};
  const dt=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})};
  const label={
    novo_cadastro:'Novo cadastro',em_analise:'Em análise',aprovado:'Aprovado',contrato_enviado:'Contrato enviado',
    aguardando_assinatura:'Aguardando assinatura',contrato_assinado:'Contrato assinado',envio_pendente:'Envio pendente',
    ativacao_pendente:'Ativação pendente',ativo:'Ativo',sem_vendas:'Sem vendas',acompanhamento:'Acompanhamento',
    inativo:'Inativo',reprovado:'Reprovado'
  };
  const stages=['novo_cadastro','em_analise','aprovado','contrato_enviado','aguardando_assinatura','contrato_assinado','envio_pendente','ativacao_pendente','ativo'];
  const formTokens={
    '91a66f9e-6dc8-40c8-b7ca-33b8b39676f4':'b86EtGqZWRyhJJYYlNBfQP5a',
    '11258793-c09f-48eb-8d70-465399a36f63':'xj4nriG_y4iXqIqZAfwzrKXt',
    'f684a2b4-8d77-4f53-a46d-11f028d71680':'noj_5Jd5aWbsKAZh1-iTJiFA',
    '771d59ab-5c2c-4594-b09c-20f7e68073d3':'4f4zIS30aagiUF7UN8LmBA2U'
  };

  async function client(){ await window.AllianceOSAuth?.ready; const c=window.AllianceOSAuth?.client; if(!c) throw new Error('Supabase indisponível'); return c; }
  async function generateContract(id,{silent=false,force=false}={}){
    const sb=await client();
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token)throw new Error('Sua sessão expirou. Entre novamente no AllianceOS.');
    if(!silent)toast('Gerando contrato…');
    const r=await fetch('/api/drive',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({action:'generate_creator_contract',partner_brand_id:id,force})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.erro||'Não foi possível gerar o contrato.');
    if(!silent)toast(j.reused?'Contrato já estava gerado.':'Contrato gerado automaticamente.');
    return j;
  }
  async function sessionToken(){
    const sb=await client();const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token)throw new Error('Sua sessão expirou. Entre novamente no AllianceOS.');
    return session.access_token;
  }
  async function viewContract(contractId){
    const token=await sessionToken(),w=window.open('about:blank','_blank');
    try{
      const r=await fetch('/api/drive',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'download_creator_contract',contract_id:contractId})});
      if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.erro||'Não foi possível abrir o PDF do contrato.')}
      const blob=await r.blob();if(blob.type!=='application/pdf'&&blob.size<100)throw new Error('O servidor não retornou um PDF válido.');
      const url=URL.createObjectURL(new Blob([blob],{type:'application/pdf'}));
      if(w)w.location=url;else window.location.href=url;
      setTimeout(()=>URL.revokeObjectURL(url),120000);
    }catch(e){if(w)w.close();throw e}
  }
  async function sendContractAutentique(contractId){
    const token=await sessionToken();toast('Enviando PDF para a Autentique…');
    const r=await fetch('/api/drive',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'send_creator_contract_autentique',contract_id:contractId})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.erro||'Não foi possível enviar o contrato para a Autentique.');
    if(j.signature_url){try{await navigator.clipboard.writeText(j.signature_url);toast('Contrato criado na Autentique. Link de assinatura copiado.')}catch{toast('Contrato criado na Autentique.')}}else toast('Contrato criado na Autentique.');
    return j;
  }
  async function refreshContractAutentique(contractId){
    const token=await sessionToken();toast('Atualizando assinatura…');
    const r=await fetch('/api/drive',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'refresh_creator_contract_autentique',contract_id:contractId})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.erro||'Não foi possível consultar a Autentique.');
    toast(j.remote_status==='assinado'?'Contrato assinado.':j.remote_status==='recusado'?'Contrato recusado.':'Ainda aguardando assinatura.');
    return j;
  }
  async function copySignatureLink(url){
    if(!url)throw new Error('O link de assinatura ainda não foi gerado.');
    try{await navigator.clipboard.writeText(url);toast('Link de assinatura copiado.')}catch{prompt('Copie o link de assinatura:',url)}
  }
  function brand(){
    const s=$('#brandSelect'),o=s?.selectedOptions?.[0],id=o?.dataset?.brandId||'';
    if(!id||id==='__all__') return {id:null,name:'Todas as marcas'};
    return {id,name:String(o?.textContent||o?.value||'Marca').trim()};
  }
  async function copyFormLink(){
    const b=brand();
    if(!b.id){toast('Selecione uma marca para gerar o link do formulário.');return}
    const token=formTokens[b.id];
    if(!token){toast('Esta marca ainda não possui formulário público configurado.');return}
    const url=location.origin+'/parceiros/cadastro?s='+encodeURIComponent(token);
    try{await navigator.clipboard.writeText(url);toast('Link do formulário copiado.')}catch{prompt('Copie o link do formulário:',url)}
  }
  function toast(msg){
    if(typeof window.showToast==='function') return window.showToast(msg);
    const n=document.createElement('div'); n.textContent=msg; Object.assign(n.style,{position:'fixed',right:'24px',bottom:'24px',zIndex:2147483647,padding:'11px 14px',borderRadius:'10px',background:'#111519',color:'#fff',font:'600 10px Inter'}); document.body.appendChild(n); setTimeout(()=>n.remove(),1800);
  }
  function root(){
    let r=$('#creatorManagement');
    if(r)return r;
    r=document.createElement('section'); r.id='creatorManagement'; r.className='crm-page'; r.hidden=true;
    $('.main')?.appendChild(r);
    r.addEventListener('click',onClick);
    r.addEventListener('input',onInput);
    r.addEventListener('change',onChange);
    r.addEventListener('dragstart',onDragStart);
    r.addEventListener('dragend',onDragEnd);
    r.addEventListener('dragover',onDragOver);
    r.addEventListener('dragleave',onDragLeave);
    r.addEventListener('drop',onDrop);
    $('#brandSelect')?.addEventListener('change',()=>state.open&&load());
    return r;
  }
  async function open(){
    const r=root(); if(!r)return;
    state.open=true; document.body.classList.add('creator-management-open'); r.hidden=false;
    window.dispatchEvent(new CustomEvent('allianceos:creators-open'));
    await load();
  }
  function close(){
    state.open=false; document.body.classList.remove('creator-management-open');
    const r=$('#creatorManagement'); if(r)r.hidden=true;
    closeModal();
  }
  async function load(){
    const r=root(),b=brand();
    state.loading=true; r.innerHTML='<div class="crm-loading">Carregando Gestão de Creators…</div>';
    try{
      const sb=await client();
      let q=sb.from('creator_partner_brands').select('*,partner:creator_partners(*)').is('arquivado_em',null).order('criado_em',{ascending:false});
      if(b.id)q=q.eq('brand_id',b.id);
      const [links,contracts,shipments,deliverables,commissions,rewards,perf]=await Promise.all([
        q,
        b.id?sb.from('creator_contracts').select('*').is('arquivado_em',null).order('criado_em',{ascending:false}):Promise.resolve({data:[]}),
        b.id?sb.from('creator_shipments').select('*').is('arquivado_em',null).order('criado_em',{ascending:false}):Promise.resolve({data:[]}),
        b.id?sb.from('creator_deliverables').select('*').is('arquivado_em',null).order('criado_em',{ascending:false}):Promise.resolve({data:[]}),
        b.id?sb.from('creator_commissions').select('*').is('arquivado_em',null).order('competencia',{ascending:false}):Promise.resolve({data:[]}),
        b.id?sb.from('creator_rewards').select('*').is('arquivado_em',null).order('liberada_em',{ascending:false}):Promise.resolve({data:[]}),
        b.id?sb.from('creator_partner_performance').select('*').eq('brand_id',b.id):Promise.resolve({data:[]})
      ]);
      if(links.error)throw links.error;
      state.rows=links.data||[]; state.contracts=contracts.data||[]; state.shipments=shipments.data||[]; state.deliverables=deliverables.data||[];
      state.commissions=commissions.data||[]; state.rewards=rewards.data||[]; state.perf=perf.data||[];
      state.loading=false; render();
      const pending=state.rows.find(x=>x.status==='aprovado'&&!state.contracts.some(c=>c.partner_brand_id===x.id&&c.documento_url));
      if(pending)setTimeout(()=>generateContract(pending.id,{silent:true}).then(()=>load()).catch(e=>console.warn('[creators contract]',e)),80);
    }catch(e){ state.loading=false; r.innerHTML='<div class="crm-error"><b>Não foi possível carregar a área.</b><span>'+esc(e.message||e)+'</span></div>'; }
  }
  function performance(id){return state.perf.find(x=>x.partner_brand_id===id)||{vendas_mes:0,vendas_total:0,pedidos_total:0,ticket_medio:0,ultima_venda_em:null}}
  function contract(id){return state.contracts.find(x=>x.partner_brand_id===id)}
  function shipment(id){return state.shipments.find(x=>x.partner_brand_id===id)}
  function displayType(types){return (types||[]).map(x=>x==='ugc'?'UGC':x==='prescritor'?'Prescritor':x==='outro'?'Outro':'Creator').join(' · ')||'Creator'}
  function filtered(){
    const s=state.search.toLowerCase().trim();
    return state.rows.filter(r=>{
      const p=r.partner||{};
      if(state.status&&r.status!==state.status)return false;
      if(state.type&&!(r.tipos||[]).includes(state.type))return false;
      if(s&&!([p.nome_completo,p.instagram,p.email,p.whatsapp,r.cupom].join(' ').toLowerCase().includes(s)))return false;
      return true;
    });
  }
  function kpis(){
    const active=state.rows.filter(x=>x.status==='ativo').length;
    const waiting=state.rows.filter(x=>['contrato_enviado','aguardando_assinatura'].includes(x.status)).length;
    const pendingShip=state.shipments.filter(x=>['aguardando','separacao'].includes(x.status)).length+state.rows.filter(x=>x.status==='envio_pendente').length;
    const sales=state.perf.reduce((n,x)=>n+Number(x.vendas_mes||0),0);
    const comm=state.commissions.filter(x=>!['paga','retida'].includes(x.status)).reduce((n,x)=>n+Number(x.valor_disponivel||0),0);
    return {active,waiting,pendingShip,sales,comm,total:state.rows.length};
  }
  function render(){
    const r=root(),b=brand(),k=kpis();
    const tabs=[
      ['overview','Visão geral'],['pipeline','Pipeline'],['partners','Parceiros'],['hunter','Hunter'],['contracts','Contratos'],
      ['shipments','Envios'],['ugc','UGC & Conteúdos'],['performance','Performance'],['commissions','Comissões'],['rewards','Recompensas']
    ];
    r.innerHTML='<div class="crm-shell">'+
      '<header class="crm-head"><div><span>SETOR · ANA</span><h1>Gestão de Creators</h1><p>'+esc(b.name)+' · parceiros, contratos, envios, conteúdo e performance em uma única operação.</p></div>'+
      '<div class="crm-head-actions"><button class="crm-secondary" data-action="form-link">Copiar link do formulário</button><button class="crm-secondary" data-action="reload">Atualizar</button><button class="crm-primary" data-action="new-partner">+ Novo parceiro</button></div></header>'+
      '<div class="crm-kpis">'+[
        ['Parceiros',k.total],['Ativos',k.active],['Contratos pendentes',k.waiting],['Envios pendentes',k.pendingShip],['Vendas no mês',money(k.sales)],['Comissão disponível',money(k.comm)]
      ].map(x=>'<article><span>'+x[0]+'</span><b>'+x[1]+'</b></article>').join('')+'</div>'+
      '<nav class="crm-tabs">'+tabs.map(t=>'<button class="'+(state.tab===t[0]?'active':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join('')+'</nav>'+
      '<main class="crm-body">'+view()+'</main></div>';
  }
  function view(){
    if(state.tab==='pipeline')return pipelineView();
    if(state.tab==='partners')return partnersView();
    if(state.tab==='hunter')return hunterView();
    if(state.tab==='contracts')return contractsView();
    if(state.tab==='shipments')return shipmentsView();
    if(state.tab==='ugc')return ugcView();
    if(state.tab==='performance')return performanceView();
    if(state.tab==='commissions')return commissionsView();
    if(state.tab==='rewards')return rewardsView();
    return overviewView();
  }
  function overviewView(){
    const attention=[];
    state.rows.filter(x=>['contrato_enviado','aguardando_assinatura'].includes(x.status)).forEach(x=>attention.push(['Contrato',x.partner?.nome_completo,'Aguardando assinatura',x.id]));
    state.rows.filter(x=>x.status==='envio_pendente').forEach(x=>attention.push(['Envio',x.partner?.nome_completo,'Aguardando envio',x.id]));
    state.deliverables.filter(x=>x.prazo&&new Date(x.prazo)<new Date()&&!['aprovado','arquivado'].includes(x.status)).forEach(x=>{const pb=state.rows.find(r=>r.id===x.partner_brand_id);attention.push(['UGC',pb?.partner?.nome_completo,x.titulo+' atrasado',x.partner_brand_id])});
    state.rows.forEach(x=>{const p=performance(x.id);if(x.status==='ativo'&&(!p.ultima_venda_em||Date.now()-new Date(p.ultima_venda_em).getTime()>30*864e5))attention.push(['Performance',x.partner?.nome_completo,'Sem venda há 30+ dias',x.id])});
    const top=[...state.rows].sort((a,b)=>Number(performance(b.id).vendas_mes)-Number(performance(a.id).vendas_mes)).slice(0,5);
    return '<div class="crm-grid2"><section class="crm-card"><header><div><span>PRIORIDADES</span><h2>Precisa da sua atenção</h2></div><b>'+attention.length+'</b></header><div class="crm-list">'+
      (attention.length?attention.slice(0,12).map(a=>'<button data-open-partner="'+a[3]+'"><i>'+esc(a[0])+'</i><span><b>'+esc(a[1]||'Parceiro')+'</b><small>'+esc(a[2])+'</small></span><em>›</em></button>').join(''):'<div class="crm-empty">Nenhuma pendência crítica agora.</div>')+
      '</div></section><section class="crm-card"><header><div><span>PERFORMANCE</span><h2>Destaques do mês</h2></div></header><div class="crm-rank">'+
      (top.length?top.map((x,i)=>'<button data-open-partner="'+x.id+'"><strong>'+(i+1)+'</strong><span><b>'+esc(x.partner?.nome_completo)+'</b><small>'+esc(displayType(x.tipos))+'</small></span><em>'+money(performance(x.id).vendas_mes)+'</em></button>').join(''):'<div class="crm-empty">Cadastre parceiros com cupom para acompanhar vendas.</div>')+
      '</div></section></div>'+pipelineCompact();
  }
  function pipelineCompact(){
    const max=Math.max(1,...stages.map(s=>state.rows.filter(x=>x.status===s).length));
    return '<section class="crm-card crm-pipe-summary"><header><div><span>FUNIL</span><h2>Jornada de onboarding</h2></div><button data-tab="pipeline">Abrir pipeline</button></header><div>'+stages.map(s=>{const n=state.rows.filter(x=>x.status===s).length;return '<div class="crm-pipe-row"><span>'+label[s]+'</span><i><b style="width:'+Math.max(4,n/max*100)+'%"></b></i><strong>'+n+'</strong></div>'}).join('')+'</div></section>';
  }
  function pipelineView(){
    return '<div class="crm-kanban">'+stages.map(s=>{const rows=state.rows.filter(x=>x.status===s);return '<section class="crm-kanban-stage" data-drop-status="'+s+'"><header><span>'+label[s]+'</span><b>'+rows.length+'</b></header><div>'+rows.map(x=>partnerCard(x)).join('')+(rows.length?'':'<small class="crm-kanban-empty">Sem parceiros</small>')+'</div></section>'}).join('')+'</div>';
  }
  function partnerCard(x){
    const p=x.partner||{},pf=performance(x.id);
    return '<div class="crm-partner-card" role="button" tabindex="0" draggable="true" data-drag-partner="'+x.id+'" data-open-partner="'+x.id+'"><b>'+esc(p.nome_completo)+'</b><span>'+esc(displayType(x.tipos))+(p.instagram?' · '+esc(p.instagram):'')+'</span><small>'+money(pf.vendas_mes)+' no mês'+(x.cupom?' · '+esc(x.cupom):'')+'</small></div>';
  }
  function toolbar(){
    return '<div class="crm-toolbar"><input data-filter="search" placeholder="Buscar por nome, @, e-mail, WhatsApp ou cupom" value="'+esc(state.search)+'">'+
      '<select data-filter="type"><option value="">Todos os tipos</option><option value="creator" '+(state.type==='creator'?'selected':'')+'>Creator</option><option value="prescritor" '+(state.type==='prescritor'?'selected':'')+'>Prescritor</option><option value="ugc" '+(state.type==='ugc'?'selected':'')+'>UGC</option><option value="outro" '+(state.type==='outro'?'selected':'')+'>Outro</option></select>'+
      '<select data-filter="status"><option value="">Todos os status</option>'+Object.entries(label).map(([k,v])=>'<option value="'+k+'" '+(state.status===k?'selected':'')+'>'+v+'</option>').join('')+'</select></div>';
  }
  function partnersView(){
    const rows=filtered();
    return toolbar()+'<div class="crm-table"><div class="crm-tr crm-th"><span>Parceiro</span><span>Tipo</span><span>Status</span><span>Cupom</span><span>Vendas mês</span><span>Última venda</span><span></span></div>'+
      rows.map(x=>{const p=x.partner||{},pf=performance(x.id);return '<button class="crm-tr" data-open-partner="'+x.id+'"><span><b>'+esc(p.nome_completo)+'</b><small>'+esc(p.instagram||p.email||p.whatsapp||'')+'</small></span><span>'+esc(displayType(x.tipos))+'</span><span><i class="crm-status s-'+x.status+'">'+label[x.status]+'</i></span><span>'+esc(x.cupom||'—')+'</span><span>'+money(pf.vendas_mes)+'</span><span>'+date(pf.ultima_venda_em)+'</span><span>›</span></button>'}).join('')+
      (rows.length?'':'<div class="crm-empty">Nenhum parceiro encontrado.</div>')+'</div>';
  }
  function hunterView(){
    const rows=state.rows.filter(x=>['novo_cadastro','em_analise','aprovado'].includes(x.status));
    return '<section class="crm-card"><header><div><span>HUNTER</span><h2>Fila de aquisição</h2><p>Novos cadastros até aprovação e passagem para contrato.</p></div><b>'+rows.length+'</b></header><div class="crm-table simple">'+rows.map(x=>{const p=x.partner||{};return '<button class="crm-tr" data-open-partner="'+x.id+'"><span><b>'+esc(p.nome_completo)+'</b><small>'+esc(p.instagram||p.whatsapp||'')+'</small></span><span>'+esc(displayType(x.tipos))+'</span><span><i class="crm-status s-'+x.status+'">'+label[x.status]+'</i></span><span>'+esc(x.proxima_acao||'Analisar cadastro')+'</span><span>›</span></button>'}).join('')+(rows.length?'':'<div class="crm-empty">Nenhum cadastro aguardando Hunter.</div>')+'</div></section>';
  }
  function contractsView(){
    return '<section class="crm-card"><header><div><span>CONTRATOS</span><h2>Central de assinaturas</h2></div><b>'+state.contracts.length+'</b></header><div class="crm-table simple">'+state.contracts.map(c=>{const x=state.rows.find(r=>r.id===c.partner_brand_id);return '<button class="crm-tr" data-open-partner="'+c.partner_brand_id+'"><span><b>'+esc(x?.partner?.nome_completo||'Parceiro')+'</b><small>Enviado '+dt(c.enviado_em)+'</small></span><span><i class="crm-status">'+esc(c.status.replaceAll('_',' '))+'</i></span><span>Assinado: '+date(c.assinado_em)+'</span><span>Fim: '+date(c.fim_em)+'</span><span>›</span></button>'}).join('')+(state.contracts.length?'':'<div class="crm-empty">Nenhum contrato cadastrado.</div>')+'</div></section>';
  }
  function shipmentsView(){
    return '<section class="crm-card"><header><div><span>LOGÍSTICA</span><h2>Envios de produtos</h2></div><b>'+state.shipments.length+'</b></header><div class="crm-table simple">'+state.shipments.map(s=>{const x=state.rows.find(r=>r.id===s.partner_brand_id);return '<button class="crm-tr" data-open-partner="'+s.partner_brand_id+'"><span><b>'+esc(x?.partner?.nome_completo||'Parceiro')+'</b><small>'+esc(s.tipo)+'</small></span><span><i class="crm-status">'+esc(s.status)+'</i></span><span>'+esc(s.codigo_rastreio||'Sem rastreio')+'</span><span>'+money(s.frete)+'</span><span>›</span></button>'}).join('')+(state.shipments.length?'':'<div class="crm-empty">Nenhum envio cadastrado.</div>')+'</div></section>';
  }
  function ugcView(){
    return '<div class="crm-board">'+['briefing_pendente','producao','aguardando_entrega','revisao','ajustes','aprovado'].map(st=>'<section><header><span>'+st.replaceAll('_',' ')+'</span><b>'+state.deliverables.filter(x=>x.status===st).length+'</b></header>'+state.deliverables.filter(x=>x.status===st).map(d=>{const x=state.rows.find(r=>r.id===d.partner_brand_id);return '<button data-open-partner="'+d.partner_brand_id+'"><b>'+esc(d.titulo)+'</b><span>'+esc(x?.partner?.nome_completo||'Parceiro')+'</span><small>Prazo '+date(d.prazo)+' · revisão '+d.revisoes+'/'+d.revisoes_max+'</small></button>'}).join('')+'</section>').join('')+'</div>';
  }
  function performanceView(){
    const rows=[...state.rows].sort((a,b)=>Number(performance(b.id).vendas_mes)-Number(performance(a.id).vendas_mes));
    return '<section class="crm-card"><header><div><span>COMERCIAL</span><h2>Performance por parceiro</h2></div></header><div class="crm-table performance"><div class="crm-tr crm-th"><span>Parceiro</span><span>Vendas mês</span><span>Vendas total</span><span>Pedidos</span><span>Ticket</span><span>Última venda</span><span></span></div>'+rows.map(x=>{const p=performance(x.id);return '<button class="crm-tr" data-open-partner="'+x.id+'"><span><b>'+esc(x.partner?.nome_completo)+'</b><small>'+esc(x.cupom||'Sem cupom')+'</small></span><span>'+money(p.vendas_mes)+'</span><span>'+money(p.vendas_total)+'</span><span>'+p.pedidos_total+'</span><span>'+money(p.ticket_medio)+'</span><span>'+date(p.ultima_venda_em)+'</span><span>›</span></button>'}).join('')+'</div></section>';
  }
  function commissionsView(){
    const due=state.commissions.reduce((n,x)=>n+Number(x.valor_disponivel||0),0),paid=state.commissions.reduce((n,x)=>n+Number(x.valor_pago||0),0);
    return '<div class="crm-mini-kpis"><article><span>Disponível</span><b>'+money(due)+'</b></article><article><span>Pago</span><b>'+money(paid)+'</b></article><article><span>Lançamentos</span><b>'+state.commissions.length+'</b></article></div><section class="crm-card"><div class="crm-table simple">'+state.commissions.map(c=>{const x=state.rows.find(r=>r.id===c.partner_brand_id);return '<button class="crm-tr" data-open-partner="'+c.partner_brand_id+'"><span><b>'+esc(x?.partner?.nome_completo||'Parceiro')+'</b><small>'+date(c.competencia)+'</small></span><span>'+money(c.vendas_elegiveis)+'</span><span>'+money(c.valor_disponivel)+'</span><span><i class="crm-status">'+esc(c.status)+'</i></span><span>›</span></button>'}).join('')+(state.commissions.length?'':'<div class="crm-empty">Nenhuma comissão lançada.</div>')+'</div></section>';
  }
  function rewardsView(){
    return '<section class="crm-card"><header><div><span>RECOMPENSAS</span><h2>Benefícios liberados</h2></div><b>'+state.rewards.length+'</b></header><div class="crm-list">'+state.rewards.map(r=>{const x=state.rows.find(z=>z.id===r.partner_brand_id);return '<button data-open-partner="'+r.partner_brand_id+'"><i>'+esc(r.status)+'</i><span><b>'+esc(x?.partner?.nome_completo||'Parceiro')+'</b><small>Referência '+money(r.valor_referencia)+'</small></span><em>›</em></button>'}).join('')+(state.rewards.length?'':'<div class="crm-empty">Nenhuma recompensa liberada.</div>')+'</div></section>';
  }
  function ensureModal(){
    let m=$('#creatorModal');if(m)return m;
    m=document.createElement('div');m.id='creatorModal';m.className='crm-modal-backdrop';m.hidden=true;document.body.appendChild(m);m.addEventListener('click',onModalClick);m.addEventListener('change',onModalChange);return m;
  }
  function closeModal(){const m=$('#creatorModal');if(m){m.hidden=true;m.innerHTML='';}}
  function openNew(){
    const b=brand(); if(!b.id){toast('Selecione uma marca antes de cadastrar.');return}
    const m=ensureModal();m.hidden=false;m.innerHTML='<form class="crm-modal" data-form="new-partner"><header><div><span>NOVO PARCEIRO</span><h2>Cadastrar parceiro</h2></div><button type="button" data-close>×</button></header><div class="crm-form"><label class="wide">Nome completo<input name="nome" required></label><label>Tipo<select name="tipo"><option value="creator">Creator</option><option value="prescritor">Prescritor</option><option value="ugc">UGC</option></select></label><label>Origem<input name="origem" value="Formulário"></label><label>WhatsApp<input name="whatsapp"></label><label>E-mail<input name="email" type="email"></label><label>Instagram<input name="instagram" placeholder="@perfil"></label><label>Status<select name="status"><option value="novo_cadastro">Novo cadastro</option><option value="em_analise">Em análise</option><option value="aprovado">Aprovado</option></select></label></div><footer><button type="button" class="crm-secondary" data-close>Cancelar</button><button class="crm-primary">Cadastrar</button></footer></form>';
    m.querySelector('form').addEventListener('submit',createPartner);
  }
  async function createPartner(e){
    e.preventDefault();const b=brand(),f=new FormData(e.currentTarget),btn=e.currentTarget.querySelector('.crm-primary');btn.disabled=true;
    try{
      const sb=await client();const {data,error}=await sb.rpc('creator_create_partner',{p_brand_id:b.id,p_nome_completo:f.get('nome'),p_whatsapp:f.get('whatsapp')||null,p_email:f.get('email')||null,p_instagram:f.get('instagram')||null,p_tipo:f.get('tipo'),p_origem:f.get('origem')||'manual',p_status:f.get('status')||'novo_cadastro'});
      if(error)throw error;closeModal();toast('Parceiro cadastrado.');await load();if(data)openPartner(data);
    }catch(err){toast(err.message||String(err));btn.disabled=false}
  }
  function openPartner(id){
    const x=state.rows.find(r=>r.id===id);if(!x)return;state.selected=id;const p=x.partner||{},pf=performance(id),c=contract(id),s=shipment(id),m=ensureModal();m.hidden=false;
    m.innerHTML='<div class="crm-modal crm-detail"><header><div><span>'+esc(displayType(x.tipos))+'</span><h2>'+esc(p.nome_completo)+'</h2><p>'+esc(p.instagram||p.email||p.whatsapp||'')+'</p></div><button data-close>×</button></header>'+
      '<div class="crm-detail-kpis"><article><span>Vendas mês</span><b>'+money(pf.vendas_mes)+'</b></article><article><span>Vendas total</span><b>'+money(pf.vendas_total)+'</b></article><article><span>Pedidos</span><b>'+pf.pedidos_total+'</b></article><article><span>Ticket</span><b>'+money(pf.ticket_medio)+'</b></article></div>'+
      '<div class="crm-detail-grid"><section><h3>Relacionamento</h3><label>Status<select data-update-status="'+id+'">'+Object.entries(label).map(([k,v])=>'<option value="'+k+'" '+(x.status===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label><p><b>Cupom</b>'+esc(x.cupom||'—')+'</p><p><b>Última venda</b>'+date(pf.ultima_venda_em)+'</p><p><b>Grupo</b>'+(x.esta_no_grupo?'Sim':'Não')+'</p><p><b>WhatsApp etiquetado</b>'+(x.whatsapp_etiquetado?'Sim':'Não')+'</p></section>'+
      '<section><h3>Cadastro</h3><p><b>WhatsApp</b>'+esc(p.whatsapp||'—')+'</p><p><b>E-mail</b>'+esc(p.email||'—')+'</p><p><b>Instagram</b>'+esc(p.instagram||'—')+'</p><p><b>Cidade</b>'+esc(p.cidade_uf||'—')+'</p><p><b>Nicho</b>'+esc(p.nicho||'—')+'</p></section>'+
      '<section><h3>Contrato</h3><p><b>Status</b>'+esc(c?.status==='assinado'?'Assinado':c?.provider_document_id?'Aguardando assinatura':c?.documento_url?'PDF gerado':(c?.status||'Não criado'))+'</p><p><b>Modelo</b>'+esc(c?.metadata?.template_name||'—')+'</p><p><b>Formato</b>'+(c?.metadata?.storage_path_pdf?'PDF final':'—')+'</p><p><b>Gerado</b>'+dt(c?.metadata?.generated_at)+'</p><p><b>Vencimento</b>'+date(c?.fim_em)+'</p>'+
      (c?.documento_url?'<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:9px"><button type="button" class="crm-secondary" data-action="view-contract" data-contract-id="'+esc(c.id)+'">Abrir PDF</button>'+
        (!c?.provider_document_id?'<button type="button" class="crm-primary" data-action="send-autentique" data-contract-id="'+esc(c.id)+'">Enviar para Autentique</button>':'')+
        (c?.provider_document_id?'<button type="button" class="crm-secondary" data-action="refresh-autentique" data-contract-id="'+esc(c.id)+'">Atualizar assinatura</button>':'')+
        (c?.metadata?.autentique?.signature_url?'<button type="button" class="crm-secondary" data-action="copy-signature-link" data-url="'+esc(c.metadata.autentique.signature_url)+'">Copiar link</button>':'')+
        (c?.metadata?.autentique?.signed_file_url?'<a class="crm-secondary" href="'+esc(c.metadata.autentique.signed_file_url)+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">PDF assinado ↗</a>':'')+
      '</div>':'')+'</section>'+
      '<section><h3>Último envio</h3><p><b>Status</b>'+esc(s?.status||'Sem envio')+'</p><p><b>Rastreio</b>'+esc(s?.codigo_rastreio||'—')+'</p><p><b>Frete</b>'+money(s?.frete)+'</p><p><b>Enviado</b>'+dt(s?.enviado_em)+'</p></section></div>'+
      '<footer><button class="crm-secondary" data-action="archive" data-id="'+id+'">Arquivar parceiro</button>'+(x.status==='aprovado'?'<button class="crm-secondary" data-action="generate-contract" data-id="'+id+'" data-force="'+(c?.documento_url?'1':'0')+'">'+(c?.documento_url?'Gerar nova versão':'Gerar contrato')+'</button>':'')+'<button class="crm-primary" data-close>Fechar</button></footer></div>';
  }
  async function updateStatus(id,status,{reopen=true,optimistic=false}={}){
    if(!id||!status)return false;
    const current=state.rows.find(r=>r.id===id),oldStatus=current?.status;
    if(oldStatus===status){if(reopen)openPartner(id);return true}
    if(optimistic&&current){
      current.status=status;
      if(state.tab==='pipeline')render();
    }
    try{
      const sb=await client();
      const {data,error}=await sb.rpc('creator_move_partner',{
        p_partner_brand_id:id,
        p_status:status,
        p_origin:'interface'
      });
      if(error)throw error;
      if(!data?.ok)throw new Error('O AllianceOS não confirmou a movimentação.');
      if(status==='aprovado'){
        toast('Aprovado. Gerando contrato…');
        try{await generateContract(id,{silent:true})}catch(err){toast('Aprovado, mas o contrato precisa de atenção: '+(err.message||err))}
      }else{
        toast('Movido para '+(label[status]||status)+'.');
      }
      closeModal();
      await load();
      if(reopen)openPartner(id);
      return true;
    }catch(e){
      if(optimistic&&current){
        current.status=oldStatus;
        if(state.tab==='pipeline')render();
      }
      toast('Não foi possível mover: '+(e.message||String(e)));
      return false;
    }
  }
  async function archive(id){
    try{const sb=await client();const {data:{user}}=await sb.auth.getUser();const now=new Date().toISOString();const {error}=await sb.from('creator_partner_brands').update({arquivado_em:now,atualizado_em:now,atualizado_por:user?.id||null}).eq('id',id);if(error)throw error;await sb.from('creator_history').insert({partner_brand_id:id,evento:'parceiro_arquivado',descricao:'Vínculo com a marca arquivado',origem:'interface',actor_id:user?.id||null});closeModal();toast('Parceiro arquivado.');await load()}catch(e){toast(e.message||String(e))}
  }
  let suppressCardClickUntil=0;
  function onClick(e){
    const tab=e.target.closest('[data-tab]');if(tab){state.tab=tab.dataset.tab;render();return}
    const p=e.target.closest('[data-open-partner]');if(p){if(Date.now()<suppressCardClickUntil)return;openPartner(p.dataset.openPartner);return}
    const a=e.target.closest('[data-action]');if(!a)return;
    if(a.dataset.action==='new-partner')openNew();
    if(a.dataset.action==='form-link')copyFormLink();
    if(a.dataset.action==='reload')load();
    if(a.dataset.action==='archive')archive(a.dataset.id);
    if(a.dataset.action==='generate-contract'){
      const id=a.dataset.id,force=a.dataset.force==='1';
      generateContract(id,{force}).then(async()=>{closeModal();await load();openPartner(id)}).catch(e=>toast(e.message||String(e)));
    }
    if(a.dataset.action==='view-contract')viewContract(a.dataset.contractId).catch(e=>toast(e.message||String(e)));
    if(a.dataset.action==='send-autentique')sendContractAutentique(a.dataset.contractId).then(async()=>{await load();if(state.selected)openPartner(state.selected)}).catch(e=>toast(e.message||String(e)));
    if(a.dataset.action==='refresh-autentique')refreshContractAutentique(a.dataset.contractId).then(async()=>{await load();if(state.selected)openPartner(state.selected)}).catch(e=>toast(e.message||String(e)));
    if(a.dataset.action==='copy-signature-link')copySignatureLink(a.dataset.url).catch(e=>toast(e.message||String(e)));
  }
  function onInput(e){if(e.target.dataset.filter==='search'){state.search=e.target.value; if(state.tab==='partners')$('.crm-body').innerHTML=partnersView();}}
  function onChange(e){
    if(e.target.dataset.filter==='status'){state.status=e.target.value; $('.crm-body').innerHTML=partnersView();}
    if(e.target.dataset.filter==='type'){state.type=e.target.value; $('.crm-body').innerHTML=partnersView();}
  }
  function onModalClick(e){
    if(e.target.matches('[data-close]')||e.target===e.currentTarget){closeModal();return}
    const a=e.target.closest('[data-action="archive"]');if(a)archive(a.dataset.id);
    const g=e.target.closest('[data-action="generate-contract"]');if(g){const id=g.dataset.id,force=g.dataset.force==='1';generateContract(id,{force}).then(async()=>{closeModal();await load();openPartner(id)}).catch(e=>toast(e.message||String(e)))}
    const v=e.target.closest('[data-action="view-contract"]');if(v)viewContract(v.dataset.contractId).catch(e=>toast(e.message||String(e)))
    const au=e.target.closest('[data-action="send-autentique"]');if(au)sendContractAutentique(au.dataset.contractId).then(async()=>{const id=state.selected;closeModal();await load();if(id)openPartner(id)}).catch(e=>toast(e.message||String(e)))
    const rf=e.target.closest('[data-action="refresh-autentique"]');if(rf)refreshContractAutentique(rf.dataset.contractId).then(async()=>{const id=state.selected;closeModal();await load();if(id)openPartner(id)}).catch(e=>toast(e.message||String(e)))
    const cp=e.target.closest('[data-action="copy-signature-link"]');if(cp)copySignatureLink(cp.dataset.url).catch(e=>toast(e.message||String(e)))
  }
  function onModalChange(e){
    const s=e.target.closest('[data-update-status]');
    if(!s)return;
    const id=s.dataset.updateStatus,status=s.value;
    s.disabled=true;
    updateStatus(id,status).finally(()=>{if(document.body.contains(s))s.disabled=false});
  }
  let draggingId=null;
  function onDragStart(e){
    const card=e.target.closest('[data-drag-partner]');if(!card)return;
    draggingId=card.dataset.dragPartner;
    card.classList.add('dragging');
    try{
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain',draggingId);
    }catch{}
  }
  function onDragEnd(e){
    e.target.closest('[data-drag-partner]')?.classList.remove('dragging');
    $$('.crm-kanban-stage.drag-over').forEach(x=>x.classList.remove('drag-over'));
    suppressCardClickUntil=Date.now()+300;
    draggingId=null;
  }
  function onDragOver(e){
    const stage=e.target.closest('[data-drop-status]');if(!stage||!draggingId)return;
    e.preventDefault();
    try{e.dataTransfer.dropEffect='move'}catch{}
    $$('.crm-kanban-stage.drag-over').forEach(x=>{if(x!==stage)x.classList.remove('drag-over')});
    stage.classList.add('drag-over');
  }
  function onDragLeave(e){
    const stage=e.target.closest('[data-drop-status]');if(!stage)return;
    if(e.relatedTarget&&stage.contains(e.relatedTarget))return;
    stage.classList.remove('drag-over');
  }
  function onDrop(e){
    const stage=e.target.closest('[data-drop-status]');if(!stage)return;
    e.preventDefault();
    stage.classList.remove('drag-over');
    const id=draggingId||(()=>{try{return e.dataTransfer.getData('text/plain')}catch{return null}})();
    draggingId=null;
    suppressCardClickUntil=Date.now()+300;
    if(!id)return;
    const status=stage.dataset.dropStatus,current=state.rows.find(r=>r.id===id);
    if(!status||current?.status===status)return;
    toast('Movendo para '+(label[status]||status)+'…');
    updateStatus(id,status,{reopen:false,optimistic:true});
  }

  window.AllianceOSCreators={open,close,refresh:load};
})();
(() => {
  'use strict';
  const CFG='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const brl=(v)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const num=(v,d=2)=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const svg=(d)=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
  const ICON=svg('<path d="M4 18V9M9 18V5M14 18v-7M19 18V3"/><path d="M3 18h18"/>');
  const LINK=svg('<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>');
  const TEST=svg('<path d="M9 3h6M10 3v5l-5.3 9.2A2.5 2.5 0 0 0 6.9 21h10.2a2.5 2.5 0 0 0 2.2-3.8L14 8V3"/><path d="M8 15h8"/>');
  let sb=null,view=null,navBtn=null,modal=null;
  const state={tab:'overview',days:30,creatives:[],tests:[],candidates:[],loading:false,search:'',status:'',model:'',funnel:''};

  async function client(){
    if(sb)return sb;
    const r=await fetch(CFG,{cache:'no-store'});if(!r.ok)throw new Error('Configuração indisponível.');
    const cfg=await r.json(),mod=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
    sb=mod.createClient(cfg.url,cfg.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }
  function brand(){
    const o=document.getElementById('brandSelect')?.selectedOptions?.[0];
    return {id:o?.dataset?.brandId&&o.dataset.brandId!=='__all__'?o.dataset.brandId:null,name:o?.value||o?.textContent||'Todas as marcas'};
  }
  function baseViews(){
    return ['homeView','tasksView','planningView','campaignsView','deliveriesView','painelView']
      .map(id=>document.getElementById(id)).filter(Boolean);
  }
  function ensureView(){
    if(view?.isConnected)return view;
    const home=document.getElementById('homeView'),host=home?.parentElement||document.querySelector('main')||document.body;
    view=document.createElement('section');view.id='trafficCreativeLabView';view.className='tcl-view';view.hidden=true;host.appendChild(view);
    return view;
  }
  function close(){
    if(view)view.hidden=true;
    navBtn?.classList.remove('active');
    restoreOthers();
  }
  function hideOthers(){
    baseViews().forEach(v=>v.style.setProperty('display','none','important'));
    const full=document.getElementById('alliance-full-view');if(full)full.hidden=true;
  }
  function restoreOthers(){baseViews().forEach(v=>v.style.removeProperty('display'))}
  function toast(msg){window.showToast?.(msg)||console.log(msg)}

  function installNav(){
    const nav=document.querySelector('.ref2-nav');if(!nav)return false;
    if(nav.querySelector('[data-key="traffic"]')){navBtn=nav.querySelector('[data-key="traffic"]');return true}
    const campaigns=nav.querySelector('[data-key="campaigns"]');
    navBtn=document.createElement('button');navBtn.type='button';navBtn.className='ref2-nav-btn';navBtn.dataset.key='traffic';
    navBtn.innerHTML='<span class="ref2-nav-icon">'+ICON+'</span><span class="ref2-nav-label">Tráfego</span>';
    navBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},{capture:true});
    if(campaigns)campaigns.insertAdjacentElement('afterend',navBtn);else nav.appendChild(navBtn);
    return true;
  }
  function markActive(){
    document.querySelectorAll('.ref2-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.key==='traffic'));
  }
  async function open(){
    installNav();markActive();hideOthers();
    const v=ensureView();v.hidden=false;
    renderShell();
    await load();
  }

  async function load(){
    const b=brand();
    if(!b.id){state.creatives=[];state.tests=[];state.candidates=[];render();return}
    state.loading=true;render();
    try{
      const s=await client();
      const [cr,tr,ca]=await Promise.all([
        s.rpc('listar_central_criativos',{p_brand_id:b.id,p_dias:state.days}),
        s.rpc('listar_testes_criativos',{p_brand_id:b.id,p_dias:state.days}),
        s.rpc('listar_candidatos_criativos',{p_brand_id:b.id})
      ]);
      if(cr.error)throw cr.error;if(tr.error)throw tr.error;if(ca.error)throw ca.error;
      state.creatives=cr.data||[];state.tests=tr.data||[];state.candidates=ca.data||[];
    }catch(e){console.error('[Traffic Creative Lab]',e);toast('Não foi possível carregar Tráfego.');}
    state.loading=false;render();
  }

  function renderShell(){
    const b=brand();
    view.innerHTML='<div class="tcl-head">'+
      '<div><div class="tcl-eyebrow">SETOR · '+esc(b.name)+'</div><h1>Tráfego</h1><p>Operação de mídia, biblioteca de criativos, testes e performance em um só lugar.</p></div>'+
      '<div class="tcl-head-actions"><label>Janela <select id="tclDays"><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></label><button class="tcl-primary" data-new-test>'+TEST+' Novo teste</button></div>'+
    '</div>'+
    '<div class="tcl-tabs">'+
      [['overview','Visão geral'],['creatives','Biblioteca'],['tests','Testes'],['top','Performance'],['candidates','C1 / C2']]
      .map(([k,l])=>'<button data-tab="'+k+'" class="'+(state.tab===k?'active':'')+'">'+esc(l)+'</button>').join('')+
    '</div><div id="tclBody"></div>';

    const days=view.querySelector('#tclDays');days.value=String(state.days);
    days.addEventListener('change',()=>{state.days=Number(days.value)||30;load()});
    view.querySelector('[data-new-test]').addEventListener('click',()=>openTestModal());
    view.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;renderShell();render()}));
  }

  function render(){
    const body=view?.querySelector('#tclBody');if(!body)return;
    const b=brand();
    if(!b.id){body.innerHTML='<div class="tcl-empty"><b>Selecione uma marca</b><span>O laboratório trabalha sempre com o contexto de uma marca.</span></div>';return}
    if(state.loading){body.innerHTML='<div class="tcl-loading"><i></i><i></i><i></i> Carregando dados de tráfego…</div>';return}
    if(state.tab==='overview')renderOverview(body);
    else if(state.tab==='creatives')renderCreatives(body);
    else if(state.tab==='tests')renderTests(body);
    else if(state.tab==='top')renderTop(body);
    else renderCandidates(body);
  }

  function totals(){
    const cs=state.creatives;
    return{
      total:cs.length,
      traffic:cs.filter(x=>['EM_TRAFEGO','EM_TESTE'].includes(x.lifecycle_status)).length,
      ready:cs.filter(x=>x.lifecycle_status==='PRONTO').length,
      testing:cs.filter(x=>x.lifecycle_status==='EM_TESTE'||x.test_status==='EM_TESTE').length,
      winners:cs.filter(x=>x.lifecycle_status==='VENCEDOR'||x.test_status==='VENCEDOR').length,
      spend:cs.reduce((n,x)=>n+Number(x.spend||0),0),
      revenue:cs.reduce((n,x)=>n+Number(x.revenue||0),0),
      conversions:cs.reduce((n,x)=>n+Number(x.conversions||0),0)
    };
  }
  function renderOverview(body){
    const t=totals(),roas=t.spend?t.revenue/t.spend:0,cpa=t.conversions?t.spend/t.conversions:0;
    const pipeline=['BACKLOG','PRONTO','EM_TRAFEGO','EM_TESTE','VENCEDOR','PERDEDOR'].map(k=>({k,n:state.creatives.filter(x=>x.lifecycle_status===k).length}));
    const max=Math.max(1,...pipeline.map(x=>x.n));
    const models=[...new Set(state.creatives.map(x=>x.model).filter(Boolean))].map(m=>({m,n:state.creatives.filter(x=>x.model===m).length})).sort((a,b)=>b.n-a.n).slice(0,6);
    body.innerHTML='<div class="tcl-kpis">'+
      [['Criativos',t.total,'base cadastrada'],['Em tráfego',t.traffic,'ativos / em teste'],['Prontos',t.ready,'aguardando tráfego'],['Em teste',t.testing,'rodando agora'],['Investimento',brl(t.spend),state.days+' dias'],['ROAS',t.spend?num(roas):'—','criativos vinculados']]
      .map(x=>'<div class="tcl-kpi"><span>'+esc(x[0])+'</span><b>'+esc(x[1])+'</b><small>'+esc(x[2])+'</small></div>').join('')+
    '</div><div class="tcl-grid2">'+
      '<section class="tcl-card"><div class="tcl-card-head"><div><h3>Pipeline de criativos</h3><p>Da produção até o vencedor</p></div></div><div class="tcl-pipeline">'+
      pipeline.map(x=>'<div><span>'+labelStatus(x.k)+'</span><div><i style="width:'+Math.max(3,x.n/max*100)+'%"></i></div><b>'+x.n+'</b></div>').join('')+
      '</div></section>'+
      '<section class="tcl-card"><div class="tcl-card-head"><div><h3>Mix de formatos</h3><p>Modelos mais usados na biblioteca</p></div></div><div class="tcl-models">'+
      models.map(x=>'<div><b>'+esc(x.m)+'</b><span>'+x.n+' criativos</span></div>').join('')+
      '</div></section>'+
    '</div>'+
    '<section class="tcl-card tcl-perf"><div class="tcl-card-head"><div><h3>Performance vinculada ao tráfego</h3><p>Somente anúncios já associados por Meta Ad ID ou nome correspondente</p></div><button data-go-top>Ver melhores ADS</button></div>'+
      '<div class="tcl-perf-row">'+
      [['Gasto',brl(t.spend)],['Conversões',num(t.conversions,0)],['CPA',t.conversions?brl(cpa):'—'],['Receita',brl(t.revenue)],['ROAS',t.spend?num(roas):'—']]
      .map(x=>'<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+
      '</div></section>';
    body.querySelector('[data-go-top]')?.addEventListener('click',()=>{state.tab='top';renderShell();render()});
  }

  function filterCreatives(){
    const q=state.search.toLowerCase();
    return state.creatives.filter(x=>{
      if(state.status&&x.lifecycle_status!==state.status)return false;
      if(state.model&&x.model!==state.model)return false;
      if(state.funnel&&x.funnel!==state.funnel)return false;
      if(q&&!([x.asset_ref,x.traffic_name,x.observation,x.model,x.audience,x.generation,x.copy_variant,x.cta_variant].join(' ').toLowerCase().includes(q)))return false;
      return true;
    });
  }
  function renderCreatives(body){
    const rows=filterCreatives(),models=[...new Set(state.creatives.map(x=>x.model).filter(Boolean))].sort(),funnels=[...new Set(state.creatives.map(x=>x.funnel).filter(Boolean))].sort();
    body.innerHTML='<div class="tcl-toolbar"><div class="tcl-search"><span>⌕</span><input placeholder="Buscar criativo, público, variação…" value="'+esc(state.search)+'"></div>'+
      '<select data-filter="status"><option value="">Todos os status</option>'+['BACKLOG','PRONTO','EM_TRAFEGO','EM_TESTE','VENCEDOR','PERDEDOR','PAUSADO'].map(x=>'<option '+(state.status===x?'selected':'')+' value="'+x+'">'+labelStatus(x)+'</option>').join('')+'</select>'+
      '<select data-filter="model"><option value="">Todos os modelos</option>'+models.map(x=>'<option '+(state.model===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select>'+
      '<select data-filter="funnel"><option value="">Todos os funis</option>'+funnels.map(x=>'<option '+(state.funnel===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select>'+
      '<span class="tcl-count">'+rows.length+' criativos</span></div>'+
      '<div class="tcl-table-wrap"><table class="tcl-table"><thead><tr><th>Criativo</th><th>Estratégia</th><th>Pipeline</th><th>Performance '+state.days+'d</th><th>Teste</th><th></th></tr></thead><tbody>'+
      (rows.map(x=>creativeRow(x)).join('')||'<tr><td colspan="6"><div class="tcl-empty">Nenhum criativo nesse filtro.</div></td></tr>')+
      '</tbody></table></div>';
    const input=body.querySelector('.tcl-search input');input?.addEventListener('input',()=>{state.search=input.value;renderCreatives(body)});
    body.querySelectorAll('[data-filter]').forEach(s=>s.addEventListener('change',()=>{state[s.dataset.filter]=s.value;renderCreatives(body)}));
    body.querySelectorAll('[data-test]').forEach(b=>b.addEventListener('click',()=>openTestModal(state.creatives.find(x=>x.id===b.dataset.test))));
    body.querySelectorAll('[data-link]').forEach(b=>b.addEventListener('click',()=>openLinkModal(state.creatives.find(x=>x.id===b.dataset.link))));
  }
  function creativeRow(x){
    const title=x.traffic_name||(!String(x.asset_ref||'').startsWith('http')?x.asset_ref:'Criativo #'+(x.source_key?.split('-').pop()||''));
    const variation=[x.audience,x.generation,x.copy_variant,x.cta_variant].filter(Boolean).join(' · ')||'—';
    const hasPerf=Number(x.spend||0)>0;
    const perf=hasPerf?'<b>'+brl(x.spend)+'</b><small>CPA '+(x.cpa?brl(x.cpa):'—')+' · ROAS '+(x.roas?num(x.roas):'—')+'</small>':'<span class="tcl-muted">Sem vínculo/métricas</span>';
    const source=x.asset_url?'<a href="'+esc(x.asset_url)+'" target="_blank" rel="noreferrer">Abrir arquivo ↗</a>':'';
    return '<tr>'+
      '<td><div class="tcl-creative-name"><span class="tcl-format">'+formatIcon(x.format)+'</span><div><b>'+esc(title||'Sem nome')+'</b><small>'+esc(variation)+'</small>'+source+'</div></div></td>'+
      '<td><b class="tcl-cell-main">'+esc(x.model||'—')+'</b><small>'+esc(x.funnel||'—')+(x.observation?' · '+esc(x.observation):'')+'</small></td>'+
      '<td><span class="tcl-status s-'+String(x.lifecycle_status||'').toLowerCase()+'">'+labelStatus(x.lifecycle_status)+'</span><div class="tcl-stages"><i class="'+(x.produced?'on':'')+'">P</i><i class="'+(x.edited?'on':'')+'">E</i><i class="'+(x.in_traffic?'on':'')+'">T</i></div></td>'+
      '<td><div class="tcl-metric-cell">'+perf+'</div></td>'+
      '<td>'+(x.test_name?'<b class="tcl-cell-main">'+esc(x.test_name)+'</b><small>'+labelStatus(x.test_status)+'</small>':'<span class="tcl-muted">Sem teste</span>')+'</td>'+
      '<td><div class="tcl-row-actions"><button data-test="'+x.id+'" title="Criar teste">'+TEST+'</button><button data-link="'+x.id+'" title="Vincular Meta">'+LINK+'</button></div></td>'+
    '</tr>';
  }

  function renderTests(body){
    body.innerHTML='<div class="tcl-section-head"><div><h2>Testes de criativos</h2><p>Hipóteses, metas e resultado puxando dados do anúncio vinculado.</p></div><button class="tcl-primary" data-new>'+TEST+' Novo teste</button></div>'+
      '<div class="tcl-test-grid">'+(state.tests.map(t=>'<article class="tcl-test-card">'+
        '<div class="tcl-test-top"><span class="tcl-status s-'+String(t.status||'').toLowerCase()+'">'+labelStatus(t.status)+'</span><small>'+t.creative_count+' criativo(s)</small></div>'+
        '<h3>'+esc(t.name)+'</h3><p>'+esc(t.hypothesis||'Sem hipótese registrada.')+'</p>'+
        '<div class="tcl-test-metrics">'+[['Gasto',brl(t.spend)],['CPA',t.cpa?brl(t.cpa):'—'],['ROAS',t.roas?num(t.roas):'—'],['Meta CPA',t.target_cpa?brl(t.target_cpa):'—']].map(x=>'<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')+'</div>'+
        '<div class="tcl-test-actions">'+(t.status==='EM_TESTE'?'<button data-status="'+t.id+'" data-value="VENCEDOR">Marcar vencedor</button><button data-status="'+t.id+'" data-value="PAUSADO">Pausar</button>':'')+'<button data-status="'+t.id+'" data-value="ENCERRADO">Encerrar</button></div>'+
      '</article>').join('')||'<div class="tcl-empty"><b>Nenhum teste criado</b><span>Escolha um criativo e clique em “Testar”.</span></div>')+'</div>';
    body.querySelector('[data-new]')?.addEventListener('click',()=>openTestModal());
    body.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>updateTestStatus(b.dataset.status,b.dataset.value)));
  }

  function renderTop(body){
    const ranked=state.creatives.filter(x=>Number(x.spend||0)>0).sort((a,b)=>(Number(b.roas||0)-Number(a.roas||0))||(Number(a.cpa||999999)-Number(b.cpa||999999)));
    body.innerHTML='<div class="tcl-section-head"><div><h2>Melhores ADS</h2><p>Ranking automático por ROAS e CPA na janela de '+state.days+' dias.</p></div></div>'+
      (ranked.length?'<div class="tcl-top-list">'+ranked.map((x,i)=>'<article class="tcl-top-row"><strong>#'+(i+1)+'</strong><div class="tcl-top-name"><b>'+esc(x.traffic_name||x.asset_ref||'Criativo')+'</b><span>'+esc([x.model,x.audience,x.generation,x.copy_variant,x.cta_variant].filter(Boolean).join(' · '))+'</span></div><div><span>Gasto</span><b>'+brl(x.spend)+'</b></div><div><span>CPA</span><b>'+(x.cpa?brl(x.cpa):'—')+'</b></div><div><span>ROAS</span><b>'+(x.roas?num(x.roas):'—')+'</b></div><div><span>Conversões</span><b>'+num(x.conversions,0)+'</b></div></article>').join('')+'</div>':
      '<div class="tcl-empty"><b>Ainda não há métricas ligadas aos criativos</b><span>Use o botão de vínculo na biblioteca para associar o Meta Ad ID. Assim essa aba substitui a planilha manual de “Melhores ADS”.</span></div>');
  }

  function renderCandidates(body){
    body.innerHTML='<div class="tcl-section-head"><div><h2>Conteúdos para C1 / C2</h2><p>Posts orgânicos que podem virar criativos de atração.</p></div></div>'+
      '<div class="tcl-candidate-grid">'+(state.candidates.map(x=>'<article class="tcl-candidate"><div class="tcl-candidate-date">'+(x.post_date?new Date(x.post_date+'T12:00:00').toLocaleDateString('pt-BR'):'Sem data')+'</div><span class="tcl-status '+(x.traffic_status==='OK'?'s-vencedor':'')+'">'+esc(x.traffic_status||'Pendente')+'</span><h3>Conteúdo de atração</h3><div class="tcl-candidate-actions">'+(x.post_url?'<a href="'+esc(x.post_url)+'" target="_blank" rel="noreferrer">Instagram ↗</a>':'')+(x.asset_url?'<a href="'+esc(x.asset_url)+'" target="_blank" rel="noreferrer">Arquivo no Drive ↗</a>':'')+'</div></article>').join('')||'<div class="tcl-empty">Nenhum candidato cadastrado.</div>')+'</div>';
  }

  function labelStatus(v){
    return ({BACKLOG:'Backlog',PRONTO:'Pronto',EM_TRAFEGO:'Em tráfego',EM_TESTE:'Em teste',VENCEDOR:'Vencedor',PERDEDOR:'Perdedor',PAUSADO:'Pausado',PLANEJADO:'Planejado',ENCERRADO:'Encerrado'})[v]||v||'—';
  }
  function formatIcon(v){return v==='VIDEO'?'▶':v==='CARROSSEL'?'▦':v==='IMAGEM'?'▧':'↗'}

  function ensureModal(){
    if(modal?.isConnected)return modal;
    modal=document.createElement('div');modal.className='tcl-modal-backdrop';modal.hidden=true;document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-modal-close]'))closeModal()});
    return modal;
  }
  function closeModal(){if(modal)modal.hidden=true}
  function openTestModal(c){
    const m=ensureModal(),options=state.creatives.map(x=>'<option value="'+x.id+'" '+(c?.id===x.id?'selected':'')+'>'+esc(x.traffic_name||x.asset_ref||x.source_key)+'</option>').join('');
    m.innerHTML='<form class="tcl-modal" data-test-form><div class="tcl-modal-head"><div><span>Novo teste</span><h2>Testar criativo</h2></div><button type="button" data-modal-close>×</button></div>'+
      '<label>Criativo<select name="creative" required>'+options+'</select></label>'+
      '<label>Nome do teste<input name="name" required value="'+esc(c?'Teste · '+(c.traffic_name||c.asset_ref||'Criativo'):'')+'" placeholder="Ex.: UGC Kids · Hook 03"></label>'+
      '<label>Hipótese<textarea name="hypothesis" rows="3" placeholder="O que estamos tentando validar?"></textarea></label>'+
      '<div class="tcl-form-grid"><label>Meta Ad ID<input name="ad" placeholder="ID do anúncio"></label><label>Ad Set ID<input name="adset" placeholder="ID do conjunto"></label><label>Meta Campaign ID<input name="campaign" placeholder="ID da campanha"></label></div>'+
      '<div class="tcl-form-grid two"><label>CPA alvo<input name="cpa" inputmode="decimal" placeholder="0,00"></label><label>ROAS alvo<input name="roas" inputmode="decimal" placeholder="0,00"></label></div>'+
      '<div class="tcl-modal-actions"><button type="button" data-modal-close>Cancelar</button><button class="tcl-primary" type="submit">Iniciar teste</button></div></form>';
    m.hidden=false;
    m.querySelector('[data-test-form]').addEventListener('submit',saveTest);
  }
  async function saveTest(e){
    e.preventDefault();const f=new FormData(e.currentTarget),b=brand(),s=await client();
    const parse=v=>{let x=String(v||'').trim().replace(/[^\d,.-]/g,'');if(x.includes(',')&&x.includes('.'))x=x.replace(/\./g,'').replace(',','.');else if(x.includes(','))x=x.replace(',','.');const n=Number(x);return Number.isFinite(n)&&n>0?n:null};
    const {error}=await s.rpc('criar_teste_criativo',{
      p_brand_id:b.id,p_creative_id:f.get('creative'),p_nome:f.get('name'),p_hipotese:f.get('hypothesis')||null,
      p_meta_ad_id:f.get('ad')||null,p_meta_adset_id:f.get('adset')||null,p_meta_campaign_id:f.get('campaign')||null,
      p_target_cpa:parse(f.get('cpa')),p_target_roas:parse(f.get('roas'))
    });
    if(error){toast(error.message);return}
    closeModal();toast('Teste criado e ligado ao criativo.');await load();state.tab='tests';renderShell();render();
  }
  function openLinkModal(c){
    if(!c)return;const m=ensureModal();
    m.innerHTML='<form class="tcl-modal" data-link-form><div class="tcl-modal-head"><div><span>Integração</span><h2>Vincular ao Meta Ads</h2></div><button type="button" data-modal-close>×</button></div>'+
      '<div class="tcl-link-target"><b>'+esc(c.traffic_name||c.asset_ref||'Criativo')+'</b><span>As métricas passam a entrar automaticamente no ranking.</span></div>'+
      '<label>Meta Ad ID<input name="ad" value="'+esc(c.meta_ad_id||'')+'" required placeholder="ID do anúncio"></label>'+
      '<label>Ad Set ID<input name="adset" value="'+esc(c.meta_adset_id||'')+'" placeholder="ID do conjunto"></label>'+
      '<label>Meta Campaign ID<input name="campaign" value="'+esc(c.meta_campaign_id||'')+'" placeholder="ID da campanha"></label>'+
      '<div class="tcl-modal-actions"><button type="button" data-modal-close>Cancelar</button><button class="tcl-primary" type="submit">Salvar vínculo</button></div></form>';
    m.hidden=false;m.querySelector('[data-link-form]').addEventListener('submit',e=>saveLink(e,c));
  }
  async function saveLink(e,c){
    e.preventDefault();const f=new FormData(e.currentTarget),s=await client();
    const {error}=await s.rpc('vincular_criativo_meta',{p_creative_id:c.id,p_meta_ad_id:f.get('ad')||null,p_meta_adset_id:f.get('adset')||null,p_meta_campaign_id:f.get('campaign')||null,p_campaign_id:null});
    if(error){toast(error.message);return}
    closeModal();toast('Criativo vinculado ao tráfego.');await load();
  }
  async function updateTestStatus(id,status){
    const s=await client(),{error}=await s.rpc('atualizar_status_teste_criativo',{p_test_id:id,p_status:status,p_notes:null});
    if(error){toast(error.message);return}toast('Status do teste atualizado.');await load();
  }

  function wireOtherNav(){
    document.querySelectorAll('.ref2-nav-btn:not([data-key="traffic"])').forEach(b=>{
      if(b.dataset.trafficCloseWired)return;b.dataset.trafficCloseWired='1';
      b.addEventListener('click',()=>{close();restoreOthers()},{capture:true});
    });
  }
  function setup(){
    if(!installNav())return false;
    wireOtherNav();ensureView();
    document.getElementById('brandSelect')?.addEventListener('change',()=>{if(!view.hidden){renderShell();load()}});
    return true;
  }
  const obs=new MutationObserver(()=>{setup()});obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  window.AllianceOSTrafficLab={open,close,refresh:load};
})();
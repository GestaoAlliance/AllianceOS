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
  const EDIT=svg('<path d="m4 16-.7 4 4-.7L18.5 8.1 14.9 4.5 4 16Z"/><path d="m13.5 5.9 3.6 3.6"/>');
  const DRIVE=svg('<path d="M3.5 7.5h6l1.8 2H21v8.2A2.3 2.3 0 0 1 18.7 20H5.3A2.3 2.3 0 0 1 3 17.7V7.5Z"/><path d="M3.5 7.5V6A2 2 0 0 1 5.5 4h4l1.8 2h7.2A2 2 0 0 1 20.5 8v1.5"/>');
  const PLUS=svg('<path d="M12 5v14M5 12h14"/>');
  let sb=null,view=null,navBtn=null,modal=null,driveModal=null,driveSelectCallback=null,creativeDriveSelection=null;
  const state={tab:'overview',days:30,creatives:[],tests:[],candidates:[],loading:false,search:'',status:'',model:'',funnel:'',driveConnected:null};

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
  function authToken(){
    return window.AllianceOSAuth?.getAccessToken?.()||'';
  }
  async function driveRequest(params={}){
    const token=authToken();
    if(!token)throw new Error('Sessão não disponível para acessar o Drive.');
    const b=brand();
    if(!b.id)throw new Error('Selecione uma marca antes de abrir o Drive.');
    const u=new URL('/api/drive',location.origin);
    u.searchParams.set('marca',b.name);
    Object.entries(params).forEach(([k,v])=>{if(v!=null&&v!=='')u.searchParams.set(k,String(v))});
    const r=await fetch(u.toString(),{cache:'no-store',headers:{Authorization:'Bearer '+token}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.erro||('Drive HTTP '+r.status));
    return data;
  }
  function driveStatusLabel(){
    if(state.driveConnected===true)return 'Drive conectado';
    if(state.driveConnected===false)return 'Drive não conectado';
    return 'Verificando Drive';
  }
  function updateDriveStatus(){
    const el=view?.querySelector('[data-drive-status]');
    if(!el)return;
    el.classList.toggle('connected',state.driveConnected===true);
    el.classList.toggle('offline',state.driveConnected===false);
    const label=el.querySelector('b');if(label)label.textContent=driveStatusLabel();
  }
  async function loadDriveStatus(){
    if(!brand().id){state.driveConnected=false;updateDriveStatus();return}
    try{
      const d=await driveRequest({diagnostico:'1'});
      state.driveConnected=!!(d.conta_servico_configurada&&d.pasta_configurada);
    }catch(_){state.driveConnected=false}
    updateDriveStatus();
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
    loadDriveStatus();
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
      '<div class="tcl-head-actions">'+
        '<span class="tcl-drive-status" data-drive-status>'+DRIVE+'<b>'+driveStatusLabel()+'</b></span>'+
        '<label>Janela <select id="tclDays"><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></label>'+
        '<button class="tcl-secondary" data-new-test>'+TEST+' Novo teste</button>'+
        '<button class="tcl-primary" data-new-creative>'+PLUS+' Novo criativo</button>'+
      '</div>'+
    '</div>'+
    '<div class="tcl-tabs">'+
      [['overview','Visão geral'],['creatives','Biblioteca'],['tests','Testes'],['top','Performance'],['candidates','C1 / C2']]
      .map(([k,l])=>'<button data-tab="'+k+'" class="'+(state.tab===k?'active':'')+'">'+esc(l)+'</button>').join('')+
    '</div><div id="tclBody"></div>';

    const days=view.querySelector('#tclDays');days.value=String(state.days);
    days.addEventListener('change',()=>{state.days=Number(days.value)||30;load()});
    view.querySelector('[data-new-test]').addEventListener('click',()=>openTestModal());
    view.querySelector('[data-new-creative]').addEventListener('click',()=>openCreativeModal());
    view.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;renderShell();render()}));
    updateDriveStatus();
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
      (rows.map(x=>creativeRow(x)).join('')||'<tr><td colspan="6"><div class="tcl-empty"><b>Nenhum criativo cadastrado</b><span>Cadastre manualmente como na planilha ou selecione o arquivo diretamente no Drive da marca.</span><button class="tcl-empty-action" data-new-creative>'+PLUS+' Cadastrar criativo</button></div></td></tr>')+
      '</tbody></table></div>';
    const input=body.querySelector('.tcl-search input');input?.addEventListener('input',()=>{state.search=input.value;renderCreatives(body)});
    body.querySelectorAll('[data-filter]').forEach(s=>s.addEventListener('change',()=>{state[s.dataset.filter]=s.value;renderCreatives(body)}));
    body.querySelectorAll('[data-new-creative]').forEach(b=>b.addEventListener('click',()=>openCreativeModal()));
    body.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openCreativeModal(state.creatives.find(x=>x.id===b.dataset.edit))));
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
      '<td><div class="tcl-row-actions"><button data-edit="'+x.id+'" title="Editar criativo">'+EDIT+'</button><button data-test="'+x.id+'" title="Criar teste">'+TEST+'</button><button data-link="'+x.id+'" title="Vincular Meta">'+LINK+'</button></div></td>'+
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

  function ensureDriveModal(){
    if(driveModal?.isConnected)return driveModal;
    driveModal=document.createElement('div');
    driveModal.className='tcl-drive-backdrop';
    driveModal.hidden=true;
    document.body.appendChild(driveModal);
    driveModal.addEventListener('click',e=>{
      if(e.target===driveModal||e.target.closest('[data-drive-close]'))closeDriveModal();
    });
    return driveModal;
  }
  function closeDriveModal(){
    if(driveModal)driveModal.hidden=true;
    driveSelectCallback=null;
  }
  function formatFromDrive(item){
    if(item?.pasta)return 'CARROSSEL';
    const type=String(item?.tipo||'').toLowerCase();
    const name=String(item?.nome||'').toLowerCase();
    if(type.startsWith('video/')||/\.(mp4|mov|webm|m4v|avi)$/.test(name))return 'VIDEO';
    if(type.startsWith('image/')||/\.(png|jpe?g|webp|gif|svg)$/.test(name))return 'IMAGEM';
    return '';
  }
  async function renderDriveFolder(folderId){
    const d=ensureDriveModal();
    d.hidden=false;
    d.innerHTML='<section class="tcl-drive-dialog"><div class="tcl-drive-loading"><i></i><i></i><i></i><span>Carregando Drive de '+esc(brand().name)+'…</span></div></section>';
    try{
      const data=await driveRequest(folderId?{pasta:folderId}:{});
      if(data.ligado===false)throw new Error(data.erro||'O Drive desta marca não está conectado.');
      state.driveConnected=true;updateDriveStatus();
      const trail=[{id:'',nome:brand().name}].concat(Array.isArray(data.trilha)?data.trilha:[]);
      const currentName=trail[trail.length-1]?.nome||brand().name;
      const files=Array.isArray(data.arquivos)?data.arquivos:[];
      d.innerHTML='<section class="tcl-drive-dialog">'+
        '<header class="tcl-drive-head"><div><span>GOOGLE DRIVE</span><h2>Escolher criativo</h2><p>Selecione um arquivo ou uma pasta da estrutura de '+esc(brand().name)+'.</p></div><button type="button" data-drive-close>×</button></header>'+
        '<div class="tcl-drive-crumbs">'+trail.map((x,i)=>'<button type="button" data-drive-crumb="'+esc(x.id||'')+'">'+esc(x.nome)+(i<trail.length-1?' ›':'')+'</button>').join('')+'</div>'+
        '<div class="tcl-drive-current"><div><b>'+esc(currentName)+'</b><span>'+files.length+' item'+(files.length===1?'':'s')+'</span></div><button type="button" data-drive-use-folder>'+DRIVE+' Usar esta pasta</button></div>'+
        '<div class="tcl-drive-list">'+(files.length?files.map((x,i)=>'<button type="button" class="tcl-drive-row '+(x.pasta?'folder':'file')+'" '+(x.pasta?'data-drive-open="'+esc(x.id)+'"':'data-drive-file="'+i+'"')+'><span class="tcl-drive-row-icon">'+(x.pasta?DRIVE:formatIcon(formatFromDrive(x)))+'</span><span class="tcl-drive-row-copy"><b>'+esc(x.nome)+'</b><small>'+(x.pasta?'Pasta':esc(x.tipo||'Arquivo'))+'</small></span><i>'+(x.pasta?'›':'Selecionar')+'</i></button>').join(''):'<div class="tcl-drive-empty">Nenhum arquivo nesta pasta.</div>')+'</div>'+
      '</section>';
      d.querySelectorAll('[data-drive-crumb]').forEach(btn=>btn.addEventListener('click',()=>renderDriveFolder(btn.dataset.driveCrumb||null)));
      d.querySelectorAll('[data-drive-open]').forEach(btn=>btn.addEventListener('click',()=>renderDriveFolder(btn.dataset.driveOpen)));
      d.querySelector('[data-drive-use-folder]')?.addEventListener('click',()=>{
        const selected={id:data.pasta,nome:currentName,tipo:'application/vnd.google-apps.folder',pasta:true,link:'https://drive.google.com/drive/folders/'+data.pasta,folderId:data.pasta};
        const cb=driveSelectCallback;closeDriveModal();cb?.(selected);
      });
      d.querySelectorAll('[data-drive-file]').forEach(btn=>btn.addEventListener('click',()=>{
        const x=files[Number(btn.dataset.driveFile)];
        if(!x)return;
        const selected=Object.assign({},x,{folderId:data.pasta});
        const cb=driveSelectCallback;closeDriveModal();cb?.(selected);
      }));
      d.querySelector('[data-drive-close]')?.addEventListener('click',closeDriveModal);
    }catch(err){
      state.driveConnected=false;updateDriveStatus();
      d.innerHTML='<section class="tcl-drive-dialog"><header class="tcl-drive-head"><div><span>GOOGLE DRIVE</span><h2>Drive indisponível</h2><p>'+esc(err?.message||err)+'</p></div><button type="button" data-drive-close>×</button></header><div class="tcl-drive-empty">A raiz do Drive precisa estar configurada para esta marca e compartilhada com a conta de serviço do AllianceOS.</div></section>';
      d.querySelector('[data-drive-close]')?.addEventListener('click',closeDriveModal);
    }
  }
  function openDrivePicker(callback){
    driveSelectCallback=callback;
    renderDriveFolder(null);
  }
  function selectedDriveMarkup(sel){
    if(!sel)return '<div class="tcl-drive-selected empty"><span>'+DRIVE+'</span><div><b>Nenhum arquivo selecionado</b><small>Você pode escolher no Drive ou colar um link manualmente.</small></div></div>';
    return '<div class="tcl-drive-selected"><span>'+DRIVE+'</span><div><b>'+esc(sel.name||sel.nome||'Item do Drive')+'</b><small>'+esc(sel.isFolder||sel.pasta?'Pasta do Drive':'Arquivo do Drive')+'</small></div><a href="'+esc(sel.link||'')+'" target="_blank" rel="noreferrer">Abrir ↗</a></div>';
  }
  function applyCreativeDriveSelection(form,item){
    creativeDriveSelection=item?{
      fileId:item.pasta?null:item.id,
      folderId:item.pasta?item.id:item.folderId,
      name:item.nome||'',
      type:item.tipo||'',
      link:item.link||'',
      isFolder:!!item.pasta
    }:null;
    const selected=form.querySelector('[data-creative-drive-selected]');
    if(selected)selected.innerHTML=selectedDriveMarkup(creativeDriveSelection);
    const ref=form.elements.asset_ref;
    const url=form.elements.asset_url;
    const fmt=form.elements.format;
    if(item){
      if(ref)ref.value=item.nome||ref.value;
      if(url)url.value=item.link||url.value;
      const inferred=formatFromDrive(item);if(fmt&&inferred)fmt.value=inferred;
    }
  }
  async function openCreativeModal(c){
    const m=ensureModal();
    let d=c||{};
    if(c?.id){
      try{
        const sbc=await client(),r=await sbc.rpc('obter_criativo_trafego',{p_creative_id:c.id});
        if(r.error)throw r.error;
        if(r.data)d=r.data;
      }catch(err){toast(err?.message||'Não foi possível abrir o criativo.');return}
    }
    const md=d.metadata||{};
    creativeDriveSelection=(md.drive_file_id||md.drive_folder_id)?{
      fileId:md.drive_file_id||null,
      folderId:md.drive_folder_id||null,
      name:md.drive_name||d.asset_ref||'Item do Drive',
      type:md.drive_mime_type||'',
      link:d.asset_url||'',
      isFolder:!md.drive_file_id&&!!md.drive_folder_id
    }:null;
    const models=[...new Set(['UGC','OFERTA DIRETA','NOTICIA','MENSAGEM','COMPARATIVO','DOR','CARROSSEL',...state.creatives.map(x=>x.model).filter(Boolean)])];
    const funnels=[...new Set(['Tráfego direto','RMKT','Madrugada',...state.creatives.map(x=>x.funnel).filter(Boolean)])];
    const checked=v=>v?' checked':'';
    m.innerHTML='<form class="tcl-modal tcl-creative-modal" data-creative-form>'+
      '<div class="tcl-modal-head"><div><span>CRIATIVO · '+esc(brand().name)+'</span><h2>'+(d.id?'Editar criativo':'Cadastrar criativo')+'</h2><p>Mesmos campos operacionais da planilha, agora ligados ao Drive.</p></div><button type="button" data-modal-close>×</button></div>'+
      '<input type="hidden" name="id" value="'+esc(d.id||'')+'">'+
      '<div class="tcl-source-note"><b>Planilha → AllianceOS</b><span>Produção, Editado, Tráfego, Link do criativo, Descrição, Modelo, Funil, Observação e Nome no tráfego.</span></div>'+
      '<div class="tcl-drive-field"><div class="tcl-drive-field-head"><div><b>Arquivo / pasta no Drive</b><span>Use a estrutura oficial da marca.</span></div><button type="button" data-pick-drive>'+DRIVE+' Selecionar no Drive</button></div><div data-creative-drive-selected>'+selectedDriveMarkup(creativeDriveSelection)+'</div></div>'+
      '<div class="tcl-form-grid two"><label>Link do criativo<input name="asset_url" value="'+esc(d.asset_url||'')+'" placeholder="https://drive.google.com/..."></label><label>Nome / referência do arquivo<input name="asset_ref" required value="'+esc(d.asset_ref||'')+'" placeholder="Ex.: ADS19-KIDS-g3-c2-cta2.mp4"></label></div>'+
      '<label>Descrição do arquivo<textarea name="description" rows="2" placeholder="Descrição rápida para o time">'+esc(d.description||'')+'</textarea></label>'+
      '<div class="tcl-form-grid two"><label>Modelo<input name="model" list="tclModels" value="'+esc(d.model||'')+'" placeholder="Ex.: UGC, OFERTA DIRETA"><datalist id="tclModels">'+models.map(x=>'<option value="'+esc(x)+'"></option>').join('')+'</datalist></label><label>Funil<input name="funnel" list="tclFunnels" value="'+esc(d.funnel||'')+'" placeholder="Ex.: Tráfego direto"><datalist id="tclFunnels">'+funnels.map(x=>'<option value="'+esc(x)+'"></option>').join('')+'</datalist></label></div>'+
      '<label>Observação<input name="observation" value="'+esc(d.observation||'')+'" placeholder="Ex.: Joingle Kids, campanha Dia D…"></label>'+
      '<label>Nome do criativo no Tráfego<input name="traffic_name" value="'+esc(d.traffic_name||'')+'" placeholder="Nome usado no Meta Ads"></label>'+
      '<div class="tcl-check-grid"><label><input type="checkbox" name="produced"'+checked(d.produced)+'><span><b>Produção</b><small>Criativo produzido</small></span></label><label><input type="checkbox" name="edited"'+checked(d.edited)+'><span><b>Editado</b><small>Arquivo finalizado</small></span></label><label><input type="checkbox" name="in_traffic"'+checked(d.in_traffic)+'><span><b>Tráfego</b><small>Já está rodando</small></span></label></div>'+
      '<details class="tcl-creative-advanced"><summary>Detalhes de variação</summary><div class="tcl-form-grid two"><label>Formato<select name="format"><option value="">Automático / não definido</option>'+['IMAGEM','VIDEO','CARROSSEL','OUTRO'].map(x=>'<option value="'+x+'" '+(String(d.format||'').toUpperCase()===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label>Público<input name="audience" value="'+esc(d.audience||'')+'" placeholder="Ex.: Adulto / Kids"></label><label>Geração<input name="generation" value="'+esc(d.generation||'')+'" placeholder="Ex.: g3"></label><label>Copy<input name="copy_variant" value="'+esc(d.copy_variant||'')+'" placeholder="Ex.: c2"></label><label>CTA<input name="cta_variant" value="'+esc(d.cta_variant||'')+'" placeholder="Ex.: cta2"></label></div></details>'+
      '<div class="tcl-modal-actions"><button type="button" data-modal-close>Cancelar</button><button class="tcl-primary" type="submit">'+PLUS+' Salvar criativo</button></div>'+
    '</form>';
    m.hidden=false;
    const form=m.querySelector('[data-creative-form]');
    form.querySelector('[data-pick-drive]').addEventListener('click',()=>openDrivePicker(item=>applyCreativeDriveSelection(form,item)));
    form.addEventListener('submit',saveCreative);
  }
  async function saveCreative(e){
    e.preventDefault();
    const form=e.currentTarget,f=new FormData(form),b=brand(),s=await client(),sel=creativeDriveSelection;
    const btn=form.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Salvando…'}
    const {error}=await s.rpc('salvar_criativo_trafego',{
      p_brand_id:b.id,
      p_id:f.get('id')||null,
      p_asset_ref:f.get('asset_ref')||null,
      p_asset_url:f.get('asset_url')||null,
      p_description:f.get('description')||null,
      p_model:f.get('model')||null,
      p_funnel:f.get('funnel')||null,
      p_observation:f.get('observation')||null,
      p_traffic_name:f.get('traffic_name')||null,
      p_audience:f.get('audience')||null,
      p_format:f.get('format')||null,
      p_generation:f.get('generation')||null,
      p_copy_variant:f.get('copy_variant')||null,
      p_cta_variant:f.get('cta_variant')||null,
      p_produced:f.get('produced')==='on',
      p_edited:f.get('edited')==='on',
      p_in_traffic:f.get('in_traffic')==='on',
      p_drive_file_id:sel?.fileId||null,
      p_drive_folder_id:sel?.folderId||null,
      p_drive_name:sel?.name||null,
      p_drive_mime_type:sel?.type||null
    });
    if(error){if(btn){btn.disabled=false;btn.innerHTML=PLUS+' Salvar criativo'};toast(error.message);return}
    closeModal();creativeDriveSelection=null;state.tab='creatives';renderShell();await load();toast('Criativo salvo na biblioteca.');
  }

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
    document.getElementById('brandSelect')?.addEventListener('change',()=>{if(!view.hidden){state.driveConnected=null;renderShell();loadDriveStatus();load()}});
    return true;
  }
  const obs=new MutationObserver(()=>{setup()});obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  window.AllianceOSTrafficLab={open,close,refresh:load};
})();
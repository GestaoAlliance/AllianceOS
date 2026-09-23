(() => {
  'use strict';
  if(window.AllianceOSAccessCenter)return;

  const BASE_VIEW_IDS=['homeView','tasksView','planningView','campaignsView','deliveriesView','painelView','alliance-full-view'];
  const state={view:null,entries:[],brandId:null,brandName:'',tab:'access',query:'',category:'all',loading:false,selected:null};
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const svg=(body,cls='')=>'<svg class="'+cls+'" viewBox="0 0 24 24" aria-hidden="true">'+body+'</svg>';
  const ICONS={
    key:svg('<circle cx="8" cy="15.5" r="4.5"/><path d="m11.2 12.3 8-8M16 7.5l2.5 2.5M13.5 10l2.5 2.5"/>'),
    search:svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
    plus:svg('<path d="M12 5v14M5 12h14"/>'),
    lock:svg('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    eye:svg('<path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/>'),
    copy:svg('<rect x="8" y="8" width="10" height="11" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    external:svg('<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>'),
    edit:svg('<path d="m4 16-.8 4 4-.8L18.5 7.9 15.1 4.5 4 16Z"/><path d="m13.8 5.8 3.4 3.4"/>'),
    trash:svg('<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>'),
    chevron:svg('<path d="m9 6 6 6-6 6"/>'),
    shield:svg('<path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.6-4"/>')
  };

  function toast(msg){
    if(window.showToast){window.showToast(msg);return}
    const n=document.createElement('div');n.className='ac-toast';n.textContent=msg;document.body.appendChild(n);
    setTimeout(()=>n.remove(),2200);
  }
  function sb(){
    const c=window.AllianceOSAuth?.client;
    if(!c)throw new Error('Sessão do AllianceOS ainda não carregou.');
    return c;
  }
  function selectedBrand(){
    const select=document.getElementById('brandSelect');
    const opt=select?.selectedOptions?.[0];
    const id=opt?.dataset?.brandId||'';
    if(id&&id!=='__all__')return {id,name:opt?.textContent||select.value||'Marca'};
    const brands=window.AllianceOSDirectory?.brands||window.AllianceOSSession?.brands||[];
    if(brands.length===1)return {id:brands[0].id,name:brands[0].nome||brands[0].name||'Marca'};
    return {id:null,name:'Todas as marcas'};
  }
  function host(){
    const home=document.getElementById('homeView');
    return home?.parentElement||document.querySelector('.content')||document.querySelector('main')||document.body;
  }
  function ensureView(){
    if(state.view?.isConnected)return state.view;
    const v=document.createElement('section');v.id='accessCenterView';v.className='access-center-view';v.hidden=true;
    v.innerHTML='<div class="ac-shell"><div class="ac-loading">Carregando Central de Acessos…</div></div>';
    host().appendChild(v);state.view=v;
    return v;
  }
  function hideOtherViews(){
    BASE_VIEW_IDS.forEach(id=>{const v=document.getElementById(id);if(v&&v!==state.view){v.dataset.acPrevDisplay=v.style.display||'';v.style.setProperty('display','none','important')}});
  }
  function restoreOtherViews(){
    BASE_VIEW_IDS.forEach(id=>{const v=document.getElementById(id);if(!v)return;v.style.removeProperty('display');delete v.dataset.acPrevDisplay});
  }
  function close(){
    if(state.view)state.view.hidden=true;
    restoreOtherViews();
  }
  function tabOf(e){
    if(e.status==='cancelled')return 'cancelled';
    if(e.kind==='technical')return 'technical';
    if(e.kind==='pixel')return 'pixels';
    return 'access';
  }
  function filtered(){
    return state.entries.filter(e=>{
      if(tabOf(e)!==state.tab)return false;
      if(state.category!=='all'&&e.category!==state.category)return false;
      const q=norm(state.query);
      if(!q)return true;
      return norm([e.name,e.description,e.category,e.owner,e.username,e.payment_method,e.notes].join(' ')).includes(q);
    });
  }
  function money(n){
    if(n===null||n===undefined||n==='')return null;
    const x=Number(n);if(!Number.isFinite(x))return null;
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(x);
  }
  function monthlyCost(e){
    const n=Number(e.cost_amount);if(!Number.isFinite(n)||n<=0)return 0;
    const r=norm(e.recurrence);
    if(r.includes('anual'))return n/12;
    if(r.includes('semestr'))return n/6;
    if(r.includes('trimestr'))return n/3;
    return n;
  }
  function dateLabel(v){
    if(!v)return '—';
    const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('pt-BR');
  }
  function renewalSoon(e){
    if(e.status!=='active')return false;
    const now=new Date(),limit=new Date(now);limit.setDate(limit.getDate()+30);
    if(e.renewal_date){
      const d=new Date(e.renewal_date+'T12:00:00');return d>=now&&d<=limit;
    }
    if(e.renewal_day){
      const d=new Date(now.getFullYear(),now.getMonth(),Number(e.renewal_day));
      if(d<now)d.setMonth(d.getMonth()+1);
      return d<=limit;
    }
    return false;
  }
  function categoryMark(cat){
    const c=norm(cat);
    if(c.includes('google'))return 'G';
    if(c.includes('crm'))return 'C';
    if(c.includes('ia'))return 'AI';
    if(c.includes('anuncio'))return 'AD';
    if(c.includes('site')||c.includes('infra'))return 'WEB';
    if(c.includes('automacao'))return 'AUT';
    if(c.includes('pagamento'))return '$';
    if(c.includes('telefon'))return 'TEL';
    if(c.includes('tecnic'))return '</>';
    return '•';
  }
  function secretState(e){
    const count=(e.secrets||[]).length;
    const pending=(e.pending_secret_labels||[]).length;
    if(count)return '<span class="ac-secret-badge ok">'+ICONS.shield+count+' protegida'+(count===1?'':'s')+'</span>';
    if(pending)return '<span class="ac-secret-badge warn">'+ICONS.lock+pending+' pendente'+(pending===1?'':'s')+'</span>';
    return '<span class="ac-secret-badge neutral">Sem segredo</span>';
  }
  function entryRow(e){
    const cost=money(e.cost_amount)||e.cost_label||'—';
    const renewal=e.renewal_date?dateLabel(e.renewal_date):(e.renewal_day?'Dia '+e.renewal_day:'—');
    const can=!!e.can_manage;
    return '<article class="ac-row" data-ac-entry="'+esc(e.id)+'">'+
      '<div class="ac-brandmark">'+esc(categoryMark(e.category))+'</div>'+
      '<div class="ac-main"><div class="ac-name-line"><strong>'+esc(e.name)+'</strong>'+(e.status==='cancelled'?'<span class="ac-status cancelled">Cancelado</span>':'')+'</div><span>'+esc(e.description||e.category||'Sem descrição')+'</span></div>'+
      '<div class="ac-cell ac-login"><small>Usuário</small><b>'+esc(e.username||'—')+'</b></div>'+
      '<div class="ac-cell ac-owner"><small>Responsável</small><b>'+esc(e.owner||'—')+'</b></div>'+
      '<div class="ac-cell ac-cost"><small>Custo</small><b>'+esc(cost)+'</b><em>'+esc(e.recurrence||'')+'</em></div>'+
      '<div class="ac-cell ac-renew"><small>Renovação</small><b class="'+(renewalSoon(e)?'soon':'')+'">'+esc(renewal)+'</b></div>'+
      '<div class="ac-secrets">'+secretState(e)+'</div>'+
      '<div class="ac-row-actions">'+
        (e.login_url?'<a class="ac-icon-btn" href="'+esc(e.login_url)+'" target="_blank" rel="noopener" title="Abrir acesso">'+ICONS.external+'</a>':'')+
        '<button class="ac-icon-btn" type="button" data-ac-open="'+esc(e.id)+'" title="Ver detalhes">'+ICONS.chevron+'</button>'+
      '</div>'+
    '</article>';
  }
  function categories(){
    const rows=state.entries.filter(e=>tabOf(e)===state.tab);
    return [...new Set(rows.map(e=>e.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  }
  function kpis(){
    const active=state.entries.filter(e=>e.status==='active');
    const monthly=active.reduce((n,e)=>n+monthlyCost(e),0);
    const secrets=active.reduce((n,e)=>n+(e.secrets||[]).length,0);
    const renew=active.filter(renewalSoon).length;
    return [
      ['Acessos ativos',active.length,'Contas e ferramentas'],
      ['Credenciais protegidas',secrets,'Criptografadas no Vault'],
      ['Renovam em 30 dias',renew,renew?'Revisar próximas cobranças':'Nenhuma próxima'],
      ['Custo mensal estimado',money(monthly)||'R$ 0,00','Normalizado por recorrência']
    ];
  }
  function render(){
    const v=ensureView(),rows=filtered(),cats=categories(),canManage=state.entries.some(e=>e.can_manage);
    const tabDefs=[
      ['access','Acessos',state.entries.filter(e=>tabOf(e)==='access').length],
      ['technical','Credenciais técnicas',state.entries.filter(e=>tabOf(e)==='technical').length],
      ['pixels','Pixels & códigos',state.entries.filter(e=>tabOf(e)==='pixels').length],
      ['cancelled','Cancelados',state.entries.filter(e=>tabOf(e)==='cancelled').length]
    ];
    v.innerHTML='<div class="ac-shell">'+
      '<header class="ac-head"><div><span class="ac-eyebrow">SEGURANÇA & OPERAÇÃO</span><h1>Central de Acessos</h1><p>'+esc(state.brandName)+' · senhas e chaves ficam criptografadas e só são reveladas sob demanda.</p></div>'+
      '<div class="ac-head-actions">'+(canManage?'<button type="button" class="ac-primary" data-ac-new>'+ICONS.plus+'Novo acesso</button>':'')+'</div></header>'+
      '<section class="ac-kpis">'+kpis().map(x=>'<div class="ac-kpi"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong><small>'+esc(x[2])+'</small></div>').join('')+'</section>'+
      '<section class="ac-panel">'+
        '<div class="ac-toolbar"><div class="ac-search">'+ICONS.search+'<input type="search" data-ac-search placeholder="Buscar ferramenta, usuário, responsável…" value="'+esc(state.query)+'"></div>'+
        '<select data-ac-category><option value="all">Todas as categorias</option>'+cats.map(c=>'<option '+(state.category===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></div>'+
        '<div class="ac-tabs">'+tabDefs.map(t=>'<button type="button" data-ac-tab="'+t[0]+'" class="'+(state.tab===t[0]?'active':'')+'"><span>'+esc(t[1])+'</span><b>'+t[2]+'</b></button>').join('')+'</div>'+
        '<div class="ac-list-head"><span>Ferramenta / conta</span><span>Usuário</span><span>Responsável</span><span>Custo</span><span>Renovação</span><span>Credenciais</span><span></span></div>'+
        '<div class="ac-list">'+(rows.length?rows.map(entryRow).join(''):'<div class="ac-empty">'+ICONS.key+'<strong>Nenhum item aqui</strong><span>Ajuste a busca ou adicione um novo acesso.</span></div>')+'</div>'+
      '</section>'+
      '</div>'+
      '<div class="ac-modal-host" data-ac-modal-host></div>';
    bind();
  }
  function bind(){
    const v=state.view;if(!v)return;
    v.querySelector('[data-ac-search]')?.addEventListener('input',e=>{state.query=e.target.value;render()});
    v.querySelector('[data-ac-category]')?.addEventListener('change',e=>{state.category=e.target.value;render()});
    v.querySelectorAll('[data-ac-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.acTab;state.category='all';render()}));
    v.querySelector('[data-ac-new]')?.addEventListener('click',()=>openEditor(null));
    v.querySelectorAll('[data-ac-open]').forEach(b=>b.addEventListener('click',()=>openDetails(b.dataset.acOpen)));
  }
  async function load(){
    state.loading=true;
    try{
      await window.AllianceOSAuth?.ready;
      const brand=selectedBrand();state.brandId=brand.id;state.brandName=brand.name;
      const {data,error}=await sb().rpc('access_center_list',{p_brand_id:brand.id||null});
      if(error)throw error;
      state.entries=Array.isArray(data)?data:[];
      render();
    }catch(e){
      ensureView().innerHTML='<div class="ac-shell"><div class="ac-error"><strong>Não foi possível carregar a Central de Acessos</strong><span>'+esc(e?.message||e)+'</span><button type="button" data-ac-retry>Tentar novamente</button></div></div>';
      state.view.querySelector('[data-ac-retry]')?.addEventListener('click',load);
    }finally{state.loading=false}
  }
  async function open(){
    const v=ensureView();hideOtherViews();v.hidden=false;
    v.innerHTML='<div class="ac-shell"><div class="ac-loading"><span></span>Carregando Central de Acessos…</div></div>';
    await load();
  }
  function modal(html){
    const host=state.view.querySelector('[data-ac-modal-host]');if(!host)return null;
    host.innerHTML='<div class="ac-modal open"><div class="ac-backdrop" data-ac-close></div>'+html+'</div>';
    host.querySelectorAll('[data-ac-close]').forEach(x=>x.addEventListener('click',()=>host.replaceChildren()));
    return host;
  }
  function detailLine(label,value,copy){
    if(!value)return '';
    return '<div class="ac-detail-line"><span>'+esc(label)+'</span><div><b>'+esc(value)+'</b>'+(copy?'<button type="button" class="ac-copy-mini" data-ac-copy="'+esc(value)+'">'+ICONS.copy+'</button>':'')+'</div></div>';
  }
  function openDetails(id){
    const e=state.entries.find(x=>String(x.id)===String(id));if(!e)return;
    state.selected=e;
    const secrets=[...(e.secrets||[]),...(e.pending_secret_labels||[]).map((label,i)=>({id:null,label,kind:'pending',sort_order:999+i}))];
    const host=modal('<section class="ac-dialog ac-detail-dialog"><header><div><span>'+esc(e.category||'Acesso')+'</span><h2>'+esc(e.name)+'</h2><p>'+esc(e.description||'Informações de acesso e segurança.')+'</p></div><button type="button" class="ac-close" data-ac-close>×</button></header>'+
      '<div class="ac-dialog-body">'+
        '<div class="ac-detail-grid">'+
          detailLine('Usuário / e-mail',e.username,true)+detailLine('Responsável',e.owner,false)+detailLine('Forma de pagamento',e.payment_method,false)+detailLine('Custo',money(e.cost_amount)||e.cost_label,false)+
          detailLine('Recorrência',e.recurrence,false)+detailLine('Data da compra',dateLabel(e.purchase_date),false)+detailLine('Renovação',e.renewal_date?dateLabel(e.renewal_date):(e.renewal_day?'Dia '+e.renewal_day:null),false)+detailLine('Recuperação',e.recovery_contact,true)+
          detailLine('2FA',e.two_factor_enabled===true?'Ativado':e.two_factor_enabled===false?'Não ativado':null,false)+detailLine('Observações',e.notes,false)+
        '</div>'+
        (e.login_url?'<a class="ac-open-link" href="'+esc(e.login_url)+'" target="_blank" rel="noopener">'+ICONS.external+'Abrir plataforma</a>':'')+
        '<div class="ac-secret-section"><div class="ac-section-title"><div><span>Credenciais protegidas</span><small>O valor só é carregado quando você clicar em Revelar.</small></div>'+(e.can_manage?'<button type="button" data-ac-add-secret>'+ICONS.plus+'Adicionar</button>':'')+'</div>'+
          '<div class="ac-secret-list">'+(secrets.length?secrets.map(s=>s.id?'<div class="ac-secret-row" data-secret-row="'+esc(s.id)+'"><div>'+ICONS.lock+'<span><b>'+esc(s.label)+'</b><small>'+esc(s.kind||'credencial')+'</small></span></div><code data-secret-value="'+esc(s.id)+'">••••••••••••</code><div class="ac-secret-actions"><button type="button" data-ac-reveal="'+esc(s.id)+'">'+ICONS.eye+'Revelar</button><button type="button" data-ac-copy-secret="'+esc(s.id)+'" disabled>'+ICONS.copy+'</button>'+(e.can_manage?'<button type="button" data-ac-edit-secret="'+esc(s.id)+'">'+ICONS.edit+'</button>':'')+'</div></div>':'<div class="ac-secret-row pending"><div>'+ICONS.lock+'<span><b>'+esc(s.label)+'</b><small>Aguardando valor</small></span></div><code>Não cadastrado</code>'+(e.can_manage?'<button type="button" data-ac-create-pending="'+esc(s.label)+'">Cadastrar</button>':'')+'</div>').join(''):'<div class="ac-secret-empty">Nenhuma senha ou chave cadastrada para este item.</div>')+'</div>'+
        '</div>'+
      '</div>'+
      '<footer>'+(e.can_manage?'<button type="button" class="ac-danger-link" data-ac-archive>'+ICONS.trash+'Arquivar</button><button type="button" class="ac-secondary" data-ac-edit>'+ICONS.edit+'Editar dados</button>':'')+'<button type="button" class="ac-primary" data-ac-close>Fechar</button></footer></section>');
    if(!host)return;
    host.querySelectorAll('[data-ac-copy]').forEach(b=>b.addEventListener('click',()=>copyText(b.dataset.acCopy,'Copiado.')));
    host.querySelectorAll('[data-ac-reveal]').forEach(b=>b.addEventListener('click',()=>revealSecret(e,b.dataset.acReveal,host)));
    host.querySelectorAll('[data-ac-copy-secret]').forEach(b=>b.addEventListener('click',()=>{const code=host.querySelector('[data-secret-value="'+CSS.escape(b.dataset.acCopySecret)+'"]');if(code?.dataset.raw)copyText(code.dataset.raw,'Credencial copiada.')})); 
    host.querySelectorAll('[data-ac-edit-secret]').forEach(b=>b.addEventListener('click',()=>editSecret(e,b.dataset.acEditSecret,host)));
    host.querySelectorAll('[data-ac-create-pending]').forEach(b=>b.addEventListener('click',()=>editSecret(e,null,host,b.dataset.acCreatePending)));
    host.querySelector('[data-ac-add-secret]')?.addEventListener('click',()=>editSecret(e,null,host));
    host.querySelector('[data-ac-edit]')?.addEventListener('click',()=>openEditor(e));
    host.querySelector('[data-ac-archive]')?.addEventListener('click',()=>archiveEntry(e));
  }
  async function revealSecret(entry,secretId,host){
    const btn=host.querySelector('[data-ac-reveal="'+CSS.escape(secretId)+'"]');
    if(btn){btn.disabled=true;btn.innerHTML='<span class="ac-spinner"></span>Carregando';}
    try{
      const {data,error}=await sb().rpc('access_center_reveal_secret',{p_secret_id:secretId});if(error)throw error;
      const code=host.querySelector('[data-secret-value="'+CSS.escape(secretId)+'"]');
      if(code){code.textContent=data||'';code.dataset.raw=data||'';}
      const copy=host.querySelector('[data-ac-copy-secret="'+CSS.escape(secretId)+'"]');if(copy)copy.disabled=false;
      if(btn){btn.disabled=false;btn.innerHTML=ICONS.eye+'Ocultar';btn.onclick=()=>{if(code){code.textContent='••••••••••••';delete code.dataset.raw}if(copy)copy.disabled=true;btn.innerHTML=ICONS.eye+'Revelar';btn.onclick=()=>revealSecret(entry,secretId,host)};}
      setTimeout(()=>{if(code?.dataset.raw){code.textContent='••••••••••••';delete code.dataset.raw;if(copy)copy.disabled=true;if(btn){btn.innerHTML=ICONS.eye+'Revelar';btn.onclick=()=>revealSecret(entry,secretId,host)}}},45000);
    }catch(err){toast(err?.message||'Não foi possível revelar a credencial.');if(btn){btn.disabled=false;btn.innerHTML=ICONS.eye+'Revelar';}}
  }
  function copyText(value,msg){
    navigator.clipboard?.writeText(String(value||'')).then(()=>toast(msg||'Copiado.')).catch(()=>toast('Não foi possível copiar.'));
  }
  function editSecret(entry,secretId,detailHost,presetLabel=''){
    const current=(entry.secrets||[]).find(s=>String(s.id)===String(secretId));
    const host=modal('<section class="ac-dialog ac-secret-dialog"><header><div><span>COFRE</span><h2>'+(current?'Atualizar credencial':'Nova credencial')+'</h2><p>O valor será criptografado no Supabase Vault.</p></div><button type="button" class="ac-close" data-ac-close>×</button></header><form data-ac-secret-form class="ac-dialog-body ac-form"><label>Rótulo<input name="label" required value="'+esc(current?.label||presetLabel||'Senha')+'"></label><label>Tipo<select name="kind"><option value="password">Senha</option><option value="api_key">API Key</option><option value="api_token">Token</option><option value="oauth_client_id">OAuth Client ID</option><option value="oauth_client_secret">OAuth Client Secret</option><option value="service_role">Service Role</option><option value="other">Outro</option></select></label><label class="full">Novo valor<input name="value" type="password" required autocomplete="new-password" placeholder="Digite o valor da credencial"></label><div class="ac-form-note">'+ICONS.shield+'O valor não será armazenado no navegador nem enviado para o GitHub.</div></form><footer><button type="button" class="ac-secondary" data-ac-close>Cancelar</button><button type="submit" form="none" class="ac-primary" data-ac-save-secret>Salvar credencial</button></footer></section>');
    const form=host.querySelector('[data-ac-secret-form]');
    if(current)form.elements.kind.value=current.kind||'password';
    host.querySelector('[data-ac-save-secret]').addEventListener('click',async()=>{
      if(!form.reportValidity())return;
      const b=host.querySelector('[data-ac-save-secret]');b.disabled=true;b.textContent='Salvando…';
      try{
        const {error}=await sb().rpc('access_center_set_secret',{p_entry_id:entry.id,p_secret_id:current?.id||null,p_label:form.elements.label.value.trim(),p_kind:form.elements.kind.value,p_value:form.elements.value.value});
        if(error)throw error;toast('Credencial salva com segurança.');host.replaceChildren();await load();openDetails(entry.id);
      }catch(err){toast(err?.message||'Não foi possível salvar.');b.disabled=false;b.textContent='Salvar credencial';}
    });
  }
  function editorFields(e){
    return '<form class="ac-form" data-ac-entry-form>'+
      '<label>Nome<input name="name" required value="'+esc(e?.name||'')+'"></label>'+
      '<label>Categoria<input name="category" value="'+esc(e?.category||'Outros')+'"></label>'+
      '<label>Tipo<select name="kind"><option value="account">Conta</option><option value="integration">Integração</option><option value="technical">Credencial técnica</option><option value="document">Documento</option><option value="pixel">Pixel / código</option></select></label>'+
      '<label>Status<select name="status"><option value="active">Ativo</option><option value="cancelled">Cancelado</option></select></label>'+
      '<label class="full">Descrição<input name="description" value="'+esc(e?.description||'')+'"></label>'+
      '<label>Usuário / e-mail<input name="username" value="'+esc(e?.username||'')+'"></label>'+
      '<label>Responsável<input name="owner" value="'+esc(e?.owner||'')+'"></label>'+
      '<label>Cartão / pagamento<input name="payment_method" value="'+esc(e?.payment_method||'')+'"></label>'+
      '<label>Custo (R$)<input name="cost_amount" inputmode="decimal" value="'+esc(e?.cost_amount??'')+'"></label>'+
      '<label>Rótulo de custo<input name="cost_label" placeholder="Ex.: Gratuito / Variado" value="'+esc(e?.cost_label||'')+'"></label>'+
      '<label>Recorrência<input name="recurrence" placeholder="Mensal, Anual…" value="'+esc(e?.recurrence||'')+'"></label>'+
      '<label>Data da compra<input name="purchase_date" type="date" value="'+esc(e?.purchase_date||'')+'"></label>'+
      '<label>Data de renovação<input name="renewal_date" type="date" value="'+esc(e?.renewal_date||'')+'"></label>'+
      '<label>Dia da renovação<input name="renewal_day" type="number" min="1" max="31" value="'+esc(e?.renewal_day??'')+'"></label>'+
      '<label class="full">Link de acesso<input name="login_url" type="url" value="'+esc(e?.login_url||'')+'"></label>'+
      '<label class="full">E-mail / número de recuperação<input name="recovery_contact" value="'+esc(e?.recovery_contact||'')+'"></label>'+
      '<label>Two-factor<select name="two_factor_enabled"><option value="">Não informado</option><option value="true">Ativado</option><option value="false">Não ativado</option></select></label>'+
      '<label class="full">Observações<textarea name="notes">'+esc(e?.notes||'')+'</textarea></label>'+
    '</form>';
  }
  function openEditor(e){
    const host=modal('<section class="ac-dialog ac-edit-dialog"><header><div><span>CADASTRO</span><h2>'+(e?'Editar acesso':'Novo acesso')+'</h2><p>Dados operacionais ficam no Supabase; senhas e chaves ficam no Vault.</p></div><button type="button" class="ac-close" data-ac-close>×</button></header><div class="ac-dialog-body">'+editorFields(e)+'</div><footer><button type="button" class="ac-secondary" data-ac-close>Cancelar</button><button type="button" class="ac-primary" data-ac-save-entry>Salvar</button></footer></section>');
    const form=host.querySelector('[data-ac-entry-form]');
    form.elements.kind.value=e?.kind||'account';form.elements.status.value=e?.status||'active';
    form.elements.two_factor_enabled.value=e?.two_factor_enabled===true?'true':e?.two_factor_enabled===false?'false':'';
    host.querySelector('[data-ac-save-entry]').addEventListener('click',async()=>{
      if(!form.reportValidity())return;
      const fd=new FormData(form),obj=Object.fromEntries(fd.entries());
      obj.id=e?.id||null;obj.brand_id=e?.brand_id||state.brandId;
      obj.cost_amount=obj.cost_amount?String(obj.cost_amount).replace(',','.'):'';
      obj.two_factor_enabled=obj.two_factor_enabled===''?null:obj.two_factor_enabled==='true';
      const b=host.querySelector('[data-ac-save-entry]');b.disabled=true;b.textContent='Salvando…';
      try{
        const {data,error}=await sb().rpc('access_center_save_entry',{p_entry:obj});if(error)throw error;
        toast(e?'Acesso atualizado.':'Acesso criado.');host.replaceChildren();await load();
        if(!e&&data)openDetails(data);
      }catch(err){toast(err?.message||'Não foi possível salvar.');b.disabled=false;b.textContent='Salvar';}
    });
  }
  async function archiveEntry(e){
    if(!confirm('Arquivar "'+e.name+'"? O histórico será preservado.'))return;
    try{const {error}=await sb().rpc('access_center_archive_entry',{p_entry_id:e.id});if(error)throw error;toast('Acesso arquivado.');state.view.querySelector('[data-ac-modal-host]')?.replaceChildren();await load();}
    catch(err){toast(err?.message||'Não foi possível arquivar.');}
  }

  document.addEventListener('change',e=>{
    if(e.target?.id==='brandSelect'&&!state.view?.hidden&&state.view?.isConnected)load();
  });
  window.addEventListener('allianceos:auth',()=>{if(state.view&&!state.view.hidden)load()});
  window.AllianceOSAccessCenter={open,close,refresh:load};
})();
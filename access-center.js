(() => {
  'use strict';
  if (window.AllianceOSAccessCenter) return;

  const state = {
    open:false,
    loading:false,
    items:[],
    query:'',
    category:'all',
    tab:'access',
    selected:null,
    revealed:new Map(),
    brandId:null,
    brandName:'',
    notice:''
  };

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const fmtMoney=v=>v==null||v===''?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const fmtDate=v=>{ if(!v)return '—'; const d=new Date(String(v).slice(0,10)+'T12:00:00'); return isNaN(d)?'—':d.toLocaleDateString('pt-BR'); };
  const safeUrl=v=>{ try{ const u=new URL(String(v||'')); return /^https?:$/.test(u.protocol)?u.href:''; }catch{return '';} };
  const role=()=>String(window.CentralEu?.papel||window.AllianceOSSession?.profile?.papel||'membro').toLowerCase();
  const roleCanManage=()=>['admin','gestor'].includes(role());

  function icon(name){
    const p={
      key:'<circle cx="7.3" cy="10" r="3.1"/><path d="M10.2 9.2H18v2.1h-2.2v2.1h-2.1v-2.1h-3.5"/>',
      search:'<circle cx="9" cy="9" r="5.1"/><path d="m13 13 4 4"/>',
      plus:'<path d="M10 4v12M4 10h12"/>',
      copy:'<rect x="7" y="7" width="9" height="9" rx="2"/><path d="M5 13H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"/>',
      eye:'<path d="M2.5 10s2.7-4.3 7.5-4.3 7.5 4.3 7.5 4.3-2.7 4.3-7.5 4.3S2.5 10 2.5 10Z"/><circle cx="10" cy="10" r="2.2"/>',
      edit:'<path d="m3 14.5-.5 3 3-.5L15.8 6.7 12.3 3.2 3 14.5Z"/><path d="m10.9 4.6 3.5 3.5"/>',
      trash:'<path d="M4 6h12M8 6V4h4v2M6 6l.7 11h6.6L14 6"/>',
      external:'<path d="M11 3h6v6M17 3l-8 8"/><path d="M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
      shield:'<path d="M10 2 4 4.5v4.7c0 3.8 2.5 6.8 6 8.8 3.5-2 6-5 6-8.8V4.5L10 2Z"/><path d="m7.2 10 1.8 1.8 3.8-4"/>',
      folder:'<path d="M2.5 6h5l1.6 2H17v7.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5V6Z"/><path d="M3 6V4.8A1.8 1.8 0 0 1 4.8 3h2.7L9 5h6.2A1.8 1.8 0 0 1 17 6.8V8"/>',
      user:'<circle cx="10" cy="7" r="3"/><path d="M4.7 17c.6-3.2 2.4-5 5.3-5s4.7 1.8 5.3 5"/>',
      card:'<rect x="2.5" y="4.5" width="15" height="11" rx="2"/><path d="M2.5 8h15M5.5 12h3"/>',
      calendar:'<rect x="3" y="4.5" width="14" height="12" rx="2"/><path d="M6 2.5v4M14 2.5v4M3 8h14"/>',
      lock:'<rect x="4" y="8" width="12" height="9" rx="2"/><path d="M6.8 8V5.8a3.2 3.2 0 0 1 6.4 0V8"/>',
      chevron:'<path d="m7 4 6 6-6 6"/>',
      close:'<path d="M5 5l10 10M15 5 5 15"/>',
      alert:'<path d="M10 2.5 18 17H2L10 2.5Z"/><path d="M10 7v4M10 14h.01"/>'
    }[name]||'';
    return '<svg viewBox="0 0 20 20" aria-hidden="true">'+p+'</svg>';
  }

  function currentBrand(){
    const sel=$('#brandSelect');
    const opt=sel?.selectedOptions?.[0];
    let id=opt?.dataset?.brandId||'';
    let name=String(opt?.textContent||opt?.value||'').trim();
    if(!id){
      const brands=window.AllianceOSSession?.brands||[];
      const match=brands.find(b=>String(b.id||b.brand_id||'')===String(opt?.value||'')||String(b.nome||b.name||'').toLowerCase()===name.toLowerCase());
      id=match?.id||match?.brand_id||'';
      if(match)name=match.nome||match.name||name;
    }
    if(!id||/^todas/i.test(name)||String(opt?.value||'').includes('all'))return {id:null,name:'Todas as marcas'};
    return {id,name:name||'Marca'};
  }

  async function client(){
    await window.AllianceOSAuth?.ready;
    const c=window.AllianceOSAuth?.client;
    if(!c)throw new Error('Supabase ainda não está disponível.');
    return c;
  }

  async function rpc(name,args={}){
    const c=await client();
    const {data,error}=await c.rpc(name,args);
    if(error)throw error;
    return data;
  }

  function mount(){
    if($('#allianceAccessCenter'))return $('#allianceAccessCenter');
    const main=$('.main');
    if(!main)return null;
    const root=document.createElement('section');
    root.id='allianceAccessCenter';
    root.className='ac-page';
    root.hidden=true;
    root.innerHTML='<div class="ac-loading"><span></span><b>Carregando Central de Acessos…</b></div>';
    main.appendChild(root);

    const drawer=document.createElement('div');
    drawer.id='allianceAccessDrawer';
    drawer.className='ac-drawer';
    drawer.hidden=true;
    document.body.appendChild(drawer);

    const modal=document.createElement('div');
    modal.id='allianceAccessModal';
    modal.className='ac-modal';
    modal.hidden=true;
    document.body.appendChild(modal);

    document.addEventListener('click',onClick);
    document.addEventListener('input',onInput);
    document.addEventListener('change',onChange);
    $('#brandSelect')?.addEventListener('change',()=>{ if(state.open)load(); });
    return root;
  }

  async function open(){
    const root=mount(); if(!root)return;
    state.open=true;
    document.body.classList.add('alliance-access-open');
    root.hidden=false;
    window.dispatchEvent(new CustomEvent('allianceos:access-open'));
    await load();
  }

  function close(){
    state.open=false;
    document.body.classList.remove('alliance-access-open');
    const root=$('#allianceAccessCenter'); if(root)root.hidden=true;
    closeDrawer(); closeModal();
  }

  async function load(){
    const root=mount(); if(!root)return;
    const b=currentBrand(); state.brandId=b.id;state.brandName=b.name;
    state.loading=true;
    root.innerHTML='<div class="ac-loading"><span></span><b>Carregando acessos de '+esc(b.name)+'…</b></div>';
    try{
      const data=await rpc('access_center_list',{p_brand_id:b.id});
      state.items=Array.isArray(data)?data:[];
      state.loading=false;
      render();
    }catch(e){
      state.loading=false;
      root.innerHTML='<div class="ac-error"><div>'+icon('alert')+'</div><strong>Não foi possível carregar a Central de Acessos</strong><span>'+esc(e?.message||e)+'</span><button type="button" data-ac-retry>Tentar novamente</button></div>';
    }
  }

  function tabOf(i){
    if(i.status==='cancelled'||i.source_sheet==='Ferramentas Canceladas')return 'cancelled';
    if(i.kind==='technical'||i.source_sheet==='Credenciais N8N')return 'technical';
    if(i.kind==='pixel'||i.source_sheet==='Pixels, códigos')return 'pixels';
    return 'access';
  }

  function tabRows(tab=state.tab){
    return state.items.filter(i=>tabOf(i)===tab);
  }

  function filtered(){
    const q=state.query.trim().toLowerCase();
    return tabRows().filter(i=>{
      if(state.category!=='all'&&i.category!==state.category)return false;
      if(!q)return true;
      return [i.name,i.description,i.category,i.owner,i.username,i.brand_name,i.recurrence,i.payment_method,i.notes].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }

  function monthlyCost(items){
    return items.reduce((sum,i)=>{
      const n=Number(i.cost_amount||0); if(!n)return sum;
      const r=String(i.recurrence||'').toLowerCase();
      if(r.includes('semes'))return sum+n/6;
      if(r.includes('anual'))return sum+n/12;
      if(r.includes('mensal'))return sum+n;
      return sum;
    },0);
  }

  function nextRenewal(i){
    const now=new Date();now.setHours(0,0,0,0);
    if(i.renewal_date){
      const d=new Date(String(i.renewal_date).slice(0,10)+'T12:00:00');
      return isNaN(d)?null:d;
    }
    if(i.renewal_day){
      let d=new Date(now.getFullYear(),now.getMonth(),Number(i.renewal_day));
      if(d<now)d=new Date(now.getFullYear(),now.getMonth()+1,Number(i.renewal_day));
      return d;
    }
    return null;
  }

  function renewalSoon(i,days=30){
    const d=nextRenewal(i); if(!d)return false;
    const now=new Date();now.setHours(0,0,0,0);
    const diff=(d-now)/86400000;return diff>=0&&diff<=days;
  }

  function secretState(i){
    const configured=(i.secrets||[]).length;
    const pending=(i.pending_secret_labels||[]).length;
    if(configured)return {cls:'secure',label:configured===1?'1 credencial protegida':configured+' credenciais protegidas'};
    if(pending)return {cls:'pending',label:pending===1?'1 credencial a migrar':pending+' credenciais a migrar'};
    return {cls:'none',label:'Sem credencial'};
  }

  function catIcon(cat){
    if(/google/i.test(cat))return 'user';
    if(/site|infra/i.test(cat))return 'folder';
    if(/crm|comunica/i.test(cat))return 'key';
    if(/automa|dados/i.test(cat))return 'shield';
    if(/pagamento/i.test(cat))return 'card';
    if(/^IA$/i.test(cat))return 'shield';
    if(/anúncio|tracking/i.test(cat))return 'search';
    if(/credenciais/i.test(cat))return 'lock';
    return 'key';
  }

  function rowHtml(i){
    const sec=secretState(i);
    const renew=nextRenewal(i);
    const cost=i.cost_amount!=null?fmtMoney(i.cost_amount):(i.cost_label||'—');
    const login=safeUrl(i.login_url);
    return '<button type="button" class="ac-row" data-ac-open="'+esc(i.id)+'">'+
      '<span class="ac-row-icon">'+icon(catIcon(i.category))+'</span>'+
      '<span class="ac-row-main"><b>'+esc(i.name)+'</b><small>'+esc(i.description||i.category||'Sem descrição')+'</small></span>'+
      '<span class="ac-row-cell ac-user"><small>Usuário</small><b>'+esc(i.username||'—')+'</b></span>'+
      '<span class="ac-row-cell ac-owner"><small>Dono</small><b>'+esc(i.owner||'—')+'</b></span>'+
      '<span class="ac-row-cell ac-cost"><small>Custo</small><b>'+esc(cost)+'</b><em>'+esc(i.recurrence||'')+'</em></span>'+
      '<span class="ac-row-cell ac-renew"><small>Renovação</small><b class="'+(renewalSoon(i)?'soon':'')+'">'+esc(renew?fmtDate(renew.toISOString()):'—')+'</b></span>'+
      '<span class="ac-secret-state '+sec.cls+'"><i></i>'+esc(sec.label)+'</span>'+
      '<span class="ac-row-actions">'+(login?'<span class="ac-row-external" title="Possui link de acesso">'+icon('external')+'</span>':'')+'<span class="ac-row-arrow">'+icon('chevron')+'</span></span>'+
    '</button>';
  }

  function render(){
    const root=mount(); if(!root)return;
    const all=state.items;
    const main=tabRows('access');
    const items=filtered();
    const cats=[...new Set(tabRows().map(x=>x.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const active=main.filter(x=>x.status==='active').length;
    const soon=main.filter(x=>renewalSoon(x)).length;
    const secretCount=all.reduce((n,x)=>n+(x.secrets||[]).length,0);
    const pendingCount=all.reduce((n,x)=>n+(x.pending_secret_labels||[]).length,0);
    const canCreate=roleCanManage()&&!!state.brandId;
    const groups=cats.map(cat=>({cat,items:items.filter(x=>x.category===cat)})).filter(g=>g.items.length);
    const tabs=[
      ['access','Acessos',tabRows('access').length],
      ['technical','Credenciais técnicas',tabRows('technical').length],
      ['pixels','Pixels & códigos',tabRows('pixels').length],
      ['cancelled','Cancelados',tabRows('cancelled').length]
    ];

    root.innerHTML=
      '<div class="ac-shell">'+
        '<header class="ac-head">'+
          '<div class="ac-head-copy"><span class="ac-kicker">SEGURANÇA & OPERAÇÃO</span><h1>Central de Acessos</h1><p>Contas, credenciais e renovações de <strong>'+esc(state.brandName)+'</strong>, organizadas como na planilha operacional.</p><span class="ac-source-pill">▦ Central de Acessos: Botanika.xlsx</span></div>'+
          '<div class="ac-head-actions"><span class="ac-security-pill">'+icon('shield')+'Vault ativo</span>'+(canCreate?'<button type="button" class="ac-primary" data-ac-new>'+icon('plus')+'Novo acesso</button>':'')+'</div>'+
        '</header>'+
        '<section class="ac-summary">'+
          '<div><b>'+active+'</b><span>Acessos da planilha principal</span></div>'+
          '<div><b>'+secretCount+'</b><span>Segredos protegidos no Vault</span></div>'+
          '<div><b>'+esc(fmtMoney(monthlyCost(main)))+'</b><span>Custo mensal estimado</span></div>'+
          '<div class="'+(soon?'warn':'')+'"><b>'+soon+'</b><span>Renovam nos próximos 30 dias</span></div>'+
        '</section>'+
        '<nav class="ac-tabs">'+tabs.map(t=>'<button type="button" data-ac-tab="'+t[0]+'" class="'+(state.tab===t[0]?'active':'')+'"><span>'+esc(t[1])+'</span><b>'+t[2]+'</b></button>').join('')+'</nav>'+
        (pendingCount?'<div class="ac-migration-note">'+icon('alert')+'<div><b>'+pendingCount+' credencial'+(pendingCount===1?'':'is')+' ainda sem valor</b><span>Os campos continuam visíveis para cadastro seguro sem expor segredos no navegador.</span></div></div>':'')+
        '<div class="ac-panel">'+
          '<div class="ac-toolbar">'+
            '<label class="ac-search">'+icon('search')+'<input type="search" data-ac-search value="'+esc(state.query)+'" placeholder="Buscar conta, usuário, dono ou ferramenta…"></label>'+
            (state.tab==='access'?'<select data-ac-category><option value="all">Todas as seções</option>'+cats.map(c=>'<option value="'+esc(c)+'" '+(state.category===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select>':'')+
            '<span class="ac-result-count">'+items.length+' '+(items.length===1?'item':'itens')+'</span>'+
          '</div>'+
          '<div class="ac-column-head"><span>Conta / ferramenta</span><span>Usuário</span><span>Dono</span><span>Custo</span><span>Renovação</span><span>Segurança</span><span></span></div>'+
          '<div class="ac-groups">'+
            (groups.length?groups.map(g=>
              '<section class="ac-group">'+
                '<header><span class="ac-group-icon">'+icon(catIcon(g.cat))+'</span><div><b>'+esc(g.cat)+'</b><small>'+g.items.length+' '+(g.items.length===1?'item':'itens')+'</small></div></header>'+
                '<div class="ac-group-list">'+g.items.map(rowHtml).join('')+'</div>'+
              '</section>'
            ).join(''):'<div class="ac-empty"><span>'+icon('search')+'</span><b>Nenhum item nesta aba</b><p>Ajuste a busca ou cadastre um novo acesso.</p></div>')+
          '</div>'+
        '</div>'+
      '</div>';
  }

  function detailValue(label,value,copyValue){
    return '<div class="ac-detail-field"><small>'+esc(label)+'</small><div><b>'+esc(value||'—')+'</b>'+(copyValue?'<button type="button" data-ac-copy-text="'+esc(copyValue)+'" title="Copiar">'+icon('copy')+'</button>':'')+'</div></div>';
  }

  function openDetail(id){
    const item=state.items.find(x=>String(x.id)===String(id)); if(!item)return;
    state.selected=item;
    const d=$('#allianceAccessDrawer'); if(!d)return;
    const login=safeUrl(item.login_url);
    const can=!!item.can_manage;
    const configured=item.secrets||[];
    const pending=item.pending_secret_labels||[];
    const secretRows=[
      ...configured.map(s=>{
        const value=state.revealed.get(s.id);
        return '<div class="ac-credential-row" data-secret-row="'+esc(s.id)+'"><span>'+icon('lock')+'</span><div><small>'+esc(s.label)+'</small><b data-secret-value="'+esc(s.id)+'">'+(value?esc(value):'••••••••••••')+'</b></div>'+
          (can?'<button type="button" data-ac-reveal="'+esc(s.id)+'" title="Mostrar">'+icon('eye')+'</button><button type="button" data-ac-copy-secret="'+esc(s.id)+'" title="Copiar">'+icon('copy')+'</button><button type="button" data-ac-secret-edit="'+esc(s.id)+'" data-ac-secret-label="'+esc(s.label)+'" data-ac-secret-kind="'+esc(s.kind||'password')+'" title="Atualizar">'+icon('edit')+'</button>':'')+
        '</div>';
      }),
      ...pending.map(label=>'<div class="ac-credential-row pending"><span>'+icon('alert')+'</span><div><small>'+esc(label)+'</small><b>Credencial pendente de migração</b></div>'+(can?'<button class="ac-inline-action" type="button" data-ac-secret-new="'+esc(label)+'">Cadastrar</button>':'')+'</div>')
    ].join('');

    d.innerHTML='<div class="ac-drawer-backdrop" data-ac-drawer-close></div><aside>'+
      '<header><div><span class="ac-kicker">'+esc(item.category)+'</span><h2>'+esc(item.name)+'</h2><p>'+esc(item.description||'Acesso cadastrado no AllianceOS')+'</p></div><button type="button" class="ac-icon-btn" data-ac-drawer-close>'+icon('close')+'</button></header>'+
      '<div class="ac-drawer-body">'+
        '<section class="ac-credential-card"><div class="ac-section-title"><div><b>Credenciais</b><small>Valores protegidos e auditados</small></div><span>'+icon('shield')+'Vault</span></div>'+
          (secretRows||'<div class="ac-no-secret">Nenhuma senha ou token cadastrado para este acesso.</div>')+
        '</section>'+
        '<section class="ac-detail-grid">'+
          detailValue('Usuário / e-mail',item.username,item.username)+
          detailValue('Responsável',item.owner)+
          detailValue('Cartão / pagamento',item.payment_method)+
          detailValue('Custo',item.cost_amount!=null?fmtMoney(item.cost_amount):item.cost_label)+
          detailValue('Recorrência',item.recurrence)+
          detailValue('Data da compra',fmtDate(item.purchase_date))+
          detailValue('Renovação',item.renewal_date?fmtDate(item.renewal_date):(item.renewal_day?'Dia '+item.renewal_day:'—'))+
          detailValue('2FA',item.two_factor_enabled===true?'Ativado':item.two_factor_enabled===false?'Desativado':'Não informado')+
          detailValue('Recuperação',item.recovery_contact,item.recovery_contact)+
          detailValue('Marca',item.brand_name)+
        '</section>'+
        (item.notes?'<section class="ac-notes"><small>Observações</small><p>'+esc(item.notes)+'</p></section>':'')+
        '<div class="ac-source">Origem: '+esc(item.source_sheet||'AllianceOS')+(item.source_row?' · linha '+esc(item.source_row):'')+'</div>'+
      '</div>'+
      '<footer>'+
        (login?'<a href="'+esc(login)+'" target="_blank" rel="noopener">'+icon('external')+'Abrir acesso</a>':'<span></span>')+
        '<div>'+(can?'<button type="button" class="ac-danger-ghost" data-ac-archive="'+esc(item.id)+'">'+icon('trash')+'Arquivar</button><button type="button" class="ac-secondary" data-ac-edit="'+esc(item.id)+'">'+icon('edit')+'Editar</button>':'')+'</div>'+
      '</footer>'+
    '</aside>';
    d.hidden=false;
    requestAnimationFrame(()=>d.classList.add('open'));
  }

  function closeDrawer(){
    const d=$('#allianceAccessDrawer'); if(!d)return;
    d.classList.remove('open');setTimeout(()=>{if(!d.classList.contains('open'))d.hidden=true},160);
    state.selected=null;
  }

  function entryForm(item){
    const isNew=!item;
    const brand=currentBrand();
    const i=item||{brand_id:brand.id,category:'Ferramentas gerais',status:'active'};
    const cats=[...new Set([...state.items.map(x=>x.category),'Contas Google','Sites & infraestrutura','CRM & comunicação','Automação & dados','Pagamentos & dashboards','IA','Anúncios & tracking','Telefonia','Credenciais técnicas','Ferramentas gerais','Dados da empresa'])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));
    return '<form class="ac-form" data-ac-entry-form>'+
      '<header><div><span class="ac-kicker">'+(isNew?'NOVO ACESSO':'EDITAR ACESSO')+'</span><h2>'+(isNew?'Cadastrar acesso':esc(i.name))+'</h2><p>Metadados ficam no banco; senhas e tokens são cadastrados separadamente no Vault.</p></div><button type="button" class="ac-icon-btn" data-ac-modal-close>'+icon('close')+'</button></header>'+
      '<div class="ac-form-body">'+
        '<input type="hidden" name="id" value="'+esc(i.id||'')+'"><input type="hidden" name="brand_id" value="'+esc(i.brand_id||brand.id||'')+'">'+
        '<div class="ac-form-grid">'+
          '<label class="wide"><span>Nome *</span><input name="name" required value="'+esc(i.name||'')+'" placeholder="Ex.: ActiveCampaign"></label>'+
          '<label><span>Categoria</span><select name="category">'+cats.map(c=>'<option '+(i.category===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label>'+
          '<label><span>Responsável</span><input name="owner" value="'+esc(i.owner||'')+'" placeholder="Alliance, Expert…"></label>'+
          '<label class="wide"><span>Descrição</span><input name="description" value="'+esc(i.description||'')+'" placeholder="Para que usamos este acesso?"></label>'+
          '<label><span>Usuário / e-mail</span><input name="username" value="'+esc(i.username||'')+'"></label>'+
          '<label><span>Link de acesso</span><input name="login_url" type="url" value="'+esc(i.login_url||'')+'" placeholder="https://"></label>'+
          '<label><span>Cartão / pagamento</span><input name="payment_method" value="'+esc(i.payment_method||'')+'"></label>'+
          '<label><span>Recorrência</span><input name="recurrence" value="'+esc(i.recurrence||'')+'" placeholder="Mensal, anual…"></label>'+
          '<label><span>Custo (R$)</span><input name="cost_amount" type="number" step="0.01" min="0" value="'+esc(i.cost_amount??'')+'"></label>'+
          '<label><span>Descrição do custo</span><input name="cost_label" value="'+esc(i.cost_label||'')+'" placeholder="Gratuito, variável…"></label>'+
          '<label><span>Data da compra</span><input name="purchase_date" type="date" value="'+esc(String(i.purchase_date||'').slice(0,10))+'"></label>'+
          '<label><span>Data de renovação</span><input name="renewal_date" type="date" value="'+esc(String(i.renewal_date||'').slice(0,10))+'"></label>'+
          '<label><span>Dia da renovação</span><input name="renewal_day" type="number" min="1" max="31" value="'+esc(i.renewal_day??'')+'"></label>'+
          '<label><span>2FA</span><select name="two_factor_enabled"><option value="" '+(i.two_factor_enabled==null?'selected':'')+'>Não informado</option><option value="true" '+(i.two_factor_enabled===true?'selected':'')+'>Ativado</option><option value="false" '+(i.two_factor_enabled===false?'selected':'')+'>Desativado</option></select></label>'+
          '<label class="wide"><span>Recuperação / contato</span><input name="recovery_contact" value="'+esc(i.recovery_contact||'')+'"></label>'+
          '<label class="wide"><span>Observações</span><textarea name="notes" rows="3">'+esc(i.notes||'')+'</textarea></label>'+
        '</div>'+
      '</div>'+
      '<footer><button type="button" class="ac-secondary" data-ac-modal-close>Cancelar</button><button type="submit" class="ac-primary">'+(isNew?'Criar acesso':'Salvar alterações')+'</button></footer>'+
    '</form>';
  }

  function openEntryForm(item=null){
    const m=$('#allianceAccessModal'); if(!m)return;
    if(!state.brandId&&!item){notify('Selecione uma marca antes de criar um acesso.','error');return;}
    m.innerHTML='<div class="ac-modal-backdrop" data-ac-modal-close></div><div class="ac-modal-card">'+entryForm(item)+'</div>';
    m.hidden=false;requestAnimationFrame(()=>m.classList.add('open'));
  }

  function openSecretForm(label='Senha',secretId='',kind='password'){
    const m=$('#allianceAccessModal'); if(!m||!state.selected)return;
    m.innerHTML='<div class="ac-modal-backdrop" data-ac-modal-close></div><div class="ac-modal-card small"><form class="ac-form" data-ac-secret-form>'+
      '<header><div><span class="ac-kicker">CREDENCIAL PROTEGIDA</span><h2>'+esc(secretId?'Atualizar '+label:'Cadastrar '+label)+'</h2><p>O valor será armazenado no Supabase Vault e não ficará exposto no frontend.</p></div><button type="button" class="ac-icon-btn" data-ac-modal-close>'+icon('close')+'</button></header>'+
      '<div class="ac-form-body"><input type="hidden" name="entry_id" value="'+esc(state.selected.id)+'"><input type="hidden" name="secret_id" value="'+esc(secretId)+'">'+
        '<div class="ac-form-grid one"><label><span>Rótulo</span><input name="label" required value="'+esc(label)+'"></label>'+
        '<label><span>Tipo</span><select name="kind"><option value="password" '+(kind==='password'?'selected':'')+'>Senha</option><option value="api_key" '+(kind==='api_key'?'selected':'')+'>API key</option><option value="token" '+(kind==='token'?'selected':'')+'>Token</option><option value="client_id" '+(kind==='client_id'?'selected':'')+'>Client ID</option><option value="client_secret" '+(kind==='client_secret'?'selected':'')+'>Client Secret</option></select></label>'+
        '<label><span>Novo valor *</span><input name="value" type="password" required autocomplete="new-password" placeholder="Cole a credencial"></label></div>'+
        '<div class="ac-security-help">'+icon('shield')+'Revelações de credenciais são registradas no histórico de auditoria.</div>'+
      '</div><footer><button type="button" class="ac-secondary" data-ac-modal-close>Cancelar</button><button type="submit" class="ac-primary">Salvar no Vault</button></footer>'+
    '</form></div>';
    m.hidden=false;requestAnimationFrame(()=>m.classList.add('open'));
  }

  function closeModal(){
    const m=$('#allianceAccessModal');if(!m)return;
    m.classList.remove('open');setTimeout(()=>{if(!m.classList.contains('open'))m.hidden=true},150);
  }

  function notify(msg,type='ok'){
    let n=$('#acToast');
    if(!n){n=document.createElement('div');n.id='acToast';n.className='ac-toast';document.body.appendChild(n);}
    n.className='ac-toast '+type;n.textContent=msg;n.classList.add('show');
    clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove('show'),2600);
  }

  async function revealSecret(id,copy=false){
    try{
      let value=state.revealed.get(id);
      if(!value){value=await rpc('access_center_reveal_secret',{p_secret_id:id});state.revealed.set(id,value);}
      const el=$('[data-secret-value="'+CSS.escape(String(id))+'"]');
      if(el)el.textContent=value;
      if(copy){await navigator.clipboard.writeText(value);notify('Credencial copiada.');}
      setTimeout(()=>{state.revealed.delete(id);const x=$('[data-secret-value="'+CSS.escape(String(id))+'"]');if(x)x.textContent='••••••••••••';},30000);
    }catch(e){notify(e?.message||'Não foi possível revelar a credencial.','error');}
  }

  async function saveEntry(form){
    const fd=new FormData(form);const obj=Object.fromEntries(fd.entries());
    ['cost_amount','renewal_day'].forEach(k=>{if(obj[k]==='')obj[k]=null;});
    ['purchase_date','renewal_date'].forEach(k=>{if(!obj[k])obj[k]=null;});
    if(obj.two_factor_enabled==='')obj.two_factor_enabled=null;
    else obj.two_factor_enabled=obj.two_factor_enabled==='true';
    if(!obj.id)delete obj.id;
    try{
      form.classList.add('busy');
      const id=await rpc('access_center_save_entry',{p_entry:obj});
      closeModal();notify(obj.id?'Acesso atualizado.':'Acesso criado.');
      await load();
      if(id)openDetail(id);
    }catch(e){notify(e?.message||'Não foi possível salvar.','error');}
    finally{form.classList.remove('busy');}
  }

  async function saveSecret(form){
    const fd=new FormData(form);
    try{
      form.classList.add('busy');
      await rpc('access_center_set_secret',{
        p_entry_id:fd.get('entry_id'),
        p_secret_id:fd.get('secret_id')||null,
        p_label:fd.get('label'),
        p_kind:fd.get('kind'),
        p_value:fd.get('value')
      });
      closeModal();notify('Credencial salva no Vault.');
      const id=state.selected?.id;
      await load();
      if(id)openDetail(id);
    }catch(e){notify(e?.message||'Não foi possível salvar a credencial.','error');}
    finally{form.classList.remove('busy');}
  }

  async function archive(id){
    if(!confirm('Arquivar este acesso? Ele deixará de aparecer na Central, mas o histórico será preservado.'))return;
    try{await rpc('access_center_archive_entry',{p_entry_id:id});closeDrawer();notify('Acesso arquivado.');await load();}
    catch(e){notify(e?.message||'Não foi possível arquivar.','error');}
  }

  function onClick(e){
    const t=e.target.closest?.('[data-ac-retry],[data-ac-new],[data-ac-tab],[data-ac-open],[data-ac-drawer-close],[data-ac-modal-close],[data-ac-edit],[data-ac-archive],[data-ac-reveal],[data-ac-copy-secret],[data-ac-copy-text],[data-ac-secret-new],[data-ac-secret-edit]');
    if(!t)return;
    if(t.matches('[data-ac-retry]'))load();
    else if(t.matches('[data-ac-new]'))openEntryForm();
    else if(t.matches('[data-ac-tab]')){state.tab=t.dataset.acTab;state.category='all';render();}
    else if(t.matches('[data-ac-open]'))openDetail(t.dataset.acOpen);
    else if(t.matches('[data-ac-drawer-close]'))closeDrawer();
    else if(t.matches('[data-ac-modal-close]'))closeModal();
    else if(t.matches('[data-ac-edit]'))openEntryForm(state.items.find(x=>x.id===t.dataset.acEdit));
    else if(t.matches('[data-ac-archive]'))archive(t.dataset.acArchive);
    else if(t.matches('[data-ac-reveal]'))revealSecret(t.dataset.acReveal,false);
    else if(t.matches('[data-ac-copy-secret]'))revealSecret(t.dataset.acCopySecret,true);
    else if(t.matches('[data-ac-copy-text]'))navigator.clipboard.writeText(t.dataset.acCopyText).then(()=>notify('Copiado.'));
    else if(t.matches('[data-ac-secret-new]'))openSecretForm(t.dataset.acSecretNew);
    else if(t.matches('[data-ac-secret-edit]'))openSecretForm(t.dataset.acSecretLabel,t.dataset.acSecretEdit,t.dataset.acSecretKind);
  }

  function onInput(e){
    if(e.target.matches('[data-ac-search]')){
      state.query=e.target.value;render();
      const input=$('[data-ac-search]');input?.focus();input?.setSelectionRange(state.query.length,state.query.length);
    }
  }
  function onChange(e){
    if(e.target.matches('[data-ac-category]')){state.category=e.target.value;render();}
  }

  document.addEventListener('submit',e=>{
    if(e.target.matches('[data-ac-entry-form]')){e.preventDefault();saveEntry(e.target);}
    if(e.target.matches('[data-ac-secret-form]')){e.preventDefault();saveSecret(e.target);}
  });

  window.AllianceOSAccessCenter={open,close,reload:load};

  const boot=()=>{mount();if(location.hash==='#access')open();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
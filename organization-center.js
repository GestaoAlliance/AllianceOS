
(() => {
  'use strict';
  if (window.AllianceOSOrganization) return;

  const state = { open:false, tab:'chart', org:null, workspace:null, run:null, campaignId:'', loading:false };
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtDate=v=>{if(!v)return '—';const d=new Date(v);return isNaN(d)?'—':d.toLocaleDateString('pt-BR')};
  const fmtDateTime=v=>{if(!v)return '—';const d=new Date(v);return isNaN(d)?'—':d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})};
  const icon=name=>{
    const p={
      org:'<path d="M10 3v4M4 17v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3"/><circle cx="10" cy="3" r="2"/><circle cx="4" cy="17" r="2"/><circle cx="10" cy="17" r="2"/><circle cx="16" cy="17" r="2"/>',
      seat:'<circle cx="10" cy="6.5" r="3"/><path d="M4.5 17c.7-3.6 2.5-5.5 5.5-5.5s4.8 1.9 5.5 5.5"/>',
      kpi:'<path d="M3 17V9M8 17V5M13 17v-4M18 17V3"/><path d="M2 17h17"/>',
      ritual:'<path d="M4 5h12M4 10h12M4 15h8"/><path d="m15 13 3 2-3 2"/>',
      calendar:'<rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2.5v4M14 2.5v4M3 8h14"/>',
      check:'<path d="m4 10 4 4 8-9"/>',
      alert:'<path d="M10 2.5 18 17H2L10 2.5Z"/><path d="M10 7v4M10 14h.01"/>',
      plus:'<path d="M10 4v12M4 10h12"/>',
      close:'<path d="M5 5l10 10M15 5 5 15"/>',
      arrow:'<path d="m7 4 6 6-6 6"/>',
      reload:'<path d="M16 7V3l-2 2a7 7 0 1 0 2 10"/><path d="M16 3h-4"/>'
    }[name]||'';
    return '<svg viewBox="0 0 20 20" aria-hidden="true">'+p+'</svg>';
  };

  function ensureStyle(){
    if($('#alliance-organization-style'))return;
    const s=document.createElement('style');s.id='alliance-organization-style';
    s.textContent=[
      'body.alliance-organization-open .main>:not(.global-toolbar):not(#allianceOrganizationCenter){display:none!important}',
      '.org-page[hidden],.org-drawer[hidden],.org-modal[hidden]{display:none!important}',
      '.org-page{box-sizing:border-box;width:100%;min-height:calc(100vh - 102px);padding:4px 2px 30px;color:#171b1e;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.org-page *,.org-drawer *,.org-modal *{box-sizing:border-box}',
      '.org-page svg,.org-drawer svg,.org-modal svg{width:17px;height:17px;display:block;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}',
      '.org-shell{width:min(1480px,100%);margin:0 auto}',
      '.org-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:27px 30px 22px;border:1px solid #e2e7ea;border-radius:18px;background:#fff;box-shadow:0 8px 30px rgba(25,32,37,.025)}',
      '.org-kicker{display:block;color:#8e979d;font:760 9px/1 Inter;letter-spacing:.12em}.org-head h1{margin:7px 0 0;font-size:27px;line-height:1.05;letter-spacing:-.035em}.org-head p{margin:8px 0 0;color:#7b858c;font-size:11.5px;line-height:1.5}.org-head-actions{display:flex;gap:9px;flex:0 0 auto}',
      '.org-primary,.org-secondary,.org-small,.org-decision{appearance:none;cursor:pointer;font-family:inherit}.org-primary,.org-secondary{min-height:40px;padding:0 14px;border-radius:11px;display:inline-flex;align-items:center;gap:8px;font-size:10px;font-weight:700}.org-primary{border:1px solid #151a1d;background:#151a1d;color:#fff}.org-secondary{border:1px solid #dce2e5;background:#fff;color:#4f5960}.org-primary:hover{background:#252c31}.org-secondary:hover{background:#f7f8f9}',
      '.org-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}.org-summary article{min-height:76px;padding:14px 17px;border:1px solid #e3e8eb;border-radius:15px;background:#fff}.org-summary b,.org-summary span{display:block}.org-summary b{font-size:20px;letter-spacing:-.03em}.org-summary span{margin-top:4px;font-size:8.5px;color:#90999f}',
      '.org-tabs{position:sticky;top:90px;z-index:12;margin-top:10px;padding:7px;display:flex;gap:4px;border:1px solid #e1e6e9;border-radius:14px;background:rgba(255,255,255,.95);backdrop-filter:blur(14px)}.org-tabs button{height:38px;padding:0 12px;border:0;border-radius:9px;background:transparent;color:#7d878e;display:inline-flex;align-items:center;gap:7px;font:650 9.5px Inter;cursor:pointer}.org-tabs button.active{background:#151a1d;color:#fff}.org-tabs button:hover:not(.active){background:#f5f7f8;color:#4c565d}',
      '.org-content{margin-top:10px}.org-cycle,.org-block,.org-area,.org-run,.org-start,.org-note{border:1px solid #e2e7ea;border-radius:16px;background:#fff}.org-cycle{padding:16px 18px;display:flex;align-items:center;gap:12px}.org-cycle small{font:760 8px Inter;letter-spacing:.1em;color:#9aa3a8}.org-cycle strong{font-size:11px;color:#343c41}',
      '.org-block{margin-top:10px;overflow:hidden}.org-block>header,.org-area>header,.org-run>header{padding:17px 18px;border-bottom:1px solid #edf0f2;display:flex;align-items:center;justify-content:space-between;gap:16px}.org-block h2,.org-area h3,.org-run h3{margin:4px 0 0;letter-spacing:-.025em}.org-block h2{font-size:18px}.org-area h3,.org-run h3{font-size:14px}.org-block header span,.org-area header span,.org-run header span{font:760 8px Inter;letter-spacing:.1em;color:#9aa3a9}.org-block header p,.org-area header p{margin:5px 0 0;color:#8c959b;font-size:8.5px;line-height:1.45}',
      '.org-seat-grid{padding:9px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.org-seat{min-height:68px;padding:10px;border:1px solid #e6eaec;border-radius:12px;background:#fff;display:grid;grid-template-columns:39px minmax(0,1fr) auto 16px;align-items:center;gap:9px;text-align:left;color:#30383d;cursor:pointer}.org-seat:hover{background:#fafbfb;border-color:#d9dfe2}.org-seat-code{height:26px;min-width:36px;padding:0 7px;border-radius:7px;background:#f0f3f4;display:grid;place-items:center;font:750 8px Inter;color:#59656c}.org-seat strong,.org-seat small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.org-seat strong{font-size:9.7px}.org-seat small{margin-top:4px;font-size:7.7px;color:#929ba1}.org-seat em{font:650 7.4px Inter;color:#9aa3a9;font-style:normal;white-space:nowrap}',
      '.org-area-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.org-area{overflow:hidden}.org-area-seats{padding:7px;display:flex;flex-direction:column;gap:7px}.org-subarea-group{padding:6px;border:1px solid #edf0f2;border-radius:12px;background:#fafbfb}.org-subarea-label{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 4px 7px;color:#78838a;font:760 7.5px Inter;letter-spacing:.08em;text-transform:uppercase}.org-subarea-label small{font:650 7px Inter;color:#a0a8ad;text-transform:none;letter-spacing:0}.org-subarea-group .org-seat{background:#fff}.org-area .org-seat{grid-template-columns:39px minmax(0,1fr) auto 16px;min-height:60px}.org-seat.reference{opacity:.72;border-style:dashed}.org-seat.reference .org-seat-code{background:#f7f3ea;color:#8a6f37}.org-seat-reference{display:block;margin-top:3px;font-size:7px;color:#987b42}.org-area aside{text-align:right}.org-area aside small,.org-area aside b{display:block}.org-area aside small{font-size:7px;color:#a0a8ad}.org-area aside b{margin-top:3px;font-size:8.5px;color:#566168}',
      '.org-table{border:1px solid #e2e7ea;border-radius:16px;background:#fff;overflow:hidden}.org-table-head,.org-table-row{display:grid;grid-template-columns:64px minmax(220px,1.6fr) minmax(145px,.9fr) minmax(130px,.8fr) 74px 20px;align-items:center;gap:12px;padding:0 14px}.org-table-head{height:38px;background:#fafbfb;border-bottom:1px solid #edf0f2;font:740 7.5px Inter;color:#9ba4aa;text-transform:uppercase;letter-spacing:.08em}.org-table-row{min-height:60px;border-bottom:1px solid #f0f2f3;background:#fff;cursor:pointer}.org-table-row:last-child{border-bottom:0}.org-table-row:hover{background:#fafbfb}.org-table-row strong,.org-table-row small{display:block}.org-table-row strong{font-size:9.5px}.org-table-row small{margin-top:3px;font-size:7.5px;color:#959ea4}.org-table-row>span{font-size:8.5px;color:#58636a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.org-kpi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.org-kpi-card{padding:15px;border:1px solid #e2e7ea;border-radius:15px;background:#fff}.org-kpi-card header{display:flex;gap:9px;align-items:center}.org-kpi-card header span{height:34px;width:34px;border-radius:10px;background:#f1f4f5;display:grid;place-items:center;color:#68747b}.org-kpi-card h3{margin:0;font-size:11px}.org-kpi-card small{display:block;margin-top:3px;color:#939ca2;font-size:7.6px}.org-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:11px}.org-tags span{min-height:25px;padding:0 8px;border:1px solid #e5e9eb;border-radius:999px;background:#fafbfb;display:inline-flex;align-items:center;font-size:7.7px;color:#616c73}',
      '.org-ritual-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.org-ritual{padding:16px;border:1px solid #e2e7ea;border-radius:15px;background:#fff}.org-ritual-top{display:flex;justify-content:space-between;gap:12px}.org-ritual-code{height:26px;padding:0 8px;border-radius:7px;background:#151a1d;color:#fff;display:inline-flex;align-items:center;font:750 8px Inter}.org-ritual h3{margin:8px 0 0;font-size:13px}.org-ritual p{margin:6px 0 0;color:#879198;font-size:8.5px;line-height:1.5}.org-ritual-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}.org-ritual-meta span{padding:5px 7px;border-radius:7px;background:#f3f5f6;color:#748087;font-size:7.4px}.org-ritual-actions{display:flex;gap:7px;margin-top:12px}.org-small{height:32px;padding:0 10px;border:1px solid #dfe4e7;border-radius:9px;background:#fff;color:#4e5960;font:680 8px Inter}.org-small:hover{background:#f7f8f9}',
      '.org-workspace-head{padding:19px 20px;border:1px solid #e2e7ea;border-radius:16px;background:#fff;display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.org-workspace-head h2{margin:5px 0 0;font-size:20px}.org-workspace-head p{margin:6px 0 0;font-size:9px;color:#8a949a}.org-workspace-head select{height:38px;min-width:280px;border:1px solid #dfe4e7;border-radius:10px;padding:0 10px;background:#fff;font:620 9px Inter;color:#465057}',
      '.org-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.org-list{border:1px solid #e2e7ea;border-radius:15px;background:#fff;overflow:hidden}.org-list>header{min-height:55px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #edf0f2}.org-list h3{margin:0;font-size:11px}.org-list header b{font-size:10px}.org-list-body{padding:6px}.org-task{padding:9px;border-bottom:1px solid #f0f2f3}.org-task:last-child{border-bottom:0}.org-task strong,.org-task small{display:block}.org-task strong{font-size:8.8px;line-height:1.35}.org-task small{margin-top:4px;font-size:7.4px;color:#959ea4}.org-empty{min-height:100px;display:grid;place-items:center;text-align:center;color:#9ba4aa;font-size:8.5px}',
      '.org-run{margin-top:10px;overflow:hidden}.org-run-body{padding:10px}.org-action-row,.org-check-row{min-height:58px;padding:8px 9px;border:1px solid #e7eaec;border-radius:11px;margin-top:6px;display:grid;align-items:center;gap:10px}.org-action-row{grid-template-columns:minmax(0,1.5fr) minmax(110px,.7fr) 155px}.org-check-row{grid-template-columns:42px minmax(150px,.9fr) minmax(170px,1fr) 210px}.org-action-row strong,.org-action-row small,.org-check-row strong,.org-check-row small{display:block}.org-action-row strong,.org-check-row strong{font-size:8.8px}.org-action-row small,.org-check-row small{margin-top:3px;font-size:7.4px;color:#939ca2}.org-action-row select,.org-check-row select{height:34px;border:1px solid #dfe4e7;border-radius:9px;padding:0 8px;background:#fff;font:620 8px Inter}.org-check-row textarea{height:40px;border:1px solid #e0e5e8;border-radius:9px;padding:7px 8px;resize:none;font:500 8px Inter;color:#4d575e}.org-check-code{height:28px;border-radius:8px;background:#f1f4f5;display:grid;place-items:center;font:750 8px Inter;color:#657078}',
      '.org-run-footer{padding:11px 12px;border-top:1px solid #edf0f2;display:flex;align-items:center;gap:8px}.org-run-footer textarea{flex:1;min-height:40px;max-height:80px;border:1px solid #dfe4e7;border-radius:9px;padding:8px;font:500 8px Inter;resize:vertical}.org-decision-buttons{display:flex;gap:6px}.org-decision{height:36px;padding:0 10px;border:1px solid #dfe4e7;border-radius:9px;background:#fff;color:#4c565d;font:700 8px Inter}.org-decision[data-v="GO"]{border-color:#cfe4d5;color:#3e7250;background:#f7fcf8}.org-decision[data-v="NO-GO"]{border-color:#ecd3d3;color:#a34b4b;background:#fff8f8}.org-decision:disabled{opacity:.4;cursor:not-allowed}',
      '.org-history{margin-top:10px;border:1px solid #e2e7ea;border-radius:15px;background:#fff;padding:13px}.org-history h3{margin:0 0 8px;font-size:10px}.org-history-row{padding:8px 4px;border-top:1px solid #f0f2f3;display:flex;justify-content:space-between;gap:12px}.org-history-row:first-of-type{border-top:0}.org-history-row strong,.org-history-row small{display:block}.org-history-row strong{font-size:8.5px}.org-history-row small{margin-top:3px;font-size:7.4px;color:#969fa5}.org-history-row em{font:650 7.5px Inter;color:#727e85;font-style:normal}',
      '.org-loading,.org-error{min-height:280px;border:1px solid #e2e7ea;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:#7f8a91;text-align:center}.org-loading i{width:24px;height:24px;border:2px solid #e4e8ea;border-top-color:#333b40;border-radius:50%;animation:orgSpin .65s linear infinite}@keyframes orgSpin{to{transform:rotate(360deg)}}.org-error strong{font-size:11px;color:#333b40}.org-error p{margin:0;max-width:450px;font-size:8.5px}',
      '.org-drawer,.org-modal{position:fixed;inset:0;z-index:2147482600;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:none}.org-drawer.open,.org-modal.open{pointer-events:auto}.org-backdrop{position:absolute;inset:0;background:rgba(17,23,27,.34);backdrop-filter:blur(3px)}.org-drawer aside{position:absolute;top:0;right:0;width:min(540px,94vw);height:100%;background:#fff;box-shadow:-20px 0 60px rgba(20,27,32,.13);overflow:auto}.org-drawer aside>header{padding:24px;border-bottom:1px solid #e8ecee;display:flex;justify-content:space-between;gap:16px}.org-drawer h2{margin:5px 0 0;font-size:20px}.org-drawer p{color:#7f8990;font-size:9px;line-height:1.55}.org-drawer aside>section{padding:18px 24px}.org-drawer article{padding:13px 0;border-bottom:1px solid #eef1f2}.org-drawer article span{font:760 7.5px Inter;letter-spacing:.1em;color:#9da5aa}.org-drawer article p{margin:6px 0 0;color:#4f5960}.org-icon-btn{height:34px;width:34px;border:1px solid #dfe4e7;border-radius:9px;background:#fff;display:grid;place-items:center;cursor:pointer;color:#647078}',
      '.org-modal section{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,92vw);background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(19,26,31,.18)}.org-modal section>header,.org-modal section>footer{padding:16px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px}.org-modal section>header{border-bottom:1px solid #e9edef}.org-modal section>footer{border-top:1px solid #e9edef;justify-content:flex-end}.org-modal h3{margin:4px 0 0;font-size:16px}.org-form{padding:16px 18px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.org-form label{font:700 8px Inter;color:#69747b}.org-form label.wide{grid-column:1/-1}.org-form input,.org-form select,.org-form textarea{display:block;width:100%;margin-top:5px;border:1px solid #dfe4e7;border-radius:9px;padding:0 9px;font:500 9px Inter;color:#3c454b}.org-form input,.org-form select{height:38px}.org-form textarea{height:72px;padding-top:8px;resize:vertical}.org-checkline{display:flex!important;align-items:center;gap:7px}.org-checkline input{width:auto;height:auto;margin:0}',
      '@media(max-width:1000px){.org-seat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.org-area-grid,.org-kpi-grid,.org-ritual-grid{grid-template-columns:1fr}.org-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.org-columns{grid-template-columns:1fr}.org-table-head{display:none}.org-table-row{grid-template-columns:50px minmax(0,1fr) auto}.org-table-row>span:nth-child(3),.org-table-row>span:nth-child(4),.org-table-row>span:nth-child(5){display:none}.org-check-row{grid-template-columns:38px minmax(0,1fr)}.org-check-row select,.org-check-row textarea{grid-column:2}.org-action-row{grid-template-columns:1fr}.org-head{align-items:flex-start;flex-direction:column}.org-head-actions{width:100%}}'
    ].join('');
    document.head.appendChild(s);
  }

  async function client(){ await window.AllianceOSAuth?.ready; const c=window.AllianceOSAuth?.client; if(!c)throw new Error('Supabase ainda não está disponível.'); return c; }
  async function rpc(name,args={}){ const c=await client(); const {data,error}=await c.rpc(name,args); if(error)throw error; return data; }
  function currentBrand(){
    const sel=$('#brandSelect'), opt=sel?.selectedOptions?.[0];
    let id=opt?.dataset?.brandId||'', name=String(opt?.textContent||opt?.value||'').trim();
    if(!id||id==='__all__'||/^todas/i.test(name))return {id:null,name:'Todas as marcas'};
    return {id,name:name||'Marca'};
  }
  function allSeats(){
    const areas=state.org?.areas||[];
    const exec=(state.org?.executive_seats||[]).map(s=>({...s,area:'Direção executiva',area_key:null}));
    const nested=areas.flatMap(a=>(a.seats||[]).map(s=>({...s,area:a.name,area_key:a.key})));
    return [...exec,...nested];
  }
  function seat(code){return allSeats().find(s=>s.code===code)}
  function toast(msg){
    if(typeof window.showToast==='function'){window.showToast(msg);return}
    const n=document.createElement('div');n.textContent=msg;Object.assign(n.style,{position:'fixed',right:'24px',bottom:'24px',zIndex:2147483640,padding:'11px 14px',borderRadius:'10px',background:'#111519',color:'#fff',font:'600 10px Inter'});document.body.appendChild(n);setTimeout(()=>n.remove(),1900);
  }

  function mount(){
    ensureStyle();
    let root=$('#allianceOrganizationCenter');
    if(root)return root;
    const main=$('.main');if(!main)return null;
    root=document.createElement('section');root.id='allianceOrganizationCenter';root.className='org-page';root.hidden=true;main.appendChild(root);
    const drawer=document.createElement('div');drawer.id='allianceOrganizationDrawer';drawer.className='org-drawer';drawer.hidden=true;document.body.appendChild(drawer);
    const modal=document.createElement('div');modal.id='allianceOrganizationModal';modal.className='org-modal';modal.hidden=true;document.body.appendChild(modal);
    root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('focusout',onBlur);
    drawer.addEventListener('click',onClick);modal.addEventListener('click',onClick);
    $('#brandSelect')?.addEventListener('change',()=>{if(state.open){state.workspace=null;state.run=null;load(false)}});
    return root;
  }

  async function open(){
    const root=mount();if(!root)return;
    state.open=true;document.body.classList.add('alliance-organization-open');root.hidden=false;
    window.dispatchEvent(new CustomEvent('allianceos:organization-open'));
    await load(!state.org);
  }
  function close(){
    state.open=false;document.body.classList.remove('alliance-organization-open');
    const root=$('#allianceOrganizationCenter');if(root)root.hidden=true;
    closeDrawer();closeModal();
  }
  async function load(loadOrg=true){
    const root=mount();if(!root)return;
    state.loading=true;root.innerHTML='<div class="org-loading"><i></i><b>Carregando Organização…</b></div>';
    try{
      const brand=currentBrand();
      const jobs=[];
      jobs.push(loadOrg||!state.org?rpc('organization_snapshot'):Promise.resolve(state.org));
      jobs.push(brand.id?rpc('ritual_workspace_context',{p_brand_id:brand.id}):Promise.resolve(null));
      const [org,workspace]=await Promise.all(jobs);
      state.org=org||state.org;state.workspace=workspace;state.loading=false;render();
    }catch(e){state.loading=false;root.innerHTML='<div class="org-error">'+icon('alert')+'<strong>Não foi possível carregar Organização</strong><p>'+esc(e?.message||e)+'</p><button class="org-secondary" data-org-retry>Tentar novamente</button></div>'}
  }

  function header(){
    const seats=allSeats(), areas=state.org?.areas||[], rituals=state.org?.rituals||[], kpis=seats.reduce((n,s)=>n+(s.kpis?.length||0),0);
    return '<div class="org-shell"><header class="org-head"><div><span class="org-kicker">ESTRUTURA & GOVERNANÇA</span><h1>Organização</h1><p>Áreas, cadeiras, indicadores e rituais que transformam estratégia em execução.</p></div><div class="org-head-actions"><button class="org-secondary" data-org-daily>'+icon('calendar')+'Daily</button><button class="org-primary" data-org-preflight>'+icon('check')+'Preflight</button></div></header>'+
      '<section class="org-summary"><article><b>'+areas.length+'</b><span>Áreas estruturadas</span></article><article><b>'+seats.length+'</b><span>Cadeiras C01–C18</span></article><article><b>'+kpis+'</b><span>KPIs com dono</span></article><article><b>'+rituals.length+'</b><span>Rituais de gestão</span></article></section>'+
      '<nav class="org-tabs">'+[
        ['chart','Organograma','org'],['seats','Cadeiras','seat'],['kpis','KPIs','kpi'],['rituals','Rituais','ritual']
      ].map(x=>'<button class="'+(state.tab===x[0]?'active':'')+'" data-org-tab="'+x[0]+'">'+icon(x[2])+'<span>'+x[1]+'</span></button>').join('')+
      '</nav><main class="org-content">';
  }
  function render(){
    const root=mount();if(!root||!state.org)return;
    let body='';
    if(state.tab==='chart')body=renderChart();
    else if(state.tab==='seats')body=renderSeats();
    else if(state.tab==='kpis')body=renderKpis();
    else if(state.tab==='rituals')body=renderRituals();
    else if(state.tab==='daily')body=renderDaily();
    else if(state.tab==='preflight')body=renderPreflight();
    root.innerHTML=header()+body+'</main></div>';
  }
  function seatCard(s){
    const ref=!!s.is_reference;
    const merged=ref&&s.merged_into_code?'<span class="org-seat-reference">Unificada em '+esc(s.merged_into_code)+' · referência</span>':'';
    return '<button class="org-seat '+(ref?'reference':'')+'" data-org-seat="'+esc(s.code)+'"><span class="org-seat-code">'+esc(s.code)+'</span><span><strong>'+esc(s.title)+'</strong><small>'+esc(s.occupant_name||'Sem ocupante definido')+'</small>'+merged+'</span><em>'+esc(s.level||'')+'</em>'+icon('arrow')+'</button>';
  }
  function areaSeatGroups(a){
    const seats=Array.isArray(a.seats)?a.seats:[];
    const subareas=Array.isArray(a.subareas)?a.subareas:[];
    const direct=seats.filter(s=>!s.subarea_key&&!s.subarea);
    const groups=[];
    if(direct.length)groups.push('<div class="org-subarea-group"><div class="org-subarea-label"><span>Cadeiras da área</span><small>'+direct.length+'</small></div>'+direct.map(seatCard).join('')+'</div>');
    for(const sa of subareas){
      const rows=seats.filter(s=>String(s.subarea_key||'')===String(sa.key||''));
      if(!rows.length)continue;
      groups.push('<div class="org-subarea-group"><div class="org-subarea-label"><span>'+esc(sa.name)+'</span><small>'+rows.length+' cadeira'+(rows.length===1?'':'s')+'</small></div>'+rows.map(seatCard).join('')+'</div>');
    }
    const known=new Set(subareas.map(sa=>String(sa.key||'')));
    const fallback=seats.filter(s=>s.subarea&&!s.subarea_key||s.subarea_key&&!known.has(String(s.subarea_key)));
    const byName=new Map();
    fallback.forEach(s=>{const k=s.subarea||'Outras';if(!byName.has(k))byName.set(k,[]);byName.get(k).push(s)});
    for(const [name,rows] of byName)groups.push('<div class="org-subarea-group"><div class="org-subarea-label"><span>'+esc(name)+'</span><small>'+rows.length+' cadeira'+(rows.length===1?'':'s')+'</small></div>'+rows.map(seatCard).join('')+'</div>');
    return groups.join('')||'<div class="org-empty">Nenhuma cadeira ativa nesta área.</div>';
  }
  function renderChart(){
    const exec=state.org?.executive_seats||[], areas=state.org?.areas||[];
    return '<section class="org-cycle"><span>CICLO DE GESTÃO</span><strong>'+esc(state.org?.management_cycle||'Planejar → Estruturar → Executar → Validar → Medir → Corrigir → Aprender')+'</strong></section>'+
      '<section class="org-block"><header><div><span>DIREÇÃO</span><h2>Liderança executiva</h2><p>Cadeiras que definem direção, estratégia e governança.</p></div></header><div class="org-seat-grid">'+exec.map(seatCard).join('')+'</div></section>'+
      '<div class="org-area-grid">'+areas.map(a=>'<section class="org-area"><header><div><span>ÁREA</span><h3>'+esc(a.name)+'</h3><p>'+esc(a.description||'')+'</p></div><aside><small>Head</small><b>'+esc(a.head_name||'A definir')+'</b></aside></header><div class="org-area-seats">'+areaSeatGroups(a)+'</div></section>').join('')+'</div>';
  }
  function renderSeats(){
    const rows=allSeats();
    return '<section class="org-table"><div class="org-table-head"><span>Cadeira</span><span>Função</span><span>Área</span><span>Ocupante</span><span>Nível</span><span></span></div>'+
      rows.map(s=>'<div class="org-table-row" data-org-seat="'+esc(s.code)+'"><span class="org-seat-code">'+esc(s.code)+'</span><div><strong>'+esc(s.title)+'</strong><small>'+esc(s.subarea||s.summary||'')+'</small></div><span>'+esc(s.area||'Direção')+'</span><span>'+esc(s.occupant_name||'A definir')+'</span><span>'+esc(s.level||'')+'</span>'+icon('arrow')+'</div>').join('')+'</section>';
  }
  function renderKpis(){
    const rows=allSeats().filter(s=>s.kpis?.length);
    return '<div class="org-kpi-grid">'+rows.map(s=>'<article class="org-kpi-card"><header><span>'+icon('kpi')+'</span><div><h3>'+esc(s.code)+' · '+esc(s.title)+'</h3><small>'+esc(s.occupant_name||'Sem ocupante')+' · '+esc(s.area||'Direção')+'</small></div></header><div class="org-tags">'+s.kpis.map(k=>'<span>'+esc(k.name)+'</span>').join('')+'</div></article>').join('')+'</div>';
  }
  function renderRituals(){
    const rows=state.org?.rituals||[];
    return '<section class="org-cycle"><span>RITMO OPERACIONAL</span><strong>'+esc(state.org?.management_cycle||'')+'</strong></section><div class="org-ritual-grid">'+rows.map(r=>
      '<article class="org-ritual"><div class="org-ritual-top"><span class="org-ritual-code">'+esc(r.code)+'</span><small>'+esc(r.owner_name||'')+'</small></div><h3>'+esc(r.name)+'</h3><p>'+esc(r.objective||'')+'</p><div class="org-ritual-meta">'+[r.frequency,r.timing,r.duration].filter(Boolean).map(v=>'<span>'+esc(v)+'</span>').join('')+'</div><div class="org-ritual-actions"><button class="org-small" data-org-ritual="'+esc(r.code)+'">Ver detalhes</button>'+(r.code==='R01'?'<button class="org-small" data-org-daily>Abrir Daily</button>':'')+(r.code==='R05'?'<button class="org-small" data-org-preflight>Abrir Preflight</button>':'')+'</div></article>'
    ).join('')+'</div>';
  }
  function taskList(title,rows,kind){
    rows=rows||[];
    return '<section class="org-list"><header><h3>'+esc(title)+'</h3><b>'+rows.length+'</b></header><div class="org-list-body">'+(rows.length?rows.slice(0,10).map(t=>'<article class="org-task"><strong>'+esc(t.title)+'</strong><small>'+esc(t.priority||'normal')+(t.due_date?' · '+fmtDate(t.due_date):'')+(Array.isArray(t.assignees)&&t.assignees.length?' · '+esc(t.assignees.join(', ')):'')+'</small></article>').join(''):'<div class="org-empty">Nenhum item neste recorte.</div>')+'</div></section>';
  }
  function recentRuns(code){
    return (state.workspace?.recent_runs||[]).filter(r=>r.ritual_code===code).slice(0,6);
  }
  function renderHistory(code){
    const rows=recentRuns(code);if(!rows.length)return '';
    return '<section class="org-history"><h3>Histórico recente</h3>'+rows.map(r=>'<div class="org-history-row"><div><strong>'+esc(r.title)+'</strong><small>'+fmtDateTime(r.started_at)+(r.created_by_name?' · '+esc(r.created_by_name):'')+'</small></div><em>'+esc(r.decision_status||r.status)+'</em></div>').join('')+'</section>';
  }
  function brandGuard(kind){
    return '<section class="org-workspace-head"><div><span class="org-kicker">'+(kind==='daily'?'R01 · DAILY OPERACIONAL':'R05 · PREFLIGHT / GO-LIVE')+'</span><h2>Selecione uma marca</h2><p>Os rituais operacionais são executados dentro do contexto de uma marca.</p></div></section>';
  }
  function renderDaily(){
    if(!state.workspace)return brandGuard('daily');
    const b=state.workspace.brand||{};
    let runHtml='';
    if(state.run?.run?.ritual_code==='R01')runHtml=renderDailyRun();
    else runHtml='<section class="org-start"><div class="org-run-body"><strong>Daily de hoje</strong><p style="font-size:8.5px;color:#89939a">O status deve estar atualizado antes da reunião. A Daily foca riscos, bloqueios, decisões e próximas ações.</p><button class="org-primary" data-org-start-daily>'+icon('plus')+'Iniciar Daily</button></div></section>';
    return '<section class="org-workspace-head"><div><span class="org-kicker">R01 · DAILY OPERACIONAL</span><h2>'+esc(b.name||'Marca')+' · '+fmtDate(state.workspace.date)+'</h2><p>Visão do dia antes da reunião: atrasos, vencimentos e bloqueios.</p></div><button class="org-secondary" data-org-back>Voltar à Organização</button></section>'+
      '<div class="org-columns">'+taskList('Atrasadas',state.workspace.overdue_tasks,'overdue')+taskList('Vencem hoje',state.workspace.due_today,'today')+taskList('Bloqueios / dependências',state.workspace.blocked_tasks,'blocked')+'</div>'+runHtml+renderHistory('R01');
  }
  function renderDailyRun(){
    const r=state.run.run, items=state.run.items||[];
    return '<section class="org-run"><header><div><span>DAILY EM ANDAMENTO</span><h3>'+esc(r.title)+'</h3></div><button class="org-small" data-org-add-action>'+icon('plus')+'Nova ação</button></header><div class="org-run-body">'+(items.length?items.map(i=>'<div class="org-action-row"><div><strong>'+esc(i.title)+'</strong><small>'+esc(i.owner_name||i.seat_title||'Sem dono')+(i.due_at?' · '+fmtDateTime(i.due_at):'')+'</small></div><span><strong>'+esc(i.seat_code||'—')+'</strong><small>'+esc(i.seat_title||i.area_name||'')+'</small></span><select data-org-item-status="'+esc(i.id)+'"><option '+(i.status==='PENDENTE'?'selected':'')+'>PENDENTE</option><option '+(i.status==='EM ANDAMENTO'?'selected':'')+'>EM ANDAMENTO</option><option '+(i.status==='CONCLUÍDO'?'selected':'')+'>CONCLUÍDO</option><option '+(i.status==='BLOQUEADOR'?'selected':'')+'>BLOQUEADOR</option></select></div>').join(''):'<div class="org-empty">Nenhuma nova ação registrada ainda.</div>')+'</div><footer class="org-run-footer"><textarea id="orgRunSummary" placeholder="Resumo, decisões e escalonamentos da Daily…"></textarea><button class="org-primary" data-org-complete-daily>Encerrar Daily</button></footer></section>';
  }
  function renderPreflight(){
    if(!state.workspace)return brandGuard('preflight');
    const b=state.workspace.brand||{}, campaigns=state.workspace.campaigns||[];
    const options='<option value="">Selecione a campanha / go-live</option>'+campaigns.map(c=>'<option value="'+esc(c.id)+'" '+(state.campaignId===c.id?'selected':'')+'>'+esc(c.name)+' · '+esc(c.status||'')+'</option>').join('');
    let runHtml='';
    if(state.run?.run?.ritual_code==='R05')runHtml=renderPreflightRun();
    else runHtml='<section class="org-start"><div class="org-run-body"><strong>Checklist de prontidão</strong><p style="font-size:8.5px;color:#89939a">Selecione a campanha acima e inicie o Preflight. Cada frente valida tecnicamente sua própria área.</p><button class="org-primary" data-org-start-preflight '+(!state.campaignId?'disabled style="opacity:.4"':'')+'>'+icon('check')+'Iniciar Preflight</button></div></section>';
    return '<section class="org-workspace-head"><div><span class="org-kicker">R05 · PREFLIGHT / GO-LIVE</span><h2>'+esc(b.name||'Marca')+'</h2><p>Validação T-24h e decisão GO / GO COM RESSALVA / NO-GO.</p></div><div><select id="orgPreflightCampaign">'+options+'</select></div></section>'+runHtml+renderHistory('R05');
  }
  function renderPreflightRun(){
    const r=state.run.run, items=state.run.items||[], blockers=items.filter(i=>i.blocking||i.status==='BLOQUEADOR').length;
    return '<section class="org-run"><header><div><span>PREFLIGHT EM ANDAMENTO</span><h3>'+esc(r.campaign_name||r.title)+'</h3></div><span style="font-size:8px;color:'+(blockers?'#a34b4b':'#6d777d')+'">'+blockers+' bloqueador'+(blockers===1?'':'es')+'</span></header><div class="org-run-body">'+items.map(i=>'<div class="org-check-row"><span class="org-check-code">'+esc(i.seat_code||'')+'</span><div><strong>'+esc(i.title)+'</strong><small>'+esc(i.seat_title||i.area_name||'')+'</small></div><textarea data-org-check-note="'+esc(i.id)+'" placeholder="Observação / pendência…">'+esc(i.detail||'')+'</textarea><select data-org-check-status="'+esc(i.id)+'"><option '+(i.status==='PENDENTE'?'selected':'')+'>PENDENTE</option><option '+(i.status==='APROVADO'?'selected':'')+'>APROVADO</option><option '+(i.status==='PENDÊNCIA NÃO BLOQUEANTE'?'selected':'')+'>PENDÊNCIA NÃO BLOQUEANTE</option><option '+(i.status==='BLOQUEADOR'?'selected':'')+'>BLOQUEADOR</option></select></div>').join('')+'</div><footer class="org-run-footer"><textarea id="orgPreflightSummary" placeholder="Resumo da validação e ressalvas…"></textarea><div class="org-decision-buttons"><button class="org-decision" data-org-decision="GO" '+(blockers?'disabled':'')+'>GO</button><button class="org-decision" data-v="WARN" data-org-decision="GO COM RESSALVA" '+(blockers?'disabled':'')+'>GO COM RESSALVA</button><button class="org-decision" data-v="NO-GO" data-org-decision="NO-GO">NO-GO</button></div></footer></section>';
  }

  async function loadRun(id){
    if(!id)return;state.run=await rpc('ritual_run_detail',{p_run_id:id});render();
  }
  async function openDaily(){
    state.tab='daily';state.run=null;await load(false);
    const active=recentRuns('R01').find(r=>r.status==='active'&&String(r.started_at||'').slice(0,10)===new Date().toISOString().slice(0,10));
    if(active)await loadRun(active.id);
  }
  async function openPreflight(){
    state.tab='preflight';state.run=null;await load(false);
  }
  async function startDaily(){
    const b=currentBrand();if(!b.id){toast('Selecione uma marca primeiro.');return}
    const id=await rpc('ritual_start',{p_ritual_code:'R01',p_brand_id:b.id,p_campaign_id:null});await loadRun(id);
  }
  async function startPreflight(){
    const b=currentBrand();if(!b.id||!state.campaignId){toast('Selecione marca e campanha.');return}
    const id=await rpc('ritual_start',{p_ritual_code:'R05',p_brand_id:b.id,p_campaign_id:state.campaignId});await loadRun(id);
  }
  async function saveItem(id,payload,quiet=false){
    try{await rpc('ritual_item_save',{p_run_id:state.run.run.id,p_item_id:id||null,p_payload:payload});state.run=await rpc('ritual_run_detail',{p_run_id:state.run.run.id});if(!quiet)render()}catch(e){toast(e?.message||'Falha ao salvar item.')}
  }
  async function completeRun(decision=null){
    const summary=state.tab==='daily'?$('#orgRunSummary')?.value.trim():$('#orgPreflightSummary')?.value.trim();
    try{
      await rpc('ritual_run_complete',{p_run_id:state.run.run.id,p_decision_status:decision,p_summary:summary||null});
      state.run=null;await load(false);toast(state.tab==='daily'?'Daily encerrada e registrada.':'Preflight concluído: '+decision+'.');
    }catch(e){toast(e?.message||'Não foi possível concluir.')}
  }

  function openActionModal(){
    const m=$('#allianceOrganizationModal'), seats=allSeats().filter(s=>s.occupant_name);
    m.hidden=false;m.classList.add('open');m.innerHTML='<div class="org-backdrop" data-org-modal-close></div><section><header><div><span class="org-kicker">NOVA AÇÃO</span><h3>Registrar saída da Daily</h3></div><button class="org-icon-btn" data-org-modal-close>'+icon('close')+'</button></header><div class="org-form"><label class="wide">Título<input id="orgActionTitle" placeholder="O que precisa acontecer?"></label><label>Responsável / cadeira<select id="orgActionSeat"><option value="">Selecione</option>'+seats.map(s=>'<option value="'+esc(s.code)+'">'+esc(s.occupant_name)+' · '+esc(s.title)+'</option>').join('')+'</select></label><label>Prazo<input id="orgActionDue" type="datetime-local"></label><label class="wide">Detalhe<textarea id="orgActionDetail" placeholder="Contexto, dependência ou critério de conclusão"></textarea></label><label class="wide org-checkline"><input id="orgActionBlock" type="checkbox"> Já nasce como bloqueador</label></div><footer><button class="org-secondary" data-org-modal-close>Cancelar</button><button class="org-primary" data-org-save-action>Salvar ação</button></footer></section>';
  }
  function closeModal(){const m=$('#allianceOrganizationModal');if(m){m.classList.remove('open');m.hidden=true;m.innerHTML=''}}
  async function saveAction(){
    const title=$('#orgActionTitle')?.value.trim();if(!title){toast('Digite o título da ação.');return}
    const code=$('#orgActionSeat')?.value||'', s=seat(code), due=$('#orgActionDue')?.value, blocking=!!$('#orgActionBlock')?.checked;
    await saveItem(null,{item_type:'action',title,detail:$('#orgActionDetail')?.value.trim()||null,status:blocking?'BLOQUEADOR':'PENDENTE',blocking,seat_code:code||null,area_key:s?.area_key||null,owner_profile_id:s?.profile_id||null,owner_name:s?.occupant_name||null,due_at:due?new Date(due).toISOString():null},true);
    closeModal();render();toast('Ação registrada.');
  }

  function openSeat(code){
    const s=seat(code);if(!s)return;const d=$('#allianceOrganizationDrawer');d.hidden=false;d.classList.add('open');
    d.innerHTML='<div class="org-backdrop" data-org-drawer-close></div><aside><header><div><span class="org-kicker">'+esc(s.code)+' · '+esc(s.level||'CADEIRA')+'</span><h2>'+esc(s.title)+'</h2><p>'+esc(s.occupant_name||'Sem ocupante definido')+(s.area?' · '+esc(s.area):'')+(s.subarea?' · '+esc(s.subarea):'')+'</p>'+(s.is_reference&&s.merged_into_code?'<small class="org-seat-reference">Cadeira unificada em '+esc(s.merged_into_code)+'; mantida somente como referência do organograma.</small>':'')+'</div><button class="org-icon-btn" data-org-drawer-close>'+icon('close')+'</button></header><section><article><span>MISSÃO</span><p>'+esc(s.mission||s.summary||'—')+'</p></article><article><span>ALÇADA / PODE DECIDIR</span><p>'+esc(s.authority||'—')+'</p></article><article><span>ESCALONAMENTO</span><p>'+esc(s.escalation||'—')+'</p></article>'+(s.kpis?.length?'<article><span>KPIs DA CADEIRA</span><div class="org-tags">'+s.kpis.map(k=>'<span>'+esc(k.name)+'</span>').join('')+'</div></article>':'')+'</section></aside>';
  }
  function openRitual(code){
    const r=(state.org?.rituals||[]).find(x=>x.code===code);if(!r)return;const d=$('#allianceOrganizationDrawer');d.hidden=false;d.classList.add('open');
    d.innerHTML='<div class="org-backdrop" data-org-drawer-close></div><aside><header><div><span class="org-kicker">'+esc(r.code)+'</span><h2>'+esc(r.name)+'</h2><p>'+esc(r.frequency||'')+(r.duration?' · '+esc(r.duration):'')+'</p></div><button class="org-icon-btn" data-org-drawer-close>'+icon('close')+'</button></header><section>'+[['OBJETIVO',r.objective],['PRÉ-REQUISITOS',r.prerequisites],['AGENDA',r.agenda],['SAÍDAS OBRIGATÓRIAS',r.outputs],['REGRAS',r.rules],['PARTICIPANTES',r.participants],['REGISTRO NO ALLIANCEOS',r.registration]].filter(x=>x[1]).map(x=>'<article><span>'+x[0]+'</span><p>'+esc(x[1])+'</p></article>').join('')+'</section></aside>';
  }
  function closeDrawer(){const d=$('#allianceOrganizationDrawer');if(d){d.classList.remove('open');d.hidden=true;d.innerHTML=''}}

  function onClick(e){
    const t=e.target.closest('[data-org-tab],[data-org-seat],[data-org-ritual],[data-org-daily],[data-org-preflight],[data-org-back],[data-org-start-daily],[data-org-start-preflight],[data-org-add-action],[data-org-save-action],[data-org-complete-daily],[data-org-decision],[data-org-drawer-close],[data-org-modal-close],[data-org-retry]');
    if(!t)return;
    if(t.dataset.orgTab){state.tab=t.dataset.orgTab;state.run=null;render();return}
    if(t.dataset.orgSeat){openSeat(t.dataset.orgSeat);return}
    if(t.dataset.orgRitual){openRitual(t.dataset.orgRitual);return}
    if(t.hasAttribute('data-org-daily')){openDaily();return}
    if(t.hasAttribute('data-org-preflight')){openPreflight();return}
    if(t.hasAttribute('data-org-back')){state.tab='chart';state.run=null;render();return}
    if(t.hasAttribute('data-org-start-daily')){startDaily();return}
    if(t.hasAttribute('data-org-start-preflight')){startPreflight();return}
    if(t.hasAttribute('data-org-add-action')){openActionModal();return}
    if(t.hasAttribute('data-org-save-action')){saveAction();return}
    if(t.hasAttribute('data-org-complete-daily')){completeRun(null);return}
    if(t.dataset.orgDecision){completeRun(t.dataset.orgDecision);return}
    if(t.hasAttribute('data-org-drawer-close')){closeDrawer();return}
    if(t.hasAttribute('data-org-modal-close')){closeModal();return}
    if(t.hasAttribute('data-org-retry')){load(true);return}
  }
  function onChange(e){
    const t=e.target;
    if(t.id==='orgPreflightCampaign'){state.campaignId=t.value;state.run=null;render();return}
    if(t.matches('[data-org-item-status]')){saveItem(t.dataset.orgItemStatus,{status:t.value,blocking:t.value==='BLOQUEADOR'});return}
    if(t.matches('[data-org-check-status]')){saveItem(t.dataset.orgCheckStatus,{status:t.value,blocking:t.value==='BLOQUEADOR'});return}
  }
  function onBlur(e){
    const t=e.target;if(t.matches('[data-org-check-note]'))saveItem(t.dataset.orgCheckNote,{detail:t.value.trim()||null},true);
  }

  mount();
  window.AllianceOSOrganization={open,close,openDaily,openPreflight,reload:()=>load(true)};
})();

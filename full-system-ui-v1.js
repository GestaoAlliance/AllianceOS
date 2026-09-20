(() => {
  'use strict';
  const CFG='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const parseMoney=v=>{
    let s=String(v??'').replace(/[^\d,.\-]/g,'');
    if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');
    else if(s.includes(','))s=s.replace(',','.');
    else if(/^\-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  let sb=null, fullView=null, wired=false;

  async function client(){
    if(sb)return sb;
    const r=await fetch(CFG,{cache:'no-store'});if(!r.ok)throw new Error('Não foi possível carregar a configuração do AllianceOS.');
    const cfg=await r.json(),mod=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
    sb=mod.createClient(cfg.url,cfg.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }
  const uid=()=>window.user?.id||'vitor-gutierrez';
  const campaignRows=()=>{try{const v=JSON.parse(localStorage.getItem('central.campaigns.'+uid())||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
  const activeBrand=()=>{const v=document.getElementById('brandSelect')?.value||'';return !v||/todas/i.test(v)?'':v};
  const monthRef=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
  const campaignRef=c=>c.monthRef||String(c.startAt||c.start||'').slice(0,7);

  function channelPlan(c){
    const structured=c?.tapStructured?.metas_por_fonte;
    if(Array.isArray(structured)&&structured.length)return structured.map(x=>({fonte:String(x.fonte||''),meta:Number(x.meta_faturamento||0),investimento:Number(x.investimento||0),roas:Number(x.roas_alvo||0)||null}));
    const legacyStructured=c?.tapStructured?.metas_por_canal;
    if(Array.isArray(legacyStructured)&&legacyStructured.length)return legacyStructured.map(x=>({fonte:String(x.fonte||x.canal||''),meta:Number(x.meta_faturamento||0),investimento:Number(x.investimento||0),roas:Number(x.roas_alvo||0)||null}));
    const sec=(Array.isArray(c?.tap)?c.tap:[]).find(s=>/^metas/i.test(String(s?.title||''))),out=[];
    for(const row of sec?.rows||[]){
      const label=String(row?.[0]||'');
      if(/^meta faturamento\s*[—-]\s*/i.test(label)){
        const fonte=label.replace(/^meta faturamento\s*[—-]\s*/i,'').trim();
        if(fonte&&!/^total$/i.test(fonte))out.push({fonte,meta:parseMoney(row?.[1]),investimento:0});
      }
    }
    for(const row of sec?.rows||[]){
      const label=String(row?.[0]||'');
      if(/^investimento\s*[—-]\s*/i.test(label)){
        const fonte=label.replace(/^investimento\s*[—-]\s*/i,'').trim(),x=out.find(y=>norm(y.fonte)===norm(fonte));
        if(x)x.investimento=parseMoney(row?.[1]);
      }
    }
    return out;
  }
  const effectiveGoal=c=>{const s=channelPlan(c).reduce((n,x)=>n+x.meta,0);return s||Number(c.goal||0)};

  async function snapshot(){
    const s=await client(),brand=activeBrand(),ref=monthRef(),parts=ref.split('-').map(Number);
    const {data:brands,error:be}=await s.from('brands').select('id,nome').eq('ativo',true);if(be)throw be;
    const visibleBrands=(brands||[]).filter(b=>!brand||norm(b.nome)===norm(brand)),ids=visibleBrands.map(b=>b.id);
    let months=[];
    if(ids.length){
      const {data,error}=await s.from('planning_months').select('*').in('brand_id',ids).eq('ano',parts[0]).eq('mes',parts[1]).is('arquivado_em',null);
      if(error)throw error;months=data||[];
    }
    const campaigns=campaignRows().filter(c=>!c.archivedAt&&(!brand||norm(c.brand)===norm(brand))&&campaignRef(c)===ref);
    const sum=campaigns.reduce((n,c)=>n+effectiveGoal(c),0);
    const target=months.reduce((n,m)=>n+Number(m['meta'+Number(m.meta_ativa||1)]||0),0);
    const warnings=[];
    if(target>0&&Math.abs(sum-target)>.01)warnings.push('As campanhas somam '+brl(sum)+' e não batem com a meta ativa da marca no mês ('+brl(target)+').');
    return{s,brand,ref,brands:visibleBrands,months,campaigns,sum,target,warnings};
  }

  function warning(id,host,msg){
    if(!host)return;let el=document.getElementById(id);
    if(!msg){el?.remove();return}
    if(!el){el=document.createElement('div');el.id=id;host.prepend(el)}
    el.textContent='⚠ '+msg;
    Object.assign(el.style,{margin:'0 0 12px',padding:'10px 12px',border:'1px solid #ead8a8',borderRadius:'10px',background:'#fff9e8',color:'#725c22',font:'600 10px/1.45 Inter,system-ui,sans-serif'});
  }

  async function refreshConsistency(){
    try{
      const p=await snapshot(),msg=p.warnings.join(' ');
      warning('alliance-month-warning-campaigns',document.getElementById('campaignsView'),msg);
      warning('alliance-month-warning-planning',document.getElementById('planningView'),msg);
      return p;
    }catch(e){console.warn('[AllianceOS coerência mensal]',e)}
  }

  async function enhanceReports(){
    try{
      const host=document.getElementById('painelView');if(!host)return;
      const p=await snapshot(),ids=p.campaigns.map(c=>String(c.id));let rows=[];
      if(ids.length){const {data,error}=await p.s.from('campaign_results').select('*').in('campaign_id',ids);if(error)throw error;rows=data||[]}
      const fat=rows.reduce((n,r)=>n+Number(r.faturamento||0),0),inv=rows.reduce((n,r)=>n+Number(r.investimento||0),0);
      let card=document.getElementById('alliance-plan-real-card');
      if(!card){card=document.createElement('section');card.id='alliance-plan-real-card';host.prepend(card)}
      card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:13px">Planejado × realizado</b><div style="font-size:9px;color:#8b949b;margin-top:3px">'+esc(p.ref)+(p.brand?' · '+esc(p.brand):'')+'</div></div></div>'
        +(p.warnings.length?'<div style="margin-top:9px;padding:8px 9px;border-radius:8px;background:#fff9e8;color:#725c22;font:600 9px/1.4 Inter,system-ui">⚠ '+esc(p.warnings.join(' '))+'</div>':'')
        +'<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px">'
        +[['Meta das campanhas',brl(p.sum)],['Faturamento realizado',brl(fat)],['Investimento realizado',brl(inv)],['ROAS realizado',inv?(fat/inv).toFixed(2).replace('.',','):'—']]
          .map(x=>'<div style="padding:10px;border:1px solid #e5e9ec;border-radius:10px;background:#fff"><small style="display:block;color:#8a949b;font-size:8px">'+esc(x[0])+'</small><b style="display:block;margin-top:5px;font-size:14px">'+esc(x[1])+'</b></div>').join('')
        +'</div>';
      Object.assign(card.style,{margin:'0 0 14px',padding:'13px',border:'1px solid #e0e5e8',borderRadius:'14px',background:'#fff',fontFamily:'Inter,system-ui,sans-serif'});
    }catch(e){console.warn('[AllianceOS relatórios]',e)}
  }

  function normalizeMap(payload){
    const raw=typeof payload==='string'?JSON.parse(payload):payload;
    const arr=Array.isArray(raw)?raw:(Array.isArray(raw?.nos)?raw.nos:(Array.isArray(raw?.nodes)?raw.nodes:null));
    if(!arr?.length)throw new Error('O JSON não contém nós.');
    const campaigns=campaignRows(),byId=new Map(campaigns.map(c=>[String(c.id),c])),byName=new Map(campaigns.map(c=>[norm(c.name),c])),warnings=[];
    const ids=new Map();arr.forEach((n,i)=>ids.set(String(n.node_key??n.chave??n.id??(i+1)),i+1));
    const nodes=arr.map((n,i)=>{
      const k=String(n.node_key??n.chave??n.id??(i+1)),p=n.parent_key??n.pai??n.parent??null,text=String(n.texto??n.t??n.title??'sem título'),legacy=n.campaign_id??n.campId??null;
      let campId;
      if(legacy!=null&&String(legacy).trim()){
        const found=byId.get(String(legacy))||byName.get(norm(n.campaign_name??n.campanha??text));
        if(found)campId=found.id;else warnings.push({no:k,texto:text,campanha_legada:String(legacy)});
      }
      return{id:ids.get(k),pai:p==null?null:(ids.get(String(p))||null),t:text,x:Number.isFinite(Number(n.x))?Number(n.x):520,y:Number.isFinite(Number(n.y))?Number(n.y):320,cor:n.cor??n.color??0,fech:n.aberto!==undefined?!n.aberto:!!n.fech,campId};
    });
    const roots=nodes.filter(n=>!n.pai);if(!roots.length)nodes[0].pai=null;else roots.slice(1).forEach(n=>n.pai=roots[0].id);
    return{v:2,layout:raw?.layout||'direita',prox:nodes.length+1,proxItem:1,nome:raw?.nome||raw?.name||'',itens:Array.isArray(raw?.itens)?raw.itens:[],nos:nodes,avisos:warnings};
  }

  function importMap(payload){
    const map=normalizeMap(payload),brand=window.MapaMental?.marca?.()||activeBrand(),key='central.planning.map.'+uid()+(brand?'.'+brand:'');
    localStorage.setItem(key,JSON.stringify(map));window.MapaMental?.recarregar?.();
    if(map.avisos?.length){console.warn('[AllianceOS mapa] nós sem campanha:',map.avisos);window.showToast?.(map.avisos.length+' nó(s) ficaram sem vínculo de campanha.')}
    return map;
  }
  function installMapImport(){
    const bar=document.querySelector('.mp-fer');if(!bar||bar.querySelector('[data-alliance-import-map]'))return;
    const group=bar.querySelector('.mp-grupo');if(!group)return;
    const b=document.createElement('button');b.type='button';b.dataset.allianceImportMap='1';b.title='Importar mapa JSON';b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"/></svg>';
    b.onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='application/json,.json';i.onchange=async()=>{const f=i.files?.[0];if(!f)return;try{importMap(await f.text());window.showToast?.('Mapa importado: '+f.name)}catch(e){alert('Não foi possível importar o mapa: '+(e?.message||e))}};i.click()};
    group.appendChild(b);
  }

  function ensureFullView(){
    if(fullView?.isConnected)return fullView;
    const home=document.getElementById('homeView'),host=home?.parentElement||document.querySelector('main')||document.body;
    fullView=document.createElement('section');fullView.id='alliance-full-view';fullView.hidden=true;host.appendChild(fullView);
    const st=document.createElement('style');st.textContent='#alliance-full-view{min-height:calc(100vh - 70px);padding:22px 26px;background:#f7f8f9;font-family:Inter,system-ui;color:#20262b}.afu-head{margin-bottom:16px}.afu-head h1{font-size:24px;margin:0;letter-spacing:-.035em}.afu-head p{font-size:10px;color:#7f8990}.afu-card{background:#fff;border:1px solid #e2e7ea;border-radius:14px;overflow:hidden}.afu-table{width:100%;border-collapse:collapse}.afu-table th,.afu-table td{padding:11px 13px;border-bottom:1px solid #edf1f3;text-align:left;font-size:10px}.afu-table th{font-size:8px;color:#89939a;text-transform:uppercase;letter-spacing:.05em;background:#fafbfb}.afu-pill{display:inline-flex;padding:4px 7px;border-radius:6px;background:#eef2f4;font-size:8px;font-weight:650}';document.head.appendChild(st);
    return fullView;
  }
  const baseViews=()=>['homeView','tasksView','planningView','campaignsView','deliveriesView','painelView'].map(id=>document.getElementById(id)).filter(Boolean);
  function closeFull(){if(fullView)fullView.hidden=true;baseViews().forEach(v=>v.style.removeProperty('display'))}
  function shell(title,sub){const v=ensureFullView();baseViews().forEach(x=>x.style.setProperty('display','none','important'));v.hidden=false;v.innerHTML='<div class="afu-head"><h1>'+esc(title)+'</h1><p>'+esc(sub)+'</p></div><div id="afu-body">Carregando…</div>';return document.getElementById('afu-body')}

  async function openClients(){
    const body=shell('Clientes','Dados canônicos do AllianceOS, operados pela interface e pelo MCP.');
    try{const s=await client(),{data,error}=await s.from('alliance_clients').select('*').is('arquivado_em',null).order('nome');if(error)throw error;const cs=campaignRows();body.innerHTML='<div class="afu-card"><table class="afu-table"><thead><tr><th>Cliente</th><th>Tipo</th><th>Contato</th><th>Status</th><th>Campanhas</th></tr></thead><tbody>'+((data||[]).map(x=>'<tr><td><b>'+esc(x.nome)+'</b></td><td>'+esc(x.tipo)+'</td><td>'+esc(x.contato_nome||x.email||x.telefone||'—')+'</td><td><span class="afu-pill">'+esc(x.status)+'</span></td><td>'+cs.filter(c=>String(c.clientId||'')===String(x.id)).length+'</td></tr>').join('')||'<tr><td colspan="5">Nenhum cliente cadastrado.</td></tr>')+'</tbody></table></div>'}catch(e){body.textContent=e?.message||String(e)}
  }
  async function openAutomations(){
    const body=shell('Automações','Gatilhos e ações canônicos do AllianceOS.');
    try{const s=await client(),{data,error}=await s.from('alliance_automations').select('*,brands(nome)').is('arquivado_em',null).order('nome');if(error)throw error;body.innerHTML='<div class="afu-card"><table class="afu-table"><thead><tr><th>Automação</th><th>Marca</th><th>Canal</th><th>Status</th><th>Última execução</th></tr></thead><tbody>'+((data||[]).map(x=>'<tr><td><b>'+esc(x.nome)+'</b></td><td>'+esc(x.brands?.nome||'—')+'</td><td>'+esc(x.canal)+'</td><td><span class="afu-pill">'+esc(x.status)+'</span></td><td>'+esc(x.ultima_execucao?new Date(x.ultima_execucao).toLocaleString('pt-BR'):'—')+'</td></tr>').join('')||'<tr><td colspan="5">Nenhuma automação cadastrada.</td></tr>')+'</tbody></table></div>'}catch(e){body.textContent=e?.message||String(e)}
  }

  function wire(){
    if(wired)return;
    const clients=document.querySelector('.ref2-nav-btn[data-key="clients"]'),autos=document.querySelector('.ref2-nav-btn[data-key="automations"]');
    if(!clients||!autos){setTimeout(wire,100);return}
    wired=true;
    clients.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openClients()},{capture:true});
    autos.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openAutomations()},{capture:true});
    document.querySelectorAll('.ref2-nav-btn:not([data-key="clients"]):not([data-key="automations"])').forEach(b=>b.addEventListener('click',()=>{closeFull();if(b.dataset.key==='reports')setTimeout(enhanceReports,100)},{capture:true}));
    document.getElementById('brandSelect')?.addEventListener('change',()=>{refreshConsistency();setTimeout(enhanceReports,80)});
    document.getElementById('campaignsNav')?.addEventListener('click',()=>setTimeout(refreshConsistency,80));
    document.getElementById('planningNav')?.addEventListener('click',()=>setTimeout(()=>{refreshConsistency();installMapImport()},120));
    document.getElementById('painelNav')?.addEventListener('click',()=>setTimeout(enhanceReports,120));
    new MutationObserver(()=>installMapImport()).observe(document.body,{childList:true,subtree:true});
    refreshConsistency();installMapImport();
  }
  window.AllianceFullSystem={refreshConsistency,enhanceReports,importMap,openClients,openAutomations};
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
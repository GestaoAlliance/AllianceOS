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
      if(ids.length){const {data,error}=await p.s.from('campaign_results').select('*').in('campaign_id',ids).is('arquivado_em',null);if(error)throw error;rows=data||[]}
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
        if(found)campId=found.id;
        else{
          campId=String(legacy);
          warnings.push({no:k,texto:text,campanha_legada:String(legacy)});
        }
      }
      return{id:ids.get(k),pai:p==null?null:(ids.get(String(p))||null),t:text,x:Number.isFinite(Number(n.x))?Number(n.x):520,y:Number.isFinite(Number(n.y))?Number(n.y):320,cor:n.cor??n.color??0,fech:n.aberto!==undefined?!n.aberto:!!n.fech,campId};
    });
    const roots=nodes.filter(n=>!n.pai);if(!roots.length)nodes[0].pai=null;else roots.slice(1).forEach(n=>n.pai=roots[0].id);
    return{v:2,layout:raw?.layout||'direita',prox:nodes.length+1,proxItem:1,nome:raw?.nome||raw?.name||'',itens:Array.isArray(raw?.itens)?raw.itens:[],nos:nodes,avisos:warnings};
  }

  const MONTH_NAMES=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  let mapHydrateSeq=0;
  const mapSaveTimers=new Map();

  const mapLocalKey=brand=>'central.planning.map.'+uid()+(brand?'.'+brand:'');
  async function authReady(){
    try{if(window.AllianceOSAuth?.ready)await window.AllianceOSAuth.ready}catch{}
    return client();
  }
  async function canonicalMapContext(brandName,{createMonth=false}={}){
    const brand=String(brandName||activeBrand()||'').trim();
    if(!brand)return null;
    const s=await authReady();
    const {data:brands,error:be}=await s.from('brands').select('id,nome').eq('ativo',true);
    if(be)throw be;
    const br=(brands||[]).find(x=>norm(x.nome)===norm(brand));
    if(!br)throw new Error('Marca não encontrada no AllianceOS: '+brand);
    const [ano,mes]=monthRef().split('-').map(Number);
    let {data:months,error:me}=await s.from('planning_months')
      .select('*').eq('brand_id',br.id).eq('ano',ano).eq('mes',mes)
      .is('arquivado_em',null).order('atualizado_em',{ascending:false}).limit(1);
    if(me)throw me;
    let month=months?.[0]||null;
    if(!month&&createMonth){
      const ins=await s.from('planning_months').insert({
        brand_id:br.id,ano,mes,meta1:0,meta2:0,meta3:0,meta_ativa:1,
        ticket_medio_previsto:0,origem:'interface'
      }).select('*').single();
      if(ins.error)throw ins.error;month=ins.data;
    }
    if(!month)return{s,brand:br,month:null,map:null};
    const {data:maps,error:mae}=await s.from('planning_maps').select('*')
      .eq('brand_id',br.id).eq('month_id',month.id).is('arquivado_em',null)
      .order('atualizado_em',{ascending:false}).limit(1);
    if(mae)throw mae;
    return{s,brand:br,month,map:maps?.[0]||null};
  }

  function canonicalPayload(mapRow,nodeRows){
    const visual=mapRow?.estado&&typeof mapRow.estado==='object'?mapRow.estado:{};
    return{
      nome:mapRow?.nome||'Planejamento',
      layout:mapRow?.layout||visual.layout||'direita',
      itens:Array.isArray(visual.itens)?visual.itens:[],
      proxItem:Number(visual.proxItem||1),
      nos:(nodeRows||[]).map(n=>({
        node_key:n.node_key,parent_key:n.parent_key,texto:n.texto,
        x:Number(n.x||0),y:Number(n.y||0),cor:n.cor,
        aberto:n.aberto,campaign_id:n.campaign_id
      }))
    };
  }

  async function hydrateCanonicalMap({silent=false}={}){
    const brand=window.MapaMental?.marca?.()||activeBrand();
    if(!brand)return null;
    const seq=++mapHydrateSeq;
    const state=document.getElementById('mindSaveState');
    if(state&&!silent)state.textContent='Sincronizando mapa…';
    try{
      const ctx=await canonicalMapContext(brand);
      if(seq!==mapHydrateSeq)return null;
      if(!ctx?.map){
        if(state&&!silent)state.textContent='Nenhum mapa salvo neste mês';
        return null;
      }
      const {data:nodes,error}=await ctx.s.from('planning_map_nodes').select('*')
        .eq('map_id',ctx.map.id).is('arquivado_em',null).order('criado_em',{ascending:true});
      if(error)throw error;
      if(!nodes?.length)return null;
      const map=normalizeMap(canonicalPayload(ctx.map,nodes));
      const visual=ctx.map.estado&&typeof ctx.map.estado==='object'?ctx.map.estado:{};
      map.nome=ctx.map.nome||map.nome;
      map.layout=ctx.map.layout||map.layout;
      map.itens=Array.isArray(visual.itens)?visual.itens:map.itens;
      map.proxItem=Number(visual.proxItem||map.proxItem||1);
      map.prox=Math.max(Number(visual.prox||0),map.prox||2);
      localStorage.setItem(mapLocalKey(ctx.brand.nome),JSON.stringify(map));
      window.MapaMental?.recarregar?.();
      if(state&&!silent)state.textContent='Mapa sincronizado do AllianceOS';
      return map;
    }catch(e){
      console.error('[AllianceOS mapa canônico] falha ao carregar',e);
      if(state&&!silent)state.textContent='Não foi possível sincronizar o mapa';
      return null;
    }
  }

  async function saveCanonicalMapNow(map,brandName){
    if(!map||!Array.isArray(map.nos)||!map.nos.length)return;
    const ctx=await canonicalMapContext(brandName,{createMonth:true});
    if(!ctx?.month)return;
    const s=ctx.s,now=new Date().toISOString();
    let row=ctx.map;
    const generatedName='Planejamento ['+MONTH_NAMES[(ctx.month.mes||1)-1]+'-'+String(ctx.brand.nome||'').toUpperCase()+']';
    const wantedName=String(map.nome||row?.nome||generatedName).trim().slice(0,200)||generatedName;
    const estado={itens:Array.isArray(map.itens)?map.itens:[],prox:Number(map.prox||2),proxItem:Number(map.proxItem||1)};
    if(!row){
      const ins=await s.from('planning_maps').insert({
        brand_id:ctx.brand.id,month_id:ctx.month.id,nome:wantedName,
        layout:String(map.layout||'direita'),estado,origem:'interface'
      }).select('*').single();
      if(ins.error)throw ins.error;row=ins.data;
    }else{
      const upd=await s.from('planning_maps').update({
        nome:wantedName,layout:String(map.layout||'direita'),estado,
        atualizado_em:now,origem:'interface'
      }).eq('id',row.id).select('*').single();
      if(upd.error)throw upd.error;row=upd.data;
    }

    const live=(map.nos||[]).map(n=>({
      map_id:row.id,
      node_key:String(n.id),
      parent_key:n.pai==null?null:String(n.pai),
      texto:String(n.t||'sem título').trim().slice(0,2000)||'sem título',
      x:Number(n.x||0),y:Number(n.y||0),
      cor:n.cor==null?null:String(n.cor),
      aberto:!n.fech,
      campaign_id:n.campId==null||String(n.campId).trim()===''?null:String(n.campId),
      origem:'interface',
      arquivado_em:null,arquivado_por:null,
      atualizado_em:now
    }));
    const up=await s.from('planning_map_nodes').upsert(live,{onConflict:'map_id,node_key'});
    if(up.error)throw up.error;

    const {data:existing,error:ee}=await s.from('planning_map_nodes').select('node_key')
      .eq('map_id',row.id).is('arquivado_em',null);
    if(ee)throw ee;
    const keys=new Set(live.map(n=>n.node_key));
    const missing=(existing||[]).map(n=>String(n.node_key)).filter(k=>!keys.has(k));
    if(missing.length){
      const ar=await s.from('planning_map_nodes').update({arquivado_em:now,atualizado_em:now})
        .eq('map_id',row.id).in('node_key',missing).is('arquivado_em',null);
      if(ar.error)throw ar.error;
    }
    const state=document.getElementById('mindSaveState');
    if(state)state.textContent='Salvo no AllianceOS';
  }

  function queueCanonicalMapSave(map,brandName){
    const brand=String(brandName||activeBrand()||'').trim();
    if(!brand)return Promise.resolve();
    clearTimeout(mapSaveTimers.get(brand));
    return new Promise(resolve=>{
      mapSaveTimers.set(brand,setTimeout(async()=>{
        mapSaveTimers.delete(brand);
        try{await saveCanonicalMapNow(JSON.parse(JSON.stringify(map)),brand)}
        catch(e){console.error('[AllianceOS mapa canônico] falha ao salvar',e);window.showToast?.('Não foi possível sincronizar o mapa com o AllianceOS.')}
        resolve();
      },650));
    });
  }

  function importMap(payload){
    const map=normalizeMap(payload),brand=window.MapaMental?.marca?.()||activeBrand(),key='central.planning.map.'+uid()+(brand?'.'+brand:'');
    localStorage.setItem(key,JSON.stringify(map));window.MapaMental?.recarregar?.();queueCanonicalMapSave(map,brand);
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

  function campaignNameInput(el){
    if(!(el instanceof HTMLInputElement))return false;
    if(!el.closest('#campaignsView,#campaignWorkspace'))return false;
    const key=norm([el.id,el.name,el.placeholder,el.getAttribute('aria-label'),el.dataset?.field].filter(Boolean).join(' '));
    return /(nome|name)/.test(key)&&/(campanha|campaign)/.test(key);
  }
  function installNameGuards(){
    document.querySelectorAll('#campaignsView input,#campaignWorkspace input').forEach(el=>{if(campaignNameInput(el))el.maxLength=120});
  }
  document.addEventListener('input',e=>{
    const el=e.target;if(!campaignNameInput(el))return;
    el.maxLength=120;
    if(el.value.length>120){el.value=el.value.slice(0,120);window.showToast?.('O nome da campanha pode ter no máximo 120 caracteres.')}
  },true);
  document.addEventListener('blur',e=>{
    const el=e.target;if(!campaignNameInput(el))return;
    const value=String(el.value||'').trim();if(!value)return;
    const brand=activeBrand(),ref=monthRef();
    const dup=campaignRows().find(c=>!c.archivedAt&&norm(c.name)===norm(value)&&(!brand||norm(c.brand)===norm(brand))&&campaignRef(c)===ref);
    if(dup)window.showToast?.('⚠ Já existe campanha com esse nome nesta marca e mês. O cadastro não foi bloqueado.');
  },true);

  function wire(){
    if(wired)return;
    const clients=document.querySelector('.ref2-nav-btn[data-key="clients"]'),autos=document.querySelector('.ref2-nav-btn[data-key="automations"]');
    if(!clients||!autos){setTimeout(wire,100);return}
    wired=true;
    clients.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openClients()},{capture:true});
    autos.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openAutomations()},{capture:true});
    document.querySelectorAll('.ref2-nav-btn:not([data-key="clients"]):not([data-key="automations"])').forEach(b=>b.addEventListener('click',()=>{closeFull();if(b.dataset.key==='reports')setTimeout(enhanceReports,100)},{capture:true}));
    document.getElementById('brandSelect')?.addEventListener('change',()=>{
      refreshConsistency();setTimeout(enhanceReports,80);
      if(document.getElementById('planningView')?.classList.contains('active'))setTimeout(()=>hydrateCanonicalMap(),90);
    });
    document.getElementById('campaignsNav')?.addEventListener('click',()=>setTimeout(refreshConsistency,80));
    document.getElementById('planningNav')?.addEventListener('click',()=>setTimeout(()=>{refreshConsistency();installMapImport();hydrateCanonicalMap()},120));
    document.getElementById('painelNav')?.addEventListener('click',()=>setTimeout(enhanceReports,120));
    new MutationObserver(()=>{installMapImport();installNameGuards()}).observe(document.body,{childList:true,subtree:true});
    refreshConsistency();installMapImport();installNameGuards();
    if(document.getElementById('planningView')?.classList.contains('active'))setTimeout(()=>hydrateCanonicalMap(),180);
    window.addEventListener('allianceos:auth',()=>setTimeout(()=>hydrateCanonicalMap({silent:true}),500));
  }
  window.AllianceOSMapSync={hydrate:hydrateCanonicalMap,queue:queueCanonicalMapSave,save:saveCanonicalMapNow};
  window.AllianceFullSystem={refreshConsistency,enhanceReports,importMap,hydrateCanonicalMap,openClients,openAutomations};
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
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
    try{
      if(window.AllianceOSAuth?.ready)await window.AllianceOSAuth.ready;
      if(window.AllianceOSAuth?.client){
        sb=window.AllianceOSAuth.client;
        return sb;
      }
    }catch(e){console.warn('[AllianceOS planejamento] sessão principal indisponível, usando cliente compatível',e)}
    if(sb)return sb;
    const r=await fetch(CFG,{cache:'no-store'});if(!r.ok)throw new Error('Não foi possível carregar a configuração do AllianceOS.');
    const cfg=await r.json(),mod=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
    sb=mod.createClient(cfg.url,cfg.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return sb;
  }
  const uid=()=>window.user?.id||'vitor-gutierrez';
  const campaignRows=()=>{try{const v=JSON.parse(localStorage.getItem('central.campaigns.vitor-gutierrez')||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
  const activeBrand=()=>{const v=document.getElementById('brandSelect')?.value||'';return !v||/todas/i.test(v)?'':v};
  const monthRef=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
  const validMonthRef=v=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(v||''));
  const planningMonthRef=()=>{
    const live=String(window.AlliancePlanningMonthRef||'');
    if(validMonthRef(live))return live;
    let saved='';
    try{saved=sessionStorage.getItem('allianceos.planning.monthRef')||''}catch{}
    const ref=validMonthRef(saved)?saved:monthRef();
    window.AlliancePlanningMonthRef=ref;
    return ref;
  };
  const setPlanningMonthRef=ref=>{
    const next=validMonthRef(ref)?String(ref):monthRef();
    window.AlliancePlanningMonthRef=next;
    try{sessionStorage.setItem('allianceos.planning.monthRef',next)}catch{}
    window.dispatchEvent(new CustomEvent('allianceos:planning-month',{detail:{monthRef:next}}));
    return next;
  };
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

  const mapLocalKey=(brand,ref=planningMonthRef())=>'central.planning.map.'+uid()+(brand?'.'+brand:'')+'.'+ref;
  const legacyMapLocalKey=brand=>'central.planning.map.'+uid()+(brand?'.'+brand:'');
  function migrateLegacyLocalMap(brand,ref=planningMonthRef()){
    if(ref!==monthRef())return;
    const next=mapLocalKey(brand,ref),legacy=legacyMapLocalKey(brand);
    try{
      if(localStorage.getItem(next)||!localStorage.getItem(legacy))return;
      localStorage.setItem(next,localStorage.getItem(legacy));
    }catch(e){console.warn('[AllianceOS mapa] não foi possível migrar o cache mensal legado',e)}
  }
  async function authReady(){
    try{if(window.AllianceOSAuth?.ready)await window.AllianceOSAuth.ready}catch{}
    return client();
  }
  async function canonicalMapContext(brandName,{createMonth=false,monthRef:requestedRef=planningMonthRef()}={}){
    const brand=String(brandName||activeBrand()||'').trim();
    if(!brand)return null;
    const ref=validMonthRef(requestedRef)?String(requestedRef):planningMonthRef();
    const s=await authReady();
    const {data:brands,error:be}=await s.from('brands').select('id,nome').eq('ativo',true);
    if(be)throw be;
    const br=(brands||[]).find(x=>norm(x.nome)===norm(brand));
    if(!br)throw new Error('Marca não encontrada no AllianceOS: '+brand);
    const [ano,mes]=ref.split('-').map(Number);
    let {data:months,error:me}=await s.from('planning_months')
      .select('*').eq('brand_id',br.id).eq('ano',ano).eq('mes',mes)
      .order('atualizado_em',{ascending:false});
    if(me)throw me;
    let month=(months||[]).find(x=>!x.arquivado_em)||null;
    if(!month&&createMonth){
      const archived=(months||[])[0]||null;
      if(archived){
        const revive=await s.from('planning_months').update({
          arquivado_em:null,arquivado_por:null,atualizado_em:new Date().toISOString(),origem:'interface'
        }).eq('id',archived.id).select('*').single();
        if(revive.error)throw revive.error;
        month=revive.data;
      }else{
        const ins=await s.from('planning_months').insert({
          brand_id:br.id,ano,mes,meta1:0,meta2:0,meta3:0,meta_ativa:1,
          ticket_medio_previsto:0,origem:'interface'
        }).select('*').single();
        if(ins.error)throw ins.error;
        month=ins.data;
      }
    }
    if(!month)return{s,brand:br,month:null,map:null,maps:[],ref};
    const {data:maps,error:mae}=await s.from('planning_maps').select('*')
      .eq('brand_id',br.id).eq('month_id',month.id).is('arquivado_em',null)
      .order('atualizado_em',{ascending:false});
    if(mae)throw mae;
    return{s,brand:br,month,map:maps?.[0]||null,maps:maps||[],ref};
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

  async function hydrateCanonicalMap({silent=false,monthRef:requestedRef=planningMonthRef()}={}){
    const brand=window.MapaMental?.marca?.()||activeBrand();
    if(!brand)return null;
    const ref=validMonthRef(requestedRef)?String(requestedRef):planningMonthRef();
    migrateLegacyLocalMap(brand,ref);
    const seq=++mapHydrateSeq;
    const state=document.getElementById('mindSaveState');
    if(state&&!silent)state.textContent='Sincronizando mapa…';
    try{
      const ctx=await canonicalMapContext(brand,{monthRef:ref});
      if(seq!==mapHydrateSeq)return null;
      if(!ctx?.map){
        if(state&&!silent)state.textContent='Novo planejamento · '+ref;
        window.MapaMental?.recarregar?.();
        refreshPlanningMapControls({exists:false,ref});
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
      localStorage.setItem(mapLocalKey(ctx.brand.nome,ref),JSON.stringify(map));
      window.MapaMental?.recarregar?.();
      if(state&&!silent)state.textContent='Mapa sincronizado · '+ref;
      refreshPlanningMapControls({exists:true,ref,map:ctx.map});
      return map;
    }catch(e){
      console.error('[AllianceOS mapa canônico] falha ao carregar',e);
      if(state&&!silent)state.textContent='Não foi possível sincronizar o mapa';
      return null;
    }
  }

  async function saveCanonicalMapNow(map,brandName,requestedRef=planningMonthRef()){
    if(!map||!Array.isArray(map.nos)||!map.nos.length)return;
    const ref=validMonthRef(requestedRef)?String(requestedRef):planningMonthRef();
    const ctx=await canonicalMapContext(brandName,{createMonth:true,monthRef:ref});
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
    const ref=planningMonthRef(),timerKey=brand+'|'+ref;
    clearTimeout(mapSaveTimers.get(timerKey));
    return new Promise(resolve=>{
      mapSaveTimers.set(timerKey,setTimeout(async()=>{
        mapSaveTimers.delete(timerKey);
        try{await saveCanonicalMapNow(JSON.parse(JSON.stringify(map)),brand,ref)}
        catch(e){console.error('[AllianceOS mapa canônico] falha ao salvar',e);window.showToast?.('Não foi possível sincronizar o mapa com o AllianceOS.')}
        resolve();
      },650));
    });
  }

  function importMap(payload){
    const map=normalizeMap(payload),brand=window.MapaMental?.marca?.()||activeBrand(),ref=planningMonthRef(),key=mapLocalKey(brand,ref);
    localStorage.setItem(key,JSON.stringify(map));window.MapaMental?.recarregar?.();queueCanonicalMapSave(map,brand);
    if(map.avisos?.length){console.warn('[AllianceOS mapa] nós sem campanha:',map.avisos);window.showToast?.(map.avisos.length+' nó(s) ficaram sem vínculo de campanha.')}
    return map;
  }
  function planningMonthLabel(ref=planningMonthRef()){
    if(!validMonthRef(ref))return ref;
    const [y,m]=ref.split('-').map(Number);
    return MONTH_NAMES[m-1].charAt(0)+MONTH_NAMES[m-1].slice(1).toLowerCase()+' de '+y;
  }
  function blankPlanningMap(brand,ref){
    const [,m]=ref.split('-').map(Number);
    return{
      v:2,layout:'direita',prox:2,proxItem:1,itens:[],
      nome:'Planejamento ['+MONTH_NAMES[m-1]+'-'+String(brand||'').toUpperCase()+']',
      nos:[{id:1,pai:null,t:'Planejamento',cor:0,x:4500,y:3000}]
    };
  }
  function ensurePlanningMapStyle(){
    if(document.getElementById('alliance-planning-month-style'))return;
    const st=document.createElement('style');st.id='alliance-planning-month-style';st.textContent=`
      .alliance-planning-month-controls{display:flex;align-items:center;gap:7px;margin-left:2px;padding-left:8px;border-left:1px solid #e4e5e2}
      .alliance-planning-month-controls input[type="month"]{width:142px!important;height:32px!important;padding:0 8px!important;border:1px solid #dfe4e7!important;border-radius:8px!important;background:#fff!important;font:600 11px/1 Inter,system-ui!important;color:#31383e!important}
      .alliance-planning-month-step{width:32px!important;height:32px!important;display:grid!important;place-items:center!important;padding:0!important;border:1px solid #dfe4e7!important;border-radius:8px!important;background:#fff!important;color:#4e5961!important;font:500 19px/1 Inter,system-ui!important;cursor:pointer!important}
      .alliance-planning-new{height:32px!important;padding:0 11px!important;border:1px solid #171b1e!important;border-radius:8px!important;background:#171b1e!important;color:#fff!important;font:650 10.5px/1 Inter,system-ui!important;white-space:nowrap!important}
      .alliance-planning-month-state{max-width:160px;color:#7d878f;font:500 9.5px/1.25 Inter,system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .alliance-planning-create-layer{position:fixed;inset:0;z-index:2147482500;display:grid;place-items:center;padding:24px;font-family:Inter,system-ui,sans-serif}
      .alliance-planning-create-backdrop{position:absolute;inset:0;background:rgba(17,24,39,.38);backdrop-filter:blur(2px)}
      .alliance-planning-create-dialog{position:relative;z-index:1;box-sizing:border-box;width:min(470px,calc(100vw - 32px));padding:0;border:1px solid #dfe5e9;border-radius:17px;background:#fff;box-shadow:0 24px 70px rgba(15,23,42,.18);overflow:hidden}
      .alliance-planning-create-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 20px 15px;border-bottom:1px solid #edf0f2}
      .alliance-planning-create-head small{display:block;margin-bottom:6px;color:#8b959d;font-size:9px;font-weight:700;letter-spacing:.08em}
      .alliance-planning-create-head h3{margin:0;color:#171c20;font-size:20px;line-height:1.15;letter-spacing:-.02em}
      .alliance-planning-create-head p{margin:7px 0 0;color:#75818a;font-size:11.5px;line-height:1.45}
      .alliance-planning-create-head>button{width:32px;height:32px;flex:0 0 32px;padding:0;border:1px solid #dfe5e9;border-radius:9px;background:#fff;color:#65717a;font-size:18px;cursor:pointer}
      .alliance-planning-create-field{display:flex;flex-direction:column;gap:7px;padding:18px 20px;color:#4c5861;font-size:10.5px;font-weight:650}
      .alliance-planning-create-field input{box-sizing:border-box;width:100%;height:44px;padding:0 12px;border:1px solid #dce2e6;border-radius:10px;background:#fff;color:#263139;font:600 13px/1 Inter,system-ui}
      .alliance-planning-create-foot{display:flex;justify-content:flex-end;gap:9px;padding:14px 18px;border-top:1px solid #edf0f2;background:#fbfcfd}
      .alliance-planning-create-foot button{height:38px;padding:0 14px;border-radius:10px;font:650 12px/1 Inter,system-ui;cursor:pointer}
      .alliance-planning-create-foot .secondary{border:1px solid #d9e0e5;background:#fff;color:#53606a}
      .alliance-planning-create-foot .primary{border:1px solid #171c20;background:#171c20;color:#fff}
      .alliance-planning-create-foot .primary:disabled{opacity:.5;cursor:wait}
      @media(max-width:1050px){.alliance-planning-month-controls{flex-wrap:wrap}.alliance-planning-month-state{display:none}}
    `;document.head.appendChild(st);
  }
  function refreshPlanningMapControls(info={}){
    const controls=document.querySelector('.alliance-planning-month-controls');
    if(!controls)return;
    const ref=info.ref||planningMonthRef();
    const input=controls.querySelector('[data-alliance-planning-month]');
    if(input&&input.value!==ref)input.value=ref;
    const state=controls.querySelector('[data-alliance-planning-month-state]');
    if(state){
      if(info.exists===true)state.textContent='Salvo · '+planningMonthLabel(ref);
      else if(info.exists===false)state.textContent='Novo · '+planningMonthLabel(ref);
      else state.textContent=planningMonthLabel(ref);
    }
  }
  async function switchPlanningMonth(ref,{silent=false}={}){
    const next=setPlanningMonthRef(ref);
    const brand=window.MapaMental?.marca?.()||activeBrand();
    if(brand)migrateLegacyLocalMap(brand,next);
    refreshPlanningMapControls({ref:next});
    window.MapaMental?.recarregar?.();
    await hydrateCanonicalMap({silent,monthRef:next});
    refreshConsistency();
    return next;
  }
  function offsetMonthRef(ref,delta=1){
    const base=validMonthRef(ref)?String(ref):monthRef();
    const [y,m]=base.split('-').map(Number);
    const d=new Date(y,m-1+delta,1);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  function closePlanningCreateDialog(){
    document.querySelector('.alliance-planning-create-layer')?.remove();
  }
  function openPlanningCreateDialog(){
    const brand=window.MapaMental?.marca?.()||activeBrand();
    if(!brand){window.showToast?.('Selecione uma marca para criar o planejamento.');return}
    closePlanningCreateDialog();
    const layer=document.createElement('div');
    layer.className='alliance-planning-create-layer';
    const suggested=offsetMonthRef(planningMonthRef(),1);
    layer.innerHTML='<div class="alliance-planning-create-backdrop" data-planning-create-cancel></div>'+
      '<section class="alliance-planning-create-dialog" role="dialog" aria-modal="true" aria-labelledby="alliancePlanningCreateTitle">'+
        '<div class="alliance-planning-create-head"><div><small>NOVO PLANEJAMENTO</small><h3 id="alliancePlanningCreateTitle">Criar mapa mental</h3><p>Escolha qualquer mês. O planejamento atual continuará salvo e poderá ser aberto novamente pelo seletor de mês.</p></div><button type="button" data-planning-create-cancel aria-label="Fechar">×</button></div>'+
        '<label class="alliance-planning-create-field"><span>Mês do planejamento</span><input type="month" data-planning-create-month value="'+esc(suggested)+'"></label>'+
        '<div class="alliance-planning-create-foot"><button type="button" class="secondary" data-planning-create-cancel>Cancelar</button><button type="button" class="primary" data-planning-create-confirm>Criar planejamento</button></div>'+
      '</section>';
    document.body.appendChild(layer);
    const input=layer.querySelector('[data-planning-create-month]');
    const confirm=layer.querySelector('[data-planning-create-confirm]');
    const cancel=()=>closePlanningCreateDialog();
    layer.querySelectorAll('[data-planning-create-cancel]').forEach(x=>x.addEventListener('click',cancel));
    confirm.addEventListener('click',async()=>{
      const ref=String(input?.value||'');
      if(!validMonthRef(ref)){window.showToast?.('Escolha um mês válido.');return}
      confirm.disabled=true;confirm.textContent='Criando…';
      try{
        await createPlanningMapForSelectedMonth(ref);
        closePlanningCreateDialog();
      }finally{
        if(confirm.isConnected){confirm.disabled=false;confirm.textContent='Criar planejamento'}
      }
    });
    input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();confirm.click()}});
    setTimeout(()=>input?.focus(),30);
  }
  async function createPlanningMapForSelectedMonth(requestedRef=planningMonthRef()){
    const brand=window.MapaMental?.marca?.()||activeBrand();
    if(!brand){window.showToast?.('Selecione uma marca para criar o planejamento.');return false}
    const ref=validMonthRef(requestedRef)?String(requestedRef):planningMonthRef();
    setPlanningMonthRef(ref);
    refreshPlanningMapControls({ref});
    const state=document.getElementById('mindSaveState');
    if(state)state.textContent='Preparando '+planningMonthLabel(ref)+'…';
    try{
      const ctx=await canonicalMapContext(brand,{createMonth:true,monthRef:ref});
      if(ctx?.map){
        localStorage.removeItem(mapLocalKey(brand,ref));
        await hydrateCanonicalMap({monthRef:ref});
        window.showToast?.('Já existe um planejamento em '+planningMonthLabel(ref)+'. Ele foi aberto sem alterar o mapa anterior.');
        return true;
      }
      const map=blankPlanningMap(brand,ref);
      localStorage.setItem(mapLocalKey(brand,ref),JSON.stringify(map));
      await saveCanonicalMapNow(map,brand,ref);
      window.MapaMental?.recarregar?.();
      await hydrateCanonicalMap({monthRef:ref});
      refreshPlanningMapControls({exists:true,ref});
      window.showToast?.('Planejamento de '+planningMonthLabel(ref)+' criado. Os outros meses continuam armazenados.');
      return true;
    }catch(e){
      console.error('[AllianceOS mapa mensal] falha ao criar',e);
      if(state)state.textContent='Não foi possível criar o planejamento';
      window.showToast?.('Não foi possível criar o planejamento de '+planningMonthLabel(ref)+'.');
      return false;
    }
  }
  function installPlanningMapControls(){
    const top=document.querySelector('.mp-topo');
    if(!top||top.querySelector('.alliance-planning-month-controls'))return;
    ensurePlanningMapStyle();
    const wrap=document.createElement('div');wrap.className='alliance-planning-month-controls';
    wrap.innerHTML='<button type="button" class="alliance-planning-month-step" data-alliance-planning-prev aria-label="Mês anterior">‹</button><input type="month" data-alliance-planning-month aria-label="Mês do planejamento"><button type="button" class="alliance-planning-month-step" data-alliance-planning-next aria-label="Próximo mês">›</button><button type="button" class="alliance-planning-new" data-alliance-new-planning>+ Novo planejamento</button><span class="alliance-planning-month-state" data-alliance-planning-month-state></span>';
    const input=wrap.querySelector('[data-alliance-planning-month]');
    input.value=planningMonthRef();
    input.addEventListener('change',()=>{if(validMonthRef(input.value))switchPlanningMonth(input.value)});
    wrap.querySelector('[data-alliance-planning-prev]').addEventListener('click',()=>switchPlanningMonth(offsetMonthRef(planningMonthRef(),-1)));
    wrap.querySelector('[data-alliance-planning-next]').addEventListener('click',()=>switchPlanningMonth(offsetMonthRef(planningMonthRef(),1)));
    wrap.querySelector('[data-alliance-new-planning]').addEventListener('click',openPlanningCreateDialog);
    top.appendChild(wrap);
    refreshPlanningMapControls();
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
    document.getElementById('planningNav')?.addEventListener('click',()=>setTimeout(()=>{refreshConsistency();installMapImport();installPlanningMapControls();hydrateCanonicalMap()},120));
    document.getElementById('painelNav')?.addEventListener('click',()=>setTimeout(enhanceReports,120));
    new MutationObserver(()=>{installMapImport();installPlanningMapControls();installNameGuards()}).observe(document.body,{childList:true,subtree:true});
    refreshConsistency();installMapImport();installPlanningMapControls();installNameGuards();
    if(document.getElementById('planningView')?.classList.contains('active'))setTimeout(()=>hydrateCanonicalMap(),180);
    window.addEventListener('allianceos:auth',()=>setTimeout(()=>hydrateCanonicalMap({silent:true}),500));
  }
  window.AllianceOSMapSync={hydrate:hydrateCanonicalMap,queue:queueCanonicalMapSave,save:saveCanonicalMapNow,month:planningMonthRef,switchMonth:switchPlanningMonth,createMonth:createPlanningMapForSelectedMonth};
  window.AllianceFullSystem={refreshConsistency,enhanceReports,importMap,hydrateCanonicalMap,openClients,openAutomations};
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
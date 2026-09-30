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
    let sessionSaved='',persistentSaved='';
    try{sessionSaved=sessionStorage.getItem('allianceos.planning.monthRef')||''}catch{}
    try{persistentSaved=localStorage.getItem('allianceos.planning.monthRef')||''}catch{}
    const ref=validMonthRef(sessionSaved)?sessionSaved:(validMonthRef(persistentSaved)?persistentSaved:monthRef());
    window.AlliancePlanningMonthRef=ref;
    return ref;
  };
  const setPlanningMonthRef=ref=>{
    const next=validMonthRef(ref)?String(ref):monthRef();
    window.AlliancePlanningMonthRef=next;
    try{sessionStorage.setItem('allianceos.planning.monthRef',next)}catch{}
    try{localStorage.setItem('allianceos.planning.monthRef',next)}catch{}
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
    const s=await client(),brand=activeBrand(),ref=planningMonthRef(),parts=ref.split('-').map(Number);
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

  async function refreshPlanningMonthMetrics(requestedRef=planningMonthRef()){
    const ref=validMonthRef(requestedRef)?String(requestedRef):planningMonthRef();
    const brand=window.MapaMental?.marca?.()||activeBrand();
    const publish=metrics=>{
      window.AlliancePlanningMonthMetrics=metrics;
      window.dispatchEvent(new CustomEvent('allianceos:planning-metrics',{detail:metrics||{ref,brand}}));
      return metrics;
    };
    if(!brand)return publish(null);
    try{
      const ctx=await canonicalMapContext(brand,{monthRef:ref});
      if(!ctx?.month)return publish({ref,brand,goal:0,budget:0,active:1,hasPlan:false});
      const active=Math.max(1,Math.min(3,Number(ctx.month.meta_ativa||1)));
      const {data:rows,error}=await ctx.s.from('planning_month_channel_goals')
        .select('channel_slug,meta1,meta2,meta3,investimento_previsto')
        .eq('month_id',ctx.month.id).is('arquivado_em',null);
      if(error)throw error;
      const perChannel1=(rows||[]).reduce((sum,row)=>sum+Number(row.meta1||0),0);
      const perChannel2=(rows||[]).reduce((sum,row)=>sum+Number(row.meta2||0),0);
      const perChannel3=(rows||[]).reduce((sum,row)=>sum+Number(row.meta3||0),0);
      const overall1=Number(ctx.month.meta1||0);
      const overall2=Number(ctx.month.meta2||0);
      const overall3=Number(ctx.month.meta3||0);
      const meta1=perChannel1||overall1;
      const meta2=perChannel2||overall2;
      const meta3=perChannel3||overall3;
      const metas=[meta1,meta2,meta3];
      const goal=metas[active-1]||0;
      const budget=(rows||[]).reduce((sum,row)=>sum+Number(row.investimento_previsto||0),0);
      return publish({
        ref,brand:ctx.brand.nome,goal,budget,active,
        meta1,meta2,meta3,metas,
        overall:goal,overall1,overall2,overall3,
        perChannel:goal,perChannel1,perChannel2,perChannel3,
        hasPlan:true,channelCount:(rows||[]).length
      });
    }catch(e){
      console.warn('[AllianceOS métricas mensais]',e);
      return publish(null);
    }
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
  function ensureLocalMonthMapIsolation(brand,ref){
    if(!brand||!validMonthRef(ref))return false;
    const key=mapLocalKey(brand,ref);
    try{
      if(localStorage.getItem(key))return false;
      // IMPORTANT: local placeholder only. It prevents mapa.js from falling
      // back to the old generic/month-previous cache while canonical data is
      // loading. It is never written to Supabase unless the user actually edits
      // or creates this planning month.
      localStorage.setItem(key,JSON.stringify(blankPlanningMap(brand,ref)));
      return true;
    }catch(e){
      console.warn('[AllianceOS mapa mensal] não foi possível isolar o cache do mês',e);
      return false;
    }
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
      .alliance-planning-goals{height:32px!important;padding:0 11px!important;border:1px solid #d7dde1!important;border-radius:8px!important;background:#fff!important;color:#3e4951!important;font:650 10.5px/1 Inter,system-ui!important;white-space:nowrap!important;cursor:pointer!important}
      .alliance-goals-layer{position:fixed;inset:0;z-index:2147482600;display:grid;place-items:center;padding:24px;font-family:Inter,system-ui,sans-serif}
      .alliance-goals-backdrop{position:absolute;inset:0;background:rgba(17,24,39,.42);backdrop-filter:blur(2px)}
      .alliance-goals-dialog{position:relative;z-index:1;box-sizing:border-box;width:min(980px,calc(100vw - 28px));max-height:calc(100vh - 36px);display:flex;flex-direction:column;border:1px solid #dfe5e9;border-radius:18px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.2);overflow:hidden}
      .alliance-goals-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 22px 16px;border-bottom:1px solid #edf0f2}
      .alliance-goals-head small{display:block;margin-bottom:6px;color:#8b959d;font-size:9px;font-weight:700;letter-spacing:.08em}
      .alliance-goals-head h3{margin:0;color:#171c20;font-size:21px;line-height:1.15;letter-spacing:-.025em}
      .alliance-goals-head p{margin:7px 0 0;color:#75818a;font-size:11.5px;line-height:1.45}
      .alliance-goals-head>button{width:34px;height:34px;flex:0 0 34px;padding:0;border:1px solid #dfe5e9;border-radius:9px;background:#fff;color:#65717a;font-size:18px;cursor:pointer}
      .alliance-goals-body{overflow:auto;padding:18px 22px 22px;background:#fbfcfd}
      .alliance-goals-general{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:18px}
      .alliance-goals-field{display:flex;flex-direction:column;gap:6px;min-width:0}
      .alliance-goals-field span{color:#65717a;font-size:9.5px;font-weight:650}
      .alliance-goals-field input,.alliance-goals-field select{box-sizing:border-box;width:100%;height:40px;padding:0 10px;border:1px solid #dce2e6;border-radius:9px;background:#fff;color:#263139;font:600 11.5px/1 Inter,system-ui}
      .alliance-goals-section{border:1px solid #e1e6e9;border-radius:13px;background:#fff;overflow:hidden}
      .alliance-goals-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid #edf0f2;background:#fafbfc}
      .alliance-goals-section-head b{font-size:12px;color:#293138}
      .alliance-goals-section-head span{font-size:9.5px;color:#8a949b}
      .alliance-goals-channel-add{height:32px;padding:0 10px;border:1px solid #d8dfe3;border-radius:8px;background:#fff;color:#3f4b54;font:650 10px/1 Inter,system-ui;white-space:nowrap;cursor:pointer}
      .alliance-goals-channel-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;padding:11px 14px;border-bottom:1px solid #edf0f2;background:#fff}
      .alliance-goals-channel-form[hidden]{display:none}
      .alliance-goals-channel-form input{box-sizing:border-box;width:100%;height:36px;padding:0 10px;border:1px solid #dce2e6;border-radius:8px;background:#fff;color:#263139;font:600 10.5px/1 Inter,system-ui}
      .alliance-goals-channel-form button{height:36px;padding:0 12px;border:1px solid #171c20;border-radius:8px;background:#171c20;color:#fff;font:650 10.5px/1 Inter,system-ui;cursor:pointer}
      .alliance-goals-channel-form button:disabled{opacity:.5;cursor:wait}
      .alliance-goals-table{width:100%;border-collapse:collapse;table-layout:fixed}
      .alliance-goals-table th,.alliance-goals-table td{padding:9px 10px;border-bottom:1px solid #eef1f3;text-align:left;vertical-align:middle}
      .alliance-goals-table th{background:#fff;color:#89939a;font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;font-weight:700}
      .alliance-goals-table th:not(:first-child){text-align:right}
      .alliance-goals-table td:first-child{width:32%;color:#344049;font-size:10.5px;font-weight:650}
      .alliance-goals-table td:not(:first-child){width:17%}
      .alliance-goals-table input{box-sizing:border-box;width:100%;height:34px;padding:0 8px;border:1px solid #e0e5e8;border-radius:8px;background:#fff;color:#263139;text-align:right;font:600 10.5px/1 Inter,system-ui}
      .alliance-goals-table tbody tr:last-child td{border-bottom:0}
      .alliance-goals-foot{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 18px;border-top:1px solid #edf0f2;background:#fff}
      .alliance-goals-foot-status{min-width:0;color:#7a858d;font-size:10px;line-height:1.35}
      .alliance-goals-foot-actions{display:flex;gap:9px;flex:0 0 auto}
      .alliance-goals-foot button{height:38px;padding:0 14px;border-radius:10px;font:650 11.5px/1 Inter,system-ui;cursor:pointer}
      .alliance-goals-foot .secondary{border:1px solid #d9e0e5;background:#fff;color:#53606a}
      .alliance-goals-foot .primary{border:1px solid #171c20;background:#171c20;color:#fff}
      .alliance-goals-foot .primary:disabled{opacity:.5;cursor:wait}
      @media(max-width:1050px){.alliance-planning-month-controls{flex-wrap:wrap}.alliance-planning-month-state{display:none}.alliance-goals-general{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:700px){.alliance-goals-layer{padding:10px}.alliance-goals-dialog{max-height:calc(100vh - 20px)}.alliance-goals-head,.alliance-goals-body{padding-left:14px;padding-right:14px}.alliance-goals-general{grid-template-columns:1fr}.alliance-goals-table{min-width:760px}.alliance-goals-section{overflow:auto}}
    `;document.head.appendChild(st);
  }
  function syncPlanningMonthChrome(ref=planningMonthRef()){
    if(!validMonthRef(ref))return;
    const label=planningMonthLabel(ref);
    const planMonth=document.getElementById('planMonthLabel');
    const campMonth=document.getElementById('campMonthBtn');
    // IMPORTANT: this function is called from a body MutationObserver.
    // Writing identical textContent recreates text nodes and triggers that
    // observer again forever, freezing Chrome. Only touch the DOM on change.
    if(planMonth&&planMonth.textContent!==label)planMonth.textContent=label;
    if(campMonth&&campMonth.textContent!==label)campMonth.textContent=label;
    const crumb=document.querySelector('#planningView .plan-titlebar p');
    if(crumb){
      const parts=String(crumb.textContent||'').split('/').map(x=>x.trim()).filter(Boolean);
      const prefix=parts.length>1?parts.slice(0,-1).join(' / '):'AllianceOS / Estratégia';
      const next=prefix+' / '+label;
      if(crumb.textContent!==next)crumb.textContent=next;
    }
  }
  function refreshPlanningMapControls(info={}){
    const ref=info.ref||planningMonthRef();
    syncPlanningMonthChrome(ref);
    const controls=document.querySelector('.alliance-planning-month-controls');
    if(!controls)return;
    const input=controls.querySelector('[data-alliance-planning-month]');
    if(input&&input.value!==ref)input.value=ref;
    const state=controls.querySelector('[data-alliance-planning-month-state]');
    if(state){
      const nextState=info.exists===true?'Salvo · '+planningMonthLabel(ref)
        :(info.exists===false?'Novo · '+planningMonthLabel(ref):planningMonthLabel(ref));
      if(state.textContent!==nextState)state.textContent=nextState;
    }
  }
  let planningMonthSwitchSeq=0;
  async function switchPlanningMonth(ref,{silent=false}={}){
    const next=setPlanningMonthRef(ref);
    const seq=++planningMonthSwitchSeq;
    const brand=window.MapaMental?.marca?.()||activeBrand();

    // Change the visual context immediately. Never show September while
    // October is selected just because Supabase is still loading.
    if(brand){
      migrateLegacyLocalMap(brand,next);
      ensureLocalMonthMapIsolation(brand,next);
    }
    refreshPlanningMapControls({ref:next});
    syncPlanningMonthChrome(next);
    document.getElementById('campaignOverviewList')?.classList.remove('hidden');
    document.getElementById('campaignWorkspace')?.classList.remove('active');
    window.MapaMental?.recarregar?.();
    window.dispatchEvent(new CustomEvent('allianceos:planning-month-changing',{detail:{monthRef:next}}));

    // Canonical hydration is deliberately background work. Month navigation
    // must remain usable even on a slow connection. Sequence guards prevent
    // an older request from repainting a newer selected month.
    Promise.resolve().then(async()=>{
      await hydrateCanonicalMap({silent,monthRef:next});
      if(seq!==planningMonthSwitchSeq)return;
      await refreshPlanningMonthMetrics(next);
      if(seq!==planningMonthSwitchSeq)return;
      await refreshConsistency();
      if(seq!==planningMonthSwitchSeq)return;
      refreshPlanningMapControls({ref:next});
      window.dispatchEvent(new CustomEvent('allianceos:planning-month-ready',{detail:{monthRef:next}}));
    }).catch(e=>{
      if(seq!==planningMonthSwitchSeq)return;
      console.warn('[AllianceOS mês] falha ao sincronizar o mês selecionado',e);
      window.dispatchEvent(new CustomEvent('allianceos:planning-month-ready',{detail:{monthRef:next,error:true}}));
    });
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
  function closePlanningGoalsDialog(){
    document.querySelector('.alliance-goals-layer')?.remove();
  }
  function goalsMoneyInput(name,value,extra=''){
    const v=Number(value||0);
    return '<input type="number" min="0" step="0.01" name="'+esc(name)+'" value="'+(v?v:'')+'" placeholder="0" '+extra+'>';
  }
  function planningChannelSlug(name){
    const base=String(name||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72);
    return base||('canal-'+Date.now().toString(36));
  }
  function planningChannelRow(ch,g={}){
    return '<tr data-channel-row data-channel-slug="'+esc(ch.slug)+'"><td>'+esc(ch.nome||ch.slug)+'</td><td>'+goalsMoneyInput('meta1',g.meta1)+'</td><td>'+goalsMoneyInput('meta2',g.meta2)+'</td><td>'+goalsMoneyInput('meta3',g.meta3)+'</td><td>'+goalsMoneyInput('investimento_previsto',g.investimento_previsto)+'</td></tr>';
  }
  function planningGoalsTotals(layer){
    const active=Number(layer.querySelector('[name="meta_ativa"]')?.value||1);
    const rows=[...layer.querySelectorAll('[data-channel-row]')];
    const total=rows.reduce((acc,row)=>{
      const key='meta'+active;
      acc.meta+=Number(row.querySelector('[name="'+key+'"]')?.value||0);
      acc.inv+=Number(row.querySelector('[name="investimento_previsto"]')?.value||0);
      return acc;
    },{meta:0,inv:0});
    const overall=Number(layer.querySelector('[name="meta'+active+'"]')?.value||0);
    const status=layer.querySelector('[data-goals-status]');
    if(status){
      const diff=Math.abs(total.meta-overall);
      status.textContent='Meta '+active+' por canal: '+brl(total.meta)+' · investimento previsto: '+brl(total.inv)+(overall&&diff>.01?' · diferença para a meta geral: '+brl(total.meta-overall):'');
    }
  }
  async function openPlanningGoalsDialog(){
    const brand=window.MapaMental?.marca?.()||activeBrand();
    if(!brand){window.showToast?.('Selecione uma marca para configurar as metas do mês.');return}
    const ref=planningMonthRef();
    closePlanningGoalsDialog();
    ensurePlanningMapStyle();
    const layer=document.createElement('div');layer.className='alliance-goals-layer';
    layer.innerHTML='<div class="alliance-goals-backdrop" data-goals-cancel></div><section class="alliance-goals-dialog" role="dialog" aria-modal="true"><div class="alliance-goals-head"><div><small>PLANEJAMENTO MENSAL</small><h3>Metas de '+esc(planningMonthLabel(ref))+'</h3><p>Meta geral, ticket médio, divisão por canal e investimento esperado. Os dados ficam vinculados a '+esc(brand)+' e a este mês.</p></div><button type="button" data-goals-cancel aria-label="Fechar">×</button></div><div class="alliance-goals-body"><div class="alliance-summary-empty">Carregando metas…</div></div><div class="alliance-goals-foot"><div class="alliance-goals-foot-status" data-goals-status></div><div class="alliance-goals-foot-actions"><button type="button" class="secondary" data-goals-cancel>Cancelar</button><button type="button" class="primary" data-goals-save>Salvar metas</button></div></div></section>';
    document.body.appendChild(layer);
    layer.querySelectorAll('[data-goals-cancel]').forEach(x=>x.addEventListener('click',closePlanningGoalsDialog));
    try{
      const ctx=await canonicalMapContext(brand,{createMonth:true,monthRef:ref});
      if(!ctx?.month)throw new Error('Não foi possível preparar o mês.');
      const [{data:channels,error:ce},{data:goals,error:ge}]=await Promise.all([
        ctx.s.from('alliance_channels').select('slug,nome,ordem,ativo').eq('ativo',true).order('ordem',{ascending:true}),
        ctx.s.from('planning_month_channel_goals').select('*').eq('month_id',ctx.month.id).is('arquivado_em',null)
      ]);
      if(ce)throw ce;if(ge)throw ge;
      const bySlug=new Map((goals||[]).map(g=>[String(g.channel_slug),g]));
      const m=ctx.month;
      layer.querySelector('.alliance-goals-body').innerHTML=
        '<div class="alliance-goals-general">'+
          '<label class="alliance-goals-field"><span>Meta 1</span>'+goalsMoneyInput('meta1',m.meta1)+'</label>'+
          '<label class="alliance-goals-field"><span>Meta 2</span>'+goalsMoneyInput('meta2',m.meta2)+'</label>'+
          '<label class="alliance-goals-field"><span>Meta 3</span>'+goalsMoneyInput('meta3',m.meta3)+'</label>'+
          '<label class="alliance-goals-field"><span>Meta ativa</span><select name="meta_ativa">'+[1,2,3].map(i=>'<option value="'+i+'" '+(Number(m.meta_ativa||1)===i?'selected':'')+'>Meta '+i+'</option>').join('')+'</select></label>'+
          '<label class="alliance-goals-field"><span>Ticket médio previsto</span>'+goalsMoneyInput('ticket_medio_previsto',m.ticket_medio_previsto)+'</label>'+
        '</div>'+
        '<div class="alliance-goals-section"><div class="alliance-goals-section-head"><div><b>Metas por canal</b><span>Defina o faturamento esperado em cada cenário e o investimento do canal.</span></div><button type="button" class="alliance-goals-channel-add" data-goals-add-channel>+ Criar canal</button></div>'+
          '<form class="alliance-goals-channel-form" data-goals-channel-form hidden><input name="channel_name" maxlength="80" placeholder="Ex.: TikTok Shop, Google Ads, Afiliados…" required><button type="submit">Adicionar canal</button></form>'+
          '<table class="alliance-goals-table"><thead><tr><th>Canal</th><th>Meta 1</th><th>Meta 2</th><th>Meta 3</th><th>Investimento previsto</th></tr></thead><tbody data-goals-channel-body>'+
          (channels||[]).map(ch=>planningChannelRow(ch,bySlug.get(String(ch.slug))||{})).join('')+
          '</tbody></table></div>';
      const addChannel=layer.querySelector('[data-goals-add-channel]');
      const channelForm=layer.querySelector('[data-goals-channel-form]');
      const channelBody=layer.querySelector('[data-goals-channel-body]');
      let nextChannelOrder=Math.max(0,...(channels||[]).map(ch=>Number(ch.ordem||0)))+10;
      addChannel?.addEventListener('click',()=>{
        channelForm.hidden=!channelForm.hidden;
        if(!channelForm.hidden)setTimeout(()=>channelForm.querySelector('[name="channel_name"]')?.focus(),20);
      });
      channelForm?.addEventListener('submit',async e=>{
        e.preventDefault();
        const input=channelForm.querySelector('[name="channel_name"]');
        const button=channelForm.querySelector('button[type="submit"]');
        const nome=String(input?.value||'').trim();
        if(!nome){window.showToast?.('Digite o nome do canal.');return}
        const slug=planningChannelSlug(nome);
        button.disabled=true;button.textContent='Adicionando…';
        try{
          const existing=[...layer.querySelectorAll('[data-channel-row]')].find(r=>String(r.dataset.channelSlug||'')===slug);
          if(existing){
            existing.scrollIntoView({behavior:'smooth',block:'center'});
            throw new Error('Esse canal já existe neste planejamento.');
          }
          const ins=await ctx.s.from('alliance_channels').insert({
            slug,nome,ordem:nextChannelOrder,ativo:true,origem:'interface'
          }).select('slug,nome,ordem,ativo').single();
          if(ins.error)throw ins.error;
          nextChannelOrder+=10;
          channelBody?.insertAdjacentHTML('beforeend',planningChannelRow(ins.data||{slug,nome},{}));
          input.value='';
          channelForm.hidden=true;
          planningGoalsTotals(layer);
          window.showToast?.('Canal '+nome+' criado e disponível nos próximos planejamentos.');
        }catch(err){
          console.error('[AllianceOS canais] falha ao criar',err);
          const status=layer.querySelector('[data-goals-status]');
          if(status)status.textContent='Não foi possível criar o canal: '+String(err?.message||err);
        }finally{
          button.disabled=false;button.textContent='Adicionar canal';
        }
      });
      layer.addEventListener('input',()=>planningGoalsTotals(layer));
      layer.addEventListener('change',()=>planningGoalsTotals(layer));
      planningGoalsTotals(layer);
      const save=layer.querySelector('[data-goals-save]');
      save.addEventListener('click',async()=>{
        save.disabled=true;save.textContent='Salvando…';
        try{
          const now=new Date().toISOString();
          const payload={
            meta1:Number(layer.querySelector('.alliance-goals-general [name="meta1"]')?.value||0),
            meta2:Number(layer.querySelector('.alliance-goals-general [name="meta2"]')?.value||0),
            meta3:Number(layer.querySelector('.alliance-goals-general [name="meta3"]')?.value||0),
            meta_ativa:Number(layer.querySelector('.alliance-goals-general [name="meta_ativa"]')?.value||1),
            ticket_medio_previsto:Number(layer.querySelector('.alliance-goals-general [name="ticket_medio_previsto"]')?.value||0),
            atualizado_em:now,origem:'interface'
          };
          const upd=await ctx.s.from('planning_months').update(payload).eq('id',ctx.month.id).select('*').single();
          if(upd.error)throw upd.error;
          const rows=[...layer.querySelectorAll('[data-channel-row]')].map(row=>({
            month_id:ctx.month.id,brand_id:ctx.brand.id,channel_slug:String(row.dataset.channelSlug||''),
            meta1:Number(row.querySelector('[name="meta1"]')?.value||0),
            meta2:Number(row.querySelector('[name="meta2"]')?.value||0),
            meta3:Number(row.querySelector('[name="meta3"]')?.value||0),
            investimento_previsto:Number(row.querySelector('[name="investimento_previsto"]')?.value||0),
            origem:'interface',arquivado_em:null,arquivado_por:null,atualizado_em:now
          }));
          if(rows.length){
            const up=await ctx.s.from('planning_month_channel_goals').upsert(rows,{onConflict:'month_id,channel_slug'});
            if(up.error)throw up.error;
          }
          closePlanningGoalsDialog();
          await refreshPlanningMonthMetrics(ref);
          refreshConsistency();
          window.showToast?.('Metas de '+planningMonthLabel(ref)+' salvas.');
        }catch(e){
          console.error('[AllianceOS metas mensais] falha ao salvar',e);
          const status=layer.querySelector('[data-goals-status]');
          if(status)status.textContent='Não foi possível salvar: '+String(e?.message||e);
          save.disabled=false;save.textContent='Salvar metas';
        }
      });
    }catch(e){
      console.error('[AllianceOS metas mensais] falha ao carregar',e);
      const body=layer.querySelector('.alliance-goals-body');
      if(body)body.innerHTML='<div class="alliance-summary-empty">Não foi possível carregar as metas deste mês.</div>';
      const status=layer.querySelector('[data-goals-status]');
      if(status)status.textContent=String(e?.message||e);
    }
  }

  function closeGlobalPlanningMonthPicker(){
    document.querySelector('.alliance-global-month-layer')?.remove();
  }
  function ensureGlobalPlanningMonthPickerStyle(){
    if(document.getElementById('alliance-global-month-style'))return;
    const st=document.createElement('style');
    st.id='alliance-global-month-style';
    st.textContent=`
      .alliance-global-month-layer{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:22px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .alliance-global-month-backdrop{position:absolute;inset:0;background:rgba(15,18,20,.42);backdrop-filter:blur(3px)}
      .alliance-global-month-dialog{position:relative;width:min(430px,calc(100vw - 28px));background:#fff;border:1px solid #e1e5e8;border-radius:18px;box-shadow:0 24px 80px rgba(18,24,28,.22);overflow:hidden;color:#15191c}
      .alliance-global-month-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 20px 15px}
      .alliance-global-month-head small{display:block;font-size:9px;font-weight:750;letter-spacing:.12em;color:#92999f;margin-bottom:5px}
      .alliance-global-month-head h3{margin:0;font-size:21px;letter-spacing:-.035em}
      .alliance-global-month-head p{margin:6px 0 0;color:#7d858b;font-size:11px;line-height:1.45}
      .alliance-global-month-close{width:32px;height:32px;border:1px solid #e1e5e8;border-radius:9px;background:#fff;cursor:pointer;font-size:20px;line-height:1;color:#50585e}
      .alliance-global-month-body{padding:4px 20px 18px}
      .alliance-global-month-current{padding:11px 12px;border:1px solid #e7eaec;border-radius:11px;background:#fafbfb;margin-bottom:12px}
      .alliance-global-month-current small{display:block;font-size:9px;color:#92999f;margin-bottom:3px}
      .alliance-global-month-current b{font-size:13px}
      .alliance-global-month-field{display:block}
      .alliance-global-month-field>span{display:block;font-size:10px;font-weight:650;margin-bottom:7px}
      .alliance-global-month-field input{width:100%;box-sizing:border-box;height:43px;padding:0 12px;border:1px solid #dfe4e7;border-radius:10px;background:#fff;font:600 12px Inter,system-ui;color:#20262a;outline:none}
      .alliance-global-month-field input:focus{border-color:#15191c;box-shadow:0 0 0 3px rgba(20,25,28,.08)}
      .alliance-global-month-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:12px}
      .alliance-global-month-quick button{height:36px;border:1px solid #e1e5e8;border-radius:9px;background:#fff;font:600 10px Inter,system-ui;color:#454d52;cursor:pointer}
      .alliance-global-month-quick button:hover{background:#f5f7f8;border-color:#cfd5d9}
      .alliance-global-month-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #edf0f2;background:#fafbfb}
      .alliance-global-month-foot button{height:38px;padding:0 15px;border-radius:10px;font:650 10px Inter,system-ui;cursor:pointer}
      .alliance-global-month-foot .secondary{border:1px solid #dfe4e7;background:#fff;color:#454d52}
      .alliance-global-month-foot .primary{border:1px solid #15191c;background:#15191c;color:#fff}
      @media(max-width:560px){.alliance-global-month-quick{grid-template-columns:1fr}.alliance-global-month-dialog{border-radius:15px}}
    `;
    document.head.appendChild(st);
  }
  function openGlobalPlanningMonthPicker(){
    closeGlobalPlanningMonthPicker();
    ensureGlobalPlanningMonthPickerStyle();

    const current=planningMonthRef();
    const previous=offsetMonthRef(current,-1);
    const next=offsetMonthRef(current,1);
    const layer=document.createElement('div');
    layer.className='alliance-global-month-layer';
    layer.innerHTML=
      '<div class="alliance-global-month-backdrop" data-global-month-close></div>'+
      '<section class="alliance-global-month-dialog" role="dialog" aria-modal="true" aria-labelledby="allianceGlobalMonthTitle">'+
        '<div class="alliance-global-month-head"><div><small>PLANEJAMENTO</small><h3 id="allianceGlobalMonthTitle">Mudar mês</h3><p>Escolha o mês que você quer visualizar. Os planejamentos dos outros meses continuam salvos.</p></div><button type="button" class="alliance-global-month-close" data-global-month-close aria-label="Fechar">×</button></div>'+
        '<div class="alliance-global-month-body">'+
          '<div class="alliance-global-month-current"><small>Mês atual</small><b>'+esc(planningMonthLabel(current))+'</b></div>'+
          '<label class="alliance-global-month-field"><span>Escolher mês</span><input type="month" data-global-month-input value="'+esc(current)+'"></label>'+
          '<div class="alliance-global-month-quick">'+
            '<button type="button" data-global-month-ref="'+esc(previous)+'">← '+esc(planningMonthLabel(previous))+'</button>'+
            '<button type="button" data-global-month-ref="'+esc(current)+'">'+esc(planningMonthLabel(current))+'</button>'+
            '<button type="button" data-global-month-ref="'+esc(next)+'">'+esc(planningMonthLabel(next))+' →</button>'+
          '</div>'+
        '</div>'+
        '<div class="alliance-global-month-foot"><button type="button" class="secondary" data-global-month-close>Cancelar</button><button type="button" class="primary" data-global-month-confirm>Abrir mês</button></div>'+
      '</section>';

    document.body.appendChild(layer);
    const input=layer.querySelector('[data-global-month-input]');
    const confirm=layer.querySelector('[data-global-month-confirm]');
    layer.querySelectorAll('[data-global-month-close]').forEach(el=>el.addEventListener('click',closeGlobalPlanningMonthPicker));
    layer.querySelectorAll('[data-global-month-ref]').forEach(el=>el.addEventListener('click',()=>{
      input.value=String(el.dataset.globalMonthRef||current);
    }));
    const apply=()=>{
      const ref=String(input?.value||'');
      if(!validMonthRef(ref)){window.showToast?.('Escolha um mês válido.');return}
      closeGlobalPlanningMonthPicker();
      switchPlanningMonth(ref);
    };
    confirm.addEventListener('click',apply);
    input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply()}});
    layer.addEventListener('keydown',e=>{if(e.key==='Escape')closeGlobalPlanningMonthPicker()});
    setTimeout(()=>input?.focus(),20);
  }
  function wireGlobalPlanningMonthControls(){
    syncPlanningMonthChrome();
    for(const id of ['planMonthLabel','campMonthBtn']){
      const button=document.getElementById(id);
      if(!button||button.dataset.allianceMonthPicker==='1')continue;
      button.dataset.allianceMonthPicker='1';
      button.title='Escolher mês';
      button.addEventListener('click',e=>{
        e.preventDefault();
        e.stopImmediatePropagation();
        openGlobalPlanningMonthPicker();
      },true);
    }
  }

  function installPlanningMapControls(){
    const top=document.querySelector('.mp-topo');
    if(!top||top.querySelector('.alliance-planning-month-controls'))return;
    ensurePlanningMapStyle();
    const wrap=document.createElement('div');wrap.className='alliance-planning-month-controls';
    wrap.innerHTML='<button type="button" class="alliance-planning-month-step" data-alliance-planning-prev aria-label="Mês anterior">‹</button><input type="month" data-alliance-planning-month aria-label="Mês do planejamento"><button type="button" class="alliance-planning-month-step" data-alliance-planning-next aria-label="Próximo mês">›</button><button type="button" class="alliance-planning-goals" data-alliance-planning-goals>Metas do mês</button><button type="button" class="alliance-planning-new" data-alliance-new-planning>+ Novo planejamento</button><span class="alliance-planning-month-state" data-alliance-planning-month-state></span>';
    const input=wrap.querySelector('[data-alliance-planning-month]');
    input.value=planningMonthRef();
    input.addEventListener('change',()=>{if(validMonthRef(input.value))switchPlanningMonth(input.value)});
    wrap.querySelector('[data-alliance-planning-prev]').addEventListener('click',()=>switchPlanningMonth(offsetMonthRef(planningMonthRef(),-1)));
    wrap.querySelector('[data-alliance-planning-next]').addEventListener('click',()=>switchPlanningMonth(offsetMonthRef(planningMonthRef(),1)));
    wrap.querySelector('[data-alliance-planning-goals]').addEventListener('click',openPlanningGoalsDialog);
    wrap.querySelector('[data-alliance-new-planning]').addEventListener('click',openPlanningCreateDialog);
    top.appendChild(wrap);
    refreshPlanningMapControls();
  }

  function persistPlanningMapName(input){
    if(!input?.isConnected)return;
    const brand=window.MapaMental?.marca?.()||activeBrand();
    if(!brand)return;
    const ref=planningMonthRef();
    const key=mapLocalKey(brand,ref);
    let map=null;
    try{map=JSON.parse(localStorage.getItem(key)||'null')}catch{}
    if(!map||!Array.isArray(map.nos)||!map.nos.length)return;
    const value=String(input.value||'').slice(0,200);
    if(map.nome!==value){
      map.nome=value;
      try{localStorage.setItem(key,JSON.stringify(map))}catch{}
    }
    queueCanonicalMapSave(map,brand);
  }

  function installMapNamePersistence(){
    const input=document.querySelector('.mp-topo .mp-nome');
    if(!input)return;
    input.readOnly=false;
    input.disabled=false;
    input.removeAttribute('readonly');
    input.removeAttribute('disabled');
    input.style.setProperty('pointer-events','auto','important');
    input.style.setProperty('cursor','text','important');
    input.setAttribute('title','Clique para renomear este planejamento');
    if(input.dataset.allianceNameSync!=='1'){
      input.dataset.allianceNameSync='1';
      input.addEventListener('pointerdown',e=>e.stopPropagation());
      input.addEventListener('click',e=>e.stopPropagation());
      input.addEventListener('input',()=>persistPlanningMapName(input));
      input.addEventListener('change',()=>persistPlanningMapName(input));
      input.addEventListener('keydown',e=>{
        if(e.key==='Enter'){e.preventDefault();input.blur()}
      });
      input.addEventListener('blur',()=>{
        if(String(input.value||'').trim())return;
        const brand=window.MapaMental?.marca?.()||activeBrand();
        const ref=planningMonthRef();
        const [,m]=ref.split('-').map(Number);
        input.value='Planejamento ['+MONTH_NAMES[m-1]+'-'+String(brand||'').toUpperCase()+']';
        persistPlanningMapName(input);
      });
    }
    const top=input.closest('.mp-topo');
    if(top&&!top.querySelector('[data-alliance-rename-map]')){
      const rename=document.createElement('button');
      rename.type='button';
      rename.dataset.allianceRenameMap='1';
      rename.className='alliance-planning-month-step';
      rename.textContent='✎';
      rename.title='Renomear planejamento';
      rename.setAttribute('aria-label','Renomear planejamento');
      rename.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        input.readOnly=false;input.disabled=false;input.focus();input.select();
      });
      input.insertAdjacentElement('afterend',rename);
    }
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
      refreshConsistency();refreshPlanningMonthMetrics();setTimeout(enhanceReports,80);
      if(document.getElementById('planningView')?.classList.contains('active'))setTimeout(()=>hydrateCanonicalMap(),90);
    });
    document.getElementById('campaignsNav')?.addEventListener('click',()=>setTimeout(()=>{syncPlanningMonthChrome();refreshConsistency();refreshPlanningMonthMetrics()},80));
    document.getElementById('planningNav')?.addEventListener('click',()=>setTimeout(()=>{syncPlanningMonthChrome();refreshConsistency();refreshPlanningMonthMetrics();installMapImport();installPlanningMapControls();installMapNamePersistence();hydrateCanonicalMap()},120));
    document.getElementById('painelNav')?.addEventListener('click',()=>setTimeout(enhanceReports,120));
    window.addEventListener('allianceos:planning-month',e=>{
      const ref=String(e?.detail?.monthRef||planningMonthRef());
      syncPlanningMonthChrome(ref);
      wireGlobalPlanningMonthControls();
    });
    new MutationObserver(()=>{installMapImport();installPlanningMapControls();installMapNamePersistence();wireGlobalPlanningMonthControls();installNameGuards()}).observe(document.body,{childList:true,subtree:true});
    refreshConsistency();refreshPlanningMonthMetrics();installMapImport();installPlanningMapControls();installMapNamePersistence();wireGlobalPlanningMonthControls();installNameGuards();
    if(document.getElementById('planningView')?.classList.contains('active'))setTimeout(()=>hydrateCanonicalMap(),180);
    window.addEventListener('allianceos:auth',()=>setTimeout(()=>hydrateCanonicalMap({silent:true}),500));
  }
  window.AllianceOSMapSync={hydrate:hydrateCanonicalMap,queue:queueCanonicalMapSave,save:saveCanonicalMapNow,month:planningMonthRef,switchMonth:switchPlanningMonth,createMonth:createPlanningMapForSelectedMonth,goals:openPlanningGoalsDialog};
  window.AllianceFullSystem={refreshConsistency,refreshPlanningMonthMetrics,switchPlanningMonth,planningMonthRef,enhanceReports,importMap,hydrateCanonicalMap,openClients,openAutomations};
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
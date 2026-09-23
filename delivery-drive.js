(() => {
  'use strict';
  if (window.AllianceOSDeliveryDrive) return;

  const ROUTE_KEY='central.delivery-drive-routes.v1';
  const DELIVERY_KEY='central.deliveries.workspace.v1';
  const SB_CONFIG_URL='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
  const STORAGE_BUCKET='alliance-deliveries';
  const ROOTS={
    Botanika:{id:'0AFdA5bpyMdo3Uk9PVA',label:'Botanika'},
    VermeFree:{id:'0AJHwaAQvWccYUk9PVA',label:'VermeFree'},
    Revita:{id:'0AFDZM2KaC49hUk9PVA',label:'Revita'}
  };

  const FOLDERS={
    Botanika:{
      month:{id:'1luPBVzilJPbVp9Tv0NwzfO_KqA2qGGkQ',path:'Botanika › 1. Marketing & Campanhas › 04. SET/26'},
      social:{id:'1bqwMjPuBa7M9UKVb7iWFo7O-UH6Fwv_7',path:'Botanika › 4. Social Media'},
      socialVideo:{id:'1ctZnWb28Qw9wJvlbHskZXxFdvVb7CXeD',path:'Botanika › 4. Social Media › Vídeos pra edição'},
      creators:{id:'1cXmgl83kOm_JW1Gk2TRuIdb5czfrzIHt',path:'Botanika › 5. Creators & Parcerias'},
      influencers:{id:'1OMh6JWdj8fM2gEg1Hc6ofyl208gBblJS',path:'Botanika › 5. Creators & Parcerias › 1. Influencers'},
      ugc:{id:'1uIsn-h2_-n6Wp898yl5C5qJnxiB-bM5b',path:'Botanika › 5. Creators & Parcerias › 2. UGC'},
      ugcVideos:{id:'1C-oIbjD69d3XCumIhzSAgtbxBO2DYCbK',path:'Botanika › 5. Creators & Parcerias › 2. UGC › Vídeos'},
      ugcDeliveries:{id:'1FOKNwlX2J-KJLev6zaTFEPiSH7lQMrqd',path:"Botanika › 5. Creators & Parcerias › 2. UGC › Vídeos › UGC's entregas"},
      crm:{id:'1ihjx_LSjMKAIfaDZncLC5Mbl-VjKHXn5',path:'Botanika › 6. CRM & Automação'},
      email:{id:'1ogGieUYwBarz80LFxZlKfnbPWcWnRr2B',path:'Botanika › 6. CRM & Automação › E-mail educacional diário'},
      vip:{id:'1JG25MEpxVcK0sEeqpk9g3D98JFtKKArQ',path:'Botanika › 6. CRM & Automação › Grupo VIP'},
      api:{id:'1soa_FvM50JkQjblT1kayOBKIPsN52H0R',path:'Botanika › 6. CRM & Automação › Atendimento automatizado'},
      alwaysOn:{id:'17A2DTdYIaCl6NTIkHy-N61NNl8J3MXp-',path:'Botanika › 1. Marketing & Campanhas › Funis always-on'}
    },
    VermeFree:{
      month:{id:'1itHkwtC2__tmccE-yXXLPbgjCzKn2r7Y',path:'VermeFree › 1. Marketing & Campanhas › 06. SET/26'},
      marketing:{id:'1ViZKC9ywfpnjpm1nPV8MFrK1PkCK3fmk',path:'VermeFree › 1. Marketing & Campanhas'},
      social:{id:'1tcc2BZdfy21ip2I1bhSgxKvvLh1dcg0Z',path:'VermeFree › 4. Social Media'},
      socialVideo:{id:'1bVD12Nht5ELJ6L5mjelPBOpkLdW8NjqM',path:'VermeFree › 4. Social Media › Vídeos'},
      creators:{id:'1qMePEOJhazn-6AwUVj1MhY8p-VSnxrUd',path:'VermeFree › 5. Creators & Parcerias'},
      influencers:{id:'1jXk2PZ5W9vwxVVtOspLAmRxwZxaVKRzo',path:'VermeFree › 5. Creators & Parcerias › 1. Influencers'},
      ugc:{id:'1CCUdc9lqN2eNbQDAk5Gw2tnRIAaE2Dor',path:'VermeFree › 5. Creators & Parcerias › 2. UGC'},
      ugcMaterial:{id:'1Y5yj7I-RZkoVohbMV6WQ8Knc-P5xHtA1',path:'VermeFree › 5. Creators & Parcerias › 2. UGC › 5. Material'},
      crm:{id:'1F1fvqUk-RxEz3yIWMjWbsXfTN-NLrfwh',path:'VermeFree › 6. CRM & Automação'},
      email:{id:'1Pmnn9FzcTBEUuRktWwHsuNbw9DQHt_s4',path:'VermeFree › 6. CRM & Automação › E-mail Marketing'},
      automation:{id:'1cWsYjA7XQn5KEASBpf74SQPeI7pskNwS',path:'VermeFree › 6. CRM & Automação › Automações'}
    },
    Revita:{
      launch:{id:'1fA9R32vdHvaHe1gVi0dyKjvFMMucibhG',path:'Revita › 1. Marketing & Campanhas › 00. Lançamento Revita Derma'},
      briefing:{id:'1OyH4ppJIdQ_QJl5Qg7JZcqYywdN-taRc',path:'Revita › Lançamento › 00. Briefing & Planejamento'},
      copies:{id:'1GI5qwnwO6ZP_WKyPhASLUbToP6b2v1on',path:'Revita › Lançamento › 01. Copies'},
      copyAds:{id:'1CZqa6jbeDAb8q-zpnTgA12PzfxUsyTHA',path:'Revita › Lançamento › 01. Copies › Anúncios'},
      copyEmail:{id:'17n9JJK3oZQ6KhrjwJL3lZQugriOPc-0O',path:'Revita › Lançamento › 01. Copies › E-mail'},
      copyApi:{id:'1Tcxs-2QVjw1foIUeafoTLwRomuVST0t1',path:'Revita › Lançamento › 01. Copies › WhatsApp API'},
      copyGroups:{id:'1DsjW_-lRY8c5E0IE78bXka_EQePoDwDL',path:'Revita › Lançamento › 01. Copies › Grupos WhatsApp'},
      copyInstagram:{id:'117GRIN6UCyoE0z7lpiwVlP5rdtFk9wzl',path:'Revita › Lançamento › 01. Copies › Instagram & Stories'},
      copyLive:{id:'1bANszqPmtE8MHIZlx_nQUUzxgegC4Gaf',path:'Revita › Lançamento › 01. Copies › Live'},
      creatives:{id:'1isMbvJXsQpBGLyt1LKZbtPBzyAbAaFZN',path:'Revita › Lançamento › 02. Criativos'},
      videos:{id:'1WhiYAwv95Yk_v3DGZd-zKP-Wr_2LH7qL',path:'Revita › Lançamento › 02. Criativos › Vídeos'},
      images:{id:'1bkZvQJlhIc_Jgxo9FN4IKJXcDhXvAOku',path:'Revita › Lançamento › 02. Criativos › Imagens'},
      captureCreative:{id:'1lSQzt6hUePUNGjB_yGHO3qYmmPVieZWq',path:'Revita › Lançamento › 02. Criativos › 01. Captação'},
      site:{id:'1EntI9Y33xoahvCI5owhWpxpfcMU0cTug',path:'Revita › Lançamento › 03. Site & Oferta'},
      traffic:{id:'1mGkK0nJJ8th-YgaFEk3HqmOpUEP-JCHL',path:'Revita › Lançamento › 04. Mídia & Tráfego'},
      creators:{id:'1t7yQiYuvOu5Cei4OVBbxOAvuErIdEA8a',path:'Revita › Lançamento › 05. Creators & Parcerias'},
      creatorContent:{id:'16dQaOe00MQ2qMBYS1WKTRvjv2zUFHVVc',path:'Revita › Lançamento › 05. Creators & Parcerias › Conteúdos'},
      capture:{id:'1djbA4WG_oj2y4PM-zQHHi7Lh-wdS6oI9',path:'Revita › Lançamento › 06. Captação & Comunidade'},
      live:{id:'1sdNUotRi63ir3R3IFQrvYzxlxie4mYST',path:'Revita › Lançamento › 07. Live & Abertura'},
      results:{id:'1lAOn_lFKtVrbJ4wiexodXOlEGhdUWiGM',path:'Revita › Lançamento › 08. Resultados'},
      social:{id:'1oeaWKUqwTGGsJwFpmgTC74mtzluRfnOq',path:'Revita › 4. Social Media'},
      socialVideoSep:{id:'1w8xnNtp2_xzuDomXOGqQ2hEojUVbxYdU',path:'Revita › 4. Social Media › Vídeos para edição › Setembro'},
      ugcVideos:{id:'1s-YOml4atrOyo8_KJhQwjFuXq4hGHPm1',path:'Revita › 5. Creators & Parcerias › 2. UGC › Vídeos'}
    }
  };

  const CAMPAIGNS={
    'camp-1790117072369-7f1ac371':{
      base:{id:'1VJJ9jFYk-Wc657sLkZbSvu-jE3tPzQXo',path:'Botanika › SET/26 › 09-09 — Dia D'},
      briefing:{id:'1ELBDX6gZIAgNWOu1Vh9ruAhUOdnihiOt',path:'Botanika › Dia D › 00. Briefing & Planejamento'},
      copies:{id:'1xae-astDHxQfjwG_hdmgP7loxLKommwQ',path:'Botanika › Dia D › 01. Copies'},
      creatives:{id:'1xnw0pI-FFzYcwF-ZOJ8_BZ0b4FMBzoC_',path:'Botanika › Dia D › 02. Criativos'},
      site:{id:'1loe5mJOFadOqezZMSxiUTVSpfySmLyJ_',path:'Botanika › Dia D › 03. Site & Oferta'},
      traffic:{id:'1FA3H9MaOSsHFCvgdgOGyDKVaIowsIwy_',path:'Botanika › Dia D › 04. Mídia & Tráfego'},
      results:{id:'1tXUMH6SY8l8dgiMTnZL94QkaJzT4bJWz',path:'Botanika › Dia D › 05. Resultados'}
    },
    'camp-1790117111662-cd57f488':{
      base:{id:'1eNfpyPqXgonhKSfnB9KVBzYDqYxOvWZA',path:'Botanika › SET/26 › 14-09 a 19-09 — Semana do Cliente'},
      briefing:{id:'1OPieTawhyAPj4Uk6qvo31T5nqhfiOxAG',path:'Botanika › Semana do Cliente › 00. Briefing & Planejamento'},
      copies:{id:'1taSFWXoK5pptnzIauZ5DQL7VP3sqA_mt',path:'Botanika › Semana do Cliente › 01. Copies'},
      creatives:{id:'1cbiT_9fM7cSYmg5RHpAkj1qg3pazM_7V',path:'Botanika › Semana do Cliente › 02. Criativos'},
      video:{id:'17UTTf7ywGrvGB3rYEJ33M9rlFd9hMR8v',path:'Botanika › Semana do Cliente › 02. Criativos › Vídeos'},
      image:{id:'1TWpW9WyAI-OH0pVbgBNkSVZOau1ilODq',path:'Botanika › Semana do Cliente › 02. Criativos › Imagens'},
      site:{id:'16dA1EIMCCjRU3MsJyn2wAdtgPFcaNg88',path:'Botanika › Semana do Cliente › 03. Site & Oferta'},
      traffic:{id:'1nnhNrJcqb3W1dA6PzVh2niNoAVLXeZDY',path:'Botanika › Semana do Cliente › 04. Mídia & Tráfego'},
      results:{id:'1AFHeOlbBcAjbLibt93SqJBREAue4L3kK',path:'Botanika › Semana do Cliente › 05. Resultados'}
    },
    'camp-1790116113473-6f73ab71':{
      base:{id:'1pLZHEOWTcIi8HklqvXlvO0_XlKsLSjgk',path:'VermeFree › SET/26 › 09-09 — Dia D'}
    },
    'camp-1790116116725-545ec9ad':{
      base:{id:'1lCaSAgBca5vtH2Od801UW03PTM9ToX2d',path:'VermeFree › SET/26 › 14-09 a 19-09 — Semana do Cliente + Lua Nova'},
      briefing:{id:'1j0KxXwVKo_24n0SfbMWSK7M8zJ_wIz0K',path:'VermeFree › Semana do Cliente + Lua Nova › 00. Briefing & Planejamento'},
      copies:{id:'16WGN_yvzOgAIU1oxzfLs99ayOGlcQP6K',path:'VermeFree › Semana do Cliente + Lua Nova › 01. Copies'},
      creatives:{id:'1aX9hCEx2tzbgs36RY8q23Aw5Q5c9R8c9',path:'VermeFree › Semana do Cliente + Lua Nova › 02. Criativos'},
      site:{id:'1c1am4JrD2rtxpfRHS_W-k84G97DAVvJV',path:'VermeFree › Semana do Cliente + Lua Nova › 03. Site & Oferta'},
      traffic:{id:'1035T9gaL2wGbcbcOmGwKvFJI--P6y6Sc',path:'VermeFree › Semana do Cliente + Lua Nova › 04. Mídia & Tráfego'},
      results:{id:'14oYV1jK3wUI9igS4IGUsadtx6ngVnW7m',path:'VermeFree › Semana do Cliente + Lua Nova › 05. Resultados'}
    },
    'camp-1790116120574-73152ac3':{
      base:{id:'1Zq-t7KrQiVFQaaQCIYPngR5mzaNEQWik',path:'VermeFree › SET/26 › 26-09 a 30-09 — Dia D Kids'},
      briefing:{id:'1y6xQiCLdMZKLNfNUYZQWt8tErCoLr6w2',path:'VermeFree › Dia D Kids › 00. Briefing & Planejamento'},
      copies:{id:'1iEoHCbribfWwd4NGg6nPNHX-CIMR3VuV',path:'VermeFree › Dia D Kids › 01. Copies'},
      creatives:{id:'1D_fCUgdjjzI_ilVTDOa6nwFrUDeSsoTJ',path:'VermeFree › Dia D Kids › 02. Criativos'},
      video:{id:'1J8WTFsQg-SW2htJi8dvWjpUcczPI_afl',path:'VermeFree › Dia D Kids › 02. Criativos › Vídeos'},
      image:{id:'1neTrb9ZLMSUU8Czn4UECZM2ibzy0ZHow',path:'VermeFree › Dia D Kids › 02. Criativos › Imagens'},
      site:{id:'147FBQ_5LNhltsy-HsRct86cUVbDx_9Mk',path:'VermeFree › Dia D Kids › 03. Site & Oferta'},
      traffic:{id:'1aDIuzT_LQd-1qSmHLEyNoSxyTPAd42Me',path:'VermeFree › Dia D Kids › 04. Mídia & Tráfego'},
      results:{id:'1X4k_Tz3cxBsqSGFM6FDdjkRudmfHsYCU',path:'VermeFree › Dia D Kids › 05. Resultados'}
    },
    'camp-1790116124099-32de9782':{
      base:FOLDERS.Revita.launch,
      briefing:FOLDERS.Revita.briefing,
      copies:FOLDERS.Revita.copies,
      video:FOLDERS.Revita.videos,
      image:FOLDERS.Revita.images,
      creatives:FOLDERS.Revita.creatives,
      site:FOLDERS.Revita.site,
      traffic:FOLDERS.Revita.traffic,
      creators:FOLDERS.Revita.creators,
      capture:FOLDERS.Revita.capture,
      live:FOLDERS.Revita.live,
      results:FOLDERS.Revita.results
    }
  };

  let cfgCache=null;

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function norm(value){
    return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }
  function authToken(){
    try{
      const raw=localStorage.getItem('sb-lpnyrzsdiyzjnhovpduk-auth-token');
      if(!raw)return '';
      const parsed=JSON.parse(raw);
      return parsed && (parsed.access_token || (parsed.currentSession && parsed.currentSession.access_token)) || '';
    }catch{return ''}
  }
  function currentUserId(){
    const direct=(window.AllianceOSSession&&window.AllianceOSSession.user&&window.AllianceOSSession.user.id)||(window.user&&window.user.id);
    if(direct)return String(direct);
    try{
      const token=authToken(),part=token.split('.')[1]||'',normalized=part.replace(/-/g,'+').replace(/_/g,'/');
      const padded=normalized+'='.repeat((4-normalized.length%4)%4);
      const payload=JSON.parse(atob(padded));
      if(payload?.sub)return String(payload.sub);
    }catch{}
    return 'user';
  }
  function readRoutes(){
    try{
      const value=JSON.parse(localStorage.getItem(ROUTE_KEY)||'{}');
      if(Array.isArray(value))return {version:1,learned:value};
      return value && typeof value==='object' ? {version:value.version||1,learned:Array.isArray(value.learned)?value.learned:[]} : {version:1,learned:[]};
    }catch{return {version:1,learned:[]}}
  }
  async function saveLearned(route){
    const state=readRoutes();
    const list=state.learned.filter(function(x){return x && x.key!==route.key});
    list.unshift(route);
    state.learned=list.slice(0,300);
    localStorage.setItem(ROUTE_KEY,JSON.stringify(state));
    try{
      if(window.AllianceOSStateSync && window.AllianceOSStateSync.save)await window.AllianceOSStateSync.save(ROUTE_KEY,state);
    }catch(e){console.warn('[Drive entregas] rota salva só localmente',e)}
  }
  function campaignRows(){
    try{
      const rows=JSON.parse(localStorage.getItem('central.campaigns.vitor-gutierrez')||'[]');
      return Array.isArray(rows)?rows:[];
    }catch{return[]}
  }
  function campaignForTask(task){
    if(!task)return null;
    const rows=campaignRows();
    const byId=rows.find(function(c){return String(c && c.id || '')===String(task.campaignId||'') && !c.archivedAt});
    if(byId)return byId;
    const target=norm(task.project||'');
    return rows.find(function(c){return !c.archivedAt && norm(c.brand)===norm(task.brand) && (norm(c.name)===target || target.indexOf(norm(c.name))>=0)})||null;
  }
  function textFor(ctx){
    const task=ctx.task||{};
    const campaign=ctx.campaign||campaignForTask(task)||{};
    const files=Array.isArray(ctx.files)?ctx.files:[];
    return norm([task.title,task.description,task.project,campaign.name,ctx.title,ctx.note].filter(Boolean).join(' ')+' '+files.map(function(f){return f.name+' '+f.type}).join(' '));
  }
  function detectKind(ctx){
    const text=textFor(ctx);
    const files=Array.isArray(ctx.files)?ctx.files:[];
    const hasVideo=files.some(function(f){return /^video\//i.test(f.type||'') || /\.(mp4|mov|m4v|avi|webm)$/i.test(f.name||'')});
    const hasImage=files.some(function(f){return /^image\//i.test(f.type||'') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name||'')});
    if(/resultado|relatorio|roas|performance|dashboard/.test(text))return 'results';
    if(/briefing|planejamento|estrategia|cronograma/.test(text))return 'briefing';
    if(/checkout|landing|pagina de venda|pagina|site|oferta/.test(text))return 'site';
    if(/trafego|midia|media buyer|campanha de anuncios|gerenciador|publico|bm\b/.test(text) && !/copy|texto|roteiro/.test(text))return 'traffic';
    if(/creator|criador|ugc|influencer|parceria/.test(text))return 'creators';
    if(/captacao|lead|lista|comunidade/.test(text))return 'capture';
    if(/\blive\b|abertura/.test(text))return 'live';
    if(/copy|copies|texto|email|e-mail|whatsapp|grupo vip|instagram|story|stories|roteiro/.test(text)){
      if(/anuncio|ads|trafego/.test(text))return 'copy_ads';
      if(/whatsapp api|\bapi\b/.test(text))return 'copy_api';
      if(/grupo|vip/.test(text))return 'copy_groups';
      if(/email|e-mail/.test(text))return 'copy_email';
      if(/instagram|story|stories/.test(text))return 'copy_instagram';
      if(/\blive\b/.test(text))return 'copy_live';
      return 'copies';
    }
    if(hasVideo || /\bvideo\b|editar video|edicao/.test(text))return 'video';
    if(hasImage || /imagem|banner|design|criativo estatico|carrossel/.test(text))return 'image';
    if(/criativo|creative/.test(text))return 'creatives';
    return 'general';
  }
  function learnedKey(task,campaign,kind){
    if(campaign && campaign.id)return 'campaign:'+String(campaign.id)+':'+kind;
    if(task && task.campaignId)return 'campaign:'+String(task.campaignId)+':'+kind;
    return 'brand:'+String(task && task.brand || '')+':'+kind;
  }
  function exactCampaignFolder(campaign,kind){
    if(!campaign)return null;
    const map=CAMPAIGNS[String(campaign.id||'')];
    if(!map)return null;
    if(map[kind])return map[kind];
    if((kind==='video'||kind==='image') && map.creatives)return map.creatives;
    if(/^copy_/.test(kind) && map.copies)return map.copies;
    return map.base||null;
  }
  function revitaSpecial(kind,text){
    const r=FOLDERS.Revita;
    if(kind==='copy_ads')return r.copyAds;
    if(kind==='copy_api')return r.copyApi;
    if(kind==='copy_groups')return r.copyGroups;
    if(kind==='copy_email')return r.copyEmail;
    if(kind==='copy_instagram')return r.copyInstagram;
    if(kind==='copy_live')return r.copyLive;
    if(kind==='video'){
      if(/ugc|creator/.test(text))return r.ugcVideos;
      if(/social|instagram/.test(text) && !/lancamento/.test(text))return r.socialVideoSep;
      return r.videos;
    }
    if(kind==='image')return r.images;
    if(kind==='creators')return r.creatorContent;
    if(kind==='capture')return r.capture;
    if(kind==='site')return r.site;
    if(kind==='traffic')return r.traffic;
    if(kind==='live')return r.live;
    if(kind==='results')return r.results;
    if(kind==='briefing')return r.briefing;
    if(/^copy_/.test(kind)||kind==='copies')return r.copies;
    return r.launch;
  }
  function brandFallback(brand,kind,text,campaign){
    const b=FOLDERS[brand];
    if(!b)return ROOTS[brand]?{id:ROOTS[brand].id,path:ROOTS[brand].label}:null;
    if(brand==='Revita')return revitaSpecial(kind,text);
    if(kind==='creators'){
      if(/ugc/.test(text))return b.ugcMaterial||b.ugcVideos||b.ugc;
      if(/influencer/.test(text))return b.influencers||b.creators;
      return b.creators;
    }
    if(kind==='video'){
      if(/ugc/.test(text))return b.ugcVideos||b.ugcMaterial||b.ugc;
      return b.socialVideo||b.social;
    }
    if(kind==='image'||kind==='creatives')return b.social||b.month||b.marketing;
    if(kind==='copy_email')return b.email||b.crm;
    if(kind==='copy_api')return b.api||b.automation||b.crm;
    if(kind==='copy_groups')return b.vip||b.crm;
    if(kind==='copies')return b.month||b.marketing||b.crm;
    if(kind==='traffic'||kind==='site'||kind==='results'||kind==='briefing')return b.month||b.marketing;
    if(campaign && /perpetuo/i.test(campaign.type||'')){
      const name=norm(campaign.name||'');
      if(name.indexOf('instagram')>=0)return b.social||b.month;
      if(name.indexOf('influencer')>=0)return b.influencers||b.creators;
      if(name.indexOf('email')>=0)return b.email||b.crm;
      if(name.indexOf('api')>=0)return b.api||b.automation||b.crm;
      if(name.indexOf('grupo vip')>=0)return b.vip||b.crm;
      if(name.indexOf('trafego')>=0)return b.alwaysOn||b.marketing||b.month;
    }
    return b.month||b.marketing||b.social||b.creators||b.crm||null;
  }
  function suggest(ctx){
    const task=ctx.task||{};
    const campaign=ctx.campaign||campaignForTask(task);
    const kind=detectKind(Object.assign({},ctx,{campaign:campaign}));
    const key=learnedKey(task,campaign,kind);
    const learned=readRoutes().learned.find(function(x){return x && x.key===key && x.folderId});
    if(learned)return {folderId:learned.folderId,path:learned.path||learned.folderName||'Pasta escolhida anteriormente',source:'Pasta usada anteriormente',kind:kind,key:key,campaign:campaign};
    const exact=exactCampaignFolder(campaign,kind);
    if(exact)return {folderId:exact.id,path:exact.path,source:'Sugerido pela campanha',kind:kind,key:key,campaign:campaign};
    const text=textFor(Object.assign({},ctx,{campaign:campaign}));
    const fallback=brandFallback(String(task.brand||ctx.brand||campaign&&campaign.brand||''),kind,text,campaign);
    if(fallback)return {folderId:fallback.id,path:fallback.path,source:campaign?'Sugerido pelo tipo da tarefa':'Sugerido pela marca',kind:kind,key:key,campaign:campaign};
    const root=ROOTS[String(task.brand||ctx.brand||'')];
    return root?{folderId:root.id,path:root.label,source:'Pasta raiz da marca',kind:kind,key:key,campaign:campaign}:null;
  }

  function ensureModal(){
    let modal=document.getElementById('alliance-drive-destination-modal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='alliance-drive-destination-modal';
    modal.className='alliance-drive-modal';
    modal.innerHTML=
      '<div class="alliance-drive-backdrop" data-drive-cancel></div>'+
      '<section class="alliance-drive-dialog" role="dialog" aria-modal="true" aria-labelledby="allianceDriveTitle">'+
        '<header><div><span class="alliance-drive-kicker">GOOGLE DRIVE</span><h2 id="allianceDriveTitle">Confirmar destino da entrega</h2><p>Confira onde os arquivos serão salvos. Se estiver errado, escolha outra pasta.</p></div><button type="button" class="alliance-drive-close" data-drive-cancel aria-label="Fechar">×</button></header>'+
        '<div class="alliance-drive-body">'+
          '<div class="alliance-drive-files" data-drive-files></div>'+
          '<div class="alliance-drive-destination">'+
            '<div class="alliance-drive-dest-head"><span>Destino no Drive</span><em data-drive-source></em></div>'+
            '<div class="alliance-drive-path"><span class="alliance-drive-folder-icon">▰</span><strong data-drive-path>Escolher pasta</strong></div>'+
            '<button type="button" class="alliance-drive-change" data-drive-change>Alterar pasta</button>'+
          '</div>'+
          '<div class="alliance-drive-browser" data-drive-browser hidden>'+
            '<div class="alliance-drive-browser-head"><div data-drive-crumbs></div><button type="button" data-drive-select-current>Selecionar esta pasta</button></div>'+
            '<div class="alliance-drive-browser-list" data-drive-list></div>'+
          '</div>'+
          '<label class="alliance-drive-remember"><input type="checkbox" data-drive-remember checked><span><b>Usar esta pasta nas próximas entregas semelhantes</b><small>O AllianceOS lembra por campanha e tipo de material. Você pode mudar novamente quando quiser.</small></span></label>'+
          '<div class="alliance-drive-error" data-drive-error hidden></div>'+
        '</div>'+
        '<footer><button type="button" class="alliance-drive-secondary" data-drive-cancel>Cancelar</button><button type="button" class="alliance-drive-primary" data-drive-confirm>Confirmar destino</button></footer>'+
      '</section>';
    document.body.appendChild(modal);
    return modal;
  }
  function fileSummary(files,links){
    const rows=[];
    (files||[]).slice(0,4).forEach(function(f){rows.push('<span><b>'+esc(f.name)+'</b><small>'+Math.max(1,Math.round((Number(f.size)||0)/1024))+' KB</small></span>')});
    (links||[]).slice(0,2).forEach(function(l){rows.push('<span><b>'+esc(l.label||'Link')+'</b><small>link</small></span>')});
    if((files||[]).length+(links||[]).length>6)rows.push('<span><b>+'+(((files||[]).length+(links||[]).length)-6)+' itens</b><small>na mesma entrega</small></span>');
    return rows.join('')||'<span><b>Entrega sem arquivo</b><small>O destino ainda ficará registrado.</small></span>';
  }
  async function driveList(brand,folderId){
    const token=authToken();
    if(!token)throw new Error('Sua sessão expirou. Entre novamente no AllianceOS.');
    const u=new URL('/api/drive',location.origin);
    u.searchParams.set('marca',brand);
    if(folderId)u.searchParams.set('pasta',folderId);
    const res=await fetch(u.toString(),{cache:'no-store',headers:{Authorization:'Bearer '+token}});
    const data=await res.json().catch(function(){return{}});
    if(!res.ok||data.erro)throw new Error(data.erro||('Drive respondeu '+res.status));
    if(data.ligado===false)throw new Error(data.erro||'O Drive desta marca ainda não está ligado.');
    return data;
  }
  async function renderBrowser(modal,state,folderId){
    const list=modal.querySelector('[data-drive-list]');
    const crumbs=modal.querySelector('[data-drive-crumbs]');
    list.innerHTML='<div class="alliance-drive-loading"><span></span>Carregando pastas…</div>';
    const data=await driveList(state.brand,folderId);
    state.currentFolder=data.pasta;
    state.currentTrail=[{id:data.raiz,nome:state.brand}].concat((data.trilha||[]).filter(function(x){return x.id!==data.raiz}));
    crumbs.innerHTML=state.currentTrail.map(function(x,i){return '<button type="button" data-drive-crumb="'+esc(x.id)+'">'+esc(x.nome)+(i<state.currentTrail.length-1?' ›':'')+'</button>'}).join('');
    crumbs.querySelectorAll('[data-drive-crumb]').forEach(function(btn){btn.addEventListener('click',function(){renderBrowser(modal,state,btn.dataset.driveCrumb).catch(function(e){showModalError(modal,e.message)})})});
    const folders=(data.arquivos||[]).filter(function(x){return x.pasta});
    list.innerHTML=folders.length?folders.map(function(x){
      return '<button type="button" class="alliance-drive-folder-row" data-drive-open-folder="'+esc(x.id)+'"><span>▰</span><b>'+esc(x.nome)+'</b><i>›</i></button>';
    }).join(''):'<div class="alliance-drive-empty">Nenhuma subpasta aqui. Você pode selecionar esta pasta.</div>';
    list.querySelectorAll('[data-drive-open-folder]').forEach(function(btn){btn.addEventListener('click',function(){renderBrowser(modal,state,btn.dataset.driveOpenFolder).catch(function(e){showModalError(modal,e.message)})})});
  }
  function showModalError(modal,message){
    const box=modal.querySelector('[data-drive-error]');
    box.hidden=false;
    box.textContent=String(message||'Não foi possível acessar o Drive.');
  }
  function setDestination(modal,state,destination){
    state.destination=destination;
    modal.querySelector('[data-drive-path]').textContent=destination && destination.path || 'Escolher pasta';
    modal.querySelector('[data-drive-source]').textContent=destination && destination.source || '';
    modal.querySelector('[data-drive-confirm]').disabled=!(destination&&destination.folderId);
  }
  function confirm(ctx){
    return new Promise(function(resolve){
      const task=ctx.task||{};
      const brand=String(task.brand||ctx.brand||'');
      const suggestion=suggest(ctx);
      const modal=ensureModal();
      const state={brand:brand,ctx:ctx,destination:suggestion,currentFolder:null,currentTrail:[]};
      modal.querySelector('[data-drive-files]').innerHTML=fileSummary(ctx.files||[],ctx.links||[]);
      modal.querySelector('[data-drive-browser]').hidden=true;
      modal.querySelector('[data-drive-error]').hidden=true;
      modal.querySelector('[data-drive-remember]').checked=true;
      setDestination(modal,state,suggestion);
      modal.classList.add('open');

      function done(result){
        modal.classList.remove('open');
        cleanup();
        resolve(result);
      }
      function cleanup(){
        modal.querySelectorAll('[data-drive-cancel]').forEach(function(x){x.removeEventListener('click',onCancel)});
        modal.querySelector('[data-drive-change]').removeEventListener('click',onChange);
        modal.querySelector('[data-drive-select-current]').removeEventListener('click',onSelectCurrent);
        modal.querySelector('[data-drive-confirm]').removeEventListener('click',onConfirm);
      }
      function onCancel(){done({cancelled:true})}
      function onChange(){
        const browser=modal.querySelector('[data-drive-browser]');
        browser.hidden=false;
        const start=(state.destination&&state.destination.folderId) || (ROOTS[brand]&&ROOTS[brand].id) || '';
        renderBrowser(modal,state,start).catch(function(e){showModalError(modal,e.message)});
      }
      function onSelectCurrent(){
        if(!state.currentFolder)return;
        const path=state.currentTrail.map(function(x){return x.nome}).join(' › ');
        setDestination(modal,state,{folderId:state.currentFolder,path:path,source:'Escolhido por você',kind:suggestion&&suggestion.kind||detectKind(ctx),key:suggestion&&suggestion.key||learnedKey(task,campaignForTask(task),detectKind(ctx))});
        modal.querySelector('[data-drive-browser]').hidden=true;
      }
      async function onConfirm(){
        const dest=state.destination;
        if(!dest||!dest.folderId)return;
        const remember=modal.querySelector('[data-drive-remember]').checked;
        if(remember){
          const key=dest.key || suggestion && suggestion.key || learnedKey(task,campaignForTask(task),dest.kind||detectKind(ctx));
          await saveLearned({key:key,brand:brand,campaignId:task.campaignId||null,kind:dest.kind||suggestion&&suggestion.kind||detectKind(ctx),folderId:dest.folderId,path:dest.path,updatedAt:new Date().toISOString(),source:'manual'});
        }
        done({cancelled:false,destination:{folderId:dest.folderId,path:dest.path,source:dest.source||'Confirmado',kind:dest.kind||suggestion&&suggestion.kind||detectKind(ctx),folderLink:'https://drive.google.com/drive/folders/'+dest.folderId}});
      }
      modal.querySelectorAll('[data-drive-cancel]').forEach(function(x){x.addEventListener('click',onCancel)});
      modal.querySelector('[data-drive-change]').addEventListener('click',onChange);
      modal.querySelector('[data-drive-select-current]').addEventListener('click',onSelectCurrent);
      modal.querySelector('[data-drive-confirm]').addEventListener('click',onConfirm);
    });
  }

  async function sbConfig(){
    if(cfgCache)return cfgCache;
    const r=await fetch(SB_CONFIG_URL,{cache:'no-store'});
    if(!r.ok)throw new Error('Não foi possível preparar o upload.');
    cfgCache=await r.json();
    return cfgCache;
  }
  function b64(value){
    return btoa(unescape(encodeURIComponent(String(value))));
  }
  function safeName(name){
    return String(name||'arquivo').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,180)||'arquivo';
  }
  async function tusUpload(file,deliveryId,index,onProgress){
    const cfg=await sbConfig();
    const token=authToken();
    if(!token)throw new Error('Sua sessão expirou.');
    const userId=currentUserId();
    const objectPath=userId+'/'+safeName(deliveryId)+'/'+String(index+1).padStart(2,'0')+'-'+safeName(file.name);
    const endpoint=cfg.url+'/storage/v1/upload/resumable';
    const metadata=[
      'bucketName '+b64(STORAGE_BUCKET),
      'objectName '+b64(objectPath),
      'contentType '+b64(file.type||'application/octet-stream'),
      'cacheControl '+b64('3600')
    ].join(',');
    const created=await fetch(endpoint,{
      method:'POST',
      headers:{
        Authorization:'Bearer '+token,
        apikey:cfg.anon,
        'Tus-Resumable':'1.0.0',
        'Upload-Length':String(file.size),
        'Upload-Metadata':metadata,
        'x-upsert':'false'
      }
    });
    if(!created.ok){
      const msg=await created.text().catch(function(){return''});
      throw new Error('Não foi possível preparar "'+file.name+'" no armazenamento temporário. '+msg.slice(0,140));
    }
    const locationHeader=created.headers.get('Location');
    if(!locationHeader)throw new Error('O servidor não retornou a sessão de upload.');
    const uploadUrl=new URL(locationHeader,endpoint).toString();
    const chunkSize=6*1024*1024;
    let offset=0;
    while(offset<file.size){
      const end=Math.min(file.size,offset+chunkSize);
      const chunk=file.slice(offset,end);
      const patched=await fetch(uploadUrl,{
        method:'PATCH',
        headers:{
          Authorization:'Bearer '+token,
          apikey:cfg.anon,
          'Tus-Resumable':'1.0.0',
          'Upload-Offset':String(offset),
          'Content-Type':'application/offset+octet-stream'
        },
        body:chunk
      });
      if(!patched.ok){
        const msg=await patched.text().catch(function(){return''});
        throw new Error('Falha ao enviar "'+file.name+'". '+msg.slice(0,140));
      }
      offset=Number(patched.headers.get('Upload-Offset')||end);
      if(onProgress)onProgress(Math.min(1,offset/file.size));
    }
    return {path:objectPath,bucket:STORAGE_BUCKET,name:file.name,type:file.type||'application/octet-stream',size:file.size};
  }
  async function copyStorageToDrive(staged,destination,brand,uploadId){
    const token=authToken();
    const res=await fetch('/api/drive',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
      body:JSON.stringify({
        action:'copy_storage',
        marca:brand,
        pasta:destination.folderId,
        bucket:staged.bucket,
        path:staged.path,
        name:staged.name,
        mime_type:staged.type,
        size:staged.size,
        upload_id:uploadId
      })
    });
    const data=await res.json().catch(function(){return{}});
    if(!res.ok||data.erro)throw new Error(data.erro||'Não foi possível copiar o arquivo para o Google Drive.');
    return {
      id:data.arquivo&&data.arquivo.id || uploadId,
      name:data.arquivo&&data.arquivo.nome || staged.name,
      type:data.arquivo&&data.arquivo.tipo || staged.type,
      size:Number(data.arquivo&&data.arquivo.tamanho || staged.size || 0),
      driveFileId:data.arquivo&&data.arquivo.id || null,
      driveLink:data.arquivo&&data.arquivo.link || null,
      driveFolderId:destination.folderId,
      source:'google-drive'
    };
  }
  function ensureProgress(){
    let el=document.getElementById('alliance-drive-progress');
    if(el)return el;
    el=document.createElement('div');
    el.id='alliance-drive-progress';
    el.className='alliance-drive-progress';
    el.innerHTML='<div><span class="alliance-drive-progress-icon">▰</span><section><b data-progress-title>Salvando no Google Drive…</b><p data-progress-copy>Preparando arquivos</p><i><em data-progress-bar></em></i></section></div>';
    document.body.appendChild(el);
    return el;
  }
  function progress(title,copy,ratio){
    const el=ensureProgress();
    el.classList.add('open');
    el.querySelector('[data-progress-title]').textContent=title||'Salvando no Google Drive…';
    el.querySelector('[data-progress-copy]').textContent=copy||'';
    el.querySelector('[data-progress-bar]').style.width=Math.max(2,Math.round((ratio||0)*100))+'%';
  }
  function closeProgress(){
    document.getElementById('alliance-drive-progress')?.classList.remove('open');
  }
  async function confirmAndUpload(ctx){
    const chosen=await confirm(ctx);
    if(chosen.cancelled)return chosen;
    const files=Array.isArray(ctx.files)?ctx.files:[];
    if(!files.length)return {cancelled:false,destination:chosen.destination,files:[]};
    const out=[];
    try{
      for(let i=0;i<files.length;i++){
        const f=files[i];
        if(Number(f.size||0)>250*1024*1024)throw new Error('"'+f.name+'" ultrapassa o limite de 250 MB por arquivo desta integração.');
        progress('Salvando no Google Drive…','Enviando '+f.name+' ('+(i+1)+' de '+files.length+')',i/files.length);
        const staged=await tusUpload(f,ctx.deliveryId||('delivery-'+Date.now()),i,function(r){
          progress('Salvando no Google Drive…','Enviando '+f.name+' · '+Math.round(r*100)+'%',(i+r)/files.length);
        });
        progress('Salvando no Google Drive…','Movendo '+f.name+' para '+chosen.destination.path,(i+.85)/files.length);
        const saved=await copyStorageToDrive(staged,chosen.destination,String(ctx.task&&ctx.task.brand||ctx.brand||''),(ctx.deliveryId||'delivery')+'-'+i);
        out.push(saved);
      }
      progress('Salvo no Google Drive','Tudo certo. A entrega está na pasta confirmada.',1);
      setTimeout(closeProgress,900);
      return {cancelled:false,destination:chosen.destination,files:out};
    }catch(e){
      closeProgress();
      throw e;
    }
  }

  function currentDelivery(){
    const active=document.querySelector('.delivery-row.active[data-delivery-id]');
    if(!active)return null;
    try{
      const rows=JSON.parse(localStorage.getItem(DELIVERY_KEY)||'[]');
      return (Array.isArray(rows)?rows:[]).find(function(d){return String(d.id)===String(active.dataset.deliveryId)})||null;
    }catch{return null}
  }
  function augmentPreview(){
    const box=document.getElementById('deliveryPreview');
    if(!box)return;
    box.querySelector('[data-alliance-drive-delivery]')?.remove();
    const d=currentDelivery();
    if(!d||!d.drive||!d.drive.folderId)return;
    const section=document.createElement('section');
    section.className='delivery-detail-section alliance-drive-delivery-detail';
    section.dataset.allianceDriveDelivery='1';
    section.innerHTML='<h3>Google Drive</h3><div class="alliance-drive-saved"><span>✓</span><div><b>Sincronizado com Drive</b><small>'+esc(d.drive.path||'Pasta da entrega')+'</small></div><a href="'+esc(d.drive.folderLink||('https://drive.google.com/drive/folders/'+d.drive.folderId))+'" target="_blank" rel="noopener">Abrir pasta</a></div>';
    const history=box.querySelector('.delivery-detail-section:nth-last-of-type(1)');
    const actions=box.querySelector('.delivery-actions');
    if(actions)box.insertBefore(section,actions);else box.appendChild(section);
  }

  document.addEventListener('click',function(e){
    const row=e.target.closest && e.target.closest('[data-delivery-id]');
    if(row)setTimeout(augmentPreview,20);
    const open=e.target.closest && e.target.closest('[data-open-del-file]');
    if(open){
      const d=currentDelivery();
      const f=d && (d.files||[]).find(function(x){return String(x.id)===String(open.dataset.openDelFile)});
      if(f&&f.driveLink){
        e.preventDefault();
        e.stopImmediatePropagation();
        window.open(f.driveLink,'_blank','noopener');
      }
    }
  },true);
  const preview=document.getElementById('deliveryPreview');
  if(preview)new MutationObserver(function(){queueMicrotask(augmentPreview)}).observe(preview,{childList:true,subtree:false});

  window.AllianceOSDeliveryDrive={
    suggest:suggest,
    confirm:confirm,
    confirmAndUpload:confirmAndUpload,
    refreshPreview:augmentPreview
  };
})();
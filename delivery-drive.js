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
      management:{id:'1CocM3uc_Nap-nDLv_-y_JyojMMw85fQa',path:'Botanika › 0. Gestão & Operação'},
      marketing:{id:'1DckM0534ncvPja57bUnWjnauw1JJ6mbk',path:'Botanika › 1. Marketing & Campanhas'},
      products:{id:'1HKfoYYPMvZI4xZjaQ-Hg6-m870Dkli0M',path:'Botanika › 2. Produtos'},
      cx:{id:'1KTbMsPl3X7h9b33T85a87EW4be1-Fzsj',path:'Botanika › 3. Atendimento & CX'},
      technology:{id:'1yOAFxwZf2op5xM9sLdIJ8jYOhUZJ7Zaz',path:'Botanika › 8. Tecnologia'},
      brandAssets:{id:'1jm6Z6GB39ztYbmGr_uflqktvADYLv9Jh',path:'Botanika › 9. Marca & Assets'},
      archive:{id:'1R1U0KnZrXrfNBzOtIg469WnGWZZ6Ttb7',path:'Botanika › 99. Arquivo & Legado'},
      month:{id:'1luPBVzilJPbVp9Tv0NwzfO_KqA2qGGkQ',path:'Botanika › 1. Marketing & Campanhas › 04. SET/26'},
      social:{id:'1bqwMjPuBa7M9UKVb7iWFo7O-UH6Fwv_7',path:'Botanika › 4. Social Media'},
      socialVideo:{id:'1ctZnWb28Qw9wJvlbHskZXxFdvVb7CXeD',path:'Botanika › 4. Social Media › Vídeos pra edição'},
      creators:{id:'1cXmgl83kOm_JW1Gk2TRuIdb5czfrzIHt',path:'Botanika › 5. Creators & Parcerias'},
      influencers:{id:'1OMh6JWdj8fM2gEg1Hc6ofyl208gBblJS',path:'Botanika › 5. Creators & Parcerias › 1. Influencers'},
      ugc:{id:'1uIsn-h2_-n6Wp898yl5C5qJnxiB-bM5b',path:'Botanika › 5. Creators & Parcerias › 2. UGC'},
      ugcVideos:{id:'1C-oIbjD69d3XCumIhzSAgtbxBO2DYCbK',path:'Botanika › 5. Creators & Parcerias › 2. UGC › Vídeos'},
      ugcDeliveries:{id:'1FOKNwlX2J-KJLev6zaTFEPiSH7lQMrqd',path:"Botanika › 5. Creators & Parcerias › 2. UGC › Vídeos › UGC's entregas"},
      crm:{id:'1ihjx_LSjMKAIfaDZncLC5Mbl-VjKHXn5',path:'Botanika › 6. CRM & Automação'},
      postPurchase:{id:'1ecJPJI8ZmpjZ6wh3prVhTI67KuRSnNK0',path:'Botanika › 6. CRM & Automação › Pesquisa pós-compra'},
      tracking:{id:'1rLhSV_ezyV5kWQrRyb4JT8UjzHLTnkW2',path:'Botanika › 6. CRM & Automação › Status do pedido & Rastreio'},
      trackingApi:{id:'1N1KqDbLx-UKLiYrDyieC_P7dyXTcx2rQ',path:'Botanika › 6. CRM & Automação › Status do pedido & Rastreio › WhatsApp API - Pedido a caminho'},
      email:{id:'1ogGieUYwBarz80LFxZlKfnbPWcWnRr2B',path:'Botanika › 6. CRM & Automação › E-mail educacional diário'},
      vip:{id:'1JG25MEpxVcK0sEeqpk9g3D98JFtKKArQ',path:'Botanika › 6. CRM & Automação › Grupo VIP'},
      api:{id:'1soa_FvM50JkQjblT1kayOBKIPsN52H0R',path:'Botanika › 6. CRM & Automação › Atendimento automatizado'},
      alwaysOn:{id:'17A2DTdYIaCl6NTIkHy-N61NNl8J3MXp-',path:'Botanika › 1. Marketing & Campanhas › Funis always-on'}
    },
    VermeFree:{
      management:{id:'1TBShD_IaBYDvl55LQs5mqShKxEY27hIX',path:'VermeFree › 0. Gestão & Operação'},
      products:{id:'1i8yXwhU62ux6mqEINnbHyNxtXLkZspSL',path:'VermeFree › 2. Produtos'},
      cx:{id:'1Z6AIHVhhpwO4V41-BWFCkqyMcUYPzIjP',path:'VermeFree › 3. Atendimento & CX'},
      references:{id:'1EdMiwhKmX9iij05VzDlK3s66vxd-INBz',path:'VermeFree › 7. Referências & Inspirações'},
      brandAssets:{id:'1WGgBkGh8rQX4u6WfgGdlknu1eg9mm0vp',path:'VermeFree › 9. Marca & Assets'},
      archive:{id:'1rxlpJKPHoL9ZOo5YhHb1PRV8rCk7wKuu',path:'VermeFree › 99. Arquivo & Legado'},
      vsl:{id:'1hrCOyLTtqeujN4T_ecWZkdRj5iUPDk9J',path:'VermeFree › VSL'},
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
      management:{id:'15kTaOw8aJtDxOtiV-Shk1NrKliGbCPXL',path:'Revita › 0. Gestão & Operação'},
      marketing:{id:'1uw_gOsed3DrWdh-LjrupeR9AB05TFk32',path:'Revita › 1. Marketing & Campanhas'},
      products:{id:'1RNFCuPdopkGPHvS8DeiJrlWyHjSBNszz',path:'Revita › 2. Produtos'},
      cx:{id:'1COG8uDyS_aU_as5grVxQAI8ylTAyxNIr',path:'Revita › 3. Atendimento & CX'},
      crm:{id:'14DqVVBbd_6Ju-X3Dmn2k6_1kOuXstVPp',path:'Revita › 6. CRM & Automação'},
      references:{id:'1vKqmjgc7YKXZgBG0HPTatjhvf8o5XnSI',path:'Revita › 7. Referências & Inspirações'},
      technology:{id:'1qAdGbuKRh_S2nH1tUxP6PFom-gI7PBts',path:'Revita › 8. Tecnologia'},
      brandAssets:{id:'1RtqhIxDGQEXuYkk2duvXY9fWrPfhGgsm',path:'Revita › 9. Marca & Assets'},
      archive:{id:'1LAk_Hf5szOVEgDTUlqr3Ifcg0ZAY7AUo',path:'Revita › 99. Arquivo & Legado'},
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
    const directoryLists=Array.isArray(window.AllianceOSDirectory?.lists)?window.AllianceOSDirectory.lists:[];
    const linkedList=directoryLists.find(function(l){
      return task.listId && String(l?.id||'')===String(task.listId);
    })||null;
    const campaignId=task.campaignId||linkedList?.campanha_id||'';
    const byId=rows.find(function(c){return String(c&&c.id||'')===String(campaignId) && !c.archivedAt});
    if(byId)return byId;
    const targets=[task.project,linkedList?.nome].map(norm).filter(Boolean);
    const matched=rows.find(function(c){
      if(c.archivedAt||norm(c.brand)!==norm(task.brand))return false;
      const name=norm(c.name);
      return targets.some(function(target){return name===target||target.indexOf(name)>=0||name.indexOf(target)>=0});
    })||null;
    if(matched)return matched;
    if(linkedList?.nome){
      return {
        id:linkedList.campanha_id||('list:'+String(linkedList.id||'')),
        name:linkedList.nome,
        brand:task.brand||linkedList.marca||'',
        type:linkedList.campanha_id?'campanha':'lista',
        _fromList:true
      };
    }
    return null;
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
        '<header><div><span class="alliance-drive-kicker">ENTREGA</span><h2 id="allianceDriveTitle">Enviar entrega</h2><p>Confira quem vai receber e onde os arquivos serão salvos antes de concluir.</p></div><button type="button" class="alliance-drive-close" data-drive-cancel aria-label="Fechar">×</button></header>'+
        '<div class="alliance-drive-body">'+
          '<div class="alliance-drive-files" data-drive-files></div>'+
          '<div class="alliance-drive-recipient" data-drive-recipient hidden>'+
            '<div class="alliance-drive-dest-head"><span>Quem recebe</span><em data-drive-recipient-source></em></div>'+
            '<div class="alliance-drive-recipient-row">'+
              '<span class="alliance-drive-recipient-avatar" data-drive-recipient-avatar>?</span>'+
              '<div class="alliance-drive-recipient-copy"><strong data-drive-recipient-name>Escolher destinatário</strong><small data-drive-recipient-task>Selecione quem deve receber o contexto desta entrega.</small></div>'+
              '<div class="alliance-drive-recipient-picker">'+
                '<button type="button" class="alliance-drive-recipient-toggle" data-drive-recipient-toggle><span data-drive-recipient-toggle-label>Escolher pessoa</span><i>⌄</i></button>'+
                '<div class="alliance-drive-recipient-menu" data-drive-recipient-menu hidden></div>'+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div class="alliance-drive-destination">'+
            '<div class="alliance-drive-dest-head"><span>Destino no Drive</span><em data-drive-source></em></div>'+
            '<div class="alliance-drive-path"><span class="alliance-drive-folder-icon">▰</span><strong data-drive-path>Escolher pasta</strong></div>'+
            '<button type="button" class="alliance-drive-change" data-drive-change>Alterar pasta</button>'+
          '</div>'+
          '<div class="alliance-drive-browser" data-drive-browser hidden>'+
            '<div class="alliance-drive-browser-head"><div data-drive-crumbs></div><button type="button" data-drive-select-current>Usar pasta selecionada</button></div>'+
            '<div class="alliance-drive-browser-search" data-drive-browser-search hidden><span>⌕</span><input type="search" data-drive-folder-search placeholder="Buscar pasta…" autocomplete="off"></div>'+
            '<div class="alliance-drive-browser-list" data-drive-list></div>'+
            '<div class="alliance-drive-browser-note" data-drive-browser-note hidden></div>'+
          '</div>'+
          '<label class="alliance-drive-remember"><input type="checkbox" data-drive-remember checked><span><b>Usar esta pasta nas próximas entregas semelhantes</b><small>O AllianceOS lembra por campanha e tipo de material. Você pode mudar novamente quando quiser.</small></span></label>'+
          '<div class="alliance-drive-error" data-drive-error hidden></div>'+
        '</div>'+
        '<footer><button type="button" class="alliance-drive-secondary" data-drive-cancel>Cancelar</button><button type="button" class="alliance-drive-primary" data-drive-confirm>Confirmar destino</button></footer>'+
      '</section>';
    document.body.appendChild(modal);
    return modal;
  }
  function prettySize(size){
    const n=Number(size||0);
    if(n>=1024*1024)return (n/1024/1024).toFixed(n>=10*1024*1024?0:1).replace('.',',')+' MB';
    return Math.max(1,Math.round(n/1024))+' KB';
  }
  function fileSummary(files,links){
    const rows=[];
    (files||[]).slice(0,4).forEach(function(f){
      rows.push('<article class="alliance-drive-file-summary"><span class="alliance-drive-file-summary-icon">▤</span><div><b>'+esc(f.name)+'</b><small>'+prettySize(f.size)+' · arquivo pronto para enviar</small></div></article>');
    });
    (links||[]).slice(0,2).forEach(function(l){
      rows.push('<article class="alliance-drive-file-summary"><span class="alliance-drive-file-summary-icon">↗</span><div><b>'+esc(l.label||'Link da entrega')+'</b><small>Link incluído na entrega</small></div></article>');
    });
    if((files||[]).length+(links||[]).length>6)rows.push('<article class="alliance-drive-file-summary compact"><div><b>+'+(((files||[]).length+(links||[]).length)-6)+' itens</b><small>na mesma entrega</small></div></article>');
    return rows.join('')||'<article class="alliance-drive-file-summary empty"><div><b>Entrega sem arquivo</b><small>O destino continuará registrado no histórico.</small></div></article>';
  }
  async function driveList(brand,folderId){
    const token=authToken();
    if(!token)throw new Error('Sua sessão expirou. Entre novamente no AllianceOS.');
    const u=new URL('/api/drive',location.origin);
    u.searchParams.set('marca',brand);
    if(folderId)u.searchParams.set('pasta',folderId);
    const res=await fetch(u.toString(),{cache:'no-store',headers:{Authorization:'Bearer '+token}});
    const data=await res.json().catch(function(){return{}});
    if(!res.ok){
      const e=new Error(data.erro||('Drive respondeu '+res.status));
      e.status=res.status;
      throw e;
    }
    if(data.ligado===false){
      const e=new Error(data.erro||'O Drive desta marca ainda não está ligado.');
      e.semChave=!!data.semChave;
      e.semAcesso=!!data.semAcesso;
      e.driveUnavailable=true;
      throw e;
    }
    if(data.erro){
      const e=new Error(data.erro);
      e.semChave=!!data.semChave;
      e.semAcesso=!!data.semAcesso;
      throw e;
    }
    return data;
  }

  function folderWords(value){
    const stop=new Set(['a','o','as','os','de','da','do','das','dos','e','em','para','com','campanha','campanhas','setembro','outubro','novembro','dezembro','janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','botanika','vermefree','revita','derma']);
    return norm(value).replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(function(x){return x.length>1&&!stop.has(x)&&!/^\d+$/.test(x)});
  }
  function folderMatchScore(folderName,targetName){
    const folder=norm(folderName),target=norm(targetName);
    if(!folder||!target)return 0;
    if(folder===target)return 100;
    if(folder.indexOf(target)>=0||target.indexOf(folder)>=0)return 92;
    const targetWords=folderWords(target),folderSet=new Set(folderWords(folder));
    if(!targetWords.length)return 0;
    const matched=targetWords.filter(function(w){return folderSet.has(w)}).length;
    const ratio=matched/targetWords.length;
    return ratio>=.75?80+Math.round(ratio*10):ratio>=.5?60:0;
  }
  function trailPath(brand,data,childName){
    const names=(data&&Array.isArray(data.trilha)?data.trilha:[]).map(function(x){return String(x&&x.nome||'').trim()}).filter(Boolean);
    if(!names.length||norm(names[0])!==norm(brand))names.unshift(brand);
    if(childName&&norm(names[names.length-1])!==norm(childName))names.push(childName);
    return names.join(' › ');
  }
  function bestFolderMatch(data,targetName){
    const folders=(data&&Array.isArray(data.arquivos)?data.arquivos:[]).filter(function(x){return x&&x.pasta});
    return folders.map(function(folder){return {folder:folder,score:folderMatchScore(folder.nome,targetName)}})
      .sort(function(a,b){return b.score-a.score})[0]||null;
  }
  async function findCampaignBaseOnDrive(brand,campaign){
    if(!brand||!campaign?.name)return null;
    const known=FOLDERS[brand]||{};
    const seeds=[];
    const addSeed=function(folder){
      if(folder&&folder.id&&!seeds.some(function(x){return String(x.id)===String(folder.id)}))seeds.push(folder);
    };
    if(campaign._fromList)addSeed(known.crm);
    if(/perpetuo|always|funil/i.test(String(campaign.type||'')))addSeed(known.alwaysOn);
    addSeed(known.month);
    addSeed(known.alwaysOn);
    addSeed(known.marketing);
    addSeed(known.launch);
    for(const seed of seeds){
      if(folderMatchScore(seed.path||'',campaign.name)>=90)return {id:seed.id,path:seed.path,name:campaign.name};
      try{
        const data=await driveList(brand,seed.id);
        const best=bestFolderMatch(data,campaign.name);
        if(best&&best.score>=60)return {id:best.folder.id,path:trailPath(brand,data,best.folder.nome),name:best.folder.nome};
      }catch(e){console.warn('[Drive entregas] busca de campanha em '+String(seed.path||seed.id),e)}
    }
    const root=ROOTS[brand];
    if(!root)return null;
    try{
      const rootData=await driveList(brand,root.id);
      const marketing=(rootData.arquivos||[]).filter(function(x){return x&&x.pasta}).find(function(x){
        const n=norm(x.nome);return n.indexOf('marketing')>=0&&n.indexOf('campanh')>=0;
      });
      if(!marketing)return null;
      const marketingData=await driveList(brand,marketing.id);
      const direct=bestFolderMatch(marketingData,campaign.name);
      if(direct&&direct.score>=60)return {id:direct.folder.id,path:trailPath(brand,marketingData,direct.folder.nome),name:direct.folder.nome};
      const containers=(marketingData.arquivos||[]).filter(function(x){
        if(!x||!x.pasta)return false;
        const n=norm(x.nome);
        return /\b(set|out|nov|dez|jan|fev|mar|abr|mai|jun|jul|ago)\b/.test(n)||/always|funil|lancamento|2026|26/.test(n);
      }).slice(0,12);
      for(const container of containers){
        try{
          const data=await driveList(brand,container.id);
          const best=bestFolderMatch(data,campaign.name);
          if(best&&best.score>=60)return {id:best.folder.id,path:trailPath(brand,data,best.folder.nome),name:best.folder.nome};
        }catch{}
      }
    }catch(e){console.warn('[Drive entregas] busca dinâmica da campanha falhou',e)}
    return null;
  }
  function kindKeywords(kind){
    if(kind==='briefing')return ['briefing','planejamento'];
    if(/^copy_/.test(kind)||kind==='copies')return ['copies','copy'];
    if(kind==='video'||kind==='image'||kind==='creatives')return ['criativos','creative'];
    if(kind==='site')return ['site','oferta'];
    if(kind==='traffic')return ['midia','trafego'];
    if(kind==='results')return ['resultados','resultado'];
    if(kind==='creators')return ['creators','parcerias','creator'];
    if(kind==='capture')return ['captacao','comunidade'];
    if(kind==='live')return ['live','abertura'];
    return [];
  }
  function keywordFolder(data,keywords){
    const folders=(data&&Array.isArray(data.arquivos)?data.arquivos:[]).filter(function(x){return x&&x.pasta});
    let best=null,bestScore=0;
    folders.forEach(function(folder){
      const n=norm(folder.nome);
      keywords.forEach(function(k,index){
        const key=norm(k);
        if(n===key||n.indexOf(key)>=0){
          const score=(n===key?100:85)-index;
          if(score>bestScore){best=folder;bestScore=score}
        }
      });
    });
    return best;
  }
  async function findKindFolderOnDrive(brand,base,kind){
    if(!base||!base.id||kind==='general')return base;
    let data;
    try{data=await driveList(brand,base.id)}catch{return base}
    const top=keywordFolder(data,kindKeywords(kind));
    if(!top)return base;
    let selected={id:top.id,path:trailPath(brand,data,top.nome),name:top.nome};
    if(kind==='video'||kind==='image'){
      try{
        const nested=await driveList(brand,top.id);
        const child=keywordFolder(nested,kind==='video'?['videos','video']:['imagens','imagem']);
        if(child)selected={id:child.id,path:trailPath(brand,nested,child.nome),name:child.nome};
      }catch{}
    }else if(/^copy_/.test(kind)){
      const map={
        copy_ads:['anuncios','ads'],
        copy_email:['e-mail','email'],
        copy_api:['whatsapp api','api'],
        copy_groups:['grupos whatsapp','grupos','grupo'],
        copy_instagram:['instagram','stories'],
        copy_live:['live']
      };
      try{
        const nested=await driveList(brand,top.id);
        const child=keywordFolder(nested,map[kind]||[]);
        if(child)selected={id:child.id,path:trailPath(brand,nested,child.nome),name:child.nome};
      }catch{}
    }
    return selected;
  }
  function operationalListDestination(ctx,campaign,kind){
    if(!campaign?._fromList)return null;
    const task=ctx.task||{};
    const brand=String(task.brand||ctx.brand||campaign.brand||'');
    const folders=FOLDERS[brand]||{};
    const listText=norm(campaign.name||'');
    const taskText=norm([task.title,task.description,ctx.note].filter(Boolean).join(' '));
    if(brand==='Botanika'&&(/pos compra|rastreio/.test(listText))){
      if(/rastreio|status|pedido|notific|tracking|caminho/.test(taskText) && folders.tracking){
        return {folderId:folders.tracking.id,path:folders.tracking.path,source:'Sugerido pela lista',kind:kind,key:learnedKey(task,campaign,kind),campaign:campaign,dynamic:true};
      }
      if(/pesquisa|feedback|nps|avaliacao|questionario/.test(taskText) && folders.postPurchase){
        return {folderId:folders.postPurchase.id,path:folders.postPurchase.path,source:'Sugerido pela lista',kind:kind,key:learnedKey(task,campaign,kind),campaign:campaign,dynamic:true};
      }
    }
    return null;
  }
  async function resolveCampaignDestination(ctx,initial){
    const task=ctx.task||{};
    const campaign=initial?.campaign||ctx.campaign||campaignForTask(task);
    if(!campaign)return initial;
    if(initial&&['Pasta usada anteriormente','Sugerido pela campanha','Sugerido pela lista'].includes(initial.source))return initial;
    const kind=initial?.kind||detectKind(Object.assign({},ctx,{campaign:campaign}));
    const operational=operationalListDestination(ctx,campaign,kind);
    if(operational)return operational;
    const brand=String(task.brand||ctx.brand||campaign.brand||'');
    const base=await findCampaignBaseOnDrive(brand,campaign);
    if(!base)return null;
    const folder=await findKindFolderOnDrive(brand,base,kind);
    return {
      folderId:folder.id,
      path:folder.path,
      source:campaign._fromList?'Sugerido pela lista':'Sugerido pela campanha',
      kind:kind,
      key:initial?.key||learnedKey(task,campaign,kind),
      campaign:campaign,
      dynamic:true
    };
  }
  function knownFoldersForBrand(brand,state){
    const map=new Map();
    const add=function(folder){
      if(!folder||!folder.id)return;
      const path=String(folder.path||folder.label||'').trim();
      if(!path||norm(path).indexOf(norm(brand))!==0)return;
      map.set(String(folder.id),{id:String(folder.id),path:path});
    };
    if(ROOTS[brand])add({id:ROOTS[brand].id,path:ROOTS[brand].label});
    Object.values(FOLDERS[brand]||{}).forEach(add);
    Object.values(CAMPAIGNS||{}).forEach(function(group){Object.values(group||{}).forEach(add)});
    readRoutes().learned.filter(function(x){return norm(x&&x.brand)===norm(brand)}).forEach(function(x){add({id:x.folderId,path:x.path||x.folderName})});
    if(state&&state.destination)add({id:state.destination.folderId,path:state.destination.path});
    return Array.from(map.values()).sort(function(a,b){
      const da=a.path.split('›').length,db=b.path.split('›').length;
      return da-db||a.path.localeCompare(b.path,'pt-BR');
    });
  }
  function buildKnownTree(brand,state){
    const root={name:brand,path:brand,id:ROOTS[brand]&&ROOTS[brand].id||null,children:[],depth:0};
    const byPath=new Map([[norm(brand),root]]);
    knownFoldersForBrand(brand,state).forEach(function(folder){
      const parts=String(folder.path||'').split('›').map(function(v){return v.trim()}).filter(Boolean);
      if(!parts.length)return;
      if(norm(parts[0])!==norm(brand))parts.unshift(brand);
      let parent=root;
      const trail=[brand];
      for(let i=1;i<parts.length;i++){
        trail.push(parts[i]);
        const path=trail.join(' › ');
        const key=norm(path);
        let node=byPath.get(key);
        if(!node){
          node={name:parts[i],path:path,id:null,children:[],depth:i};
          byPath.set(key,node);
          parent.children.push(node);
        }
        parent=node;
      }
      if(parent)parent.id=String(folder.id||parent.id||'')||null;
    });
    const sort=function(node){
      node.children.sort(function(a,b){return a.name.localeCompare(b.name,'pt-BR',{numeric:true,sensitivity:'base'})});
      node.children.forEach(sort);
    };
    sort(root);
    return root;
  }
  function treeHasMatch(node,q){
    if(!q)return true;
    if(norm(node.name).indexOf(q)>=0||norm(node.path).indexOf(q)>=0)return true;
    return node.children.some(function(child){return treeHasMatch(child,q)});
  }
  function treeAncestors(path){
    const parts=String(path||'').split('›').map(function(v){return v.trim()}).filter(Boolean);
    const out=[];
    for(let i=1;i<=parts.length;i++)out.push(norm(parts.slice(0,i).join(' › ')));
    return out;
  }
  function renderKnownBrowser(modal,state,query){
    state.browserFallback=true;
    if(!(state.treeExpanded instanceof Set))state.treeExpanded=new Set();
    const list=modal.querySelector('[data-drive-list]');
    const crumbs=modal.querySelector('[data-drive-crumbs]');
    const searchWrap=modal.querySelector('[data-drive-browser-search]');
    const input=modal.querySelector('[data-drive-folder-search]');
    const note=modal.querySelector('[data-drive-browser-note]');
    const selectCurrent=modal.querySelector('[data-drive-select-current]');
    if(!list||!crumbs)return;
    list.hidden=false;
    list.style.display='block';
    if(searchWrap)searchWrap.hidden=false;
    if(note){
      note.hidden=false;
      note.textContent='Abra as setas para navegar pelas subpastas. Clique em uma pasta para selecioná-la e depois confirme em “Usar pasta selecionada”.';
    }
    crumbs.innerHTML='<span class="alliance-drive-browser-title">Pastas da '+esc(state.brand)+'</span><span class="alliance-drive-browser-subtitle">Estrutura completa de pastas</span>';

    let tree=null;
    let all=[];
    try{
      all=knownFoldersForBrand(state.brand,state);
      tree=buildKnownTree(state.brand,state);
    }catch(e){
      console.error('[Drive entregas] falha ao montar árvore',e);
    }

    const q=norm(query||'');
    const current=String(state.currentFolder||state.destination&&state.destination.folderId||'');
    const currentPath=(state.currentTrail||[]).map(function(x){return x.nome}).join(' › ')||(state.destination&&state.destination.path)||state.brand;
    treeAncestors(currentPath).forEach(function(key){state.treeExpanded.add(key)});
    state.treeExpanded.add(norm(state.brand));

    let visible=[];
    const walk=function(node){
      if(!node)return;
      if(q&&!treeHasMatch(node,q))return;
      visible.push(node);
      const expanded=q||state.treeExpanded.has(norm(node.path));
      if(expanded)(node.children||[]).forEach(walk);
    };
    if(tree)walk(tree);

    if(!visible.length&&all.length){
      visible=all.map(function(folder){
        const parts=String(folder.path||'').split('›').map(function(v){return v.trim()}).filter(Boolean);
        return {
          name:parts[parts.length-1]||folder.path||'Pasta',
          path:folder.path,
          id:folder.id,
          children:[],
          depth:Math.max(0,parts.length-1)
        };
      }).filter(function(node){return !q||norm(node.path).indexOf(q)>=0});
    }

    list.innerHTML=visible.length?'<div class="alliance-drive-tree-list">'+visible.map(function(node){
      const hasChildren=Array.isArray(node.children)&&node.children.length>0;
      const expanded=q||state.treeExpanded.has(norm(node.path));
      const selected=!!node.id&&String(node.id)===current;
      const selectable=!!node.id;
      const depth=Math.max(0,Number(node.depth||0));
      const meta=hasChildren?(node.children.length+' '+(node.children.length===1?'subpasta':'subpastas')):(selectable?'Pasta disponível':'Grupo de pastas');
      return '<div class="alliance-drive-tree-line '+(selected?'selected ':'')+(selectable?'selectable ':'')+'" style="--tree-depth:'+depth+'">'+
        '<span class="alliance-drive-tree-guides" aria-hidden="true"></span>'+
        (hasChildren?'<button type="button" class="alliance-drive-tree-toggle '+(expanded?'open':'')+'" data-drive-tree-toggle="'+esc(node.path)+'" aria-label="'+(expanded?'Recolher':'Abrir')+' '+esc(node.name)+'"><span>›</span></button>':'<span class="alliance-drive-tree-spacer"></span>')+
        '<button type="button" class="alliance-drive-tree-main" data-drive-tree-path="'+esc(node.path)+'" data-drive-tree-folder="'+esc(node.id||'')+'" data-drive-tree-has-children="'+(hasChildren?'1':'0')+'">'+
          '<span class="alliance-drive-tree-folder">▰</span>'+
          '<span class="alliance-drive-tree-copy"><b>'+esc(node.name)+'</b><small>'+esc(meta)+'</small></span>'+
          (selected?'<span class="alliance-drive-tree-check">✓</span>':'')+
        '</button>'+
      '</div>';
    }).join('')+'</div>':'<div class="alliance-drive-empty">Nenhuma pasta corresponde à busca.</div>';

    if(selectCurrent)selectCurrent.disabled=!state.currentFolder;

    list.querySelectorAll('[data-drive-tree-toggle]').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        const key=norm(btn.dataset.driveTreeToggle||'');
        if(state.treeExpanded.has(key))state.treeExpanded.delete(key);else state.treeExpanded.add(key);
        renderKnownBrowser(modal,state,input&&input.value||'');
      });
    });
    list.querySelectorAll('[data-drive-tree-path]').forEach(function(btn){
      btn.addEventListener('click',function(){
        const path=String(btn.dataset.driveTreePath||'');
        const id=String(btn.dataset.driveTreeFolder||'');
        const hasChildren=btn.dataset.driveTreeHasChildren==='1';
        const key=norm(path);
        if(id){
          state.currentFolder=id;
          state.currentTrail=path.split('›').map(function(nome){return {nome:nome.trim()}}).filter(function(x){return x.nome});
        }
        if(hasChildren&&!id){
          if(state.treeExpanded.has(key))state.treeExpanded.delete(key);else state.treeExpanded.add(key);
        }else if(hasChildren&&!state.treeExpanded.has(key)){
          state.treeExpanded.add(key);
        }
        renderKnownBrowser(modal,state,input&&input.value||'');
      });
    });
  }
  async function renderBrowser(modal,state,folderId){
    const list=modal.querySelector('[data-drive-list]');
    const crumbs=modal.querySelector('[data-drive-crumbs]');
    const searchWrap=modal.querySelector('[data-drive-browser-search]');
    const note=modal.querySelector('[data-drive-browser-note]');
    if(searchWrap)searchWrap.hidden=true;
    if(note)note.hidden=true;
    state.browserFallback=false;
    list.innerHTML='<div class="alliance-drive-loading"><span></span>Carregando pastas…</div>';
    let data;
    try{
      data=await driveList(state.brand,folderId);
    }catch(e){
      if(e&&e.semChave){
        state.driveWriteUnavailable=true;
        renderKnownBrowser(modal,state,'');
        return;
      }
      throw e;
    }
    state.currentFolder=data.pasta;
    state.currentTrail=[{id:data.raiz,nome:state.brand}].concat((data.trilha||[]).filter(function(x){return x.id!==data.raiz}));
    crumbs.innerHTML=state.currentTrail.map(function(x,i){return '<button type="button" data-drive-crumb="'+esc(x.id)+'">'+esc(x.nome)+(i<state.currentTrail.length-1?' ›':'')+'</button>'}).join('');
    crumbs.querySelectorAll('[data-drive-crumb]').forEach(function(btn){btn.addEventListener('click',function(){renderBrowser(modal,state,btn.dataset.driveCrumb).catch(function(e){showModalError(modal,e.message)})})});
    const folders=(data.arquivos||[]).filter(function(x){return x.pasta});
    list.innerHTML=folders.length?folders.map(function(x){
      return '<button type="button" class="alliance-drive-folder-row" data-drive-open-folder="'+esc(x.id)+'"><span>▰</span><span class="alliance-drive-folder-copy"><b>'+esc(x.nome)+'</b><small>Google Drive</small></span><i>›</i></button>';
    }).join(''):'<div class="alliance-drive-empty">Nenhuma subpasta aqui. Você pode selecionar esta pasta.</div>';
    list.querySelectorAll('[data-drive-open-folder]').forEach(function(btn){btn.addEventListener('click',function(){renderBrowser(modal,state,btn.dataset.driveOpenFolder).catch(function(e){showModalError(modal,e.message)})})});
  }
  function showModalError(modal,message){
    const box=modal.querySelector('[data-drive-error]');
    box.hidden=false;
    box.textContent=String(message||'Não foi possível acessar o Drive.');
  }
  function recipientInitials(name){
    const parts=String(name||'').trim().split(/\s+/).filter(Boolean);
    return (((parts[0]||'')[0]||'')+((parts[1]||'')[0]||'')).toUpperCase()||'?';
  }
  function recipientAvatarInner(recipient){
    const url=String(recipient&&recipient.photoUrl||'').trim();
    if(url)return '<img src="'+esc(url)+'" alt="" referrerpolicy="no-referrer">';
    return '<span>'+esc(recipientInitials(recipient&&recipient.name))+'</span>';
  }
  function recipientList(ctx){
    const seen=new Set();
    return (Array.isArray(ctx&&ctx.recipientOptions)?ctx.recipientOptions:[]).map(function(raw){
      const r=typeof raw==='string'?{name:raw}:Object.assign({},raw||{});
      const name=String(r.name||r.nome||r.email||'').trim();
      const id=String(r.id||r.userId||'').trim();
      if(!name)return null;
      const key=id||name;
      if(seen.has(key))return null;
      seen.add(key);
      return {
        key:key,
        id:id||null,
        name:name,
        photoUrl:String(r.photoUrl||r.foto_url||r.avatar||''),
        email:String(r.email||''),
        targetTaskId:r.targetTaskId?String(r.targetTaskId):'',
        targetTaskTitle:String(r.targetTaskTitle||''),
        source:String(r.source||'')
      };
    }).filter(Boolean);
  }
  function renderRecipientMenu(modal,state){
    const menu=modal.querySelector('[data-drive-recipient-menu]');
    if(!menu)return;
    menu.innerHTML=state.recipients.length?state.recipients.map(function(r,index){
      const meta=r.targetTaskTitle?'Próxima tarefa · '+r.targetTaskTitle:(r.email||r.source||'Equipe Alliance');
      const selected=state.recipient&&state.recipient.key===r.key;
      return '<button type="button" class="alliance-drive-recipient-option '+(selected?'selected':'')+'" data-drive-recipient-index="'+index+'">'+
        '<span class="alliance-drive-option-avatar">'+recipientAvatarInner(r)+'</span>'+
        '<span class="alliance-drive-option-copy"><b>'+esc(r.name)+'</b><small>'+esc(meta)+'</small></span>'+
        '<i>'+ (selected?'✓':'') +'</i>'+
      '</button>';
    }).join(''):'<div class="alliance-drive-recipient-empty">Nenhuma pessoa disponível.</div>';
  }
  function updateConfirmState(modal,state){
    const folderOk=!!(state.destination&&state.destination.folderId);
    const recipientOk=!state.requireRecipient||!!(state.recipient&&state.recipient.name);
    modal.querySelector('[data-drive-confirm]').disabled=!(folderOk&&recipientOk);
  }
  function setRecipient(modal,state,recipient){
    state.recipient=recipient||null;
    const avatar=modal.querySelector('[data-drive-recipient-avatar]');
    const name=modal.querySelector('[data-drive-recipient-name]');
    const task=modal.querySelector('[data-drive-recipient-task]');
    const source=modal.querySelector('[data-drive-recipient-source]');
    const toggleLabel=modal.querySelector('[data-drive-recipient-toggle-label]');
    if(avatar){
      avatar.innerHTML=recipient?recipientAvatarInner(recipient):'<span>?</span>';
      avatar.classList.toggle('has-photo',!!recipient?.photoUrl);
    }
    if(name)name.textContent=recipient&&recipient.name||'Escolher destinatário';
    if(task)task.textContent=recipient&&recipient.targetTaskTitle?'Próxima tarefa: '+recipient.targetTaskTitle:'Selecione quem deve receber o contexto desta entrega.';
    if(source)source.textContent=recipient&&recipient.source||'';
    if(toggleLabel)toggleLabel.textContent=recipient?'Alterar pessoa':'Escolher pessoa';
    renderRecipientMenu(modal,state);
    updateConfirmState(modal,state);
  }
  function setDestination(modal,state,destination){
    state.destination=destination;
    modal.querySelector('[data-drive-path]').textContent=destination&&destination.path||'Escolher pasta';
    modal.querySelector('[data-drive-source]').textContent=destination&&destination.source||'';
    updateConfirmState(modal,state);
  }
  async function confirm(ctx){
    const task=ctx.task||{};
    const brand=String(task.brand||ctx.brand||'');
    const initialSuggestion=suggest(ctx);
    const campaign=initialSuggestion?.campaign||ctx.campaign||campaignForTask(task);
    let suggestion=initialSuggestion;
    let campaignResolutionError='';
    if(campaign&&initialSuggestion&&!['Pasta usada anteriormente','Sugerido pela campanha'].includes(initialSuggestion.source)){
      try{
        suggestion=await resolveCampaignDestination(ctx,initialSuggestion);
        if(!suggestion)campaignResolutionError='Não encontrei com segurança a pasta da campanha “'+String(campaign.name||'Campanha')+'” no Drive. Escolha a pasta correta em “Alterar pasta”.';
      }catch(e){
        suggestion=null;
        campaignResolutionError='Não foi possível localizar automaticamente a pasta da campanha. Escolha o destino em “Alterar pasta”.';
        console.warn('[Drive entregas] resolução da campanha',e);
      }
    }
    return new Promise(function(resolve){
      const modal=ensureModal();
      const recipients=recipientList(ctx);
      const suggestedRaw=ctx.suggestedRecipient||null;
      const suggestedKey=typeof suggestedRaw==='string'?suggestedRaw:String(suggestedRaw&&suggestedRaw.id||suggestedRaw&&suggestedRaw.key||suggestedRaw&&suggestedRaw.name||'');
      const suggestedRecipient=recipients.find(function(r){return r.key===suggestedKey||r.id===suggestedKey||r.name===suggestedKey})||recipients.find(function(r){return !!r.targetTaskId})||null;
      const state={
        brand:brand,
        ctx:ctx,
        destination:suggestion,
        currentFolder:suggestion&&suggestion.folderId||null,
        currentTrail:String(suggestion&&suggestion.path||'').split('›').map(function(nome){return {nome:nome.trim()}}).filter(function(x){return x.nome}),
        recipients:recipients,
        recipient:suggestedRecipient,
        requireRecipient:ctx.requireRecipient===true
      };
      const recipientWrap=modal.querySelector('[data-drive-recipient]');
      const recipientToggle=modal.querySelector('[data-drive-recipient-toggle]');
      const recipientMenu=modal.querySelector('[data-drive-recipient-menu]');
      const folderSearch=modal.querySelector('[data-drive-folder-search]');
      modal.querySelector('[data-drive-files]').innerHTML=fileSummary(ctx.files||[],ctx.links||[]);
      modal.querySelector('[data-drive-browser]').hidden=true;
      modal.querySelector('[data-drive-error]').hidden=true;
      modal.querySelector('[data-drive-remember]').checked=true;
      modal.querySelector('[data-drive-confirm]').textContent=ctx.confirmLabel||'Confirmar destino';
      if(recipientWrap)recipientWrap.hidden=!(state.requireRecipient||recipients.length);
      if(recipientMenu)recipientMenu.hidden=true;
      setRecipient(modal,state,suggestedRecipient);
      setDestination(modal,state,suggestion);
      if(state.requireRecipient&&!recipients.length)showModalError(modal,'Nenhum usuário ativo disponível para receber esta entrega.');
      else if(campaignResolutionError)showModalError(modal,campaignResolutionError);
      modal.classList.add('open');

      function restoreModalCopy(){
        const title=modal.querySelector('#allianceDriveTitle');
        const subtitle=modal.querySelector('header p');
        if(title)title.textContent='Enviar entrega';
        if(subtitle)subtitle.textContent='Confira quem vai receber e onde os arquivos serão salvos antes de concluir.';
      }
      function done(result){
        modal.classList.remove('open','folder-picker-open');
        restoreModalCopy();
        if(recipientMenu)recipientMenu.hidden=true;
        cleanup();
        resolve(result);
      }
      function cleanup(){
        modal.querySelectorAll('[data-drive-cancel]').forEach(function(x){x.removeEventListener('click',onCancel)});
        modal.querySelector('[data-drive-change]').removeEventListener('click',onChange);
        modal.querySelector('[data-drive-select-current]').removeEventListener('click',onSelectCurrent);
        modal.querySelector('[data-drive-confirm]').removeEventListener('click',onConfirm);
        recipientToggle&&recipientToggle.removeEventListener('click',onRecipientToggle);
        recipientMenu&&recipientMenu.removeEventListener('click',onRecipientPick);
        folderSearch&&folderSearch.removeEventListener('input',onFolderSearch);
      }
      function onCancel(){done({cancelled:true})}
      function onRecipientToggle(e){
        e.preventDefault();
        e.stopPropagation();
        if(recipientMenu)recipientMenu.hidden=!recipientMenu.hidden;
      }
      function onRecipientPick(e){
        const option=e.target.closest&&e.target.closest('[data-drive-recipient-index]');
        if(!option)return;
        e.preventDefault();
        const picked=recipients[Number(option.dataset.driveRecipientIndex)]||null;
        setRecipient(modal,state,picked?Object.assign({},picked,{source:picked.targetTaskId?'Sugerido pela próxima tarefa':'Escolhido por você'}):null);
        if(recipientMenu)recipientMenu.hidden=true;
      }
      function onFolderSearch(){
        if(state.browserFallback)renderKnownBrowser(modal,state,folderSearch&&folderSearch.value||'');
      }
      function onChange(){
        const browser=modal.querySelector('[data-drive-browser]');
        browser.hidden=false;
        modal.classList.add('folder-picker-open');
        const title=modal.querySelector('#allianceDriveTitle');
        const subtitle=modal.querySelector('header p');
        if(title)title.textContent='Escolher pasta no Drive';
        if(subtitle)subtitle.textContent='Navegue pela estrutura, abra as subpastas e selecione o destino correto da entrega.';
        modal.querySelector('[data-drive-error]').hidden=true;
        if(folderSearch)folderSearch.value='';
        const start=(state.destination&&state.destination.folderId)||(ROOTS[brand]&&ROOTS[brand].id)||'';
        renderBrowser(modal,state,start).catch(function(e){showModalError(modal,e.message)});
        requestAnimationFrame(function(){
          const list=modal.querySelector('[data-drive-list]');
          if(list)list.scrollTop=0;
        });
      }
      function onSelectCurrent(){
        if(!state.currentFolder)return;
        const path=state.currentTrail.map(function(x){return x.nome}).join(' › ');
        const kind=initialSuggestion&&initialSuggestion.kind||detectKind(ctx);
        setDestination(modal,state,{folderId:state.currentFolder,path:path,source:'Escolhido por você',kind:kind,key:initialSuggestion&&initialSuggestion.key||learnedKey(task,campaign,kind),campaign:campaign});
        modal.querySelector('[data-drive-browser]').hidden=true;
        modal.classList.remove('folder-picker-open');
        restoreModalCopy();
        modal.querySelector('[data-drive-error]').hidden=true;
      }
      async function onConfirm(){
        const dest=state.destination;
        if(!dest||!dest.folderId)return;
        if(state.requireRecipient&&!state.recipient)return;
        const remember=modal.querySelector('[data-drive-remember]').checked;
        if(remember){
          const kind=dest.kind||initialSuggestion&&initialSuggestion.kind||detectKind(ctx);
          const key=dest.key||initialSuggestion&&initialSuggestion.key||learnedKey(task,campaign,kind);
          await saveLearned({key:key,brand:brand,campaignId:campaign&&campaign.id||task.campaignId||null,kind:kind,folderId:dest.folderId,path:dest.path,updatedAt:new Date().toISOString(),source:'manual'});
        }
        const recipient=state.recipient?{id:state.recipient.id||null,name:state.recipient.name,photoUrl:state.recipient.photoUrl||'',targetTaskId:state.recipient.targetTaskId||'',targetTaskTitle:state.recipient.targetTaskTitle||'',source:state.recipient.source||''}:null;
        const kind=dest.kind||initialSuggestion&&initialSuggestion.kind||detectKind(ctx);
        done({cancelled:false,recipient:recipient,destination:{folderId:dest.folderId,path:dest.path,source:dest.source||'Confirmado',kind:kind,folderLink:'https://drive.google.com/drive/folders/'+dest.folderId}});
      }
      modal.querySelectorAll('[data-drive-cancel]').forEach(function(x){x.addEventListener('click',onCancel)});
      modal.querySelector('[data-drive-change]').addEventListener('click',onChange);
      modal.querySelector('[data-drive-select-current]').addEventListener('click',onSelectCurrent);
      modal.querySelector('[data-drive-confirm]').addEventListener('click',onConfirm);
      recipientToggle&&recipientToggle.addEventListener('click',onRecipientToggle);
      recipientMenu&&recipientMenu.addEventListener('click',onRecipientPick);
      folderSearch&&folderSearch.addEventListener('input',onFolderSearch);
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
    if(!files.length)return {cancelled:false,recipient:chosen.recipient||null,destination:chosen.destination,files:[]};
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
      return {cancelled:false,recipient:chosen.recipient||null,destination:chosen.destination,files:out};
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
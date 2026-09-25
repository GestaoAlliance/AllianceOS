(() => {
  'use strict';
  const SEARCH='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/knowledge-search';
  const ICON='/api/brand-icon?format=svg&v=20260923-agent-3';
  const KEY='allianceos.agent.sidekick.v2';
  const esc=(v)=>String(v==null?'':v).replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const icon=(d)=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
  const I={
    down:icon('<path d="m8 10 4 4 4-4"/>'),
    tune:icon('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
    expand:icon('<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>'),
    close:icon('<path d="m6 6 12 12M18 6 6 18"/>'),
    plus:icon('<path d="M12 5v14M5 12h14"/>'),
    send:icon('<path d="m4 12 16-7-5 14-3-6-8-1Z"/><path d="m12 13 4-4"/>'),
    wave:icon('<path d="M5 10v4M9 7v10M13 5v14M17 8v8M21 10v4"/>')
  };
  const MARK=icon('<path d="M12 5v14M5 12h14M7.05 7.05l9.9 9.9M16.95 7.05l-9.9 9.9"/>');
  const state={open:false,expanded:false,busy:false,messages:[]};
  let launcher,panel,thread,input,send,composer,titleMenu,settingsMenu;

  function currentBrand(){
    const select=document.getElementById('brandSelect');
    const option=select&&select.selectedOptions?select.selectedOptions[0]:null;
    const rawId=option&&option.dataset?option.dataset.brandId:'';
    const rawName=option?(option.value||option.textContent):'Todas as marcas';
    return {id:rawId&&rawId!=='__all__'?rawId:null,name:/todas/i.test(rawName)?'Todas as marcas':rawName};
  }
  function pageName(){
    const active=document.querySelector('.ref2-nav-btn.active .ref2-nav-label');
    return active&&active.textContent?active.textContent.trim():'AllianceOS';
  }
  function restore(){
    try{const value=JSON.parse(sessionStorage.getItem(KEY)||'[]');state.messages=Array.isArray(value)?value:[]}catch(_){state.messages=[]}
  }
  function persist(){try{sessionStorage.setItem(KEY,JSON.stringify(state.messages.slice(-30)))}catch(_){}}
  function labelType(v){
    return ({task:'Tarefa',campaign:'Campanha',delivery:'Entrega',document:'Documento',decision:'Decisão',learning:'Aprendizado'})[v]||'Registro';
  }
  function shortText(v){
    const text=String(v||'').replace(/\s+/g,' ').trim();
    return text.length>180?text.slice(0,177)+'…':text;
  }
  function emptyMarkup(){
    const b=currentBrand();
    const name=b.name==='Todas as marcas'?'AllianceOS':b.name;
    return '<div class="aos-agent-empty"><div class="aos-agent-mark">'+MARK+'</div><h2>Por onde devemos começar?</h2></div>';
  }
  function render(){
    if(!thread)return;
    if(!state.messages.length){thread.innerHTML=emptyMarkup();return}
    thread.innerHTML=state.messages.map((m)=>{
      if(m.role==='user')return '<div class="aos-agent-row user"><div class="aos-agent-user">'+esc(m.text)+'</div></div>';
      if(m.role==='loading')return '<div class="aos-agent-row agent"><span class="aos-agent-mini">'+MARK+'</span><div class="aos-agent-thinking"><i></i><i></i><i></i></div></div>';
      const cards=(m.results||[]).map((r)=>{
        const score=Number(r.similarity);
        const pct=Number.isFinite(score)?'<em>'+Math.round(score*100)+'%</em>':'';
        return '<article class="aos-agent-result"><div><span>'+esc(labelType(r.source_type))+'</span>'+pct+'</div><strong>'+esc(r.title||'Sem título')+'</strong><p>'+esc(shortText(r.content))+'</p></article>';
      }).join('');
      return '<div class="aos-agent-row agent"><span class="aos-agent-mini"><img src="'+ICON+'" alt=""></span><div class="aos-agent-answer"><p>'+esc(m.text)+'</p>'+(cards?'<div class="aos-agent-results">'+cards+'</div>':'')+'</div></div>';
    }).join('');
    requestAnimationFrame(()=>{thread.scrollTop=thread.scrollHeight});
  }
  function resize(){
    if(!input)return;
    input.style.height='0px';
    input.style.height=Math.min(116,Math.max(30,input.scrollHeight))+'px';
    const has=!!input.value.trim();
    if(send){send.classList.toggle('ready',has);send.innerHTML=has?I.send:I.wave}
  }
  async function semanticSearch(query){
    if(window.AllianceOSAuth&&window.AllianceOSAuth.ready)await window.AllianceOSAuth.ready;
    const token=window.AllianceOSAuth&&window.AllianceOSAuth.getAccessToken?window.AllianceOSAuth.getAccessToken():'';
    if(!token)throw new Error('Sessão não disponível.');
    const b=currentBrand();
    const response=await fetch(SEARCH,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({
        query:query,
        brand_id:b.id,
        limit:5,
        history:state.messages
          .filter((m)=>m&&m.role==='user')
          .slice(0,-1)
          .slice(-4)
          .map((m)=>({role:'user',text:String(m.text||'')}))
      })
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||('HTTP '+response.status));
    return {
      results:Array.isArray(data.results)?data.results:[],
      answer:String(data.answer||'').trim(),
      liveSummary:data.live_summary||null
    };
  }
  async function submitPrompt(){
    // Re-resolve os elementos a cada envio para evitar referências obsoletas
    // quando partes da interface legada são re-renderizadas.
    if(panel){
      input=panel.querySelector('textarea')||input;
      send=panel.querySelector('.aos-agent-send')||send;
      composer=panel.querySelector('.aos-agent-compose')||composer;
    }
    const q=input?input.value.trim():'';
    if(!q||state.busy)return;
    state.busy=true;
    state.messages.push({role:'user',text:q},{role:'loading'});
    input.value='';
    resize();
    render();
    try{
      const response=await semanticSearch(q);
      const results=response.results||[];
      state.messages=state.messages.filter((x)=>x.role!=='loading');
      const b=currentBrand();
      const where=b.name==='Todas as marcas'?'AllianceOS':b.name;
      state.messages.push({
        role:'assistant',
        text:response.answer||(results.length?'Encontrei '+results.length+' registros relevantes em '+where+'.':'Não encontrei registros suficientemente próximos em '+where+'.'),
        results:results
      });
    }catch(err){
      state.messages=state.messages.filter((x)=>x.role!=='loading');
      state.messages.push({role:'assistant',text:'Não consegui consultar os dados do AllianceOS agora. '+String(err&&err.message?err.message:err),results:[]});
    }
    state.busy=false;
    persist();
    render();
  }
  function closeMenus(){
    if(titleMenu)titleMenu.classList.remove('open');
    if(settingsMenu)settingsMenu.classList.remove('open');
  }
  function syncLabels(){
    if(!panel)return;
    const b=currentBrand();
    panel.querySelectorAll('.aos-agent-brand-label').forEach((el)=>{el.textContent=b.name});
    const page=panel.querySelector('.aos-agent-page-label');
    if(page)page.textContent=pageName();
    if(!state.messages.length)render();
  }
  function positionPanel(){
    if(!panel||window.innerWidth<=700)return;
    const bar=document.querySelector('.global-toolbar');
    const bottom=bar?bar.getBoundingClientRect().bottom:108;
    panel.style.top=Math.round(bottom+12)+'px';
  }
  function setOpen(next){
    state.open=!!next;
    if(panel)panel.classList.toggle('open',state.open);
    if(launcher){launcher.classList.toggle('active',state.open);launcher.setAttribute('aria-pressed',String(state.open))}
    if(state.open){positionPanel();syncLabels();setTimeout(()=>{if(input)input.focus()},120)}else closeMenus();
  }
  function newConversation(){
    state.messages=[];
    persist();
    render();
    closeMenus();
    if(input)input.focus();
  }
  function setup(){
    if(document.querySelector('.aos-agent-panel'))return;
    const actions=document.querySelector('.ref2-top-actions');
    if(!actions)return;

    launcher=document.createElement('button');
    launcher.type='button';
    launcher.className='aos-agent-launcher';
    launcher.title='Agente AllianceOS';
    launcher.setAttribute('aria-label','Abrir agente AllianceOS');
    launcher.innerHTML=MARK;
    actions.prepend(launcher);

    panel=document.createElement('aside');
    panel.className='aos-agent-panel';
    panel.innerHTML=
      '<header class="aos-agent-header">'+
        '<div class="aos-agent-title-wrap">'+
          '<button class="aos-agent-title" type="button">Nova conversa '+I.down+'</button>'+
          '<div class="aos-agent-title-menu"><button type="button" data-new>+ Nova conversa</button><small>As conversas ficam apenas nesta sessão do navegador.</small></div>'+
        '</div>'+
        '<div class="aos-agent-head-actions">'+
          '<button type="button" data-settings aria-label="Configurações">'+I.tune+'</button>'+
          '<button type="button" data-expand aria-label="Expandir">'+I.expand+'</button>'+
          '<button type="button" data-close aria-label="Fechar">'+I.close+'</button>'+
        '</div>'+
        '<div class="aos-agent-settings">'+
          '<strong>Contexto</strong>'+
          '<div><span>Marca</span><b class="aos-agent-brand-label"></b></div>'+
          '<div><span>Tela</span><b class="aos-agent-page-label"></b></div>'+
          '<label><input type="checkbox" checked data-context> Usar contexto da tela atual</label>'+
          '<small>O agente consulta os dados operacionais e a memória do AllianceOS em tempo real.</small>'+
        '</div>'+
      '</header>'+
      '<div class="aos-agent-thread"></div>'+
      '<div class="aos-agent-compose-wrap">'+
        '<form class="aos-agent-compose" novalidate>'+
          '<textarea rows="1" placeholder="Trabalhar com o agente"></textarea>'+
          '<button class="aos-agent-plus" type="button" aria-label="Adicionar contexto">'+I.plus+'</button>'+
          '<button class="aos-agent-send" type="submit" aria-label="Enviar">'+I.wave+'</button>'+
        '</form>'+
      '</div>';
    document.body.appendChild(panel);

    thread=panel.querySelector('.aos-agent-thread');
    composer=panel.querySelector('.aos-agent-compose');
    input=panel.querySelector('textarea');
    send=panel.querySelector('.aos-agent-send');
    titleMenu=panel.querySelector('.aos-agent-title-menu');
    settingsMenu=panel.querySelector('.aos-agent-settings');

    launcher.addEventListener('click',()=>setOpen(!state.open));
    panel.querySelector('[data-close]').addEventListener('click',()=>setOpen(false));
    panel.querySelector('[data-expand]').addEventListener('click',()=>{
      state.expanded=!state.expanded;
      panel.classList.toggle('expanded',state.expanded);
    });
    panel.querySelector('.aos-agent-title').addEventListener('click',()=>{
      titleMenu.classList.toggle('open');
      settingsMenu.classList.remove('open');
    });
    panel.querySelector('[data-settings]').addEventListener('click',()=>{
      settingsMenu.classList.toggle('open');
      titleMenu.classList.remove('open');
      syncLabels();
    });
    panel.querySelector('[data-new]').addEventListener('click',newConversation);
    panel.querySelector('.aos-agent-plus').addEventListener('click',()=>{
      settingsMenu.classList.toggle('open');
      syncLabels();
    });
    input.addEventListener('input',resize);
    input.addEventListener('keydown',(e)=>{
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();composer?.requestSubmit()}
    });
    composer.addEventListener('submit',(e)=>{
      e.preventDefault();
      submitPrompt();
    });
    // Fallback em captura: alguns runtimes legados do AllianceOS substituem nós
    // depois do mount. Mesmo nesse cenário, Enter no campo continua enviando.
    panel.addEventListener('keydown',(e)=>{
      if(e.key==='Enter'&&!e.shiftKey&&e.target?.matches?.('textarea')){
        e.preventDefault();
        submitPrompt();
      }
    },true);
    document.addEventListener('click',(e)=>{
      if(!panel.contains(e.target)&&!launcher.contains(e.target))closeMenus();
    });
    document.addEventListener('keydown',(e)=>{
      if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==='a'){e.preventDefault();setOpen(true)}
      else if(e.key==='Escape'&&state.open)setOpen(false);
    });
    window.addEventListener('resize',positionPanel);
    const brandSelect=document.getElementById('brandSelect');
    if(brandSelect)brandSelect.addEventListener('change',syncLabels);

    restore();
    syncLabels();
    render();
    resize();
    window.AllianceOSAgent={open:()=>setOpen(true),close:()=>setOpen(false),newConversation:newConversation};
  }
  function boot(){
    if(document.documentElement.classList.contains('alliance-authenticated'))setup();
    else if(window.AllianceOSAuth&&window.AllianceOSAuth.ready)window.AllianceOSAuth.ready.then(()=>setTimeout(setup,80)).catch(()=>{});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  const observer=new MutationObserver(()=>{if(!launcher)setup()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
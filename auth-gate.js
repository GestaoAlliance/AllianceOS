(() => {
  'use strict';

  const CONFIG_URL='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
  const nativeFetch=window.fetch.bind(window);
  const bypass=location.pathname==='/oauth/consent';
  let client=null,session=null,context=null,settled=false,resolveReady;
  const ready=new Promise(r=>{resolveReady=r});
  const domReady=()=>document.readyState==='loading'
    ? new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}))
    : Promise.resolve();

  function finish(value){if(!settled){settled=true;resolveReady(value)}}
  function token(){return session?.access_token||''}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function clearWorkspaceCache(){
    const keep=new Set(['central.theme','allianceos.theme']),remove=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&(k.startsWith('central.')||k.startsWith('allianceos.'))&&!keep.has(k))remove.push(k);
    }
    remove.forEach(k=>localStorage.removeItem(k));
    sessionStorage.removeItem('allianceos.rls_tasks_hydrated');
    sessionStorage.removeItem('central.__public_sync_ready');
  }
  function root(){
    let el=document.getElementById('allianceAuthRoot');
    if(!el){el=document.createElement('div');el.id='allianceAuthRoot';document.body.appendChild(el)}
    return el;
  }
  function showRoot(){
    document.documentElement.classList.add('alliance-auth-locked');
    document.documentElement.classList.remove('alliance-authenticated');
  }
  function showApp(){
    document.documentElement.classList.remove('alliance-auth-pending','alliance-auth-locked');
    document.documentElement.classList.add('alliance-authenticated');
    document.getElementById('allianceAuthRoot')?.remove();
  }
  function setMessage(text,type='info'){
    const el=document.getElementById('authMessage');if(!el)return;
    el.textContent=text||'';el.dataset.type=type;el.hidden=!text;
  }
  function setBusy(button,busy,label){
    if(!button)return;
    button.disabled=busy;
    if(busy){button.dataset.label=button.textContent;button.textContent=label||'Aguarde…'}
    else if(button.dataset.label){button.textContent=button.dataset.label;delete button.dataset.label}
  }
  function modeFromUrl(){return location.pathname==='/cadastro'?'signup':'login'}

  function googleIcon(){
    return '<span class="google-g"><i></i><i></i><i></i><i></i></span>';
  }

  function dashboardPreview(){
    return ''+
      '<div class="showcase-device">'+
        '<div class="showcase-topbar">'+
          '<div class="showcase-brand-mini"><span>✳</span></div>'+
          '<div class="showcase-search">⌕ &nbsp; Buscar tarefas, campanhas...</div>'+
          '<div class="showcase-people"><b>VG</b><b>PL</b><b>SN</b><strong>+2</strong></div>'+
        '</div>'+
        '<div class="showcase-body">'+
          '<aside class="showcase-nav">'+
            '<button class="active">▦</button><button>✉</button><button>♙</button><button>▥</button><button>＋</button>'+
          '</aside>'+
          '<section class="showcase-content">'+
            '<small>👋 Bom dia, equipe</small><h3>Visão geral</h3>'+
            '<div class="showcase-kpis">'+
              '<article><span>Tarefas abertas</span><b>24</b><em>↑ 12%</em></article>'+
              '<article><span>Campanhas</span><b>8</b><em>↑ 33%</em></article>'+
              '<article><span>Entregas</span><b>16</b><em>↑ 28%</em></article>'+
            '</div>'+
            '<div class="showcase-chart">'+
              '<div class="chart-head"><b>Produção do time</b><span>Últimos 6 meses</span></div>'+
              '<div class="bars">'+
                '<i style="height:36%"></i><i style="height:50%"></i><i style="height:67%"></i><i style="height:43%"></i><i style="height:73%"></i><i style="height:59%"></i>'+
              '</div>'+
              '<div class="months"><span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span></div>'+
            '</div>'+
          '</section>'+
        '</div>'+
      '</div>';
  }

  function showcase(){
    return ''+
      '<section class="auth-showcase">'+
        '<div class="showcase-grid"></div>'+
        '<div class="showcase-shape shape-a"></div><div class="showcase-shape shape-b"></div>'+
        '<div class="showcase-copy">'+
          '<p class="showcase-quote">“O AllianceOS deixa a operação inteira clara — tarefas, campanhas, entregas e responsáveis em um só lugar.”</p>'+
          '<div class="showcase-person">'+
            '<div class="showcase-avatar">VG</div>'+
            '<div><strong>Vitor Gutierrez</strong><span>Gestor de operações</span></div>'+
          '</div>'+
        '</div>'+
        dashboardPreview()+
      '</section>';
  }

  function signupForm(){
    return ''+
      '<div class="auth-heading"><h1><span>👋</span> Olá! Bem-vindo ao AllianceOS.</h1><p>Vamos começar.</p></div>'+
      '<div id="authMessage" class="auth-message" hidden></div>'+
      '<form id="authSignupForm" class="auth-form auth-form-signup">'+
        '<div class="auth-name-row">'+
          '<label>Nome<input id="authSignupFirstName" autocomplete="given-name" maxlength="60" required placeholder="Seu nome"></label>'+
          '<label>Sobrenome<input id="authSignupLastName" autocomplete="family-name" maxlength="60" required placeholder="Seu sobrenome"></label>'+
        '</div>'+
        '<label>E-mail<input id="authSignupEmail" type="email" autocomplete="email" required placeholder="seu@email.com"></label>'+
        '<label>Senha<div class="auth-password"><input id="authSignupPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Crie uma senha"><button id="authTogglePassword" type="button" aria-label="Mostrar senha">◡</button></div></label>'+
        '<label class="auth-terms"><input id="authTerms" type="checkbox" required><span>Concordo com os <u>Termos de Uso</u> e a <u>Política de Privacidade</u>.</span></label>'+
        '<button class="auth-primary" id="authSignupButton" type="submit">Criar conta</button>'+
      '</form>'+
      '<button class="auth-google" id="authGoogleButton" type="button">'+googleIcon()+'<span>Continuar com Google</span></button>'+
      '<div class="auth-bottom-switch"><span>Já tem conta?</span><button type="button" data-auth-mode="login">Entrar</button></div>';
  }

  function loginForm(){
    return ''+
      '<div class="auth-heading"><h1><span>👋</span> Olá! Bem-vindo de volta.</h1><p>Entre para continuar.</p></div>'+
      '<div id="authMessage" class="auth-message" hidden></div>'+
      '<form id="authLoginForm" class="auth-form auth-form-login">'+
        '<label>E-mail<input id="authLoginEmail" type="email" autocomplete="email" required placeholder="seu@email.com"></label>'+
        '<label>Senha<div class="auth-password"><input id="authLoginPassword" type="password" autocomplete="current-password" required placeholder="Sua senha"><button id="authTogglePassword" type="button" aria-label="Mostrar senha">◡</button></div></label>'+
        '<div class="auth-login-tools"><label class="auth-remember"><input id="authRemember" type="checkbox" checked><span>Manter conectado</span></label><button id="authForgot" class="auth-link" type="button">Esqueci minha senha</button></div>'+
        '<button class="auth-primary" id="authLoginButton" type="submit">Entrar</button>'+
      '</form>'+
      '<button class="auth-google" id="authGoogleButton" type="button">'+googleIcon()+'<span>Continuar com Google</span></button>'+
      '<button class="auth-magic-link" id="authMagicButton" type="button">Entrar com link por e-mail</button>'+
      '<div class="auth-bottom-switch"><span>Ainda não tem conta?</span><button type="button" data-auth-mode="signup">Criar conta</button></div>';
  }

  function authMarkup(mode='login'){
    const signup=mode==='signup';
    return ''+
      '<main class="auth-stage">'+
        '<div class="auth-frame">'+
          '<section class="auth-panel">'+
            '<div class="auth-wordmark"><span class="auth-mark">✳</span><strong>AllianceOS</strong></div>'+
            '<div class="auth-form-wrap">'+(signup?signupForm():loginForm())+'</div>'+
          '</section>'+
          showcase()+
        '</div>'+
      '</main>';
  }

  function renderAuth(mode=modeFromUrl(),prefill=''){
    showRoot();
    root().innerHTML=authMarkup(mode);
    history.replaceState({},'',mode==='signup'?'/cadastro':'/login');

    document.querySelectorAll('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>renderAuth(b.dataset.authMode,prefill)));

    if(mode==='login'){
      const email=document.getElementById('authLoginEmail');if(email)email.value=prefill;
      document.getElementById('authLoginForm')?.addEventListener('submit',loginPassword);
      document.getElementById('authForgot')?.addEventListener('click',forgotPassword);
    }else{
      const email=document.getElementById('authSignupEmail');if(email)email.value=prefill;
      document.getElementById('authSignupForm')?.addEventListener('submit',signupPassword);
    }

    document.getElementById('authTogglePassword')?.addEventListener('click',e=>{
      const input=mode==='signup'?document.getElementById('authSignupPassword'):document.getElementById('authLoginPassword');
      if(!input)return;
      input.type=input.type==='password'?'text':'password';
      e.currentTarget.textContent=input.type==='password'?'◡':'●';
    });
    document.getElementById('authGoogleButton')?.addEventListener('click',googleLogin);
    document.getElementById('authMagicButton')?.addEventListener('click',magicLink);
  }

  function renderPending(profile){
    showRoot();
    const label=((profile?.nome)||session?.user?.email||'?').slice(0,1).toUpperCase();
    root().innerHTML=''+
      '<main class="auth-stage"><div class="auth-frame">'+
        '<section class="auth-panel"><div class="auth-wordmark"><span class="auth-mark">✳</span><strong>AllianceOS</strong></div>'+
          '<div class="auth-form-wrap"><div class="auth-pending-card"><div class="auth-user-dot">'+esc(label)+'</div><h1>Acesso pendente</h1><p>'+esc(profile?.email||session?.user?.email||'')+'</p><small>Sua conta existe, mas ainda precisa ser liberada pela Alliance.</small><button class="auth-primary" id="authPendingSignout" type="button">Sair desta conta</button></div></div>'+
        '</section>'+showcase()+
      '</div></main>';
    document.getElementById('authPendingSignout')?.addEventListener('click',signOut);
  }

  function renderRecovery(){
    showRoot();
    root().innerHTML=''+
      '<main class="auth-stage"><div class="auth-frame">'+
        '<section class="auth-panel"><div class="auth-wordmark"><span class="auth-mark">✳</span><strong>AllianceOS</strong></div>'+
          '<div class="auth-form-wrap"><div class="auth-heading"><h1>Defina uma nova senha.</h1><p>Escolha pelo menos 8 caracteres.</p></div><div id="authMessage" class="auth-message" hidden></div>'+
          '<form id="authRecoveryForm" class="auth-form"><label>Nova senha<input id="authRecoveryPassword" type="password" minlength="8" required autocomplete="new-password"></label><label>Confirmar senha<input id="authRecoveryConfirm" type="password" minlength="8" required autocomplete="new-password"></label><button class="auth-primary" id="authRecoveryButton" type="submit">Salvar nova senha</button></form></div>'+
        '</section>'+showcase()+
      '</div></main>';

    document.getElementById('authRecoveryForm')?.addEventListener('submit',async e=>{
      e.preventDefault();
      const p=document.getElementById('authRecoveryPassword').value;
      const c=document.getElementById('authRecoveryConfirm').value;
      const b=document.getElementById('authRecoveryButton');
      if(p.length<8){setMessage('Use pelo menos 8 caracteres.','error');return}
      if(p!==c){setMessage('As senhas não coincidem.','error');return}
      setBusy(b,true,'Salvando…');
      const {error}=await client.auth.updateUser({password:p});
      setBusy(b,false);
      if(error){setMessage(error.message,'error');return}
      location.replace('/');
    });
  }

  async function conviteInfo(email){
    const {data,error}=await client.rpc('convite_de',{p_email:String(email||'').trim().toLowerCase()});
    if(error)throw error;
    return data||{};
  }

  async function loginPassword(e){
    e.preventDefault();
    const email=document.getElementById('authLoginEmail').value.trim().toLowerCase();
    const password=document.getElementById('authLoginPassword').value;
    const b=document.getElementById('authLoginButton');
    if(!email||!password)return;
    setBusy(b,true,'Entrando…');setMessage('');
    const {error}=await client.auth.signInWithPassword({email,password});
    setBusy(b,false);
    if(error){setMessage(error.message==='Invalid login credentials'?'E-mail ou senha incorretos.':error.message,'error');return}
    location.replace('/');
  }

  async function signupPassword(e){
    e.preventDefault();
    const first=document.getElementById('authSignupFirstName').value.trim();
    const last=document.getElementById('authSignupLastName').value.trim();
    const name=(first+' '+last).trim();
    const email=document.getElementById('authSignupEmail').value.trim().toLowerCase();
    const password=document.getElementById('authSignupPassword').value;
    const terms=document.getElementById('authTerms')?.checked;
    const b=document.getElementById('authSignupButton');
    if(!first||!last||!email)return;
    if(!terms){setMessage('Aceite os Termos de Uso e a Política de Privacidade para continuar.','error');return}
    if(password.length<8){setMessage('Use pelo menos 8 caracteres.','error');return}
    setBusy(b,true,'Criando conta…');setMessage('');
    try{
      const info=await conviteInfo(email);
      if(info.ja_tem_conta){renderAuth('login',email);setMessage('Este e-mail já tem conta. Entre com sua senha.','info');return}
      if(!info.convidado){setMessage('Este e-mail ainda não foi convidado para o AllianceOS.','error');return}
      const {data,error}=await client.auth.signUp({email,password,options:{data:{nome:name,full_name:name,first_name:first,last_name:last},emailRedirectTo:location.origin+'/'}}); 
      if(error)throw error;
      if(data?.session){location.replace('/');return}
      setMessage('Conta criada. Confirme o e-mail para concluir o acesso.','success');
    }catch(err){setMessage(err?.message||String(err),'error')}
    finally{setBusy(b,false)}
  }

  async function googleLogin(){
    const b=document.getElementById('authGoogleButton');
    setBusy(b,true,'Conectando…');setMessage('');
    try{
      const {error}=await client.auth.signInWithOAuth({
        provider:'google',
        options:{redirectTo:location.origin+'/'}
      });
      if(error)throw error;
    }catch(err){
      setBusy(b,false);
      setMessage(err?.message||'Não foi possível iniciar o login com Google.','error');
    }
  }

  async function magicLink(){
    const input=document.getElementById('authLoginEmail');
    const email=input?.value.trim().toLowerCase()||'';
    const b=document.getElementById('authMagicButton');
    if(!email){setMessage('Digite seu e-mail primeiro.','error');return}
    setBusy(b,true,'Enviando…');setMessage('');
    try{
      const info=await conviteInfo(email);
      if(!info.ja_tem_conta&&!info.convidado){setMessage('Este e-mail ainda não foi convidado para o AllianceOS.','error');return}
      const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+'/',shouldCreateUser:!info.ja_tem_conta&&!!info.convidado}});
      if(error)throw error;
      setMessage('Link enviado. Abra o e-mail para entrar no AllianceOS.','success');
    }catch(err){setMessage(err?.message||String(err),'error')}
    finally{setBusy(b,false)}
  }

  async function forgotPassword(){
    const email=document.getElementById('authLoginEmail')?.value.trim().toLowerCase()||'';
    if(!email){setMessage('Digite seu e-mail para recuperar a senha.','error');return}
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/login?recovery=1'});
    setMessage(error?error.message:'Enviamos um link para redefinir sua senha.',error?'error':'success');
  }

  async function signOut(){
    try{await client?.auth.signOut()}catch{}
    clearWorkspaceCache();
    location.replace('/login');
  }

  async function loadContext(){
    const {data,error}=await client.rpc('meu_acesso');
    if(error)throw error;
    return data||{};
  }

  function exposeIdentity(ctx){
    const p=ctx?.perfil||{};
    const first=String(p.nome||session?.user?.email||'Equipe').trim().split(/\s+/)[0]||'Equipe';
    window.AllianceOSSession={user:session.user,profile:p,brands:ctx.marcas||[]};
    window.user={id:session.user.id,email:session.user.email,firstName:first,name:p.nome||first};
    window.CentralEu={id:session.user.id,email:session.user.email,nome:p.nome||first,papel:p.papel||'membro'};
  }

  async function acceptSession(s){
    session=s||null;
    if(!session){
      clearWorkspaceCache();
      renderAuth();
      finish({authenticated:false,client,session:null,context:null});
      return;
    }
    const recovery=/type=recovery/.test(location.hash)||new URLSearchParams(location.search).get('recovery')==='1';
    if(recovery){
      renderRecovery();
      finish({authenticated:true,recovery:true,client,session,context:null});
      return;
    }
    try{context=await loadContext()}catch(err){console.warn('[AllianceOS auth context]',err);context=null}
    const profile=context?.perfil||null;
    if(!profile?.ativo||profile?.tipo_membro==='servico'||profile?.papel==='externo'){
      renderPending(profile);
      finish({authenticated:false,pending:true,client,session,context});
      return;
    }
    exposeIdentity(context);
    showApp();
    if(location.pathname==='/login'||location.pathname==='/cadastro')history.replaceState({},'','/');
    finish({authenticated:true,client,session,context});
    window.dispatchEvent(new CustomEvent('allianceos:auth',{detail:{user:session.user,profile,brands:context.marcas||[]}}));
  }

  window.AllianceOSAuth={
    ready,
    get client(){return client},
    session:()=>session,
    context:()=>context,
    getAccessToken:()=>token(),
    signOut,
    clearWorkspaceCache
  };

  window.fetch=async(input,init={})=>{
    let url;
    try{url=new URL(input instanceof Request?input.url:String(input),location.href)}catch{return nativeFetch(input,init)}
    if(url.origin===location.origin&&url.pathname.startsWith('/api/')){
      await ready;
      const access=token();
      if(access){
        const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined)||{});
        if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+access);
        init={...init,headers};
      }
    }
    return nativeFetch(input,init);
  };

  if(bypass){
    document.documentElement.classList.remove('alliance-auth-pending');
    finish({authenticated:false,bypass:true,client:null,session:null,context:null});
    return;
  }

  (async()=>{
    try{
      const cfgRes=await nativeFetch(CONFIG_URL,{cache:'no-store'});
      if(!cfgRes.ok)throw new Error('Não foi possível carregar a configuração do AllianceOS.');
      const cfg=await cfgRes.json();
      const mod=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
      client=mod.createClient(cfg.url,cfg.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data:{session:s}}=await client.auth.getSession();
      await domReady();
      await acceptSession(s);
      client.auth.onAuthStateChange((event,next)=>{
        if(event==='SIGNED_OUT'){clearWorkspaceCache();location.replace('/login');return}
        if(event==='PASSWORD_RECOVERY'){session=next;renderRecovery();return}
        session=next;
      });
    }catch(err){
      showRoot();
      root().innerHTML='<div class="auth-fatal"><strong>Não foi possível iniciar o AllianceOS</strong><span>'+esc(err?.message||String(err))+'</span><button onclick="location.reload()">Tentar novamente</button></div>';
      finish({authenticated:false,error:String(err),client:null,session:null,context:null});
    }
  })();
})();
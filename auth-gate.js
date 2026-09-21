(function authGateClient(){
  'use strict';
  const CONFIG_URL='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
  const nativeFetch=window.fetch.bind(window);
  const bypass=location.pathname==='/oauth/consent';
  let client=null,session=null,context=null,settled=false,resolveReady;
  const ready=new Promise(r=>{resolveReady=r});
  const domReady=()=>document.readyState==='loading'?new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true})):Promise.resolve();
  function finish(v){if(!settled){settled=true;resolveReady(v)}}
  function token(){return session&&session.access_token?session.access_token:''}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function clearWorkspaceCache(){
    const keep=new Set(['central.theme','allianceos.theme']),remove=[];
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(k.startsWith('central.')||k.startsWith('allianceos.'))&&!keep.has(k))remove.push(k)}
    remove.forEach(k=>localStorage.removeItem(k));
    sessionStorage.removeItem('allianceos.rls_tasks_hydrated');
    sessionStorage.removeItem('central.__public_sync_ready');
  }
  function root(){let el=document.getElementById('allianceAuthRoot');if(!el){el=document.createElement('div');el.id='allianceAuthRoot';document.body.appendChild(el)}return el}
  function showRoot(){document.documentElement.classList.add('alliance-auth-locked');document.documentElement.classList.remove('alliance-authenticated')}
  function showApp(){document.documentElement.classList.remove('alliance-auth-pending','alliance-auth-locked');document.documentElement.classList.add('alliance-authenticated');document.getElementById('allianceAuthRoot')?.remove()}
  function setMessage(text,type='info'){const el=document.getElementById('authMessage');if(!el)return;el.textContent=text||'';el.dataset.type=type;el.hidden=!text}
  function setBusy(button,busy,label){if(!button)return;button.disabled=!!busy;if(busy){button.dataset.label=button.textContent;button.textContent=label||'Aguarde…'}else if(button.dataset.label){button.textContent=button.dataset.label;delete button.dataset.label}}
  function modeFromUrl(){return location.pathname==='/cadastro'?'signup':'login'}
  function authMarkup(mode){
    const signup=mode==='signup';
    const form=signup
      ? '<form id="authSignupForm" class="auth-form"><label>Nome completo<input id="authSignupName" autocomplete="name" maxlength="120" required placeholder="Seu nome"></label><label>E-mail<input id="authSignupEmail" type="email" autocomplete="email" required placeholder="voce@empresa.com"></label><label>Senha<input id="authSignupPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"></label><label>Confirmar senha<input id="authSignupConfirm" type="password" autocomplete="new-password" minlength="8" required placeholder="Repita a senha"></label><button class="auth-primary" id="authSignupButton" type="submit">Criar minha conta</button></form>'
      : '<form id="authLoginForm" class="auth-form"><label>E-mail<input id="authLoginEmail" type="email" autocomplete="email" required placeholder="voce@empresa.com"></label><label>Senha<div class="auth-password"><input id="authLoginPassword" type="password" autocomplete="current-password" required placeholder="Sua senha"><button id="authTogglePassword" type="button" aria-label="Mostrar senha">Mostrar</button></div></label><div class="auth-row"><label class="auth-check"><input id="authRemember" type="checkbox" checked> Manter conectado</label><button id="authForgot" class="auth-link" type="button">Esqueci minha senha</button></div><button class="auth-primary" id="authLoginButton" type="submit">Entrar</button></form>';
    return '<main class="auth-shell"><section class="auth-brand"><div class="auth-logo"><span>A</span><strong>AllianceOS</strong></div><div class="auth-brand-copy"><span class="auth-kicker">Operação Alliance</span><h1>Um lugar para organizar o trabalho de todo o time.</h1><p>Tarefas, campanhas, entregas e notificações vinculadas à pessoa certa, com histórico e permissões por usuário.</p></div><div class="auth-brand-foot"><span></span> Ambiente interno da Alliance</div></section><section class="auth-panel"><div class="auth-card"><div class="auth-card-head"><span class="auth-eyebrow">'+(signup?'Primeiro acesso':'Bem-vindo de volta')+'</span><h2>'+(signup?'Crie sua conta':'Entre no AllianceOS')+'</h2><p>'+(signup?'Use o mesmo e-mail que recebeu o convite da Alliance.':'Acesse seu espaço de trabalho com sua conta.')+'</p></div><div class="auth-tabs" role="tablist"><button type="button" data-auth-mode="login" class="'+(signup?'':'active')+'">Entrar</button><button type="button" data-auth-mode="signup" class="'+(signup?'active':'')+'">Criar conta</button></div><div id="authMessage" class="auth-message" hidden></div>'+form+'<div class="auth-divider"><span>ou</span></div><button class="auth-secondary" id="authMagicButton" type="button">'+(signup?'Receber link de acesso por e-mail':'Entrar com link por e-mail')+'</button><p class="auth-help">O cadastro é liberado apenas para e-mails convidados pela Alliance.</p></div></section></main>';
  }
  function renderAuth(mode,prefill){
    mode=mode||modeFromUrl();prefill=prefill||'';showRoot();root().innerHTML=authMarkup(mode);history.replaceState({},'',mode==='signup'?'/cadastro':'/login');
    document.querySelectorAll('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>renderAuth(b.dataset.authMode,prefill)));
    if(mode==='login'){
      const email=document.getElementById('authLoginEmail');if(email)email.value=prefill;
      document.getElementById('authTogglePassword')?.addEventListener('click',e=>{const input=document.getElementById('authLoginPassword');if(!input)return;input.type=input.type==='password'?'text':'password';e.currentTarget.textContent=input.type==='password'?'Mostrar':'Ocultar'});
      document.getElementById('authLoginForm')?.addEventListener('submit',loginPassword);
      document.getElementById('authForgot')?.addEventListener('click',forgotPassword);
    }else{
      const email=document.getElementById('authSignupEmail');if(email)email.value=prefill;
      document.getElementById('authSignupForm')?.addEventListener('submit',signupPassword);
    }
    document.getElementById('authMagicButton')?.addEventListener('click',magicLink);
  }
  function renderPending(profile){
    showRoot();const label=((profile&&profile.nome)||((session&&session.user&&session.user.email)||'?')).slice(0,1).toUpperCase();
    root().innerHTML='<main class="auth-shell"><section class="auth-brand"><div class="auth-logo"><span>A</span><strong>AllianceOS</strong></div><div class="auth-brand-copy"><span class="auth-kicker">Acesso</span><h1>Sua conta existe, mas ainda não está liberada.</h1><p>Peça a um administrador da Alliance para ativar seu usuário e definir as marcas que você pode acessar.</p></div></section><section class="auth-panel"><div class="auth-card auth-pending-card"><div class="auth-user-dot">'+esc(label)+'</div><h2>Acesso pendente</h2><p>'+esc((profile&&profile.email)||session.user.email||'')+'</p><button class="auth-secondary" id="authPendingSignout" type="button">Sair desta conta</button></div></section></main>';
    document.getElementById('authPendingSignout')?.addEventListener('click',signOut);
  }
  function renderRecovery(){
    showRoot();root().innerHTML='<main class="auth-shell"><section class="auth-brand"><div class="auth-logo"><span>A</span><strong>AllianceOS</strong></div><div class="auth-brand-copy"><span class="auth-kicker">Segurança</span><h1>Defina uma nova senha.</h1><p>Escolha uma senha com pelo menos 8 caracteres.</p></div></section><section class="auth-panel"><div class="auth-card"><div class="auth-card-head"><span class="auth-eyebrow">Recuperação</span><h2>Nova senha</h2></div><div id="authMessage" class="auth-message" hidden></div><form id="authRecoveryForm" class="auth-form"><label>Nova senha<input id="authRecoveryPassword" type="password" minlength="8" required autocomplete="new-password"></label><label>Confirmar senha<input id="authRecoveryConfirm" type="password" minlength="8" required autocomplete="new-password"></label><button class="auth-primary" id="authRecoveryButton" type="submit">Salvar nova senha</button></form></div></section></main>';
    document.getElementById('authRecoveryForm')?.addEventListener('submit',async e=>{e.preventDefault();const p=document.getElementById('authRecoveryPassword').value,c=document.getElementById('authRecoveryConfirm').value,b=document.getElementById('authRecoveryButton');if(p.length<8){setMessage('Use pelo menos 8 caracteres.','error');return}if(p!==c){setMessage('As senhas não coincidem.','error');return}setBusy(b,true,'Salvando…');const result=await client.auth.updateUser({password:p});setBusy(b,false);if(result.error){setMessage(result.error.message,'error');return}location.replace('/')});
  }
  async function conviteInfo(email){const result=await client.rpc('convite_de',{p_email:String(email||'').trim().toLowerCase()});if(result.error)throw result.error;return result.data||{}}
  async function loginPassword(e){e.preventDefault();const email=document.getElementById('authLoginEmail').value.trim().toLowerCase(),password=document.getElementById('authLoginPassword').value,b=document.getElementById('authLoginButton');if(!email||!password)return;setBusy(b,true,'Entrando…');setMessage('');const result=await client.auth.signInWithPassword({email,password});setBusy(b,false);if(result.error){setMessage(result.error.message==='Invalid login credentials'?'E-mail ou senha incorretos.':result.error.message,'error');return}location.replace('/')}
  async function signupPassword(e){
    e.preventDefault();const name=document.getElementById('authSignupName').value.trim(),email=document.getElementById('authSignupEmail').value.trim().toLowerCase(),password=document.getElementById('authSignupPassword').value,confirm=document.getElementById('authSignupConfirm').value,b=document.getElementById('authSignupButton');
    if(!name||!email)return;if(password.length<8){setMessage('Use pelo menos 8 caracteres.','error');return}if(password!==confirm){setMessage('As senhas não coincidem.','error');return}
    setBusy(b,true,'Criando conta…');setMessage('');
    try{const info=await conviteInfo(email);if(info.ja_tem_conta){renderAuth('login',email);setMessage('Este e-mail já tem conta. Entre com sua senha ou use o link por e-mail.','info');return}if(!info.convidado){setMessage('Este e-mail ainda não foi convidado para o AllianceOS.','error');return}const result=await client.auth.signUp({email,password,options:{data:{nome:name,full_name:name},emailRedirectTo:location.origin+'/'}});if(result.error)throw result.error;if(result.data&&result.data.session){location.replace('/');return}setMessage('Conta criada. Confirme o e-mail para concluir o acesso.','success')}catch(err){setMessage(err&&err.message?err.message:String(err),'error')}finally{setBusy(b,false)}
  }
  async function magicLink(){
    const input=document.getElementById('authLoginEmail')||document.getElementById('authSignupEmail'),email=input?input.value.trim().toLowerCase():'',b=document.getElementById('authMagicButton');if(!email){setMessage('Digite seu e-mail primeiro.','error');return}
    setBusy(b,true,'Enviando…');setMessage('');
    try{const info=await conviteInfo(email);if(!info.ja_tem_conta&&!info.convidado){setMessage('Este e-mail ainda não foi convidado para o AllianceOS.','error');return}const result=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+'/',shouldCreateUser:!info.ja_tem_conta&&!!info.convidado}});if(result.error)throw result.error;setMessage('Link enviado. Abra o e-mail para entrar no AllianceOS.','success')}catch(err){setMessage(err&&err.message?err.message:String(err),'error')}finally{setBusy(b,false)}
  }
  async function forgotPassword(){const input=document.getElementById('authLoginEmail'),email=input?input.value.trim().toLowerCase():'';if(!email){setMessage('Digite seu e-mail para recuperar a senha.','error');return}const result=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/login?recovery=1'});setMessage(result.error?result.error.message:'Enviamos um link para redefinir sua senha.',result.error?'error':'success')}
  async function signOut(){try{if(client)await client.auth.signOut()}catch{}clearWorkspaceCache();location.replace('/login')}
  async function loadContext(){const result=await client.rpc('meu_acesso');if(result.error)throw result.error;return result.data||{}}
  function exposeIdentity(ctx){const p=ctx&&ctx.perfil?ctx.perfil:{},first=String(p.nome||session.user.email||'Equipe').trim().split(/\s+/)[0]||'Equipe';window.AllianceOSSession={user:session.user,profile:p,brands:ctx.marcas||[]};window.user={id:session.user.id,email:session.user.email,firstName:first,name:p.nome||first};window.CentralEu={id:session.user.id,email:session.user.email,nome:p.nome||first,papel:p.papel||'membro'}}
  async function acceptSession(s){
    session=s||null;if(!session){clearWorkspaceCache();renderAuth();finish({authenticated:false,client:client,session:null,context:null});return}
    const recovery=location.hash.indexOf('type=recovery')>=0||new URLSearchParams(location.search).get('recovery')==='1';if(recovery){renderRecovery();finish({authenticated:true,recovery:true,client:client,session:session,context:null});return}
    try{context=await loadContext()}catch(err){console.warn('[AllianceOS auth context]',err);context=null}
    const profile=context&&context.perfil?context.perfil:null;if(!profile||!profile.ativo||profile.tipo_membro==='servico'||profile.papel==='externo'){renderPending(profile);finish({authenticated:false,pending:true,client:client,session:session,context:context});return}
    exposeIdentity(context);showApp();if(location.pathname==='/login'||location.pathname==='/cadastro')history.replaceState({},'','/');finish({authenticated:true,client:client,session:session,context:context});window.dispatchEvent(new CustomEvent('allianceos:auth',{detail:{user:session.user,profile:profile,brands:context.marcas||[]}}));
  }
  window.AllianceOSAuth={ready:ready,get client(){return client},session:()=>session,context:()=>context,getAccessToken:()=>token(),signOut:signOut,clearWorkspaceCache:clearWorkspaceCache};
  window.fetch=async function(input,init){init=init||{};let url;try{url=new URL(input instanceof Request?input.url:String(input),location.href)}catch{return nativeFetch(input,init)}if(url.origin===location.origin&&url.pathname.startsWith('/api/')){await ready;const access=token();if(access){const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined)||{});if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+access);init=Object.assign({},init,{headers:headers})}}return nativeFetch(input,init)};
  if(bypass){document.documentElement.classList.remove('alliance-auth-pending');finish({authenticated:false,bypass:true,client:null,session:null,context:null});return}
  (async()=>{try{const cfgRes=await nativeFetch(CONFIG_URL,{cache:'no-store'});if(!cfgRes.ok)throw new Error('Não foi possível carregar a configuração do AllianceOS.');const cfg=await cfgRes.json();const mod=await import('https://esm.sh/@supabase/supabase-js@2.116.0');client=mod.createClient(cfg.url,cfg.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const result=await client.auth.getSession();await domReady();await acceptSession(result.data.session);client.auth.onAuthStateChange((event,next)=>{if(event==='SIGNED_OUT'){clearWorkspaceCache();location.replace('/login');return}if(event==='PASSWORD_RECOVERY'){session=next;renderRecovery();return}session=next})}catch(err){showRoot();root().innerHTML='<div class="auth-fatal"><strong>Não foi possível iniciar o AllianceOS</strong><span>'+esc(err&&err.message?err.message:String(err))+'</span><button onclick="location.reload()">Tentar novamente</button></div>';finish({authenticated:false,error:String(err),client:null,session:null,context:null})}})();
})();
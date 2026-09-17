(() => {
  'use strict';
  const SB_URL = '__SUPABASE_URL__';
  const SB_ANON = '__SUPABASE_ANON__';
  const SESSION_KEY = 'allianceos.auth.session';
  let current = null;
  let readyResolve;
  window.ALLIANCE_AUTH_READY = new Promise((resolve) => { readyResolve = resolve; });

  const q = (s, root = document) => root.querySelector(s);
  const save = (s) => { current = s; if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); };
  const load = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } };

  async function call(path, opts = {}) {
    const headers = { apikey: SB_ANON, 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const r = await fetch(`${SB_URL}${path}`, { ...opts, headers, cache: 'no-store' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.msg || data?.error_description || data?.error || `HTTP ${r.status}`);
    return data;
  }

  async function getUser(token) {
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!r.ok) return null;
    return r.json();
  }

  async function getProfile(userId, token) {
    const url = `${SB_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,papel,ativo,nome`;
    const r = await fetch(url, { headers: { apikey: SB_ANON, Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store' });
    if (!r.ok) return null;
    const rows = await r.json().catch(() => []);
    return Array.isArray(rows) ? rows[0] || null : null;
  }

  async function refresh(session) {
    if (!session?.refresh_token) return null;
    try {
      const data = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
      const next = { ...data, expires_at: Math.floor(Date.now()/1000) + Number(data.expires_in || 3600) };
      save(next); return next;
    } catch { save(null); return null; }
  }

  function release(session, user, profile) {
    current = session;
    document.documentElement.classList.remove('alliance-auth-locked');
    document.getElementById('alliance-auth-root')?.remove();
    document.body?.classList.remove('alliance-auth-open');
    const payload = { accessToken: session?.access_token || '', refreshToken: session?.refresh_token || '', user: user || null, profile: profile || null };
    if (readyResolve) { readyResolve(payload); readyResolve = null; }
    window.dispatchEvent(new CustomEvent('alliance-auth-ready', { detail: payload }));
  }

  async function authorize(session, fallbackUser = null) {
    const user = fallbackUser || await getUser(session?.access_token || '');
    if (!user) throw new Error('Sessão inválida. Entre novamente.');
    const profile = await getProfile(user.id, session.access_token);
    if (!profile?.ativo) throw new Error('Sua conta ainda não foi liberada para o AllianceOS. Peça acesso ao administrador.');
    save(session); release(session, user, profile); return true;
  }

  function logout() {
    const token = current?.access_token;
    if (token) fetch(`${SB_URL}/auth/v1/logout`, { method:'POST', headers:{ apikey:SB_ANON, Authorization:`Bearer ${token}` } }).catch(()=>{});
    save(null); location.reload();
  }

  window.ALLIANCE_AUTH = {
    anonKey: SB_ANON,
    getAccessToken: () => current?.access_token || '',
    getSession: () => current,
    logout,
  };

  function artPanel() {
    return `<aside class="auth-art" aria-hidden="true">
      <div class="auth-art-grid"></div>
      <div class="auth-art-copy"><div class="auth-art-mark">✱</div><span>AllianceOS</span></div>
      <div class="auth-quote">“Operação, marketing e dados em um único lugar — com clareza para decidir e velocidade para executar.”</div>
      <div class="auth-preview">
        <div class="auth-preview-top"><span class="auth-preview-logo">✱</span><span class="auth-preview-search">Buscar…</span><span class="auth-preview-avatar"></span></div>
        <div class="auth-preview-kicker">Visão da operação</div><div class="auth-preview-title">Alliance Overview</div>
        <div class="auth-preview-cards"><i></i><i></i><i></i></div><div class="auth-preview-chart"><b></b><b></b><b></b><b></b><b></b></div>
      </div>
    </aside>`;
  }

  function form(mode = 'login') {
    const signup = mode === 'signup';
    return `<div class="auth-form-wrap" data-mode="${signup?'signup':'login'}">
      <div class="auth-brand"><span>✱</span><strong>AllianceOS</strong></div>
      <div class="auth-form-card">
        <div class="auth-form-head"><h1>${signup?'Crie sua conta':'Bem-vindo de volta.'}</h1><p>${signup?'Use seu e-mail corporativo para entrar no espaço da Alliance.':'Entre para continuar no AllianceOS.'}</p></div>
        <form id="allianceAuthForm" autocomplete="on">
          ${signup?`<div class="auth-two"><label>Nome<input name="first_name" autocomplete="given-name" required placeholder="Seu nome"></label><label>Sobrenome<input name="last_name" autocomplete="family-name" required placeholder="Seu sobrenome"></label></div>`:''}
          <label>E-mail<input type="email" name="email" autocomplete="email" required placeholder="seu@email.com"></label>
          <label>Senha<div class="auth-password"><input type="password" name="password" minlength="8" autocomplete="${signup?'new-password':'current-password'}" required placeholder="${signup?'Crie uma senha':'Sua senha'}"><button type="button" id="authTogglePassword" aria-label="Mostrar senha">◉</button></div></label>
          ${signup?`<label class="auth-terms"><input type="checkbox" required><span>Eu concordo com os termos de uso e a política de privacidade.</span></label>`:''}
          <button class="auth-primary" type="submit">${signup?'Criar conta':'Entrar'}</button>
          <button class="auth-google" type="button" id="authGoogle"><span>G</span> Continuar com Google</button>
          <div id="authMessage" class="auth-message" role="status"></div>
        </form>
        <div class="auth-switch">${signup?'Já tem uma conta?':'Ainda não tem conta?'} <button type="button" id="authSwitch">${signup?'Entrar':'Criar conta'}</button></div>
      </div>
    </div>`;
  }

  function show(mode = 'login') {
    document.documentElement.classList.add('alliance-auth-locked');
    document.body?.classList.add('alliance-auth-open');
    let root = document.getElementById('alliance-auth-root');
    if (!root) { root = document.createElement('div'); root.id = 'alliance-auth-root'; document.body.appendChild(root); }
    root.innerHTML = `<div class="auth-shell">${form(mode)}${artPanel()}</div>`;
    const f = q('#allianceAuthForm', root), msg = q('#authMessage', root);
    q('#authSwitch', root)?.addEventListener('click', () => show(mode === 'login' ? 'signup' : 'login'));
    q('#authTogglePassword', root)?.addEventListener('click', () => { const i=q('input[name=password]',root); i.type=i.type==='password'?'text':'password'; });
    q('#authGoogle', root)?.addEventListener('click', () => {
      const redirect = encodeURIComponent(location.origin + location.pathname + location.search);
      location.href = `${SB_URL}/auth/v1/authorize?provider=google&redirect_to=${redirect}`;
    });
    f?.addEventListener('submit', async (e) => {
      e.preventDefault(); msg.textContent='';
      const fd = new FormData(f); const email=String(fd.get('email')||'').trim().toLowerCase(); const password=String(fd.get('password')||'');
      const btn=q('.auth-primary',root); btn.disabled=true; btn.textContent='Aguarde…';
      try {
        let data;
        if (mode === 'signup') {
          const first=String(fd.get('first_name')||'').trim(), last=String(fd.get('last_name')||'').trim();
          data = await call('/auth/v1/signup', { method:'POST', body:JSON.stringify({ email, password, data:{ nome:`${first} ${last}`.trim(), full_name:`${first} ${last}`.trim() } }) });
          if (!data?.access_token) { msg.textContent='Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.'; return; }
        } else {
          data = await call('/auth/v1/token?grant_type=password', { method:'POST', body:JSON.stringify({ email, password }) });
        }
        const session = { ...data, expires_at: Math.floor(Date.now()/1000) + Number(data.expires_in || 3600) };
        await authorize(session, data.user || null);
      } catch (err) { save(null); msg.textContent = err?.message || 'Não foi possível entrar.'; }
      finally { btn.disabled=false; btn.textContent=mode==='signup'?'Criar conta':'Entrar'; }
    });
  }

  async function init() {
    const hash = new URLSearchParams(location.hash.replace(/^#/,''));
    if (hash.get('access_token')) {
      const s = { access_token:hash.get('access_token'), refresh_token:hash.get('refresh_token'), expires_in:Number(hash.get('expires_in')||3600), expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600), token_type:'bearer' };
      save(s); history.replaceState(null,'',location.pathname+location.search);
    }
    let session = load();
    if (session?.expires_at && session.expires_at < Math.floor(Date.now()/1000)+30) session = await refresh(session);
    if (session?.access_token) {
      try { await authorize(session); return; } catch { save(null); }
    }
    show('login');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
})();

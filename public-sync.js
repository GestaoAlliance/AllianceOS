(() => {
  'use strict';

  const ENDPOINT = 'https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-state';
  const PREFIXES = ['central.', 'allianceos.'];
  const LOCAL_ONLY = new Set([
    'central.theme', 'allianceos.theme',
    'central.__public_sync_reload', 'allianceos.__public_sync_reload',
    'central.__public_sync_ready', 'allianceos.__public_sync_ready'
  ]);
  const RLS_KEYS = new Set(['central.tasks.vitor-gutierrez','allianceos.tasks.vitor-gutierrez']);
  function authToken(){
    try{
      const raw=localStorage.getItem('sb-lpnyrzsdiyzjnhovpduk-auth-token');
      if(!raw)return '';
      const parsed=JSON.parse(raw);
      return parsed?.access_token||parsed?.currentSession?.access_token||'';
    }catch{return ''}
  }
  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;
  // Tarefas não podem continuar visíveis em cache para um navegador sem sessão.
  if(!authToken()) for(const key of RLS_KEYS) rawRemove.call(localStorage,key);
  const pending = new Set();
  const timers = new Map();
  const base = new Map();
  let ready = false;
  let checking = false;

  const hasPrefix = (key) => typeof key === 'string' && PREFIXES.some((p) => key.startsWith(p));
  const belongs = (key) => hasPrefix(key) && !LOCAL_ONLY.has(key) && !String(key).includes('.__');
  const parseValue = (text) => { try { return JSON.parse(text); } catch { return text; } };
  const serialize = (value) => JSON.stringify(value);
  const equalRaw = (a, b) => String(a ?? '') === String(b ?? '');

  // Builds publicados nas primeiras horas do AllianceOS usaram allianceos.*.
  // O banco legado usa central.*. Copiamos localmente apenas quando a chave
  // canônica ainda não existe, para não perder nada criado antes da correção.
  function migrateLocalAliases() {
    const copies = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('allianceos.')) continue;
      const canonical = 'central.' + key.slice('allianceos.'.length);
      if (localStorage.getItem(canonical) == null) copies.push([canonical, localStorage.getItem(key)]);
    }
    for (const [key, value] of copies) if (value != null) rawSet.call(localStorage, key, value);
  }
  migrateLocalAliases();

  async function request(options = {}) {
    const token=authToken();
    const headers={...(options.headers||{})};
    if(token)headers.Authorization='Bearer '+token;
    const res = await fetch(ENDPOINT, { cache: 'no-store', ...options, headers });
    if (!res.ok) throw new Error(`Supabase respondeu ${res.status}`);
    const data = await res.json();
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function showUpdateNotice() {
    if (!document.body || document.getElementById('allianceos-sync-notice')) return;
    const el = document.createElement('div');
    el.id = 'allianceos-sync-notice';
    el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:10px;background:#121415;color:#fff;padding:10px 12px 10px 15px;border-radius:999px;font:500 12px/1.2 Inter,system-ui,sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.25)';
    el.innerHTML = '<span>Há atualizações feitas por outra pessoa.</span><button type="button" style="border:0;border-radius:999px;padding:7px 12px;background:#fff;color:#121415;font:700 12px Inter,system-ui,sans-serif;cursor:pointer">Atualizar</button><button type="button" aria-label="Fechar" style="border:0;background:transparent;color:#aaa;font-size:16px;cursor:pointer">×</button>';
    el.children[1].addEventListener('click', () => location.reload());
    el.children[2].addEventListener('click', () => el.remove());
    document.body.appendChild(el);
  }

  async function saveKey(key, rawValue) {
    if (!belongs(key)) return;
    const payload = { chave: key, valor: parseValue(rawValue), base: base.has(key) ? base.get(key) : undefined };
    const data = await request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (data?.item) {
      base.set(key, data.item.valor);
      const mergedRaw = serialize(data.item.valor);
      if (!equalRaw(localStorage.getItem(key), mergedRaw)) {
        rawSet.call(localStorage, key, mergedRaw);
        showUpdateNotice();
      }
    }
  }

  function scheduleSave(key, rawValue) {
    if (!belongs(key)) return;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => {
      timers.delete(key);
      saveKey(key, rawValue).catch((e) => console.error('[AllianceOS sync] falha ao salvar', key, e));
    }, 180));
  }

  async function deleteKey(key) {
    if (!belongs(key)) return;
    await request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: key, deleted: true, base: base.get(key) }) });
    base.delete(key);
  }

  Storage.prototype.setItem = function(key, value) {
    rawSet.call(this, key, value);
    if (this !== localStorage || !belongs(key)) return;
    if (!ready) { pending.add(key); return; }
    scheduleSave(key, value);
  };

  Storage.prototype.removeItem = function(key) {
    rawRemove.call(this, key);
    if (this !== localStorage || !belongs(key)) return;
    pending.delete(key);
    if (!ready) return;
    deleteKey(key).catch((e) => console.error('[AllianceOS sync] falha ao apagar', key, e));
  };

  async function hydrate() {
    const data = await request();
    const rows = Array.isArray(data?.items) ? data.items : [];
    const remote = new Map(rows.map((row) => [row.chave, row.valor]));
    let changed = false;

    for (const [key, value] of remote) {
      if (!belongs(key)) continue;
      base.set(key, value);
      const wanted = serialize(value);
      if (!equalRaw(localStorage.getItem(key), wanted)) {
        rawSet.call(localStorage, key, wanted);
        changed = true;
      }
    }

    // Se existe uma cópia transitória remota allianceos.X e não existe a
    // canônica central.X, cria a canônica no navegador e a envia ao banco.
    for (const [key, value] of remote) {
      if (!key.startsWith('allianceos.')) continue;
      const canonical = 'central.' + key.slice('allianceos.'.length);
      if (!remote.has(canonical) && localStorage.getItem(canonical) == null) {
        rawSet.call(localStorage, canonical, serialize(value));
        pending.add(canonical);
      }
    }

    ready = true;
    rawSet.call(sessionStorage, 'central.__public_sync_ready', '1');

    const seed = new Set(pending);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (belongs(key) && !remote.has(key) && (!RLS_KEYS.has(key) || !!authToken())) seed.add(key);
    }
    pending.clear();
    for (const key of seed) {
      if (remote.has(key)) continue;
      const value = localStorage.getItem(key);
      if (value != null) scheduleSave(key, value);
    }

    if (changed && sessionStorage.getItem('central.__public_sync_reload') !== '1') {
      sessionStorage.setItem('central.__public_sync_reload', '1');
      setTimeout(() => location.reload(), 30);
    } else {
      sessionStorage.removeItem('central.__public_sync_reload');
    }
  }

  async function checkRemote() {
    if (!ready || checking || document.hidden) return;
    checking = true;
    try {
      const data = await request();
      const rows = Array.isArray(data?.items) ? data.items : [];
      const seen = new Set();
      let changed = false;
      for (const row of rows) {
        const key = row.chave;
        if (!belongs(key)) continue;
        seen.add(key);
        const remoteRaw = serialize(row.valor);
        const localRaw = localStorage.getItem(key);
        if (!equalRaw(localRaw, remoteRaw) && !timers.has(key)) {
          base.set(key, row.valor);
          rawSet.call(localStorage, key, remoteRaw);
          changed = true;
        }
      }
      for (const key of [...base.keys()]) {
        if (!seen.has(key) && belongs(key) && !timers.has(key)) {
          base.delete(key);
          rawRemove.call(localStorage, key);
          changed = true;
        }
      }
      if (changed) showUpdateNotice();
    } catch (e) {
      console.warn('[AllianceOS sync] falha ao verificar atualizacoes', e);
    } finally { checking = false; }
  }

  window.AllianceOSStateSync={
    ready:()=>ready,
    async save(key,value){
      if(!belongs(key))throw new Error('Chave fora do escopo sincronizado: '+key);
      const raw=serialize(value);
      rawSet.call(localStorage,key,raw);
      if(!ready){pending.add(key);throw new Error('Sincronização ainda não está pronta. Tente novamente em instantes.')}
      await saveKey(key,raw);
      return {ok:true,key};
    }
  };

  hydrate().catch((e) => {
    ready = true;
    pending.clear();
    console.error('[AllianceOS sync] Supabase indisponivel; usando apenas este navegador', e);
  });

  setInterval(checkRemote, 20000);
  addEventListener('focus', checkRemote);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkRemote(); });
})();

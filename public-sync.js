(() => {
  'use strict';

  if(location.pathname==='/oauth/consent') return;
  const ENDPOINT = 'https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-state';
  const SYNC_VERSION = '2';
  const VERSIONS_KEY = 'central.__public_sync_versions';
  const authReady=async()=>{try{if(window.AllianceOSAuth?.ready)await window.AllianceOSAuth.ready}catch{}return authToken()};
  const PREFIXES = ['central.', 'allianceos.'];
  const LOCAL_ONLY = new Set([
    'central.theme', 'allianceos.theme',
    'central.__public_sync_reload', 'allianceos.__public_sync_reload',
    'central.__public_sync_ready', 'allianceos.__public_sync_ready',
    VERSIONS_KEY
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
  if(!authToken()) for(const key of RLS_KEYS) rawRemove.call(localStorage,key);

  const pending = new Set();
  const timers = new Map();
  const base = new Map();
  let ready = false;
  let checking = false;
  let lastRemoteCheck = 0;
  let versions = loadVersions();

  const hasPrefix = (key) => typeof key === 'string' && PREFIXES.some((p) => key.startsWith(p));
  const belongs = (key) => hasPrefix(key) && !LOCAL_ONLY.has(key) && !String(key).includes('.__');
  const parseValue = (text) => { try { return JSON.parse(text); } catch { return text; } };
  const serialize = (value) => JSON.stringify(value);
  const equalRaw = (a, b) => String(a ?? '') === String(b ?? '');

  function loadVersions(){
    try{
      const parsed=JSON.parse(localStorage.getItem(VERSIONS_KEY)||'{}');
      return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
    }catch{return {}}
  }
  function saveVersions(){
    try{rawSet.call(localStorage,VERSIONS_KEY,JSON.stringify(versions))}catch{}
  }
  function setVersion(key,value){
    if(value) versions[key]=String(value);
    else delete versions[key];
    saveVersions();
  }

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

  async function request(query = '', options = {}) {
    const token=await authReady();
    if(!token)throw new Error('authentication_required');
    const headers={...(options.headers||{}),'X-Alliance-Sync-Version':SYNC_VERSION};
    if(token)headers.Authorization='Bearer '+token;
    const res = await fetch(ENDPOINT + query, { cache: 'no-store', ...options, headers });
    if (!res.ok) {
      const body=await res.json().catch(()=>({}));
      throw new Error(body?.error||`Supabase respondeu ${res.status}`);
    }
    const data = await res.json();
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function showUpdateNotice() {
    // A sincronização já aplica o valor remoto no localStorage em tempo real.
    // Não interromper a operação com um pedido redundante de recarregar a página.
    document.getElementById('allianceos-sync-notice')?.remove();
  }

  function applyRemoteRow(row,{notice=false}={}){
    if(!row||!belongs(row.chave)||!Object.prototype.hasOwnProperty.call(row,'valor'))return false;
    const key=row.chave;
    const wanted=serialize(row.valor);
    const changed=!equalRaw(localStorage.getItem(key),wanted);
    base.set(key,row.valor);
    if(row.atualizado_em)setVersion(key,row.atualizado_em);
    if(changed){
      rawSet.call(localStorage,key,wanted);
      if(notice)showUpdateNotice();
    }
    return changed;
  }

  async function fetchRemoteKey(key){
    const data=await request('?key='+encodeURIComponent(key));
    if(data?.item&&data.item.chave===key)return data.item;
    // Compatibilidade durante a troca da Edge Function: a versão antiga
    // ignorava ?key= e devolvia a coleção inteira.
    const rows=Array.isArray(data?.items)?data.items:[];
    return rows.find(row=>row?.chave===key)||null;
  }

  async function saveKey(key, rawValue) {
    if (!belongs(key)) return;
    const mine=parseValue(rawValue);
    const payload = { chave: key, valor: mine, base: base.has(key) ? base.get(key) : undefined };
    const data = await request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!data?.item) return;
    if(Object.prototype.hasOwnProperty.call(data.item,'valor')){
      base.set(key, data.item.valor);
      const mergedRaw = serialize(data.item.valor);
      if (!equalRaw(localStorage.getItem(key), mergedRaw)) {
        rawSet.call(localStorage, key, mergedRaw);
        showUpdateNotice();
      }
    }else{
      // Resposta v2 leve: o servidor confirmou exatamente o valor enviado.
      base.set(key,mine);
    }
    if(data.item.atualizado_em)setVersion(key,data.item.atualizado_em);
  }

  function scheduleSave(key, rawValue) {
    if (!belongs(key)) return;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => {
      timers.delete(key);
      saveKey(key, rawValue).catch((e) => console.error('[AllianceOS sync] falha ao salvar', key, e));
    }, 300));
  }

  async function deleteKey(key) {
    if (!belongs(key)) return;
    await request('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: key, deleted: true, base: base.get(key) }) });
    base.delete(key);
    setVersion(key,null);
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
    const token=await authReady();
    if(!token){ready=true;pending.clear();return;}

    const data = await request('?mode=meta');
    const rows = Array.isArray(data?.items) ? data.items : [];
    const legacyBulk = rows.some(row=>Object.prototype.hasOwnProperty.call(row||{},'valor'));
    const remoteKeys = new Set();
    let changed = false;

    if(legacyBulk){
      // Janela curta de compatibilidade enquanto o frontend novo entra no ar
      // antes da Edge Function v2. Aproveita o único payload cheio e não faz
      // novas leituras por chave.
      for(const row of rows){
        if(!belongs(row?.chave))continue;
        remoteKeys.add(row.chave);
        changed=applyRemoteRow(row)||changed;
      }
    }else{
      for(const meta of rows){
        const key=meta?.chave;
        if(!belongs(key))continue;
        remoteKeys.add(key);
        const localRaw=localStorage.getItem(key);
        const currentVersion=versions[key]||'';
        const remoteVersion=String(meta?.atualizado_em||'');
        if(localRaw!=null&&currentVersion&&currentVersion===remoteVersion){
          base.set(key,parseValue(localRaw));
          continue;
        }
        const row=await fetchRemoteKey(key);
        if(row)changed=applyRemoteRow(row)||changed;
      }
    }

    // Se existe uma cópia transitória remota allianceos.X e não existe a
    // canônica central.X, cria a canônica no navegador e a envia ao banco.
    for (const key of [...remoteKeys]) {
      if (!key.startsWith('allianceos.')) continue;
      const canonical = 'central.' + key.slice('allianceos.'.length);
      if (!remoteKeys.has(canonical) && localStorage.getItem(canonical) == null) {
        const legacyRaw=localStorage.getItem(key);
        if(legacyRaw!=null){
          rawSet.call(localStorage, canonical, legacyRaw);
          pending.add(canonical);
        }
      }
    }

    ready = true;
    rawSet.call(sessionStorage, 'central.__public_sync_ready', '1');

    const seed = new Set(pending);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (belongs(key) && !remoteKeys.has(key) && (!RLS_KEYS.has(key) || !!authToken())) seed.add(key);
    }
    pending.clear();
    for (const key of seed) {
      if (remoteKeys.has(key)) continue;
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
    const now=Date.now();
    if (!ready || checking || document.hidden || !authToken() || now-lastRemoteCheck<15000) return;
    checking = true;
    lastRemoteCheck=now;
    try {
      const data = await request('?mode=meta');
      const rows = Array.isArray(data?.items) ? data.items : [];
      const legacyBulk = rows.some(row=>Object.prototype.hasOwnProperty.call(row||{},'valor'));
      let changed = false;

      if(legacyBulk){
        for(const row of rows){
          if(!belongs(row?.chave)||timers.has(row.chave))continue;
          const remoteRaw=serialize(row.valor);
          if(!equalRaw(localStorage.getItem(row.chave),remoteRaw)){
            changed=applyRemoteRow(row)||changed;
          }else{
            base.set(row.chave,row.valor);
            if(row.atualizado_em)setVersion(row.chave,row.atualizado_em);
          }
        }
      }else{
        for(const meta of rows){
          const key=meta?.chave;
          if(!belongs(key)||timers.has(key))continue;
          const remoteVersion=String(meta?.atualizado_em||'');
          if(remoteVersion&&versions[key]===remoteVersion)continue;
          const row=await fetchRemoteKey(key);
          if(!row)continue;
          const remoteRaw=serialize(row.valor);
          if(!equalRaw(localStorage.getItem(key),remoteRaw))changed=true;
          applyRemoteRow(row);
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
    },
    async refresh(key){
      if(!belongs(key))throw new Error('Chave fora do escopo sincronizado: '+key);
      const row=await fetchRemoteKey(key);
      if(row)applyRemoteRow(row);
      return row;
    }
  };

  hydrate().catch((e) => {
    ready = true;
    pending.clear();
    console.error('[AllianceOS sync] Supabase indisponivel; usando apenas este navegador', e);
  });

  // Antes eram 7+ MB a cada 20 s. Agora o intervalo consulta somente
  // metadados (chave + versão) e baixa uma chave apenas quando ela mudou.
  setInterval(checkRemote, 120000);
  addEventListener('focus', checkRemote);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkRemote(); });
})();

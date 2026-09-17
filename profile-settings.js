(() => {
  'use strict';

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = (name='') => String(name).trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'U';
  const auth = () => window.ALLIANCE_AUTH;
  const token = () => auth()?.getAccessToken?.() || '';
  const sbUrl = () => auth()?.url || '';
  const sbKey = () => auth()?.anonKey || '';
  const headers = (extra={}) => ({ apikey: sbKey(), Authorization: `Bearer ${token()}`, ...extra });

  async function json(url, opts={}) {
    const r = await fetch(url, { cache:'no-store', ...opts });
    const data = await r.json().catch(()=>null);
    if (!r.ok) throw new Error(data?.message || data?.error_description || data?.error || `HTTP ${r.status}`);
    return data;
  }

  async function loadProfile() {
    const user = auth()?.getUser?.();
    if (!user?.id) throw new Error('Sessão não encontrada.');
    const [rows, areas, brandLinks] = await Promise.all([
      json(`${sbUrl()}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,nome,email,foto_url,papel,ativo,area_id,cargo`, { headers: headers({Accept:'application/json'}) }),
      json(`${sbUrl()}/rest/v1/areas?select=id,nome&order=nome.asc`, { headers: headers({Accept:'application/json'}) }).catch(()=>[]),
      json(`${sbUrl()}/rest/v1/profile_brands?profile_id=eq.${encodeURIComponent(user.id)}&select=brand_id,brands(nome)`, { headers: headers({Accept:'application/json'}) }).catch(()=>[])
    ]);
    return { profile: Array.isArray(rows) ? rows[0] : null, areas: areas || [], brandLinks: brandLinks || [], user };
  }

  function setSidebarProfile(p) {
    if (!p) return;
    const root = document.querySelector('.sidebar .profile');
    if (!root) return;
    root.classList.add('alliance-profile-trigger');
    root.setAttribute('role','button');
    root.setAttribute('tabindex','0');
    root.setAttribute('aria-label','Abrir meu perfil');
    const av = root.querySelector('.avatar');
    if (av) {
      av.innerHTML = p.foto_url ? `<img src="${esc(p.foto_url)}" alt="">` : esc(initials(p.nome));
    }
    const b = root.querySelector('b'); if (b) b.textContent = p.nome || 'Meu perfil';
    const s = root.querySelector('span'); if (s) s.textContent = p.cargo || p.papel || 'Perfil';
  }

  function ensureRoot() {
    let root = document.getElementById('allianceProfileModal');
    if (!root) {
      root = document.createElement('div');
      root.id = 'allianceProfileModal';
      document.body.appendChild(root);
    }
    return root;
  }

  async function uploadAvatar(file, userId) {
    if (!file) return null;
    if (!file.type.startsWith('image/')) throw new Error('Escolha uma imagem válida.');
    if (file.size > 5 * 1024 * 1024) throw new Error('A foto precisa ter no máximo 5 MB.');
    const path = `${encodeURIComponent(userId)}/avatar`;
    const r = await fetch(`${sbUrl()}/storage/v1/object/profile-avatars/${path}`, {
      method:'POST',
      headers: headers({ 'Content-Type': file.type, 'x-upsert':'true' }),
      body:file
    });
    if (!r.ok) {
      const d = await r.json().catch(()=>({}));
      throw new Error(d?.message || d?.error || 'Não consegui enviar a foto.');
    }
    return `${sbUrl()}/storage/v1/object/public/profile-avatars/${path}?v=${Date.now()}`;
  }

  async function saveProfile({ nome, cargo, area_id, foto_url }) {
    const body = { p_nome:nome, p_cargo:cargo || null, p_area_id:area_id || null, p_foto_url:foto_url || null };
    return json(`${sbUrl()}/rest/v1/rpc/atualizar_meu_perfil`, {
      method:'POST', headers: headers({'Content-Type':'application/json'}), body:JSON.stringify(body)
    });
  }

  async function openProfile() {
    const root = ensureRoot();
    root.className = 'apm open';
    root.innerHTML = `<div class="apm-backdrop" data-close></div><section class="apm-panel" role="dialog" aria-modal="true" aria-label="Meu perfil"><div class="apm-loading">Carregando seu perfil…</div></section>`;
    root.querySelector('[data-close]')?.addEventListener('click', closeProfile);

    try {
      const { profile:p, areas, brandLinks, user } = await loadProfile();
      if (!p) throw new Error('Perfil não encontrado.');
      setSidebarProfile(p);
      const brands = brandLinks.map(x => x?.brands?.nome).filter(Boolean);
      const panel = root.querySelector('.apm-panel');
      panel.innerHTML = `
        <header class="apm-head"><div><span class="apm-kicker">Conta AllianceOS</span><h2>Meu perfil</h2><p>Atualize como você aparece para a equipe.</p></div><button class="apm-close" data-close aria-label="Fechar">×</button></header>
        <form id="allianceProfileForm">
          <div class="apm-identity">
            <label class="apm-avatar-edit" for="apmAvatarInput">
              <span class="apm-avatar-preview">${p.foto_url ? `<img src="${esc(p.foto_url)}" alt="">` : esc(initials(p.nome))}</span>
              <span class="apm-avatar-action">Alterar foto</span>
              <input id="apmAvatarInput" type="file" accept="image/*" hidden>
            </label>
            <div class="apm-who"><strong>${esc(p.nome || '')}</strong><span>${esc(p.email || user.email || '')}</span><div class="apm-tags"><i>${esc(p.papel || 'membro')}</i>${brands.map(b=>`<i>${esc(b)}</i>`).join('')}</div></div>
          </div>
          <div class="apm-grid">
            <label><span>Nome</span><input name="nome" value="${esc(p.nome || '')}" required></label>
            <label><span>Cargo</span><input name="cargo" value="${esc(p.cargo || '')}" placeholder="Ex.: Gestor de Operações"></label>
            <label class="apm-wide"><span>Área</span><select name="area_id"><option value="">Sem área definida</option>${areas.map(a=>`<option value="${esc(a.id)}" ${a.id===p.area_id?'selected':''}>${esc(a.nome)}</option>`).join('')}</select></label>
            <label class="apm-wide apm-readonly"><span>E-mail</span><input value="${esc(p.email || user.email || '')}" disabled><small>O e-mail da conta não é alterado por esta tela.</small></label>
          </div>
          <div class="apm-message" id="apmMessage" role="status"></div>
          <footer class="apm-actions"><button type="button" class="apm-logout" id="apmLogout">Sair da conta</button><div><button type="button" class="apm-secondary" data-close>Cancelar</button><button type="submit" class="apm-primary">Salvar alterações</button></div></footer>
        </form>`;

      panel.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', closeProfile));
      panel.querySelector('#apmLogout')?.addEventListener('click', () => auth()?.logout?.());

      const fileInput = panel.querySelector('#apmAvatarInput');
      let newFile = null;
      let currentPhoto = p.foto_url || '';
      fileInput?.addEventListener('change', () => {
        const f = fileInput.files?.[0]; if (!f) return;
        newFile = f;
        const preview = panel.querySelector('.apm-avatar-preview');
        if (preview) preview.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="Prévia da foto">`;
      });

      panel.querySelector('#allianceProfileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const msg = panel.querySelector('#apmMessage');
        const btn = form.querySelector('.apm-primary');
        btn.disabled = true; btn.textContent = 'Salvando…'; msg.textContent = '';
        try {
          if (newFile) currentPhoto = await uploadAvatar(newFile, user.id);
          const fd = new FormData(form);
          const nome = String(fd.get('nome')||'').trim();
          if (!nome) throw new Error('Informe seu nome.');
          await saveProfile({ nome, cargo:String(fd.get('cargo')||'').trim(), area_id:String(fd.get('area_id')||''), foto_url:currentPhoto });
          const fresh = await loadProfile();
          setSidebarProfile(fresh.profile);
          auth()?.setProfile?.(fresh.profile);
          msg.textContent = 'Perfil atualizado.';
          msg.classList.add('success');
          setTimeout(closeProfile, 650);
        } catch(err) {
          msg.classList.remove('success'); msg.textContent = err?.message || 'Não consegui salvar seu perfil.';
        } finally { btn.disabled=false; btn.textContent='Salvar alterações'; }
      });
    } catch(err) {
      root.querySelector('.apm-panel').innerHTML = `<div class="apm-error"><strong>Não consegui abrir seu perfil.</strong><p>${esc(err?.message || '')}</p><button data-close>Fechar</button></div>`;
      root.querySelector('[data-close]')?.addEventListener('click', closeProfile);
    }
  }

  function closeProfile() { document.getElementById('allianceProfileModal')?.classList.remove('open'); }

  async function bind() {
    try {
      await window.ALLIANCE_AUTH_READY;
      const { profile } = await loadProfile();
      setSidebarProfile(profile);
      const attach = () => {
        const p = document.querySelector('.sidebar .profile');
        if (!p || p.dataset.allianceProfileBound) return;
        p.dataset.allianceProfileBound = '1';
        p.addEventListener('click', openProfile);
        p.addEventListener('keydown', e => { if (e.key==='Enter' || e.key===' ') { e.preventDefault(); openProfile(); } });
      };
      attach();
      new MutationObserver(attach).observe(document.body,{subtree:true,childList:true});
    } catch {}
  }

  window.ALLIANCE_PROFILE = { open:openProfile, close:closeProfile };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind, {once:true}); else bind();
})();
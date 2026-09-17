(() => {
  'use strict';

  const PROFILE_PHOTO = 'data:image/jpeg;base64,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';

  function heroMarkup() {
    return `
      <div class="auth-art-grid"></div>
      <div class="auth-hero-copy">
        <p>“Operação, pessoas e dados. Tudo no mesmo fluxo.”</p>
        <div class="auth-hero-person">
          <div class="auth-hero-avatar"><img src="${PROFILE_PHOTO}" alt="Foto de Vitor Gutierrez"></div>
          <div><strong>Vitor Gutierrez</strong><span>Gestor de Operações</span></div>
        </div>
      </div>

      <div class="auth-product-shot" aria-label="Prévia da tela do AllianceOS">
        <div class="auth-shot-rail">
          <span class="is-brand">✱</span><span class="is-active">▦</span><span>▥</span><span>≣</span><span>▣</span><span>◎</span><span>✣</span><span>♧</span><span>☷</span>
          <b>VG</b>
        </div>
        <div class="auth-shot-app">
          <div class="auth-shot-topbar">
            <span class="auth-shot-brand">Botanika <i>⌄</i></span>
            <span class="auth-shot-search">⌕ &nbsp; Buscar tarefa, campanha, entrega…</span>
            <span class="auth-shot-team"><i>PL</i><i>SN</i><b>+6</b></span>
          </div>
          <div class="auth-shot-body">
            <h2>Boa tarde, Vitor.</h2>
            <p class="auth-shot-sub">Veja o que está acontecendo na operação e o que precisa da sua atenção.</p>
            <div class="auth-shot-section-title"><strong>Sua agenda</strong><small>6 blocos · o arranjo é só seu</small></div>
            <div class="auth-shot-week">
              <div class="auth-shot-week-head"><strong>Esta semana · 07 — 13 de setembro</strong></div>
              <div class="auth-shot-days"><span>SEG<b>7</b></span><span>TER<b>8</b></span><span>QUA<b>9</b></span><span>QUI<b>10</b></span><span>SEX<b>11</b></span></div>
            </div>
            <div class="auth-shot-stats">
              <div><small>Perto do vencimento</small><strong>0</strong><em>vencem hoje ou amanhã</em></div>
              <div><small>Tarefas vencidas</small><strong>37</strong><em>precisam de ação hoje</em></div>
            </div>
            <div class="auth-shot-attention">
              <div class="auth-shot-list-head"><strong>Tarefas que pedem atenção</strong><small>vencidas e próximas do prazo</small></div>
              <ul>
                <li><i></i><span><b>AÇÕES DE RECOMPRA — Criar mensagem de direcionamento para o WhatsApp</b><small>Pedro Lage · VermeFree · AÇÕES DE RECOMPRA</small></span><em>vencida</em></li>
                <li><i></i><span><b>AÇÕES DE RECOMPRA — Configurar resposta automática no e-mail</b><small>Sarah · VermeFree · AÇÕES DE RECOMPRA</small></span><em>vencida</em></li>
                <li><i></i><span><b>AÇÕES DE RECOMPRA — Criar cupom da recompra perpétua</b><small>Pedro Lage · VermeFree · AÇÕES DE RECOMPRA</small></span><em>vencida</em></li>
                <li><i></i><span><b>AÇÕES DE RECOMPRA — Criar copies do funil perpétuo</b><small>Pedro Lage · VermeFree · AÇÕES DE RECOMPRA</small></span><em>vencida</em></li>
              </ul>
            </div>
          </div>
        </div>
      </div>`;
  }

  function mount() {
    const art = document.querySelector('#alliance-auth-root .auth-art');
    if (!art || art.dataset.heroV2 === '1') return;
    art.dataset.heroV2 = '1';
    art.innerHTML = heroMarkup();
  }

  function start() {
    mount();
    const target = document.getElementById('alliance-auth-root') || document.body;
    const observer = new MutationObserver(() => mount());
    observer.observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

(() => {
  'use strict';

  function heroMarkup() {
    return `
      <div class="auth-art-grid"></div>
      <div class="auth-hero-copy">
        <p>“O AllianceOS centraliza operações, conecta pessoas e transforma dados em decisões mais inteligentes.”</p>
        <div class="auth-hero-person">
          <div class="auth-hero-avatar" aria-label="Foto de Vitor Gutierrez">VG</div>
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

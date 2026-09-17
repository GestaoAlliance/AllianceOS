(() => {
  'use strict';

  const buildPreview = () => `
    <div class="auth-real-preview">
      <div class="auth-real-top">
        <span class="auth-real-brand">✱</span>
        <span class="auth-real-select">Botanika <b>⌄</b></span>
        <span class="auth-real-search">⌕ &nbsp; Buscar tarefa, campanha, entrega…</span>
        <span class="auth-real-team"><i>PL</i><i>SN</i><b>+6</b></span>
      </div>
      <div class="auth-real-body">
        <div class="auth-real-rail"><i>✱</i><i>▦</i><i>⌁</i><i>☷</i><i>▣</i><i>◎</i><i>✣</i><i>♢</i></div>
        <div class="auth-real-home">
          <small>Boa tarde, Vitor.</small>
          <h3>Boa tarde, Vitor.</h3>
          <p>Veja o que está acontecendo na operação e o que precisa da sua atenção.</p>
          <div class="auth-real-week">
            <div class="auth-real-week-head">Esta semana · 07 — 13 de setembro</div>
            <div class="auth-real-days">
              <div class="auth-real-day">SEG<b>7</b></div>
              <div class="auth-real-day">TER<b>8</b></div>
              <div class="auth-real-day">QUA<b>9</b></div>
              <div class="auth-real-day">QUI<b>10</b></div>
              <div class="auth-real-day">SEX<b>11</b></div>
            </div>
          </div>
          <div class="auth-real-metrics">
            <div class="auth-real-metric"><span>Perto do vencimento</span><strong>0</strong><em>vencem hoje ou amanhã</em></div>
            <div class="auth-real-metric"><span>Tarefas vencidas</span><strong>37</strong><em>precisam de ação hoje</em></div>
          </div>
          <div class="auth-real-tasks">
            <div class="auth-real-tasks-head">Tarefas que pedem atenção</div>
            <div class="auth-real-task"><span class="auth-real-dot"></span><div class="auth-real-task-copy"><strong>AÇÕES DE RECOMPRA — Criar mensagem de direcionamento para WhatsApp</strong><span>Pedro Lage · VermeFree · AÇÕES DE RECOMPRA</span></div></div>
            <div class="auth-real-task"><span class="auth-real-dot"></span><div class="auth-real-task-copy"><strong>AÇÕES DE RECOMPRA — Configurar resposta automática no e-mail</strong><span>Sarah · VermeFree · AÇÕES DE RECOMPRA</span></div></div>
            <div class="auth-real-task"><span class="auth-real-dot"></span><div class="auth-real-task-copy"><strong>AÇÕES DE RECOMPRA — Criar cupom da recompra perpétua</strong><span>Pedro Lage · VermeFree · AÇÕES DE RECOMPRA</span></div></div>
          </div>
        </div>
      </div>
    </div>`;

  const enhance = (root) => {
    if (!root) return;

    const quote = root.querySelector('.auth-quote');
    const desiredQuote = '“Operação, pessoas e dados. Tudo no mesmo fluxo.”';
    if (quote && quote.textContent !== desiredQuote) quote.textContent = desiredQuote;

    const name = root.querySelector('.auth-person-name');
    if (name && name.textContent !== 'Vitor Gutierrez') name.textContent = 'Vitor Gutierrez';

    const role = root.querySelector('.auth-person-role');
    if (role && role.textContent !== 'Gestor de Operações') role.textContent = 'Gestor de Operações';

    const preview = root.querySelector('.auth-preview');
    if (preview && !preview.querySelector('.auth-real-preview')) preview.innerHTML = buildPreview();
  };

  let scheduled = false;
  const scheduleEnhance = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      enhance(document.getElementById('alliance-auth-root'));
    });
  };

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleEnhance();
})();
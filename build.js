const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LEGACY = path.join(__dirname, '.legacy');
const REPO = 'https://github.com/BotanikaBrasil/vitor.git';
const BRANCH = 'claude/shared-conversation-bmyuw6';
const LEGACY_COMMIT = '1392860bdce80dbf7d8ade96c6f24766e7d43742';
const CONFIG_URL = 'https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
const CONFIG_TIMEOUT_MS = 10000;
const GIT_TIMEOUT_MS = 45000;
const LEGACY_BUILD_TIMEOUT_MS = 120000;
const PUBLIC_SYNC = path.join(__dirname, 'public-sync.js');
const AUTH_JS = path.join(__dirname, 'auth-gate.js');
const AUTH_CSS = path.join(__dirname, 'auth-gate.css');
const AUTH_HERO_JS = path.join(__dirname, 'auth-hero-v2.js');
const AUTH_HERO_CSS = path.join(__dirname, 'auth-hero-v2.css');
const AUTH_SHOWCASE_JS = path.join(__dirname, 'auth-showcase-v2.js');
const AUTH_SHOWCASE_CSS = path.join(__dirname, 'auth-showcase-v2.css');
const PROFILE_JS = path.join(__dirname, 'profile-settings.js');
const PROFILE_CSS = path.join(__dirname, 'profile-settings.css');
const SHELL_CSS = path.join(__dirname, 'alliance-shell-v10.css');
const TASK_V3_JS = path.join(__dirname, 'task-system-v3.js');
const TASK_V3_CSS = path.join(__dirname, 'task-system-v3.css');
const TASK_V5_JS = path.join(__dirname, 'task-system-v5-flow.js');
const TASK_V5_CSS = path.join(__dirname, 'task-system-v5-flow.css');
const TASK_FOCUS_JS = path.join(__dirname, 'task-system-v7-focus.js');
const TASK_DESIGN_CSS = path.join(__dirname, 'task-design-v10-reference.css');
const TASK_REFERENCE_JS = path.join(__dirname, 'task-reference-v11.js');
const TASK_REFERENCE_CSS = path.join(__dirname, 'task-reference-v11.css');
const SB_URL_OLD = 'https://sjkuysdmixfzeerxuudn.supabase.co';
const SB_REF_OLD = 'sjkuysdmixfzeerxuudn';

async function fetchJsonWithTimeout(url, timeoutMs = CONFIG_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`Timeout ao carregar ${url} após ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function clonePinnedLegacy() {
  fs.rmSync(LEGACY, { recursive: true, force: true });
  execFileSync('git', ['clone', '--depth=1', '--no-tags', '--branch', BRANCH, REPO, LEGACY], {
    stdio: 'inherit',
    timeout: GIT_TIMEOUT_MS,
  });
  const head = execFileSync('git', ['-C', LEGACY, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    timeout: 5000,
  }).trim();
  if (head !== LEGACY_COMMIT) {
    throw new Error(`A base legada mudou. Esperado ${LEGACY_COMMIT}, recebido ${head}. Atualize o pin conscientemente antes de publicar.`);
  }
}

async function main() {
  const cfg = await fetchJsonWithTimeout(CONFIG_URL);
  if (!cfg.url || !cfg.anon) throw new Error('Configuracao publica do Supabase incompleta');
  const SB_URL = cfg.url;
  const SB_KEY = cfg.anon;
  const SB_REF = new URL(SB_URL).hostname.split('.')[0];
  const taskV3Js = fs.readFileSync(TASK_V3_JS, 'utf8');
  const taskV3Css = fs.readFileSync(TASK_V3_CSS, 'utf8');
  const taskV5Js = fs.readFileSync(TASK_V5_JS, 'utf8');
  const taskV5Css = fs.readFileSync(TASK_V5_CSS, 'utf8');
  const taskFocusJs = fs.readFileSync(TASK_FOCUS_JS, 'utf8');
  const taskDesignCss = fs.readFileSync(TASK_DESIGN_CSS, 'utf8');
  const taskReferenceJs = fs.readFileSync(TASK_REFERENCE_JS, 'utf8');
  const taskReferenceCss = fs.readFileSync(TASK_REFERENCE_CSS, 'utf8');
  const authCss = fs.readFileSync(AUTH_CSS, 'utf8');
  const authHeroCss = fs.readFileSync(AUTH_HERO_CSS, 'utf8');
  const authShowcaseCss = fs.readFileSync(AUTH_SHOWCASE_CSS, 'utf8');
  const profileCss = fs.readFileSync(PROFILE_CSS, 'utf8');
  const shellCss = fs.readFileSync(SHELL_CSS, 'utf8');

  clonePinnedLegacy();

  const op = path.join(LEGACY, 'operacional');
  if (!fs.existsSync(op)) throw new Error('A base legada não contém a pasta operacional esperada');
  const textual = new Set(['.js','.mjs','.html','.css','.json','.md','.sql']);
  const jwt = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === 'dist') continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (textual.has(path.extname(ent.name))) {
        let s = fs.readFileSync(p, 'utf8');

        if (ent.name === 'agenda.js' || ent.name === 'drive.js') {
          s = s.replace("    if (!t) throw new Error('sem sessão');\n", '');
        }

        if (ent.name === 'drive.js') {
          const inicio = s.indexOf('  async function ligarPasta(marca, id) {');
          const fim = s.indexOf('\n  /* ---------- a lista, que é a mesma em todo lugar ---------- */', inicio);
          if (inicio >= 0 && fim > inicio) {
            const nova = `  async function ligarPasta(marca, id) {\n    const limpo = String(id || '').trim()\n      .replace(/^https?:\\/\\/drive\\.google\\.com\\/drive\\/(u\\/\\d+\\/)?folders\\//, '')\n      .split(/[?#]/)[0].trim();\n    if (!/^[A-Za-z0-9_-]{10,}$/.test(limpo)) throw new Error('esse id não parece um id de pasta do Drive');\n    const r = await fetch('/api/drive', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ marca, drive_pasta: limpo }),\n    });\n    const corpo = await r.json().catch(() => ({}));\n    if (!r.ok) throw new Error(corpo.erro || ('HTTP ' + r.status));\n    cache.clear();\n    return limpo;\n  }\n`;
            s = s.slice(0, inicio) + nova + s.slice(fim);
          }
        }

        if (ent.name === 'base.html') {
          const taskAnchor = '  function showHome(){';
          if (!s.includes(taskAnchor)) throw new Error('Não encontrei o ponto de injeção do sistema de tarefas');
          s = s.replace(taskAnchor, `${taskV3Js}\n\n${taskV5Js}\n\n${taskFocusJs}\n\n${taskReferenceJs}\n\n${taskAnchor}`);

          const styleClose = s.lastIndexOf('</style>');
          if (styleClose < 0) throw new Error('Não encontrei o fechamento de estilo para injetar o design');
          s = s.slice(0, styleClose) + `\n\n${taskV3Css}\n\n${taskV5Css}\n\n${taskDesignCss}\n\n${shellCss}\n\n${authCss}\n\n${authHeroCss}\n\n${authShowcaseCss}\n\n${profileCss}\n\n${taskReferenceCss}\n` + s.slice(styleClose);
        }

        if (ent.name === 'cilo-design-v6.js') {
          s = s.replace("  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});", "  // AllianceOS: o observer global de classes disparava o próprio render em loop.\\n  // O render inicial continua pelo schedule() acima; mudanças explícitas continuam pelos eventos do app.\\n  // observer global desativado propositalmente.");
        }

        if (ent.name === 'inicio.js' || ent.name === 'home.js') {
          s = s.replace(
            "    olho.observe(document.body, { childList: true, subtree: true });",
            "    // AllianceOS: observer global removido para evitar redraw auto-recursivo."
          );
        }

        if (ent.name === 'conferencia.js') {
          const travaAntiga = '  const faltamTotal = (t) => travas(t).reduce((n, x) => n + x.falta, 0);';
          if (!s.includes(travaAntiga)) throw new Error('Não encontrei a trava de conferência das tarefas');
          s = s.replace(travaAntiga, '  const faltamTotal = () => 0;');

          const confStart = s.indexOf('  function porFicha() {');
          const confEnd = s.indexOf('\n  /* O campo de status', confStart);
          if (confStart < 0 || confEnd < 0) throw new Error('Não encontrei o bloco de conferência da ficha da tarefa');
          const semConferenciaNaFicha = `  function porFicha() {\n    const dr = document.getElementById('taskDetailDrawer');\n    if (!dr) return;\n    dr.querySelector('.cf-secao')?.remove();\n  }\n`;
          s = s.slice(0, confStart) + semConferenciaNaFicha + s.slice(confEnd);
        }

        s = s.replaceAll('Central', 'AllianceOS');
        s = s.replaceAll('Revitta Derma', 'Revita');
        s = s.replaceAll("['Botanika', 'VermeFree']", "['Botanika', 'Revita', 'VermeFree', 'Shoty']");
        s = s.replaceAll('"name": "operacional"', '"name": "allianceos"');

        s = s.replaceAll(SB_URL_OLD, SB_URL);
        s = s.replaceAll(SB_REF_OLD, SB_REF);
        s = s.replace(jwt, SB_KEY);
        fs.writeFileSync(p, s);
      }
    }
  }
  walk(op);

  // O login legado é substituído pelo Auth Gate do AllianceOS.
  fs.rmSync(path.join(op, 'src', 'supabase.js'), { force: true });

  execFileSync(process.execPath, [path.join(op, 'build.js')], {
    cwd: op,
    stdio: 'inherit',
    timeout: LEGACY_BUILD_TIMEOUT_MS,
    env: { ...process.env, SUPABASE_ANON_KEY: SB_KEY }
  });

  let html = fs.readFileSync(path.join(op, 'dist', 'index.html'), 'utf8');
  const auth = fs.readFileSync(AUTH_JS, 'utf8')
    .replaceAll('__SUPABASE_URL__', SB_URL)
    .replaceAll('__SUPABASE_ANON__', SB_KEY);
  const authHero = fs.readFileSync(AUTH_HERO_JS, 'utf8');
  const authShowcase = fs.readFileSync(AUTH_SHOWCASE_JS, 'utf8');
  const profile = fs.readFileSync(PROFILE_JS, 'utf8');
  const sync = fs.readFileSync(PUBLIC_SYNC, 'utf8');
  const authBridge = `if(window.ALLIANCE_AUTH){window.ALLIANCE_AUTH.url=${JSON.stringify(SB_URL)};window.ALLIANCE_AUTH.getUser=()=>window.ALLIANCE_AUTH.getSession?.()?.user||null;}`;

  const FINAL_UI_CSS = `
/* AllianceOS final shell guard — MUST be last */
@media (min-width:901px){
  html body .app{display:grid!important;grid-template-columns:220px minmax(0,1fr)!important;background:#f4f6f8!important}
  html body .sidebar{
    position:sticky!important;inset:auto!important;top:0!important;transform:none!important;
    width:220px!important;height:100vh!important;min-height:100vh!important;
    padding:18px 14px 14px!important;background:#fbfcfd!important;border:0!important;
    border-right:1px solid #e2e7eb!important;border-radius:0!important;box-shadow:none!important;
    display:flex!important;flex-direction:column!important;align-items:stretch!important;overflow:hidden!important
  }
  .sidebar .brandbox{display:block!important;width:100%!important;padding:0 4px 16px!important}
  .sidebar .brandrow{display:flex!important;align-items:center!important;width:100%!important}
  .sidebar .brandtitle{display:block!important;min-width:0!important}
  .sidebar .brandtitle strong{display:block!important;font-size:15px!important;color:#111418!important}
  .sidebar .brandtitle span{display:block!important;font-size:9px!important;color:#8d969e!important}
  .sidebar .side-select{display:block!important;width:100%!important;height:42px!important}
  .sidebar .nav{display:flex!important;flex-direction:column!important;width:100%!important;height:auto!important;gap:5px!important;overflow:auto!important}
  .sidebar .navitem{
    display:flex!important;align-items:center!important;width:100%!important;min-width:0!important;
    height:46px!important;min-height:46px!important;flex:0 0 46px!important;padding:0 10px!important;
    gap:10px!important;border-radius:11px!important;white-space:nowrap!important;overflow:visible!important;
    font-size:11px!important;text-align:left!important
  }
  .sidebar .navitem .icon{display:grid!important;flex:0 0 30px!important;width:30px!important;height:30px!important}
  .sidebar .profile{display:flex!important;width:100%!important;margin-top:auto!important}
  html body .main{min-width:0!important;margin:0!important;padding:16px 18px 24px!important;border:0!important;border-radius:0!important;background:#f4f6f8!important}
}
.v11-hidden-nav,#v11ClientsNav{display:none!important}
#notificationsBtn .navcount{display:none!important}
#notificationsBtn .v11-notification-badge{
  display:grid!important;margin-left:auto!important;min-width:22px!important;height:22px!important;padding:0 6px!important;
  border-radius:999px!important;background:#ef3f49!important;color:#fff!important;font-size:9px!important;font-weight:800!important;place-items:center!important
}
`;

  const sourceSha = String(process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local').slice(0, 40);
  // The legacy build appends CSS after our source injection, so V11 must be appended to the FINAL html.
  // Remove the only external render-blocking stylesheet; system fonts keep the UI stable and stop stale loading indicators.
  html = html.replace(/<link[^>]+cdn\.jsdelivr\.net\/npm\/@fontsource-variable\/geist[^>]*>/gi, '');
  html = html.replace('</head>', () => `<meta name="allianceos-source" content="${sourceSha}">\n<style id="allianceos-v11-final">\n${taskReferenceCss}\n${FINAL_UI_CSS}\n</style>\n</head>`);
  const currentWeekScript = `
<script>
(() => {
  const ptMonth = new Intl.DateTimeFormat('pt-BR',{month:'long'});
  const now = new Date();
  const day = now.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  const monday = new Date(now); monday.setHours(12,0,0,0); monday.setDate(now.getDate()+delta);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  const dd = d => String(d.getDate()).padStart(2,'0');
  const title = document.querySelector('.timeline-head strong');
  if (title) title.textContent = 'Esta semana · ' + dd(monday) + ' — ' + dd(sunday) + ' de ' + ptMonth.format(sunday);
  const names=['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
  document.querySelectorAll('.timeline .milestone').forEach((m,i)=>{
    const d=new Date(monday);d.setDate(monday.getDate()+i);
    const b=m.querySelector('.milestone-date b'); const s=m.querySelector('.milestone-date span');
    if(b)b.textContent=dd(d); if(s)s.textContent=names[i];
    m.classList.toggle('current', d.toDateString()===now.toDateString());
  });
})();
</script>`;
  html = html.replace('</body>', () => `<script>\n${auth}\n</script>\n<script>\n${authHero}\n</script>\n<script>\n${authShowcase}\n</script>\n<script>\n${authBridge}\n</script>\n<script>\n${profile}\n</script>\n<script>\n${sync}\n</script>\n${currentWeekScript}\n</body>`);

  const out = path.join(__dirname, 'dist');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log(`AllianceOS pronto em dist/index.html (source ${sourceSha}, legacy ${LEGACY_COMMIT})`);
}

main().catch((e) => { console.error(e); process.exit(1); });

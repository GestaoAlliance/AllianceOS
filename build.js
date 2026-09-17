const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LEGACY = path.join(__dirname, '.legacy');
const REPO = 'https://github.com/BotanikaBrasil/vitor.git';
const BRANCH = 'claude/shared-conversation-bmyuw6';
const CONFIG_URL = 'https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
const PUBLIC_SYNC = path.join(__dirname, 'public-sync.js');
const AUTH_JS = path.join(__dirname, 'auth-gate.js');
const AUTH_CSS = path.join(__dirname, 'auth-gate.css');
const PROFILE_JS = path.join(__dirname, 'profile-settings.js');
const PROFILE_CSS = path.join(__dirname, 'profile-settings.css');
const SHELL_CSS = path.join(__dirname, 'alliance-shell-v10.css');
const TASK_V3_JS = path.join(__dirname, 'task-system-v3.js');
const TASK_V3_CSS = path.join(__dirname, 'task-system-v3.css');
const TASK_V5_JS = path.join(__dirname, 'task-system-v5-flow.js');
const TASK_V5_CSS = path.join(__dirname, 'task-system-v5-flow.css');
const TASK_FOCUS_JS = path.join(__dirname, 'task-system-v7-focus.js');
const TASK_DESIGN_CSS = path.join(__dirname, 'task-design-v10-reference.css');
const SB_URL_OLD = 'https://sjkuysdmixfzeerxuudn.supabase.co';
const SB_REF_OLD = 'sjkuysdmixfzeerxuudn';

async function main() {
  const cfgRes = await fetch(CONFIG_URL);
  if (!cfgRes.ok) throw new Error(`Falha ao carregar configuracao publica do Supabase: ${cfgRes.status}`);
  const cfg = await cfgRes.json();
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
  const authCss = fs.readFileSync(AUTH_CSS, 'utf8');
  const profileCss = fs.readFileSync(PROFILE_CSS, 'utf8');
  const shellCss = fs.readFileSync(SHELL_CSS, 'utf8');

  fs.rmSync(LEGACY, { recursive: true, force: true });
  execFileSync('git', ['clone', '--depth=1', '--branch', BRANCH, REPO, LEGACY], { stdio: 'inherit' });

  const op = path.join(LEGACY, 'operacional');
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
          s = s.replace(taskAnchor, `${taskV3Js}\n\n${taskV5Js}\n\n${taskFocusJs}\n\n${taskAnchor}`);

          const styleClose = s.lastIndexOf('</style>');
          if (styleClose < 0) throw new Error('Não encontrei o fechamento de estilo para injetar o design');
          s = s.slice(0, styleClose) + `\n\n${taskV3Css}\n\n${taskV5Css}\n\n${taskDesignCss}\n\n${shellCss}\n\n${authCss}\n\n${profileCss}\n` + s.slice(styleClose);
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
    env: { ...process.env, SUPABASE_ANON_KEY: SB_KEY }
  });

  let html = fs.readFileSync(path.join(op, 'dist', 'index.html'), 'utf8');
  const auth = fs.readFileSync(AUTH_JS, 'utf8')
    .replaceAll('__SUPABASE_URL__', SB_URL)
    .replaceAll('__SUPABASE_ANON__', SB_KEY);
  const profile = fs.readFileSync(PROFILE_JS, 'utf8');
  const sync = fs.readFileSync(PUBLIC_SYNC, 'utf8');
  const authBridge = `if(window.ALLIANCE_AUTH){window.ALLIANCE_AUTH.url=${JSON.stringify(SB_URL)};window.ALLIANCE_AUTH.getUser=()=>window.ALLIANCE_AUTH.getSession?.()?.user||null;}`;
  html = html.replace('</head>', () => `<script>\n${auth}\n</script>\n<script>\n${authBridge}\n</script>\n<script>\n${profile}\n</script>\n<script>\n${sync}\n</script>\n</head>`);

  const out = path.join(__dirname, 'dist');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log('AllianceOS pronto em dist/index.html (Auth + perfil + Cilo reference tasks + neutral shell + shared Supabase)');
}

main().catch((e) => { console.error(e); process.exit(1); });

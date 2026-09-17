const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LEGACY = path.join(__dirname, '.legacy');
const REPO = 'https://github.com/BotanikaBrasil/vitor.git';
const BRANCH = 'claude/shared-conversation-bmyuw6';
const CONFIG_URL = 'https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
const PUBLIC_SYNC = path.join(__dirname, 'public-sync.js');
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

        // Identidade visual/produto. Os nomes internos `central.*`,
        // `central_*` e globals `Central*` ficam intactos de propósito:
        // eles são o contrato de compatibilidade com o banco legado.
        s = s.replaceAll('Central', 'AllianceOS');
        s = s.replaceAll('Revitta Derma', 'Revita');
        s = s.replaceAll("['Botanika', 'VermeFree']", "['Botanika', 'Revita', 'VermeFree', 'Shoty']");
        s = s.replaceAll('"name": "operacional"', '"name": "allianceos"');

        // O app publicado usa o Supabase novo da Alliance. Mantemos somente
        // a troca de endpoint/chave pública; nenhuma chave privada vai ao Git.
        s = s.replaceAll(SB_URL_OLD, SB_URL);
        s = s.replaceAll(SB_REF_OLD, SB_REF);
        s = s.replace(jwt, SB_KEY);
        fs.writeFileSync(p, s);
      }
    }
  }
  walk(op);

  // MODO ABERTO TEMPORARIO: removemos somente a tela/sessao de login.
  // A persistencia compartilhada entra por public-sync.js, que fala com uma
  // Edge Function do Supabase sem expor credencial administrativa no browser.
  fs.rmSync(path.join(op, 'src', 'supabase.js'), { force: true });

  execFileSync(process.execPath, [path.join(op, 'build.js')], {
    cwd: op,
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_ANON_KEY: SB_KEY }
  });

  let html = fs.readFileSync(path.join(op, 'dist', 'index.html'), 'utf8');
  const sync = fs.readFileSync(PUBLIC_SYNC, 'utf8');
  html = html.replace('</head>', () => `<script>\n${sync}\n</script>\n</head>`);

  const out = path.join(__dirname, 'dist');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log('AllianceOS pronto em dist/index.html (aberto + Supabase compartilhado + compatibilidade Central)');
}

main().catch((e) => { console.error(e); process.exit(1); });

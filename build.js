const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LEGACY = path.join(__dirname, '.legacy');
const REPO = 'https://github.com/BotanikaBrasil/vitor.git';
const BRANCH = 'claude/shared-conversation-bmyuw6';
const CONFIG_URL = 'https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
const PUBLIC_SYNC = path.join(__dirname, 'public-sync.js');
const TASK_V3_JS = path.join(__dirname, 'task-system-v3.js');
const TASK_V3_CSS = path.join(__dirname, 'task-system-v3.css');
const TASK_V5_JS = path.join(__dirname, 'task-system-v5-flow.js');
const TASK_V5_CSS = path.join(__dirname, 'task-system-v5-flow.css');
const TASK_FOCUS_JS = path.join(__dirname, 'task-system-v7-focus.js');
const TASK_REFERENCE_V10_JS = path.join(__dirname, 'task-reference-v10.js');
const TASK_REFERENCE_V10_CSS = path.join(__dirname, 'task-reference-v10.css');
const TASK_DESIGN_CSS = path.join(__dirname, 'task-design-v9-cilo-glass.css');
const NAV_REFERENCE_CSS = path.join(__dirname, 'navigation-reference-v1.css');
const NAV_REFERENCE_JS = path.join(__dirname, 'navigation-reference-v1.js');
const ALLIANCE_ADMIN_JS = path.join(__dirname, 'alliance-admin.js');
const ALLIANCE_ADMIN_CSS = path.join(__dirname, 'alliance-admin.css');
const FULL_SYSTEM_UI = path.join(__dirname, 'full-system-ui-v1.js');
const AUTH_GATE_JS = path.join(__dirname, 'auth-gate.js');
const AUTH_GATE_CSS = path.join(__dirname, 'auth-gate.css');
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
  const taskReferenceV10Js = fs.readFileSync(TASK_REFERENCE_V10_JS, 'utf8');
  const taskReferenceV10Css = fs.readFileSync(TASK_REFERENCE_V10_CSS, 'utf8');
  const taskDesignCss = fs.readFileSync(TASK_DESIGN_CSS, 'utf8');
  const navReferenceCss = fs.readFileSync(NAV_REFERENCE_CSS, 'utf8');
  const navReferenceJs = fs.readFileSync(NAV_REFERENCE_JS, 'utf8');
  const allianceAdminJs = fs.readFileSync(ALLIANCE_ADMIN_JS, 'utf8');
  const allianceAdminCss = fs.readFileSync(ALLIANCE_ADMIN_CSS, 'utf8');
  const fullSystemUi = fs.readFileSync(FULL_SYSTEM_UI, 'utf8');
  const authGateJs = fs.readFileSync(AUTH_GATE_JS, 'utf8');
  const authGateCss = fs.readFileSync(AUTH_GATE_CSS, 'utf8');

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
          // AllianceOS: nunca persistir o rótulo visual "Agora". Datas salvas são ISO;
          // rótulos relativos pertencem somente à renderização.
          s = s.replaceAll("at:'Agora'", "at:new Date().toISOString()");
          s = s.replaceAll('at:"Agora"', 'at:new Date().toISOString()');
          const oldNowLabel = "  function nowLabel(){return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date()).replace('.','')}";
          if (s.includes(oldNowLabel)) s = s.replace(oldNowLabel, "  function nowLabel(){return new Date().toISOString()}");
          // AllianceOS: coleção oficial de Entregas primeiro; a tarefa é somente um espelho.
          s = s.replace("deliveries.push(d);if(complete)", "deliveries.push(d);persistDeliveries();if(complete)");

          // AllianceOS: campanhas podem vir do MCP/Supabase com campos opcionais.
          // Normaliza os registros antes de renderizar para que a listagem e o
          // workspace individual nunca quebrem por owner/channels/etc ausentes.
          const oldFilteredCampaigns = "  function filteredCampaigns(){const q=(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();const st=document.getElementById('campaignStatusFilter')?.value||'';const brand=getSelectedBrand();return campaignData.filter(c=>{if(brand&&c.brand!==brand)return false;if(st&&c.status!==st)return false;if(q&&!\`\${c.name} \${c.type} \${c.owner} \${c.offer} \${c.channels.join(' ')}\`.toLowerCase().includes(q))return false;return true})}";
          const newFilteredCampaigns = `  function normalizeCampaign(c){
    if(!c||typeof c!=='object')c={};
    c.name=String(c.name||c.nome||'Campanha');
    c.brand=String(c.brand||c.marca||getSelectedBrand()||'Botanika');
    c.type=String(c.type||c.tipo||'Campanha');
    c.start=String(c.start||c.startDate||c.data_inicio||c.dataInicio||'');
    c.end=String(c.end||c.endDate||c.data_fim||c.dataFim||c.start||'');
    c.owner=String(c.owner||c.responsible||c.responsavel||c.responsável||'Sem responsável');
    c.status=String(c.status||'Planejamento');
    const campaignEnd=String(c.end||c.endDate||c.data_fim||c.dataFim||'').slice(0,10);
    const todayIso=new Date().toISOString().slice(0,10);
    if(campaignEnd&&campaignEnd<todayIso&&/^(em execução|em execucao|execução|execucao|executando|ativa|ativo)$/i.test(c.status))c.status='encerrada';
    c.goal=Number(c.goal??c.meta??c.meta_faturamento??0)||0;
    c.budget=Number(c.budget??c.investment??c.investimento??c.investimento_total??0)||0;
    c.progress=Math.max(0,Math.min(100,Number(c.progress??c.progresso??0)||0));
    c.color=String(c.color||c.cor||'#121415');
    c.offer=String(c.offer||c.oferta||'');
    c.objective=String(c.objective||c.objetivo||'');
    c.channels=Array.isArray(c.channels)?c.channels:(Array.isArray(c.canais)?c.canais:[]);
    c.products=Array.isArray(c.products)?c.products:(Array.isArray(c.produtos)?c.produtos:[]);
    c.benefits=Array.isArray(c.benefits)?c.benefits:(Array.isArray(c.beneficios)?c.beneficios:[]);
    c.schedule=Array.isArray(c.schedule)?c.schedule:(Array.isArray(c.cronograma)?c.cronograma:[]);
    return c;
  }
  function filteredCampaigns(){const q=(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();const st=document.getElementById('campaignStatusFilter')?.value||'';const brand=getSelectedBrand();return campaignData.map(normalizeCampaign).filter(c=>{if(brand&&c.brand!==brand)return false;if(st&&c.status!==st)return false;if(q&&!\`\${c.name} \${c.type} \${c.owner} \${c.offer} \${c.channels.join(' ')}\`.toLowerCase().includes(q))return false;return true})}`;
          if (!s.includes(oldFilteredCampaigns)) throw new Error('Não encontrei filteredCampaigns legado para normalizar');
          s = s.replace(oldFilteredCampaigns, newFilteredCampaigns);

          const oldCampaignRow = "  function renderCampaignRow(c){return \`<article class=\"camp-row\" data-campaign-id=\"\${c.id}\" style=\"--cc:\${c.color}\"><div class=\"camp-name\"><i class=\"camp-color\"></i><div class=\"camp-name-text\"><b>\${cesc(c.name)}</b><small>\${cesc(c.type)} · \${cesc(c.offer)}</small></div></div><span class=\"camp-chip \${statusClass(c.status)}\">\${cesc(c.status)}</span><div><span class=\"camp-meta-val\">\${cDate(c.start)} — \${cDate(c.end)}</span><span class=\"camp-meta-sub\">\${Math.max(1,Math.round((new Date(c.end)-new Date(c.start))/86400000)+1)} dias</span></div><div class=\"camp-owner\"><i class=\"miniav\">\${cInitials(c.owner)}</i><span>\${cesc(c.owner.split(' ')[0])}</span></div><div><span class=\"camp-meta-val\">\${cMoney(c.goal)}</span><span class=\"camp-meta-sub\">faturamento</span></div><div><span class=\"camp-meta-val\">\${cMoney(c.budget)}</span><span class=\"camp-meta-sub\">mídia / ação</span></div><div class=\"camp-progress\"><div class=\"camp-progress-line\"><i style=\"width:\${Math.min(100,c.progress)}%\"></i></div><span>\${c.progress}%</span></div><button class=\"camp-more\" type=\"button\">›</button></article>\`}";
          const newCampaignRow = `  function renderCampaignRow(raw){const c=normalizeCampaign(raw);const ownerFirst=c.owner.split(/\\s+/)[0]||'Sem responsável';const a=new Date(c.start),b=new Date(c.end);const validDates=!Number.isNaN(a.getTime())&&!Number.isNaN(b.getTime());const days=validDates?Math.max(1,Math.round((b-a)/86400000)+1):'—';return \`<article class="camp-row" data-campaign-id="\${cesc(c.id)}" style="--cc:\${cesc(c.color)}"><div class="camp-name"><i class="camp-color"></i><div class="camp-name-text"><b>\${cesc(c.name)}</b><small>\${cesc(c.type)}\${c.offer?' · '+cesc(c.offer):''}</small></div></div><span class="camp-chip \${statusClass(c.status)}">\${cesc(c.status)}</span><div><span class="camp-meta-val">\${cDate(c.start)} — \${cDate(c.end)}</span><span class="camp-meta-sub">\${days==='—'?'Período não definido':days+' dias'}</span></div><div class="camp-owner"><i class="miniav">\${cInitials(c.owner)}</i><span>\${cesc(ownerFirst)}</span></div><div><span class="camp-meta-val">\${cMoney(c.goal)}</span><span class="camp-meta-sub">faturamento</span></div><div><span class="camp-meta-val">\${cMoney(c.budget)}</span><span class="camp-meta-sub">mídia / ação</span></div><div class="camp-progress"><div class="camp-progress-line"><i style="width:\${c.progress}%"></i></div><span>\${c.progress}%</span></div><button class="camp-more" type="button" aria-label="Abrir \${cesc(c.name)}">›</button></article>\`}`;
          if (!s.includes(oldCampaignRow)) throw new Error('Não encontrei renderCampaignRow legado para corrigir');
          s = s.replace(oldCampaignRow, newCampaignRow);

          const oldCalendar = "  function renderCalendar(data){const days=[7,8,9,10,11,12,13];const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];document.getElementById('campaignCalendar').innerHTML=days.map((d,i)=>{const iso=\`2026-09-\${String(d).padStart(2,'0')}\`;const items=data.filter(c=>c.start<=iso&&c.end>=iso);return \`<section class=\"camp-day \${d===7?'today':''}\"><div class=\"camp-day-head\"><b>\${names[i]} · \${String(d).padStart(2,'0')}</b>\${d===7?'<span>Hoje</span>':'<span>Setembro</span>'}</div>\${items.map(c=>\`<article class=\"camp-cal-item\" data-campaign-id=\"\${c.id}\" style=\"--cc:\${c.color}\"><b>\${cesc(c.name)}</b><span>\${cesc(c.status)} · \${cesc(c.owner.split(' ')[0])}</span></article>\`).join('')||'<div style=\"padding:12px 4px;color:#a2a6aa;font-size:7px\">Sem campanha ativa</div>'}</section>\`}).join('')}";
          const newCalendar = `  function renderCalendar(data){const days=[7,8,9,10,11,12,13];const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];document.getElementById('campaignCalendar').innerHTML=days.map((d,i)=>{const iso=\`2026-09-\${String(d).padStart(2,'0')}\`;const items=data.map(normalizeCampaign).filter(c=>c.start&&c.end&&c.start<=iso&&c.end>=iso);return \`<section class="camp-day \${d===7?'today':''}"><div class="camp-day-head"><b>\${names[i]} · \${String(d).padStart(2,'0')}</b>\${d===7?'<span>Hoje</span>':'<span>Setembro</span>'}</div>\${items.map(c=>{const ownerFirst=c.owner.split(/\\s+/)[0]||'Sem responsável';return \`<article class="camp-cal-item" data-campaign-id="\${cesc(c.id)}" style="--cc:\${cesc(c.color)}"><b>\${cesc(c.name)}</b><span>\${cesc(c.status)} · \${cesc(ownerFirst)}</span></article>\`}).join('')||'<div style="padding:12px 4px;color:#a2a6aa;font-size:7px">Sem campanha ativa</div>'}</section>\`}).join('')}`;
          if (!s.includes(oldCalendar)) throw new Error('Não encontrei renderCalendar legado para corrigir');
          s = s.replace(oldCalendar, newCalendar);

          const oldOpenCampaign = "  function openCampaignWorkspace(id){const c=campaignData.find(x=>String(x.id)===String(id));if(!c)return;campaignState.selected=c.id;campaignState.workspaceTab='summary';document.getElementById('campaignOverviewList').classList.add('hidden');document.getElementById('campaignWorkspace').classList.add('active');renderWorkspace();location.hash='campaigns'}";
          const newOpenCampaign = "  function openCampaignWorkspace(id){const raw=campaignData.find(x=>String(x.id)===String(id));if(!raw)return;const c=normalizeCampaign(raw);campaignState.selected=c.id;campaignState.workspaceTab='summary';document.getElementById('campaignOverviewList').classList.add('hidden');document.getElementById('campaignWorkspace').classList.add('active');renderWorkspace();location.hash='campaigns'}";
          if (!s.includes(oldOpenCampaign)) throw new Error('Não encontrei openCampaignWorkspace legado para corrigir');
          s = s.replace(oldOpenCampaign, newOpenCampaign);

          // AllianceOS: entregas arquivadas continuam persistidas, mas saem das listagens padrão da interface.
          const oldFilteredDeliveries = "  function filteredDeliveries(){let data=[...deliveries];";
          const newFilteredDeliveries = "  function filteredDeliveries(){let data=deliveries.filter(d=>!d.archivedAt&&!d.arquivado_em);";
          if (!s.includes(oldFilteredDeliveries)) throw new Error('Não encontrei filteredDeliveries legado para aplicar arquivamento');
          s = s.replace(oldFilteredDeliveries, newFilteredDeliveries);

          const oldDeliveryNavCount = "  function renderNavCount(){const n=deliveries.filter(d=>d.to===CURRENT_NAME&&d.status!=='aprovado').length;";
          const newDeliveryNavCount = "  function renderNavCount(){const n=deliveries.filter(d=>!d.archivedAt&&!d.arquivado_em&&d.to===CURRENT_NAME&&d.status!=='aprovado').length;";
          if (!s.includes(oldDeliveryNavCount)) throw new Error('Não encontrei renderNavCount legado para aplicar arquivamento');
          s = s.replace(oldDeliveryNavCount, newDeliveryNavCount);

          const oldRenderDeliveries = "  function renderDeliveries(){const all=deliveries,received=all.filter";
          const newRenderDeliveries = "  function renderDeliveries(){const all=deliveries.filter(d=>!d.archivedAt&&!d.arquivado_em),received=all.filter";
          if (!s.includes(oldRenderDeliveries)) throw new Error('Não encontrei renderDeliveries legado para aplicar arquivamento');
          s = s.replace(oldRenderDeliveries, newRenderDeliveries);

          const taskAnchor = '  function showHome(){';
          if (!s.includes(taskAnchor)) throw new Error('Não encontrei o ponto de injeção do sistema de tarefas');
          s = s.replace(taskAnchor, `${taskV3Js}\n\n${taskV5Js}\n\n${taskFocusJs}\n\n${taskReferenceV10Js}\n\n${taskAnchor}`);

          const styleClose = s.lastIndexOf('</style>');
          if (styleClose < 0) throw new Error('Não encontrei o fechamento de estilo para injetar tarefas');
          s = s.slice(0, styleClose) + `\n\n${taskV3Css}\n\n${taskV5Css}\n\n${taskDesignCss}\n\n${taskReferenceV10Css}\n` + s.slice(styleClose);
        }

        if (ent.name === 'campanha.js') {
          // AllianceOS: metas por canal vencem a meta manual.
          const oldMeta = "    const meta = c.goal || somaMeta;";
          const oldDiff = "    const difere = somaMeta && Math.abs(somaMeta - meta) > 1;";
          if (!s.includes(oldMeta) || !s.includes(oldDiff)) throw new Error('Não encontrei a regra canônica de meta da campanha');
          s = s.replace(oldMeta, "    const metaManual = +c.goal || 0;\n    const meta = somaMeta || metaManual;");
          s = s.replace(oldDiff, "    const difere = somaMeta && metaManual && Math.abs(somaMeta - metaManual) > 1;");
          s = s.replace(
            "          <b>${brl(meta)}</b> — faltam <b>${brl(meta - somaMeta)}</b> distribuídos.</p>",
            "          <b>${brl(metaManual)}</b>. Para planejamento e relatórios, <b>vale a soma por canal</b>.</p>"
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

  fs.rmSync(path.join(op, 'src', 'supabase.js'), { force: true });

  execFileSync(process.execPath, [path.join(op, 'build.js')], {
    cwd: op,
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_ANON_KEY: SB_KEY }
  });

  let html = fs.readFileSync(path.join(op, 'dist', 'index.html'), 'utf8');
  html = html.replace('<html lang="pt-BR">','<html lang="pt-BR" class="alliance-auth-pending">');
  const sync = fs.readFileSync(PUBLIC_SYNC, 'utf8');
  html = html.replace('</head>', () => `<style id="alliance-auth-style">\n${authGateCss}\n</style>\n<style id="alliance-navigation-reference">\n${navReferenceCss}\n</style>\n<style id="alliance-admin-style">\n${allianceAdminCss}\n</style>\n<script id="alliance-auth-gate">\n${authGateJs}\n</script>\n<script>\n${sync}\n</script>\n</head>`);
  html = html.replace('</body>', () => `<script id="alliance-navigation-reference-js">\n${navReferenceJs}\n</script>\n<script id="alliance-admin-js">\n${allianceAdminJs}\n</script>\n<script id="alliance-full-system-ui">\n${fullSystemUi}\n</script>\n</body>`);

  const out = path.join(__dirname, 'dist');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log('AllianceOS pronto em dist/index.html (autenticação obrigatória + usuários reais + Supabase/RLS)');
}

main().catch((e) => { console.error(e); process.exit(1); });

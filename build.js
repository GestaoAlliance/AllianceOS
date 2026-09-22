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
const SOCIAL_PREVIEW_IMAGE = path.join(__dirname, 'assets', 'allianceos-whatsapp-preview-v6.jpg');
const SB_URL_OLD = 'https://sjkuysdmixfzeerxuudn.supabase.co';
const SB_REF_OLD = 'sjkuysdmixfzeerxuudn';
const APPLE_TOUCH_ICON_B64 = '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';

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
  function filteredCampaigns(){const q=(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();const st=document.getElementById('campaignStatusFilter')?.value||'';const brand=getSelectedBrand();const allowed=new Set((window.AllianceOSDirectory?.brands||[]).map(b=>String(b?.nome||'')).filter(Boolean));return campaignData.map(normalizeCampaign).filter(c=>{if(allowed.size&&c.brand&&!allowed.has(String(c.brand)))return false;if(brand&&c.brand!==brand)return false;if(st&&c.status!==st)return false;if(q&&!\`\${c.name} \${c.type} \${c.owner} \${c.offer} \${c.channels.join(' ')}\`.toLowerCase().includes(q))return false;return true})}`;
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
  const socialHead = "<meta name=\"description\" content=\"Campanhas, tarefas, entregas e gestão das marcas da Alliance em um só lugar.\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:site_name\" content=\"AllianceOS\">\n<meta property=\"og:title\" content=\"AllianceOS — Operação em um só lugar\">\n<meta property=\"og:description\" content=\"Campanhas, tarefas, entregas e gestão das marcas da Alliance em um só lugar.\">\n<meta property=\"og:url\" content=\"https://alliance-os-sooty.vercel.app/\">\n<meta property=\"og:image\" content=\"https://alliance-os-sooty.vercel.app/allianceos-whatsapp-preview-v6.jpg?v=20260922-6\">\n<meta property=\"og:image:secure_url\" content=\"https://alliance-os-sooty.vercel.app/allianceos-whatsapp-preview-v6.jpg?v=20260922-6\">\n<meta property=\"og:image:type\" content=\"image/jpeg\">\n<meta property=\"og:image:width\" content=\"1200\">\n<meta property=\"og:image:height\" content=\"630\">\n<meta property=\"og:image:alt\" content=\"AllianceOS — Operação em um só lugar\">\n<meta name=\"twitter:card\" content=\"summary_large_image\">\n<meta name=\"twitter:title\" content=\"AllianceOS — Operação em um só lugar\">\n<meta name=\"twitter:description\" content=\"Campanhas, tarefas, entregas e gestão das marcas da Alliance em um só lugar.\">\n<meta name=\"twitter:image\" content=\"https://alliance-os-sooty.vercel.app/allianceos-whatsapp-preview-v6.jpg?v=20260922-6\">\n";
  const brandHead = "<link rel=\"icon\" type=\"image/svg+xml\" href=\"/api/brand-icon?format=svg&v=20260922-4\">\n<link rel=\"icon\" type=\"image/png\" sizes=\"512x512\" href=\"/api/brand-icon?v=20260922-4\">\n<link rel=\"shortcut icon\" href=\"/api/brand-icon?format=svg&v=20260922-4\">\n<link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/apple-touch-icon-allianceos-180.png\">\n<link rel=\"apple-touch-icon-precomposed\" sizes=\"180x180\" href=\"/apple-touch-icon-allianceos-180.png\">\n<link rel=\"manifest\" href=\"/manifest.webmanifest?v=20260922-4\">\n<meta name=\"application-name\" content=\"AllianceOS\">\n<meta name=\"apple-mobile-web-app-title\" content=\"AllianceOS\">\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\">\n<meta name=\"theme-color\" content=\"#121417\">\n<meta name=\"msapplication-TileColor\" content=\"#121417\">\n<meta name=\"msapplication-TileImage\" content=\"/api/brand-icon?v=20260922-4\">\n";
  html = html.replace(/<title>[^<]*<\/title>/i, '<title>AllianceOS — Operação em um só lugar</title>');
  html = html.replace('<head>', () => `<head>\n${socialHead}`);
  html = html.replace('</head>', () => `${brandHead}<style id="alliance-auth-style">\n${authGateCss}\n</style>\n<style id="alliance-navigation-reference">\n${navReferenceCss}\n</style>\n<style id="alliance-admin-style">\n${allianceAdminCss}\n</style>\n<script id="alliance-auth-gate">\n${authGateJs}\n</script>\n<script>\n${sync}\n</script>\n</head>`);
  html = html.replace('</body>', () => `<script id="alliance-navigation-reference-js">\n${navReferenceJs}\n</script>\n<script id="alliance-admin-js">\n${allianceAdminJs}\n</script>\n<script id="alliance-full-system-ui">\n${fullSystemUi}\n</script>\n</body>`);

  const out = path.join(__dirname, 'dist');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  fs.copyFileSync(SOCIAL_PREVIEW_IMAGE, path.join(out, 'allianceos-whatsapp-preview-v6.jpg'));
  const appleTouchIcon = Buffer.from(APPLE_TOUCH_ICON_B64, 'base64');
  fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), appleTouchIcon);
  fs.writeFileSync(path.join(out, 'apple-touch-icon-precomposed.png'), appleTouchIcon);
  fs.writeFileSync(path.join(out, 'apple-touch-icon-allianceos-180.png'), appleTouchIcon);
  console.log('AllianceOS pronto em dist/index.html (autenticação obrigatória + usuários reais + Supabase/RLS)');
}

main().catch((e) => { console.error(e); process.exit(1); });

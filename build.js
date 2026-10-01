const fs = require('fs');
// CAMPAIGN_WIZARD_VIEWPORT_FIX_2026_09_28
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
const ONBOARDING_JS = path.join(__dirname, 'onboarding.js');
const ONBOARDING_CSS = path.join(__dirname, 'onboarding.css');
const CONTEXT_GUIDE_JS = path.join(__dirname, 'context-guide.js');
const CONTEXT_GUIDE_CSS = path.join(__dirname, 'context-guide.css');
const MOBILE_RUNTIME_JS = path.join(__dirname, 'mobile-runtime.js');
const MOBILE_RUNTIME_CSS = path.join(__dirname, 'mobile-runtime.css');
const HOME_LIVE_SYNC = path.join(__dirname, 'home-live-sync.js');
const MANAGEMENT_DASHBOARD_JS = path.join(__dirname, 'management-dashboard.js');
const MANAGEMENT_DASHBOARD_CSS = path.join(__dirname, 'management-dashboard.css');
const CAMPAIGN_PLANNING_TRUTH_JS = path.join(__dirname, 'campaign-planning-truth.js');
const CAMPAIGN_PLANNING_TRUTH_CSS = path.join(__dirname, 'campaign-planning-truth.css');
const CAMPAIGN_DIRECTORY_HARDFIX_JS = path.join(__dirname, 'campaign-directory-hardfix.js');
const CAMPAIGN_CREATION_WIZARD_JS = path.join(__dirname, 'campaign-creation-wizard.js');
const CAMPAIGN_CREATION_WIZARD_CSS = path.join(__dirname, 'campaign-creation-wizard.css');
const DELIVERY_DRIVE_JS = path.join(__dirname, 'delivery-drive.js');
const DELIVERY_DRIVE_CSS = path.join(__dirname, 'delivery-drive.css');
const AGENT_SIDEKICK_JS = path.join(__dirname, 'agent-sidekick.js');
const AGENT_SIDEKICK_CSS = path.join(__dirname, 'agent-sidekick.css');
const ACCESS_CENTER_JS = path.join(__dirname, 'access-center.js');
const ACCESS_CENTER_CSS = path.join(__dirname, 'access-center.css');
const TRAFFIC_CREATIVE_LAB_JS = path.join(__dirname, 'traffic-creative-lab.js');
const ORGANIZATION_CENTER_JS = path.join(__dirname, 'organization-center.js');
const CREATORS_MANAGEMENT_JS = path.join(__dirname, 'creators-management.js');
const CREATORS_MANAGEMENT_CSS = path.join(__dirname, 'creators-management.css');
const CREATOR_PUBLIC_FORM_HTML = path.join(__dirname, 'creator-public-form.html');
const TRAFFIC_CREATIVE_LAB_CSS = path.join(__dirname, 'traffic-creative-lab.css');
const SOCIAL_PREVIEW_IMAGE = path.join(__dirname, 'assets', 'allianceos-whatsapp-preview-v6.jpg');
const SB_URL_OLD = 'https://sjkuysdmixfzeerxuudn.supabase.co';
const SB_REF_OLD = 'sjkuysdmixfzeerxuudn';
const APPLE_TOUCH_ICON_B64 = 'iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAYAAAA9zQYyAAAPhUlEQVR42u2dXWxU55nH/+drvs94xnHANm6jGjC2dttCG6hykQsI+QAsCCyrRkWLEqWK2jRNL6oqbdOWTUV3G2W7Wm272VXUqlWqrCJtlq/Asmr4uMhFVEgCJTS2x2BIa2YMOLbHM2N7ztfbizNnZBrAMx6wzZz/T/IN9jDnzPzmned9nvd9XinR1CxASJ0g8yUgFJoQCk0IhSaEQhMKTQiFJoRCE0KhCaHQhEITQqEJodCEUGhCKDSh0IRQaEIoNCEUmhAKTSg0IRSaEApNCIUmhEITCk0IhSaEQhNCoQmh0IRCE0KhCaHQhFBoQig0odCEUGhCKDQhFJpQaEIoNCEUmhAKTQiFJhSaEApNCIUmhEITQqEJhSbkDkblS3B7kSQJsuyOG47jQAjBF4VC34FffbIMSQImJ6dgGAYAIBAIIBwOQQhXbkKh7wgURUGhUIBlWVi2bCmWtrcDAM4PDODcufNQVRXRaBS2bfPFotALX+axsSxWfv6z+MH3v4cH1q2FrscAALlcHkePHcfuf/pnnP7DB0gkGij1rQ7xEk3NDOpuoczZbBYPrFuL/3n9Nei6Xo6dvTDEFTuHv39sB44eO46GBkpNoRfk5E+GYRTR2tKCE++8jUQiAdO0oKoKJEkCAAghYFk2NE3F2NgY1tx3P9KZDAKBIIRgTH1L5i58CW7V6CyjkM/jW89+oySzCU1TyzJ7GQ9NU2GaJhKJBL717DMo5AtQFL4NFHqBYVoWEskkHnpwPYQQUBTlpqGJEAIPrl+HhkQDLMviC0ihF1K4IcG2LDQ2NmLxokWQJOmakfl6fy9JEpa0tmDx4sUwTfOmf08o9KykVBQFqqpAUZSqBZNkGVNTU5iYmKjouQAgGo0hUZoUVvN8tV5rPcO0HQBVVVAsGpiYmIBtO5BlCaFQCOFwuKLqnhACsiyjUChgPJdDc3MzhBAViVZN5dCrOk5OTmJqagqOI6AoMiKRCILBACyL2RJfC+0KJzA8PIK2tiVY/8A6NC9ejPFcDqdOn0Zvb58rSyAAu4LK3kyhRk2TTllG0XA/dJ2dK7Bq5UrEdR1Dly/j5LvvYXDwEpLJBgCSr8vrqp9lth0bpmHiRz/8Pr7+1FfR3Nxc/n2hUMD/7tmH53+4C8Mff4xYLDZvkzdVVZHP59F01134j3//N/zdtkcRjUbLvx8aGsJ/vvJLvPQv/wotoEGRFd9K7esR2jRMvPqbX2H7tq0Arl08FI1GsfMfdmD16i9i0+ZtSKfT0HV9zqVWVRW5XA6tra04dGAPujo7AaBcjJEkCc3NzXjhRz/AZ//2b7Dz8SehhBROCv0VM6sYHR3Fc9/5NrZv2wrDMMpxsKIo5bSaaZro6uzE4YP70NrSglwuB1VV517mlhYcPrgPXZ2dME2znBZUFAWyLEMIAcMwsH3bVjz3nW9jdHR0Tq+TQs9zqFEsFtHW1oZvPvM0HMeBqqqfiH3dIogGy7KwoqMDhw8dmFOpr5H50AGs6OiAZVnQNO2616qqKhzHwTefeRptbW0oFou+zH74TmhZljExMYEvrVmNxmSy/G83E8uybKzoWD5nUn9S5uWwLPumz+ndQ2MyiS+tWY2JiYmb3heFrqfJoG2jtaUFQgg4jqhAMGXOpL6xzDPHxY4jIIRAa0tL1bltCn1HSy0jm81WlWabC6lrkdn7sEqSVLo3f9bMfHfXtm0jHA7h3fdPleLMyosbt1PqWmV2CzlAsVjEu++fQjgc8uWyVN8JLYRAOBxGT08P3tizF7IsV5WKux1SK6qK8RpkBgDLsiDLMt7Ysxc9PT0Ih8O+zEX78nvJcRzEYjE8993n0ZdKlbIZ9uylbm1Fbnx8VlKrqoqJfA5LapLZhqZp6Eul8Nx3n0csFvPtnkVfCi2EgBbQ8PHICDZs2oK+VKos6Wyk/v+D+12pczkoSnVSj+fG0drSjMMH989aZlVV0JdKYcOmLfh4ZARaQPNtpdC3q+0c2x2l05lMSer+WUvdMU3qiUKh4scXiwY+1daG/zt0EMuXL6tB5n5s2LQF6UzGHZ1t/+5+8f0WrFonY95EU1EUpFL9iEajWLKktaLVdoZhIJ/Po7GxEY7jVJU3vlbmzUhnMvNSmqfQdSp1tULW8ljKzJBjxgyBruul8GPzrMIPWZZn1RnJW0NCmSn0gpS66p0uVfw9ZabQcy717bs2ykyh60Rqykyhb/j1PtNXvCRJ06QewobuLUj1u1LPRynZtl2ZU/392NC9BenMUFnmSu7FbwuUZD9I7FXwTNMsj2pCCAjgEz9OaVJnmiZisSgupdN4eONm9PWloCjKnFbgHMeBoijo60vh4Y2bcSmdRiwWhWma7u9vcA/exNSyrPLfXm/NN4W+w1AUBUXDwPDwMACgqakJuq6XMwsScN0f74Ng2zbiuo5MJoONm7fijx9+CEmS5kRqx3EgSRL++OGH2Lh5KzKZDOK6fs2y0Btdv7eLRdd1NDU1AQCGh4dRNIybNsCpiwGsXvPQXuPE9s98Bk9/7Sk89OB6NDcvRrFoYHx83H3TMdOtS4AQUFUVhUIBjY1JtLa2VtyioBa850in0xgZGUU0GnW/XUo71W9+1e6HLh6PIxgMYGjoMn731hG8/F+vYODChbpuEFmXQnstbR9cvw6v/vpXuPvuJs6WAFy9OoydTzyJt44cq9tWvnUntLfFqqurE28fP4Jo1I05p3cYmu3CnfmYZAkharpe7/+wbXdFXqFQwP1r16OnpxeRSKTuVuXVXQwtSRJM08TuF3aVZdY0rVz08LoPzeZnPiZVtV6v93hN02CaJqLRKHa/sKtu++nV1Qjt7ei+5557cOrkOwgEAm7ICfZ+K433EMJdFLVq9X346KOPEAwG62qpaV2N0LIso1g0sLS9fdobRZmnTxeFEAgGg1ja3o5i0ai7neGsFBIKvVBxHAfBYADnBwamNVrhiRvTQw4vLDs/MIBgMMBJ4YJ+u0obYFOpFI4eO16aIHK9g4dpuuXyo8eOI5VK1eVGWt+l7WY7s5/PaLyW5/bSfkzb3cFhRzQaxZkzZ7H9y1/B1avD16TtZj+dms+pXA2PnZa2u3p1GNu//BWcOXMW0Wi0LneGK6FI7B/rLlIUApFIGD09vdi77wAcx0Y8HkcoFEQgECi/0ZX+X5IkwTBM2LYz52shpj9vNSV3L5TI5/M4P3AB//366/j6N57Fe++fqusDP+t6T6GiKJicmsJEoYCGhgYsWrQIiYZ4xeOegICmqhgfz+HTn/4Ufv3LV7Bo0d1VfSBq+VACwJUrV/HEV5/Cn/70Z8TjOkzLglTRmO0+fiw7jitXriCbzSISjSIcqu+OSnW/SdY9YEeGZdkwTbPiN1MIAVXTUMjl0NzSgsMH92Pl5z9X02bY2YRPsizj9B/OYEP3FgxlMojqOqwqqnyKokDTtNJ6bqfu+3X4atd3pZNCIQQ0TZu2E3w/li9bNqcy/7XU/efOlXtv6Lpecem6lrUgFLpOuBVtDW4l3ILl4yxHvcnsXpMy503XKTRlptQUur5knm2jGUpNoRekzLNtNFNNgYNSU+jbLrNt25BlGalUPy5dSlc88hqGgZGRkXIbMUpNoeddZsuyy60GHunegtHR0YqFFgLYsfMJnPngbOkkAZtSU+hZ3rgiI5/Pl/PMtTQbT6X68Uj3FqTTaUSmHVk8E8FgAH8eHMTGTd3o7z9XU9P1w4f2o7WlBfl8HrIiU2g/IUkSTMPEXY2NJZk7amo27sms6zpsu7rccFyPlzs01dJ03T0cdD/uamyEaZi+PNLNt0LLsjs6v/jTn2BFRwdM06yhc/5mV+Z4fFaFDsuyEInpuFRDLz1VVWCaJlZ0dODFn/7EHaVlHuvmm9F5cnISXV1d2L5ta/lo5FnLfAuqdrZlIV5jg0jvaOTt27aiq6sLk5OTPHjTDyiKgsnJKdz7hVWljbSVr5y7nSXoWrueSpIEIYBgMIh7v7AKk5NTdd/2i0KXswsOGhoaqlq4MxfrKWqV2rsf9954rJtPZBZQFAXpTKa0m0NaEDLfCqll2V1NmM5kyhsCKHSd4zgOIpEIfn/iJEZKOeObFTUsy5rzlW43ltq66X0BwMjoKH5/4mRd7hek0DcYoYPBIAYHB/HzX7xcPhr5r0czIUQp+6GWDrWc22Wbn5Q6BVVVYZrmda/VOxr55794GYODg3XXEYlCzyBLMpnEiy/9DG/s2VtqGeauqbBtu9yDWdM09PT2YkP3o/OyBvkaqbsfRU9vLzRNK/eutm273Ec6EAjgjT178eJLP0MymfTtWmlfl761gIadjz+JXT/ejaGhIciyDEVRoCgKCoUCXv3ta3jokW5k5nFBvSd1JpPBQ49049XfvoZCoVC+TlmWMTQ0hF0/3o2djz8JLaD5+S31944Vr7PS6GgWbW1LsPreL6J58WKM53I4dfo0env7EIlEEAwEYM8Qj3q9M06883ZV27XW3Hc/Pjh7dsaYV5FlFA0DExMT6OxcgVUrVyKu6xi6fBkn330Pg4OXkEw2wOtf51d8vZLFe+ObmhqRzWZx4M2DsG0HsiwhFAohmUy6YUiFk6vbuX/PdhxomoZkMomLFz9Cb28fHEdAUWREIhE0NTWWMiH+3lHH9Ybw0nIqEokEJPcUinI8XelIb9s29FgMcV2fNvpX+i1R+QfQtm0Eg0GEw+FrrnUhnKVIoRfYaF1LvwrhOAiFQohEIhU9lyRJKBTyGMtmq84Z13qtnBSSGQVTVBUjIyO4fOXKjKGH9/tL6QwuX74MTdN8HfdS6IWYMVFVjI2O4ndvHSmHIDeMh0tpwbeOHEN2LMudJsxyLMSMiQzDKKK1pQUn3nkbiUQCpulWGacf3mNZNjRNxdjYGNbcdz/SmQwCgaBv115whF6wYYcbQ1+4eBGP7diJXC4HTVPLBRuvAKJp7ravx3bsxIWLFxEKhSgzhV6Y2LaNhoYGHDl6HGvXP4x9+99ELpcvn0qVy+Wxb/+bWLv+YRw5eryuD8BkyFFHeJVGy7KwbNlSLG1vBwCcHxjAuXPnoaoqotEoZabQd9BXnyxDkoDJySkYhgEACAQCCIdD5dwxufVwen2b8IT1iiDev9k2RabQd/RkkUUQTgoJodCEUGhCoQmh0IRQaEIoNKHQhFBoQig0IRSaEApNKDQhFJoQCk0IhSaEQhMKTQiFJoRCE0KhCaHQhEITQqEJodCEUGhCKDSh0IRQaEIoNCEUmhAKTSg0IRSaEApNCIUmhEITCk0IhSaEQhNCoQmF5ktAKDQhFJoQCk0IhSYUmhAKTQiFJoRCE1IZfwFNgPaZCKLlYwAAAABJRU5ErkJggg==';

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
  const onboardingJs = fs.readFileSync(ONBOARDING_JS, 'utf8');
  const onboardingCss = fs.readFileSync(ONBOARDING_CSS, 'utf8');
  const contextGuideJs = fs.readFileSync(CONTEXT_GUIDE_JS, 'utf8');
  const contextGuideCss = fs.readFileSync(CONTEXT_GUIDE_CSS, 'utf8');
  const mobileRuntimeJs = fs.readFileSync(MOBILE_RUNTIME_JS, 'utf8');
  const mobileRuntimeCss = fs.readFileSync(MOBILE_RUNTIME_CSS, 'utf8');
  const homeLiveSync = fs.readFileSync(HOME_LIVE_SYNC, 'utf8');
  const managementDashboardJs = fs.readFileSync(MANAGEMENT_DASHBOARD_JS, 'utf8');
  const managementDashboardCss = fs.readFileSync(MANAGEMENT_DASHBOARD_CSS, 'utf8');
  const campaignPlanningTruthJs = fs.readFileSync(CAMPAIGN_PLANNING_TRUTH_JS, 'utf8');
  const campaignPlanningTruthCss = fs.readFileSync(CAMPAIGN_PLANNING_TRUTH_CSS, 'utf8');
  const campaignDirectoryHardfixJs = fs.readFileSync(CAMPAIGN_DIRECTORY_HARDFIX_JS, 'utf8');
  const campaignCreationWizardJs = fs.readFileSync(CAMPAIGN_CREATION_WIZARD_JS, 'utf8');
  const campaignCreationWizardCss = fs.readFileSync(CAMPAIGN_CREATION_WIZARD_CSS, 'utf8');
  const deliveryDriveJs = fs.readFileSync(DELIVERY_DRIVE_JS, 'utf8');
  const deliveryDriveCss = fs.readFileSync(DELIVERY_DRIVE_CSS, 'utf8');
  const agentSidekickJs = fs.readFileSync(AGENT_SIDEKICK_JS, 'utf8');
  const agentSidekickCss = fs.readFileSync(AGENT_SIDEKICK_CSS, 'utf8');
  const accessCenterJs = fs.readFileSync(ACCESS_CENTER_JS, 'utf8');
  const accessCenterCss = fs.readFileSync(ACCESS_CENTER_CSS, 'utf8');
  const trafficCreativeLabJs = fs.readFileSync(TRAFFIC_CREATIVE_LAB_JS, 'utf8');
  const organizationCenterJs = fs.readFileSync(ORGANIZATION_CENTER_JS, 'utf8');
  const creatorsManagementJs = fs.readFileSync(CREATORS_MANAGEMENT_JS, 'utf8');
  const creatorsManagementCss = fs.readFileSync(CREATORS_MANAGEMENT_CSS, 'utf8');
  const trafficCreativeLabCss = fs.readFileSync(TRAFFIC_CREATIVE_LAB_CSS, 'utf8');

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
    const structured=c.tapStructured&&typeof c.tapStructured==='object'?c.tapStructured:null;
    const plans=Array.isArray(structured?.metas_por_fonte)?structured.metas_por_fonte:(Array.isArray(structured?.metas_por_canal)?structured.metas_por_canal:[]);
    const plannedGoal=plans.reduce((n,x)=>n+Number(x?.meta_faturamento||0),0);
    const plannedBudget=plans.reduce((n,x)=>n+Number(x?.investimento||0),0);
    c.goal=plans.length?plannedGoal:(Number(c.goal??c.meta??c.meta_faturamento??0)||0);
    c.budget=plans.length?plannedBudget:(Number(c.budget??c.investment??c.investimento??c.investimento_total??0)||0);
    c.progress=Math.max(0,Math.min(100,Number(c.progress??c.progresso??0)||0));
    c.color=String(c.color||c.cor||'#121415');
    c.offer=String(c.offer||c.oferta||'');
    c.objective=String(c.objective||c.objetivo||'');
    c.channels=Array.isArray(c.channels)?c.channels:(Array.isArray(c.canais)?c.canais:[]);
    c.products=Array.isArray(c.products)?c.products:(Array.isArray(c.produtos)?c.produtos:[]);
    c.benefits=Array.isArray(c.benefits)?c.benefits:(Array.isArray(c.beneficios)?c.beneficios:[]);
    c.schedule=Array.isArray(c.schedule)?c.schedule:(Array.isArray(c.cronograma)?c.cronograma:[]);
    if(structured){
      if(String(structured?.sobre_evento?.formato||'').trim())c.objective=String(structured.sobre_evento.formato).trim();
      const tapOffer=String(structured?.sobre_evento?.cupom_automatico||'').trim()||(Number(structured?.oferta?.desconto_geral||0)>0?Number(structured.oferta.desconto_geral)+'% OFF':'');
      if(tapOffer)c.offer=tapOffer;
      const tapProducts=Array.isArray(structured?.oferta?.produtos)?structured.oferta.produtos:[];
      if(tapProducts.length)c.products=tapProducts.map(p=>({sku:String(p?.sku||''),name:String(p?.nome||p?.name||''),price:Number(p?.preco??p?.price??0),discount:Number(p?.desconto??p?.discount??0)}));
      const tapBenefits=[structured?.oferta?.frete,structured?.oferta?.brinde,structured?.oferta?.bonus_universal,structured?.oferta?.bonus_influencer].map(x=>String(x||'').trim()).filter(Boolean);
      if(tapBenefits.length)c.benefits=tapBenefits;
      const tapSchedule=Array.isArray(structured?.cronograma)?structured.cronograma:[];
      if(tapSchedule.length)c.schedule=tapSchedule.map(r=>[String(r?.periodo||r?.prazo||''),String(r?.canal||''),String(r?.conteudo||''),String(r?.quem_faz||((r?.responsaveis||[]).join(', '))||'')]);
      const tapChannels=tapSchedule.map(r=>String(r?.canal||'').trim()).filter(Boolean);
      if(tapChannels.length)c.channels=[...new Set([...c.channels,...tapChannels])];
    }
    return c;
  }
  function filteredCampaigns(){const q=(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();const st=document.getElementById('campaignStatusFilter')?.value||'';const brand=getSelectedBrand();const allowed=new Set((window.AllianceOSDirectory?.brands||[]).map(b=>String(b?.nome||'')).filter(Boolean));return campaignData.map(normalizeCampaign).filter(c=>{if(c?.archivedAt)return false;if(allowed.size&&c.brand&&!allowed.has(String(c.brand)))return false;if(brand&&c.brand!==brand)return false;if(st&&c.status!==st)return false;if(q&&!\`\${c.name} \${c.type} \${c.owner} \${c.offer} \${c.channels.join(' ')}\`.toLowerCase().includes(q))return false;return true})}`;
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

          // AllianceOS: tarefas de campanha são vinculadas por campaignId.
          // Nome da lista fica apenas como fallback legado quando a tarefa não tem campaignId.
          const oldCampaignTaskFilter = "filter(t=>normalizeProject(t.project)===normalizeProject(c.name))";
          const newCampaignTaskFilter = "filter(t=>String(t.campaignId||'')===String(c.id)||(!t.campaignId&&normalizeProject(t.project)===normalizeProject(c.name)))";
          const campaignTaskFilterCount = s.split(oldCampaignTaskFilter).length - 1;
          if (campaignTaskFilterCount < 2) throw new Error('Não encontrei os filtros de tarefas da campanha para corrigir');
          s = s.replaceAll(oldCampaignTaskFilter, newCampaignTaskFilter);
          // CAMPAIGN_SCHEDULE_V5_CALENDAR
          const oldScheduleV5 = "  function renderSchedule(c){return `<section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Cronograma da campanha</strong><span>data → canal → ação</span></div><div class=\"cron-timeline\">${(c.schedule||[]).map(r=>`<div class=\"cron-row\"><div class=\"cron-date\">${cesc(r[0])}</div><div class=\"cron-events\"><span class=\"cron-pill\"><b>${cesc(r[1])}</b> · ${cesc(r[2])} · ${cesc(r[3])}</span></div></div>`).join('')}</div></section>`}";
          const newScheduleV5 = "  function renderSchedule(c){\n    const rows=Array.isArray(c.schedule)?c.schedule:[];\n    const year=+(String(c.start||'').slice(0,4))||new Date().getFullYear();\n    const monthFromStart=+(String(c.start||'').slice(5,7))||new Date().getMonth()+1;\n\n    const channelClass=v=>{\n      const n=String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');\n      if(n.includes('whatsapp'))return'whatsapp';\n      if(n.includes('e-mail')||n.includes('email'))return'email';\n      if(n.includes('instagram'))return'instagram';\n      if(n.includes('site')||n.includes('pagina')||n.includes('lp'))return'site';\n      if(n.includes('criativ')||n.includes('arte')||n.includes('video')||n.includes('imagem'))return'creative';\n      return'other';\n    };\n\n    const parseDates=label=>{\n      const text=String(label||'').toUpperCase();\n      const explicit=[...text.matchAll(/(\\d{1,2})\\/(\\d{1,2})/g)].map(m=>({d:+m[1],m:+m[2]}));\n      const out=[];\n      explicit.forEach(x=>out.push(new Date(year,x.m-1,x.d)));\n      const finalMonth=explicit.length?explicit[explicit.length-1].m:monthFromStart;\n      const beforeSlash=text.split('/')[0]||'';\n      const loose=[...beforeSlash.matchAll(/(?:SEG|TER|QUA|QUI|SEX|S[ÁA]B|DOM)\\s+(\\d{1,2})/g)].map(m=>+m[1]);\n      loose.forEach(d=>{\n        if(!out.some(x=>x.getDate()===d&&x.getMonth()===finalMonth-1))out.push(new Date(year,finalMonth-1,d));\n      });\n      if(!out.length){\n        const n=text.match(/(\\d{1,2})/);\n        if(n)out.push(new Date(year,monthFromStart-1,+n[1]));\n      }\n      return out.filter(d=>!Number.isNaN(d.getTime()));\n    };\n\n    const timeOf=label=>{\n      const text=String(label||'');\n      const hm=text.match(/(\\d{1,2})h(?:(\\d{2}))?/i);\n      if(hm)return hm[1].padStart(2,'0')+':'+(hm[2]||'00');\n      if(/manh[ãa]/i.test(text))return'Manhã';\n      if(/tarde/i.test(text))return'Tarde';\n      if(/noite/i.test(text))return'Noite';\n      if(/pitch/i.test(text))return'No pitch';\n      return'';\n    };\n\n    const events=[];\n    rows.forEach((r,index)=>{\n      parseDates(r?.[0]).forEach(date=>events.push({\n        id:index+'-'+date.getTime(),\n        date,\n        key:date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0'),\n        dateLabel:String(r?.[0]||''),\n        time:timeOf(r?.[0]),\n        channel:String(r?.[1]||'Canal'),\n        action:String(r?.[2]||'Ação não detalhada'),\n        owner:String(r?.[3]||'Sem responsável'),\n        cls:channelClass(r?.[1])\n      }));\n    });\n\n    const startCandidates=[c.start?new Date(c.start+'T00:00:00'):null,...events.map(e=>e.date)].filter(Boolean);\n    const endCandidates=[c.end?new Date(c.end+'T00:00:00'):null,...events.map(e=>e.date)].filter(Boolean);\n    const minDate=startCandidates.length?new Date(Math.min(...startCandidates.map(d=>d.getTime()))):new Date();\n    const maxDate=endCandidates.length?new Date(Math.max(...endCandidates.map(d=>d.getTime()))):new Date(minDate);\n    const first=new Date(minDate);\n    const wd=first.getDay();\n    first.setDate(first.getDate()+(wd===0?-6:1-wd));\n    first.setHours(0,0,0,0);\n    const last=new Date(maxDate);\n    const lwd=last.getDay();\n    last.setDate(last.getDate()+(lwd===0?0:7-lwd));\n    last.setHours(0,0,0,0);\n\n    const days=[];\n    for(let d=new Date(first);d<=last;d.setDate(d.getDate()+1))days.push(new Date(d));\n\n    const today=new Date();\n    today.setHours(0,0,0,0);\n    const startCampaign=c.start?new Date(c.start+'T00:00:00'):minDate;\n    const endCampaign=c.end?new Date(c.end+'T00:00:00'):maxDate;\n    const names=['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];\n    const monthTitle=minDate.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});\n    const channels=[...new Set(events.map(e=>e.channel))];\n\n    const eventCard=e=>{\n      return '<article class=\"schedule-event '+e.cls+'\">'+\n        '<div class=\"schedule-event-top\"><span class=\"schedule-event-channel\">'+cesc(e.channel)+'</span>'+\n        (e.time?'<time>'+cesc(e.time)+'</time>':'')+'</div>'+\n        '<b>'+cesc(e.action)+'</b><small>'+cesc(e.owner)+'</small></article>';\n    };\n\n    const dayCells=days.map((d,i)=>{\n      const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');\n      const list=events.filter(e=>e.key===key);\n      const outside=d<startCampaign||d>endCampaign;\n      const isToday=d.getTime()===today.getTime();\n      const firstThree=list.slice(0,3);\n      const rest=list.slice(3);\n      return '<section class=\"schedule-day '+(outside?'outside':'')+' '+(isToday?'today':'')+'\">'+\n        '<header><span>'+names[i%7]+'</span><b>'+d.getDate()+'</b>'+(isToday?'<em>Hoje</em>':'')+'</header>'+\n        '<div class=\"schedule-day-events\">'+firstThree.map(eventCard).join('')+\n        (rest.length?'<details class=\"schedule-more\"><summary>+'+rest.length+' '+(rest.length===1?'ação':'ações')+\n        '</summary><div>'+rest.map(eventCard).join('')+'</div></details>':'')+\n        '</div></section>';\n    }).join('');\n\n    const listRows=events.slice().sort((a,b)=>a.date-b.date||a.time.localeCompare(b.time)).map(e=>{\n      return '<div class=\"schedule-list-row\"><div class=\"schedule-list-date\"><b>'+cesc(e.dateLabel)+'</b>'+\n        (e.time?'<span>'+cesc(e.time)+'</span>':'')+'</div>'+\n        '<span class=\"schedule-list-channel '+e.cls+'\">'+cesc(e.channel)+'</span>'+\n        '<div class=\"schedule-list-action\"><b>'+cesc(e.action)+'</b><small>'+cesc(e.owner)+'</small></div></div>';\n    }).join('');\n\n    const legend=channels.map(ch=>{\n      return '<span class=\"schedule-legend-item '+channelClass(ch)+'\"><i></i>'+cesc(ch)+'</span>';\n    }).join('');\n\n    return '<section class=\"cw-card campaign-schedule-card\">'+\n      '<div class=\"schedule-toolbar\"><div><small>Cronograma da campanha</small><h3>'+cesc(monthTitle)+'</h3>'+\n      '<p>'+events.length+' '+(events.length===1?'ação':'ações')+' · '+channels.length+' '+(channels.length===1?'canal':'canais')+\n      ' · '+cDate(c.start)+' — '+cDate(c.end)+'</p></div>'+\n      '<div class=\"schedule-view-switch\">'+\n      '<input id=\"scheduleCalendarView\" type=\"radio\" name=\"scheduleView\" checked><label for=\"scheduleCalendarView\">Calendário</label>'+\n      '<input id=\"scheduleListView\" type=\"radio\" name=\"scheduleView\"><label for=\"scheduleListView\">Lista</label>'+\n      '</div></div>'+\n      '<div class=\"schedule-legend\">'+legend+'</div>'+\n      '<div class=\"schedule-view-panels\"><div class=\"schedule-calendar-panel\">'+\n      '<div class=\"schedule-weekdays\">'+names.map(n=>'<span>'+n+'</span>').join('')+'</div>'+\n      '<div class=\"schedule-calendar-grid\">'+dayCells+'</div></div>'+\n      '<div class=\"schedule-list-panel\">'+(listRows||'<div class=\"alliance-summary-empty\">Nenhuma ação cadastrada no cronograma.</div>')+\n      '</div></div></section>';\n  }";
          if (!s.includes(oldScheduleV5)) throw new Error('Não encontrei renderSchedule para transformar em calendário');
          s = s.replace(oldScheduleV5, newScheduleV5);

          // CAMPAIGN_OFFER_V4_RICH
          const oldOfferV4 = "  function renderOffer(c){return `<section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Produtos e condição comercial</strong><span>${cesc(c.offer)}</span></div><div style=\"overflow:auto\"><table class=\"offer-table\"><thead><tr><th>Produto</th><th>Preço base</th><th>Desconto</th><th>Preço final</th></tr></thead><tbody>${c.products.map(p=>`<tr><td><strong>${cesc(p.name)}</strong></td><td>${p.price?cMoney2(p.price):'A definir'}</td><td>${p.discount?p.discount+'%':'—'}</td><td><strong>${p.price?cMoney2(p.price*(1-p.discount/100)):'A definir'}</strong></td></tr>`).join('')}</tbody></table></div></section><section class=\"cw-card\" style=\"margin-top:12px\"><div class=\"cw-card-head\"><strong>Benefícios e complementos</strong><span>o que acompanha a oferta</span></div><div class=\"cw-card-body\"><div class=\"benefit-list\">${c.benefits.map(x=>`<span class=\"benefit\">${cesc(x)}</span>`).join('')}</div></div></section>`}";
          const newOfferV4 = "  function renderOffer(c){\n    const structured=c.tapStructured||{};\n    const event=structured.sobre_evento||{};\n    const offer=structured.oferta||{};\n    const rawProducts=(Array.isArray(offer.produtos)&&offer.produtos.length?offer.produtos:(Array.isArray(c.products)?c.products:[]));\n    const products=rawProducts.map(p=>({\n      sku:p.sku||p.codigo||'—',\n      name:p.nome||p.name||'Produto',\n      price:+(p.preco??p.price??0),\n      discount:+(p.desconto??p.discount??offer.desconto_geral??0)\n    }));\n    const discount=+(offer.desconto_geral||0);\n    const freight=String(offer.frete||'Não informado');\n    const gift=String(offer.brinde||'Sem brinde');\n    const universal=String(offer.bonus_universal||event.bonus_universal||'Sem bônus universal');\n    const influencer=String(offer.bonus_influencer||event.bonus_influencer||'Sem bônus exclusivo de influenciador');\n    const condition=String(event.cupom_automatico||c.offer||'Não informado');\n    const avgDiscount=products.length?Math.round(products.reduce((s,p)=>s+(p.discount||0),0)/products.length):discount;\n    const productRows=products.length?products.map(p=>{\n      const final=p.price?(p.price*(1-(p.discount||0)/100)):0;\n      return `<tr><td><div class=\"offer-product-main\"><strong>${cesc(p.name)}</strong><small>SKU ${cesc(p.sku)}</small></div></td><td>${p.price?cMoney2(p.price):'A definir'}</td><td>${p.discount?p.discount+'%':'—'}</td><td><strong>${final?cMoney2(final):'A definir'}</strong></td></tr>`;\n    }).join(''):'<tr><td colspan=\"4\"><div class=\"alliance-summary-empty\">Nenhum produto estruturado nesta campanha.</div></td></tr>';\n    const benefits=[\n      freight&&freight!=='Não informado'?'Frete: '+freight:'',\n      gift&&gift!=='Sem brinde'?'Brinde: '+gift:'',\n      universal&&universal!=='Sem bônus universal'?'Bônus: '+universal:'',\n      influencer&&influencer!=='Sem bônus exclusivo de influenciador'?'Influenciadores: '+influencer:'',\n      ...(Array.isArray(c.benefits)?c.benefits:[])\n    ].filter(Boolean);\n    return `<div class=\"offer-overview-grid\">\n      <section class=\"cw-card offer-hero-card\">\n        <div class=\"cw-card-head\"><strong>Mecânica comercial</strong><span>o que o cliente recebe</span></div>\n        <div class=\"cw-card-body\">\n          <div class=\"offer-mechanics-grid\">\n            <div class=\"offer-mechanic primary\"><small>Condição principal</small><b>${cesc(condition)}</b><span>${cesc(event.formato||c.type||'Campanha')}</span></div>\n            <div class=\"offer-mechanic\"><small>Desconto geral</small><b>${discount?discount+'%':avgDiscount?avgDiscount+'%':'—'}</b><span>condição aplicada à oferta</span></div>\n            <div class=\"offer-mechanic\"><small>Frete</small><b>${cesc(freight)}</b><span>regra de entrega da ação</span></div>\n            <div class=\"offer-mechanic\"><small>Produtos</small><b>${products.length}</b><span>SKUs nesta oferta</span></div>\n          </div>\n          <div class=\"offer-benefit-stack\">\n            <div><small>Bônus universal</small><b>${cesc(universal)}</b></div>\n            <div><small>Brinde</small><b>${cesc(gift)}</b></div>\n            <div><small>Bônus de influenciador</small><b>${cesc(influencer)}</b></div>\n          </div>\n        </div>\n      </section>\n      <section class=\"cw-card\">\n        <div class=\"cw-card-head\"><strong>Produtos e preços</strong><span>${products.length} produto(s)</span></div>\n        <div class=\"offer-table-wrap\"><table class=\"offer-table offer-table-rich\"><thead><tr><th>Produto / SKU</th><th>Preço base</th><th>Desconto</th><th>Preço final</th></tr></thead><tbody>${productRows}</tbody></table></div>\n      </section>\n      <section class=\"cw-card\">\n        <div class=\"cw-card-head\"><strong>Benefícios e complementos</strong><span>regras adicionais da oferta</span></div>\n        <div class=\"cw-card-body\">\n          <div class=\"offer-benefits-rich\">${benefits.length?benefits.map(x=>`<span>${cesc(x)}</span>`).join(''):'<div class=\"alliance-summary-empty\">Nenhum benefício complementar preenchido.</div>'}</div>\n          ${event.observacoes?`<div class=\"offer-observation\"><small>Observações da execução</small><p>${cesc(event.observacoes)}</p></div>`:''}\n        </div>\n      </section>\n    </div>`;\n  }";
          if (!s.includes(oldOfferV4)) throw new Error('Não encontrei renderOffer para expandir a oferta');
          s = s.replace(oldOfferV4, newOfferV4);

          // CAMPAIGN_WORKSPACE_V3_DELETE_SUMMARY
          const oldCloseWorkspaceV3 = "  function closeCampaignWorkspace(){campaignState.selected=null;document.getElementById('campaignOverviewList').classList.remove('hidden');document.getElementById('campaignWorkspace').classList.remove('active');renderCampaigns()}";
          const newCloseWorkspaceV3 = "  function closeCampaignWorkspace(){campaignState.selected=null;document.getElementById('campaignOverviewList').classList.remove('hidden');document.getElementById('campaignWorkspace').classList.remove('active');renderCampaigns()}\n  function deleteCampaign(id){\n    const c=campaignData.find(x=>String(x.id)===String(id));\n    if(!c)return;\n    const linked=(window.__centralGetTasks?.()||[]).filter(t=>String(t.campaignId||'')===String(c.id)||(!t.campaignId&&normalizeProject(t.project)===normalizeProject(c.name)));\n    const detail=linked.length?'\\n\\nAs '+linked.length+' tarefa(s) vinculada(s) continuarão no sistema.':'';\n    if(!confirm('Excluir a campanha “'+c.name+'”?'+detail+'\\n\\nEla será arquivada e deixará de aparecer no planejamento.'))return;\n    c.archivedAt=new Date().toISOString();\n    c.archivedBy=user?.id||'interface';\n    c.updatedAt=new Date().toISOString();\n    saveCampaigns();\n    campaignState.selected=null;\n    document.getElementById('campaignOverviewList').classList.remove('hidden');\n    document.getElementById('campaignWorkspace').classList.remove('active');\n    renderCampaigns();\n    showToast('Campanha excluída');\n  }";
          if (!s.includes(oldCloseWorkspaceV3)) throw new Error('Não encontrei closeCampaignWorkspace para ligar exclusão');
          s = s.replace(oldCloseWorkspaceV3, newCloseWorkspaceV3);

          const oldWorkspaceV3 = "  function renderWorkspace(){const c=campaignData.find(x=>String(x.id)===String(campaignState.selected));if(!c){closeCampaignWorkspace();return}const ws=document.getElementById('campaignWorkspace');const panes={summary:renderSummary(c),offer:renderOffer(c),schedule:renderSchedule(c),tap:renderTap(c),tasks:renderCampaignTasks(c)};ws.innerHTML=`<div class=\"cw-top\"><button class=\"cw-back\" id=\"cwBack\" type=\"button\">←</button><div class=\"cw-title\"><small>${cesc(c.brand)} · ${cesc(c.type)}</small><h2>${cesc(c.name)}</h2><p>${cDate(c.start)} — ${cDate(c.end)} · ${cesc(c.owner)}</p></div><div class=\"cw-status\"><span class=\"camp-chip ${statusClass(c.status)}\">${cesc(c.status)}</span> <button class=\"cw-edit-btn\" id=\"cwEdit\" type=\"button\">Editar campanha</button></div></div><div class=\"cw-tabs\"><button class=\"cw-tab ${campaignState.workspaceTab==='summary'?'active':''}\" data-cw-tab=\"summary\" type=\"button\">Resumo</button><button class=\"cw-tab ${campaignState.workspaceTab==='offer'?'active':''}\" data-cw-tab=\"offer\" type=\"button\">Oferta</button><button class=\"cw-tab ${campaignState.workspaceTab==='schedule'?'active':''}\" data-cw-tab=\"schedule\" type=\"button\">Cronograma</button><button class=\"cw-tab ${campaignState.workspaceTab==='tap'?'active':''}\" data-cw-tab=\"tap\" type=\"button\">TAP</button><button class=\"cw-tab ${campaignState.workspaceTab==='tasks'?'active':''}\" data-cw-tab=\"tasks\" type=\"button\">Tarefas</button></div>${Object.entries(panes).map(([k,v])=>`<div class=\"cw-pane ${campaignState.workspaceTab===k?'active':''}\" data-cw-pane=\"${k}\">${v}</div>`).join('')}`;document.getElementById('cwBack').addEventListener('click',closeCampaignWorkspace);document.getElementById('cwEdit').addEventListener('click',()=>openCampaignModal(c.id));document.querySelectorAll('[data-cw-tab]').forEach(b=>b.addEventListener('click',()=>{campaignState.workspaceTab=b.dataset.cwTab;renderWorkspace()}));bindTapEditing(c);bindCampaignTaskLinks(c)}";
          const newWorkspaceV3 = "  function renderWorkspace(){const raw=campaignData.find(x=>String(x.id)===String(campaignState.selected));if(!raw){closeCampaignWorkspace();return}const c=normalizeCampaign(raw);const ws=document.getElementById('campaignWorkspace');const panes={summary:renderSummary(c),offer:renderOffer(c),schedule:renderSchedule(c),tap:renderTap(c),tasks:renderCampaignTasks(c)};ws.innerHTML=`<div class=\"cw-top\"><button class=\"cw-back\" id=\"cwBack\" type=\"button\">←</button><div class=\"cw-title\"><small>${cesc(c.brand)} · ${cesc(c.type)}</small><h2>${cesc(c.name)}</h2><p>${cDate(c.start)} — ${cDate(c.end)} · ${cesc(c.owner)}</p></div><div class=\"cw-status\"><span class=\"camp-chip ${statusClass(c.status)}\">${cesc(c.status)}</span><button class=\"cw-edit-btn\" id=\"cwEdit\" type=\"button\">Editar campanha</button><button class=\"cw-delete-btn\" id=\"cwDelete\" type=\"button\">Excluir</button></div></div><div class=\"cw-tabs\"><button class=\"cw-tab ${campaignState.workspaceTab==='summary'?'active':''}\" data-cw-tab=\"summary\" type=\"button\">Resumo</button><button class=\"cw-tab ${campaignState.workspaceTab==='offer'?'active':''}\" data-cw-tab=\"offer\" type=\"button\">Oferta</button><button class=\"cw-tab ${campaignState.workspaceTab==='schedule'?'active':''}\" data-cw-tab=\"schedule\" type=\"button\">Cronograma</button><button class=\"cw-tab ${campaignState.workspaceTab==='tap'?'active':''}\" data-cw-tab=\"tap\" type=\"button\">TAP</button><button class=\"cw-tab ${campaignState.workspaceTab==='tasks'?'active':''}\" data-cw-tab=\"tasks\" type=\"button\">Tarefas</button></div>${Object.entries(panes).map(([k,v])=>`<div class=\"cw-pane ${campaignState.workspaceTab===k?'active':''}\" data-cw-pane=\"${k}\">${v}</div>`).join('')}`;document.getElementById('cwBack').addEventListener('click',closeCampaignWorkspace);document.getElementById('cwEdit').addEventListener('click',()=>openCampaignModal(c.id));document.getElementById('cwDelete').addEventListener('click',()=>deleteCampaign(c.id));document.querySelectorAll('[data-cw-tab]').forEach(b=>b.addEventListener('click',()=>{campaignState.workspaceTab=b.dataset.cwTab;renderWorkspace()}));bindTapEditing(c);bindCampaignTaskLinks(c)}";
          if (!s.includes(oldWorkspaceV3)) throw new Error('Não encontrei renderWorkspace para ligar exclusão');
          s = s.replace(oldWorkspaceV3, newWorkspaceV3);

          const oldSummaryV3 = "  function renderSummary(c){const taskRows=(window.__centralGetTasks?.()||[]).filter(t=>String(t.campaignId||'')===String(c.id)||(!t.campaignId&&normalizeProject(t.project)===normalizeProject(c.name)));const done=taskRows.filter(t=>t.status==='feito').length;const tPct=taskRows.length?Math.round(done/taskRows.length*100):0;return `<div class=\"cw-grid\"><div><section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Estratégia da campanha</strong><span>contexto operacional</span></div><div class=\"cw-card-body\"><p class=\"cw-desc\">${cesc(c.objective)}</p><div class=\"cw-channels\">${c.channels.map(x=>`<span class=\"cw-channel\">${cesc(x)}</span>`).join('')}</div></div></section><section class=\"cw-card\" style=\"margin-top:12px\"><div class=\"cw-card-head\"><strong>Oferta</strong><span>${c.products.length} produto(s)</span></div><div class=\"cw-card-body\"><b style=\"font-size:11px\">${cesc(c.offer)}</b><div class=\"benefit-list\" style=\"margin-top:10px\">${c.benefits.map(x=>`<span class=\"benefit\">${cesc(x)}</span>`).join('')}</div></div></section></div><aside><section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Números</strong><span>${c.progress}% executado</span></div><div class=\"cw-card-body\"><div class=\"cw-properties\"><div class=\"cw-prop\"><small>Meta</small><b>${cMoney(c.goal)}</b></div><div class=\"cw-prop\"><small>Verba</small><b>${cMoney(c.budget)}</b></div><div class=\"cw-prop\"><small>ROAS alvo</small><b>${c.budget?(c.goal/c.budget).toFixed(1).replace('.',','):'—'}</b></div><div class=\"cw-prop\"><small>Tarefas</small><b>${done}/${taskRows.length||0}</b></div></div><div class=\"cw-goalbar\"><i style=\"width:${Math.min(100,c.progress)}%\"></i></div><div class=\"cw-small\" style=\"margin-top:5px\">Execução da campanha · ${c.progress}%</div>${taskRows.length?`<div class=\"cw-goalbar\" style=\"margin-top:12px\"><i style=\"width:${tPct}%;background:#4f8a70\"></i></div><div class=\"cw-small\" style=\"margin-top:5px\">Conclusão das tarefas · ${tPct}%</div>`:''}</div></section><section class=\"cw-card\" style=\"margin-top:12px\"><div class=\"cw-card-head\"><strong>Propriedades</strong></div><div class=\"cw-card-body\"><div class=\"cw-properties\"><div class=\"cw-prop\"><small>Responsável</small><b>${cesc(c.owner)}</b></div><div class=\"cw-prop\"><small>Marca</small><b>${cesc(c.brand)}</b></div><div class=\"cw-prop\"><small>Formato</small><b>${cesc(c.type)}</b></div><div class=\"cw-prop\"><small>Status</small><b>${cesc(c.status)}</b></div></div></div></section></aside></div>`}";
          const newSummaryV3 = "  function renderSummary(c){\n    const taskRows=(window.__centralGetTasks?.()||[]).filter(t=>String(t.campaignId||'')===String(c.id)||(!t.campaignId&&normalizeProject(t.project)===normalizeProject(c.name)));\n    const done=taskRows.filter(t=>t.status==='feito').length;\n    const doing=taskRows.filter(t=>t.status==='fazendo'||t.status==='em andamento').length;\n    const pending=Math.max(0,taskRows.length-done-doing);\n    const tPct=taskRows.length?Math.round(done/taskRows.length*100):0;\n    const structured=c.tapStructured||{};\n    const event=structured.sobre_evento||{};\n    const offer=structured.oferta||{};\n    const phases=Array.isArray(structured.fases)?structured.fases.filter(x=>x&&x.tem!==false):[];\n    const team=Array.isArray(structured.equipe)?structured.equipe:[];\n    const metaRows=Array.isArray(structured.metas_por_fonte)?structured.metas_por_fonte:[];\n    const cron=Array.isArray(structured.cronograma)?structured.cronograma:[];\n    const metaSum=metaRows.reduce((s,x)=>s+(+x.meta_faturamento||0),0);\n    const budgetSum=metaRows.reduce((s,x)=>s+(+x.investimento||0),0);\n    const goal=metaSum||(+c.goal||0);\n    const budget=budgetSum||(+c.budget||0);\n    const channels=[...new Set([...(Array.isArray(c.channels)?c.channels:[]),...cron.map(x=>x?.canal).filter(Boolean)])];\n    const observations=String(event.observacoes||'').trim();\n    const context=String(c.objective||event.formato||observations||'Contexto estratégico ainda não preenchido.');\n    const discount=offer.desconto_geral||event.cupom_automatico||'';\n    const products=Array.isArray(offer.produtos)?offer.produtos:(Array.isArray(c.products)?c.products:[]);\n    const benefits=[\n      c.offer,\n      event.cupom_automatico,\n      offer.frete?('Frete: '+offer.frete):'',\n      offer.brinde?('Brinde: '+offer.brinde):'',\n      offer.bonus_universal?('Bônus: '+offer.bonus_universal):'',\n      event.bonus_influencer?('Bônus influenciador: '+event.bonus_influencer):'',\n      ...(Array.isArray(c.benefits)?c.benefits:[])\n    ].filter(Boolean);\n    const phaseHtml=phases.length?phases.map(p=>`<div class=\"alliance-phase\"><i></i><div><b>${cesc(p.nome||'Etapa')}</b><span>${cesc(p.data_legada||cDate(p.data||''))}</span></div></div>`).join(''):'<div class=\"alliance-summary-empty\">Nenhuma fase estruturada ainda.</div>';\n    const teamHtml=team.length?team.map(x=>`<div class=\"alliance-team-row\"><b>${cesc(x.quem||'Responsável')}</b><span>${cesc(x.responsabilidade||'Responsabilidade não detalhada')}</span></div>`).join(''):'<div class=\"alliance-summary-empty\">Equipe ainda não detalhada.</div>';\n    const metaHtml=metaRows.length?metaRows.map(x=>`<div class=\"alliance-meta-row\"><div><b>${cesc(x.fonte||'Canal')}</b><span>${cesc(x.responsavel||'Sem responsável')}</span></div><strong>${cMoney(+x.meta_faturamento||0)}</strong><em>${cMoney(+x.investimento||0)}</em></div>`).join(''):'<div class=\"alliance-summary-empty\">Metas por canal ainda não preenchidas.</div>';\n    const cronHtml=cron.length?cron.slice(0,8).map(x=>`<div class=\"alliance-cron-row\"><span>${cesc(x.periodo||x.prazo||'—')}</span><b>${cesc(x.canal||'Canal')}</b><p>${cesc(x.conteudo||x.acao||'Ação não detalhada')}</p><em>${cesc(x.quem_faz||((x.responsaveis||[]).join(', '))||'')}</em></div>`).join(''):'<div class=\"alliance-summary-empty\">Cronograma estruturado ainda não preenchido.</div>';\n    return `<div class=\"alliance-summary-grid\"><main>\n      <section class=\"cw-card alliance-summary-hero\"><div class=\"cw-card-head\"><strong>O que é esta campanha</strong><span>${cesc(c.type||'Campanha')}</span></div><div class=\"cw-card-body\"><p class=\"alliance-summary-lead\">${cesc(context)}</p>${observations&&observations!==context?`<div class=\"alliance-summary-note\"><b>Contexto e decisões</b><p>${cesc(observations)}</p></div>`:''}<div class=\"alliance-summary-tags\">${channels.map(x=>`<span>${cesc(x)}</span>`).join('')}</div></div></section>\n      <section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Oferta e mecânica</strong><span>${products.length} produto(s)</span></div><div class=\"cw-card-body\"><div class=\"alliance-offer-grid\"><div><small>Oferta principal</small><b>${cesc(c.offer||discount||'Não preenchida')}</b></div><div><small>Condição</small><b>${cesc(String(discount||'—'))}</b></div></div><div class=\"alliance-offer-lines\">${benefits.length?benefits.map(x=>`<span>${cesc(x)}</span>`).join(''):'<span>Benefícios ainda não detalhados.</span>'}</div></div></section>\n      <section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Fases e momentos críticos</strong><span>${phases.length} etapa(s)</span></div><div class=\"cw-card-body\"><div class=\"alliance-phases\">${phaseHtml}</div></div></section>\n      <section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Cronograma operacional</strong><span>quando · canal · ação · dono</span></div><div class=\"cw-card-body\"><div class=\"alliance-cron-list\">${cronHtml}</div></div></section>\n      <section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Equipe e responsabilidades</strong><span>quem faz o quê</span></div><div class=\"cw-card-body\"><div class=\"alliance-team-list\">${teamHtml}</div></div></section>\n    </main><aside>\n      <section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Números da campanha</strong><span>${tPct}% das tarefas concluídas</span></div><div class=\"cw-card-body\"><div class=\"cw-properties\"><div class=\"cw-prop\"><small>Meta</small><b>${cMoney(goal)}</b></div><div class=\"cw-prop\"><small>Verba</small><b>${cMoney(budget)}</b></div><div class=\"cw-prop\"><small>ROAS alvo</small><b>${budget?(goal/budget).toFixed(1).replace('.',','):'—'}</b></div><div class=\"cw-prop\"><small>Tarefas</small><b>${done}/${taskRows.length}</b></div></div><div class=\"cw-goalbar\"><i style=\"width:${tPct}%;background:#121415\"></i></div><div class=\"cw-small\" style=\"margin-top:5px\">Conclusão operacional · ${tPct}%</div></div></section>\n      <section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Execução</strong><span>situação das tarefas</span></div><div class=\"cw-card-body\"><div class=\"alliance-task-stats\"><div><b>${done}</b><span>Concluídas</span></div><div><b>${doing}</b><span>Em andamento</span></div><div><b>${pending}</b><span>Pendentes</span></div></div></div></section>\n      <section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Propriedades</strong></div><div class=\"cw-card-body\"><div class=\"cw-properties\"><div class=\"cw-prop\"><small>Responsável</small><b>${cesc(c.owner||'Sem responsável')}</b></div><div class=\"cw-prop\"><small>Marca</small><b>${cesc(c.brand||'—')}</b></div><div class=\"cw-prop\"><small>Formato</small><b>${cesc(c.type||'—')}</b></div><div class=\"cw-prop\"><small>Status</small><b>${cesc(c.status||'—')}</b></div><div class=\"cw-prop alliance-prop-wide\"><small>Período</small><b>${cDate(c.start)} — ${cDate(c.end)}</b></div></div></div></section>\n      <section class=\"cw-card alliance-meta-card\"><div class=\"cw-card-head\"><strong>Metas por canal</strong><span>meta · verba</span></div><div class=\"cw-card-body\"><div class=\"alliance-meta-head\"><span>Fonte</span><span>Meta</span><span>Verba</span></div>${metaHtml}<div class=\"alliance-meta-total\"><span>Total</span><strong>${cMoney(goal)}</strong><em>${cMoney(budget)}</em></div></div></section>\n    </aside></div>`;\n  }";
          if (!s.includes(oldSummaryV3)) throw new Error('Não encontrei renderSummary para expandir resumo');
          s = s.replace(oldSummaryV3, newSummaryV3);


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

          // AllianceOS Drive: confirmar a pasta antes de concluir a entrega.
          const oldHandoffFileSave = "const previous=deliveries.filter(d=>String(d.sourceTaskId)===String(taskId)&&d.to===to);const deliveryId='del-'+Date.now();const fileMeta=deliveryState.pendingFiles.map((f,i)=>({id:'f'+Date.now()+'-'+i,name:f.name,type:f.type||'',size:f.size}));try{await Promise.all(deliveryState.pendingFiles.map((f,i)=>putBlob(\`\${deliveryId}:\${fileMeta[i].id}\`,f)))}catch(e){showToast('Algum arquivo não pôde ser salvo neste navegador');return}const complete=document.getElementById('handoffCompleteTask').checked;";
          const newHandoffFileSave = "const previous=deliveries.filter(d=>String(d.sourceTaskId)===String(taskId)&&d.to===to);const deliveryId='del-'+Date.now();let driveResult=null;try{if(window.AllianceOSDeliveryDrive?.confirmAndUpload){driveResult=await window.AllianceOSDeliveryDrive.confirmAndUpload({deliveryId,task,title:title||\`Entrega · \${task.title}\`,note,to,files:[...deliveryState.pendingFiles],links:deliveryState.pendingLinks.map(x=>({...x}))});if(!driveResult||driveResult.cancelled)return}}catch(e){console.error('[AllianceOS Drive] falha ao salvar entrega',e);showToast(e?.message||'Não foi possível salvar no Google Drive.');return}const fileMeta=(driveResult&&Array.isArray(driveResult.files)&&driveResult.files.length)?driveResult.files:deliveryState.pendingFiles.map((f,i)=>({id:'f'+Date.now()+'-'+i,name:f.name,type:f.type||'',size:f.size}));if((!driveResult||!Array.isArray(driveResult.files)||!driveResult.files.length)&&deliveryState.pendingFiles.length){try{await Promise.all(deliveryState.pendingFiles.map((f,i)=>putBlob(\`\${deliveryId}:\${fileMeta[i].id}\`,f)))}catch(e){showToast('Algum arquivo não pôde ser salvo neste navegador');return}}const complete=document.getElementById('handoffCompleteTask').checked;";
          if (!s.includes(oldHandoffFileSave)) throw new Error('Não encontrei o salvamento legado de arquivos da entrega');
          s = s.replace(oldHandoffFileSave, newHandoffFileSave);

          const oldHandoffDriveMeta = "version:previous.length+1,completeTask:complete,files:fileMeta,links:";
          const newHandoffDriveMeta = "version:previous.length+1,completeTask:complete,drive:driveResult?.destination||null,files:fileMeta,links:";
          if (!s.includes(oldHandoffDriveMeta)) throw new Error('Não encontrei a estrutura da entrega para registrar o Drive');
          s = s.replace(oldHandoffDriveMeta, newHandoffDriveMeta);

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

        // AllianceOS: the legacy brand observer must preserve the configurable
        // display name of the aggregate workspace (internally it still uses
        // "Todas as marcas" as the sentinel value).
        if (s.includes("const TODAS = 'Todas as marcas';") && s.includes('function opcoes(sel, { comTodas, valor })')) {
          const oldApply = `  function aplicar() {
    opcoes(document.getElementById('brandSelect'), { comTodas: true });`;
          const newApply = `  function aplicar() {
    const aoBrands = (window.AllianceOSDirectory?.brands || []).map((b) => b?.nome).filter(Boolean);
    if (aoBrands.length) lista = aoBrands;
    opcoes(document.getElementById('brandSelect'), { comTodas: true });`;
          if (s.includes(oldApply)) s = s.replace(oldApply, newApply);

          const oldOptions = `    if (tem.length === quer.length && tem.every((t, i) => t === quer[i])) {
      if (escolhido && tem.includes(escolhido)) sel.value = escolhido;
      return;
    }
    sel.innerHTML = quer.map((m) => \`<option\${m === escolhido ? ' selected' : ''}>\${m}</option>\`).join('');
    if (escolhido && quer.includes(escolhido)) sel.value = escolhido;`;
          const newOptions = `    const allLabel = window.AllianceOSDirectory?.allBrandsProfile?.configuracoes?.profile_name
      || window.AllianceOSDirectory?.allBrandsProfile?.nome
      || TODAS;
    if (tem.length === quer.length && tem.every((t, i) => t === quer[i])) {
      const allOpt = [...sel.options].find((o) => (o.value || o.textContent) === TODAS);
      if (allOpt && allOpt.textContent !== allLabel) allOpt.textContent = allLabel;
      if (escolhido && tem.includes(escolhido)) sel.value = escolhido;
      return;
    }
    const opts = quer.map((m) => {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = m === TODAS ? allLabel : m;
      if (m === escolhido) o.selected = true;
      return o;
    });
    sel.replaceChildren(...opts);
    if (escolhido && quer.includes(escolhido)) sel.value = escolhido;`;
          if (s.includes(oldOptions)) s = s.replace(oldOptions, newOptions);
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
  // Remove the legacy hardcoded user name before auth hydrates the registered profile.
  html = html.replace(/<h1 id="greeting">[^<]*<\/h1>/, '<h1 id="greeting">Olá.</h1>');
  const mapSaveOld = "  const salvar = () => { try { localStorage.setItem(chave(), JSON.stringify(M)) } catch (e) { console.error('[mapa]', e) } };";
  const mapSaveNew = "  const salvar = () => { try { localStorage.setItem(chave(), JSON.stringify(M)); window.AllianceOSMapSync?.queue?.(M, marcaAtual()); } catch (e) { console.error('[mapa]', e) } };";
  if (!html.includes(mapSaveOld)) throw new Error('Não encontrei o salvamento do mapa mental para ligar ao Supabase canônico');
  html = html.replace(mapSaveOld,mapSaveNew);
  // Planning maps are monthly. Keep the legacy key untouched as migration source,
  // but make the live map key include the selected planning month.
  const mapKeyOld = `  const chave = (marca) => {
    const id = (window.user && window.user.id) || 'vitor-gutierrez';
    const m = marca === undefined ? marcaAtual() : marca;
    return \`central.planning.map.\${id}\` + (m ? '.' + m : '');
  };`;
  const mapKeyNew = `  const mesMapa = () => {
    const live = String(window.AlliancePlanningMonthRef || '');
    if (/^20\\d{2}-(0[1-9]|1[0-2])$/.test(live)) return live;
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };
  const chave = (marca) => {
    const id = (window.user && window.user.id) || 'vitor-gutierrez';
    const m = marca === undefined ? marcaAtual() : marca;
    return \`central.planning.map.\${id}\` + (m ? '.' + m : '') + '.' + mesMapa();
  };`;
  if (!html.includes(mapKeyOld)) throw new Error('Não encontrei a chave do mapa mental para separar os planejamentos por mês');
  html = html.replace(mapKeyOld,mapKeyNew);

  // MAP_RIGHT_ONLY_V1 — Planejamento usa a árvore horizontal padrão do AllianceOS.
  // A raiz fica à esquerda e todo nível seguinte cresce somente para a direita.
  const mapLayoutLoadOld = "    cru.layout = cru.layout || 'direita';";
  const mapLayoutLoadNew = "    cru.layout = 'direita';";
  if (html.includes(mapLayoutLoadOld)) html = html.replace(mapLayoutLoadOld,mapLayoutLoadNew);
  else console.warn('[AllianceOS build] mapa: normalização de layout não encontrada');

  const mapChildrenOld = "  const filhos = (id) => M.nos.filter((n) => n.pai === id);";
  const mapChildrenNew = "  const filhos = (id) => M.nos.filter((n) => n.pai === id).sort((a,b)=>(Number(a.y)||0)-(Number(b.y)||0));";
  if (html.includes(mapChildrenOld)) html = html.replace(mapChildrenOld,mapChildrenNew);
  else console.warn('[AllianceOS build] mapa: ordenação de filhos não encontrada');

  const mapSideOld = "  function lado(n) { const r = raiz(); if (!r || n.id === r.id) return 1; let a = n, g = 0; while (a.pai && a.pai !== r.id && g++ < 80) a = acharNo(a.pai) || a; return (a.x ?? 0) < (r.x ?? 0) ? -1 : 1 }";
  const mapSideNew = "  function lado(n) { return 1 }";
  if (html.includes(mapSideOld)) html = html.replace(mapSideOld,mapSideNew);
  else console.warn('[AllianceOS build] mapa: função de lado não encontrada');

  const mapCalcOld = `    if (M.layout === 'radial') {
      espalhar(r, n1.filter((_, i) => i % 2 === 0), 1);
      espalhar(r, n1.filter((_, i) => i % 2 === 1), -1);
    } else espalhar(r, n1, 1);`;
  const mapCalcNew = `    M.layout = 'direita';
    espalhar(r, n1, 1);`;
  if (html.includes(mapCalcOld)) html = html.replace(mapCalcOld,mapCalcNew);
  else console.warn('[AllianceOS build] mapa: cálculo radial não encontrado');

  const mapToggleMenuOld = "        menu.appendChild(item('Alternar layout', '', trocarLayout));\n";
  if (html.includes(mapToggleMenuOld)) html = html.replace(mapToggleMenuOld,'');
  const mapToggleFnOld = "  function trocarLayout() { guardar(); M.layout = M.layout === 'radial' ? 'direita' : 'radial'; organizar(); salvar() }";
  const mapToggleFnNew = "  function trocarLayout() { guardar(); M.layout = 'direita'; organizar(); salvar() }";
  if (html.includes(mapToggleFnOld)) html = html.replace(mapToggleFnOld,mapToggleFnNew);
  console.log('[AllianceOS build] mapa mental fixado em árvore horizontal para a direita');

  // ACTIVE_MONTHLY_GOAL_PILL_V1 — a Meta ativa fica preenchida com a cor do ramo.
  // As demais metas continuam no visual outline já usado pelo mapa.
  const activeGoalCssAnchor = ".mp-no.mp-raiz{";
  const activeGoalCss = `.mp-no.mp-meta-ativa{
  font-weight:700;
  color:#fff;
  box-shadow:0 5px 16px rgba(194,90,74,.22);
}
.mp-no.mp-meta-ativa .mp-txt{color:inherit}
.mp-no.mp-meta-ativa:hover{filter:brightness(.97)}
`;
  if (html.includes(activeGoalCssAnchor) && !html.includes('.mp-no.mp-meta-ativa{')) {
    html = html.replace(activeGoalCssAnchor, activeGoalCss + activeGoalCssAnchor);
  }

  const activeGoalTreeAnchor = "  function lado(n) { return 1 }";
  const activeGoalHelpers = `  function metaAtivaNivel() {
    const m = window.AlliancePlanningMonthMetrics;
    const refOk = !m?.ref || m.ref === mesMapa();
    const marcaOk = !m?.brand || textoNormal(m.brand) === textoNormal(marcaAtual());
    if (m && refOk && marcaOk && Number(m.active || 0) > 0) return Number(m.active);
    return Number(M?.planejamentoExecutivo?.metaAtiva || M?.planejamentoExecutivo?.meta_ativa || 1);
  }
  function ehMetaAtiva(n) {
    if (!n?.pai) return false;
    const p = acharNo(n.pai);
    if (!p || textoNormal(p.t) !== textoNormal('1. METAS DO MÊS')) return false;
    const mt = String(n.t || '').match(/^Meta\\s+([123])\\b/i);
    return !!mt && Number(mt[1]) === metaAtivaNivel();
  }
`;
  if (html.includes(activeGoalTreeAnchor) && !html.includes('function ehMetaAtiva(n)')) {
    html = html.replace(activeGoalTreeAnchor, activeGoalHelpers + activeGoalTreeAnchor);
  }

  const activeGoalRenderAnchor = "      const temSelo = !!(n.nota || n.feito || n.campId);";
  if (html.includes(activeGoalRenderAnchor) && !html.includes("      const metaAtiva = ehMetaAtiva(n);")) {
    html = html.replace(activeGoalRenderAnchor, activeGoalRenderAnchor + "\n      const metaAtiva = ehMetaAtiva(n);");
  }

  const activeGoalClassOld = "        + (n.feito ? ' mp-feito' : '') + (temSelo ? ' mp-comselo' : '')\n        + (sel.t === 'no' && sel.id === n.id ? ' mp-sel' : '');";
  const activeGoalClassNew = "        + (n.feito ? ' mp-feito' : '') + (temSelo ? ' mp-comselo' : '')\n        + (metaAtiva ? ' mp-meta-ativa' : '')\n        + (sel.t === 'no' && sel.id === n.id ? ' mp-sel' : '');";
  if (html.includes(activeGoalClassOld)) html = html.replace(activeGoalClassOld,activeGoalClassNew);

  const activeGoalPaintOld = "      if (n.fundo) d.style.background = n.fundo;";
  const activeGoalPaintNew = `      if (n.fundo) d.style.background = n.fundo;
      if (metaAtiva) {
        const corAtiva = ramoCor(n);
        d.style.background = corAtiva;
        d.style.borderColor = corAtiva;
        d.style.color = '#fff';
      }`;
  if (html.includes(activeGoalPaintOld) && !html.includes('const corAtiva = ramoCor(n);')) {
    html = html.replace(activeGoalPaintOld,activeGoalPaintNew);
  }

  const activeGoalBootOld = `  if (document.readyState === 'loading')
    addEventListener('DOMContentLoaded', vigiar, { once: true });
  else vigiar();`;
  const activeGoalBootNew = activeGoalBootOld + `

  addEventListener('allianceos:planning-metrics', () => {
    if (cerca?.isConnected && M) desenhar();
  });`;
  if (html.includes(activeGoalBootOld) && !html.includes("addEventListener('allianceos:planning-metrics', () => {\n    if (cerca?.isConnected && M) desenhar();")) {
    html = html.replace(activeGoalBootOld,activeGoalBootNew);
  }
  console.log('[AllianceOS build] meta ativa destacada com pílula preenchida');

  // CHANNEL_PERCENT_TAGS_V1 — canais filhos das metas exibem a participação
  // em uma tag colorida, sem poluir o texto salvo do nó na interface.
  const pctTagCssAnchor = ".mp-no.mp-raiz{";
  const pctTagCss = `.mp-pct-tag{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  height:18px;
  padding:0 7px;
  margin-left:7px;
  border-radius:999px;
  color:#fff;
  font-size:9px;
  font-weight:750;
  line-height:1;
  letter-spacing:.01em;
  white-space:nowrap;
  box-shadow:0 1px 3px rgba(20,24,28,.10);
}
`;
  if (html.includes(pctTagCssAnchor) && !html.includes('.mp-pct-tag{')) {
    html = html.replace(pctTagCssAnchor,pctTagCss + pctTagCssAnchor);
  }

  const pctHelperAnchor = "  function lado(n) { return 1 }";
  const pctHelpers = `  function extrairPctTag(txt) {
    const bruto = String(txt || '');
    const m = bruto.match(/\\s*\\[\\[([0-9]+(?:[.,][0-9]+)?)%\\]\\]\\s*$/);
    if (!m) return { base: bruto, label: '', raw: '' };
    return {
      base: bruto.slice(0, m.index).trim(),
      label: m[1] + '%',
      raw: ' [[' + m[1] + '%]]'
    };
  }
  function corPctTag(txt) {
    const s = textoNormal(extrairPctTag(txt).base);
    if (s.startsWith('performance') || s.startsWith('trafego')) return '#2563eb';
    if (s.startsWith('midia paga')) return '#3b82f6';
    if (s.startsWith('lives')) return '#1d4ed8';
    if (s.startsWith('influenciadores')) return '#7c3aed';
    if (s.startsWith('organico')) return '#059669';
    if (s.startsWith('crm')) return '#ea580c';
    if (s.startsWith('api')) return '#f97316';
    if (s.startsWith('investimento')) return '#2f8f74';
    if (s.startsWith('tiktok')) return '#111827';
    if (s.startsWith('atendimento')) return '#0891b2';
    if (s.startsWith('reserva')) return '#64748b';
    if (s.startsWith('perpetuo')) return '#c2412d';
    if (s.startsWith('campanhas pontuais')) return '#dc5a43';
    if (s.startsWith('dia d')) return '#e05f49';
    if (s.startsWith('semana rosa')) return '#db4d79';
    return '#475569';
  }
`;
  if (html.includes(pctHelperAnchor) && !html.includes('function extrairPctTag(txt)')) {
    html = html.replace(pctHelperAnchor,pctHelpers + pctHelperAnchor);
  }

  const pctRenderAnchor = "      const metaAtiva = ehMetaAtiva(n);";
  if (html.includes(pctRenderAnchor) && !html.includes("      const pctInfo = extrairPctTag(n.t);")) {
    html = html.replace(pctRenderAnchor,pctRenderAnchor + "\n      const pctInfo = extrairPctTag(n.t);");
  }

  const pctTextOld = "      const t = document.createElement('span'); t.className = 'mp-txt'; t.textContent = n.t; d.appendChild(t);";
  const pctTextNew = `      const t = document.createElement('span'); t.className = 'mp-txt'; t.textContent = pctInfo.base; d.appendChild(t);
      if (pctInfo.label) {
        const tag = document.createElement('span');
        tag.className = 'mp-pct-tag';
        tag.textContent = pctInfo.label;
        tag.style.background = corPctTag(n.t);
        d.appendChild(tag);
      }`;
  if (html.includes(pctTextOld) && !html.includes("tag.className = 'mp-pct-tag';")) {
    html = html.replace(pctTextOld,pctTextNew);
  }

  const pctEditAnchor = "    const obj = alvoSel(), c = el.querySelector('.mp-txt');";
  if (html.includes(pctEditAnchor) && !html.includes("    const pctEdit = obj ? extrairPctTag(obj.t) : { raw: '' };")) {
    html = html.replace(pctEditAnchor,pctEditAnchor + "\n    const pctEdit = obj ? extrairPctTag(obj.t) : { raw: '' };");
  }

  const pctSaveOld = "      obj.t = c.textContent.trim() || (sel.t === 'no' ? 'sem título' : '');";
  const pctSaveNew = "      obj.t = (c.textContent.trim() || (sel.t === 'no' ? 'sem título' : '')) + (pctEdit.raw || '');";
  if (html.includes(pctSaveOld)) html = html.replace(pctSaveOld,pctSaveNew);

  console.log('[AllianceOS build] tags percentuais dos canais ativadas no mapa');

  // KPI_CHAIRS_SIDEBAR_V1 — painel lateral executivo com KPIs por cadeira.
  // Dados vêm de planningExecutive.kpiBoard das campanhas perpétuas.
  const kpiBoardCssAnchor = ".mp-no.mp-raiz{";
  const kpiBoardCss = `.mp-kpi-board{
  position:absolute;
  top:72px;
  right:14px;
  z-index:62;
  width:318px;
  max-height:calc(100% - 142px);
  display:flex;
  flex-direction:column;
  overflow:hidden;
  border:1px solid rgba(24,29,33,.10);
  border-radius:16px;
  background:rgba(255,255,255,.95);
  box-shadow:0 14px 34px rgba(27,31,35,.10);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  color:#202428;
}
.mp-kpi-board.is-collapsed{
  width:46px;
  max-height:none;
}
.mp-kpi-board.is-collapsed .mp-kpi-board-head-copy,
.mp-kpi-board.is-collapsed .mp-kpi-board-scroll{display:none}
.mp-kpi-board.is-collapsed .mp-kpi-board-head{
  padding:9px 7px;
  justify-content:center;
  border-bottom:0;
}
.mp-kpi-board-head{
  min-height:58px;
  padding:11px 12px 10px 14px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  border-bottom:1px solid #edf0f2;
}
.mp-kpi-board-head-copy{min-width:0}
.mp-kpi-board-head small{
  display:block;
  margin-bottom:3px;
  color:#8a9298;
  font-size:8.5px;
  font-weight:760;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.mp-kpi-board-head strong{
  display:block;
  font-size:12.5px;
  line-height:1.2;
  font-weight:780;
  letter-spacing:-.01em;
}
.mp-kpi-board-toggle{
  width:28px;
  height:28px;
  flex:0 0 28px;
  display:grid;
  place-items:center;
  border:1px solid #e1e5e8;
  border-radius:9px;
  background:#fff;
  color:#4b535a;
  cursor:pointer;
}
.mp-kpi-board-toggle:hover{background:#f7f8f8}
.mp-kpi-board-toggle svg{width:13px;height:13px;transition:transform .16s ease}
.mp-kpi-board.is-collapsed .mp-kpi-board-toggle svg{transform:rotate(180deg)}
.mp-kpi-board-scroll{
  overflow:auto;
  overscroll-behavior:contain;
  scrollbar-width:thin;
  padding:7px;
}
.mp-kpi-chair{
  margin-bottom:7px;
  overflow:hidden;
  border:1px solid #e6e9eb;
  border-radius:13px;
  background:#fff;
}
.mp-kpi-chair:last-child{margin-bottom:0}
.mp-kpi-chair-head{
  min-height:45px;
  padding:9px 10px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  background:#fafbfb;
  border-bottom:1px solid #edf0f2;
}
.mp-kpi-chair-person{
  display:flex;
  align-items:center;
  gap:8px;
  min-width:0;
}
.mp-kpi-avatar{
  width:30px;
  height:30px;
  flex:0 0 30px;
  display:grid;
  place-items:center;
  overflow:hidden;
  border-radius:50%;
  background:#202428;
  color:#fff;
  font-size:8.5px;
  font-weight:800;
  letter-spacing:.02em;
  box-shadow:inset 0 0 0 1px rgba(17,24,39,.08);
}
.mp-kpi-avatar img{
  width:100%;
  height:100%;
  display:block;
  object-fit:cover;
  object-position:center;
  border-radius:inherit;
}
.mp-kpi-chair-person b{
  display:block;
  color:#282d31;
  font-size:10.5px;
  line-height:1.1;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.mp-kpi-chair-person span{
  display:block;
  margin-top:2px;
  color:#8a9298;
  font-size:8.5px;
  line-height:1.1;
}
.mp-kpi-tap{
  height:22px;
  padding:0 8px;
  border:0;
  border-radius:999px;
  background:#15181a;
  color:#fff;
  font-size:8px;
  font-weight:800;
  cursor:pointer;
}
.mp-kpi-grid-head,
.mp-kpi-row{
  display:grid;
  grid-template-columns:minmax(0,1fr) 76px 59px;
  gap:6px;
  align-items:center;
}
.mp-kpi-grid-head{
  padding:7px 10px 5px;
  color:#9aa1a6;
  font-size:7.5px;
  font-weight:780;
  letter-spacing:.06em;
  text-transform:uppercase;
}
.mp-kpi-grid-head span:nth-child(n+2){text-align:right}
.mp-kpi-row{
  min-height:30px;
  padding:6px 10px;
  border-top:1px solid #f0f2f3;
}
.mp-kpi-row:first-of-type{border-top:0}
.mp-kpi-label{
  min-width:0;
  color:#52595f;
  font-size:8.8px;
  line-height:1.18;
  font-weight:620;
}
.mp-kpi-target,
.mp-kpi-current{
  text-align:right;
  color:#252a2e;
  font-size:8.8px;
  line-height:1.15;
  font-weight:760;
  white-space:nowrap;
}
.mp-kpi-current.is-empty{color:#b0b6ba;font-weight:620}
.mp-kpi-current-note{
  display:block;
  margin-top:2px;
  color:#a0a6ab;
  font-size:6.8px;
  font-weight:680;
  text-transform:uppercase;
  letter-spacing:.035em;
}
.mp-kpi-current-note.is-base{color:#7b63a7}
.mp-kpi-current-note.is-calibration{color:#a46725}
@media(max-width:1100px){
  .mp-kpi-board{width:286px}
}
@media(max-width:860px){
  .mp-kpi-board{
    top:auto;
    right:10px;
    bottom:64px;
    width:46px;
    max-height:none;
  }
  .mp-kpi-board:not(.is-mobile-open) .mp-kpi-board-head-copy,
  .mp-kpi-board:not(.is-mobile-open) .mp-kpi-board-scroll{display:none}
  .mp-kpi-board:not(.is-mobile-open) .mp-kpi-board-head{
    padding:9px 7px;
    justify-content:center;
    border-bottom:0;
  }
  .mp-kpi-board.is-mobile-open{
    width:min(318px,calc(100vw - 32px));
    max-height:62vh;
  }
}`;
  if (html.includes(kpiBoardCssAnchor) && !html.includes('.mp-kpi-board{')) {
    html = html.replace(kpiBoardCssAnchor,kpiBoardCss + kpiBoardCssAnchor);
  }

  const kpiBoardHelperAnchor = "  function lado(n) { return 1 }";
  const kpiBoardHelpers = `  function escKpi(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function iniciaisKpi(nome) {
    return String(nome||'').trim().split(/\\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('') || '—';
  }
  function pessoaKpi(board) {
    const members=(window.AllianceOSDirectory?.members||[]).filter(m=>m?.tipo==='usuario' && m?.ativo!==false);
    const id=String(board?.profileId||'').trim();
    if(id){
      const byId=members.find(m=>String(m.id)===id);
      if(byId)return byId;
    }
    const norm=v=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim();
    const alvo=norm(board?.person);
    if(!alvo)return null;
    const exact=members.find(m=>norm(m.nome)===alvo);
    if(exact)return exact;
    const first=alvo.split(/\\s+/)[0];
    const matches=members.filter(m=>norm(m.nome).split(/\\s+/)[0]===first);
    return matches.length===1?matches[0]:null;
  }
  function avatarKpi(board) {
    const person=pessoaKpi(board);
    if(person?.foto_url){
      return '<img src="'+escKpi(person.foto_url)+'" alt="'+escKpi(person.nome||board?.person||'')+'" loading="lazy">';
    }
    return escKpi(iniciaisKpi(person?.nome||board?.person));
  }
  function labelMesKpi(ref) {
    const [y,m]=String(ref||'').split('-').map(Number);
    if(!y||!m)return '';
    const nomes=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return (nomes[m-1]||'')+' '+y;
  }
  function campanhasKpiCadeiras() {
    const atualMarca=textoNormal(marcaAtual());
    const ref=mesMapa();
    const mapa=campanhasLocais();
    return [...mapa.entries()].map(([id,c])=>({id,...c}))
      .filter(c=>{
        const board=c?.planningExecutive?.kpiBoard;
        const brand=textoNormal(c?.brand||c?.marca||'');
        const month=String(c?.monthRef||c?.month_ref||'').slice(0,7);
        return board?.enabled && (!brand||brand===atualMarca) && (!month||month===ref) && !c?.archivedAt && !c?.archived_at;
      })
      .sort((a,b)=>(+(a?.planningExecutive?.kpiBoard?.order||999))-(+(b?.planningExecutive?.kpiBoard?.order||999)));
  }
  function renderKpiCadeiras() {
    if(!cerca?.isConnected)return;
    cerca.querySelector('.mp-kpi-board')?.remove();
    if(textoNormal(marcaAtual())!==textoNormal('Botanika') || mesMapa()!=='2026-10')return;
    const campaigns=campanhasKpiCadeiras();
    if(!campaigns.length)return;

    if(getComputedStyle(cerca).position==='static')cerca.style.position='relative';

    const aside=document.createElement('aside');
    aside.className='mp-kpi-board';
    const collapsed=sessionStorage.getItem('ui.alliance.kpi-chairs.collapsed')==='1';
    if(collapsed)aside.classList.add('is-collapsed');

    const header=document.createElement('header');
    header.className='mp-kpi-board-head';
    header.innerHTML='<div class="mp-kpi-board-head-copy"><small>'+escKpi(labelMesKpi(mesMapa()))+'</small><strong>KPIs por cadeira</strong></div><button class="mp-kpi-board-toggle" type="button" aria-label="Abrir ou fechar KPIs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.5 6.5 9 12l5.5 5.5"/></svg></button>';
    aside.appendChild(header);

    const scroll=document.createElement('div');
    scroll.className='mp-kpi-board-scroll';

    campaigns.forEach(c=>{
      const board=c.planningExecutive.kpiBoard||{};
      const rows=Array.isArray(board.rows)?board.rows:[];
      const card=document.createElement('section');
      card.className='mp-kpi-chair';

      const head=document.createElement('div');
      head.className='mp-kpi-chair-head';
      const person=pessoaKpi(board);
      const displayName=board.person||person?.nome||c.owner||'Responsável';
      head.innerHTML='<div class="mp-kpi-chair-person"><span class="mp-kpi-avatar" title="'+escKpi(person?.nome||displayName)+'">'+avatarKpi(board)+'</span><div><b>'+escKpi(displayName)+'</b><span>'+escKpi(board.chair||c.name||'Cadeira')+'</span></div></div><button type="button" class="mp-kpi-tap">TAP</button>';
      head.querySelector('.mp-kpi-tap').addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        window.AbrirCampanha?.(c.id,'tap',board.chair||c.name);
      });
      card.appendChild(head);

      const gridHead=document.createElement('div');
      gridHead.className='mp-kpi-grid-head';
      gridHead.innerHTML='<span>KPI</span><span>Meta</span><span>Atual</span>';
      card.appendChild(gridHead);

      rows.forEach(r=>{
        const row=document.createElement('div');
        row.className='mp-kpi-row';
        const current=(r.current===null||r.current===undefined||String(r.current).trim()==='')?'—':String(r.current);
        const empty=current==='—';
        const status=String(r.status||'');
        const statusCls=status==='base atual'?' is-base':(status==='calibração'?' is-calibration':'');
        row.innerHTML='<span class="mp-kpi-label">'+escKpi(r.label||'KPI')+'</span><span class="mp-kpi-target">'+escKpi(r.target||'—')+'</span><span class="mp-kpi-current'+(empty?' is-empty':'')+'">'+escKpi(current)+(status&&status!=='sem leitura'?'<small class="mp-kpi-current-note'+statusCls+'">'+escKpi(status)+'</small>':'')+'</span>';
        card.appendChild(row);
      });

      scroll.appendChild(card);
    });

    aside.appendChild(scroll);
    aside.addEventListener('pointerdown',e=>e.stopPropagation());
    aside.addEventListener('dblclick',e=>e.stopPropagation());
    aside.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});

    const toggle=header.querySelector('.mp-kpi-board-toggle');
    toggle.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(matchMedia('(max-width:860px)').matches){
        aside.classList.toggle('is-mobile-open');
        return;
      }
      aside.classList.toggle('is-collapsed');
      sessionStorage.setItem('ui.alliance.kpi-chairs.collapsed',aside.classList.contains('is-collapsed')?'1':'0');
    });

    cerca.appendChild(aside);
  }
`;
  if (html.includes(kpiBoardHelperAnchor) && !html.includes('function renderKpiCadeiras()')) {
    html = html.replace(kpiBoardHelperAnchor,kpiBoardHelpers + kpiBoardHelperAnchor);
  }

  const kpiOpenAnchor = "    montar(hospedeiro);";
  if (html.includes(kpiOpenAnchor) && !html.includes("    setTimeout(renderKpiCadeiras, 120);
    setTimeout(renderKpiCadeiras, 900);")) {
    html = html.replace(kpiOpenAnchor,kpiOpenAnchor + "\n    setTimeout(renderKpiCadeiras, 120);");
  }

  const kpiStateListenerAnchor = "  window.AllianceOSMapSync =";
  if (html.includes(kpiStateListenerAnchor) && !html.includes("central.campaigns.vitor-gutierrez') setTimeout(renderKpiCadeiras")) {
    html = html.replace(kpiStateListenerAnchor,`  addEventListener('allianceos:state-updated', e => {
    const k=String(e?.detail?.key||'');
    if(k==='central.campaigns.vitor-gutierrez') setTimeout(renderKpiCadeiras,80);
  });
` + kpiStateListenerAnchor);
  }

  console.log('[AllianceOS build] painel lateral de KPIs por cadeira ativado');


  // CHANNEL_DETAIL_TAGS_V2 — usa tags discretas nos detalhes de todos os canais.
  // Investimento recebe pílula preenchida; os demais tipos ficam em outline.
  const channelDetailCssAnchor = ".mp-no.mp-raiz{";
  const channelDetailCss = `.mp-detail-tag{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  height:17px;
  padding:0 7px;
  margin-left:7px;
  border-radius:999px;
  font-size:8px;
  font-weight:780;
  line-height:1;
  letter-spacing:.035em;
  white-space:nowrap;
  flex:0 0 auto;
  background:#fff;
  color:#667078;
  border:1px solid #dfe4e7;
}
.mp-detail-tag[data-kind="investment"]{
  background:#111827;
  color:#fff;
  border-color:#111827;
  box-shadow:0 1px 3px rgba(17,24,39,.14);
}
.mp-detail-tag[data-kind="owner"]{color:#49535b;border-color:#dfe3e6}
.mp-detail-tag[data-kind="kpi"]{color:#2767a7;border-color:#cfe3f7}
.mp-detail-tag[data-kind="meta"]{color:#6d4cc2;border-color:#ddd1f7}
.mp-detail-tag[data-kind="revenue"]{color:#2f7a4d;border-color:#cfe8d8}
.mp-detail-tag[data-kind="flow"]{color:#68727a;border-color:#dce1e4}
.mp-detail-tag[data-kind="rule"]{color:#9a5b1f;border-color:#ecd7bd}
.mp-detail-tag[data-kind="history"]{color:#7b5c97;border-color:#dfd3e9}
.mp-detail-tag[data-kind="base"]{color:#7a6540;border-color:#e6dccb}
.mp-detail-tag[data-kind="capacity"]{color:#2f7a4d;border-color:#d1e8d9}
.mp-detail-tag[data-kind="analysis"]{color:#7b5d2c;border-color:#e6d8bf}
`;
  if (html.includes(channelDetailCssAnchor) && !html.includes('.mp-detail-tag[data-kind="investment"]')) {
    html = html.replace(channelDetailCssAnchor,channelDetailCss + channelDetailCssAnchor);
  }

  const channelDetailHelperAnchor = "  function lado(n) { return 1 }";
  const channelDetailHelpers = `  function ehDetalheCanal(n) {
    const detalhe = acharNo(n?.pai);
    if (!detalhe) return false;
    const titulo = textoNormal(String(detalhe.t || ''));
    if (titulo !== textoNormal('Detalhes + KPIs') && titulo !== textoNormal('Detalhes + controle')) return false;
    const canal = acharNo(detalhe.pai);
    if (!canal) return false;
    const s = textoNormal(String(canal.t || ''));
    return ['trafego','influenciadores','organico','crm / lifecycle','tiktok shop','atendimento','reserva / outras origens']
      .some(prefix => s.startsWith(textoNormal(prefix)));
  }
  function tagDetalheCanal(txt) {
    const s = textoNormal(String(txt || ''));
    if (s.startsWith('investimento')) return {label:'INVESTIMENTO',kind:'investment'};
    if (s.startsWith('responsavel:') || s.startsWith('sem responsavel')) return {label:'RESPONSÁVEL',kind:'owner'};
    if (s.startsWith('kpi') || s.startsWith('kpis')) return {label:'KPI',kind:'kpi'};
    if (s.startsWith('meta ')) return {label:'META',kind:'meta'};
    if (s.startsWith('receita:') || s.startsWith('divisao:')) return {label:'RECEITA',kind:'revenue'};
    if (s.startsWith('funil:') || s.startsWith('ciclo:')) return {label:'FLUXO',kind:'flow'};
    if (s.startsWith('regra:')) return {label:'REGRA',kind:'rule'};
    if (s.startsWith('historico:')) return {label:'HISTÓRICO',kind:'history'};
    if (s.startsWith('base atual:')) return {label:'BASE ATUAL',kind:'base'};
    if (s.startsWith('capacidade madura:')) return {label:'CAPACIDADE',kind:'capacity'};
    if (s.startsWith('analisar vencedoras:')) return {label:'ANÁLISE',kind:'analysis'};
    if (s.startsWith('inclui:')) return {label:'COMPOSIÇÃO',kind:'flow'};
    if (s.startsWith('canal comercial')) return {label:'OPERAÇÃO',kind:'flow'};
    return null;
  }
`;
  if (html.includes(channelDetailHelperAnchor) && !html.includes('function ehDetalheCanal(n)')) {
    html = html.replace(channelDetailHelperAnchor,channelDetailHelpers + channelDetailHelperAnchor);
  }

  const channelDetailRenderAnchor = "      const pctInfo = extrairPctTag(n.t);";
  if (html.includes(channelDetailRenderAnchor) && !html.includes("      const detalheCanal = ehDetalheCanal(n);")) {
    html = html.replace(channelDetailRenderAnchor,channelDetailRenderAnchor + "\n      const detalheCanal = ehDetalheCanal(n);");
  }

  // META_DIMENSION_GROUPS_V1 — diferencia visualmente as duas leituras da meta.
  const dimGroupCssAnchor = ".mp-no.mp-raiz{";
  const dimGroupCss = `.mp-no.mp-grupo-origem{
  background:#eef6ff;
  border-color:#7aaee8!important;
  color:#224b75;
  font-weight:700;
}
.mp-no.mp-grupo-distrib{
  background:#fff1ed;
  border-color:#d96852!important;
  color:#8d3829;
  font-weight:700;
}
`;
  if (html.includes(dimGroupCssAnchor) && !html.includes('.mp-no.mp-grupo-origem{')) {
    html = html.replace(dimGroupCssAnchor,dimGroupCss + dimGroupCssAnchor);
  }

  const dimGroupRenderAnchor = "      const pctInfo = extrairPctTag(n.t);";
  if (html.includes(dimGroupRenderAnchor) && !html.includes("      const grupoMeta = textoNormal(pctInfo.base)")) {
    html = html.replace(dimGroupRenderAnchor,dimGroupRenderAnchor + `
      const grupoMeta = textoNormal(pctInfo.base) === textoNormal('Origem da receita')
        ? 'origem'
        : (textoNormal(pctInfo.base) === textoNormal('Distribuição comercial') ? 'distrib' : '');`);
  }

  const dimGroupClassOld = "        + (metaAtiva ? ' mp-meta-ativa' : '')\n        + (sel.t === 'no' && sel.id === n.id ? ' mp-sel' : '');";
  const dimGroupClassNew = "        + (metaAtiva ? ' mp-meta-ativa' : '')\n        + (grupoMeta === 'origem' ? ' mp-grupo-origem' : (grupoMeta === 'distrib' ? ' mp-grupo-distrib' : ''))\n        + (sel.t === 'no' && sel.id === n.id ? ' mp-sel' : '');";
  if (html.includes(dimGroupClassOld)) html = html.replace(dimGroupClassOld,dimGroupClassNew);

  console.log('[AllianceOS build] dimensões Origem e Distribuição diferenciadas visualmente');

  // MAP_CAMERA_STABLE_V1 — abrir/fechar ramos nunca muda zoom nem câmera.
  // A câmera escolhida pela pessoa é preservada por marca + mês nesta sessão.
  const cameraStateAnchor = "  let marcaAberta = null;";
  const cameraStateNew = `  let marcaAberta = null;
  const cameraKey = () => 'ui.alliance.map.camera.v2.' + (marcaAtual() || 'geral') + '.' + mesMapa();
  function lerCamera() {
    try {
      const c = JSON.parse(sessionStorage.getItem(cameraKey()) || 'null');
      if (!c || !Number.isFinite(+c.z) || !Number.isFinite(+c.px) || !Number.isFinite(+c.py)) return null;
      return { z:+c.z, px:+c.px, py:+c.py };
    } catch { return null }
  }
  function guardarCamera() {
    try { sessionStorage.setItem(cameraKey(), JSON.stringify({ z:Z, px:PX, py:PY })) } catch {}
  }`;
  if (html.includes(cameraStateAnchor) && !html.includes('function guardarCamera()')) {
    html = html.replace(cameraStateAnchor,cameraStateNew);
  }

  const transformOld = "    porPaleta();\n  }\n  /* O ponto embaixo do cursor não pode se mexer";
  const transformNew = "    porPaleta();\n    guardarCamera();\n  }\n  /* O ponto embaixo do cursor não pode se mexer";
  if (html.includes(transformOld) && !html.includes("    guardarCamera();\n  }\n  /* O ponto embaixo do cursor")) {
    html = html.replace(transformOld,transformNew);
  }

  const openOld = `  function abrir(hospedeiro) {
    marcaAberta = marcaAtual();
    M = carregar();
    sel = { t: 'no', id: raiz()?.id ?? null };
    Z = 1; PX = 0; PY = 0; pilha = []; pilhaR = []; medidas = {}; termo = '';
    jaEnquadrou = false;
    montar(hospedeiro);
    transformar();     // garante que existe transform desde o primeiro quadro
    organizar();
  }`;
  const openNew = `  function abrir(hospedeiro) {
    marcaAberta = marcaAtual();
    M = carregar();
    sel = { t: 'no', id: raiz()?.id ?? null };
    const cam = lerCamera();
    Z = cam?.z ?? 1; PX = cam?.px ?? 0; PY = cam?.py ?? 0;
    pilha = []; pilhaR = []; medidas = {}; termo = '';
    jaEnquadrou = !!cam;
    montar(hospedeiro);
    transformar();
    organizar({ enquadrar: !cam });
    if (cam) {
      setTimeout(() => {
        const area = cerca?.getBoundingClientRect?.();
        const nodes = [...(cerca?.querySelectorAll?.('.mp-no') || [])];
        const visivel = area && nodes.some(el => {
          const r = el.getBoundingClientRect();
          return r.right > area.left + 20 && r.left < area.right - 20 &&
                 r.bottom > area.top + 20 && r.top < area.bottom - 20;
        });
        if (!visivel && nodes.length) {
          jaEnquadrou = false;
          enquadrarTudo();
        }
      }, 40);
    }
  }`;
  if (html.includes(openOld)) html = html.replace(openOld,openNew);
  else console.warn('[AllianceOS build] mapa: função abrir não encontrada para preservar câmera');

  const remoteOld = `    addEventListener('allianceos:state-updated', (e) => {
      const k = e?.detail?.key || '';
      if (!k || k !== chave() || !cerca?.isConnected) return;
      abrir(cerca.parentElement);
    });`;
  const remoteNew = `    addEventListener('allianceos:state-updated', (e) => {
      const k = e?.detail?.key || '';
      if (!k || k !== chave() || !cerca?.isConnected) return;
      const atual = sel?.id;
      M = carregar();
      if (atual && acharNo(atual)) sel = { t:'no', id:atual };
      else if (!alvoSel()) sel = { t:'no', id:raiz()?.id ?? null };
      organizar({ enquadrar:false });
      transformar();
    });`;
  if (html.includes(remoteOld)) html = html.replace(remoteOld,remoteNew);
  else console.warn('[AllianceOS build] mapa: listener remoto não encontrado');

  const closeAllOld = "    organizar(); salvar();\n  }\n  function trocarLayout() { guardar(); M.layout = 'direita'; organizar(); salvar() }";
  const closeAllNew = "    organizar({ enquadrar: false }); salvar();\n  }\n  function trocarLayout() { guardar(); M.layout = 'direita'; organizar({ enquadrar: false }); salvar() }";
  if (html.includes(closeAllOld)) html = html.replace(closeAllOld,closeAllNew);

  const reorganizeOld = "        menu.appendChild(item('Reorganizar', '', () => organizar()));";
  const reorganizeNew = "        menu.appendChild(item('Reorganizar', '', () => organizar({ enquadrar: false })));";
  if (html.includes(reorganizeOld)) html = html.replace(reorganizeOld,reorganizeNew);

  const fullscreenOld = `  function telaCheia() {
    cerca.classList.toggle('mp-cheio');
    setTimeout(enquadrarTudo, 60);
  }`;
  const fullscreenNew = `  function telaCheia() {
    cerca.classList.toggle('mp-cheio');
    setTimeout(transformar, 60);
  }`;
  if (html.includes(fullscreenOld)) html = html.replace(fullscreenOld,fullscreenNew);

  const resizeOld = "      addEventListener('resize', () => { if (cerca?.isConnected) enquadrarTudo() });";
  const resizeNew = "      addEventListener('resize', () => { if (cerca?.isConnected) transformar() });";
  if (html.includes(resizeOld)) html = html.replace(resizeOld,resizeNew);

  console.log('[AllianceOS build] câmera do mapa preservada ao abrir e fechar ramos');

  // BOTANIKA_OCT_INVESTMENT_HIERARCHY_V1
  // Meta 1 deve ter somente Distribuição por canal + Distribuição por campanha.
  // O investimento de mídia pertence ao Perpétuo e não pode voltar para a raiz
  // mesmo quando um cliente antigo salva cache/localStorage.
  const hierarchyAnchor = "  function lado(n) { return 1 }";
  const hierarchyHelper = `  function normalizarHierarquiaBotanikaOutubro() {
    if (!M?.nos?.length) return false;
    if (textoNormal(marcaAtual()) !== textoNormal('Botanika') || mesMapa() !== '2026-10') return false;

    const meta1 = M.nos.find(n => /^meta\\s*1\\b/i.test(String(n?.t || '').trim()));
    const perpetuo = M.nos.find(n => textoNormal(String(n?.t || '')).startsWith(textoNormal('Perpétuo — R$ 315.000')));
    const investimento = M.nos.find(n => textoNormal(String(n?.t || '')) === textoNormal('Investimento de mídia — R$ 115.500'));
    if (!meta1 || !perpetuo || !investimento) return false;

    let mudou = false;
    if (investimento.pai !== perpetuo.id) {
      investimento.pai = perpetuo.id;
      mudou = true;
    }

    // A Meta 1 fica conceitualmente limpa: apenas as duas dimensões principais.
    // O investimento é detalhamento do Perpétuo.
    return mudou;
  }
`;
  if (html.includes(hierarchyAnchor) && !html.includes('function normalizarHierarquiaBotanikaOutubro()')) {
    html = html.replace(hierarchyAnchor,hierarchyHelper + hierarchyAnchor);
  }

  const openNormOld = `    M = carregar();
    sel = { t: 'no', id: raiz()?.id ?? null };`;
  const openNormNew = `    M = carregar();
    const hierarquiaMudou = normalizarHierarquiaBotanikaOutubro();
    sel = { t: 'no', id: raiz()?.id ?? null };`;
  if (html.includes(openNormOld)) html = html.replace(openNormOld,openNormNew);

  const openSaveOld = `    organizar({ enquadrar: !cam });
  }`;
  const openSaveNew = `    organizar({ enquadrar: !cam });
    if (hierarquiaMudou) setTimeout(() => salvar(), 0);
  }`;
  if (html.includes(openSaveOld)) html = html.replace(openSaveOld,openSaveNew);

  const remoteNormOld = `      M = carregar();
      if (atual && acharNo(atual)) sel = { t:'no', id:atual };`;
  const remoteNormNew = `      M = carregar();
      const hierarquiaMudou = normalizarHierarquiaBotanikaOutubro();
      if (atual && acharNo(atual)) sel = { t:'no', id:atual };`;
  if (html.includes(remoteNormOld)) html = html.replace(remoteNormOld,remoteNormNew);

  const remoteSaveOld = `      organizar({ enquadrar:false });
      transformar();
    });`;
  const remoteSaveNew = `      organizar({ enquadrar:false });
      transformar();
      if (hierarquiaMudou) setTimeout(() => salvar(), 0);
    });`;
  if (html.includes(remoteSaveOld)) html = html.replace(remoteSaveOld,remoteSaveNew);

  console.log('[AllianceOS build] investimento de mídia normalizado dentro do Perpétuo');


  // CAMPAIGN_TAP_BADGE_V1 — nós que representam uma campanha preservam o
  // vínculo mesmo quando o texto do mapa inclui valor/% e abrem direto no TAP.
  const campaignMatchOld = `        const a = textoNormal(n.t), b = textoNormal(camp.name || camp.nome || '');
        const corresponde = a && b && (a === b || a.includes(b) || b.includes(a));
        if (!corresponde) { delete n.campId; mudou = true; }`;
  const campaignMatchNew = `        const a = textoNormal(n.t), b = textoNormal(camp.name || camp.nome || '');
        const base = (s) => String(s || '')
          .replace(/\\s*\\[\\[[0-9]+(?:[.,][0-9]+)?%\\]\\]\\s*$/, '')
          .split(' — ')[0].trim();
        const ab = base(a), bb = base(b);
        const corresponde = a && b && (
          a === b || a.includes(b) || b.includes(a) ||
          (ab && bb && (ab === bb || ab.includes(bb) || bb.includes(ab)))
        );
        if (!corresponde) { delete n.campId; mudou = true; }`;
  if (html.includes(campaignMatchOld)) html = html.replace(campaignMatchOld,campaignMatchNew);
  else console.warn('[AllianceOS build] mapa: comparação de campanha não encontrada');

  const campaignBadgeOld = `        const b = botao('mp-selo mp-camp', 'campanha ↗', 'Abrir esta campanha',
          () => window.AbrirCampanha?.(n.campId));`;
  const campaignBadgeNew = `        const b = botao('mp-selo mp-camp', 'TAP', 'Abrir TAP da campanha',
          () => window.AbrirCampanha?.(n.campId, 'tap'));`;
  if (html.includes(campaignBadgeOld)) html = html.replace(campaignBadgeOld,campaignBadgeNew);
  else console.warn('[AllianceOS build] mapa: selo de campanha não encontrado');

  console.log('[AllianceOS build] selo preto TAP ligado às campanhas do mapa');

  // MAP_ACTIVE_CORAL_AND_RESILIENT_TAP_V2
  // No mapa mental a meta ativa preserva a cor coral do ramo.
  // O preto é reservado aos cards de meta no topo da página.
  const mapActiveBlackOld = `      if (metaAtiva) {
        const corAtiva = ramoCor(n);
        d.style.background = corAtiva;
        d.style.borderColor = corAtiva;
        d.style.color = '#fff';
      }`;
  const mapActiveBlackNew = `      if (metaAtiva) {
        const corAtiva = ramoCor(n);
        d.style.background = corAtiva;
        d.style.borderColor = corAtiva;
        d.style.color = '#fff';
      }`;
  if (html.includes(mapActiveBlackOld)) html = html.replace(mapActiveBlackOld,mapActiveBlackNew);

  const mapActiveShadowOld = ".mp-no.mp-meta-ativa{\\n  font-weight:700;\\n  color:#fff;\\n  box-shadow:0 5px 16px rgba(194,90,74,.22);";
  const mapActiveShadowNew = ".mp-no.mp-meta-ativa{\\n  font-weight:700;\\n  color:#fff;\\n  box-shadow:0 5px 16px rgba(194,90,74,.22);";
  if (html.includes(mapActiveShadowOld)) html = html.replace(mapActiveShadowOld,mapActiveShadowNew);

  const mapCampResolveAnchor = "  function lado(n) { return 1 }";
  const mapCampResolveHelpers = `  function campanhaIdVisual(n) {
    if (n?.campId) return n.campId;
    const base = (s) => textoNormal(String(s || '')
      .replace(/\\s*\\[\\[[0-9]+(?:[.,][0-9]+)?%\\]\\]\\s*$/, '')
      .split(' — ')[0].trim());
    const alvo = base(n?.t);
    if (!alvo) return null;
    const camps = campanhasLocais();
    for (const [id,camp] of camps.entries()) {
      if (!camp || camp.archivedAt || camp.archived_at || camp.is_archived === true) continue;
      const nome = base(camp.name || camp.nome || '');
      if (nome && (nome === alvo || nome.includes(alvo) || alvo.includes(nome))) return id;
    }
    return null;
  }
`;
  if (html.includes(mapCampResolveAnchor) && !html.includes('function campanhaIdVisual(n)')) {
    html = html.replace(mapCampResolveAnchor,mapCampResolveHelpers + mapCampResolveAnchor);
  }

  const mapCampSeloOld = "      const temSelo = !!(n.nota || n.feito || n.campId);";
  const mapCampSeloNew = "      const temSelo = !!(n.nota || n.feito || campanhaIdVisual(n));";
  if (html.includes(mapCampSeloOld)) html = html.replace(mapCampSeloOld,mapCampSeloNew);

  const mapCampVisualAnchor = "      const metaAtiva = ehMetaAtiva(n);";
  if (html.includes(mapCampVisualAnchor) && !html.includes("      const campIdVisual = campanhaIdVisual(n);")) {
    html = html.replace(mapCampVisualAnchor,mapCampVisualAnchor + "\n      const campIdVisual = campanhaIdVisual(n);");
  }

  const mapCampBadgeOld = `      if (n.campId) {
        const b = botao('mp-selo mp-camp', 'TAP', 'Abrir TAP da campanha',
          () => window.AbrirCampanha?.(n.campId, 'tap'));
        d.appendChild(b);
      }`;
  const mapCampBadgeNew = `      if (campIdVisual) {
        const b = botao('mp-selo mp-camp', 'TAP', 'Abrir TAP da campanha',
          () => window.AbrirCampanha?.(campIdVisual, 'tap'));
        d.appendChild(b);
      }`;
  if (html.includes(mapCampBadgeOld)) html = html.replace(mapCampBadgeOld,mapCampBadgeNew);

  const mapCampBadgeStyleAnchor = ".mp-no .mp-selo{";
  const mapCampBadgeStyle = `.mp-no .mp-camp{
  background:#111315!important;
  color:#fff!important;
  border:1px solid #111315!important;
  font-weight:750!important;
  cursor:pointer!important;
}
.mp-no .mp-camp:hover{background:#000!important}
`;
  if (html.includes(mapCampBadgeStyleAnchor) && !html.includes('.mp-no .mp-camp{')) {
    html = html.replace(mapCampBadgeStyleAnchor,mapCampBadgeStyle + mapCampBadgeStyleAnchor);
  }

  console.log('[AllianceOS build] Meta ativa coral no mapa e TAP resiliente');

  // MAP_BADGE_LAYOUT_V3 — % e TAP ficam em uma área própria e nunca disputam
  // largura com o texto da pílula nem entre si.
  const badgeCssAnchor = ".mp-no .mp-selo{";
  const badgeCss = `.mp-no.mp-comselo .mp-txt{
  flex:1 1 auto!important;
  min-width:0!important;
}
.mp-no.mp-comselo{
  flex-wrap:nowrap!important;
}
.mp-no .mp-badge-row{
  display:inline-flex;
  align-items:center;
  gap:5px;
  margin-left:auto;
  flex:0 0 auto;
  white-space:nowrap;
}
.mp-no .mp-badge-row .mp-pct-tag{
  margin-left:0!important;
}
.mp-no .mp-badge-row .mp-selo{
  margin:0!important;
}
`;
  if (html.includes(badgeCssAnchor) && !html.includes('.mp-no .mp-badge-row{')) {
    html = html.replace(badgeCssAnchor,badgeCss + badgeCssAnchor);
  }

  const badgeTextRuleOld = ".mp-no.mp-raiz .mp-txt,.mp-no.mp-comselo .mp-txt{flex:1 0 100%}";
  const badgeTextRuleNew = ".mp-no.mp-raiz .mp-txt{flex:1 0 100%}";
  if (html.includes(badgeTextRuleOld)) html = html.replace(badgeTextRuleOld,badgeTextRuleNew);

  const badgeRenderOld = `      const t = document.createElement('span'); t.className = 'mp-txt'; t.textContent = pctInfo.base; d.appendChild(t);
      if (pctInfo.label) {
        const tag = document.createElement('span');
        tag.className = 'mp-pct-tag';
        tag.textContent = pctInfo.label;
        tag.style.background = corPctTag(n.t);
        d.appendChild(tag);
      }
      if (n.nota) { const b = document.createElement('span'); b.className = 'mp-selo'; b.textContent = 'nota'; b.title = n.nota; d.appendChild(b) }
      if (campIdVisual) {
        const b = botao('mp-selo mp-camp', 'TAP', 'Abrir TAP da campanha',
          () => window.AbrirCampanha?.(campIdVisual, 'tap'));
        d.appendChild(b);
      }`;
  const badgeRenderNew = `      const t = document.createElement('span'); t.className = 'mp-txt'; t.textContent = pctInfo.base; d.appendChild(t);
      let badgeRow = null;
      if (pctInfo.label || n.nota || campIdVisual) {
        badgeRow = document.createElement('span');
        badgeRow.className = 'mp-badge-row';
        d.appendChild(badgeRow);
      }
      if (pctInfo.label) {
        const tag = document.createElement('span');
        tag.className = 'mp-pct-tag';
        tag.textContent = pctInfo.label;
        tag.style.background = corPctTag(n.t);
        badgeRow.appendChild(tag);
      }
      if (n.nota) {
        const b = document.createElement('span');
        b.className = 'mp-selo';
        b.textContent = 'nota';
        b.title = n.nota;
        badgeRow.appendChild(b);
      }
      if (campIdVisual) {
        const b = botao('mp-selo mp-camp', 'TAP', 'Abrir TAP da campanha',
          () => window.AbrirCampanha?.(campIdVisual, 'tap', pctInfo.base));
        badgeRow.appendChild(b);
      }`;
  if (html.includes(badgeRenderOld)) html = html.replace(badgeRenderOld,badgeRenderNew);
  const influencerDetailTagAnchor = "      let badgeRow = null;";
  const influencerDetailTagNew = `      if (detalheCanal) {
        const infoTag = tagDetalheCanal(n.t);
        if (infoTag) {
          const detailTag = document.createElement('span');
          detailTag.className = 'mp-detail-tag';
          detailTag.dataset.kind = infoTag.kind;
          detailTag.textContent = infoTag.label;
          d.appendChild(detailTag);
        }
      }
      let badgeRow = null;`;
  if (html.includes(influencerDetailTagAnchor) && !html.includes("detailTag.className = 'mp-detail-tag';")) {
    html = html.replace(influencerDetailTagAnchor,influencerDetailTagNew);
  }

  else console.warn('[AllianceOS build] mapa: bloco de badges não encontrado');

  const botaoOld = `  function botao(cls, txt, titulo, aoClicar) {
    const b = document.createElement('button');
    b.className = cls; b.textContent = txt; if (titulo) b.title = titulo;
    b.onpointerdown = (e) => e.stopPropagation();
    b.onclick = (e) => { e.stopPropagation(); aoClicar() };
    return b;
  }`;
  const botaoNew = `  function botao(cls, txt, titulo, aoClicar) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls; b.textContent = txt; if (titulo) b.title = titulo;
    b.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); };
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); aoClicar() };
    b.ondblclick = (e) => { e.preventDefault(); e.stopPropagation(); };
    return b;
  }`;
  if (html.includes(botaoOld)) html = html.replace(botaoOld,botaoNew);
  else console.warn('[AllianceOS build] mapa: helper botao não encontrado');

  console.log('[AllianceOS build] badges % e TAP isoladas e estáveis');







  // AllianceOS is a shared workspace: campaign data must use the canonical workspace collection, not the auth UUID.
  html = html.replaceAll('central.campaigns.${user.id}', 'central.campaigns.vitor-gutierrez');
  // LEGACY_CAMPAIGN_RENDERER_PATCH_V2: replace hardcoded legacy functions without aborting the deployment.
  if(html.includes("  function filteredCampaigns(){const q=(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();const st=document.getElementById('campaignStatusFilter')?.value||'';const brand=getSelectedBrand();return campaignData.filter(c=>{if(brand&&c.brand!==brand)return false;if(st&&c.status!==st)return false;if(q&&!`${c.name} ${c.type} ${c.owner} ${c.offer} ${c.channels.join(' ')}`.toLowerCase().includes(q))return false;return true})}")) {
    html = html.replace("  function filteredCampaigns(){const q=(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();const st=document.getElementById('campaignStatusFilter')?.value||'';const brand=getSelectedBrand();return campaignData.filter(c=>{if(brand&&c.brand!==brand)return false;if(st&&c.status!==st)return false;if(q&&!`${c.name} ${c.type} ${c.owner} ${c.offer} ${c.channels.join(' ')}`.toLowerCase().includes(q))return false;return true})}", "  function filteredCampaigns(){\n    try{\n      const live=JSON.parse(localStorage.getItem(campaignStorageKey)||'[]');\n      if(Array.isArray(live))campaignData=live;\n    }catch{}\n    const q=(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();\n    const st=document.getElementById('campaignStatusFilter')?.value||'';\n    const brand=getSelectedBrand();\n    let ref=String(window.AlliancePlanningMonthRef||'');\n    if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(ref)){try{ref=sessionStorage.getItem('allianceos.planning.monthRef')||localStorage.getItem('allianceos.planning.monthRef')||''}catch{}}\n    if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(ref)){const d=new Date();ref=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}\n    const [yy,mm]=ref.split('-').map(Number),first=new Date(yy,mm-1,1),last=new Date(yy,mm,0);\n    return campaignData.filter(c=>{\n      if(c?.archivedAt)return false;\n      const explicit=String(c?.monthRef||c?.month_ref||'').slice(0,7);\n      if(/^20\\d{2}-(0[1-9]|1[0-2])$/.test(explicit)&&explicit!==ref)return false;\n      if(brand&&c.brand!==brand)return false;\n      if(st&&c.status!==st)return false;\n      const start=c.start?new Date(c.start+'T00:00:00'):null,end=c.end?new Date(c.end+'T00:00:00'):start;\n      if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(explicit)&&start&&end&&(start>last||end<first))return false;\n      if(q&&!([c.name,c.type,c.owner,c.offer,...(Array.isArray(c.channels)?c.channels:[])].join(' ').toLowerCase().includes(q)))return false;\n      return true;\n    });\n  }");
    console.log("[AllianceOS build] patched campaign filtered");
  } else console.warn("[AllianceOS build] renderer not found: campaign filtered");
  if(html.includes("  function renderCampaigns(){if(!document.getElementById('campaignsView').classList.contains('active'))return;if(campaignState.selected){renderWorkspace();return}const data=filteredCampaigns();const active=data.filter(c=>c.status==='Em execução').length,goal=data.reduce((s,c)=>s+(+c.goal||0),0),budget=data.reduce((s,c)=>s+(+c.budget||0),0),avg=data.length?Math.round(data.reduce((s,c)=>s+(+c.progress||0),0)/data.length):0;document.getElementById('campaignKpis').innerHTML=`<div class=\"camp-kpi\"><small>Campanhas no mês</small><b>${data.length}</b><span>${active} em execução agora</span></div><div class=\"camp-kpi\"><small>Meta somada</small><b>${cMoney(goal)}</b><span>ações visíveis neste filtro</span></div><div class=\"camp-kpi\"><small>Verba prevista</small><b>${cMoney(budget)}</b><span>${budget&&goal?`ROAS alvo ${(goal/budget).toFixed(1).replace('.',',')}`:'sem verba atribuída'}</span></div><div class=\"camp-kpi\"><small>Execução média</small><b>${avg}%</b><span>progresso operacional</span></div>`;document.getElementById('campaignSummary').textContent=`${data.length} campanha(s)`;document.getElementById('campaignListSub').textContent=`Setembro · ${getSelectedBrand()||'todas as marcas'}`;document.getElementById('campaignList').innerHTML=`<div class=\"camp-list-head\"><span>Campanha</span><span>Status</span><span>Período</span><span>Responsável</span><span>Meta</span><span>Verba</span><span>Execução</span><span></span></div>${data.length?data.map(renderCampaignRow).join(''):'<div class=\"camp-empty\">Nenhuma campanha encontrada.</div>'}`;renderCalendar(data);bindCampaignRows();document.getElementById('campaignListSection').style.display=campaignState.view==='overview'?'':'none';document.getElementById('campaignCalendarSection').style.display=campaignState.view==='calendar'?'':'none';document.querySelectorAll('.camp-tab').forEach(b=>b.classList.toggle('active',b.dataset.campView===campaignState.view))}")) {
    html = html.replace("  function renderCampaigns(){if(!document.getElementById('campaignsView').classList.contains('active'))return;if(campaignState.selected){renderWorkspace();return}const data=filteredCampaigns();const active=data.filter(c=>c.status==='Em execução').length,goal=data.reduce((s,c)=>s+(+c.goal||0),0),budget=data.reduce((s,c)=>s+(+c.budget||0),0),avg=data.length?Math.round(data.reduce((s,c)=>s+(+c.progress||0),0)/data.length):0;document.getElementById('campaignKpis').innerHTML=`<div class=\"camp-kpi\"><small>Campanhas no mês</small><b>${data.length}</b><span>${active} em execução agora</span></div><div class=\"camp-kpi\"><small>Meta somada</small><b>${cMoney(goal)}</b><span>ações visíveis neste filtro</span></div><div class=\"camp-kpi\"><small>Verba prevista</small><b>${cMoney(budget)}</b><span>${budget&&goal?`ROAS alvo ${(goal/budget).toFixed(1).replace('.',',')}`:'sem verba atribuída'}</span></div><div class=\"camp-kpi\"><small>Execução média</small><b>${avg}%</b><span>progresso operacional</span></div>`;document.getElementById('campaignSummary').textContent=`${data.length} campanha(s)`;document.getElementById('campaignListSub').textContent=`Setembro · ${getSelectedBrand()||'todas as marcas'}`;document.getElementById('campaignList').innerHTML=`<div class=\"camp-list-head\"><span>Campanha</span><span>Status</span><span>Período</span><span>Responsável</span><span>Meta</span><span>Verba</span><span>Execução</span><span></span></div>${data.length?data.map(renderCampaignRow).join(''):'<div class=\"camp-empty\">Nenhuma campanha encontrada.</div>'}`;renderCalendar(data);bindCampaignRows();document.getElementById('campaignListSection').style.display=campaignState.view==='overview'?'':'none';document.getElementById('campaignCalendarSection').style.display=campaignState.view==='calendar'?'':'none';document.querySelectorAll('.camp-tab').forEach(b=>b.classList.toggle('active',b.dataset.campView===campaignState.view))}", "  function renderCampaigns(){\n    if(!document.getElementById('campaignsView').classList.contains('active'))return;\n    if(campaignState.selected){renderWorkspace();return}\n    const data=filteredCampaigns();\n    const isPerp=c=>String(c.type||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').includes('perpet');\n    const channelRows=c=>Array.isArray(c?.tapStructured?.metas_por_fonte)?c.tapStructured.metas_por_fonte:[];\n    const goalOf=c=>{const n=channelRows(c).reduce((s,x)=>s+(+x.meta_faturamento||0),0);return n||(+c.goal||0)};\n    const budgetOf=c=>{const n=channelRows(c).reduce((s,x)=>s+(+x.investimento||0),0);return n||(+c.budget||0)};\n    const perpetual=data.filter(isPerp),punctual=data.filter(c=>!isPerp(c));\n    const active=data.filter(c=>c.status==='Em execução').length;\n    const channelGoal=perpetual.reduce((s,c)=>s+goalOf(c),0);\n    const channelBudget=perpetual.reduce((s,c)=>s+budgetOf(c),0);\n    const avg=data.length?Math.round(data.reduce((s,c)=>s+(+c.progress||0),0)/data.length):0;\n    document.getElementById('campaignKpis').innerHTML=\n      '<div class=\"camp-kpi\"><small>Campanhas no mês</small><b>'+data.length+'</b><span>'+perpetual.length+' perpétuas · '+punctual.length+' pontuais</span></div>'+\n      '<div class=\"camp-kpi\"><small>Meta dos canais</small><b>'+cMoney(channelGoal)+'</b><span>somente perpétuas · sem duplicar ações pontuais</span></div>'+\n      '<div class=\"camp-kpi\"><small>Verba dos canais</small><b>'+cMoney(channelBudget)+'</b><span>'+(channelBudget&&channelGoal?'ROAS alvo '+(channelGoal/channelBudget).toFixed(1).replace('.',','):'sem verba atribuída')+'</span></div>'+\n      '<div class=\"camp-kpi\"><small>Execução operacional</small><b>'+avg+'%</b><span>'+active+' em execução agora</span></div>';\n    document.getElementById('campaignSummary').textContent=data.length+' campanhas · '+perpetual.length+' perpétuas · '+punctual.length+' pontuais';\n    const selectedRef=String(window.AlliancePlanningMonthRef||'');\n    const selectedParts=/^20\\d{2}-(0[1-9]|1[0-2])$/.test(selectedRef)?selectedRef.split('-').map(Number):[new Date().getFullYear(),new Date().getMonth()+1];\n    document.getElementById('campaignListSub').textContent=new Date(selectedParts[0],selectedParts[1]-1,1).toLocaleDateString('pt-BR',{month:'long'})+' · '+(getSelectedBrand()||'todas as marcas');\n    const group=(title,desc,items)=>\n      '<section class=\"alliance-campaign-group\"><div class=\"alliance-campaign-group-head\"><div><strong>'+title+'</strong><span>'+desc+'</span></div><em>'+items.length+'</em></div>'+\n      (items.length?items.map(renderCampaignRow).join(''):'<div class=\"camp-empty\">Nenhuma campanha neste grupo.</div>')+'</section>';\n    document.getElementById('campaignList').innerHTML=\n      '<div class=\"camp-list-head\"><span>Campanha</span><span>Status</span><span>Período</span><span>Responsável</span><span>Meta</span><span>Verba</span><span>Execução</span><span></span></div>'+\n      group('Perpétuas','Canais e frentes que carregam a meta mensal.',perpetual)+\n      group('Campanhas','Ações pontuais com começo e fim: Dia D, semana temática, lançamento e similares.',punctual);\n    renderCalendar(data);\n    bindCampaignRows();\n    document.getElementById('campaignListSection').style.display=campaignState.view==='overview'?'':'none';\n    document.getElementById('campaignCalendarSection').style.display=campaignState.view==='calendar'?'':'none';\n    document.querySelectorAll('.camp-tab').forEach(b=>b.classList.toggle('active',b.dataset.campView===campaignState.view));\n  }");
    console.log("[AllianceOS build] patched campaign render");
  } else console.warn("[AllianceOS build] renderer not found: campaign render");
  if(html.includes("  function renderCalendar(data){const days=[7,8,9,10,11,12,13];const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];document.getElementById('campaignCalendar').innerHTML=days.map((d,i)=>{const iso=`2026-09-${String(d).padStart(2,'0')}`;const items=data.filter(c=>c.start<=iso&&c.end>=iso);return `<section class=\"camp-day ${d===7?'today':''}\"><div class=\"camp-day-head\"><b>${names[i]} · ${String(d).padStart(2,'0')}</b>${d===7?'<span>Hoje</span>':'<span>Setembro</span>'}</div>${items.map(c=>`<article class=\"camp-cal-item\" data-campaign-id=\"${c.id}\" style=\"--cc:${c.color}\"><b>${cesc(c.name)}</b><span>${cesc(c.status)} · ${cesc(c.owner.split(' ')[0])}</span></article>`).join('')||'<div style=\"padding:12px 4px;color:#a2a6aa;font-size:7px\">Sem campanha ativa</div>'}</section>`}).join('')}")) {
    html = html.replace("  function renderCalendar(data){const days=[7,8,9,10,11,12,13];const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];document.getElementById('campaignCalendar').innerHTML=days.map((d,i)=>{const iso=`2026-09-${String(d).padStart(2,'0')}`;const items=data.filter(c=>c.start<=iso&&c.end>=iso);return `<section class=\"camp-day ${d===7?'today':''}\"><div class=\"camp-day-head\"><b>${names[i]} · ${String(d).padStart(2,'0')}</b>${d===7?'<span>Hoje</span>':'<span>Setembro</span>'}</div>${items.map(c=>`<article class=\"camp-cal-item\" data-campaign-id=\"${c.id}\" style=\"--cc:${c.color}\"><b>${cesc(c.name)}</b><span>${cesc(c.status)} · ${cesc(c.owner.split(' ')[0])}</span></article>`).join('')||'<div style=\"padding:12px 4px;color:#a2a6aa;font-size:7px\">Sem campanha ativa</div>'}</section>`}).join('')}", "  function renderCalendar(data){\n    const realNow=new Date();realNow.setHours(0,0,0,0);\n    let ref=String(window.AlliancePlanningMonthRef||'');if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(ref)){try{ref=sessionStorage.getItem('allianceos.planning.monthRef')||localStorage.getItem('allianceos.planning.monthRef')||''}catch{}}\n    if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(ref))ref=realNow.getFullYear()+'-'+String(realNow.getMonth()+1).padStart(2,'0');\n    const [yy,mm]=ref.split('-').map(Number);let now=(realNow.getFullYear()===yy&&realNow.getMonth()===mm-1)?new Date(realNow):new Date(yy,mm-1,1);\n    const monday=new Date(now),wd=now.getDay();monday.setDate(now.getDate()+(wd===0?-6:1-wd));if(monday.getMonth()!==mm-1&&realNow.getMonth()!==mm-1)monday.setDate(monday.getDate()+7);\n    const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];\n    document.getElementById('campaignCalendar').innerHTML=Array.from({length:7},(_,i)=>{\n      const d=new Date(monday);d.setDate(monday.getDate()+i);\n      const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');\n      const items=data.filter(c=>c.start<=iso&&c.end>=iso);\n      const isToday=d.getTime()===now.getTime();\n      return '<section class=\"camp-day '+(isToday?'today':'')+'\"><div class=\"camp-day-head\"><b>'+names[i]+' · '+String(d.getDate()).padStart(2,'0')+'</b><span>'+(isToday?'Hoje':d.toLocaleDateString('pt-BR',{month:'long'}))+'</span></div>'+\n        (items.map(c=>'<article class=\"camp-cal-item\" data-campaign-id=\"'+c.id+'\" style=\"--cc:'+(c.color||'#121415')+'\"><b>'+cesc(c.name)+'</b><span>'+cesc(c.type)+' · '+cesc(c.status)+'</span></article>').join('')||'<div style=\"padding:12px 4px;color:#a2a6aa;font-size:7px\">Sem campanha ativa</div>')+'</section>';\n    }).join('');\n  }");
    console.log("[AllianceOS build] patched campaign calendar");
  } else console.warn("[AllianceOS build] renderer not found: campaign calendar");
  if(html.includes("  function renderSummary(c){const taskRows=(window.__centralGetTasks?.()||[]).filter(t=>normalizeProject(t.project)===normalizeProject(c.name));const done=taskRows.filter(t=>t.status==='feito').length;const tPct=taskRows.length?Math.round(done/taskRows.length*100):0;return `<div class=\"cw-grid\"><div><section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Estratégia da campanha</strong><span>contexto operacional</span></div><div class=\"cw-card-body\"><p class=\"cw-desc\">${cesc(c.objective)}</p><div class=\"cw-channels\">${c.channels.map(x=>`<span class=\"cw-channel\">${cesc(x)}</span>`).join('')}</div></div></section><section class=\"cw-card\" style=\"margin-top:12px\"><div class=\"cw-card-head\"><strong>Oferta</strong><span>${c.products.length} produto(s)</span></div><div class=\"cw-card-body\"><b style=\"font-size:11px\">${cesc(c.offer)}</b><div class=\"benefit-list\" style=\"margin-top:10px\">${c.benefits.map(x=>`<span class=\"benefit\">${cesc(x)}</span>`).join('')}</div></div></section></div><aside><section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Números</strong><span>${c.progress}% executado</span></div><div class=\"cw-card-body\"><div class=\"cw-properties\"><div class=\"cw-prop\"><small>Meta</small><b>${cMoney(c.goal)}</b></div><div class=\"cw-prop\"><small>Verba</small><b>${cMoney(c.budget)}</b></div><div class=\"cw-prop\"><small>ROAS alvo</small><b>${c.budget?(c.goal/c.budget).toFixed(1).replace('.',','):'—'}</b></div><div class=\"cw-prop\"><small>Tarefas</small><b>${done}/${taskRows.length||0}</b></div></div><div class=\"cw-goalbar\"><i style=\"width:${Math.min(100,c.progress)}%\"></i></div><div class=\"cw-small\" style=\"margin-top:5px\">Execução da campanha · ${c.progress}%</div>${taskRows.length?`<div class=\"cw-goalbar\" style=\"margin-top:12px\"><i style=\"width:${tPct}%;background:#4f8a70\"></i></div><div class=\"cw-small\" style=\"margin-top:5px\">Conclusão das tarefas · ${tPct}%</div>`:''}</div></section><section class=\"cw-card\" style=\"margin-top:12px\"><div class=\"cw-card-head\"><strong>Propriedades</strong></div><div class=\"cw-card-body\"><div class=\"cw-properties\"><div class=\"cw-prop\"><small>Responsável</small><b>${cesc(c.owner)}</b></div><div class=\"cw-prop\"><small>Marca</small><b>${cesc(c.brand)}</b></div><div class=\"cw-prop\"><small>Formato</small><b>${cesc(c.type)}</b></div><div class=\"cw-prop\"><small>Status</small><b>${cesc(c.status)}</b></div></div></div></section></aside></div>`}")) {
    html = html.replace("  function renderSummary(c){const taskRows=(window.__centralGetTasks?.()||[]).filter(t=>normalizeProject(t.project)===normalizeProject(c.name));const done=taskRows.filter(t=>t.status==='feito').length;const tPct=taskRows.length?Math.round(done/taskRows.length*100):0;return `<div class=\"cw-grid\"><div><section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Estratégia da campanha</strong><span>contexto operacional</span></div><div class=\"cw-card-body\"><p class=\"cw-desc\">${cesc(c.objective)}</p><div class=\"cw-channels\">${c.channels.map(x=>`<span class=\"cw-channel\">${cesc(x)}</span>`).join('')}</div></div></section><section class=\"cw-card\" style=\"margin-top:12px\"><div class=\"cw-card-head\"><strong>Oferta</strong><span>${c.products.length} produto(s)</span></div><div class=\"cw-card-body\"><b style=\"font-size:11px\">${cesc(c.offer)}</b><div class=\"benefit-list\" style=\"margin-top:10px\">${c.benefits.map(x=>`<span class=\"benefit\">${cesc(x)}</span>`).join('')}</div></div></section></div><aside><section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Números</strong><span>${c.progress}% executado</span></div><div class=\"cw-card-body\"><div class=\"cw-properties\"><div class=\"cw-prop\"><small>Meta</small><b>${cMoney(c.goal)}</b></div><div class=\"cw-prop\"><small>Verba</small><b>${cMoney(c.budget)}</b></div><div class=\"cw-prop\"><small>ROAS alvo</small><b>${c.budget?(c.goal/c.budget).toFixed(1).replace('.',','):'—'}</b></div><div class=\"cw-prop\"><small>Tarefas</small><b>${done}/${taskRows.length||0}</b></div></div><div class=\"cw-goalbar\"><i style=\"width:${Math.min(100,c.progress)}%\"></i></div><div class=\"cw-small\" style=\"margin-top:5px\">Execução da campanha · ${c.progress}%</div>${taskRows.length?`<div class=\"cw-goalbar\" style=\"margin-top:12px\"><i style=\"width:${tPct}%;background:#4f8a70\"></i></div><div class=\"cw-small\" style=\"margin-top:5px\">Conclusão das tarefas · ${tPct}%</div>`:''}</div></section><section class=\"cw-card\" style=\"margin-top:12px\"><div class=\"cw-card-head\"><strong>Propriedades</strong></div><div class=\"cw-card-body\"><div class=\"cw-properties\"><div class=\"cw-prop\"><small>Responsável</small><b>${cesc(c.owner)}</b></div><div class=\"cw-prop\"><small>Marca</small><b>${cesc(c.brand)}</b></div><div class=\"cw-prop\"><small>Formato</small><b>${cesc(c.type)}</b></div><div class=\"cw-prop\"><small>Status</small><b>${cesc(c.status)}</b></div></div></div></section></aside></div>`}", "  function renderSummary(c){\n    const taskRows=(window.__centralGetTasks?.()||[]).filter(t=>normalizeProject(t.project)===normalizeProject(c.name));\n    const done=taskRows.filter(t=>t.status==='feito').length,tPct=taskRows.length?Math.round(done/taskRows.length*100):0;\n    const rows=Array.isArray(c?.tapStructured?.metas_por_fonte)?c.tapStructured.metas_por_fonte:[];\n    const goal=rows.reduce((s,x)=>s+(+x.meta_faturamento||0),0)||(+c.goal||0);\n    const budget=rows.reduce((s,x)=>s+(+x.investimento||0),0)||(+c.budget||0);\n    const event=c?.tapStructured?.sobre_evento||{},offer=c?.tapStructured?.oferta||{};\n    const phases=Array.isArray(c?.tapStructured?.fases)?c.tapStructured.fases.filter(x=>x?.tem!==false):[];\n    const team=Array.isArray(c?.tapStructured?.equipe)?c.tapStructured.equipe:[];\n    const channels=[...new Set([...(Array.isArray(c.channels)?c.channels:[]),...(Array.isArray(c?.tapStructured?.cronograma)?c.tapStructured.cronograma.map(x=>x?.canal).filter(Boolean):[])])];\n    const context=c.objective||event.formato||event.observacoes||'Campanha sem contexto operacional preenchido.';\n    const benefits=[c.offer,event.cupom_automatico,offer.frete?('Frete: '+offer.frete):'',offer.brinde?('Brinde: '+offer.brinde):'',...(Array.isArray(c.benefits)?c.benefits:[])].filter(Boolean);\n    const metaRows=rows.length?rows.map(x=>'<div class=\"alliance-meta-row\"><div><b>'+cesc(x.fonte||'Canal')+'</b><span>'+cesc(x.responsavel||'Sem responsável')+'</span></div><strong>'+cMoney(+x.meta_faturamento||0)+'</strong><em>'+cMoney(+x.investimento||0)+'</em></div>').join(''):'<div class=\"alliance-summary-empty\">Sem rateio por canal preenchido.</div>';\n    const phaseRows=phases.length?phases.map(x=>'<div class=\"alliance-phase\"><i></i><div><b>'+cesc(x.nome||'Etapa')+'</b><span>'+cesc(x.data_legada||cDate(x.data))+'</span></div></div>').join(''):'<div class=\"alliance-summary-empty\">Nenhuma fase estruturada.</div>';\n    const teamRows=team.length?team.map(x=>'<div class=\"alliance-team-row\"><b>'+cesc(x.quem||'Responsável')+'</b><span>'+cesc(x.responsabilidade||'')+'</span></div>').join(''):'<div class=\"alliance-summary-empty\">Equipe não detalhada.</div>';\n    return '<div class=\"alliance-summary-grid\"><main>'+\n      '<section class=\"cw-card\"><div class=\"cw-card-head\"><strong>O que é esta campanha</strong><span>'+cesc(c.type||'Campanha')+'</span></div><div class=\"cw-card-body\"><p class=\"alliance-summary-lead\">'+cesc(context)+'</p><div class=\"alliance-summary-tags\">'+channels.map(x=>'<span>'+cesc(x)+'</span>').join('')+'</div></div></section>'+\n      '<section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Oferta e mecânica</strong><span>o que o público recebe</span></div><div class=\"cw-card-body\">'+(benefits.length?benefits.map((x,i)=>'<div class=\"alliance-offer-line '+(i===0?'primary':'')+'\">'+cesc(x)+'</div>').join(''):'<div class=\"alliance-summary-empty\">Oferta ainda não detalhada.</div>')+'</div></section>'+\n      '<section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Fases e momentos críticos</strong><span>'+phases.length+' etapa(s)</span></div><div class=\"cw-card-body\"><div class=\"alliance-phases\">'+phaseRows+'</div></div></section>'+\n      '<section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Equipe e responsabilidades</strong><span>quem faz o quê</span></div><div class=\"cw-card-body\"><div class=\"alliance-team-list\">'+teamRows+'</div></div></section>'+\n      '</main><aside>'+\n      '<section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Números da campanha</strong><span>'+tPct+'% das tarefas concluídas</span></div><div class=\"cw-card-body\"><div class=\"cw-properties\">'+\n      '<div class=\"cw-prop\"><small>Meta</small><b>'+cMoney(goal)+'</b></div><div class=\"cw-prop\"><small>Verba</small><b>'+cMoney(budget)+'</b></div><div class=\"cw-prop\"><small>ROAS alvo</small><b>'+(budget?(goal/budget).toFixed(1).replace('.',','):'—')+'</b></div><div class=\"cw-prop\"><small>Tarefas</small><b>'+done+'/'+taskRows.length+'</b></div></div><div class=\"cw-goalbar\"><i style=\"width:'+tPct+'%;background:#121415\"></i></div><div class=\"cw-small\" style=\"margin-top:5px\">Conclusão operacional · '+tPct+'%</div></div></section>'+\n      '<section class=\"cw-card\"><div class=\"cw-card-head\"><strong>Propriedades</strong></div><div class=\"cw-card-body\"><div class=\"cw-properties\"><div class=\"cw-prop\"><small>Responsável</small><b>'+cesc(c.owner||'Sem responsável')+'</b></div><div class=\"cw-prop\"><small>Marca</small><b>'+cesc(c.brand||'—')+'</b></div><div class=\"cw-prop\"><small>Tipo</small><b>'+cesc(c.type||'—')+'</b></div><div class=\"cw-prop\"><small>Status</small><b>'+cesc(c.status||'—')+'</b></div></div></div></section>'+\n      '<section class=\"cw-card alliance-meta-card\"><div class=\"cw-card-head\"><strong>Metas por canal</strong><span>meta · verba</span></div><div class=\"cw-card-body\"><div class=\"alliance-meta-head\"><span>Fonte</span><span>Meta</span><span>Verba</span></div>'+metaRows+'<div class=\"alliance-meta-total\"><span>Total</span><strong>'+cMoney(goal)+'</strong><em>'+cMoney(budget)+'</em></div></div></section>'+\n      '</aside></div>';\n  }");
    console.log("[AllianceOS build] patched campaign summary");
  } else console.warn("[AllianceOS build] renderer not found: campaign summary");
  if(html.includes("  function campaigns(){return window.__centralGetCampaigns?.()||[]}")) {
    html = html.replace("  function campaigns(){return window.__centralGetCampaigns?.()||[]}", "  function campaigns(){\n    try{\n      const live=JSON.parse(localStorage.getItem('central.campaigns.vitor-gutierrez')||'[]');\n      if(Array.isArray(live))return live;\n    }catch{}\n    return window.__centralGetCampaigns?.()||[];\n  }");
    console.log("[AllianceOS build] patched planning campaigns accessor");
  } else console.warn("[AllianceOS build] renderer not found: planning campaigns accessor");
  if(html.includes("  function tasks(){return window.__centralGetTasks?.()||[]}")) {
    html = html.replace("  function tasks(){return window.__centralGetTasks?.()||[]}", "  function tasks(){\n    try{\n      const live=JSON.parse(localStorage.getItem('central.tasks.vitor-gutierrez')||'[]');\n      if(Array.isArray(live))return live;\n    }catch{}\n    return window.__centralGetTasks?.()||[];\n  }");
    console.log("[AllianceOS build] patched planning tasks accessor");
  } else console.warn("[AllianceOS build] renderer not found: planning tasks accessor");
  if(html.includes("  function renderContext(){const cs=filteredCampaigns(),ts=filteredTasks();const open=ts.filter(t=>t.status!=='feito').length,done=ts.filter(t=>t.status==='feito').length,total=ts.length;const pct=total?Math.round(done/total*100):0;const goal=cs.reduce((a,c)=>a+(+c.goal||0),0);document.getElementById('planContext').innerHTML=`<div class=\"plan-kpi\"><small>Campanhas no mês</small><b>${cs.length}</b><span>${cs.filter(c=>c.status==='Em execução').length} em execução</span></div><div class=\"plan-kpi\"><small>Meta somada</small><b>${goal?goal.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'—'}</b><span>campanhas visíveis</span></div><div class=\"plan-kpi\"><small>Tarefas abertas</small><b>${open}</b><span>${pct}% concluídas</span></div><div class=\"plan-kpi\"><small>Semana atual</small><b>07 — 13</b><span>setembro de 2026</span></div>`}")) {
    html = html.replace("  function renderContext(){const cs=filteredCampaigns(),ts=filteredTasks();const open=ts.filter(t=>t.status!=='feito').length,done=ts.filter(t=>t.status==='feito').length,total=ts.length;const pct=total?Math.round(done/total*100):0;const goal=cs.reduce((a,c)=>a+(+c.goal||0),0);document.getElementById('planContext').innerHTML=`<div class=\"plan-kpi\"><small>Campanhas no mês</small><b>${cs.length}</b><span>${cs.filter(c=>c.status==='Em execução').length} em execução</span></div><div class=\"plan-kpi\"><small>Meta somada</small><b>${goal?goal.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'—'}</b><span>campanhas visíveis</span></div><div class=\"plan-kpi\"><small>Tarefas abertas</small><b>${open}</b><span>${pct}% concluídas</span></div><div class=\"plan-kpi\"><small>Semana atual</small><b>07 — 13</b><span>setembro de 2026</span></div>`}", "  function renderContext(){\n    const realNow=new Date();realNow.setHours(0,0,0,0);\n    let ref=String(window.AlliancePlanningMonthRef||'');if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(ref)){try{ref=sessionStorage.getItem('allianceos.planning.monthRef')||localStorage.getItem('allianceos.planning.monthRef')||''}catch{}}\n    if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(ref))ref=realNow.getFullYear()+'-'+String(realNow.getMonth()+1).padStart(2,'0');\n    const [yy,mm]=ref.split('-').map(Number),first=new Date(yy,mm-1,1),last=new Date(yy,mm,0);\n    let now=(realNow.getFullYear()===yy&&realNow.getMonth()===mm-1)?new Date(realNow):new Date(yy,mm-1,1);\n    const cs=filteredCampaigns().filter(c=>{\n      if(c?.archivedAt)return false;\n      const s=c.start?new Date(c.start+'T00:00:00'):null,e=c.end?new Date(c.end+'T00:00:00'):s;\n      return !s||!e||(s<=last&&e>=first);\n    });\n    const ts=filteredTasks().filter(t=>!t?.archivedAt);\n    const perp=cs.filter(c=>String(c.type||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').includes('perpet'));\n    const channelGoal=perp.reduce((a,c)=>{\n      const rows=Array.isArray(c?.tapStructured?.metas_por_fonte)?c.tapStructured.metas_por_fonte:[];\n      const n=rows.reduce((s,x)=>s+(+x.meta_faturamento||0),0);\n      return a+(n||(+c.goal||0));\n    },0);\n    const open=ts.filter(t=>t.status!=='feito').length,done=ts.filter(t=>t.status==='feito').length,total=ts.length,pct=total?Math.round(done/total*100):0;\n    const monday=new Date(now),wd=now.getDay();monday.setDate(now.getDate()+(wd===0?-6:1-wd));\n    const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);\n    document.getElementById('planContext').innerHTML=\n      '<div class=\"plan-kpi\"><small>Campanhas no mês</small><b>'+cs.length+'</b><span>'+perp.length+' perpétuas · '+(cs.length-perp.length)+' pontuais</span></div>'+\n      '<div class=\"plan-kpi\"><small>Meta dos canais</small><b>'+(channelGoal?channelGoal.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'—')+'</b><span>somente frentes perpétuas</span></div>'+\n      '<div class=\"plan-kpi\"><small>Tarefas abertas</small><b>'+open+'</b><span>'+pct+'% concluídas</span></div>'+\n      '<div class=\"plan-kpi\"><small>Semana atual</small><b>'+String(monday.getDate()).padStart(2,'0')+' — '+String(sunday.getDate()).padStart(2,'0')+'</b><span>'+sunday.toLocaleDateString('pt-BR',{month:'long'})+' de '+sunday.getFullYear()+'</span></div>';\n    [...document.querySelectorAll('body *')].forEach(el=>{\n      if(el.children.length===0&&/As campanhas somam/i.test(el.textContent||'')&&/meta ativa/i.test(el.textContent||'')){\n        const box=el.closest('div'); if(box)box.remove();\n      }\n    });\n  }");
    console.log("[AllianceOS build] patched planning context");
  } else console.warn("[AllianceOS build] renderer not found: planning context");
  if(html.includes("  function renderWeek(){const days=[['2026-09-07','Seg','07'],['2026-09-08','Ter','08'],['2026-09-09','Qua','09'],['2026-09-10','Qui','10'],['2026-09-11','Sex','11'],['2026-09-12','Sáb','12'],['2026-09-13','Dom','13']];const cs=filteredCampaigns(),ts=filteredTasks();document.getElementById('planWeekGrid').innerHTML=days.map(([iso,name,num])=>{const active=cs.filter(c=>c.start<=iso&&c.end>=iso),due=ts.filter(t=>t.due===iso);return `<section class=\"plan-day ${iso==='2026-09-07'?'today':''}\"><div class=\"plan-day-head\"><span>${name}</span><b>${num}</b></div><div class=\"plan-day-body\"><div class=\"day-section\"><div class=\"day-section-title\">Campanhas</div>${active.length?active.map(c=>`<article class=\"week-campaign-card\" data-plan-campaign=\"${esc(c.name)}\" style=\"--pc:${c.color||'#121415'}\"><b>${esc(c.name)}</b><span>${esc(c.status)} · ${esc(c.owner?.split(' ')[0]||'')}</span></article>`).join(''):'<div class=\"week-empty\">Nenhuma campanha ativa</div>'}</div><div class=\"day-section\"><div class=\"day-section-title\">Tarefas com prazo</div>${due.length?due.slice(0,12).map(t=>`<div class=\"week-task-row\" data-plan-task=\"${esc(t.id)}\"><b>${esc(t.title)}</b><span>${esc(t.assignees?.[0]||'Sem responsável')} · ${esc(t.status)}</span></div>`).join(''):'<div class=\"week-empty\">Sem vencimentos</div>'}</div></div></section>`}).join('');document.querySelectorAll('#planWeekGrid [data-plan-campaign]').forEach(b=>b.addEventListener('click',()=>window.openCampaignWorkspaceByName?.(b.dataset.planCampaign)));document.querySelectorAll('#planWeekGrid [data-plan-task]').forEach(r=>r.addEventListener('click',()=>{window.__centralShowTasks?.();setTimeout(()=>{document.querySelector(`[data-task-id=\"${CSS.escape(r.dataset.planTask)}\"]`)?.click()},50)}))}")) {
    html = html.replace("  function renderWeek(){const days=[['2026-09-07','Seg','07'],['2026-09-08','Ter','08'],['2026-09-09','Qua','09'],['2026-09-10','Qui','10'],['2026-09-11','Sex','11'],['2026-09-12','Sáb','12'],['2026-09-13','Dom','13']];const cs=filteredCampaigns(),ts=filteredTasks();document.getElementById('planWeekGrid').innerHTML=days.map(([iso,name,num])=>{const active=cs.filter(c=>c.start<=iso&&c.end>=iso),due=ts.filter(t=>t.due===iso);return `<section class=\"plan-day ${iso==='2026-09-07'?'today':''}\"><div class=\"plan-day-head\"><span>${name}</span><b>${num}</b></div><div class=\"plan-day-body\"><div class=\"day-section\"><div class=\"day-section-title\">Campanhas</div>${active.length?active.map(c=>`<article class=\"week-campaign-card\" data-plan-campaign=\"${esc(c.name)}\" style=\"--pc:${c.color||'#121415'}\"><b>${esc(c.name)}</b><span>${esc(c.status)} · ${esc(c.owner?.split(' ')[0]||'')}</span></article>`).join(''):'<div class=\"week-empty\">Nenhuma campanha ativa</div>'}</div><div class=\"day-section\"><div class=\"day-section-title\">Tarefas com prazo</div>${due.length?due.slice(0,12).map(t=>`<div class=\"week-task-row\" data-plan-task=\"${esc(t.id)}\"><b>${esc(t.title)}</b><span>${esc(t.assignees?.[0]||'Sem responsável')} · ${esc(t.status)}</span></div>`).join(''):'<div class=\"week-empty\">Sem vencimentos</div>'}</div></div></section>`}).join('');document.querySelectorAll('#planWeekGrid [data-plan-campaign]').forEach(b=>b.addEventListener('click',()=>window.openCampaignWorkspaceByName?.(b.dataset.planCampaign)));document.querySelectorAll('#planWeekGrid [data-plan-task]').forEach(r=>r.addEventListener('click',()=>{window.__centralShowTasks?.();setTimeout(()=>{document.querySelector(`[data-task-id=\"${CSS.escape(r.dataset.planTask)}\"]`)?.click()},50)}))}", "  function renderWeek(){\n    const realNow=new Date();realNow.setHours(0,0,0,0);\n    let ref=String(window.AlliancePlanningMonthRef||'');if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(ref)){try{ref=sessionStorage.getItem('allianceos.planning.monthRef')||localStorage.getItem('allianceos.planning.monthRef')||''}catch{}}\n    if(!/^20\\d{2}-(0[1-9]|1[0-2])$/.test(ref))ref=realNow.getFullYear()+'-'+String(realNow.getMonth()+1).padStart(2,'0');\n    const [yy,mm]=ref.split('-').map(Number);let now=(realNow.getFullYear()===yy&&realNow.getMonth()===mm-1)?new Date(realNow):new Date(yy,mm-1,1);\n    const monday=new Date(now),wd=now.getDay();monday.setDate(now.getDate()+(wd===0?-6:1-wd));if(monday.getMonth()!==mm-1&&realNow.getMonth()!==mm-1)monday.setDate(monday.getDate()+7);\n    const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);\n    const toolbar=document.querySelector('[data-plan-pane=\"week\"] .month-toolbar strong');\n    if(toolbar)toolbar.textContent='Semana · '+String(monday.getDate()).padStart(2,'0')+' — '+String(sunday.getDate()).padStart(2,'0')+' de '+sunday.toLocaleDateString('pt-BR',{month:'long'});\n    const names=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'],cs=filteredCampaigns(),ts=filteredTasks();\n    document.getElementById('planWeekGrid').innerHTML=Array.from({length:7},(_,i)=>{\n      const d=new Date(monday);d.setDate(monday.getDate()+i);\n      const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');\n      const active=cs.filter(c=>c.start<=iso&&c.end>=iso),due=ts.filter(t=>t.due===iso);\n      return '<section class=\"plan-day '+(d.getTime()===now.getTime()?'today':'')+'\"><div class=\"plan-day-head\"><span>'+names[i]+'</span><b>'+String(d.getDate()).padStart(2,'0')+'</b></div><div class=\"plan-day-body\">'+\n        '<div class=\"day-section\"><div class=\"day-section-title\">Campanhas</div>'+(active.length?active.map(c=>'<article class=\"week-campaign-card\" data-plan-campaign=\"'+esc(c.name)+'\" style=\"--pc:'+(c.color||'#121415')+'\"><b>'+esc(c.name)+'</b><span>'+esc(c.type)+' · '+esc(c.status)+'</span></article>').join(''):'<div class=\"week-empty\">Nenhuma campanha ativa</div>')+'</div>'+\n        '<div class=\"day-section\"><div class=\"day-section-title\">Tarefas com prazo</div>'+(due.length?due.slice(0,12).map(t=>'<div class=\"week-task-row\"><span>✓</span><b>'+esc(t.title)+'</b></div>').join(''):'<div class=\"week-empty\">Sem tarefas com prazo</div>')+'</div></div></section>';\n    }).join('');\n    document.querySelectorAll('[data-plan-campaign]').forEach(b=>b.addEventListener('click',()=>window.openCampaignWorkspaceByName?.(b.dataset.planCampaign)));\n  }");
    console.log("[AllianceOS build] patched planning week");
  } else console.warn("[AllianceOS build] renderer not found: planning week");
  // MONTH_SCOPED_CAMPAIGN_DIRECTORY_V3
  // Final authority for the Campaigns directory. Earlier source patches
  // normalize campaign objects, but this final runtime replacement ensures
  // the actual renderer shown to the user obeys the selected planning month.
  {
    const start = html.indexOf("  function filteredCampaigns(){");
    const end = html.indexOf("\n  function renderCampaignRow", start);
    if (start < 0 || end < 0 || end <= start) {
      throw new Error('Não encontrei filteredCampaigns final para aplicar o filtro mensal');
    }
    const monthlyFiltered = String.raw`  function filteredCampaigns(){
    try{
      const live=JSON.parse(localStorage.getItem(campaignStorageKey)||'[]');
      if(Array.isArray(live))campaignData=live;
    }catch{}

    const q=(document.getElementById('campaignSearch')?.value||'').trim().toLowerCase();
    const st=document.getElementById('campaignStatusFilter')?.value||'';
    const brand=getSelectedBrand();

    let ref=String(window.AlliancePlanningMonthRef||'');
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(ref)){
      try{
        ref=sessionStorage.getItem('allianceos.planning.monthRef')
          ||localStorage.getItem('allianceos.planning.monthRef')
          ||'';
      }catch{}
    }
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(ref)){
      const d=new Date();
      ref=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    }

    const [yy,mm]=ref.split('-').map(Number);
    const first=new Date(yy,mm-1,1);
    const last=new Date(yy,mm,0);

    // If a monthly mind map exists, its campaign links define membership.
    // This is the same planning the user is looking at in Mapa mental.
    const mapIds=new Set();
    if(brand){
      const uid=(window.user&&window.user.id)||'vitor-gutierrez';
      const mapKeys=[
        'central.planning.map.'+uid+'.'+brand+'.'+ref,
        'central.planning.map.vitor-gutierrez.'+brand+'.'+ref,
        'central.planning.map.shared.'+brand+'.'+ref
      ];
      for(const key of mapKeys){
        try{
          const map=JSON.parse(localStorage.getItem(key)||'null');
          const ids=(Array.isArray(map?.nos)?map.nos:[])
            .map(n=>String(n?.campId||n?.campaignId||'').trim())
            .filter(Boolean);
          if(ids.length){
            ids.forEach(id=>mapIds.add(id));
            break;
          }
        }catch{}
      }
    }

    const allowed=new Set((window.AllianceOSDirectory?.brands||[])
      .map(b=>String(b?.nome||'')).filter(Boolean));

    return campaignData.map(normalizeCampaign).filter(c=>{
      if(c?.archivedAt)return false;
      if(allowed.size&&c.brand&&!allowed.has(String(c.brand)))return false;
      if(brand&&c.brand!==brand)return false;

      if(mapIds.size){
        if(!mapIds.has(String(c.id||'')))return false;
      }else{
        const explicit=String(c?.monthRef||c?.month_ref||'').slice(0,7);
        if(/^20\d{2}-(0[1-9]|1[0-2])$/.test(explicit)){
          if(explicit!==ref)return false;
        }else{
          const start=c.start?new Date(c.start+'T00:00:00'):null;
          const end=c.end?new Date(c.end+'T00:00:00'):start;
          if(start&&end&&(start>last||end<first))return false;
        }
      }

      if(st&&c.status!==st)return false;
      if(q&&!([c.name,c.type,c.owner,c.offer,...(Array.isArray(c.channels)?c.channels:[])]
        .join(' ').toLowerCase().includes(q)))return false;
      return true;
    });
  }`;
    html = html.slice(0,start) + monthlyFiltered + html.slice(end);
    console.log('[AllianceOS build] campaign directory locked to selected month/map');
  }

  // CAMPAIGN_DIRECTORY_HYDRATION_V4
  // The campaign script can boot before public-state hydration finishes.
  // Re-render the directory whenever the canonical campaign/map state arrives,
  // and expose one reliable renderer for the newer strategy layers.
  {
    const hook = "  window.__centralShowCampaigns=showCampaigns;\n  window.__centralGetCampaigns=()=>campaignData;";
    if(!html.includes(hook)) throw new Error('Não encontrei o hook final da tela de Campanhas');
    const replacement = String.raw`  function refreshCampaignDirectory(){
    try{
      const live=JSON.parse(localStorage.getItem(campaignStorageKey)||'[]');
      if(Array.isArray(live))campaignData=live;
    }catch{}
    if(document.getElementById('campaignsView')?.classList.contains('active')){
      try{renderCampaigns()}catch(e){console.warn('[AllianceOS campanhas] render',e)}
    }
  }
  window.__centralShowCampaigns=showCampaigns;
  window.__centralRenderCampaigns=refreshCampaignDirectory;
  window.__centralGetCampaigns=()=>campaignData;
  window.addEventListener('allianceos:state-updated',e=>{
    const key=String(e?.detail?.key||'');
    if(key===campaignStorageKey||key.startsWith('central.planning.map.')){
      setTimeout(refreshCampaignDirectory,0);
      setTimeout(refreshCampaignDirectory,120);
    }
  });
  window.addEventListener('allianceos:planning-month',()=>setTimeout(refreshCampaignDirectory,0));
  window.addEventListener('allianceos:planning-month-ready',()=>setTimeout(refreshCampaignDirectory,0));
  document.getElementById('campaignsNav')?.addEventListener('click',()=>{
    setTimeout(refreshCampaignDirectory,0);
    setTimeout(refreshCampaignDirectory,180);
    setTimeout(refreshCampaignDirectory,700);
  });`;
    html=html.replace(hook,replacement);
    console.log('[AllianceOS build] campaign directory hydration hooks installed');
  }

  // AllianceOS: corrige a fonte canônica e remove datas congeladas do calendário legado.
  // Esse runtime antigo redesenha Mês/Semana/Campanhas via MutationObserver, então
  // precisa ler a mesma coleção canônica usada pelo restante do AllianceOS.
  {
    const legacyCampaignKey = "  const chaveCamp = () => `central.campaigns.${(window.user && window.user.id) || 'vitor-gutierrez'}`;";
    const legacyTaskKey = "  const chaveTar  = () => `central.tasks.${(window.user && window.user.id) || 'vitor-gutierrez'}`;";
    if (!html.includes(legacyCampaignKey) || !html.includes(legacyTaskKey)) throw new Error('Não encontrei as chaves legadas do calendário');
    html = html.replace(legacyCampaignKey, "  const chaveCamp = () => 'central.campaigns.vitor-gutierrez';");
    html = html.replace(legacyTaskKey, "  const chaveTar  = () => 'central.tasks.vitor-gutierrez';");

    const oldCampaignFilter = "    return ler(chaveCamp()).filter((c) => {\n      if (marca && c.brand !== marca) return false;";
    const newCampaignFilter = "    return ler(chaveCamp()).filter((c) => {\n      if (c?.archivedAt) return false;\n      if (marca && c.brand !== marca) return false;";
    if (!html.includes(oldCampaignFilter)) throw new Error('Não encontrei o filtro legado de campanhas do calendário');
    html = html.replace(oldCampaignFilter, newCampaignFilter);

    const oldTaskFilter = "    return ler(chaveTar()).filter((t) => !marca || t.brand === marca);";
    const newTaskFilter = "    return ler(chaveTar()).filter((t) => !t?.archivedAt && (!marca || t.brand === marca));";
    if (!html.includes(oldTaskFilter)) throw new Error('Não encontrei o filtro legado de tarefas do calendário');
    html = html.replace(oldTaskFilter, newTaskFilter);

    const oldContinuous = "    if (['Perpétuo', 'Recompra'].includes(c.type)) return true;";
    const newContinuous = "    const tipo = String(c?.type || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n    if (tipo.includes('perpet') || tipo.includes('recompra')) return true;";
    if (!html.includes(oldContinuous)) throw new Error('Não encontrei a regra legada de campanhas contínuas');
    html = html.replace(oldContinuous, newContinuous);

    const oldTypeFilter = "    return c.type === f;\n  }\n\n  /* ---------- a faixa das contínuas, com os filtros ---------- */";
    const newTypeFilter = "    const tipo = String(c?.type || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n    const nome = String(c?.name || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n    const texto = tipo + ' ' + nome;\n    if (f === 'Dia D') return tipo === 'diad' || texto.includes('dia d');\n    if (f === 'Semana temática') return texto.includes('semana');\n    if (f === 'Ação de GAP') return texto.includes('gap');\n    if (f === 'Recompra') return texto.includes('recompra');\n    return false;\n  }\n\n  /* ---------- a faixa das contínuas, com os filtros ---------- */";
    if (!html.includes(oldTypeFilter)) throw new Error('Não encontrei os filtros legados por tipo');
    html = html.replace(oldTypeFilter, newTypeFilter);

    const weekAnchor = "  const colDe = (d) => (d.getDay() + 6) % 7;";
    if (!html.includes(weekAnchor)) throw new Error('Não encontrei o cálculo de coluna do calendário');
    html = html.replace(weekAnchor, weekAnchor + "\n  function semanaAtual() {\n    const hoje = soData(new Date());\n    const a = new Date(hoje); a.setDate(hoje.getDate() - colDe(hoje));\n    const b = new Date(a); b.setDate(a.getDate() + 6);\n    return { a, b };\n  }");

    const frozenWeek = "    const s = { a: new Date(2026, 8, 7), b: new Date(2026, 8, 13) };";
    const frozenWeekCount = html.split(frozenWeek).length - 1;
    if (frozenWeekCount < 2) throw new Error('Não encontrei as semanas congeladas de Planejamento/Home');
    html = html.replaceAll(frozenWeek, "    const s = semanaAtual();");

    const frozenToday = "    const hoje = new Date(2026, 8, 7);   // o app inteiro trabalha nesta data";
    if (!html.includes(frozenToday)) throw new Error('Não encontrei a data congelada do calendário');
    html = html.replace(frozenToday, "    const hoje = soData(new Date());");
    html = html.replace("dia === '2026-09-07' ? 'cal-hoje' : ''", "dia === isoDe(soData(new Date())) ? 'cal-hoje' : ''");
  }
  html = html.replace('Semana · 07 — 13 de setembro','Semana atual');


  // CAMPAIGN_CREATION_WIZARD_V2
  // Route the legacy "+ Nova campanha" capture listener to the complete
  // AllianceOS wizard, while keeping the previous assistant as fallback.
  {
    const listenerStart=html.indexOf("  document.addEventListener('click', (e) => {\n    const bt = e.target.closest('#newCampaignBtn, #planAddCampaignBtn');");
    if(listenerStart<0)throw new Error('Não encontrei o listener legado de Nova campanha');
    const oldCall='    comecar(null);';
    const callAt=html.indexOf(oldCall,listenerStart);
    if(callAt<0)throw new Error('Não encontrei a chamada do assistente legado');
    const newCall="    if(window.AllianceCampaignWizard?.open) window.AllianceCampaignWizard.open(null);\n    else comecar(null);";
    html=html.slice(0,callAt)+newCall+html.slice(callAt+oldCall.length);
  }

  // CAMPAIGN_EDITING_V6_MESSAGE_MODAL
  // TAP fields are explicit form controls now, and campaign schedule messages
  // are edited through one canonical modal backed by tapStructured.cronograma.
  {
    const replaceRuntimeBlock=(startMarker,endMarker,replacement,label)=>{
      const start=html.indexOf(startMarker);
      const end=html.indexOf(endMarker,start);
      if(start<0||end<0||end<=start)throw new Error('Não encontrei o bloco '+label+' no runtime final');
      html=html.slice(0,start)+replacement+'\n'+html.slice(end);
    };

    const scheduleV6=String.raw`
  function tapSectionIsSchedule(section){
    const title=String(section?.title||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const cols=Array.isArray(section?.columns)?section.columns.map(x=>String(x||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")):[];
    return title.includes("cronograma")||(cols.includes("data")&&cols.includes("canal")&&cols.some(x=>x.includes("acao")));
  }
  function scheduleIsoFromLabel(c,label){
    const raw=String(label||"");
    const iso=raw.match(/(20\d{2})-(\d{2})-(\d{2})/);
    if(iso)return iso[1]+"-"+iso[2]+"-"+iso[3];
    const br=raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?/);
    if(!br)return "";
    const year=br[3]||String(c.start||c.end||new Date().getFullYear()).slice(0,4)||String(new Date().getFullYear());
    return year+"-"+String(br[2]).padStart(2,"0")+"-"+String(br[1]).padStart(2,"0");
  }
  function scheduleTimeFromLabel(label){
    const raw=String(label||"");
    const clock=raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if(clock)return String(clock[1]).padStart(2,"0")+":"+clock[2];
    const h=raw.match(/\b(\d{1,2})h(?:(\d{2}))?/i);
    return h?String(h[1]).padStart(2,"0")+":"+(h[2]||"00"):"";
  }
  function schedulePeriodLabel(data,hora){
    if(!data)return hora||"";
    const parts=String(data).split("-");
    const d=parts.length===3?parts[2]+"/"+parts[1]:data;
    return hora?d+" · "+hora:d;
  }
  function campaignScheduleEntries(c){
    if(!c.tapStructured||typeof c.tapStructured!=="object"||Array.isArray(c.tapStructured))c.tapStructured={};
    let rows=Array.isArray(c.tapStructured.cronograma)?c.tapStructured.cronograma:null;
    if(!rows||!rows.length){
      let legacy=Array.isArray(c.schedule)?c.schedule:[];
      if(!legacy.length&&Array.isArray(c.tap)){
        const sec=c.tap.find(tapSectionIsSchedule);
        if(sec&&Array.isArray(sec.rows))legacy=sec.rows;
      }
      rows=(legacy||[]).map((r,i)=>{
        if(!Array.isArray(r))return {...r};
        const periodo=String(r[0]||"");
        return {
          id:"cron-"+String(c.id||"camp")+"-"+i,
          data:scheduleIsoFromLabel(c,periodo),
          hora:scheduleTimeFromLabel(periodo),
          periodo:periodo,
          canal:String(r[1]||""),
          tipo:"Mensagem / ação",
          titulo:String(r[2]||""),
          conteudo:String(r[2]||""),
          quem_faz:String(r[3]||""),
          responsaveis:String(r[3]||"")?[String(r[3])]:[]
        };
      });
      c.tapStructured.cronograma=rows;
    }
    rows.forEach((r,i)=>{
      if(!r.id)r.id="cron-"+String(c.id||"camp")+"-"+i;
      if(!r.data)r.data=scheduleIsoFromLabel(c,r.periodo||r.prazo||"");
      if(!r.hora)r.hora=scheduleTimeFromLabel(r.periodo||r.prazo||"");
      if(!r.periodo)r.periodo=schedulePeriodLabel(r.data,r.hora);
      if(!r.tipo)r.tipo="Mensagem / ação";
      if(!r.titulo)r.titulo=String(r.acao||r.conteudo||"").split(/\n/)[0].slice(0,100);
      if(!Array.isArray(r.responsaveis)&&r.quem_faz)r.responsaveis=[r.quem_faz];
    });
    return rows;
  }
  function persistCampaignDraft(c){
    const raw=campaignData.find(x=>String(x.id)===String(c.id));
    if(raw&&raw!==c)Object.assign(raw,c);
    const target=raw||c;
    target.updatedAt=new Date().toISOString();
    localStorage.setItem(campaignStorageKey,JSON.stringify(campaignData));
  }
  function syncScheduleLegacy(c){
    const rows=campaignScheduleEntries(c);
    c.schedule=rows.map(r=>[
      schedulePeriodLabel(r.data,r.hora)||String(r.periodo||r.prazo||""),
      String(r.canal||""),
      String(r.titulo||r.acao||r.conteudo||""),
      String(r.quem_faz||((r.responsaveis||[]).join(", "))||"")
    ]);
    const tap=getTap(c);
    let sec=tap.find(tapSectionIsSchedule);
    if(!sec){
      sec={title:"2. Cronograma e canais",columns:["Data","Canal","Ação","Responsável"],rows:[]};
      tap.splice(Math.min(1,tap.length),0,sec);
    }
    sec.columns=["Data","Canal","Ação","Responsável"];
    sec.rows=c.schedule.map(r=>r.slice());
    c.channels=[...new Set([...(Array.isArray(c.channels)?c.channels:[]),...rows.map(r=>String(r.canal||"").trim()).filter(Boolean)])];
    persistCampaignDraft(c);
  }
  function closeScheduleMessageModal(){
    document.querySelector(".schedule-editor-layer")?.remove();
  }
  function openScheduleMessageModal(c,id="",prefillDate=""){
    closeScheduleMessageModal();
    const rows=campaignScheduleEntries(c);
    const current=rows.find(x=>String(x.id)===String(id))||null;
    const value=(x,fallback="")=>current&&current[x]!=null?String(current[x]):fallback;
    const layer=document.createElement("div");
    layer.className="schedule-editor-layer";
    layer.innerHTML=
      '<div class="schedule-editor-backdrop" data-schedule-close></div>'+
      '<section class="schedule-editor-modal" role="dialog" aria-modal="true">'+
        '<div class="schedule-editor-head"><div><small>CRONOGRAMA DA CAMPANHA</small><h3>'+(current?"Editar mensagem / ação":"Nova mensagem / ação")+'</h3><p>Defina canal, data, hora e a copy. O item entra no Cronograma e no TAP ao mesmo tempo.</p></div><button type="button" data-schedule-close aria-label="Fechar">×</button></div>'+
        '<form class="schedule-editor-form">'+
          '<div class="schedule-editor-grid">'+
            '<label><span>Tipo</span><select name="tipo"><option>Mensagem / disparo</option><option>Post / story</option><option>Live</option><option>Site / LP</option><option>Criativo / anúncio</option><option>Outro</option></select></label>'+
            '<label><span>Canal</span><input name="canal" list="scheduleChannelOptions" required placeholder="Ex.: WhatsApp API"></label>'+
            '<label><span>Data</span><input name="data" type="date" required></label>'+
            '<label><span>Hora</span><input name="hora" type="time"></label>'+
            '<label class="wide"><span>Título / ação</span><input name="titulo" maxlength="160" placeholder="Ex.: Mensagem 1 · abertura do carrinho" required></label>'+
            '<label class="wide"><span>Mensagem / copy</span><textarea name="conteudo" rows="8" placeholder="Escreva aqui a mensagem completa, briefing ou ação que deve ser executada."></textarea></label>'+
            '<label><span>Responsável</span><input name="quem_faz" placeholder="Nome do responsável"></label>'+
            '<label><span>Template / nome interno</span><input name="template" placeholder="Opcional · útil para API"></label>'+
            '<label class="wide"><span>Link / CTA</span><input name="link" placeholder="Opcional"></label>'+
          '</div>'+
          '<datalist id="scheduleChannelOptions"><option value="WhatsApp API"><option value="WhatsApp grupos"><option value="E-mail"><option value="Instagram Feed"><option value="Instagram Stories"><option value="TikTok Shop"><option value="TikTok Ads"><option value="Meta Ads"><option value="Site / LP"><option value="Influenciadores"></datalist>'+
          '<div class="schedule-editor-foot"><span>Salvar atualiza Cronograma + TAP e sincroniza o estado da campanha.</span><div><button type="button" class="secondary" data-schedule-close>Cancelar</button><button type="submit" class="primary">'+(current?"Salvar alterações":"Criar mensagem")+'</button></div></div>'+
        '</form>'+
      '</section>';
    document.body.appendChild(layer);
    const form=layer.querySelector(".schedule-editor-form");
    form.tipo.value=value("tipo","Mensagem / disparo");
    form.canal.value=value("canal","");
    form.data.value=value("data",prefillDate||c.start||"");
    form.hora.value=value("hora","");
    form.titulo.value=value("titulo",value("acao",""));
    form.conteudo.value=value("conteudo","");
    form.quem_faz.value=value("quem_faz",Array.isArray(current?.responsaveis)?current.responsaveis.join(", "):"");
    form.template.value=value("template","");
    form.link.value=value("link","");
    layer.querySelectorAll("[data-schedule-close]").forEach(x=>x.addEventListener("click",closeScheduleMessageModal));
    layer.addEventListener("click",e=>{if(e.target===layer.querySelector(".schedule-editor-backdrop"))closeScheduleMessageModal()});
    form.addEventListener("submit",e=>{
      e.preventDefault();
      const owner=String(form.quem_faz.value||"").trim();
      const payload={
        id:current?.id||("cron-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6)),
        data:String(form.data.value||""),
        hora:String(form.hora.value||""),
        periodo:schedulePeriodLabel(form.data.value,form.hora.value),
        canal:String(form.canal.value||"").trim(),
        tipo:String(form.tipo.value||"Mensagem / disparo"),
        titulo:String(form.titulo.value||"").trim(),
        acao:String(form.titulo.value||"").trim(),
        conteudo:String(form.conteudo.value||"").trim(),
        quem_faz:owner,
        responsaveis:owner?[owner]:[],
        template:String(form.template.value||"").trim(),
        link:String(form.link.value||"").trim(),
        origem:"interface",
        atualizado_em:new Date().toISOString()
      };
      if(current)Object.assign(current,payload);
      else rows.push(payload);
      syncScheduleLegacy(c);
      closeScheduleMessageModal();
      campaignState.workspaceTab="schedule";
      saveCampaigns();
      showToast(current?"Mensagem atualizada no cronograma":"Mensagem adicionada ao cronograma");
    });
    setTimeout(()=>form.canal.focus(),30);
  }
  function bindScheduleEditing(c){
    document.querySelectorAll("[data-schedule-add]").forEach(b=>b.addEventListener("click",()=>openScheduleMessageModal(c)));
    document.querySelectorAll("[data-schedule-id]").forEach(el=>el.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();openScheduleMessageModal(c,el.dataset.scheduleId||"");
    }));
    document.querySelectorAll("[data-schedule-date]").forEach(day=>day.addEventListener("dblclick",e=>{
      if(e.target.closest("[data-schedule-id]"))return;
      openScheduleMessageModal(c,"",day.dataset.scheduleDate||"");
    }));
  }
  function renderSchedule(c){
    const rows=campaignScheduleEntries(c);
    const dated=rows.map(r=>({row:r,iso:r.data||scheduleIsoFromLabel(c,r.periodo||r.prazo||"")})).filter(x=>/^20\d{2}-\d{2}-\d{2}$/.test(x.iso));
    const dates=dated.map(x=>new Date(x.iso+"T00:00:00")).filter(d=>!Number.isNaN(d.getTime()));
    const campaignStart=c.start?new Date(c.start+"T00:00:00"):null;
    const campaignEnd=c.end?new Date(c.end+"T00:00:00"):null;
    const allStart=[campaignStart,...dates].filter(Boolean);
    const allEnd=[campaignEnd,...dates].filter(Boolean);
    const minDate=allStart.length?new Date(Math.min(...allStart.map(d=>d.getTime()))):new Date();
    const maxDate=allEnd.length?new Date(Math.max(...allEnd.map(d=>d.getTime()))):new Date(minDate);
    const first=new Date(minDate),firstWd=first.getDay();
    first.setDate(first.getDate()+(firstWd===0?-6:1-firstWd));first.setHours(0,0,0,0);
    const last=new Date(maxDate),lastWd=last.getDay();
    last.setDate(last.getDate()+(lastWd===0?0:7-lastWd));last.setHours(0,0,0,0);
    const days=[];for(let d=new Date(first);d<=last;d.setDate(d.getDate()+1))days.push(new Date(d));
    const names=["SEG","TER","QUA","QUI","SEX","SÁB","DOM"];
    const today=new Date();today.setHours(0,0,0,0);
    const channelClass=v=>{
      const n=String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      if(n.includes("whatsapp")||n.includes("api"))return"whatsapp";
      if(n.includes("email")||n.includes("e-mail"))return"email";
      if(n.includes("instagram")||n.includes("tiktok"))return"instagram";
      if(n.includes("site")||n.includes("pagina")||n.includes("lp"))return"site";
      if(n.includes("criativ")||n.includes("ads")||n.includes("anuncio"))return"creative";
      return"other";
    };
    const eventCard=r=>{
      const preview=String(r.conteudo||"").trim();
      return '<article class="schedule-event '+channelClass(r.canal)+'" data-schedule-id="'+cesc(r.id)+'" title="Clique para editar">'+
        '<div class="schedule-event-top"><span class="schedule-event-channel">'+cesc(r.canal||"Canal")+'</span>'+(r.hora?'<time>'+cesc(r.hora)+'</time>':"")+'</div>'+
        '<b>'+cesc(r.titulo||r.acao||"Ação")+'</b>'+
        (preview&&preview!==r.titulo?'<p>'+cesc(preview.slice(0,120))+(preview.length>120?"…":"")+'</p>':"")+
        '<small>'+cesc(r.quem_faz||((r.responsaveis||[]).join(", "))||"Sem responsável")+'</small></article>';
    };
    const dayCells=days.map((d,i)=>{
      const key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      const list=dated.filter(x=>x.iso===key).map(x=>x.row);
      const outside=(campaignStart&&d<campaignStart)||(campaignEnd&&d>campaignEnd);
      return '<section class="schedule-day '+(outside?"outside ":"")+(d.getTime()===today.getTime()?"today":"")+'" data-schedule-date="'+key+'">'+
        '<header><span>'+names[i%7]+'</span><b>'+d.getDate()+'</b>'+(d.getTime()===today.getTime()?'<em>Hoje</em>':"")+'</header>'+
        '<div class="schedule-day-events">'+list.map(eventCard).join("")+'</div></section>';
    }).join("");
    const listRows=rows.slice().sort((a,b)=>String(a.data||"9999").localeCompare(String(b.data||"9999"))||String(a.hora||"").localeCompare(String(b.hora||""))).map(r=>
      '<button type="button" class="schedule-list-row schedule-list-button" data-schedule-id="'+cesc(r.id)+'">'+
        '<div class="schedule-list-date"><b>'+cesc(r.data?cDate(r.data):"Sem data")+'</b>'+(r.hora?'<span>'+cesc(r.hora)+'</span>':"")+'</div>'+
        '<span class="schedule-list-channel '+channelClass(r.canal)+'">'+cesc(r.canal||"Canal")+'</span>'+
        '<div class="schedule-list-action"><b>'+cesc(r.titulo||r.acao||"Ação")+'</b><small>'+cesc(r.quem_faz||((r.responsaveis||[]).join(", "))||"Sem responsável")+'</small></div><span class="schedule-edit-hint">Editar</span></button>'
    ).join("");
    const channels=[...new Set(rows.map(r=>String(r.canal||"").trim()).filter(Boolean))];
    const legend=channels.map(ch=>'<span class="schedule-legend-item '+channelClass(ch)+'"><i></i>'+cesc(ch)+'</span>').join("");
    const monthTitle=minDate.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
    return '<section class="cw-card campaign-schedule-card">'+
      '<div class="schedule-toolbar"><div><small>Cronograma da campanha</small><h3>'+cesc(monthTitle)+'</h3><p>'+rows.length+' '+(rows.length===1?"ação":"ações")+' · '+channels.length+' canais · '+cDate(c.start)+' — '+cDate(c.end)+'</p></div>'+
      '<div class="schedule-toolbar-actions"><button type="button" class="schedule-add-message" data-schedule-add>+ Mensagem / ação</button><div class="schedule-view-switch"><input id="scheduleCalendarView" type="radio" name="scheduleView" checked><label for="scheduleCalendarView">Calendário</label><input id="scheduleListView" type="radio" name="scheduleView"><label for="scheduleListView">Lista</label></div></div></div>'+
      '<div class="schedule-legend">'+(legend||'<span class="schedule-legend-item other"><i></i>Sem canais cadastrados</span>')+'</div>'+
      '<div class="schedule-view-panels"><div class="schedule-calendar-panel"><div class="schedule-weekdays">'+names.map(n=>'<span>'+n+'</span>').join("")+'</div><div class="schedule-calendar-grid">'+dayCells+'</div><small class="schedule-doubleclick-hint">Dica: dê dois cliques em um dia para criar uma mensagem já com a data preenchida.</small></div>'+
      '<div class="schedule-list-panel">'+(listRows||'<div class="alliance-summary-empty">Nenhuma ação cadastrada. Clique em “+ Mensagem / ação” para criar a primeira.</div>')+'</div></div></section>';
  }`;

    const tapV6=String.raw`
  function renderTap(c){
    const tap=getTap(c);
    campaignScheduleEntries(c);
    syncScheduleLegacy(c);
    const editor=(value,si,ri,ci)=>{
      const v=String(value??"");
      const long=v.length>70||ci===1;
      if(long)return '<textarea class="tap-cell-editor" data-tap-input="'+si+':'+ri+':'+ci+'" rows="'+(v.length>160?4:2)+'">'+cesc(v)+'</textarea>';
      return '<input class="tap-cell-editor" data-tap-input="'+si+':'+ri+':'+ci+'" value="'+cesc(v)+'">';
    };
    const sections=tap.map((s,si)=>{
      if(tapSectionIsSchedule(s)){
        const rows=campaignScheduleEntries(c);
        const scheduleRows=rows.length?rows.map(r=>
          '<tr><td>'+cesc(schedulePeriodLabel(r.data,r.hora)||r.periodo||"—")+'</td><td>'+cesc(r.canal||"—")+'</td><td><b>'+cesc(r.titulo||r.acao||"Ação")+'</b><small class="tap-message-preview">'+cesc(String(r.conteudo||"").slice(0,100))+'</small></td><td>'+cesc(r.quem_faz||((r.responsaveis||[]).join(", "))||"—")+'</td><td><button type="button" class="tap-row-edit" data-tap-schedule-edit="'+cesc(r.id)+'">Editar</button></td></tr>'
        ).join(""):'<tr><td colspan="5"><div class="alliance-summary-empty">Nenhuma mensagem ou ação no cronograma.</div></td></tr>';
        return '<section class="tap-section tap-schedule-section"><div class="tap-section-head"><input class="tap-title-editor" data-tap-title-input="'+si+'" value="'+cesc(s.title)+'"><button type="button" data-tap-add-schedule>+ Mensagem / ação</button></div><div class="tap-table-wrap"><table class="tap-table"><thead><tr><th>Data / hora</th><th>Canal</th><th>Mensagem / ação</th><th>Responsável</th><th></th></tr></thead><tbody>'+scheduleRows+'</tbody></table></div></section>';
      }
      return '<section class="tap-section"><div class="tap-section-head"><input class="tap-title-editor" data-tap-title-input="'+si+'" value="'+cesc(s.title)+'"><button type="button" data-add-tap-row="'+si+'">+ linha</button></div><div class="tap-table-wrap"><table class="tap-table"><thead><tr>'+s.columns.map(x=>'<th>'+cesc(x)+'</th>').join("")+'</tr></thead><tbody>'+s.rows.map((row,ri)=>'<tr>'+s.columns.map((_,ci)=>'<td>'+editor(row[ci]||"",si,ri,ci)+'</td>').join("")+'</tr>').join("")+'</tbody></table></div></section>';
    }).join("");
    return '<div class="tap-editor-root"><div class="tap-editor-toolbar"><div><b>TAP · '+cesc(c.name)+'</b><span>Digite diretamente nos campos. Cronograma e mensagens usam o editor completo.</span></div><div><span class="tap-save-state" data-tap-save-state>Salvo</span><button class="cw-edit-btn" type="button" id="addTapSection">+ seção</button></div></div>'+sections+'</div>';
  }`;

    const bindTapV6=String.raw`
  function bindTapEditing(c){
    const state=()=>document.querySelector("[data-tap-save-state]");
    let timer=0;
    const saved=()=>{
      const el=state();if(el)el.textContent="Salvando…";
      clearTimeout(timer);
      timer=setTimeout(()=>{persistCampaignDraft(c);const x=state();if(x)x.textContent="Salvo agora";},180);
    };
    document.querySelectorAll("[data-tap-input]").forEach(el=>{
      const apply=()=>{
        const parts=String(el.dataset.tapInput||"").split(":").map(Number);
        const sec=getTap(c)[parts[0]],row=sec?.rows?.[parts[1]];
        if(!row)return;
        row[parts[2]]=el.value;
        const label=String(row[0]||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
        if(parts[2]===1&&label==="objetivo")c.objective=el.value;
        if(parts[2]===1&&label.includes("oferta principal"))c.offer=el.value;
        saved();
      };
      el.addEventListener("input",apply);
      el.addEventListener("change",apply);
    });
    document.querySelectorAll("[data-tap-title-input]").forEach(el=>el.addEventListener("input",()=>{
      const sec=getTap(c)[Number(el.dataset.tapTitleInput)];
      if(sec){sec.title=el.value||sec.title;saved()}
    }));
    document.querySelectorAll("[data-add-tap-row]").forEach(b=>b.addEventListener("click",()=>{
      const si=Number(b.dataset.addTapRow),sec=getTap(c)[si];
      if(!sec)return;
      if(tapSectionIsSchedule(sec)){openScheduleMessageModal(c);return}
      sec.rows.push(sec.columns.map(()=>""));
      persistCampaignDraft(c);renderWorkspace();
    }));
    document.querySelectorAll("[data-tap-schedule-edit]").forEach(b=>b.addEventListener("click",()=>openScheduleMessageModal(c,b.dataset.tapScheduleEdit||"")));
    document.querySelectorAll("[data-tap-add-schedule]").forEach(b=>b.addEventListener("click",()=>openScheduleMessageModal(c)));
    const add=document.getElementById("addTapSection");
    if(add)add.addEventListener("click",()=>{
      getTap(c).push({title:"Nova seção",columns:["Campo","Valor"],rows:[["",""]]});
      persistCampaignDraft(c);renderWorkspace();
    });
  }`;

    replaceRuntimeBlock('  function renderSchedule(c){','  function renderTap(c)',scheduleV6,'Cronograma');
    replaceRuntimeBlock('  function renderTap(c){','  function renderCampaignTasks(c)',tapV6,'TAP');
    replaceRuntimeBlock('  function bindTapEditing(c){','  function openCampaignModal',bindTapV6,'edição do TAP');

    const oldBind='bindTapEditing(c);bindCampaignTaskLinks(c)';
    if(!html.includes(oldBind))throw new Error('Não encontrei o vínculo do editor no workspace');
    html=html.replace(oldBind,'bindTapEditing(c);bindScheduleEditing(c);bindCampaignTaskLinks(c)');
  }

  // Name-based links (week/month cards) must resolve inside the selected-month
  // collection, otherwise a repeated campaign name can open last month's item.
  const oldOpenCampaignByName = "  window.openCampaignWorkspaceByName=(name)=>{showCampaigns();const c=campaignData.find(x=>normalizeProject(x.name)===normalizeProject(name));if(c)openCampaignWorkspace(c.id)};";
  const newOpenCampaignByName = "  window.openCampaignWorkspaceById=(id)=>{\n    try{const live=JSON.parse(localStorage.getItem(campaignStorageKey)||'[]');if(Array.isArray(live))campaignData=live}catch{}\n    const c=campaignData.find(x=>String(x.id)===String(id)&&!x.archivedAt);\n    if(!c)return false;\n    if(!document.getElementById('campaignsView')?.classList.contains('active'))showCampaigns();\n    openCampaignWorkspace(c.id);\n    return true;\n  };\n  window.openCampaignWorkspaceByName=(name)=>{\n    const c=filteredCampaigns().find(x=>normalizeProject(x.name)===normalizeProject(name));\n    return c?window.openCampaignWorkspaceById(c.id):false;\n  };";
  if (html.includes(oldOpenCampaignByName)) html = html.replace(oldOpenCampaignByName,newOpenCampaignByName);
  else console.warn("[AllianceOS build] openCampaignWorkspaceByName not found for selected-month scope");

  // Month navigation safety: opening the Campaigns directory must never resurrect
  // the workspace selected in a previous month. This changes only UI state;
  // campaign/TAP data remains untouched.
  if (html.includes("  function showCampaigns(){")) {
    html = html.replace(
      "  function showCampaigns(){",
      "  function showCampaigns(){campaignState.selected=null;campaignState.workspaceTab='summary';document.getElementById('campaignOverviewList')?.classList.remove('hidden');document.getElementById('campaignWorkspace')?.classList.remove('active');"
    );
  } else {
    console.warn("[AllianceOS build] showCampaigns not found for month-state reset");
  }

  // PLANNING_KPI_GOALS_CANONICAL_V1 — the legacy planning renderer can repaint
  // the KPI strip after the canonical layer. Make both renderers agree so Meta
  // 01/02/03 never disappear and the active goal remains visually marked.
  {
    const start=html.indexOf("  function renderContext(){");
    const end=start>=0?html.indexOf("\n  function visibleNodes()",start):-1;
    if(start>=0&&end>start){
      const fn=String.raw`  function renderContext(){
    const realNow=new Date();realNow.setHours(0,0,0,0);
    let ref=String(window.AlliancePlanningMonthRef||'');
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(ref)){try{ref=sessionStorage.getItem('allianceos.planning.monthRef')||localStorage.getItem('allianceos.planning.monthRef')||''}catch{}}
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(ref))ref=realNow.getFullYear()+'-'+String(realNow.getMonth()+1).padStart(2,'0');
    const [yy,mm]=ref.split('-').map(Number),first=new Date(yy,mm-1,1),last=new Date(yy,mm,0);
    let now=(realNow.getFullYear()===yy&&realNow.getMonth()===mm-1)?new Date(realNow):new Date(yy,mm-1,1);
    const cs=filteredCampaigns().filter(c=>{
      if(c?.archivedAt)return false;
      const s=c.start?new Date(c.start+'T00:00:00'):null,e=c.end?new Date(c.end+'T00:00:00'):s;
      return !s||!e||(s<=last&&e>=first);
    });
    const ts=filteredTasks().filter(t=>!t?.archivedAt);
    const perp=cs.filter(c=>String(c.type||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes('perpet'));
    const channelGoal=perp.reduce((a,c)=>{
      const rows=Array.isArray(c?.tapStructured?.metas_por_fonte)?c.tapStructured.metas_por_fonte:[];
      const n=rows.reduce((s,x)=>s+(+x.meta_faturamento||0),0);
      return a+(n||(+c.goal||0));
    },0);
    const brandNow=String(selectedBrand()||'').trim();
    const brandNorm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    let metrics=window.AlliancePlanningMonthMetrics;
    const metricsOk=m=>!!m&&String(m.ref||'')===ref&&(!brandNow||/todas/i.test(brandNow)||!m.brand||brandNorm(m.brand)===brandNorm(brandNow));
    if(!metricsOk(metrics)){
      metrics=null;
      try{
        const keys=Object.keys(localStorage).filter(k=>k.startsWith('allianceos.planning.metrics.')&&k.endsWith('.'+ref));
        for(const key of keys){
          const x=JSON.parse(localStorage.getItem(key)||'null');
          if(metricsOk(x)){metrics=x;break}
        }
      }catch{}
    }
    const active=Math.max(1,Math.min(3,Number(metrics?.active||1)));
    const meta=(level,fallback=0)=>{
      if(!metrics)return Number(fallback||0);
      const direct=Number(metrics['meta'+level]||0);
      if(direct>0)return direct;
      const overall=Number(metrics['overall'+level]||0);
      if(overall>0)return overall;
      const arr=Array.isArray(metrics.metas)?Number(metrics.metas[level-1]||0):0;
      if(arr>0)return arr;
      if(active===level&&Number(metrics.goal||0)>0)return Number(metrics.goal||0);
      return Number(fallback||0);
    };
    const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
    const metaCard=(level,value)=>'<div class="plan-kpi plan-kpi-goal '+(active===level?'active-goal':'')+'"><small>Meta 0'+level+'</small><b>'+(value>0?money(value):'—')+'</b><span>'+(active===level?'meta ativa do mês':'escada de meta mensal')+'</span></div>';
    const open=ts.filter(t=>t.status!=='feito').length,done=ts.filter(t=>t.status==='feito').length,total=ts.length,pct=total?Math.round(done/total*100):0;
    const monday=new Date(now),wd=now.getDay();monday.setDate(now.getDate()+(wd===0?-6:1-wd));
    const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);
    document.getElementById('planContext').innerHTML=
      '<div class="plan-kpi"><small>Campanhas no mês</small><b>'+cs.length+'</b><span>'+perp.length+' perpétuas · '+(cs.length-perp.length)+' pontuais</span></div>'+
      metaCard(1,meta(1,channelGoal))+metaCard(2,meta(2,0))+metaCard(3,meta(3,0))+
      '<div class="plan-kpi"><small>Tarefas abertas</small><b>'+open+'</b><span>'+pct+'% concluídas</span></div>'+
      '<div class="plan-kpi"><small>Semana atual</small><b>'+String(monday.getDate()).padStart(2,'0')+' — '+String(sunday.getDate()).padStart(2,'0')+'</b><span>'+sunday.toLocaleDateString('pt-BR',{month:'long'})+' de '+sunday.getFullYear()+'</span></div>';
    [...document.querySelectorAll('body *')].forEach(el=>{
      if(el.children.length===0&&/As campanhas somam/i.test(el.textContent||'')&&/meta ativa/i.test(el.textContent||'')){
        const box=el.closest('div');if(box)box.remove();
      }
    });
  }
  window.addEventListener('allianceos:planning-metrics',()=>{try{renderContext()}catch{}});
`;
      html=html.slice(0,start)+fn+html.slice(end);
      console.log('[AllianceOS build] legacy planning KPI renderer aligned to Meta 01/02/03');
    }else{
      console.warn('[AllianceOS build] legacy renderContext not found for monthly-goal alignment');
    }
  }

  html = html.replace('<html lang="pt-BR">','<html lang="pt-BR" class="alliance-auth-pending">');
  const mobileViewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  if (/<meta\s+name=["']viewport["'][^>]*>/i.test(html)) html = html.replace(/<meta\s+name=["']viewport["'][^>]*>/i, mobileViewportMeta);
  else html = html.replace('<head>', '<head>\n' + mobileViewportMeta);
  const sync = fs.readFileSync(PUBLIC_SYNC, 'utf8');
  const socialHead = "<meta name=\"description\" content=\"Campanhas, tarefas, entregas e gestão das marcas da Alliance em um só lugar.\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:site_name\" content=\"AllianceOS\">\n<meta property=\"og:title\" content=\"AllianceOS — Operação em um só lugar\">\n<meta property=\"og:description\" content=\"Campanhas, tarefas, entregas e gestão das marcas da Alliance em um só lugar.\">\n<meta property=\"og:url\" content=\"https://alliance-os-sooty.vercel.app/\">\n<meta property=\"og:image\" content=\"https://alliance-os-sooty.vercel.app/allianceos-whatsapp-preview-v6.jpg?v=20260922-6\">\n<meta property=\"og:image:secure_url\" content=\"https://alliance-os-sooty.vercel.app/allianceos-whatsapp-preview-v6.jpg?v=20260922-6\">\n<meta property=\"og:image:type\" content=\"image/jpeg\">\n<meta property=\"og:image:width\" content=\"1200\">\n<meta property=\"og:image:height\" content=\"630\">\n<meta property=\"og:image:alt\" content=\"AllianceOS — Operação em um só lugar\">\n<meta name=\"twitter:card\" content=\"summary_large_image\">\n<meta name=\"twitter:title\" content=\"AllianceOS — Operação em um só lugar\">\n<meta name=\"twitter:description\" content=\"Campanhas, tarefas, entregas e gestão das marcas da Alliance em um só lugar.\">\n<meta name=\"twitter:image\" content=\"https://alliance-os-sooty.vercel.app/allianceos-whatsapp-preview-v6.jpg?v=20260922-6\">\n";
  const brandHead = "<link rel=\"icon\" type=\"image/svg+xml\" href=\"/api/brand-icon?format=svg&v=20260922-4\">\n<link rel=\"icon\" type=\"image/png\" sizes=\"512x512\" href=\"/api/brand-icon?v=20260922-4\">\n<link rel=\"shortcut icon\" href=\"/api/brand-icon?format=svg&v=20260922-4\">\n<link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/apple-touch-icon-allianceos-180.png\">\n<link rel=\"apple-touch-icon-precomposed\" sizes=\"180x180\" href=\"/apple-touch-icon-allianceos-180.png\">\n<link rel=\"manifest\" href=\"/manifest.webmanifest?v=20260922-4\">\n<meta name=\"application-name\" content=\"AllianceOS\">\n<meta name=\"apple-mobile-web-app-title\" content=\"AllianceOS\">\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\">\n<meta name=\"theme-color\" content=\"#0b1014\">\n<meta name=\"msapplication-TileColor\" content=\"#0b1014\">\n<meta name=\"msapplication-TileImage\" content=\"/api/brand-icon?v=20260922-4\">\n";
  html = html.replace(/<title>[^<]*<\/title>/i, '<title>AllianceOS — Operação em um só lugar</title>');
  html = html.replace('<head>', () => `<head>\n${socialHead}<script id="alliance-mobile-runtime-js">\n${mobileRuntimeJs}\n</script>\n`);
  html = html.replace('</head>', () => `${brandHead}<style id="alliance-auth-style">\n${authGateCss}\n</style>\n<style id="alliance-onboarding-style">\n${onboardingCss}\n</style>\n<style id="alliance-context-guide-style">\n${contextGuideCss}\n</style>\n<style id="alliance-navigation-reference">\n${navReferenceCss}\n</style>\n<style id="alliance-admin-style">\n${allianceAdminCss}\n</style>\n<style id="alliance-mobile-runtime-css">\n${mobileRuntimeCss}\n</style>\n<style id="alliance-management-dashboard-css">\n${managementDashboardCss}\n</style>\n<style id="alliance-campaign-planning-truth-css">\n${campaignPlanningTruthCss}\n</style>\n<style id="alliance-campaign-creation-wizard-css">\n${campaignCreationWizardCss}\n</style>\n<style id="alliance-delivery-drive-css">\n${deliveryDriveCss}\n</style>\n<style id="alliance-agent-sidekick-css">\n${agentSidekickCss}\n</style>\n<style id="alliance-access-center-css">\n${accessCenterCss}\n</style>\n<style id="alliance-traffic-creative-lab-css">\n${trafficCreativeLabCss}\n</style>\n<style id="alliance-creators-management-css">\n${creatorsManagementCss}\n</style>\n<script id="alliance-onboarding">\n${onboardingJs}\n</script>\n<script id="alliance-auth-gate">\n${authGateJs}\n</script>\n<script>\n${sync}\n</script>\n</head>`);
  html = html.replace('</body>', () => `<script id="alliance-navigation-reference-js">\n${navReferenceJs}\n</script>\n<script id="alliance-admin-js">\n${allianceAdminJs}\n</script>\n<script id="alliance-full-system-ui">\n${fullSystemUi}\n</script>\n<script id="alliance-context-guide">\n${contextGuideJs}\n</script>\n<script id="alliance-home-live-sync">\n${homeLiveSync}\n</script>\n<script id="alliance-management-dashboard">\n${managementDashboardJs}\n</script>\n<script id="alliance-campaign-planning-truth">\n${campaignPlanningTruthJs}\n</script>\n<script id="alliance-campaign-creation-wizard">\n${campaignCreationWizardJs}\n</script>\n<script id="alliance-delivery-drive-js">\n${deliveryDriveJs}\n</script>\n<script id="alliance-agent-sidekick-js">\n${agentSidekickJs}\n</script>\n<script id="alliance-access-center-js">\n${accessCenterJs}\n</script>\n<script id="alliance-traffic-creative-lab-js">\n${trafficCreativeLabJs}\n</script>\n<script id="alliance-organization-center-js">\n${organizationCenterJs}\n</script>\n<script id="alliance-creators-management-js">\n${creatorsManagementJs}\n</script>\n<script id="alliance-campaign-directory-hardfix">\n${campaignDirectoryHardfixJs}\n</script>\n</body>`);

  const out = path.join(__dirname, 'dist');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  fs.mkdirSync(path.join(out, 'parceiros'), { recursive: true });
  fs.copyFileSync(CREATOR_PUBLIC_FORM_HTML, path.join(out, 'parceiros', 'cadastro.html'));
  fs.copyFileSync(SOCIAL_PREVIEW_IMAGE, path.join(out, 'allianceos-whatsapp-preview-v6.jpg'));
  const appleTouchIcon = Buffer.from(APPLE_TOUCH_ICON_B64, 'base64');
  fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), appleTouchIcon);
  fs.writeFileSync(path.join(out, 'apple-touch-icon-precomposed.png'), appleTouchIcon);
  fs.writeFileSync(path.join(out, 'apple-touch-icon-allianceos-180.png'), appleTouchIcon);
  console.log('AllianceOS pronto em dist/index.html (autenticação obrigatória + usuários reais + Supabase/RLS)');
}

main().catch((e) => { console.error(e); process.exit(1); });

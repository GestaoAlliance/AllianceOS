import { BOTANIKA_BRAND_ID, markIntegration, sb } from './_lib/datahub.mjs';

const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v22.0';
const GRAPH = `https://graph.instagram.com/${GRAPH_VERSION}`;

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).send(JSON.stringify(body));
}

function authorized(req) {
  const secret = process.env.CRON_SECRET || '';
  return !!secret && req.headers.authorization === `Bearer ${secret}`;
}

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { error: { message: text } }; }
  if (!r.ok || body?.error) throw new Error(`Instagram ${r.status}: ${body?.error?.message || 'erro desconhecido'}`);
  return body;
}

function mondayUTC(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - dow + 1);
  return d;
}

async function insights(token, sinceDate, untilDate) {
  const metrics = 'views,reach,profile_views,accounts_engaged,total_interactions,website_clicks';
  const since = Math.floor(sinceDate.getTime() / 1000);
  const until = Math.floor(untilDate.getTime() / 1000);
  const url = `${GRAPH}/me/insights?metric=${encodeURIComponent(metrics)}&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${encodeURIComponent(token)}`;
  const data = await getJson(url);
  const out = {};
  for (const item of Array.isArray(data.data) ? data.data : []) {
    out[item.name] = Number(item?.total_value?.value || 0);
  }
  return out;
}

async function sync() {
  const token = process.env.INSTAGRAM_BOTANIKA_ACCESS_TOKEN || '';
  if (!token) throw new Error('INSTAGRAM_BOTANIKA_ACCESS_TOKEN não configurado');

  const basic = await getJson(`${GRAPH}/me?fields=followers_count,media_count,username&access_token=${encodeURIComponent(token)}`);
  const now = new Date();
  const thisMonday = mondayUTC(now);
  const nextDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const previousMonday = new Date(thisMonday);
  previousMonday.setUTCDate(previousMonday.getUTCDate() - 7);

  const current = await insights(token, thisMonday, nextDay);
  const previous = await insights(token, previousMonday, thisMonday);
  const capturedAt = new Date().toISOString();

  await sb('/rest/v1/instagram_snapshots?on_conflict=brand_id,captured_at', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      brand_id: BOTANIKA_BRAND_ID,
      captured_at: capturedAt,
      followers: Number(basic.followers_count || 0),
      reach: Number(current.reach || 0),
      views: Number(current.views || 0),
      interactions: Number(current.total_interactions || 0),
      website_clicks: Number(current.website_clicks || 0),
      raw_resumo: {
        username: basic.username || null,
        media_count: Number(basic.media_count || 0),
        profile_views: Number(current.profile_views || 0),
        accounts_engaged: Number(current.accounts_engaged || 0),
        week_start: thisMonday.toISOString().slice(0, 10),
        previous_week_start: previousMonday.toISOString().slice(0, 10),
        previous,
      },
    },
  });

  await markIntegration('instagram', {
    status: 'ok', last_success_at: capturedAt, last_error: null,
    meta: { followers: Number(basic.followers_count || 0), week_start: thisMonday.toISOString().slice(0, 10) },
  });

  return {
    ok: true,
    followers: Number(basic.followers_count || 0),
    reach: Number(current.reach || 0),
    views: Number(current.views || 0),
    interactions: Number(current.total_interactions || 0),
    week_start: thisMonday.toISOString().slice(0, 10),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return send(res, 405, { erro: 'método não permitido' });
  if (!authorized(req)) return send(res, 401, { erro: 'não autorizado' });
  try {
    return send(res, 200, await sync());
  } catch (e) {
    console.error('[instagram-botanika-sync]', e);
    try { await markIntegration('instagram', { status: 'erro', last_error: String(e.message || e).slice(0, 500) }); } catch {}
    return send(res, 500, { erro: 'falha ao sincronizar Instagram' });
  }
}

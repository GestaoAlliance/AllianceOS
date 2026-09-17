import { BOTANIKA_BRAND_ID, markIntegration, sb } from './_lib/datahub.mjs';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v25.0';
const AD_ACCOUNT = process.env.META_BOTANIKA_AD_ACCOUNT || 'act_1164715034920965';

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).send(JSON.stringify(body));
}

function authorized(req) {
  const secret = process.env.CRON_SECRET || '';
  return !!secret && req.headers.authorization === `Bearer ${secret}`;
}

function action(items, ...names) {
  if (!Array.isArray(items)) return 0;
  for (const name of names) {
    const hit = items.find(x => x?.action_type === name);
    if (hit) return Number(hit.value || 0);
  }
  return 0;
}

async function allPages(url) {
  const out = [];
  let next = url;
  for (let i = 0; next && i < 40; i++) {
    const r = await fetch(next, { cache: 'no-store' });
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { error: { message: text } }; }
    if (!r.ok || body?.error) throw new Error(`Meta ${r.status}: ${body?.error?.message || 'erro desconhecido'}`);
    if (Array.isArray(body.data)) out.push(...body.data);
    next = body?.paging?.next || null;
  }
  return out;
}

function funnel(i) {
  return {
    impressions: Number(i.impressions || 0),
    clicks: Number(i.clicks || 0),
    inline_link_clicks: Number(i.inline_link_clicks || 0),
    lp_views: action(i.actions, 'landing_page_view'),
    checkouts: action(i.actions, 'omni_initiated_checkout', 'initiate_checkout'),
    reach: Number(i.reach || 0),
    cpm: Number(i.cpm || 0),
    frequency: Number(i.frequency || 0),
  };
}

function conversion(objective, i) {
  switch (String(objective || '').toUpperCase()) {
    case 'OUTCOME_SALES':
      return { conversions: action(i.actions, 'omni_purchase', 'purchase'), revenue: action(i.action_values, 'omni_purchase', 'purchase') };
    case 'OUTCOME_LEADS':
      return { conversions: action(i.actions, 'lead'), revenue: 0 };
    case 'OUTCOME_ENGAGEMENT':
      return { conversions: action(i.actions, 'onsite_conversion.messaging_conversation_started_7d'), revenue: 0 };
    case 'OUTCOME_TRAFFIC':
      return { conversions: Number(i.clicks || 0), revenue: 0 };
    case 'OUTCOME_AWARENESS':
      return { conversions: Number(i.reach || 0), revenue: 0 };
    default:
      return { conversions: 0, revenue: 0 };
  }
}

async function upsert(table, rows, conflict) {
  if (!rows.length) return;
  await sb(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: rows,
  });
}

async function sync() {
  const token = process.env.META_BOTANIKA_ACCESS_TOKEN || '';
  if (!token) throw new Error('META_BOTANIKA_ACCESS_TOKEN não configurado');
  const graph = `https://graph.facebook.com/${GRAPH_VERSION}`;
  const today = new Date();
  const sinceDate = new Date(today);
  sinceDate.setUTCDate(sinceDate.getUTCDate() - 30);
  const since = sinceDate.toISOString().slice(0, 10);
  const until = today.toISOString().slice(0, 10);
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));

  const campaigns = await allPages(`${graph}/${AD_ACCOUNT}/campaigns?fields=name,objective,status&limit=200&access_token=${encodeURIComponent(token)}`);
  const campaignMeta = new Map(campaigns.map(c => [c.id, c]));

  const common = 'spend,actions,action_values,reach,clicks,cpm,frequency,impressions,inline_link_clicks';
  const campaignInsights = await allPages(`${graph}/${AD_ACCOUNT}/insights?level=campaign&time_increment=1&time_range=${timeRange}&fields=campaign_id,campaign_name,${common}&limit=500&access_token=${encodeURIComponent(token)}`);
  const campaignRows = campaignInsights.filter(i => i.campaign_id && i.date_start).map(i => {
    const c = campaignMeta.get(i.campaign_id) || {};
    return {
      brand_id: BOTANIKA_BRAND_ID, ad_account: AD_ACCOUNT, campaign_id: i.campaign_id,
      campaign_name: i.campaign_name || c.name || null, objective: c.objective || null, status: c.status || null,
      dia: i.date_start, spend: Number(i.spend || 0), ...conversion(c.objective, i), ...funnel(i), updated_at: new Date().toISOString(),
    };
  });
  await upsert('meta_campaign_insights_daily', campaignRows, 'brand_id,ad_account,campaign_id,dia');

  const adsets = await allPages(`${graph}/${AD_ACCOUNT}/adsets?fields=name,campaign_id&limit=500&access_token=${encodeURIComponent(token)}`);
  const adsetMeta = new Map(adsets.map(a => [a.id, a]));
  const adsetInsights = await allPages(`${graph}/${AD_ACCOUNT}/insights?level=adset&time_increment=1&time_range=${timeRange}&fields=adset_id,adset_name,campaign_id,${common}&limit=500&access_token=${encodeURIComponent(token)}`);
  const adsetRows = adsetInsights.filter(i => i.adset_id && i.date_start).map(i => {
    const s = adsetMeta.get(i.adset_id) || {};
    const campaignId = i.campaign_id || s.campaign_id || null;
    const c = campaignMeta.get(campaignId) || {};
    return {
      brand_id: BOTANIKA_BRAND_ID, ad_account: AD_ACCOUNT, adset_id: i.adset_id,
      adset_name: i.adset_name || s.name || null, campaign_id: campaignId, dia: i.date_start,
      spend: Number(i.spend || 0), ...conversion(c.objective, i), ...funnel(i), updated_at: new Date().toISOString(),
    };
  });
  await upsert('meta_adset_insights_daily', adsetRows, 'brand_id,ad_account,adset_id,dia');

  const ads = await allPages(`${graph}/${AD_ACCOUNT}/ads?fields=name,creative{thumbnail_url}&limit=500&access_token=${encodeURIComponent(token)}`);
  const adMeta = new Map(ads.map(a => [a.id, a]));
  const adInsights = await allPages(`${graph}/${AD_ACCOUNT}/insights?level=ad&time_increment=1&time_range=${timeRange}&fields=ad_id,ad_name,campaign_id,adset_id,adset_name,${common}&limit=500&access_token=${encodeURIComponent(token)}`);
  const adRows = adInsights.filter(i => i.ad_id && i.date_start).map(i => {
    const a = adMeta.get(i.ad_id) || {};
    const c = campaignMeta.get(i.campaign_id) || {};
    return {
      brand_id: BOTANIKA_BRAND_ID, ad_account: AD_ACCOUNT, ad_id: i.ad_id,
      ad_name: i.ad_name || a.name || null, campaign_id: i.campaign_id || null, adset_id: i.adset_id || null,
      adset_name: i.adset_name || null, thumbnail_url: a.creative?.thumbnail_url || null, dia: i.date_start,
      spend: Number(i.spend || 0), ...conversion(c.objective, i), ...funnel(i), updated_at: new Date().toISOString(),
    };
  });
  await upsert('meta_ad_insights_daily', adRows, 'brand_id,ad_account,ad_id,dia');

  await markIntegration('meta_ads', {
    status: 'ok', last_success_at: new Date().toISOString(), last_error: null,
    meta: { since, until, campaigns: campaignRows.length, adsets: adsetRows.length, ads: adRows.length },
  });
  return { ok: true, since, until, campaigns: campaignRows.length, adsets: adsetRows.length, ads: adRows.length };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return send(res, 405, { erro: 'método não permitido' });
  if (!authorized(req)) return send(res, 401, { erro: 'não autorizado' });
  try {
    return send(res, 200, await sync());
  } catch (e) {
    console.error('[meta-botanika-sync]', e);
    try { await markIntegration('meta_ads', { status: 'erro', last_error: String(e.message || e).slice(0, 500) }); } catch {}
    return send(res, 500, { erro: 'falha ao sincronizar Meta Ads' });
  }
}

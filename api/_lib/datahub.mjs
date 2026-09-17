import { createHash } from 'node:crypto';

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lpnyrzsdiyzjnhovpduk.supabase.co';
export const BOTANIKA_BRAND_ID = process.env.BOTANIKA_BRAND_ID || '91a66f9e-6dc8-40c8-b7ca-33b8b39676f4';

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  return key;
}

export async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const key = serviceKey();
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const msg = typeof data === 'object' && data ? (data.message || data.error || data.hint) : text;
    throw Object.assign(new Error(`Supabase ${r.status}: ${String(msg || '').slice(0, 240)}`), { status: r.status });
  }
  return data;
}

export async function markIntegration(source, patch = {}) {
  const row = {
    brand_id: BOTANIKA_BRAND_ID,
    source,
    status: patch.status || 'ok',
    last_sync_at: new Date().toISOString(),
    ...(patch.last_success_at ? { last_success_at: patch.last_success_at } : {}),
    ...(patch.last_error !== undefined ? { last_error: patch.last_error } : {}),
    ...(patch.meta !== undefined ? { meta: patch.meta } : {}),
  };
  return sb('/rest/v1/integration_sources?on_conflict=brand_id,source', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: row,
  });
}

export function hashCustomer(value) {
  const v = String(value || '').trim().toLowerCase();
  return v ? createHash('sha256').update(v).digest('hex') : null;
}

function fromNoteAttributes(attrs) {
  if (!Array.isArray(attrs)) return {};
  const out = {};
  for (const item of attrs) {
    const k = String(item?.name || '').trim().toLowerCase();
    if (!['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].includes(k)) continue;
    const v = String(item?.value || '').trim();
    if (v) out[k] = v;
  }
  return out;
}

function fromUrl(url) {
  if (!url) return {};
  try {
    const u = new URL(String(url), 'https://botanika.life');
    const out = {};
    for (const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {
      const v = u.searchParams.get(k);
      if (v) out[k] = v;
    }
    return out;
  } catch { return {}; }
}

export function extractUtms(payload) {
  const a = fromNoteAttributes(payload?.note_attributes);
  const b = fromUrl(payload?.landing_site);
  const hasA = Object.keys(a).length > 0;
  const hasB = Object.keys(b).length > 0;
  return { ...(hasA ? a : b), utm_fonte: hasA ? 'note_attributes' : (hasB ? 'landing_site' : null) };
}

export function sourceCategory(utmSource, utmMedium, utmCampaign, referringSite) {
  const s = `${utmSource || ''} ${utmMedium || ''} ${utmCampaign || ''} ${referringSite || ''}`.toLowerCase();
  if (/facebook|instagram|meta|fb|ig/.test(s)) return 'Meta';
  if (/google|gads|adwords/.test(s)) return 'Google';
  if (/influ|creator|cupom|afili/.test(s)) return 'Influenciador';
  if (/email|activecampaign|klaviyo/.test(s)) return 'Email';
  if (/whatsapp|wpp|sendflow|wa_api/.test(s)) return 'WhatsApp';
  if (/direct|direto/.test(s)) return 'Direto';
  return s.trim() ? 'Outros' : 'Direto';
}

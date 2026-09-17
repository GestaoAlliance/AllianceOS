import { createHmac, timingSafeEqual } from 'node:crypto';
import { BOTANIKA_BRAND_ID, extractUtms, hashCustomer, markIntegration, sb, sourceCategory } from './_lib/datahub.mjs';

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).send(JSON.stringify(body));
}

function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  return JSON.stringify(req.body || {});
}

function validHmac(raw, received) {
  const secret = process.env.SHOPIFY_BOTANIKA_WEBHOOK_SECRET || '';
  if (!secret || !received) return false;
  const expected = createHmac('sha256', secret).update(raw, 'utf8').digest('base64');
  const a = Buffer.from(String(received));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function refundTotal(refunds) {
  if (!Array.isArray(refunds)) return 0;
  return refunds.flatMap(r => Array.isArray(r?.transactions) ? r.transactions : [])
    .reduce((sum, t) => sum + Number(t?.amount || 0), 0);
}

async function upsertOrder(p) {
  const utm = extractUtms(p);
  const gateways = Array.isArray(p.payment_gateway_names) ? p.payment_gateway_names.filter(Boolean) : [];
  const discount = Array.isArray(p.discount_codes) && p.discount_codes[0] ? p.discount_codes[0].code : null;
  const order = {
    brand_id: BOTANIKA_BRAND_ID,
    shopify_order_id: String(p.id),
    numero: p.name || null,
    financial_status: p.financial_status || null,
    fulfillment_status: p.fulfillment_status || null,
    total: Number(p.total_price || 0),
    subtotal: Number(p.subtotal_price || 0),
    total_discounts: Number(p.total_discounts || 0),
    refunded_amount: refundTotal(p.refunds),
    currency: p.currency || 'BRL',
    criado_em: p.created_at || null,
    atualizado_em_shopify: p.updated_at || null,
    payment_method: gateways.join(',') || null,
    discount_code: discount || null,
    cliente_hash: hashCustomer(p.email || p.customer?.email || p.customer?.id),
    utm_source: utm.utm_source || null,
    utm_medium: utm.utm_medium || null,
    utm_campaign: utm.utm_campaign || null,
    utm_content: utm.utm_content || null,
    utm_term: utm.utm_term || null,
    utm_fonte: utm.utm_fonte || null,
    source_category: sourceCategory(utm.utm_source, utm.utm_medium, utm.utm_campaign, p.referring_site),
    raw_resumo: {
      source_name: p.source_name || null,
      referring_site: p.referring_site || null,
      landing_site: p.landing_site || null,
      tags: p.tags || null,
      test: !!p.test,
    },
  };

  await sb('/rest/v1/shopify_orders?on_conflict=brand_id,shopify_order_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: order,
  });

  await sb(`/rest/v1/shopify_order_items?brand_id=eq.${encodeURIComponent(BOTANIKA_BRAND_ID)}&shopify_order_id=eq.${encodeURIComponent(String(p.id))}`, { method: 'DELETE' });
  const items = (Array.isArray(p.line_items) ? p.line_items : []).map(li => ({
    brand_id: BOTANIKA_BRAND_ID,
    shopify_order_id: String(p.id),
    line_item_id: String(li.id),
    product_id: li.product_id ? String(li.product_id) : null,
    variant_id: li.variant_id ? String(li.variant_id) : null,
    inventory_item_id: li.inventory_item_id ? String(li.inventory_item_id) : null,
    sku: li.sku || null,
    nome_produto: li.title || li.name || null,
    variant_title: li.variant_title || null,
    quantidade: Number(li.quantity || 0),
    preco: Number(li.price || 0),
  }));
  if (items.length) await sb('/rest/v1/shopify_order_items', { method: 'POST', body: items, headers: { Prefer: 'return=minimal' } });
}

async function upsertInventory(p) {
  const inventoryItemId = p.inventory_item_id ?? p.inventoryItemId;
  const locationId = p.location_id ?? p.locationId;
  const available = p.available;
  if (inventoryItemId == null || locationId == null || available == null) return;
  await sb('/rest/v1/shopify_inventory?on_conflict=brand_id,inventory_item_id,location_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      brand_id: BOTANIKA_BRAND_ID,
      inventory_item_id: String(inventoryItemId),
      location_id: String(locationId),
      available: Number(available),
      atualizado_em_shopify: p.updated_at || new Date().toISOString(),
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { erro: 'método não permitido' });
  const raw = rawBody(req);
  if (!validHmac(raw, req.headers['x-shopify-hmac-sha256'])) return send(res, 401, { erro: 'assinatura inválida' });
  const topic = String(req.headers['x-shopify-topic'] || '').toLowerCase();
  let payload;
  try { payload = JSON.parse(raw); } catch { return send(res, 400, { erro: 'json inválido' }); }

  try {
    if (topic.startsWith('orders/')) await upsertOrder(payload);
    else if (topic === 'inventory_levels/update') await upsertInventory(payload);
    else return send(res, 200, { ok: true, ignorado: topic || 'sem tópico' });

    await markIntegration('shopify', { status: 'ok', last_success_at: new Date().toISOString(), last_error: null, meta: { ultimo_topico: topic } });
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('[shopify-botanika-webhook]', e);
    try { await markIntegration('shopify', { status: 'erro', last_error: String(e.message || e).slice(0, 500), meta: { ultimo_topico: topic } }); } catch {}
    return send(res, 500, { erro: 'falha ao processar webhook' });
  }
}

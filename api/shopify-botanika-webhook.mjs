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

function qstr(v) {
  return encodeURIComponent(String(v));
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
  const shipping = Array.isArray(p.shipping_lines) ? (p.shipping_lines.find(x => !x?.removed) || p.shipping_lines[0] || {}) : {};
  const address = p.shipping_address || {};
  const order = {
    brand_id: BOTANIKA_BRAND_ID,
    shopify_order_id: String(p.id),
    numero: p.name || null,
    financial_status: p.financial_status || null,
    fulfillment_status: p.fulfillment_status || null,
    return_status: p.return_status || null,
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
    shipping_title: shipping.title || null,
    shipping_code: shipping.code || null,
    shipping_source: shipping.source || null,
    shipping_carrier_identifier: shipping.carrier_identifier || null,
    shipping_delivery_category: shipping.delivery_category || null,
    shipping_price: Number(shipping.price || 0),
    shipping_discounted_price: Number(shipping.discounted_price || shipping.price || 0),
    shipping_city: address.city || null,
    shipping_province: address.province || null,
    shipping_province_code: address.province_code || null,
    shipping_country: address.country || null,
    shipping_country_code: address.country_code || null,
    shipping_zip: address.zip || null,
    raw_resumo: {
      source_name: p.source_name || null,
      referring_site: p.referring_site || null,
      landing_site: p.landing_site || null,
      tags: p.tags || null,
      test: !!p.test,
    },
    updated_at: new Date().toISOString(),
  };

  await sb('/rest/v1/shopify_orders?on_conflict=brand_id,shopify_order_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: order,
  });

  await sb(`/rest/v1/shopify_order_items?brand_id=eq.${qstr(BOTANIKA_BRAND_ID)}&shopify_order_id=eq.${qstr(String(p.id))}`, { method: 'DELETE' });
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
      updated_at: new Date().toISOString(),
    },
  });
}

function webhookTracking(p) {
  const numbers = Array.isArray(p.tracking_numbers) ? p.tracking_numbers : (p.tracking_number ? [p.tracking_number] : []);
  const urls = Array.isArray(p.tracking_urls) ? p.tracking_urls : (p.tracking_url ? [p.tracking_url] : []);
  const max = Math.max(numbers.length, urls.length, 1);
  const rows = [];
  for (let i = 0; i < max; i++) {
    const number = numbers[i] || null;
    const url = urls[i] || null;
    if (!number && !url && !p.tracking_company) continue;
    rows.push({
      brand_id: BOTANIKA_BRAND_ID,
      fulfillment_id: String(p.id),
      tracking_key: String(number || url || `${p.tracking_company || 'tracking'}:${i}`),
      tracking_number: number,
      company: p.tracking_company || null,
      url,
      updated_at: new Date().toISOString(),
    });
  }
  return rows;
}

async function upsertFulfillment(p) {
  const fulfillmentId = p.id != null ? String(p.id) : null;
  const orderId = p.order_id != null ? String(p.order_id) : null;
  if (!fulfillmentId || !orderId) return;

  await sb('/rest/v1/shopify_fulfillments?on_conflict=brand_id,fulfillment_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      brand_id: BOTANIKA_BRAND_ID,
      fulfillment_id: fulfillmentId,
      shopify_order_id: orderId,
      name: p.name || null,
      status: p.status || null,
      display_status: p.shipment_status || p.display_status || null,
      total_quantity: (Array.isArray(p.line_items) ? p.line_items : []).reduce((sum, li) => sum + Number(li?.quantity || 0), 0),
      requires_shipping: true,
      location_id: p.location_id != null ? String(p.location_id) : null,
      created_at_shopify: p.created_at || null,
      updated_at_shopify: p.updated_at || null,
      in_transit_at: p.in_transit_at || null,
      delivered_at: p.delivered_at || null,
      estimated_delivery_at: p.estimated_delivery_at || null,
      updated_at: new Date().toISOString(),
    },
  });

  for (const table of ['shopify_fulfillment_items','shopify_fulfillment_tracking']) {
    await sb(`/rest/v1/${table}?brand_id=eq.${qstr(BOTANIKA_BRAND_ID)}&fulfillment_id=eq.${qstr(fulfillmentId)}`, { method: 'DELETE' });
  }

  const items = (Array.isArray(p.line_items) ? p.line_items : []).map(li => ({
    brand_id: BOTANIKA_BRAND_ID,
    fulfillment_id: fulfillmentId,
    fulfillment_line_item_id: String(li.id),
    line_item_id: li.id != null ? String(li.id) : null,
    quantity: Number(li.quantity || 0),
    updated_at: new Date().toISOString(),
  }));
  if (items.length) await sb('/rest/v1/shopify_fulfillment_items', { method: 'POST', body: items, headers: { Prefer: 'return=minimal' } });

  const tracking = webhookTracking(p);
  if (tracking.length) await sb('/rest/v1/shopify_fulfillment_tracking', { method: 'POST', body: tracking, headers: { Prefer: 'return=minimal' } });
}

async function upsertFulfillmentEvent(p) {
  const fulfillmentId = p.fulfillment_id ?? p.fulfillmentId;
  const eventId = p.id;
  if (fulfillmentId == null || eventId == null) return;
  await sb('/rest/v1/shopify_fulfillment_events?on_conflict=brand_id,event_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      brand_id: BOTANIKA_BRAND_ID,
      fulfillment_id: String(fulfillmentId),
      event_id: String(eventId),
      status: p.status || null,
      created_at_shopify: p.created_at || null,
      happened_at: p.happened_at || p.created_at || null,
      estimated_delivery_at: p.estimated_delivery_at || null,
      city: p.city || null,
      province: p.province || null,
      country: p.country || null,
      zip: p.zip || null,
      message: p.message || null,
      updated_at: new Date().toISOString(),
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
    else if (topic === 'fulfillments/create' || topic === 'fulfillments/update') await upsertFulfillment(payload);
    else if (topic === 'fulfillment_events/create') await upsertFulfillmentEvent(payload);
    else return send(res, 200, { ok: true, ignorado: topic || 'sem tópico' });

    await markIntegration('shopify', { status: 'ok', last_success_at: new Date().toISOString(), last_error: null, meta: { ultimo_topico: topic } });
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('[shopify-botanika-webhook]', e);
    try { await markIntegration('shopify', { status: 'erro', last_error: String(e.message || e).slice(0, 500), meta: { ultimo_topico: topic } }); } catch {}
    return send(res, 500, { erro: 'falha ao processar webhook' });
  }
}

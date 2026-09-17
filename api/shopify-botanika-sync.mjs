import { BOTANIKA_BRAND_ID, hashCustomer, markIntegration, sb, sourceCategory } from './_lib/datahub.mjs';

const SHOP = process.env.SHOPIFY_BOTANIKA_SHOP || 'p01bpt-x2.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07';

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).send(JSON.stringify(body));
}

function authorized(req) {
  const secret = process.env.CRON_SECRET || '';
  return !!secret && req.headers.authorization === `Bearer ${secret}`;
}

async function gql(query, variables = {}) {
  const token = process.env.SHOPIFY_BOTANIKA_ADMIN_TOKEN || '';
  if (!token) throw new Error('SHOPIFY_BOTANIKA_ADMIN_TOKEN não configurado');
  const r = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { errors: [{ message: text }] }; }
  if (!r.ok || body?.errors?.length) throw new Error(`Shopify ${r.status}: ${body?.errors?.[0]?.message || 'erro GraphQL'}`);
  return body.data;
}

function attrsToUtms(attrs) {
  const out = {};
  for (const a of Array.isArray(attrs) ? attrs : []) {
    const k = String(a?.key || '').trim().toLowerCase();
    if (['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].includes(k) && a?.value) out[k] = String(a.value);
  }
  return out;
}

function amount(bag) {
  return Number(bag?.shopMoney?.amount || 0);
}

async function upsertOrders(days) {
  const query = `
    query AllianceOrders($after: String, $q: String!) {
      orders(first: 100, after: $after, sortKey: UPDATED_AT, query: $q) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id legacyResourceId name createdAt updatedAt currencyCode
          displayFinancialStatus displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount } }
          totalDiscountsSet { shopMoney { amount } }
          totalRefundedSet { shopMoney { amount } }
          paymentGatewayNames discountCodes email sourceName registeredSourceUrl test tags
          customAttributes { key value }
          lineItems(first: 100) {
            nodes {
              id title variantTitle sku quantity
              originalUnitPriceSet { shopMoney { amount } }
              product { id }
              variant { id inventoryItem { id } }
            }
          }
        }
      }
    }`;

  const from = new Date(Date.now() - days * 86400000).toISOString();
  let after = null;
  let orders = 0;
  let items = 0;
  for (let page = 0; page < 50; page++) {
    const data = await gql(query, { after, q: `updated_at:>=${from}` });
    const conn = data?.orders;
    const nodes = Array.isArray(conn?.nodes) ? conn.nodes : [];
    if (!nodes.length && !conn?.pageInfo?.hasNextPage) break;

    for (const o of nodes) {
      if (o.test) continue;
      const utm = attrsToUtms(o.customAttributes);
      const orderId = String(o.legacyResourceId || o.id);
      await sb('/rest/v1/shopify_orders?on_conflict=brand_id,shopify_order_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: {
          brand_id: BOTANIKA_BRAND_ID,
          shopify_order_id: orderId,
          numero: o.name || null,
          financial_status: String(o.displayFinancialStatus || '').toLowerCase() || null,
          fulfillment_status: String(o.displayFulfillmentStatus || '').toLowerCase() || null,
          total: amount(o.totalPriceSet),
          subtotal: amount(o.subtotalPriceSet),
          total_discounts: amount(o.totalDiscountsSet),
          refunded_amount: amount(o.totalRefundedSet),
          currency: o.currencyCode || 'BRL',
          criado_em: o.createdAt || null,
          atualizado_em_shopify: o.updatedAt || null,
          payment_method: Array.isArray(o.paymentGatewayNames) ? o.paymentGatewayNames.join(',') : null,
          discount_code: Array.isArray(o.discountCodes) ? (o.discountCodes[0] || null) : null,
          cliente_hash: hashCustomer(o.email || orderId),
          utm_source: utm.utm_source || null,
          utm_medium: utm.utm_medium || null,
          utm_campaign: utm.utm_campaign || null,
          utm_content: utm.utm_content || null,
          utm_term: utm.utm_term || null,
          utm_fonte: Object.keys(utm).length ? 'custom_attributes' : null,
          source_category: sourceCategory(utm.utm_source, utm.utm_medium, utm.utm_campaign, o.registeredSourceUrl || o.sourceName),
          raw_resumo: { source_name: o.sourceName || null, registered_source_url: o.registeredSourceUrl || null, tags: o.tags || [] },
          updated_at: new Date().toISOString(),
        },
      });

      await sb(`/rest/v1/shopify_order_items?brand_id=eq.${encodeURIComponent(BOTANIKA_BRAND_ID)}&shopify_order_id=eq.${encodeURIComponent(orderId)}`, { method: 'DELETE' });
      const lineItems = (o.lineItems?.nodes || []).map(li => ({
        brand_id: BOTANIKA_BRAND_ID,
        shopify_order_id: orderId,
        line_item_id: String(li.id),
        product_id: li.product?.id || null,
        variant_id: li.variant?.id || null,
        inventory_item_id: li.variant?.inventoryItem?.id || null,
        sku: li.sku || null,
        nome_produto: li.title || null,
        variant_title: li.variantTitle || null,
        quantidade: Number(li.quantity || 0),
        preco: amount(li.originalUnitPriceSet),
      }));
      if (lineItems.length) {
        await sb('/rest/v1/shopify_order_items', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: lineItems });
        items += lineItems.length;
      }
      orders++;
    }
    if (!conn?.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  return { orders, items, from };
}

async function upsertInventory() {
  const query = `
    query AllianceInventory($after: String) {
      productVariants(first: 100, after: $after, sortKey: ID) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id sku title displayName updatedAt
          product { id title }
          inventoryItem {
            id
            inventoryLevels(first: 30) {
              nodes {
                location { id }
                quantities(names: ["available"]) { name quantity }
                updatedAt
              }
            }
          }
        }
      }
    }`;
  let after = null;
  let rowsCount = 0;
  for (let page = 0; page < 50; page++) {
    const data = await gql(query, { after });
    const conn = data?.productVariants;
    const variants = Array.isArray(conn?.nodes) ? conn.nodes : [];
    const rows = [];
    for (const v of variants) {
      const itemId = v.inventoryItem?.id;
      if (!itemId) continue;
      for (const level of v.inventoryItem?.inventoryLevels?.nodes || []) {
        const available = (level.quantities || []).find(q => q?.name === 'available')?.quantity;
        if (!level.location?.id || available == null) continue;
        rows.push({
          brand_id: BOTANIKA_BRAND_ID,
          inventory_item_id: itemId,
          location_id: level.location.id,
          product_id: v.product?.id || null,
          variant_id: v.id,
          sku: v.sku || null,
          nome_produto: v.product?.title || v.displayName || null,
          variant_title: v.title || null,
          available: Number(available),
          atualizado_em_shopify: level.updatedAt || v.updatedAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
    if (rows.length) {
      await sb('/rest/v1/shopify_inventory?on_conflict=brand_id,inventory_item_id,location_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: rows,
      });
      rowsCount += rows.length;
    }
    if (!conn?.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  return rowsCount;
}

async function sync(days) {
  const orderResult = await upsertOrders(days);
  const inventoryRows = await upsertInventory();
  const at = new Date().toISOString();
  await markIntegration('shopify', {
    status: 'ok', last_success_at: at, last_error: null,
    meta: { mode: 'admin_graphql', days, orders: orderResult.orders, items: orderResult.items, inventory_rows: inventoryRows },
  });
  return { ok: true, days, orders: orderResult.orders, items: orderResult.items, inventory_rows: inventoryRows };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return send(res, 405, { erro: 'método não permitido' });
  if (!authorized(req)) return send(res, 401, { erro: 'não autorizado' });
  const requested = Number(req.query?.days || 60);
  const days = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 60, 365));
  try {
    return send(res, 200, await sync(days));
  } catch (e) {
    console.error('[shopify-botanika-sync]', e);
    try { await markIntegration('shopify', { status: 'erro', last_error: String(e.message || e).slice(0, 500) }); } catch {}
    return send(res, 500, { erro: 'falha ao sincronizar Shopify' });
  }
}

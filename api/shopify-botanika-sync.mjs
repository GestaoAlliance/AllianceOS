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

function qstr(v) {
  return encodeURIComponent(String(v));
}

async function replaceRows(path, rows) {
  if (!rows.length) return;
  await sb(path, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: rows });
}

async function upsertFulfillments(orderId, fulfillments) {
  let count = 0;
  let itemCount = 0;
  let trackingCount = 0;
  let eventCount = 0;

  for (const f of Array.isArray(fulfillments) ? fulfillments : []) {
    const fulfillmentId = String(f.legacyResourceId || f.id);
    if (!fulfillmentId) continue;

    await sb('/rest/v1/shopify_fulfillments?on_conflict=brand_id,fulfillment_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: {
        brand_id: BOTANIKA_BRAND_ID,
        fulfillment_id: fulfillmentId,
        shopify_order_id: orderId,
        name: f.name || null,
        status: String(f.status || '').toLowerCase() || null,
        display_status: String(f.displayStatus || '').toLowerCase() || null,
        total_quantity: Number(f.totalQuantity || 0),
        requires_shipping: f.requiresShipping !== false,
        location_id: f.location?.id || null,
        location_name: f.location?.name || null,
        created_at_shopify: f.createdAt || null,
        updated_at_shopify: f.updatedAt || null,
        in_transit_at: f.inTransitAt || null,
        delivered_at: f.deliveredAt || null,
        estimated_delivery_at: f.estimatedDeliveryAt || null,
        updated_at: new Date().toISOString(),
      },
    });

    for (const table of ['shopify_fulfillment_items','shopify_fulfillment_tracking','shopify_fulfillment_events']) {
      await sb(`/rest/v1/${table}?brand_id=eq.${qstr(BOTANIKA_BRAND_ID)}&fulfillment_id=eq.${qstr(fulfillmentId)}`, { method: 'DELETE' });
    }

    const fItems = (f.fulfillmentLineItems?.nodes || []).map(x => ({
      brand_id: BOTANIKA_BRAND_ID,
      fulfillment_id: fulfillmentId,
      fulfillment_line_item_id: String(x.id),
      line_item_id: x.lineItem?.id || null,
      quantity: Number(x.quantity || 0),
      updated_at: new Date().toISOString(),
    }));
    await replaceRows('/rest/v1/shopify_fulfillment_items', fItems);
    itemCount += fItems.length;

    const trackingRows = (f.trackingInfo || []).map((t, i) => ({
      brand_id: BOTANIKA_BRAND_ID,
      fulfillment_id: fulfillmentId,
      tracking_key: String(t?.number || t?.url || `${t?.company || 'tracking'}:${i}`),
      tracking_number: t?.number || null,
      company: t?.company || null,
      url: t?.url || null,
      updated_at: new Date().toISOString(),
    }));
    await replaceRows('/rest/v1/shopify_fulfillment_tracking', trackingRows);
    trackingCount += trackingRows.length;

    const eventRows = (f.events?.nodes || []).map(ev => ({
      brand_id: BOTANIKA_BRAND_ID,
      fulfillment_id: fulfillmentId,
      event_id: String(ev.id),
      status: String(ev.status || '').toLowerCase() || null,
      created_at_shopify: ev.createdAt || null,
      happened_at: ev.happenedAt || null,
      estimated_delivery_at: ev.estimatedDeliveryAt || null,
      city: ev.city || null,
      province: ev.province || null,
      country: ev.country || null,
      zip: ev.zip || null,
      message: ev.message || null,
      updated_at: new Date().toISOString(),
    }));
    await replaceRows('/rest/v1/shopify_fulfillment_events', eventRows);
    eventCount += eventRows.length;
    count++;
  }

  return { count, itemCount, trackingCount, eventCount };
}

async function upsertOrders(days) {
  const query = `
    query AllianceOrders($after: String, $q: String!) {
      orders(first: 50, after: $after, sortKey: UPDATED_AT, query: $q) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id legacyResourceId name createdAt updatedAt currencyCode
          displayFinancialStatus displayFulfillmentStatus returnStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount } }
          totalDiscountsSet { shopMoney { amount } }
          totalRefundedSet { shopMoney { amount } }
          paymentGatewayNames discountCodes email sourceName registeredSourceUrl test tags
          customAttributes { key value }
          shippingAddress { city province provinceCode country countryCodeV2 zip }
          shippingLine {
            id title code source carrierIdentifier deliveryCategory
            originalPriceSet { shopMoney { amount } }
            discountedPriceSet { shopMoney { amount } }
          }
          lineItems(first: 100) {
            nodes {
              id title variantTitle sku quantity
              originalUnitPriceSet { shopMoney { amount } }
              product { id }
              variant { id inventoryItem { id } }
            }
          }
          fulfillments(first: 50) {
            id legacyResourceId name status displayStatus totalQuantity requiresShipping
            createdAt updatedAt inTransitAt deliveredAt estimatedDeliveryAt
            location { id name }
            trackingInfo(first: 10) { company number url }
            fulfillmentLineItems(first: 100) { nodes { id quantity lineItem { id } } }
            events(first: 50) {
              nodes {
                id status createdAt happenedAt estimatedDeliveryAt
                city province country zip message
              }
            }
          }
        }
      }
    }`;

  const from = new Date(Date.now() - days * 86400000).toISOString();
  let after = null;
  let orders = 0;
  let items = 0;
  let fulfillmentCount = 0;
  let fulfillmentItems = 0;
  let tracking = 0;
  let events = 0;

  for (let page = 0; page < 100; page++) {
    const data = await gql(query, { after, q: `updated_at:>=${from}` });
    const conn = data?.orders;
    const nodes = Array.isArray(conn?.nodes) ? conn.nodes : [];
    if (!nodes.length && !conn?.pageInfo?.hasNextPage) break;

    for (const o of nodes) {
      if (o.test) continue;
      const utm = attrsToUtms(o.customAttributes);
      const orderId = String(o.legacyResourceId || o.id);
      const shipping = o.shippingLine || {};
      const address = o.shippingAddress || {};

      await sb('/rest/v1/shopify_orders?on_conflict=brand_id,shopify_order_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: {
          brand_id: BOTANIKA_BRAND_ID,
          shopify_order_id: orderId,
          numero: o.name || null,
          financial_status: String(o.displayFinancialStatus || '').toLowerCase() || null,
          fulfillment_status: String(o.displayFulfillmentStatus || '').toLowerCase() || null,
          return_status: String(o.returnStatus || '').toLowerCase() || null,
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
          shipping_title: shipping.title || null,
          shipping_code: shipping.code || null,
          shipping_source: shipping.source || null,
          shipping_carrier_identifier: shipping.carrierIdentifier || null,
          shipping_delivery_category: shipping.deliveryCategory || null,
          shipping_price: amount(shipping.originalPriceSet),
          shipping_discounted_price: amount(shipping.discountedPriceSet),
          shipping_city: address.city || null,
          shipping_province: address.province || null,
          shipping_province_code: address.provinceCode || null,
          shipping_country: address.country || null,
          shipping_country_code: address.countryCodeV2 || null,
          shipping_zip: address.zip || null,
          raw_resumo: { source_name: o.sourceName || null, registered_source_url: o.registeredSourceUrl || null, tags: o.tags || [] },
          updated_at: new Date().toISOString(),
        },
      });

      await sb(`/rest/v1/shopify_order_items?brand_id=eq.${qstr(BOTANIKA_BRAND_ID)}&shopify_order_id=eq.${qstr(orderId)}`, { method: 'DELETE' });
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
      await replaceRows('/rest/v1/shopify_order_items', lineItems);
      items += lineItems.length;

      const f = await upsertFulfillments(orderId, o.fulfillments || []);
      fulfillmentCount += f.count;
      fulfillmentItems += f.itemCount;
      tracking += f.trackingCount;
      events += f.eventCount;
      orders++;
    }

    if (!conn?.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  return { orders, items, fulfillments: fulfillmentCount, fulfillment_items: fulfillmentItems, tracking, events, from };
}

async function upsertFulfillmentOrders(days) {
  const query = `
    query AllianceFulfillmentOrders($after: String, $q: String!) {
      orders(first: 50, after: $after, sortKey: UPDATED_AT, query: $q) {
        pageInfo { hasNextPage endCursor }
        nodes {
          legacyResourceId name
          fulfillmentOrders(first: 50) {
            nodes {
              id status requestStatus createdAt updatedAt fulfillAt fulfillBy
              assignedLocation { location { id } name }
              deliveryMethod { methodType serviceCode presentedName minDeliveryDateTime maxDeliveryDateTime }
              lineItems(first: 100) {
                nodes {
                  id totalQuantity remainingQuantity requiresShipping sku productTitle variantTitle inventoryItemId
                  lineItem { id }
                  variant { id }
                }
              }
            }
          }
        }
      }
    }`;

  const from = new Date(Date.now() - days * 86400000).toISOString();
  let after = null;
  let rows = 0;
  let items = 0;

  for (let page = 0; page < 100; page++) {
    const data = await gql(query, { after, q: `updated_at:>=${from}` });
    const conn = data?.orders;
    const orders = Array.isArray(conn?.nodes) ? conn.nodes : [];

    for (const o of orders) {
      const orderId = String(o.legacyResourceId || '');
      if (!orderId) continue;
      for (const fo of o.fulfillmentOrders?.nodes || []) {
        const foId = String(fo.id);
        const loc = fo.assignedLocation || {};
        const dm = fo.deliveryMethod || {};
        await sb('/rest/v1/shopify_fulfillment_orders?on_conflict=brand_id,fulfillment_order_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: {
            brand_id: BOTANIKA_BRAND_ID,
            fulfillment_order_id: foId,
            shopify_order_id: orderId,
            order_name: o.name || null,
            status: String(fo.status || '').toLowerCase() || null,
            request_status: String(fo.requestStatus || '').toLowerCase() || null,
            assigned_location_id: loc.location?.id || null,
            assigned_location_name: loc.name || null,
            fulfill_at: fo.fulfillAt || null,
            fulfill_by: fo.fulfillBy || null,
            delivery_method_type: String(dm.methodType || '').toLowerCase() || null,
            delivery_service_code: dm.serviceCode || null,
            delivery_presented_name: dm.presentedName || null,
            min_delivery_at: dm.minDeliveryDateTime || null,
            max_delivery_at: dm.maxDeliveryDateTime || null,
            created_at_shopify: fo.createdAt || null,
            updated_at_shopify: fo.updatedAt || null,
            updated_at: new Date().toISOString(),
          },
        });

        await sb(`/rest/v1/shopify_fulfillment_order_items?brand_id=eq.${qstr(BOTANIKA_BRAND_ID)}&fulfillment_order_id=eq.${qstr(foId)}`, { method: 'DELETE' });
        const foItems = (fo.lineItems?.nodes || []).map(li => ({
          brand_id: BOTANIKA_BRAND_ID,
          fulfillment_order_id: foId,
          fulfillment_order_line_item_id: String(li.id),
          line_item_id: li.lineItem?.id || null,
          variant_id: li.variant?.id || null,
          inventory_item_id: li.inventoryItemId || null,
          sku: li.sku || null,
          product_title: li.productTitle || null,
          variant_title: li.variantTitle || null,
          requires_shipping: li.requiresShipping !== false,
          total_quantity: Number(li.totalQuantity || 0),
          remaining_quantity: Number(li.remainingQuantity || 0),
          updated_at: new Date().toISOString(),
        }));
        await replaceRows('/rest/v1/shopify_fulfillment_order_items', foItems);
        items += foItems.length;
        rows++;
      }
    }

    if (!conn?.pageInfo?.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  return { rows, items };
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
                quantities(names: ["available","on_hand","committed","incoming","reserved","damaged","safety_stock","quality_control"]) { name quantity }
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
        const quantities = Object.fromEntries((level.quantities || []).map(q => [q?.name, Number(q?.quantity || 0)]));
        if (!level.location?.id || quantities.available == null) continue;
        rows.push({
          brand_id: BOTANIKA_BRAND_ID,
          inventory_item_id: itemId,
          location_id: level.location.id,
          product_id: v.product?.id || null,
          variant_id: v.id,
          sku: v.sku || null,
          nome_produto: v.product?.title || v.displayName || null,
          variant_title: v.title || null,
          available: quantities.available,
          on_hand: quantities.on_hand ?? 0,
          committed: quantities.committed ?? 0,
          incoming: quantities.incoming ?? 0,
          reserved: quantities.reserved ?? 0,
          damaged: quantities.damaged ?? 0,
          safety_stock: quantities.safety_stock ?? 0,
          quality_control: quantities.quality_control ?? 0,
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
  let fulfillmentOrders = { rows: 0, items: 0, warning: null };
  try {
    fulfillmentOrders = { ...(await upsertFulfillmentOrders(days)), warning: null };
  } catch (e) {
    console.warn('[shopify-botanika-sync] fulfillment orders indisponíveis:', e?.message || e);
    fulfillmentOrders.warning = 'Escopos de fulfillment orders ainda não disponíveis no token da Shopify';
  }

  const at = new Date().toISOString();
  await markIntegration('shopify', {
    status: 'ok', last_success_at: at, last_error: null,
    meta: {
      mode: 'admin_graphql',
      days,
      orders: orderResult.orders,
      items: orderResult.items,
      inventory_rows: inventoryRows,
      fulfillments: orderResult.fulfillments,
      fulfillment_items: orderResult.fulfillment_items,
      tracking: orderResult.tracking,
      fulfillment_events: orderResult.events,
      fulfillment_orders: fulfillmentOrders.rows,
      fulfillment_order_items: fulfillmentOrders.items,
      fulfillment_orders_warning: fulfillmentOrders.warning,
    },
  });

  return {
    ok: true,
    days,
    orders: orderResult.orders,
    items: orderResult.items,
    inventory_rows: inventoryRows,
    fulfillments: orderResult.fulfillments,
    tracking: orderResult.tracking,
    fulfillment_events: orderResult.events,
    fulfillment_orders: fulfillmentOrders.rows,
    fulfillment_order_items: fulfillmentOrders.items,
    warning: fulfillmentOrders.warning,
  };
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

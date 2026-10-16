#!/usr/bin/env node
'use strict';

/**
 * Smoke против уже запущенного `npm run mock` (http://127.0.0.1:4010).
 * Prism: paths как в YAML (/public/...), без /api/v1.
 */

const BASE = process.env.MOCK_BASE || 'http://127.0.0.1:4010';

async function req(method, path, { headers = {}, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function step(name, fn) {
  process.stdout.write(`→ ${name} ... `);
  try {
    const result = await fn();
    console.log(`OK (${result})`);
  } catch (err) {
    console.log('FAIL');
    throw err;
  }
}

(async () => {
  console.log(`Smoke → ${BASE}\n`);

  await step('GET  /public/products', async () => {
    const r = await req('GET', '/public/products');
    assert(r.status === 200, `expected 200, got ${r.status}`);
    assert(r.json?.data, 'no data');
    return r.status;
  });

  await step('POST /public/test-attempts', async () => {
    const r = await req('POST', '/public/test-attempts', {
      body: { versionId: '55555555-5555-5555-5555-555555555555' },
    });
    assert(r.status === 201, `expected 201, got ${r.status}`);
    assert(r.json?.data?.attemptToken, 'no token');
    return r.status;
  });

  await step('POST /integrations/commerce/promocodes/validate (no key → 401)', async () => {
    const r = await req('POST', '/integrations/commerce/promocodes/validate', {
      body: {
        code: 'X',
        currency: 'RUB',
        items: [{ productId: '123e4567-e89b-12d3-a456-426655440000', quantity: 1 }],
      },
    });
    assert(r.status === 401, `expected 401, got ${r.status}`);
    return r.status;
  });

  await step('POST /integrations/commerce/promocodes/validate', async () => {
    const r = await req('POST', '/integrations/commerce/promocodes/validate', {
      headers: { 'X-API-Key': 'test' },
      body: {
        code: 'PROFIT-ABC-123',
        currency: 'RUB',
        items: [
          {
            productId: '123e4567-e89b-12d3-a456-426655440000',
            quantity: 1,
            unitPriceQuoted: '1490.00',
          },
        ],
      },
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    return r.status;
  });

  await step('POST /integrations/commerce/purchases', async () => {
    const r = await req('POST', '/integrations/commerce/purchases', {
      headers: { 'X-API-Key': 'test', 'Idempotency-Key': 'smoke-001' },
      body: {
        purchaseExternalId: 'shop-order-10042',
        purchasedAt: '2026-10-16T14:30:00Z',
        currency: 'RUB',
        promoCode: 'PROFIT-ABC-123',
        items: [
          {
            productId: '123e4567-e89b-12d3-a456-426655440000',
            quantity: 1,
            unitPrice: '1490.00',
            lineDiscountAmount: '149.00',
            lineTotal: '1341.00',
          },
        ],
        totals: { itemsSubtotal: '1490.00', discountTotal: '149.00', grandTotal: '1341.00' },
      },
    });
    assert([200, 201].includes(r.status), `expected 200/201, got ${r.status}`);
    return r.status;
  });

  await step('POST /integrations/mail/provider-events', async () => {
    const r = await req('POST', '/integrations/mail/provider-events', {
      headers: { 'X-Provider-Signature': 'sig' },
      body: {
        providerEventId: 'evt-1',
        providerMessageId: 'msg-1',
        eventType: 'ACCEPTED_BY_PROVIDER',
        occurredAt: '2026-10-16T12:00:05Z',
      },
    });
    assert(r.status === 202, `expected 202, got ${r.status}`);
    return r.status;
  });

  console.log('\nSmoke OK');
})().catch((err) => {
  console.error('\nSmoke FAILED:', err.message);
  console.error('Сначала в другом терминале: npm run mock');
  process.exit(1);
});

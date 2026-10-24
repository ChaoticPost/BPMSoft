#!/usr/bin/env node
'use strict';

/**
 * Smoke + negative cases (чеклист преподавателя) against Prism mock.
 * Paths как в YAML. Mock проверяет форму контракта, не бизнес-логику BPMSoft.
 *
 * Покрытие негативов:
 * - нет API key / нет AttemptToken → 401
 * - короткий Idempotency-Key → 400/422
 * - rate-limit → Prefer 429 + Retry-After
 * - duplicate Idempotency-Key / conflict → Prefer 409 (purchases, attempts)
 * - duplicate provider-event → Prefer 409 (mail)
 * - product group / expired / activated → Prefer 422 (validate)
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
  return { status: res.status, headers: res.headers, json };
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

const productId = '123e4567-e89b-12d3-a456-426655440000';
const purchaseBody = {
  purchaseExternalId: 'shop-order-10042',
  purchasedAt: '2026-10-16T14:30:00Z',
  currency: 'RUB',
  promoCode: 'PROFIT-ABC-123',
  items: [
    {
      productId,
      quantity: 1,
      unitPrice: '1490.00',
      lineDiscountAmount: '149.00',
      lineTotal: '1341.00',
    },
  ],
  totals: { itemsSubtotal: '1490.00', discountTotal: '149.00', grandTotal: '1341.00' },
};

(async () => {
  console.log(`Smoke → ${BASE}`);
  console.log('NOTE: Prefer:* cases validate response shapes from OpenAPI examples.\n');
  console.log('=== positive ===\n');

  await step('GET  /public/products', async () => {
    const r = await req('GET', '/public/products', {
      headers: { 'X-Correlation-ID': 'smoke-corr-001' },
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    assert(r.json?.data, 'no data');
    return r.status;
  });

  let attemptToken;
  await step('POST /public/test-attempts', async () => {
    const r = await req('POST', '/public/test-attempts', {
      body: { versionId: '55555555-5555-5555-5555-555555555555' },
    });
    assert(r.status === 201, `expected 201, got ${r.status}`);
    assert(r.json?.data?.attemptToken, 'no token');
    attemptToken = r.json.data.attemptToken;
    return r.status;
  });

  await step('GET attempt WITH X-Attempt-Token', async () => {
    const r = await req('GET', `/public/test-attempts/${productId}`, {
      headers: { 'X-Attempt-Token': attemptToken || 'x'.repeat(32) },
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    return r.status;
  });

  await step('POST commerce validate (happy)', async () => {
    const r = await req('POST', '/integrations/commerce/promocodes/validate', {
      headers: { 'X-API-Key': 'test' },
      body: {
        code: 'PROFIT-ABC-123',
        currency: 'RUB',
        items: [{ productId, quantity: 1, unitPriceQuoted: '1490.00' }],
      },
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    return r.status;
  });

  await step('POST commerce purchases (happy)', async () => {
    const r = await req('POST', '/integrations/commerce/purchases', {
      headers: { 'X-API-Key': 'test', 'Idempotency-Key': 'smoke-idem-001' },
      body: purchaseBody,
    });
    assert([200, 201].includes(r.status), `expected 200/201, got ${r.status}`);
    return r.status;
  });

  await step('POST mail provider-events (happy)', async () => {
    const r = await req('POST', '/integrations/mail/provider-events', {
      headers: { 'X-Provider-Signature': 'sig' },
      body: {
        providerEventId: 'evt-smoke-1',
        providerMessageId: 'msg-1',
        eventType: 'ACCEPTED_BY_PROVIDER',
        occurredAt: '2026-10-16T12:00:05Z',
      },
    });
    assert(r.status === 202, `expected 202, got ${r.status}`);
    return r.status;
  });

  console.log('\n=== negative (teacher checklist) ===\n');

  await step('[token] GET attempt WITHOUT X-Attempt-Token → 401', async () => {
    const r = await req('GET', `/public/test-attempts/${productId}`);
    assert(r.status === 401, `expected 401, got ${r.status}`);
    return r.status;
  });

  await step('[auth] validate WITHOUT X-API-Key → 401', async () => {
    const r = await req('POST', '/integrations/commerce/promocodes/validate', {
      body: {
        code: 'X',
        currency: 'RUB',
        items: [{ productId, quantity: 1 }],
      },
    });
    assert(r.status === 401, `expected 401, got ${r.status}`);
    return r.status;
  });

  await step('[rate-limit] Prefer 429 on createTestAttempt + Retry-After', async () => {
    const r = await req('POST', '/public/test-attempts', {
      headers: { Prefer: 'code=429' },
      body: { versionId: '55555555-5555-5555-5555-555555555555' },
    });
    assert(r.status === 429, `expected 429, got ${r.status}`);
    const ra = r.headers.get('retry-after');
    assert(ra, 'Retry-After header missing on 429');
    return `429 Retry-After=${ra}`;
  });

  await step('[product-group] Prefer 422 validate (PROMO_PRODUCT_GROUP_MISMATCH shape)', async () => {
    const r = await req('POST', '/integrations/commerce/promocodes/validate', {
      headers: { 'X-API-Key': 'test', Prefer: 'code=422' },
      body: {
        code: 'WRONG-GROUP',
        currency: 'RUB',
        items: [{ productId, quantity: 1, unitPriceQuoted: '1490.00' }],
      },
    });
    assert(r.status === 422, `expected 422, got ${r.status}`);
    return r.status;
  });

  await step('[expired/activated] Prefer 422 validate (business reject shape)', async () => {
    const r = await req('POST', '/integrations/commerce/promocodes/validate', {
      headers: { 'X-API-Key': 'test', Prefer: 'code=422' },
      body: {
        code: 'EXPIRED-OR-ACTIVATED',
        currency: 'RUB',
        items: [{ productId, quantity: 1 }],
      },
    });
    assert(r.status === 422, `expected 422, got ${r.status}`);
    return r.status;
  });

  await step('[idempotency duplicate] Prefer 409 on purchases', async () => {
    const r = await req('POST', '/integrations/commerce/purchases', {
      headers: {
        'X-API-Key': 'test',
        'Idempotency-Key': 'smoke-idem-dup-body',
        Prefer: 'code=409',
      },
      body: { ...purchaseBody, purchaseExternalId: 'other-order' },
    });
    assert(r.status === 409, `expected 409, got ${r.status}`);
    return r.status;
  });

  await step('[idempotency key too short] purchases → 400/422', async () => {
    const r = await req('POST', '/integrations/commerce/purchases', {
      headers: { 'X-API-Key': 'test', 'Idempotency-Key': 'short' },
      body: purchaseBody,
    });
    assert([400, 422].includes(r.status), `expected 400/422, got ${r.status}`);
    return r.status;
  });

  await step('[provider-event duplicate] Prefer 409 on mail webhook', async () => {
    const r = await req('POST', '/integrations/mail/provider-events', {
      headers: { 'X-Provider-Signature': 'sig', Prefer: 'code=409' },
      body: {
        providerEventId: 'evt-dup',
        providerMessageId: 'msg-1',
        eventType: 'ACCEPTED_BY_PROVIDER',
        occurredAt: '2026-10-16T12:00:05Z',
      },
    });
    assert(r.status === 409, `expected 409, got ${r.status}`);
    return r.status;
  });

  console.log('\nSmoke OK');
  console.log('LIMIT: Prism Prefer/examples ≠ исполнение правил ядра BPMSoft.');
})().catch((err) => {
  console.error('\nSmoke FAILED:', err.message);
  console.error('Сначала: npm run mock');
  process.exit(1);
});

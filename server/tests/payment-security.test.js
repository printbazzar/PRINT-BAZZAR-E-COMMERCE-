/**
 * STEP 2 — Razorpay Payment & Webhook Security Hardening: verification tests.
 *
 * These tests exercise the REAL production code in
 * server/src/controllers/paymentController.js (verifyPayment and
 * handlePaymentWebhook) exactly as written — no business logic is
 * duplicated or reimplemented here.
 *
 * They run fully isolated from the live database: `@prisma/client` and
 * `notificationService.js` are replaced with in-memory fakes via
 * node:test's module mocking (`mock.module`, hence the
 * --experimental-test-module-mocks flag required to run this file). This
 * is deliberate — these tests exercise a payment-confirmation code path,
 * and must never write fabricated "CONFIRMED" orders/payments/audit logs
 * into the real Supabase production database that powers the live store.
 *
 * Run with:
 *   node --experimental-test-module-mocks --test tests/payment-security.test.js
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// Ensure a deterministic starting environment regardless of the host shell.
process.env.NODE_ENV = 'test';
delete process.env.RAZORPAY_KEY_ID;
delete process.env.RAZORPAY_KEY_SECRET;
delete process.env.RAZORPAY_TEST_KEY_ID;
delete process.env.RAZORPAY_TEST_KEY_SECRET;
delete process.env.RAZORPAY_LIVE_KEY_ID;
delete process.env.RAZORPAY_LIVE_KEY_SECRET;
delete process.env.RAZORPAY_WEBHOOK_SECRET;
delete process.env.RAZORPAY_TEST_WEBHOOK_SECRET;
delete process.env.RAZORPAY_LIVE_WEBHOOK_SECRET;
delete process.env.RAZORPAY_MODE;
delete process.env.PAYMENT_GATEWAY_SECRET;

// ---------------------------------------------------------------------------
// In-memory fake data store + call tracking
// ---------------------------------------------------------------------------

let orderDb = null;
let storeSettingRows = [];
let txCalls = {};
let auditLogCalls = [];

function makeOrderFixture(overrides = {}) {
  return {
    id: 'order_1',
    orderNumber: 'PB-ORD-TEST-0001',
    paymentStatus: 'PENDING',
    orderStatus: 'PENDING_PAYMENT',
    grandTotal: 1000,
    items: [{ id: 'item_1', designRequired: false, designCharge: 0 }],
    productionJobs: [{ id: 'job_1' }],
    designOrders: [],
    payments: [],
    invoices: [{ id: 'inv_1', balanceDue: 1000 }],
    ...overrides,
  };
}

function resetFakeDb(order) {
  orderDb = order;
  txCalls = {
    ran: false,
    orderUpdated: false,
    orderUpdateData: null,
    paymentCreated: false,
    paymentData: null,
  };
  auditLogCalls = [];
}

function jsonRow(key, value) {
  return { key, value: JSON.stringify(value) };
}

const fakePrisma = {
  storeSetting: {
    findMany: async () => storeSettingRows,
  },
  order: {
    findUnique: async ({ where }) => {
      if (orderDb && orderDb.orderNumber === where.orderNumber) return orderDb;
      return null;
    },
  },
  payment: {
    findFirst: async () => null,
  },
  auditLog: {
    create: async ({ data }) => {
      auditLogCalls.push(data);
      return data;
    },
  },
  $transaction: async (fn) => {
    txCalls.ran = true;
    const tx = {
      order: {
        update: async ({ data }) => {
          txCalls.orderUpdated = true;
          txCalls.orderUpdateData = data;
          return { ...orderDb, ...data };
        },
      },
      payment: {
        findFirst: async () => null,
        create: async ({ data }) => {
          txCalls.paymentCreated = true;
          txCalls.paymentData = data;
          return data;
        },
      },
      orderStatusHistory: { create: async () => ({}) },
      productionJob: { update: async () => ({}) },
      designOrder: { update: async () => ({}) },
      invoice: { updateMany: async () => ({}) },
      auditLog: {
        create: async ({ data }) => {
          auditLogCalls.push(data);
          return data;
        },
      },
    };
    return fn(tx);
  },
};

mock.module('@prisma/client', {
  namedExports: {
    PrismaClient: class {
      constructor() {
        return fakePrisma;
      }
    },
  },
});

mock.module('../src/services/notificationService.js', {
  namedExports: {
    sendOrderNotification: async () => ({ success: true, mocked: true }),
  },
});

const { verifyPayment, handlePaymentWebhook } = await import('../src/controllers/paymentController.js');

// ---------------------------------------------------------------------------
// Minimal fake Express res
// ---------------------------------------------------------------------------

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// =============================================================================
// verifyPayment — TESTS 1-4, 9, and bonus production-secret-validation test
// =============================================================================

describe('verifyPayment — fail-closed signature verification', () => {
  const KEY_SECRET = 'test_secret_abc123';

  test('TEST 1: No gatewayOrderId + no signature -> REJECTED, payment NOT created, order NOT confirmed', async () => {
    resetFakeDb(makeOrderFixture());
    storeSettingRows = [jsonRow('RAZORPAY_KEY_SECRET', KEY_SECRET)];

    const req = { body: { orderNumber: orderDb.orderNumber, paymentMethod: 'UPI' } };
    const res = makeRes();
    await verifyPayment(req, res);

    assert.equal(res.statusCode, 400, 'must reject with 400');
    assert.equal(res.body.success, false);
    assert.equal(txCalls.ran, false, 'transaction must never run');
    assert.equal(txCalls.paymentCreated, false, 'payment must NOT be created');
    assert.equal(txCalls.orderUpdated, false, 'order must NOT be confirmed');
  });

  test('TEST 2: Missing signature (gatewayOrderId present) -> REJECTED', async () => {
    resetFakeDb(makeOrderFixture());
    storeSettingRows = [jsonRow('RAZORPAY_KEY_SECRET', KEY_SECRET)];

    const req = {
      body: { orderNumber: orderDb.orderNumber, orderId: 'order_rzp_1', paymentId: 'pay_1' },
    };
    const res = makeRes();
    await verifyPayment(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(txCalls.ran, false);
  });

  test('TEST 3: Invalid signature -> REJECTED', async () => {
    resetFakeDb(makeOrderFixture());
    storeSettingRows = [jsonRow('RAZORPAY_KEY_SECRET', KEY_SECRET)];

    const req = {
      body: {
        orderNumber: orderDb.orderNumber,
        orderId: 'order_rzp_1',
        paymentId: 'pay_1',
        signature: 'totally-bogus-signature-that-will-never-match',
      },
    };
    const res = makeRes();
    await verifyPayment(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(txCalls.ran, false);
  });

  test('TEST 4: Valid signature -> existing payment flow succeeds unchanged', async () => {
    resetFakeDb(makeOrderFixture());
    storeSettingRows = [jsonRow('RAZORPAY_KEY_SECRET', KEY_SECRET)];

    const gatewayOrderId = 'order_rzp_1';
    const paymentId = 'pay_1';
    const validSignature = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(`${gatewayOrderId}|${paymentId}`)
      .digest('hex');

    const req = {
      body: {
        orderNumber: orderDb.orderNumber,
        orderId: gatewayOrderId,
        paymentId,
        signature: validSignature,
        paymentMethod: 'UPI',
      },
    };
    const res = makeRes();
    await verifyPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(txCalls.paymentCreated, true, 'payment MUST be created on valid signature');
    assert.equal(txCalls.orderUpdated, true, 'order MUST be confirmed on valid signature');
    assert.equal(txCalls.orderUpdateData.paymentStatus, 'CONFIRMED');
    assert.equal(txCalls.paymentData.status, 'SUCCESS');
  });

  test('BONUS (item 4 — production secret validation): Missing key secret in production -> REJECTED 503', async () => {
    resetFakeDb(makeOrderFixture());
    storeSettingRows = []; // no secret configured anywhere
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const req = {
        body: {
          orderNumber: orderDb.orderNumber,
          orderId: 'order_rzp_1',
          paymentId: 'pay_1',
          signature: 'anything',
        },
      };
      const res = makeRes();
      await verifyPayment(req, res);

      assert.equal(res.statusCode, 503, 'production must fail closed when secret is unconfigured');
      assert.equal(txCalls.ran, false);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  test('TEST 9: Duplicate payment verification -> existing idempotency behavior remains intact', async () => {
    const gatewayOrderId = 'order_rzp_2';
    const paymentId = 'pay_2';
    const validSignature = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(`${gatewayOrderId}|${paymentId}`)
      .digest('hex');

    resetFakeDb(
      makeOrderFixture({
        paymentStatus: 'CONFIRMED',
        payments: [{ transactionId: paymentId, status: 'SUCCESS' }],
      })
    );
    storeSettingRows = [jsonRow('RAZORPAY_KEY_SECRET', KEY_SECRET)];

    const req = {
      body: { orderNumber: orderDb.orderNumber, orderId: gatewayOrderId, paymentId, signature: validSignature },
    };
    const res = makeRes();
    await verifyPayment(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.isDuplicateCall, true);
    assert.equal(txCalls.ran, false, 'duplicate call must short-circuit before any transaction');
    assert.equal(txCalls.paymentCreated, false, 'duplicate call must not create a second payment record');
  });
});

// =============================================================================
// handlePaymentWebhook — TESTS 5-8, 10
// =============================================================================

describe('handlePaymentWebhook — fail-closed signature verification', () => {
  const WEBHOOK_SECRET = 'test_webhook_secret_xyz789';

  function makeWebhookReq({ rawBody, signature }) {
    const headers = {};
    if (signature !== undefined) headers['x-razorpay-signature'] = signature;
    return { headers, rawBody, body: JSON.parse(rawBody) };
  }

  function samplePayload(orderNumber, paymentId = 'pay_wh_1') {
    return JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            amount: 100000,
            method: 'upi',
            notes: { orderNumber },
          },
        },
      },
    });
  }

  test('TEST 5: Webhook with missing secret -> REJECTED 503, no DB processing', async () => {
    resetFakeDb(makeOrderFixture());
    storeSettingRows = []; // no webhook secret configured anywhere
    const rawBody = samplePayload(orderDb.orderNumber);
    const req = makeWebhookReq({ rawBody, signature: 'irrelevant-because-secret-is-missing' });
    const res = makeRes();
    await handlePaymentWebhook(req, res);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.success, false);
    assert.equal(txCalls.ran, false);
    assert.equal(txCalls.orderUpdated, false);
    assert.equal(txCalls.paymentCreated, false);
  });

  test('TEST 6: Webhook with missing signature header (secret configured) -> REJECTED', async () => {
    resetFakeDb(makeOrderFixture());
    storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];
    const rawBody = samplePayload(orderDb.orderNumber);
    const req = makeWebhookReq({ rawBody, signature: undefined });
    const res = makeRes();
    await handlePaymentWebhook(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(txCalls.ran, false);
  });

  test('TEST 7: Webhook with invalid signature (secret configured) -> REJECTED', async () => {
    resetFakeDb(makeOrderFixture());
    storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];
    const rawBody = samplePayload(orderDb.orderNumber);
    const req = makeWebhookReq({ rawBody, signature: 'not-the-right-signature' });
    const res = makeRes();
    await handlePaymentWebhook(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(txCalls.ran, false);
  });

  test('TEST 8: Webhook with valid signature -> existing webhook flow succeeds unchanged', async () => {
    resetFakeDb(makeOrderFixture());
    storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];
    const rawBody = samplePayload(orderDb.orderNumber);
    const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
    const req = makeWebhookReq({ rawBody, signature: validSignature });
    const res = makeRes();
    await handlePaymentWebhook(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(txCalls.paymentCreated, true, 'payment MUST be created on valid webhook signature');
    assert.equal(txCalls.orderUpdated, true, 'order MUST be confirmed on valid webhook signature');
    assert.equal(txCalls.orderUpdateData.paymentStatus, 'CONFIRMED');
  });

  test('TEST 10: Duplicate webhook -> existing idempotency behavior remains intact', async () => {
    const paymentId = 'pay_wh_dup_1';
    resetFakeDb(
      makeOrderFixture({
        paymentStatus: 'CONFIRMED',
        payments: [{ transactionId: paymentId, status: 'SUCCESS' }],
      })
    );
    storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];
    const rawBody = samplePayload(orderDb.orderNumber, paymentId);
    const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
    const req = makeWebhookReq({ rawBody, signature: validSignature });
    const res = makeRes();
    await handlePaymentWebhook(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.isDuplicate, true);
    assert.equal(txCalls.ran, false, 'duplicate webhook must short-circuit before any transaction');
    assert.equal(txCalls.paymentCreated, false, 'duplicate webhook must not create a second payment record');
  });
});

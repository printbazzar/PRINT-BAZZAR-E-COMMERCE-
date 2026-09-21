import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// Set deterministic test environment
process.env.NODE_ENV = 'test';

// In-memory fake database & tracker
let orderDb = null;
let storeSettingRows = [];
let txCalls = {};
let auditLogCalls = [];

function makeOrderFixture(overrides = {}) {
  return {
    id: 'order_pb0b_1',
    orderNumber: 'PB-ORD-RECON-0001',
    paymentStatus: 'PENDING',
    orderStatus: 'ORDER_CREATED',
    grandTotal: 5000,
    items: [{ id: 'item_1', designRequired: false, designCharge: 0 }],
    productionJobs: [{ id: 'job_1', status: 'WAITING_FOR_PAYMENT', artworkStatus: 'PENDING' }],
    designOrders: [],
    payments: [],
    invoices: [{ id: 'inv_1', grandTotal: 5000, amountPaid: 0, balanceDue: 5000, paymentStatus: 'PENDING' }],
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
    invoiceUpdated: false,
    invoiceUpdateData: null,
    productionJobUpdated: false,
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
    create: async ({ data }) => {
      txCalls.paymentCreated = true;
      txCalls.paymentData = data;
      return data;
    },
  },
  orderStatusHistory: {
    create: async ({ data }) => data,
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
      productionJob: {
        update: async () => {
          txCalls.productionJobUpdated = true;
          return {};
        },
      },
      designOrder: { update: async () => ({}) },
      invoice: {
        updateMany: async ({ data }) => {
          txCalls.invoiceUpdated = true;
          txCalls.invoiceUpdateData = data;
          return {};
        },
      },
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

// Bind fakePrisma to globalThis before importing paymentController
globalThis.prisma = fakePrisma;

const { verifyPayment, handlePaymentWebhook, getAuthoritativeExpectedAmount } = await import('../src/controllers/paymentController.js');

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

const WEBHOOK_SECRET = 'whsec_test_secret_key_12345';
const KEY_SECRET = 'rzp_sec_test_key_12345';

function makeWebhookReq({ rawBody, signature }) {
  const headers = {};
  if (signature !== undefined) headers['x-razorpay-signature'] = signature;
  return { headers, rawBody, body: JSON.parse(rawBody) };
}

function makeWebhookPayload(orderNumber, amountPaise = 500000, options = {}) {
  const payload = {
    event: options.event || 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: options.paymentId || 'pay_recon_1',
          order_id: options.rzpOrderId || 'order_rzp_valid_123',
          amount: amountPaise,
          currency: options.currency || 'INR',
          method: 'upi',
          notes: { orderNumber },
        },
      },
    },
  };
  return JSON.stringify(payload);
}

describe('Phase 0B — Payment Security & Reconciliation Suite', () => {

  describe('Authoritative Expected Amount Calculation', () => {
    it('should compute exact server-side expected amount for full payment', () => {
      const order = makeOrderFixture({ grandTotal: 2500 });
      const result = getAuthoritativeExpectedAmount(order, 'FULL', {});
      assert.equal(result.expectedAmount, 2500);
      assert.equal(result.hasDesign, false);
    });

    it('should compute design fee expected amount when split payment is enabled', () => {
      const order = makeOrderFixture({
        grandTotal: 10000,
        items: [{ id: 'i1', designRequired: true, designCharge: 1500 }],
      });
      const config = { designSplit: true };
      const result = getAuthoritativeExpectedAmount(order, 'DESIGN', config);
      assert.equal(result.expectedAmount, 1500);
      assert.equal(result.effectiveStage, 'DESIGN');
    });
  });

  describe('1. Valid Webhook + Exact Amount → Accepted & Confirmed', () => {
    it('should confirm order and update invoice when webhook amount matches exact expected amount', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 5000 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 500000); // ₹5000 = 500000 paise
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(txCalls.orderUpdated, true, 'Order MUST be updated to CONFIRMED');
      assert.equal(txCalls.orderUpdateData.paymentStatus, 'CONFIRMED');
      assert.equal(txCalls.paymentData.status, 'SUCCESS');
      assert.equal(txCalls.invoiceUpdateData.paymentStatus, 'PAID');
      assert.equal(txCalls.invoiceUpdateData.amountPaid, 5000);
      assert.equal(txCalls.invoiceUpdateData.balanceDue, 0);
    });
  });

  describe('2. Valid Signature + Underpayment → Quarantined / NOT Confirmed', () => {
    it('should quarantine underpayment and NOT confirm the order', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 5000 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      // Underpayment: ₹100 instead of ₹5000 (10000 paise)
      const rawBody = makeWebhookPayload(orderDb.orderNumber, 10000);
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.flagged, true);
      assert.equal(res.body.reason, 'AMOUNT_MISMATCH');
      assert.equal(txCalls.paymentData.status, 'UNDER_REVIEW');
      assert.equal(txCalls.orderUpdated, false, 'Order MUST NOT be marked CONFIRMED on underpayment');
      assert.ok(auditLogCalls.some((a) => a.action === 'PAYMENT_WEBHOOK_AMOUNT_MISMATCH_QUARANTINED'));
    });
  });

  describe('3. Valid Signature + Overpayment → Quarantined / NOT Confirmed', () => {
    it('should quarantine overpayment and NOT automatically confirm the order', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 5000 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      // Overpayment: ₹8000 instead of ₹5000 (800000 paise)
      const rawBody = makeWebhookPayload(orderDb.orderNumber, 800000);
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.flagged, true);
      assert.equal(res.body.reason, 'AMOUNT_MISMATCH');
      assert.equal(txCalls.orderUpdated, false, 'Order MUST NOT be marked CONFIRMED on overpayment');
    });
  });

  describe('4. Wrong Currency → Rejected', () => {
    it('should reject webhook payments made in non-INR currency', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 5000 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 500000, { currency: 'USD' });
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.equal(txCalls.orderUpdated, false, 'Non-INR payment MUST NOT confirm order');
      assert.ok(auditLogCalls.some((a) => a.action === 'PAYMENT_WEBHOOK_CURRENCY_MISMATCH_REJECTED'));
    });
  });

  describe('5. Malformed/Mismatched Razorpay Order ID → Rejected', () => {
    it('should reject webhook if Razorpay order ID is malformed', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 5000 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 500000, { rzpOrderId: 'malformed_invalid_id' });
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.equal(txCalls.orderUpdated, false);
    });
  });

  describe('6. Invalid Webhook Signature → Rejected (400)', () => {
    it('should reject webhook with 400 when HMAC signature is invalid', async () => {
      resetFakeDb(makeOrderFixture());
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber);
      const req = makeWebhookReq({ rawBody, signature: 'bogus_invalid_signature' });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.equal(txCalls.ran, false);
    });
  });

  describe('7. Same Webhook Replayed Twice → Idempotent', () => {
    it('should short-circuit duplicate webhook without creating duplicate payments or financial updates', async () => {
      const paymentId = 'pay_replay_777';
      resetFakeDb(
        makeOrderFixture({
          paymentStatus: 'CONFIRMED',
          payments: [{ transactionId: paymentId, status: 'SUCCESS' }],
        })
      );
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 500000, { paymentId });
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.isDuplicate, true);
      assert.equal(txCalls.ran, false, 'Replayed webhook MUST NOT run database transaction');
      assert.equal(txCalls.paymentCreated, false);
    });
  });

  describe('8. Already-Paid Payment Replay → No Duplicate Financial Effects', () => {
    it('should return idempotent success when verifying an already-confirmed order via verifyPayment', async () => {
      const paymentId = 'pay_verified_888';
      resetFakeDb(
        makeOrderFixture({
          paymentStatus: 'CONFIRMED',
          payments: [{ transactionId: paymentId, status: 'SUCCESS' }],
        })
      );
      storeSettingRows = [jsonRow('RAZORPAY_KEY_SECRET', KEY_SECRET)];

      const gatewayOrderId = 'order_rzp_888';
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
        },
      };
      const res = makeRes();

      await verifyPayment(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.isDuplicateCall, true);
      assert.equal(txCalls.ran, false);
    });
  });

  describe('9. Client Amount Differs From Authoritative Server Amount → Server Amount Wins', () => {
    it('should reject client verifyPayment request if client passes manipulated amount', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 5000 }));
      storeSettingRows = [jsonRow('RAZORPAY_KEY_SECRET', KEY_SECRET)];

      const gatewayOrderId = 'order_rzp_999';
      const paymentId = 'pay_999';
      const validSignature = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(`${gatewayOrderId}|${paymentId}`)
        .digest('hex');

      // Client attempts to pass amount ₹1 for ₹5000 order
      const req = {
        body: {
          orderNumber: orderDb.orderNumber,
          orderId: gatewayOrderId,
          paymentId,
          signature: validSignature,
          amount: 1, // Manipulated client amount!
        },
      };
      const res = makeRes();

      await verifyPayment(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes('Amount mismatch'));
      assert.equal(txCalls.ran, false, 'Manipulated client amount MUST NOT execute transaction');
    });
  });

  describe('10. Failed Payment (`payment.failed`) → Order NOT Confirmed', () => {
    it('should record failed payment attempt without confirming the order', async () => {
      resetFakeDb(makeOrderFixture({ paymentStatus: 'PENDING' }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 500000, {
        event: 'payment.failed',
        paymentId: 'pay_failed_100',
      });
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.event, 'payment.failed');
      assert.equal(txCalls.paymentCreated, true);
      assert.equal(txCalls.paymentData.status, 'FAILED');
      assert.equal(txCalls.orderUpdated, false, 'Failed payment MUST NOT update order to CONFIRMED');
    });
  });

  describe('11. Successful Payment Preserves Invoice Reconciliation', () => {
    it('should update invoice amountPaid to match server total and set balanceDue to 0', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 7500 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 750000); // ₹7500
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(txCalls.invoiceUpdated, true);
      assert.equal(txCalls.invoiceUpdateData.paymentStatus, 'PAID');
      assert.equal(txCalls.invoiceUpdateData.amountPaid, 7500);
      assert.equal(txCalls.invoiceUpdateData.balanceDue, 0);
    });
  });

  describe('12. Successful Payment Preserves Production Job Trigger', () => {
    it('should update production job status to ARTWORK_REVIEW for print-ready order', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 3000 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 300000);
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(txCalls.productionJobUpdated, true, 'Production job status MUST be updated on confirmation');
    });
  });

  describe('13. Integer-Paise Amount Precision Suite (Phase 0B.1)', () => {
    it('1. ₹500.00 expected / ₹500.00 paid (50000 paise) → ACCEPTED', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 500 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 50000); // 50000 paise = ₹500.00
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(txCalls.orderUpdated, true);
      assert.equal(txCalls.paymentData.status, 'SUCCESS');
    });

    it('2. ₹500.00 expected / ₹499.99 paid (49999 paise - 1 paise underpayment) → QUARANTINED', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 500 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 49999); // 49999 paise = ₹499.99
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.flagged, true);
      assert.equal(res.body.reason, 'AMOUNT_MISMATCH');
      assert.equal(txCalls.paymentData.status, 'UNDER_REVIEW');
      assert.equal(txCalls.orderUpdated, false, '1 paise underpayment MUST NOT be confirmed');
    });

    it('3. ₹500.00 expected / ₹499.10 paid (49910 paise - 90 paise underpayment) → QUARANTINED', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 500 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 49910); // 49910 paise = ₹499.10
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.flagged, true);
      assert.equal(res.body.reason, 'AMOUNT_MISMATCH');
      assert.equal(txCalls.paymentData.status, 'UNDER_REVIEW');
      assert.equal(txCalls.orderUpdated, false, '90 paise underpayment MUST NOT be confirmed');
    });

    it('4. ₹500.00 expected / ₹499.00 paid (49900 paise - ₹1 underpayment) → QUARANTINED', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 500 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 49900); // 49900 paise = ₹499.00
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.flagged, true);
      assert.equal(res.body.reason, 'AMOUNT_MISMATCH');
      assert.equal(txCalls.paymentData.status, 'UNDER_REVIEW');
      assert.equal(txCalls.orderUpdated, false, '₹1 underpayment MUST NOT be confirmed');
    });

    it('5. ₹500.00 expected / ₹500.01 paid (50001 paise - 1 paise overpayment) → QUARANTINED', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 500 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 50001); // 50001 paise = ₹500.01
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.flagged, true);
      assert.equal(res.body.reason, 'AMOUNT_MISMATCH');
      assert.equal(txCalls.paymentData.status, 'UNDER_REVIEW');
      assert.equal(txCalls.orderUpdated, false, '1 paise overpayment MUST NOT be silently confirmed');
    });

    it('6. ₹10.10 expected / ₹10.10 paid (1010 paise) → ACCEPTED (Floating Point Precision Test)', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 10.10 }));
      storeSettingRows = [jsonRow('RAZORPAY_TEST_WEBHOOK_SECRET', WEBHOOK_SECRET)];

      const rawBody = makeWebhookPayload(orderDb.orderNumber, 1010); // 1010 paise = ₹10.10
      const validSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

      const req = makeWebhookReq({ rawBody, signature: validSignature });
      const res = makeRes();

      await handlePaymentWebhook(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(txCalls.orderUpdated, true);
      assert.equal(txCalls.paymentData.status, 'SUCCESS');
    });

    it('7. Client verifyPayment with 1 paise underpayment (₹499.99 for ₹500.00) → REJECTED 400', async () => {
      resetFakeDb(makeOrderFixture({ grandTotal: 500 }));
      storeSettingRows = [jsonRow('RAZORPAY_KEY_SECRET', KEY_SECRET)];

      const gatewayOrderId = 'order_rzp_prec_1';
      const paymentId = 'pay_prec_1';
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
          amount: 499.99, // 1 paise underpayment!
        },
      };
      const res = makeRes();

      await verifyPayment(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes('Amount mismatch'));
      assert.equal(txCalls.ran, false);
    });
  });

});

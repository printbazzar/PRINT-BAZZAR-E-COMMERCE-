import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Set deterministic test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_phase0c1_998877';

// Fixtures for testing IDOR and Customer A vs Customer B authorization
const CUSTOMER_A = {
  id: 'cust_A_111',
  name: 'Customer A (Alice)',
  email: 'alice@example.com',
  mobile: '9876543210',
  accountType: 'B2C_RETAIL',
};

const CUSTOMER_B = {
  id: 'cust_B_222',
  name: 'Customer B (Bob)',
  email: 'bob@example.com',
  mobile: '9123456789',
  accountType: 'B2C_RETAIL',
};

const ADMIN_USER = {
  id: 'usr_admin_999',
  name: 'Super Admin',
  email: 'admin@printbazzar.online',
  role: 'Super Admin',
  permissions: ['ORDER_UPDATE', 'ORDER_VIEW', 'SETTINGS_EDIT'],
  isActive: true,
};

const STAFF_USER = {
  id: 'usr_staff_888',
  name: 'Staff Operator',
  email: 'staff@printbazzar.online',
  role: 'Operator',
  permissions: ['ORDER_UPDATE', 'ORDER_VIEW'],
  isActive: true,
};

// Orders database mock
const ORDER_B = {
  id: 'ord_B_id_999',
  orderNumber: 'PB-ORD-BOB-999',
  customerId: CUSTOMER_B.id,
  customerName: CUSTOMER_B.name,
  customerEmail: CUSTOMER_B.email,
  customerMobile: CUSTOMER_B.mobile,
  grandTotal: 1500,
  paymentStatus: 'PENDING',
  orderStatus: 'DESIGN_REVIEW',
  items: [{ id: 'item_B_1', designRequired: true, designCharge: 300 }],
  invoices: [{ id: 'inv_B_id_888', invoiceNumber: 'PB-INV-2026-00888', amountPaid: 0, balanceDue: 1500 }],
  designOrders: [{ id: 'des_B_id_777', orderId: 'ord_B_id_999', status: 'SENT_TO_CUSTOMER' }],
};

const ORDER_A = {
  id: 'ord_A_id_111',
  orderNumber: 'PB-ORD-ALICE-111',
  customerId: CUSTOMER_A.id,
  customerName: CUSTOMER_A.name,
  customerEmail: CUSTOMER_A.email,
  customerMobile: CUSTOMER_A.mobile,
  grandTotal: 2000,
  paymentStatus: 'PENDING',
  orderStatus: 'DESIGN_REVIEW',
  items: [{ id: 'item_A_1', designRequired: true, designCharge: 400 }],
  invoices: [{ id: 'inv_A_id_555', invoiceNumber: 'PB-INV-2026-00555', amountPaid: 0, balanceDue: 2000 }],
  designOrders: [{ id: 'des_A_id_444', orderId: 'ord_A_id_111', status: 'SENT_TO_CUSTOMER' }],
};

let dbOrders = [ORDER_A, ORDER_B];
let dbArtworkUploads = [
  { id: 'art_B_1', customerId: CUSTOMER_B.id, orderId: ORDER_B.id, fileUrl: '/uploads/bob_artwork.pdf' },
  { id: 'art_guest_1', customerId: null, orderId: ORDER_B.id, fileUrl: '/uploads/guest_artwork.pdf' },
];

const fakePrisma = {
  storeSetting: {
    findMany: async () => [],
    findUnique: async () => null,
  },
  customer: {
    findUnique: async ({ where }) => {
      if (where.id === CUSTOMER_A.id) return CUSTOMER_A;
      if (where.id === CUSTOMER_B.id) return CUSTOMER_B;
      return null;
    },
  },
  user: {
    findUnique: async ({ where }) => {
      if (where.id === ADMIN_USER.id) return ADMIN_USER;
      if (where.id === STAFF_USER.id) return STAFF_USER;
      return null;
    },
  },
  order: {
    findUnique: async ({ where }) => {
      return dbOrders.find((o) => (where.id && o.id === where.id) || (where.orderNumber && o.orderNumber === where.orderNumber)) || null;
    },
    findFirst: async ({ where }) => {
      if (where.OR) {
        return dbOrders.find((o) => where.OR.some((cond) => (cond && cond.id && o.id === cond.id) || (cond && cond.orderNumber && o.orderNumber === cond.orderNumber))) || null;
      }
      return null;
    },
    update: async ({ where, data }) => {
      const order = dbOrders.find((o) => o.id === where.id || o.orderNumber === where.orderNumber);
      if (order) Object.assign(order, data);
      return order;
    },
  },
  designOrder: {
    findUnique: async ({ where, include }) => {
      const des = dbOrders.flatMap((o) => o.designOrders).find((d) => d.id === where.id);
      if (!des) return null;
      if (include?.order) {
        const order = dbOrders.find((o) => o.id === des.orderId);
        return { ...des, order };
      }
      return des;
    },
    update: async ({ where, data }) => {
      const des = dbOrders.flatMap((o) => o.designOrders).find((d) => d.id === where.id);
      if (des) Object.assign(des, data);
      return des;
    },
    count: async () => 0,
  },
  designRevision: {
    findFirst: async () => null,
    update: async () => ({}),
  },
  artworkUpload: {
    findUnique: async ({ where }) => dbArtworkUploads.find((a) => a.id === where.id) || null,
    delete: async ({ where }) => {
      dbArtworkUploads = dbArtworkUploads.filter((a) => a.id !== where.id);
      return {};
    },
  },
  authSession: {
    findUnique: async () => ({ revoked: false, expiresAt: new Date(Date.now() + 86400000) }),
  },
  invoice: {
    count: async () => 1,
    create: async ({ data }) => data,
  },
  $transaction: async (fn) => {
    const tx = {
      order: {
        update: async ({ where, data }) => {
          const order = dbOrders.find((o) => o.id === where.id || o.orderNumber === where.orderNumber);
          if (order) Object.assign(order, data);
          return order;
        },
      },
      payment: { create: async () => ({}) },
      invoice: { updateMany: async () => ({}) },
      orderStatusHistory: { create: async () => ({}) },
      productionJob: { updateMany: async () => ({}) },
      designOrder: { updateMany: async () => ({}) },
      auditLog: { create: async () => ({}) },
    };
    return fn(tx);
  },
  productionJob: {
    findMany: async () => [],
    updateMany: async () => ({}),
  },
};

globalThis.prisma = fakePrisma;

const { convertToCod } = await import('../src/controllers/paymentController.js');
const { uploadArtwork } = await import('../src/controllers/orderController.js');
const { approveCustomerProof } = await import('../src/controllers/workflowController.js');
const { submitRevisionFeedback, approveDesign } = await import('../src/controllers/designServiceController.js');
const { getOrderInvoice } = await import('../src/controllers/invoiceController.js');
const { deleteArtworkFile } = await import('../src/controllers/artworkController.js');
const { isCustomerOrderOwner } = await import('../src/middleware/auth.js');

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

describe('Phase 0C.1 — Critical Authorization Protection Suite', () => {

  describe('1. Unauthenticated Requests → Rejected (401)', () => {
    it('1.1 Unauthenticated COD conversion → 401', async () => {
      const req = { body: { orderNumber: ORDER_B.orderNumber } };
      const res = makeRes();
      await convertToCod(req, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
    });

    it('1.2 Unauthenticated artwork upload → 401', async () => {
      const req = { file: { filename: 'test.pdf', originalname: 'test.pdf', size: 100 }, body: { orderNumber: ORDER_B.orderNumber } };
      const res = makeRes();
      await uploadArtwork(req, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
    });

    it('1.3 Unauthenticated proof approval → 401', async () => {
      const req = { params: { orderNumber: ORDER_B.orderNumber }, body: { action: 'APPROVED' } };
      const res = makeRes();
      await approveCustomerProof(req, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
    });

    it('1.4 Unauthenticated design feedback → 401', async () => {
      const req = { params: { id: ORDER_B.designOrders[0].id }, body: { customerComment: 'Hacker comment' } };
      const res = makeRes();
      await submitRevisionFeedback(req, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
    });

    it('1.5 Unauthenticated design approval → 401', async () => {
      const req = { params: { id: ORDER_B.designOrders[0].id }, body: {} };
      const res = makeRes();
      await approveDesign(req, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
    });

    it('1.6 Unauthenticated invoice access → 401', async () => {
      const req = { params: { orderId: ORDER_B.id } };
      const res = makeRes();
      await getOrderInvoice(req, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
    });
  });

  describe('2. IDOR Protection: Customer A Attempts Access to Customer B Order → Denied (403)', () => {
    it('2.1 Customer A attempting COD conversion on Customer B order → 403 Forbidden', async () => {
      const req = { customer: CUSTOMER_A, body: { orderNumber: ORDER_B.orderNumber } };
      const res = makeRes();
      await convertToCod(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes('Forbidden'));
    });

    it('2.2 Customer A attempting artwork upload to Customer B order → 403 Forbidden', async () => {
      const req = {
        customer: CUSTOMER_A,
        file: { filename: 'malicious.pdf', originalname: 'malicious.pdf', size: 100 },
        body: { orderNumber: ORDER_B.orderNumber },
      };
      const res = makeRes();
      await uploadArtwork(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('2.3 Customer A attempting proof approval on Customer B order → 403 Forbidden', async () => {
      const req = {
        customer: CUSTOMER_A,
        params: { orderNumber: ORDER_B.orderNumber },
        body: { action: 'APPROVED' },
      };
      const res = makeRes();
      await approveCustomerProof(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('2.4 Customer A attempting design feedback on Customer B design order → 403 Forbidden', async () => {
      const req = {
        customer: CUSTOMER_A,
        params: { id: ORDER_B.designOrders[0].id },
        body: { customerComment: 'Hacked feedback' },
      };
      const res = makeRes();
      await submitRevisionFeedback(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('2.5 Customer A attempting design approval on Customer B design order → 403 Forbidden', async () => {
      const req = {
        customer: CUSTOMER_A,
        params: { id: ORDER_B.designOrders[0].id },
        body: {},
      };
      const res = makeRes();
      await approveDesign(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('2.6 Customer A attempting access to Customer B invoice → 403 Forbidden', async () => {
      const req = {
        customer: CUSTOMER_A,
        params: { orderId: ORDER_B.id },
      };
      const res = makeRes();
      await getOrderInvoice(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('2.7 Customer A attempting deletion of Customer B artwork file → 403 Forbidden', async () => {
      const req = {
        customer: CUSTOMER_A,
        params: { id: 'art_B_1' },
      };
      const res = makeRes();
      await deleteArtworkFile(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('2.8 Customer A attempting deletion of Guest artwork on Customer B order → 403 Forbidden', async () => {
      const req = {
        customer: CUSTOMER_A,
        params: { id: 'art_guest_1' },
      };
      const res = makeRes();
      await deleteArtworkFile(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });
  });

  describe('3. Legitimate Owner Customer Access → Allowed (200)', () => {
    it('3.1 Customer A converting own order to COD → Allowed', async () => {
      const req = { customer: CUSTOMER_A, body: { orderNumber: ORDER_A.orderNumber } };
      const res = makeRes();
      await convertToCod(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
    });

    it('3.2 Customer A approving proof for own order → Allowed', async () => {
      const req = { customer: CUSTOMER_A, params: { orderNumber: ORDER_A.orderNumber }, body: { action: 'APPROVED' } };
      const res = makeRes();
      await approveCustomerProof(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
    });

    it('3.3 Customer A submitting design feedback for own design order → Allowed', async () => {
      const req = { customer: CUSTOMER_A, params: { id: ORDER_A.designOrders[0].id }, body: { customerComment: 'Looks great!' } };
      const res = makeRes();
      await submitRevisionFeedback(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
    });

    it('3.4 Customer A fetching invoice for own order → Allowed', async () => {
      const req = { customer: CUSTOMER_A, params: { orderId: ORDER_A.id } };
      const res = makeRes();
      await getOrderInvoice(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
    });
  });

  describe('4. Authorized Staff / Admin Access → Allowed (200)', () => {
    it('4.1 Admin accessing any customer invoice → Allowed', async () => {
      const req = { user: ADMIN_USER, params: { orderId: ORDER_B.id } };
      const res = makeRes();
      await getOrderInvoice(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
    });

    it('4.2 Staff with ORDER_UPDATE converting order to COD → Allowed', async () => {
      const req = { user: STAFF_USER, body: { orderNumber: ORDER_B.orderNumber } };
      const res = makeRes();
      await convertToCod(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
    });
  });

  describe('5. Authoritative Customer Ownership Invariants (Phase 0C.1.1)', () => {
    it('5.1 Registered customer owns registered order (matching customerId) → ALLOW', () => {
      const order = { id: 'ord_1', customerId: 'cust_A' };
      const customer = { id: 'cust_A' };
      assert.equal(isCustomerOrderOwner(order, customer), true);
    });

    it('5.2 Registered customer does NOT own another registered customer order (mismatched customerId) → DENY', () => {
      const order = { id: 'ord_2', customerId: 'cust_B' };
      const customer = { id: 'cust_A' };
      assert.equal(isCustomerOrderOwner(order, customer), false);
    });

    it('5.3 Same mobile but different customerId → DENY (No mobile fallback when order.customerId is present)', () => {
      const order = { id: 'ord_3', customerId: 'cust_B', customerMobile: '9999999999' };
      const customerA = { id: 'cust_A', mobile: '9999999999' };
      assert.equal(isCustomerOrderOwner(order, customerA), false);
    });

    it('5.4 Same email but different customerId → DENY (No email fallback when order.customerId is present)', () => {
      const order = { id: 'ord_4', customerId: 'cust_B', customerEmail: 'shared@example.com' };
      const customerA = { id: 'cust_A', email: 'shared@example.com' };
      assert.equal(isCustomerOrderOwner(order, customerA), false);
    });

    it('5.5 Different customerId with BOTH mobile AND email matching → DENY', () => {
      const order = { id: 'ord_5', customerId: 'cust_B', customerMobile: '9999999999', customerEmail: 'shared@example.com' };
      const customerA = { id: 'cust_A', mobile: '9999999999', email: 'shared@example.com' };
      assert.equal(isCustomerOrderOwner(order, customerA), false);
    });

    it('5.6 Guest order (order.customerId = null) with matching mobile/email → ALLOW', () => {
      const guestOrder = { id: 'ord_guest_1', customerId: null, customerMobile: '9876543210', customerEmail: 'guest@example.com' };
      const customer = { id: 'cust_A', mobile: '9876543210', email: 'guest@example.com' };
      assert.equal(isCustomerOrderOwner(guestOrder, customer), true);
    });

    it('5.7 Guest order (order.customerId = null) with non-matching mobile/email → DENY', () => {
      const guestOrder = { id: 'ord_guest_2', customerId: null, customerMobile: '1111111111', customerEmail: 'other@example.com' };
      const customer = { id: 'cust_A', mobile: '9876543210', email: 'alice@example.com' };
      assert.equal(isCustomerOrderOwner(guestOrder, customer), false);
    });

    it('5.8 Customer A cannot approve Customer B proof → DENY', async () => {
      const req = { customer: CUSTOMER_A, params: { orderNumber: ORDER_B.orderNumber }, body: { action: 'APPROVED' } };
      const res = makeRes();
      await approveCustomerProof(req, res);
      assert.equal(res.statusCode, 403);
    });

    it('5.9 Customer A cannot retrieve Customer B invoice → DENY', async () => {
      const req = { customer: CUSTOMER_A, params: { orderId: ORDER_B.id } };
      const res = makeRes();
      await getOrderInvoice(req, res);
      assert.equal(res.statusCode, 403);
    });

    it('5.10 Customer A cannot delete Customer B artwork → DENY', async () => {
      const req = { customer: CUSTOMER_A, params: { id: 'art_B_1' } };
      const res = makeRes();
      await deleteArtworkFile(req, res);
      assert.equal(res.statusCode, 403);
    });

    it('5.11 Customer A cannot upload artwork to Customer B order → DENY', async () => {
      const req = { customer: CUSTOMER_A, file: { filename: 'a.pdf' }, body: { orderNumber: ORDER_B.orderNumber } };
      const res = makeRes();
      await uploadArtwork(req, res);
      assert.equal(res.statusCode, 403);
    });

    it('5.12 Customer A cannot convert Customer B order to COD → DENY', async () => {
      const req = { customer: CUSTOMER_A, body: { orderNumber: ORDER_B.orderNumber } };
      const res = makeRes();
      await convertToCod(req, res);
      assert.equal(res.statusCode, 403);
    });
  });

});

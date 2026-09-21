import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Set deterministic test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_phase0c2_112233';

// Fixtures for Customer Data Isolation testing
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
  email: 'alice@example.com', // Shared email edge case fixture
  mobile: '9876543210', // Shared mobile edge case fixture
  accountType: 'B2C_RETAIL',
};

const ORDER_A_REG = {
  id: 'ord_A_111',
  orderNumber: 'PB-ORD-A-111',
  customerId: CUSTOMER_A.id,
  customerName: CUSTOMER_A.name,
  customerEmail: 'alice@example.com',
  customerMobile: '9876543210',
  grandTotal: 1000,
  orderStatus: 'ORDER_REVIEW',
  items: [{ productId: 'p1', quantity: 2, optionsSnapshot: '{}', designRequired: false }],
};

const ORDER_B_REG = {
  id: 'ord_B_222',
  orderNumber: 'PB-ORD-B-222',
  customerId: CUSTOMER_B.id, // Assigned to Customer B
  customerName: CUSTOMER_B.name,
  customerEmail: 'alice@example.com', // Contains Alice's email
  customerMobile: '9876543210', // Contains Alice's mobile
  grandTotal: 2500,
  orderStatus: 'PRODUCTION_QUEUE',
  items: [{ productId: 'p2', quantity: 1, optionsSnapshot: '{}', designRequired: true }],
};

const GUEST_ORDER_MATCH = {
  id: 'ord_guest_match',
  orderNumber: 'PB-ORD-G-333',
  customerId: null, // Unassigned Guest Order
  customerName: 'Guest Alice',
  customerEmail: 'alice@example.com',
  customerMobile: '9876543210',
  grandTotal: 500,
  orderStatus: 'DELIVERED',
  items: [],
};

const GUEST_ORDER_OTHER = {
  id: 'ord_guest_other',
  orderNumber: 'PB-ORD-G-444',
  customerId: null, // Unassigned Guest Order
  customerName: 'Other Guest',
  customerEmail: 'other@example.com',
  customerMobile: '1111111111',
  grandTotal: 300,
  orderStatus: 'DELIVERED',
  items: [],
};

const ARTWORK_A = {
  id: 'art_A_1',
  customerId: CUSTOMER_A.id,
  orderId: ORDER_A_REG.id,
  fileName: 'alice_artwork.pdf',
  fileUrl: '/uploads/alice_artwork.pdf',
};

const ARTWORK_B = {
  id: 'art_B_2',
  customerId: CUSTOMER_B.id,
  orderId: ORDER_B_REG.id,
  fileName: 'bob_artwork.pdf',
  fileUrl: '/uploads/bob_artwork.pdf',
};

// Edge-case fixtures for authoritative artwork ownership
const ARTWORK_B_LINKED_TO_A = {
  id: 'art_B_linked_A',
  customerId: CUSTOMER_B.id, // Assigned to Customer B
  orderId: ORDER_A_REG.id,   // Linked to Customer A's order
  fileName: 'b_linked_a.pdf',
  fileUrl: '/uploads/b_linked_a.pdf',
};

const ARTWORK_NULL_LINKED_TO_A = {
  id: 'art_null_linked_A',
  customerId: null,          // Unassigned guest upload
  orderId: ORDER_A_REG.id,   // Linked to Customer A's order
  fileName: 'null_linked_a.pdf',
  fileUrl: '/uploads/null_linked_a.pdf',
};

const ADMIN_USER = {
  id: 'usr_admin_999',
  role: 'Super Admin',
  permissions: ['ORDER_VIEW'],
};

const UNAUTH_STAFF = {
  id: 'usr_staff_no_perm',
  role: 'Operator',
  permissions: [],
};

const dbOrders = [ORDER_A_REG, ORDER_B_REG, GUEST_ORDER_MATCH, GUEST_ORDER_OTHER];
const dbArtworks = [ARTWORK_A, ARTWORK_B, ARTWORK_B_LINKED_TO_A, ARTWORK_NULL_LINKED_TO_A];

const fakePrisma = {
  storeSetting: { findMany: async () => [], findUnique: async () => null },
  customer: {
    findUnique: async ({ where }) => {
      if (where.id === CUSTOMER_A.id) return CUSTOMER_A;
      if (where.id === CUSTOMER_B.id) return CUSTOMER_B;
      return null;
    },
  },
  order: {
    findMany: async ({ where }) => {
      // Implement Prisma OR filtering simulation
      return dbOrders.filter((order) => {
        if (!where?.OR) return true;
        return where.OR.some((clause) => {
          if (clause.customerId && clause.customerId === order.customerId) return true;
          if (clause.customerId === null && order.customerId === null) {
            if (!clause.OR) return true;
            return clause.OR.some((guestCond) => {
              if (guestCond.customerMobile && guestCond.customerMobile === order.customerMobile) return true;
              if (guestCond.customerEmail && guestCond.customerEmail === order.customerEmail) return true;
              return false;
            });
          }
          return false;
        });
      });
    },
    findUnique: async ({ where }) => dbOrders.find((o) => o.id === where.id || o.orderNumber === where.orderNumber) || null,
  },
  artworkUpload: {
    findUnique: async ({ where }) => {
      const art = dbArtworks.find((a) => a.id === where.id);
      if (!art) return null;
      const order = dbOrders.find((o) => o.id === art.orderId);
      return { ...art, order };
    },
  },
};

globalThis.prisma = fakePrisma;

const { getCustomerProfile, getCustomerOrders, reorderPreviousOrder } = await import('../src/controllers/customerAuthController.js');
const { getArtworkUploadById } = await import('../src/controllers/artworkController.js');

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

describe('Phase 0C.2 — Customer Data Isolation Suite', () => {

  describe('GROUP A — Order History Isolation (getCustomerProfile & getCustomerOrders)', () => {
    it('1. Customer A sees own registered orders', async () => {
      const req = { customer: CUSTOMER_A };
      const res = makeRes();
      await getCustomerOrders(req, res);
      assert.equal(res.statusCode, 200);
      const orderIds = res.body.data.map((o) => o.id);
      assert.ok(orderIds.includes(ORDER_A_REG.id));
    });

    it('2. Customer A cannot see Customer B registered orders', async () => {
      const req = { customer: CUSTOMER_A };
      const res = makeRes();
      await getCustomerOrders(req, res);
      assert.equal(res.statusCode, 200);
      const orderIds = res.body.data.map((o) => o.id);
      assert.equal(orderIds.includes(ORDER_B_REG.id), false);
    });

    it('3. Shared mobile: Registered Customer B order does NOT appear for Customer A', async () => {
      const req = { customer: CUSTOMER_A };
      const res = makeRes();
      await getCustomerProfile(req, res);
      assert.equal(res.statusCode, 200);
      const recentIds = res.body.data.recentOrders.map((o) => o.id);
      assert.equal(recentIds.includes(ORDER_B_REG.id), false);
    });

    it('4. Shared email: Registered Customer B order does NOT appear for Customer A', async () => {
      const req = { customer: CUSTOMER_A };
      const res = makeRes();
      await getCustomerOrders(req, res);
      assert.equal(res.statusCode, 200);
      const orderIds = res.body.data.map((o) => o.id);
      assert.equal(orderIds.includes(ORDER_B_REG.id), false);
    });

    it('5. Shared mobile + email: Registered Customer B order does NOT appear for Customer A', async () => {
      const req = { customer: CUSTOMER_A };
      const res = makeRes();
      await getCustomerOrders(req, res);
      assert.equal(res.statusCode, 200);
      const containsOrderB = res.body.data.some((o) => o.id === ORDER_B_REG.id);
      assert.equal(containsOrderB, false);
    });

    it('6. Guest order with matching mobile remains accessible in profile/history', async () => {
      const req = { customer: CUSTOMER_A };
      const res = makeRes();
      await getCustomerOrders(req, res);
      assert.equal(res.statusCode, 200);
      const orderIds = res.body.data.map((o) => o.id);
      assert.ok(orderIds.includes(GUEST_ORDER_MATCH.id));
    });

    it('7. Guest order with non-matching identity is excluded', async () => {
      const req = { customer: CUSTOMER_A };
      const res = makeRes();
      await getCustomerOrders(req, res);
      assert.equal(res.statusCode, 200);
      const orderIds = res.body.data.map((o) => o.id);
      assert.equal(orderIds.includes(GUEST_ORDER_OTHER.id), false);
    });
  });

  describe('GROUP B — Reorder & Artwork Metadata IDOR Guards', () => {
    it('8. Customer A can reorder own order → 200 OK', async () => {
      const req = { customer: CUSTOMER_A, params: { orderId: ORDER_A_REG.id } };
      const res = makeRes();
      await reorderPreviousOrder(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.items);
    });

    it('9. Customer A cannot reorder Customer B order → 403 Forbidden', async () => {
      const req = { customer: CUSTOMER_A, params: { orderId: ORDER_B_REG.id } };
      const res = makeRes();
      await reorderPreviousOrder(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes('Forbidden'));
    });

    it('10. Reorder with matching mobile/email but different customerId → 403 Forbidden', async () => {
      const req = { customer: CUSTOMER_A, params: { orderId: ORDER_B_REG.id } };
      const res = makeRes();
      await reorderPreviousOrder(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('11. Customer A + artwork.customerId = A → 200 OK', async () => {
      const req = { customer: CUSTOMER_A, params: { id: ARTWORK_A.id } };
      const res = makeRes();
      await getArtworkUploadById(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, ARTWORK_A.id);
    });

    it('12. Customer B + artwork.customerId = A → 403 Forbidden', async () => {
      const req = { customer: CUSTOMER_B, params: { id: ARTWORK_A.id } };
      const res = makeRes();
      await getArtworkUploadById(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('13. Customer A + artwork.customerId = B + linked order owned by A → MUST be 403 Forbidden (No fallback)', async () => {
      const req = { customer: CUSTOMER_A, params: { id: ARTWORK_B_LINKED_TO_A.id } };
      const res = makeRes();
      await getArtworkUploadById(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('14. Customer A + artwork.customerId = null + linked order owned by A → 200 OK', async () => {
      const req = { customer: CUSTOMER_A, params: { id: ARTWORK_NULL_LINKED_TO_A.id } };
      const res = makeRes();
      await getArtworkUploadById(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
    });

    it('15. Customer B + artwork.customerId = null + linked order owned by A → 403 Forbidden', async () => {
      const req = { customer: CUSTOMER_B, params: { id: ARTWORK_NULL_LINKED_TO_A.id } };
      const res = makeRes();
      await getArtworkUploadById(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });

    it('16. Unauthenticated artwork metadata fetch → 401 Unauthorized', async () => {
      const req = { params: { id: ARTWORK_A.id } };
      const res = makeRes();
      await getArtworkUploadById(req, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
    });

    it('17. Authorized Admin fetching artwork metadata → 200 OK', async () => {
      const req = { user: ADMIN_USER, params: { id: ARTWORK_A.id } };
      const res = makeRes();
      await getArtworkUploadById(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
    });

    it('18. Unauthorized staff fetching artwork metadata → 403 Forbidden', async () => {
      const req = { user: UNAUTH_STAFF, params: { id: ARTWORK_A.id } };
      const res = makeRes();
      await getArtworkUploadById(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });
  });

});

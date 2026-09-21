import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  signAccessToken,
  signRefreshToken,
  signToken,
  verifyToken,
  verifyRefreshToken,
} from '../src/config/jwt.js';
import {
  authenticateAdmin,
  authenticateCustomer,
  authenticateCustomerOrAdmin,
  optionalCustomerOrAdmin,
} from '../src/middleware/auth.js';

// Mock prisma for offline unit testing
import prisma from '../src/lib/prisma.js';

// Setup Mock Data
const MOCK_STAFF_USER = {
  id: 'user_staff_001',
  name: 'Admin User',
  email: 'admin@printbazzar.com',
  department: 'ADMIN',
  isActive: true,
  role: {
    name: 'Super Admin',
    permissions: [
      { permission: { code: 'MANAGE_USERS' } },
      { permission: { code: 'ORDER_READ' } },
    ],
  },
};

const MOCK_CUSTOMER = {
  id: 'cust_001',
  name: 'Jane Customer',
  email: 'jane@example.com',
  mobile: '9876543210',
  accountType: 'RETAIL',
  savedAddresses: [],
};

// Override Prisma methods for offline testing
prisma.user.findUnique = async ({ where }) => {
  if (where.id === MOCK_STAFF_USER.id) {
    return MOCK_STAFF_USER;
  }
  return null;
};

prisma.customer.findUnique = async ({ where }) => {
  if (where.id === MOCK_CUSTOMER.id) {
    return MOCK_CUSTOMER;
  }
  return null;
};

describe('Phase 0C.3.1 — Token Type & Domain Boundary Security Suite', () => {

  describe('GROUP 1: Token Signing Default Claims Verification', () => {

    it('1.1 signAccessToken attaches tokenType: ACCESS by default', () => {
      const token = signAccessToken({ userId: MOCK_STAFF_USER.id, userType: 'STAFF' });
      const decoded = verifyToken(token);
      assert.equal(decoded.tokenType, 'ACCESS');
      assert.equal(decoded.userType, 'STAFF');
      assert.equal(decoded.userId, MOCK_STAFF_USER.id);
    });

    it('1.2 signRefreshToken attaches tokenType: REFRESH by default', () => {
      const token = signRefreshToken({ userId: MOCK_STAFF_USER.id, userType: 'STAFF' });
      const decoded = verifyRefreshToken(token);
      assert.equal(decoded.tokenType, 'REFRESH');
      assert.equal(decoded.userType, 'STAFF');
      assert.equal(decoded.userId, MOCK_STAFF_USER.id);
    });

    it('1.3 signToken attaches tokenType: ACCESS by default', () => {
      const token = signToken({ id: MOCK_CUSTOMER.id, userType: 'CUSTOMER' });
      const decoded = verifyToken(token);
      assert.equal(decoded.tokenType, 'ACCESS');
      assert.equal(decoded.userType, 'CUSTOMER');
    });

  });

  describe('GROUP 2: authenticateAdmin Token Type & Domain Security', () => {

    it('2.1 Valid Staff Access Token → 200 / Next called', async () => {
      const token = signAccessToken({ userId: MOCK_STAFF_USER.id, userType: 'STAFF' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await authenticateAdmin(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.id, MOCK_STAFF_USER.id);
      assert.equal(req.user.role, 'Super Admin');
    });

    it('2.2 Staff Refresh Token sent to authenticateAdmin → 401 Unauthorized', async () => {
      const refreshToken = signRefreshToken({ userId: MOCK_STAFF_USER.id, userType: 'STAFF' });
      const req = { headers: { authorization: `Bearer ${refreshToken}` } };
      let resStatus = null;
      let resBody = null;
      const res = {
        status: (code) => { resStatus = code; return res; },
        json: (body) => { resBody = body; return res; },
      };

      await authenticateAdmin(req, res, () => {});

      assert.equal(resStatus, 401);
      assert.equal(resBody.success, false);
      assert.match(resBody.message, /Invalid token type|Invalid or expired/i);
    });

    it('2.3 Customer Access Token sent to authenticateAdmin → 401 Unauthorized', async () => {
      const custToken = signAccessToken({ id: MOCK_CUSTOMER.id, userType: 'CUSTOMER' });
      const req = { headers: { authorization: `Bearer ${custToken}` } };
      let resStatus = null;
      let resBody = null;
      const res = {
        status: (code) => { resStatus = code; return res; },
        json: (body) => { resBody = body; return res; },
      };

      await authenticateAdmin(req, res, () => {});

      assert.equal(resStatus, 401);
      assert.equal(resBody.success, false);
      assert.match(resBody.message, /Invalid token domain/i);
    });

    it('2.4 Token with isCustomer: true sent to authenticateAdmin → 401 Unauthorized', async () => {
      const custToken = signAccessToken({ id: MOCK_STAFF_USER.id, isCustomer: true });
      const req = { headers: { authorization: `Bearer ${custToken}` } };
      let resStatus = null;
      let resBody = null;
      const res = {
        status: (code) => { resStatus = code; return res; },
        json: (body) => { resBody = body; return res; },
      };

      await authenticateAdmin(req, res, () => {});

      assert.equal(resStatus, 401);
      assert.equal(resBody.success, false);
      assert.match(resBody.message, /Invalid token domain/i);
    });

  });

  describe('GROUP 3: authenticateCustomer Token Type & Domain Security', () => {

    it('3.1 Valid Customer Access Token → Next called with req.customer', async () => {
      const token = signAccessToken({ id: MOCK_CUSTOMER.id, userType: 'CUSTOMER' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await authenticateCustomer(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.ok(req.customer);
      assert.equal(req.customer.id, MOCK_CUSTOMER.id);
    });

    it('3.2 Customer Refresh Token sent to authenticateCustomer → 401 Unauthorized', async () => {
      const refreshToken = signRefreshToken({ id: MOCK_CUSTOMER.id, userType: 'CUSTOMER' });
      const req = { headers: { authorization: `Bearer ${refreshToken}` } };
      let resStatus = null;
      let resBody = null;
      const res = {
        status: (code) => { resStatus = code; return res; },
        json: (body) => { resBody = body; return res; },
      };

      await authenticateCustomer(req, res, () => {});

      assert.equal(resStatus, 401);
      assert.equal(resBody.success, false);
      assert.match(resBody.message, /Invalid token type|Invalid or expired/i);
    });

    it('3.3 Staff Access Token sent to authenticateCustomer → 401 Unauthorized', async () => {
      const staffToken = signAccessToken({ userId: MOCK_STAFF_USER.id, userType: 'STAFF' });
      const req = { headers: { authorization: `Bearer ${staffToken}` } };
      let resStatus = null;
      let resBody = null;
      const res = {
        status: (code) => { resStatus = code; return res; },
        json: (body) => { resBody = body; return res; },
      };

      await authenticateCustomer(req, res, () => {});

      assert.equal(resStatus, 401);
      assert.equal(resBody.success, false);
      assert.match(resBody.message, /Invalid token domain/i);
    });

  });

  describe('GROUP 4: authenticateCustomerOrAdmin & optionalCustomerOrAdmin Security', () => {

    it('4.1 authenticateCustomerOrAdmin with Staff Access Token → Populates req.user', async () => {
      const token = signAccessToken({ userId: MOCK_STAFF_USER.id, userType: 'STAFF' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await authenticateCustomerOrAdmin(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.id, MOCK_STAFF_USER.id);
      assert.equal(req.customer, undefined);
    });

    it('4.2 authenticateCustomerOrAdmin with Customer Access Token → Populates req.customer', async () => {
      const token = signAccessToken({ id: MOCK_CUSTOMER.id, userType: 'CUSTOMER' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      let nextCalled = false;

      await authenticateCustomerOrAdmin(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.ok(req.customer);
      assert.equal(req.customer.id, MOCK_CUSTOMER.id);
      assert.equal(req.user, undefined);
    });

    it('4.3 authenticateCustomerOrAdmin with Refresh Token → 401 Unauthorized', async () => {
      const refreshToken = signRefreshToken({ userId: MOCK_STAFF_USER.id, userType: 'STAFF' });
      const req = { headers: { authorization: `Bearer ${refreshToken}` } };
      let resStatus = null;
      let resBody = null;
      const res = {
        status: (code) => { resStatus = code; return res; },
        json: (body) => { resBody = body; return res; },
      };

      await authenticateCustomerOrAdmin(req, res, () => {});

      assert.equal(resStatus, 401);
      assert.equal(resBody.success, false);
      assert.match(resBody.message, /Invalid token type|Invalid or expired/i);
    });

    it('4.4 optionalCustomerOrAdmin with Refresh Token → Ignores token and calls next()', async () => {
      const refreshToken = signRefreshToken({ id: MOCK_CUSTOMER.id, userType: 'CUSTOMER' });
      const req = { headers: { authorization: `Bearer ${refreshToken}` } };
      const res = {};
      let nextCalled = false;

      await optionalCustomerOrAdmin(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.equal(req.user, undefined);
      assert.equal(req.customer, undefined);
    });

  });

});

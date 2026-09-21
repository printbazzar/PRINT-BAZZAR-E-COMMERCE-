import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// Setup test-only secrets in process.env BEFORE importing jwt module
const TEST_ACCESS_SECRET = 'test_only_access_secret_998877665544332211';
const TEST_REFRESH_SECRET = 'test_only_refresh_secret_112233445566778899';
const TEST_LEGACY_SECRET = 'test_only_legacy_secret_555555555555555555';

process.env.JWT_ACCESS_SECRET = TEST_ACCESS_SECRET;
process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
process.env.JWT_SECRET = TEST_LEGACY_SECRET;

// Dynamically import jwt module after env vars set
const {
  signAccessToken,
  signRefreshToken,
  signToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyToken,
  JWT_ISSUER,
  JWT_ACCESS_AUDIENCE,
  JWT_REFRESH_AUDIENCE,
} = await import('../src/config/jwt.js');

const {
  authenticateAdmin,
  authenticateCustomer,
} = await import('../src/middleware/auth.js');

// Mock prisma for offline unit testing
import prisma from '../src/lib/prisma.js';

const MOCK_STAFF = {
  id: 'user_staff_001',
  name: 'Staff Admin',
  email: 'staff@example.com',
  isActive: true,
  role: { name: 'Admin', permissions: [] },
};

const MOCK_CUSTOMER = {
  id: 'cust_001',
  name: 'Customer One',
  email: 'customer@example.com',
  savedAddresses: [],
};

prisma.user.findUnique = async ({ where }) => {
  if (where.id === MOCK_STAFF.id) return MOCK_STAFF;
  return null;
};

prisma.customer.findUnique = async ({ where }) => {
  if (where.id === MOCK_CUSTOMER.id) return MOCK_CUSTOMER;
  return null;
};

describe('Phase 0C.3.2 — JWT Secret Separation & Standard Claims Suite', () => {

  describe('GROUP 1: Secret Separation', () => {

    it('1. Access token signs with dedicated access secret', () => {
      const token = signAccessToken({ userId: MOCK_STAFF.id, userType: 'STAFF' });
      // Direct raw jwt.verify using TEST_ACCESS_SECRET must succeed
      const rawDecoded = jwt.verify(token, TEST_ACCESS_SECRET);
      assert.equal(rawDecoded.userId, MOCK_STAFF.id);
    });

    it('2. Refresh token signs with dedicated refresh secret', () => {
      const token = signRefreshToken({ userId: MOCK_STAFF.id, userType: 'STAFF' });
      // Direct raw jwt.verify using TEST_REFRESH_SECRET must succeed
      const rawDecoded = jwt.verify(token, TEST_REFRESH_SECRET);
      assert.equal(rawDecoded.userId, MOCK_STAFF.id);
    });

    it('3. Access verifier rejects token signed ONLY with refresh secret', () => {
      const token = jwt.sign(
        { tokenType: 'ACCESS', userType: 'STAFF', userId: MOCK_STAFF.id, iss: JWT_ISSUER, aud: JWT_ACCESS_AUDIENCE },
        TEST_REFRESH_SECRET
      );
      assert.throws(() => {
        verifyAccessToken(token);
      }, /invalid signature/i);
    });

    it('4. Refresh verifier rejects token signed ONLY with access secret', () => {
      const token = jwt.sign(
        { tokenType: 'REFRESH', userType: 'STAFF', userId: MOCK_STAFF.id, iss: JWT_ISSUER, aud: JWT_REFRESH_AUDIENCE },
        TEST_ACCESS_SECRET
      );
      assert.throws(() => {
        verifyRefreshToken(token);
      }, /invalid signature/i);
    });

  });

  describe('GROUP 2: Standard Claims (iss & aud)', () => {

    it('5. Access token has correct iss claim (print-bazzar-api)', () => {
      const token = signAccessToken({ userId: MOCK_STAFF.id });
      const decoded = verifyAccessToken(token);
      assert.equal(decoded.iss, JWT_ISSUER);
    });

    it('6. Access token has correct access aud claim (print-bazzar-access)', () => {
      const token = signAccessToken({ userId: MOCK_STAFF.id });
      const decoded = verifyAccessToken(token);
      assert.equal(decoded.aud, JWT_ACCESS_AUDIENCE);
    });

    it('7. Refresh token has correct iss claim (print-bazzar-api)', () => {
      const token = signRefreshToken({ userId: MOCK_STAFF.id });
      const decoded = verifyRefreshToken(token);
      assert.equal(decoded.iss, JWT_ISSUER);
    });

    it('8. Refresh token has correct refresh aud claim (print-bazzar-refresh)', () => {
      const token = signRefreshToken({ userId: MOCK_STAFF.id });
      const decoded = verifyRefreshToken(token);
      assert.equal(decoded.aud, JWT_REFRESH_AUDIENCE);
    });

  });

  describe('GROUP 3: Issuer & Audience Validation', () => {

    it('9. Wrong issuer rejected by verifier', () => {
      const token = jwt.sign(
        { tokenType: 'ACCESS', userType: 'STAFF', userId: MOCK_STAFF.id, iss: 'malicious-issuer', aud: JWT_ACCESS_AUDIENCE },
        TEST_ACCESS_SECRET
      );
      assert.throws(() => {
        verifyAccessToken(token);
      }, /jwt issuer invalid/i);
    });

    it('10. Wrong access audience rejected', () => {
      const token = jwt.sign(
        { tokenType: 'ACCESS', userType: 'STAFF', userId: MOCK_STAFF.id, iss: JWT_ISSUER, aud: JWT_REFRESH_AUDIENCE },
        TEST_ACCESS_SECRET
      );
      assert.throws(() => {
        verifyAccessToken(token);
      }, /jwt audience invalid/i);
    });

    it('11. Wrong refresh audience rejected', () => {
      const token = jwt.sign(
        { tokenType: 'REFRESH', userType: 'STAFF', userId: MOCK_STAFF.id, iss: JWT_ISSUER, aud: JWT_ACCESS_AUDIENCE },
        TEST_REFRESH_SECRET
      );
      assert.throws(() => {
        verifyRefreshToken(token);
      }, /jwt audience invalid/i);
    });

    it('12. Missing issuer rejected for new-token verification', () => {
      const token = jwt.sign(
        { tokenType: 'ACCESS', userType: 'STAFF', userId: MOCK_STAFF.id, aud: JWT_ACCESS_AUDIENCE },
        TEST_ACCESS_SECRET
      );
      assert.throws(() => {
        verifyAccessToken(token);
      }, /jwt issuer invalid/i);
    });

    it('13. Missing audience rejected for new-token verification', () => {
      const token = jwt.sign(
        { tokenType: 'ACCESS', userType: 'STAFF', userId: MOCK_STAFF.id, iss: JWT_ISSUER },
        TEST_ACCESS_SECRET
      );
      assert.throws(() => {
        verifyAccessToken(token);
      }, /jwt audience invalid/i);
    });

  });

  describe('GROUP 4: Legacy Migration & Fallback Verification', () => {

    it('14. Legacy access token (signed with JWT_SECRET, no iss/aud) verifies through legacy fallback', () => {
      const legacyToken = jwt.sign(
        { tokenType: 'ACCESS', userType: 'STAFF', userId: MOCK_STAFF.id },
        TEST_LEGACY_SECRET
      );
      const decoded = verifyAccessToken(legacyToken);
      assert.equal(decoded.userId, MOCK_STAFF.id);
      assert.equal(decoded.tokenType, 'ACCESS');
    });

    it('15. Legacy refresh token (signed with JWT_SECRET, no iss/aud) verifies through legacy fallback', () => {
      const legacyRefreshToken = jwt.sign(
        { tokenType: 'REFRESH', userType: 'STAFF', userId: MOCK_STAFF.id },
        TEST_LEGACY_SECRET
      );
      const decoded = verifyRefreshToken(legacyRefreshToken);
      assert.equal(decoded.userId, MOCK_STAFF.id);
      assert.equal(decoded.tokenType, 'REFRESH');
    });

    it('16. Legacy refresh token CANNOT authenticate access middleware', async () => {
      const legacyRefreshToken = jwt.sign(
        { tokenType: 'REFRESH', userType: 'STAFF', userId: MOCK_STAFF.id },
        TEST_LEGACY_SECRET
      );
      const req = { headers: { authorization: `Bearer ${legacyRefreshToken}` } };
      let resStatus = null;
      let resBody = null;
      const res = {
        status: (code) => { resStatus = code; return res; },
        json: (body) => { resBody = body; return res; },
      };

      await authenticateAdmin(req, res, () => {});

      assert.equal(resStatus, 401);
      assert.equal(resBody.success, false);
      assert.match(resBody.message, /Invalid token type/i);
    });

    it('17. Legacy access token CANNOT be used as a refresh token (aud mismatch if added or tokenType check)', () => {
      const legacyAccessToken = jwt.sign(
        { tokenType: 'ACCESS', userType: 'STAFF', userId: MOCK_STAFF.id, iss: JWT_ISSUER, aud: JWT_ACCESS_AUDIENCE },
        TEST_LEGACY_SECRET
      );
      assert.throws(() => {
        verifyRefreshToken(legacyAccessToken);
      }, /jwt audience invalid|invalid signature/i);
    });

    it('18. Newly issued tokens do NOT use legacy secret when dedicated secrets exist', () => {
      const token = signAccessToken({ userId: MOCK_STAFF.id });
      // Verification using legacy secret directly must fail signature check
      assert.throws(() => {
        jwt.verify(token, TEST_LEGACY_SECRET);
      }, /invalid signature/i);
    });

  });

  describe('GROUP 5: Existing Authentication Flows Integration', () => {

    it('19. Staff access authentication still works with newly signed token', async () => {
      const token = signAccessToken({ userId: MOCK_STAFF.id, userType: 'STAFF' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      let nextCalled = false;

      await authenticateAdmin(req, {}, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.id, MOCK_STAFF.id);
    });

    it('20. Customer access authentication still works with newly signed token', async () => {
      const token = signAccessToken({ id: MOCK_CUSTOMER.id, userType: 'CUSTOMER' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      let nextCalled = false;

      await authenticateCustomer(req, {}, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.ok(req.customer);
      assert.equal(req.customer.id, MOCK_CUSTOMER.id);
    });

    it('21. Staff refresh token verifies cleanly with verifyRefreshToken', () => {
      const token = signRefreshToken({ userId: MOCK_STAFF.id, userType: 'STAFF' });
      const decoded = verifyRefreshToken(token);
      assert.equal(decoded.userId, MOCK_STAFF.id);
      assert.equal(decoded.tokenType, 'REFRESH');
      assert.equal(decoded.aud, JWT_REFRESH_AUDIENCE);
    });

    it('22. Customer refresh token verifies cleanly with verifyRefreshToken', () => {
      const token = signRefreshToken({ id: MOCK_CUSTOMER.id, userType: 'CUSTOMER' });
      const decoded = verifyRefreshToken(token);
      assert.equal(decoded.id, MOCK_CUSTOMER.id);
      assert.equal(decoded.tokenType, 'REFRESH');
      assert.equal(decoded.aud, JWT_REFRESH_AUDIENCE);
    });

  });

});

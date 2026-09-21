import { describe, it, beforeEach, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

import { adminLogin } from '../src/controllers/authController.js';
import { customerLogin } from '../src/controllers/customerAuthController.js';
import {
  PASSWORD_LOGIN_MAX_ATTEMPTS,
  PASSWORD_LOGIN_LOCKOUT_SECONDS,
} from '../src/config/envValidator.js';
import prisma from '../src/lib/prisma.js';

// Helper to create mock response object
const createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    cookie(name, val, options) {
      this.cookies[name] = { val, options };
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
  };
  return res;
};

const targetDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const isIsolatedTestDbAvailable = !!(
  targetDbUrl &&
  !targetDbUrl.includes('supabase.co') &&
  !targetDbUrl.includes('prod')
);

describe('Phase 0C.3.6 — Real PostgreSQL Password Lockout Unit & Behavioral Suite', () => {
  const VALID_PASSWORD = 'SecurePassword123!';
  const WRONG_PASSWORD = 'WrongPassword999!';
  const STAFF_EMAIL = 'real_pg_lockout_admin@printbazzar.com';
  const CUSTOMER_EMAIL = 'real_pg_lockout_customer@printbazzar.com';

  let validPasswordHash;
  let testRole = null;
  let testStaff = null;
  let testCustomer = null;

  before(async () => {
    if (!isIsolatedTestDbAvailable) {
      throw new Error('FATAL: Real PostgreSQL isolated test database is required.');
    }
    validPasswordHash = await bcrypt.hash(VALID_PASSWORD, 10);

    testRole = await prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: {
        name: 'SUPER_ADMIN',
        description: 'Super Admin for lockout tests',
        isSystem: true,
      },
    });
  });

  beforeEach(async () => {
    if (isIsolatedTestDbAvailable) {
      testStaff = await prisma.user.upsert({
        where: { email: STAFF_EMAIL },
        update: {
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
          passwordHash: validPasswordHash,
          roleId: testRole.id,
          isActive: true,
        },
        create: {
          name: 'Real PG Admin User',
          email: STAFF_EMAIL,
          passwordHash: validPasswordHash,
          roleId: testRole.id,
          isActive: true,
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
        },
      });

      testCustomer = await prisma.customer.upsert({
        where: { email: CUSTOMER_EMAIL },
        update: {
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
          passwordHash: validPasswordHash,
        },
        create: {
          name: 'Real PG Customer User',
          email: CUSTOMER_EMAIL,
          mobile: '9876543210',
          passwordHash: validPasswordHash,
          accountType: 'B2C_RETAIL',
          failedLoginAttempts: 0,
          loginBlockedUntil: null,
        },
      });
    }
  });

  afterEach(async () => {
    if (isIsolatedTestDbAvailable) {
      await prisma.customer.deleteMany({ where: { email: CUSTOMER_EMAIL } });
      await prisma.user.deleteMany({ where: { email: STAFF_EMAIL } });
    }
  });

  describe('1. Configuration Defaults', () => {
    it('should default PASSWORD_LOGIN_MAX_ATTEMPTS to 5', () => {
      assert.equal(PASSWORD_LOGIN_MAX_ATTEMPTS, 5);
    });

    it('should default PASSWORD_LOGIN_LOCKOUT_SECONDS to 900 (15 minutes)', () => {
      assert.equal(PASSWORD_LOGIN_LOCKOUT_SECONDS, 900);
    });
  });

  describe('2. Staff / Admin Password Lockout Flow', () => {
    it('should increment failedLoginAttempts on wrong password and return 401 Invalid credentials.', async () => {
      const req = {
        body: { email: STAFF_EMAIL, password: WRONG_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();

      await adminLogin(req, res);

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Invalid credentials.');

      const staff = await prisma.user.findUnique({ where: { email: STAFF_EMAIL } });
      assert.equal(staff.failedLoginAttempts, 1);
      assert.equal(staff.loginBlockedUntil, null);
    });

    it('should lock out account after 5 consecutive failed attempts with HTTP 401 Invalid credentials.', async () => {
      const req = {
        body: { email: STAFF_EMAIL, password: WRONG_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };

      for (let i = 1; i <= 4; i++) {
        const res = createMockRes();
        await adminLogin(req, res);
        assert.equal(res.statusCode, 401);
      }

      const res5 = createMockRes();
      await adminLogin(req, res5);

      assert.equal(res5.statusCode, 401);
      assert.equal(res5.body.success, false);
      assert.equal(res5.body.message, 'Invalid credentials.');

      const staff = await prisma.user.findUnique({ where: { email: STAFF_EMAIL } });
      assert.equal(staff.failedLoginAttempts, 5);
      assert.ok(staff.loginBlockedUntil instanceof Date);
      assert.ok(staff.loginBlockedUntil.getTime() > Date.now());
    });

    it('should block login pre-bcrypt when account is locked returning HTTP 401 Invalid credentials.', async () => {
      await prisma.user.update({
        where: { email: STAFF_EMAIL },
        data: {
          failedLoginAttempts: 5,
          loginBlockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const req = {
        body: { email: STAFF_EMAIL, password: VALID_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();

      await adminLogin(req, res);

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.message, 'Invalid credentials.');
    });

    it('should execute timing protection for non-existent email and return HTTP 401 Invalid credentials.', async () => {
      const req = {
        body: { email: 'nonexistent_admin_123@printbazzar.com', password: WRONG_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();

      await adminLogin(req, res);

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Invalid credentials.');
    });

    it('should reset failedLoginAttempts and loginBlockedUntil on successful login', async () => {
      await prisma.user.update({
        where: { email: STAFF_EMAIL },
        data: { failedLoginAttempts: 3 },
      });

      const req = {
        body: { email: STAFF_EMAIL, password: VALID_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();

      await adminLogin(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);

      const staff = await prisma.user.findUnique({ where: { email: STAFF_EMAIL } });
      assert.equal(staff.failedLoginAttempts, 0);
      assert.equal(staff.loginBlockedUntil, null);
    });

    it('should allow login after lockout period expires', async () => {
      await prisma.user.update({
        where: { email: STAFF_EMAIL },
        data: {
          failedLoginAttempts: 5,
          loginBlockedUntil: new Date(Date.now() - 1000), // Expiry passed
        },
      });

      const req = {
        body: { email: STAFF_EMAIL, password: VALID_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();

      await adminLogin(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);

      const staff = await prisma.user.findUnique({ where: { email: STAFF_EMAIL } });
      assert.equal(staff.failedLoginAttempts, 0);
      assert.equal(staff.loginBlockedUntil, null);
    });
  });

  describe('3. Customer Password Lockout Flow', () => {
    it('should increment failedLoginAttempts on wrong password and return HTTP 401 Invalid credentials.', async () => {
      const req = {
        body: { email: CUSTOMER_EMAIL, password: WRONG_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();

      await customerLogin(req, res);

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Invalid credentials.');

      const customer = await prisma.customer.findUnique({ where: { email: CUSTOMER_EMAIL } });
      assert.equal(customer.failedLoginAttempts, 1);
      assert.equal(customer.loginBlockedUntil, null);
    });

    it('should lock out customer account after 5 consecutive failed attempts with HTTP 401', async () => {
      const req = {
        body: { email: CUSTOMER_EMAIL, password: WRONG_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };

      for (let i = 1; i <= 4; i++) {
        const res = createMockRes();
        await customerLogin(req, res);
        assert.equal(res.statusCode, 401);
      }

      const res5 = createMockRes();
      await customerLogin(req, res5);

      assert.equal(res5.statusCode, 401);
      assert.equal(res5.body.success, false);
      assert.equal(res5.body.message, 'Invalid credentials.');

      const customer = await prisma.customer.findUnique({ where: { email: CUSTOMER_EMAIL } });
      assert.equal(customer.failedLoginAttempts, 5);
      assert.ok(customer.loginBlockedUntil instanceof Date);
      assert.ok(customer.loginBlockedUntil.getTime() > Date.now());
    });

    it('should block customer login pre-bcrypt when locked out', async () => {
      await prisma.customer.update({
        where: { email: CUSTOMER_EMAIL },
        data: {
          failedLoginAttempts: 5,
          loginBlockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const req = {
        body: { email: CUSTOMER_EMAIL, password: VALID_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();

      await customerLogin(req, res);

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.message, 'Invalid credentials.');
    });

    it('should execute timing protection for non-existent customer and return HTTP 401 Invalid credentials.', async () => {
      const req = {
        body: { identifier: 'nonexistent_cust_999@printbazzar.com', password: WRONG_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();

      await customerLogin(req, res);

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Invalid credentials.');
    });

    it('should reset customer failedLoginAttempts and loginBlockedUntil on valid login', async () => {
      await prisma.customer.update({
        where: { email: CUSTOMER_EMAIL },
        data: { failedLoginAttempts: 4 },
      });

      const req = {
        body: { email: CUSTOMER_EMAIL, password: VALID_PASSWORD },
        ip: '127.0.0.1',
        headers: {},
      };
      const res = createMockRes();

      await customerLogin(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);

      const customer = await prisma.customer.findUnique({ where: { email: CUSTOMER_EMAIL } });
      assert.equal(customer.failedLoginAttempts, 0);
      assert.equal(customer.loginBlockedUntil, null);
    });
  });
});

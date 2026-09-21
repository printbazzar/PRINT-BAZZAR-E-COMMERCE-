import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();

describe('Phase 0C.3.4 — OTP Security Hardening', () => {
  const mobile = `9${Date.now().toString().slice(-9)}`;
  let customerId;

  before(async () => {
    const customer = await prisma.customer.create({
      data: {
        name: 'OTP Security Test',
        mobile,
      },
    });

    customerId = customer.id;
  });

  after(async () => {
    if (customerId) {
      await prisma.customer.delete({
        where: { id: customerId },
      });
    }

    await prisma.$disconnect();
  });

  test('test database is reachable', async () => {
    const result = await prisma.$queryRaw`SELECT 1 AS ok`;
    assert.equal(Number(result[0].ok), 1);
  });

  test('crypto.randomInt is available for secure OTP generation', () => {
    const otp = crypto.randomInt(100000, 1000000);

    assert.equal(Number.isInteger(otp), true);
    assert.ok(otp >= 100000);
    assert.ok(otp <= 999999);
  });
});

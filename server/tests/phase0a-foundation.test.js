import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma.js';
import { validateEnv, ENV_SPECS } from '../src/config/envValidator.js';

describe('Phase 0A Foundation Tests', () => {

  describe('1. Centralized Singleton Prisma Client', () => {
    it('should export a valid PrismaClient instance', () => {
      assert.ok(prisma, 'Prisma client instance should be defined');
      assert.equal(typeof prisma.$connect, 'function', 'Prisma instance should have $connect method');
      assert.equal(typeof prisma.$disconnect, 'function', 'Prisma instance should have $disconnect method');
    });

    it('should return the exact same instance across multiple imports', async () => {
      const { default: secondImport } = await import('../src/lib/prisma.js?test_cache_bust=' + Date.now());
      assert.strictEqual(prisma, secondImport, 'Imported Prisma instance must be referentially identical');
    });

    it('should bind the singleton to globalThis in non-production environments', () => {
      if (process.env.NODE_ENV !== 'production') {
        assert.ok(globalThis.prisma, 'globalThis.prisma should hold the singleton reference in dev/test');
        assert.strictEqual(globalThis.prisma, prisma, 'globalThis.prisma must be strictly equal to imported instance');
      }
    });
  });

  describe('2. Environment Startup Validation', () => {
    it('should validate successfully when all required variables are present', () => {
      const mockEnv = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_db',
        JWT_SECRET: 'test_jwt_secret_key_1234567890_super_secret',
      };

      const result = validateEnv(mockEnv, { isTest: true });
      assert.equal(result.isValid, true, 'Validation should pass for valid environment');
      assert.equal(result.missingRequired.length, 0, 'No missing required variables');
    });

    it('should throw an error naming missing required variables without leaking secret values', () => {
      const mockEnv = {
        NODE_ENV: 'test',
        DATABASE_URL: '', // Missing
        JWT_SECRET: 'secret_value_that_must_never_appear_in_error_message',
      };

      assert.throws(
        () => validateEnv(mockEnv, { isTest: true }),
        (err) => {
          assert.ok(err.message.includes('DATABASE_URL'), 'Error message must specify missing variable name');
          assert.ok(
            !err.message.includes('secret_value_that_must_never_appear_in_error_message'),
            'Error message must NEVER include secret values'
          );
          return true;
        }
      );
    });

    it('should validate production-required variables in production mode', () => {
      const mockEnv = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod:prod@localhost:5432/prod',
        // JWT_SECRET is missing
      };

      assert.throws(
        () => validateEnv(mockEnv, { isTest: true }),
        (err) => {
          assert.ok(err.message.includes('JWT_SECRET'), 'Production validation must catch missing JWT_SECRET');
          return true;
        }
      );
    });

    it('should allow optional environment variables to be omitted without failing', () => {
      const mockEnv = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        // Optional variables omitted: PORT, RAZORPAY_KEY_ID, GOOGLE_CLIENT_ID, etc.
      };

      const result = validateEnv(mockEnv, { isTest: true });
      assert.equal(result.isValid, true, 'Validation must pass even when optional variables are omitted');
    });

    it('should identify all required environment specifications', () => {
      assert.ok(Array.isArray(ENV_SPECS.REQUIRED), 'ENV_SPECS.REQUIRED must be an array');
      assert.ok(ENV_SPECS.REQUIRED.includes('DATABASE_URL'), 'DATABASE_URL must be in required specs');
      assert.ok(ENV_SPECS.PRODUCTION_REQUIRED.includes('JWT_SECRET'), 'JWT_SECRET must be in production required specs');
    });
  });

});

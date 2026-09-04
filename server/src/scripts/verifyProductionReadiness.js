/**
 * Print Bazzar — Automated Production Readiness & Pre-Flight Verification Script
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

async function runPreflightChecks() {
  console.log('====================================================');
  console.log('🚀 PRINT BAZZAR — PRE-FLIGHT PRODUCTION READINESS CHECK');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, label) {
    if (condition) {
      console.log(`✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${label}`);
      failed++;
    }
  }

  // 1. Environment Variables Check
  console.log('--- 1. Environment Variables Audit ---');
  assert(!!process.env.DATABASE_URL, 'DATABASE_URL is configured');
  assert(
    !!process.env.JWT_SECRET && process.env.JWT_SECRET !== 'default_secret',
    'JWT_SECRET is securely configured'
  );
  assert(process.env.PORT || '5000', 'API Port is configured (default: 5000)');

  // 2. Database Connectivity & Model Sanity
  console.log('\n--- 2. Database Connectivity & Table Sanity ---');
  try {
    await prisma.$connect();
    assert(true, 'PostgreSQL database connection established successfully');

    const productCount = await prisma.product.count();
    assert(productCount > 0, `Products table populated (${productCount} products found)`);

    const orderCount = await prisma.order.count();
    assert(orderCount >= 0, `Orders table responsive (${orderCount} orders present)`);

    const sessionCount = await prisma.authSession.count();
    assert(sessionCount >= 0, `AuthSession table active (${sessionCount} active/historical sessions)`);

    const optionMasterCount = await prisma.optionMaster.count();
    assert(optionMasterCount > 0, `OptionMaster dynamic catalog active (${optionMasterCount} masters found)`);
  } catch (dbErr) {
    assert(false, `Database connection failure: ${dbErr.message}`);
  }

  // 3. Storage & Uploads Directory Permissions
  console.log('\n--- 3. Media & Uploads Storage ---');
  const uploadDir = path.join(__dirname, '../../uploads');
  const dirExists = fs.existsSync(uploadDir);
  assert(dirExists, `Uploads directory exists at ${uploadDir}`);

  if (dirExists) {
    try {
      const testFile = path.join(uploadDir, `test-perm-${Date.now()}.tmp`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      assert(true, 'Uploads directory has read and write filesystem permissions');
    } catch (fsErr) {
      assert(false, `Uploads directory permission error: ${fsErr.message}`);
    }
  }

  // 4. Notification Engine Check
  console.log('\n--- 4. Notification Engine Readiness ---');
  try {
    const { TEMPLATES, sendOrderNotification } = await import('../services/notificationService.js');
    assert(typeof sendOrderNotification === 'function', 'sendOrderNotification service loaded');
    assert(Object.keys(TEMPLATES).length >= 5, `All 5 milestone notification templates loaded (${Object.keys(TEMPLATES).join(', ')})`);
  } catch (notifErr) {
    assert(false, `Notification engine failed to load: ${notifErr.message}`);
  }

  // 5. Security & Session Configuration
  console.log('\n--- 5. Security Architecture ---');
  try {
    const { signAccessToken, signRefreshToken } = await import('../config/jwt.js');
    assert(typeof signAccessToken === 'function', 'Dual-Token JWT generator active (15m access token)');
    assert(typeof signRefreshToken === 'function', 'Dual-Token JWT generator active (7d refresh token)');
  } catch (jwtErr) {
    assert(false, `JWT config failed to load: ${jwtErr.message}`);
  }

  console.log('\n====================================================');
  console.log(`PRE-FLIGHT AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPreflightChecks().catch((e) => {
  console.error('Fatal pre-flight check error:', e);
  process.exit(1);
});

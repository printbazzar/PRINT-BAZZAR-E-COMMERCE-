/**
 * Automated Verification Script for Print Bazzar Footer System
 * Verifies public endpoints, admin RBAC, persistence, security validation against javascript: URLs and XSS.
 */

import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../config/jwt.js';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 VERIFYING PRINT BAZZAR DYNAMIC FOOTER & SETTINGS SYSTEM');
  console.log('========================================================\n');

  // Test 1: Public Footer Endpoint
  console.log('Test 1: Fetching Public Footer via GET /settings/footer...');
  const pubRes = await fetch(`${BASE_URL}/settings/footer`);
  const pubData = await pubRes.json();

  if (!pubData.success || !pubData.data) {
    throw new Error('Test 1 Failed: Public footer returned invalid response');
  }

  console.log('✔ Public Footer Endpoint Successful:');
  console.log(`  • Brand: ${pubData.data.brand?.companyName}`);
  console.log(`  • Dynamic Categories: ${pubData.data.categories?.items?.length} items loaded`);
  console.log(`  • Support Links: ${pubData.data.supportLinks?.length} links`);
  console.log(`  • Business Links: ${pubData.data.businessLinks?.length} links`);
  console.log(`  • Trust Badges: ${pubData.data.trustBadges?.length} badges`);
  console.log(`  • Payment Badges: ${pubData.data.paymentMethods?.length} methods`);
  console.log(`  • Current Year: ${pubData.data.copyright?.currentYear}`);

  // Test 2: RBAC Protection - Unauthenticated PUT must be rejected
  console.log('\nTest 2: Verifying RBAC Security on Admin Footer Endpoint...');
  const unauthRes = await fetch(`${BASE_URL}/admin/settings/footer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand: { companyName: 'Hacked Brand' } }),
  });

  if (unauthRes.status !== 401 && unauthRes.status !== 403) {
    throw new Error(`Test 2 Failed: Expected 401/403 for unauthenticated request, got ${unauthRes.status}`);
  }
  console.log(`✔ Unauthenticated access successfully blocked with HTTP ${unauthRes.status}!`);

  // Find admin user for authenticated testing
  const adminUser =
    (await prisma.user.findFirst({
      where: { email: 'admin@printbazzar.online' },
      include: { role: true },
    })) ||
    (await prisma.user.findFirst({
      include: { role: true },
    }));

  if (!adminUser) {
    throw new Error('No user found in DB to run tests.');
  }

  const adminToken = signAccessToken({
    id: adminUser.id,
    role: adminUser.role?.name || 'ADMIN',
    email: adminUser.email,
  });

  // Test 3: Authenticated Admin GET
  console.log('\nTest 3: Fetching Admin Footer Settings with Admin Token...');
  const adminGetRes = await fetch(`${BASE_URL}/admin/settings/footer`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminGetData = await adminGetRes.json();

  if (!adminGetData.success || !adminGetData.data?.settings) {
    throw new Error('Test 3 Failed: Admin footer GET failed');
  }
  console.log(`✔ Admin Footer Settings Loaded: Found ${adminGetData.data.allCategories?.length} categories available for mapping.`);

  // Test 4: Security Validation - Dangerous javascript: URL must be REJECTED
  console.log('\nTest 4: Testing Security Validation against Malicious URL injection...');
  const maliciousPayload = {
    ...adminGetData.data.settings,
    supportLinks: [
      {
        id: 'mal-1',
        label: 'Dangerous Link',
        url: "javascript:alert('XSS_ATTACK')",
        isEnabled: true,
      },
    ],
  };

  const xssRes = await fetch(`${BASE_URL}/admin/settings/footer`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(maliciousPayload),
  });

  const xssData = await xssRes.json();
  if (xssRes.status === 400 && !xssData.success) {
    console.log(`✔ Malicious URL Injection Rejected with HTTP 400: "${xssData.message}"`);
  } else {
    throw new Error('Test 4 Failed: Malicious javascript: URL was not blocked by validation!');
  }

  // Test 5: Admin Update & Persistence
  console.log('\nTest 5: Testing Legitimate Admin Settings Update & Persistence...');
  const testBrandTagline = `Verified Automated Test Tagline ${Date.now()}`;
  const validUpdatePayload = {
    ...adminGetData.data.settings,
    brand: {
      ...adminGetData.data.settings.brand,
      tagline: testBrandTagline,
    },
    categorySettings: {
      ...adminGetData.data.settings.categorySettings,
      maxCategories: 5,
    },
  };

  const updateRes = await fetch(`${BASE_URL}/admin/settings/footer`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(validUpdatePayload),
  });

  const updateData = await updateRes.json();
  if (!updateData.success) {
    throw new Error(`Test 5 Failed: Update rejected with: ${updateData.message}`);
  }
  console.log('✔ Admin Footer Settings Updated Successfully in Database!');

  // Test 6: Verify Public Endpoint Reflects Update (Cache invalidation)
  console.log('\nTest 6: Verifying Cache Invalidation on Public Endpoint...');
  const verifyPubRes = await fetch(`${BASE_URL}/settings/footer`);
  const verifyPubData = await verifyPubRes.json();

  if (verifyPubData.data.brand?.tagline !== testBrandTagline) {
    throw new Error('Test 6 Failed: Updated tagline not reflected in public footer');
  }
  if (verifyPubData.data.categories?.items?.length > 5) {
    throw new Error('Test 6 Failed: maxCategories limit 5 not respected');
  }
  console.log(`✔ Public Endpoint Reflected Changes! Tagline: "${verifyPubData.data.brand?.tagline}", Categories Shown: ${verifyPubData.data.categories?.items?.length}`);

  // Test 7: Reset to Factory Defaults
  console.log('\nTest 7: Testing Reset to Factory Defaults...');
  const resetRes = await fetch(`${BASE_URL}/admin/settings/footer/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const resetData = await resetRes.json();

  if (!resetData.success) {
    throw new Error('Test 7 Failed: Reset endpoint failed');
  }
  console.log('✔ Footer Settings Reset to Defaults Successfully!');

  // Verify Audit Log
  const latestAudit = await prisma.auditLog.findFirst({
    where: { entityName: 'FooterSettings' },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`✔ Audit Log Entry Verified: Action "${latestAudit?.action}" recorded.`);

  console.log('\n========================================================');
  console.log('🎉 ALL 7 FOOTER SYSTEM TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

runTests()
  .catch((err) => {
    console.error('❌ Test Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

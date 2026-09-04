import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../config/jwt.js';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING PRINT BAZZAR BUSINESS INFORMATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      failed++;
      console.error(`  ❌ FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    } else {
      passed++;
      console.log(`  ✅ PASSED: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Public Business Info Endpoint
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Public Business Information Endpoint ---');
    const pubRes = await fetch(`${BASE_URL}/settings/business-info`);
    assert(pubRes.status === 200, 'GET /settings/business-info returns 200 OK');
    const pubData = await pubRes.json();
    assert(pubData.success === true, 'Response indicates success: true');
    assert(typeof pubData.data === 'object', 'Response data is an object');
    assert(!!pubData.data.brand, 'Contains brand section');
    assert(!!pubData.data.tax, 'Contains tax section');
    assert(!!pubData.data.address, 'Contains address section');
    assert(!!pubData.data.contact, 'Contains contact section');
    assert(!!pubData.data.operatingHours, 'Contains operatingHours section');
    assert(!!pubData.data.socials, 'Contains socials section');
    assert(!!pubData.data.flags, 'Contains flags section');
    assert(pubData.data.flags.gstinRequiresInput !== undefined, 'Contains gstinRequiresInput flag');
    console.log(`  ℹ Brand Name: ${pubData.data.brand.brandName}`);
    console.log(`  ℹ WhatsApp: ${pubData.data.contact.whatsappNumber}`);
    console.log(`  ℹ Registered Address: ${pubData.data.address.fullDisplayAddress}`);

    // -------------------------------------------------------------
    // Test 2: RBAC Protection on Admin Endpoints
    // -------------------------------------------------------------
    console.log('\n--- Test 2: RBAC Security Guard on Admin Endpoints ---');
    const unauthGet = await fetch(`${BASE_URL}/admin/settings/business-info`);
    assert(unauthGet.status === 401 || unauthGet.status === 403, 'Unauthenticated GET /admin/settings/business-info is rejected');

    const unauthPut = await fetch(`${BASE_URL}/admin/settings/business-info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: { brandName: 'Hacked Store' } }),
    });
    assert(unauthPut.status === 401 || unauthPut.status === 403, 'Unauthenticated PUT /admin/settings/business-info is rejected');

    // -------------------------------------------------------------
    // Test 3: Authenticated Admin Read
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Authenticated Admin Read ---');
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@printbazzar.online' },
      include: { role: true },
    });
    assert(!!adminUser, 'Super Admin user found in database');

    const adminToken = signAccessToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role.name,
      tokenType: 'ACCESS',
    });

    const adminGet = await fetch(`${BASE_URL}/admin/settings/business-info`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminGet.status === 200, 'Super Admin GET /admin/settings/business-info returns 200 OK');
    const adminData = await adminGet.json();
    assert(adminData.success === true, 'Admin response success: true');
    assert(!!adminData.data.brand.brandName, 'Admin data has valid brandName');

    // -------------------------------------------------------------
    // Test 4: Validation Engine - Reject Invalid GSTIN Format
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Validation Engine (Invalid GSTIN Rejection) ---');
    const badGstinRes = await fetch(`${BASE_URL}/admin/settings/business-info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        tax: {
          gstin: 'INVALID_GSTIN_123',
        },
      }),
    });
    assert(badGstinRes.status === 400, 'Invalid GSTIN rejected with HTTP 400');
    const badGstinData = await badGstinRes.json();
    assert(badGstinData.errors && badGstinData.errors.some(e => typeof e === 'string' && e.toLowerCase().includes('gstin')), 'Error details pinpoint GSTIN format failure');

    // -------------------------------------------------------------
    // Test 5: Validation Engine - Reject Invalid Email Format
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Validation Engine (Invalid Email Rejection) ---');
    const badEmailRes = await fetch(`${BASE_URL}/admin/settings/business-info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        contact: {
          supportEmail: 'not-an-email-address',
        },
      }),
    });
    assert(badEmailRes.status === 400, 'Invalid email rejected with HTTP 400');
    const badEmailData = await badEmailRes.json();
    assert(badEmailData.success === false, 'Bad email response success: false');

    // -------------------------------------------------------------
    // Test 6: Valid Admin Update & XSS Sanitization
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Valid Admin Update & XSS Sanitization ---');
    const originalBrand = adminData.data.brand.brandName;
    const testTagline = 'Industrial Precision Printing <script>alert("xss")</script>';

    const validUpdateRes = await fetch(`${BASE_URL}/admin/settings/business-info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        brand: {
          tagline: testTagline,
        },
        contact: {
          primaryPhone: '+91 96290 98565',
        },
      }),
    });
    assert(validUpdateRes.status === 200, 'Valid update returns HTTP 200');
    const updateResult = await validUpdateRes.json();
    assert(updateResult.success === true, 'Update successful');
    assert(!updateResult.data.brand.tagline.includes('<script>'), 'XSS script tags stripped/sanitized from tagline');

    // -------------------------------------------------------------
    // Test 7: Public Cache Invalidation on Update
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Public Cache Invalidation ---');
    const updatedPubRes = await fetch(`${BASE_URL}/settings/business-info`);
    const updatedPubData = await updatedPubRes.json();
    assert(
      updatedPubData.data.brand.tagline === updateResult.data.brand.tagline,
      'Public endpoint immediately reflects updated tagline without stale cache'
    );

    // -------------------------------------------------------------
    // Test 8: Invoice Controller Integration
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Invoice Controller Seller Details Integration ---');
    const { getSellerDetails } = await import('../controllers/invoiceController.js');
    const seller = await getSellerDetails();
    assert(!!seller, 'getSellerDetails returns seller object');
    assert(seller.companyName.toLowerCase().includes('print bazzar'), `Seller companyName is correct (${seller.companyName})`);
    assert(seller.stateCode === '33', 'Seller stateCode is 33 (Tamil Nadu)');
    assert(!!seller.address, 'Seller has address');
    assert(!!seller.phone, 'Seller has phone');

    // -------------------------------------------------------------
    // Clean up Tagline back to clean state
    // -------------------------------------------------------------
    await fetch(`${BASE_URL}/admin/settings/business-info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        brand: {
          tagline: 'Industrial Precision Printing & Creative Design Studio',
        },
      }),
    });

    console.log('\n===============================================================');
    console.log(`🎉 ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');
  } catch (err) {
    console.error('\n❌ TEST RUN ABORTED WITH ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

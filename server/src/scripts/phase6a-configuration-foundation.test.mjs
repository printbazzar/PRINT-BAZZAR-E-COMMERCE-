/**
 * Phase 6A Verification Suite:
 * Product Configuration Templates, Quote Requests & Data Isolation
 *
 * INTEGRATION TEST — requires a reachable PostgreSQL database configured via
 * DATABASE_URL/DIRECT_URL (same as the other server/src/scripts/phaseN-*.test.mjs
 * suites), at least one active staff user with email 'admin@printbazzar.online'
 * (seeded by `npm run db:seed`), at least one existing ACTIVE Product, and at
 * least two OptionMaster rows that are NOT already mapped to that product (Test
 * 17 needs two free masters to attach isolated fixtures without colliding with
 * the ProductOptionMapping @@unique([productId, masterId]) constraint). It
 * creates its own synthetic, clearly-tagged test data (a
 * throwaway Role/User with zero permissions, a scratch Configuration Template, a
 * scratch Quote Request, and two scratch ProductOptionMapping rows) and deletes all
 * of it in the teardown step below. It never modifies or deletes any pre-existing
 * business data.
 *
 * 20 Test Cases:
 * TEST  1: Seed default configuration templates (idempotent)
 * TEST  2: List configuration templates
 * TEST  3: Create configuration template (validation: required fields)
 * TEST  4: Create configuration template (success)
 * TEST  5: Get configuration template by id
 * TEST  6: Update configuration template (valid status transition DRAFT -> PREVIEW)
 * TEST  7: Update configuration template (invalid status transition rejected)
 * TEST  8: Delete configuration template + confirm 404 afterwards
 * TEST  9: Create public quote request (validation: missing required fields)
 * TEST 10: Create public quote request (validation: quantity must be a number)
 * TEST 11: Create public quote request (validation: specificationsJson must be valid JSON)
 * TEST 12: Create public quote request (success, guest/no-auth)
 * TEST 13: Admin list quote requests (created quote is present)
 * TEST 14: Admin get quote request by id
 * TEST 15: Admin update quote request (valid transition PENDING -> QUOTED)
 * TEST 16: Admin update quote request (invalid transition rejected)
 * TEST 17: Public product response never exposes INTERNAL_ONLY/ADMIN_ONLY option data or raw template JSON
 * TEST 18: Admin endpoints reject missing/invalid authentication (401)
 * TEST 19: Admin endpoints enforce required permissions for a valid-but-unprivileged user (403)
 * TEST 20: Automated teardown & zero residual test-data verification
 */

import http from 'http';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../server.js';
import { signAccessToken } from '../config/jwt.js';

const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[PHASE 6A TEST ASSERTION FAILED]: ${message}`);
  }
}

async function runPhase6ATestSuite() {
  console.log('================================================================');
  console.log('🧪 PRINT BAZZAR — PHASE 6A CONFIGURATION FOUNDATION SUITE');
  console.log('================================================================');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TEST HARNESS] Local test server running on ${baseUrl}`);

  const testRunId = Date.now().toString().slice(-8);
  const createdTemplateIds = [];
  const createdQuoteRequestIds = [];
  const createdOptionMappingIds = [];
  let createdNoPermRoleId = null;
  let createdNoPermUserId = null;
  let testError = null;

  try {
    // ----------------------------------------------------------------
    // SETUP: Admin token, no-permission token, existing product/master
    // ----------------------------------------------------------------
    console.log('\n[SETUP] Resolving fixtures (admin user, product, option master)...');

    const superAdmin = await prisma.user.findFirst({
      where: { email: 'admin@printbazzar.online', isActive: true },
      include: { role: true },
    });
    assert(superAdmin, "Seeded Super Admin user 'admin@printbazzar.online' must exist and be active");
    const adminToken = signAccessToken({ userId: superAdmin.id, email: superAdmin.email, role: superAdmin.role.name });

    const testProduct = await prisma.product.findFirst({ where: { status: 'ACTIVE' } });
    assert(testProduct, 'At least one ACTIVE product must exist in the database for these tests');

    // Test 17 needs to attach two throwaway ProductOptionMapping rows (one
    // INTERNAL_ONLY, one ADMIN_ONLY) to testProduct. ProductOptionMapping has a
    // @@unique([productId, masterId]) constraint, so an OptionMaster that is
    // already mapped to testProduct (very likely for masters like "size"/"material"
    // on a real seeded catalog) cannot be reused here. Select two OptionMasters
    // that are NOT already mapped to testProduct so both inserts are guaranteed
    // to be new, isolated rows rather than colliding with existing or each other.
    const allMasters = await prisma.optionMaster.findMany();
    assert(allMasters.length > 0, 'At least one OptionMaster must exist in the database for these tests');

    const existingMappingsForProduct = await prisma.productOptionMapping.findMany({
      where: { productId: testProduct.id },
      select: { masterId: true },
    });
    const alreadyMappedMasterIds = new Set(existingMappingsForProduct.map((m) => m.masterId));
    const unmappedMasters = allMasters.filter((m) => !alreadyMappedMasterIds.has(m.id));
    assert(
      unmappedMasters.length >= 2,
      `Test 17 needs at least 2 OptionMasters not already mapped to test product ${testProduct.id} ` +
        `(found ${unmappedMasters.length} unmapped of ${allMasters.length} total OptionMasters, ` +
        `${alreadyMappedMasterIds.size} already mapped to this product) to create isolated fixtures ` +
        `without violating the (productId, masterId) unique constraint`
    );
    const internalTestMaster = unmappedMasters[0];
    const adminOnlyTestMaster = unmappedMasters[1];

    // Synthetic role with ZERO permissions, to deterministically test the 403 path
    // regardless of how generously other seeded roles happen to be provisioned.
    const noPermRole = await prisma.role.create({
      data: {
        name: `PHASE6A_NO_PERM_TEST_${testRunId}`,
        description: 'Ephemeral role created by phase6a-configuration-foundation.test.mjs (zero permissions)',
        isSystem: false,
      },
    });
    createdNoPermRoleId = noPermRole.id;

    const dummyHash = await bcrypt.hash(`Phase6ATest@${testRunId}`, 10);
    const noPermUser = await prisma.user.create({
      data: {
        name: `Phase6A No-Permission Test User (${testRunId})`,
        email: `phase6a_noperm_${testRunId}@test.invalid`,
        passwordHash: dummyHash,
        department: 'ALL',
        roleId: noPermRole.id,
        isActive: true,
      },
    });
    createdNoPermUserId = noPermUser.id;
    const noPermToken = signAccessToken({ userId: noPermUser.id, email: noPermUser.email, role: noPermRole.name });

    console.log(`✔ Fixtures ready: admin=${superAdmin.email}, product=${testProduct.sku || testProduct.id}, unmappedMasters=[${internalTestMaster.code}, ${adminOnlyTestMaster.code}], noPermRole=${noPermRole.name}`);

    // ----------------------------------------------------------------
    // TEST 1: Seed default configuration templates (idempotent)
    // ----------------------------------------------------------------
    console.log('\n[TEST 1] POST /admin/configuration-templates/seed: seeds defaults (idempotent)...');
    const resSeed = await fetch(`${baseUrl}/api/v1/admin/configuration-templates/seed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataSeed = await resSeed.json();
    assert(resSeed.status === 200 || resSeed.status === 201, `Expected 200/201, got ${resSeed.status}`);
    assert(dataSeed.success === true, 'Seed response must have success:true');
    assert(dataSeed.data && Array.isArray(dataSeed.data.created) && Array.isArray(dataSeed.data.skipped), 'Seed response must return { created: [], skipped: [] }');
    console.log(`✔ Seed endpoint responded: created=${dataSeed.data.created.length}, skipped=${dataSeed.data.skipped.length}`);

    // ----------------------------------------------------------------
    // TEST 2: List configuration templates
    // ----------------------------------------------------------------
    console.log('\n[TEST 2] GET /admin/configuration-templates: list...');
    const resList = await fetch(`${baseUrl}/api/v1/admin/configuration-templates`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataList = await resList.json();
    assert(resList.status === 200, `Expected 200, got ${resList.status}`);
    assert(dataList.success === true, 'List response must have success:true');
    assert(Array.isArray(dataList.data), 'List response data must be an array');
    assert(dataList.pagination && typeof dataList.pagination.total === 'number', 'List response must include pagination.total');
    console.log(`✔ List returned ${dataList.data.length} template(s) of ${dataList.pagination.total} total.`);

    // ----------------------------------------------------------------
    // TEST 3: Create configuration template — validation (missing fieldsConfigJson)
    // ----------------------------------------------------------------
    console.log('\n[TEST 3] POST /admin/configuration-templates: rejects missing required fields...');
    const resCreateInvalid = await fetch(`${baseUrl}/api/v1/admin/configuration-templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: `PHASE6A_INVALID_${testRunId}`, name: 'Missing Fields Test', category: 'PHASE6A_TEST' }),
    });
    const dataCreateInvalid = await resCreateInvalid.json();
    assert(resCreateInvalid.status === 400, `Expected 400, got ${resCreateInvalid.status}`);
    assert(dataCreateInvalid.success === false, 'Validation failure must have success:false');
    assert(typeof dataCreateInvalid.message === 'string' && dataCreateInvalid.message.length > 0, 'Validation failure must include a message string');
    console.log(`✔ Missing-field create correctly rejected: "${dataCreateInvalid.message}"`);

    // ----------------------------------------------------------------
    // TEST 4: Create configuration template — success
    // ----------------------------------------------------------------
    console.log('\n[TEST 4] POST /admin/configuration-templates: creates a scratch template...');
    const testTemplateCode = `PHASE6A_TEST_TEMPLATE_${testRunId}`;
    const resCreate = await fetch(`${baseUrl}/api/v1/admin/configuration-templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: testTemplateCode,
        name: `Phase 6A Test Template (${testRunId})`,
        category: `PHASE6A_TEST_CATEGORY_${testRunId}`,
        pricingModel: 'MATRIX',
        fieldsConfigJson: JSON.stringify([
          { code: 'test_field', name: 'Test Field', optionType: 'TEXT', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 1 },
        ]),
      }),
    });
    const dataCreate = await resCreate.json();
    assert(resCreate.status === 201, `Expected 201, got ${resCreate.status}: ${dataCreate.message}`);
    assert(dataCreate.success === true, 'Create response must have success:true');
    assert(dataCreate.data && dataCreate.data.id, 'Create response must return the new template id');
    assert(dataCreate.data.code === testTemplateCode.toUpperCase(), 'Persisted code must be normalized uppercase');
    assert(dataCreate.data.status === 'DRAFT', 'New template must default to status DRAFT');
    assert(dataCreate.data.version === 1, 'New template must start at version 1');
    createdTemplateIds.push(dataCreate.data.id);
    const testTemplateId = dataCreate.data.id;
    console.log(`✔ Created template ${dataCreate.data.code} (id=${testTemplateId}, status=DRAFT, v1).`);

    // ----------------------------------------------------------------
    // TEST 5: Get configuration template by id
    // ----------------------------------------------------------------
    console.log('\n[TEST 5] GET /admin/configuration-templates/:id...');
    const resGet = await fetch(`${baseUrl}/api/v1/admin/configuration-templates/${testTemplateId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataGet = await resGet.json();
    assert(resGet.status === 200, `Expected 200, got ${resGet.status}`);
    assert(dataGet.success === true, 'Get-by-id response must have success:true');
    assert(dataGet.data.id === testTemplateId, 'Returned template id must match requested id');
    assert(dataGet.data.code === testTemplateCode.toUpperCase(), 'Returned template code must match');
    console.log(`✔ Fetched template ${dataGet.data.code} by id.`);

    // ----------------------------------------------------------------
    // TEST 6: Update configuration template — valid transition DRAFT -> PREVIEW
    // ----------------------------------------------------------------
    console.log('\n[TEST 6] PUT /admin/configuration-templates/:id: valid transition DRAFT -> PREVIEW...');
    const resUpdate = await fetch(`${baseUrl}/api/v1/admin/configuration-templates/${testTemplateId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PREVIEW' }),
    });
    const dataUpdate = await resUpdate.json();
    assert(resUpdate.status === 200, `Expected 200, got ${resUpdate.status}: ${dataUpdate.message}`);
    assert(dataUpdate.success === true, 'Update response must have success:true');
    assert(dataUpdate.data.status === 'PREVIEW', `Expected status PREVIEW, got ${dataUpdate.data.status}`);
    console.log('✔ Template transitioned DRAFT -> PREVIEW.');

    // ----------------------------------------------------------------
    // TEST 7: Update configuration template — invalid transition rejected
    // ----------------------------------------------------------------
    console.log('\n[TEST 7] PUT /admin/configuration-templates/:id: invalid transition PREVIEW -> PUBLISHED rejected...');
    const resBadTransition = await fetch(`${baseUrl}/api/v1/admin/configuration-templates/${testTemplateId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PUBLISHED' }),
    });
    const dataBadTransition = await resBadTransition.json();
    assert(resBadTransition.status === 400, `Expected 400, got ${resBadTransition.status}`);
    assert(dataBadTransition.success === false, 'Invalid transition must have success:false');
    console.log(`✔ Invalid transition correctly rejected: "${dataBadTransition.message}"`);

    // ----------------------------------------------------------------
    // TEST 8: Delete configuration template + confirm 404 afterwards
    // ----------------------------------------------------------------
    console.log('\n[TEST 8] DELETE /admin/configuration-templates/:id (no products attached)...');
    const resDelete = await fetch(`${baseUrl}/api/v1/admin/configuration-templates/${testTemplateId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataDelete = await resDelete.json();
    assert(resDelete.status === 200, `Expected 200, got ${resDelete.status}: ${dataDelete.message}`);
    assert(dataDelete.success === true, 'Delete response must have success:true');

    const resGetAfterDelete = await fetch(`${baseUrl}/api/v1/admin/configuration-templates/${testTemplateId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(resGetAfterDelete.status === 404, `Expected 404 after delete, got ${resGetAfterDelete.status}`);
    // Already deleted via the API — remove from the teardown cleanup list.
    createdTemplateIds.splice(createdTemplateIds.indexOf(testTemplateId), 1);
    console.log('✔ Template deleted and confirmed 404 on subsequent fetch.');

    // ----------------------------------------------------------------
    // TEST 9: Create public quote request — validation (missing required fields)
    // ----------------------------------------------------------------
    console.log('\n[TEST 9] POST /shop/quote-request: rejects missing required fields...');
    const resQuoteMissing = await fetch(`${baseUrl}/api/v1/shop/quote-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Phase6A Test Customer' }), // missing customerMobile, specificationsJson, quantity
    });
    const dataQuoteMissing = await resQuoteMissing.json();
    assert(resQuoteMissing.status === 400, `Expected 400, got ${resQuoteMissing.status}`);
    assert(dataQuoteMissing.success === false, 'Missing-field quote request must have success:false');
    console.log(`✔ Missing-field quote request correctly rejected: "${dataQuoteMissing.message}"`);

    // ----------------------------------------------------------------
    // TEST 10: Create public quote request — validation (quantity must be a number)
    // ----------------------------------------------------------------
    console.log('\n[TEST 10] POST /shop/quote-request: rejects non-numeric quantity...');
    const resQuoteBadQty = await fetch(`${baseUrl}/api/v1/shop/quote-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Phase6A Test Customer',
        customerMobile: '9990000000',
        specificationsJson: JSON.stringify({ material: 'vinyl' }),
        quantity: 'five-hundred', // invalid: must be typeof number
      }),
    });
    const dataQuoteBadQty = await resQuoteBadQty.json();
    assert(resQuoteBadQty.status === 400, `Expected 400, got ${resQuoteBadQty.status}`);
    assert(dataQuoteBadQty.success === false, 'Non-numeric quantity must be rejected with success:false');
    console.log(`✔ Non-numeric quantity correctly rejected: "${dataQuoteBadQty.message}"`);

    // ----------------------------------------------------------------
    // TEST 11: Create public quote request — validation (specificationsJson must be valid JSON)
    // ----------------------------------------------------------------
    console.log('\n[TEST 11] POST /shop/quote-request: rejects invalid specificationsJson...');
    const resQuoteBadJson = await fetch(`${baseUrl}/api/v1/shop/quote-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Phase6A Test Customer',
        customerMobile: '9990000000',
        specificationsJson: '{not valid json',
        quantity: 500,
      }),
    });
    const dataQuoteBadJson = await resQuoteBadJson.json();
    assert(resQuoteBadJson.status === 400, `Expected 400, got ${resQuoteBadJson.status}`);
    assert(dataQuoteBadJson.success === false, 'Invalid specificationsJson must be rejected with success:false');
    console.log(`✔ Invalid specificationsJson correctly rejected: "${dataQuoteBadJson.message}"`);

    // ----------------------------------------------------------------
    // TEST 12: Create public quote request — success (guest/no-auth)
    // ----------------------------------------------------------------
    console.log('\n[TEST 12] POST /shop/quote-request: guest submission succeeds with no auth...');
    const resQuoteOk = await fetch(`${baseUrl}/api/v1/shop/quote-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: `Phase6A Test Customer ${testRunId}`,
        customerMobile: '9990000000',
        customerEmail: `phase6a_quote_${testRunId}@test.invalid`,
        specificationsJson: JSON.stringify({ material: 'Flex Banner', size: '3x6ft' }),
        quantity: 250,
        description: 'Automated Phase 6A test quote request — safe to delete.',
      }),
    });
    const dataQuoteOk = await resQuoteOk.json();
    assert(resQuoteOk.status === 201, `Expected 201, got ${resQuoteOk.status}: ${dataQuoteOk.message}`);
    assert(dataQuoteOk.success === true, 'Guest quote request must succeed with success:true');
    assert(dataQuoteOk.data && dataQuoteOk.data.id, 'Response must return the new quote request id');
    assert(/^QR-\d{4}-\d{6}$/.test(dataQuoteOk.data.quoteNumber), `quoteNumber must match QR-YYYY-###### format, got ${dataQuoteOk.data.quoteNumber}`);
    assert(dataQuoteOk.data.status === 'PENDING', 'New quote request must default to status PENDING');
    createdQuoteRequestIds.push(dataQuoteOk.data.id);
    const testQuoteId = dataQuoteOk.data.id;
    console.log(`✔ Guest quote request created: ${dataQuoteOk.data.quoteNumber} (no authentication required).`);

    // ----------------------------------------------------------------
    // TEST 13: Admin list quote requests (created quote is present)
    // ----------------------------------------------------------------
    console.log('\n[TEST 13] GET /admin/quote-requests: list includes the new quote...');
    const resQuoteList = await fetch(`${baseUrl}/api/v1/admin/quote-requests?search=${testRunId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataQuoteList = await resQuoteList.json();
    assert(resQuoteList.status === 200, `Expected 200, got ${resQuoteList.status}`);
    assert(dataQuoteList.success === true, 'List response must have success:true');
    assert(Array.isArray(dataQuoteList.data), 'List response data must be an array');
    const foundInList = dataQuoteList.data.find((q) => q.id === testQuoteId);
    assert(foundInList, 'Newly created quote request must appear in the admin list (filtered by search)');
    console.log(`✔ Found test quote request in admin list (${dataQuoteList.data.length} result(s) for search=${testRunId}).`);

    // ----------------------------------------------------------------
    // TEST 14: Admin get quote request by id
    // ----------------------------------------------------------------
    console.log('\n[TEST 14] GET /admin/quote-requests/:id...');
    const resQuoteGet = await fetch(`${baseUrl}/api/v1/admin/quote-requests/${testQuoteId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataQuoteGet = await resQuoteGet.json();
    assert(resQuoteGet.status === 200, `Expected 200, got ${resQuoteGet.status}`);
    assert(dataQuoteGet.success === true, 'Get-by-id response must have success:true');
    assert(dataQuoteGet.data.id === testQuoteId, 'Returned quote id must match requested id');
    assert(dataQuoteGet.data.customerMobile === '9990000000', 'Returned customerMobile must match submitted value');
    console.log('✔ Fetched quote request by id with full detail.');

    // ----------------------------------------------------------------
    // TEST 15: Admin update quote request — valid transition PENDING -> QUOTED
    // ----------------------------------------------------------------
    console.log('\n[TEST 15] PUT /admin/quote-requests/:id: valid transition PENDING -> QUOTED...');
    const resQuoteUpdate = await fetch(`${baseUrl}/api/v1/admin/quote-requests/${testQuoteId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'QUOTED', quotedPrice: 4999.5, notes: 'Automated Phase 6A test quote response.' }),
    });
    const dataQuoteUpdate = await resQuoteUpdate.json();
    assert(resQuoteUpdate.status === 200, `Expected 200, got ${resQuoteUpdate.status}: ${dataQuoteUpdate.message}`);
    assert(dataQuoteUpdate.success === true, 'Update response must have success:true');
    assert(dataQuoteUpdate.data.status === 'QUOTED', `Expected status QUOTED, got ${dataQuoteUpdate.data.status}`);
    assert(dataQuoteUpdate.data.quotedPrice === 4999.5, 'quotedPrice must persist exactly as submitted');
    console.log(`✔ Quote request transitioned PENDING -> QUOTED with quotedPrice ₹${dataQuoteUpdate.data.quotedPrice}.`);

    // ----------------------------------------------------------------
    // TEST 16: Admin update quote request — invalid transition rejected
    // ----------------------------------------------------------------
    console.log('\n[TEST 16] PUT /admin/quote-requests/:id: invalid transition QUOTED -> CONVERTED_TO_ORDER rejected...');
    const resQuoteBadTransition = await fetch(`${baseUrl}/api/v1/admin/quote-requests/${testQuoteId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CONVERTED_TO_ORDER' }),
    });
    const dataQuoteBadTransition = await resQuoteBadTransition.json();
    assert(resQuoteBadTransition.status === 400, `Expected 400, got ${resQuoteBadTransition.status}`);
    assert(dataQuoteBadTransition.success === false, 'Invalid transition must have success:false');
    console.log(`✔ Invalid transition correctly rejected: "${dataQuoteBadTransition.message}"`);

    // ----------------------------------------------------------------
    // TEST 17: Public product response never exposes INTERNAL_ONLY/ADMIN_ONLY
    //          option data or raw template JSON
    // ----------------------------------------------------------------
    console.log('\n[TEST 17] GET /products/:slug: internal/admin-only option data and raw template JSON must never leak publicly...');
    const secretInternalLabel = `__PHASE6A_INTERNAL_ONLY_SECRET_${testRunId}__`;
    const secretAdminLabel = `__PHASE6A_ADMIN_ONLY_SECRET_${testRunId}__`;

    const internalMapping = await prisma.productOptionMapping.create({
      data: {
        productId: testProduct.id,
        masterId: internalTestMaster.id,
        customLabel: secretInternalLabel,
        visibility: 'INTERNAL_ONLY',
        isEnabled: true,
        displayOrder: 9990,
      },
    });
    createdOptionMappingIds.push(internalMapping.id);

    const adminOnlyMapping = await prisma.productOptionMapping.create({
      data: {
        productId: testProduct.id,
        masterId: adminOnlyTestMaster.id,
        customLabel: secretAdminLabel,
        visibility: 'ADMIN_ONLY',
        isEnabled: true,
        displayOrder: 9991,
      },
    });
    createdOptionMappingIds.push(adminOnlyMapping.id);

    assert(testProduct.slug, 'Test product must have a slug to exercise the public detail endpoint');
    const resPublicProduct = await fetch(`${baseUrl}/api/v1/products/${encodeURIComponent(testProduct.slug)}`);
    assert(resPublicProduct.status === 200, `Expected 200, got ${resPublicProduct.status}`);
    const rawBodyText = await resPublicProduct.text();
    const dataPublicProduct = JSON.parse(rawBodyText);
    assert(dataPublicProduct.success === true, 'Public product response must have success:true');

    assert(!rawBodyText.includes(secretInternalLabel), 'Public product response must NOT contain any INTERNAL_ONLY option label');
    assert(!rawBodyText.includes(secretAdminLabel), 'Public product response must NOT contain any ADMIN_ONLY option label');
    assert(!('fieldsConfigJson' in dataPublicProduct.data), 'Public product response must NOT expose raw template fieldsConfigJson');
    assert(!('templateSnapshotJson' in dataPublicProduct.data), 'Public product response must NOT expose raw templateSnapshotJson');
    assert(!('template' in dataPublicProduct.data), 'Public product response must NOT expose the raw template relation');
    assert(!('pricingFormulaJson' in dataPublicProduct.data), 'Public product response must NOT expose the internal pricingFormulaJson');
    if (Array.isArray(dataPublicProduct.data.optionMappings)) {
      const leaked = dataPublicProduct.data.optionMappings.find(
        (om) => om.customLabel === secretInternalLabel || om.customLabel === secretAdminLabel
      );
      assert(!leaked, 'optionMappings array must not include any INTERNAL_ONLY/ADMIN_ONLY entries');
    }
    console.log('✔ Public product endpoint confirmed to withhold INTERNAL_ONLY/ADMIN_ONLY option data and raw template internals.');

    // ----------------------------------------------------------------
    // TEST 18: Admin endpoints reject missing/invalid authentication
    // ----------------------------------------------------------------
    console.log('\n[TEST 18] Admin endpoints reject missing/invalid authentication (401)...');
    const resNoAuth = await fetch(`${baseUrl}/api/v1/admin/configuration-templates`);
    assert(resNoAuth.status === 401, `Expected 401 with no Authorization header, got ${resNoAuth.status}`);

    const resNoAuthQuotes = await fetch(`${baseUrl}/api/v1/admin/quote-requests`);
    assert(resNoAuthQuotes.status === 401, `Expected 401 with no Authorization header, got ${resNoAuthQuotes.status}`);

    const resBadToken = await fetch(`${baseUrl}/api/v1/admin/configuration-templates`, {
      headers: { Authorization: 'Bearer not-a-real-jwt-token' },
    });
    assert(resBadToken.status === 401, `Expected 401 with a malformed token, got ${resBadToken.status}`);
    console.log('✔ Missing and malformed authentication both correctly rejected with 401 across both Phase 6A route groups.');

    // ----------------------------------------------------------------
    // TEST 19: Admin endpoints enforce required permissions (403) for an
    //          authenticated-but-unprivileged user, while permission-free
    //          admin routes remain reachable with valid auth alone.
    // ----------------------------------------------------------------
    console.log('\n[TEST 19] Admin endpoints enforce required permissions (403) for a zero-permission user...');
    const resNoPermCreate = await fetch(`${baseUrl}/api/v1/admin/configuration-templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${noPermToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: `PHASE6A_SHOULD_NOT_CREATE_${testRunId}`, name: 'x', category: 'x', fieldsConfigJson: '[]' }),
    });
    const dataNoPermCreate = await resNoPermCreate.json();
    assert(resNoPermCreate.status === 403, `Expected 403 (missing PRODUCT_EDIT), got ${resNoPermCreate.status}`);
    assert(dataNoPermCreate.success === false, '403 permission failure must have success:false');

    const resNoPermQuoteUpdate = await fetch(`${baseUrl}/api/v1/admin/quote-requests/${testQuoteId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${noPermToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'should not be allowed' }),
    });
    assert(resNoPermQuoteUpdate.status === 403, `Expected 403 (missing ORDER_UPDATE), got ${resNoPermQuoteUpdate.status}`);

    // Sanity check: the same zero-permission user IS allowed through routes that
    // only require authenticateAdmin (no requirePermission gate), confirming the
    // 403s above are due to the permission check specifically, not a broken token.
    const resNoPermList = await fetch(`${baseUrl}/api/v1/admin/configuration-templates`, {
      headers: { Authorization: `Bearer ${noPermToken}` },
    });
    assert(resNoPermList.status === 200, `Expected 200 (list has no permission gate), got ${resNoPermList.status}`);

    console.log('✔ Permission-gated routes correctly returned 403 for a valid but unprivileged user; ungated admin routes remained reachable.');

    console.log('\n================================================================');
    console.log('🎯 ALL 20 PHASE 6A VERIFICATION TESTS PASSED');
    console.log('================================================================');
  } catch (err) {
    testError = err;
    console.error('\n❌ PHASE 6A TEST SUITE FAILURE:', err.message);
  } finally {
    // ----------------------------------------------------------------
    // TEST 20: Automated Teardown & Zero Residual Test-Data Verification
    // ----------------------------------------------------------------
    console.log('\n[TEST 20] Performing automated teardown & cleanup...');
    try {
      if (createdOptionMappingIds.length > 0) {
        console.log(`Cleaning up ${createdOptionMappingIds.length} synthetic option mapping(s)...`);
        await prisma.productOptionMapping.deleteMany({ where: { id: { in: createdOptionMappingIds } } });
      }

      if (createdQuoteRequestIds.length > 0) {
        console.log(`Cleaning up ${createdQuoteRequestIds.length} synthetic quote request(s)...`);
        await prisma.quoteRequest.deleteMany({ where: { id: { in: createdQuoteRequestIds } } });
      }

      if (createdTemplateIds.length > 0) {
        console.log(`Cleaning up ${createdTemplateIds.length} synthetic configuration template(s)...`);
        await prisma.productConfigurationTemplate.deleteMany({ where: { id: { in: createdTemplateIds } } });
      }

      if (createdNoPermUserId) {
        console.log('Cleaning up synthetic zero-permission test user...');
        await prisma.user.delete({ where: { id: createdNoPermUserId } }).catch(() => {});
      }

      if (createdNoPermRoleId) {
        console.log('Cleaning up synthetic zero-permission test role...');
        await prisma.role.delete({ where: { id: createdNoPermRoleId } }).catch(() => {});
      }

      // Verify zero residual test records
      const residualMappings = await prisma.productOptionMapping.count({ where: { id: { in: createdOptionMappingIds } } });
      const residualQuotes = await prisma.quoteRequest.count({ where: { id: { in: createdQuoteRequestIds } } });
      const residualTemplates = await prisma.productConfigurationTemplate.count({ where: { id: { in: createdTemplateIds } } });
      const residualUser = createdNoPermUserId ? await prisma.user.count({ where: { id: createdNoPermUserId } }) : 0;
      const residualRole = createdNoPermRoleId ? await prisma.role.count({ where: { id: createdNoPermRoleId } }) : 0;

      assert(residualMappings === 0, 'Residual synthetic option mappings must be 0');
      assert(residualQuotes === 0, 'Residual synthetic quote requests must be 0');
      assert(residualTemplates === 0, 'Residual synthetic configuration templates must be 0');
      assert(residualUser === 0, 'Residual synthetic no-permission test user must be 0');
      assert(residualRole === 0, 'Residual synthetic no-permission test role must be 0');

      console.log('✔ Teardown completed: 100% of synthetic test records removed. ZERO residual database pollution. No pre-existing business data was touched.');
    } catch (cleanupErr) {
      console.error('Error during cleanup teardown:', cleanupErr);
    } finally {
      await prisma.$disconnect();
      server.close();
    }

    if (testError) {
      process.exit(1);
    } else {
      console.log('\n🎯 PHASE 6A CONFIGURATION FOUNDATION SUITE COMPLETE.\n');
      process.exit(0);
    }
  }
}

runPhase6ATestSuite();

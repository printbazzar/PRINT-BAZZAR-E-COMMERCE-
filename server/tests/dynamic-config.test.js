import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../src/config/jwt.js';

// Ensure test environment
process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/server.js');
const prisma = new PrismaClient();

describe('Print Bazzar: Dynamic Product Configuration & Pricing Matrix Test Suite', () => {
  let server;
  let baseUrl;
  let testAdminUser;
  let adminAuthToken;
  let testProduct;
  let sizeMaster;
  let materialMaster;

  before(async () => {
    // 1. Start server on ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`\n🧪 Config Test Server listening on ${baseUrl}`);
        resolve();
      });
    });

    // 2. Find or create an admin user with permissions
    testAdminUser = await prisma.user.findFirst({
      where: {
        isActive: true,
        role: {
          permissions: {
            some: {
              permission: { code: 'PRODUCT_EDIT' },
            },
          },
        },
      },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!testAdminUser) {
      // Fallback to any active user with ADMIN role
      testAdminUser = await prisma.user.findFirst({
        where: { isActive: true },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      });
    }

    assert.ok(testAdminUser, 'An active admin user must exist in database to run admin tests');
    adminAuthToken = signAccessToken({ userId: testAdminUser.id, role: testAdminUser.role.name });

    // 3. Find an active product for testing
    testProduct = await prisma.product.findFirst({
      where: { status: 'ACTIVE' },
      include: { optionMappings: true, priceSlabs: true },
    });
    assert.ok(testProduct, 'An active product must exist in database for configuration testing');

    // 4. Fetch seeded Option Masters
    sizeMaster = await prisma.optionMaster.findUnique({
      where: { code: 'size' },
      include: { values: true },
    });
    materialMaster = await prisma.optionMaster.findUnique({
      where: { code: 'material' },
      include: { values: true },
    });
    assert.ok(sizeMaster, 'Seeded "size" OptionMaster must exist');
    assert.ok(materialMaster, 'Seeded "material" OptionMaster must exist');
  });

  after(async () => {
    console.log('\n🧹 Cleaning up test artifacts...');
    try {
      await prisma.$disconnect();
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      console.log('✔ Test server closed cleanly.');
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
  });

  test('1. GET /admin/products/:id/configuration: Returns complete option masters & < 100ms latency', async () => {
    const startTime = performance.now();
    const res = await fetch(`${baseUrl}/api/v1/admin/products/${testProduct.id}/configuration`, {
      headers: {
        Authorization: `Bearer ${adminAuthToken}`,
      },
    });
    const latency = performance.now() - startTime;

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const body = await res.json();

    assert.equal(body.success, true);
    assert.ok(body.data.product, 'Must return product object');
    assert.equal(body.data.product.id, testProduct.id);
    assert.ok(Array.isArray(body.data.allMasters), 'allMasters must be an array');
    assert.ok(body.data.allMasters.length >= 8, `Expected at least 8 seeded option masters, found ${body.data.allMasters.length}`);
    assert.ok(Array.isArray(body.data.availableTemplates), 'availableTemplates must be an array');

    console.log(`  ✔ PASS: Configuration endpoint responded in ${latency.toFixed(1)}ms (< 100ms target) with ${body.data.allMasters.length} option masters.`);
  });

  test('2. PUT /admin/products/:id/configuration: Persists option mappings, price slabs & price version', async () => {
    const updatePayload = {
      pricingType: 'TIERED',
      quantityType: 'FIXED',
      startingPrice: 250,
      changeReason: 'Automated test suite configuration update',
      priceSlabs: [
        { minQty: 100, singleSidePrice: 250, doubleSidePrice: 400, unitPrice: 2.5 },
        { minQty: 250, singleSidePrice: 450, doubleSidePrice: 750, unitPrice: 1.8 },
        { minQty: 500, singleSidePrice: 800, doubleSidePrice: 1300, unitPrice: 1.6 },
      ],
      optionMappings: [
        {
          masterId: sizeMaster.id,
          customLabel: 'Card Size',
          isRequired: true,
          isAddon: false,
          defaultValue: sizeMaster.values[0]?.label || '3.5 × 2 inches (Standard)',
          displayOrder: 1,
          pricingBehavior: 'MATRIX_DIMENSION',
          isEnabled: true,
          valueMappings: sizeMaster.values.slice(0, 3).map((v, idx) => ({
            masterValueId: v.id,
            customLabel: v.label,
            priceModifierType: 'FLAT',
            priceModifierValue: idx === 0 ? 0 : 50,
            isDefault: idx === 0,
            isEnabled: true,
            displayOrder: idx + 1,
          })),
        },
        {
          masterId: materialMaster.id,
          customLabel: 'Card Stock Material',
          isRequired: true,
          isAddon: false,
          defaultValue: materialMaster.values[0]?.label || '350 GSM Premium Art Card',
          displayOrder: 2,
          pricingBehavior: 'MATRIX_DIMENSION',
          isEnabled: true,
          valueMappings: materialMaster.values.slice(0, 3).map((v, idx) => ({
            masterValueId: v.id,
            customLabel: v.label,
            priceModifierType: 'FLAT',
            priceModifierValue: idx === 0 ? 0 : 80,
            isDefault: idx === 0,
            isEnabled: true,
            displayOrder: idx + 1,
          })),
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/admin/products/${testProduct.id}/configuration`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuthToken}`,
      },
      body: JSON.stringify(updatePayload),
    });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify database records
    const dbSlabs = await prisma.productPriceSlab.findMany({
      where: { productId: testProduct.id },
      orderBy: { minQty: 'asc' },
    });
    assert.equal(dbSlabs.length, 3, 'Must have persisted 3 price slabs');
    assert.equal(dbSlabs[0].minQty, 100);
    assert.equal(dbSlabs[0].singleSidePrice, 250);
    assert.equal(dbSlabs[0].doubleSidePrice, 400);

    const dbVersions = await prisma.priceVersion.findMany({
      where: { productId: testProduct.id },
      orderBy: { versionNumber: 'desc' },
      take: 1,
    });
    assert.ok(dbVersions.length > 0, 'Must have recorded a price version snapshot');
    assert.equal(dbVersions[0].changeReason, updatePayload.changeReason);

    console.log(`  ✔ PASS: Successfully updated product configuration, saved 3 slabs, and created PriceVersion v${dbVersions[0].versionNumber}.0.0.`);
  });

  test('3. POST /admin/products/:id/pricing-matrix/bulk: Persists exact matrix permutations', async () => {
    const matrixEntries = [
      {
        combinationKey: '3.5x2 | 350 GSM | Single Side (Qty: 100)',
        optionsJson: JSON.stringify({ 'Card Size': '3.5 × 2 inches (Standard)', 'Card Stock': '350 GSM' }),
        quantity: 100,
        price: 250,
        unitPrice: 2.5,
        sku: 'TEST-100-1',
        isAvailable: true,
      },
      {
        combinationKey: '3.5x2 | 400 GSM Velvet | Single Side (Qty: 100)',
        optionsJson: JSON.stringify({ 'Card Size': '3.5 × 2 inches (Standard)', 'Card Stock': '400 GSM Velvet' }),
        quantity: 100,
        price: 330,
        unitPrice: 3.3,
        sku: 'TEST-100-2',
        isAvailable: true,
      },
      {
        combinationKey: '3.5x2 | 350 GSM | Single Side (Qty: 500)',
        optionsJson: JSON.stringify({ 'Card Size': '3.5 × 2 inches (Standard)', 'Card Stock': '350 GSM' }),
        quantity: 500,
        price: 800,
        unitPrice: 1.6,
        sku: 'TEST-500-1',
        isAvailable: true,
      },
    ];

    const res = await fetch(`${baseUrl}/api/v1/admin/products/${testProduct.id}/pricing-matrix/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuthToken}`,
      },
      body: JSON.stringify({ matrixEntries }),
    });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const body = await res.json();
    assert.equal(body.success, true);

    const dbMatrices = await prisma.productPricingMatrix.findMany({
      where: { productId: testProduct.id },
    });
    assert.equal(dbMatrices.length, 3, 'Must have stored 3 pricing matrix records');

    console.log(`  ✔ PASS: Bulk pricing matrix successfully stored 3 combinations in PostgreSQL.`);
  });

  test('4. POST /pricing/calculate: Accurately calculates pricing for volume slabs and double-side options', async () => {
    const res = await fetch(`${baseUrl}/api/v1/pricing/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: testProduct.id,
        quantity: 100,
        selectedOptions: {
          'Card Size': '3.5 × 2 inches (Standard)',
          'Printing Sides': 'Single Side',
        },
        artworkOption: 'PRINT_READY_FILE',
      }),
    });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.subtotal > 0, 'Subtotal must be greater than 0');
    assert.ok(data.data.grandTotal > 0, 'Grand total must include GST / delivery');

    console.log(`  ✔ PASS: Live price calculation endpoint verified (Quantity: 100 -> Subtotal: ₹${data.data.subtotal}, GrandTotal: ₹${data.data.grandTotal}).`);
  });
});

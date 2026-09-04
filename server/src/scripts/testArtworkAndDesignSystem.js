/**
 * Phase 16: Customer File Upload and Design Support System End-to-End Automated Test Suite
 * Run with: node server/src/scripts/testArtworkAndDesignSystem.js
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateProductPrice } from '../utils/pricingEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING PHASE 16: ARTWORK & DESIGN SUPPORT SYSTEM TESTS');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Database Models & Relations Verification
    // -------------------------------------------------------------
    console.log('1. Verifying Database Schema & Prisma Models...');
    const productCount = await prisma.product.count();
    assert(productCount > 0, `Products found in database (${productCount} products)`);

    // Verify models exist and can be queried
    const artworkSettingsCount = await prisma.productArtworkSetting.count();
    console.log(`   - Existing ProductArtworkSettings: ${artworkSettingsCount}`);

    const packagesCount = await prisma.productDesignPackage.count();
    console.log(`   - Existing ProductDesignPackages: ${packagesCount}`);

    const fieldsCount = await prisma.productDesignBriefField.count();
    console.log(`   - Existing ProductDesignBriefFields: ${fieldsCount}`);

    assert(true, 'Prisma models ProductArtworkSetting, ProductDesignPackage, ProductDesignBriefField exist & responsive');

    // -------------------------------------------------------------
    // Test 2: File Upload API Service & Storage
    // -------------------------------------------------------------
    console.log('\n2. Verifying Artwork Upload & Metadata Storage API...');
    const tmpDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const sampleFilePath = path.join(tmpDir, 'test_phase16_artwork.pdf');
    fs.writeFileSync(sampleFilePath, '%PDF-1.4 Phase 16 Test Mock Vector Content');

    const form = new FormData();
    const fileBuffer = fs.readFileSync(sampleFilePath);
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
    form.append('file', fileBlob, 'test_phase16_artwork.pdf');
    form.append('purpose', 'PRINT_READY');

    const uploadRes = await fetch(`${BASE_URL}/artwork/upload`, {
      method: 'POST',
      body: form,
    });

    const uploadJson = await uploadRes.json();
    assert(uploadJson.success === true, 'File upload endpoint returned success: true');
    assert(Boolean(uploadJson.fileUrl), `Valid file URL generated: ${uploadJson.fileUrl?.slice(0, 50)}...`);
    assert(uploadJson.upload?.purpose === 'PRINT_READY', 'Upload record has purpose = PRINT_READY');

    const uploadId = uploadJson.upload?.id;
    if (uploadId) {
      // Query database directly to confirm record
      const dbRecord = await prisma.artworkUpload.findUnique({ where: { id: uploadId } });
      assert(dbRecord !== null && dbRecord.originalName === 'test_phase16_artwork.pdf', 'ArtworkUpload record persisted in DB');

      // Test Delete endpoint
      const delRes = await fetch(`${BASE_URL}/artwork/${uploadId}`, { method: 'DELETE' });
      const delJson = await delRes.json();
      assert(delJson.success === true, 'Artwork delete endpoint returned success: true');

      const dbRecordAfter = await prisma.artworkUpload.findUnique({ where: { id: uploadId } });
      assert(dbRecordAfter === null, 'ArtworkUpload record successfully removed from DB');
    }

    if (fs.existsSync(sampleFilePath)) fs.unlinkSync(sampleFilePath);

    // -------------------------------------------------------------
    // Test 3: Catalog Controller Dynamic Fallback Defaults
    // -------------------------------------------------------------
    console.log('\n3. Verifying Catalog Controller Artwork Specifications & Packages API...');
    const prodRes = await fetch(`${BASE_URL}/products/standard-card`);
    const prodJson = await prodRes.json();

    assert(prodJson.success === true, 'Product detail retrieved for standard-card');
    const product = prodJson.data;

    assert(Boolean(product.artworkSetting), 'Product has artworkSetting object attached');
    assert(product.artworkSetting?.resolutionDpi === 300, 'Artwork setting enforces minimum 300 DPI');
    assert(product.artworkSetting?.colorMode === 'CMYK', 'Artwork setting specifies CMYK colour mode');
    assert(Boolean(product.artworkSetting?.acceptedFormats), `Accepted formats specified: ${product.artworkSetting?.acceptedFormats}`);

    assert(Array.isArray(product.designPackages) && product.designPackages.length > 0, `Product has ${product.designPackages?.length} design packages`);
    const firstPkg = product.designPackages[0];
    assert(typeof firstPkg.designCharge === 'number' && firstPkg.designCharge > 0, `Package "${firstPkg.packageName}" has valid design charge: ₹${firstPkg.designCharge}`);
    assert(typeof firstPkg.initialConcepts === 'number', `Package specifies initial concepts: ${firstPkg.initialConcepts}`);
    assert(typeof firstPkg.revisionsIncluded === 'number', `Package specifies revisions included: ${firstPkg.revisionsIncluded}`);

    assert(Array.isArray(product.designBriefFields) && product.designBriefFields.length > 0, `Product has ${product.designBriefFields?.length} dynamic brief fields`);
    const hasRequiredField = product.designBriefFields.some((f) => f.isRequired);
    assert(hasRequiredField, 'Dynamic brief includes required question fields');

    // -------------------------------------------------------------
    // Test 4: Pricing Engine Package Override & Breakdown
    // -------------------------------------------------------------
    console.log('\n4. Verifying Dual Pricing Engine with Design Packages...');

    // Scenario A: Option 1 (PRINT_READY_FILE) -> Design Fee must be 0
    const priceOpt1 = calculateProductPrice({
      product,
      quantity: 500,
      selectedOptions: { 'Printing Location': 'Single Side' },
      artworkOption: 'PRINT_READY_FILE',
    });
    assert(priceOpt1.designFee === 0, 'Option 1 (PRINT_READY_FILE) has designFee = ₹0');
    assert(priceOpt1.subtotal === priceOpt1.productPrice, `Subtotal (₹${priceOpt1.subtotal}) matches productPrice (₹${priceOpt1.productPrice})`);

    // Scenario B: Option 2 (DESIGN_SUPPORT) with Single-Side Package
    const chosenPkg = product.designPackages[0];
    const expectedDoubleCharge = chosenPkg.doubleSideDesignCharge != null
      ? chosenPkg.doubleSideDesignCharge
      : (product.doubleSideDesignCharge || (chosenPkg.designCharge * 2));

    const priceOpt2Single = calculateProductPrice({
      product,
      quantity: 500,
      selectedOptions: { 'Printing Location': 'Single Side' },
      artworkOption: 'DESIGN_SUPPORT',
      designPackage: chosenPkg,
    });
    assert(priceOpt2Single.designFee === chosenPkg.designCharge, `Option 2 Single Side designFee (₹${priceOpt2Single.designFee}) matches package charge (₹${chosenPkg.designCharge})`);
    assert(priceOpt2Single.designPackageName.includes(chosenPkg.packageName), `Package name reflected: "${priceOpt2Single.designPackageName}"`);
    assert(
      priceOpt2Single.subtotal === priceOpt2Single.productPrice + chosenPkg.designCharge,
      `Subtotal equals Product Price (₹${priceOpt2Single.productPrice}) + Design Fee (₹${chosenPkg.designCharge}) = ₹${priceOpt2Single.subtotal}`
    );

    // Scenario B2: Option 2 (DESIGN_SUPPORT) with Double-Side Package (Dynamic Extra Cost)
    const priceOpt2Double = calculateProductPrice({
      product,
      quantity: 500,
      selectedOptions: { 'Printing Location': 'Double Side' },
      artworkOption: 'DESIGN_SUPPORT',
      designPackage: chosenPkg,
    });
    assert(priceOpt2Double.designFee === expectedDoubleCharge, `Option 2 Double Side designFee (₹${priceOpt2Double.designFee}) matches double side charge (₹${expectedDoubleCharge})`);
    assert(priceOpt2Double.designPackageName.includes('Double Side'), `Double side indicated in name: "${priceOpt2Double.designPackageName}"`);
    assert(
      priceOpt2Double.subtotal === priceOpt2Double.productPrice + expectedDoubleCharge,
      `Double side subtotal equals Product Price (₹${priceOpt2Double.productPrice}) + Double Design Fee (₹${expectedDoubleCharge}) = ₹${priceOpt2Double.subtotal}`
    );

    // Scenario C: Live Backend Pricing Endpoint with Single & Double Side Design Package
    const backendPriceResSingle = await fetch(`${BASE_URL}/pricing/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        quantity: 500,
        selectedOptions: { 'Printing Location': 'Single Side' },
        artworkOption: 'DESIGN_SUPPORT',
        designPackage: chosenPkg,
      }),
    });
    const backendPriceJsonSingle = await backendPriceResSingle.json();
    assert(backendPriceJsonSingle.success === true, 'Backend /pricing/calculate returned success for Single Side');
    assert(backendPriceJsonSingle.pricing?.designFee === chosenPkg.designCharge, `Backend calculated Single Side designFee: ₹${backendPriceJsonSingle.pricing?.designFee}`);

    const backendPriceResDouble = await fetch(`${BASE_URL}/pricing/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        quantity: 500,
        selectedOptions: { 'Printing Location': 'Double Side' },
        artworkOption: 'DESIGN_SUPPORT',
        designPackage: chosenPkg,
      }),
    });
    const backendPriceJsonDouble = await backendPriceResDouble.json();
    assert(backendPriceJsonDouble.success === true, 'Backend /pricing/calculate returned success for Double Side');
    assert(backendPriceJsonDouble.pricing?.designFee === expectedDoubleCharge, `Backend calculated Double Side designFee: ₹${backendPriceJsonDouble.pricing?.designFee}`);

    // -------------------------------------------------------------
    // Test 5: Order Creation & Full Artwork Snapshot Persistence
    // -------------------------------------------------------------
    console.log('\n5. Verifying Order Creation & Artwork Snapshot Persistence...');
    const testOrderPayload = {
      customerName: 'Phase 16 Test Customer',
      customerEmail: 'test.phase16@printbazzar.com',
      customerMobile: '9876543210',
      customerWhatsapp: '9876543210',
      shippingAddress: { street: '123 Print Street', city: 'Trichy', state: 'Tamil Nadu', pincode: '620001' },
      billingAddress: { street: '123 Print Street', city: 'Trichy', state: 'Tamil Nadu', pincode: '620001' },
      deliveryType: 'COURIER',
      paymentMethod: 'UPI',
      items: [
        {
          productId: product.id,
          quantity: 500,
          selectedOptions: { 'Printing Location': 'Single Side' },
          designRequired: true,
          artworkOption: 'DESIGN_SUPPORT',
          designPackageId: chosenPkg.id || 'pkg-test-1',
          designPackageName: chosenPkg.packageName,
          designCharge: chosenPkg.designCharge,
          designBriefResponses: {
            brand_name: 'SuperTech Innovations',
            tagline: 'Empowering Growth',
            contact_person: 'John Doe',
          },
          designAssets: {
            logo_upload: { fileUrl: 'https://cdn.printbazzar.com/test-logo.png', fileName: 'logo.png' },
          },
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          artworkFileUrl: null,
          preflightReport: null,
        },
      ],
    };

    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOrderPayload),
    });

    const orderJson = await orderRes.json();
    assert(orderJson.success === true, `Order created successfully: ${orderJson.orderNumber}`);

    if (orderJson.order?.id) {
      // Query OrderItem from database to verify all snapshot fields
      const savedItem = await prisma.orderItem.findFirst({
        where: { orderId: orderJson.order.id },
      });

      assert(savedItem !== null, 'Saved OrderItem retrieved from DB');
      assert(savedItem.artworkOption === 'DESIGN_SUPPORT', `Snapshot artworkOption = "${savedItem.artworkOption}"`);
      assert(savedItem.designPackageName === chosenPkg.packageName, `Snapshot designPackageName = "${savedItem.designPackageName}"`);
      assert(savedItem.designCharge === chosenPkg.designCharge, `Snapshot designCharge = ₹${savedItem.designCharge}`);
      assert(savedItem.termsAccepted === true, 'Snapshot termsAccepted = true');
      assert(Boolean(savedItem.termsAcceptedAt), `Snapshot termsAcceptedAt timestamp recorded`);

      let parsedBrief = {};
      try {
        parsedBrief = typeof savedItem.designBriefResponses === 'string'
          ? JSON.parse(savedItem.designBriefResponses)
          : (savedItem.designBriefResponses || {});
      } catch (e) {
        parsedBrief = {};
      }
      assert(parsedBrief.brand_name === 'SuperTech Innovations', `Design brief response preserved: ${parsedBrief.brand_name}`);

      // Clean up test order
      await prisma.orderItem.deleteMany({ where: { orderId: orderJson.order.id } });
      await prisma.order.delete({ where: { id: orderJson.order.id } });
      console.log('   - Cleaned up test order from DB');
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n============================================================');
    if (failed === 0) {
      console.log(`🎉 ALL ${passed} PHASE 16 TESTS PASSED SUCCESSFULLY! (100% Pass Rate)`);
    } else {
      console.error(`❌ ${failed} TESTS FAILED out of ${passed + failed} total tests.`);
    }
    console.log('============================================================\n');
  } catch (err) {
    console.error('Fatal error in Phase 16 test suite:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

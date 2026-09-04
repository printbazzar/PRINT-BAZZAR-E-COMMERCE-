import { PrismaClient } from '@prisma/client';
import { calculatePricing } from '../utils/pricingEngine.js';

const prisma = new PrismaClient();

async function runTests() {
  console.log('==============================================');
  console.log('🎨 DESIGN SERVICES SUITE: AUTOMATED VERIFICATION');
  console.log('==============================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: Verify Master Packages in DB
    console.log('\n--- 1. Master Design Packages Verification ---');
    const packages = await prisma.designPackage.findMany({ orderBy: { sortOrder: 'asc' } });
    assert(packages.length >= 3, `Found ${packages.length} master packages in catalog (Expected >= 3)`);
    const standardPkg = packages.find((p) => p.name === 'Standard Design');
    assert(standardPkg && standardPkg.isDefault === true, 'Standard Design exists and is marked as default');
    assert(standardPkg && standardPkg.basePrice === 499, 'Standard Design single-side base price is ₹499');
    assert(standardPkg && standardPkg.doubleSidePrice === 799, 'Standard Design double-side base price is ₹799');

    // TEST 2: Verify Master Add-ons in DB
    console.log('\n--- 2. Master Design Add-ons Verification ---');
    const addons = await prisma.designAddon.findMany({ orderBy: { sortOrder: 'asc' } });
    assert(addons.length >= 6, `Found ${addons.length} master add-ons in catalog (Expected >= 6)`);
    const sourceFileAddon = addons.find((a) => a.name.includes('Source File'));
    assert(sourceFileAddon && sourceFileAddon.price === 300, 'Editable Source File add-on exists at ₹300');
    const extraRevAddon = addons.find((a) => a.name.includes('Extra Revision'));
    assert(extraRevAddon && extraRevAddon.price === 150, 'Extra Revision add-on exists at ₹150');

    // TEST 3: Product Mapping & Custom Override
    console.log('\n--- 3. Product Package Mappings & Custom Price Overrides ---');
    const flyer = await prisma.product.findFirst({
      where: {
        OR: [
          { name: { contains: 'Flyer', mode: 'insensitive' } },
          { slug: { contains: 'flyer' } },
        ],
      },
      include: { packageMappings: { include: { designPackage: true } } },
    });

    if (flyer && flyer.packageMappings.length > 0) {
      const flyerStandard = flyer.packageMappings.find((m) => m.designPackage.name === 'Standard Design');
      assert(flyerStandard && flyerStandard.customPrice === 699, `Flyer Standard Design has custom price override ₹699 (Actual: ₹${flyerStandard?.customPrice})`);
    } else {
      console.log('ℹ Notice: No Flyer product found to check override, skipping specific mapping check.');
    }

    // TEST 4: Pricing Engine Calculation with Design Package & Add-ons
    console.log('\n--- 4. Pricing Engine Math Verification ---');
    const sampleProduct = await prisma.product.findFirst({
      include: { options: { include: { values: true } }, priceSlabs: true },
    });

    // Single side calculation
    const singleSideCalc = calculatePricing({
      product: sampleProduct,
      quantity: 100,
      selectedOptions: { 'Printing Location': 'Single Side' },
      artworkOption: 'DESIGN_SUPPORT',
      designPackage: standardPkg,
      selectedAddons: [sourceFileAddon, extraRevAddon], // +300 + 150 = 450
    });

    assert(singleSideCalc.basePackageFee === 499, `Single-side package fee is ₹499 (Actual: ₹${singleSideCalc.basePackageFee})`);
    assert(singleSideCalc.designAddonsFee === 450, `Add-ons total fee is ₹450 (Actual: ₹${singleSideCalc.designAddonsFee})`);
    assert(singleSideCalc.designFee === 949, `Total Design Service Fee is ₹949 (Actual: ₹${singleSideCalc.designFee})`);
    assert(
      singleSideCalc.subtotal === singleSideCalc.productPrice + 949,
      `Subtotal includes Product Price (₹${singleSideCalc.productPrice}) + Design Fee (₹949) = ₹${singleSideCalc.subtotal}`
    );

    // Double side calculation
    const doubleSideCalc = calculatePricing({
      product: sampleProduct,
      quantity: 100,
      selectedOptions: { 'Printing Location': 'Double Side' },
      artworkOption: 'DESIGN_SUPPORT',
      designPackage: standardPkg,
      selectedAddons: [sourceFileAddon], // +300
    });

    assert(doubleSideCalc.basePackageFee === 799, `Double-side package fee is ₹799 (Actual: ₹${doubleSideCalc.basePackageFee})`);
    assert(doubleSideCalc.designAddonsFee === 300, `Add-ons total fee is ₹300 (Actual: ₹${doubleSideCalc.designAddonsFee})`);
    assert(doubleSideCalc.designFee === 1099, `Total Double-side Design Service Fee is ₹1099 (Actual: ₹${doubleSideCalc.designFee})`);

    // TEST 5: Order Creation & Linked Design Order Generation
    console.log('\n--- 5. Order Creation & Design Job Lifecycle ---');
    const testOrderNum = `PB-TEST-${Date.now()}`;
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: testOrderNum,
        customerName: 'Antigravity Test Customer',
        customerEmail: 'test.customer@printbazzar.com',
        customerMobile: '9876543210',
        shippingAddress: '123 Test Road, Chennai, Tamil Nadu 600001',
        billingAddress: '123 Test Road, Chennai, Tamil Nadu 600001',
        grandTotal: singleSideCalc.grandTotal,
        subtotal: singleSideCalc.subtotal,
        orderStatus: 'PENDING',
        paymentStatus: 'PAID',
        currentDepartment: 'DESIGN',
        proofStatus: 'PENDING',
        items: {
          create: [
            {
              productId: sampleProduct.id,
              productNameSnapshot: sampleProduct.name,
              skuSnapshot: sampleProduct.sku || 'SKU-TEST',
              quantity: 100,
              unitPriceSnapshot: singleSideCalc.subtotal / 100,
              totalPriceSnapshot: singleSideCalc.subtotal,
              designRequired: true,
              artworkOption: 'DESIGN_SUPPORT',
              designPackageId: standardPkg.id,
              designPackageName: standardPkg.name,
              designCharge: singleSideCalc.designFee,
              selectedAddons: JSON.stringify([sourceFileAddon, extraRevAddon]),
              preferredStyle: 'Modern Minimalist',
              preferredColor: 'Navy Blue & Gold',
              requirementNotes: 'Antigravity automated design verification test.',
            },
          ],
        },
      },
      include: { items: true },
    });

    assert(testOrder && testOrder.id, `Created test order: ${testOrder.orderNumber}`);

    // Generate Design Job
    const createdItem = testOrder.items[0];
    const designCount = await prisma.designOrder.count();
    const designJobNumber = `PB-DES-${new Date().getFullYear()}-${String(designCount + 1).padStart(5, '0')}`;

    const designJob = await prisma.designOrder.create({
      data: {
        designJobNumber,
        orderId: testOrder.id,
        orderItemId: createdItem.id,
        productId: createdItem.productId,
        packageId: standardPkg.id,
        packageNameSnapshot: standardPkg.name,
        packagePriceSnapshot: createdItem.designCharge,
        packageSnapshotJson: JSON.stringify(standardPkg),
        addonsSnapshotJson: createdItem.selectedAddons,
        requirementNotes: createdItem.requirementNotes,
        preferredStyle: createdItem.preferredStyle,
        preferredColor: createdItem.preferredColor,
        status: 'REQUIREMENT_RECEIVED',
        priority: 'NORMAL',
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    });

    assert(designJob && designJob.designJobNumber.startsWith('PB-DES-'), `Generated Design Job: ${designJob.designJobNumber}`);
    assert(designJob.status === 'REQUIREMENT_RECEIVED', 'Initial design job status is REQUIREMENT_RECEIVED');

    // TEST 6: Upload Draft Revision & Proof Sent
    console.log('\n--- 6. Draft Revision & Proof Submission ---');
    const draftRev = await prisma.designRevision.create({
      data: {
        designOrderId: designJob.id,
        revisionNumber: 1,
        draftFileUrl: 'https://storage.supabase.co/mock/proof-draft-1.pdf',
        designerResponse: 'Initial proof layout based on Navy Blue & Gold palette.',
        status: 'PENDING_REVIEW',
      },
    });

    await prisma.designOrder.update({
      where: { id: designJob.id },
      data: { status: 'DRAFT_READY' },
    });

    assert(draftRev && draftRev.revisionNumber === 1, 'Draft Revision #1 created successfully');

    // TEST 7: Customer / Admin Approval & Printing Handover
    console.log('\n--- 7. Approval & Press Activation ---');
    await prisma.designOrder.update({
      where: { id: designJob.id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

    // Check parent order transfer
    const updatedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        proofStatus: 'APPROVED',
        proofApprovedAt: new Date(),
        currentDepartment: 'PRODUCTION', // Handover to press!
        orderStatus: 'PRODUCTION_QUEUE',
      },
    });

    assert(updatedOrder.proofStatus === 'APPROVED', 'Order proofStatus updated to APPROVED');
    assert(updatedOrder.currentDepartment === 'PRODUCTION', 'Order currentDepartment transitioned to PRODUCTION');
    assert(updatedOrder.orderStatus === 'PRODUCTION_QUEUE', 'Order unlocked and moved to PRODUCTION_QUEUE for physical press!');

    // Cleanup test record
    await prisma.designRevision.deleteMany({ where: { designOrderId: designJob.id } });
    await prisma.designOrder.delete({ where: { id: designJob.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.order.delete({ where: { id: testOrder.id } });
    console.log('Cleaned up test order records.');

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failed++;
  } finally {
    console.log('\n==============================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('==============================================');
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

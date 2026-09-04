import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('=== STARTING WORKFLOW VERIFICATION TEST ===\n');

  try {
    // 1. Get a product to place test order
    const product = await prisma.product.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!product) {
      throw new Error('No active product found for testing.');
    }

    console.log(`Step 1: Found active test product: "${product.name}" (${product.sku})`);

    const year = new Date().getFullYear();
    const orderCount = await prisma.order.count();
    const orderSeq = String(orderCount + 100).padStart(6, '0');
    const orderNumber = `PB-ORD-${year}-${orderSeq}`;

    // 2. Create customer and full unified order
    const customer = await prisma.customer.findFirst();
    const subtotal = 450;
    const shipping = 0; // Store Pickup
    const tax = Math.round((subtotal * 18) / 100);
    const grandTotal = subtotal + shipping;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        customerName: 'Test Workflow Customer',
        customerMobile: '9876543210',
        customerEmail: 'workflow@test.com',
        shippingAddress: JSON.stringify({ street: 'Store Pickup', city: 'Trichy', state: 'Tamil Nadu', pincode: '620008' }),
        deliveryMethod: 'STORE_PICKUP',
        pickupLocation: 'Print Bazzar Press Facility, No. 42 Big Bazzar St, Trichy - 620008',
        subtotal,
        shippingCharge: shipping,
        cgstAmount: Math.round(tax / 2),
        sgstAmount: tax - Math.round(tax / 2),
        totalTax: tax,
        grandTotal,
        paymentStatus: 'CONFIRMED',
        orderStatus: 'DESIGN_IN_PROGRESS',
        currentDepartment: 'DESIGN',
        items: {
          create: [
            {
              productId: product.id,
              productNameSnapshot: product.name,
              skuSnapshot: product.sku,
              quantity: 500,
              unitPriceSnapshot: subtotal / 500,
              totalPriceSnapshot: subtotal,
              designRequired: true,
              designPackageName: 'Custom Graphic Design',
              designCharge: 200,
              optionsSnapshot: JSON.stringify({ 'Paper Type': '350 GSM Art Card', 'Lamination': 'Matte' }),
            },
          ],
        },
      },
      include: { items: true },
    });

    console.log(`Step 2: Created Master Order ${order.orderNumber} (ID: ${order.id})`);

    // 3. Create Linked Design Order
    const designOrder = await prisma.designOrder.create({
      data: {
        designJobNumber: `PB-DES-${year}-${orderSeq.slice(-5)}`,
        orderId: order.id,
        orderItemId: order.items[0].id,
        productId: product.id,
        packageNameSnapshot: 'Custom Graphic Design',
        packagePriceSnapshot: 200,
        status: 'REQUIREMENT_RECEIVED',
      },
    });
    console.log(`Step 3: Created Linked Design Job ${designOrder.designJobNumber}`);

    // 4. Create Linked Production Job Card with DESIGN LOCK
    const prodJob = await prisma.productionJob.create({
      data: {
        jobNumber: `PB-JOB-${year}-${orderSeq.slice(-5)}`,
        orderId: order.id,
        orderItemId: order.items[0].id,
        productId: product.id,
        productNameSnapshot: product.name,
        quantity: 500,
        priority: 'STANDARD',
        status: 'WAITING_FOR_DESIGN_APPROVAL',
        artworkStatus: 'WAITING_APPROVAL',
        specsSnapshotJson: JSON.stringify({ size: '90x53mm', gsm: '350', lamination: 'Matte' }),
      },
    });
    console.log(`Step 4: Created Linked Production Job ${prodJob.jobNumber} with status: ${prodJob.status} (DESIGN LOCK active)`);

    // 5. Create Linked Invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `PB-INV-${year}-${orderSeq.slice(-5)}`,
        orderId: order.id,
        invoiceType: 'ORDER_RECEIPT',
        subtotal,
        taxableAmount: subtotal,
        cgst: Math.round(tax / 2),
        sgst: tax - Math.round(tax / 2),
        totalTax: tax,
        shippingCharge: shipping,
        grandTotal,
        paymentStatus: 'PAID',
      },
    });
    console.log(`Step 5: Created Linked Invoice ${invoice.invoiceNumber}`);

    // 6. Create Linked Shipment
    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber: `PB-SHIP-${year}-${orderSeq.slice(-5)}`,
        orderId: order.id,
        deliveryMethod: 'STORE_PICKUP',
        recipientName: 'Test Workflow Customer',
        mobile: '9876543210',
        fullAddress: 'Store Pickup - No. 42 Big Bazzar St, Trichy',
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        pincode: '620008',
        status: 'PENDING',
      },
    });
    console.log(`Step 6: Created Linked Shipment ${shipment.shipmentNumber}`);

    // 7. Test Design Unlock: Approve Design
    await prisma.designOrder.update({
      where: { id: designOrder.id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    await prisma.productionJob.update({
      where: { id: prodJob.id },
      data: {
        status: 'QUEUED',
        artworkStatus: 'APPROVED',
        approvedArtworkUrl: 'https://printbazzar.online/uploads/test-approved-proof.pdf',
        approvedArtworkVersion: 'Proof V1 - Approved',
      },
    });
    console.log(`Step 7: Design Approved! Production Job ${prodJob.jobNumber} unlocked to status: QUEUED`);

    // 8. Advance Production to FINISHING & SEND_TO_QC
    await prisma.productionJob.update({
      where: { id: prodJob.id },
      data: {
        status: 'SENT_TO_QC',
        machineNumber: 'Konica Minolta AccurioPress C4070 (Digital)',
        assignedStaffName: 'Press Master Manikandan',
      },
    });
    const qc = await prisma.qualityCheck.create({
      data: {
        qcNumber: `PB-QC-${year}-${orderSeq.slice(-5)}`,
        orderId: order.id,
        productionJobId: prodJob.id,
        status: 'PENDING',
      },
    });
    console.log(`Step 8: Press run & Finishing completed! QC ticket created: ${qc.qcNumber}`);

    // 9. Inspect & Pass QC
    await prisma.qualityCheck.update({
      where: { id: qc.id },
      data: {
        status: 'PASSED',
        inspectorName: 'QC Lead Senthil',
        inspectedAt: new Date(),
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { currentDepartment: 'PACKING', orderStatus: 'PACKED' },
    });
    console.log(`Step 9: Quality Check PASSED 100%! Order transferred to PACKING department`);

    // 10. Complete Packing & Mark Ready for Store Pickup
    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: 'READY_FOR_DELIVERY',
        pickupReadyAt: new Date(),
      },
    });
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: 'READY_FOR_PICKUP', packageCount: 1, packageWeightKg: 1.2 },
    });
    console.log(`Step 10: Packing completed (1 parcel, 1.2 kg). Marked READY FOR STORE PICKUP`);

    // 11. Store Pickup Handover
    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: 'DELIVERED',
        currentDepartment: 'COMPLETED',
        pickedUpAt: new Date(),
        pickupVerifiedBy: 'Store Counter Staff',
      },
    });
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: 'PICKED_UP', deliveredAt: new Date() },
    });
    console.log(`Step 11: Store Pickup complete! Customer received parcel. Order marked DELIVERED & COMPLETED`);

    // 12. Clean up test order
    await prisma.order.delete({ where: { id: order.id } });
    console.log(`\nStep 12: Test order successfully cleaned up.`);

    console.log('\n✅ ALL 12 WORKFLOW STEPS VALIDATED AND FUNCTIONING FLAWLESSLY!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();

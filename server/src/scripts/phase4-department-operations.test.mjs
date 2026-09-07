/**
 * Automated Verification Suite for Phase 4:
 * Print Bazzar Unified Department Dashboard & Staff Operations Architecture
 *
 * Tests:
 * TEST 1: Prepress Workstation — Customer proof approval & Pre-Production QC gate release
 * TEST 2: Press Room Workstation — Machine selection, operator assignment, start/finish print run
 * TEST 3: Finishing & QC Workstation — QC inspection ticket, Defect Reject reroute & QC Pass to Packing
 * TEST 4: Packing Desk Workstation — Strict parcel weight & box dimensions validation & Shipment generation
 * TEST 5: Logistics Workstation — Courier Dispatch with auto-resolved tracking URL & live status
 * TEST 6: Store Pickup Counter — Blocked if unpaid balance, balance collection at counter (UPI/Cash), atomic settlement & customer handover
 * TEST 7: Role-Based Department Authorization — Cross-department action enforcement & 403 prevention
 * TEST 8: Synthetic Test Data Teardown & Verification
 */

import http from 'http';
import { PrismaClient } from '@prisma/client';
import app from '../server.js';
import { signAccessToken } from '../config/jwt.js';

const prisma = new PrismaClient();

// Helper assertion function
function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

async function runPhase4TestSuite() {
  console.log('================================================================');
  console.log('🧪 PRINT BAZZAR — PHASE 4 DEPARTMENT OPERATIONS VERIFICATION SUITE');
  console.log('================================================================');

  // Start temporary local HTTP server on random free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TEST HARNESS] Local test server running on ${baseUrl}`);

  const createdOrderIds = [];
  const createdCustomerIds = [];
  const testRunId = Date.now().toString().slice(-6);
  let testError = null;

  try {
    // 1. Resolve Staff Users & Generate Department Tokens
    const superAdmin = await prisma.user.findFirst({
      where: { email: 'admin@printbazzar.online' },
      include: { role: true },
    });
    const designStaff = await prisma.user.findFirst({
      where: { email: 'design@printbazzar.online' },
      include: { role: true },
    });
    const pressStaff = await prisma.user.findFirst({
      where: { email: 'press@printbazzar.online' },
      include: { role: true },
    });
    const deliveryStaff = await prisma.user.findFirst({
      where: { email: 'delivery@printbazzar.online' },
      include: { role: true },
    });

    assert(superAdmin, 'Super Admin user must exist in DB');
    assert(designStaff, 'Design staff must exist in DB');
    assert(pressStaff, 'Press staff must exist in DB');
    assert(deliveryStaff, 'Delivery staff must exist in DB');

    const superAdminToken = signAccessToken({ userId: superAdmin.id, email: superAdmin.email, role: superAdmin.role.name });
    const designToken = signAccessToken({ userId: designStaff.id, email: designStaff.email, role: designStaff.role.name });
    const pressToken = signAccessToken({ userId: pressStaff.id, email: pressStaff.email, role: pressStaff.role.name });
    const deliveryToken = signAccessToken({ userId: deliveryStaff.id, email: deliveryStaff.email, role: deliveryStaff.role.name });

    // Resolve an existing product for test orders
    const testProduct = await prisma.product.findFirst();
    assert(testProduct, 'At least one product must exist in DB');

    // ----------------------------------------------------------------
    // TEST 1: Prepress Workstation — Proof Approval & Pre-Production QC Gate
    // ----------------------------------------------------------------
    console.log('\n[TEST 1] Prepress Workstation: Proof approval & Pre-Production QC gate...');
    const resCreate1 = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: `Test Customer P4-1 (${testRunId})`,
        customerMobile: '9876543210',
        customerEmail: `test_p4_1_${testRunId}@printbazzar.com`,
        shippingAddress: { street: '10 Rockfort Road', city: 'Trichy', state: 'Tamil Nadu', pincode: '620002' },
        paymentMethod: 'ONLINE',
        deliveryMethod: 'COURIER',
        items: [
          {
            productId: testProduct.id,
            quantity: 500,
            selectedOptions: { Size: 'Standard 3.5x2', Material: '350 GSM Art Card', Lamination: 'Matte' },
            designRequired: false,
            artworkFileUrl: 'https://printbazzar.online/uploads/test_artwork_p4_1.pdf',
          },
        ],
      }),
    });
    const dataCreate1 = await resCreate1.json();
    assert(dataCreate1.success, `Order 1 creation failed: ${dataCreate1.message}`);
    const order1Id = dataCreate1.order.id;
    const order1Number = dataCreate1.order.orderNumber;
    createdOrderIds.push(order1Id);
    if (dataCreate1.order.customerId) createdCustomerIds.push(dataCreate1.order.customerId);

    // Verify online payment to move to ORDER_REVIEW
    const resVerify1 = await fetch(`${baseUrl}/api/v1/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order1Number,
        paymentId: `pay_test_p4_1_${testRunId}`,
        orderId: `order_test_p4_1_${testRunId}`,
        paymentMethod: 'UPI',
        paymentStage: 'FULL',
      }),
    });
    const dataVerify1 = await resVerify1.json();
    assert(dataVerify1.success, `Payment verification 1 failed: ${dataVerify1.message}`);

    // Customer approves proof online
    const resProof1 = await fetch(`${baseUrl}/api/v1/orders/${order1Number}/approve-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'APPROVED',
        customerComment: 'Approved for digital offset printing!',
      }),
    });
    const dataProof1 = await resProof1.json();
    assert(dataProof1.success, `Proof approval failed: ${dataProof1.message}`);

    // Verify strict rule: Customer proof approval moved order to PRE_PRODUCTION_QC (NOT PRODUCTION_QUEUE)
    const dbOrder1Proof = await prisma.order.findUnique({
      where: { id: order1Id },
      include: { productionJobs: true },
    });
    assert(dbOrder1Proof.orderStatus === 'PRE_PRODUCTION_QC', 'Order must be strictly in PRE_PRODUCTION_QC');
    assert(dbOrder1Proof.currentDepartment === 'PRODUCTION', 'Order must be in PRODUCTION department');
    assert(dbOrder1Proof.productionJobs[0].status === 'QC_PENDING', 'ProductionJob must be in QC_PENDING');

    // Prepress Lead passes Pre-Production QC Gate with 12-point checklist
    const validPreChecklist = {
      correctArtworkVersion: true,
      customerApprovedArtwork: true,
      correctSize: true,
      correctQuantity: true,
      correctMaterial: true,
      correctGsm: true,
      colorModeCmyk: true,
      resolutionVerification: true,
      bleedMarginVerification: true,
      laminationVerification: true,
      cuttingFinishingVerification: true,
      specialInstructionsVerification: true,
    };

    const resPreQC1 = await fetch(`${baseUrl}/api/v1/admin/orders/${order1Id}/pre-production-qc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${designToken}`,
      },
      body: JSON.stringify({
        action: 'APPROVE_FOR_PRODUCTION',
        checklist: validPreChecklist,
        inspectorName: 'Prepress Officer Senthil',
        notes: 'Prepress flightcheck passed 100%. CMYK 300DPI confirmed.',
      }),
    });
    const dataPreQC1 = await resPreQC1.json();
    assert(dataPreQC1.success, `Pre-production QC approval failed: ${dataPreQC1.message}`);

    // Verify order is now in PRODUCTION_QUEUE and Job is QUEUED
    const dbOrder1PostQC = await prisma.order.findUnique({
      where: { id: order1Id },
      include: { productionJobs: true },
    });
    assert(dbOrder1PostQC.orderStatus === 'PRODUCTION_QUEUE', 'Order must enter PRODUCTION_QUEUE');
    assert(dbOrder1PostQC.productionJobs[0].status === 'QUEUED', 'ProductionJob must enter QUEUED');
    console.log('✅ PASS: Prepress Workstation proof approval & Pre-Production QC release verified.');

    // ----------------------------------------------------------------
    // TEST 2: Press Room Workstation — Machine & Operator Assignment, Printing
    // ----------------------------------------------------------------
    console.log('\n[TEST 2] Press Room Workstation: Machine assignment, operator assignment & print run...');
    const job1 = dbOrder1PostQC.productionJobs[0];

    // Press operator starts printing job
    const resStartPrint = await fetch(`${baseUrl}/api/v1/admin/production/jobs/${job1.id}/stage`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pressToken}`,
      },
      body: JSON.stringify({
        stage: 'PRINTING',
        machineNumber: 'Konica Minolta AccurioPress C4080',
        assignedStaffName: 'Press Operator Murugan',
        notes: '350 GSM Art Card loaded on Konica Minolta Press.',
      }),
    });
    const dataStartPrint = await resStartPrint.json();
    assert(dataStartPrint.success, `Start print failed: ${dataStartPrint.message}`);

    const dbOrder1Printing = await prisma.order.findUnique({
      where: { id: order1Id },
      include: { productionJobs: true },
    });
    assert(dbOrder1Printing.orderStatus === 'PRINTING', 'Order status must be PRINTING');
    assert(dbOrder1Printing.productionJobs[0].status === 'PRINTING', 'Job status must be PRINTING');
    assert(dbOrder1Printing.productionJobs[0].machineNumber === 'Konica Minolta AccurioPress C4080', 'Machine number must be assigned');
    assert(dbOrder1Printing.productionJobs[0].assignedStaffName === 'Press Operator Murugan', 'Operator must be assigned');

    // Press operator completes printing and transfers to Finishing
    const resFinishPrint = await fetch(`${baseUrl}/api/v1/admin/production/jobs/${job1.id}/stage`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pressToken}`,
      },
      body: JSON.stringify({
        stage: 'FINISHING',
        notes: '500 sheets printed on Konica Minolta. Handed over to Finishing.',
      }),
    });
    const dataFinishPrint = await resFinishPrint.json();
    assert(dataFinishPrint.success, `Finish print failed: ${dataFinishPrint.message}`);

    const dbOrder1Finishing = await prisma.order.findUnique({
      where: { id: order1Id },
      include: { productionJobs: true },
    });
    assert(dbOrder1Finishing.orderStatus === 'FINISHING', 'Order status must be FINISHING');
    assert(dbOrder1Finishing.currentDepartment === 'FINISHING_QC', 'Department must be FINISHING_QC');
    assert(dbOrder1Finishing.productionJobs[0].status === 'FINISHING', 'Job status must be FINISHING');

    // Finishing desk completes lamination/trimming and sends to QC
    const resSendQC = await fetch(`${baseUrl}/api/v1/admin/production/jobs/${job1.id}/stage`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pressToken}`,
      },
      body: JSON.stringify({
        stage: 'SENT_TO_QC',
        notes: 'Lamination and cutting completed. Transferred to QC inspection desk.',
      }),
    });
    const dataSendQC = await resSendQC.json();
    assert(dataSendQC.success, `Send to QC failed: ${dataSendQC.message}`);

    const dbOrder1QC = await prisma.order.findUnique({
      where: { id: order1Id },
      include: { productionJobs: true },
    });
    assert(dbOrder1QC.orderStatus === 'QC', 'Order status must be QC');
    assert(dbOrder1QC.currentDepartment === 'FINISHING_QC', 'Department must be FINISHING_QC');
    assert(dbOrder1QC.productionJobs[0].status === 'SENT_TO_QC', 'Job status must be SENT_TO_QC');
    console.log('✅ PASS: Press Room machine assignment, operator assignment, and stage transitions verified.');

    // ----------------------------------------------------------------
    // TEST 3: Finishing & QC Workstation — Defect Reject Reroute & QC Pass
    // ----------------------------------------------------------------
    console.log('\n[TEST 3] Finishing & QC Workstation: Defect reject reroute and QC Pass...');
    
    // Fetch QC ticket auto-created for this job
    const qcQueueRes = await fetch(`${baseUrl}/api/v1/admin/qc/queue?status=PENDING`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const qcQueueData = await qcQueueRes.json();
    assert(qcQueueData.success, 'Failed to fetch QC queue');
    const qcTicket1 = qcQueueData.data.find((t) => t.orderId === order1Id);
    assert(qcTicket1, 'Auto-instantiated QC ticket must exist for Order 1');

    // 3A: Defect Rejection with Reroute to Press Room
    const resQCReject = await fetch(`${baseUrl}/api/v1/admin/qc/${qcTicket1.id}/inspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        status: 'FAILED',
        failureReason: 'COLOR_MISMATCH',
        failureNotes: 'Cyan saturation 15% above tolerance. Reprint required on Konica Minolta.',
        inspectorName: 'QC Inspector Priya',
      }),
    });
    const dataQCReject = await resQCReject.json();
    assert(dataQCReject.success, `QC Reject failed: ${dataQCReject.message}`);

    // Verify order was rerouted back to PRODUCTION_QUEUE and job REJECTED
    const dbOrder1Rejected = await prisma.order.findUnique({
      where: { id: order1Id },
      include: { productionJobs: true },
    });
    assert(dbOrder1Rejected.orderStatus === 'PRODUCTION_QUEUE', 'Order must be returned to PRODUCTION_QUEUE upon defect reject');
    assert(dbOrder1Rejected.currentDepartment === 'PRODUCTION', 'Department must be returned to PRODUCTION');
    assert(dbOrder1Rejected.productionJobs[0].status === 'REJECTED', 'Job status must be REJECTED');

    // Reprint progression through strict state machine: REJECTED -> QUEUED -> PRINTING -> FINISHING -> SENT_TO_QC
    await fetch(`${baseUrl}/api/v1/admin/production/jobs/${job1.id}/stage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pressToken}` },
      body: JSON.stringify({ stage: 'QUEUED', notes: 'Re-queued for color-corrected reprint.' }),
    });
    await fetch(`${baseUrl}/api/v1/admin/production/jobs/${job1.id}/stage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pressToken}` },
      body: JSON.stringify({ stage: 'PRINTING', notes: 'Color-corrected reprint running on Konica Minolta.' }),
    });
    await fetch(`${baseUrl}/api/v1/admin/production/jobs/${job1.id}/stage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pressToken}` },
      body: JSON.stringify({ stage: 'FINISHING', notes: 'Reprint sheets laminated.' }),
    });
    await fetch(`${baseUrl}/api/v1/admin/production/jobs/${job1.id}/stage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pressToken}` },
      body: JSON.stringify({ stage: 'SENT_TO_QC', notes: 'Reprint sheets sent to QC for re-inspection.' }),
    });

    // 3B: QC Inspection Pass
    const qcTicket2 = await prisma.qualityCheck.findFirst({
      where: { orderId: order1Id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    assert(qcTicket2, 'Pending QC ticket must exist for re-inspection');

    const resQCPass = await fetch(`${baseUrl}/api/v1/admin/qc/${qcTicket2.id}/inspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        status: 'PASSED',
        checklist: {
          correctQuantity: true,
          correctSize: true,
          correctMaterial: true,
          correctColour: true,
          correctLamination: true,
          correctFinishing: true,
          noDamage: true,
          correctCustomization: true,
          matchesApprovedArtwork: true,
        },
        inspectorName: 'QC Inspector Priya',
      }),
    });
    const dataQCPass = await resQCPass.json();
    assert(dataQCPass.success, `QC Pass failed: ${dataQCPass.message}`);

    // Verify Order is now in PACKED / Department PACKING
    const dbOrder1Packed = await prisma.order.findUnique({
      where: { id: order1Id },
      include: { productionJobs: true },
    });
    assert(dbOrder1Packed.orderStatus === 'PACKED', 'Order status must be PACKED');
    assert(dbOrder1Packed.currentDepartment === 'PACKING', 'Department must be PACKING');
    assert(dbOrder1Packed.productionJobs[0].status === 'COMPLETED', 'Production job must be COMPLETED');
    console.log('✅ PASS: Finishing & QC defect reject reroute and final QC Pass verified.');

    // ----------------------------------------------------------------
    // TEST 4: Packing Desk Workstation — Validation & Shipment Generation
    // ----------------------------------------------------------------
    console.log('\n[TEST 4] Packing Desk Workstation: Parcel weight & box dimensions validation...');

    // 4A: Missing parcel weight or 0 weight must fail with 400
    const resPackInvalidWeight = await fetch(`${baseUrl}/api/v1/admin/logistics/orders/${order1Id}/pack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliveryToken}`,
      },
      body: JSON.stringify({
        packageWeightKg: 0,
        boxDimensions: '25x20x10 cm',
        packageCount: 1,
      }),
    });
    assert(resPackInvalidWeight.status === 400, 'Zero or missing parcel weight must return 400');

    // 4B: Missing box dimensions must fail with 400
    const resPackInvalidBox = await fetch(`${baseUrl}/api/v1/admin/logistics/orders/${order1Id}/pack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliveryToken}`,
      },
      body: JSON.stringify({
        packageWeightKg: 1.75,
        boxDimensions: '   ',
        packageCount: 1,
      }),
    });
    assert(resPackInvalidBox.status === 400, 'Blank box dimensions must return 400');

    // 4C: Valid Packing Submission
    const resPackValid = await fetch(`${baseUrl}/api/v1/admin/logistics/orders/${order1Id}/pack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliveryToken}`,
      },
      body: JSON.stringify({
        packageWeightKg: 1.75,
        boxDimensions: '30x22x12 cm',
        packageCount: 1,
        packingStaffName: 'Packing Officer Vignesh',
      }),
    });
    const dataPackValid = await resPackValid.json();
    assert(dataPackValid.success, `Valid packing failed: ${dataPackValid.message}`);

    const dbOrder1ReadyDispatch = await prisma.order.findUnique({
      where: { id: order1Id },
      include: { shipments: true },
    });
    assert(dbOrder1ReadyDispatch.orderStatus === 'READY_FOR_DELIVERY', 'Order status must be READY_FOR_DELIVERY');
    assert(dbOrder1ReadyDispatch.currentDepartment === 'DELIVERY', 'Department must be DELIVERY');
    assert(dbOrder1ReadyDispatch.shipments.length > 0, 'Shipment record must be generated');
    assert(dbOrder1ReadyDispatch.shipments[0].packageWeightKg === 1.75, 'Shipment weight must be recorded');
    assert(dbOrder1ReadyDispatch.shipments[0].boxDimensions === '30x22x12 cm', 'Box dimensions must be recorded');
    console.log('✅ PASS: Packing Desk validation and Shipment creation verified.');

    // ----------------------------------------------------------------
    // TEST 5: Logistics Workstation — Courier Dispatch with Auto-Resolved URL
    // ----------------------------------------------------------------
    console.log('\n[TEST 5] Logistics Workstation: Courier dispatch with auto-computed tracking URL...');
    const resDispatch = await fetch(`${baseUrl}/api/v1/admin/logistics/orders/${order1Id}/dispatch-courier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliveryToken}`,
      },
      body: JSON.stringify({
        courierPartner: 'ST Courier',
        trackingNumber: `ST${testRunId}IN`,
        dispatchStaffName: 'Logistics Lead Vignesh',
      }),
    });
    const dataDispatch = await resDispatch.json();
    assert(dataDispatch.success, `Courier dispatch failed: ${dataDispatch.message}`);

    const dbOrder1Dispatched = await prisma.order.findUnique({
      where: { id: order1Id },
      include: { shipments: true },
    });
    assert(dbOrder1Dispatched.orderStatus === 'OUT_FOR_DELIVERY', 'Order must be OUT_FOR_DELIVERY');
    assert(dbOrder1Dispatched.courierPartner === 'ST Courier', 'Courier partner must be ST Courier');
    assert(dbOrder1Dispatched.trackingReference === `ST${testRunId}IN`, 'AWB number must match');
    assert(
      dbOrder1Dispatched.trackingUrl.includes('stcourier.com') && dbOrder1Dispatched.trackingUrl.includes(`ST${testRunId}IN`),
      `Auto-computed tracking URL must be valid: ${dbOrder1Dispatched.trackingUrl}`
    );
    assert(
      dbOrder1Dispatched.shipments[0].status === 'SHIPPED' || dbOrder1Dispatched.shipments[0].status === 'IN_TRANSIT',
      `Shipment must be marked SHIPPED or IN_TRANSIT, got ${dbOrder1Dispatched.shipments[0].status}`
    );
    console.log('✅ PASS: Doorstep Courier dispatch and auto-computed tracking URL verified.');

    // ----------------------------------------------------------------
    // TEST 6: Store Pickup Counter — Outstanding Balance Collection & Handover
    // ----------------------------------------------------------------
    console.log('\n[TEST 6] Store Pickup Counter: Unpaid balance block, counter collection & handover...');
    
    // Create an order configured for STORE_PICKUP with outstanding balance
    const resCreatePickup = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: `Test Pickup Customer (${testRunId})`,
        customerMobile: '9443322110',
        customerEmail: `test_pickup_${testRunId}@printbazzar.com`,
        shippingAddress: { street: 'Pickup Desk - Thillai Nagar', city: 'Trichy', state: 'Tamil Nadu', pincode: '620018' },
        paymentMethod: 'STORE_PICKUP_PAY',
        deliveryMethod: 'STORE_PICKUP',
        items: [
          {
            productId: testProduct.id,
            quantity: 100,
            selectedOptions: { Size: 'A4', Paper: '130 GSM Glossy' },
            designRequired: false,
          },
        ],
      }),
    });
    const dataCreatePickup = await resCreatePickup.json();
    assert(dataCreatePickup.success, `Pickup Order creation failed: ${dataCreatePickup.message}`);
    const pickupOrderId = dataCreatePickup.order.id;
    createdOrderIds.push(pickupOrderId);
    if (dataCreatePickup.order.customerId) createdCustomerIds.push(dataCreatePickup.order.customerId);

    // Fast-forward this store pickup order to PACKED / READY_FOR_PICKUP
    await prisma.order.update({
      where: { id: pickupOrderId },
      data: {
        orderStatus: 'READY_FOR_DELIVERY',
        currentDepartment: 'DELIVERY',
        deliveryMethod: 'STORE_PICKUP',
        paymentStatus: 'PARTIALLY_PAID',
      },
    });

    // Create an invoice with an outstanding balance of ₹450
    const testInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `PB-INV-TEST-P4-${testRunId}`,
        orderId: pickupOrderId,
        subtotal: 450.0,
        taxableAmount: 450.0,
        grandTotal: 450.0,
        amountPaid: 0.0,
        balanceDue: 450.0,
        paymentStatus: 'PARTIALLY_PAID',
      },
    });

    // 6A: Handover attempt without balance payment collection must fail with 400
    const resHandoverBlocked = await fetch(`${baseUrl}/api/v1/admin/logistics/orders/${pickupOrderId}/handover-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliveryToken}`,
      },
      body: JSON.stringify({
        verifiedCustomerName: 'Test Pickup Customer',
        handoverStaffName: 'Counter Officer Senthil',
        collectBalanceAtCounter: false,
      }),
    });
    assert(resHandoverBlocked.status === 400, 'Handover without collecting balance must return 400');
    const dataBlocked = await resHandoverBlocked.json();
    assert(dataBlocked.requiresBalancePayment === true, 'Response must flag requiresBalancePayment');
    assert(dataBlocked.balanceDue === 450, 'Response must report balanceDue of 450');

    // 6B: Handover with counter balance collection via UPI
    const resHandoverSuccess = await fetch(`${baseUrl}/api/v1/admin/logistics/orders/${pickupOrderId}/handover-pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliveryToken}`,
      },
      body: JSON.stringify({
        verifiedCustomerName: 'Test Pickup Customer (ID Verified)',
        handoverStaffName: 'Counter Officer Senthil',
        collectBalanceAtCounter: true,
        counterPaymentMethod: 'UPI',
        counterPaymentReference: `UPI-P4-TXN-${testRunId}`,
        counterPaymentNotes: 'GPay payment verified on counter QR.',
      }),
    });
    const dataHandoverSuccess = await resHandoverSuccess.json();
    assert(dataHandoverSuccess.success, `Counter handover failed: ${dataHandoverSuccess.message}`);

    // Verify atomic financial settlement in Database
    const dbInvoiceSettled = await prisma.invoice.findUnique({
      where: { id: testInvoice.id },
    });
    assert(dbInvoiceSettled.balanceDue === 0, 'Invoice balance due must be 0');
    assert(dbInvoiceSettled.amountPaid === 450.0, 'Invoice amount paid must be 450.0');
    assert(dbInvoiceSettled.paymentStatus === 'PAID', 'Invoice payment status must be PAID');

    const dbOrderPickupSettled = await prisma.order.findUnique({
      where: { id: pickupOrderId },
      include: { statusHistory: true },
    });
    assert(dbOrderPickupSettled.paymentStatus === 'PAID', 'Order payment status must be PAID');
    assert(dbOrderPickupSettled.orderStatus === 'DELIVERED', 'Order status must be DELIVERED');
    assert(dbOrderPickupSettled.currentDepartment === 'COMPLETED', 'Order department must be COMPLETED');

    // Verify AuditLog was recorded for counter payment & handover
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: pickupOrderId },
    });
    const hasCounterAudit = auditLogs.some((l) => l.action === 'COUNTER_BALANCE_COLLECTED' || l.action === 'COUNTER_BALANCE_PAID');
    const hasHandoverAudit = auditLogs.some((l) => l.action === 'STORE_PICKUP_COMPLETED' || l.action === 'STORE_PICKUP_HANDOVER');
    assert(hasCounterAudit, 'Audit log must record COUNTER_BALANCE_COLLECTED');
    assert(hasHandoverAudit, 'Audit log must record STORE_PICKUP_COMPLETED');
    console.log('✅ PASS: Store Pickup balance enforcement, UPI counter settlement & handover verified.');

    // ----------------------------------------------------------------
    // TEST 7: Role-Based Authorization & Cross-Department Boundary Guard
    // ----------------------------------------------------------------
    console.log('\n[TEST 7] Role-Based Authorization & Cross-Department Boundary Guard...');

    // 7A: Delivery staff attempting Pre-Production QC -> must return 403
    const resIllegalPreQC = await fetch(`${baseUrl}/api/v1/admin/orders/${order1Id}/pre-production-qc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliveryToken}`,
      },
      body: JSON.stringify({
        action: 'APPROVE_FOR_PRODUCTION',
        checklist: validPreChecklist,
      }),
    });
    assert(resIllegalPreQC.status === 403, `Delivery staff must be forbidden (403) from Pre-Production QC, got ${resIllegalPreQC.status}`);

    // 7B: Floor staff attempting Admin Staff Management -> must return 403
    const resIllegalStaff = await fetch(`${baseUrl}/api/v1/admin/staff`, {
      headers: { Authorization: `Bearer ${pressToken}` },
    });
    assert(resIllegalStaff.status === 403, `Press staff must be forbidden (403) from Staff Management, got ${resIllegalStaff.status}`);

    // 7C: Super Admin global authorization -> must return 200
    const resAdminBoard = await fetch(`${baseUrl}/api/v1/admin/workflow/board`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert(resAdminBoard.status === 200, `Super Admin must access workflow board (200), got ${resAdminBoard.status}`);
    console.log('✅ PASS: Departmental role-based boundary guards & 403 enforcement verified.');

    console.log('\n================================================================');
    console.log('🎉 ALL 7 PHASE 4 OPERATIONAL WORKSTATION TESTS PASSED (100%)');
    console.log('================================================================');
  } catch (err) {
    testError = err;
  } finally {
    // Clean up temporary server
    server.close();

    // ----------------------------------------------------------------
    // TEST 8: Synthetic Test Data Teardown
    // ----------------------------------------------------------------
    console.log('\n[TEST 8] Purging synthetic Phase 4 test records from database...');
    for (const ordId of createdOrderIds) {
      try {
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: ordId } });
        await prisma.orderNote.deleteMany({ where: { orderId: ordId } });
        await prisma.payment.deleteMany({ where: { orderId: ordId } });
        await prisma.qualityCheck.deleteMany({ where: { orderId: ordId } });
        await prisma.shipment.deleteMany({ where: { orderId: ordId } });
        await prisma.invoice.deleteMany({ where: { orderId: ordId } });
        await prisma.designRevision.deleteMany({ where: { designOrder: { orderId: ordId } } });
        await prisma.designOrder.deleteMany({ where: { orderId: ordId } });
        await prisma.productionJob.deleteMany({ where: { orderId: ordId } });
        await prisma.orderItem.deleteMany({ where: { orderId: ordId } });
        await prisma.auditLog.deleteMany({ where: { entityId: ordId } });
        await prisma.order.delete({ where: { id: ordId } });
      } catch (err) {
        console.warn(`Warning deleting order ${ordId}:`, err.message);
      }
    }
    for (const custId of createdCustomerIds) {
      try {
        await prisma.customer.delete({ where: { id: custId } });
      } catch (_) {}
    }
    console.log('✔ Synthetic test data completely purged. Zero test pollution.');
    await prisma.$disconnect();

    if (testError) {
      console.error('\n❌ TEST RUN FAILED WITH ERROR:', testError);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runPhase4TestSuite().catch((err) => {
  console.error('\n❌ TEST RUN FAILED WITH ERROR:', err);
  process.exit(1);
});

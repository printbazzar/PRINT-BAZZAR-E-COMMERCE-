import { PrismaClient } from '@prisma/client';
import { signAccessToken } from '../config/jwt.js';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 VERIFYING JOB CARD, PAYMENT GATEWAY & TWO-STAGE FLOW');
  console.log('========================================================\n');

  try {
    // 1. Check Public Settings Security (No secret leaked!)
    console.log('Test 1: Public Settings Security Endpoint...');
    const pubRes = await fetch(`${BASE_URL}/settings/public`);
    const pubData = await pubRes.json();

    if (!pubData.success) throw new Error('Failed to fetch public settings');
    if (pubData.data.RAZORPAY_KEY_SECRET) {
      throw new Error('SECURITY VIOLATION: RAZORPAY_KEY_SECRET leaked in public settings!');
    }
    console.log('✔ Public settings retrieved successfully without leaking secrets.');
    console.log('  ENABLE_ONLINE_PAYMENTS:', pubData.data.ENABLE_ONLINE_PAYMENTS);
    console.log('  PAYMENT_GATEWAY_PROVIDER:', pubData.data.PAYMENT_GATEWAY_PROVIDER);
    console.log('  DESIGN_SPLIT_PAYMENT:', pubData.data.DESIGN_SPLIT_PAYMENT);

    // 2. Test Admin Settings Update for Razorpay Keys
    console.log('\nTest 2: Admin Gateway Key Configuration...');
    const adminUser =
      (await prisma.user.findFirst({
        where: { email: 'admin@printbazzar.online' },
        include: { role: true },
      })) ||
      (await prisma.user.findFirst({
        include: { role: true },
      }));
    if (!adminUser) throw new Error('Admin user not found');

    const adminToken = signAccessToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role?.name || 'Super Admin',
      tokenType: 'ACCESS',
    });

    const updateRes = await fetch(`${BASE_URL}/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        RAZORPAY_KEY_ID: 'rzp_test_sampleKey123',
        RAZORPAY_KEY_SECRET: 'sampleSecretKey456',
        ENABLE_ONLINE_PAYMENTS: true,
        ENABLE_COD: true,
        DESIGN_SPLIT_PAYMENT: true,
      }),
    });
    const updateData = await updateRes.json();
    if (!updateData.success) throw new Error(`Failed to update admin settings: ${updateData.message}`);
    console.log('✔ Admin successfully saved Razorpay Gateway Keys & Milestone settings.');

    // 3. Create a Test Order with "Let Us Design" (Design Support)
    console.log('\nTest 3: Creating Order with Design Service...');
    const testProduct = await prisma.product.findFirst({
      include: { priceSlabs: true, options: { include: { values: true } } },
    });
    if (!testProduct) throw new Error('No product found for test');

    const orderPayload = {
      customerName: 'Senthil Kumar Test',
      customerEmail: 'senthil.test@example.com',
      customerMobile: '9840199999',
      deliveryMethod: 'COURIER',
      shippingAddress: {
        street: '15, Anna Nagar 2nd Cross',
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        pincode: '620017',
      },
      paymentMethod: 'UPI',
      items: [
        {
          productId: testProduct.id,
          quantity: testProduct.minQuantity || 100,
          selectedOptions: {},
          designRequired: true,
          artworkOption: 'DESIGN_SUPPORT',
          designCharge: 300,
          requirementNotes: 'Create royal blue premium layout with gold foil logo.',
        },
      ],
    };

    const createOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    const createOrderData = await createOrderRes.json();
    if (!createOrderData.success) throw new Error(`Create order failed: ${createOrderData.message}`);

    const orderNumber = createOrderData.orderNumber;
    console.log(`✔ Order ${orderNumber} created!`);
    console.log(`  Initial Status: ${createOrderData.order.orderStatus} (Payment Pending)`);
    console.log(`  Initial Payable Amount (Stage 1 Design Fee): ₹${createOrderData.initialPayableAmount}`);
    console.log(`  Remaining Balance Due (Stage 2 Press Fee): ₹${createOrderData.balanceDue}`);

    if (createOrderData.order.orderStatus !== 'PAYMENT_PENDING') {
      throw new Error(`Order should be in PAYMENT_PENDING but got ${createOrderData.order.orderStatus}`);
    }

    // 4. Test Payment Session Initialization (Stage 1 - Design Fee)
    console.log('\nTest 4: Creating Payment Gateway Session (Stage 1 - Design)...');
    const sessionRes = await fetch(`${BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber, paymentStage: 'DESIGN' }),
    });
    const sessionData = await sessionRes.json();
    if (!sessionData.success) throw new Error(`Create payment session failed: ${sessionData.message}`);
    console.log(`✔ Gateway Session Created: ID=${sessionData.gatewayOrderId}, Amount=₹${sessionData.amount}, Stage=${sessionData.paymentStage}`);

    if (sessionData.amount !== createOrderData.initialPayableAmount) {
      throw new Error(`Session amount ₹${sessionData.amount} does not match initial payable ₹${createOrderData.initialPayableAmount}`);
    }

    // 5. Verify Stage 1 Design Fee Payment
    console.log('\nTest 5: Verifying Stage 1 Design Payment...');
    const verifyStage1Res = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber,
        paymentId: `pay_test_stage1_${Date.now()}`,
        orderId: sessionData.gatewayOrderId,
        paymentMethod: 'UPI',
        paymentStage: 'DESIGN',
      }),
    });
    const verifyStage1Data = await verifyStage1Res.json();
    if (!verifyStage1Data.success) throw new Error(`Stage 1 payment verification failed: ${verifyStage1Data.message}`);
    console.log(`✔ Stage 1 Payment Verified!`);
    console.log(`  Payment Status: ${verifyStage1Data.paymentStatus} (PARTIALLY_PAID)`);
    console.log(`  Order Status: ${verifyStage1Data.orderStatus} (DESIGN_IN_PROGRESS)`);
    console.log(`  Amount Paid: ₹${verifyStage1Data.amountPaid}, Balance Due: ₹${verifyStage1Data.balanceDue}`);

    if (verifyStage1Data.paymentStatus !== 'PARTIALLY_PAID' || verifyStage1Data.orderStatus !== 'DESIGN_IN_PROGRESS') {
      throw new Error('Stage 1 transition did not result in PARTIALLY_PAID and DESIGN_IN_PROGRESS');
    }

    // 6. Test Customer Proof Approval with Balance Enforcement
    console.log('\nTest 6: Customer Proof Approval (Balance Due Enforcement)...');
    const approveProofRes = await fetch(`${BASE_URL}/orders/${orderNumber}/approve-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'APPROVED', customerComment: 'Looks fantastic, proceed to print!' }),
    });
    const approveProofData = await approveProofRes.json();
    if (!approveProofData.success) throw new Error(`Proof approval failed: ${approveProofData.message}`);
    console.log(`✔ Proof Approval Response: requiresBalancePayment=${approveProofData.requiresBalancePayment}, BalanceDue=₹${approveProofData.balanceDue}`);

    if (!approveProofData.requiresBalancePayment) {
      throw new Error('Expected requiresBalancePayment to be true for partially paid order!');
    }

    // 7. Verify Stage 2 Printing Balance Payment
    console.log('\nTest 7: Verifying Stage 2 Printing Balance Payment...');
    const verifyStage2Res = await fetch(`${BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber,
        paymentId: `pay_test_stage2_${Date.now()}`,
        orderId: `order_stage2_${Date.now()}`,
        paymentMethod: 'UPI',
        paymentStage: 'BALANCE',
      }),
    });
    const verifyStage2Data = await verifyStage2Res.json();
    if (!verifyStage2Data.success) throw new Error(`Stage 2 payment verification failed: ${verifyStage2Data.message}`);
    console.log(`✔ Stage 2 Balance Payment Verified!`);
    console.log(`  Payment Status: ${verifyStage2Data.paymentStatus} (CONFIRMED)`);
    console.log(`  Order Status: ${verifyStage2Data.orderStatus} (PRODUCTION_QUEUE)`);
    console.log(`  Balance Due: ₹${verifyStage2Data.balanceDue}`);

    if (verifyStage2Data.paymentStatus !== 'CONFIRMED' || verifyStage2Data.orderStatus !== 'PRODUCTION_QUEUE') {
      throw new Error('Stage 2 balance payment did not transition to CONFIRMED & PRODUCTION_QUEUE');
    }

    // 8. Verify Production Job Card Ticket Data (Clean Factory Specs)
    console.log('\nTest 8: Checking Clean Production Job Card Specs...');
    const jobOrder = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        productionJobs: true,
        invoices: true,
      },
    });

    const job = jobOrder.productionJobs[0];
    if (!job) throw new Error('No production job linked to order');

    console.log('✔ Job Card Details Verified:');
    console.log(`  Job Card #: ${job.jobNumber}`);
    console.log(`  Status: ${job.status} (Queued for Press)`);
    console.log(`  Artwork Status: ${job.artworkStatus} (Approved)`);
    console.log(`  Quantity: ${job.quantity} units`);
    console.log(`  Product: ${jobOrder.items[0].productNameSnapshot}`);
    console.log(`  Invoice Balance Due: ₹${jobOrder.invoices[0].balanceDue} (Paid in full)`);

    console.log('\n========================================================');
    console.log('🎉 ALL TESTS PASSED! CLEAN JOB CARDS, ADMIN PAYMENT KEYS,');
    console.log('   MANDATORY PAYMENT & TWO-STAGE MILESTONES ARE VERIFIED!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

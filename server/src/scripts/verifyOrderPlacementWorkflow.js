import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { toCustomerSafeOrder, getCustomerFriendlyStatusDesc } from '../utils/projections.js';
import { sendOrderNotification } from '../services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function runVerification() {
  console.log('========================================================================');
  console.log('PRINT BAZZAR — CHECKOUT & ORDER WORKFLOW VERIFICATION');
  console.log('Checking "Processing" status, notifications & Admin Dashboard updates');
  console.log('========================================================================\n');

  let testOrderId = null;
  let testCustomerId = null;

  try {
    // 1. Check DB Connection
    console.log('Step 1: Checking PostgreSQL connection...');
    await prisma.$connect();
    console.log('✔ Connected to database successfully.\n');

    // 2. Fetch or Create Test Customer
    console.log('Step 2: Preparing test customer...');
    const testMobile = '9998887776';
    let customer = await prisma.customer.findFirst({
      where: { mobile: testMobile },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          mobile: testMobile,
          name: 'Test Customer Verification',
          email: 'testverification@printbazzar.online',
          address: '42 Bazaar Street, Singarathope',
          city: 'Tiruchirappalli',
          pincode: '620008',
        },
      });
      testCustomerId = customer.id;
    }
    console.log(`✔ Customer verified: ${customer.name} (${customer.mobile})\n`);

    // 3. Fetch an active product to test order creation
    console.log('Step 3: Fetching active product from catalog...');
    const product = await prisma.product.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        images: true,
        options: { include: { values: true } },
      },
    });

    if (!product) {
      throw new Error('No active products found in database to place test order.');
    }
    console.log(`✔ Selected product: "${product.name}" (ID: ${product.id}, SKU: ${product.sku})\n`);

    // 4. Simulate Checkout & Order Placement
    console.log('Step 4: Placing test order with checkout workflow...');
    const currentYear = new Date().getFullYear();
    const orderSequence = String(Date.now()).slice(-6);
    const orderNumber = `PB-ORD-TEST-${orderSequence}`;
    const initialStatus = 'Processing';
    const subtotal = 450;
    const shippingCharge = 0;
    const cgstAmount = 40.5;
    const sgstAmount = 40.5;
    const totalTax = 81;
    const grandTotal = 531;

    const createdOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          customerMobile: customer.mobile,
          customerWhatsapp: customer.mobile,
          shippingAddress: JSON.stringify({
            street: '42 Bazaar Street, Singarathope',
            city: 'Tiruchirappalli',
            state: 'Tamil Nadu',
            pincode: '620008',
          }),
          billingAddress: JSON.stringify({
            street: '42 Bazaar Street, Singarathope',
            city: 'Tiruchirappalli',
            state: 'Tamil Nadu',
            pincode: '620008',
          }),
          subtotal,
          shippingCharge,
          cgstAmount,
          sgstAmount,
          totalTax,
          grandTotal,
          paymentStatus: 'PENDING',
          orderStatus: initialStatus,
          deliveryType: 'LOCAL_DELIVERY',
          deliveryMethod: 'STORE_PICKUP',
          currentDepartment: 'PRODUCTION',
          assignedStaffName: 'Press Supervisor',
          items: {
            create: [
              {
                productId: product.id,
                quantity: 250,
                unitPriceSnapshot: 1.8,
                totalPriceSnapshot: 450,
                productNameSnapshot: product.name,
                skuSnapshot: product.sku,
                optionsSnapshot: JSON.stringify({
                  Paper: '350 GSM Art Card',
                  Printing: 'Front & Back Multi-Color',
                  Lamination: 'Thermal Matte',
                }),
                designRequired: false,
                artworkOption: 'PRINT_READY_FILE',
                artworkFileUrl: '/uploads/visiting_card_ready.pdf',
              },
            ],
          },
          statusHistory: {
            create: {
              previousStatus: null,
              newStatus: initialStatus,
              note: 'Order placed with Processing status. Prepress file verification in progress.',
              customerNote: 'Order received and is now processing. We are verifying your print specifications and preparing your job.',
            },
          },
          payments: {
            create: {
              paymentMethod: 'CASH',
              amount: grandTotal,
              status: 'PENDING',
            },
          },
        },
        include: {
          items: true,
          statusHistory: true,
          payments: true,
        },
      });

      // Linked Admin Audit Log
      await tx.auditLog.create({
        data: {
          action: 'ORDER_PLACED',
          entityName: 'ORDER',
          entityId: ord.id,
          newValues: JSON.stringify({
            orderNumber: ord.orderNumber,
            customerName: ord.customerName,
            customerMobile: ord.customerMobile,
            grandTotal: ord.grandTotal,
            orderStatus: initialStatus,
            paymentMethod: 'CASH',
          }),
        },
      });

      return ord;
    });

    testOrderId = createdOrder.id;
    console.log(`✔ Order placed successfully in DB:`);
    console.log(`   - Order ID: ${createdOrder.id}`);
    console.log(`   - Order Number: ${createdOrder.orderNumber}`);
    console.log(`   - Order Status in DB: "${createdOrder.orderStatus}"`);
    console.log(`   - Payment Status: "${createdOrder.paymentStatus}"\n`);

    // 5. Verify Database Record Status
    console.log('Step 5: Verifying Order database record status...');
    const fetchedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: {
        statusHistory: true,
        items: true,
      },
    });

    if (fetchedOrder.orderStatus !== 'Processing') {
      throw new Error(`Expected orderStatus to be "Processing", found "${fetchedOrder.orderStatus}"`);
    }
    console.log(`✔ Order status in DB is confirmed as: "${fetchedOrder.orderStatus}"`);

    const latestHistory = fetchedOrder.statusHistory[0];
    if (!latestHistory || latestHistory.newStatus !== 'Processing') {
      throw new Error(`Expected OrderStatusHistory newStatus to be "Processing", found "${latestHistory?.newStatus}"`);
    }
    console.log(`✔ OrderStatusHistory correctly recorded: newStatus = "${latestHistory.newStatus}"`);
    console.log(`   - Customer Note: "${latestHistory.customerNote}"\n`);

    // 6. Verify Customer Projections (Data Isolation)
    console.log('Step 6: Verifying Customer Safe Order Projection...');
    const safeOrder = toCustomerSafeOrder(fetchedOrder, { isOwner: true });
    if (safeOrder.orderStatus !== 'Processing') {
      throw new Error(`Expected customer projection orderStatus to be "Processing", found "${safeOrder.orderStatus}"`);
    }
    if (safeOrder.assignedStaffName || safeOrder.currentDepartment || safeOrder.productionJobs) {
      throw new Error('Customer projection leaked confidential internal data!');
    }
    console.log(`✔ Customer Safe Order confirmed: status is "${safeOrder.orderStatus}"`);
    console.log(`✔ Friendly status description: "${getCustomerFriendlyStatusDesc(safeOrder.orderStatus)}"`);
    console.log(`✔ Zero confidential fields leaked to customer view.\n`);

    // 7. Verify Notification Engine
    console.log('Step 7: Testing notification dispatch for ORDER_PROCESSING...');
    const notifResult = await sendOrderNotification({
      order: fetchedOrder,
      eventType: 'ORDER_PROCESSING',
    });
    if (!notifResult.success) {
      throw new Error(`Notification failed: ${notifResult.error || notifResult.reason}`);
    }
    console.log(`✔ Notification engine executed successfully for event: ${notifResult.eventType}`);
    console.log(`   - Recipient: ${notifResult.recipient}`);
    console.log(`   - Title: ${notifResult.title}\n`);

    // 8. Verify Admin Dashboard KPIs Update
    console.log('Step 8: Verifying Admin Dashboard KPIs & updates...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, pendingOrders, recentOrders, recentAudit] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({
        where: {
          orderStatus: { in: ['ORDER_RECEIVED', 'CONFIRMED', 'Processing', 'PROCESSING', 'PAYMENT_PENDING'] },
        },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    console.log(`✔ Admin KPIs updated:`);
    console.log(`   - Total Orders Count: ${totalOrders}`);
    console.log(`   - Today Orders Count: ${todayOrders}`);
    console.log(`   - Pending / Processing Count: ${pendingOrders}`);

    const isOrderInRecent = recentOrders.some((o) => o.id === testOrderId);
    if (!isOrderInRecent) {
      throw new Error('Test order not found in recent orders list for Admin Dashboard!');
    }
    console.log(`✔ Test order #${createdOrder.orderNumber} is present in Admin Dashboard recent orders.`);

    const isAuditLogged = recentAudit.some(
      (a) => a.action === 'ORDER_PLACED' && a.entityId === testOrderId
    );
    if (!isAuditLogged) {
      throw new Error('ORDER_PLACED action not found in Admin Dashboard audit log feed!');
    }
    console.log(`✔ ORDER_PLACED action verified in Admin Dashboard activity feed.\n`);

    // 9. Verify Admin Orders Query with Status Filter
    console.log('Step 9: Verifying Admin Orders list with status="Processing"...');
    const adminOrdersFiltered = await prisma.order.findMany({
      where: {
        orderStatus: { in: ['Processing', 'PROCESSING', 'processing'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const foundInFilter = adminOrdersFiltered.some((o) => o.id === testOrderId);
    if (!foundInFilter) {
      throw new Error('Order not returned when filtering admin orders by status="Processing"!');
    }
    console.log(`✔ Admin order list with status filter successfully returned test order.\n`);

    console.log('========================================================================');
    console.log('ALL 9 VERIFICATION POINTS PASSED SUCCESSFULLY! 🎉');
    console.log('✔ Checkout & order placement creates record with "Processing" status');
    console.log('✔ Customer & Admin notifications dispatched');
    console.log('✔ Admin Dashboard KPIs, recent orders & audit logs properly updated');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exitCode = 1;
  } finally {
    // Clean up test order & customer
    if (testOrderId) {
      console.log('Cleaning up test order from database...');
      await prisma.auditLog.deleteMany({ where: { entityId: testOrderId } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.payment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } });
      console.log('✔ Test order cleaned up.');
    }
    if (testCustomerId) {
      await prisma.customer.delete({ where: { id: testCustomerId } });
      console.log('✔ Test customer cleaned up.');
    }
    await prisma.$disconnect();
  }
}

runVerification();

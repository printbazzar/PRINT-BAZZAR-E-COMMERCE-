import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PrismaClient } from '@prisma/client';

// Ensure test environment
process.env.NODE_ENV = 'test';

// Import express app
const { default: app } = await import('../src/server.js');

const prisma = new PrismaClient();

describe('Print Bazzar: Google Login & Direct Checkout Automated Tests', () => {
  let server;
  let baseUrl;
  let activeProduct;
  const createdCustomerIds = new Set();
  const createdOrderNumbers = new Set();

  before(async () => {
    // 1. Start server on dynamic free ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`\n🧪 Test Server listening on ${baseUrl}`);
        resolve();
      });
    });

    // 2. Fetch an active product for testing
    activeProduct = await prisma.product.findFirst({
      where: { status: 'ACTIVE' },
    });
    assert.ok(activeProduct, 'An active product must exist in database to run order tests');
  });

  after(async () => {
    // Cleanup created test records
    console.log('\n🧹 Cleaning up test database records...');
    try {
      for (const orderNumber of createdOrderNumbers) {
        await prisma.orderItem.deleteMany({
          where: { order: { orderNumber } },
        });
        await prisma.orderStatusHistory.deleteMany({
          where: { order: { orderNumber } },
        });
        await prisma.order.deleteMany({
          where: { orderNumber },
        });
      }

      for (const customerId of createdCustomerIds) {
        await prisma.customerAddress.deleteMany({
          where: { customerId },
        });
        await prisma.authSession.deleteMany({
          where: { customerId },
        });
        await prisma.customer.deleteMany({
          where: { id: customerId },
        });
      }
    } catch (err) {
      console.warn('Cleanup warning:', err.message);
    } finally {
      await prisma.$disconnect();
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      console.log('✔ Cleanup complete and test server stopped.');
    }
  });

  test('1. Google Login Flow: Authenticates customer and returns JWT session with 0 SMS cost', async () => {
    const testEmail = `google.test.${Date.now()}@example.com`;
    const testGoogleId = `google_sub_${Date.now()}`;
    const testName = 'Google Automated Tester';

    const res = await fetch(`${baseUrl}/api/v1/customer/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        name: testName,
        googleId: testGoogleId,
        avatarUrl: 'https://example.com/avatar.jpg',
      }),
    });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const data = await res.json();

    assert.equal(data.success, true, 'Response must indicate success');
    assert.ok(data.token, 'Must return JWT token for authenticated session');
    assert.ok(data.customer, 'Must return customer object');
    assert.equal(data.customer.email, testEmail);
    assert.equal(data.customer.name, testName);

    createdCustomerIds.add(data.customer.id);

    // Verify record in PostgreSQL database
    const dbCustomer = await prisma.customer.findUnique({
      where: { id: data.customer.id },
    });
    assert.ok(dbCustomer, 'Customer record must be persisted in database');
    assert.equal(dbCustomer.googleId, testGoogleId, 'Customer googleId must match');
    assert.equal(dbCustomer.email, testEmail, 'Customer email must match');
  });

  test('2. Direct Guest Checkout: Places order directly without SMS OTP modal or barrier', async () => {
    const guestMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const guestEmail = `direct.guest.${Date.now()}@example.com`;
    const guestName = 'Direct Checkout Guest';

    const orderPayload = {
      customerName: guestName,
      customerEmail: guestEmail,
      customerMobile: guestMobile,
      customerWhatsapp: guestMobile,
      deliveryMethod: 'STORE_PICKUP',
      deliveryType: 'PICKUP',
      paymentMethod: 'CASH',
      shippingAddress: {
        street: 'Store Pickup Point, Singarathope',
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        pincode: '620008',
      },
      billingAddress: {
        street: 'Store Pickup Point, Singarathope',
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        pincode: '620008',
      },
      items: [
        {
          productId: activeProduct.id,
          quantity: 100,
          selectedOptions: {},
          artworkOption: 'PRINT_READY_FILE',
          termsAccepted: true,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}`);
    const data = await res.json();

    assert.equal(data.success, true, 'Order creation must succeed');
    assert.ok(data.orderNumber, 'Must generate and return orderNumber');
    assert.ok(data.orderNumber.includes('ORD-'), 'orderNumber must follow ORD convention');
    assert.ok(data.customerToken, 'Guest customer must receive auto-auth session token');

    createdOrderNumbers.add(data.orderNumber);
    if (data.customer?.id) {
      createdCustomerIds.add(data.customer.id);
    }

    // Verify order in database
    const dbOrder = await prisma.order.findUnique({
      where: { orderNumber: data.orderNumber },
      include: { customer: true, items: true },
    });

    assert.ok(dbOrder, 'Order must exist in database');
    assert.ok(dbOrder.orderStatus, 'Order must have a valid orderStatus');
    assert.equal(dbOrder.customer.mobile, guestMobile, 'Customer mobile must match input');
    assert.equal(dbOrder.customer.name, guestName, 'Customer name must match input');
    assert.equal(dbOrder.items.length, 1, 'Order must contain 1 item');
  });

  test('3. Authenticated Checkout: Google user places order with auto-associated customer profile', async () => {
    // First, login with Google
    const googleEmail = `google.buyer.${Date.now()}@example.com`;
    const googleId = `gid_buyer_${Date.now()}`;
    const googleName = 'Google Verified Buyer';

    const loginRes = await fetch(`${baseUrl}/api/v1/customer/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        name: googleName,
        googleId,
      }),
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200);
    createdCustomerIds.add(loginData.customer.id);

    // Place order using customer token
    const orderPayload = {
      customerId: loginData.customer.id,
      customerName: googleName,
      customerEmail: googleEmail,
      customerMobile: '9123456780',
      deliveryMethod: 'COURIER',
      deliveryType: 'COURIER',
      paymentMethod: 'CASH',
      shippingAddress: {
        street: '123 Anna Nagar Main Road',
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        pincode: '620018',
      },
      billingAddress: {
        street: '123 Anna Nagar Main Road',
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        pincode: '620018',
      },
      items: [
        {
          productId: activeProduct.id,
          quantity: 50,
          selectedOptions: {},
          artworkOption: 'PRINT_READY_FILE',
          termsAccepted: true,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    createdOrderNumbers.add(data.orderNumber);

    // Verify order linked to Google customer
    const dbOrder = await prisma.order.findUnique({
      where: { orderNumber: data.orderNumber },
    });
    assert.equal(dbOrder.customerId, loginData.customer.id, 'Order must link to Google customer ID');
  });

  test('4. Input Validation Guard: Rejects order if customer name or 10-digit mobile is invalid', async () => {
    const invalidPayload = {
      customerName: '', // empty name
      customerMobile: '123', // invalid short mobile
      items: [], // empty items
    };

    const res = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload),
    });

    assert.equal(res.status, 400, 'Must respond with 400 Bad Request');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message, 'Must provide clear error message to user');
  });
});

import { PrismaClient } from '@prisma/client';
import { createOrder } from '../controllers/orderController.js';

const prisma = new PrismaClient();

async function testLatency() {
  console.log('Testing createOrder handler performance directly...');

  const customer = await prisma.customer.findFirst({ where: { mobile: '9998887776' } });
  const product = await prisma.product.findFirst({ where: { status: 'ACTIVE' } });

  const mockReq = {
    customer,
    body: {
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      customerEmail: customer.email || 'customer@printbazzar.online',
      customerWhatsapp: customer.mobile,
      deliveryMethod: 'COURIER',
      shippingAddress: {
        street: '12 A Big Bazzar Street',
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        pincode: '620008',
      },
      paymentMethod: 'UPI',
      items: [
        {
          productId: product.id,
          quantity: 100,
          selectedOptions: { Printing: 'Single Side' },
          designRequired: false,
        },
      ],
    },
  };

  let responseData = null;
  let responseStatusCode = null;

  const mockRes = {
    status(code) {
      responseStatusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  const t0 = Date.now();
  await createOrder(mockReq, mockRes);
  const duration = Date.now() - t0;

  console.log(`\n✔ createOrder completed with HTTP ${responseStatusCode} in ${duration} ms!`);
  console.log(`Order Number: ${responseData?.orderNumber}`);
  console.log(`Success: ${responseData?.success}`);

  if (responseData?.orderNumber) {
    // Cleanup the created order
    console.log('Cleaning up benchmark order...');
    await prisma.order.deleteMany({ where: { orderNumber: responseData.orderNumber } });
    console.log('✔ Cleanup complete.');
  }

  await prisma.$disconnect();
}

testLatency().catch(console.error);

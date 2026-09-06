import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Benchmarking Checkout DB Operations ---');
  const tStart = Date.now();
  
  const t0 = Date.now();
  await prisma.$connect();
  console.log('1. Connect to DB:', Date.now() - t0, 'ms');

  const t1 = Date.now();
  const settings = await prisma.storeSetting.findMany();
  console.log('2. Fetch all store settings:', Date.now() - t1, 'ms, count:', settings.length);

  const t2 = Date.now();
  const orderCount = await prisma.order.count();
  console.log('3. Order count:', Date.now() - t2, 'ms, total:', orderCount);

  const t3 = Date.now();
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE' },
    include: {
      options: { include: { values: true } },
      optionMappings: {
        where: { isEnabled: true },
        include: {
          master: true,
          valueMappings: {
            where: { isEnabled: true },
            include: { masterValue: true },
          },
        },
      },
      pricingMatrices: true,
      priceSlabs: true,
      compatibilityRules: { where: { isActive: true } },
      specifications: true,
    },
  });
  console.log('4. Fetch product with heavy includes:', Date.now() - t3, 'ms');

  const t4 = Date.now();
  const customer = await prisma.customer.findFirst({ where: { mobile: '9998887776' } });
  console.log('5. Find customer:', Date.now() - t4, 'ms');

  console.log('Total read phase latency:', Date.now() - tStart, 'ms');
  await prisma.$disconnect();
}

main().catch(console.error);

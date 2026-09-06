import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'Product';
    `);
    console.log('Current indexes on Product table:');
    console.log(indexes);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
check();

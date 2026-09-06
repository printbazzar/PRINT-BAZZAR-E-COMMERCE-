import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createIndexes() {
  try {
    console.log('Creating index on Product(categoryId)...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
    `);
    console.log('✔ Product_categoryId_idx created successfully.');

    console.log('Creating composite index on Product(categoryId, status)...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Product_categoryId_status_idx" ON "Product"("categoryId", "status");
    `);
    console.log('✔ Product_categoryId_status_idx created successfully.');

    // Verify indexes
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'Product';
    `);
    console.log('\nVerified indexes on Product table:');
    console.log(indexes);
  } catch (err) {
    console.error('Index creation error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
createIndexes();

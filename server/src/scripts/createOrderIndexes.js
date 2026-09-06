import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createOrderIndexes() {
  try {
    console.log('--- Creating Indexes for Order Flow & Relations ---');

    const indexQueries = [
      // Order table
      `CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId");`,
      `CREATE INDEX IF NOT EXISTS "Order_orderStatus_idx" ON "Order"("orderStatus");`,
      `CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt" DESC);`,
      `CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");`,

      // OrderItem table
      `CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");`,
      `CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");`,

      // OrderStatusHistory table
      `CREATE INDEX IF NOT EXISTS "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");`,

      // OrderNote table
      `CREATE INDEX IF NOT EXISTS "OrderNote_orderId_idx" ON "OrderNote"("orderId");`,

      // Payment table
      `CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");`,

      // Invoice table
      `CREATE INDEX IF NOT EXISTS "Invoice_orderId_idx" ON "Invoice"("orderId");`,

      // Shipment table
      `CREATE INDEX IF NOT EXISTS "Shipment_orderId_idx" ON "Shipment"("orderId");`,

      // ProductionJob table
      `CREATE INDEX IF NOT EXISTS "ProductionJob_orderId_idx" ON "ProductionJob"("orderId");`,
      `CREATE INDEX IF NOT EXISTS "ProductionJob_orderItemId_idx" ON "ProductionJob"("orderItemId");`,

      // DesignOrder table
      `CREATE INDEX IF NOT EXISTS "DesignOrder_orderId_idx" ON "DesignOrder"("orderId");`,
      `CREATE INDEX IF NOT EXISTS "DesignOrder_orderItemId_idx" ON "DesignOrder"("orderItemId");`,

      // QualityCheck table
      `CREATE INDEX IF NOT EXISTS "QualityCheck_orderId_idx" ON "QualityCheck"("orderId");`,
      `CREATE INDEX IF NOT EXISTS "QualityCheck_productionJobId_idx" ON "QualityCheck"("productionJobId");`,
    ];

    for (const sql of indexQueries) {
      await prisma.$executeRawUnsafe(sql);
      const match = sql.match(/CREATE INDEX IF NOT EXISTS "([^"]+)"/);
      console.log(`✔ Created / verified index: ${match ? match[1] : sql}`);
    }

    // Verify indexes across Order tables
    const tableNames = ['Order', 'OrderItem', 'OrderStatusHistory', 'Invoice', 'Shipment', 'ProductionJob', 'DesignOrder', 'Payment'];
    console.log('\n--- Verifying Created Indexes in pg_indexes ---');
    for (const table of tableNames) {
      const idxs = await prisma.$queryRawUnsafe(`
        SELECT indexname FROM pg_indexes WHERE tablename = '${table}' AND indexname LIKE '%_idx';
      `);
      console.log(`${table} indexes:`, idxs.map((i) => i.indexname).join(', '));
    }

    console.log('\nAll order indexes successfully created and verified!');
  } catch (err) {
    console.error('Error creating order indexes:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createOrderIndexes();

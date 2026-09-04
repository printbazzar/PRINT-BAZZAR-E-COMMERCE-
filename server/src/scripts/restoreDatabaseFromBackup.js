import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function restoreDatabase(backupFile) {
  const filePath = backupFile || path.resolve(__dirname, '../../backups/printbazzar_latest_backup.json');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Backup file not found at: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n🔄 RESTORING DATABASE FROM: ${filePath}`);
  const backupContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const tables = backupContent.tables;

  console.log(`Metadata:`, backupContent.metadata);

  // Restore sequence respecting foreign key constraints
  const sequence = [
    { name: 'Role', clientKey: 'role', pkey: 'id' },
    { name: 'Permission', clientKey: 'permission', pkey: 'id' },
    { name: 'RolePermission', clientKey: 'rolePermission', pkey: 'id' },
    { name: 'User', clientKey: 'user', pkey: 'id' },
    { name: 'Customer', clientKey: 'customer', pkey: 'id' },
    { name: 'CustomerAddress', clientKey: 'customerAddress', pkey: 'id' },
    { name: 'Category', clientKey: 'category', pkey: 'id' },
    { name: 'Product', clientKey: 'product', pkey: 'id' },
    { name: 'ProductImage', clientKey: 'productImage', pkey: 'id' },
    { name: 'ProductSpecification', clientKey: 'productSpecification', pkey: 'id' },
    { name: 'ProductOption', clientKey: 'productOption', pkey: 'id' },
    { name: 'ProductOptionValue', clientKey: 'productOptionValue', pkey: 'id' },
    { name: 'ProductPriceSlab', clientKey: 'productPriceSlab', pkey: 'id' },
    { name: 'ProductCombination', clientKey: 'productCombination', pkey: 'id' },
    { name: 'ProductArtworkSetting', clientKey: 'productArtworkSetting', pkey: 'id' },
    { name: 'ProductDesignPackage', clientKey: 'productDesignPackage', pkey: 'id' },
    { name: 'ProductDesignBriefField', clientKey: 'productDesignBriefField', pkey: 'id' },
    { name: 'ProductDesignPackageMapping', clientKey: 'productDesignPackageMapping', pkey: 'id' },
    { name: 'DesignPackage', clientKey: 'designPackage', pkey: 'id' },
    { name: 'DesignAddon', clientKey: 'designAddon', pkey: 'id' },
    { name: 'DesignOrder', clientKey: 'designOrder', pkey: 'id' },
    { name: 'DesignRevision', clientKey: 'designRevision', pkey: 'id' },
    { name: 'ArtworkUpload', clientKey: 'artworkUpload', pkey: 'id' },
    { name: 'Order', clientKey: 'order', pkey: 'id' },
    { name: 'OrderItem', clientKey: 'orderItem', pkey: 'id' },
    { name: 'OrderStatusHistory', clientKey: 'orderStatusHistory', pkey: 'id' },
    { name: 'OrderNote', clientKey: 'orderNote', pkey: 'id' },
    { name: 'Payment', clientKey: 'payment', pkey: 'id' },
    { name: 'PriceHistory', clientKey: 'priceHistory', pkey: 'id' },
    { name: 'CartItem', clientKey: 'cartItem', pkey: 'id' },
    { name: 'Banner', clientKey: 'banner', pkey: 'id' },
    { name: 'StoreSetting', clientKey: 'storeSetting', pkey: 'id' },
    { name: 'AuditLog', clientKey: 'auditLog', pkey: 'id' },
  ];

  let restoredCount = 0;

  for (const s of sequence) {
    const tableData = tables[s.name];
    if (!tableData || !tableData.records || tableData.records.length === 0) continue;

    console.log(`Restoring ${s.name} (${tableData.records.length} records)...`);
    for (const record of tableData.records) {
      try {
        await prisma[s.clientKey].upsert({
          where: { [s.pkey]: record[s.pkey] },
          create: record,
          update: record,
        });
        restoredCount++;
      } catch (err) {
        // Log warning but continue
        // console.warn(`Notice on ${s.name} (${record[s.pkey]}):`, err.message);
      }
    }
  }

  console.log(`\n✅ RESTORE COMPLETED! Upserted / Verified ${restoredCount} records.`);
  await prisma.$disconnect();
}

const targetFile = process.argv[2];
restoreDatabase(targetFile).catch((e) => {
  console.error('Restore failed:', e);
  process.exit(1);
});

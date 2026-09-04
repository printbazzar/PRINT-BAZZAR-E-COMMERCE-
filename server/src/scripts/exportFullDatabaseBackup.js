import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function exportFullBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, '../../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`\n📦 STARTING FULL DATABASE BACKUP AT: ${timestamp}`);
  console.log(`📁 Backup Destination: ${backupDir}`);

  const backupData = {
    metadata: {
      timestamp,
      exportedAt: new Date().toISOString(),
      supabaseRef: 'uigpizwsjtpecaduampi',
      region: 'ap-south-1',
      version: '1.0.0',
    },
    tables: {},
  };

  const models = [
    { name: 'Role', clientKey: 'role' },
    { name: 'Permission', clientKey: 'permission' },
    { name: 'RolePermission', clientKey: 'rolePermission' },
    { name: 'User', clientKey: 'user' },
    { name: 'Customer', clientKey: 'customer' },
    { name: 'CustomerAddress', clientKey: 'customerAddress' },
    { name: 'Category', clientKey: 'category' },
    { name: 'Product', clientKey: 'product' },
    { name: 'ProductImage', clientKey: 'productImage' },
    { name: 'ProductSpecification', clientKey: 'productSpecification' },
    { name: 'ProductOption', clientKey: 'productOption' },
    { name: 'ProductOptionValue', clientKey: 'productOptionValue' },
    { name: 'ProductPriceSlab', clientKey: 'productPriceSlab' },
    { name: 'ProductCombination', clientKey: 'productCombination' },
    { name: 'ProductArtworkSetting', clientKey: 'productArtworkSetting' },
    { name: 'ProductDesignPackage', clientKey: 'productDesignPackage' },
    { name: 'ProductDesignBriefField', clientKey: 'productDesignBriefField' },
    { name: 'ProductDesignPackageMapping', clientKey: 'productDesignPackageMapping' },
    { name: 'DesignPackage', clientKey: 'designPackage' },
    { name: 'DesignAddon', clientKey: 'designAddon' },
    { name: 'DesignOrder', clientKey: 'designOrder' },
    { name: 'DesignRevision', clientKey: 'designRevision' },
    { name: 'ArtworkUpload', clientKey: 'artworkUpload' },
    { name: 'Order', clientKey: 'order' },
    { name: 'OrderItem', clientKey: 'orderItem' },
    { name: 'OrderStatusHistory', clientKey: 'orderStatusHistory' },
    { name: 'OrderNote', clientKey: 'orderNote' },
    { name: 'Payment', clientKey: 'payment' },
    { name: 'PriceHistory', clientKey: 'priceHistory' },
    { name: 'CartItem', clientKey: 'cartItem' },
    { name: 'Banner', clientKey: 'banner' },
    { name: 'StoreSetting', clientKey: 'storeSetting' },
    { name: 'AuditLog', clientKey: 'auditLog' },
  ];

  let totalRecordsCount = 0;

  for (const m of models) {
    try {
      if (prisma[m.clientKey]) {
        const records = await prisma[m.clientKey].findMany();
        backupData.tables[m.name] = {
          count: records.length,
          records,
        };
        totalRecordsCount += records.length;
        console.log(`✔ Extracted ${m.name}: ${records.length} record(s)`);
      }
    } catch (err) {
      console.error(`❌ Failed to extract ${m.name}:`, err.message);
      backupData.tables[m.name] = { count: 0, error: err.message, records: [] };
    }
  }

  const backupFilePath = path.join(backupDir, `printbazzar_full_backup_${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  // Also save a latest snapshot symlink/copy for immediate rollback
  const latestBackupPath = path.join(backupDir, `printbazzar_latest_backup.json`);
  fs.writeFileSync(latestBackupPath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`\n🎉 BACKUP COMPLETED SUCCESSFULLY!`);
  console.log(`📊 Total Records Saved: ${totalRecordsCount}`);
  console.log(`💾 File Size: ${(fs.statSync(backupFilePath).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📍 Path: ${backupFilePath}`);

  await prisma.$disconnect();
}

exportFullBackup().catch((err) => {
  console.error('Backup script failed:', err);
  process.exit(1);
});

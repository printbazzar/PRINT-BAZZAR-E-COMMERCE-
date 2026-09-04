import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDatabase() {
  console.log('--- DATABASE INVENTORY AUDIT ---');

  const models = [
    'User',
    'Customer',
    'CustomerAddress',
    'Category',
    'Product',
    'ProductOption',
    'ProductOptionValue',
    'ProductPriceSlab',
    'ProductImage',
    'ProductSpecification',
    'ProductCombination',
    'ProductArtworkSetting',
    'ProductDesignPackage',
    'ProductDesignBriefField',
    'ProductDesignPackageMapping',
    'DesignPackage',
    'DesignAddon',
    'DesignOrder',
    'DesignRevision',
    'ArtworkUpload',
    'Order',
    'OrderItem',
    'OrderStatusHistory',
    'OrderNote',
    'Payment',
    'PriceHistory',
    'CartItem',
    'Banner',
    'StoreSetting',
    'AuditLog',
    'Role',
    'Permission',
    'RolePermission',
  ];

  const results = {};
  for (const model of models) {
    try {
      if (prisma[model.charAt(0).toLowerCase() + model.slice(1)]) {
        const count = await prisma[model.charAt(0).toLowerCase() + model.slice(1)].count();
        results[model] = count;
      } else {
        results[model] = 'Model property not found on Prisma Client';
      }
    } catch (err) {
      results[model] = `Error: ${err.message}`;
    }
  }

  console.log(JSON.stringify(results, null, 2));
  await prisma.$disconnect();
}

inspectDatabase().catch((e) => {
  console.error('Audit error:', e);
  process.exit(1);
});

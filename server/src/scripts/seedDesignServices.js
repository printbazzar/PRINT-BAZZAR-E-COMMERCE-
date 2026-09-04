import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDesignServices() {
  console.log('--- Seeding Design Packages & Add-ons ---');

  // 1. Master Design Packages
  const defaultPackages = [
    {
      name: 'Basic Design',
      badge: null,
      shortDescription: 'Ideal for single-concept minimal layout and quick production turnaround.',
      detailedDescription: 'Includes 1 custom design mockup, 1 revision round, and print-ready high-resolution files.',
      basePrice: 299,
      doubleSidePrice: 499,
      offerPrice: 299,
      concepts: 1,
      revisions: 1,
      deliveryDays: 2,
      deliveryTimeText: '2 Working Days',
      expressDeliveryTime: '24 Hours',
      expressDeliveryCharge: 250,
      featuresJson: JSON.stringify([
        '1 Initial Concept',
        '1 Revision Included',
        'Print-ready PDF',
        'JPG + PNG Formats',
        'Standard Delivery (2 Days)',
      ]),
      sortOrder: 1,
      isActive: true,
      isDefault: false,
    },
    {
      name: 'Standard Design',
      badge: 'MOST POPULAR',
      shortDescription: 'Our most sought-after package with 2 creative directions and CMYK press optimization.',
      detailedDescription: 'Includes 2 initial concepts from our senior graphic designers, 2 revision rounds, CMYK proof check, and print-ready PDF.',
      basePrice: 499,
      doubleSidePrice: 799,
      offerPrice: 499,
      concepts: 2,
      revisions: 2,
      deliveryDays: 2,
      deliveryTimeText: '2 Working Days',
      expressDeliveryTime: '24 Hours',
      expressDeliveryCharge: 250,
      featuresJson: JSON.stringify([
        '2 Initial Concepts',
        '2 Revisions Included',
        'Print-ready PDF',
        'High-Res PNG + JPG',
        'CMYK Ready Color Profile',
        'Standard Delivery (2 Days)',
      ]),
      sortOrder: 2,
      isActive: true,
      isDefault: true,
    },
    {
      name: 'Premium Design',
      badge: 'PREMIUM VALUE',
      shortDescription: 'Complete corporate identity design with 3 concepts, master source vector files, and priority delivery.',
      detailedDescription: 'Designed by senior brand strategists. 3 concepts, 3 revisions, editable vector source files (AI/CDR/PSD), full commercial rights, and rush proof turnaround.',
      basePrice: 999,
      doubleSidePrice: 1499,
      offerPrice: 999,
      concepts: 3,
      revisions: 3,
      deliveryDays: 1,
      deliveryTimeText: '1 Working Day',
      expressDeliveryTime: 'Same Day',
      expressDeliveryCharge: 500,
      featuresJson: JSON.stringify([
        '3 Initial Concepts',
        '3 Revisions Included',
        'Print-ready PDF',
        'Full Vector Source File (AI/CDR/PSD)',
        'Commercial Usage Rights',
        'Priority 24h Delivery',
      ]),
      sortOrder: 3,
      isActive: true,
      isDefault: false,
    },
  ];

  const createdPackages = [];
  for (const pkg of defaultPackages) {
    const existing = await prisma.designPackage.findFirst({ where: { name: pkg.name } });
    if (!existing) {
      const created = await prisma.designPackage.create({ data: pkg });
      console.log(`Created Design Package: ${created.name} (ID: ${created.id})`);
      createdPackages.push(created);
    } else {
      createdPackages.push(existing);
    }
  }

  // 2. Master Design Add-ons
  const defaultAddons = [
    {
      name: 'Extra Revision',
      price: 150,
      description: 'One additional revision round within 24 hours',
      badge: null,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Editable Source File (AI/CDR/PSD)',
      price: 300,
      description: 'Full open vector master file for future edits',
      badge: 'POPULAR',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Extra Concept',
      price: 300,
      description: 'One additional distinct creative layout concept',
      badge: null,
      sortOrder: 3,
      isActive: true,
    },
    {
      name: 'Express Delivery (24 Hours)',
      price: 500,
      description: 'Guaranteed initial digital proof delivered within 24 hours',
      badge: 'RUSH',
      sortOrder: 4,
      isActive: true,
    },
    {
      name: 'Content Writing & Slogans',
      price: 300,
      description: 'Creative copywriting and tagline generation for your brand',
      badge: null,
      sortOrder: 5,
      isActive: true,
    },
    {
      name: 'Image Editing & Background Removal',
      price: 100,
      description: 'Professional photo enhancement and clean cutout',
      badge: null,
      sortOrder: 6,
      isActive: true,
    },
  ];

  for (const addon of defaultAddons) {
    const existing = await prisma.designAddon.findFirst({ where: { name: addon.name } });
    if (!existing) {
      const created = await prisma.designAddon.create({ data: addon });
      console.log(`Created Design Add-on: ${created.name} (₹${created.price})`);
    }
  }

  // 3. Map Packages to Products
  const products = await prisma.product.findMany();
  console.log(`Mapping packages across ${products.length} products...`);

  for (const prod of products) {
    for (const pkg of createdPackages) {
      const existingMapping = await prisma.productDesignPackageMapping.findUnique({
        where: {
          productId_packageId: {
            productId: prod.id,
            packageId: pkg.id,
          },
        },
      });

      if (!existingMapping) {
        // Customize pricing for Flyers / Posters if applicable
        const isFlyer = prod.name.toLowerCase().includes('flyer') || prod.slug.includes('flyer');
        let customPrice = null;
        let customDoubleSidePrice = null;

        if (isFlyer) {
          if (pkg.name === 'Basic Design') {
            customPrice = 399;
            customDoubleSidePrice = 599;
          } else if (pkg.name === 'Standard Design') {
            customPrice = 699;
            customDoubleSidePrice = 999;
          } else if (pkg.name === 'Premium Design') {
            customPrice = 1199;
            customDoubleSidePrice = 1799;
          }
        }

        await prisma.productDesignPackageMapping.create({
          data: {
            productId: prod.id,
            packageId: pkg.id,
            customPrice,
            customDoubleSidePrice,
            sortOrder: pkg.sortOrder,
            isDefault: pkg.isDefault,
            isActive: true,
          },
        });
      }
    }
  }

  // 4. Default Store Settings for Design Services
  const designSettings = [
    { key: 'DESIGN_MAX_FILE_SIZE_MB', value: '100', description: 'Maximum file upload size in MB' },
    { key: 'DESIGN_ALLOWED_FORMATS', value: 'PDF,AI,CDR,PSD,PNG,JPG,SVG', description: 'Allowed artwork formats' },
    { key: 'DESIGN_JOB_PREFIX', value: 'PB-DES', description: 'Sequential design job number prefix' },
    { key: 'DESIGN_DEFAULT_REVISION_LIMIT', value: '2', description: 'Default revisions included' },
    { key: 'DESIGN_DEFAULT_DELIVERY_DAYS', value: '2', description: 'Default delivery days' },
  ];

  for (const s of designSettings) {
    await prisma.storeSetting.upsert({
      where: { key: s.key },
      create: s,
      update: { description: s.description },
    });
  }

  console.log('--- Design Services Seeding Completed ---');
}

if (process.argv[1].endsWith('seedDesignServices.js')) {
  seedDesignServices()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

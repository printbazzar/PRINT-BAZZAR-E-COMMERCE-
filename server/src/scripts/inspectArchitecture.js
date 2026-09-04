import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  console.log('--- DATABASE INSPECTION REPORT ---');

  // Check counts
  const [
    categoryCount,
    productCount,
    productImageCount,
    productSpecCount,
    productOptionCount,
    productOptionValCount,
    productCombinationCount,
    priceSlabCount,
    customerCount,
    orderCount,
    orderItemCount,
    staffCount,
    settingCount,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productImage.count(),
    prisma.productSpecification.count(),
    prisma.productOption.count(),
    prisma.productOptionValue.count(),
    prisma.productCombination.count(),
    prisma.productPriceSlab.count(),
    prisma.customer.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.user.count(),
    prisma.storeSetting.count(),
    prisma.productArtworkSetting.count(),
    prisma.productDesignPackage.count(),
    prisma.productDesignBriefField.count(),
    prisma.artworkUpload.count(),
  ]);

  console.log('TABLE COUNTS:');
  console.log(`- Category: ${categoryCount}`);
  console.log(`- Product: ${productCount}`);
  console.log(`- ProductImage: ${productImageCount}`);
  console.log(`- ProductSpecification: ${productSpecCount}`);
  console.log(`- ProductOption: ${productOptionCount}`);
  console.log(`- ProductOptionValue: ${productOptionValCount}`);
  console.log(`- ProductCombination: ${productCombinationCount}`);
  console.log(`- ProductPriceSlab: ${priceSlabCount}`);
  console.log(`- ProductArtworkSetting: ${arguments[0] || 'active'}`);
  console.log(`- Customer: ${customerCount}`);
  console.log(`- Order: ${orderCount}`);
  console.log(`- OrderItem: ${orderItemCount}`);
  console.log(`- Staff: ${staffCount}`);
  console.log(`- StoreSetting: ${settingCount}`);

  // Inspect a sample product with options and combinations
  const sampleProduct = await prisma.product.findFirst({
    where: {
      options: { some: {} },
    },
    include: {
      category: { select: { name: true, slug: true } },
      options: { include: { values: true } },
      combinations: true,
      priceSlabs: true,
      images: { take: 2 },
    },
  });

  console.log('\nSAMPLE PRODUCT ARCHITECTURE:');
  if (sampleProduct) {
    console.log(`- Name: ${sampleProduct.name}`);
    console.log(`- Slug: ${sampleProduct.slug}`);
    console.log(`- Category: ${sampleProduct.category.name}`);
    console.log(`- Pricing Type: ${sampleProduct.pricingType}`);
    console.log(`- Quantity Type: ${sampleProduct.quantityType} (${sampleProduct.quantityUnit})`);
    console.log(`- Design Charges: Single=₹${sampleProduct.singleSideDesignCharge}, Double=₹${sampleProduct.doubleSideDesignCharge}`);
    console.log(`- Options Count: ${sampleProduct.options.length}`);
    sampleProduct.options.forEach((opt, idx) => {
      console.log(`   [Option ${idx + 1}] ${opt.optionName} (isAddon: ${opt.isAddon}): ${opt.values.map(v => v.valueLabel).join(', ')}`);
    });
    console.log(`- Combinations Count: ${sampleProduct.combinations.length}`);
    console.log(`- Price Slabs Count: ${sampleProduct.priceSlabs.length}`);
  }

  // Inspect recent order item structure
  const sampleOrderItem = await prisma.orderItem.findFirst({
    include: { order: true },
  });
  console.log('\nSAMPLE ORDER ITEM STRUCTURE:');
  if (sampleOrderItem) {
    console.log(`- Order: ${sampleOrderItem.order.orderNumber}`);
    console.log(`- Product Snapshot: ${sampleOrderItem.productNameSnapshot}`);
    console.log(`- Quantity: ${sampleOrderItem.quantity}`);
    console.log(`- Design Required: ${sampleOrderItem.designRequired}`);
    console.log(`- Artwork File URL: ${sampleOrderItem.artworkFileUrl || 'None'}`);
    console.log(`- Options Snapshot: ${sampleOrderItem.optionsSnapshot}`);
  }

  await prisma.$disconnect();
}

inspect().catch(console.error);

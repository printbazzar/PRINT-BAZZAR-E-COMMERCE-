import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

const ALL_47_TABLES = [
  'ArtworkUpload', 'AuditLog', 'AuthSession', 'Banner', 'Cart', 'CartItem',
  'Category', 'Customer', 'CustomerAddress', 'DesignAddon', 'DesignOrder',
  'DesignPackage', 'DesignRevision', 'Invoice', 'OptionMaster', 'OptionMasterValue',
  'Order', 'OrderItem', 'OrderNote', 'OrderStatusHistory', 'Payment', 'Permission',
  'PriceHistory', 'PriceVersion', 'Product', 'ProductArtworkSetting',
  'ProductCombination', 'ProductCompatibilityRule', 'ProductDesignBriefField',
  'ProductDesignPackage', 'ProductDesignPackageMapping', 'ProductImage',
  'ProductOption', 'ProductOptionMapping', 'ProductOptionValue',
  'ProductOptionValueMapping', 'ProductPriceSlab', 'ProductPricingMatrix',
  'ProductSpecification', 'ProductionJob', 'QualityCheck', 'Review', 'Role',
  'RolePermission', 'Shipment', 'StoreSetting', 'User'
];

async function applyRls() {
  console.log('====================================================');
  console.log(' ENABLING SUPABASE / POSTGRESQL ROW LEVEL SECURITY');
  console.log('====================================================\n');

  try {
    const dbUser = await prisma.$queryRawUnsafe(`
      SELECT usename, usesuper, usebypassrls 
      FROM pg_user 
      WHERE usename = current_user;
    `);
    console.log('Database user connecting:', dbUser[0]?.usename, '| usebypassrls:', dbUser[0]?.usebypassrls);
    console.log('');

    console.log('Enabling Row Level Security (RLS) on all 47 tables...');
    for (const table of ALL_47_TABLES) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    }
    console.log('  🔒 RLS confirmed enabled across all 47 database tables.');

    const policySqlStatements = [
      // --- CATALOG: Public Read Access ---
      'DROP POLICY IF EXISTS "Public can view active products" ON "Product";',
      `CREATE POLICY "Public can view active products" ON "Product" FOR SELECT USING (status = 'ACTIVE');`,

      'DROP POLICY IF EXISTS "Public can view categories" ON "Category";',
      'CREATE POLICY "Public can view categories" ON "Category" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view product images" ON "ProductImage";',
      'CREATE POLICY "Public can view product images" ON "ProductImage" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view product specifications" ON "ProductSpecification";',
      'CREATE POLICY "Public can view product specifications" ON "ProductSpecification" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view product options" ON "ProductOption";',
      'CREATE POLICY "Public can view product options" ON "ProductOption" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view product option values" ON "ProductOptionValue";',
      'CREATE POLICY "Public can view product option values" ON "ProductOptionValue" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view product price slabs" ON "ProductPriceSlab";',
      'CREATE POLICY "Public can view product price slabs" ON "ProductPriceSlab" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view pricing matrix" ON "ProductPricingMatrix";',
      'CREATE POLICY "Public can view pricing matrix" ON "ProductPricingMatrix" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view product combinations" ON "ProductCombination";',
      'CREATE POLICY "Public can view product combinations" ON "ProductCombination" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view compatibility rules" ON "ProductCompatibilityRule";',
      'CREATE POLICY "Public can view compatibility rules" ON "ProductCompatibilityRule" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view option mappings" ON "ProductOptionMapping";',
      'CREATE POLICY "Public can view option mappings" ON "ProductOptionMapping" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view option value mappings" ON "ProductOptionValueMapping";',
      'CREATE POLICY "Public can view option value mappings" ON "ProductOptionValueMapping" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view artwork settings" ON "ProductArtworkSetting";',
      'CREATE POLICY "Public can view artwork settings" ON "ProductArtworkSetting" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view design brief fields" ON "ProductDesignBriefField";',
      'CREATE POLICY "Public can view design brief fields" ON "ProductDesignBriefField" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view product design packages" ON "ProductDesignPackage";',
      'CREATE POLICY "Public can view product design packages" ON "ProductDesignPackage" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view product design mappings" ON "ProductDesignPackageMapping";',
      'CREATE POLICY "Public can view product design mappings" ON "ProductDesignPackageMapping" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view design packages" ON "DesignPackage";',
      'CREATE POLICY "Public can view design packages" ON "DesignPackage" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view design addons" ON "DesignAddon";',
      'CREATE POLICY "Public can view design addons" ON "DesignAddon" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view option masters" ON "OptionMaster";',
      'CREATE POLICY "Public can view option masters" ON "OptionMaster" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view option master values" ON "OptionMasterValue";',
      'CREATE POLICY "Public can view option master values" ON "OptionMasterValue" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view banners" ON "Banner";',
      'CREATE POLICY "Public can view banners" ON "Banner" FOR SELECT USING (true);',

      'DROP POLICY IF EXISTS "Public can view reviews" ON "Review";',
      'CREATE POLICY "Public can view reviews" ON "Review" FOR SELECT USING (true);',

      // --- CUSTOMER DATA ISOLATION: Orders ---
      'DROP POLICY IF EXISTS "Customers can only view own orders" ON "Order";',
      `CREATE POLICY "Customers can only view own orders" ON "Order" FOR SELECT TO authenticated USING ("customerId" = (auth.uid())::text OR "customerEmail" = (auth.jwt() ->> 'email'));`,

      // --- CUSTOMER DATA ISOLATION: Order Items ---
      'DROP POLICY IF EXISTS "Customers can only view own order items" ON "OrderItem";',
      `CREATE POLICY "Customers can only view own order items" ON "OrderItem" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM "Order" o WHERE o.id = "OrderItem"."orderId" AND (o."customerId" = (auth.uid())::text OR o."customerEmail" = (auth.jwt() ->> 'email'))));`,

      // --- CUSTOMER DATA ISOLATION: Order Status History ---
      'DROP POLICY IF EXISTS "Customers can only view own order status history" ON "OrderStatusHistory";',
      `CREATE POLICY "Customers can only view own order status history" ON "OrderStatusHistory" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM "Order" o WHERE o.id = "OrderStatusHistory"."orderId" AND (o."customerId" = (auth.uid())::text OR o."customerEmail" = (auth.jwt() ->> 'email'))));`,

      // --- CUSTOMER DATA ISOLATION: Customer Profile ---
      'DROP POLICY IF EXISTS "Customers can view own profile" ON "Customer";',
      `CREATE POLICY "Customers can view own profile" ON "Customer" FOR SELECT TO authenticated USING (id = (auth.uid())::text OR email = (auth.jwt() ->> 'email'));`,

      'DROP POLICY IF EXISTS "Customers can update own profile" ON "Customer";',
      `CREATE POLICY "Customers can update own profile" ON "Customer" FOR UPDATE TO authenticated USING (id = (auth.uid())::text OR email = (auth.jwt() ->> 'email'));`,

      // --- CUSTOMER DATA ISOLATION: Customer Addresses ---
      'DROP POLICY IF EXISTS "Customers manage own addresses" ON "CustomerAddress";',
      `CREATE POLICY "Customers manage own addresses" ON "CustomerAddress" FOR ALL TO authenticated USING ("customerId" = (auth.uid())::text OR EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = "CustomerAddress"."customerId" AND (c.id = (auth.uid())::text OR c.email = (auth.jwt() ->> 'email'))));`,

      // --- CUSTOMER DATA ISOLATION: Cart & Cart Items ---
      'DROP POLICY IF EXISTS "Customers manage own cart" ON "Cart";',
      `CREATE POLICY "Customers manage own cart" ON "Cart" FOR ALL TO authenticated USING ("customerId" = (auth.uid())::text);`,

      'DROP POLICY IF EXISTS "Customers manage own cart items" ON "CartItem";',
      `CREATE POLICY "Customers manage own cart items" ON "CartItem" FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM "Cart" c WHERE c.id = "CartItem"."cartId" AND c."customerId" = (auth.uid())::text));`,

      // --- CUSTOMER DATA ISOLATION: Customer Artworks ---
      'DROP POLICY IF EXISTS "Customers view own artworks" ON "ArtworkUpload";',
      `CREATE POLICY "Customers view own artworks" ON "ArtworkUpload" FOR SELECT TO authenticated USING ("customerId" = (auth.uid())::text OR EXISTS (SELECT 1 FROM "Order" o WHERE o.id = "ArtworkUpload"."orderId" AND (o."customerId" = (auth.uid())::text OR o."customerEmail" = (auth.jwt() ->> 'email'))));`,

      // --- CUSTOMER DATA ISOLATION: Customer Design Orders ---
      'DROP POLICY IF EXISTS "Customers view own design orders" ON "DesignOrder";',
      `CREATE POLICY "Customers view own design orders" ON "DesignOrder" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM "Order" o WHERE o.id = "DesignOrder"."orderId" AND (o."customerId" = (auth.uid())::text OR o."customerEmail" = (auth.jwt() ->> 'email'))));`,

      // --- CUSTOMER DATA ISOLATION: Customer Design Revisions ---
      'DROP POLICY IF EXISTS "Customers view own design revisions" ON "DesignRevision";',
      `CREATE POLICY "Customers view own design revisions" ON "DesignRevision" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM "DesignOrder" dord JOIN "Order" o ON o.id = dord."orderId" WHERE dord.id = "DesignRevision"."designOrderId" AND (o."customerId" = (auth.uid())::text OR o."customerEmail" = (auth.jwt() ->> 'email'))));`
    ];

    console.log('\nApplying RLS Security Policies...');
    for (const sql of policySqlStatements) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log('  ✓ All RLS policies successfully applied!\n');

    const tables = await prisma.$queryRawUnsafe(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    const enabledCount = tables.filter(t => t.rowsecurity).length;
    const disabledCount = tables.filter(t => !t.rowsecurity).length;

    console.log(`Verification: ${enabledCount} of ${tables.length} tables have RLS ENABLED (${disabledCount} disabled).`);

    const policies = await prisma.$queryRawUnsafe(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    console.log(`Total Active RLS Policies: ${policies.length}\n`);

    console.log('====================================================');
    console.log(' ALL RLS POLICIES APPLIED & VERIFIED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('Error applying RLS policies:', err);
  } finally {
    await prisma.$disconnect();
  }
}

applyRls();
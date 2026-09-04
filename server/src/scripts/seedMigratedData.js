import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Print Bazzar Database Migration & Seeding...');

  // 1. Roles & Permissions
  const permissionsList = [
    { code: 'PRODUCT_VIEW', module: 'Catalog', description: 'View products' },
    { code: 'PRODUCT_CREATE', module: 'Catalog', description: 'Create products' },
    { code: 'PRODUCT_EDIT', module: 'Catalog', description: 'Edit products' },
    { code: 'PRODUCT_DELETE', module: 'Catalog', description: 'Delete/Archive products' },
    { code: 'PRICE_EDIT', module: 'Pricing', description: 'Modify pricing slabs' },
    { code: 'CATEGORY_EDIT', module: 'Catalog', description: 'Manage categories' },
    { code: 'BANNER_EDIT', module: 'CMS', description: 'Manage banners & homepage CMS' },
    { code: 'ORDER_VIEW', module: 'Orders', description: 'View and search orders' },
    { code: 'ORDER_UPDATE', module: 'Orders', description: 'Update order status and notes' },
    { code: 'CUSTOMER_VIEW', module: 'CRM', description: 'View customer accounts' },
    { code: 'REPORT_VIEW', module: 'Analytics', description: 'View sales and order reports' },
    { code: 'SETTINGS_EDIT', module: 'Settings', description: 'Manage store settings' },
  ];

  for (const perm of permissionsList) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }

  const allPerms = await prisma.permission.findMany();

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Full administrative access to all modules',
      isSystem: true,
    },
  });

  // Assign all permissions to Super Admin
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: p.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: p.id,
      },
    });
  }

  // 2. Department Roles & Staff Users
  const staffRoles = [
    { name: 'SUPER_ADMIN', desc: 'Full System Administrator', isSystem: true },
    { name: 'DESIGN_LEAD', desc: 'Prepress & Graphic Design Lead', isSystem: true },
    { name: 'PRESS_OPERATOR', desc: 'Offset & Digital Press Operator', isSystem: true },
    { name: 'FINISHING_INSPECTOR', desc: 'Finishing, Cutting & QC Inspector', isSystem: true },
    { name: 'PACKING_SUPERVISOR', desc: 'Packaging & Dispatch Desk Lead', isSystem: true },
    { name: 'DELIVERY_EXECUTIVE', desc: 'Logistics & Local Express Delivery', isSystem: true },
  ];

  const roleMap = {};
  for (const r of staffRoles) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.desc },
      create: { name: r.name, description: r.desc, isSystem: r.isSystem },
    });
    roleMap[r.name] = roleRecord;

    // Grant all permissions to each role for now
    for (const p of allPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: roleRecord.id, permissionId: p.id },
        },
        update: {},
        create: { roleId: roleRecord.id, permissionId: p.id },
      });
    }
  }

  const salt = await bcrypt.genSalt(10);
  const staffHash = await bcrypt.hash('Staff@123', salt);
  const adminHash = await bcrypt.hash('Admin@123', salt);

  const staffAccounts = [
    { name: 'Super Admin', email: 'admin@printbazzar.online', hash: adminHash, role: 'SUPER_ADMIN', dept: 'ALL' },
    { name: 'Arun (Prepress Design)', email: 'design@printbazzar.online', hash: staffHash, role: 'DESIGN_LEAD', dept: 'DESIGN' },
    { name: 'Suresh (Press Master)', email: 'press@printbazzar.online', hash: staffHash, role: 'PRESS_OPERATOR', dept: 'PRODUCTION' },
    { name: 'Ramesh (QC & Finishing)', email: 'qc@printbazzar.online', hash: staffHash, role: 'FINISHING_INSPECTOR', dept: 'FINISHING_QC' },
    { name: 'Vicky (Packing Desk)', email: 'packing@printbazzar.online', hash: staffHash, role: 'PACKING_SUPERVISOR', dept: 'PACKING' },
    { name: 'Saravanan (Delivery Boy)', email: 'delivery@printbazzar.online', hash: staffHash, role: 'DELIVERY_EXECUTIVE', dept: 'DELIVERY' },
  ];

  for (const s of staffAccounts) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: {
        name: s.name,
        passwordHash: s.hash,
        roleId: roleMap[s.role].id,
        department: s.dept,
        isActive: true,
      },
      create: {
        name: s.name,
        email: s.email,
        passwordHash: s.hash,
        roleId: roleMap[s.role].id,
        department: s.dept,
        isActive: true,
      },
    });
  }
  console.log('✔ Seeded 6 Department In-House Staff Accounts (Admin@123 / Staff@123)');

  // 2b. Seed Sample B2B Corporate Company & B2C Retail Customers
  const corpHash = await bcrypt.hash('Corp@123', salt);
  const custHash = await bcrypt.hash('Customer@123', salt);

  const corpCustomer = await prisma.customer.upsert({
    where: { email: 'corporate@trichytech.com' },
    update: {
      accountType: 'B2B_CORPORATE',
      companyName: 'Trichy Tech Solutions Pvt Ltd',
      gstNumber: '33AAACT1234F1Z5',
      businessPan: 'AAACT1234F',
      isVerifiedCorporate: true,
      corporateDiscountPct: 10.0,
      creditLimit: 50000,
      mobile: '9840123456',
    },
    create: {
      name: 'Ramesh Sundaram',
      email: 'corporate@trichytech.com',
      passwordHash: corpHash,
      mobile: '9840123456',
      whatsapp: '9840123456',
      accountType: 'B2B_CORPORATE',
      companyName: 'Trichy Tech Solutions Pvt Ltd',
      gstNumber: '33AAACT1234F1Z5',
      businessPan: 'AAACT1234F',
      isVerifiedCorporate: true,
      corporateDiscountPct: 10.0,
      creditLimit: 50000,
      address: 'Tower A, IT Park, Cantonment',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      pincode: '620001',
    },
  });

  const b2cCustomer = await prisma.customer.upsert({
    where: { email: 'customer@printbazzar.online' },
    update: {
      name: 'Karthik Subramanian',
      accountType: 'B2C_RETAIL',
      mobile: '9840199999',
    },
    create: {
      name: 'Karthik Subramanian',
      email: 'customer@printbazzar.online',
      passwordHash: custHash,
      mobile: '9840199999',
      whatsapp: '9840199999',
      accountType: 'B2C_RETAIL',
      address: '45, Main Road, Thillai Nagar',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      pincode: '620018',
    },
  });

  console.log('✔ Seeded B2B Corporate Company (corporate@trichytech.com / Corp@123) & B2C Retail (customer@printbazzar.online / Customer@123)');

  // 3. Store Settings
  const defaultSettings = [
    { key: 'STORE_NAME', value: JSON.stringify('PRINT BAZZAR'), description: 'Store Name' },
    { key: 'STORE_EMAIL', value: JSON.stringify('printbazzar.online@gmail.com'), description: 'Support Email' },
    { key: 'STORE_PHONE', value: JSON.stringify('+91 96290 98565'), description: 'WhatsApp & Support Phone' },
    { key: 'STORE_ADDRESS', value: JSON.stringify('12 A, Allimal Street, Big Bazzar St, Tiruchirapalli, Tamilnadu - 620008'), description: 'Physical Shop Address' },
    { key: 'GST_RATE', value: JSON.stringify(18), description: 'GST Percentage (18% default)' },
    { key: 'GST_NUMBER', value: JSON.stringify('33AAAAA0000A1Z5'), description: 'Store GSTIN' },
    { key: 'ORDER_PREFIX', value: JSON.stringify('PB-ORD-2026-'), description: 'Order ID Prefix' },
    { key: 'FREE_SHIPPING_THRESHOLD', value: JSON.stringify(1500), description: 'Minimum order amount for free delivery' },
    { key: 'DEFAULT_SHIPPING_CHARGE', value: JSON.stringify(80), description: 'Standard shipping charge' },
  ];

  for (const s of defaultSettings) {
    await prisma.storeSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // 4. Categories Migration
  const categoriesData = [
    { id: 'cat-bc', name: 'Business Cards', slug: 'business-cards', image: '/src/assets/images/category/business_cards.png', order: 1 },
    { id: 'cat-be', name: 'Business Essentials', slug: 'business-essentials', image: '/src/assets/images/category/business_essentials.jpg', banner: '/src/assets/images/business_card/banner.png', order: 2 },
    { id: 'cat-mkt', name: 'Marketing and Promotionals Items', slug: 'marketing-and-promotionals-items', image: '/src/assets/images/category/marketing.jpg', order: 3 },
    { id: 'cat-stk', name: 'Stickers & Labels', slug: 'stickers-and-labels', image: '/src/assets/images/category/stcikers.jpg', order: 4 },
    { id: 'cat-pkg', name: 'Packagings', slug: 'packagings', image: '/src/assets/images/category/packages.jpg', order: 5 },
    { id: 'cat-sgn', name: 'Signages', slug: 'signages', image: '/src/assets/images/category/signages.jpg', order: 6 },
    { id: 'cat-gft', name: 'Personalised Gifts', slug: 'personalised-gifts', image: '/src/assets/images/category/gifts.jpg', order: 7 },
    { id: 'cat-inv', name: 'Invitations', slug: 'invitations', image: '/src/assets/images/category/invitation.jpg', order: 8 },
    { id: 'cat-id', name: 'ID Cards', slug: 'id-cards', image: '/src/assets/images/business_essen/idCard.jpg', order: 9 },
    { id: 'cat-crt', name: 'Certificates', slug: 'certificates', image: '/src/assets/images/business_essen/certificate.jpg', order: 10 },
    { id: 'cat-bdg', name: 'Badges', slug: 'badges', image: '/src/assets/images/business_essen/certificate.jpg', order: 11 },
    { id: 'cat-awd', name: 'Awards', slug: 'awards', image: '/src/assets/images/category/awards.jpg', order: 12 },
    { id: 'cat-app', name: 'Apparels', slug: 'apparels', image: '/src/assets/images/category/apparels.jpg', order: 13 },
  ];

  const categoryMap = {};

  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        imageUrl: c.image,
        bannerUrl: c.banner || null,
        displayOrder: c.order,
        isActive: true,
      },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.image,
        bannerUrl: c.banner || null,
        displayOrder: c.order,
        isActive: true,
      },
    });
    categoryMap[c.name] = cat.id;
    categoryMap[c.slug] = cat.id;
  }

  console.log(`✔ Seeded ${categoriesData.length} categories`);

  // 5. Banners Migration
  const bannersData = [
    {
      title: 'Premium Business Cards',
      subtitle: 'Make a powerful first impression with luxury finishes',
      desktopImageUrl: '/src/assets/images/home_banner2.png',
      mobileImageUrl: '/src/assets/images/home_banner3_mobile.png',
      buttonText: 'Shop Business Cards',
      buttonUrl: '/category/business-cards',
      displayOrder: 1,
    },
    {
      title: 'Fast Delivery Online Printing',
      subtitle: 'Order before 12 PM for single-day delivery in Trichy & Tamil Nadu',
      desktopImageUrl: '/src/assets/images/home_banner.png',
      mobileImageUrl: '/src/assets/images/home_banner5_mobile.png',
      buttonText: 'Explore Products',
      buttonUrl: '/shop',
      displayOrder: 2,
    },
    {
      title: 'Custom Stickers & Packaging',
      subtitle: 'Waterproof vinyl, die-cut shapes & luxury foil labels',
      desktopImageUrl: '/src/assets/images/home_banner5.png',
      mobileImageUrl: '/src/assets/images/home_banner2_mobile.png',
      buttonText: 'Shop Stickers',
      buttonUrl: '/category/stickers-and-labels',
      displayOrder: 3,
    },
    {
      title: 'Marketing & Promotional Essentials',
      subtitle: 'Flyers, Brochures, Standees & Exhibition Displays',
      desktopImageUrl: '/src/assets/images/home_banner4.png',
      mobileImageUrl: '/src/assets/images/home_banner4_mobile.png',
      buttonText: 'View Marketing Items',
      buttonUrl: '/category/marketing-and-promotionals-items',
      displayOrder: 4,
    },
  ];

  await prisma.banner.deleteMany({});
  for (const b of bannersData) {
    await prisma.banner.create({ data: b });
  }

  console.log(`✔ Seeded ${bannersData.length} homepage banners`);

  // 6. Reviews / Testimonials Migration
  const reviewsData = [
    {
      customerName: 'Bharathan Yogi',
      customerAvatar: 'https://lh3.googleusercontent.com/a-/ALV-UjU6lF7ZHuPLUlSw5RSeoD4DHAQSnRk1Iw-NFx5G3Bl7p9uM-XQ=w60-h60-p-rp-mo-ba2-br100',
      rating: 5,
      reviewText: "Awesome experience with Print Bazzar. Their printing solutions are not only budget friendly but also impressively crafted. The team's professionalism and quick turnaround time impressed me. Trichy's best printing choice! Mr. Rajak was so kind in his services...",
      source: 'GOOGLE',
      isFeatured: true,
      isApproved: true,
    },
    {
      customerName: "DEV'S NATURALS",
      customerAvatar: 'https://lh3.googleusercontent.com/a-/ALV-UjWx65SfHK9IS0ANKlP0NzyXMmkw3RtV7Al_8t6kEagdYfY-hh5i=w60-h60-p-rp-mo-br100',
      rating: 5,
      reviewText: 'Awesome experience with Print Bazzar. Perfect packaging sticker prints and label cutting. Delivered safely on schedule.',
      source: 'GOOGLE',
      isFeatured: true,
      isApproved: true,
    },
    {
      customerName: 'Ijaz Ahamed',
      customerAvatar: 'https://lh3.googleusercontent.com/a-/ALV-UjXJkcUQ0ha4siIqLB3ZvGVl3kZK7F5EcRQ2u5AHegbCx5-b3SHL=w60-h60-p-rp-mo-br100',
      rating: 5,
      reviewText: 'Great Designs are done here..! They finished my logo work, shop stickering very perfect.! Don’t hesitate to go, this is the best shop for your all kind of designing needs..',
      source: 'GOOGLE',
      isFeatured: true,
      isApproved: true,
    },
    {
      customerName: "Suji's life style",
      customerAvatar: 'https://lh3.googleusercontent.com/a-/ALV-UjV7WkJ3ZwkzGK2LbQDXR9jQZSiT9G2LGvGz-H_WE46Cn4WgCbwgWQ=w60-h60-p-rp-mo-br100',
      rating: 5,
      reviewText: 'Print Bazzar no words to explain their service I had an amazing experience and super fast delivery.',
      source: 'GOOGLE',
      isFeatured: true,
      isApproved: true,
    },
    {
      customerName: 'Jeny Leon Lopez (Jen)',
      customerAvatar: 'https://lh3.googleusercontent.com/a-/ALV-UjXXxyZWAD182F-OT-qS9kRvWHZqY5JdiAxx_nSjx_PDdo5TERQ=w60-h60-p-rp-mo-ba3-br100',
      rating: 5,
      reviewText: 'I came from Bangalore to attend an international conference and had to print my business card in a hurry as I lost my originals in the hotel room. Approached Rajak of Print Bazzar and he got it printed and delivered to my venue directly! Appreciate!',
      source: 'GOOGLE',
      isFeatured: true,
      isApproved: true,
    },
    {
      customerName: 'M.Nather Basha',
      customerAvatar: 'https://lh3.googleusercontent.com/a-/ALV-UjUlal0X7hsYdu8_cpcg6eVY3MLvncuSzZ46YkgpnT_mucAKri84wQ=w60-h60-p-rp-mo-br100',
      rating: 5,
      reviewText: "Recently ordered Photo frame in print bazzar, delivered super fast with creative design.",
      source: 'GOOGLE',
      isFeatured: true,
      isApproved: true,
    },
    {
      customerName: 'Mohamed Iqsaan',
      customerAvatar: 'https://lh3.googleusercontent.com/a-/ALV-UjU77kL8ezjC_w6eqii1l1kZtb3GH1_tBuwrCyqOMKdNn4_guOnW=w60-h60-p-rp-mo-br100',
      rating: 5,
      reviewText: 'Versatility in design, the quality of their editing is top-notch, with great attention to detail and a clear understanding of what I needed. Reliable in completing the work on time.',
      source: 'GOOGLE',
      isFeatured: true,
      isApproved: true,
    }
  ];

  await prisma.review.deleteMany({});
  for (const r of reviewsData) {
    await prisma.review.create({ data: r });
  }

  console.log(`✔ Seeded ${reviewsData.length} customer reviews`);

  // 7. Full Product Catalog Migration (All 80+ Products)
  const rawProducts = [
    // Business Cards
    { id: 1, name: "Standard Card", category: "Business Cards", image: "/src/assets/images/business_card/standard_card.jpg", price: 188, description: "For 100 pieces", isFeatured: true, isBestSeller: true },
    { id: 2, name: "Laminated Card", category: "Business Cards", image: "/src/assets/images/business_card/laminated_card.png", price: 370, description: "For 100 pieces", isFeatured: true },
    { id: 3, name: "Economical Card", category: "Business Cards", image: "/src/assets/images/business_card/economical_card.jpg", price: 460, description: "For 500 pieces", isBestSeller: true },
    { id: 4, name: "Textured Card", category: "Business Cards", image: "/src/assets/images/business_card/textured_card.jpg", price: 295, description: "For 100 pieces" },
    { id: 5, name: "Square Card", category: "Business Cards", image: "/src/assets/images/business_card/square_card.jpg", price: 380, description: "For 100 pieces" },
    { id: 6, name: "Metallic Card", category: "Business Cards", image: "/src/assets/images/business_card/metallic_card.jpg", price: 300, description: "For 100 pieces" },
    { id: 7, name: "Foil Card", category: "Business Cards", image: "/src/assets/images/business_card/foil_card_mtrl.jpg", price: 1250, description: "For 100 pieces" },
    { id: 8, name: "Raised UV Card", category: "Business Cards", image: "/src/assets/images/business_card/raiseduv_mtrl.jpg", price: 850, description: "For 100 pieces" },
    { id: 9, name: "Spot UV Card", category: "Business Cards", image: "/src/assets/images/business_card/spotuv.jpg", price: 900, description: "For 1000 pieces" },
    { id: 10, name: "Synthetic Card", category: "Business Cards", image: "/src/assets/images/business_card/synthetic.jpg", price: 350, description: "For 100 pieces" },
    { id: 11, name: "Bulk Synthetic Card", category: "Business Cards", image: "/src/assets/images/business_card/bulk_synthetic.jpg", price: 500, description: "For 500 pieces" },
    { id: 12, name: "Premium Spot UV Card", category: "Business Cards", image: "/src/assets/images/business_card/premiumspot.jpg", price: 650, description: "For 1000 pieces" },
    { id: 13, name: "Die Cutting Card", category: "Business Cards", image: "/src/assets/images/business_card/die_cutting.jpg", price: 1500, description: "For 1000 pieces" },
    { id: 14, name: "Translucent Card", category: "Business Cards", image: "/src/assets/images/business_card/translucent.jpg", price: 300, description: "For 100 pieces" },
    { id: 15, name: "Perfumed Card", category: "Business Cards", image: "/src/assets/images/business_card/perfumed_card.jpg", price: 300, description: "For 100 pieces" },
    { id: 16, name: "Plantable Paper Card", category: "Business Cards", image: "/src/assets/images/business_card/plantable_card_mtrl2.jpg", price: 300, description: "For 100 pieces" },

    // Business Essentials
    { id: 17, name: "Letter Head", category: "Business Essentials", image: "/src/assets/images/business_essen/letterhead.jpg", price: 150, description: "For Each 10 pieces", isFeatured: true },
    { id: 55, name: "Single Color Letter Head", category: "Business Essentials", image: "/src/assets/images/business_essen/single_letterhead.jpg", price: 700, description: "For 500 Pieces" },
    { id: 56, name: "A5 Letter Head", category: "Business Essentials", image: "/src/assets/images/business_essen/a5letterHead.jpg", price: 750, description: "For 1000 Pieces" },
    { id: 57, name: "Prescription Pad", category: "Business Essentials", image: "/src/assets/images/business_essen/prescription_pad.jpg", price: 700, description: "For 500 Pieces" },
    { id: 18, name: "Bill Book", category: "Business Essentials", image: "/src/assets/images/business_essen/billbook.jpg", price: 650, description: "For Each 2 pieces", isBestSeller: true },
    { id: 19, name: "Bulk Bill Book", category: "Business Essentials", image: "/src/assets/images/business_essen/bulk billbook.jpg", price: 4000, description: "For Each 10 pieces" },
    { id: 20, name: "Envelope Covers", category: "Business Essentials", image: "/src/assets/images/business_essen/envelope.jpg", price: 590, description: "For Each 100 pieces" },
    { id: 21, name: "Bulk Envelope Covers", category: "Business Essentials", image: "/src/assets/images/business_essen/bulk_envelope.jpg", price: 1650, description: "For Each 500 pieces" },
    { id: 30, name: "Note Pad", category: "Business Essentials", image: "/src/assets/images/business_essen/note_pad.jpg", price: 489, description: "For 1 piece" },
    { id: 31, name: "Brochures", category: "Business Essentials", image: "/src/assets/images/business_essen/brouchers.jpg", price: 190, description: "For 10 pieces" },
    { id: 32, name: "Bulk Brochures", category: "Business Essentials", image: "/src/assets/images/business_essen/bulk_brochure.jpg", price: 3540, description: "For 1000 pieces" },
    { id: 94, name: "Booklet", category: "Business Essentials", image: "/src/assets/images/business_essen/bulk_brochure.jpg", price: 3540, description: "For 10 pieces" },

    // ID Cards
    { id: 22, name: "ID Cards Set", category: "ID Cards", image: "/src/assets/images/business_essen/idCard_mtrl.jpg", price: 1950, description: "For Each 13 pieces" },
    { id: 23, name: "Lanyards", category: "ID Cards", image: "/src/assets/images/business_essen/lanyard_mtrl.jpg", price: 780, description: "For Each 13 pieces" },
    { id: 24, name: "ID Card", category: "ID Cards", image: "/src/assets/images/business_essen/cardOnly.jpg", price: 150, description: "For Each piece" },
    { id: 64, name: "Event ID Card", category: "ID Cards", image: "/src/assets/images/business_essen/Event_Id_card.jpg", price: 200, description: "For 10 Pieces" },
    { id: 65, name: "Volunteer ID Card", category: "ID Cards", image: "/src/assets/images/business_essen/volunteer_id_card.jpg", price: 200, description: "For 10 Pieces" },
    { id: 66, name: "ID Card Retractor", category: "ID Cards", image: "/src/assets/images/business_essen/ID_card_retractor.jpg", price: 130, description: "For 1 Piece" },

    // Certificates
    { id: 25, name: "Standard Certificates", category: "Certificates", image: "/src/assets/images/business_essen/certificate.jpg", price: 180, description: "For 10 pieces" },
    { id: 26, name: "Premium Certificates", category: "Certificates", image: "/src/assets/images/business_essen/premium_certi_mtrl.jpg", price: 1300, description: "For 24 pieces" },
    { id: 27, name: "Laminated Certificates", category: "Certificates", image: "/src/assets/images/business_essen/lamination_certi.jpg", price: 10, description: "For 10 pieces" },
    { id: 28, name: "Framed Certificates", category: "Certificates", image: "/src/assets/images/business_essen/framed_certi.jpg", price: 300, description: "For 1 piece" },
    { id: 29, name: "Bulk Certificates", category: "Certificates", image: "/src/assets/images/business_essen/bulk_certi.jpg", price: 4600, description: "For 500 pieces" },

    // Marketing & Promotionals
    { id: 33, name: "Single Color Flyers", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/single_flyer.jpg", price: 950, description: "For 1000 pieces" },
    { id: 34, name: "A4 Multi Color Flyers", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/a4_flyers.jpg", price: 2850, description: "For 500 pieces", isFeatured: true },
    { id: 96, name: "A5 Multi Color Flyers", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/a5_flyers.jpg", price: 2900, description: "For 1000 pieces" },
    { id: 35, name: "A3 Multi Color Flyers", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/a3_flyer.jpg", price: 2950, description: "For 1000 pieces" },
    { id: 40, name: "Mini QR Stand", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/miniqr.jpg", price: 150, description: "For 1 piece", isBestSeller: true },
    { id: 36, name: "Rollup Standee", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/standee.jpg", price: 1300, description: "For 1 piece", isFeatured: true },
    { id: 37, name: "Sunpack Printing", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/sunpack.jpg", price: 1800, description: "For 50 pieces" },
    { id: 38, name: "Pouch Laminated Board", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/laminated_board.jpg", price: 60, description: "For 1 piece" },
    { id: 39, name: "Foam Boards", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/foamboard.jpg", price: 550, description: "For 1 piece" },
    { id: 41, name: "Menu Card", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/menu.jpg", price: 50, description: "For 1 piece" },
    { id: 42, name: "Banners", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/banner.jpg", price: 12, description: "Per Square feet" },
    { id: 43, name: "Large Format Stickers", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/lfsticker.jpg", price: 12, description: "Per Square feet" },
    { id: 67, name: "Danglers", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/Danglers.jpg", price: 380, description: "For 10 Pieces" },
    { id: 92, name: "Wrist Bands", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/wristband.jpg", price: 380, description: "For 10 Pieces" },
    { id: 93, name: "Photo Booth", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/photobooth.jpg", price: 550, description: "For 1 Piece" },
    { id: 90, name: "Viboothi Cover Single Color", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/viboothisc_mtrl2.jpg", price: 1180, description: "For 2000 Pieces" },
    { id: 91, name: "Viboothi Cover Multi Color", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/viboothimc.jpg", price: 3100, description: "For 4000 Pieces" },
    { id: 95, name: "Gift Voucher", category: "Marketing and Promotionals Items", image: "/src/assets/images/marketing_materials/gift_voucher.jpg", price: 3000, description: "For 1500 Pieces" },

    // Badges
    { id: 82, name: "Acrylic Badges", category: "Badges", image: "/src/assets/images/marketing_materials/Danglers.jpg", price: 380, description: "For 10 Pieces" },
    { id: 83, name: "Encraved Badges", category: "Badges", image: "/src/assets/images/marketing_materials/Danglers.jpg", price: 380, description: "For 10 Pieces" },
    { id: 84, name: "Magnet Badges", category: "Badges", image: "/src/assets/images/marketing_materials/Danglers.jpg", price: 380, description: "For 10 Pieces" },
    { id: 85, name: "Color Badges", category: "Badges", image: "/src/assets/images/marketing_materials/Danglers.jpg", price: 380, description: "For 10 Pieces" },
    { id: 86, name: "Sandwich Badges", category: "Badges", image: "/src/assets/images/marketing_materials/Danglers.jpg", price: 380, description: "For 10 Pieces" },
    { id: 87, name: "Die Cutting Badges", category: "Badges", image: "/src/assets/images/marketing_materials/Danglers.jpg", price: 380, description: "For 10 Pieces" },
    { id: 88, name: "Circle Badges", category: "Badges", image: "/src/assets/images/marketing_materials/Danglers.jpg", price: 380, description: "For 10 Pieces" },
    { id: 89, name: "Smiley Pin Badges", category: "Badges", image: "/src/assets/images/marketing_materials/Danglers.jpg", price: 380, description: "For 10 Pieces" },

    // Stickers & Labels
    { id: 44, name: "Circle Stickers", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/circle_shape.jpg", price: 120, description: "For 100 Pieces", isFeatured: true },
    { id: 45, name: "Oval Stickers", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/oval_shape.jpg", price: 120, description: "For 100 Pieces" },
    { id: 46, name: "Round Corner Stickers", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/rounded_corner_shape.jpg", price: 120, description: "For 100 Pieces" },
    { id: 47, name: "Square Stickers", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/square_shape.jpg", price: 120, description: "For 100 Pieces" },
    { id: 59, name: "Rectangle Stickers", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/rectangle shape.jpg", price: 180, description: "For 100 Pieces" },
    { id: 48, name: "Custom Shape Stickers", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/custom_shape.jpg", price: 120, description: "For 100 Pieces", isBestSeller: true },
    { id: 49, name: "Envelope Label", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/address_label.jpg", price: 120, description: "For 100 Pieces" },
    { id: 50, name: "Bottle and Jar Label", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/bottle_label.jpg", price: 120, description: "For 100 Pieces" },
    { id: 51, name: "Product Label", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/product_label.jpg", price: 120, description: "For 100 Pieces" },
    { id: 52, name: "Price Label", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/size_price_label.jpg", price: 120, description: "For 100 Pieces" },
    { id: 53, name: "Warranty Label", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/warranty_labels.jpg", price: 120, description: "For 100 Pieces" },
    { id: 54, name: "Warning Label", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/warning_labels.jpg", price: 120, description: "For 100 Pieces" },
    { id: 61, name: "Container Labels", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/container_labels.jpg", price: 180, description: "For 100 Pieces" },
    { id: 62, name: "UV Ink Transfer Stickers", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/uvink.jpg", price: 1150, description: "For 70 Pieces" },
    { id: 63, name: "Pouch Labels", category: "Stickers & Labels", image: "/src/assets/images/stickers&labels/pouch_labels.jpg", price: 180, description: "For 100 Pieces" },

    // Invitations
    { id: 69, name: "Business Invitation", category: "Invitations", image: "/src/assets/images/Invitations/businessInvitation.jpg", price: 100, description: "For 10 Pieces" },
    { id: 70, name: "Birthday Invitation", category: "Invitations", image: "/src/assets/images/Invitations/birthdayInvitation.jpg", price: 100, description: "For 10 Pieces" },
    { id: 71, name: "Wedding Invitation", category: "Invitations", image: "/src/assets/images/Invitations/weddingcards.jpg", price: 100, description: "For 10 Pieces", isFeatured: true },
    { id: 72, name: "Baby Shower Invitation", category: "Invitations", image: "/src/assets/images/Invitations/babyShowerInvitation.jpg", price: 100, description: "For 10 Pieces" },
    { id: 73, name: "Engagement Invitation", category: "Invitations", image: "/src/assets/images/Invitations/EngagementCards.jpg", price: 100, description: "For 10 Pieces" },
    { id: 74, name: "Puberty Invitation", category: "Invitations", image: "/src/assets/images/Invitations/pubertyCard.jpg", price: 100, description: "For 10 Pieces" },
    { id: 75, name: "Haldi Invitation", category: "Invitations", image: "/src/assets/images/Invitations/haldiCards.jpg", price: 100, description: "For 10 Pieces" },
    { id: 76, name: "Naming Ceremony Invitation", category: "Invitations", image: "/src/assets/images/Invitations/namingCards.jpg", price: 100, description: "For 10 Pieces" },
    { id: 77, name: "Event Invitation", category: "Invitations", image: "/src/assets/images/Invitations/EventCards.jpg", price: 100, description: "For 10 Pieces" },
    { id: 78, name: "House Warming Invitation", category: "Invitations", image: "/src/assets/images/Invitations/houseWarmingCard.jpg", price: 100, description: "For 10 Pieces" },
    { id: 79, name: "Other Special Occasions", category: "Invitations", image: "/src/assets/images/Invitations/occasionsCards.jpg", price: 100, description: "For 10 Pieces" },
    { id: 80, name: "Greeting Cards", category: "Invitations", image: "/src/assets/images/Invitations/greetingCard.jpg", price: 100, description: "For 10 Pieces" },
    { id: 81, name: "Thank You Cards", category: "Invitations", image: "/src/assets/images/Invitations/thankyouCard.jpg", price: 100, description: "For 10 Pieces" },
  ];

  for (const item of rawProducts) {
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const sku = `PB${String(item.id).padStart(4, '0')}`;
    const categoryId = categoryMap[item.category] || categoryMap['cat-bc'];

    const product = await prisma.product.upsert({
      where: { sku },
      update: {
        name: item.name,
        slug,
        categoryId,
        shortDescription: item.description,
        fullDescription: `High-quality custom printed ${item.name} by Print Bazzar. Produced with precision machinery and premium grade materials. Suitable for branding, events, corporate promotions, and personal use.`,
        thumbnailUrl: item.image,
        startingPrice: item.price,
        isFeatured: !!item.isFeatured,
        isBestSeller: !!item.isBestSeller,
        isNewArrival: !!item.isNewArrival,
        status: 'ACTIVE',
        metaTitle: `${item.name} | Print Bazzar Custom Printing`,
        metaDescription: `Order custom ${item.name} online at Print Bazzar. Best prices, premium quality, fast single-day turnaround.`,
      },
      create: {
        sku,
        name: item.name,
        slug,
        categoryId,
        shortDescription: item.description,
        fullDescription: `High-quality custom printed ${item.name} by Print Bazzar. Produced with precision machinery and premium grade materials. Suitable for branding, events, corporate promotions, and personal use.`,
        thumbnailUrl: item.image,
        startingPrice: item.price,
        isFeatured: !!item.isFeatured,
        isBestSeller: !!item.isBestSeller,
        isNewArrival: !!item.isNewArrival,
        status: 'ACTIVE',
        metaTitle: `${item.name} | Print Bazzar Custom Printing`,
        metaDescription: `Order custom ${item.name} online at Print Bazzar. Best prices, premium quality, fast single-day turnaround.`,
      },
    });

    // Seed Main Images
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        imageUrl: item.image,
        imageType: 'MAIN',
        displayOrder: 1,
      },
    });

    // Seed Specifications
    await prisma.productSpecification.deleteMany({ where: { productId: product.id } });
    await prisma.productSpecification.createMany({
      data: [
        { productId: product.id, specKey: 'Turnaround Time', specValue: 'Single Day (Order Before 12 PM)', displayOrder: 1 },
        { productId: product.id, specKey: 'Print Quality', specValue: 'High Definition Digital & Offset Printing', displayOrder: 2 },
        { productId: product.id, specKey: 'Custom Design Support', specValue: 'Available (Own design or Print Bazzar designer)', displayOrder: 3 },
        { productId: product.id, specKey: 'Tax & Shipping', specValue: '18% GST Applicable. Fast Courier/Local Pickup.', displayOrder: 4 },
      ],
    });

    // Seed Category-Specific Dynamic Options & Custom Slabs
    await seedCategorySpecificOptionsAndSlabs(prisma, product, item);
  }

  console.log(`✔ Successfully migrated and seeded all ${rawProducts.length} products with category-specific options, materials, sizes, finishes, and volume pricing slabs!`);
  console.log('--- DATABASE SEEDING COMPLETED SUCCESSFULLY ---');
}

async function seedCategorySpecificOptionsAndSlabs(prisma, product, item) {
  const cat = item.category || '';
  const name = item.name.toLowerCase();
  const basePrice = item.price || 150;

  // 1. Delete existing options & slabs
  await prisma.productOption.deleteMany({ where: { productId: product.id } });
  await prisma.productPriceSlab.deleteMany({ where: { productId: product.id } });

  // BUSINESS CARDS
  if (cat === 'Business Cards' || name.includes('card')) {
    // Option 1: Printing Location
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Printing Location',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        values: {
          create: [
            { valueLabel: 'Single Side', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Double Side', priceModifierType: 'FLAT', priceModifierValue: 50, displayOrder: 2 },
          ],
        },
      },
    });

    // Option 2: Paper & Material Stock
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Paper Stock / GSM',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 2,
        values: {
          create: [
            { valueLabel: '350 GSM Premium Art Board', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: '400 GSM Heavy Velvet Royal Board', priceModifierType: 'FLAT', priceModifierValue: 120, displayOrder: 2 },
            { valueLabel: '300 GSM Vintage Brown Kraft', priceModifierType: 'FLAT', priceModifierValue: 80, displayOrder: 3 },
            { valueLabel: 'Metallic Shimmer Gold / Pearl', priceModifierType: 'FLAT', priceModifierValue: 180, displayOrder: 4 },
          ],
        },
      },
    });

    // Option 3: Lamination Finish
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Lamination Finish',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 3,
        values: {
          create: [
            { valueLabel: 'Thermal Matte Lamination', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Gloss Reflective Lamination', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 2 },
            { valueLabel: 'Double Side Velvet Soft-Touch', priceModifierType: 'FLAT', priceModifierValue: 140, displayOrder: 3 },
          ],
        },
      },
    });

    // Option 4: Spot UV Finish
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Spot UV Coating',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 4,
        values: {
          create: [
            { valueLabel: 'No Spot UV', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Single Side Raised Spot UV', priceModifierType: 'FLAT', priceModifierValue: 200, displayOrder: 2 },
            { valueLabel: 'Double Side Raised Spot UV', priceModifierType: 'FLAT', priceModifierValue: 350, displayOrder: 3 },
          ],
        },
      },
    });

    // Option 5: Metallic Foil Stamping
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Foil Stamping',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 5,
        values: {
          create: [
            { valueLabel: 'No Foil Stamping', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Single Side Gold Foil', priceModifierType: 'FLAT', priceModifierValue: 250, displayOrder: 2 },
            { valueLabel: 'Double Side Gold Foil', priceModifierType: 'FLAT', priceModifierValue: 450, displayOrder: 3 },
            { valueLabel: 'Single Side Silver Foil', priceModifierType: 'FLAT', priceModifierValue: 250, displayOrder: 4 },
            { valueLabel: 'Double Side Silver Foil', priceModifierType: 'FLAT', priceModifierValue: 450, displayOrder: 5 },
          ],
        },
      },
    });

    // Option 6: Corner & Shape
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Corner Finishing',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 6,
        values: {
          create: [
            { valueLabel: 'Standard Square Cut', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: '6mm Rounded Corners Die-Cut', priceModifierType: 'FLAT', priceModifierValue: 150, displayOrder: 2 },
          ],
        },
      },
    });

    // Slabs: 100, 250, 500, 1000, 2000
    await prisma.productPriceSlab.createMany({
      data: [
        { productId: product.id, minQty: 100, maxQty: 249, unitPrice: basePrice / 100, singleSidePrice: basePrice, doubleSidePrice: basePrice + 50, designCharge: 200 },
        { productId: product.id, minQty: 250, maxQty: 499, unitPrice: (basePrice * 2.1) / 250, singleSidePrice: Math.round(basePrice * 2.1), doubleSidePrice: Math.round(basePrice * 2.1) + 90, designCharge: 200 },
        { productId: product.id, minQty: 500, maxQty: 999, unitPrice: (basePrice * 3.6) / 500, singleSidePrice: Math.round(basePrice * 3.6), doubleSidePrice: Math.round(basePrice * 3.6) + 150, designCharge: 200 },
        { productId: product.id, minQty: 1000, maxQty: 1999, unitPrice: (basePrice * 6.2) / 1000, singleSidePrice: Math.round(basePrice * 6.2), doubleSidePrice: Math.round(basePrice * 6.2) + 250, designCharge: 200 },
        { productId: product.id, minQty: 2000, maxQty: 10000, unitPrice: (basePrice * 11.0) / 2000, singleSidePrice: Math.round(basePrice * 11.0), doubleSidePrice: Math.round(basePrice * 11.0) + 400, designCharge: 200 },
      ],
    });
  }
  // STICKERS & LABELS
  else if (cat === 'Stickers & Labels' || name.includes('sticker') || name.includes('label')) {
    // Shape
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Sticker Shape',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        values: {
          create: [
            { valueLabel: 'Square / Rectangle Cut', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Circle / Round Die-Cut', priceModifierType: 'FLAT', priceModifierValue: 30, displayOrder: 2 },
            { valueLabel: 'Oval Die-Cut', priceModifierType: 'FLAT', priceModifierValue: 40, displayOrder: 3 },
            { valueLabel: 'Custom Contour Die-Cut', priceModifierType: 'FLAT', priceModifierValue: 90, displayOrder: 4 },
          ],
        },
      },
    });

    // Material
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Material & Vinyl',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 2,
        values: {
          create: [
            { valueLabel: 'White Gloss Vinyl (Waterproof)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Matte Vinyl (Tear-Resistant)', priceModifierType: 'FLAT', priceModifierValue: 20, displayOrder: 2 },
            { valueLabel: 'Clear Transparent Film', priceModifierType: 'FLAT', priceModifierValue: 60, displayOrder: 3 },
            { valueLabel: 'Metallic Gold / Silver Foil', priceModifierType: 'FLAT', priceModifierValue: 120, displayOrder: 4 },
            { valueLabel: 'Vintage Brown Kraft', priceModifierType: 'FLAT', priceModifierValue: 40, displayOrder: 5 },
          ],
        },
      },
    });

    // Size
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Sticker Size',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 3,
        values: {
          create: [
            { valueLabel: '2" x 2" (50 x 50 mm)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: '3" x 3" (75 x 75 mm)', priceModifierType: 'FLAT', priceModifierValue: 60, displayOrder: 2 },
            { valueLabel: '4" x 4" (100 x 100 mm)', priceModifierType: 'FLAT', priceModifierValue: 120, displayOrder: 3 },
            { valueLabel: 'A4 Sheet Multicut Format', priceModifierType: 'FLAT', priceModifierValue: 90, displayOrder: 4 },
          ],
        },
      },
    });

    // Slabs: 100, 250, 500, 1000, 2500
    await prisma.productPriceSlab.createMany({
      data: [
        { productId: product.id, minQty: 100, maxQty: 249, unitPrice: basePrice / 100, singleSidePrice: basePrice, doubleSidePrice: basePrice, designCharge: 150 },
        { productId: product.id, minQty: 250, maxQty: 499, unitPrice: (basePrice * 2.0) / 250, singleSidePrice: Math.round(basePrice * 2.0), doubleSidePrice: Math.round(basePrice * 2.0), designCharge: 150 },
        { productId: product.id, minQty: 500, maxQty: 999, unitPrice: (basePrice * 3.4) / 500, singleSidePrice: Math.round(basePrice * 3.4), doubleSidePrice: Math.round(basePrice * 3.4), designCharge: 150 },
        { productId: product.id, minQty: 1000, maxQty: 2499, unitPrice: (basePrice * 5.8) / 1000, singleSidePrice: Math.round(basePrice * 5.8), doubleSidePrice: Math.round(basePrice * 5.8), designCharge: 150 },
        { productId: product.id, minQty: 2500, maxQty: 10000, unitPrice: (basePrice * 12.0) / 2500, singleSidePrice: Math.round(basePrice * 12.0), doubleSidePrice: Math.round(basePrice * 12.0), designCharge: 150 },
      ],
    });
  }
  // MARKETING & PROMOTIONAL ITEMS
  else if (cat === 'Marketing and Promotionals Items' || name.includes('flyer') || name.includes('brochure') || name.includes('pamphlet')) {
    // Size
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Paper Size',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        values: {
          create: [
            { valueLabel: 'A5 Size (148 x 210 mm)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'A4 Size (210 x 297 mm)', priceModifierType: 'FLAT', priceModifierValue: 120, displayOrder: 2 },
            { valueLabel: 'A6 Pocket (105 x 148 mm)', priceModifierType: 'FLAT', priceModifierValue: -40, displayOrder: 3 },
            { valueLabel: 'DL Size (99 x 210 mm)', priceModifierType: 'FLAT', priceModifierValue: 30, displayOrder: 4 },
          ],
        },
      },
    });

    // Material
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Paper Stock',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 2,
        values: {
          create: [
            { valueLabel: '130 GSM Gloss Art Paper', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: '170 GSM Premium Art Paper', priceModifierType: 'FLAT', priceModifierValue: 80, displayOrder: 2 },
            { valueLabel: '250 GSM Heavy Board', priceModifierType: 'FLAT', priceModifierValue: 180, displayOrder: 3 },
          ],
        },
      },
    });

    // Folding
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Folding Style',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 3,
        values: {
          create: [
            { valueLabel: 'Flat Sheet (No Fold)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Half / Bi-Fold (4 Panels)', priceModifierType: 'FLAT', priceModifierValue: 50, displayOrder: 2 },
            { valueLabel: 'Tri-Fold / Z-Fold (6 Panels)', priceModifierType: 'FLAT', priceModifierValue: 90, displayOrder: 3 },
          ],
        },
      },
    });

    // Slabs: 500, 1000, 2500, 5000
    const mktBase = basePrice < 400 ? 650 : basePrice;
    await prisma.productPriceSlab.createMany({
      data: [
        { productId: product.id, minQty: 500, maxQty: 999, unitPrice: mktBase / 500, singleSidePrice: mktBase, doubleSidePrice: mktBase + 180, designCharge: 300 },
        { productId: product.id, minQty: 1000, maxQty: 2499, unitPrice: (mktBase * 1.6) / 1000, singleSidePrice: Math.round(mktBase * 1.6), doubleSidePrice: Math.round(mktBase * 1.6) + 260, designCharge: 300 },
        { productId: product.id, minQty: 2500, maxQty: 4999, unitPrice: (mktBase * 3.2) / 2500, singleSidePrice: Math.round(mktBase * 3.2), doubleSidePrice: Math.round(mktBase * 3.2) + 480, designCharge: 300 },
        { productId: product.id, minQty: 5000, maxQty: 20000, unitPrice: (mktBase * 5.8) / 5000, singleSidePrice: Math.round(mktBase * 5.8), doubleSidePrice: Math.round(mktBase * 5.8) + 800, designCharge: 300 },
      ],
    });
  }
  // ID CARDS
  else if (cat === 'ID Cards' || name.includes('id card')) {
    // Material
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Card Type',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        values: {
          create: [
            { valueLabel: 'PVC Gloss Card (0.76mm ISO Standard)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'RFID / NFC Smart Tap Card', priceModifierType: 'FLAT', priceModifierValue: 40, displayOrder: 2 },
            { valueLabel: 'Frosted Matte Transparent', priceModifierType: 'FLAT', priceModifierValue: 30, displayOrder: 3 },
          ],
        },
      },
    });

    // Lanyard
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Lanyard Rope',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 2,
        values: {
          create: [
            { valueLabel: '12mm Plain Satin Rope', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: '16mm 4-Color Multi-Logo Sublimation', priceModifierType: 'FLAT', priceModifierValue: 25, displayOrder: 2 },
            { valueLabel: '20mm Premium Executive Ribbon', priceModifierType: 'FLAT', priceModifierValue: 40, displayOrder: 3 },
          ],
        },
      },
    });

    // Holder
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Holder Case',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 3,
        values: {
          create: [
            { valueLabel: 'Clear Acrylic Rigid Case', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Soft Vinyl Waterproof Sleeve', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 2 },
            { valueLabel: 'Dual-Card Landscape Holder', priceModifierType: 'FLAT', priceModifierValue: 15, displayOrder: 3 },
          ],
        },
      },
    });

    // Slabs: 1, 5, 25, 50, 100
    await prisma.productPriceSlab.createMany({
      data: [
        { productId: product.id, minQty: 1, maxQty: 4, unitPrice: 85, singleSidePrice: 85, doubleSidePrice: 95, designCharge: 100 },
        { productId: product.id, minQty: 5, maxQty: 24, unitPrice: 70, singleSidePrice: 350, doubleSidePrice: 390, designCharge: 100 },
        { productId: product.id, minQty: 25, maxQty: 49, unitPrice: 55, singleSidePrice: 1375, doubleSidePrice: 1500, designCharge: 100 },
        { productId: product.id, minQty: 50, maxQty: 99, unitPrice: 48, singleSidePrice: 2400, doubleSidePrice: 2650, designCharge: 100 },
        { productId: product.id, minQty: 100, maxQty: 1000, unitPrice: 40, singleSidePrice: 4000, doubleSidePrice: 4500, designCharge: 100 },
      ],
    });
  }
  // SIGNAGES & BANNERS
  else if (cat === 'Signages' || name.includes('banner') || name.includes('standee') || name.includes('flex')) {
    // Size
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Dimensions & Size',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        values: {
          create: [
            { valueLabel: 'Roll-Up Standee 6 ft x 3 ft', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Banner 4 ft x 2 ft', priceModifierType: 'FLAT', priceModifierValue: -150, displayOrder: 2 },
            { valueLabel: 'Banner 6 ft x 3 ft', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 3 },
            { valueLabel: 'Large Banner 8 ft x 4 ft', priceModifierType: 'FLAT', priceModifierValue: 200, displayOrder: 4 },
          ],
        },
      },
    });

    // Material
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Media Material',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 2,
        values: {
          create: [
            { valueLabel: 'Star Frontlit 340 GSM (High Vivid)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Blackout Non-Tearable 440 GSM', priceModifierType: 'FLAT', priceModifierValue: 120, displayOrder: 2 },
            { valueLabel: 'Vinyl on 3mm Sunpack Sheet', priceModifierType: 'FLAT', priceModifierValue: 90, displayOrder: 3 },
            { valueLabel: 'Cast Acrylic Board 5mm', priceModifierType: 'FLAT', priceModifierValue: 350, displayOrder: 4 },
          ],
        },
      },
    });

    // Slabs: 1, 2, 5, 10
    const sgnBase = basePrice < 350 ? 450 : basePrice;
    await prisma.productPriceSlab.createMany({
      data: [
        { productId: product.id, minQty: 1, maxQty: 1, unitPrice: sgnBase, singleSidePrice: sgnBase, doubleSidePrice: sgnBase, designCharge: 150 },
        { productId: product.id, minQty: 2, maxQty: 4, unitPrice: sgnBase * 0.9, singleSidePrice: Math.round(sgnBase * 1.8), doubleSidePrice: Math.round(sgnBase * 1.8), designCharge: 150 },
        { productId: product.id, minQty: 5, maxQty: 9, unitPrice: sgnBase * 0.8, singleSidePrice: Math.round(sgnBase * 4.0), doubleSidePrice: Math.round(sgnBase * 4.0), designCharge: 150 },
        { productId: product.id, minQty: 10, maxQty: 50, unitPrice: sgnBase * 0.7, singleSidePrice: Math.round(sgnBase * 7.0), doubleSidePrice: Math.round(sgnBase * 7.0), designCharge: 150 },
      ],
    });
  }
  // APPARELS
  else if (cat === 'Apparels' || name.includes('shirt') || name.includes('tshirt') || name.includes('cap')) {
    // Size
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Garment Size',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        values: {
          create: [
            { valueLabel: 'M (Medium - 38")', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'L (Large - 40")', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 2 },
            { valueLabel: 'XL (Extra Large - 42")', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 3 },
            { valueLabel: 'XXL (Double XL - 44")', priceModifierType: 'FLAT', priceModifierValue: 30, displayOrder: 4 },
            { valueLabel: 'S (Small - 36")', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 5 },
          ],
        },
      },
    });

    // Fabric
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Fabric & Color',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 2,
        values: {
          create: [
            { valueLabel: '100% Bio-Wash Cotton 200 GSM (Black)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: '100% Bio-Wash Cotton 200 GSM (White)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 2 },
            { valueLabel: 'Navy Blue Royal Cotton', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 3 },
            { valueLabel: 'Dry-Fit Performance Polyester', priceModifierType: 'FLAT', priceModifierValue: -40, displayOrder: 4 },
          ],
        },
      },
    });

    // Slabs: 1, 5, 20, 50
    const appBase = basePrice < 250 ? 350 : basePrice;
    await prisma.productPriceSlab.createMany({
      data: [
        { productId: product.id, minQty: 1, maxQty: 4, unitPrice: appBase, singleSidePrice: appBase, doubleSidePrice: appBase + 60, designCharge: 100 },
        { productId: product.id, minQty: 5, maxQty: 19, unitPrice: appBase * 0.88, singleSidePrice: Math.round(appBase * 5 * 0.88), doubleSidePrice: Math.round((appBase + 60) * 5 * 0.88), designCharge: 100 },
        { productId: product.id, minQty: 20, maxQty: 49, unitPrice: appBase * 0.75, singleSidePrice: Math.round(appBase * 20 * 0.75), doubleSidePrice: Math.round((appBase + 60) * 20 * 0.75), designCharge: 100 },
        { productId: product.id, minQty: 50, maxQty: 500, unitPrice: appBase * 0.65, singleSidePrice: Math.round(appBase * 50 * 0.65), doubleSidePrice: Math.round((appBase + 60) * 50 * 0.65), designCharge: 100 },
      ],
    });
  }
  // PERSONALISED GIFTS
  else if (cat === 'Personalised Gifts' || name.includes('mug') || name.includes('bottle') || name.includes('pen') || name.includes('cushion')) {
    // Material & Finish
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Material & Finish',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        values: {
          create: [
            { valueLabel: 'Classic Gloss White Ceramic 11oz', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Magic Heat Color-Changing Mug', priceModifierType: 'FLAT', priceModifierValue: 120, displayOrder: 2 },
            { valueLabel: 'Dual Tone Inner Color Mug', priceModifierType: 'FLAT', priceModifierValue: 40, displayOrder: 3 },
          ],
        },
      },
    });

    // Slabs: 1, 5, 25, 100
    const gftBase = basePrice < 150 ? 180 : basePrice;
    await prisma.productPriceSlab.createMany({
      data: [
        { productId: product.id, minQty: 1, maxQty: 4, unitPrice: gftBase, singleSidePrice: gftBase, doubleSidePrice: gftBase, designCharge: 50 },
        { productId: product.id, minQty: 5, maxQty: 24, unitPrice: gftBase * 0.85, singleSidePrice: Math.round(gftBase * 5 * 0.85), doubleSidePrice: Math.round(gftBase * 5 * 0.85), designCharge: 50 },
        { productId: product.id, minQty: 25, maxQty: 99, unitPrice: gftBase * 0.72, singleSidePrice: Math.round(gftBase * 25 * 0.72), doubleSidePrice: Math.round(gftBase * 25 * 0.72), designCharge: 50 },
        { productId: product.id, minQty: 100, maxQty: 1000, unitPrice: gftBase * 0.60, singleSidePrice: Math.round(gftBase * 100 * 0.60), doubleSidePrice: Math.round(gftBase * 100 * 0.60), designCharge: 50 },
      ],
    });
  }
  // PACKAGINGS
  else if (cat === 'Packagings' || name.includes('box') || name.includes('bag') || name.includes('package')) {
    // Bag / Box Size
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Packaging Size',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        values: {
          create: [
            { valueLabel: 'Small (6" x 8" x 3" - Jewelry / Boutique)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Medium (8" x 10" x 4" - Retail Apparel)', priceModifierType: 'FLAT', priceModifierValue: 50, displayOrder: 2 },
            { valueLabel: 'Large (10" x 14" x 5" - Shoes & Gifts)', priceModifierType: 'FLAT', priceModifierValue: 120, displayOrder: 3 },
          ],
        },
      },
    });

    // Material
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Paper & Board Stock',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 2,
        values: {
          create: [
            { valueLabel: '180 GSM Natural Brown Kraft', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: '250 GSM Bleached White SBS Board', priceModifierType: 'FLAT', priceModifierValue: 40, displayOrder: 2 },
            { valueLabel: '300 GSM Laminated Metallic Board', priceModifierType: 'FLAT', priceModifierValue: 90, displayOrder: 3 },
          ],
        },
      },
    });

    // Slabs: 100, 250, 500, 1000
    const pkgBase = basePrice < 500 ? 1100 : basePrice;
    await prisma.productPriceSlab.createMany({
      data: [
        { productId: product.id, minQty: 100, maxQty: 249, unitPrice: pkgBase / 100, singleSidePrice: pkgBase, doubleSidePrice: pkgBase, designCharge: 200 },
        { productId: product.id, minQty: 250, maxQty: 499, unitPrice: (pkgBase * 2.1) / 250, singleSidePrice: Math.round(pkgBase * 2.1), doubleSidePrice: Math.round(pkgBase * 2.1), designCharge: 200 },
        { productId: product.id, minQty: 500, maxQty: 999, unitPrice: (pkgBase * 3.8) / 500, singleSidePrice: Math.round(pkgBase * 3.8), doubleSidePrice: Math.round(pkgBase * 3.8), designCharge: 200 },
        { productId: product.id, minQty: 1000, maxQty: 5000, unitPrice: (pkgBase * 6.9) / 1000, singleSidePrice: Math.round(pkgBase * 6.9), doubleSidePrice: Math.round(pkgBase * 6.9), designCharge: 200 },
      ],
    });
  }
  // INVITATIONS
  else if (cat === 'Invitations' || name.includes('invitation') || name.includes('wedding')) {
    // Fold
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Card Fold Style',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 1,
        values: {
          create: [
            { valueLabel: 'Single Leaf Flat Card (5" x 7")', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Bi-Fold Center Fold (7" x 10" Open)', priceModifierType: 'FLAT', priceModifierValue: 60, displayOrder: 2 },
            { valueLabel: 'Gatefold Luxury 3-Panel Card', priceModifierType: 'FLAT', priceModifierValue: 140, displayOrder: 3 },
          ],
        },
      },
    });

    // Material
    await prisma.productOption.create({
      data: {
        productId: product.id,
        optionName: 'Paper Material',
        optionType: 'SELECT',
        isRequired: true,
        displayOrder: 2,
        values: {
          create: [
            { valueLabel: '350 GSM Metallic Shimmer Board', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
            { valueLabel: 'Royal Velvet Suede Textured Board', priceModifierType: 'FLAT', priceModifierValue: 100, displayOrder: 2 },
            { valueLabel: 'Gold Foil Border Traditional Board', priceModifierType: 'FLAT', priceModifierValue: 150, displayOrder: 3 },
          ],
        },
      },
    });

    // Slabs: 50, 100, 250, 500
    const invBase = basePrice < 600 ? 950 : basePrice;
    await prisma.productPriceSlab.createMany({
      data: [
        { productId: product.id, minQty: 50, maxQty: 99, unitPrice: invBase / 50, singleSidePrice: invBase, doubleSidePrice: invBase + 150, designCharge: 250 },
        { productId: product.id, minQty: 100, maxQty: 249, unitPrice: (invBase * 1.6) / 100, singleSidePrice: Math.round(invBase * 1.6), doubleSidePrice: Math.round(invBase * 1.6) + 240, designCharge: 250 },
        { productId: product.id, minQty: 250, maxQty: 499, unitPrice: (invBase * 3.3) / 250, singleSidePrice: Math.round(invBase * 3.3), doubleSidePrice: Math.round(invBase * 3.3) + 450, designCharge: 250 },
        { productId: product.id, minQty: 500, maxQty: 2000, unitPrice: (invBase * 5.8) / 500, singleSidePrice: Math.round(invBase * 5.8), doubleSidePrice: Math.round(invBase * 5.8) + 750, designCharge: 250 },
      ],
    });
  }
  // BUSINESS ESSENTIALS & DEFAULT
  else {
    // If Bill book
    if (name.includes('bill') || name.includes('invoice') || name.includes('receipt') || name.includes('voucher') || name.includes('book')) {
      await prisma.productOption.create({
        data: {
          productId: product.id,
          optionName: 'Copies / Sets',
          optionType: 'SELECT',
          isRequired: true,
          displayOrder: 1,
          values: {
            create: [
              { valueLabel: 'Duplicate (1+1 - 100 Sets/Book)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
              { valueLabel: 'Triplicate (1+2 - 50 Sets/Book)', priceModifierType: 'FLAT', priceModifierValue: 50, displayOrder: 2 },
            ],
          },
        },
      });

      await prisma.productOption.create({
        data: {
          productId: product.id,
          optionName: 'Book Size',
          optionType: 'SELECT',
          isRequired: true,
          displayOrder: 2,
          values: {
            create: [
              { valueLabel: 'A5 Size (Half Demy)', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
              { valueLabel: 'A4 Size (Full Demy)', priceModifierType: 'FLAT', priceModifierValue: 90, displayOrder: 2 },
              { valueLabel: '1/8 Pocket Size', priceModifierType: 'FLAT', priceModifierValue: -30, displayOrder: 3 },
            ],
          },
        },
      });

      // Slabs in books: 5, 10, 20, 50
      await prisma.productPriceSlab.createMany({
        data: [
          { productId: product.id, minQty: 5, maxQty: 9, unitPrice: 100, singleSidePrice: 500, doubleSidePrice: 500, designCharge: 150 },
          { productId: product.id, minQty: 10, maxQty: 19, unitPrice: 90, singleSidePrice: 900, doubleSidePrice: 900, designCharge: 150 },
          { productId: product.id, minQty: 20, maxQty: 49, unitPrice: 80, singleSidePrice: 1600, doubleSidePrice: 1600, designCharge: 150 },
          { productId: product.id, minQty: 50, maxQty: 200, unitPrice: 72, singleSidePrice: 3600, doubleSidePrice: 3600, designCharge: 150 },
        ],
      });
    }
    // If Letterhead
    else if (name.includes('letter') || name.includes('head')) {
      await prisma.productOption.create({
        data: {
          productId: product.id,
          optionName: 'Paper Quality',
          optionType: 'SELECT',
          isRequired: true,
          displayOrder: 1,
          values: {
            create: [
              { valueLabel: '100 GSM Executive Bond Paper', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
              { valueLabel: '120 GSM Royal Executive Alabaster', priceModifierType: 'FLAT', priceModifierValue: 90, displayOrder: 2 },
              { valueLabel: '80 GSM Standard Maplitho', priceModifierType: 'FLAT', priceModifierValue: -30, displayOrder: 3 },
            ],
          },
        },
      });

      await prisma.productPriceSlab.createMany({
        data: [
          { productId: product.id, minQty: 100, maxQty: 249, unitPrice: 3.5, singleSidePrice: 350, doubleSidePrice: 480, designCharge: 150 },
          { productId: product.id, minQty: 250, maxQty: 499, unitPrice: 2.6, singleSidePrice: 650, doubleSidePrice: 850, designCharge: 150 },
          { productId: product.id, minQty: 500, maxQty: 999, unitPrice: 2.1, singleSidePrice: 1050, doubleSidePrice: 1350, designCharge: 150 },
          { productId: product.id, minQty: 1000, maxQty: 5000, unitPrice: 1.7, singleSidePrice: 1700, doubleSidePrice: 2200, designCharge: 150 },
        ],
      });
    }
    // Generic Default with Material & Size
    else {
      await prisma.productOption.create({
        data: {
          productId: product.id,
          optionName: 'Material & Finishing',
          optionType: 'SELECT',
          isRequired: true,
          displayOrder: 1,
          values: {
            create: [
              { valueLabel: 'Standard Quality Print', priceModifierType: 'FLAT', priceModifierValue: 0, displayOrder: 1 },
              { valueLabel: 'Premium High-Density Finish', priceModifierType: 'FLAT', priceModifierValue: 50, displayOrder: 2 },
            ],
          },
        },
      });

      await prisma.productPriceSlab.createMany({
        data: [
          { productId: product.id, minQty: 100, maxQty: 249, unitPrice: basePrice / 100, singleSidePrice: basePrice, doubleSidePrice: basePrice * 1.3, designCharge: 150 },
          { productId: product.id, minQty: 250, maxQty: 499, unitPrice: (basePrice * 2.1) / 250, singleSidePrice: Math.round(basePrice * 2.1), doubleSidePrice: Math.round(basePrice * 2.1 * 1.3), designCharge: 150 },
          { productId: product.id, minQty: 500, maxQty: 999, unitPrice: (basePrice * 3.8) / 500, singleSidePrice: Math.round(basePrice * 3.8), doubleSidePrice: Math.round(basePrice * 3.8 * 1.3), designCharge: 150 },
          { productId: product.id, minQty: 1000, maxQty: 5000, unitPrice: (basePrice * 6.8) / 1000, singleSidePrice: Math.round(basePrice * 6.8), doubleSidePrice: Math.round(basePrice * 6.8 * 1.3), designCharge: 150 },
        ],
      });
    }
  }
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

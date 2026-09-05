import { PrismaClient } from '@prisma/client';
import { calculatePricing } from '../utils/pricingEngine.js';
import { toCustomerSafeProduct } from '../utils/projections.js';

const prisma = new PrismaClient();

// Get active categories
export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: { where: { status: 'ACTIVE' } } },
        },
      },
    });

    return res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
};

// Get single category by slug
export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: slug.toLowerCase() },
          { name: { equals: decodeURIComponent(slug), mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: {
        products: {
          where: { status: 'ACTIVE' },
          include: {
            images: { orderBy: { displayOrder: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error fetching category:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch category details.' });
  }
};

// Get products with search, category filtering, pagination
export const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      featured,
      bestSeller,
      newArrival,
      page = 1,
      limit = 40,
      sortBy = 'displayOrder', // 'priceAsc', 'priceDesc', 'nameAsc'
    } = req.query;

    const where = { status: 'ACTIVE' };

    if (search && search.trim()) {
      const rawQ = search.trim();
      const tokens = rawQ.toLowerCase().split(/\s+/).filter(Boolean);

      // Printing industry synonym expansion
      const synonyms = [];
      for (const t of tokens) {
        synonyms.push(t);
        if (t.includes('visit') || t === 'vc') synonyms.push('card', 'business card');
        if (t.includes('card')) synonyms.push('visiting', 'business card');
        if (t.includes('pamphlet') || t.includes('notice') || t.includes('leaflet')) synonyms.push('flyer', 'brochure', 'marketing');
        if (t.includes('flyer')) synonyms.push('pamphlet', 'brochure');
        if (t.includes('bill') || t.includes('invoice') || t.includes('receipt') || t.includes('challan')) synonyms.push('essential', 'book', 'pad');
        if (t.includes('seal') || t.includes('stamp')) synonyms.push('stamp', 'rubber');
        if (t.includes('flex') || t.includes('standee') || t.includes('banner')) synonyms.push('signage', 'banner', 'standee');
        if (t.includes('id') || t.includes('lanyard') || t.includes('tag') || t.includes('rope')) synonyms.push('id card', 'lanyard');
        if (t.includes('mug') || t.includes('cup') || t.includes('bottle') || t.includes('pen') || t.includes('gift')) synonyms.push('gift', 'promotional');
        if (t.includes('shirt') || t.includes('tshirt') || t.includes('cap') || t.includes('dress')) synonyms.push('apparel', 't-shirt');
        if (t.includes('label') || t.includes('sticker') || t.includes('tag')) synonyms.push('sticker', 'label');
        if (t.includes('envelope') || t.includes('cover')) synonyms.push('envelope', 'cover');
        if (t.includes('invite') || t.includes('wedding')) synonyms.push('invitation', 'wedding');
        if (t === 'letterhead' || t.includes('letterhead')) synonyms.push('letter head', 'letter', 'head');
        if (t === 'visitingcard' || t.includes('visitingcard')) synonyms.push('visiting card', 'card');
        if (t === 'billbook' || t.includes('billbook')) synonyms.push('bill book', 'bill', 'book');
        if (t === 'idcard' || t.includes('idcard')) synonyms.push('id card', 'id', 'card');
        if (t === 'sunpack' || t.includes('sunpack')) synonyms.push('sunpack', 'sun pack');
      }

      const uniqueTerms = Array.from(new Set(synonyms));
      const orConditions = [
        { name: { contains: rawQ, mode: 'insensitive' } },
        { sku: { contains: rawQ, mode: 'insensitive' } },
        { shortDescription: { contains: rawQ, mode: 'insensitive' } },
        { category: { name: { contains: rawQ, mode: 'insensitive' } } },
      ];

      for (const term of uniqueTerms) {
        orConditions.push(
          { name: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { shortDescription: { contains: term, mode: 'insensitive' } },
          { category: { name: { contains: term, mode: 'insensitive' } } }
        );
      }

      where.OR = orConditions;
    }

    if (category) {
      where.category = {
        OR: [
          { slug: { equals: category.toLowerCase(), mode: 'insensitive' } },
          { name: { equals: decodeURIComponent(category), mode: 'insensitive' } },
        ],
      };
    }

    if (featured === 'true') where.isFeatured = true;
    if (bestSeller === 'true') where.isBestSeller = true;
    if (newArrival === 'true') where.isNewArrival = true;

    let orderBy = { createdAt: 'asc' };
    if (sortBy === 'priceAsc') orderBy = { startingPrice: 'asc' };
    if (sortBy === 'priceDesc') orderBy = { startingPrice: 'desc' };
    if (sortBy === 'nameAsc') orderBy = { name: 'asc' };

    const take = parseInt(limit, 10) || 40;
    const skip = (parseInt(page, 10) - 1) * take;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { displayOrder: 'asc' } },
        },
        orderBy,
        take,
        skip,
      }),
      prisma.product.count({ where }),
    ]);

    const safeProducts = products.map(toCustomerSafeProduct);

    return res.json({
      success: true,
      data: safeProducts,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

// Get single product by slug or SKU or legacy name format
export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const cleanSlug = slug.toLowerCase().replace(/details$/, ''); // supports legacy /standardcarddetails

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { slug: slug.toLowerCase() },
          { sku: slug.toUpperCase() },
          { name: decodeURIComponent(slug) },
          // match without spaces (legacy format standardcard)
          { slug: cleanSlug.replace(/-/g, '') },
        ],
        status: 'ACTIVE',
      },
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        specifications: { orderBy: { displayOrder: 'asc' } },
        options: {
          orderBy: { displayOrder: 'asc' },
          include: {
            values: { orderBy: { displayOrder: 'asc' } },
          },
        },
        optionMappings: {
          where: { isEnabled: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            master: true,
            valueMappings: {
              where: { isEnabled: true },
              orderBy: { displayOrder: 'asc' },
              include: { masterValue: true },
            },
          },
        },
        pricingMatrices: {
          where: { isAvailable: true },
          orderBy: [{ quantity: 'asc' }, { displayOrder: 'asc' }],
        },
        compatibilityRules: {
          where: { isActive: true },
        },
        priceVersions: {
          where: { isActive: true },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        combinations: { orderBy: { displayOrder: 'asc' } },
        priceSlabs: { orderBy: { minQty: 'asc' } },
        reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' } },
        artworkSetting: true,
        designPackages: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
        designBriefFields: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Default design terms & fallback data
    const DEFAULT_DESIGN_TERMS = `
### Print Bazzar Design Support Terms & Conditions

1. **Design Scope**: Includes layout composition, brand typography, color styling, and content placement based on the provided brief.
2. **Revision Policy**: Includes specified revisions for font changes, text modifications, and minor layout tweaks.
3. **Additional Revision Charges**: Extra revisions beyond the package limit are billed at the package's additional revision rate.
4. **Content Responsibility**: Customer must provide accurate text, contact numbers, email, and addresses.
5. **Approval Responsibility**: Physical production starts only after customer proof confirmation via digital mockup.
6. **Printing Responsibility**: Print Bazzar is not liable for typographical or grammatical errors approved by customer.
7. **Copyright & Permissions**: Customer guarantees full ownership/license for all supplied logos, photographs, and assets.
8. **Delivery Timeline**: Design turnaround begins only after complete content, brief responses, and required assets are received.
9. **Scope Change**: Complete conceptual changes or new brief submissions outside original scope require a new design order.
10. **Source Files**: Editable source files (open CDR, AI, PSD) are excluded unless explicitly stated in package services.
`.trim();

    const artworkSetting = product.artworkSetting || {
      enablePrintReady: true,
      enableDesignSupport: true,
      acceptedFormats: 'PDF,AI,CDR,PSD,PNG,JPG',
      maxFileSizeMb: 100.0,
      minFileSizeMb: null,
      printWidth: 3.5,
      printHeight: 2.0,
      sizeUnit: 'inches',
      bleed: '0.125 inches on all sides',
      safeMargin: '0.125 inches',
      resolutionDpi: 300,
      colorMode: 'CMYK',
      fontInstructions: 'Convert all text to curves/outlines or embed fonts',
      specialInstructions: 'Ensure bleed margins are included in your artwork file.',
      designTerms: DEFAULT_DESIGN_TERMS,
    };

    const designPackages = (product.designPackages && product.designPackages.length > 0)
      ? product.designPackages
      : [
          {
            id: `default-basic-${product.id}`,
            productId: product.id,
            packageName: 'Basic Design',
            description: 'Essential professional design layout with customer content placement and 1 revision.',
            designCharge: product.singleSideDesignCharge || 200.0,
            doubleSideDesignCharge: product.doubleSideDesignCharge || 400.0,
            initialConcepts: 1,
            revisionsIncluded: 1,
            additionalRevisionCharge: 100.0,
            estimatedTime: '1 Business Day',
            includedServices: '1 Concept, Basic Typography, Content Placement, High-Res Print PDF, 1 Revision',
            excludedServices: 'Complex Illustration, Source Vector Files, Logo Redraw',
            termsAndConditions: DEFAULT_DESIGN_TERMS,
            displayOrder: 1,
            isActive: true,
          },
          {
            id: `default-premium-${product.id}`,
            productId: product.id,
            packageName: 'Premium Design',
            description: 'Custom creative design with 2 distinct layout concepts, premium graphics, and 3 revisions.',
            designCharge: (product.singleSideDesignCharge ? product.singleSideDesignCharge * 2 : 400.0),
            doubleSideDesignCharge: (product.doubleSideDesignCharge ? product.doubleSideDesignCharge * 1.75 : 700.0),
            initialConcepts: 2,
            revisionsIncluded: 3,
            additionalRevisionCharge: 150.0,
            estimatedTime: '2 Business Days',
            includedServices: '2 Concepts, Premium Layout & Styling, Color Harmony, Print-Ready PDF & JPG, 3 Revisions',
            excludedServices: 'Logo Design from Scratch, Photo Retouching',
            termsAndConditions: DEFAULT_DESIGN_TERMS,
            displayOrder: 2,
            isActive: true,
          },
        ];

    const designBriefFields = (product.designBriefFields && product.designBriefFields.length > 0)
      ? product.designBriefFields
      : [
          {
            id: `default-field-1-${product.id}`,
            fieldLabel: 'Company / Business Name',
            fieldKey: 'company_name',
            fieldType: 'SINGLE_LINE_TEXT',
            placeholder: 'e.g. Acme Tech Solutions',
            isRequired: true,
            helpText: 'Enter your official brand or company name as it should appear.',
            optionsJson: null,
            displayOrder: 1,
          },
          {
            id: `default-field-2-${product.id}`,
            fieldLabel: 'Contact Information & Content Details',
            fieldKey: 'contact_details',
            fieldType: 'MULTI_LINE_TEXT',
            placeholder: 'Names, phone numbers, addresses, emails, social handles, tagline...',
            isRequired: true,
            helpText: 'List all text content that must be printed on the design.',
            optionsJson: null,
            displayOrder: 2,
          },
          {
            id: `default-field-3-${product.id}`,
            fieldLabel: 'Brand Logo File',
            fieldKey: 'brand_logo',
            fieldType: 'FILE_UPLOAD',
            placeholder: 'Upload transparent PNG, SVG, AI, or high-res JPG',
            isRequired: false,
            helpText: 'High-resolution logo file for best print sharpness.',
            optionsJson: null,
            displayOrder: 3,
          },
          {
            id: `default-field-4-${product.id}`,
            fieldLabel: 'Reference Design / Color Preferences',
            fieldKey: 'design_references',
            fieldType: 'FILE_UPLOAD',
            placeholder: 'Upload sample designs, color palettes, or sketches you like',
            isRequired: false,
            helpText: 'Optional sample image or visual reference for our designers.',
            optionsJson: null,
            displayOrder: 4,
          },
          {
            id: `default-field-5-${product.id}`,
            fieldLabel: 'Special Design Instructions',
            fieldKey: 'special_instructions',
            fieldType: 'MULTI_LINE_TEXT',
            placeholder: 'e.g. Minimalist look, dark theme, prominent WhatsApp QR code...',
            isRequired: false,
            helpText: 'Any specific instructions or design preferences.',
            optionsJson: null,
            displayOrder: 5,
          },
        ];

    // Also get 4 related products from the same category
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: 'ACTIVE',
      },
      take: 4,
      include: { images: { orderBy: { displayOrder: 'asc' } } },
    });

    const safeProduct = toCustomerSafeProduct(product);
    const safeRelatedProducts = (relatedProducts || []).map((rp) => ({
      id: rp.id,
      name: rp.name,
      slug: rp.slug,
      sku: rp.sku,
      startingPrice: rp.startingPrice,
      thumbnailUrl: rp.thumbnailUrl,
      images: (rp.images || []).map((img) => ({ id: img.id, url: img.url, isPrimary: img.isPrimary })),
    }));

    return res.json({
      success: true,
      data: {
        ...safeProduct,
        artworkSetting,
        designPackages,
        designBriefFields,
        relatedProducts: safeRelatedProducts,
      },
    });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch product details.' });
  }
};

// Calculate dynamic price endpoint with exact combinations, slabs, add-ons, and design support
export const calculatePriceEndpoint = async (req, res) => {
  try {
    const {
      productId,
      slug,
      quantity,
      selectedOptions,
      designOption,
      artworkOption,
      designPackage,
    } = req.body;

    const product = await prisma.product.findFirst({
      where: productId ? { id: productId } : { slug: slug?.toLowerCase() },
      include: {
        options: { include: { values: true } },
        optionMappings: {
          where: { isEnabled: true },
          include: {
            master: true,
            valueMappings: {
              where: { isEnabled: true },
              include: { masterValue: true },
            },
          },
        },
        pricingMatrices: true,
        combinations: true,
        priceSlabs: true,
        compatibilityRules: { where: { isActive: true } },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const pricing = calculatePricing({
      product,
      quantity,
      selectedOptions,
      designOption,
      artworkOption,
      designPackage,
    });

    return res.json({ success: true, data: pricing, pricing });
  } catch (error) {
    console.error('Price calculation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate price.' });
  }
};

// Get Banners
export const getBanners = async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    return res.json({ success: true, data: banners });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch banners.' });
  }
};

// Get Reviews
export const getReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return res.json({ success: true, data: reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
};

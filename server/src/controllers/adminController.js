import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to record audit log
const recordAudit = async (userId, action, entityName, entityId, oldValues, newValues, req) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityName,
        entityId: entityId ? String(entityId) : null,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress: req?.ip || req?.headers['x-forwarded-for'] || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

// 1. Dashboard KPIs & Analytics
export const getDashboardKPIs = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      productionOrders,
      deliveredOrders,
      allOrders,
      totalProducts,
      activeProducts,
      recentOrders,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { orderStatus: { in: ['ORDER_RECEIVED', 'CONFIRMED'] } } }),
      prisma.order.count({ where: { orderStatus: { in: ['PRODUCTION_QUEUE', 'PRINTING', 'FINISHING', 'QC'] } } }),
      prisma.order.count({ where: { orderStatus: 'DELIVERED' } }),
      prisma.order.findMany({ select: { grandTotal: true, createdAt: true, paymentStatus: true } }),
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const todayRevenue = allOrders
      .filter((o) => new Date(o.createdAt) >= today)
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const pendingPaymentsCount = allOrders.filter((o) => o.paymentStatus === 'PENDING').length;

    // Build 7-day trend
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = allOrders.filter(
        (o) => new Date(o.createdAt) >= dayStart && new Date(o.createdAt) <= dayEnd
      );

      last7Days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
      });
    }

    return res.json({
      success: true,
      data: {
        kpis: {
          totalOrders,
          todayOrders,
          pendingOrders,
          productionOrders,
          deliveredOrders,
          totalRevenue,
          todayRevenue,
          pendingPaymentsCount,
          totalProducts,
          activeProducts,
        },
        chartData: last7Days,
        recentOrders,
        recentAuditLogs,
      },
    });
  } catch (error) {
    console.error('Admin KPI error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard metrics.' });
  }
};

// 2. Admin Products Management
export const getAdminProducts = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 50 } = req.query;
    const where = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { shortDescription: { contains: q } },
      ];
    }

    if (category) {
      where.category = {
        OR: [{ id: category }, { slug: category.toLowerCase() }],
      };
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const take = parseInt(limit, 10) || 50;
    const skip = (parseInt(page, 10) - 1) * take;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { displayOrder: 'asc' } },
          options: { include: { values: true }, orderBy: { displayOrder: 'asc' } },
          combinations: { orderBy: { displayOrder: 'asc' } },
          priceSlabs: { orderBy: { minQty: 'asc' } },
          specifications: true,
          artworkSetting: true,
          designPackages: { orderBy: { displayOrder: 'asc' } },
          designBriefFields: { orderBy: { displayOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      success: true,
      data: products,
      pagination: { total, page: parseInt(page, 10), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error('Error in getAdminProducts:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin products.' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      categoryId,
      shortDescription,
      fullDescription,
      thumbnailUrl,
      videoUrl,
      startingPrice,
      minQuantity,
      maxQuantity,
      turnaroundTime,
      deliveryInfo,
      hasCustomDesign,
      isFeatured,
      isBestSeller,
      isNewArrival,
      status = 'ACTIVE',
      quantityType = 'FIXED',
      customQtyMin = 100,
      customQtyMax,
      customQtyStep = 50,
      customUnitPrice,
      quantityUnit = 'Pieces',
      singleSideDesignCharge = 200,
      doubleSideDesignCharge = 400,
      specifications = [],
      options = [],
      combinations = [],
      priceSlabs = [],
      images = [],
      artworkSetting,
      designPackages = [],
      designBriefFields = [],
    } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ success: false, message: 'Product name and Category are required.' });
    }

    const generatedSku = sku?.trim() || `PB${Date.now().toString().slice(-6)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 1000);

    const product = await prisma.product.create({
      data: {
        name,
        sku: generatedSku,
        slug,
        categoryId,
        shortDescription,
        fullDescription,
        thumbnailUrl: thumbnailUrl || images[0]?.imageUrl || null,
        videoUrl: videoUrl || null,
        startingPrice: parseFloat(startingPrice) || 0,
        minQuantity: parseInt(minQuantity, 10) || 1,
        maxQuantity: maxQuantity ? parseInt(maxQuantity, 10) : null,
        quantityType: quantityType || 'FIXED',
        customQtyMin: customQtyMin ? parseInt(customQtyMin, 10) : 100,
        customQtyMax: customQtyMax ? parseInt(customQtyMax, 10) : null,
        customQtyStep: customQtyStep ? parseInt(customQtyStep, 10) : 50,
        customUnitPrice: customUnitPrice ? parseFloat(customUnitPrice) : null,
        quantityUnit: quantityUnit || 'Pieces',
        singleSideDesignCharge: parseFloat(singleSideDesignCharge) || 200,
        doubleSideDesignCharge: parseFloat(doubleSideDesignCharge) || 400,
        turnaroundTime: turnaroundTime || 'Single Day Delivery (Order Before 12PM)',
        deliveryInfo: deliveryInfo || 'Fast local & courier delivery available',
        hasCustomDesign: hasCustomDesign !== undefined ? !!hasCustomDesign : true,
        isFeatured: !!isFeatured,
        isBestSeller: !!isBestSeller,
        isNewArrival: !!isNewArrival,
        status: status || 'ACTIVE',
        metaTitle,
        metaDescription,
        images: {
          create: (images || []).map((img, idx) => ({
            imageUrl: img.imageUrl,
            imageType: img.imageType || 'GALLERY',
            displayOrder: idx + 1,
          })),
        },
        specifications: {
          create: (specifications || []).map((s, idx) => ({
            specKey: s.specKey,
            specValue: s.specValue,
            displayOrder: idx + 1,
          })),
        },
        priceSlabs: {
          create: (priceSlabs || []).map((s) => ({
            minQty: parseInt(s.minQty, 10) || 1,
            maxQty: s.maxQty ? parseInt(s.maxQty, 10) : null,
            unitPrice: parseFloat(s.unitPrice) || 0,
            singleSidePrice: parseFloat(s.singleSidePrice) || 0,
            doubleSidePrice: parseFloat(s.doubleSidePrice) || 0,
            designCharge: parseFloat(s.singleSideDesignCharge || s.designCharge) || 200,
            singleSideDesignCharge: parseFloat(s.singleSideDesignCharge || s.designCharge) || 200,
            doubleSideDesignCharge: parseFloat(s.doubleSideDesignCharge || ((s.singleSideDesignCharge || s.designCharge || 200) * 2)) || 400,
          })),
        },
      },
      include: {
        images: true,
        specifications: true,
        priceSlabs: true,
        category: true,
      },
    });

    // Create Options with values (supporting isAddon)
    if (options && options.length) {
      for (const opt of options) {
        await prisma.productOption.create({
          data: {
            productId: product.id,
            optionName: opt.optionName,
            optionType: opt.optionType || 'SELECT',
            isAddon: !!opt.isAddon,
            isRequired: !!opt.isRequired,
            displayOrder: opt.displayOrder || 0,
            values: {
              create: (opt.values || []).map((v, vIdx) => ({
                valueLabel: v.valueLabel,
                priceModifierType: v.priceModifierType || 'FLAT',
                priceModifierValue: parseFloat(v.priceModifierValue) || 0,
                displayOrder: vIdx + 1,
              })),
            },
          },
        });
      }
    }

    // Create Exact Combinations if provided (Phase 4)
    if (combinations && combinations.length) {
      await prisma.productCombination.createMany({
        data: combinations.map((c, cIdx) => ({
          productId: product.id,
          combinationKey: c.combinationKey || `comb-${cIdx}`,
          optionsJson: typeof c.optionsJson === 'string' ? c.optionsJson : JSON.stringify(c.optionsJson || {}),
          quantity: parseInt(c.quantity, 10) || 100,
          price: parseFloat(c.price) || 0,
          sku: c.sku || null,
          isAvailable: c.isAvailable !== false,
          displayOrder: c.displayOrder || cIdx + 1,
        })),
      });
    }

    // Create Artwork Setting if provided (Phase 16)
    if (artworkSetting) {
      await prisma.productArtworkSetting.create({
        data: {
          productId: product.id,
          enablePrintReady: artworkSetting.enablePrintReady !== false,
          enableDesignSupport: artworkSetting.enableDesignSupport !== false,
          acceptedFormats: artworkSetting.acceptedFormats || 'PDF,AI,CDR,PSD,PNG,JPG',
          maxFileSizeMb: parseFloat(artworkSetting.maxFileSizeMb) || 100.0,
          minFileSizeMb: artworkSetting.minFileSizeMb ? parseFloat(artworkSetting.minFileSizeMb) : null,
          printWidth: artworkSetting.printWidth ? parseFloat(artworkSetting.printWidth) : null,
          printHeight: artworkSetting.printHeight ? parseFloat(artworkSetting.printHeight) : null,
          sizeUnit: artworkSetting.sizeUnit || 'inches',
          bleed: artworkSetting.bleed || '0.125 inches on all sides',
          safeMargin: artworkSetting.safeMargin || '0.125 inches',
          resolutionDpi: parseInt(artworkSetting.resolutionDpi, 10) || 300,
          colorMode: artworkSetting.colorMode || 'CMYK',
          fontInstructions: artworkSetting.fontInstructions || 'Convert all text to curves/outlines or embed fonts',
          specialInstructions: artworkSetting.specialInstructions || null,
          designTerms: artworkSetting.designTerms || null,
        },
      });
    }

    // Create Design Packages if provided (Phase 16)
    if (designPackages && designPackages.length > 0) {
      await prisma.productDesignPackage.createMany({
        data: designPackages.map((pkg, pIdx) => ({
          productId: product.id,
          packageName: pkg.packageName || `Package ${pIdx + 1}`,
          description: pkg.description || null,
          designCharge: parseFloat(pkg.designCharge) || 300.0,
          doubleSideDesignCharge: pkg.doubleSideDesignCharge != null && pkg.doubleSideDesignCharge !== '' ? parseFloat(pkg.doubleSideDesignCharge) : null,
          initialConcepts: parseInt(pkg.initialConcepts, 10) || 1,
          revisionsIncluded: parseInt(pkg.revisionsIncluded, 10) || 1,
          additionalRevisionCharge: parseFloat(pkg.additionalRevisionCharge) || 100.0,
          estimatedTime: pkg.estimatedTime || '1 Business Day',
          includedServices: typeof pkg.includedServices === 'string' ? pkg.includedServices : JSON.stringify(pkg.includedServices || []),
          excludedServices: typeof pkg.excludedServices === 'string' ? pkg.excludedServices : JSON.stringify(pkg.excludedServices || []),
          termsAndConditions: pkg.termsAndConditions || null,
          displayOrder: pkg.displayOrder || pIdx + 1,
          isActive: pkg.isActive !== false,
        })),
      });
    }

    // Create Design Brief Fields if provided (Phase 16)
    if (designBriefFields && designBriefFields.length > 0) {
      await prisma.productDesignBriefField.createMany({
        data: designBriefFields.map((f, fIdx) => ({
          productId: product.id,
          fieldLabel: f.fieldLabel || `Field ${fIdx + 1}`,
          fieldKey: f.fieldKey || `field_${fIdx + 1}`,
          fieldType: f.fieldType || 'SINGLE_LINE_TEXT',
          placeholder: f.placeholder || null,
          isRequired: !!f.isRequired,
          helpText: f.helpText || null,
          optionsJson: typeof f.optionsJson === 'string' ? f.optionsJson : (f.optionsJson ? JSON.stringify(f.optionsJson) : null),
          displayOrder: f.displayOrder || fIdx + 1,
        })),
      });
    }

    await recordAudit(req.user?.id, 'CREATE_PRODUCT', 'Product', product.id, null, { name, sku: generatedSku }, req);

    return res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { priceSlabs: true, specifications: true, images: true, options: { include: { values: true } } },
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Record price history if price changed
    if (updateData.startingPrice !== undefined && updateData.startingPrice !== existingProduct.startingPrice) {
      await prisma.priceHistory.create({
        data: {
          productId: id,
          oldPriceData: JSON.stringify({ startingPrice: existingProduct.startingPrice, slabs: existingProduct.priceSlabs }),
          newPriceData: JSON.stringify({ startingPrice: updateData.startingPrice, slabs: updateData.priceSlabs }),
          changedByUserId: req.user?.id || null,
          reason: updateData.priceChangeReason || 'Admin routine price update',
        },
      });
    }

    // Update basic fields
    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: updateData.name,
        sku: updateData.sku,
        categoryId: updateData.categoryId,
        shortDescription: updateData.shortDescription,
        fullDescription: updateData.fullDescription,
        thumbnailUrl: updateData.thumbnailUrl,
        videoUrl: updateData.videoUrl !== undefined ? (updateData.videoUrl || null) : undefined,
        startingPrice: updateData.startingPrice !== undefined ? parseFloat(updateData.startingPrice) : undefined,
        minQuantity: updateData.minQuantity !== undefined ? parseInt(updateData.minQuantity, 10) : undefined,
        maxQuantity: updateData.maxQuantity !== undefined ? (updateData.maxQuantity ? parseInt(updateData.maxQuantity, 10) : null) : undefined,
        quantityType: updateData.quantityType !== undefined ? updateData.quantityType : undefined,
        customQtyMin: updateData.customQtyMin !== undefined ? parseInt(updateData.customQtyMin, 10) : undefined,
        customQtyMax: updateData.customQtyMax !== undefined ? (updateData.customQtyMax ? parseInt(updateData.customQtyMax, 10) : null) : undefined,
        customQtyStep: updateData.customQtyStep !== undefined ? parseInt(updateData.customQtyStep, 10) : undefined,
        customUnitPrice: updateData.customUnitPrice !== undefined ? (updateData.customUnitPrice ? parseFloat(updateData.customUnitPrice) : null) : undefined,
        quantityUnit: updateData.quantityUnit !== undefined ? updateData.quantityUnit : undefined,
        singleSideDesignCharge:
          updateData.singleSideDesignCharge !== undefined ? parseFloat(updateData.singleSideDesignCharge) : undefined,
        doubleSideDesignCharge:
          updateData.doubleSideDesignCharge !== undefined ? parseFloat(updateData.doubleSideDesignCharge) : undefined,
        turnaroundTime: updateData.turnaroundTime,
        deliveryInfo: updateData.deliveryInfo,
        hasCustomDesign: updateData.hasCustomDesign,
        isFeatured: updateData.isFeatured,
        isBestSeller: updateData.isBestSeller,
        isNewArrival: updateData.isNewArrival,
        status: updateData.status,
      },
    });

    // Update Price Slabs if provided
    if (updateData.priceSlabs) {
      await prisma.productPriceSlab.deleteMany({ where: { productId: id } });
      await prisma.productPriceSlab.createMany({
        data: updateData.priceSlabs.map((s) => ({
          productId: id,
          minQty: parseInt(s.minQty, 10) || 1,
          maxQty: s.maxQty ? parseInt(s.maxQty, 10) : null,
          unitPrice: parseFloat(s.unitPrice) || 0,
          singleSidePrice: parseFloat(s.singleSidePrice) || 0,
          doubleSidePrice: parseFloat(s.doubleSidePrice) || 0,
          designCharge: parseFloat(s.singleSideDesignCharge || s.designCharge) || 200,
          singleSideDesignCharge: parseFloat(s.singleSideDesignCharge || s.designCharge) || 200,
          doubleSideDesignCharge: parseFloat(s.doubleSideDesignCharge || ((s.singleSideDesignCharge || s.designCharge || 200) * 2)) || 400,
        })),
      });
    }

    // Update Specifications if provided
    if (updateData.specifications) {
      await prisma.productSpecification.deleteMany({ where: { productId: id } });
      await prisma.productSpecification.createMany({
        data: updateData.specifications.map((s, idx) => ({
          productId: id,
          specKey: s.specKey,
          specValue: s.specValue,
          displayOrder: idx + 1,
        })),
      });
    }

    // Update Images if provided
    if (updateData.images) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.productImage.createMany({
        data: updateData.images.map((img, idx) => ({
          productId: id,
          imageUrl: img.imageUrl,
          imageType: img.imageType || 'GALLERY',
          displayOrder: idx + 1,
        })),
      });
    }

    // Update Custom Options and Finishes (Spot UV, Foil, Lamination, Corners, etc.)
    if (updateData.options) {
      await prisma.productOption.deleteMany({ where: { productId: id } });
      for (let i = 0; i < updateData.options.length; i++) {
        const opt = updateData.options[i];
        if (!opt.optionName?.trim()) continue;
        await prisma.productOption.create({
          data: {
            productId: id,
            optionName: opt.optionName.trim(),
            optionType: opt.optionType || 'SELECT',
            isAddon: !!opt.isAddon,
            isRequired: opt.isRequired !== false,
            displayOrder: i + 1,
            values: {
              create: (opt.values || []).map((v, vIdx) => ({
                valueLabel: v.valueLabel,
                priceModifierType: v.priceModifierType || 'FLAT',
                priceModifierValue: parseFloat(v.priceModifierValue) || 0,
                displayOrder: vIdx + 1,
              })),
            },
          },
        });
      }
    }

    // Update Exact Combinations if provided (Phase 4)
    if (updateData.combinations) {
      await prisma.productCombination.deleteMany({ where: { productId: id } });
      await prisma.productCombination.createMany({
        data: updateData.combinations.map((c, cIdx) => ({
          productId: id,
          combinationKey: c.combinationKey || `comb-${cIdx}`,
          optionsJson: typeof c.optionsJson === 'string' ? c.optionsJson : JSON.stringify(c.optionsJson || {}),
          quantity: parseInt(c.quantity, 10) || 100,
          price: parseFloat(c.price) || 0,
          sku: c.sku || null,
          isAvailable: c.isAvailable !== false,
          displayOrder: c.displayOrder || cIdx + 1,
        })),
      });
    }

    // Update Artwork Setting if provided (Phase 16)
    if (updateData.artworkSetting) {
      await prisma.productArtworkSetting.upsert({
        where: { productId: id },
        create: {
          productId: id,
          enablePrintReady: updateData.artworkSetting.enablePrintReady !== false,
          enableDesignSupport: updateData.artworkSetting.enableDesignSupport !== false,
          acceptedFormats: updateData.artworkSetting.acceptedFormats || 'PDF,AI,CDR,PSD,PNG,JPG',
          maxFileSizeMb: parseFloat(updateData.artworkSetting.maxFileSizeMb) || 100.0,
          minFileSizeMb: updateData.artworkSetting.minFileSizeMb ? parseFloat(updateData.artworkSetting.minFileSizeMb) : null,
          printWidth: updateData.artworkSetting.printWidth ? parseFloat(updateData.artworkSetting.printWidth) : null,
          printHeight: updateData.artworkSetting.printHeight ? parseFloat(updateData.artworkSetting.printHeight) : null,
          sizeUnit: updateData.artworkSetting.sizeUnit || 'inches',
          bleed: updateData.artworkSetting.bleed || '0.125 inches on all sides',
          safeMargin: updateData.artworkSetting.safeMargin || '0.125 inches',
          resolutionDpi: parseInt(updateData.artworkSetting.resolutionDpi, 10) || 300,
          colorMode: updateData.artworkSetting.colorMode || 'CMYK',
          fontInstructions: updateData.artworkSetting.fontInstructions || 'Convert all text to curves/outlines or embed fonts',
          specialInstructions: updateData.artworkSetting.specialInstructions || null,
          designTerms: updateData.artworkSetting.designTerms || null,
        },
        update: {
          enablePrintReady: updateData.artworkSetting.enablePrintReady !== false,
          enableDesignSupport: updateData.artworkSetting.enableDesignSupport !== false,
          acceptedFormats: updateData.artworkSetting.acceptedFormats || 'PDF,AI,CDR,PSD,PNG,JPG',
          maxFileSizeMb: parseFloat(updateData.artworkSetting.maxFileSizeMb) || 100.0,
          minFileSizeMb: updateData.artworkSetting.minFileSizeMb ? parseFloat(updateData.artworkSetting.minFileSizeMb) : null,
          printWidth: updateData.artworkSetting.printWidth ? parseFloat(updateData.artworkSetting.printWidth) : null,
          printHeight: updateData.artworkSetting.printHeight ? parseFloat(updateData.artworkSetting.printHeight) : null,
          sizeUnit: updateData.artworkSetting.sizeUnit || 'inches',
          bleed: updateData.artworkSetting.bleed || '0.125 inches on all sides',
          safeMargin: updateData.artworkSetting.safeMargin || '0.125 inches',
          resolutionDpi: parseInt(updateData.artworkSetting.resolutionDpi, 10) || 300,
          colorMode: updateData.artworkSetting.colorMode || 'CMYK',
          fontInstructions: updateData.artworkSetting.fontInstructions || 'Convert all text to curves/outlines or embed fonts',
          specialInstructions: updateData.artworkSetting.specialInstructions || null,
          designTerms: updateData.artworkSetting.designTerms || null,
        },
      });
    }

    // Update Design Packages if provided (Phase 16)
    if (updateData.designPackages) {
      await prisma.productDesignPackage.deleteMany({ where: { productId: id } });
      if (updateData.designPackages.length > 0) {
        await prisma.productDesignPackage.createMany({
          data: updateData.designPackages.map((pkg, pIdx) => ({
            productId: id,
            packageName: pkg.packageName || `Package ${pIdx + 1}`,
            description: pkg.description || null,
            designCharge: parseFloat(pkg.designCharge) || 300.0,
            doubleSideDesignCharge: pkg.doubleSideDesignCharge != null && pkg.doubleSideDesignCharge !== '' ? parseFloat(pkg.doubleSideDesignCharge) : null,
            initialConcepts: parseInt(pkg.initialConcepts, 10) || 1,
            revisionsIncluded: parseInt(pkg.revisionsIncluded, 10) || 1,
            additionalRevisionCharge: parseFloat(pkg.additionalRevisionCharge) || 100.0,
            estimatedTime: pkg.estimatedTime || '1 Business Day',
            includedServices: typeof pkg.includedServices === 'string' ? pkg.includedServices : JSON.stringify(pkg.includedServices || []),
            excludedServices: typeof pkg.excludedServices === 'string' ? pkg.excludedServices : JSON.stringify(pkg.excludedServices || []),
            termsAndConditions: pkg.termsAndConditions || null,
            displayOrder: pkg.displayOrder || pIdx + 1,
            isActive: pkg.isActive !== false,
          })),
        });
      }
    }

    // Update Design Brief Fields if provided (Phase 16)
    if (updateData.designBriefFields) {
      await prisma.productDesignBriefField.deleteMany({ where: { productId: id } });
      if (updateData.designBriefFields.length > 0) {
        await prisma.productDesignBriefField.createMany({
          data: updateData.designBriefFields.map((f, fIdx) => ({
            productId: id,
            fieldLabel: f.fieldLabel || `Field ${fIdx + 1}`,
            fieldKey: f.fieldKey || `field_${fIdx + 1}`,
            fieldType: f.fieldType || 'SINGLE_LINE_TEXT',
            placeholder: f.placeholder || null,
            isRequired: !!f.isRequired,
            helpText: f.helpText || null,
            optionsJson: typeof f.optionsJson === 'string' ? f.optionsJson : (f.optionsJson ? JSON.stringify(f.optionsJson) : null),
            displayOrder: f.displayOrder || fIdx + 1,
          })),
        });
      }
    }

    await recordAudit(req.user?.id, 'UPDATE_PRODUCT', 'Product', id, existingProduct, updateData, req);

    return res.json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
};

export const duplicateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const source = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        specifications: true,
        priceSlabs: true,
        options: { include: { values: true } },
      },
    });

    if (!source) {
      return res.status(404).json({ success: false, message: 'Source product not found.' });
    }

    const newSku = `PB-DUP-${Date.now().toString().slice(-6)}`;
    const newSlug = `${source.slug}-copy-${Math.floor(Math.random() * 1000)}`;

    const cloned = await prisma.product.create({
      data: {
        name: `Copy of ${source.name}`,
        sku: newSku,
        slug: newSlug,
        categoryId: source.categoryId,
        shortDescription: source.shortDescription,
        fullDescription: source.fullDescription,
        thumbnailUrl: source.thumbnailUrl,
        startingPrice: source.startingPrice,
        minQuantity: source.minQuantity,
        maxQuantity: source.maxQuantity,
        turnaroundTime: source.turnaroundTime,
        deliveryInfo: source.deliveryInfo,
        hasCustomDesign: source.hasCustomDesign,
        status: 'DRAFT', // draft by default
        images: {
          create: source.images.map((img) => ({
            imageUrl: img.imageUrl,
            imageType: img.imageType,
            displayOrder: img.displayOrder,
          })),
        },
        specifications: {
          create: source.specifications.map((s) => ({
            specKey: s.specKey,
            specValue: s.specValue,
            displayOrder: s.displayOrder,
          })),
        },
        priceSlabs: {
          create: source.priceSlabs.map((s) => ({
            minQty: s.minQty,
            maxQty: s.maxQty,
            unitPrice: s.unitPrice,
            singleSidePrice: s.singleSidePrice,
            doubleSidePrice: s.doubleSidePrice,
            designCharge: s.designCharge,
          })),
        },
      },
    });

    for (const opt of source.options) {
      await prisma.productOption.create({
        data: {
          productId: cloned.id,
          optionName: opt.optionName,
          optionType: opt.optionType,
          isRequired: opt.isRequired,
          displayOrder: opt.displayOrder,
          values: {
            create: opt.values.map((v) => ({
              valueLabel: v.valueLabel,
              priceModifierType: v.priceModifierType,
              priceModifierValue: v.priceModifierValue,
              displayOrder: v.displayOrder,
            })),
          },
        },
      });
    }

    await recordAudit(req.user?.id, 'DUPLICATE_PRODUCT', 'Product', cloned.id, { sourceId: id }, { newId: cloned.id, newSku }, req);

    return res.status(201).json({ success: true, message: 'Product duplicated successfully as Draft.', data: cloned });
  } catch (error) {
    console.error('Error duplicating product:', error);
    return res.status(500).json({ success: false, message: 'Failed to duplicate product.' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Soft delete / archive
    await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await recordAudit(req.user?.id, 'ARCHIVE_PRODUCT', 'Product', id, { status: product.status }, { status: 'ARCHIVED' }, req);

    return res.json({ success: true, message: 'Product archived successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to archive product.' });
  }
};

// 3. Admin Categories Management
export const getAdminCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, slug, imageUrl, bannerUrl, description, displayOrder = 0, isActive = true } = req.body;
    const catSlug = slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const category = await prisma.category.create({
      data: {
        name,
        slug: catSlug,
        imageUrl,
        bannerUrl,
        description,
        displayOrder: parseInt(displayOrder, 10) || 0,
        isActive: !!isActive,
      },
    });

    await recordAudit(req.user?.id, 'CREATE_CATEGORY', 'Category', category.id, null, category, req);

    return res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: updateData.name,
        slug: updateData.slug,
        imageUrl: updateData.imageUrl,
        bannerUrl: updateData.bannerUrl,
        description: updateData.description,
        displayOrder: updateData.displayOrder !== undefined ? parseInt(updateData.displayOrder, 10) : undefined,
        isActive: updateData.isActive !== undefined ? !!updateData.isActive : undefined,
      },
    });

    await recordAudit(req.user?.id, 'UPDATE_CATEGORY', 'Category', id, null, updateData, req);

    return res.json({ success: true, message: 'Category updated', data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    await recordAudit(req.user?.id, 'DELETE_CATEGORY', 'Category', id, null, null, req);
    return res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
};

// 4. Admin Banners CMS
export const getAdminBanners = async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { displayOrder: 'asc' } });
    return res.json({ success: true, data: banners });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
};

export const createBanner = async (req, res) => {
  try {
    const banner = await prisma.banner.create({ data: req.body });
    await recordAudit(req.user?.id, 'CREATE_BANNER', 'Banner', banner.id, null, banner, req);
    return res.status(201).json({ success: true, data: banner });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create banner' });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await prisma.banner.update({ where: { id }, data: req.body });
    await recordAudit(req.user?.id, 'UPDATE_BANNER', 'Banner', id, null, req.body, req);
    return res.json({ success: true, data: banner });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update banner' });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.banner.delete({ where: { id } });
    return res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
};

// 5. Admin Orders Management
export const getAdminOrders = async (req, res) => {
  try {
    const { search, status, paymentStatus, page = 1, limit = 50 } = req.query;
    const where = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { orderNumber: { contains: q } },
        { customerName: { contains: q } },
        { customerMobile: { contains: q } },
        { customerEmail: { contains: q } },
      ];
    }

    if (status && status !== 'ALL') where.orderStatus = status;
    if (paymentStatus && paymentStatus !== 'ALL') where.paymentStatus = paymentStatus;

    const take = parseInt(limit, 10) || 50;
    const skip = (parseInt(page, 10) - 1) * take;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      success: true,
      data: orders,
      pagination: { total, page: parseInt(page, 10), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

export const getAdminOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, thumbnailUrl: true, sku: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { changedBy: { select: { name: true, email: true } } },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, email: true } } },
        },
        payments: true,
        productionJobs: {
          include: {
            qualityChecks: true,
          },
        },
        qualityChecks: true,
        shipments: true,
        invoices: true,
        designOrders: {
          include: {
            revisions: true,
            designer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, trackingReference, estimatedDeliveryDate, paymentStatus } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const previousStatus = order.orderStatus;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: status || order.orderStatus,
        paymentStatus: paymentStatus || order.paymentStatus,
        trackingReference: trackingReference !== undefined ? trackingReference : order.trackingReference,
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : order.estimatedDeliveryDate,
        statusHistory: status && status !== previousStatus
          ? {
              create: {
                previousStatus,
                newStatus: status,
                changedByUserId: req.user?.id || null,
                note: note || `Order status updated to ${status} by admin.`,
              },
            }
          : undefined,
      },
      include: { statusHistory: true },
    });

    await recordAudit(
      req.user?.id,
      'UPDATE_ORDER_STATUS',
      'Order',
      id,
      { status: previousStatus },
      { status: updated.orderStatus, note },
      req
    );

    return res.json({ success: true, message: 'Order status updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
};

export const addOrderNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { noteText, isInternalOnly = true } = req.body;

    if (!noteText) {
      return res.status(400).json({ success: false, message: 'Note text cannot be empty.' });
    }

    const note = await prisma.orderNote.create({
      data: {
        orderId: id,
        userId: req.user?.id || null,
        noteText,
        isInternalOnly: !!isInternalOnly,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    return res.status(201).json({ success: true, data: note });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add order note.' });
  }
};

// 6. Settings & Audit Logs
export const getPublicSettings = async (req, res) => {
  try {
    const settings = await prisma.storeSetting.findMany();
    const formatted = {};
    settings.forEach((s) => {
      // NEVER leak secrets or private credentials to public clients
      if (s.key.includes('SECRET') || s.key.includes('PRIVATE')) return;
      try {
        formatted[s.key] = JSON.parse(s.value);
      } catch {
        formatted[s.key] = s.value;
      }
    });

    const bizInfo = formatted.BUSINESS_INFORMATION_SETTINGS || null;

    const safePublic = {
      STORE_NAME: bizInfo?.brand?.brandName || formatted.STORE_NAME || 'Print Bazzar',
      STORE_EMAIL: bizInfo?.contact?.supportEmail || formatted.STORE_EMAIL || 'printbazzar.online@gmail.com',
      STORE_PHONE: bizInfo?.contact?.primaryPhone || formatted.STORE_PHONE || '+91 96290 98565',
      STORE_ADDRESS: bizInfo?.address?.fullDisplayAddress || formatted.STORE_ADDRESS || '12 A, Allimal Street, Big Bazzar St, Singarathope, Tiruchirapalli, Tamil Nadu - 620008',
      GST_RATE: formatted.GST_RATE || bizInfo?.tax?.taxRatePercentage || 18,
      GST_NUMBER: bizInfo?.tax?.gstin || formatted.GST_NUMBER || '33AAAAA0000A1Z5',
      ORDER_PREFIX: formatted.ORDER_PREFIX || 'PB-ORD-2026-',
      FREE_SHIPPING_THRESHOLD: formatted.FREE_SHIPPING_THRESHOLD || 1500,
      DEFAULT_SHIPPING_CHARGE: formatted.DEFAULT_SHIPPING_CHARGE || 80,
      DEFAULT_SINGLE_SIDE_DESIGN_CHARGE: formatted.DEFAULT_SINGLE_SIDE_DESIGN_CHARGE || 200,
      DEFAULT_DOUBLE_SIDE_DESIGN_CHARGE: formatted.DEFAULT_DOUBLE_SIDE_DESIGN_CHARGE || 400,
      ENABLE_ONLINE_PAYMENTS: formatted.ENABLE_ONLINE_PAYMENTS !== false,
      ENABLE_COD: formatted.ENABLE_COD !== false,
      PAYMENT_GATEWAY_PROVIDER: formatted.PAYMENT_GATEWAY_PROVIDER || (formatted.RAZORPAY_KEY_ID ? 'RAZORPAY' : 'SIMULATOR'),
      RAZORPAY_KEY_ID: formatted.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
      DESIGN_SPLIT_PAYMENT: formatted.DESIGN_SPLIT_PAYMENT !== false,
      BUSINESS_INFORMATION_SETTINGS: bizInfo,
      ...formatted,
    };
    delete safePublic.RAZORPAY_KEY_SECRET;

    return res.json({ success: true, data: safePublic });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load public settings.' });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await prisma.storeSetting.findMany();
    const formatted = {};
    settings.forEach((s) => {
      try {
        formatted[s.key] = JSON.parse(s.value);
      } catch {
        formatted[s.key] = s.value;
      }
    });

    // Provide default fallbacks for gateway keys
    if (!formatted.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID) {
      formatted.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    }
    if (!formatted.PAYMENT_GATEWAY_PROVIDER) {
      formatted.PAYMENT_GATEWAY_PROVIDER = formatted.RAZORPAY_KEY_ID ? 'RAZORPAY' : 'SIMULATOR';
    }
    if (formatted.ENABLE_ONLINE_PAYMENTS === undefined) formatted.ENABLE_ONLINE_PAYMENTS = true;
    if (formatted.ENABLE_COD === undefined) formatted.ENABLE_COD = true;
    if (formatted.DESIGN_SPLIT_PAYMENT === undefined) formatted.DESIGN_SPLIT_PAYMENT = true;

    return res.json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load settings.' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settingsObj = req.body;
    for (const [key, val] of Object.entries(settingsObj)) {
      // Avoid overwriting existing secret if client passed empty or masked string
      if (key === 'RAZORPAY_KEY_SECRET' && (!val || val === '••••••••')) {
        continue;
      }

      await prisma.storeSetting.upsert({
        where: { key },
        update: { value: JSON.stringify(val) },
        create: { key, value: JSON.stringify(val), description: key },
      });
    }

    await recordAudit(req.user?.id, 'UPDATE_SETTINGS', 'Settings', 'GLOBAL', null, { ...settingsObj, RAZORPAY_KEY_SECRET: 'REDACTED' }, req);

    return res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load audit logs.' });
  }
};

// 7. Centralized Live Pricing Master & Dynamic Price Management
export const getPricingMaster = async (req, res) => {
  try {
    const { categoryId, pricingType, search } = req.query;
    const where = {};
    if (categoryId && categoryId !== 'ALL') where.categoryId = categoryId;
    if (pricingType && pricingType !== 'ALL') where.pricingType = pricingType;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        priceSlabs: { orderBy: { minQty: 'asc' } },
        options: {
          include: {
            values: { orderBy: { displayOrder: 'asc' } },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    const stats = {
      total: products.length,
      tiered: products.filter((p) => p.pricingType === 'TIERED').length,
      perPiece: products.filter((p) => p.pricingType === 'PER_PIECE').length,
      perSqft: products.filter((p) => p.pricingType === 'PER_SQFT').length,
      fixedQty: products.filter((p) => p.pricingType === 'FIXED_QTY').length,
      liveConfirmed: products.filter((p) => p.sourceStatus === 'LIVE_CONFIRMED').length,
    };

    return res.json({ success: true, data: products, stats });
  } catch (error) {
    console.error('Error fetching pricing master:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pricing master.' });
  }
};

export const updateProductPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startingPrice,
      minQuantity,
      quantityUnit,
      pricingType,
      gstPercentage,
      productionDays,
      singleSideDesignCharge,
      doubleSideDesignCharge,
      priceSlabs,
      reason,
    } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { priceSlabs: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        startingPrice: parseFloat(startingPrice) >= 0 ? parseFloat(startingPrice) : existing.startingPrice,
        minQuantity: parseInt(minQuantity, 10) > 0 ? parseInt(minQuantity, 10) : existing.minQuantity,
        quantityUnit: quantityUnit || existing.quantityUnit,
        pricingType: pricingType || existing.pricingType,
        gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage) : existing.gstPercentage,
        productionDays: productionDays !== undefined ? parseInt(productionDays, 10) : existing.productionDays,
        singleSideDesignCharge:
          singleSideDesignCharge !== undefined ? parseFloat(singleSideDesignCharge) : existing.singleSideDesignCharge,
        doubleSideDesignCharge:
          doubleSideDesignCharge !== undefined ? parseFloat(doubleSideDesignCharge) : existing.doubleSideDesignCharge,
        sourceStatus: 'ADMIN_CUSTOMIZED',
        pricingSource: 'ADMIN_PRICE_MASTER',
      },
      include: { category: true, priceSlabs: true },
    });

    // Update Price Slabs if provided
    if (priceSlabs && Array.isArray(priceSlabs)) {
      await prisma.productPriceSlab.deleteMany({ where: { productId: id } });
      await prisma.productPriceSlab.createMany({
        data: priceSlabs.map((s) => ({
          productId: id,
          minQty: parseInt(s.minQty, 10) || 1,
          maxQty: s.maxQty ? parseInt(s.maxQty, 10) : null,
          unitPrice: parseFloat(s.unitPrice) || 0,
          singleSidePrice: parseFloat(s.singleSidePrice) || 0,
          doubleSidePrice: parseFloat(s.doubleSidePrice) || 0,
          designCharge: parseFloat(s.singleSideDesignCharge || s.designCharge) || 200,
          singleSideDesignCharge: parseFloat(s.singleSideDesignCharge || s.designCharge) || 200,
          doubleSideDesignCharge: parseFloat(s.doubleSideDesignCharge || (parseFloat(s.singleSideDesignCharge || s.designCharge) * 2)) || 400,
          unitName: quantityUnit || existing.quantityUnit,
          pricingType: pricingType || existing.pricingType,
          source: 'ADMIN_PRICE_MASTER',
        })),
      });
    }

    // Log to Price History audit
    await prisma.priceHistory.create({
      data: {
        productId: id,
        oldPriceData: JSON.stringify({
          startingPrice: existing.startingPrice,
          minQuantity: existing.minQuantity,
          quantityUnit: existing.quantityUnit,
          pricingType: existing.pricingType,
          priceSlabs: existing.priceSlabs,
        }),
        newPriceData: JSON.stringify({
          startingPrice: updated.startingPrice,
          minQuantity: updated.minQuantity,
          quantityUnit: updated.quantityUnit,
          pricingType: updated.pricingType,
          priceSlabs,
        }),
        changedByUserId: req.user?.id || null,
        reason: reason || 'Updated via Admin Price Management Master',
      },
    });

    await recordAudit(req.user?.id, 'UPDATE_PRODUCT_PRICE', 'ProductPrice', id, existing, updated, req);

    return res.json({ success: true, message: 'Pricing updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating product price:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product price.' });
  }
};

// ==========================================
// PHASE 16: STANDALONE DESIGN PACKAGES CRUD
// ==========================================

export const getAdminDesignPackages = async (req, res) => {
  try {
    const { productId } = req.query;
    const where = productId ? { productId } : {};
    const packages = await prisma.productDesignPackage.findMany({
      where,
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { displayOrder: 'asc' },
    });
    return res.json({ success: true, data: packages });
  } catch (error) {
    console.error('Error fetching design packages:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch design packages.' });
  }
};

export const createAdminDesignPackage = async (req, res) => {
  try {
    const {
      productId,
      packageName,
      description,
      designCharge = 300,
      doubleSideDesignCharge,
      initialConcepts = 1,
      revisionsIncluded = 1,
      additionalRevisionCharge = 100,
      estimatedTime = '1 Business Day',
      includedServices,
      excludedServices,
      termsAndConditions,
      displayOrder = 0,
      isActive = true,
    } = req.body;

    if (!productId || !packageName) {
      return res.status(400).json({ success: false, message: 'Product ID and Package Name are required.' });
    }

    const pkg = await prisma.productDesignPackage.create({
      data: {
        productId,
        packageName,
        description,
        designCharge: parseFloat(designCharge) || 0,
        doubleSideDesignCharge: doubleSideDesignCharge != null && doubleSideDesignCharge !== '' ? parseFloat(doubleSideDesignCharge) : null,
        initialConcepts: parseInt(initialConcepts, 10) || 1,
        revisionsIncluded: parseInt(revisionsIncluded, 10) || 1,
        additionalRevisionCharge: parseFloat(additionalRevisionCharge) || 100,
        estimatedTime,
        includedServices: typeof includedServices === 'string' ? includedServices : JSON.stringify(includedServices || []),
        excludedServices: typeof excludedServices === 'string' ? excludedServices : JSON.stringify(excludedServices || []),
        termsAndConditions,
        displayOrder: parseInt(displayOrder, 10) || 0,
        isActive: isActive !== false,
      },
    });

    await recordAudit(req.user?.id, 'CREATE_DESIGN_PACKAGE', 'DesignPackage', pkg.id, null, pkg, req);

    return res.status(201).json({ success: true, message: 'Design package created successfully.', data: pkg });
  } catch (error) {
    console.error('Error creating design package:', error);
    return res.status(500).json({ success: false, message: 'Failed to create design package.' });
  }
};

export const updateAdminDesignPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.productDesignPackage.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Design package not found.' });
    }

    const updated = await prisma.productDesignPackage.update({
      where: { id },
      data: {
        packageName: data.packageName,
        description: data.description,
        designCharge: data.designCharge !== undefined ? parseFloat(data.designCharge) : undefined,
        doubleSideDesignCharge: data.doubleSideDesignCharge !== undefined ? (data.doubleSideDesignCharge != null && data.doubleSideDesignCharge !== '' ? parseFloat(data.doubleSideDesignCharge) : null) : undefined,
        initialConcepts: data.initialConcepts !== undefined ? parseInt(data.initialConcepts, 10) : undefined,
        revisionsIncluded: data.revisionsIncluded !== undefined ? parseInt(data.revisionsIncluded, 10) : undefined,
        additionalRevisionCharge: data.additionalRevisionCharge !== undefined ? parseFloat(data.additionalRevisionCharge) : undefined,
        estimatedTime: data.estimatedTime,
        includedServices: data.includedServices !== undefined ? (typeof data.includedServices === 'string' ? data.includedServices : JSON.stringify(data.includedServices)) : undefined,
        excludedServices: data.excludedServices !== undefined ? (typeof data.excludedServices === 'string' ? data.excludedServices : JSON.stringify(data.excludedServices)) : undefined,
        termsAndConditions: data.termsAndConditions,
        displayOrder: data.displayOrder !== undefined ? parseInt(data.displayOrder, 10) : undefined,
        isActive: data.isActive !== undefined ? !!data.isActive : undefined,
      },
    });

    await recordAudit(req.user?.id, 'UPDATE_DESIGN_PACKAGE', 'DesignPackage', id, existing, updated, req);

    return res.json({ success: true, message: 'Design package updated successfully.', data: updated });
  } catch (error) {
    console.error('Error updating design package:', error);
    return res.status(500).json({ success: false, message: 'Failed to update design package.' });
  }
};

export const deleteAdminDesignPackage = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.productDesignPackage.delete({ where: { id } });
    await recordAudit(req.user?.id, 'DELETE_DESIGN_PACKAGE', 'DesignPackage', id, null, null, req);
    return res.json({ success: true, message: 'Design package deleted successfully.' });
  } catch (error) {
    console.error('Error deleting design package:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete design package.' });
  }
};

// ============================================================================
// DYNAMIC OPTION MASTER & PRICING CONFIGURATION CONTROLLERS
// ============================================================================

export const getOptionMasters = async (req, res) => {
  try {
    const masters = await prisma.optionMaster.findMany({
      include: {
        values: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { productMappings: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
    return res.json({ success: true, data: masters });
  } catch (error) {
    console.error('Error fetching option masters:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch option masters.' });
  }
};

export const createOptionMaster = async (req, res) => {
  try {
    const { name, code, description, optionType = 'SELECT', isAddon = false, displayOrder = 0, values = [] } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Option name is required.' });
    }

    const cleanCode = (code || name).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '_');

    const existing = await prisma.optionMaster.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Option Master code '${cleanCode}' already exists.` });
    }

    const master = await prisma.optionMaster.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        description: description?.trim() || null,
        optionType,
        isAddon: !!isAddon,
        displayOrder: parseInt(displayOrder, 10) || 0,
        isActive: true,
        values: {
          create: values.map((v, idx) => ({
            label: v.label.trim(),
            code: (v.code || v.label).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '_'),
            description: v.description || null,
            swatchValue: v.swatchValue || null,
            defaultModifierType: v.defaultModifierType || 'FLAT',
            defaultModifierValue: parseFloat(v.defaultModifierValue) || 0,
            displayOrder: v.displayOrder || idx + 1,
            isActive: v.isActive !== false,
          })),
        },
      },
      include: { values: true },
    });

    await recordAudit(req.user?.id, 'CREATE_OPTION_MASTER', 'OptionMaster', master.id, null, master, req);
    return res.status(201).json({ success: true, message: 'Option Master created successfully.', data: master });
  } catch (error) {
    console.error('Error creating option master:', error);
    return res.status(500).json({ success: false, message: 'Failed to create option master.' });
  }
};

export const updateOptionMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, optionType, isAddon, displayOrder, isActive } = req.body;

    const existing = await prisma.optionMaster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Option Master not found.' });
    }

    const updated = await prisma.optionMaster.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        optionType: optionType !== undefined ? optionType : undefined,
        isAddon: isAddon !== undefined ? !!isAddon : undefined,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
      include: { values: true },
    });

    await recordAudit(req.user?.id, 'UPDATE_OPTION_MASTER', 'OptionMaster', id, existing, updated, req);
    return res.json({ success: true, message: 'Option Master updated successfully.', data: updated });
  } catch (error) {
    console.error('Error updating option master:', error);
    return res.status(500).json({ success: false, message: 'Failed to update option master.' });
  }
};

export const createOptionMasterValue = async (req, res) => {
  try {
    const { masterId } = req.params;
    const { label, code, description, swatchValue, defaultModifierType = 'FLAT', defaultModifierValue = 0, displayOrder = 0 } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({ success: false, message: 'Value label is required.' });
    }

    const cleanCode = (code || label).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '_');

    const value = await prisma.optionMasterValue.create({
      data: {
        masterId,
        label: label.trim(),
        code: cleanCode,
        description: description?.trim() || null,
        swatchValue: swatchValue || null,
        defaultModifierType,
        defaultModifierValue: parseFloat(defaultModifierValue) || 0,
        displayOrder: parseInt(displayOrder, 10) || 0,
        isActive: true,
      },
    });

    return res.status(201).json({ success: true, message: 'Option value created.', data: value });
  } catch (error) {
    console.error('Error creating option value:', error);
    return res.status(500).json({ success: false, message: 'Failed to create option value.' });
  }
};

export const updateOptionMasterValue = async (req, res) => {
  try {
    const { valueId } = req.params;
    const { label, description, swatchValue, defaultModifierType, defaultModifierValue, displayOrder, isActive } = req.body;

    const updated = await prisma.optionMasterValue.update({
      where: { id: valueId },
      data: {
        label: label !== undefined ? label.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        swatchValue: swatchValue !== undefined ? swatchValue : undefined,
        defaultModifierType: defaultModifierType !== undefined ? defaultModifierType : undefined,
        defaultModifierValue: defaultModifierValue !== undefined ? parseFloat(defaultModifierValue) : undefined,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
    });

    return res.json({ success: true, message: 'Option value updated.', data: updated });
  } catch (error) {
    console.error('Error updating option value:', error);
    return res.status(500).json({ success: false, message: 'Failed to update option value.' });
  }
};

export const getProductConfiguration = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        priceSlabs: { orderBy: { minQty: 'asc' } },
        pricingMatrices: { orderBy: [{ quantity: 'asc' }, { displayOrder: 'asc' }] },
        compatibilityRules: { orderBy: { createdAt: 'asc' } },
        priceVersions: { orderBy: { versionNumber: 'desc' }, take: 10 },
        optionMappings: {
          orderBy: { displayOrder: 'asc' },
          include: {
            master: {
              include: {
                values: { orderBy: { displayOrder: 'asc' } },
              },
            },
            valueMappings: {
              orderBy: { displayOrder: 'asc' },
              include: { masterValue: true },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const allMasters = await prisma.optionMaster.findMany({
      where: { isActive: true },
      include: { values: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });

    const allProducts = await prisma.product.findMany({
      where: { id: { not: id }, status: 'ACTIVE' },
      select: { id: true, name: true, sku: true },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      data: {
        product,
        allMasters,
        availableTemplates: allProducts,
      },
    });
  } catch (error) {
    console.error('Error fetching product configuration:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch configuration.' });
  }
};

export const updateProductConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pricingType,
      quantityType,
      customUnitPrice,
      startingPrice,
      optionMappings = [],
      changeReason,
    } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { optionMappings: true, priceSlabs: true },
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await prisma.product.update({
      where: { id },
      data: {
        pricingType: pricingType || undefined,
        quantityType: quantityType || undefined,
        customUnitPrice: customUnitPrice !== undefined ? (customUnitPrice ? parseFloat(customUnitPrice) : null) : undefined,
        startingPrice: startingPrice !== undefined ? parseFloat(startingPrice) : undefined,
      },
    });

    const incomingMasterIds = new Set(optionMappings.map((m) => m.masterId));

    await prisma.productOptionMapping.updateMany({
      where: {
        productId: id,
        masterId: { notIn: Array.from(incomingMasterIds) },
      },
      data: { isEnabled: false },
    });

    for (let i = 0; i < optionMappings.length; i++) {
      const m = optionMappings[i];
      const mappingRecord = await prisma.productOptionMapping.upsert({
        where: {
          productId_masterId: {
            productId: id,
            masterId: m.masterId,
          },
        },
        create: {
          productId: id,
          masterId: m.masterId,
          customLabel: m.customLabel?.trim() || null,
          isRequired: m.isRequired !== false,
          isAddon: !!m.isAddon,
          defaultValue: m.defaultValue || null,
          displayOrder: m.displayOrder !== undefined ? parseInt(m.displayOrder, 10) : i + 1,
          pricingBehavior: m.pricingBehavior || (m.isAddon ? 'ADDON_SURCHARGE' : 'MATRIX_DIMENSION'),
          isEnabled: m.isEnabled !== false,
        },
        update: {
          customLabel: m.customLabel?.trim() || null,
          isRequired: m.isRequired !== false,
          isAddon: !!m.isAddon,
          defaultValue: m.defaultValue || null,
          displayOrder: m.displayOrder !== undefined ? parseInt(m.displayOrder, 10) : i + 1,
          pricingBehavior: m.pricingBehavior || (m.isAddon ? 'ADDON_SURCHARGE' : 'MATRIX_DIMENSION'),
          isEnabled: m.isEnabled !== false,
        },
      });

      if (m.valueMappings && Array.isArray(m.valueMappings)) {
        for (let j = 0; j < m.valueMappings.length; j++) {
          const vm = m.valueMappings[j];
          await prisma.productOptionValueMapping.upsert({
            where: {
              mappingId_masterValueId: {
                mappingId: mappingRecord.id,
                masterValueId: vm.masterValueId,
              },
            },
            create: {
              mappingId: mappingRecord.id,
              masterValueId: vm.masterValueId,
              customLabel: vm.customLabel?.trim() || null,
              priceModifierType: vm.priceModifierType || 'FLAT',
              priceModifierValue: parseFloat(vm.priceModifierValue) || 0,
              isDefault: !!vm.isDefault,
              isEnabled: vm.isEnabled !== false,
              displayOrder: vm.displayOrder !== undefined ? parseInt(vm.displayOrder, 10) : j + 1,
            },
            update: {
              customLabel: vm.customLabel?.trim() || null,
              priceModifierType: vm.priceModifierType || 'FLAT',
              priceModifierValue: parseFloat(vm.priceModifierValue) || 0,
              isDefault: !!vm.isDefault,
              isEnabled: vm.isEnabled !== false,
              displayOrder: vm.displayOrder !== undefined ? parseInt(vm.displayOrder, 10) : j + 1,
            },
          });
        }
      }
    }

    const latestVersion = await prisma.priceVersion.findFirst({
      where: { productId: id },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    await prisma.priceVersion.create({
      data: {
        productId: id,
        versionNumber: nextVersionNumber,
        versionLabel: `v${nextVersionNumber}.0.0 - Admin Config Update`,
        pricingModel: pricingType || existingProduct.pricingType || 'TIERED_SLABS',
        snapshotData: JSON.stringify({
          updatedAt: new Date().toISOString(),
          pricingType: pricingType || existingProduct.pricingType,
          mappingsCount: optionMappings.length,
          startingPrice: startingPrice || existingProduct.startingPrice,
        }),
        isActive: true,
        changedByUserId: req.user?.id || null,
        changeReason: changeReason?.trim() || 'Admin updated dynamic product options and pricing configuration.',
      },
    });

    await recordAudit(req.user?.id, 'UPDATE_PRODUCT_CONFIG', 'Product', id, null, { optionMappingsCount: optionMappings.length }, req);

    return res.json({ success: true, message: 'Product configuration and price version saved successfully.' });
  } catch (error) {
    console.error('Error updating product configuration:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product configuration.' });
  }
};

export const duplicateProductConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const { sourceProductId } = req.body;

    if (!sourceProductId) {
      return res.status(400).json({ success: false, message: 'Source product ID is required.' });
    }

    const sourceProduct = await prisma.product.findUnique({
      where: { id: sourceProductId },
      include: {
        optionMappings: {
          include: { valueMappings: true },
        },
        compatibilityRules: true,
        pricingMatrices: true,
      },
    });

    if (!sourceProduct) {
      return res.status(404).json({ success: false, message: 'Source template product not found.' });
    }

    for (const sourceMap of sourceProduct.optionMappings) {
      const newMap = await prisma.productOptionMapping.upsert({
        where: {
          productId_masterId: {
            productId: id,
            masterId: sourceMap.masterId,
          },
        },
        create: {
          productId: id,
          masterId: sourceMap.masterId,
          customLabel: sourceMap.customLabel,
          isRequired: sourceMap.isRequired,
          isAddon: sourceMap.isAddon,
          defaultValue: sourceMap.defaultValue,
          displayOrder: sourceMap.displayOrder,
          pricingBehavior: sourceMap.pricingBehavior,
          isEnabled: sourceMap.isEnabled,
        },
        update: {
          customLabel: sourceMap.customLabel,
          isRequired: sourceMap.isRequired,
          isAddon: sourceMap.isAddon,
          defaultValue: sourceMap.defaultValue,
          displayOrder: sourceMap.displayOrder,
          pricingBehavior: sourceMap.pricingBehavior,
          isEnabled: sourceMap.isEnabled,
        },
      });

      for (const sourceVal of sourceMap.valueMappings) {
        await prisma.productOptionValueMapping.upsert({
          where: {
            mappingId_masterValueId: {
              mappingId: newMap.id,
              masterValueId: sourceVal.masterValueId,
            },
          },
          create: {
            mappingId: newMap.id,
            masterValueId: sourceVal.masterValueId,
            customLabel: sourceVal.customLabel,
            priceModifierType: sourceVal.priceModifierType,
            priceModifierValue: sourceVal.priceModifierValue,
            isDefault: sourceVal.isDefault,
            isEnabled: sourceVal.isEnabled,
            displayOrder: sourceVal.displayOrder,
          },
          update: {
            customLabel: sourceVal.customLabel,
            priceModifierType: sourceVal.priceModifierType,
            priceModifierValue: sourceVal.priceModifierValue,
            isDefault: sourceVal.isDefault,
            isEnabled: sourceVal.isEnabled,
            displayOrder: sourceVal.displayOrder,
          },
        });
      }
    }

    for (const rule of sourceProduct.compatibilityRules) {
      await prisma.productCompatibilityRule.create({
        data: {
          productId: id,
          ruleName: rule.ruleName,
          triggerOptionCode: rule.triggerOptionCode,
          triggerValueCode: rule.triggerValueCode,
          operator: rule.operator,
          action: rule.action,
          targetOptionCode: rule.targetOptionCode,
          targetValueCode: rule.targetValueCode,
          reason: rule.reason,
          isActive: rule.isActive,
        },
      });
    }

    await recordAudit(req.user?.id, 'DUPLICATE_CONFIG', 'Product', id, null, { sourceProductId }, req);

    return res.json({ success: true, message: `Configuration successfully duplicated from "${sourceProduct.name}".` });
  } catch (error) {
    console.error('Error duplicating product configuration:', error);
    return res.status(500).json({ success: false, message: 'Failed to duplicate configuration.' });
  }
};

export const bulkUpdatePricingMatrix = async (req, res) => {
  try {
    const { id } = req.params;
    const { matrixEntries = [] } = req.body;

    if (!Array.isArray(matrixEntries)) {
      return res.status(400).json({ success: false, message: 'matrixEntries must be an array.' });
    }

    await prisma.productPricingMatrix.deleteMany({ where: { productId: id } });

    if (matrixEntries.length > 0) {
      await prisma.productPricingMatrix.createMany({
        data: matrixEntries.map((entry, idx) => ({
          productId: id,
          combinationKey: entry.combinationKey || `comb_${idx}`,
          optionsJson: typeof entry.optionsJson === 'string' ? entry.optionsJson : JSON.stringify(entry.optionsJson || {}),
          quantity: parseInt(entry.quantity, 10) || 100,
          price: parseFloat(entry.price) || 0,
          unitPrice: entry.unitPrice ? parseFloat(entry.unitPrice) : ((parseFloat(entry.price) || 0) / (parseInt(entry.quantity, 10) || 1)),
          sku: entry.sku || null,
          isAvailable: entry.isAvailable !== false,
          displayOrder: entry.displayOrder || idx + 1,
        })),
      });
    }

    return res.json({ success: true, message: `Saved ${matrixEntries.length} matrix combinations successfully.` });
  } catch (error) {
    console.error('Error updating pricing matrix:', error);
    return res.status(500).json({ success: false, message: 'Failed to update pricing matrix.' });
  }
};

export const saveCompatibilityRule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      ruleId,
      ruleName,
      triggerOptionCode,
      triggerValueCode,
      operator = 'EQUALS',
      action = 'DISABLE_TARGET',
      targetOptionCode,
      targetValueCode,
      reason,
      isActive = true,
    } = req.body;

    if (!triggerOptionCode || !triggerValueCode || !targetOptionCode) {
      return res.status(400).json({ success: false, message: 'Trigger option, trigger value, and target option are required.' });
    }

    let rule;
    if (ruleId) {
      rule = await prisma.productCompatibilityRule.update({
        where: { id: ruleId },
        data: {
          ruleName: ruleName || `Rule: ${triggerOptionCode} -> ${action} ${targetOptionCode}`,
          triggerOptionCode,
          triggerValueCode,
          operator,
          action,
          targetOptionCode,
          targetValueCode: targetValueCode || null,
          reason: reason || null,
          isActive: !!isActive,
        },
      });
    } else {
      rule = await prisma.productCompatibilityRule.create({
        data: {
          productId: id,
          ruleName: ruleName || `Rule: ${triggerOptionCode} -> ${action} ${targetOptionCode}`,
          triggerOptionCode,
          triggerValueCode,
          operator,
          action,
          targetOptionCode,
          targetValueCode: targetValueCode || null,
          reason: reason || null,
          isActive: !!isActive,
        },
      });
    }

    return res.json({ success: true, message: 'Compatibility rule saved.', data: rule });
  } catch (error) {
    console.error('Error saving compatibility rule:', error);
    return res.status(500).json({ success: false, message: 'Failed to save compatibility rule.' });
  }
};

export const deleteCompatibilityRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    await prisma.productCompatibilityRule.delete({ where: { id: ruleId } });
    return res.json({ success: true, message: 'Compatibility rule deleted.' });
  } catch (error) {
    console.error('Error deleting compatibility rule:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete compatibility rule.' });
  }
};

export const rollbackPriceVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { versionId } = req.body;

    const targetVersion = await prisma.priceVersion.findUnique({
      where: { id: versionId },
    });

    if (!targetVersion || targetVersion.productId !== id) {
      return res.status(404).json({ success: false, message: 'Version record not found for this product.' });
    }

    const latest = await prisma.priceVersion.findFirst({
      where: { productId: id },
      orderBy: { versionNumber: 'desc' },
    });
    const newVer = (latest?.versionNumber || 0) + 1;

    await prisma.priceVersion.create({
      data: {
        productId: id,
        versionNumber: newVer,
        versionLabel: `v${newVer}.0.0 - Reverted to v${targetVersion.versionNumber}.0.0`,
        pricingModel: targetVersion.pricingModel,
        snapshotData: targetVersion.snapshotData,
        isActive: true,
        changedByUserId: req.user?.id || null,
        changeReason: `Rollback: Restored snapshot from ${targetVersion.versionLabel}.`,
      },
    });

    return res.json({ success: true, message: `Successfully reverted to ${targetVersion.versionLabel}.` });
  } catch (error) {
    console.error('Error rolling back price version:', error);
    return res.status(500).json({ success: false, message: 'Failed to rollback price version.' });
  }
};


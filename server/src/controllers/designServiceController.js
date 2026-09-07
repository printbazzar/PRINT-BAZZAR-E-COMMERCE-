import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 1. MASTER DESIGN PACKAGES CRUD
// ==========================================

export const getDesignPackages = async (req, res) => {
  try {
    const { productId, activeOnly } = req.query;

    if (productId) {
      // Return packages mapped to a specific product
      const mappings = await prisma.productDesignPackageMapping.findMany({
        where: {
          productId,
          ...(activeOnly === 'true' ? { isActive: true } : {}),
        },
        include: {
          designPackage: true,
        },
        orderBy: { sortOrder: 'asc' },
      });

      const result = mappings.map((m) => {
        const pkg = m.designPackage;
        let features = [];
        try {
          features = typeof pkg.featuresJson === 'string' ? JSON.parse(pkg.featuresJson) : (pkg.featuresJson || []);
        } catch (e) {
          features = [];
        }

        return {
          id: pkg.id,
          mappingId: m.id,
          name: pkg.name,
          packageName: pkg.name,
          badge: pkg.badge,
          shortDescription: pkg.shortDescription,
          detailedDescription: pkg.detailedDescription,
          basePrice: m.customPrice != null ? m.customPrice : pkg.basePrice,
          doubleSidePrice: m.customDoubleSidePrice != null ? m.customDoubleSidePrice : pkg.doubleSidePrice,
          customPrice: m.customPrice,
          customDoubleSidePrice: m.customDoubleSidePrice,
          offerPrice: pkg.offerPrice,
          concepts: pkg.concepts,
          revisions: pkg.revisions,
          deliveryDays: pkg.deliveryDays,
          deliveryTimeText: pkg.deliveryTimeText,
          expressDeliveryTime: pkg.expressDeliveryTime,
          expressDeliveryCharge: pkg.expressDeliveryCharge,
          features,
          isDefault: m.isDefault,
          isActive: m.isActive && pkg.isActive,
          sortOrder: m.sortOrder,
        };
      });

      return res.json({ success: true, data: result });
    }

    // Otherwise return master package catalog
    const packages = await prisma.designPackage.findMany({
      where: activeOnly === 'true' ? { isActive: true } : {},
      include: {
        _count: {
          select: {
            productMappings: true,
            designOrders: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const parsed = packages.map((pkg) => {
      let features = [];
      try {
        features = typeof pkg.featuresJson === 'string' ? JSON.parse(pkg.featuresJson) : (pkg.featuresJson || []);
      } catch (e) {
        features = [];
      }
      return {
        ...pkg,
        features,
        mappedProductsCount: pkg._count?.productMappings || 0,
        ordersCount: pkg._count?.designOrders || 0,
      };
    });

    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('getDesignPackages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch design packages' });
  }
};

export const createDesignPackage = async (req, res) => {
  try {
    const {
      name,
      badge,
      shortDescription,
      detailedDescription,
      packageIcon,
      basePrice,
      doubleSidePrice,
      offerPrice,
      concepts,
      revisions,
      deliveryDays,
      deliveryTimeText,
      expressDeliveryTime,
      expressDeliveryCharge,
      features,
      sortOrder,
      isActive = true,
      isDefault = false,
      mapToAllProducts = false,
    } = req.body;

    if (!name || basePrice == null) {
      return res.status(400).json({ success: false, message: 'Package name and base price are required.' });
    }

    const newPackage = await prisma.designPackage.create({
      data: {
        name: name.trim(),
        badge: badge ? badge.trim() : null,
        shortDescription: shortDescription || null,
        detailedDescription: detailedDescription || null,
        packageIcon: packageIcon || null,
        basePrice: parseFloat(basePrice) || 299,
        doubleSidePrice: doubleSidePrice != null ? parseFloat(doubleSidePrice) : (parseFloat(basePrice) * 1.6 || 499),
        offerPrice: offerPrice != null ? parseFloat(offerPrice) : null,
        concepts: parseInt(concepts, 10) || 1,
        revisions: parseInt(revisions, 10) || 1,
        deliveryDays: parseInt(deliveryDays, 10) || 2,
        deliveryTimeText: deliveryTimeText || `${deliveryDays || 2} Working Days`,
        expressDeliveryTime: expressDeliveryTime || '24 Hours',
        expressDeliveryCharge: expressDeliveryCharge != null ? parseFloat(expressDeliveryCharge) : 250,
        featuresJson: JSON.stringify(Array.isArray(features) ? features : []),
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive: Boolean(isActive),
        isDefault: Boolean(isDefault),
      },
    });

    // Optionally map to all existing products
    if (mapToAllProducts) {
      const allProducts = await prisma.product.findMany({ select: { id: true } });
      for (const prod of allProducts) {
        await prisma.productDesignPackageMapping.upsert({
          where: {
            productId_packageId: { productId: prod.id, packageId: newPackage.id },
          },
          create: {
            productId: prod.id,
            packageId: newPackage.id,
            sortOrder: newPackage.sortOrder,
            isDefault: newPackage.isDefault,
            isActive: true,
          },
          update: { isActive: true },
        });
      }
    }

    res.status(201).json({ success: true, data: newPackage, message: 'Design package created successfully.' });
  } catch (error) {
    console.error('createDesignPackage error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create design package' });
  }
};

export const updateDesignPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      badge,
      shortDescription,
      detailedDescription,
      packageIcon,
      basePrice,
      doubleSidePrice,
      offerPrice,
      concepts,
      revisions,
      deliveryDays,
      deliveryTimeText,
      expressDeliveryTime,
      expressDeliveryCharge,
      features,
      sortOrder,
      isActive,
      isDefault,
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (badge !== undefined) data.badge = badge ? badge.trim() : null;
    if (shortDescription !== undefined) data.shortDescription = shortDescription;
    if (detailedDescription !== undefined) data.detailedDescription = detailedDescription;
    if (packageIcon !== undefined) data.packageIcon = packageIcon;
    if (basePrice !== undefined) data.basePrice = parseFloat(basePrice);
    if (doubleSidePrice !== undefined) data.doubleSidePrice = parseFloat(doubleSidePrice);
    if (offerPrice !== undefined) data.offerPrice = offerPrice != null ? parseFloat(offerPrice) : null;
    if (concepts !== undefined) data.concepts = parseInt(concepts, 10);
    if (revisions !== undefined) data.revisions = parseInt(revisions, 10);
    if (deliveryDays !== undefined) data.deliveryDays = parseInt(deliveryDays, 10);
    if (deliveryTimeText !== undefined) data.deliveryTimeText = deliveryTimeText;
    if (expressDeliveryTime !== undefined) data.expressDeliveryTime = expressDeliveryTime;
    if (expressDeliveryCharge !== undefined) data.expressDeliveryCharge = parseFloat(expressDeliveryCharge);
    if (features !== undefined) data.featuresJson = JSON.stringify(Array.isArray(features) ? features : []);
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder, 10);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (isDefault !== undefined) data.isDefault = Boolean(isDefault);

    const updated = await prisma.designPackage.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: updated, message: 'Design package updated successfully.' });
  } catch (error) {
    console.error('updateDesignPackage error:', error);
    res.status(500).json({ success: false, message: 'Failed to update design package' });
  }
};

export const duplicateDesignPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const source = await prisma.designPackage.findUnique({ where: { id } });
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source design package not found.' });
    }

    const cloneName = `${source.name} (Copy)`;
    const newPkg = await prisma.designPackage.create({
      data: {
        name: cloneName,
        badge: source.badge,
        shortDescription: source.shortDescription,
        detailedDescription: source.detailedDescription,
        packageIcon: source.packageIcon,
        basePrice: source.basePrice,
        doubleSidePrice: source.doubleSidePrice,
        offerPrice: source.offerPrice,
        concepts: source.concepts,
        revisions: source.revisions,
        deliveryDays: source.deliveryDays,
        deliveryTimeText: source.deliveryTimeText,
        expressDeliveryTime: source.expressDeliveryTime,
        expressDeliveryCharge: source.expressDeliveryCharge,
        featuresJson: source.featuresJson,
        sortOrder: source.sortOrder + 1,
        isActive: true,
        isDefault: false,
      },
    });

    res.status(201).json({ success: true, data: newPkg, message: `Package duplicated as "${cloneName}".` });
  } catch (error) {
    console.error('duplicateDesignPackage error:', error);
    res.status(500).json({ success: false, message: 'Failed to duplicate design package' });
  }
};

export const deleteDesignPackage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if package has ever been used in design orders
    const ordersCount = await prisma.designOrder.count({ where: { packageId: id } });

    if (ordersCount > 0) {
      // Safe Archive / Soft-Deactivate Rule (#20)
      await prisma.designPackage.update({
        where: { id },
        data: { isActive: false },
      });
      return res.json({
        success: true,
        message: `Package has been used in ${ordersCount} order(s). It has been archived and deactivated safely without affecting historical records.`,
      });
    }

    // If not used in orders, remove mappings and delete
    await prisma.productDesignPackageMapping.deleteMany({ where: { packageId: id } });
    await prisma.designPackage.delete({ where: { id } });

    res.json({ success: true, message: 'Design package deleted successfully.' });
  } catch (error) {
    console.error('deleteDesignPackage error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete design package' });
  }
};

export const reorderDesignPackages = async (req, res) => {
  try {
    const { orderedIds } = req.body; // array of IDs
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds array required' });
    }

    const updates = orderedIds.map((id, index) =>
      prisma.designPackage.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    );

    await prisma.$transaction(updates);
    res.json({ success: true, message: 'Design packages display order updated.' });
  } catch (error) {
    console.error('reorderDesignPackages error:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder design packages' });
  }
};

// ==========================================
// 2. DESIGN ADD-ONS CRUD
// ==========================================

export const getDesignAddons = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const addons = await prisma.designAddon.findMany({
      where: activeOnly === 'true' ? { isActive: true } : {},
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: addons });
  } catch (error) {
    console.error('getDesignAddons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch design add-ons' });
  }
};

export const createDesignAddon = async (req, res) => {
  try {
    const { name, price, description, badge, sortOrder, isActive = true } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ success: false, message: 'Name and price are required.' });
    }

    const addon = await prisma.designAddon.create({
      data: {
        name: name.trim(),
        price: parseFloat(price) || 0,
        description: description || null,
        badge: badge ? badge.trim() : null,
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive: Boolean(isActive),
      },
    });

    res.status(201).json({ success: true, data: addon, message: 'Add-on created successfully.' });
  } catch (error) {
    console.error('createDesignAddon error:', error);
    res.status(500).json({ success: false, message: 'Failed to create add-on' });
  }
};

export const updateDesignAddon = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, badge, sortOrder, isActive } = req.body;

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (price !== undefined) data.price = parseFloat(price);
    if (description !== undefined) data.description = description;
    if (badge !== undefined) data.badge = badge ? badge.trim() : null;
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder, 10);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.designAddon.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: updated, message: 'Add-on updated successfully.' });
  } catch (error) {
    console.error('updateDesignAddon error:', error);
    res.status(500).json({ success: false, message: 'Failed to update add-on' });
  }
};

export const deleteDesignAddon = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.designAddon.delete({ where: { id } });
    res.json({ success: true, message: 'Add-on deleted successfully.' });
  } catch (error) {
    console.error('deleteDesignAddon error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete add-on' });
  }
};

// ==========================================
// 3. PRODUCT DESIGN MAPPING & BULK ASSIGN
// ==========================================

export const getProductDesignMapping = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        artworkSetting: true,
        packageMappings: {
          include: { designPackage: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const allPackages = await prisma.designPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          hasCustomDesign: product.hasCustomDesign,
          enableDesignSupport: product.artworkSetting?.enableDesignSupport ?? true,
        },
        mappings: product.packageMappings,
        availablePackages: allPackages,
      },
    });
  } catch (error) {
    console.error('getProductDesignMapping error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product design mapping' });
  }
};

export const updateProductDesignMapping = async (req, res) => {
  try {
    const { productId } = req.params;
    const { enableDesignSupport = true, packageConfigs = [] } = req.body;

    // 1. Update product artwork setting toggle
    await prisma.productArtworkSetting.upsert({
      where: { productId },
      create: {
        productId,
        enableDesignSupport: Boolean(enableDesignSupport),
      },
      update: {
        enableDesignSupport: Boolean(enableDesignSupport),
      },
    });

    // 2. Delete existing mappings not in the new config
    const activePackageIds = packageConfigs.map((c) => c.packageId);
    await prisma.productDesignPackageMapping.deleteMany({
      where: {
        productId,
        packageId: { notIn: activePackageIds },
      },
    });

    // 3. Upsert mappings with custom prices
    for (const config of packageConfigs) {
      await prisma.productDesignPackageMapping.upsert({
        where: {
          productId_packageId: {
            productId,
            packageId: config.packageId,
          },
        },
        create: {
          productId,
          packageId: config.packageId,
          customPrice: config.customPrice != null && config.customPrice !== '' ? parseFloat(config.customPrice) : null,
          customDoubleSidePrice: config.customDoubleSidePrice != null && config.customDoubleSidePrice !== '' ? parseFloat(config.customDoubleSidePrice) : null,
          sortOrder: parseInt(config.sortOrder, 10) || 0,
          isDefault: Boolean(config.isDefault),
          isActive: config.isActive !== false,
        },
        update: {
          customPrice: config.customPrice != null && config.customPrice !== '' ? parseFloat(config.customPrice) : null,
          customDoubleSidePrice: config.customDoubleSidePrice != null && config.customDoubleSidePrice !== '' ? parseFloat(config.customDoubleSidePrice) : null,
          sortOrder: parseInt(config.sortOrder, 10) || 0,
          isDefault: Boolean(config.isDefault),
          isActive: config.isActive !== false,
        },
      });
    }

    res.json({ success: true, message: 'Product design mapping updated successfully.' });
  } catch (error) {
    console.error('updateProductDesignMapping error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product design mapping' });
  }
};

export const bulkAssignPackages = async (req, res) => {
  try {
    const { productIds = [], packageIds = [], defaultPackageId } = req.body;

    if (!productIds.length || !packageIds.length) {
      return res.status(400).json({ success: false, message: 'Select at least one product and one package.' });
    }

    for (const prodId of productIds) {
      for (const pkgId of packageIds) {
        await prisma.productDesignPackageMapping.upsert({
          where: {
            productId_packageId: { productId: prodId, packageId: pkgId },
          },
          create: {
            productId: prodId,
            packageId: pkgId,
            isDefault: pkgId === defaultPackageId,
            isActive: true,
          },
          update: {
            isDefault: pkgId === defaultPackageId,
            isActive: true,
          },
        });
      }
    }

    res.json({
      success: true,
      message: `Assigned ${packageIds.length} package(s) across ${productIds.length} product(s) successfully.`,
    });
  } catch (error) {
    console.error('bulkAssignPackages error:', error);
    res.status(500).json({ success: false, message: 'Bulk assignment failed' });
  }
};

// ==========================================
// 4. DESIGN ORDERS (DESIGN JOBS HUB)
// ==========================================

export const getDesignOrders = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { designJobNumber: { contains: q, mode: 'insensitive' } },
        { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
        { order: { customerName: { contains: q, mode: 'insensitive' } } },
        { order: { customerMobile: { contains: q } } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [total, orders] = await Promise.all([
      prisma.designOrder.count({ where }),
      prisma.designOrder.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerMobile: true,
              customerEmail: true,
              createdAt: true,
              orderStatus: true,
            },
          },
          product: {
            select: { id: true, name: true, thumbnailUrl: true, slug: true },
          },
          designer: {
            select: { id: true, name: true, email: true },
          },
          revisions: {
            orderBy: { revisionNumber: 'desc' },
            take: 1,
          },
          _count: {
            select: { revisions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('getDesignOrders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch design orders' });
  }
};

export const getDesignOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const designOrder = await prisma.designOrder.findUnique({
      where: { id },
      include: {
        order: true,
        orderItem: true,
        product: true,
        designPackage: true,
        designer: { select: { id: true, name: true, email: true, department: true } },
        revisions: { orderBy: { revisionNumber: 'asc' } },
      },
    });

    if (!designOrder) {
      return res.status(404).json({ success: false, message: 'Design order not found.' });
    }

    // Parse JSON blobs safely
    let briefResponses = {};
    let uploadedAssets = {};
    let addonsSnapshot = [];
    let packageSnapshot = {};
    let finalFiles = [];

    try { briefResponses = typeof designOrder.briefResponsesJson === 'string' ? JSON.parse(designOrder.briefResponsesJson) : (designOrder.briefResponsesJson || {}); } catch (e) {}
    try { uploadedAssets = typeof designOrder.uploadedAssetsJson === 'string' ? JSON.parse(designOrder.uploadedAssetsJson) : (designOrder.uploadedAssetsJson || {}); } catch (e) {}
    try { addonsSnapshot = typeof designOrder.addonsSnapshotJson === 'string' ? JSON.parse(designOrder.addonsSnapshotJson) : (designOrder.addonsSnapshotJson || []); } catch (e) {}
    try { packageSnapshot = typeof designOrder.packageSnapshotJson === 'string' ? JSON.parse(designOrder.packageSnapshotJson) : (designOrder.packageSnapshotJson || {}); } catch (e) {}
    try { finalFiles = typeof designOrder.finalFilesJson === 'string' ? JSON.parse(designOrder.finalFilesJson) : (designOrder.finalFilesJson || []); } catch (e) {}

    res.json({
      success: true,
      data: {
        ...designOrder,
        briefResponses,
        uploadedAssets,
        addonsSnapshot,
        packageSnapshot,
        finalFiles,
      },
    });
  } catch (error) {
    console.error('getDesignOrderById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch design order details' });
  }
};

export const assignDesigner = async (req, res) => {
  try {
    const { id } = req.params;
    const { designerId } = req.body;

    const designOrder = await prisma.designOrder.findUnique({ where: { id } });
    if (!designOrder) {
      return res.status(404).json({ success: false, message: 'Design order not found.' });
    }

    let designerName = 'Unassigned';
    if (designerId) {
      const user = await prisma.user.findUnique({ where: { id: designerId } });
      if (user) designerName = user.name;
    }

    const updated = await prisma.designOrder.update({
      where: { id },
      data: {
        designerId: designerId || null,
        status: designOrder.status === 'REQUIREMENT_RECEIVED' && designerId ? 'DESIGNER_ASSIGNED' : designOrder.status,
      },
    });

    // Also update order staff name for ERP board synchronization
    await prisma.order.update({
      where: { id: designOrder.orderId },
      data: { assignedStaffName: designerName },
    });

    res.json({ success: true, data: updated, message: `Designer assigned to ${designerName}.` });
  } catch (error) {
    console.error('assignDesigner error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign designer' });
  }
};

export const updateDesignOrderPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority, deadline } = req.body;

    const data = {};
    if (priority) data.priority = priority;
    if (deadline) data.deadline = new Date(deadline);

    const updated = await prisma.designOrder.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: updated, message: 'Priority & deadline updated.' });
  } catch (error) {
    console.error('updateDesignOrderPriority error:', error);
    res.status(500).json({ success: false, message: 'Failed to update priority' });
  }
};

export const uploadDraftRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const { draftFileUrl, designerResponse } = req.body;

    if (!draftFileUrl) {
      return res.status(400).json({ success: false, message: 'Draft file URL is required.' });
    }

    const designOrder = await prisma.designOrder.findUnique({
      where: { id },
      include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } },
    });

    if (!designOrder) {
      return res.status(404).json({ success: false, message: 'Design order not found.' });
    }

    const nextRevisionNumber = (designOrder.revisions?.[0]?.revisionNumber || 0) + 1;

    // Create revision entry
    const revision = await prisma.designRevision.create({
      data: {
        designOrderId: id,
        revisionNumber: nextRevisionNumber,
        draftFileUrl,
        designerResponse: designerResponse || 'First Draft submitted for customer proofing.',
        status: 'PENDING_REVIEW',
      },
    });

    // Update DesignOrder and Parent Order Proof status
    await prisma.designOrder.update({
      where: { id },
      data: { status: 'DRAFT_READY' },
    });

    await prisma.order.update({
      where: { id: designOrder.orderId },
      data: {
        proofFileUrl: draftFileUrl,
        proofStatus: 'SENT_TO_CUSTOMER',
      },
    });

    res.status(201).json({
      success: true,
      data: revision,
      message: `Draft Revision #${nextRevisionNumber} uploaded successfully. Customer notified for proof approval.`,
    });
  } catch (error) {
    console.error('uploadDraftRevision error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload draft revision' });
  }
};

export const submitRevisionFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerComment } = req.body;

    const designOrder = await prisma.designOrder.findUnique({
      where: { id },
      include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } },
    });

    if (!designOrder) {
      return res.status(404).json({ success: false, message: 'Design order not found.' });
    }

    const latestRevision = designOrder.revisions?.[0];
    if (latestRevision) {
      await prisma.designRevision.update({
        where: { id: latestRevision.id },
        data: {
          customerComment,
          status: 'REVISION_REQUESTED',
        },
      });
    }

    await prisma.designOrder.update({
      where: { id },
      data: { status: 'REVISION' },
    });

    await prisma.order.update({
      where: { id: designOrder.orderId },
      data: { proofStatus: 'REVISION_REQUESTED' },
    });

    res.json({ success: true, message: 'Revision feedback submitted to design team.' });
  } catch (error) {
    console.error('submitRevisionFeedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit revision feedback' });
  }
};

export const approveDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const { approverNotes = 'Approved for physical press production' } = req.body;

    const designOrder = await prisma.designOrder.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!designOrder) {
      return res.status(404).json({ success: false, message: 'Design order not found.' });
    }

    // 1. Mark Design Order as APPROVED
    await prisma.designOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    // 2. Check if all design jobs for the parent order are approved
    const pendingJobs = await prisma.designOrder.count({
      where: {
        orderId: designOrder.orderId,
        status: { notIn: ['APPROVED', 'FINAL_DESIGN_READY', 'COMPLETED'] },
      },
    });

    // If all design jobs approved, route strictly to PRE_PRODUCTION_QC Gate! (Strict Rule #1)
    if (pendingJobs === 0) {
      const latestRevision = await prisma.designRevision.findFirst({
        where: { designOrderId: id },
        orderBy: { revisionNumber: 'desc' },
      });

      await prisma.order.update({
        where: { id: designOrder.orderId },
        data: {
          proofStatus: 'APPROVED',
          proofApprovedAt: new Date(),
          currentDepartment: 'PRODUCTION', // Handover to Pre-Production Gate
          orderStatus: 'PRE_PRODUCTION_QC',
        },
      });

      // Update linked ProductionJob for prepress QC
      await prisma.productionJob.updateMany({
        where: {
          orderId: designOrder.orderId,
          ...(designOrder.orderItemId ? { orderItemId: designOrder.orderItemId } : {}),
        },
        data: {
          status: 'PRE_PRODUCTION_QC',
          artworkStatus: 'APPROVED',
          approvedArtworkUrl: latestRevision?.draftFileUrl || null,
          approvedArtworkVersion: `Proof V${latestRevision?.revisionNumber || 1} - Approved`,
        },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: designOrder.orderId,
          newStatus: 'PRE_PRODUCTION_QC',
          note: `Design Job ${designOrder.designJobNumber} approved. Transferred to Pre-Production QC Gate for prepress checklist verification.`,
        },
      });
    }

    res.json({
      success: true,
      message: `Design approved! Transferred to Pre-Production QC Gate for prepress verification.`,
    });
  } catch (error) {
    console.error('approveDesign error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve design' });
  }
};

export const uploadFinalFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalFiles = [] } = req.body; // Array of { fileName, fileUrl, fileType }

    const updated = await prisma.designOrder.update({
      where: { id },
      data: {
        finalFilesJson: JSON.stringify(finalFiles),
        status: 'FINAL_DESIGN_READY',
      },
    });

    res.json({ success: true, data: updated, message: 'Final production files uploaded successfully.' });
  } catch (error) {
    console.error('uploadFinalFiles error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload final files' });
  }
};

// ==========================================
// 5. DESIGN SETTINGS
// ==========================================

export const getDesignSettings = async (req, res) => {
  try {
    const settings = await prisma.storeSetting.findMany({
      where: {
        key: { startsWith: 'DESIGN_' },
      },
    });

    const map = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    res.json({
      success: true,
      data: {
        maxFileSizeMb: parseFloat(map['DESIGN_MAX_FILE_SIZE_MB']) || 100,
        allowedFormats: map['DESIGN_ALLOWED_FORMATS'] || 'PDF,AI,CDR,PSD,PNG,JPG,SVG',
        jobPrefix: map['DESIGN_JOB_PREFIX'] || 'PB-DES',
        defaultRevisionLimit: parseInt(map['DESIGN_DEFAULT_REVISION_LIMIT'], 10) || 2,
        defaultDeliveryDays: parseInt(map['DESIGN_DEFAULT_DELIVERY_DAYS'], 10) || 2,
      },
    });
  } catch (error) {
    console.error('getDesignSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch design settings' });
  }
};

export const updateDesignSettings = async (req, res) => {
  try {
    const {
      maxFileSizeMb = 100,
      allowedFormats = 'PDF,AI,CDR,PSD,PNG,JPG,SVG',
      jobPrefix = 'PB-DES',
      defaultRevisionLimit = 2,
      defaultDeliveryDays = 2,
    } = req.body;

    const upserts = [
      { key: 'DESIGN_MAX_FILE_SIZE_MB', value: String(maxFileSizeMb) },
      { key: 'DESIGN_ALLOWED_FORMATS', value: String(allowedFormats) },
      { key: 'DESIGN_JOB_PREFIX', value: String(jobPrefix).trim() },
      { key: 'DESIGN_DEFAULT_REVISION_LIMIT', value: String(defaultRevisionLimit) },
      { key: 'DESIGN_DEFAULT_DELIVERY_DAYS', value: String(defaultDeliveryDays) },
    ];

    for (const s of upserts) {
      await prisma.storeSetting.upsert({
        where: { key: s.key },
        create: { key: s.key, value: s.value },
        update: { value: s.value },
      });
    }

    res.json({ success: true, message: 'Design settings saved successfully.' });
  } catch (error) {
    console.error('updateDesignSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update design settings' });
  }
};

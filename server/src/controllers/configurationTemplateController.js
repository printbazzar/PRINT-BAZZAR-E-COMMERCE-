import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to record audit log (same pattern as adminController)
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

// ==========================================
// CONFIGURATION TEMPLATE CRUD
// ==========================================

/**
 * GET /api/v1/admin/configuration-templates
 * List all configuration templates with optional filters
 */
export const getConfigurationTemplates = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [templates, total] = await Promise.all([
      prisma.productConfigurationTemplate.findMany({
        where,
        orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: parseInt(limit),
        include: {
          _count: { select: { products: true } },
        },
      }),
      prisma.productConfigurationTemplate.count({ where }),
    ]);

    return res.json({
      success: true,
      data: templates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching configuration templates:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch configuration templates.' });
  }
};

/**
 * GET /api/v1/admin/configuration-templates/:id
 * Get a single configuration template by ID
 */
export const getConfigurationTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.productConfigurationTemplate.findUnique({
      where: { id },
      include: {
        products: {
          select: { id: true, name: true, slug: true, sku: true, status: true },
          take: 20,
        },
        _count: { select: { products: true } },
      },
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Configuration template not found.' });
    }

    return res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching configuration template:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch configuration template.' });
  }
};

/**
 * POST /api/v1/admin/configuration-templates
 * Create a new configuration template
 */
export const createConfigurationTemplate = async (req, res) => {
  try {
    const { code, name, description, category, pricingModel, fieldsConfigJson, defaultOptionsJson, qcChecklistJson } = req.body;

    // Validation
    if (!code || !name || !category || !fieldsConfigJson) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: code, name, category, fieldsConfigJson.',
      });
    }

    // Check code uniqueness
    const existing = await prisma.productConfigurationTemplate.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Template with code "${code}" already exists.`,
      });
    }

    // Validate fieldsConfigJson is parseable JSON
    try {
      const parsed = typeof fieldsConfigJson === 'string' ? JSON.parse(fieldsConfigJson) : fieldsConfigJson;
      if (!Array.isArray(parsed)) {
        return res.status(400).json({ success: false, message: 'fieldsConfigJson must be a JSON array of field definitions.' });
      }
    } catch {
      return res.status(400).json({ success: false, message: 'fieldsConfigJson is not valid JSON.' });
    }

    const template = await prisma.productConfigurationTemplate.create({
      data: {
        code: code.toUpperCase().replace(/\s+/g, '_'),
        name,
        description: description || null,
        category: category.toUpperCase().replace(/\s+/g, '_'),
        pricingModel: pricingModel || 'MATRIX',
        fieldsConfigJson: typeof fieldsConfigJson === 'string' ? fieldsConfigJson : JSON.stringify(fieldsConfigJson),
        defaultOptionsJson: defaultOptionsJson ? (typeof defaultOptionsJson === 'string' ? defaultOptionsJson : JSON.stringify(defaultOptionsJson)) : null,
        qcChecklistJson: qcChecklistJson ? (typeof qcChecklistJson === 'string' ? qcChecklistJson : JSON.stringify(qcChecklistJson)) : null,
        status: 'DRAFT',
        version: 1,
      },
    });

    await recordAudit(req.user?.id, 'CREATE_CONFIG_TEMPLATE', 'ProductConfigurationTemplate', template.id, null, { code: template.code, name: template.name }, req);

    return res.status(201).json({ success: true, message: 'Configuration template created.', data: template });
  } catch (error) {
    console.error('Error creating configuration template:', error);
    return res.status(500).json({ success: false, message: 'Failed to create configuration template.' });
  }
};

/**
 * PUT /api/v1/admin/configuration-templates/:id
 * Update a configuration template (increments version if PUBLISHED)
 */
export const updateConfigurationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.productConfigurationTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Configuration template not found.' });
    }

    const { name, description, category, pricingModel, fieldsConfigJson, defaultOptionsJson, qcChecklistJson, status } = req.body;

    // Validate fieldsConfigJson if provided
    if (fieldsConfigJson) {
      try {
        const parsed = typeof fieldsConfigJson === 'string' ? JSON.parse(fieldsConfigJson) : fieldsConfigJson;
        if (!Array.isArray(parsed)) {
          return res.status(400).json({ success: false, message: 'fieldsConfigJson must be a JSON array.' });
        }
      } catch {
        return res.status(400).json({ success: false, message: 'fieldsConfigJson is not valid JSON.' });
      }
    }

    // Status transition validation
    const validTransitions = {
      DRAFT: ['PREVIEW', 'ARCHIVED'],
      PREVIEW: ['APPROVED', 'DRAFT', 'ARCHIVED'],
      APPROVED: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
      PUBLISHED: ['ARCHIVED'],
      ARCHIVED: ['DRAFT'],
    };

    if (status && status !== existing.status) {
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from "${existing.status}" to "${status}". Allowed: ${allowed.join(', ')}.`,
        });
      }
    }

    // Version bump: if template is PUBLISHED and content is being changed, increment version
    const isContentChange = fieldsConfigJson || defaultOptionsJson || pricingModel;
    const shouldBumpVersion = existing.status === 'PUBLISHED' && isContentChange;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category.toUpperCase().replace(/\s+/g, '_');
    if (pricingModel !== undefined) updateData.pricingModel = pricingModel;
    if (fieldsConfigJson !== undefined) updateData.fieldsConfigJson = typeof fieldsConfigJson === 'string' ? fieldsConfigJson : JSON.stringify(fieldsConfigJson);
    if (defaultOptionsJson !== undefined) updateData.defaultOptionsJson = typeof defaultOptionsJson === 'string' ? defaultOptionsJson : JSON.stringify(defaultOptionsJson);
    if (qcChecklistJson !== undefined) updateData.qcChecklistJson = typeof qcChecklistJson === 'string' ? qcChecklistJson : JSON.stringify(qcChecklistJson);
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }
    }
    if (shouldBumpVersion) {
      updateData.version = existing.version + 1;
    }

    const updated = await prisma.productConfigurationTemplate.update({
      where: { id },
      data: updateData,
    });

    await recordAudit(req.user?.id, 'UPDATE_CONFIG_TEMPLATE', 'ProductConfigurationTemplate', id, { status: existing.status, version: existing.version }, { status: updated.status, version: updated.version }, req);

    return res.json({ success: true, message: 'Configuration template updated.', data: updated });
  } catch (error) {
    console.error('Error updating configuration template:', error);
    return res.status(500).json({ success: false, message: 'Failed to update configuration template.' });
  }
};

/**
 * DELETE /api/v1/admin/configuration-templates/:id
 * Delete a template (only if no products are using it)
 */
export const deleteConfigurationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.productConfigurationTemplate.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Configuration template not found.' });
    }

    if (template._count.products > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete template "${template.name}": ${template._count.products} product(s) are using it. Archive instead.`,
      });
    }

    await prisma.productConfigurationTemplate.delete({ where: { id } });
    await recordAudit(req.user?.id, 'DELETE_CONFIG_TEMPLATE', 'ProductConfigurationTemplate', id, { code: template.code }, null, req);

    return res.json({ success: true, message: 'Configuration template deleted.' });
  } catch (error) {
    console.error('Error deleting configuration template:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete configuration template.' });
  }
};

// ==========================================
// ENTERPRISE TEMPLATE SEEDER
// ==========================================

/**
 * POST /api/v1/admin/configuration-templates/seed
 * Seeds the 6 standard enterprise printing configuration templates.
 * Skips templates that already exist (by code).
 */
export const seedDefaultTemplates = async (req, res) => {
  try {
    const defaultTemplates = [
      {
        code: 'BUSINESS_CARD_TEMPLATE',
        name: 'Business Card Configuration',
        category: 'VISITING_CARDS',
        pricingModel: 'MATRIX',
        fieldsConfigJson: JSON.stringify([
          { code: 'orientation', name: 'Orientation', optionType: 'RADIO', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 1, pricingBehavior: 'INFORMATIONAL', values: ['Horizontal', 'Vertical'] },
          { code: 'size', name: 'Card Size', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 2, pricingBehavior: 'MATRIX_DIMENSION', values: ['90 × 54 mm (Standard)', '89 × 51 mm (US Standard)', '85 × 55 mm (European)', '90 × 48 mm (Slim)'] },
          { code: 'material', name: 'Material / GSM', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 3, pricingBehavior: 'MATRIX_DIMENSION', values: ['300 GSM Art Card', '350 GSM Art Card', '400 GSM Luxury Card', 'Textured Linen 350 GSM'] },
          { code: 'printing', name: 'Printing Side', optionType: 'RADIO', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 4, pricingBehavior: 'MATRIX_DIMENSION', values: ['Front Only', 'Front & Back'] },
          { code: 'lamination', name: 'Lamination', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 5, pricingBehavior: 'ADDON_SURCHARGE', values: ['None', 'Thermal Matte', 'Thermal Gloss', 'Velvet Touch'] },
          { code: 'finishing', name: 'Finishing', optionType: 'CHECKBOX', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 6, pricingBehavior: 'ADDON_SURCHARGE', values: ['Spot UV', 'Gold Foil', 'Silver Foil', 'Embossing'] },
          { code: 'corner', name: 'Corner Shape', optionType: 'RADIO', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 7, pricingBehavior: 'ADDON_SURCHARGE', values: ['Square', 'Rounded'] },
          { code: 'quantity', name: 'Quantity', optionType: 'QUANTITY_SELECTOR', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 8, pricingBehavior: 'MATRIX_DIMENSION' },
          { code: 'press_notes', name: 'Press Notes', optionType: 'TEXT', visibility: 'INTERNAL_ONLY', isRequired: false, displayOrder: 9, pricingBehavior: 'INFORMATIONAL' },
        ]),
        defaultOptionsJson: JSON.stringify({ size: '90x54mm', printing: 'front_back', lamination: 'none', corner: 'square' }),
        qcChecklistJson: JSON.stringify(['Text legibility check', 'Color accuracy vs proof', 'Bleed and trim marks', 'Lamination uniformity', 'Corner cut precision', 'Card count verification']),
      },
      {
        code: 'STICKER_TEMPLATE',
        name: 'Sticker Configuration',
        category: 'STICKERS',
        pricingModel: 'MATRIX',
        fieldsConfigJson: JSON.stringify([
          { code: 'shape', name: 'Shape', optionType: 'IMAGE_SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 1, pricingBehavior: 'MATRIX_DIMENSION', values: ['Square', 'Round', 'Rectangle', 'Oval', 'Custom Die Cut'] },
          { code: 'material', name: 'Material', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 2, pricingBehavior: 'MATRIX_DIMENSION', values: ['Vinyl Glossy', 'Vinyl Matte', 'Paper (Non-Waterproof)', 'Transparent', 'Holographic'] },
          { code: 'size', name: 'Size', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 3, pricingBehavior: 'MATRIX_DIMENSION', values: ['2 × 2 inch', '3 × 3 inch', '4 × 4 inch', 'A5', 'A4', 'Custom'] },
          { code: 'quantity', name: 'Quantity', optionType: 'QUANTITY_SELECTOR', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 4, pricingBehavior: 'MATRIX_DIMENSION' },
          { code: 'finishing', name: 'Finishing', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 5, pricingBehavior: 'ADDON_SURCHARGE', values: ['None', 'Gloss Overlaminate', 'Matte Overlaminate'] },
          { code: 'kiss_cut', name: 'Kiss Cut', optionType: 'RADIO', visibility: 'INTERNAL_ONLY', isRequired: false, displayOrder: 6, pricingBehavior: 'INFORMATIONAL', values: ['Yes', 'No'] },
        ]),
        defaultOptionsJson: JSON.stringify({ shape: 'square', material: 'vinyl_glossy', size: '3x3inch' }),
        qcChecklistJson: JSON.stringify(['Adhesive strength check', 'Die cut accuracy', 'Color vibrancy', 'Waterproof seal integrity', 'Quantity verification']),
      },
      {
        code: 'INVITATION_TEMPLATE',
        name: 'Invitation Card Configuration',
        category: 'INVITATIONS',
        pricingModel: 'MATRIX',
        fieldsConfigJson: JSON.stringify([
          { code: 'size', name: 'Card Size', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 1, pricingBehavior: 'MATRIX_DIMENSION', values: ['5 × 7 inch', '6 × 9 inch', 'A5 (148 × 210 mm)', 'A4 Folded'] },
          { code: 'material', name: 'Material / GSM', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 2, pricingBehavior: 'MATRIX_DIMENSION', values: ['300 GSM Art Card', '350 GSM Ivory Card', '300 GSM Textured', 'Metallic Pearl 300 GSM'] },
          { code: 'printing', name: 'Printing Side', optionType: 'RADIO', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 3, pricingBehavior: 'MATRIX_DIMENSION', values: ['Front Only', 'Front & Back'] },
          { code: 'lamination', name: 'Lamination', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 4, pricingBehavior: 'ADDON_SURCHARGE', values: ['None', 'Thermal Matte', 'Thermal Gloss'] },
          { code: 'finishing', name: 'Finishing', optionType: 'CHECKBOX', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 5, pricingBehavior: 'ADDON_SURCHARGE', values: ['Gold Foil', 'Silver Foil', 'Embossing', 'Die Cut Edge'] },
          { code: 'quantity', name: 'Quantity', optionType: 'QUANTITY_SELECTOR', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 6, pricingBehavior: 'MATRIX_DIMENSION' },
          { code: 'envelope', name: 'Envelope Required', optionType: 'RADIO', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 7, pricingBehavior: 'ADDON_SURCHARGE', values: ['No Envelope', 'White Envelope', 'Gold Envelope'] },
        ]),
        defaultOptionsJson: JSON.stringify({ size: '5x7inch', printing: 'front_back', lamination: 'none' }),
        qcChecklistJson: JSON.stringify(['Text and content accuracy', 'Color consistency', 'Foil adhesion', 'Fold line precision', 'Envelope fit check', 'Count verification']),
      },
      {
        code: 'ROLLUP_STANDEE_TEMPLATE',
        name: 'Roll-Up Standee Configuration',
        category: 'ROLLUP_STANDEE',
        pricingModel: 'MATRIX',
        fieldsConfigJson: JSON.stringify([
          { code: 'size', name: 'Standee Size', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 1, pricingBehavior: 'MATRIX_DIMENSION', values: ['2 × 5 ft', '2.5 × 6 ft', '3 × 6 ft', '3 × 6.5 ft', '4 × 6 ft'] },
          { code: 'material', name: 'Material', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 2, pricingBehavior: 'MATRIX_DIMENSION', values: ['Star Flex (Standard)', 'Premium Backlit', 'Non-Curl Banner'] },
          { code: 'printing_type', name: 'Printing Type', optionType: 'RADIO', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 3, pricingBehavior: 'MATRIX_DIMENSION', values: ['Eco Solvent', 'UV Print', 'Latex Print'] },
          { code: 'quantity', name: 'Quantity', optionType: 'QUANTITY_SELECTOR', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 4, pricingBehavior: 'MATRIX_DIMENSION' },
          { code: 'stand_type', name: 'Stand Type', optionType: 'SELECT', visibility: 'INTERNAL_ONLY', isRequired: false, displayOrder: 5, pricingBehavior: 'INFORMATIONAL', values: ['Standard Aluminium', 'Premium Chrome', 'Budget Iron'] },
        ]),
        defaultOptionsJson: JSON.stringify({ size: '3x6ft', material: 'star_flex', printing_type: 'eco_solvent' }),
        qcChecklistJson: JSON.stringify(['Print resolution check (min 150 DPI)', 'Color profile verification', 'Banner alignment in stand', 'Stand mechanism test', 'Carry bag included']),
      },
      {
        code: 'PHOTO_GIFT_TEMPLATE',
        name: 'Photo Gift Configuration',
        category: 'PHOTO_GIFTS',
        pricingModel: 'MATRIX',
        fieldsConfigJson: JSON.stringify([
          { code: 'product_variant', name: 'Product Type', optionType: 'IMAGE_SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 1, pricingBehavior: 'MATRIX_DIMENSION', values: ['Mug', 'Cushion', 'Photo Frame', 'Mouse Pad', 'Keychain', 'Mobile Cover', 'T-Shirt'] },
          { code: 'size', name: 'Size', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 2, pricingBehavior: 'MATRIX_DIMENSION', values: ['Standard', 'Large', 'Extra Large'] },
          { code: 'quantity', name: 'Quantity', optionType: 'QUANTITY_SELECTOR', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 3, pricingBehavior: 'MATRIX_DIMENSION' },
          { code: 'finishing', name: 'Finishing', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 4, pricingBehavior: 'ADDON_SURCHARGE', values: ['Glossy', 'Matte', 'Satin'] },
          { code: 'gift_box', name: 'Gift Box', optionType: 'RADIO', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 5, pricingBehavior: 'ADDON_SURCHARGE', values: ['No Box', 'Standard Box', 'Premium Gift Box'] },
          { code: 'sublimation_notes', name: 'Sublimation Notes', optionType: 'TEXT', visibility: 'ADMIN_ONLY', isRequired: false, displayOrder: 6, pricingBehavior: 'INFORMATIONAL' },
        ]),
        defaultOptionsJson: JSON.stringify({ product_variant: 'mug', size: 'standard', finishing: 'glossy' }),
        qcChecklistJson: JSON.stringify(['Image resolution check', 'Color transfer quality', 'Surface adhesion test', 'Product defect inspection', 'Packaging integrity']),
      },
      {
        code: 'SIGNAGE_TEMPLATE',
        name: 'Signage Product Configuration',
        category: 'SIGNAGE',
        pricingModel: 'SIZE_FORMULA',
        fieldsConfigJson: JSON.stringify([
          { code: 'width', name: 'Width', optionType: 'WIDTH_INPUT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 1, pricingBehavior: 'MATRIX_DIMENSION', unit: 'feet', minValue: 1, maxValue: 50, stepValue: 0.5 },
          { code: 'height', name: 'Height', optionType: 'HEIGHT_INPUT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 2, pricingBehavior: 'MATRIX_DIMENSION', unit: 'feet', minValue: 1, maxValue: 50, stepValue: 0.5 },
          { code: 'material', name: 'Material', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 3, pricingBehavior: 'MATRIX_DIMENSION', values: ['Flex Banner', 'Vinyl', 'Sunboard', 'ACP Sheet', 'Acrylic'] },
          { code: 'thickness', name: 'Thickness', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 4, pricingBehavior: 'ADDON_SURCHARGE', values: ['3mm', '5mm', '8mm', '10mm'] },
          { code: 'printing_type', name: 'Printing Type', optionType: 'RADIO', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 5, pricingBehavior: 'MATRIX_DIMENSION', values: ['Eco Solvent', 'UV Flatbed', 'Screen Print'] },
          { code: 'installation', name: 'Installation Option', optionType: 'SELECT', visibility: 'CUSTOMER_VISIBLE', isRequired: false, displayOrder: 6, pricingBehavior: 'ADDON_SURCHARGE', values: ['No Installation', 'Wall Mount', 'Stand Mount', 'Hanging'] },
          { code: 'quantity', name: 'Quantity', optionType: 'QUANTITY_SELECTOR', visibility: 'CUSTOMER_VISIBLE', isRequired: true, displayOrder: 7, pricingBehavior: 'MATRIX_DIMENSION' },
          { code: 'installation_site_notes', name: 'Installation Site Notes', optionType: 'TEXT', visibility: 'INTERNAL_ONLY', isRequired: false, displayOrder: 8, pricingBehavior: 'INFORMATIONAL' },
        ]),
        defaultOptionsJson: JSON.stringify({ material: 'flex_banner', printing_type: 'eco_solvent', installation: 'no_installation' }),
        qcChecklistJson: JSON.stringify(['Dimension accuracy (±0.5 inch tolerance)', 'Grommet/eyelet placement', 'Print quality at viewing distance', 'Material integrity', 'Edge finishing']),
      },
    ];

    const results = { created: [], skipped: [] };

    for (const tmpl of defaultTemplates) {
      const existing = await prisma.productConfigurationTemplate.findUnique({ where: { code: tmpl.code } });
      if (existing) {
        results.skipped.push(tmpl.code);
        continue;
      }

      const created = await prisma.productConfigurationTemplate.create({
        data: {
          ...tmpl,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          version: 1,
        },
      });
      results.created.push({ code: created.code, id: created.id, name: created.name });
    }

    await recordAudit(req.user?.id, 'SEED_CONFIG_TEMPLATES', 'ProductConfigurationTemplate', null, null, results, req);

    return res.status(201).json({
      success: true,
      message: `Seeded ${results.created.length} template(s). Skipped ${results.skipped.length} (already exist).`,
      data: results,
    });
  } catch (error) {
    console.error('Error seeding default templates:', error);
    return res.status(500).json({ success: false, message: 'Failed to seed default templates.' });
  }
};

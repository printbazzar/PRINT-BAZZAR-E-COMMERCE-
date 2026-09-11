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

/**
 * POST /api/v1/shop/quote-request
 * Customer submits a quote request for custom/signage/large-format products
 */
export const createQuoteRequest = async (req, res) => {
  try {
    const { customerId, productId, customerName, customerEmail, customerMobile, specificationsJson, quantity, description, referenceImageUrl } = req.body;

    // Validation
    if (!customerName || !customerMobile || !specificationsJson || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: customerName, customerMobile, specificationsJson, quantity.',
      });
    }

    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
    }

    // Validate specificationsJson is parseable
    try {
      const parsed = typeof specificationsJson === 'string' ? JSON.parse(specificationsJson) : specificationsJson;
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return res.status(400).json({ success: false, message: 'specificationsJson must be a JSON object.' });
      }
    } catch {
      return res.status(400).json({ success: false, message: 'specificationsJson is not valid JSON.' });
    }

    // Validate customerId exists if provided
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }
    }

    // Validate productId exists if provided
    if (productId) {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
    }

    // Generate quote number
    const count = await prisma.quoteRequest.count();
    const quoteNumber = `QR-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        quoteNumber,
        customerId: customerId || null,
        productId: productId || null,
        customerName,
        customerEmail: customerEmail || null,
        customerMobile,
        specificationsJson: typeof specificationsJson === 'string' ? specificationsJson : JSON.stringify(specificationsJson),
        quantity: parseInt(quantity),
        description: description || null,
        referenceImageUrl: referenceImageUrl || null,
        status: 'PENDING',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Quote request submitted successfully. Our team will respond shortly.',
      data: { id: quoteRequest.id, quoteNumber: quoteRequest.quoteNumber, status: quoteRequest.status },
    });
  } catch (error) {
    console.error('Error creating quote request:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit quote request.' });
  }
};

/**
 * GET /api/v1/admin/quote-requests
 * Admin list of all quote requests with filters
 */
export const getQuoteRequests = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { quoteNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerMobile: { contains: q } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [quotes, total] = await Promise.all([
      prisma.quoteRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          customer: { select: { id: true, name: true, email: true, mobile: true } },
          product: { select: { id: true, name: true, slug: true, sku: true } },
        },
      }),
      prisma.quoteRequest.count({ where }),
    ]);

    return res.json({
      success: true,
      data: quotes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching quote requests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch quote requests.' });
  }
};

/**
 * GET /api/v1/admin/quote-requests/:id
 * Admin view single quote request
 */
export const getQuoteRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const quote = await prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, mobile: true, companyName: true, gstNumber: true } },
        product: { select: { id: true, name: true, slug: true, sku: true, thumbnailUrl: true } },
      },
    });

    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote request not found.' });
    }

    return res.json({ success: true, data: quote });
  } catch (error) {
    console.error('Error fetching quote request:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch quote request.' });
  }
};

/**
 * PUT /api/v1/admin/quote-requests/:id
 * Admin updates quote request (provide quote, change status, add notes)
 */
export const updateQuoteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.quoteRequest.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quote request not found.' });
    }

    const { status, quotedPrice, quotedBreakdownJson, notes, validUntil, convertedOrderId } = req.body;

    // Status transition validation
    const validTransitions = {
      PENDING: ['QUOTED', 'REJECTED'],
      QUOTED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
      ACCEPTED: ['CONVERTED_TO_ORDER'],
      REJECTED: [],
      EXPIRED: ['QUOTED'], // Can re-quote an expired quote
      CONVERTED_TO_ORDER: [],
    };

    if (status && status !== existing.status) {
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from "${existing.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}.`,
        });
      }
    }

    // If quoting, quotedPrice is required
    if (status === 'QUOTED' && !quotedPrice && !existing.quotedPrice) {
      return res.status(400).json({
        success: false,
        message: 'quotedPrice is required when setting status to QUOTED.',
      });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (quotedPrice !== undefined) updateData.quotedPrice = parseFloat(quotedPrice);
    if (quotedBreakdownJson !== undefined) {
      updateData.quotedBreakdownJson = typeof quotedBreakdownJson === 'string' ? quotedBreakdownJson : JSON.stringify(quotedBreakdownJson);
    }
    if (notes !== undefined) updateData.notes = notes;
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (convertedOrderId !== undefined) updateData.convertedOrderId = convertedOrderId;

    // Set timestamps based on status
    if (status === 'QUOTED') {
      updateData.quotedAt = new Date();
      updateData.quotedByName = req.user?.name || req.user?.email || 'Admin';
    }
    if (status === 'ACCEPTED' || status === 'REJECTED') {
      updateData.respondedAt = new Date();
    }

    const updated = await prisma.quoteRequest.update({
      where: { id },
      data: updateData,
    });

    await recordAudit(req.user?.id, 'UPDATE_QUOTE_REQUEST', 'QuoteRequest', id, { status: existing.status }, { status: updated.status, quotedPrice: updated.quotedPrice }, req);

    return res.json({ success: true, message: 'Quote request updated.', data: updated });
  } catch (error) {
    console.error('Error updating quote request:', error);
    return res.status(500).json({ success: false, message: 'Failed to update quote request.' });
  }
};

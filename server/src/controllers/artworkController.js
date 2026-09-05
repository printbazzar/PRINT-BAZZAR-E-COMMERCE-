import { PrismaClient } from '@prisma/client';
import path from 'path';
import { uploadToStorage } from '../utils/supabaseStorage.js';

const prisma = new PrismaClient();

// Allowed MIME types / extensions for print artwork & design assets
const DEFAULT_ALLOWED_FORMATS = ['pdf', 'ai', 'cdr', 'psd', 'eps', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'zip'];
const DEFAULT_MAX_SIZE_MB = 100;

/**
 * Upload customer artwork or design brief asset
 * Handles single or multiple file uploads, validates format & size,
 * stores via Supabase Storage (with local disk fallback), and creates ArtworkUpload record.
 */
export const uploadArtworkFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file was uploaded.',
      });
    }

    const { productId, customerId, cartItemId, orderId, purpose = 'PRINT_READY_FILE' } = req.body;

    // 1. Check product specific file constraints if productId provided
    let allowedFormats = DEFAULT_ALLOWED_FORMATS;
    let maxMb = DEFAULT_MAX_SIZE_MB;

    if (productId) {
      const artworkSetting = await prisma.productArtworkSetting.findUnique({
        where: { productId },
      });

      if (artworkSetting) {
        if (artworkSetting.acceptedFormats) {
          allowedFormats = artworkSetting.acceptedFormats
            .split(',')
            .map((f) => f.trim().toLowerCase().replace(/^\./, ''))
            .filter(Boolean);
        }
        if (artworkSetting.maxFileSizeMb && artworkSetting.maxFileSizeMb > 0) {
          maxMb = artworkSetting.maxFileSizeMb;
        }
      }
    }

    // 2. Validate File Extension
    const fileExt = path.extname(file.originalname).toLowerCase().replace(/^\./, '');
    const isExtensionAllowed = allowedFormats.includes(fileExt) || DEFAULT_ALLOWED_FORMATS.includes(fileExt);

    if (!isExtensionAllowed) {
      return res.status(400).json({
        success: false,
        message: `File format '.${fileExt}' is not accepted. Accepted formats: ${allowedFormats.join(', ').toUpperCase()}`,
      });
    }

    // 3. Validate File Size
    const fileSizeInMb = file.size / (1024 * 1024);
    if (fileSizeInMb > maxMb) {
      return res.status(400).json({
        success: false,
        message: `File size (${fileSizeInMb.toFixed(1)} MB) exceeds maximum allowed size of ${maxMb} MB.`,
      });
    }

    // 4. Upload to Supabase Storage (or local /uploads/)
    const storageResult = await uploadToStorage(file, 'artwork');

    // 5. Calculate artwork version (V1, V2, etc.) for this item
    let version = 1;
    if (cartItemId || orderId) {
      const existingCount = await prisma.artworkUpload.count({
        where: {
          OR: [
            cartItemId ? { cartItemId } : undefined,
            orderId ? { orderId } : undefined,
          ].filter(Boolean),
        },
      });
      version = existingCount + 1;
    }

    // 6. Persist upload metadata to database
    const preflightReportStr = req.body.preflightReport
      ? (typeof req.body.preflightReport === 'string' ? req.body.preflightReport : JSON.stringify(req.body.preflightReport))
      : null;

    const artworkUpload = await prisma.artworkUpload.create({
      data: {
        fileName: path.basename(storageResult.url),
        originalName: file.originalname,
        fileType: file.mimetype || `application/${fileExt}`,
        fileSize: file.size,
        storageLocation: storageResult.storageType || 'SUPABASE_STORAGE',
        fileUrl: storageResult.url,
        productId: productId || null,
        customerId: customerId || null,
        cartItemId: cartItemId || null,
        orderId: orderId || null,
        version,
        preflightStatus: req.body.preflightStatus || 'PASS',
        preflightReport: preflightReportStr,
        customerAcknowledged: req.body.customerAcknowledged === 'true' || req.body.customerAcknowledged === true,
        dpi: req.body.dpi ? parseInt(req.body.dpi, 10) : null,
        width: req.body.width ? parseInt(req.body.width, 10) : null,
        height: req.body.height ? parseInt(req.body.height, 10) : null,
      },
    });

    return res.status(201).json({
      success: true,
      message: `File uploaded successfully as Version ${version}.`,
      fileUrl: artworkUpload.fileUrl,
      version: artworkUpload.version,
      versionLabel: `V${artworkUpload.version}`,
      upload: {
        id: artworkUpload.id,
        fileName: artworkUpload.fileName,
        originalName: artworkUpload.originalName,
        fileType: artworkUpload.fileType,
        fileSize: artworkUpload.fileSize,
        fileUrl: artworkUpload.fileUrl,
        storageLocation: artworkUpload.storageLocation,
        version: artworkUpload.version,
        versionLabel: `V${artworkUpload.version}`,
        preflightStatus: artworkUpload.preflightStatus,
        purpose: req.body?.purpose || 'PRINT_READY',
        createdAt: artworkUpload.createdAt,
      },
    });
  } catch (error) {
    console.error('Artwork upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload artwork file.',
    });
  }
};

/**
 * Delete uploaded artwork file before checkout
 */
export const deleteArtworkFile = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUpload = await prisma.artworkUpload.findUnique({
      where: { id },
    });

    if (!existingUpload) {
      return res.status(404).json({
        success: false,
        message: 'Artwork upload record not found.',
      });
    }

    // Ownership & Authorization Check
    const isAdmin = !!req.user;
    const isCustomer = !!req.customer;

    if (isAdmin) {
      const hasPerm = req.user.role === 'Super Admin' || req.user.permissions?.includes('ORDER_UPDATE');
      if (!hasPerm) {
        return res.status(403).json({ success: false, message: 'Forbidden: You lack permission to delete artwork files.' });
      }
    } else if (isCustomer) {
      if (existingUpload.customerId && existingUpload.customerId !== req.customer.id) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not own this artwork file.' });
      }
    } else {
      return res.status(401).json({ success: false, message: 'Authentication required to delete artwork files.' });
    }

    // Protection check: Cannot delete artwork linked to confirmed order in production unless Super Admin
    if (existingUpload.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: existingUpload.orderId },
        select: { orderStatus: true },
      });
      const productionStatuses = ['PRODUCTION_QUEUE', 'PRINTING', 'FINISHING', 'QC', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
      if (order && productionStatuses.includes(order.orderStatus) && (!isAdmin || req.user.role !== 'Super Admin')) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete artwork: This order is already in production or completed.',
        });
      }
    }

    // Delete record from database
    await prisma.artworkUpload.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Artwork file removed successfully.',
    });
  } catch (error) {
    console.error('Delete artwork error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete artwork file.',
    });
  }
};

/**
 * Get upload metadata
 */
export const getArtworkUploadById = async (req, res) => {
  try {
    const { id } = req.params;
    const upload = await prisma.artworkUpload.findUnique({
      where: { id },
    });

    if (!upload) {
      return res.status(404).json({ success: false, message: 'Upload not found.' });
    }

    return res.json({ success: true, data: upload });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch upload metadata.' });
  }
};

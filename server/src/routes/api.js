import express from 'express';
import { adminLogin, adminRefreshToken, adminLogout, getMe } from '../controllers/authController.js';
import {
  getCategories,
  getCategoryBySlug,
  getProducts,
  getProductBySlug,
  calculatePriceEndpoint,
  getBanners,
  getReviews,
} from '../controllers/catalogController.js';
import {
  createOrder,
  trackOrder,
  uploadArtwork,
} from '../controllers/orderController.js';
import {
  uploadArtworkFile,
  deleteArtworkFile,
  getArtworkUploadById,
} from '../controllers/artworkController.js';
import {
  getDashboardKPIs,
  getAdminProducts,
  createProduct,
  updateProduct,
  duplicateProduct,
  deleteProduct,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  addOrderNote,
  getSettings,
  getPublicSettings,
  updateSettings,
  getAuditLogs,
  getPricingMaster,
  updateProductPrice,
  getAdminDesignPackages,
  createAdminDesignPackage,
  deleteAdminDesignPackage,
  getOptionMasters,
  seedDefaultOptionMastersEndpoint,
  createOptionMaster,
  updateOptionMaster,
  createOptionMasterValue,
  updateOptionMasterValue,
  getProductConfiguration,
  updateProductConfiguration,
  duplicateProductConfiguration,
  bulkUpdatePricingMatrix,
  saveCompatibilityRule,
  deleteCompatibilityRule,
  rollbackPriceVersion,
} from '../controllers/adminController.js';
import { authenticateAdmin, requirePermission, authenticateCustomerOrAdmin, optionalCustomerOrAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getWorkflowBoard,
  handoverOrder,
  approveCustomerProof,
  submitPreProductionQC,
  reviewArtwork,
} from '../controllers/workflowController.js';
import {
  customerSignup,
  customerLogin,
  customerGoogleLogin,
  customerRefreshToken,
  customerLogout,
  authenticateCustomer,
  getCustomerProfile,
  getCustomerOrders,
  addCustomerAddress,
  reorderPreviousOrder,
  sendCustomerOtp,
  verifyCustomerOtp,
} from '../controllers/customerAuthController.js';
import { getCsrfTokenEndpoint } from '../middleware/csrfProtection.js';
import {
  getStaffList,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../controllers/staffController.js';
import { uploadToStorage } from '../utils/supabaseStorage.js';
import {
  getDesignPackages,
  createDesignPackage,
  updateDesignPackage,
  duplicateDesignPackage,
  deleteDesignPackage,
  reorderDesignPackages,
  getDesignAddons,
  createDesignAddon,
  updateDesignAddon,
  deleteDesignAddon,
  getProductDesignMapping,
  updateProductDesignMapping,
  bulkAssignPackages,
  getDesignOrders,
  getDesignOrderById,
  assignDesigner,
  updateDesignOrderPriority,
  uploadDraftRevision,
  submitRevisionFeedback,
  approveDesign,
  uploadFinalFiles,
  getDesignSettings,
  updateDesignSettings,
} from '../controllers/designServiceController.js';
import {
  getProductionJobs,
  getProductionJobById,
  updateProductionJobStage,
} from '../controllers/productionController.js';
import {
  getQCQueue,
  submitQCInspection,
} from '../controllers/qcController.js';
import {
  getLogisticsQueue,
  completePacking,
  dispatchCourier,
  handoverStorePickup,
  markCourierDelivered,
} from '../controllers/logisticsController.js';
import {
  getOrderInvoice,
  generateTaxInvoice,
} from '../controllers/invoiceController.js';
import {
  createPaymentSession,
  verifyPayment,
  convertToCod,
  handlePaymentWebhook,
} from '../controllers/paymentController.js';
import {
  adminLoginLimiter,
  customerLoginLimiter,
  customerSignupLimiter,
  orderCreationLimiter,
} from '../middleware/rateLimiter.js';
import { validateOrderCreation } from '../middleware/inputSanitizer.js';
import {
  getPublicFooter,
  getAdminFooter,
  updateAdminFooter,
  resetAdminFooter,
} from '../controllers/footerController.js';
import {
  getPublicBusinessInfo,
  getAdminBusinessInfo,
  updateAdminBusinessInfo,
  resetAdminBusinessInfo,
} from '../controllers/businessInfoController.js';
import {
  searchCustomers,
  createQuickCustomer,
  verifyManagerPin,
  createWalkInOrder,
  getFrontOfficeDashboard,
} from '../controllers/posController.js';

const router = express.Router();

// ==========================================
// CUSTOMER AUTH & PORTAL (B2C & B2B CORPORATE)
// ==========================================
router.post('/customer/auth/signup', customerSignupLimiter, customerSignup);
router.post('/customer/auth/login', customerLoginLimiter, customerLogin);
router.post('/customer/auth/google', customerLoginLimiter, customerGoogleLogin);
router.post('/customer/auth/send-otp', customerLoginLimiter, sendCustomerOtp);
router.post('/customer/auth/verify-otp', verifyCustomerOtp);
router.post('/customer/auth/refresh', customerRefreshToken);
router.post('/customer/auth/logout', customerLogout);
router.get('/customer/account/profile', authenticateCustomer, getCustomerProfile);
router.get('/customer/account/orders', authenticateCustomer, getCustomerOrders);
router.post('/customer/account/addresses', authenticateCustomer, addCustomerAddress);
router.post('/customer/account/reorder/:orderId', authenticateCustomer, reorderPreviousOrder);

// ==========================================
// PUBLIC CATALOG & STOREFRONT ROUTES
// ==========================================
router.get('/csrf-token', getCsrfTokenEndpoint);
router.get('/categories', getCategories);
router.get('/categories/:slug', getCategoryBySlug);

router.get('/products', getProducts);
router.get('/products/:slug', getProductBySlug);
router.post('/products/calculate-price', calculatePriceEndpoint);
router.post('/pricing/calculate', calculatePriceEndpoint);

router.get('/banners', getBanners);
router.get('/reviews', getReviews);

// Orders & Checkout (Customer Authenticated & Protected)
router.post('/orders', orderCreationLimiter, optionalCustomerOrAdmin, validateOrderCreation, createOrder);
router.get('/orders/track/:orderIdentifier', optionalCustomerOrAdmin, trackOrder);
router.post('/orders/upload-artwork', upload.single('artwork'), uploadArtwork);
router.post('/artwork/upload', upload.single('file'), uploadArtworkFile);
router.post('/artwork/upload-file', upload.single('artwork'), uploadArtworkFile);
router.delete('/artwork/:id', authenticateCustomerOrAdmin, deleteArtworkFile);
router.get('/artwork/:id', authenticateCustomerOrAdmin, getArtworkUploadById);
router.post('/orders/:orderNumber/approve-proof', approveCustomerProof);
router.get('/orders/:orderId/invoice', optionalCustomerOrAdmin, getOrderInvoice);

// Payment Gateway Verification & Webhook (Online Orders)
router.post('/payments/create-order', createPaymentSession);
router.post('/payments/verify', verifyPayment);
router.post('/payments/convert-to-cod', convertToCod);
router.post('/payments/webhook', handlePaymentWebhook);

// Public Design Services Routes
router.get('/design-services/packages', getDesignPackages);
router.get('/design-services/addons', getDesignAddons);
router.get('/design-services/product/:productId', getProductDesignMapping);
router.post('/design-orders/:id/feedback', submitRevisionFeedback);
router.post('/design-orders/:id/approve', approveDesign);

// Store Settings (Public Info)
router.get('/settings/public', getPublicSettings);
router.get('/settings/footer', getPublicFooter);
router.get('/settings/business-info', getPublicBusinessInfo);

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================
router.post('/admin/auth/login', adminLoginLimiter, adminLogin);
router.post('/admin/auth/refresh', adminRefreshToken);
router.post('/admin/auth/logout', adminLogout);
router.get('/admin/auth/me', authenticateAdmin, getMe);

// ==========================================
// ADMIN CMS & DASHBOARD (PROTECTED)
// ==========================================
router.get('/admin/dashboard/kpis', authenticateAdmin, getDashboardKPIs);

// Product CMS
router.get('/admin/products', authenticateAdmin, getAdminProducts);
router.post('/admin/products', authenticateAdmin, requirePermission('PRODUCT_CREATE'), createProduct);
router.put('/admin/products/:id', authenticateAdmin, requirePermission('PRODUCT_EDIT'), updateProduct);
router.post('/admin/products/:id/duplicate', authenticateAdmin, requirePermission('PRODUCT_CREATE'), duplicateProduct);
router.delete('/admin/products/:id', authenticateAdmin, requirePermission('PRODUCT_DELETE'), deleteProduct);

// Centralized Pricing Master
router.get('/admin/pricing', authenticateAdmin, getPricingMaster);
router.put('/admin/pricing/:id', authenticateAdmin, requirePermission('PRODUCT_EDIT'), updateProductPrice);

// Reusable Option Masters CMS
router.get('/admin/option-masters', authenticateAdmin, getOptionMasters);
router.post('/admin/option-masters/seed-defaults', authenticateAdmin, requirePermission('PRODUCT_EDIT'), seedDefaultOptionMastersEndpoint);
router.post('/admin/option-masters', authenticateAdmin, requirePermission('PRODUCT_EDIT'), createOptionMaster);
router.put('/admin/option-masters/:id', authenticateAdmin, requirePermission('PRODUCT_EDIT'), updateOptionMaster);
router.post('/admin/option-masters/:masterId/values', authenticateAdmin, requirePermission('PRODUCT_EDIT'), createOptionMasterValue);
router.put('/admin/option-masters/values/:valueId', authenticateAdmin, requirePermission('PRODUCT_EDIT'), updateOptionMasterValue);

// Dynamic Product Configuration & Pricing Matrix Hub
router.get('/admin/products/:id/configuration', authenticateAdmin, getProductConfiguration);
router.put('/admin/products/:id/configuration', authenticateAdmin, requirePermission('PRODUCT_EDIT'), updateProductConfiguration);
router.post('/admin/products/:id/duplicate-configuration', authenticateAdmin, requirePermission('PRODUCT_EDIT'), duplicateProductConfiguration);
router.post('/admin/products/:id/pricing-matrix/bulk', authenticateAdmin, requirePermission('PRODUCT_EDIT'), bulkUpdatePricingMatrix);
router.post('/admin/products/:id/compatibility-rules', authenticateAdmin, requirePermission('PRODUCT_EDIT'), saveCompatibilityRule);
router.delete('/admin/products/compatibility-rules/:ruleId', authenticateAdmin, requirePermission('PRODUCT_EDIT'), deleteCompatibilityRule);
router.post('/admin/products/:id/price-versions/rollback', authenticateAdmin, requirePermission('PRODUCT_EDIT'), rollbackPriceVersion);

// ==========================================
// CENTRALIZED DESIGN SERVICES MANAGEMENT (ADMIN)
// ==========================================
// A. Design Packages
router.get('/admin/design-services/packages', authenticateAdmin, getDesignPackages);
router.post('/admin/design-services/packages', authenticateAdmin, requirePermission('PRODUCT_EDIT'), createDesignPackage);
router.put('/admin/design-services/packages/:id', authenticateAdmin, requirePermission('PRODUCT_EDIT'), updateDesignPackage);
router.post('/admin/design-services/packages/:id/duplicate', authenticateAdmin, requirePermission('PRODUCT_EDIT'), duplicateDesignPackage);
router.delete('/admin/design-services/packages/:id', authenticateAdmin, requirePermission('PRODUCT_EDIT'), deleteDesignPackage);
router.post('/admin/design-services/packages/reorder', authenticateAdmin, requirePermission('PRODUCT_EDIT'), reorderDesignPackages);

// B. Design Add-ons
router.get('/admin/design-services/addons', authenticateAdmin, getDesignAddons);
router.post('/admin/design-services/addons', authenticateAdmin, requirePermission('PRODUCT_EDIT'), createDesignAddon);
router.put('/admin/design-services/addons/:id', authenticateAdmin, requirePermission('PRODUCT_EDIT'), updateDesignAddon);
router.delete('/admin/design-services/addons/:id', authenticateAdmin, requirePermission('PRODUCT_EDIT'), deleteDesignAddon);

// C. Product Design Mapping
router.get('/admin/design-services/mapping/:productId', authenticateAdmin, getProductDesignMapping);
router.put('/admin/design-services/mapping/:productId', authenticateAdmin, requirePermission('PRODUCT_EDIT'), updateProductDesignMapping);
router.post('/admin/design-services/mapping/bulk-assign', authenticateAdmin, requirePermission('PRODUCT_EDIT'), bulkAssignPackages);

// D. Design Orders (Design Job Hub)
router.get('/admin/design-services/orders', authenticateAdmin, requirePermission('ORDER_VIEW'), getDesignOrders);
router.get('/admin/design-services/orders/:id', authenticateAdmin, requirePermission('ORDER_VIEW'), getDesignOrderById);
router.put('/admin/design-services/orders/:id/assign', authenticateAdmin, requirePermission('ORDER_UPDATE'), assignDesigner);
router.put('/admin/design-services/orders/:id/priority', authenticateAdmin, requirePermission('ORDER_UPDATE'), updateDesignOrderPriority);
router.post('/admin/design-services/orders/:id/drafts', authenticateAdmin, requirePermission('ORDER_UPDATE'), uploadDraftRevision);
router.post('/admin/design-services/orders/:id/approve', authenticateAdmin, requirePermission('ORDER_UPDATE'), approveDesign);
router.post('/admin/design-services/orders/:id/final-files', authenticateAdmin, requirePermission('ORDER_UPDATE'), uploadFinalFiles);

// E. Design Settings
router.get('/admin/design-services/settings', authenticateAdmin, requirePermission('SETTINGS_EDIT'), getDesignSettings);
router.put('/admin/design-services/settings', authenticateAdmin, requirePermission('SETTINGS_EDIT'), updateDesignSettings);

// Backwards compatibility aliases
router.get('/admin/design-packages', authenticateAdmin, getDesignPackages);
router.post('/admin/design-packages', authenticateAdmin, requirePermission('PRODUCT_EDIT'), createDesignPackage);
router.put('/admin/design-packages/:id', authenticateAdmin, requirePermission('PRODUCT_EDIT'), updateDesignPackage);
router.delete('/admin/design-packages/:id', authenticateAdmin, requirePermission('PRODUCT_EDIT'), deleteDesignPackage);

// Category CMS
router.get('/admin/categories', authenticateAdmin, getAdminCategories);
router.post('/admin/categories', authenticateAdmin, requirePermission('CATEGORY_EDIT'), createCategory);
router.put('/admin/categories/:id', authenticateAdmin, requirePermission('CATEGORY_EDIT'), updateCategory);
router.delete('/admin/categories/:id', authenticateAdmin, requirePermission('CATEGORY_EDIT'), deleteCategory);

// Banner CMS
router.get('/admin/banners', authenticateAdmin, getAdminBanners);
router.post('/admin/banners', authenticateAdmin, requirePermission('BANNER_EDIT'), createBanner);
router.put('/admin/banners/:id', authenticateAdmin, requirePermission('BANNER_EDIT'), updateBanner);
router.delete('/admin/banners/:id', authenticateAdmin, requirePermission('BANNER_EDIT'), deleteBanner);

// Order Management
router.get('/admin/orders', authenticateAdmin, requirePermission('ORDER_VIEW'), getAdminOrders);
router.get('/admin/orders/:id', authenticateAdmin, requirePermission('ORDER_VIEW'), getAdminOrderById);
router.put('/admin/orders/:id/status', authenticateAdmin, requirePermission('ORDER_UPDATE'), updateOrderStatus);
router.post('/admin/orders/:id/notes', authenticateAdmin, requirePermission('ORDER_UPDATE'), addOrderNote);

// Workflow
router.get('/admin/workflow/board', authenticateAdmin, requirePermission('ORDER_VIEW'), getWorkflowBoard);
router.post('/admin/orders/:id/handover', authenticateAdmin, requirePermission('ORDER_UPDATE'), handoverOrder);
router.post('/admin/orders/:id/pre-production-qc', authenticateAdmin, requirePermission('ORDER_UPDATE'), submitPreProductionQC);
router.post('/admin/orders/:id/artwork-review', authenticateAdmin, requirePermission('ORDER_UPDATE'), reviewArtwork);

// Production Job Desk
router.get('/admin/production/jobs', authenticateAdmin, requirePermission('ORDER_VIEW'), getProductionJobs);
router.get('/admin/production/jobs/:id', authenticateAdmin, requirePermission('ORDER_VIEW'), getProductionJobById);
router.put('/admin/production/jobs/:id/stage', authenticateAdmin, requirePermission('ORDER_UPDATE'), updateProductionJobStage);

// Quality Check (QC) Desk
router.get('/admin/qc/queue', authenticateAdmin, requirePermission('ORDER_VIEW'), getQCQueue);
router.post('/admin/qc/:id/inspect', authenticateAdmin, requirePermission('ORDER_UPDATE'), submitQCInspection);

// Packaging, Delivery & Logistics Desk
router.get('/admin/logistics/queue', authenticateAdmin, requirePermission('ORDER_VIEW'), getLogisticsQueue);
router.post('/admin/logistics/orders/:orderId/pack', authenticateAdmin, requirePermission('ORDER_UPDATE'), completePacking);
router.post('/admin/logistics/orders/:orderId/dispatch-courier', authenticateAdmin, requirePermission('ORDER_UPDATE'), dispatchCourier);
router.post('/admin/logistics/orders/:orderId/handover-pickup', authenticateAdmin, requirePermission('ORDER_UPDATE'), handoverStorePickup);
router.post('/admin/logistics/orders/:orderId/mark-delivered', authenticateAdmin, requirePermission('ORDER_UPDATE'), markCourierDelivered);

// Tax Invoice
router.post('/admin/orders/:orderId/generate-tax-invoice', authenticateAdmin, requirePermission('ORDER_UPDATE'), generateTaxInvoice);

// ==========================================
// PHASE 4: FRONT OFFICE & OMNICHANNEL POS
// ==========================================
router.get('/admin/pos/customers/search', authenticateAdmin, requirePermission('CUSTOMER_VIEW'), searchCustomers);
router.post('/admin/pos/customers', authenticateAdmin, requirePermission('CUSTOMER_VIEW'), createQuickCustomer);
router.post('/admin/pos/verify-manager-pin', authenticateAdmin, verifyManagerPin);
router.post('/admin/pos/orders', authenticateAdmin, requirePermission('ORDER_UPDATE'), createWalkInOrder);
router.get('/admin/pos/dashboard', authenticateAdmin, requirePermission('REPORT_VIEW'), getFrontOfficeDashboard);

// Route aliases for /front-office prefix
router.get('/front-office/customers/search', authenticateAdmin, requirePermission('CUSTOMER_VIEW'), searchCustomers);
router.post('/front-office/customers', authenticateAdmin, requirePermission('CUSTOMER_VIEW'), createQuickCustomer);
router.post('/front-office/verify-manager-pin', authenticateAdmin, verifyManagerPin);
router.post('/front-office/orders', authenticateAdmin, requirePermission('ORDER_UPDATE'), createWalkInOrder);
router.get('/front-office/dashboard', authenticateAdmin, requirePermission('REPORT_VIEW'), getFrontOfficeDashboard);

// Media & Video Upload (Admin - Supabase Storage & Local Fallback)
router.post('/admin/upload', authenticateAdmin, (req, res) => {
  upload.any()(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    }
    const files = req.files || [];
    if (!files.length && req.file) files.push(req.file);

    if (!files.length) {
      return res.status(400).json({ success: false, message: 'No media file uploaded.' });
    }

    try {
      const uploadResults = await Promise.all(
        files.map((file) => uploadToStorage({ file, bucket: 'product-media', folder: 'products' }))
      );

      if (uploadResults.length === 1) {
        const single = uploadResults[0];
        return res.json({
          success: true,
          url: single.url,
          imageUrl: single.imageUrl,
          filename: single.filename,
          storageType: single.storageType,
        });
      }

      return res.json({
        success: true,
        data: uploadResults,
        urls: uploadResults.map((r) => r.url),
      });
    } catch (uploadError) {
      console.error('Error handling upload:', uploadError);
      return res.status(500).json({ success: false, message: 'Failed to process media file.' });
    }
  });
});

// Settings & Audit Logs
router.get('/admin/settings', authenticateAdmin, requirePermission('SETTINGS_EDIT'), getSettings);
router.put('/admin/settings', authenticateAdmin, requirePermission('SETTINGS_EDIT'), updateSettings);
router.get('/admin/audit-logs', authenticateAdmin, requirePermission('SETTINGS_EDIT'), getAuditLogs);
router.get('/admin/settings/footer', authenticateAdmin, requirePermission('SETTINGS_EDIT'), getAdminFooter);
router.put('/admin/settings/footer', authenticateAdmin, requirePermission('SETTINGS_EDIT'), updateAdminFooter);
router.post('/admin/settings/footer/reset', authenticateAdmin, requirePermission('SETTINGS_EDIT'), resetAdminFooter);
router.get('/admin/settings/business-info', authenticateAdmin, requirePermission('SETTINGS_EDIT'), getAdminBusinessInfo);
router.put('/admin/settings/business-info', authenticateAdmin, requirePermission('SETTINGS_EDIT'), updateAdminBusinessInfo);
router.post('/admin/settings/business-info/reset', authenticateAdmin, requirePermission('SETTINGS_EDIT'), resetAdminBusinessInfo);

// In-House Staff Management (Admin)
router.get('/admin/staff', authenticateAdmin, requirePermission('USER_MANAGE'), getStaffList);
router.post('/admin/staff', authenticateAdmin, requirePermission('USER_MANAGE'), createStaff);
router.put('/admin/staff/:id', authenticateAdmin, requirePermission('USER_MANAGE'), updateStaff);
router.delete('/admin/staff/:id', authenticateAdmin, requirePermission('USER_MANAGE'), deleteStaff);

export default router;

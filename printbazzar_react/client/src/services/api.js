// Prefer same-origin /api/v1 so Vercel rewrites proxy transparently to live Render backend with zero CORS/cookie issues
const API_BASE_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/api/v1`
  : (import.meta.env.VITE_API_URL || 'https://printbazzar-api.onrender.com/api/v1');

function getCsrfToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

let isRefreshingAdmin = false;
let isRefreshingCustomer = false;

async function request(endpoint, options = {}, isRetry = false) {
  const adminToken = typeof localStorage !== 'undefined' ? localStorage.getItem('pb_admin_token') : null;
  const customerToken = typeof localStorage !== 'undefined' ? localStorage.getItem('pb_customer_token') : null;
  const token = endpoint.startsWith('/customer/account') ? customerToken : (adminToken || customerToken);

  const method = (options.method || 'GET').toUpperCase();
  const csrfToken = getCsrfToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? { 'X-CSRF-Token': csrfToken } : {}),
    ...options.headers,
  };

  const config = {
    credentials: 'include', // Automatically sends and receives HttpOnly cookies
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await res.json();

    // Transparent 401 session recovery via refresh token
    if (res.status === 401 && !isRetry) {
      if (endpoint.startsWith('/admin') && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        if (!isRefreshingAdmin) {
          isRefreshingAdmin = true;
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/admin/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken() } : {}),
              },
            });
            const refreshData = await refreshRes.json();
            if (refreshData.success && refreshData.token) {
              if (typeof localStorage !== 'undefined') localStorage.setItem('pb_admin_token', refreshData.token);
              isRefreshingAdmin = false;
              return request(endpoint, options, true);
            }
          } catch (e) {
            // refresh failed
          } finally {
            isRefreshingAdmin = false;
          }
        }
      } else if (endpoint.startsWith('/customer') && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/signup')) {
        if (!isRefreshingCustomer) {
          isRefreshingCustomer = true;
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/customer/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken() } : {}),
              },
            });
            const refreshData = await refreshRes.json();
            if (refreshData.success && refreshData.token) {
              if (typeof localStorage !== 'undefined') localStorage.setItem('pb_customer_token', refreshData.token);
              isRefreshingCustomer = false;
              return request(endpoint, options, true);
            }
          } catch (e) {
            // refresh failed
          } finally {
            isRefreshingCustomer = false;
          }
        }
      }
    }

    if (!res.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  } catch (error) {
    console.error(`API error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Public Catalog
  getCategories: () => request('/categories'),
  getCategoryBySlug: (slug) => request(`/categories/${slug}`),
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ''}`);
  },
  getProductBySlug: (slug) => request(`/products/${slug}`),
  calculatePrice: (data) => request('/products/calculate-price', { method: 'POST', body: data }),
  getBanners: () => request('/banners'),
  getReviews: () => request('/reviews'),
  getPublicSettings: () => request('/settings/public'),

  // Orders
  createOrder: (orderData) => request('/orders', { method: 'POST', body: orderData }),
  trackOrder: (orderIdentifier) => request(`/orders/track/${encodeURIComponent(orderIdentifier)}`),
  uploadArtwork: async (file) => {
    const formData = new FormData();
    formData.append('artwork', file);
    const csrf = getCsrfToken();
    const res = await fetch(`${API_BASE_URL}/orders/upload-artwork`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Artwork upload failed');
    return data;
  },

  // Admin Auth
  adminLogin: (credentials) => request('/admin/auth/login', { method: 'POST', body: credentials }),
  adminRefreshToken: () => request('/admin/auth/refresh', { method: 'POST' }),
  adminLogout: () => request('/admin/auth/logout', { method: 'POST' }),
  getAdminProfile: () => request('/admin/auth/me'),

  // Admin Dashboard
  getDashboardKPIs: () => request('/admin/dashboard/kpis'),

  // Admin Products
  getAdminProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/products${query ? `?${query}` : ''}`);
  },
  createProduct: (productData) => request('/admin/products', { method: 'POST', body: productData }),
  updateProduct: (id, productData) => request(`/admin/products/${id}`, { method: 'PUT', body: productData }),
  duplicateProduct: (id) => request(`/admin/products/${id}/duplicate`, { method: 'POST' }),
  deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),

  // Admin Categories
  getAdminCategories: () => request('/admin/categories'),
  createCategory: (data) => request('/admin/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => request(`/admin/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),

  // Admin Banners
  getAdminBanners: () => request('/admin/banners'),
  createBanner: (data) => request('/admin/banners', { method: 'POST', body: data }),
  updateBanner: (id, data) => request(`/admin/banners/${id}`, { method: 'PUT', body: data }),
  deleteBanner: (id) => request(`/admin/banners/${id}`, { method: 'DELETE' }),

  // Admin Orders
  getAdminOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/orders${query ? `?${query}` : ''}`);
  },
  getAdminOrderById: (id) => request(`/admin/orders/${id}`),
  updateOrderStatus: (id, statusData) => request(`/admin/orders/${id}/status`, { method: 'PUT', body: statusData }),
  addOrderNote: (id, noteData) => request(`/admin/orders/${id}/notes`, { method: 'POST', body: noteData }),

  // Admin Media Upload
  uploadMedia: async (file) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('pb_admin_token') : null;
    const formData = new FormData();
    formData.append('image', file);
    const csrf = getCsrfToken();
    const res = await fetch(`${API_BASE_URL}/admin/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Media upload failed');
    return data;
  },

  // Public Store & Gateway Settings
  getPublicSettings: () => request('/settings/public'),
  getPublicFooterSettings: () => request('/settings/footer'),
  getPublicBusinessInfo: () => request('/settings/business-info'),

  // Payment Gateway Verification (Online Orders & Milestone Payments)
  createPaymentSession: (data) => request('/payments/create-order', { method: 'POST', body: data }),
  verifyPayment: (data) => request('/payments/verify', { method: 'POST', body: data }),

  // Admin Settings & Audit
  getSettings: () => request('/admin/settings'),
  updateSettings: (settingsData) => request('/admin/settings', { method: 'PUT', body: settingsData }),
  getAuditLogs: () => request('/admin/audit-logs'),

  // Dynamic Footer Management (Admin)
  getAdminFooterSettings: () => request('/admin/settings/footer'),
  updateAdminFooterSettings: (footerData) => request('/admin/settings/footer', { method: 'PUT', body: footerData }),
  resetAdminFooterSettings: () => request('/admin/settings/footer/reset', { method: 'POST' }),

  // Centralized Business Information & Compliance (Admin)
  getAdminBusinessInfo: () => request('/admin/settings/business-info'),
  updateAdminBusinessInfo: (data) => request('/admin/settings/business-info', { method: 'PUT', body: data }),
  resetAdminBusinessInfo: () => request('/admin/settings/business-info/reset', { method: 'POST' }),

  // Multi-Department ERP Workflow & Handover
  getWorkflowBoard: () => request('/admin/workflow/board'),
  handoverOrder: (id, handoverData) => request(`/admin/orders/${id}/handover`, { method: 'POST', body: handoverData }),

  // Customer Auth & Portal (B2B & B2C)
  customerSignup: (data) => request('/customer/auth/signup', { method: 'POST', body: data }),
  customerLogin: (data) => request('/customer/auth/login', { method: 'POST', body: data }),
  customerRefreshToken: () => request('/customer/auth/refresh', { method: 'POST' }),
  customerLogout: () => request('/customer/auth/logout', { method: 'POST' }),
  getCustomerProfile: () => request('/customer/account/profile'),
  getCustomerOrders: () => request('/customer/account/orders'),
  addCustomerAddress: (data) => request('/customer/account/addresses', { method: 'POST', body: data }),
  reorderPreviousOrder: (orderId) => request(`/customer/account/reorder/${orderId}`, { method: 'POST' }),

  // Customer Proof Approval
  approveCustomerProof: (orderNumber, payload) =>
    request(`/orders/${orderNumber}/approve-proof`, { method: 'POST', body: payload }),

  // In-House Staff Management (Admin)
  getStaffList: () => request('/admin/staff'),
  createStaff: (data) => request('/admin/staff', { method: 'POST', body: data }),
  updateStaff: (id, data) => request(`/admin/staff/${id}`, { method: 'PUT', body: data }),
  deleteStaff: (id) => request(`/admin/staff/${id}`, { method: 'DELETE' }),

  // Phase 16: Customer Artwork & Design Assets Upload
  uploadArtworkFile: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.productId) formData.append('productId', options.productId);
    if (options.customerId) formData.append('customerId', options.customerId);
    if (options.purpose) formData.append('purpose', options.purpose);

    const csrf = getCsrfToken();
    const res = await fetch(`${API_BASE_URL}/artwork/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'File upload failed');
    return data;
  },
  deleteArtworkFile: (uploadId) => request(`/artwork/${uploadId}`, { method: 'DELETE' }),

  // ==========================================
  // DESIGN SERVICES & PACKAGES (PUBLIC & STOREFRONT)
  // ==========================================
  getDesignPackages: (productId) => request(`/design-services/packages${productId ? `?productId=${productId}&activeOnly=true` : ''}`),
  getDesignAddons: () => request('/design-services/addons?activeOnly=true'),
  getProductDesignMapping: (productId) => request(`/design-services/product/${productId}`),
  submitDesignFeedback: (orderId, data) => request(`/design-orders/${orderId}/feedback`, { method: 'POST', body: data }),
  approveDesignProof: (orderId, data) => request(`/design-orders/${orderId}/approve`, { method: 'POST', body: data }),

  // ==========================================
  // CENTRALIZED DESIGN SERVICES (ADMIN CONTROL PANEL)
  // ==========================================
  // A. Design Packages
  getAdminDesignPackages: (params) => request(`/admin/design-services/packages${params ? `?${new URLSearchParams(params)}` : ''}`),
  createDesignPackage: (data) => request('/admin/design-services/packages', { method: 'POST', body: data }),
  updateDesignPackage: (id, data) => request(`/admin/design-services/packages/${id}`, { method: 'PUT', body: data }),
  duplicateDesignPackage: (id) => request(`/admin/design-services/packages/${id}/duplicate`, { method: 'POST' }),
  deleteDesignPackage: (id) => request(`/admin/design-services/packages/${id}`, { method: 'DELETE' }),
  reorderDesignPackages: (orderedIds) => request('/admin/design-services/packages/reorder', { method: 'POST', body: { orderedIds } }),

  // B. Design Add-ons
  getAdminDesignAddons: () => request('/admin/design-services/addons'),
  createDesignAddon: (data) => request('/admin/design-services/addons', { method: 'POST', body: data }),
  updateDesignAddon: (id, data) => request(`/admin/design-services/addons/${id}`, { method: 'PUT', body: data }),
  deleteDesignAddon: (id) => request(`/admin/design-services/addons/${id}`, { method: 'DELETE' }),

  // C. Product Design Mapping
  getAdminProductMapping: (productId) => request(`/admin/design-services/mapping/${productId}`),
  updateAdminProductMapping: (productId, data) => request(`/admin/design-services/mapping/${productId}`, { method: 'PUT', body: data }),
  bulkAssignPackages: (data) => request('/admin/design-services/mapping/bulk-assign', { method: 'POST', body: data }),

  // D. Design Orders (Design Job Hub)
  getAdminDesignOrders: (params = {}) => request(`/admin/design-services/orders?${new URLSearchParams(params)}`),
  getAdminDesignOrderById: (id) => request(`/admin/design-services/orders/${id}`),
  assignDesigner: (id, designerId) => request(`/admin/design-services/orders/${id}/assign`, { method: 'PUT', body: { designerId } }),
  updateDesignOrderPriority: (id, data) => request(`/admin/design-services/orders/${id}/priority`, { method: 'PUT', body: data }),
  uploadDraftRevision: (id, data) => request(`/admin/design-services/orders/${id}/drafts`, { method: 'POST', body: data }),
  adminApproveDesign: (id, data) => request(`/admin/design-services/orders/${id}/approve`, { method: 'POST', body: data }),
  uploadFinalFiles: (id, data) => request(`/admin/design-services/orders/${id}/final-files`, { method: 'POST', body: data }),

  // E. Design Settings
  getDesignSettings: () => request('/admin/design-services/settings'),
  updateDesignSettings: (data) => request('/admin/design-services/settings', { method: 'PUT', body: data }),

  // ==========================================
  // INVOICE & RECEIPTS (PUBLIC & ADMIN)
  // ==========================================
  getOrderInvoice: (orderId) => request(`/orders/${orderId}/invoice`),
  generateTaxInvoice: (orderId) => request(`/admin/orders/${orderId}/generate-tax-invoice`, { method: 'POST' }),

  // ==========================================
  // PRODUCTION JOB DESK (ADMIN)
  // ==========================================
  getProductionJobs: (params = {}) => request(`/admin/production/jobs?${new URLSearchParams(params)}`),
  getProductionJobById: (id) => request(`/admin/production/jobs/${id}`),
  updateProductionJobStage: (id, data) => request(`/admin/production/jobs/${id}/stage`, { method: 'PUT', body: data }),

  // ==========================================
  // QUALITY CHECK (QC) DESK (ADMIN)
  // ==========================================
  getQCQueue: (params = {}) => request(`/admin/qc/queue?${new URLSearchParams(params)}`),
  submitQCInspection: (id, data) => request(`/admin/qc/${id}/inspect`, { method: 'POST', body: data }),

  // ==========================================
  // LOGISTICS & PACKING DESK (ADMIN)
  // ==========================================
  getLogisticsQueue: (params = {}) => request(`/admin/logistics/queue?${new URLSearchParams(params)}`),
  completePacking: (orderId, data) => request(`/admin/logistics/orders/${orderId}/pack`, { method: 'POST', body: data }),
  dispatchCourier: (orderId, data) => request(`/admin/logistics/orders/${orderId}/dispatch-courier`, { method: 'POST', body: data }),
  handoverStorePickup: (orderId, data) => request(`/admin/logistics/orders/${orderId}/handover-pickup`, { method: 'POST', body: data }),
  markCourierDelivered: (orderId, data) => request(`/admin/logistics/orders/${orderId}/mark-delivered`, { method: 'POST', body: data }),

  // ==========================================
  // DYNAMIC OPTION MASTERS & PRODUCT PRICING CONFIGURATION (ADMIN)
  // ==========================================
  getOptionMasters: () => request('/admin/option-masters'),
  createOptionMaster: (data) => request('/admin/option-masters', { method: 'POST', body: data }),
  updateOptionMaster: (id, data) => request(`/admin/option-masters/${id}`, { method: 'PUT', body: data }),
  createOptionMasterValue: (masterId, data) => request(`/admin/option-masters/${masterId}/values`, { method: 'POST', body: data }),
  updateOptionMasterValue: (valueId, data) => request(`/admin/option-masters/values/${valueId}`, { method: 'PUT', body: data }),

  getProductConfiguration: (id) => request(`/admin/products/${id}/configuration`),
  updateProductConfiguration: (id, data) => request(`/admin/products/${id}/configuration`, { method: 'PUT', body: data }),
  duplicateProductConfiguration: (id, sourceProductId) => request(`/admin/products/${id}/duplicate-configuration`, { method: 'POST', body: { sourceProductId } }),
  bulkUpdatePricingMatrix: (id, matrixEntries) => request(`/admin/products/${id}/pricing-matrix/bulk`, { method: 'POST', body: { matrixEntries } }),
  saveCompatibilityRule: (id, data) => request(`/admin/products/${id}/compatibility-rules`, { method: 'POST', body: data }),
  deleteCompatibilityRule: (ruleId) => request(`/admin/products/compatibility-rules/${ruleId}`, { method: 'DELETE' }),
  rollbackPriceVersion: (id, versionId) => request(`/admin/products/${id}/price-versions/rollback`, { method: 'POST', body: { versionId } }),
};


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

// Client-Side In-Memory + Persistent Storage Cache & Request Deduplication for Instant Navigation
const apiCache = new Map();
const inFlightRequests = new Map();
const PERSISTENT_CACHE_PREFIX = 'pb_cache_v3_';

function shouldPersistLocally(endpoint) {
  return (
    endpoint.includes('/categories') ||
    endpoint.includes('/products') ||
    endpoint.includes('/banners') ||
    endpoint.includes('/settings/public') ||
    endpoint.includes('/settings/footer') ||
    endpoint.includes('/settings/business-info') ||
    endpoint.includes('/reviews')
  );
}

function getLocalCache(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PERSISTENT_CACHE_PREFIX + key) || (window.sessionStorage && sessionStorage.getItem(PERSISTENT_CACHE_PREFIX + key));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function setLocalCache(key, value) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(PERSISTENT_CACHE_PREFIX + key, serialized);
  } catch (e) {
    // Quota fallback to session
    try {
      if (window.sessionStorage) {
        sessionStorage.setItem(PERSISTENT_CACHE_PREFIX + key, JSON.stringify(value));
      }
    } catch (_) {}
  }
}

export function clearApiCache(prefix = '') {
  if (!prefix) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.includes(prefix)) {
        apiCache.delete(key);
      }
    }
  }

  // Clear persistent cache entries matching prefix
  if (typeof window !== 'undefined') {
    try {
      const storages = [window.localStorage, window.sessionStorage].filter(Boolean);
      for (const storage of storages) {
        const keysToRemove = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(PERSISTENT_CACHE_PREFIX)) {
            if (!prefix || k.includes(prefix)) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach((k) => storage.removeItem(k));
      }
    } catch (e) {}
  }
}

function getCacheTtl(endpoint) {
  if (endpoint.startsWith('/admin')) return 15 * 1000; // 15 seconds for admin queries
  if (
    endpoint.includes('/categories') ||
    endpoint.includes('/settings') ||
    endpoint.includes('/banners') ||
    endpoint.includes('/reviews')
  ) {
    return 5 * 60 * 1000; // 5 minutes fresh TTL
  }
  if (endpoint.includes('/products')) {
    return 3 * 60 * 1000; // 3 minutes fresh TTL for products
  }
  return 30 * 1000; // 30 seconds default for other GETs
}

// Grace window for Stale-While-Revalidate: serve cached copy instantly and refresh quietly
function getStaleGracePeriod(endpoint) {
  if (endpoint.startsWith('/admin') || endpoint.startsWith('/customer/account')) return 0;
  return 15 * 60 * 1000; // 15 minutes SWR window for public catalog
}

async function request(endpoint, options = {}, isRetry = false) {
  const adminToken = typeof localStorage !== 'undefined' ? localStorage.getItem('pb_admin_token') : null;
  const customerToken = typeof localStorage !== 'undefined' ? localStorage.getItem('pb_customer_token') : null;
  const token = endpoint.startsWith('/customer/account') ? customerToken : (adminToken || customerToken);

  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const cacheKey = `${endpoint}__${token || ''}`;

  // Invalidate cache on mutations
  if (!isGet) {
    if (endpoint.includes('/products')) clearApiCache('/products');
    if (endpoint.includes('/categories')) clearApiCache('/categories');
    if (endpoint.includes('/orders')) {
      clearApiCache('/orders');
      clearApiCache('/admin');
      clearApiCache('/customer');
    }
    if (endpoint.includes('/payments')) {
      clearApiCache('/orders');
      clearApiCache('/admin');
      clearApiCache('/customer');
    }
    if (endpoint.includes('/settings')) clearApiCache('/settings');
    if (endpoint.includes('/admin')) clearApiCache('/admin');
  }

  // Cache-First with Stale-While-Revalidate (SWR) for lightning-fast page transitions
  if (isGet && !options.noCache && !isRetry) {
    let cached = apiCache.get(cacheKey);
    if (!cached && shouldPersistLocally(endpoint)) {
      cached = getLocalCache(cacheKey);
      if (cached) {
        apiCache.set(cacheKey, cached);
      }
    }

    if (cached) {
      const age = Date.now() - cached.timestamp;
      const freshTtl = getCacheTtl(endpoint);
      const staleTtl = freshTtl + getStaleGracePeriod(endpoint);

      // Instant 0ms cache hit
      if (age < freshTtl) {
        return Promise.resolve(cached.data);
      }

      // SWR window: Return cached data immediately to UI and revalidate quietly in background
      if (age < staleTtl) {
        if (!inFlightRequests.has(cacheKey)) {
          const bgPromise = executeFetch().catch((err) => {
            console.warn(`Silent background cache refresh failed on ${endpoint}:`, err);
          });
          inFlightRequests.set(cacheKey, bgPromise);
          bgPromise.finally(() => inFlightRequests.delete(cacheKey));
        }
        return Promise.resolve(cached.data);
      }
    }

    // Return in-flight request if already in progress to avoid duplicate network calls
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
  }

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

  const executeFetch = async () => {
    const controller = new AbortController();
    const timeoutDuration = options.timeout || (method === 'POST' ? 25000 : 15000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    const finalConfig = {
      ...config,
      signal: options.signal || controller.signal,
    };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, finalConfig);
      clearTimeout(timeoutId);
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

    if (isGet && res.ok && !options.noCache) {
      const entry = { data, timestamp: Date.now() };
      apiCache.set(cacheKey, entry);
      if (shouldPersistLocally(endpoint)) {
        setLocalCache(cacheKey, entry);
      }
    }

    return data;
  } catch (error) {
    // If public GET request times out or errors during a cold-start, serve stale cached copy if available
    if (isGet && shouldPersistLocally(endpoint)) {
      const fallbackCache = getLocalCache(cacheKey);
      if (fallbackCache && fallbackCache.data) {
        console.warn(`[Cold-Start Recovery] Serving stale cached catalog data for ${endpoint}`);
        return fallbackCache.data;
      }
    }

    if (error.name === 'AbortError') {
      console.warn(`Request timed out on ${endpoint}`);
      throw new Error('Request timed out. Please check your internet connection and try again.');
    }
    console.error(`API error on ${endpoint}:`, error);
    throw error;
  }
};

  const fetchPromise = executeFetch();

  if (isGet && !options.noCache && !isRetry) {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => inFlightRequests.delete(cacheKey));
  }

  return fetchPromise;
}

export const api = {
  // Universal HTTP Helpers (used across Admin Dashboard and dynamic query managers)
  get: (endpoint, options = {}) => {
    let url = endpoint;
    if (options.params) {
      const filtered = Object.entries(options.params).filter(
        ([_, v]) => v !== undefined && v !== null && v !== ''
      );
      if (filtered.length > 0) {
        const qs = new URLSearchParams(filtered).toString();
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return request(url, { ...options, method: 'GET' }).then((resData) => ({
      data: resData,
      success: resData?.success ?? true,
    }));
  },
  post: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: 'POST', body }).then((resData) => ({
      data: resData,
      success: resData?.success ?? true,
    })),
  put: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: 'PUT', body }).then((resData) => ({
      data: resData,
      success: resData?.success ?? true,
    })),
  delete: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'DELETE' }).then((resData) => ({
      data: resData,
      success: resData?.success ?? true,
    })),

  // Public Catalog
  getCategories: () => request('/categories'),
  getCategoryBySlug: (slug, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/categories/${slug}${query ? `?${query}` : ''}`);
  },
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ''}`);
  },
  prefetchCategory: (slug, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/categories/${slug}${query ? `?${query}` : ''}`).catch(() => {});
  },
  prefetchProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ''}`).catch(() => {});
  },
  getProductBySlug: (slug) => request(`/products/${slug}`),
  calculatePrice: (data) => request('/products/calculate-price', { method: 'POST', body: data }),
  getBanners: () => request('/banners'),
  getReviews: () => request('/reviews'),

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
  convertToCod: (data) => request('/payments/convert-to-cod', { method: 'POST', body: data }),

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
  customerGoogleLogin: (data) => request('/customer/auth/google', { method: 'POST', body: data }),
  sendCustomerOtp: (data) => request('/customer/auth/send-otp', { method: 'POST', body: data }),
  verifyCustomerOtp: (data) => request('/customer/auth/verify-otp', { method: 'POST', body: data }),
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

  // Customer Artwork & Design Assets Upload (with Versioning & Preflight Metadata)
  uploadArtworkFile: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.productId) formData.append('productId', options.productId);
    if (options.customerId) formData.append('customerId', options.customerId);
    if (options.cartItemId) formData.append('cartItemId', options.cartItemId);
    if (options.orderId) formData.append('orderId', options.orderId);
    if (options.purpose) formData.append('purpose', options.purpose);
    if (options.preflightStatus) formData.append('preflightStatus', options.preflightStatus);
    if (options.preflightReport) {
      formData.append(
        'preflightReport',
        typeof options.preflightReport === 'string' ? options.preflightReport : JSON.stringify(options.preflightReport)
      );
    }
    if (options.customerAcknowledged !== undefined) {
      formData.append('customerAcknowledged', String(options.customerAcknowledged));
    }
    if (options.dpi) formData.append('dpi', String(options.dpi));
    if (options.width) formData.append('width', String(options.width));
    if (options.height) formData.append('height', String(options.height));

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
  seedDefaultOptionMasters: () => request('/admin/option-masters/seed-defaults', { method: 'POST' }),
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


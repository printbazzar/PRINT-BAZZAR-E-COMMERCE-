# Print Bazzar — Known Issues, Technical Debt & Architectural Notes

---

## 1. Technical Debt & Code Organization

### A. Legacy Product Details Pages (`src/ProductDetails/*.jsx`)
* **Context**: The codebase contains 87 individual product detail templates in `printbazzar_react/client/src/ProductDetails/`. 
* **Current Implementation**: A unified `ProductDetail.jsx` dynamic routing engine was developed and handles modern products via `/product/:slug`. However, the 87 individual static files remain for legacy backward compatibility.
* **Maintenance Note**: All 87 files have been synchronized with `window.__BUSINESS_WHATSAPP__` to dynamically reflect admin business information. In a future refactoring phase, these can be mapped to database-driven templates to reduce the client bundle size.

### B. Client Bundle Size Optimization
* **Context**: The main production bundle is approximately 1.28MB (335kB gzipped).
* **Cause**: Several administrative dashboard modules, Flowbite React modals, and Swiper components are bundled together in the client chunk.
* **Recommendation**: Implement `React.lazy()` dynamic route code-splitting for `/admin/*` routes and manual vendor chunking in `vite.config.js`.

---

## 2. Incomplete Integrations & External Dependencies

### A. Automated Courier Tracking API
* **Current Implementation**: The shipping label system generates compliant thermal packing slips and records courier partner names (e.g. ST Courier, DTDC Express). Staff enter tracking IDs manually.
* **Future Enhancement**: Integrate direct REST API webhooks with DTDC or ST Courier for live automated GPS tracking callbacks.

### B. WhatsApp Business Cloud API Bot
* **Current Implementation**: Uses the universal `https://wa.me/` click-to-chat protocol which opens WhatsApp on customer desktop or mobile with pre-filled order context.
* **Future Enhancement**: Connect Meta's official WhatsApp Business Cloud API or Twilio WhatsApp to send automated automated notification triggers on order state changes.

### C. Paper Stock & Raw Material Inventory Auto-Deduction
* **Current Implementation**: Production jobs track paper stock, GSM, and sheet dimensions on printed job tickets.
* **Limitation**: Press operators physically verify paper reams; the database does not automatically decrement physical warehouse reams based on cut sizes and waste margins.

---

## 3. Temporary Implementations & Workarounds

### A. Localhost Rate Limiter Loopback Exemption
* **Context**: During rapid development and automated verification test runs, the `publicApiLimiter` could throttle localhost requests (120 req / 15 min).
* **Fix Applied**: Added loopback check (`127.0.0.1`, `::1`) in development mode so test suites and local browsing run uninhibited.

### B. Unconfirmed Business Credentials Placeholder Flags
* **Context**: The store's official 15-character GSTIN and UDYAM registration numbers have not yet been provided by the business owner.
* **Status**: The database stores safe initial fallbacks with explicit flags (`isGstinVerified: false`, `gstinRequiresInput: true`) and displays a warning banner in the Admin Panel until the store owner enters verified numbers.

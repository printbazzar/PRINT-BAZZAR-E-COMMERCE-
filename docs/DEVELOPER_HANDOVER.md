# Print Bazzar — Comprehensive Developer Handover Baseline

> **Document Status**: Final Handover Baseline  
> **Tag**: `handover-2026-09-23`  
> **Date**: September 23, 2026  
> **Target Audience**: Incoming Lead Developer / Engineering Team

---

## 1. Project Overview
Print Bazzar is a full-stack, enterprise-grade web application and ERP platform for a high-volume printing and custom merchandise manufacturing business operating out of Tiruchirappalli, Tamil Nadu. The platform includes a customer-facing e-commerce storefront, an admin management portal, production queue & job card management, pre-flight artwork verification, and automated invoicing.

---

## 2. Business Context
- **Business Model**: Omnichannel (B2C retail storefront, B2B commercial print, and POS store counter sales).
- **Fulfillment Facilities**: Main Press Facility in Singarathope, Tiruchirappalli.
- **Key Products**: Business Cards, Marketing Banners, Apparels, Packaging, Invitations, & Custom Print Collateral.
- **Taxation Compliance**: 100% Indian GST compliance (CGST 9% + SGST 9% = 18% inclusive pricing model).

---

## 3. Technology Stack
- **Frontend**: React 18, Vite 6, Tailwind CSS, Flowbite React, React Router v6.
- **Backend**: Node.js 24 (ESM), Express.js 4.
- **Database & ORM**: PostgreSQL (Supabase), Prisma ORM v5.
- **Authentication**: Custom Dual-JWT (Access + Refresh token rotation), Google OAuth 2.0, bcrypt password hashing.
- **Payments**: Razorpay Gateway (Webhooks, HMAC signature verification, idempotency protection).
- **Hosting Infrastructure**: Render (Backend APIs & Workers), Vercel (Frontend SPAs), Supabase (PostgreSQL DB).

---

## 4. Repository Details
- **GitHub Repository**: `https://github.com/printbazzar/PRINT-BAZZAR-E-COMMERCE-.git`
- **Main Branch**: `main` (Production code baseline)
- **Staging Branch**: `staging` (Staging code baseline)
- **Monorepo Directory Structure**:
  - `server/` — Express backend API, Prisma schema, migrations, security middleware, controllers.
  - `printbazzar_react/client/` — Vite + React SPA storefront & admin dashboard UI.
  - `docs/` — Architectural documentation, security audits, and handover guides.

---

## 5. Production Architecture
```
[Production User] -> [Vercel Frontend: https://print-bazzar-e-commerce.vercel.app]
                         |
                         v (Proxy Rewrite /api/*)
                 [Render Production API: https://printbazzar-api.onrender.com]
                         |
                         v (Prisma Client)
                 [Supabase Production PostgreSQL DB]
                         |
                         v (HMAC Signed Webhooks)
                 [Razorpay LIVE Gateway]
```

---

## 6. Staging Architecture
```
[Staging Tester] -> [Vercel Staging Frontend: https://temporary-swift-banjo-uwqh9zv.vercel.app]
                         |
                         v (CORS / Direct Fetch /api/v1)
                 [Render Staging API: https://printbazzar-api-staging.onrender.com]
                         |
                         v (Prisma Client)
                 [Supabase Staging PostgreSQL DB: print-bazzar-staging]
                         |
                         v (HMAC Signed Webhooks)
                 [Razorpay TEST Gateway]
```

---

## 7. Environment Separation
- **Strict Isolation**: Production and Staging environments share zero infrastructure, zero database instances, zero API keys, and zero payment gateway secrets.
- **Database Host Verification**:
  - Production DB ref: `aws-0-ap-south-1` (Mumbai)
  - Staging DB ref: `cfdonwgbbye...` (Singapore `aws-0-ap-southeast-1`)
- **API URL Resolution**:
  - `api.js` dynamically checks `import.meta.env.VITE_API_URL` and `window.location.hostname`. On staging hosts, it automatically targets `https://printbazzar-api-staging.onrender.com/api/v1`.

---

## 8. Authentication Architecture
- **Dual JWT Token System**:
  - `AccessToken` (short-lived, 15 min): Transmitted via `Authorization: Bearer <token>` header.
  - `RefreshToken` (long-lived, 7 days): Transmitted via HTTP-only, SameSite=Strict cookie or auth payload.
- **Token Domain Separation**: Separate secrets and token claims for `CUSTOMER` vs `STAFF`/`ADMIN` logins.
- **Refresh Token Rotation**: Automatic token family invalidation upon reuse detection, with a 10-second concurrency grace window.

---

## 9. Security Baseline
- **CSRF Protection**: Double Submit Cookie pattern (`XSRF-TOKEN`).
- **Helmet Security Headers**: Strict CSP, HSTS, X-Content-Type-Options, X-Frame-Options.
- **Rate Limiting**: Express rate limiters applied to `/api/auth/login`, `/api/auth/otp/*`, and checkout endpoints.
- **Password Hardening**: Lockout after 5 failed login attempts for 15 minutes.
- **OTP Hardening**: Argon2/SHA-256 HMAC hashed OTP storage, 5-minute expiry, max 3 verification attempts per OTP.

---

## 10. Database Architecture
- **Database Engine**: PostgreSQL on Supabase.
- **ORM**: Prisma ORM with connection pooling via PgBouncer.
- **Key Tables**: `User` (Customers & Staff), `Product`, `Category`, `PriceSlab`, `Order`, `OrderItem`, `Shipment`, `Payment`, `OrderStatusHistory`, `JobCard`, `AuditLog`.

---

## 11. Prisma Migration Instructions
- **Applying Migrations (Dev/Staging)**:
  ```bash
  cd server
  npx prisma migrate dev --name <migration_name>
  ```
- **Deploying Migrations (Production)**:
  ```bash
  cd server
  npx prisma migrate deploy
  ```
- **Generating Client**:
  ```bash
  npx prisma generate
  ```

---

## 12. Product & Pricing Architecture
- **Canonical Tiered Quantity Pricing**: Products feature tiered price slabs (`minQuantity`, `maxQuantity`, `unitPrice`).
- **Options & Addons**: Additional options (paper weight, coating, finish, orientation) adjust unit pricing dynamically via `pricingEngine.js`.

---

## 13. GST Architecture
- **GST Rate**: 18% (9% CGST + 9% SGST).
- **Inclusive Tax Computation Formula**:
  - `Taxable Subtotal = Total Price / 1.18`
  - `Total Tax (18%) = Total Price - Taxable Subtotal`
  - `CGST (9%) = Total Tax / 2`
  - `SGST (9%) = Total Tax / 2`
  *(Implemented in server `orderController.js` and client `gstDisplay.js`)*.

---

## 14. Cart & Checkout Flow
1. Items added to `CartContext` with selected quantity, options, and artwork specs.
2. Checkout page validates recipient details and sanitizes mobile numbers to 10 digits (`.slice(-10)`).
3. Checkout posts payload to `POST /api/orders`.
4. Order created in `PAYMENT_PENDING` status.
5. Checkout triggers `POST /api/payments/create-order` to generate Razorpay Gateway order.

---

## 15. Order Lifecycle
`PAYMENT_PENDING` → `PAID / CONFIRMED` → `PROCESSING` → `PRINTING` → `QC_PASSED` → `SHIPPED / READY_FOR_PICKUP` → `DELIVERED`.

---

## 16. Razorpay Integration
- **Server API**: `POST /api/payments/create-order`, `POST /api/payments/verify`.
- **HMAC Verification**: Signatures verified using `crypto.createHmac('sha256', secret)`.
- **Payment Modes**: Supports Full Payment and 50% Design Split Payment.

---

## 17. Webhook Flow
- **Webhook Endpoint**: `POST /api/payments/webhook`
- **Supported Events**: `payment.captured`, `order.paid`, `payment.failed`, `payment.authorized`.
- **Idempotency**: Webhook events checked against `Payment` table `gatewayPaymentId` to prevent duplicate processing.

---

## 18. Admin / ERP Architecture
- Admin portal accessible via `/admin`.
- Role-based Access Control (`ADMIN`, `MANAGER`, `STAFF`, `OPERATOR`).
- Modules: Orders, POS Counter Sales, Price Management, Product Configurator, Production Workflow Board, Audit Logs.

---

## 19. Production Workflow
- Automatically generates `JobCard` records upon order confirmation.
- QC Verification modal before pre-production dispatch.
- Automated Job Slip / Shipping Label PDF generation.

---

## 20. Frontend UX Architecture
- Component-driven React SPA.
- Optimized mobile-first responsive layout.
- Clear error notifications and loading skeletons.

---

## 21. Current Bugs & Fixes
- **Fixed**: Order creation failure due to un-sanitized `+91` mobile numbers (Commit `8829e07`).
- **Fixed**: Unsafe `item.product.id` property access in Checkout.jsx (Commit `8829e07`).
- **Fixed**: Staging API destination resolution in Vite client (Commit `7706a9a`).
- **Fixed**: Baseline Prisma migration for fresh database setups (Commit `d1c7b9f`).

---

## 22. Known Limitations
- Interactive Razorpay payment completion requires manual test checkout in staging.
- SMS OTP provider relies on SIMULATOR in dev/staging.

---

## 23. Remaining Development Work
- Complete full end-to-end interactive Razorpay TEST payment cycle on staging.
- Finalize production deployment procedures.
- Conduct final regression suite.

---

## 24. Testing Status
- **Backend Security Tests**: PASSED (Phase 0 Auth & OTP test suites).
- **Direct Staging API Order Test**: PASSED (HTTP 201 Created).
- **Direct Staging Payment Session Test**: PASSED (HTTP 200 OK).
- **Interactive Payment Checkout Test**: PENDING HANDOVER.

---

## 25. Deployment Procedure
1. Verify all tests pass locally.
2. Push commit to `main` branch on GitHub.
3. Render automatically builds and deploys `server/`.
4. Vercel automatically builds and deploys `printbazzar_react/client/`.

---

## 26. Rollback Procedure
- Render: Use Render dashboard to roll back to the previous successful deploy tag.
- Vercel: Promote the previous deployment ID to Production in Vercel dashboard.

---

## 27. Environment Variable Names
Refer to `.env.example` in the project root for the complete list of required environment variables.

---

## 28. Secret-Handling Rules
1. NEVER commit API keys, secrets, or passwords to git.
2. NEVER print secrets into application logs.
3. Keep production credentials strictly inside Render / Vercel environment variables.

---

## 29. Developer Acceptance Criteria
- Code builds cleanly without errors.
- Database migrations execute without conflicts.
- Order creation accepts 10-digit sanitized mobile numbers.
- Staging API points to `printbazzar-api-staging.onrender.com`.

---

## 30. Final Handover Checklist
- [x] Full Git Audit completed.
- [x] Existing user frontend work preserved.
- [x] Key commits verified (`d1c7b9f`, `8829e07`, `7706a9a`).
- [x] Staging architecture verified & operational.
- [x] Environment variable template created (`.env.example`).
- [x] Handover documentation complete.

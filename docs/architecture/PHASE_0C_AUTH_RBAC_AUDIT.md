# PRINT BAZZAR — PHASE 0C AUTHENTICATION & RBAC READ-ONLY DESIGN AUDIT

**Date:** 2026-09-19  
**Status:** READ-ONLY DESIGN AUDIT COMPLETE  
**Scope:** Phase 0C Authentication & Role-Based Access Control (RBAC)  
**Target:** Audit existing authentication flows, session management, token issuance, RBAC implementation, endpoint route guards, ownership checks, and privilege escalation vulnerabilities to establish a production-grade, multi-tenant-ready RBAC architecture.

---

## 1. Executive Summary

A comprehensive read-only audit of the Print Bazzar authentication and authorization infrastructure was conducted across all backend routes (`server/src/routes/api.js`), controllers (`authController.js`, `customerAuthController.js`, `staffController.js`, `adminController.js`, `orderController.js`, `invoiceController.js`, etc.), middleware (`server/src/middleware/auth.js`), session services (`sessionService.js`), configuration (`jwt.js`, `cookies.js`, `otpConfig.js`), and database models (`User`, `Role`, `Permission`, `Customer`, `AuthSession`, `Order`).

While Phase 0A successfully established a centralized Prisma Client singleton (`lib/prisma.js`) and boot-time environment validation (`envValidator.js`), the authentication and authorization layer contains multiple **Critical and High security vulnerabilities**:

1. **Unprotected Endpoint Vulnerabilities:** Critical business operations (e.g. `POST /payments/convert-to-cod`, `POST /orders/upload-artwork`, `POST /orders/:orderNumber/approve-proof`, `POST /design-orders/:id/feedback`, `POST /design-orders/:id/approve`) lack authentication and authorization middleware entirely.
2. **Missing Ownership Checks (IDOR / Horizontal Privilege Escalation):** Authenticated customers can view and download invoices (`GET /orders/:orderId/invoice`), track orders (`GET /orders/track/:orderIdentifier`), or delete artwork (`DELETE /artwork/:id`) for orders belonging to other customers because ownership validation is inconsistent or missing.
3. **Department Isolation Gaps:** Staff members assigned to specific departments (e.g. `PRODUCTION`, `FINISHING_QC`, `DELIVERY`) can perform operations across other departments or access administrative settings because department scoping is not systematically enforced by route middleware.
4. **Single JWT Secret Vulnerability:** Access tokens (15-minute validity) and refresh tokens (7-day validity) share the same `JWT_SECRET`, blurring token family boundaries.
5. **Plaintext OTP Storage & Dev Bypass in Code:** OTP codes (`customer.otpCode`) are stored in plaintext in PostgreSQL, and non-production mode permits fixed bypass codes (`123456`) without rate limiting.

---

## 2. Current Authentication Architecture

Print Bazzar operates two distinct user populations:
1. **In-House Staff / Admin Users (`User` table):** Authenticated via email/password.
2. **Customers & Corporate Buyers (`Customer` table):** Authenticated via email/password, Google OAuth, or Mobile OTP.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Authentication Entry Points                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ Staff / Admin ]          [ Customer (B2C/B2B) ]        [ Public / Guest ] │
│        │                             │                            │         │
│  POST /admin/auth/login     POST /customer/auth/signup            │         │
│  POST /admin/auth/refresh   POST /customer/auth/login             │         │
│  POST /admin/auth/logout    POST /customer/auth/google            │         │
│  GET  /admin/auth/me        POST /customer/auth/send-otp          │         │
│                             POST /customer/auth/verify-otp        │         │
│                             POST /customer/auth/refresh           │         │
│                             POST /customer/auth/logout            │         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authentication Mechanics Inventory
- **Customer Signup (`POST /customer/auth/signup`):** Registers B2C retail customers or B2B corporate entities (`accountType: 'B2C_RETAIL' | 'B2B_CORPORATE'`). Automatically upgrades guest records if matching mobile/email exists. Hashes passwords using `bcrypt.genSalt(10)`. Issues dual tokens (HttpOnly cookie `pb_cust_access` + JSON body token).
- **Customer Login (`POST /customer/auth/login`):** Authenticates via email or mobile identifier and bcrypt password hash.
- **Customer Google OAuth (`POST /customer/auth/google`):** Verifies Google ID tokens via `google-auth-library` (`googleOAuthClient.verifyIdToken()`). Upserts `Customer` record with `googleId` and `avatarUrl`.
- **Customer Mobile OTP (`POST /customer/auth/send-otp` & `/verify-otp`):** Generates 6-digit numeric OTPs (`Math.floor(100000 + Math.random() * 900000)`). Stores code in plaintext on `customer.otpCode` with 10-minute expiry (`otpExpiresAt`). In non-production environments, permits `'123456'` test code bypass.
- **Staff / Admin Login (`POST /admin/auth/login`):** Authenticates `User` via email and password hash. Loads `User -> Role -> RolePermission -> Permission`. Issues `pb_admin_access` and `pb_admin_refresh` cookies and creates an `AuthSession` record.

---

## 3. JWT & Session Architecture

### JWT Implementation (`server/src/config/jwt.js`)
- **Single Secret:** Both `signAccessToken` and `signRefreshToken` sign payloads using a single secret (`JWT_SECRET`).
- **Algorithm:** Enforces `HS256`.
- **Expirations:** Access tokens expire in `15m`; Refresh tokens expire in `7d`.
- **Token Dual-Delivery:** Tokens are delivered in both HttpOnly, SameSite=Lax cookies (`pb_admin_access`, `pb_admin_refresh`, `pb_cust_access`, `pb_cust_refresh`) and HTTP response JSON bodies for transition compatibility.

### Session Management (`server/src/services/sessionService.js`)
- **Database Model (`AuthSession`):**
  - Columns: `id` (UUID), `userType` (`STAFF` | `CUSTOMER`), `userId`, `customerId`, `tokenHash` (SHA-256 of raw refresh token), `familyId` (UUID for session family), `ipAddress`, `userAgent`, `revoked` (Boolean), `expiresAt`, `lastUsedAt`.
- **Session Rotation & Reuse Detection:**
  - `rotateRefreshSession()` verifies incoming refresh token signature, hashes raw token, and queries `AuthSession` by `tokenHash`.
  - **Reuse Detection Trigger:** If a refresh token is presented whose hash is missing or already marked `revoked: true`, `rotateRefreshSession` revokes **all** sessions sharing the same `familyId` (`revokedReason: 'SUSPECTED_TOKEN_REUSE_ATTACK'`) to neutralize token theft attempts.

---

## 4. Current Roles & Permission Inventory

### Database Schema Models
- **`User` Model:** Contains `id`, `name`, `email`, `passwordHash`, `department` (String, default `"ALL"`), `roleId`, `isActive`.
- **`Role` Model:** Contains `id`, `name` (Unique string e.g. `"Super Admin"`), `description`, `isSystem` (Boolean).
- **`Permission` Model:** Contains `id`, `code` (Unique string e.g. `"PRODUCT_CREATE"`), `module`, `description`.
- **`RolePermission` Model:** Join table linking `roleId` and `permissionId`.

### Current Permission Codes in Codebase
The following 11 permission codes are currently registered and enforced across admin routes:

| Permission Code | Target Module | Endpoints Controlled |
|:---|:---|:---|
| `PRODUCT_CREATE` | Products | `POST /admin/products`, `POST /admin/products/:id/duplicate` |
| `PRODUCT_EDIT` | Catalog & Pricing | `PUT /admin/products/:id`, `PUT /admin/pricing/:id`, `POST /admin/option-masters`, `PUT /admin/products/:id/configuration`, `POST /admin/design-services/packages` |
| `PRODUCT_DELETE` | Products | `DELETE /admin/products/:id` |
| `CATEGORY_EDIT` | Categories | `POST/PUT/DELETE /admin/categories` |
| `BANNER_EDIT` | Banners | `POST/PUT/DELETE /admin/banners` |
| `ORDER_VIEW` | Orders & Production | `GET /admin/orders`, `GET /admin/production/jobs`, `GET /admin/qc/queue`, `GET /admin/logistics/queue`, `GET /admin/design-services/orders` |
| `ORDER_UPDATE` | Orders & Workflow | `PUT /admin/orders/:id/status`, `POST /admin/orders/:id/handover`, `POST /admin/qc/:id/inspect`, `POST /admin/logistics/orders/:id/pack`, `PUT /admin/design-services/orders/:id/assign` |
| `CUSTOMER_VIEW` | POS / Customers | `GET /admin/pos/customers/search`, `POST /admin/pos/customers` |
| `REPORT_VIEW` | Analytics | `GET /admin/pos/dashboard`, `GET /admin/operations/department-dashboard` |
| `SETTINGS_EDIT` | Store Settings | `GET/PUT /admin/settings`, `GET /admin/audit-logs`, `GET/PUT /admin/settings/business-info` |
| `USER_MANAGE` | Staff Management | `GET/POST/PUT/DELETE /admin/staff` |

### Hardcoded Bypasses in Middleware (`server/src/middleware/auth.js`)
- `requirePermission(code)` contains an explicit bypass:
  ```javascript
  if (req.user.role === 'Super Admin') {
    return next();
  }
  ```
- **Super Admin Hardcoding:** Any user assigned role `"Super Admin"` bypasses all permission code checks entirely.

---

## 5. API Authorization Inventory & Security Vulnerability Assessment

The audit reviewed all 92 API routes registered in `server/src/routes/api.js`. The table below highlights key sensitive endpoints and their current authorization posture:

| Endpoint | Method | Purpose | Current Auth Middleware | Current Authorization Check | Security Risk & Classification |
|:---|:---:|:---|:---|:---|:---|
| `/payments/convert-to-cod` | POST | Switch order payment to COD | **None** (Unprotected) | None | **CRITICAL:** Unauthenticated attackers can convert any arbitrary order to COD without payment verification. |
| `/orders/upload-artwork` | POST | Upload print artwork | **None** (Unprotected) | None | **HIGH:** Unauthenticated users can attach arbitrary files to any order. |
| `/orders/:orderNumber/approve-proof` | POST | Approve digital proof | **None** (Unprotected) | None | **HIGH:** Unauthenticated users can approve artwork proofs for orders they do not own. |
| `/design-orders/:id/feedback` | POST | Submit design feedback | **None** (Unprotected) | None | **HIGH:** Anyone can alter design revision feedback on active customer design orders. |
| `/design-orders/:id/approve` | POST | Approve design proof | **None** (Unprotected) | None | **HIGH:** Unauthenticated users can approve design proofs for any order. |
| `/artwork/:id` | DELETE | Delete uploaded artwork file | `authenticateCustomerOrAdmin` | Soft ownership check | **MEDIUM / IDOR:** If `existingUpload.customerId` is null, any authenticated customer can delete it. |
| `/orders/:orderId/invoice` | GET | Download tax invoice | `optionalCustomerOrAdmin` | Manual in controller | **HIGH / IDOR:** Unauthenticated users can access invoices if order is unassigned, or IDOR lookup leaks customer details. |
| `/orders/track/:orderIdentifier` | GET | Track order status | `optionalCustomerOrAdmin` | Manual in controller | **MEDIUM:** Anyone with an order number can track internal status and shipping details. |
| `/admin/staff` | GET/POST | Manage staff accounts | `authenticateAdmin` | `requirePermission('USER_MANAGE')` | **LOW:** Properly protected behind authentication and permission check. |
| `/admin/settings` | GET/PUT | Store settings & secrets | `authenticateAdmin` | `requirePermission('SETTINGS_EDIT')` | **LOW:** Properly protected behind authentication and permission check. |
| `/admin/orders/:id/status` | PUT | Change order status | `authenticateAdmin` | `requirePermission('ORDER_UPDATE')` | **MEDIUM:** Lacks department isolation; production staff can change logistics or invoice statuses. |

---

## 6. Critical Security Weakness Analysis

### 1. Insecure Direct Object Reference (IDOR) & Missing Ownership Checks
- **Invoice Endpoint (`GET /orders/:orderId/invoice`):**
  Uses `optionalCustomerOrAdmin`. If called without credentials or by a customer, `invoiceController.js` attempts manual validation:
  ```javascript
  const isOwner = order.customerId === req.customer.id;
  const isPhoneMatch = order.customerMobile && req.customer.mobile && order.customerMobile.trim() === req.customer.mobile.trim();
  ```
  If `order.customerId` is null (e.g. walk-in or guest checkout), `isOwner` evaluates to `false`, but phone/email fallback checks can be spoofed or bypassed, allowing horizontal privilege escalation.
- **Artwork Deletion (`DELETE /artwork/:id`):**
  In `artworkController.js`, deleting an artwork record checks:
  ```javascript
  if (existingUpload.customerId && existingUpload.customerId !== req.customer.id) {
    return res.status(403).json(...);
  }
  ```
  If `existingUpload.customerId` is null, the check is skipped entirely, permitting any logged-in customer to delete guest artwork.

### 2. Lack of Departmental Isolation for Staff
- Staff accounts are assigned a `department` string (e.g., `"DESIGN"`, `"PRODUCTION"`, `"FINISHING_QC"`, `"PACKING"`, `"DELIVERY"`, `"ALL"`).
- However, standard route guards (`requirePermission('ORDER_UPDATE')`) check only global permissions. A staff member in the `DESIGN` department with `ORDER_UPDATE` permission can call `/admin/logistics/orders/:orderId/dispatch-courier` or `/admin/qc/:id/inspect` even though those actions belong strictly to `PACKING`/`DELIVERY` or `FINISHING_QC`.

### 3. Plaintext OTP Storage & Dev Code Vulnerability
- Mobile OTP codes are generated in `customerAuthController.js` and stored unhashed in `customer.otpCode`. An database leak exposes active OTPs.
- Non-production mode (`process.env.NODE_ENV !== 'production'`) accepts `'123456'` for any mobile number without rate limiting or IP throttling, risking accidental enablement or staging abuse.

---

## 7. Database Model Analysis (`schema.prisma`)

### Current Schema Evaluation
- **`User` Model:** Contains `id`, `name`, `email`, `passwordHash`, `department`, `roleId`, `isActive`. Missing relations to explicit `Department` entity (currently a simple `String` default `"ALL"`).
- **`Role` Model:** System/custom role table. Simple 1:N with `User` and 1:N with `RolePermission`.
- **`Permission` Model:** Global permission codes.
- **`Customer` Model:** Contains `accountType` (`"B2C_RETAIL"` | `"B2B_CORPORATE"`), `companyName`, `gstNumber`, `corporateDiscountPct`, `isVerifiedCorporate`, `otpCode`, `otpExpiresAt`.
- **`AuthSession` Model:** Clean session tracking table with `userType`, `userId`, `customerId`, `tokenHash`, `familyId`, `revoked`, `expiresAt`.

### Missing Security/Authorization Structural Elements
- **No `Department` Entity:** Department names are unconstrained strings; no foreign key or structured department permissions exist.
- **No Resource Scoping / ABAC Metadata:** Roles/permissions cannot be scoped to specific departments, branches, or customer accounts without custom code.
- **No Plaintext OTP Hashing:** Missing hashed OTP field structure.

---

## 8. Recommended Target RBAC Architecture

To achieve production-grade security for D2C retail, D2B corporate accounts, multi-branch ERP staff, and admin management without introducing breaking schema changes, we propose a **Hybrids RBAC + Resource Scope (ABAC)** architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Print Bazzar Target RBAC Model                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Subject               Role                  Permissions & Scopes          │
│   ───────               ────                  ────────────────────          │
│                                                                             │
│ ┌──────────┐          ┌──────────────┐       ┌───────────────────────────┐  │
│ │   User   ├─────────►│  Staff Role  ├──────►│ Permission Codes          │  │
│ └────┬─────┘          └──────────────┘       │ (e.g. ORDER_UPDATE)       │  │
│      │                                       └─────────────┬─────────────┘  │
│      │                                                     │                │
│      │                ┌──────────────┐                     ▼                │
│      └───────────────►│ Department   ├────────► Department Scope Guard      │
│                       │ (DESIGN, etc)│          (Restricts to assigned dept)│
│                       └──────────────┘                                      │
│                                                                             │
│ ┌──────────┐          ┌──────────────┐       ┌───────────────────────────┐  │
│ │ Customer ├─────────►│ Account Type ├──────►│ Resource Ownership Guard │  │
│ └──────────┘          │ (B2C / B2B)  │       │ (Restricts to own orders) │  │
│                       └──────────────┘       └───────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Authorization Principles
1. **Explicit Identity Scoping:** Every authenticated request attaches `req.user` (Staff) or `req.customer` (Customer). Dual/ambiguous requests are strictly disambiguated.
2. **Permission + Scope Enforcement:** Route guards check both global permission code (`requirePermission('ORDER_UPDATE')`) AND resource department scope (`requireDepartment('PRODUCTION')`).
3. **Strict Resource Ownership Guard:** Customer endpoints verify `order.customerId === req.customer.id` (or verified email/mobile match for guest records) before returning sensitive data.

---

## 9. Backward Compatibility Plan

The target authorization model can be introduced seamlessly without breaking existing clients:
- **Cookie & Token Contract:** Preserves existing cookie names (`pb_admin_access`, `pb_cust_access`) and JWT payload structures (`userId`, `customerId`, `role`, `department`).
- **Unified Middleware Compatibility:** Maintains `authenticateAdmin`, `authenticateCustomer`, and `authenticateCustomerOrAdmin` signatures while strengthening internal validation.
- **API Response Shape:** Preserves JSON error response formats (`{ success: false, message: '...' }`).

---

## 10. Phase 0C Implementation Sequence

We recommend executing Phase 0C in **4 controlled sub-phases**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Phase 0C Implementation Roadmap                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ Phase 0C.1 ] Auth & Token Hardening                                      │
│  - Separate JWT Access / Refresh Secrets                                    │
│  - Hash Mobile OTP codes with bcrypt in Customer DB                         │
│  - Add strict rate limiting on OTP endpoints                                │
│                                                                             │
│  [ Phase 0C.2 ] Route Protection & Unprotected Endpoint Guards              │
│  - Add auth middleware to convert-to-cod, upload-artwork, approve-proof     │
│  - Add auth middleware to design feedback & design approval endpoints       │
│                                                                             │
│  [ Phase 0C.3 ] Ownership & IDOR Vulnerability Resolution                   │
│  - Implement requireOrderOwnership guard for customer orders & invoices     │
│  - Fix artwork deletion IDOR check for guest uploads                        │
│                                                                             │
│  [ Phase 0C.4 ] Department Scope & RBAC Middleware                          │
│  - Create requireDepartmentScope('PRODUCTION', 'DESIGN', etc.) guard        │
│  - Apply department isolation to production, QC, and logistics queues       │
│  - Add comprehensive automated unit & security regression test suite        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Testing Strategy

Automated tests will be added in `server/tests/phase0c-auth-rbac.test.js` covering:
1. **Unauthenticated Access Denial:** Verifies 401 response on unprotected routes when unauthenticated.
2. **IDOR / Ownership Denial:** Verifies Customer A cannot view, track, or modify Customer B's orders or invoices.
3. **Vertical Privilege Escalation:** Verifies Customer cannot access staff or admin routes.
4. **Horizontal Staff Privilege Escalation:** Verifies Staff in `DESIGN` department cannot execute `DELIVERY` or `QC` status updates without explicit permission.
5. **Session Revocation:** Verifies revoked session IDs in `AuthSession` immediately block API requests.
6. **OTP Security:** Verifies invalid or expired OTPs are rejected and dev bypasses are disabled in production.

---

## 12. Audit Verification & Git Status

- **Application Files Modified:** `0` (READ-ONLY audit)
- **Database Schema Modified:** `0`
- **Dependencies Modified:** `0`

```bash
$ git status --short
?? docs/architecture/PHASE_0C_AUTH_RBAC_AUDIT.md
```

---

## 13. Final Recommendation

**`READY FOR IMPLEMENTATION`**

The read-only audit of Authentication and RBAC architecture is complete. The findings, risk inventory, target design, and sub-phase implementation plan provide a clear, risk-free path to harden authentication and authorization across the Print Bazzar backend.

# PRINT BAZZAR — PHASE 0C.3 AUTHENTICATION & TOKEN HARDENING READ-ONLY AUDIT

**Date:** 2026-09-19  
**Status:** AUDIT COMPLETE & ARCHITECTURE READY  
**Scope:** Read-Only Audit of Authentication, JWT Tokens, Refresh Token Rotation, Cookies, and Mobile OTP  
**Target:** Thoroughly inspect existing authentication implementations across Staff and Customer boundaries, identify security vulnerabilities, evaluate token handling, and define the Phase 0C.3 hardening sequence.

---

## 1. Authentication Architecture Inventory

The backend implements separate authentication domains for **Staff/Admin** users (`User` model) and **Customer** users (`Customer` model). Both domains issue dual JWT tokens (Access & Refresh) and track active sessions using the server-side `AuthSession` database table.

### A. Staff / Admin Authentication Architecture
* **Login (`POST /api/v1/admin/auth/login`):**
  * Authenticates email (`toLowerCase().trim()`) and password via `bcrypt.compare(password, user.passwordHash)`.
  * Verifies `user.isActive === true`.
  * Creates an `AuthSession` DB record storing SHA-256 token hash (`tokenHash`), `sessionId` (UUID), `familyId` (UUID), `userType: 'STAFF'`, `expiresAt: 7 days`.
  * Issues 15-minute Access Token (`JWT_SECRET`) and 7-day Refresh Token (`JWT_SECRET`).
  * Attaches HttpOnly cookies (`pb_admin_access`, `pb_admin_refresh`) and returns `{ token: accessToken, user, sessionId }` in JSON response.
* **Token Refresh (`POST /api/v1/admin/auth/refresh`):**
  * Reads `pb_admin_refresh` cookie or `req.body.refreshToken`.
  * Calls `rotateRefreshSession` to verify token signature, check DB `AuthSession.tokenHash`, issue rotated refresh token, update DB hash, issue fresh access token, and update cookies.
* **Logout (`POST /api/v1/admin/auth/logout`):**
  * Revokes DB `AuthSession` (`revoked: true, revokedReason: 'USER_LOGOUT'`).
  * Clears `pb_admin_access` and `pb_admin_refresh` cookies.
* **Password Reset / MFA:** Not implemented for staff.

### B. Customer Authentication Architecture
* **Email/Password Signup & Login (`POST /api/v1/customer/auth/signup`, `POST /api/v1/customer/auth/login`):**
  * Hashes passwords via `bcrypt.hash(password, 10)`.
  * Issues Access Token (15m) and Refresh Token (7d), creates `AuthSession` DB record (`userType: 'CUSTOMER'`), sets cookies `pb_cust_access` and `pb_cust_refresh`, and returns `token` in JSON body.
* **Mobile OTP Login (`POST /api/v1/customer/auth/send-otp`, `POST /api/v1/customer/auth/verify-otp`):**
  * `send-otp`: Accepts 10-digit mobile number, generates 6-digit random code, sets 10-minute expiry (`otpExpiresAt`). Stores OTP in plaintext on `Customer.otpCode` in DB.
  * `verify-otp`: Validates code against `Customer.otpCode`. Clears `otpCode` upon successful verification, creates `AuthSession`, sets `pb_cust_access` and `pb_cust_refresh` cookies, returns `token` in JSON body.
* **Google OAuth (`POST /api/v1/customer/auth/google`):**
  * Verifies Google ID token via `OAuth2Client.verifyIdToken`. Creates or fetches `Customer`, creates `AuthSession`, sets cookies.
* **Customer Token Refresh & Logout (`POST /api/v1/customer/auth/refresh`, `POST /api/v1/customer/auth/logout`):**
  * Uses `rotateRefreshSession` and `revokeSession` matching staff session architecture.

---

## 2. JWT Security Audit

### A. Secrets Management
* **Single Shared Secret (CRITICAL):** Both Access Tokens and Refresh Tokens use the exact same `JWT_SECRET` (`server/src/config/jwt.js`).
* **Lack of Audience / Domain Separation (HIGH):** Staff tokens and Customer tokens are signed using the exact same `JWT_SECRET`. An attacker possessing a valid key can craft or manipulate tokens across domains if claims are not strictly validated.
* **Hardcoded Fallback Secret (HIGH):** Line 17 of `server/src/config/jwt.js`:
  ```javascript
  export const JWT_SECRET = rawSecret || 'dev_temporary_jwt_fallback_secret_key_needs_env_setting_98565';
  ```
  While production exits if `process.env.JWT_SECRET` is missing, development/test environments fall back to a hardcoded string.

### B. Claims Inspection & Validation Gaps
* **Staff Access Token Claims:** `{ userId, email, role, department, permissions, sessionId, familyId, userType: 'STAFF', iat, exp }`.
* **Customer Access Token Claims:** `{ id, email, name, accountType, isCustomer: true, sessionId, familyId, userType: 'CUSTOMER', iat, exp }`.
* **Refresh Token Claims:** `{ sessionId, familyId, userType, userId/customerId, tokenType: 'REFRESH', iat, exp }`.
* **Missing Standard Claims:** Tokens lack `iss` (Issuer), `aud` (Audience), and `jti` (JWT Unique Identifier) claims.

### C. Algorithm Verification
* **Algorithm Restriction:** All signing (`jwt.sign`) and verification (`jwt.verify`) functions explicitly pass `{ algorithm: 'HS256' }` and `{ algorithms: ['HS256'] }`. This prevents `none` algorithm confusion attacks.

### D. Token Confusion & Cross-Boundary Vulnerabilities
* **Access vs Refresh Token Confusion (CRITICAL):**
  In `server/src/middleware/auth.js` (`authenticateAdmin`, `authenticateCustomer`, `authenticateCustomerOrAdmin`), tokens are verified using `verifyToken(token)`. The verification function does **NOT** check `decoded.tokenType === 'ACCESS'`.
  * **Exploitation:** If a client or attacker passes a **Refresh Token** in the `Authorization: Bearer <token>` header or `pb_admin_access` cookie, `verifyToken` succeeds, `isSessionActive(decoded.sessionId)` passes, and `userId` / `customerId` is extracted from the Refresh Token payload.
  * **Impact:** Refresh tokens can be directly used as Access Tokens on API endpoints.
* **Staff vs Customer Token Confusion (HIGH):**
  * `authenticateAdmin` extracts `userId = decoded.userId || decoded.id` without checking `decoded.userType === 'STAFF'`.
  * `authenticateCustomer` extracts `customerId = decoded.id || decoded.customerId` without checking `decoded.userType === 'CUSTOMER'`.

---

## 3. Refresh Token Security & Session Lifecycle Audit

### A. Rotation & Single-Use Enforcement
* Rotation is implemented in `rotateRefreshSession` (`server/src/services/sessionService.js`).
* `hashToken(rawRefreshToken)` computes a SHA-256 hash of incoming refresh tokens.
* If a valid refresh token is presented, `rotateRefreshSession` generates a new refresh token, updates `AuthSession.tokenHash` in DB, and issues a fresh 15-minute access token.

### B. Token Family Invalidation & Reuse Detection
* If a presented refresh token hash is not found in `AuthSession` DB records or if the session is marked `revoked: true`:
  The service extracts `decoded.familyId` and revokes all sessions sharing that `familyId` (`revokedReason: 'SUSPECTED_TOKEN_REUSE_ATTACK'`).

### C. Concurrent Refresh Race Condition Vulnerability (HIGH)
* In Single-Page Applications (SPAs) or mobile applications, when a 15-minute access token expires, multiple concurrent API calls (e.g. fetching profile, orders, notifications) receive 401 and trigger simultaneous `/auth/refresh` calls.
* **Race Condition:**
  1. Request 1 sends `RefreshToken_V1`. `rotateRefreshSession` updates DB `tokenHash` to `RefreshToken_V2`.
  2. Request 2 (sent concurrently milliseconds later) sends `RefreshToken_V1`.
  3. Request 2 looks up `RefreshToken_V1` hash in DB -> NOT FOUND (overwritten by Request 1).
  4. Request 2 triggers **Reuse Detection** (`SUSPECTED_TOKEN_REUSE_ATTACK`) and **revokes the user's entire session family**, logging out legitimate users unexpectedly during concurrent usage.
* **Required Fix:** Implement a brief grace period (e.g., 30 seconds) for rotated refresh tokens to handle concurrent in-flight requests safely.

---

## 4. Cookie Security & Response Body Audit

### A. Cookie Configuration Matrix
| Cookie Name | Scope | HttpOnly | Secure | SameSite | Path | Max-Age |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| `pb_admin_access` | Staff Access | `true` | `isProd` | `lax` | `/` | 15 mins |
| `pb_admin_refresh` | Staff Refresh | `true` | `isProd` | `lax` | `/` | 7 days |
| `pb_cust_access` | Customer Access | `true` | `isProd` | `lax` | `/` | 15 mins |
| `pb_cust_refresh` | Customer Refresh | `true` | `isProd` | `lax` | `/` | 7 days |

### B. Dual Token Output Vulnerability (MEDIUM / HIGH)
* In `adminLogin`, `adminRefreshToken`, `customerLogin`, `verifyCustomerOtp`, `customerGoogleLogin`, `customerRefreshToken`:
  The controllers attach HttpOnly cookies via `setAuthCookies(res, ...)` **AND ALSO** return the raw JWT access token in the JSON response body (`res.json({ success: true, token: accessToken, ... })`).
* **Security Finding:** Storing the JSON `token` in `localStorage` or `sessionStorage` in client-side applications defeats HttpOnly cookie protections against XSS token theft.

---

## 5. Mobile OTP Security Audit

### A. Plaintext OTP Database Storage (HIGH)
* In `prisma/schema.prisma` and `customerAuthController.js`:
  `otpCode` is stored as **raw 6-digit plaintext** in the database (`Customer.otpCode`).
  If a database backup or dump is compromised, active OTPs can be read in plain text.

### B. Missing Failed Verification Rate Limiting (HIGH)
* In `verifyCustomerOtp` (`customerAuthController.js` line 779-812):
  There is **NO** limit on failed verification attempts. An attacker can send thousands of requests to `POST /api/v1/customer/auth/verify-otp` with different 6-digit codes (`000000` to `999999`) within the 10-minute expiry window until guessing the code.
  Failed attempts do not increment a counter or invalidate the OTP after N failed tries (e.g., 5 attempts).

### C. Resend Throttling & Test Bypasses
* `send-otp` enforces IP rate limiting via `customerLoginLimiter`, but lacks a per-mobile cooldown window (e.g., 60s minimum resend interval).
* In non-production environments, line 807 allows `'123456'` as a master OTP bypass for any customer mobile number.

---

## 6. Classification of Findings

| ID | Finding | Severity | Location |
|:---|:---|:---:|:---|
| **FINDING-1** | Access vs Refresh Token Confusion: Refresh tokens accepted as Access Tokens | **CRITICAL** | `server/src/middleware/auth.js` |
| **FINDING-2** | Cross-Boundary Token Confusion: Missing explicit `userType` claim validation | **HIGH** | `server/src/middleware/auth.js` |
| **FINDING-3** | Shared `JWT_SECRET` for Access and Refresh tokens across domains | **HIGH** | `server/src/config/jwt.js` |
| **FINDING-4** | Concurrent Refresh Race Condition revokes active user session families | **HIGH** | `server/src/services/sessionService.js` |
| **FINDING-5** | Plaintext OTP storage in `Customer.otpCode` database column | **HIGH** | `server/src/controllers/customerAuthController.js` |
| **FINDING-6** | Unlimited OTP verification attempts (missing brute-force lockout) | **HIGH** | `server/src/controllers/customerAuthController.js` |
| **FINDING-7** | Dual Token Return: Tokens returned in JSON response body alongside HttpOnly cookies | **MEDIUM** | `server/src/controllers/` |
| **FINDING-8** | Hardcoded dev fallback secret key in `jwt.js` | **MEDIUM** | `server/src/config/jwt.js` |
| **FINDING-9** | Missing per-mobile resend throttling for OTP generation | **LOW** | `server/src/controllers/customerAuthController.js` |

---

## 7. Recommended Implementation Sequence for Phase 0C.3

1. **Phase 0C.3.1 — JWT Token Type & Domain Boundary Validation:**
   - Enforce explicit `tokenType === 'ACCESS'` check in all access token verification middleware (`authenticateAdmin`, `authenticateCustomer`, `authenticateCustomerOrAdmin`).
   - Enforce explicit `userType === 'STAFF'` in `authenticateAdmin` and `userType === 'CUSTOMER'` in `authenticateCustomer`.
2. **Phase 0C.3.2 — Separate Token Secrets & Standard Claims:**
   - Define dedicated secrets/purposes for Access Tokens vs Refresh Tokens and Staff vs Customer domains.
3. **Phase 0C.3.3 — Concurrent Refresh Grace Period Handling:**
   - Add a 30-second grace window in `rotateRefreshSession` for recently rotated refresh tokens to prevent false-positive reuse revocation during concurrent client requests.
4. **Phase 0C.3.4 — Mobile OTP Hardening:**
   - Hash OTP codes before database storage (`Customer.otpCodeHash`).
   - Implement max failed attempt counters (`otpAttempts`, max 5 tries) and auto-invalidation upon limit breach.
   - Enforce 60-second resend throttling per mobile number.
5. **Phase 0C.3.5 — Automated Test Suite & Regression Verification:**
   - Create `server/tests/phase0c3-auth-token.test.js` covering token confusion, refresh grace periods, and OTP brute-force limits.

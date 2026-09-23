# PHASE 0C.3.6 — PASSWORD LOGIN ABUSE PROTECTION
## READ-ONLY IMPLEMENTATION PLAN

**Date:** September 19, 2026  
**Target Architecture:** Print Bazzar Express.js API & Prisma Backend  
**HEAD Commit:** `6c8d3d3 fix(auth): add distributed OTP abuse rate limiting`  
**Execution Mode:** **READ-ONLY DESIGN PLAN (Zero Code / Schema Modifications)**

---

## 1. Current Implementation & Audit Findings

Print Bazzar currently supports two primary email/password authentication pathways:
1. **Customer Password Login:** `POST /api/v1/customer/auth/login` (in `customerAuthController.js`)
2. **Staff/Admin Password Login:** `POST /api/v1/admin/auth/login` (in `authController.js`)

### Current Security Controls:
- Password hashing via `bcryptjs` with salt round factor `10`.
- Active account verification (`user.isActive === true` for staff accounts).
- IP-based rate limiting via `express-rate-limit`:
  - `adminLoginLimiter`: Max 5 attempts per 15 minutes per IP.
  - `customerLoginLimiter`: Max 10 attempts per 15 minutes per IP.

---

## 2. Identified Security Gap

> [!WARNING]
> **FINDING-1: Missing DB-Authoritative Account Lockout for Password Login**
> While mobile OTP authentication enforces a 5-attempt / 15-minute DB-authoritative lockout (`otpAttempts` / `otpBlockedUntil`), standard email/password authentication relies **exclusively** on IP-based rate limiting (`adminLoginLimiter` / `customerLoginLimiter`).
>
> **Exploitation Vector:** An attacker operating a distributed botnet or rotating proxy service can send password-guessing attempts across hundreds of distinct IP addresses. Because no DB-authoritative attempt counter exists on `User` or `Customer`, the target account will never lock out, permitting credential stuffing and password spraying attacks.

---

## 3. Evaluated Design Options & Recommendation

### Option A: Direct Fields on `User` and `Customer` Models (RECOMMENDED)
Add `failedLoginAttempts Int @default(0)` and `loginBlockedUntil DateTime?` directly to `User` and `Customer` Prisma models.

- **Pros:**
  1. **Pattern Consistency:** 100% consistent with the proven Phase 0C.3.4 OTP lockout pattern (`otpAttempts` / `otpBlockedUntil`).
  2. **High Performance:** Zero added JOINs or secondary table queries; attempt state is read during the initial `findUnique`/`findFirst` customer/user lookup.
  3. **Atomic Execution:** Can leverage Prisma atomic increments (`{ failedLoginAttempts: { increment: 1 } }`) and conditional `updateMany` for multi-instance concurrency safety.
  4. **Zero Added Infrastructure:** Operates natively inside PostgreSQL/Supabase without Redis or audit table cleanup scripts.
- **Cons:** Row modification on failed password attempts (negligible overhead as attempts are capped at 5).

### Option B: Dedicated `LoginAttemptLog` Audit Model
Create a dedicated table to log every password attempt with `identityHash`, `ipHash`, `status`, and `createdAt`.

- **Pros:** Full forensic audit trail for security incident response.
- **Cons:** Adds DB write overhead on *every* login attempt; requires background log pruning; higher query complexity (`COUNT(*)` over rolling window).

### Option C: Distributed Cache (Redis)
Store failed attempts in Redis using `INCR` and `EXPIRE`.

- **Pros:** Zero DB write overhead.
- **Cons:** Introduces external infrastructure dependency not currently present in Print Bazzar's deployment stack.

---

### RECOMMENDATION: Option A (Direct Fields on `User` and `Customer`)
Option A is recommended for Print Bazzar because it provides database-authoritative, multi-instance concurrency protection matching the existing OTP security architecture, with zero extra query overhead or external infrastructure costs.

---

## 4. Proposed Prisma Schema Modifications

*(READ-ONLY PROPOSAL — DO NOT APPLY YET)*

```prisma
// In model User (server/prisma/schema.prisma)
model User {
  // ... existing fields ...
  failedLoginAttempts  Int       @default(0)
  loginBlockedUntil    DateTime?
  // ... existing fields ...
}

// In model Customer (server/prisma/schema.prisma)
model Customer {
  // ... existing fields ...
  failedLoginAttempts  Int       @default(0)
  loginBlockedUntil    DateTime?
  // ... existing fields ...
}
```

---

## 5. Concurrency Strategy & Atomic Lockout State Machine

To prevent simultaneous incorrect password requests from bypassing the 5-attempt limit across multiple Render instances:

```text
Incoming Password Login Request
              │
              ▼
    Find User / Customer
              │
              ▼
   Is loginBlockedUntil > NOW()? ─── YES ───> Return HTTP 429 (ACCOUNT_LOCKED)
              │
             NO
              ▼
  Verify Password (bcrypt.compare)
              │
     ┌────────┴────────┐
     ▼                 ▼
   MATCH           MISMATCH
     │                 │
     │                 ▼
     │       Atomic Increment: failedLoginAttempts = failedLoginAttempts + 1
     │                 │
     │                 ▼
     │       Is newFailedAttempts >= 5?
     │          ├── YES ──> Set loginBlockedUntil = NOW() + 15 mins, reset failedLoginAttempts = 0
     │          │           Return HTTP 429 (ACCOUNT_LOCKED)
     │          └── NO  ──> Return HTTP 401 (INVALID_CREDENTIALS)
     │
     ▼
Atomic Success Reset:
Set failedLoginAttempts = 0, loginBlockedUntil = null
Issue AuthSession & Auth Cookies -> Return HTTP 200 (SUCCESS)
```

### Atomic Database Semantics:
- **Failed Attempts:** `prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: { increment: 1 } } })` guarantees database-level atomicity.
- **Lockout Boundary:** When `updatedUser.failedLoginAttempts >= 5`, an atomic update sets `loginBlockedUntil = new Date(Date.now() + 15 * 60 * 1000)` and clears `failedLoginAttempts = 0`.
- **Success Reset:** Upon successful `bcrypt.compare`, `failedLoginAttempts` is reset to `0` and `loginBlockedUntil` is cleared inside the `createSession` flow.

---

## 6. Error Handling & Account Enumeration Protection

To prevent user/account enumeration side-channel attacks:

1. **Uniform Response Message:**
   - Both invalid password AND locked account responses use timing-consistent execution and non-leaking messages for unauthenticated users:
   - `HTTP 401`: `{ "success": false, "message": "Invalid email/mobile or password." }`
   - `HTTP 429` (When locked): `{ "success": false, "code": "ACCOUNT_LOCKED", "message": "Account is temporarily locked due to excessive failed login attempts. Please try again in 15 minutes." }`
2. **Timing Attack Protection:**
   - If user/customer is not found, execute a dummy `bcrypt.compare` against a fixed pre-computed hash to equalize response latency.
3. **Lockout Pre-Check:**
   - Lockout check (`loginBlockedUntil > NOW()`) executes **before** computationally expensive `bcrypt.compare` to prevent CPU-exhaustion DoS attacks.

---

## 7. Interaction with IP-Based Rate Limiting

The two rate-limiting mechanisms form a complementary, defense-in-depth security perimeter:

```text
Incoming HTTP Request
          │
          ▼
1. IP-Based Rate Limiter (express-rate-limit in RAM)
   - Admin: 5 req / 15 min per IP
   - Customer: 10 req / 15 min per IP
   - Rejects high-volume single-IP flooding early at HTTP layer
          │ (Passes)
          ▼
2. DB-Authoritative Account Lockout (PostgreSQL)
   - Max 5 failed attempts per target account across ALL IPs
   - Rejects distributed password-guessing attacks against a single user
```

---

## 8. Test Plan (16 Test Cases)

The future test suite (`tests/phase0c3.6-password-lockout.test.js`) will cover:

1. **First Failed Login:** Failed password increases `failedLoginAttempts` to 1; returns HTTP 401.
2. **Counter Increment:** Sequential failed attempts increment `failedLoginAttempts` correctly.
3. **4 Failures Usable:** 4th failure leaves account unlocked (`failedLoginAttempts === 4`).
4. **5th Failure Lockout:** 5th failure sets `loginBlockedUntil` (+15 mins) and returns HTTP 429 (`ACCOUNT_LOCKED`).
5. **Lockout Block:** Subsequent login attempt during lockout returns HTTP 429 without executing bcrypt.
6. **Lockout Expiry:** Login attempt after 15 minutes passes lockout check and allows authentication.
7. **Success Reset:** Successful login after 3 failures resets `failedLoginAttempts` to 0.
8. **Concurrent Failures:** 5 simultaneous incorrect password requests atomically trigger lockout without losing count.
9. **Concurrent Success/Failure Race:** Concurrent correct and incorrect login requests resolve safely without corrupting session state.
10. **Distributed IPs Target:** 5 failures originating from 5 different IPs trigger account lockout.
11. **IP Limiter Protection:** Single IP exceeding 10 requests is blocked by `customerLoginLimiter`.
12. **Customer Domain Isolation:** Customer lockout does not affect Staff accounts.
13. **Staff Domain Isolation:** Staff lockout does not affect Customer accounts.
14. **Disabled Account Priority:** `user.isActive === false` returns HTTP 403 before lockout evaluation.
15. **Enumeration Invariant:** Response messages for non-existent users match invalid password responses.
16. **Auth Regression:** All existing Phase 0C.3.1–0C.3.5 token and refresh tests remain 100% passing.

---

## 9. Migration & Rollback Plan

### Migration SQL (`20260919_add_password_lockout_fields/migration.sql`):
```sql
-- AlterTable User
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
                  ADD COLUMN "loginBlockedUntil" TIMESTAMP(3);

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
                      ADD COLUMN "loginBlockedUntil" TIMESTAMP(3);
```
- **Safety:** Both columns are purely additive with default values (`0` and `NULL`). Zero downtime, zero breaking changes to existing data.

### Rollback Strategy:
- Revert application code; drop columns `failedLoginAttempts` and `loginBlockedUntil` via SQL.

---

## 10. Implementation Steps & Expected Files

1. Update `server/prisma/schema.prisma` to add `failedLoginAttempts` and `loginBlockedUntil` to `User` and `Customer`.
2. Generate migration file `server/prisma/migrations/20260919_add_password_lockout_fields/migration.sql`.
3. Update `server/src/controllers/authController.js` (`adminLogin`) with atomic lockout & success reset.
4. Update `server/src/controllers/customerAuthController.js` (`customerLogin`) with atomic lockout & success reset.
5. Create `server/tests/phase0c3.6-password-lockout.test.js` with 16 test cases.
6. Update `docs/architecture/PHASE_0C3.6_IMPLEMENTATION.md` and `docs/architecture/PHASE_0C3.6_DIFF_REVIEW.md`.

### Expected Files to Change:
```text
server/prisma/schema.prisma
server/prisma/migrations/20260919_add_password_lockout_fields/migration.sql
server/src/controllers/authController.js
server/src/controllers/customerAuthController.js
server/tests/phase0c3.6-password-lockout.test.js
docs/architecture/PHASE_0C3.6_PASSWORD_LOCKOUT_PLAN.md
```

### Expected Single Commit Message:
`fix(auth): add DB-authoritative password login lockout`

---

## 11. Final Recommendation & Status

```text
RECOMMENDATION: Option A (Direct fields on User and Customer models)

IMPLEMENTATION READY: YES
```

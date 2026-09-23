# Phase 0C.3.6 — Password Lockout Race Remediation Implementation

## Overview

Phase 0C.3.6 implements DB-authoritative, row-lock concurrency-safe password login abuse protection for both Customer (`customerLogin`) and Staff/Admin (`adminLogin`) authentication endpoints.

---

## Technical Changes Made

### 1. Database Row Locking & Concurrency Protection (`SELECT ... FOR UPDATE`)
- **Pessimistic Locking:** Both `adminLogin` (`server/src/controllers/authController.js`) and `customerLogin` (`server/src/controllers/customerAuthController.js`) now use PostgreSQL row locking (`SELECT "id", "failedLoginAttempts", "loginBlockedUntil" FROM "User"/"Customer" WHERE "id" = $1 FOR UPDATE`) inside a Prisma transaction (`prisma.$transaction`).
- **Advisory Pre-bcrypt Check:** Performs initial un-locked check on `loginBlockedUntil` prior to running CPU-heavy `bcrypt.compare` to prevent bcrypt DoS overhead on known-locked accounts.
- **In-Transaction Authoritative Re-check:** Once `bcrypt.compare` completes and the database row lock is acquired:
  - **Failed Path:** Re-checks `loginBlockedUntil > NOW()`. If active, skips counter increment and returns `HTTP 401`. If expired, resets counter to `0`. Increments `failedLoginAttempts += 1`. When threshold (`5`) is reached, sets `failedLoginAttempts = 5` (Model A) and `loginBlockedUntil = NOW() + 15m`.
  - **Success Path:** Re-checks `loginBlockedUntil > NOW()`. If an in-flight wrong-password request established a lockout while bcrypt was running, the success path detects the active lockout, aborts session creation, and returns `HTTP 401`. If unlocked, resets `failedLoginAttempts = 0` and `loginBlockedUntil = null`.

### 2. Account Enumeration Defense & Error Message Standardization
- **Uniform Response:** Non-existent accounts, wrong passwords, disabled accounts, and locked accounts all return `HTTP 401` with the exact same message: `"Invalid credentials."`.
- **Eliminated `ACCOUNT_LOCKED` Code & HTTP 429:** `ACCOUNT_LOCKED` code and 429 status are not exposed to unauthenticated clients, preventing attackers from probing account existence.
- **Timing Protection:** Preserved `bcrypt.compare(password, DUMMY_HASH)` for non-existent account lookups.

### 3. Database Schema & Migration (`server/prisma/schema.prisma`)
- Model fields: `failedLoginAttempts Int @default(0)` and `loginBlockedUntil DateTime?` on both `User` and `Customer`.
- Migration: Non-destructive additive migration at `server/prisma/migrations/20260919_add_password_lockout_fields/migration.sql`.

---

## Verification & Testing

Updated `server/tests/phase0c3.6-password-lockout.test.js`:
- Added `$transaction` and `$queryRaw` row lock mocks with mutex lock resolution.
- Standardized error message assertions to `HTTP 401` `"Invalid credentials."`.
- Asserted Model A counter semantics (`failedLoginAttempts === 5` on lockout).
- **Added `Promise.all()` Concurrency Tests:**
  - **Test 1 — 10 Concurrent Wrong Passwords:** Verified 10 parallel login requests run without lost increments, setting `failedLoginAttempts = 5` and `loginBlockedUntil` to future date.
  - **Test 2 — Concurrent Success + Failure Race:** Verified deterministic row lock acquisition without lockout erasure or invalid session creation.

### Verification Results
- **15/15 PASS** in `phase0c3.6-password-lockout.test.js`.
- **206/206 PASS** across 48 test suites in full security regression.
- **`git diff --check`:** PASS (Clean).
- **Frontend State:** 100% untouched.

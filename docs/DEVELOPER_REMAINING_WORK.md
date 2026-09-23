# Print Bazzar — Developer Remaining Work Roadmap

> **Document Status**: Final Handover Baseline  
> **Tag**: `handover-2026-09-23`  
> **Date**: September 23, 2026  

---

## PHASE A — Payment Completion (Staging Interactive Payment)
- **Objective**: Execute and verify the complete end-to-end interactive Razorpay TEST payment flow on the staging environment.
- **Current Status**: Order creation (`POST /api/orders` → HTTP 201) and Payment Session creation (`POST /api/payments/create-order` → HTTP 200) are fully verified on Staging. The interactive browser payment modal step is pending handover.
- **Dependencies**: Staging Frontend (`https://temporary-swift-banjo-uwqh9zv.vercel.app`), Staging API (`https://printbazzar-api-staging.onrender.com`), Staging DB.
- **Acceptance Criteria**:
  1. Open staging checkout, add test product `cda2c578-1eda-47fa-89a0-09ac492aedf6` (₹10).
  2. Launch Razorpay TEST modal and complete payment using official Razorpay test credentials.
  3. Verify webhook delivery to `https://printbazzar-api-staging.onrender.com/api/payments/webhook`.
  4. Verify order status updates to `PAID` / `CONFIRMED`.
  5. Verify invoice generated and JobCard created.
- **Testing Requirement**: Manual browser test checkout + webhook log inspection.

---

## PHASE B — Checkout / Order Regression Suite
- **Objective**: Comprehensive regression testing of all delivery methods, billing variations, and guest/authenticated checkout states.
- **Current Status**: Mobile input normalization fixed (`8829e07`) and GST inclusive math aligned.
- **Dependencies**: Phase A.
- **Acceptance Criteria**:
  1. Verify Store Pickup vs Courier Delivery paths.
  2. Verify Guest checkout auto-authentication token generation.
  3. Verify GST breakdown calculation on Cart and Invoice.
- **Testing Requirement**: Automated API smoke tests + UI flow validation.

---

## PHASE C — Admin / ERP Portal Verification
- **Objective**: Verify admin order management, staff assignment, and POS counter sales modules.
- **Current Status**: Backend controllers and UI screens implemented.
- **Dependencies**: Phase A.
- **Acceptance Criteria**:
  1. Verify order status transitions in Admin UI.
  2. Verify POS counter cash/UPI order entry.
  3. Verify staff role-based access restrictions.
- **Testing Requirement**: Role-based access testing.

---

## PHASE D — Advanced Product Configurator Polish
- **Objective**: Refine option master dependency rules and custom specifications pricing.
- **Current Status**: Tiered quantity pricing and option masters fully operational.
- **Dependencies**: Phase B.
- **Acceptance Criteria**: Dynamic pricing updates instantaneously as paper weight or finish options are toggled.
- **Testing Requirement**: Unit tests on `pricingEngine.js`.

---

## PHASE E — Production Workflow & Job Cards
- **Objective**: Validate pre-flight artwork verification, job slip printing, and production queue dispatch.
- **Current Status**: JobCard models and admin workflow board implemented.
- **Dependencies**: Phase A & C.
- **Acceptance Criteria**: Job cards generated automatically upon order confirmation with correct print specs.
- **Testing Requirement**: Admin production queue verification.

---

## PHASE F — Inventory & Material Tracking
- **Objective**: Stock level management for paper substrates, inks, and apparel blanks.
- **Current Status**: Schema models defined.
- **Dependencies**: Phase E.
- **Acceptance Criteria**: Stock deduction recorded when production job is dispatched.
- **Testing Requirement**: Integration test on inventory service.

---

## PHASE G — B2B / Dealer Account Portal
- **Objective**: Wholesale pricing slabs and credit term management for verified corporate dealers.
- **Current Status**: Planned feature module.
- **Dependencies**: Phase C.
- **Acceptance Criteria**: Approved B2B accounts see custom wholesale price slabs upon sign-in.
- **Testing Requirement**: Account role testing.

---

## PHASE H — Customer & Operational Notifications
- **Objective**: Real-time SMS, Email, and WhatsApp status updates.
- **Current Status**: Gateway interfaces configured in `notificationService.js`.
- **Dependencies**: External SMS/WhatsApp gateway credentials.
- **Acceptance Criteria**: Customer receives dispatch SMS/email with tracking link when order status changes to `SHIPPED`.
- **Testing Requirement**: Webhook receiver test.

---

## PHASE I — Executive Analytics & KPI Reports
- **Objective**: Sales revenue, profit margin, turn-around-time (TAT), and popular product reports.
- **Current Status**: Basic audit logging active.
- **Dependencies**: Phase C.
- **Acceptance Criteria**: Daily sales summary matches database revenue totals.
- **Testing Requirement**: Reporting query validation.

---

## PHASE J — Performance Optimization
- **Objective**: Frontend bundle optimization, image lazy-loading, and database index tuning.
- **Current Status**: Vite chunking active.
- **Dependencies**: Core feature completion.
- **Acceptance Criteria**: Lighthouse score > 90 on mobile storefront.
- **Testing Requirement**: Lighthouse performance audit.

---

## PHASE K — End-to-End Security Audit & Penetration Testing
- **Objective**: Complete security audit of all API endpoints, token handling, and payment webhooks.
- **Current Status**: Phase 0 Security Baseline verified.
- **Dependencies**: Complete feature set.
- **Acceptance Criteria**: Zero high or critical vulnerabilities identified.
- **Testing Requirement**: Automated security scanners + manual pen testing.

---

## PHASE L — Production Release & Launch
- **Objective**: Final production deployment, live Razorpay activation, and DNS cutover.
- **Current Status**: Pending developer handover approval.
- **Dependencies**: Completion of Phases A through K.
- **Acceptance Criteria**:
  1. Live production deployment on Render & Vercel.
  2. Live Razorpay payment verified.
  3. Production database migrations deployed cleanly.
- **Testing Requirement**: Post-launch live verification checklist.

# Task #28 — Pricing Integration Implementation Plan

**Strictly read-only. No file modified, no patch applied, no commit/push/merge/deploy, no migration run, no production data changed, on either Windows workspace or the cloud sandbox.** This is a planning document only, built from direct forensic reads of the fresh authoritative `main` clone (`D:\webapp\PRINT-BAZZAR-E-COMMERCE`, HEAD `a7bd3bcb3de079d5d605eb0093b9e95de6a47069`, live-fetch-confirmed today) plus the already-verified Task #23/24 work held in this session's sandbox/docs.

**One operational note, same pattern as Task #27**: reading files from the fresh clone via the device bridge again collided with identically-named paths in my own cloud sandbox mirror (unavoidable — both share the folder name). Each time, I backed up the sandbox's own copy first, read what I needed from the fresh-main version, then restored the sandbox copy and verified `git status --short` matched the established baseline exactly. Confirmed clean at the end of this task. Nothing on either Windows folder was touched at any point (`device_stage_files` is device→container only).

---

## 1. Current pricing architecture map (fresh main, `a7bd3bcb3...`)

`calculatePricing()` in `server/src/utils/pricingEngine.js` (mirrored in the client) is the single per-item price resolver, called from `orderController.js`, `posController.js`, and the customer-facing dynamic-pricing endpoint in `catalogController.js`. It runs two pricing methods **in priority order**, and this order matters a great deal for the plan below:

- **METHOD A — Combination/Matrix pricing** (`pricingMethod: 'MATRIX' | 'COMBINATION'`). Runs first. If `product.pricingMatrices` or `product.combinations` (the `ProductCombination` table) has any row whose `quantity` and option-map exactly match the customer's selection, its stored `price` is used directly and Method B is skipped entirely (`if (!basePrice && isAvailable)` gates Method B). If the product's `pricingType` is `CONFIGURATION`/`MATRIX` and nothing matches, it hard-rejects rather than falling through.
- **METHOD B — Volume Slabs & Custom Quantity** (`pricingMethod: 'SLABS' | 'CUSTOM_UNIT'`). Only reached when Method A found no rows or no match. This is the branch every prior task in this engagement (Task #15, #23, #24) has worked on. On fresh main it is still the **pre-Task-#15 architecture**: a single unified slab search (`sortedSlabs.find(s => qty>=minQty && (maxQty==null||qty<=maxQty))`) that requires an exact `minQty===qty` hit to use the matched slab's own price; anything else falls through to a `customUnitPrice` fallback or a nearest-slab interpolation (`nearestSlab.slice().reverse().find(...)`, `perUnit = slabBase/nearestSlab.minQty`), and the generic `×1.35` double-side multiplier lives inside that `CUSTOM_UNIT` fallback.
- **Tax/GST**: computed once, after Method A/B settle `basePrice`, as `taxRate=18` (param default), `totalTax = round(subtotal*taxRate/100)`, `cgst=round(totalTax/2)`, `sgst=totalTax-cgst`, `igst` **hardcoded to `0`**. `grandTotal = subtotal + shipping` — **tax is never added to `grandTotal`**, confirming prices are meant to be GST-inclusive at the customer-facing level; `totalTax`/`cgst`/`sgst` are informational fields only. See Section 4 for why this formula is nonetheless wrong for that purpose.
- **Order creation** (`orderController.js`) does **not** reuse `calculatePricing()`'s per-item tax fields — it independently recomputes `totalTax = round(calculatedSubtotal * gstRate/100)`, `cgstAmount`, `sgstAmount` from the order-level `calculatedSubtotal`, and again `grandTotal = calculatedSubtotal + shippingCharge` (tax not added). `posController.js` does the same, on `subtotal - discount`. `igstAmount` is hardcoded to `0` in both.
- **Invoicing** (`invoiceController.js`) just copies these order fields onto the invoice: `taxableAmount: order.subtotal, cgst: order.cgstAmount, sgst: order.sgstAmount, igst: order.igstAmount`.

## 2. Exact files/modules involved

| File (real path — `printbazzar_react/client/...`, not `client/...`) | Role |
|---|---|
| `server/src/utils/pricingEngine.js` | Canonical per-item price resolver (Methods A & B, tax calc) |
| `printbazzar_react/client/src/utils/pricingEngine.js` | Client mirror, used for display/preview parity |
| `printbazzar_react/client/src/Components/DynamicQuantityTierPricing.jsx` | Customer-facing quantity-tier chip UI |
| `printbazzar_react/client/src/admin/AdminProductConfigurator.jsx` | Admin "Simple Pricing" (slabs) editor |
| `printbazzar_react/client/src/admin/AdminProductEditor.jsx` | Admin product editor — **currently still contains** the inline slab builder AND the full Exact-Combination-Pricing Tab 6 |
| `server/prisma/schema.prisma` | `Product.quantityType`, `ProductPriceSlab`, `ProductCombination`, `PriceVersion.status` |
| `server/src/controllers/orderController.js` | Order creation — calls `calculatePricing()` per item, independently recomputes order-level tax |
| `server/src/controllers/posController.js` | POS order creation — same pattern as orderController |
| `server/src/controllers/invoiceController.js` | Copies order tax fields onto invoice records |
| `server/src/controllers/catalogController.js` | Customer-facing product detail + dynamic-price endpoint (feeds combinations, slabs, options into `calculatePricing()`) |
| `server/src/controllers/adminController.js` | Full CRUD for `ProductCombination` rows (`createMany`/`deleteMany` on product save, a dedicated "matrix combinations" save endpoint) — **see Section 7, this contradicts the "zero production usage" assumption** |
| `server/tests/canonical-quantity-side-pricing.test.js`, `sdc1-side-pricing-regression.test.js` | Exist only in the backup working tree / sandbox; absent from main |

## 3. Every legacy pricing path — replace, isolate, or retain

| Path | Disposition |
|---|---|
| Method A (Combination/Matrix pricing) in `pricingEngine.js` | **Retain, untouched.** Confirmed byte-identical in structure and position between fresh main and the Task #15 rewrite already tested in the sandbox — Task #15 never touched this branch. Nothing in this plan changes it. |
| Method B's exact-match-only FIXED_SLAB search | **Replace** with Task #23/24's `matchFixedSlabForQuantity()` range-matching (see Section 6). |
| Method B's nearest-slab interpolation fallback | **Remove** for the FIXED_SLAB/OPEN_QUANTITY paths — it becomes unreachable once the two-model split (Task #15) is in place, exactly as previously verified. It is **not** removed from the `CUSTOM_UNIT`/legacy fallback methods, which stay out of scope (no business rule was ever given for them). |
| `customUnitPrice` fallback | **Isolate** — becomes structurally unreachable for any product with `priceSlabs` configured (i.e. every real FIXED_SLAB/OPEN_QUANTITY product), exactly as Task #23/24 already established; left in place only for the small number of products that have neither slabs nor combinations. |
| Generic `×1.35` double-side multiplier | **Isolate**, same reasoning — stays confined to the `CUSTOM_UNIT`/`STARTING_PRICE` fallback, out of scope per the same prior finding. |
| `AdminProductEditor.jsx`'s inline slab builder + Exact-Combination Matrix Tab 6 | **Do not remove without separate confirmation** — see Section 7. This plan does not propose deleting it. |
| Order/POS-level independent GST recomputation | **Retain the pattern, fix the formula** — see Section 4/9. This is not a Task #15/23/24 concern; it is a separate, real gap against the target architecture's rule D that exists on **both** main and the backup equally, so it is not "newer main" vs "local work," it is a pre-existing defect either way. |

## 4. Exact implementation changes required for Task #15 (still entirely missing from main)

In both `server/src/utils/pricingEngine.js` and its client mirror, inside Method B only:
1. Add `isSideOptionKey(key)` — single shared predicate for "this option name means printing side," reused by `checkIsDoubleSide()` and the surcharge-skip guard (fixes the SDC1 double-surcharge bug this comment documents).
2. Add `resolveQuantityModel(product)` — reads `product.quantityType`; anything other than the literal string `'OPEN_QUANTITY'` (including legacy `FIXED`/`CUSTOM`/`BOTH` values) is treated as `'FIXED_SLAB'`. Never inferred from slab shape/count.
3. Add `isDoubleSideAvailable(slab)` — `double > 0 && double > single`; this is what makes `singleSidePrice === doubleSidePrice` correctly report Double Side as unavailable, satisfying rule C without a hardcoded product/SKU check.
4. Split Method B into two branches keyed by `resolveQuantityModel()`: `OPEN_QUANTITY` (lowest-minQty slab's own rate × qty, positive-integer validation, no interpolation) and `FIXED_SLAB` (in the already-tested backup content this is still exact-match only — Task #23/24 upgrades it further, see Section 6).
5. `printbazzar_react/client/src/Components/DynamicQuantityTierPricing.jsx`: split the UI on `isOpenQuantity` — FIXED_SLAB shows only the tier chips (no free-text), OPEN_QUANTITY shows only the stepper (step defaults to 1, not the old 50/100/500 defaults).
6. `AdminProductConfigurator.jsx`: normalize `quantityType` on load (`p.quantityType === 'OPEN_QUANTITY' ? 'OPEN_QUANTITY' : 'FIXED_SLAB'`).
7. `schema.prisma`: comment-only documentation of the new `quantityType` semantics — no column/type/migration change (already verified in Task #27).

This content is already written and locally tested (27/27 + regression suites, per Task #23/24's verification) — it exists in the backup's working tree and in this session's sandbox, and can be reused rather than re-derived from scratch.

## 5. Exact implementation changes required for Task #23

On top of Task #15's FIXED_SLAB branch, replace the exact-match search with range matching:
```js
matchedSlab = product.priceSlabs.find(
  (s) => qty >= s.minQty && (s.maxQty === null || s.maxQty === undefined || qty <= s.maxQty)
);
```
Applied identically in both `pricingEngine.js` files. Update `DynamicQuantityTierPricing.jsx`'s tier chips to display a range label ("100-249", "25+") instead of a single quantity, computed by extending `getQuantityTierPricing()` to return `maxQty`/`rangeLabel` per tier — additive only, no change to click behavior (a chip still sets quantity to its `minQty`).

## 6. Exact implementation changes required for Task #24

Replace Task #23's plain range-find with the full `matchFixedSlabForQuantity(priceSlabs, qty)` safety-checked resolver (already written and tested against the user's Examples A–E):
```js
export function matchFixedSlabForQuantity(priceSlabs, qty) {
  const candidates = (priceSlabs || []).filter(
    (s) => qty >= s.minQty && (s.maxQty === null || s.maxQty === undefined || qty <= s.maxQty)
  );
  if (candidates.length === 0) return { matchedSlab: null, isConfigError: false };
  if (candidates.length === 1) return { matchedSlab: candidates[0], isConfigError: false };
  const finiteCandidates = candidates.filter((s) => s.maxQty !== null && s.maxQty !== undefined);
  if (finiteCandidates.length >= 2) return { matchedSlab: null, isConfigError: true };
  const maxMinQty = Math.max(...candidates.map((s) => s.minQty));
  const tightest = candidates.filter((s) => s.minQty === maxMinQty);
  if (tightest.length > 1) return { matchedSlab: null, isConfigError: true };
  return { matchedSlab: tightest[0], isConfigError: false };
}
```
Plus `describeConfiguredRanges(priceSlabs)` for the rejection message, and the `isConfigError` branch in the FIXED_SLAB handler that returns the "pricing configuration issue (overlapping quantity ranges)" message rather than silently picking a slab. Bring over `server/tests/canonical-quantity-side-pricing.test.js` (27 tests, A1–A15 covering FIXED_SLAB) and `sdc1-side-pricing-regression.test.js` as net-new files — main has neither.

## 7. How to integrate without deleting Exact Combination Pricing

**This is the most important correction in this plan.** The backup's own removal comment for `AdminProductEditor.jsx` Tab 6 states *"ProductCombination has zero production usage."* Having now read `adminController.js` and `catalogController.js` on fresh main directly, **that claim is not supported by the code**: `ProductCombination` has full, live CRUD (`createMany`/`deleteMany` wired into product create/update, plus a dedicated "matrix combinations" save endpoint), is included in every customer-facing product-detail and dynamic-pricing query, and Method A of `calculatePricing()` — which is fully intact and untouched by Task #15 — actively uses it as the **first-priority** pricing method for any product that has rows in that table. Whether any product **currently has** rows in it is a data question this read-only task cannot answer (no database access here), but the code-level claim of "zero usage" is false; at minimum the feature is fully wired and reachable.

**Recommendation**: do not remove `AdminProductEditor.jsx`'s Tab 6 or inline slab builder as part of this integration. Bring over only the pricing-model changes (Sections 4–6) into `AdminProductEditor.jsx`/`AdminProductConfigurator.jsx`, leaving Tab 6 and the combination CRUD paths exactly as they are on main today. This also removes the highest-risk item from Section 7 of the Task #27 report — the integration no longer needs a product decision about deleting a live feature, because this plan doesn't delete it. If Product/Admin genuinely wants to retire admin-side combination editing later, that should be its own task, backed by a real check of `SELECT COUNT(*) FROM "ProductCombination"` and query logs — not folded into this pricing-architecture integration.

## 8. How to handle `PriceVersion.status` safely without running a migration

The backup's `schema.prisma` has `status String @default("DRAFT")` plus `@@index([productId, status])` on `PriceVersion`, attributed in-comment to an earlier, separate "Task #5, Phase 1" — unrelated to Task #15/23/24. Since this task must not run migrations or touch the database: **do not port this column in Task #29.** Two safe options for whoever picks this up next: (a) treat it as explicitly out of scope for the pricing-architecture integration and leave `schema.prisma` without it — Task #29's diff should not touch the `PriceVersion` model at all; or (b) if it turns out the production database already has this column applied out-of-band (worth a direct, separate, read-only `\d "PriceVersion"` check before deciding), then adding the matching Prisma field back is a documentation-only schema change, not a migration — but that check must happen first, explicitly, and is not assumed true by this plan.

## 9. Frontend/backend parity requirements

- Both `pricingEngine.js` copies (server, client) must receive Sections 4–6's changes identically — this engagement has consistently kept them byte-for-byte parallel and should continue to.
- `DynamicQuantityTierPricing.jsx`'s `rangeLabel` display must be computed from the same `matchFixedSlabForQuantity` semantics the server enforces, so a quantity the UI presents as selectable is never one the server then rejects.
- **GST fix (new, not part of Task #15/23/24, but directly required by the user's target rule D — Section 11 below)**: whichever formula is chosen for extracting `cgst`/`sgst`/`igst` from a GST-inclusive price must be applied identically in `pricingEngine.js` (per-item), `orderController.js` (order-level), and `posController.js` (POS order-level) — today all three independently compute tax with the same `price × rate/100` formula, and any fix must be made in all three at once or per-item/per-order tax breakdowns will disagree with each other on the same order.
- `invoiceController.js` should be revisited once the above is fixed, since it currently just relays `order.subtotal` as `taxableAmount` verbatim — once `taxableAmount` has a correct meaning at the order level, the invoice inherits it for free with no separate invoice-side change needed.

## 10. Required regression tests

- The existing 27-test `canonical-quantity-side-pricing.test.js` (A1–A15 FIXED_SLAB range-matching + B–F sections) and `sdc1-side-pricing-regression.test.js`, both already passing 27/27 and 35/35 respectively against this exact code in the sandbox — bring over as-is.
- **New**: a Method-A-untouched regression test — construct a product with `ProductCombination` rows and confirm `calculatePricing()` still resolves via Method A after the Method B rewrite lands, since this plan explicitly claims Method A is unaffected and that claim should be enforced by a test, not just a code read.
- **New**: an IGST test, once implemented — same product, same quantity, shipping state "Tamil Nadu" (intra-state: CGST+SGST, IGST=0) vs a non-Tamil-Nadu state (inter-state: IGST=18%, CGST=SGST=0) — this currently cannot pass because IGST is hardcoded to 0 unconditionally.
- **New**: a GST-inclusive extraction test — for a known inclusive price (e.g. ₹118 at 18%), assert `taxableAmount === 100` and `totalTax === 18`, which the current `price × rate/100` formula fails (it would return `totalTax = 21.24 ≈ 21`, not `18`, against a ₹118 inclusive price).
- Full existing suite re-run (the `run-tests.mjs` harness referenced at repo root) to catch any of the known pre-existing Category B/C failures re-surfacing or changing count.

## 11. Required production-safety checks

- **Before writing any code**: confirm, via a read-only DB query (not covered by this task), whether any live product actually has `ProductCombination` rows, and whether any live product actually has the `PriceVersion.status` column populated out-of-band. Both directly gate Sections 7 and 8.
- Menu Card (PB0041) and Chromo Art Sticker (PB-LIVE-0032) database prices must not change — this is a code/logic change only; no `UPDATE` statements against `Product`/`ProductPriceSlab` are part of this plan.
- The GST formula fix (Section 9) changes **stored `totalTax`/`cgst`/`sgst`/`igst` figures on new orders**, not `grandTotal` — customers are not charged differently, but invoice/accounting figures change going forward. This should be flagged to finance/accounting before it ships, since historical orders will show the old (incorrect) formula and new orders the corrected one.
- Any IGST implementation needs a definition of "the company's home state" for the intra/inter-state comparison — the codebase's existing default (`'Tamil Nadu'`) is a reasonable candidate but should be confirmed as the correct GSTIN-registered state, not assumed.

## 12. Recommended implementation order

1. Confirm the two open data questions in Section 11 (ProductCombination live usage, PriceVersion.status DB state) — blocks Sections 7/8 decisions.
2. Implement Task #15 (Section 4) in both `pricingEngine.js` files + the three frontend files, leaving `AdminProductEditor.jsx`'s Tab 6/slab builder untouched per Section 7.
3. Add the Method-A-untouched regression test (Section 10) immediately after step 2, before proceeding — this is the cheapest point to catch an accidental Method A regression.
4. Layer Task #23 (Section 5) range matching on top.
5. Layer Task #24 (Section 6) safety-checked matching + bring over the 27-test suite and SDC1 regression suite.
6. Run the full local suite; only proceed once it's green with no new regressions beyond the already-known baseline.
7. As a separate, clearly-labeled sub-change (not blocking 1–6): fix the GST-inclusive extraction formula in all three call sites (Section 9), add the IGST intra/inter-state check, add the two new tests from Section 10.
8. Produce a fresh diff/patch (same format as Tasks #23/24's docs) against **this fresh main base**, not the stale sandbox base — this matters because the sandbox's own pre-Task-15 base and main's current pre-Task-15 base are not guaranteed byte-identical outside the six target files (main has moved in unrelated ways per Task #19/#27).
9. Only then — a separate, later task — consider how the patch actually reaches the Windows workspace and `main`, which still requires either a working shell on that device or another safe mechanism neither established nor attempted by this task.

## 13. Exact files expected to change

1. `server/src/utils/pricingEngine.js`
2. `printbazzar_react/client/src/utils/pricingEngine.js`
3. `printbazzar_react/client/src/Components/DynamicQuantityTierPricing.jsx`
4. `printbazzar_react/client/src/admin/AdminProductConfigurator.jsx`
5. `server/prisma/schema.prisma` (comment-only for `quantityType`; **no** `PriceVersion.status` addition — see Section 8)
6. `server/tests/canonical-quantity-side-pricing.test.js` (new file)
7. `server/tests/sdc1-side-pricing-regression.test.js` (new file)
8. `server/src/controllers/orderController.js` — GST formula fix + IGST only (Section 9), no pricing-model changes needed here since it just calls `calculatePricing()`
9. `server/src/controllers/posController.js` — same GST formula fix as #8

`AdminProductEditor.jsx` is **not** listed here — Section 7's recommendation is to leave it untouched in this integration.

## 14. Exact files that MUST NOT be changed

- `printbazzar_react/client/src/admin/AdminProductEditor.jsx` — leave its Tab 6 (Exact Combination Pricing) and inline slab builder exactly as they are on main; do not port the backup's removal.
- `server/src/controllers/adminController.js` — its `ProductCombination` CRUD is Method A's admin-side support and is out of scope for this pricing-model integration.
- `server/src/controllers/catalogController.js` — Method A's customer-facing wiring; unaffected by Method B changes.
- `server/src/controllers/invoiceController.js` — no direct change needed; it inherits the Section 9 fix automatically once `orderController.js`'s `taxableAmount`/`totalTax` are correct.
- `server/prisma/schema.prisma`'s `PriceVersion` model — do not add `status`/its index (Section 8) without the separate DB-state confirmation.
- Any `ProductPriceSlab`/`Product` row data — this is a code-only integration; no `UPDATE`/seed script should run against Menu Card, Chromo Art Sticker, or any other live product's prices.

## 15. Risks and rollback strategy

- **Risk**: Method A regression. Mitigated by Section 10's new dedicated test, run immediately after the Method B rewrite (Section 12 step 3) rather than only at the end.
- **Risk**: the "ProductCombination has zero production usage" assumption baked into the backup's `AdminProductEditor.jsx` turns out to be correct after all (i.e., it really is unused in the live database), in which case this plan's Section 7 caution is overly conservative. Low cost either way — leaving the feature in place when it's actually unused costs nothing but a slightly larger diff; the reverse (removing something live) is the outcome worth avoiding, so the asymmetry favors caution.
- **Risk**: the GST formula fix (Section 9) changes numbers that appear on customer-facing invoices going forward. Rollback is trivial at the code level (revert the three files), but any orders placed between deployment and a rollback would carry the new formula's figures — flag to finance before shipping, per Section 11.
- **Risk**: `schema.prisma` drift if `PriceVersion.status` does turn out to already exist on the production database out-of-band and Task #29 doesn't add it to the Prisma schema — Prisma would then be unaware of a real column. This is exactly why Section 8 requires the DB-state check first rather than assuming either direction.
- **Rollback strategy overall**: since Task #29 (per this plan) never touches `main` directly — it produces a patch/diff against the fresh-main base, the same delivery pattern Tasks #23/24 already used — rollback is simply "don't apply the patch" or "revert the commit" once it eventually is applied somewhere with a real git history. No production system is touched by the planning or implementation work itself.

---

## PROPOSED TASK #29 IMPLEMENTATION SCOPE

**Base**: fresh authoritative `main`, `a7bd3bcb3de079d5d605eb0093b9e95de6a47069` (re-verify this hasn't moved before starting).

**Files to change, and exactly what changes in each:**

1. **`server/src/utils/pricingEngine.js`** — add `isSideOptionKey`, `resolveQuantityModel`, `isDoubleSideAvailable`; split Method B into `OPEN_QUANTITY`/`FIXED_SLAB` branches; FIXED_SLAB uses `matchFixedSlabForQuantity` + `describeConfiguredRanges` (Task #24's finite-overlap/duplicate-minQty safe-reject logic included); Method A left byte-for-byte unchanged; tax-calculation formula corrected to extract from a GST-inclusive price (`taxableAmount = round(subtotal/(1+taxRate/100))`, `totalTax = subtotal - taxableAmount`) instead of `subtotal*taxRate/100`; `igst` computed from a new `isInterState` param instead of hardcoded `0`.
2. **`printbazzar_react/client/src/utils/pricingEngine.js`** — identical mirror of #1.
3. **`printbazzar_react/client/src/Components/DynamicQuantityTierPricing.jsx`** — `isOpenQuantity` UI split; tier chips show `rangeLabel`.
4. **`printbazzar_react/client/src/admin/AdminProductConfigurator.jsx`** — `quantityType` load-normalization to `'OPEN_QUANTITY'`/`'FIXED_SLAB'`.
5. **`server/prisma/schema.prisma`** — comment-only documentation on `Product.quantityType` and `ProductPriceSlab.minQty`/`maxQty`; **no** column/type/migration change; `PriceVersion` untouched pending Section 8's DB check.
6. **`server/src/controllers/orderController.js`** — replace the inline `totalTax/cgstAmount/sgstAmount` block with the corrected GST-inclusive extraction; add `isInterState` determination from `shippingAddress.state` vs the company's registered home state; set real `igstAmount` instead of hardcoded `0`.
7. **`server/src/controllers/posController.js`** — same fix as #6, applied to its own independent tax block.
8. **`server/tests/canonical-quantity-side-pricing.test.js`** (new) — the existing 27-test suite (A1–A15 + B–F), carried over as-is.
9. **`server/tests/sdc1-side-pricing-regression.test.js`** (new) — carried over as-is.
10. **New test file** (name TBD, e.g. `server/tests/method-a-combination-untouched.test.js`) — asserts Method A resolution is unaffected by the Method B rewrite.
11. **New test file** (name TBD, e.g. `server/tests/gst-inclusive-tax.test.js`) — asserts correct taxable-value/tax-amount extraction and correct intra-/inter-state CGST+SGST vs IGST selection.

**Explicitly out of scope for Task #29**: `AdminProductEditor.jsx` (Section 7), `adminController.js`/`catalogController.js` (Method A wiring, Section 14), `PriceVersion.status` (Section 8), and any production data/price changes for Menu Card, Chromo Art Sticker, or any other product.

**NO FILES MODIFIED.**

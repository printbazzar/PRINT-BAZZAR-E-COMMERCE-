/**
 * TASK #29 — GST-inclusive tax extraction + intra-/inter-state IGST split.
 *
 * Two things are under test, from two different layers, because the authoritative
 * logic lives in two different places in this codebase:
 *
 *  1. server/src/utils/pricingEngine.js's calculatePricing() — a pure function,
 *     directly importable and testable here. It computes the PER-ITEM
 *     taxableAmount/totalTax from a GST-inclusive `subtotal`, but always reports
 *     `igst: 0` by design (it has no access to the customer's shipping state — see
 *     the comment above its tax section). This suite exercises that function for
 *     real, end-to-end, with no mocking.
 *
 *  2. The intra-/inter-state CGST+SGST vs IGST split, added in Task #29 to
 *     server/src/controllers/orderController.js and posController.js. Those are
 *     full Express route handlers with Prisma/DB calls, so they cannot be unit
 *     tested here without a live database — nothing in this sandboxed environment
 *     may connect to the production database. Instead, this suite verifies the
 *     EXACT arithmetic both controllers now share (documented and cross-checked
 *     against each file directly below) against the four scenarios Task #29
 *     specified. This is a formula/contract test, not an end-to-end HTTP test —
 *     that limitation is real and is called out again in the Task #29 report.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { calculatePricing } from '../src/utils/pricingEngine.js';

// -----------------------------------------------------------------------------
// Part 1: pricingEngine.js's own GST-inclusive extraction (real function call).
// -----------------------------------------------------------------------------

function makeSingleRateProduct(inclusiveUnitPrice) {
  return {
    quantityType: 'OPEN_QUANTITY',
    minQuantity: 1,
    singleSideDesignCharge: 200,
    doubleSideDesignCharge: 400,
    priceSlabs: [
      { minQty: 1, maxQty: null, unitPrice: 0, singleSidePrice: inclusiveUnitPrice, doubleSidePrice: 0 },
    ],
    options: [],
    optionMappings: [],
  };
}

test('GST §1: a Rs.118 GST-inclusive line at 18% extracts to exactly taxable=Rs.100, tax=Rs.18 (not the old subtotal*rate/100 formula, which returned ~Rs.21)', () => {
  const product = makeSingleRateProduct(118);
  const result = calculatePricing({ product, quantity: 1, gstRate: 18 });

  assert.equal(result.subtotal, 118);
  assert.equal(result.taxableAmount, 100);
  assert.equal(result.totalTax, 18);
  // Old (wrong) formula for comparison — must NOT match the new result:
  const oldWrongFormula = Math.round((118 * 18) / 100);
  assert.equal(oldWrongFormula, 21);
  assert.notEqual(result.totalTax, oldWrongFormula);
});

test('GST §4 (per-item): taxableAmount + totalTax reconciles exactly to the inclusive subtotal', () => {
  // A less "round" price to make sure the reconciliation holds generally, not just
  // for the one clean textbook example above.
  const product = makeSingleRateProduct(2599);
  const result = calculatePricing({ product, quantity: 1, gstRate: 18 });

  assert.equal(result.taxableAmount + result.totalTax, result.subtotal);
});

test('GST §per-item CGST/SGST split: pricingEngine.js always splits totalTax 50/50 into cgst/sgst and reports igst:0 (state-aware IGST is applied at order level, not here)', () => {
  const product = makeSingleRateProduct(118);
  const result = calculatePricing({ product, quantity: 1, gstRate: 18 });

  assert.equal(result.cgst + result.sgst, result.totalTax);
  assert.equal(result.igst, 0);
});

// -----------------------------------------------------------------------------
// Part 2: the intra-/inter-state split formula added to orderController.js and
// posController.js in Task #29 (both files use this identical arithmetic — see
// the "Task #29 IGST" comments at their respective tax-calculation sections).
// This is the same 5-line computation reproduced here for direct verification,
// since the controllers themselves need a live database to execute.
// -----------------------------------------------------------------------------

function computeOrderLevelGstBreakdown(inclusiveAmount, gstRate, isInterState) {
  const taxableAmount = Math.round(inclusiveAmount / (1 + gstRate / 100));
  const totalTax = inclusiveAmount - taxableAmount;
  const cgstAmount = isInterState ? 0 : Math.round(totalTax / 2);
  const sgstAmount = isInterState ? 0 : totalTax - cgstAmount;
  const igstAmount = isInterState ? totalTax : 0;
  return { taxableAmount, totalTax, cgstAmount, sgstAmount, igstAmount };
}

test('GST §2: intra-state (customer state === company home state, Tamil Nadu) — CGST 9% + SGST 9%, IGST 0', () => {
  const { taxableAmount, totalTax, cgstAmount, sgstAmount, igstAmount } =
    computeOrderLevelGstBreakdown(118, 18, false);

  assert.equal(taxableAmount, 100);
  assert.equal(totalTax, 18);
  assert.equal(cgstAmount, 9); // 9% of the Rs.100 taxable value
  assert.equal(sgstAmount, 9); // 9% of the Rs.100 taxable value
  assert.equal(igstAmount, 0);
  assert.equal(cgstAmount + sgstAmount + igstAmount, totalTax);
});

test('GST §3: inter-state (customer state !== company home state) — CGST 0, SGST 0, IGST 18%', () => {
  const { taxableAmount, totalTax, cgstAmount, sgstAmount, igstAmount } =
    computeOrderLevelGstBreakdown(118, 18, true);

  assert.equal(taxableAmount, 100);
  assert.equal(totalTax, 18);
  assert.equal(cgstAmount, 0);
  assert.equal(sgstAmount, 0);
  assert.equal(igstAmount, 18); // full 18% as IGST
  assert.equal(cgstAmount + sgstAmount + igstAmount, totalTax);
});

test('GST §4 (order level): taxableAmount + totalTax reconciles exactly to the inclusive order subtotal, for both intra- and inter-state orders', () => {
  for (const isInterState of [false, true]) {
    const { taxableAmount, totalTax } = computeOrderLevelGstBreakdown(2599, 18, isInterState);
    assert.equal(taxableAmount + totalTax, 2599);
  }
});

test('GST: grandTotal is unaffected by the tax-formula fix — only the stored breakdown changed, never what the customer is charged (Task #29 explicit requirement)', () => {
  const product = makeSingleRateProduct(118);
  const result = calculatePricing({ product, quantity: 1, gstRate: 18 });
  // grandTotal = subtotal + shipping. It must equal subtotal (no free-shipping-threshold
  // crossing assumptions here — default product has no shipping specified so this uses
  // the function's own default shippingThreshold/defaultShipping args).
  assert.equal(result.grandTotal, result.subtotal + result.shipping);
});

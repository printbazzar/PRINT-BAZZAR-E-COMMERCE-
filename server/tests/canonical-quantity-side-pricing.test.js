/**
 * TASK #15 — Canonical Quantity + Printing Side Pricing Architecture.
 *
 * Covers Section 13's required test groups A-F against the real, confirmed
 * business rules:
 *   A. FIXED_SLAB — exact configured quantities accepted, everything else
 *      rejected with a clear validation error. No fallback price is ever
 *      returned.
 *   B. OPEN_QUANTITY — any positive integer accepted, priced as
 *      unitRate x quantity, using the product's own configured slab rate.
 *   C. Couple Pair Mug — quantity represents PAIRS (the pricing engine is
 *      quantity-unit-agnostic by design: it multiplies whatever integer it
 *      is given by the configured rate; the "pairs, not pieces" meaning is a
 *      display/label concern (Product.quantityUnit = "Pairs"), and this
 *      suite proves the math itself is unaffected by which unit the number
 *      represents).
 *   D. Printing Side — Single Side and Double Side each resolve to the
 *      slab's own exact singleSidePrice/doubleSidePrice, never a generic
 *      surcharge, and Double Side is rejected outright when no real,
 *      distinct double-side price is configured.
 *   E. Chromo Art Sticker — single-side only in practice (its own slab has
 *      singleSidePrice === doubleSidePrice), and its legacy generic
 *      "Printing Location" +50 modifier does not affect canonical pricing.
 *   F. Frontend/server parity — the client's duplicate preview engine
 *      (printbazzar_react/client/src/utils/pricingEngine.js) is imported
 *      directly (it is plain JS with no React/browser dependency) and
 *      asserted to return the IDENTICAL basePrice/isAvailable/
 *      unavailableReason as the server for the same fixtures and inputs —
 *      not just "close enough", byte-identical business decisions.
 *
 * All fixture prices are taken from real production ProductPriceSlab rows
 * captured during Tasks #11-#14 (SDC1, and the 3 named Task #15 products
 * Magic Mug / Couple Pair Mug / Chromo Art Sticker), not invented numbers.
 *
 * Run with:
 *   node --experimental-test-module-mocks --test tests/canonical-quantity-side-pricing.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculatePricing,
  resolveQuantityModel,
  isDoubleSideAvailable,
} from '../src/utils/pricingEngine.js';

import { calculatePricing as clientCalculatePricing } from '../../printbazzar_react/client/src/utils/pricingEngine.js';

// ---------------------------------------------------------------------------
// Fixtures — real production data
// ---------------------------------------------------------------------------

// SDC1 "Standard Cards" — FIXED_SLAB, real per-tier Double Side prices
// (Task #10B/#11 fixture, reused here with quantityType now set explicitly).
function makeSDC1() {
  return {
    id: 'sdc1',
    sku: 'SDC1',
    quantityType: 'FIXED_SLAB',
    minQuantity: 100,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 100, maxQty: null, unitPrice: 2, singleSidePrice: 200, doubleSidePrice: 250 },
      { minQty: 200, maxQty: null, unitPrice: 1.5, singleSidePrice: 300, doubleSidePrice: 360 },
      { minQty: 300, maxQty: null, unitPrice: 1.27, singleSidePrice: 380, doubleSidePrice: 460 },
      { minQty: 500, maxQty: null, unitPrice: 0.96, singleSidePrice: 480, doubleSidePrice: 670 },
      { minQty: 1000, maxQty: null, unitPrice: 0.85, singleSidePrice: 850, doubleSidePrice: 1250 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
}

// PB0006-style bounded-tier FIXED_SLAB product — matches Task #15's own
// worked example almost exactly (100 -> single/double, 250 -> single/double).
// Task #24 correction: the second tier's minQty was originally 200 (creating
// an unintended finite-finite overlap with the first tier's 100-249 across
// 200-249 — a fixture inconsistency, not a deliberate test of that scenario).
// Task #24's Example D proved that TWO explicitly-bounded, genuinely
// overlapping ranges must fail safely, not silently tie-break — so this
// fixture is corrected to be contiguous/non-overlapping (matching real
// PB0006 production data exactly, see A9), and the genuine finite-overlap
// case is now tested deliberately and explicitly in A12 below.
function makeBoundedFixedSlabProduct() {
  return {
    id: 'pb0006',
    sku: 'PB0006',
    quantityType: 'FIXED_SLAB',
    minQuantity: 100,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 100, maxQty: 249, unitPrice: 3, singleSidePrice: 300, doubleSidePrice: 350 },
      { minQty: 250, maxQty: 499, unitPrice: 2.52, singleSidePrice: 630, doubleSidePrice: 720 },
      { minQty: 500, maxQty: null, unitPrice: 1.3, singleSidePrice: 650, doubleSidePrice: 1100 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
}

// Magic Mug (PB-LIVE-0021) — real OPEN_QUANTITY fixture: single slab,
// minQty 1, singleSidePrice = doubleSidePrice = 450 (Task #13/#14 data).
function makeMagicMug() {
  return {
    id: 'magic-mug',
    sku: 'PB-LIVE-0021',
    quantityType: 'OPEN_QUANTITY',
    quantityUnit: 'Pieces',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: null, unitPrice: 450, singleSidePrice: 450, doubleSidePrice: 450 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'PER_PIECE',
  };
}

// Couple Pair Mug (PB-LIVE-0020) — real OPEN_QUANTITY fixture, quantityUnit
// "Pairs": the number passed as `quantity` represents PAIRS, not individual
// mugs (Task #15 Section 1 explicit instruction).
function makeCouplePairMug() {
  return {
    id: 'couple-pair-mug',
    sku: 'PB-LIVE-0020',
    quantityType: 'OPEN_QUANTITY',
    quantityUnit: 'Pairs',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: null, unitPrice: 1000, singleSidePrice: 1000, doubleSidePrice: 1000 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'FIXED_QTY',
  };
}

// Chromo Art Sticker (PB-LIVE-0032) — real OPEN_QUANTITY fixture whose slab
// has singleSidePrice === doubleSidePrice === 25 (no real double-side price
// ever configured), PLUS the real, still-present legacy "Printing Location"
// option mapping with an enabled +50 FLAT double-side modifier (Task #13/#14
// finding) — kept in this fixture specifically to prove it has zero effect
// on canonical pricing (Task #15 Section 12).
function makeChromoArtSticker() {
  return {
    id: 'chromo-art-sticker',
    sku: 'PB-LIVE-0032',
    quantityType: 'OPEN_QUANTITY',
    quantityUnit: 'Sheets',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: null, unitPrice: 25, singleSidePrice: 25, doubleSidePrice: 25 },
    ],
    options: [],
    optionMappings: [
      {
        isEnabled: true,
        isAddon: false,
        customLabel: 'Printing Location',
        master: { name: 'Printing Location', code: 'printing_location' },
        valueMappings: [
          {
            customLabel: null,
            masterValue: { code: 'single_side', label: 'Single Side' },
            priceModifierType: 'FLAT',
            priceModifierValue: 0,
          },
          {
            customLabel: null,
            masterValue: { code: 'double_side', label: 'Double Side' },
            priceModifierType: 'FLAT',
            priceModifierValue: 50,
          },
        ],
      },
    ],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'PER_PIECE',
  };
}

// ---------------------------------------------------------------------------
// resolveQuantityModel — explicitness sanity checks
// ---------------------------------------------------------------------------
test('resolveQuantityModel reads only Product.quantityType, never infers from slab shape', () => {
  assert.equal(resolveQuantityModel(makeSDC1()), 'FIXED_SLAB');
  assert.equal(resolveQuantityModel(makeMagicMug()), 'OPEN_QUANTITY');
  // A product with no quantityType at all (pre-migration legacy state) defaults to
  // FIXED_SLAB, never OPEN_QUANTITY — "explicit or FIXED_SLAB", never the reverse.
  assert.equal(resolveQuantityModel({ priceSlabs: [{ minQty: 1, maxQty: null }] }), 'FIXED_SLAB');
  assert.equal(resolveQuantityModel({}), 'FIXED_SLAB');
});

// ---------------------------------------------------------------------------
// A. FIXED_SLAB — Task #23 LOCKED RULE CHANGE: range-based matching, not
// exact-match-only. This supersedes the exact-minQty-only behavior that
// Tasks #15/#16/#18 built, tested (124+ tests), and verified against live
// production data. A quantity is now valid for a slab when it falls within
// that slab's [minQty, maxQty] (maxQty null/unset = open-ended). When a
// quantity is covered by more than one configured slab (the common
// "open-ended ladder" shape — see matchFixedSlabForQuantity() in
// server/src/utils/pricingEngine.js), the slab with the highest minQty
// among the matches wins; a genuine tie (two slabs sharing the same minQty)
// is an invalid configuration and fails safely rather than guessing. No
// interpolation and no extrapolation exist anywhere in this path — a
// quantity outside every configured range is still rejected outright.
// ---------------------------------------------------------------------------
test('A1. FIXED_SLAB: every configured quantity is still accepted at its exact configured price (unchanged from the old exact-match rule)', () => {
  const r100 = calculatePricing({ product: makeBoundedFixedSlabProduct(), quantity: 100 });
  const r250 = calculatePricing({ product: makeBoundedFixedSlabProduct(), quantity: 250 });
  const r500 = calculatePricing({ product: makeBoundedFixedSlabProduct(), quantity: 500 });

  assert.equal(r100.isAvailable, true);
  assert.equal(r100.basePrice, 300);
  assert.equal(r250.isAvailable, true);
  assert.equal(r250.basePrice, 630);
  assert.equal(r500.isAvailable, true);
  assert.equal(r500.basePrice, 650);
});

test('A2. FIXED_SLAB (Task #23 reversal): a quantity strictly inside a configured range — not equal to any minQty — is now ACCEPTED at that range\'s price, not rejected', () => {
  // 150 and 175 are both inside the 100-249 slab. Under the OLD exact-match rule
  // (Tasks #15/#16/#18) these were rejected. Under Task #23's explicit new rule
  // ("quantities 1 through 24 are valid" for a 1-24 slab), they are now accepted.
  const r150 = calculatePricing({ product: makeBoundedFixedSlabProduct(), quantity: 150 });
  const r175 = calculatePricing({ product: makeBoundedFixedSlabProduct(), quantity: 175 });
  assert.equal(r150.isAvailable, true);
  assert.equal(r150.basePrice, 300); // the 100-249 slab's singleSidePrice
  assert.equal(r175.isAvailable, true);
  assert.equal(r175.basePrice, 300);

  // 300 is inside the 250-499 slab only (not 100-249, which caps at 249).
  const r300 = calculatePricing({ product: makeBoundedFixedSlabProduct(), quantity: 300 });
  assert.equal(r300.isAvailable, true);
  assert.equal(r300.basePrice, 630);
});

test('A3. FIXED_SLAB open-ended-ladder range tie-break: a quantity covered by two OPEN-ENDED (null-maxQty) overlapping slabs resolves to the HIGHEST-minQty (most specific) slab, never the lowest', () => {
  // Dedicated minimal fixture: two slabs, neither with an explicit maxQty — the
  // "implicit ladder" shape (Menu Card's and SDC1's real production data, and A5/A6
  // below). qty=250 is covered by BOTH (100+ and 200+), so this resolves to the
  // 200+ slab, the same "highest threshold not exceeded" rule ordinary tiered
  // pricing uses — and explicitly NOT the lowest slab, which is the exact bug
  // Task #12 fixed for a different (maxQty-based) matching scheme. This is
  // deliberately distinct from A12's finite-finite overlap, which fails safely.
  const ladderProduct = {
    id: 'ladder-example',
    sku: 'TEST-LADDER',
    quantityType: 'FIXED_SLAB',
    minQuantity: 100,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 100, maxQty: null, singleSidePrice: 300, doubleSidePrice: 300 },
      { minQty: 200, maxQty: null, singleSidePrice: 550, doubleSidePrice: 550 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  const result = calculatePricing({ product: ladderProduct, quantity: 250 });
  assert.equal(result.isAvailable, true);
  assert.equal(result.basePrice, 550);
});

test('A4. FIXED_SLAB below the lowest configured minQty is rejected — still no fallback price of any kind', () => {
  const result = calculatePricing({ product: makeBoundedFixedSlabProduct(), quantity: 50 });
  assert.equal(result.isAvailable, false);
  assert.equal(result.basePrice, 0);
  assert.equal(result.productPrice, 0);
  assert.equal(result.grandTotal, 0);
  assert.match(result.unavailableReason, /Quantity 50 is not available/);
  // The rejection message now names real configured RANGES, not bare quantities.
  assert.match(result.unavailableReason, /100-249/);
});

test('A5. FIXED_SLAB open-ended ladder (SDC1\'s real production shape — every slab maxQty=null): the highest applicable tier wins, matching Task #12\'s original fix intent (never silently falls to the lowest tier)', () => {
  // SDC1 slabs: 100+, 200+, 300+, 500+, 1000+ (all maxQty=null in real production data).
  // qty=750 is covered by 100/200/300/500 (not 1000) — the tightest match is 500.
  const result = calculatePricing({ product: makeSDC1(), quantity: 750 });
  assert.equal(result.isAvailable, true);
  assert.equal(result.basePrice, 480); // the 500+ slab's singleSidePrice, not the 100+ slab's
});

test('A6. FIXED_SLAB (Task #23 reversal, real historical case): SDC1 quantity 250 — between the 200 and 300 tiers — is now ACCEPTED at the 200+ tier\'s price', () => {
  // Task #12 found real historical SDC1 orders at quantity 250, previously priced by a
  // since-removed nearest-slab-plus-linear-extrapolation fallback into an unconfigured
  // ₹375; Tasks #15/#16/#18 then made this qty flatly REJECTED under exact-match-only.
  // Task #23 explicitly locks in range-based matching instead: 250 falls inside the
  // open-ended 200+ tier (the next tier starts at 300, so 250 is uniquely inside 200+),
  // so it is now accepted at that tier's real, already-configured price — not
  // interpolated, not extrapolated, not a new invented number.
  const result = calculatePricing({ product: makeSDC1(), quantity: 250 });
  assert.equal(result.isAvailable, true);
  assert.equal(result.basePrice, 300); // the 200+ slab's singleSidePrice
});

test('A7. FIXED_SLAB worked example from the Task #23 brief itself: slabs minQty=1/maxQty=24 and minQty=25/maxQty=null — 1, 10, 24, 25, 100, and 1000 are all valid', () => {
  const product = {
    id: 'worked-example',
    sku: 'TEST-WORKED-EXAMPLE',
    quantityType: 'FIXED_SLAB',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: 24, unitPrice: 10, singleSidePrice: 100, doubleSidePrice: 160 },
      { minQty: 25, maxQty: null, unitPrice: 8, singleSidePrice: 80, doubleSidePrice: 140 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  for (const qty of [1, 10, 24]) {
    const r = calculatePricing({ product, quantity: qty });
    assert.equal(r.isAvailable, true, `qty ${qty} should be valid`);
    assert.equal(r.basePrice, 100, `qty ${qty} should price at the 1-24 slab's rate`);
  }
  for (const qty of [25, 100, 1000]) {
    const r = calculatePricing({ product, quantity: qty });
    assert.equal(r.isAvailable, true, `qty ${qty} should be valid`);
    assert.equal(r.basePrice, 80, `qty ${qty} should price at the 25+ slab's rate`);
  }
});

test('A8. FIXED_SLAB gap-reject: a quantity that falls in a genuine unconfigured gap between two bounded ranges is rejected, no interpolation', () => {
  const productWithGap = {
    id: 'gap-example',
    sku: 'TEST-GAP-EXAMPLE',
    quantityType: 'FIXED_SLAB',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: 24, unitPrice: 10, singleSidePrice: 100, doubleSidePrice: 100 },
      // Deliberate gap: 25-49 is not covered by any slab.
      { minQty: 50, maxQty: null, unitPrice: 8, singleSidePrice: 350, doubleSidePrice: 350 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  for (const qty of [25, 30, 49]) {
    const result = calculatePricing({ product: productWithGap, quantity: qty });
    assert.equal(result.isAvailable, false, `qty ${qty} falls in the configured gap and must be rejected`);
    assert.equal(result.basePrice, 0);
    assert.match(result.unavailableReason, new RegExp(`Quantity ${qty} is not available`));
    assert.match(result.unavailableReason, /1-24/);
    assert.match(result.unavailableReason, /50\+/);
  }
});

test('A9. FIXED_SLAB above-maximum-reject: a quantity above the highest slab is rejected when that slab has a FINITE maxQty (no extrapolation) — real PB0006 production shape', () => {
  const pb0006 = {
    id: 'pb0006-full',
    sku: 'PB0006',
    quantityType: 'FIXED_SLAB',
    minQuantity: 100,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 100, maxQty: 249, singleSidePrice: 300, doubleSidePrice: 350 },
      { minQty: 250, maxQty: 499, singleSidePrice: 630, doubleSidePrice: 720 },
      { minQty: 500, maxQty: 999, singleSidePrice: 1080, doubleSidePrice: 1230 },
      { minQty: 1000, maxQty: 1999, singleSidePrice: 1860, doubleSidePrice: 2110 },
      { minQty: 2000, maxQty: 10000, singleSidePrice: 3300, doubleSidePrice: 3700 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  // Real production shape has no gaps up to 10000, and any in-range qty resolves cleanly.
  const inRange = calculatePricing({ product: pb0006, quantity: 5000 });
  assert.equal(inRange.isAvailable, true);
  assert.equal(inRange.basePrice, 3300);

  // 15000 is above the highest slab's finite maxQty (10000) — rejected, not extrapolated.
  const aboveMax = calculatePricing({ product: pb0006, quantity: 15000 });
  assert.equal(aboveMax.isAvailable, false);
  assert.equal(aboveMax.basePrice, 0);
  assert.match(aboveMax.unavailableReason, /Quantity 15000 is not available/);
});

test('A10. FIXED_SLAB duplicate-minQty configuration is an invalid configuration and fails safely, per Task #23\'s explicit instruction — it never silently guesses which price applies', () => {
  const duplicateConfig = {
    id: 'duplicate-example',
    sku: 'TEST-DUPLICATE-MINQTY',
    quantityType: 'FIXED_SLAB',
    minQuantity: 100,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 100, maxQty: 499, singleSidePrice: 300, doubleSidePrice: 300 },
      { minQty: 100, maxQty: null, singleSidePrice: 999, doubleSidePrice: 999 }, // duplicate minQty=100
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  const result = calculatePricing({ product: duplicateConfig, quantity: 100 });
  assert.equal(result.isAvailable, false);
  assert.equal(result.basePrice, 0);
  assert.match(result.unavailableReason, /configuration issue/i);
});

test('A11. FIXED_SLAB Menu Card (PB0041) real current production shape: both slabs have maxQty=null (minQty=1 and minQty=25) — for qty >= 25 both technically cover it, but they do NOT share the same minQty, so this is not the ambiguous "duplicate-minQty" case (A10); the tie-break correctly resolves to the higher-minQty (25+) slab, which is also the correct real-world answer', () => {
  const menuCard = {
    id: 'menu-card',
    sku: 'PB0041',
    quantityType: 'FIXED_SLAB',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: null, singleSidePrice: 100, doubleSidePrice: 100 },
      { minQty: 25, maxQty: null, singleSidePrice: 2000, doubleSidePrice: 2000 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  // qty=10 is covered ONLY by the minQty=1 slab (the minQty=25 slab doesn't reach it) —
  // no overlap, no ambiguity, priced normally.
  const single = calculatePricing({ product: menuCard, quantity: 10 });
  assert.equal(single.isAvailable, true);
  assert.equal(single.basePrice, 100);

  // qty=30 is covered by BOTH slabs (both have maxQty=null). A "duplicate-minQty" config
  // error (A10) only applies when two slabs share the identical minQty — these do not (1
  // vs 25), so the tie-break correctly picks the higher-minQty (25+) slab, not a config
  // error. This is the intended, sensible resolution for Menu Card's real current data:
  // an order of 30 units correctly gets the bulk 25+ tier price.
  const bulk = calculatePricing({ product: menuCard, quantity: 30 });
  assert.equal(bulk.isAvailable, true);
  assert.equal(bulk.basePrice, 2000);
});

test('A12. FIXED_SLAB (Task #24 Example D): two EXPLICITLY, FINITELY bounded slabs that genuinely overlap (1-100 and 50-200, different minQty) must fail safely, never silently pick one', () => {
  // This is different from A3/A5/A6/A11's open-ended-ladder overlaps: here BOTH
  // slabs have a real, deliberately-set maxQty, and those explicit bounds
  // contradict each other for 50-100. There is no "implicit" side to defer to.
  const product = {
    id: 'example-d',
    sku: 'TEST-EXAMPLE-D',
    quantityType: 'FIXED_SLAB',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: 100, singleSidePrice: 100, doubleSidePrice: 100 },
      { minQty: 50, maxQty: 200, singleSidePrice: 90, doubleSidePrice: 90 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  for (const qty of [50, 75, 100]) {
    const result = calculatePricing({ product, quantity: qty });
    assert.equal(result.isAvailable, false, `qty ${qty} is ambiguously covered by two finite, overlapping ranges and must fail safely`);
    assert.equal(result.basePrice, 0);
    assert.match(result.unavailableReason, /configuration issue/i);
  }
  // qty=1-49 is covered ONLY by the first slab (the second doesn't reach below 50) —
  // no overlap there, priced normally.
  const unambiguous = calculatePricing({ product, quantity: 10 });
  assert.equal(unambiguous.isAvailable, true);
  assert.equal(unambiguous.basePrice, 100);
  // qty=101-200 is covered ONLY by the second slab (the first caps at 100) —
  // no overlap there either, priced normally.
  const unambiguous2 = calculatePricing({ product, quantity: 150 });
  assert.equal(unambiguous2.isAvailable, true);
  assert.equal(unambiguous2.basePrice, 90);
});

test('A13. FIXED_SLAB (Task #24 Example E): duplicate minQty (1-100 and 1-200) must fail safely wherever both cover the quantity', () => {
  const product = {
    id: 'example-e',
    sku: 'TEST-EXAMPLE-E',
    quantityType: 'FIXED_SLAB',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: 100, singleSidePrice: 100, doubleSidePrice: 100 },
      { minQty: 1, maxQty: 200, singleSidePrice: 90, doubleSidePrice: 90 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  for (const qty of [1, 50, 100]) {
    const result = calculatePricing({ product, quantity: qty });
    assert.equal(result.isAvailable, false, `qty ${qty} is covered by both duplicate-minQty slabs and must fail safely`);
    assert.match(result.unavailableReason, /configuration issue/i);
  }
  // qty=101-200 is unambiguous (only the second slab reaches this far).
  const unambiguous = calculatePricing({ product, quantity: 150 });
  assert.equal(unambiguous.isAvailable, true);
  assert.equal(unambiguous.basePrice, 90);
});

test('A14. FIXED_SLAB (Task #24 Example B): a genuine gap between 1-100 and 200+ rejects 101-199, while 1/100/200/500 all remain valid', () => {
  const product = {
    id: 'example-b',
    sku: 'TEST-EXAMPLE-B',
    quantityType: 'FIXED_SLAB',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: 100, singleSidePrice: 100, doubleSidePrice: 100 },
      { minQty: 200, maxQty: null, singleSidePrice: 80, doubleSidePrice: 80 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  for (const qty of [1, 100]) {
    const r = calculatePricing({ product, quantity: qty });
    assert.equal(r.isAvailable, true, `qty ${qty} should be valid`);
    assert.equal(r.basePrice, 100);
  }
  for (const qty of [200, 500]) {
    const r = calculatePricing({ product, quantity: qty });
    assert.equal(r.isAvailable, true, `qty ${qty} should be valid`);
    assert.equal(r.basePrice, 80);
  }
  for (const qty of [101, 150, 199]) {
    const r = calculatePricing({ product, quantity: qty });
    assert.equal(r.isAvailable, false, `qty ${qty} falls in the 101-199 gap and must be rejected`);
    assert.match(r.unavailableReason, new RegExp(`Quantity ${qty} is not available`));
  }
});

test('A15. FIXED_SLAB (Task #24 Example C): exact tier-boundary quantities price at the correct adjacent tier, never the wrong neighbor', () => {
  const product = {
    id: 'example-c',
    sku: 'TEST-EXAMPLE-C',
    quantityType: 'FIXED_SLAB',
    minQuantity: 1,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 1, maxQty: 100, singleSidePrice: 100, doubleSidePrice: 100 },
      { minQty: 101, maxQty: 200, singleSidePrice: 90, doubleSidePrice: 90 },
      { minQty: 201, maxQty: null, singleSidePrice: 80, doubleSidePrice: 80 },
    ],
    options: [],
    optionMappings: [],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
  const r100 = calculatePricing({ product, quantity: 100 });
  assert.equal(r100.isAvailable, true);
  assert.equal(r100.basePrice, 100);

  const r101 = calculatePricing({ product, quantity: 101 });
  assert.equal(r101.isAvailable, true);
  assert.equal(r101.basePrice, 90);

  const r200 = calculatePricing({ product, quantity: 200 });
  assert.equal(r200.isAvailable, true);
  assert.equal(r200.basePrice, 90);

  const r201 = calculatePricing({ product, quantity: 201 });
  assert.equal(r201.isAvailable, true);
  assert.equal(r201.basePrice, 80);
});

// ---------------------------------------------------------------------------
// B. OPEN_QUANTITY — any positive integer, priced as unitRate x quantity
// ---------------------------------------------------------------------------
test('B. OPEN_QUANTITY: every positive integer quantity is accepted and priced as unitRate x quantity', () => {
  for (const qty of [1, 2, 10, 25, 100]) {
    const result = calculatePricing({ product: makeMagicMug(), quantity: qty });
    assert.equal(result.isAvailable, true, `quantity ${qty} should be accepted`);
    assert.equal(result.basePrice, 450 * qty, `quantity ${qty} should price at 450 x ${qty}`);
  }
});

test('B. OPEN_QUANTITY: rejects a negative quantity rather than guessing', () => {
  // Note: `quantity: 0` is not exercised here — calculatePricing()'s pre-existing,
  // untouched top-level normalization (`parseInt(quantity, 10) || product.minQuantity`)
  // treats an explicit 0 as falsy and substitutes minQuantity before this validation ever
  // runs, for every pricing method, not just OPEN_QUANTITY — out of scope for Task #15.
  const negative = calculatePricing({ product: makeMagicMug(), quantity: -5 });
  assert.equal(negative.isAvailable, false);
  assert.match(negative.unavailableReason, /valid quantity/);
});

test('B. OPEN_QUANTITY: documents (does not change) two pre-existing, untouched top-level quantity-normalization behaviors named in the Task #23 test list — out of scope for this task, since fixing them would change quantity handling for every pricing method, not just OPEN_QUANTITY/FIXED_SLAB', () => {
  // quantity: 0 — the top-level `parseInt(quantity, 10) || product.minQuantity` treats an
  // explicit 0 as falsy and silently substitutes product.minQuantity (1) BEFORE this
  // validation branch ever runs. It is therefore accepted as quantity=1, not rejected.
  const zeroQty = calculatePricing({ product: makeMagicMug(), quantity: 0 });
  assert.equal(zeroQty.isAvailable, true);
  assert.equal(zeroQty.quantity, 1);

  // quantity: 2.5 — `parseInt('2.5', 10)` / `parseInt(2.5, 10)` both truncate to 2 at that
  // same top-level normalization step, before Number.isInteger(qty) is ever evaluated
  // inside the OPEN_QUANTITY branch — so a fractional input is silently floored to an
  // integer, not rejected as invalid.
  const fractionalQty = calculatePricing({ product: makeMagicMug(), quantity: 2.5 });
  assert.equal(fractionalQty.isAvailable, true);
  assert.equal(fractionalQty.quantity, 2);
});

// ---------------------------------------------------------------------------
// C. Couple Pair Mug — quantity represents PAIRS
// ---------------------------------------------------------------------------
test('C. Couple Pair Mug: 1/2/10 (pairs) price at the pair rate x number of pairs, exactly like any other OPEN_QUANTITY product', () => {
  for (const pairs of [1, 2, 10]) {
    const result = calculatePricing({ product: makeCouplePairMug(), quantity: pairs });
    assert.equal(result.isAvailable, true);
    assert.equal(result.basePrice, 1000 * pairs, `${pairs} pairs should price at 1000 x ${pairs}`);
    assert.equal(result.quantity, pairs);
  }
});

// ---------------------------------------------------------------------------
// D. Printing Side — exact slab price only, never a generic surcharge
// ---------------------------------------------------------------------------
test('D. Printing Side: Single Side resolves to the exact singleSidePrice, Double Side to the exact doubleSidePrice', () => {
  const single = calculatePricing({
    product: makeSDC1(),
    quantity: 200,
    selectedOptions: {}, // no side selected -> single side path
  });
  const double = calculatePricing({
    product: makeSDC1(),
    quantity: 200,
    selectedOptions: { 'Print Side': 'Double Side' },
  });

  assert.equal(single.basePrice, 300); // exact slab.singleSidePrice
  assert.equal(double.basePrice, 360); // exact slab.doubleSidePrice — NOT 300+50 or 300+100
  assert.equal(double.optionSurcharges, 0);
});

test('D. Printing Side: Double Side is rejected outright when the matched slab has no real double-side price configured', () => {
  const noRealDouble = {
    ...makeBoundedFixedSlabProduct(),
    priceSlabs: [{ minQty: 100, maxQty: null, unitPrice: 3, singleSidePrice: 300, doubleSidePrice: 300 }],
  };
  const result = calculatePricing({
    product: noRealDouble,
    quantity: 100,
    selectedOptions: { 'Print Side': 'Double Side' },
  });
  assert.equal(result.isAvailable, false);
  assert.match(result.unavailableReason, /Double Side printing is not available/);
});

test('isDoubleSideAvailable: true only when doubleSidePrice is a real, higher configured price', () => {
  assert.equal(isDoubleSideAvailable({ singleSidePrice: 300, doubleSidePrice: 360 }), true);
  assert.equal(isDoubleSideAvailable({ singleSidePrice: 25, doubleSidePrice: 25 }), false);
  assert.equal(isDoubleSideAvailable({ singleSidePrice: 300, doubleSidePrice: 0 }), false);
  assert.equal(isDoubleSideAvailable(null), false);
});

// ---------------------------------------------------------------------------
// E. Chromo Art Sticker — single-side only; legacy generic modifier inert
// ---------------------------------------------------------------------------
test('E. Chromo Art Sticker: Single Side is accepted at the exact configured rate', () => {
  const result = calculatePricing({
    product: makeChromoArtSticker(),
    quantity: 500,
    selectedOptions: { 'Printing Location': 'Single Side' },
  });
  assert.equal(result.isAvailable, true);
  assert.equal(result.basePrice, 25 * 500);
  assert.equal(result.optionSurcharges, 0);
});

test('E. Chromo Art Sticker: Double Side is rejected/unavailable — its slab has no real double-side price', () => {
  const result = calculatePricing({
    product: makeChromoArtSticker(),
    quantity: 500,
    selectedOptions: { 'Printing Location': 'Double Side' },
  });
  assert.equal(result.isAvailable, false);
  assert.equal(result.basePrice, 0);
  assert.match(result.unavailableReason, /Double Side printing is not available/);
});

test('E. Chromo Art Sticker: the legacy +50 Printing Location modifier never reaches canonical pricing, even when Single Side is selected', () => {
  const result = calculatePricing({
    product: makeChromoArtSticker(),
    quantity: 100,
    selectedOptions: { 'Printing Location': 'Single Side' },
  });
  assert.equal(result.productPrice, 25 * 100); // NOT 2500 + 50
  assert.equal(result.appliedModifiers.length, 0);
  assert.deepEqual(result.appliedModifiers, []);
});

// ---------------------------------------------------------------------------
// F. Frontend/server parity — the client preview engine must return the
// IDENTICAL business decision as the server for the same inputs.
// ---------------------------------------------------------------------------
test('F. Frontend/server parity: FIXED_SLAB exact match, rejection, and OPEN_QUANTITY math all agree byte-for-byte', () => {
  const cases = [
    { product: makeBoundedFixedSlabProduct(), quantity: 100, selectedOptions: {} },
    { product: makeBoundedFixedSlabProduct(), quantity: 200, selectedOptions: { 'Print Side': 'Double Side' } },
    { product: makeBoundedFixedSlabProduct(), quantity: 250, selectedOptions: {} }, // accepted on both sides (Task #23 range match)
    { product: makeBoundedFixedSlabProduct(), quantity: 50, selectedOptions: {} }, // rejected on both sides (below lowest minQty)
    { product: makeSDC1(), quantity: 250, selectedOptions: {} }, // the real historical edge case — now accepted on both sides
    { product: makeMagicMug(), quantity: 37, selectedOptions: {} },
    { product: makeCouplePairMug(), quantity: 4, selectedOptions: {} },
    { product: makeChromoArtSticker(), quantity: 500, selectedOptions: { 'Printing Location': 'Double Side' } },
  ];

  for (const c of cases) {
    const server = calculatePricing(c);
    const client = clientCalculatePricing(c);
    assert.equal(client.isAvailable, server.isAvailable, `isAvailable mismatch for ${c.product.sku} @ qty ${c.quantity}`);
    assert.equal(client.basePrice, server.basePrice, `basePrice mismatch for ${c.product.sku} @ qty ${c.quantity}`);
    if (!server.isAvailable) {
      assert.equal(client.unavailableReason, server.unavailableReason, `unavailableReason mismatch for ${c.product.sku} @ qty ${c.quantity}`);
    }
  }
});

/**
 * TASK #11 — Part 1 regression tests.
 *
 * Bug: `calculatePricing()`'s anti-double-counting guard (the code that stops a
 * "printing side" option from being charged twice — once as part of the matched
 * ProductPriceSlab.singleSidePrice/doubleSidePrice, and again as a separate option
 * surcharge) matched only the exact display-name strings "Printing Location",
 * "Sides", "Printing". SDC1 ("Standard Cards") uses an option named "Print Side"
 * (from the `printing_side` OptionMaster, customLabel "Print Side"), which the old
 * guard did not recognize, so selecting Double Side on SDC1 charged the slab's
 * already-inclusive `doubleSidePrice` AND a separate +₹100 FLAT modifier on top.
 *
 * Fix: both guard sites (new-architecture `optionMappings` branch and legacy
 * `options` branch) now call the shared `isSideOptionKey()` predicate — the same
 * keyword test (`side` / `print` / `location` / `page`) already used by
 * `checkIsDoubleSide()` to decide whether a selection flips a slab to its
 * double-side price — instead of a hardcoded list of exact strings.
 *
 * Fixture data (SDC1 and PB0006) is taken directly from the live production
 * ProductPriceSlab / OptionMasterValue rows read during Task #10B, no invented
 * numbers.
 *
 * Run with:
 *   node --experimental-test-module-mocks --test tests/sdc1-side-pricing-regression.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { calculatePricing, checkIsDoubleSide, isSideOptionKey } from '../src/utils/pricingEngine.js';

// ---------------------------------------------------------------------------
// Fixtures — real production data (Task #10B audit)
// ---------------------------------------------------------------------------

// SDC1 "Standard Cards": real ProductPriceSlab rows, and its one *enabled*
// ProductOptionMapping, master `printing_side` ("Print Side"), with the real
// OptionMasterValue modifiers (single_side: FLAT 0, double_side: FLAT 100).
function makeSDC1() {
  return {
    id: 'sdc1',
    sku: 'SDC1',
    minQuantity: 100,
    gstPercentage: 18,
    singleSideDesignCharge: 200,
    doubleSideDesignCharge: 400,
    priceSlabs: [
      { minQty: 100, maxQty: null, unitPrice: 2, singleSidePrice: 200, doubleSidePrice: 250, designCharge: 0 },
      { minQty: 200, maxQty: null, unitPrice: 1.5, singleSidePrice: 300, doubleSidePrice: 360, designCharge: 0 },
      { minQty: 300, maxQty: null, unitPrice: 1.27, singleSidePrice: 380, doubleSidePrice: 460, designCharge: 0 },
      { minQty: 500, maxQty: null, unitPrice: 0.96, singleSidePrice: 480, doubleSidePrice: 670, designCharge: 0 },
      { minQty: 1000, maxQty: null, unitPrice: 0.85, singleSidePrice: 850, doubleSidePrice: 1250, designCharge: 0 },
    ],
    options: [],
    optionMappings: [
      {
        isEnabled: true,
        isAddon: false,
        customLabel: 'Print Side',
        master: { name: 'Print Side', code: 'printing_side' },
        valueMappings: [
          {
            customLabel: null,
            masterValue: { code: 'single_side', label: 'Single Side (Front Only)' },
            priceModifierType: 'FLAT',
            priceModifierValue: 0,
          },
          {
            customLabel: null,
            masterValue: { code: 'double_side', label: 'Double Side (Front & Back)' },
            priceModifierType: 'FLAT',
            priceModifierValue: 100,
          },
        ],
      },
    ],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
}

// PB0006 "Metallic Card": real slabs, using the `printing_location` master
// (26-product pattern) that the guard already handled correctly before this fix.
function makePrintingLocationProduct() {
  return {
    id: 'pb0006',
    sku: 'PB0006',
    minQuantity: 100,
    gstPercentage: 18,
    singleSideDesignCharge: 200,
    doubleSideDesignCharge: 400,
    priceSlabs: [
      { minQty: 100, maxQty: 249, unitPrice: 3, singleSidePrice: 300, doubleSidePrice: 350, designCharge: 0 },
      { minQty: 250, maxQty: 499, unitPrice: 2.52, singleSidePrice: 630, doubleSidePrice: 720, designCharge: 0 },
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
    pricingType: 'TIERED',
  };
}

// A product with a genuinely unrelated, legitimately-chargeable option (paper
// stock) and no side option at all — used to prove the fix does not over-broaden
// the guard and start swallowing unrelated surcharges.
function makeNoSideOptionProduct() {
  return {
    id: 'no-side-1',
    sku: 'PB-TEST-NOSIDE',
    minQuantity: 100,
    gstPercentage: 18,
    priceSlabs: [
      { minQty: 100, maxQty: null, unitPrice: 5, singleSidePrice: 500, doubleSidePrice: 0, designCharge: 0 },
    ],
    options: [],
    optionMappings: [
      {
        isEnabled: true,
        isAddon: false,
        customLabel: 'Paper Stock',
        master: { name: 'Paper Stock', code: 'paper_stock' },
        valueMappings: [
          {
            customLabel: null,
            masterValue: { code: 'premium', label: 'Premium 400 GSM' },
            priceModifierType: 'FLAT',
            priceModifierValue: 75,
          },
        ],
      },
    ],
    pricingMatrices: [],
    combinations: [],
    compatibilityRules: [],
    pricingType: 'TIERED',
  };
}

// ---------------------------------------------------------------------------
// 1. SDC1 single side
// ---------------------------------------------------------------------------
test('SDC1 single side: qty 100 prices at the slab singleSidePrice with no surcharge', () => {
  const result = calculatePricing({
    product: makeSDC1(),
    quantity: 100,
    selectedOptions: { 'Print Side': 'Single Side (Front Only)' },
  });

  assert.equal(result.isAvailable, true);
  assert.equal(result.pricingMethod, 'SLABS');
  assert.equal(result.basePrice, 200); // matchedSlab.singleSidePrice
  assert.equal(result.optionSurcharges, 0);
  assert.equal(result.appliedModifiers.length, 0);
  assert.equal(result.productPrice, 200);
});

// ---------------------------------------------------------------------------
// 2. SDC1 double side (the bug)
// ---------------------------------------------------------------------------
test('SDC1 double side: qty 100 prices at the slab doubleSidePrice ONLY — the +100 modifier is not also charged', () => {
  const result = calculatePricing({
    product: makeSDC1(),
    quantity: 100,
    selectedOptions: { 'Print Side': 'Double Side (Front & Back)' },
  });

  assert.equal(result.isAvailable, true);
  assert.equal(result.pricingMethod, 'SLABS');
  assert.equal(result.basePrice, 250); // matchedSlab.doubleSidePrice — already inclusive
  // Before the fix this was 100 (the FLAT modifier applied on top of the slab price).
  assert.equal(result.optionSurcharges, 0);
  assert.equal(result.productPrice, 250); // NOT 350
});

// ---------------------------------------------------------------------------
// 3. legacy double-side price (a second SDC1 quantity tier, to prove the raw
//    slab value itself flows through unmodified — no stored data was touched)
// ---------------------------------------------------------------------------
test('legacy double-side price: SDC1 qty 1000 uses the real slab doubleSidePrice of 1250 unmodified', () => {
  const result = calculatePricing({
    product: makeSDC1(),
    quantity: 1000,
    selectedOptions: { 'Print Side': 'Double Side (Front & Back)' },
  });

  assert.equal(result.basePrice, 1250);
  assert.equal(result.optionSurcharges, 0);
  assert.equal(result.productPrice, 1250);
});

// ---------------------------------------------------------------------------
// 4. side modifier — the modifier metadata itself is still computed correctly
//    when it legitimately should apply (no priceSlabs present, so the "already
//    priced into the slab" guard condition is false and the surcharge is real).
// ---------------------------------------------------------------------------
test('side modifier: a Print Side / Printing Location style option still surcharges normally when there is no competing slab price', () => {
  const productWithoutSlabs = {
    ...makeSDC1(),
    priceSlabs: [],
    customUnitPrice: 4,
  };

  const result = calculatePricing({
    product: productWithoutSlabs,
    quantity: 100,
    selectedOptions: { 'Print Side': 'Double Side (Front & Back)' },
  });

  assert.equal(result.pricingMethod, 'CUSTOM_UNIT');
  assert.equal(result.optionSurcharges, 100);
  assert.equal(result.appliedModifiers.length, 1);
  assert.equal(result.appliedModifiers[0].optionName, 'Print Side');
  assert.equal(result.appliedModifiers[0].amount, 100);
});

// ---------------------------------------------------------------------------
// 5. prevention of double counting — asserts directly on appliedModifiers /
//    optionSurcharges (not just the final total) so a future regression that
//    re-introduces a partial surcharge would still be caught even if it did
//    not change the rounded total.
// ---------------------------------------------------------------------------
test('prevention of double counting: no appliedModifiers entry is recorded for the side option when priced via SLABS', () => {
  const result = calculatePricing({
    product: makeSDC1(),
    quantity: 500,
    selectedOptions: { 'Print Side': 'Double Side (Front & Back)' },
  });

  assert.equal(result.pricingMethod, 'SLABS');
  assert.equal(result.basePrice, 670);
  assert.equal(result.optionSurcharges, 0);
  assert.deepEqual(result.appliedModifiers, []);
  assert.equal(
    result.appliedModifiers.some((m) => m.optionName === 'Print Side'),
    false
  );
});

// ---------------------------------------------------------------------------
// 6. existing printing_location behavior — regression guard: the 26-product
//    pattern that already worked correctly before this fix must still work.
// ---------------------------------------------------------------------------
test('existing printing_location behavior: PB0006-style product still skips the duplicate surcharge exactly as before', () => {
  const single = calculatePricing({
    product: makePrintingLocationProduct(),
    quantity: 100,
    selectedOptions: { 'Printing Location': 'Single Side' },
  });
  const double = calculatePricing({
    product: makePrintingLocationProduct(),
    quantity: 100,
    selectedOptions: { 'Printing Location': 'Double Side' },
  });

  assert.equal(single.basePrice, 300);
  assert.equal(single.optionSurcharges, 0);
  assert.equal(single.productPrice, 300);

  assert.equal(double.basePrice, 350);
  assert.equal(double.optionSurcharges, 0);
  assert.equal(double.productPrice, 350); // NOT 400 (350 + the 50 FLAT modifier)
});

// ---------------------------------------------------------------------------
// 7. product without side option — proves the broadened, keyword-based guard
//    does not over-match and does not swallow a genuinely unrelated surcharge.
// ---------------------------------------------------------------------------
test('product without side option: an unrelated Paper Stock surcharge is still charged in full', () => {
  const result = calculatePricing({
    product: makeNoSideOptionProduct(),
    quantity: 100,
    selectedOptions: { 'Paper Stock': 'Premium 400 GSM' },
  });

  assert.equal(checkIsDoubleSide({ 'Paper Stock': 'Premium 400 GSM' }), false);
  assert.equal(isSideOptionKey('Paper Stock'), false);
  assert.equal(result.pricingMethod, 'SLABS');
  assert.equal(result.basePrice, 500);
  assert.equal(result.optionSurcharges, 75);
  assert.equal(result.productPrice, 575);
});

// ---------------------------------------------------------------------------
// Sanity checks on the shared predicate itself
// ---------------------------------------------------------------------------
test('isSideOptionKey recognizes every real production option name for printing side, and nothing else', () => {
  assert.equal(isSideOptionKey('Print Side'), true);
  assert.equal(isSideOptionKey('Printing Location'), true);
  assert.equal(isSideOptionKey('Sides'), true);
  assert.equal(isSideOptionKey('Printing'), true);
  assert.equal(isSideOptionKey('Paper Stock'), false);
  assert.equal(isSideOptionKey('Lamination Finish'), false);
  assert.equal(isSideOptionKey('Corner Finishing'), false);
});

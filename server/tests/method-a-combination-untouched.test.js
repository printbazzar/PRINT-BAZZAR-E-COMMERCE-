/**
 * TASK #29 — Method A (Exact Combination / Matrix Pricing) regression guard.
 *
 * calculatePricing() in server/src/utils/pricingEngine.js resolves price via two
 * methods, in strict order:
 *   METHOD A — product.pricingMatrices / product.combinations (ProductCombination
 *              rows): an exact quantity + option match, tried FIRST.
 *   METHOD B — ProductPriceSlab volume slabs (FIXED_SLAB / OPEN_QUANTITY), tried
 *              only when Method A found no matching row (`if (!basePrice && isAvailable)`).
 *
 * Task #29 rewrote Method B (the canonical FIXED_SLAB/OPEN_QUANTITY split, Task
 * #15/#23/#24). Method A's own code was read but never edited — this suite proves
 * that claim holds at runtime, not just by code inspection: a product carrying BOTH
 * a matching ProductCombination row AND ProductPriceSlab rows must still resolve
 * through Method A, at the combination's own exact price, completely ignoring the
 * slab price. This is the single most important regression this task must not
 * introduce, since AdminProductEditor.jsx's Exact Combination Pricing admin tab and
 * adminController.js's ProductCombination CRUD were explicitly left untouched and
 * unverified data-wise (Task #28) — the pricing engine itself is the one place this
 * task DID touch, so it is the one place this must be proven, not assumed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { calculatePricing } from '../src/utils/pricingEngine.js';
import { calculatePricing as clientCalculatePricing } from '../../printbazzar_react/client/src/utils/pricingEngine.js';

function makeCombinationAndSlabProduct() {
  return {
    id: 'combo-test-product',
    quantityType: 'FIXED_SLAB',
    minQuantity: 100,
    singleSideDesignCharge: 200,
    doubleSideDesignCharge: 400,
    // Method A data: a single exact combination for qty=100, Size=A5.
    combinations: [
      {
        quantity: 100,
        optionsJson: JSON.stringify({ Size: 'A5' }),
        price: 999,
        isAvailable: true,
      },
    ],
    // Method B data: if Method A were skipped or broken, this SAME quantity (100)
    // also matches a real FIXED_SLAB row at a deliberately DIFFERENT price (500),
    // so any accidental fall-through to Method B is immediately visible as a wrong
    // price, not just a wrong pricingMethod label.
    priceSlabs: [
      { minQty: 100, maxQty: null, unitPrice: 0, singleSidePrice: 500, doubleSidePrice: 0 },
    ],
    options: [
      { optionName: 'Size', isAddon: false, values: [{ valueLabel: 'A5', priceModifierValue: 0 }] },
    ],
    optionMappings: [],
  };
}

test('Method A: a product with a matching ProductCombination row resolves via COMBINATION, at the combination price, even though a matching ProductPriceSlab also exists', () => {
  const product = makeCombinationAndSlabProduct();
  const result = calculatePricing({
    product,
    quantity: 100,
    selectedOptions: { Size: 'A5' },
  });

  assert.equal(result.isAvailable, true);
  assert.equal(result.pricingMethod, 'COMBINATION');
  assert.equal(result.basePrice, 999, 'must use the combination price, not the Rs.500 slab price');
  assert.equal(result.subtotal, 999, 'no design fee was requested, so subtotal === basePrice');
});

test('Method A: client pricingEngine.js mirror resolves identically (server/client parity preserved for combinations)', () => {
  const product = makeCombinationAndSlabProduct();
  const result = clientCalculatePricing({
    product,
    quantity: 100,
    selectedOptions: { Size: 'A5' },
  });

  assert.equal(result.pricingMethod, 'COMBINATION');
  assert.equal(result.basePrice, 999);
});

test('Method A: an isAvailable:false combination is correctly rejected, and does NOT fall through to the Method B slab price', () => {
  const product = makeCombinationAndSlabProduct();
  product.combinations[0].isAvailable = false;

  const result = calculatePricing({
    product,
    quantity: 100,
    selectedOptions: { Size: 'A5' },
  });

  assert.equal(result.isAvailable, false);
  assert.match(result.unavailableReason, /currently unavailable/i);
  assert.equal(result.basePrice, 0, 'must not silently fall through to the Rs.500 slab price');
});

test('Method A: a quantity that matches NO combination row correctly falls through to Method B (FIXED_SLAB) and resolves at the slab price', () => {
  const product = makeCombinationAndSlabProduct();
  // qty=250 matches no combination (only qty=100 is defined) but IS within the
  // slab's range once we widen it — add a second slab covering 250.
  product.priceSlabs.push({ minQty: 200, maxQty: null, unitPrice: 0, singleSidePrice: 700, doubleSidePrice: 0 });

  const result = calculatePricing({
    product,
    quantity: 250,
    selectedOptions: { Size: 'A5' },
  });

  assert.equal(result.isAvailable, true);
  assert.equal(result.pricingMethod, 'SLABS', 'Method B must still work when Method A has no matching row');
  assert.equal(result.basePrice, 700);
});

test('Method A: a product with NO combinations at all is completely unaffected — resolves via Method B exactly as before', () => {
  const product = makeCombinationAndSlabProduct();
  product.combinations = [];

  const result = calculatePricing({
    product,
    quantity: 100,
    selectedOptions: { Size: 'A5' },
  });

  assert.equal(result.pricingMethod, 'SLABS');
  assert.equal(result.basePrice, 500);
});

import assert from 'assert';
import { calculatePricing } from '../utils/pricingEngine.js';

const API_BASE = 'http://localhost:5000/api';

async function runGenericConfigTests() {
  console.log('🧪 Starting Generic Product Configuration & Pricing System Tests...\n');
  let passed = 0;

  // 1. EXACT COMBINATION PRICING TEST (User Request Example: Royal Embossed UV Card)
  console.log('1. Testing Exact Combination Pricing (Royal Embossed UV Card)...');
  const mockProductWithCombinations = {
    id: 'prod-test-royal-uv',
    name: 'Royal Embossed UV Card',
    startingPrice: 1300,
    minQuantity: 500,
    singleSideDesignCharge: 200,
    doubleSideDesignCharge: 400,
    options: [
      {
        optionName: 'Printing Location',
        isAddon: false,
        values: [
          { valueLabel: 'Single Side' },
          { valueLabel: 'Double Side' },
        ],
      },
      {
        optionName: 'Corner Style',
        isAddon: false,
        values: [
          { valueLabel: 'Standard Corner' },
          { valueLabel: 'Die Cut Corner' },
        ],
      },
      {
        optionName: 'Gold Foil Stamping',
        isAddon: true,
        values: [
          { valueLabel: 'Single Side Gold Foil', priceModifierType: 'FLAT', priceModifierValue: 250 },
          { valueLabel: 'Double Side Gold Foil', priceModifierType: 'FLAT', priceModifierValue: 450 },
        ],
      },
    ],
    combinations: [
      {
        combinationKey: 'Printing Location:Single Side|Corner Style:Standard Corner',
        optionsJson: { 'Printing Location': 'Single Side', 'Corner Style': 'Standard Corner' },
        quantity: 500,
        price: 1300,
        isAvailable: true,
      },
      {
        combinationKey: 'Printing Location:Single Side|Corner Style:Die Cut Corner',
        optionsJson: { 'Printing Location': 'Single Side', 'Corner Style': 'Die Cut Corner' },
        quantity: 500,
        price: 1500, // +200 for Die Cut
        isAvailable: true,
      },
      {
        combinationKey: 'Printing Location:Double Side|Corner Style:Standard Corner',
        optionsJson: { 'Printing Location': 'Double Side', 'Corner Style': 'Standard Corner' },
        quantity: 500,
        price: 1800,
        isAvailable: true,
      },
      {
        combinationKey: 'Printing Location:Double Side|Corner Style:Die Cut Corner',
        optionsJson: { 'Printing Location': 'Double Side', 'Corner Style': 'Die Cut Corner' },
        quantity: 500,
        price: 2000,
        isAvailable: true,
      },
      {
        combinationKey: 'Printing Location:Single Side|Corner Style:Standard Corner',
        optionsJson: { 'Printing Location': 'Single Side', 'Corner Style': 'Standard Corner' },
        quantity: 1000,
        price: 2400,
        isAvailable: true,
      },
      {
        combinationKey: 'Printing Location:Double Side|Corner Style:Die Cut Corner',
        optionsJson: { 'Printing Location': 'Double Side', 'Corner Style': 'Die Cut Corner' },
        quantity: 1000,
        price: 3600,
        isAvailable: false, // Explicitly marked UNAVAILABLE for test
      },
    ],
  };

  // Test 1a: 500 cards, Single Side, Standard Corner -> Exact ₹1,300
  const res1a = calculatePricing({
    product: mockProductWithCombinations,
    quantity: 500,
    selectedOptions: {
      'Printing Location': 'Single Side',
      'Corner Style': 'Standard Corner',
    },
    designOption: 'No Thank You',
  });
  assert.strictEqual(res1a.isAvailable, true);
  assert.strictEqual(res1a.basePrice, 1300);
  assert.strictEqual(res1a.subtotal, 1300);
  console.log('  ✔ PASS: 500 qty, Single Side, Standard Corner = ₹1,300 exactly');
  passed++;

  // Test 1b: 500 cards, Single Side, Die Cut Corner -> Exact ₹1,500 (+₹200)
  const res1b = calculatePricing({
    product: mockProductWithCombinations,
    quantity: 500,
    selectedOptions: {
      'Printing Location': 'Single Side',
      'Corner Style': 'Die Cut Corner',
    },
    designOption: 'No Thank You',
  });
  assert.strictEqual(res1b.isAvailable, true);
  assert.strictEqual(res1b.basePrice, 1500);
  assert.strictEqual(res1b.subtotal, 1500);
  console.log('  ✔ PASS: 500 qty, Single Side, Die Cut Corner = ₹1,500 (+₹200 die cut) exactly');
  passed++;

  // Test 1c: 500 cards + Single Side Gold Foil (+₹250 Add-on)
  const res1c_500 = calculatePricing({
    product: mockProductWithCombinations,
    quantity: 500,
    selectedOptions: {
      'Printing Location': 'Single Side',
      'Corner Style': 'Standard Corner',
      'Gold Foil Stamping': 'Single Side Gold Foil',
    },
    designOption: 'No Thank You',
  });
  assert.strictEqual(res1c_500.isAvailable, true);
  assert.strictEqual(res1c_500.basePrice, 1300);
  assert.strictEqual(res1c_500.optionSurcharges, 250);
  assert.strictEqual(res1c_500.subtotal, 1550);
  console.log('  ✔ PASS: 500 qty base ₹1,300 + Gold Foil Add-on ₹250 = ₹1,550 subtotal');
  passed++;

  // Test 1c2: 1000 cards + Single Side Gold Foil (Scales proportionally to ₹500)
  const res1c_1000 = calculatePricing({
    product: mockProductWithCombinations,
    quantity: 1000,
    selectedOptions: {
      'Printing Location': 'Single Side',
      'Corner Style': 'Standard Corner',
      'Gold Foil Stamping': 'Single Side Gold Foil',
    },
    designOption: 'No Thank You',
  });
  assert.strictEqual(res1c_1000.isAvailable, true);
  assert.strictEqual(res1c_1000.basePrice, 2400);
  assert.strictEqual(res1c_1000.optionSurcharges, 500); // 250 * 2
  assert.strictEqual(res1c_1000.subtotal, 2900);
  console.log('  ✔ PASS: 1000 qty base ₹2,400 + Gold Foil Scaled Add-on ₹500 = ₹2,900 subtotal');
  passed++;

  // Test 1d: Design charges: Single side (₹200) vs Double side (₹400)
  const res1dSingle = calculatePricing({
    product: mockProductWithCombinations,
    quantity: 500,
    selectedOptions: {
      'Printing Location': 'Single Side',
      'Corner Style': 'Standard Corner',
    },
    designOption: 'Yes Please',
  });
  assert.strictEqual(res1dSingle.designFee, 200);
  assert.strictEqual(res1dSingle.subtotal, 1500); // 1300 + 200
  console.log('  ✔ PASS: Single side design charge correctly adds ₹200');
  passed++;

  const res1dDouble = calculatePricing({
    product: mockProductWithCombinations,
    quantity: 500,
    selectedOptions: {
      'Printing Location': 'Double Side',
      'Corner Style': 'Standard Corner',
    },
    designOption: 'Yes Please',
  });
  assert.strictEqual(res1dDouble.designFee, 400);
  assert.strictEqual(res1dDouble.subtotal, 2200); // 1800 + 400
  console.log('  ✔ PASS: Double side design charge correctly adds ₹400');
  passed++;

  // Test 2: COMBINATION UNAVAILABILITY TEST
  console.log('\n2. Testing Combination Unavailability & Validation...');
  // 1000 qty, Double Side, Die Cut is marked isAvailable: false
  const res2Unavailable = calculatePricing({
    product: mockProductWithCombinations,
    quantity: 1000,
    selectedOptions: {
      'Printing Location': 'Double Side',
      'Corner Style': 'Die Cut Corner',
    },
    designOption: 'No Thank You',
  });
  assert.strictEqual(res2Unavailable.isAvailable, false);
  assert.ok(res2Unavailable.unavailableReason.includes('unavailable'));
  console.log('  ✔ PASS: Unavailable combination correctly flagged: isAvailable = false');
  passed++;

  // Undefined combination (e.g. 750 qty which has no combination row)
  const res2Undefined = calculatePricing({
    product: mockProductWithCombinations,
    quantity: 750,
    selectedOptions: {
      'Printing Location': 'Single Side',
      'Corner Style': 'Standard Corner',
    },
    designOption: 'No Thank You',
  });
  assert.strictEqual(res2Undefined.isAvailable, false);
  console.log('  ✔ PASS: Undefined combination correctly flagged as unavailable');
  passed++;

  // Test 3: CUSTOM QUANTITY MODEL & INTERPOLATION
  console.log('\n3. Testing Custom Quantity Range & Step Increment...');
  const mockCustomQtyProduct = {
    id: 'prod-custom-vinyl',
    name: 'Vinyl Outdoor Banner',
    quantityType: 'CUSTOM',
    quantityUnit: 'Sq.ft',
    customQtyMin: 10,
    customQtyMax: 500,
    customQtyStep: 5,
    customUnitPrice: 25.0, // ₹25 per Sq.ft
    startingPrice: 250,
  };

  const res3Custom = calculatePricing({
    product: mockCustomQtyProduct,
    quantity: 45, // 45 sq.ft
    selectedOptions: {},
    designOption: 'No Thank You',
  });
  assert.strictEqual(res3Custom.isAvailable, true);
  assert.strictEqual(res3Custom.basePrice, 1125); // 45 * 25 = 1125
  assert.strictEqual(res3Custom.subtotal, 1125);
  console.log('  ✔ PASS: 45 Sq.ft at ₹25/sq.ft = ₹1,125 exactly');
  passed++;

  // Test 4: LIVE BACKEND API ENDPOINT VERIFICATION
  console.log('\n4. Testing Live Backend Price Calculation Endpoint...');

  // Calculate price through backend endpoint
  const calcRes = await fetch(`${API_BASE}/pricing/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productSlug: 'standard-card',
      quantity: 100,
      selectedOptions: { 'Printing Location': 'Single Side' },
      designOption: 'No Thank You',
    }),
  });
  const calcData = await calcRes.json();
  assert.strictEqual(calcData.success, true);
  assert.strictEqual(calcData.data.basePrice, 460);
  console.log('  ✔ PASS: Backend /pricing/calculate endpoint returned valid basePrice ₹460');
  passed++;

  // Test with Double Side Design
  const calcDesignRes = await fetch(`${API_BASE}/pricing/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productSlug: 'standard-card',
      quantity: 100,
      selectedOptions: { 'Printing Location': 'Double Side' },
      designOption: 'Yes Please',
    }),
  });
  const calcDesignData = await calcDesignRes.json();
  assert.strictEqual(calcDesignData.success, true);
  assert.strictEqual(calcDesignData.data.designFee, 400);
  console.log('  ✔ PASS: Backend /pricing/calculate endpoint applied ₹400 for Double Side Design');
  passed++;

  console.log(`\n===========================================`);
  console.log(`🎉 ALL ${passed} GENERIC SYSTEM TESTS PASSED SUCCESSFULLY!`);
  console.log(`===========================================\n`);
}

runGenericConfigTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

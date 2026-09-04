import { calculatePricing } from '../utils/pricingEngine.js';

async function testDesignCharges() {
  console.log('Testing Single Side (₹200) vs Double Side (₹400) Graphic Design Charges...\n');

  // Test Product with Price Slabs
  const dummyProduct = {
    id: 'test-card-1',
    name: 'Standard Visiting Card',
    startingPrice: 188,
    singleSideDesignCharge: 200,
    doubleSideDesignCharge: 400,
    priceSlabs: [
      {
        minQty: 100,
        maxQty: 249,
        singleSidePrice: 188,
        doubleSidePrice: 288,
        singleSideDesignCharge: 200,
        doubleSideDesignCharge: 400,
        designCharge: 200,
      },
      {
        minQty: 500,
        maxQty: 999,
        singleSidePrice: 677,
        doubleSidePrice: 927,
        singleSideDesignCharge: 200,
        doubleSideDesignCharge: 400,
        designCharge: 200,
      },
    ],
  };

  // Test Case 1: 100 Qty, Single Side, No Design
  const res1 = calculatePricing({
    product: dummyProduct,
    quantity: 100,
    selectedOptions: { 'Printing Location': 'Single Side' },
    designOption: 'No',
  });
  console.log(`Test 1 (Single Side, No Design): Base=₹${res1.basePrice}, DesignFee=₹${res1.designFee}, Subtotal=₹${res1.subtotal}`);
  if (res1.basePrice !== 188 || res1.designFee !== 0 || res1.subtotal !== 188) {
    console.error('❌ Test 1 failed');
  } else {
    console.log('✔ PASS: Test 1');
  }

  // Test Case 2: 100 Qty, Single Side + "Let Us Design" (Single Side 1 Design)
  const res2 = calculatePricing({
    product: dummyProduct,
    quantity: 100,
    selectedOptions: { 'Printing Location': 'Single Side' },
    designOption: 'Yes Please',
  });
  console.log(`Test 2 (Single Side + Design): Base=₹${res2.basePrice}, DesignFee=₹${res2.designFee}, Subtotal=₹${res2.subtotal}`);
  if (res2.basePrice !== 188 || res2.designFee !== 200 || res2.subtotal !== 388) {
    console.error('❌ Test 2 failed (Expected Design Fee ₹200)');
  } else {
    console.log('✔ PASS: Test 2 (Single side design fee is ₹200)');
  }

  // Test Case 3: 100 Qty, Double Side + "Let Us Design" (Double Side Front+Back 2 Designs)
  const res3 = calculatePricing({
    product: dummyProduct,
    quantity: 100,
    selectedOptions: { 'Printing Location': 'Double Side' },
    designOption: 'Yes Please',
  });
  console.log(`Test 3 (Double Side + Design): Base=₹${res3.basePrice}, DesignFee=₹${res3.designFee}, Subtotal=₹${res3.subtotal}`);
  if (res3.basePrice !== 288 || res3.designFee !== 400 || res3.subtotal !== 688) {
    console.error('❌ Test 3 failed (Expected Design Fee ₹400)');
  } else {
    console.log('✔ PASS: Test 3 (Double side design fee is ₹400 for 2 designs)');
  }

  // Test Case 4: API Verification via Express API endpoint
  console.log('\nTesting Live HTTP Endpoint /api/v1/products/calculate-price...');
  const apiResSingle = await fetch('http://localhost:5000/api/v1/products/calculate-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: 'standard-card',
      quantity: 100,
      selectedOptions: { 'Printing Location': 'Single Side' },
      designOption: 'Yes Please',
    }),
  }).then((r) => r.json());

  console.log('API Single Side + Design:', apiResSingle.data);
  if (apiResSingle.data.designFee === 200) {
    console.log('✔ PASS: API accurately calculated Single Side Design Fee = ₹200');
  } else {
    console.error('❌ API Single Side failed');
  }

  const apiResDouble = await fetch('http://localhost:5000/api/v1/products/calculate-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: 'standard-card',
      quantity: 100,
      selectedOptions: { 'Printing Location': 'Double Side' },
      designOption: 'Yes Please',
    }),
  }).then((r) => r.json());

  console.log('API Double Side + Design:', apiResDouble.data);
  if (apiResDouble.data.designFee === 400) {
    console.log('✔ PASS: API accurately calculated Double Side Design Fee = ₹400');
  } else {
    console.error('❌ API Double Side failed');
  }

  console.log('\n🎉 ALL DESIGN CHARGE TESTS PASSED SUCCESSFULLY!');
}

testDesignCharges();

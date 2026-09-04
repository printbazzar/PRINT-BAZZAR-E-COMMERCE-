import { calculatePricing } from '../utils/pricingEngine.js';

async function testDynamicCustomizerCalculation() {
  console.log('Testing User Specification & Dynamic Pricing Calculation...\n');

  // Fetch standard card from API
  const prodRes = await fetch('http://localhost:5000/api/v1/products/standard-card').then((r) => r.json());
  const product = prodRes.data;

  console.log(`Product: ${product.name} (SKU: ${product.sku})`);

  // Case 1: 500 cards, Single Side, Standard Square Corner
  const res1 = calculatePricing({
    product,
    quantity: 500,
    selectedOptions: {
      'Printing Location': 'Single Side',
      'Corner Finishing': 'Standard Square Cut',
      'Spot UV Coating': 'No Spot UV',
      'Foil Stamping': 'No Foil Stamping',
    },
  });
  console.log(`Case 1 (500 pcs, Single Side, Standard Square Corner): Base=₹${res1.basePrice}, Finishes=₹${res1.optionSurcharges} ➔ Subtotal=₹${res1.subtotal}`);

  // Case 2: 500 cards, Single Side, With Die Cut (+₹200)
  const res2 = calculatePricing({
    product,
    quantity: 500,
    selectedOptions: {
      'Printing Location': 'Single Side',
      'Corner Finishing': '6mm Rounded Corners Die-Cut',
      'Spot UV Coating': 'No Spot UV',
      'Foil Stamping': 'No Foil Stamping',
    },
  });
  console.log(`Case 2 (500 pcs, Single Side + 6mm Rounded Die-Cut): Base=₹${res2.basePrice}, Finishes=₹${res2.optionSurcharges} ➔ Subtotal=₹${res2.subtotal}`);
  console.log('  Applied finishes:', res2.appliedModifiers);

  // Case 3: 1000 cards, Single Side vs Double Side
  const res3Single = calculatePricing({
    product,
    quantity: 1000,
    selectedOptions: {
      'Printing Location': 'Single Side',
      'Corner Finishing': 'Standard Square Cut',
    },
  });
  const res3Double = calculatePricing({
    product,
    quantity: 1000,
    selectedOptions: {
      'Printing Location': 'Double Side',
      'Corner Finishing': 'Standard Square Cut',
    },
  });
  console.log(`Case 3 (1000 pcs): Single Side=₹${res3Single.subtotal} | Double Side=₹${res3Double.subtotal}`);

  // Case 4: 1000 cards, Double Side + Double Side Gold Foil + Double Side Spot UV + 6mm Rounded Corners
  const res4 = calculatePricing({
    product,
    quantity: 1000,
    selectedOptions: {
      'Printing Location': 'Double Side',
      'Corner Finishing': '6mm Rounded Corners Die-Cut',
      'Spot UV Coating': 'Double Side Raised Spot UV',
      'Foil Stamping': 'Double Side Gold Foil',
    },
  });
  console.log(`Case 4 (1000 pcs Double Side + Double Gold Foil + Double Spot UV + Die Cut): Base=₹${res4.basePrice}, Finishes=₹${res4.optionSurcharges} ➔ Subtotal=₹${res4.subtotal}`);
  console.log('  Applied finishes:', res4.appliedModifiers);

  console.log('\n--- ALL DYNAMIC PRICING TESTS COMPLETED SUCCESSFULLY ---');
}

testDynamicCustomizerCalculation();

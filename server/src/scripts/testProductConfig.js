async function testProductConfigurations() {
  const slugs = [
    'standard-card',
    'container-labels',
    'letter-head',
    'id-cards-set',
    'wedding-invitation',
    'sunpack-printing'
  ];

  console.log('Testing Category-Specific Options & Dynamic Pricing Slabs...\n');

  for (const slug of slugs) {
    const res = await fetch(`http://localhost:5000/api/v1/products/${slug}`).then(r => r.json());
    if (res.success && res.data) {
      const p = res.data;
      console.log(`=======================================================`);
      console.log(`📦 Product: ${p.name} (${p.category?.name})`);
      console.log(`   🏷️ Starting Price: ₹${p.startingPrice}`);
      console.log(`   ⚙️ Options (${p.options?.length || 0}):`);
      p.options?.forEach(opt => {
        const valuesList = opt.values?.map(v => `${v.valueLabel}${v.priceModifierValue ? ` (+₹${v.priceModifierValue})` : ''}`).join(', ');
        console.log(`      • ${opt.optionName}: [ ${valuesList} ]`);
      });
      console.log(`   📊 Quantity & Offer Slabs (${p.priceSlabs?.length || 0}):`);
      p.priceSlabs?.forEach(s => {
        console.log(`      • ${s.minQty} pcs ➔ Single Side: ₹${s.singleSidePrice} | Double Side: ₹${s.doubleSidePrice}`);
      });
    } else {
      console.log(`❌ Failed to fetch ${slug}`);
    }
  }
}

testProductConfigurations();

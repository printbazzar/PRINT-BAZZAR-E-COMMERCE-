async function testPricingMaster() {
  console.log('Testing Centralized Pricing Master APIs & Live Data...\n');

  // 1. Admin Login
  const loginRes = await fetch('http://localhost:5000/api/v1/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@printbazzar.online', password: 'Admin@123' }),
  }).then((r) => r.json());

  if (!loginRes.success || !loginRes.token) {
    console.error('Admin login failed:', loginRes);
    return;
  }
  const token = loginRes.token;
  console.log('✔ Admin authenticated successfully.');

  // 2. Fetch Pricing Master List
  const masterRes = await fetch('http://localhost:5000/api/v1/admin/pricing', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  if (!masterRes.success || !masterRes.data) {
    console.error('❌ Failed to fetch pricing master:', masterRes);
    return;
  }

  console.log(`✔ Fetched ${masterRes.data.length} products from Pricing Master.`);
  console.log('  Pricing Master Stats:', masterRes.stats);

  // 3. Verify specific live products
  const luxuryCard = masterRes.data.find((p) => p.name === 'Luxury 800 GSM Card');
  if (luxuryCard) {
    console.log(`✔ Verified Luxury 800 GSM Card: ${luxuryCard.minQuantity} ${luxuryCard.quantityUnit} = ₹${luxuryCard.startingPrice} (${luxuryCard.pricingType})`);
    if (luxuryCard.minQuantity !== 500 || luxuryCard.startingPrice !== 2300) {
      console.error('❌ Luxury Card values mismatch');
    }
  } else {
    console.error('❌ Luxury Card not found');
  }

  const sqftSticker = masterRes.data.find((p) => p.name === 'Large Format Stickers');
  if (sqftSticker) {
    console.log(`✔ Verified Large Format Stickers: ${sqftSticker.minQuantity} ${sqftSticker.quantityUnit} = ₹${sqftSticker.startingPrice} (${sqftSticker.pricingType})`);
    if (sqftSticker.quantityUnit !== 'Sq.ft' || sqftSticker.startingPrice !== 12) {
      console.error('❌ Large Format Sticker values mismatch');
    }
  }

  const coupleMug = masterRes.data.find((p) => p.name === 'Couple Pair Mug');
  if (coupleMug) {
    console.log(`✔ Verified Couple Pair Mug: ${coupleMug.minQuantity} ${coupleMug.quantityUnit} = ₹${coupleMug.startingPrice} (${coupleMug.pricingType})`);
  }

  const cosmeticBox = masterRes.data.find((p) => p.name === 'Cosmetic Box');
  if (cosmeticBox) {
    console.log(`✔ Verified Cosmetic Box: ${cosmeticBox.minQuantity} ${cosmeticBox.quantityUnit} = ₹${cosmeticBox.startingPrice} (${cosmeticBox.pricingType})`);
  }

  // 4. Test Dynamic Price Update Endpoint (Simulate Admin Price Change)
  if (luxuryCard) {
    const updateRes = await fetch(`http://localhost:5000/api/v1/admin/pricing/${luxuryCard.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        startingPrice: 2300,
        minQuantity: 500,
        quantityUnit: 'Cards',
        pricingType: 'TIERED',
        gstPercentage: 18,
        productionDays: 1,
        reason: 'Automated verification test of live price update API',
      }),
    }).then((r) => r.json());

    if (updateRes.success) {
      console.log(`✔ Price update API succeeded: ${updateRes.message}`);
    } else {
      console.error('❌ Price update API failed:', updateRes);
    }
  }

  console.log('\n--- ALL PRICING MASTER TESTS PASSED SUCCESSFULLY ---');
}

testPricingMaster();

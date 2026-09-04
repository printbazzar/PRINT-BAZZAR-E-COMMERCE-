async function testSearch() {
  const queries = ['visiting', 'visiting card', 'card', 'sticker', 'stamp', 'banner', 'id card', 'letterhead', 'wedding'];
  console.log('Testing Smart Search Engine...\n');
  for (const q of queries) {
    const res = await fetch(`http://localhost:5000/api/v1/products?search=${encodeURIComponent(q)}`).then(r => r.json());
    console.log(`🔍 Query: "${q}" ➔ Found ${res.data?.length || 0} products`);
  }
}

testSearch();

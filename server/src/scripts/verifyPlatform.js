const API_BASE = 'http://localhost:5000/api/v1';

async function runVerification() {
  console.log('🧪 Starting Print Bazzar Platform Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`  ✔ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title}`);
      failed++;
    }
  };

  try {
    // 1. Categories API Test
    console.log('1. Testing Public Categories API...');
    const catRes = await fetch(`${API_BASE}/categories`).then((r) => r.json());
    assert(catRes.success === true, 'Categories API returned success');
    assert(catRes.data.length >= 13, `Categories count is ${catRes.data.length} (expected >= 13)`);

    // 2. Products API Test
    console.log('\n2. Testing Public Products API & Search...');
    const prodRes = await fetch(`${API_BASE}/products?limit=10`).then((r) => r.json());
    assert(prodRes.success === true, 'Products API returned success');
    assert(prodRes.pagination.total >= 90, `Total products in DB is ${prodRes.pagination.total} (expected >= 90)`);

    const searchRes = await fetch(`${API_BASE}/products?search=Standard`).then((r) => r.json());
    assert(searchRes.data.length > 0, 'Search for "Standard" returned matching products');

    // 3. Product Slug & Pricing Engine Test
    console.log('\n3. Testing Dynamic Product Detail & Slug Lookup...');
    const slugRes = await fetch(`${API_BASE}/products/standard-card`).then((r) => r.json());
    assert(slugRes.success === true, 'Slug /standard-card resolved product');
    assert(Boolean(slugRes.data.sku), `Resolved SKU exists (${slugRes.data.sku})`);

    console.log('\n4. Testing Authoritative Price Calculation API...');
    const priceRes = await fetch(`${API_BASE}/products/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: slugRes.data.id,
        quantity: 100,
        selectedOptions: { 'Printing Location': 'Single Side', 'Corner Finishing': 'Standard' },
        designOption: 'No Thank You',
      }),
    }).then((r) => r.json());

    assert(priceRes.success === true, 'Price calculation returned success');
    assert(priceRes.data.basePrice === slugRes.data.startingPrice, `Base price for 100 qty single side is ₹${priceRes.data.basePrice} (expected ${slugRes.data.startingPrice})`);
    assert(priceRes.data.subtotal === slugRes.data.startingPrice, `Subtotal is ₹${priceRes.data.subtotal}`);

    // 5. Order Placement & Snapshot Test
    console.log('\n5. Testing End-to-End Order Creation & Snapshots...');
    const orderPayload = {
      customerName: 'Karthik Subramanian',
      customerEmail: 'karthik@example.com',
      customerMobile: '9840123456',
      customerWhatsapp: '9840123456',
      shippingAddress: {
        street: '45, Main Road, Thillai Nagar',
        city: 'Tiruchirappalli',
        state: 'Tamil Nadu',
        pincode: '620018',
      },
      deliveryType: 'LOCAL_DELIVERY',
      paymentMethod: 'UPI',
      items: [
        {
          productId: slugRes.data.id,
          quantity: 100,
          selectedOptions: { 'Printing Location': 'Single Side', 'Corner Finishing': 'Rounded' },
          designRequired: false,
          artworkFileUrl: '/uploads/sample-visiting-card.pdf',
        },
      ],
    };

    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    }).then((r) => r.json());

    assert(orderRes.success === true, 'Order created successfully');
    assert(orderRes.orderNumber.startsWith('PB-ORD-'), `Generated human-readable Order Number: ${orderRes.orderNumber}`);

    // 6. Order Tracking Test
    console.log('\n6. Testing Public Order Tracking...');
    const trackRes = await fetch(`${API_BASE}/orders/track/${orderRes.orderNumber}`).then((r) => r.json());
    assert(trackRes.success === true, 'Tracking resolved order');
    assert(trackRes.order.customerName === 'Karthik Subramanian', 'Customer name matched');
    assert(trackRes.order.timeline.length > 0, 'Tracking timeline contains status history');

    // 7. Admin Authentication & Dashboard KPIs Test
    console.log('\n7. Testing Admin Authentication & Dashboard...');
    const loginRes = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@printbazzar.online', password: 'Admin@123' }),
    }).then((r) => r.json());

    assert(loginRes.success === true, 'Admin login succeeded');
    const token = loginRes.token;

    const kpiRes = await fetch(`${API_BASE}/admin/dashboard/kpis`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());

    assert(kpiRes.success === true, 'Dashboard KPIs fetched successfully');
    assert(kpiRes.data.kpis.totalOrders >= 1, `Total orders metric is ${kpiRes.data.kpis.totalOrders}`);

    // 8. In-House Multi-Department ERP Workflow & Handover Test
    console.log('\n8. Testing In-House Multi-Department ERP Kanban & Handover Pipeline...');
    const boardRes = await fetch(`${API_BASE}/admin/workflow/board`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());

    assert(boardRes.success === true, 'Workflow board API returned success');
    assert(boardRes.data.columns.DESIGN !== undefined, 'Design department column exists');
    assert(boardRes.data.columns.PRODUCTION !== undefined, 'Production department column exists');

    // Handover from DESIGN to PRODUCTION
    const handoverRes = await fetch(`${API_BASE}/admin/orders/${orderRes.order.id}/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        targetDepartment: 'PRODUCTION',
        newStatus: 'PRINTING',
        assignedStaffName: 'Suresh (Offset Master)',
        machineNumber: 'Heidelberg Speedmaster 4-Color Offset',
        note: 'Prepress artwork approved. Printing initiated on Heidelberg press.',
      }),
    }).then((r) => r.json());

    assert(handoverRes.success === true, 'Handed over order from DESIGN to PRODUCTION department');
    assert(handoverRes.order.currentDepartment === 'PRODUCTION', 'Order currentDepartment updated to PRODUCTION');

    // Handover from PRODUCTION to PACKING
    const packHandover = await fetch(`${API_BASE}/admin/orders/${orderRes.order.id}/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        targetDepartment: 'PACKING',
        newStatus: 'PACKED',
        assignedStaffName: 'Vicky (Packing Supervisor)',
        packingWeight: '1.8 kg (1 Box)',
        note: 'Print & finishing QC passed. Boxed with water-resistant bubble wrap.',
      }),
    }).then((r) => r.json());

    assert(packHandover.success === true, 'Handed over order from PRODUCTION to PACKING');
    assert(packHandover.order.currentDepartment === 'PACKING', 'Order currentDepartment updated to PACKING');

    // Handover from PACKING to DELIVERY (Out for delivery with tracking)
    const deliveryHandover = await fetch(`${API_BASE}/admin/orders/${orderRes.order.id}/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        targetDepartment: 'DELIVERY',
        newStatus: 'OUT_FOR_DELIVERY',
        courierPartner: 'ST Courier',
        trackingReference: 'ST-TRY-902184',
        note: 'Dispatched via ST Courier Express. Tracking code: ST-TRY-902184',
      }),
    }).then((r) => r.json());

    assert(deliveryHandover.success === true, 'Handed over order to DELIVERY logistics');
    assert(deliveryHandover.order.orderStatus === 'OUT_FOR_DELIVERY', 'Order status is OUT_FOR_DELIVERY');

    // 9. Customer Auth & Portal Tests (B2B Corporate & B2C Retail)
    console.log('\n9. Testing Customer Auth & Corporate Portal...');
    // B2B Login
    const b2bLogin = await fetch(`${API_BASE}/customer/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'corporate@trichytech.com', password: 'Corp@123' }),
    }).then((r) => r.json());

    assert(b2bLogin.success === true, 'B2B Corporate login succeeded');
    assert(b2bLogin.customer.accountType === 'B2B_CORPORATE', 'Customer is B2B_CORPORATE');
    assert(b2bLogin.customer.corporateDiscountPct === 10, 'Corporate wholesale discount is 10%');
    const custToken = b2bLogin.token;

    // Customer Profile
    const custProfile = await fetch(`${API_BASE}/customer/account/profile`, {
      headers: { Authorization: `Bearer ${custToken}` },
    }).then((r) => r.json());

    assert(custProfile.success === true, 'Customer profile API returned success');
    assert(custProfile.data.customer.gstNumber === '33AAACT1234F1Z5', 'Corporate GSTIN matched 33AAACT1234F1Z5');

    // Customer Orders
    const custOrders = await fetch(`${API_BASE}/customer/account/orders`, {
      headers: { Authorization: `Bearer ${custToken}` },
    }).then((r) => r.json());

    assert(custOrders.success === true, 'Customer orders API returned success');

    // Add Customer Branch Address
    const addAddrRes = await fetch(`${API_BASE}/customer/account/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({
        label: 'Trichy IT Park Site Office',
        recipientName: 'Suresh Kumar',
        mobile: '9840123456',
        street: 'Phase 2, ELCOT IT Park, Navalpattu',
        city: 'Tiruchirappalli',
        pincode: '620026',
      }),
    }).then((r) => r.json());

    assert(addAddrRes.success === true, 'Saved new branch delivery address');

    // 1-Click Re-Order Test
    const reorderRes = await fetch(`${API_BASE}/customer/account/reorder/${orderRes.order.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
    }).then((r) => r.json());

    assert(reorderRes.success === true, '1-Click Re-order endpoint returned items payload');
    assert(reorderRes.items.length >= 1, `Reorder items count is ${reorderRes.items.length}`);

    // 10. Department-Specific In-House Staff Logins & Staff Management
    console.log('\n10. Testing Department-Specific In-House Staff RBAC Logins...');
    const deptLogins = [
      { name: 'Prepress Design', email: 'design@printbazzar.online', dept: 'DESIGN' },
      { name: 'Press Master', email: 'press@printbazzar.online', dept: 'PRODUCTION' },
      { name: 'Finishing & QC', email: 'qc@printbazzar.online', dept: 'FINISHING_QC' },
      { name: 'Packing Supervisor', email: 'packing@printbazzar.online', dept: 'PACKING' },
      { name: 'Delivery Boy', email: 'delivery@printbazzar.online', dept: 'DELIVERY' },
    ];

    for (const d of deptLogins) {
      const dLog = await fetch(`${API_BASE}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: d.email, password: 'Staff@123' }),
      }).then((r) => r.json());

      assert(dLog.success === true, `${d.name} staff login succeeded`);
      assert(dLog.user.department === d.dept, `${d.name} department matches ${d.dept}`);
    }

    // Staff Management API Test (Admin)
    const staffListRes = await fetch(`${API_BASE}/admin/staff`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());

    assert(staffListRes.success === true, 'Admin staff directory API returned success');
    assert(staffListRes.data.length >= 6, `Staff count in DB is ${staffListRes.data.length} (expected >= 6)`);

    console.log('\n===========================================');
    console.log(`🎉 VERIFICATION COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('===========================================\n');
  } catch (error) {
    console.error('Verification error:', error);
  }
}

runVerification();

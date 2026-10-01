// QA test script for DineIQ full audit - v2
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE_URL = 'http://localhost:8787';

async function runQASuite() {
  console.log('==================================================');
  console.log('       DINEIQ COMPREHENSIVE QA AUDIT SUITE       ');
  console.log('==================================================\n');

  const issues = {
    breaking: [],
    annoying: [],
    cosmetic: [],
  };

  // Helper fetch with auth
  async function api(path, options = {}, token = null) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  }

  // TEST 1: User Registration, Login & Session Persistence
  console.log('[1/7] Testing Full User Journey: Auth, Settings, Persistence...');
  const testEmail = `qa_owner_${Date.now()}@testdine.in`;
  const testPassword = 'Password@123';
  const testRestaurantName = `QA Bistro ${Date.now().toString().slice(-4)}`;

  const regRes = await api('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      ownerName: 'QA Owner',
      restaurantName: testRestaurantName,
    }),
  });

  if (!regRes.ok || !regRes.data?.token) {
    issues.breaking.push(`Registration failed: ${JSON.stringify(regRes.data)}`);
    console.error('  FAIL: Registration failed');
  } else {
    console.log('  PASS: User registered successfully via /api/auth/signup. Token received.');
  }

  const token = regRes.data?.token;

  // Verify Restaurant profile
  const restRes = await api('/api/restaurant', { method: 'GET' }, token);
  if (!restRes.ok || restRes.data?.name !== testRestaurantName) {
    issues.breaking.push(`Restaurant profile did not match registered name: got ${restRes.data?.name}`);
    console.error(`  FAIL: Restaurant profile mismatch: got "${restRes.data?.name}" expected "${testRestaurantName}"`);
  } else {
    console.log(`  PASS: Restaurant profile matches: "${restRes.data.name}"`);
  }

  // Update Settings (Phone, GSTIN, Address, Expenses)
  const patchRes = await api(
    '/api/restaurant',
    {
      method: 'PATCH',
      body: JSON.stringify({
        phone: '+91 9876543210',
        gstin: '29ABCDE1234F1Z5',
        address: '100 Feet Rd, Indiranagar, Bengaluru',
        fixed_expenses: [{ key: 'rent', label: 'rent', value: 45000 }],
        fixed_expense_total: 45000,
        staff_expenses: [{ key: 'chef_salaries', label: 'chef salaries', value: 30000 }],
        staff_expense_total: 30000,
      }),
    },
    token
  );

  if (!patchRes.ok || patchRes.data?.gstin !== '29ABCDE1234F1Z5') {
    issues.breaking.push('PATCH /api/restaurant failed to persist updated profile');
    console.error('  FAIL: Settings patch failed');
  } else {
    console.log('  PASS: Settings updated and verified.');
  }

  // Verify Logout & Re-login
  const loginRes = await api('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  if (!loginRes.ok || !loginRes.data?.token) {
    issues.breaking.push('Sign in with registered credentials failed');
    console.error('  FAIL: Sign in failed');
  } else {
    console.log('  PASS: User logged back in successfully. Token re-issued.');
  }
  const verifiedToken = loginRes.data?.token;

  // Re-verify settings persisted across session
  const verifyProfileRes = await api('/api/restaurant', { method: 'GET' }, verifiedToken);
  if (verifyProfileRes.data?.gstin === '29ABCDE1234F1Z5') {
    console.log('  PASS: Settings data persisted across logout and re-login.');
  } else {
    issues.breaking.push('Settings did not persist across logout/login');
  }

  // TEST 2: Bill Capture & Validation Edge Cases
  console.log('\n[2/7] Testing Bill Capture, Validations, and Edge Cases...');

  // Edge case 2a: Empty items bill
  const emptyBillRes = await api(
    '/api/bills',
    {
      method: 'POST',
      body: JSON.stringify({
        billNumber: 'BILL-EMPTY',
        date: '2026-10-01',
        total: 100,
        items: [],
      }),
    },
    verifiedToken
  );
  if (emptyBillRes.status === 400 && emptyBillRes.data?.code === 'EMPTY_BILL_ITEMS') {
    console.log('  PASS: Empty line items rejected with 400 EMPTY_BILL_ITEMS.');
  } else {
    issues.breaking.push(`Empty bill was not rejected properly: status=${emptyBillRes.status}`);
    console.error('  FAIL: Empty line items not rejected properly');
  }

  // Edge case 2b: Zero total bill
  const zeroTotalRes = await api(
    '/api/bills',
    {
      method: 'POST',
      body: JSON.stringify({
        billNumber: 'BILL-ZERO',
        date: '2026-10-01',
        total: 0,
        items: [{ name: 'Free mints', quantity: 1, price: 0 }],
      }),
    },
    verifiedToken
  );
  if (zeroTotalRes.status === 400 && zeroTotalRes.data?.code === 'INVALID_BILL_TOTAL') {
    console.log('  PASS: Zero total bill rejected with 400 INVALID_BILL_TOTAL.');
  } else {
    issues.breaking.push(`Zero total bill was not rejected properly: status=${zeroTotalRes.status}`);
    console.error('  FAIL: Zero total bill not rejected properly');
  }

  // Test 2c: Normal Bill Save
  const validBillNum = `QA-BILL-${Date.now().toString().slice(-4)}`;
  const validBillDate = '2026-10-01';
  const saveBillRes = await api(
    '/api/bills',
    {
      method: 'POST',
      body: JSON.stringify({
        billNumber: validBillNum,
        number: `#${validBillNum}`,
        date: validBillDate,
        time: '13:45',
        subtotal: 1200,
        gst: 60,
        total: 1260,
        paymentMode: 'UPI',
        items: [
          { name: 'Paneer Butter Masala', quantity: 2, price: 600, rate: 300, amount: 600 },
          { name: 'Garlic Naan', quantity: 4, price: 400, rate: 100, amount: 400 },
          { name: 'Sweet Lassi', quantity: 2, price: 200, rate: 100, amount: 200 },
        ],
      }),
    },
    verifiedToken
  );

  if (!saveBillRes.ok) {
    issues.breaking.push(`Saving valid bill failed: ${JSON.stringify(saveBillRes.data)}`);
    console.error('  FAIL: Valid bill save failed');
  } else {
    console.log(`  PASS: Valid bill #${validBillNum} saved successfully.`);
  }

  // Test 2d: Duplicate Bill Rejection (Double Click prevention)
  const dupBillRes = await api(
    '/api/bills',
    {
      method: 'POST',
      body: JSON.stringify({
        billNumber: validBillNum,
        date: validBillDate,
        total: 1260,
        items: [{ name: 'Paneer Butter Masala', quantity: 2, price: 600 }],
      }),
    },
    verifiedToken
  );
  if (dupBillRes.status === 409 && dupBillRes.data?.code === 'DUPLICATE_BILL') {
    console.log('  PASS: Duplicate bill submission rejected with 409 DUPLICATE_BILL.');
  } else {
    issues.breaking.push(`Duplicate bill was not rejected: status=${dupBillRes.status}`);
    console.error('  FAIL: Duplicate bill was not rejected');
  }

  // Save a second bill in September 2026 for cross-month testing
  const sepBillRes = await api(
    '/api/bills',
    {
      method: 'POST',
      body: JSON.stringify({
        billNumber: `SEP-BILL-${Date.now().toString().slice(-4)}`,
        date: '2026-09-28',
        time: '20:15',
        subtotal: 2400,
        gst: 120,
        total: 2520,
        paymentMode: 'Card',
        items: [
          { name: 'Biryani Special', quantity: 2, price: 1600, rate: 800, amount: 1600 },
          { name: 'Gulab Jamun', quantity: 4, price: 800, rate: 200, amount: 800 },
        ],
      }),
    },
    verifiedToken
  );
  if (sepBillRes.ok) {
    console.log('  PASS: September historical bill saved successfully.');
  }

  // TEST 3: Dashboard Periods vs Reports Consistency
  console.log('\n[3/7] Testing Dashboard Period Recalculation & Cross-Page Consistency...');

  // Week view
  const dashWeek = await api('/api/dashboard?periodType=week&weekOffset=0', { method: 'GET' }, verifiedToken);
  // Month view: October 2026
  const dashMonthOct = await api('/api/dashboard?periodType=month&month=2026-10', { method: 'GET' }, verifiedToken);
  // Month view: September 2026
  const dashMonthSep = await api('/api/dashboard?periodType=month&month=2026-09', { method: 'GET' }, verifiedToken);
  // All Time view
  const dashAll = await api('/api/dashboard?periodType=all', { method: 'GET' }, verifiedToken);

  // Reports view: October 2026
  const repOct = await api('/api/reports/monthly?month=2026-10', { method: 'GET' }, verifiedToken);
  // Reports view: September 2026
  const repSep = await api('/api/reports/monthly?month=2026-09', { method: 'GET' }, verifiedToken);

  console.log(`  Dashboard Oct 2026: Revenue=${dashMonthOct.data?.kpis?.[0]?.value}, Bills=${dashMonthOct.data?.kpis?.[1]?.value}`);
  console.log(`  Reports Oct 2026:   Revenue=₹${repOct.data?.revenue?.toLocaleString('en-IN')}, Bills=${repOct.data?.billCount}`);
  console.log(`  Dashboard Sep 2026: Revenue=${dashMonthSep.data?.kpis?.[0]?.value}, Bills=${dashMonthSep.data?.kpis?.[1]?.value}`);
  console.log(`  Reports Sep 2026:   Revenue=₹${repSep.data?.revenue?.toLocaleString('en-IN')}, Bills=${repSep.data?.billCount}`);
  console.log(`  Dashboard All-Time: Revenue=${dashAll.data?.kpis?.[0]?.value}, Bills=${dashAll.data?.kpis?.[1]?.value}`);

  // Consistency checks
  const dashOctRev = Number(String(dashMonthOct.data?.kpis?.[0]?.value || '').replace(/[^0-9]/g, ''));
  const repOctRev = repOct.data?.revenue || 0;
  if (dashOctRev !== repOctRev) {
    issues.breaking.push(`Dashboard Oct revenue (${dashOctRev}) does not match Reports Oct revenue (${repOctRev})`);
    console.error('  FAIL: Oct revenue mismatch between Dashboard and Reports');
  } else {
    console.log('  PASS: Dashboard & Reports Oct 2026 revenue match identically.');
  }

  const dashSepRev = Number(String(dashMonthSep.data?.kpis?.[0]?.value || '').replace(/[^0-9]/g, ''));
  const repSepRev = repSep.data?.revenue || 0;
  if (dashSepRev !== repSepRev) {
    issues.breaking.push(`Dashboard Sep revenue (${dashSepRev}) does not match Reports Sep revenue (${repSepRev})`);
    console.error('  FAIL: Sep revenue mismatch between Dashboard and Reports');
  } else {
    console.log('  PASS: Dashboard & Reports Sep 2026 revenue match identically.');
  }

  const allTimeRev = Number(String(dashAll.data?.kpis?.[0]?.value || '').replace(/[^0-9]/g, ''));
  if (allTimeRev !== dashOctRev + dashSepRev) {
    issues.breaking.push(`Dashboard All-time revenue (${allTimeRev}) does not equal sum of months (${dashOctRev + dashSepRev})`);
    console.error('  FAIL: All-time revenue not equal to sum of months');
  } else {
    console.log('  PASS: All-time revenue correctly sums all historical bills.');
  }

  // Invariant check: Today summary invariant across all dashboard views
  const todayLabelWeek = dashWeek.data?.todayDateLabel;
  const todayLabelSep = dashMonthSep.data?.todayDateLabel;
  const todayLabelAll = dashAll.data?.todayDateLabel;
  if (todayLabelWeek === todayLabelSep && todayLabelSep === todayLabelAll && todayLabelWeek) {
    console.log(`  PASS: Daily summary remains strictly anchored to Today (${todayLabelWeek}) across all period views.`);
  } else {
    issues.breaking.push('Daily summary drifted or differed across period views');
    console.error('  FAIL: Daily summary drifted across period views');
  }

  // TEST 4: Monthly Report Analytics & PDF Data Integrity
  console.log('\n[4/7] Testing Monthly Analytics & PDF Data Generator Integrity...');

  // Inspect analytics for Sep 2026 (month with data)
  const sepAnalytics = repSep.data?.analytics;
  if (!sepAnalytics) {
    issues.breaking.push('repSep.data.analytics is missing');
  } else {
    // 4a. Daily breakdown sum must equal monthly revenue
    const sumDaily = (sepAnalytics.dailyBreakdown || []).reduce((s, d) => s + (d.revenue || 0), 0);
    if (sumDaily === repSep.data.revenue) {
      console.log(`  PASS: Daily breakdown sum (₹${sumDaily}) exactly equals month revenue (₹${repSep.data.revenue}).`);
    } else {
      issues.breaking.push(`Daily breakdown sum (₹${sumDaily}) contradicts month revenue (₹${repSep.data.revenue})`);
      console.error('  FAIL: Daily breakdown sum mismatch');
    }

    // 4b. Top dishes must match actual recorded items
    const topDishes = sepAnalytics.top10Dishes || [];
    console.log(`  Sep Top Dish: "${topDishes[0]?.name}" (${topDishes[0]?.portions} portions, ₹${topDishes[0]?.revenue})`);
    if (topDishes.length > 0 && topDishes[0].name === 'Biryani Special') {
      console.log('  PASS: Top dish accurately reflects real bill items.');
    } else {
      issues.breaking.push(`Top dish unexpected: got ${topDishes[0]?.name}`);
    }

    // 4c. Check if there are any hardcoded template placeholder dishes
    const fakeNames = ['Truffle Risotto', 'Grilled Salmon', 'Wagyu Burger', 'Matcha Tiramisu', 'Specialty Item'];
    const hasFakes = topDishes.some((d) => fakeNames.includes(d.name));
    if (hasFakes) {
      issues.breaking.push('Top dishes contains hardcoded sample dishes from template!');
      console.error('  FAIL: Top dishes has hardcoded sample items');
    } else {
      console.log('  PASS: Zero hardcoded sample items found in top dishes.');
    }
  }

  // TEST 5: Empty Month Behavior (Zero bills)
  console.log('\n[5/7] Testing Zero-Bills Month Behavior (Clean Empty States)...');
  const emptyMonth = await api('/api/reports/monthly?month=2025-01', { method: 'GET' }, verifiedToken);
  if (emptyMonth.data?.revenue === 0 && emptyMonth.data?.billCount === 0) {
    console.log('  PASS: Empty month returns revenue=0, billCount=0.');
    const emptyAnalytics = emptyMonth.data?.analytics;
    if (emptyAnalytics?.top10Dishes?.length === 0 && emptyAnalytics?.popularCombos?.length === 0) {
      console.log('  PASS: Empty month honestly returns empty top dishes and combos (no fake sample items).');
    } else {
      issues.breaking.push(`Empty month returned non-empty dishes: ${JSON.stringify(emptyAnalytics?.top10Dishes)}`);
      console.error('  FAIL: Empty month has dishes');
    }

    if (emptyAnalytics?.bestDay === null && emptyAnalytics?.slowestDay === null) {
      console.log('  PASS: Empty month honestly returns bestDay=null and slowestDay=null.');
    } else {
      issues.breaking.push('Empty month returned non-null bestDay or slowestDay');
      console.error('  FAIL: Empty month bestDay/slowestDay not null');
    }
  } else {
    issues.breaking.push('Empty month did not return 0 revenue or 0 billCount');
  }

  // TEST 6: Future Month Capping
  console.log('\n[6/7] Testing Future Month Capping Edge Case...');
  const futureMonth = await api('/api/reports/monthly?month=2099-12', { method: 'GET' }, verifiedToken);
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (futureMonth.data?.month === currentKey) {
    console.log(`  PASS: Future month 2099-12 was properly capped to current month ${currentKey}.`);
  } else {
    issues.breaking.push(`Future month was not capped: returned ${futureMonth.data?.month}`);
    console.error('  FAIL: Future month not capped');
  }

  // TEST 7: Large Number of Bills Stress Test
  console.log('\n[7/7] Stress Testing Large Number of Bills in One Period...');
  const bulkBills = [];
  for (let i = 1; i <= 35; i++) {
    bulkBills.push(
      api(
        '/api/bills',
        {
          method: 'POST',
          body: JSON.stringify({
            billNumber: `BULK-${i}-${Date.now().toString().slice(-4)}`,
            date: '2026-10-01',
            time: `12:${String(i % 60).padStart(2, '0')}`,
            subtotal: 500 + i * 10,
            gst: 25 + i,
            total: 525 + i * 11,
            items: [
              { name: `Bulk Item ${(i % 5) + 1}`, quantity: 1, price: 500 + i * 10 }
            ],
          }),
        },
        verifiedToken
      )
    );
  }
  const bulkResults = await Promise.all(bulkBills);
  const allSaved = bulkResults.every((r) => r.ok);
  if (allSaved) {
    console.log('  PASS: Successfully saved 35 concurrent bills.');
  } else {
    issues.breaking.push('Failed to save 35 concurrent bills');
    console.error('  FAIL: Bulk save bills failed');
  }

  // Re-check dashboard and reports with 36 bills in Oct
  const postBulkDash = await api('/api/dashboard?periodType=month&month=2026-10', { method: 'GET' }, verifiedToken);
  const postBulkRep = await api('/api/reports/monthly?month=2026-10', { method: 'GET' }, verifiedToken);

  console.log(`  Post-bulk Oct Dashboard bills: ${postBulkDash.data?.kpis?.[1]?.value}`);
  console.log(`  Post-bulk Oct Reports bills:   ${postBulkRep.data?.billCount}`);

  if (postBulkRep.data?.billCount === 36 && Number(postBulkDash.data?.kpis?.[1]?.value) === 36) {
    console.log('  PASS: Stress test passed! 36 bills accounted for consistently across Dashboard and Reports.');
  } else {
    issues.breaking.push(`Mismatch after bulk insert: dash=${postBulkDash.data?.kpis?.[1]?.value}, rep=${postBulkRep.data?.billCount}`);
    console.error('  FAIL: Bulk insert count mismatch');
  }

  console.log('\n==================================================');
  console.log('                QA AUDIT SUMMARY                  ');
  console.log('==================================================');
  console.log(`Breaking issues: ${issues.breaking.length}`);
  issues.breaking.forEach((i) => console.log(`  - [BREAKING] ${i}`));
  console.log(`Annoying issues: ${issues.annoying.length}`);
  issues.annoying.forEach((i) => console.log(`  - [ANNOYING] ${i}`));
  console.log(`Cosmetic issues: ${issues.cosmetic.length}`);
  issues.cosmetic.forEach((i) => console.log(`  - [COSMETIC] ${i}`));
  console.log('==================================================\n');
}

runQASuite().catch((e) => console.error('Suite crashed:', e));

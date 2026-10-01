const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

async function runAskQATests() {
  console.log('====================================================');
  console.log('       ASK DINEIQ RIGOROUS QA TEST SUITE           ');
  console.log('====================================================\n');

  // First, fetch September 2026 data directly from /api/reports/monthly to get ground truth numbers
  const repRes = await fetch('http://localhost:8787/api/reports/monthly?month=2026-09');
  const repData = await repRes.json();

  const groundTruthRevenue = repData.revenue;
  const groundTruthBills = repData.billCount;
  const groundTruthAvg = groundTruthBills > 0 ? Math.round(groundTruthRevenue / groundTruthBills) : 0;
  const groundTruthTopDish = repData.analytics?.top10Dishes?.[0]?.name;

  console.log(`GROUND TRUTH DATABASE NUMBERS FOR SEPTEMBER 2026:`);
  console.log(`  Revenue: ₹${groundTruthRevenue.toLocaleString('en-IN')}`);
  console.log(`  Bills:   ${groundTruthBills}`);
  console.log(`  Avg:     ₹${groundTruthAvg.toLocaleString('en-IN')}`);
  console.log(`  Top Dish: "${groundTruthTopDish}"\n`);

  let failures = 0;

  async function testQuery(question, validations = []) {
    console.log(`----------------------------------------------------`);
    console.log(`QUESTION: "${question}"`);
    const res = await fetch('http://localhost:8787/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      console.error(`  FAIL: HTTP status ${res.status}`);
      failures++;
      return;
    }

    const json = await res.json();
    console.log(`  ANSWER (${json.modelUsed}):\n  "${json.answer}"\n`);

    for (const v of validations) {
      const passed = v.check(json);
      if (passed) {
        console.log(`  PASS: ${v.desc}`);
      } else {
        console.error(`  FAIL: ${v.desc}`);
        failures++;
      }
    }
  }

  // TEST 1: Exact September revenue
  await testQuery('What was my revenue in September?', [
    {
      desc: `Response must contain exact ground truth revenue ₹${groundTruthRevenue.toLocaleString('en-IN')}`,
      check: (data) => data.answer.includes(groundTruthRevenue.toLocaleString('en-IN')),
    },
    {
      desc: `Response must contain exact bill count ${groundTruthBills}`,
      check: (data) => data.answer.includes(String(groundTruthBills)),
    },
  ]);

  // TEST 2: Exact September bill count
  await testQuery('How many bills did we capture in September?', [
    {
      desc: `Response must state exactly ${groundTruthBills} bills`,
      check: (data) => data.answer.includes(String(groundTruthBills)),
    },
    {
      desc: `Response must state average bill value of ₹${groundTruthAvg.toLocaleString('en-IN')}`,
      check: (data) => data.answer.includes(groundTruthAvg.toLocaleString('en-IN')),
    },
  ]);

  // TEST 3: Average bill value
  await testQuery('What was my average bill value in September?', [
    {
      desc: `Response must state exact average bill value ₹${groundTruthAvg.toLocaleString('en-IN')}`,
      check: (data) => data.answer.includes(groundTruthAvg.toLocaleString('en-IN')),
    },
  ]);

  // TEST 4: Best-selling dish
  await testQuery("What's my best-selling dish in September?", [
    {
      desc: `Response must name the genuine top dish "${groundTruthTopDish}"`,
      check: (data) => data.answer.toLowerCase().includes(groundTruthTopDish.toLowerCase()),
    },
  ]);

  // TEST 5: Comparison query
  await testQuery('Compare this month to last month', [
    {
      desc: 'Response must include September and October data',
      check: (data) => data.facts.comparePeriod !== null && data.facts.primaryPeriod !== null,
    },
  ]);

  // TEST 6: Zero bills period
  await testQuery('What was my revenue in 2024-01?', [
    {
      desc: 'Response must honestly report ₹0 or no bills captured',
      check: (data) => data.answer.includes('0') || data.answer.toLowerCase().includes('no bills'),
    },
  ]);

  // TEST 7: Unsupported question
  await testQuery('What is the weather in Delhi today?', [
    {
      desc: 'Must identify as unsupported and decline politely',
      check: (data) => data.facts.isUnsupported === true,
    },
  ]);

  console.log(`\n====================================================`);
  if (failures === 0) {
    console.log('  ALL ASK DINEIQ RIGOROUS QA TESTS PASSED! (0 failures)');
  } else {
    console.error(`  QA TESTS FAILED WITH ${failures} ERRORS.`);
    process.exit(1);
  }
  console.log(`====================================================\n`);
}

runAskQATests().catch(console.error);

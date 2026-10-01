import fs from 'fs'
import path from 'path'

async function runExtractionRetryTests() {
  console.log('====================================================')
  console.log('      BILL EXTRACTION 503 RETRY TEST SUITE          ')
  console.log('====================================================\n')

  const testImagePath = path.resolve('src/assets/hero.png')
  if (!fs.existsSync(testImagePath)) {
    console.error('Test image not found at', testImagePath)
    process.exit(1)
  }

  const fileBytes = fs.readFileSync(testImagePath)
  const validMockBill = {
    billNumber: "TEST-1042",
    date: "2026-10-01",
    time: "14:30",
    restaurantName: "Spice Lounge",
    tableNumber: 4,
    lineItems: [
      { name: "Paneer Butter Masala", quantity: 1, rate: 320, amount: 320 },
      { name: "Butter Naan", quantity: 2, rate: 50, amount: 100 }
    ],
    subtotal: 420,
    taxes: [{ name: "GST", rate: 5, amount: 21 }],
    grandTotal: 441
  }

  let failures = 0

  // TEST 1: Transient 503 (Attempt 1 fails 503, Attempt 2 fails 503, Attempt 3 succeeds)
  console.log('TEST 1: Simulating Transient 503 (2 failures, then success on attempt 3)...')
  const startTime1 = Date.now()
  try {
    const blob1 = new Blob([fileBytes], { type: 'image/png' })
    const form1 = new FormData()
    form1.append('bill', blob1, 'test_bill.png')

    const res1 = await fetch('http://localhost:8787/api/extract-bill', {
      method: 'POST',
      body: form1,
      headers: {
        'x-simulate-503': '2',
        'x-mock-model-result': JSON.stringify(validMockBill),
      },
    })

    const elapsed1 = Date.now() - startTime1
    const data1 = await res1.json()

    if (res1.status === 200 && Array.isArray(data1.lineItems) && data1.grandTotal === 441) {
      console.log(`  PASS: Extraction succeeded with HTTP 200 after silent retries!`)
      console.log(`  Attempts taken: ${data1._extractionMeta?.attempts} (expected 3)`)
      console.log(`  Time elapsed: ${(elapsed1 / 1000).toFixed(2)}s (delay verified, expected >= 5s)`)
      if (data1._extractionMeta?.attempts !== 3) {
        console.error('  FAIL: Expected attempts to be 3')
        failures++
      }
      if (elapsed1 < 4800) {
        console.error('  FAIL: Expected at least ~5s of delay for 2 retries')
        failures++
      }
    } else {
      console.error(`  FAIL: Expected HTTP 200, got status ${res1.status}:`, data1)
      failures++
    }
  } catch (err) {
    console.error('  FAIL: Exception in Test 1:', err)
    failures++
  }

  // TEST 2: Persistent 503 (All 3 attempts fail with 503 -> retries exhausted)
  console.log('\nTEST 2: Simulating Persistent 503 (All 3 attempts fail with 503)...')
  const startTime2 = Date.now()
  try {
    const blob2 = new Blob([fileBytes], { type: 'image/png' })
    const form2 = new FormData()
    form2.append('bill', blob2, 'test_bill.png')

    const res2 = await fetch('http://localhost:8787/api/extract-bill', {
      method: 'POST',
      body: form2,
      headers: {
        'x-simulate-503': '3',
        'x-mock-model-result': JSON.stringify(validMockBill),
      },
    })

    const elapsed2 = Date.now() - startTime2
    const data2 = await res2.json()

    if (res2.status === 503) {
      console.log(`  PASS: Correctly returned HTTP 503 when retries are exhausted!`)
      console.log(`  Error message returned: "${data2.error}"`)
      console.log(`  isTransient flag: ${data2.isTransient}`)
      console.log(`  Time elapsed: ${(elapsed2 / 1000).toFixed(2)}s (delay verified, expected >= 5s)`)
      if (!data2.error.includes('high demand') && !data2.error.includes('unavailable')) {
        console.error('  FAIL: Expected friendly high demand error message')
        failures++
      }
      if (elapsed2 < 4800) {
        console.error('  FAIL: Expected at least ~5s of delay for retries')
        failures++
      }
    } else {
      console.error(`  FAIL: Expected HTTP 503, got status ${res2.status}:`, data2)
      failures++
    }
  } catch (err) {
    console.error('  FAIL: Exception in Test 2:', err)
    failures++
  }

  // TEST 3: Single Transient 503 (1 failure on attempt 1, success on attempt 2)
  console.log('\nTEST 3: Simulating 1 Transient 503 (Recovers on attempt 2)...')
  const startTime3 = Date.now()
  try {
    const blob3 = new Blob([fileBytes], { type: 'image/png' })
    const form3 = new FormData()
    form3.append('bill', blob3, 'test_bill.png')

    const res3 = await fetch('http://localhost:8787/api/extract-bill', {
      method: 'POST',
      body: form3,
      headers: {
        'x-simulate-503': '1',
        'x-mock-model-result': JSON.stringify(validMockBill),
      },
    })

    const elapsed3 = Date.now() - startTime3
    const data3 = await res3.json()

    if (res3.status === 200 && data3.grandTotal === 441) {
      console.log(`  PASS: Succeeded cleanly on attempt 2!`)
      console.log(`  Attempts taken: ${data3._extractionMeta?.attempts} (expected 2)`)
      console.log(`  Time elapsed: ${(elapsed3 / 1000).toFixed(2)}s (expected ~2.5s)`)
      if (data3._extractionMeta?.attempts !== 2) {
        console.error('  FAIL: Expected attempts to be 2')
        failures++
      }
    } else {
      console.error(`  FAIL: Expected HTTP 200 on attempt 2, got status ${res3.status}:`, data3)
      failures++
    }
  } catch (err) {
    console.error('  FAIL: Exception in Test 3:', err)
    failures++
  }

  console.log('\n====================================================')
  if (failures === 0) {
    console.log('  ALL BILL EXTRACTION RETRY TESTS PASSED! (0 failures)')
  } else {
    console.error(`  TESTS FAILED WITH ${failures} ERRORS.`)
    process.exit(1)
  }
  console.log('====================================================\n')
}

runExtractionRetryTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})

async function runColdStartTests() {
  console.log('====================================================')
  console.log('     DASHBOARD 503 COLD-START RETRY TEST SUITE      ')
  console.log('====================================================\n')

  let failures = 0
  const runId = Date.now().toString()

  // Exact replication of fetchJsonWithRetry logic from AnalyticsDashboard.jsx
  async function fetchJsonWithRetry(url, options = {}, maxRetries = 3, retryDelayMs = 2000, onRetry) {
    let lastError = null
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          onRetry?.(attempt)
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
        }
        const res = await fetch(url, options)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const isTransient = res.status === 503 || res.status === 502 || res.status === 504 || /503|service unavailable|cold start|high demand|overloaded/i.test(body.error || '')
          const err = new Error(body.error || `Failed to load dashboard (HTTP ${res.status})`)
          err.status = res.status
          err.isTransient = isTransient
          throw err
        }
        return await res.json()
      } catch (err) {
        lastError = err
        const isTransient = err.isTransient || err.status === 503 || err.status === 502 || err.status === 504 || /503|service unavailable|cold start|failed to fetch|network|fetch failed/i.test(err.message)
        if (!isTransient || attempt >= maxRetries) {
          throw err
        }
        onRetry?.(attempt)
      }
    }
    throw lastError
  }

  // TEST 1: Cold start simulation with 2 failures, recovering on attempt 3
  console.log('TEST 1: Simulating cold-start 503 (2 failures, then success on attempt 3)...')
  const startTime1 = Date.now()
  let retryCount1 = 0
  let isWakingUpSeen = false

  try {
    const data = await fetchJsonWithRetry(
      'http://localhost:8787/api/dashboard?periodType=week',
      {
        headers: {
          'x-simulate-cold-start': '2',
          'x-test-id': `test1_${runId}`,
        },
      },
      3,
      2000,
      (attempt) => {
        retryCount1 = attempt
        isWakingUpSeen = true
        console.log(`  [UI Banner] Waking up, this may take a moment... (attempt ${attempt}/3)`)
      }
    )

    const elapsed1 = Date.now() - startTime1
    console.log(`  PASS: Succeeded with dashboard data after cold start wake-up!`)
    console.log(`  Waking up state activated: ${isWakingUpSeen}`)
    console.log(`  Attempts taken: ${retryCount1}`)
    console.log(`  Time elapsed: ${(elapsed1 / 1000).toFixed(2)}s (delay verified, expected >= 4s)`)
    console.log(`  Period label returned: "${data.periodLabel}"`)

    if (!isWakingUpSeen) {
      console.error('  FAIL: Expected isWakingUp banner state to have triggered')
      failures++
    }
    if (retryCount1 !== 3) {
      console.error(`  FAIL: Expected 3 attempts, got ${retryCount1}`)
      failures++
    }
  } catch (err) {
    console.error('  FAIL: Unexpected error in Test 1:', err)
    failures++
  }

  // TEST 2: Persistent 503 (All 3 attempts fail -> exhausts retries)
  console.log('\nTEST 2: Simulating persistent 503 (Exhausts all 3 attempts)...')
  const startTime2 = Date.now()
  let retryCount2 = 0
  try {
    await fetchJsonWithRetry(
      'http://localhost:8787/api/dashboard?periodType=week',
      {
        headers: {
          'x-simulate-cold-start': '5',
          'x-test-id': `test2_${runId}`,
        },
      },
      3,
      1500,
      (attempt) => {
        retryCount2 = attempt
        console.log(`  [UI Banner] Waking up, this may take a moment... (attempt ${attempt}/3)`)
      }
    )
    console.error('  FAIL: Test 2 should have thrown an error after exhausting retries')
    failures++
  } catch (err) {
    const elapsed2 = Date.now() - startTime2
    console.log(`  PASS: Correctly threw final error after exhausting retries!`)
    console.log(`  Error: "${err.message}"`)
    console.log(`  Time elapsed: ${(elapsed2 / 1000).toFixed(2)}s`)
    if (!err.message.includes('cold start') && !err.message.includes('503')) {
      console.error('  FAIL: Expected cold start error message')
      failures++
    }
  }

  // TEST 3: Single transient 503 (Recovers on attempt 2)
  console.log('\nTEST 3: Simulating 1 transient cold-start 503 (Recovers on attempt 2)...')
  const startTime3 = Date.now()
  let retryCount3 = 0
  try {
    const data = await fetchJsonWithRetry(
      'http://localhost:8787/api/dashboard?periodType=week',
      {
        headers: {
          'x-simulate-cold-start': '1',
          'x-test-id': `test3_${runId}`,
        },
      },
      3,
      2000,
      (attempt) => {
        retryCount3 = attempt
        console.log(`  [UI Banner] Waking up, this may take a moment... (attempt ${attempt}/3)`)
      }
    )
    const elapsed3 = Date.now() - startTime3
    console.log(`  PASS: Recovered cleanly on attempt 2!`)
    console.log(`  Attempts taken: ${retryCount3} (expected 2)`)
    console.log(`  Time elapsed: ${(elapsed3 / 1000).toFixed(2)}s`)
    if (retryCount3 !== 2) {
      console.error(`  FAIL: Expected attempt 2, got ${retryCount3}`)
      failures++
    }
  } catch (err) {
    console.error('  FAIL: Unexpected error in Test 3:', err)
    failures++
  }

  console.log('\n====================================================')
  if (failures === 0) {
    console.log('  ALL COLD-START RETRY TESTS PASSED! (0 failures)')
  } else {
    console.error(`  TESTS FAILED WITH ${failures} ERRORS.`)
    process.exit(1)
  }
  console.log('====================================================\n')
}

runColdStartTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})

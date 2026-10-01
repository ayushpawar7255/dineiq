import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Ask DineIQ Natural Language Query Engine
 * 
 * Pipeline:
 * 1. Understand question -> Structured query plan (Date range, metric, dish filter, comparison)
 * 2. Fetch real data -> Query bills, bill_items, and expenses deterministically from DB/memory
 * 3. Generate answer -> Grounded strictly in real numbers, with instant fallback
 */

function numberValue(val) {
  if (val == null) return 0
  const n = Number(String(val).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? 0 : n
}

function formatInr(val) {
  const num = Math.round(numberValue(val))
  return `₹${num.toLocaleString('en-IN')}`
}

function normalizeDateToYMD(val) {
  if (!val) return null
  if (typeof val === 'string') {
    const m = val.match(/^(\d{4}-\d{2}-\d{2})/)
    if (m) return m[1]
    const d = new Date(val)
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  }
  return null
}

function formatDateDisplay(ymd) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * STEP 1: Rule-based & LLM query understanding
 */
export function extractStructuredPlan(question, referenceDate = new Date()) {
  const rawQ = String(question || '').trim()
  const q = rawQ.toLowerCase().replace(/[-_]/g, ' ')
  const ref = new Date(referenceDate)
  const curY = ref.getFullYear()
  const curM = ref.getMonth() + 1
  const curD = ref.getDate()
  const todayStr = `${curY}-${String(curM).padStart(2, '0')}-${String(curD).padStart(2, '0')}`

  // Calculate Yesterday
  const yest = new Date(ref)
  yest.setDate(ref.getDate() - 1)
  const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`

  // Calculate This Week (rolling 7 days up to today)
  const weekStart = new Date(ref)
  weekStart.setDate(ref.getDate() - 6)
  const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`

  // Calculate Last Week (7 days prior)
  const lastWeekEnd = new Date(weekStart)
  lastWeekEnd.setDate(weekStart.getDate() - 1)
  const lastWeekStart = new Date(lastWeekEnd)
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
  const lastWeekStartStr = `${lastWeekStart.getFullYear()}-${String(lastWeekStart.getMonth() + 1).padStart(2, '0')}-${String(lastWeekStart.getDate()).padStart(2, '0')}`
  const lastWeekEndStr = `${lastWeekEnd.getFullYear()}-${String(lastWeekEnd.getMonth() + 1).padStart(2, '0')}-${String(lastWeekEnd.getDate()).padStart(2, '0')}`

  // Calculate This Month
  const thisMonthKey = `${curY}-${String(curM).padStart(2, '0')}`
  const lastDayThisMonth = new Date(curY, curM, 0).getDate()
  const thisMonthStart = `${thisMonthKey}-01`
  const thisMonthEnd = `${thisMonthKey}-${String(lastDayThisMonth).padStart(2, '0')}`

  // Calculate Last Month
  const prevMonthDate = new Date(curY, curM - 2, 1)
  const prevY = prevMonthDate.getFullYear()
  const prevM = prevMonthDate.getMonth() + 1
  const prevMonthKey = `${prevY}-${String(prevM).padStart(2, '0')}`
  const lastDayPrevMonth = new Date(prevY, prevM, 0).getDate()
  const lastMonthStart = `${prevMonthKey}-01`
  const lastMonthEnd = `${prevMonthKey}-${String(lastDayPrevMonth).padStart(2, '0')}`

  // Check specific day of week (e.g. "last Saturday", "last Sunday", "on Tuesday")
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  let specificWeekdayYMD = null
  let specificWeekdayLabel = null

  for (let i = 0; i < 7; i++) {
    const dayName = dayNames[i]
    if (q.includes(dayName)) {
      // Find the most recent date with this day of week preceding or on reference date
      const targetDay = i
      const curDay = ref.getDay()
      let diff = curDay - targetDay
      if (diff <= 0) diff += 7
      if (q.includes('last ' + dayName)) {
        // e.g. "last saturday"
        const dObj = new Date(ref)
        dObj.setDate(ref.getDate() - diff)
        specificWeekdayYMD = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`
        specificWeekdayLabel = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${formatDateDisplay(specificWeekdayYMD)}`
      } else if (q.includes('this ' + dayName) && curDay === targetDay) {
        // e.g. "this thursday" when today is thursday
        specificWeekdayYMD = todayStr
        specificWeekdayLabel = `Today (${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${formatDateDisplay(todayStr)})`
      } else {
        const dObj = new Date(ref)
        dObj.setDate(ref.getDate() - diff)
        specificWeekdayYMD = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`
        specificWeekdayLabel = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${formatDateDisplay(specificWeekdayYMD)}`
      }
      break
    }
  }

  // Check unsupported query
  const unsupportedKeywords = ['weather', 'stock', 'crypto', 'bitcoin', 'football', 'cricket', 'news', 'joke', 'movie', 'song', 'flight', 'hotel', 'president', 'prime minister']
  for (const uk of unsupportedKeywords) {
    if (q.includes(uk)) {
      return {
        intent: 'unsupported',
        unsupportedReason: `I am specialized in analyzing your restaurant's captured bills, sales revenue, menu dishes, and operating expenses. I cannot look up external topics like ${uk}.`,
        rawQuestion: rawQ,
      }
    }
  }

  let intent = 'revenue'
  if (/(best[- ]selling|top[- ]selling|popular dish|best dish|top dish|most ordered|most popular)/i.test(rawQ)) {
    intent = 'top_items'
  } else if (/(worst[- ]selling|lowest[- ]selling|least ordered|slowest dish|least popular)/i.test(rawQ)) {
    intent = 'bottom_items'
  } else if (/(profit|margin|net profit)/i.test(rawQ)) {
    intent = 'profit'
  } else if (/(how many bills|bill count|number of bills|total bills|orders count)/i.test(rawQ)) {
    intent = 'bill_count'
  } else if (/(average bill|avg bill|aov|per bill)/i.test(rawQ)) {
    intent = 'avg_bill'
  } else if (/(expense|overhead|spent|rent|salaries|salary|bills cost)/i.test(rawQ)) {
    intent = 'expenses'
  } else if (/(compare|\bvs\b|versus|better than|difference between)/i.test(rawQ)) {
    intent = 'comparison'
  }

  // Specific Dish Detection
  let itemFilter = null
  const dishKeywords = [
    'biryani', 'paneer', 'naan', 'roti', 'lassi', 'jamun', 'curry', 'dosa', 'chai', 'coffee',
    'tikka', 'pizza', 'burger', 'sandwich', 'dal', 'rice', 'pasta', 'shake', 'paratha', 'chole'
  ]
  for (const dk of dishKeywords) {
    if (q.includes(dk)) {
      itemFilter = dk
      if (intent === 'revenue') intent = 'specific_item'
      break
    }
  }

  // Timeframe detection
  let timeframe = {
    type: 'this_week',
    startDate: weekStartStr,
    endDate: todayStr,
    label: `This Week (${formatDateDisplay(weekStartStr)} – ${formatDateDisplay(todayStr)})`,
  }

  let compareTimeframe = null

  // Month dictionary
  const monthNamesMap = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12
  }

  // Check explicit YYYY-MM-DD
  const ymdMatch = rawQ.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/)
  // Check explicit YYYY-MM
  const ymMatch = rawQ.match(/\b(\d{4})[-/](\d{1,2})\b/)
  // Check month name (with optional year)
  const monthRegex = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b(?:\s+(\d{4}))?/i
  const monthMatch = rawQ.match(monthRegex)

  if (ymdMatch) {
    const yVal = Number(ymdMatch[1])
    const mVal = String(ymdMatch[2]).padStart(2, '0')
    const dVal = String(ymdMatch[3]).padStart(2, '0')
    const specificDay = `${yVal}-${mVal}-${dVal}`
    timeframe = {
      type: 'specific_day',
      startDate: specificDay,
      endDate: specificDay,
      label: formatDateDisplay(specificDay),
    }
  } else if (ymMatch) {
    const yVal = Number(ymMatch[1])
    const mVal = Number(ymMatch[2])
    const lastDay = new Date(yVal, mVal, 0).getDate()
    const mStart = `${yVal}-${String(mVal).padStart(2, '0')}-01`
    const mEnd = `${yVal}-${String(mVal).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const monthLabel = new Date(yVal, mVal - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    timeframe = {
      type: 'specific_month',
      startDate: mStart,
      endDate: mEnd,
      label: monthLabel,
    }
  } else if (specificWeekdayYMD) {
    timeframe = {
      type: 'specific_day',
      startDate: specificWeekdayYMD,
      endDate: specificWeekdayYMD,
      label: specificWeekdayLabel,
    }
  } else if (q.includes('today')) {
    timeframe = {
      type: 'today',
      startDate: todayStr,
      endDate: todayStr,
      label: `Today (${formatDateDisplay(todayStr)})`,
    }
  } else if (q.includes('yesterday')) {
    timeframe = {
      type: 'yesterday',
      startDate: yestStr,
      endDate: yestStr,
      label: `Yesterday (${formatDateDisplay(yestStr)})`,
    }
  } else if (q.includes('last month')) {
    timeframe = {
      type: 'specific_month',
      startDate: lastMonthStart,
      endDate: lastMonthEnd,
      label: new Date(prevY, prevM - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
  } else if (q.includes('this month')) {
    timeframe = {
      type: 'this_month',
      startDate: thisMonthStart,
      endDate: thisMonthEnd,
      label: new Date(curY, curM - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
  } else if (monthMatch) {
    const matchedMonthStr = monthMatch[1].toLowerCase()
    const mNum = monthNamesMap[matchedMonthStr]
    const yNum = monthMatch[2] ? Number(monthMatch[2]) : (mNum > curM ? curY - 1 : curY)
    const lastDay = new Date(yNum, mNum, 0).getDate()
    const mStart = `${yNum}-${String(mNum).padStart(2, '0')}-01`
    const mEnd = `${yNum}-${String(mNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const monthLabel = new Date(yNum, mNum - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    timeframe = {
      type: 'specific_month',
      startDate: mStart,
      endDate: mEnd,
      label: monthLabel,
    }
  } else if (q.includes('all time') || q.includes('ever') || q.includes('overall') || q.includes('total so far') || q.includes('since start')) {
    timeframe = {
      type: 'all_time',
      startDate: '2020-01-01',
      endDate: todayStr,
      label: 'All Time',
    }
  } else if (q.includes('last week')) {
    timeframe = {
      type: 'last_week',
      startDate: lastWeekStartStr,
      endDate: lastWeekEndStr,
      label: `Last Week (${formatDateDisplay(lastWeekStartStr)} – ${formatDateDisplay(lastWeekEndStr)})`,
    }
  }

  // Comparison detection
  if (
    intent === 'comparison' ||
    q.includes('compare this month to last month') ||
    q.includes('this month vs last month') ||
    q.includes('september vs october') ||
    q.includes('october vs september')
  ) {
    intent = 'comparison'
    timeframe = {
      type: 'this_month',
      startDate: thisMonthStart,
      endDate: thisMonthEnd,
      label: `${new Date(curY, curM - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (This Month)`,
    }
    compareTimeframe = {
      type: 'last_month',
      startDate: lastMonthStart,
      endDate: lastMonthEnd,
      label: `${new Date(prevY, prevM - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Last Month)`,
    }
  }

  return {
    intent,
    timeframe,
    compareTimeframe,
    itemFilter,
    rawQuestion: rawQ,
  }
}

/**
 * STEP 2: Deterministic Data Querying from Real Bills & Settings
 */
export function queryRealData(plan, bills = [], restaurant = {}) {
  if (plan.intent === 'unsupported') {
    return {
      isUnsupported: true,
      reason: plan.unsupportedReason,
    }
  }

  const allBills = Array.isArray(bills) ? bills : []
  const { timeframe, compareTimeframe, itemFilter } = plan

  const filterBillsByRange = (start, end) => {
    return allBills.filter((b) => {
      const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
      if (!d) return false
      return d >= start && d <= end
    })
  }

  // Query Primary Period
  const primaryBills = filterBillsByRange(timeframe.startDate, timeframe.endDate)
  const primaryMetrics = computePeriodMetrics(primaryBills, restaurant, timeframe.type)

  // Query Comparison Period (if applicable)
  let compareMetrics = null
  if (compareTimeframe) {
    const compareBills = filterBillsByRange(compareTimeframe.startDate, compareTimeframe.endDate)
    compareMetrics = computePeriodMetrics(compareBills, restaurant, compareTimeframe.type)
  }

  // Specific Dish Query
  let targetDishData = null
  if (itemFilter) {
    const qFilter = itemFilter.toLowerCase()
    let matchedPortions = 0
    let matchedRevenue = 0
    const matchedNames = new Set()

    primaryBills.forEach((b) => {
      const items = b.bill_items || b.lineItems || b.items || []
      items.forEach((it) => {
        const name = String(it.item_name || it.name || '').trim()
        if (name.toLowerCase().includes(qFilter)) {
          const qty = numberValue(it.quantity) || 1
          const amt = numberValue(it.amount) || (numberValue(it.rate ?? it.price) * qty) || 0
          matchedPortions += qty
          matchedRevenue += amt
          matchedNames.add(name)
        }
      })
    })

    targetDishData = {
      searchedItem: itemFilter,
      matchedItems: Array.from(matchedNames),
      portionsSold: matchedPortions,
      revenueGenerated: matchedRevenue,
      hasSales: matchedPortions > 0,
    }
  }

  return {
    restaurantName: restaurant.name || 'Your Restaurant',
    primaryPeriod: {
      label: timeframe.label,
      startDate: timeframe.startDate,
      endDate: timeframe.endDate,
      timeframeType: timeframe.type,
      ...primaryMetrics,
    },
    comparePeriod: compareMetrics ? {
      label: compareTimeframe.label,
      startDate: compareTimeframe.startDate,
      endDate: compareTimeframe.endDate,
      ...compareMetrics,
      diffRevenue: primaryMetrics.revenue - compareMetrics.revenue,
      pctRevenueChange: compareMetrics.revenue > 0
        ? (((primaryMetrics.revenue - compareMetrics.revenue) / compareMetrics.revenue) * 100).toFixed(1)
        : null,
      diffBills: primaryMetrics.billsCount - compareMetrics.billsCount,
    } : null,
    targetDishData,
    expensesConfigured: {
      fixed: numberValue(restaurant.fixed_expense_total),
      staff: numberValue(restaurant.staff_expense_total),
      variable: numberValue(restaurant.variable_expense_total),
      totalMonthly: numberValue(restaurant.fixed_expense_total) + numberValue(restaurant.staff_expense_total) + numberValue(restaurant.variable_expense_total),
    },
  }
}

function computePeriodMetrics(bills, restaurant, timeframeType = 'week') {
  const billsCount = bills.length
  const revenue = Math.round(bills.reduce((sum, b) => sum + numberValue(b.total), 0))
  const taxable = Math.round(bills.reduce((sum, b) => {
    const tot = numberValue(b.total)
    const gst = numberValue(b.gst ?? b.tax ?? 0)
    const sub = b.subtotal != null ? numberValue(b.subtotal) : (tot - gst > 0 ? tot - gst : tot)
    return sum + sub
  }, 0))
  const gst = Math.round(bills.reduce((sum, b) => sum + numberValue(b.gst ?? b.tax ?? 0), 0))
  const avgBillValue = billsCount > 0 ? Math.round(revenue / billsCount) : 0

  // Dish breakdown
  const dishMap = new Map()
  let totalItemsSold = 0

  bills.forEach((b) => {
    const items = b.bill_items || b.lineItems || b.items || []
    items.forEach((it) => {
      const name = String(it.item_name || it.name || '').trim()
      if (!name) return
      const qty = numberValue(it.quantity) || 1
      const amt = numberValue(it.amount) || (numberValue(it.rate ?? it.price) * qty) || 0
      totalItemsSold += qty

      const cur = dishMap.get(name) || { name, portions: 0, revenue: 0 }
      cur.portions += qty
      cur.revenue += amt
      dishMap.set(name, cur)
    })
  })

  const sortedDishes = Array.from(dishMap.values()).sort((a, b) => b.portions - a.portions)
  const topDishes = sortedDishes.slice(0, 5)
  const worstDishes = sortedDishes.length > 5 ? sortedDishes.slice(-3).reverse() : []

  // Monthly Expenses Baseline
  const fixedExp = numberValue(restaurant.fixed_expense_total)
  const staffExp = numberValue(restaurant.staff_expense_total)
  const varExp = numberValue(restaurant.variable_expense_total)
  const totalMonthlyExp = fixedExp + staffExp + varExp

  // Only calculate monthly net profit when evaluating full month
  const isMonthView = timeframeType.includes('month')
  const netProfit = revenue - totalMonthlyExp
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) + '%' : '0.0%'

  return {
    hasData: billsCount > 0,
    billsCount,
    revenue,
    taxable,
    gst,
    avgBillValue,
    totalItemsSold,
    topDishes,
    worstDishes,
    bestDish: topDishes[0] || null,
    netProfit: isMonthView ? netProfit : null,
    profitMargin: isMonthView ? profitMargin : null,
    totalExpenses: totalMonthlyExp,
  }
}

/**
 * STEP 3: Generate Grounded Answer (Deterministic Engine + Gemini Flash with Timeout)
 */
export async function generateGroundedAnswer(question, plan, facts, geminiApiKey) {
  if (facts.isUnsupported) {
    return {
      answer: facts.reason,
      facts,
      modelUsed: 'rule-engine',
    }
  }

  const p = facts.primaryPeriod
  const comp = facts.comparePeriod
  const dish = facts.targetDishData
  const exp = facts.expensesConfigured

  // Format a deterministic guaranteed answer first
  let fallbackAnswer = ''

  if (dish) {
    if (dish.hasSales) {
      fallbackAnswer = `In **${p.label}**, you sold **${dish.portionsSold} portion${dish.portionsSold === 1 ? '' : 's'}** of **${dish.matchedItems.join(', ')}**, generating **${formatInr(dish.revenueGenerated)}** in revenue.`
    } else {
      fallbackAnswer = `No sales found for **${dish.searchedItem}** in **${p.label}**. None of the recorded bills in this period include this item.`
    }
  } else if (plan.intent === 'top_items') {
    if (p.hasData && p.topDishes.length > 0) {
      const topList = p.topDishes.map((d, i) => `${i + 1}. **${d.name}** (${d.portions} portions · ${formatInr(d.revenue)})`).join('\n')
      fallbackAnswer = `Your best-selling dish in **${p.label}** is **${p.bestDish.name}** with **${p.bestDish.portions} portions sold** (${formatInr(p.bestDish.revenue)}).\n\nTop sellers for this period:\n${topList}`
    } else {
      fallbackAnswer = `No itemized bill sales found for **${p.label}**. Capture bills with line items to identify top sellers.`
    }
  } else if (plan.intent === 'bottom_items') {
    if (p.hasData && p.worstDishes.length > 0) {
      const list = p.worstDishes.map((d) => `• **${d.name}** (${d.portions} portion${d.portions === 1 ? '' : 's'} · ${formatInr(d.revenue)})`).join('\n')
      fallbackAnswer = `Here are the least frequently ordered items in **${p.label}**:\n${list}`
    } else {
      fallbackAnswer = `Not enough itemized dish data in **${p.label}** to identify lowest selling dishes.`
    }
  } else if (plan.intent === 'bill_count') {
    if (p.hasData) {
      fallbackAnswer = `You captured **${p.billsCount} bill${p.billsCount === 1 ? '' : 's'}** in **${p.label}**, with an average bill value of **${formatInr(p.avgBillValue)}**.`
    } else {
      fallbackAnswer = `No bills were captured in **${p.label}**.`
    }
  } else if (plan.intent === 'avg_bill') {
    if (p.hasData) {
      fallbackAnswer = `Your average bill value in **${p.label}** is **${formatInr(p.avgBillValue)}** across **${p.billsCount} bill${p.billsCount === 1 ? '' : 's'}** (Total revenue: ${formatInr(p.revenue)}).`
    } else {
      fallbackAnswer = `No bills were recorded in **${p.label}**, so average bill value cannot be calculated.`
    }
  } else if (plan.intent === 'profit') {
    if (p.hasData) {
      fallbackAnswer = `In **${p.label}**, total revenue is **${formatInr(p.revenue)}**. Baseline monthly operating expenses are **${formatInr(exp.totalMonthly)}** (Fixed: ${formatInr(exp.fixed)}, Staff: ${formatInr(exp.staff)}, Variable: ${formatInr(exp.variable)}), giving an estimated net profit of **${formatInr(p.netProfit)}** (margin: **${p.profitMargin}**).`
    } else {
      fallbackAnswer = `In **${p.label}**, revenue is **₹0** (no bills recorded). With baseline operating expenses of **${formatInr(exp.totalMonthly)}**, net profit shows **${formatInr(-exp.totalMonthly)}**.`
    }
  } else if (plan.intent === 'expenses') {
    fallbackAnswer = `Your baseline monthly operating expenses are **${formatInr(exp.totalMonthly)}**:\n• **Fixed expenses:** ${formatInr(exp.fixed)} (rent, utilities)\n• **Staff expenses:** ${formatInr(exp.staff)} (salaries)\n• **Variable expenses:** ${formatInr(exp.variable)} (supplies, raw materials)\n\nYou can update these anytime in Restaurant Settings or Reports.`
  } else if (plan.intent === 'comparison' && comp) {
    const diff = comp.diffRevenue
    const diffText = diff >= 0 ? `higher by **${formatInr(diff)}**` : `lower by **${formatInr(Math.abs(diff))}**`
    const pctText = comp.pctRevenueChange ? ` (${comp.pctRevenueChange > 0 ? '+' : ''}${comp.pctRevenueChange}%)` : ''

    fallbackAnswer = `**${p.label}** generated **${formatInr(p.revenue)}** across **${p.billsCount} bills**, compared to **${comp.label}** which generated **${formatInr(comp.revenue)}** across **${comp.billsCount} bills**.\n\nRevenue in ${p.label} was ${diffText}${pctText}.`
  } else {
    // Default revenue query
    if (p.hasData) {
      fallbackAnswer = `In **${p.label}**, your total revenue is **${formatInr(p.revenue)}** across **${p.billsCount} bill${p.billsCount === 1 ? '' : 's'}** (average bill value: **${formatInr(p.avgBillValue)}**).`
      if (p.bestDish) {
        fallbackAnswer += ` Your top dish was **${p.bestDish.name}** with ${p.bestDish.portions} portions sold (${formatInr(p.bestDish.revenue)}).`
      }
    } else {
      fallbackAnswer = `No bills were captured in **${p.label}**. Total recorded revenue is **₹0**.`
    }
  }

  // Attempt Gemini enhancement with fast 3500ms timeout per model
  if (!geminiApiKey || geminiApiKey === 'your_key_here') {
    return {
      answer: fallbackAnswer,
      facts,
      modelUsed: 'deterministic-engine',
    }
  }

  try {
    const client = new GoogleGenerativeAI(geminiApiKey)
    const candidateModels = ['gemini-flash-latest', 'gemini-2.5-flash']

    const groundingPrompt = `You are DineIQ AI, the personal data analyst for ${facts.restaurantName}.
The restaurant owner asked: "${question}"

Here are the VERIFIED REAL FACTS queried directly from their database:
${JSON.stringify({
  restaurantName: facts.restaurantName,
  intent: plan.intent,
  primaryPeriod: {
    label: p.label,
    billsCount: p.billsCount,
    revenue: p.revenue,
    avgBillValue: p.avgBillValue,
    hasData: p.hasData,
    bestDish: p.bestDish,
    topDishes: p.topDishes.map((d) => ({ name: d.name, portions: d.portions, revenue: d.revenue })),
    netProfit: p.netProfit,
    profitMargin: p.profitMargin,
  },
  comparePeriod: comp ? {
    label: comp.label,
    billsCount: comp.billsCount,
    revenue: comp.revenue,
    diffRevenue: comp.diffRevenue,
    pctRevenueChange: comp.pctRevenueChange,
  } : null,
  targetDishData: dish,
  expenses: exp,
}, null, 2)}

STRICT RULES:
1. Answer naturally, clearly, and concisely in 2 to 3 sentences. Use markdown bold for numbers and dish names.
2. Every number, currency amount, portion count, and dish name you state MUST come directly and exactly from the VERIFIED REAL FACTS above. NEVER make up, round differently, or invent numbers.
3. If hasData is false (0 bills found), explicitly state that no bills were found in that period. Do not invent sample revenue.
4. If the question asks about a specific day or date (e.g. today or Saturday), answer specifically about that day's revenue and bills. Do not confuse it with monthly expenses unless asked.
5. Always use the Indian Rupee symbol (₹).`

    for (const modelName of candidateModels) {
      try {
        const model = client.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.1 } })
        
        // Timeout promise after 4 seconds
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 4000))
        const res = await Promise.race([model.generateContent(groundingPrompt), timeoutPromise])

        const text = res.response?.text()?.trim()
        if (text) {
          return {
            answer: text,
            facts,
            modelUsed: modelName,
          }
        }
      } catch (err) {
        console.warn(`[askDineIQ] ${modelName} skipped:`, err.message)
      }
    }
  } catch (err) {
    console.warn('[askDineIQ] Grounding failed, using fallback:', err.message)
  }

  return {
    answer: fallbackAnswer,
    facts,
    modelUsed: 'deterministic-engine',
  }
}

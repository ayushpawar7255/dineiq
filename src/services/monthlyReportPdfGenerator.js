import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

function formatInr(val) {
  const num = Math.round(Number(val) || 0)
  return `₹${num.toLocaleString('en-IN')}`
}

function pluralize(count, singular, plural) {
  const n = Number(count) || 0
  return `${n.toLocaleString('en-IN')} ${n === 1 ? singular : plural}`
}

function renderSparklineSVG(points, color = '#ea580c', width = 52, height = 18) {
  if (!points || points.length === 0) {
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" style="display:block;">
        <line x1="2" y1="${height / 2}" x2="${width - 2}" y2="${height / 2}" stroke="#e4e4e7" stroke-width="1.5" stroke-dasharray="2 2" />
      </svg>
    `
  }
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min
  if (range === 0) {
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" style="display:block;">
        <line x1="2" y1="${height / 2}" x2="${width - 2}" y2="${height / 2}" stroke="${max > 0 ? color : '#e4e4e7'}" stroke-width="2" stroke-linecap="round" />
      </svg>
    `
  }
  const stepX = (width - 4) / Math.max(1, points.length - 1)
  const coords = points.map((p, i) => {
    const x = 2 + i * stepX
    const y = height - 3 - ((p - min) / range) * (height - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" style="display:block;">
      <polyline points="${coords.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `
}

function renderMarginGaugeSVG(percent, color = '#ea580c', size = 54) {
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const val = Math.min(100, Math.max(0, parseFloat(percent) || 0))
  const strokeDashoffset = circumference - (val / 100) * circumference

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg); display:block;">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#27272a" stroke-width="${strokeWidth}" fill="transparent" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="${color}" stroke-width="${strokeWidth}" fill="transparent"
        stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" />
    </svg>
  `
}

function renderExpenseDonutSVG(fixedPct, staffPct, varPct, profitPct, size = 96) {
  const strokeWidth = 16
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const f = Math.max(0, parseFloat(fixedPct) || 0)
  const s = Math.max(0, parseFloat(staffPct) || 0)
  const v = Math.max(0, parseFloat(varPct) || 0)
  const p = Math.max(0, parseFloat(profitPct) || 0)
  const total = f + s + v + p

  if (total === 0) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#f4f4f5" stroke-width="${strokeWidth}" fill="transparent" />
      </svg>
    `
  }

  const p1 = (f / total) * circumference
  const p2 = (s / total) * circumference
  const p3 = (v / total) * circumference
  const p4 = (p / total) * circumference

  const o1 = 0
  const o2 = -p1
  const o3 = -(p1 + p2)
  const o4 = -(p1 + p2 + p3)

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg); display:block;">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#27272a" stroke-width="${strokeWidth}" fill="transparent" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#fdba74" stroke-width="${strokeWidth}" fill="transparent"
        stroke-dasharray="${p1} ${circumference}" stroke-dashoffset="${o1}" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#f97316" stroke-width="${strokeWidth}" fill="transparent"
        stroke-dasharray="${p2} ${circumference}" stroke-dashoffset="${o2}" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#c2410c" stroke-width="${strokeWidth}" fill="transparent"
        stroke-dasharray="${p3} ${circumference}" stroke-dashoffset="${o3}" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#10b981" stroke-width="${strokeWidth}" fill="transparent"
        stroke-dasharray="${p4} ${circumference}" stroke-dashoffset="${o4}" />
    </svg>
  `
}

function receiptIconSVG() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
}

function targetIconSVG() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="2" r="2"></circle></svg>`
}

function calendarIconSVG(color = '#ea580c', size = 12) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
}

function clockIconSVG(color = '#ffffff', size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
}

export async function generateMonthlyPerformanceReportPDF(data = {}) {
  const restaurantName = data.restaurantName || 'Restaurant'
  const monthName = data.monthName || 'September 2026'
  const periodLabel = data.periodLabel || '1 – 30 SEPTEMBER 2026'
  const gstin = data.gstin || '27XXXXX0000X1ZX'

  const analytics = data.analytics || null

  // 100% Real Financial Figures
  const totalRevenue = Math.round(Number(data.monthlyRevenue) || 0)
  const billCount = Math.round(Number(data.monthlyBillCount) || 0)
  const avgBillValue = billCount > 0 ? Math.round(totalRevenue / billCount) : 0
  const itemsSold = analytics?.itemsSold != null ? analytics.itemsSold : 0
  const daysInMonth = (analytics?.dailyBreakdown && analytics.dailyBreakdown.length) || 30
  const avgDailyRevenue = daysInMonth > 0 ? Math.round(totalRevenue / daysInMonth) : 0

  // Real Operating Expenses from restaurant settings
  const fixedTotal = Math.round(Number(data.totals?.fixed_expenses) || 0)
  const staffTotal = Math.round(Number(data.totals?.staff_expenses) || 0)
  const varTotal = Math.round(Number(data.totals?.variable_expenses) || 0)
  const totalExpenses = fixedTotal + staffTotal + varTotal
  const netProfit = totalRevenue - totalExpenses
  const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

  const fixedPct = totalRevenue > 0 ? ((fixedTotal / totalRevenue) * 100).toFixed(1) : '0.0'
  const staffPct = totalRevenue > 0 ? ((staffTotal / totalRevenue) * 100).toFixed(1) : '0.0'
  const varPct = totalRevenue > 0 ? ((varTotal / totalRevenue) * 100).toFixed(1) : '0.0'

  // Real Itemized Expenses
  const fixedItems = Array.isArray(data.expenseValues?.fixed_expenses) ? data.expenseValues.fixed_expenses : []
  const staffItems = Array.isArray(data.expenseValues?.staff_expenses) ? data.expenseValues.staff_expenses : []
  const varItems = Array.isArray(data.expenseValues?.variable_expenses) ? data.expenseValues.variable_expenses : []

  // Real GST Summary
  const gstTaxable = Math.round(Number(data.gstSummary?.taxableAmount) || 0)
  const gstCgst = Math.round(Number(data.gstSummary?.cgst) * 100) / 100 || 0
  const gstSgst = Math.round(Number(data.gstSummary?.sgst) * 100) / 100 || 0
  const gstTotal = Math.round(Number(data.gstSummary?.totalGst) * 100) / 100 || (gstCgst + gstSgst)
  const gstBillsCount = Number(data.gstSummary?.billCount) || billCount

  // Real MoM Comparisons
  const mom = analytics?.mom || {
    hasData: false,
    prevMonthName: '',
    revenue: null,
    billCount: null,
    avgBillValue: null,
    itemsSold: null,
    dailyRevenue: null,
  }

  // Real Daily breakdown & Sparkline points
  const dailyBars = Array.isArray(analytics?.dailyBreakdown) ? analytics.dailyBreakdown : []
  const maxChartBarRevenue = dailyBars.length > 0 ? Math.max(...dailyBars.map((b) => b.revenue), 1) : 1
  const dailyBillCounts = dailyBars.map((b) => b.billsCount || 0)
  const dailyRevenues = dailyBars.map((b) => b.revenue || 0)
  const dailyAvgBillValues = dailyBars.map((b) => (b.billsCount > 0 ? Math.round(b.revenue / b.billsCount) : 0))

  // Real Best & Slowest Day
  const bestDay = analytics?.bestDay || null
  const slowestDay = analytics?.slowestDay || null

  // Real Weekday distribution
  const weekdayAvg = Array.isArray(analytics?.weekdayPattern)
    ? analytics.weekdayPattern
    : [
        { day: 'Mon', amount: 0 },
        { day: 'Tue', amount: 0 },
        { day: 'Wed', amount: 0 },
        { day: 'Thu', amount: 0 },
        { day: 'Fri', amount: 0 },
        { day: 'Sat', amount: 0 },
        { day: 'Sun', amount: 0 },
      ]
  const maxWeekdayAmount = Math.max(...weekdayAvg.map((w) => w.amount), 1)
  const hasWeekdayData = weekdayAvg.some((w) => w.amount > 0)

  // Real Peak Hour & Heatmap (100% Synchronized)
  const peakHour = analytics?.peakHour || '—'
  const peakHourBills = analytics?.peakHourBills || 0
  const hoursLabels = ['9A', '10A', '11A', '12P', '1P', '2P', '3P', '4P', '5P', '6P', '7P', '8P', '9P', '10P']
  const daysLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const defaultMatrix = Array.from({ length: 7 }, () => new Array(14).fill(1))
  const heatmapMatrix = analytics?.heatmap?.matrix || defaultMatrix
  const peakSlot = analytics?.heatmap?.peakSlot || null
  const operatingHoursStr = analytics?.operatingHours || '9:00 AM – 11:00 PM'

  // Real Menu Items
  const top10Dishes = Array.isArray(analytics?.top10Dishes) ? analytics.top10Dishes : []
  const spotlightDish = analytics?.spotlightDish || null
  const bestCombos = Array.isArray(analytics?.popularCombos)
    ? analytics.popularCombos.map((c, idx) => ({
        rank: idx + 1,
        itemA: c.itemA,
        itemB: c.itemB,
        orders: c.count,
      }))
    : []

  // Real Cost Ratios
  const rawMaterial = Number(varItems.find((e) => e.key === 'raw_material')?.value) || 0
  const foodCostPct = totalRevenue > 0 && rawMaterial > 0 ? ((rawMaterial / totalRevenue) * 100).toFixed(1) : null
  const staffCostPct = totalRevenue > 0 && staffTotal > 0 ? ((staffTotal / totalRevenue) * 100).toFixed(1) : null
  const profitPerBill = billCount > 0 ? Math.round(netProfit / billCount) : null

  // Real Monthly Insight
  const monthlyAiInsight = analytics?.monthlyAiInsight || (billCount > 0
    ? `Monthly performance tracked across ${pluralize(billCount, 'bill', 'bills')}.`
    : 'No bills recorded for this month yet. Capture bills or upload invoices to view performance insights.')

  const intensityColors = {
    1: '#ffedd5',
    2: '#fed7aa',
    3: '#fb923c',
    4: '#ea580c',
    5: '#9a3412',
  }

  // Create temporary container for offscreen rendering
  const container = document.createElement('div')
  container.id = 'dineiq-pdf-render-root'
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '794px'
  container.style.zIndex = '-9999'
  container.style.background = '#faf9f6'
  container.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  container.style.color = '#18181b'
  container.style.webkitFontSmoothing = 'antialiased'

  const pageStyle = `
    width: 794px;
    height: 1123px;
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
    background: #faf9f6;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0 0 16px 0;
  `

  function renderMomComparison(val) {
    if (!mom.hasData || val == null) {
      return `<span style="font-size: 8px; font-weight: 500; color: #a1a1aa;">— Not enough data yet</span>`
    }
    const num = parseFloat(val)
    const isUp = num >= 0
    const color = isUp ? '#16a34a' : '#dc2626'
    return `<span style="font-size: 9px; font-weight: 700; color: ${color}; display: flex; align-items: center; gap: 3px;">${isUp ? '▲' : '▼'} ${Math.abs(num)}% vs ${mom.prevMonthName}</span>`
  }

  // Build HTML for Page 1: PERFORMANCE SUMMARY
  const page1HTML = `
    <div class="report-page" style="${pageStyle}">
      <div>
        <!-- Dark Obsidian Branded Header -->
        <div style="background: #18181b; padding: 22px 28px 18px; color: #ffffff; position: relative;">
          <!-- Top brand row -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px; font-weight: 800; color: #f97316; letter-spacing: 0.5px;">DINEIQ</span>
              <span style="font-size: 8.5px; font-weight: 600; color: #a1a1aa; letter-spacing: 1.5px; text-transform: uppercase;">RESTAURANT INTELLIGENCE</span>
            </div>
          </div>

          <!-- Main title row -->
          <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #ea580c; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
              <div style="width: 26px; height: 26px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
              </div>
            </div>
            <div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.1;">${restaurantName}</h1>
              <div style="margin-top: 3px;">
                <span style="font-size: 12px; color: #a1a1aa; font-weight: 500;">Monthly Performance Report</span>
              </div>
              <div style="margin-top: 6px;">
                <span style="background: #ea580c; color: #ffffff; font-size: 9px; font-weight: 700; padding: 2.5px 10px; border-radius: 9999px; letter-spacing: 0.5px; text-transform: uppercase; display: inline-block;">${periodLabel}</span>
              </div>
            </div>
          </div>

          <!-- Executive KPIs Strip -->
          <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="display: block; font-size: 8.5px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px;">TOTAL REVENUE</span>
              <strong style="font-size: 24px; font-weight: 800; color: #ffffff; display: block; line-height: 1.1; letter-spacing: -0.3px;">${formatInr(totalRevenue)}</strong>
              <span style="font-size: 9.5px; color: #71717a; margin-top: 3px; display: block;">${pluralize(billCount, 'bill', 'bills')}</span>
            </div>
            <span style="font-size: 22px; color: #52525b; font-weight: 300;">−</span>
            <div>
              <span style="display: block; font-size: 8.5px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px;">TOTAL EXPENSES</span>
              <strong style="font-size: 24px; font-weight: 800; color: #ffffff; display: block; line-height: 1.1; letter-spacing: -0.3px;">${formatInr(totalExpenses)}</strong>
              <span style="font-size: 9.5px; color: #71717a; margin-top: 3px; display: block;">Fixed · Staff · Variable</span>
            </div>
            <span style="font-size: 22px; color: #52525b; font-weight: 300;">=</span>
            <div>
              <span style="display: block; font-size: 8.5px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px;">NET PROFIT</span>
              <strong style="font-size: 24px; font-weight: 800; color: ${netProfit >= 0 ? '#f97316' : '#ef4444'}; display: block; line-height: 1.1; letter-spacing: -0.3px;">${formatInr(netProfit)}</strong>
              <span style="font-size: 9.5px; color: #71717a; margin-top: 3px; display: block;">Revenue minus all expenses</span>
            </div>
            <!-- Margin gauge -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="position: relative; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center;">
                ${renderMarginGaugeSVG(marginPct, '#ea580c', 54)}
                <div style="position: absolute; text-align: center; line-height: 1;">
                  <strong style="font-size: 11.5px; font-weight: 800; color: #ffffff; display: block;">${marginPct}%</strong>
                  <span style="font-size: 6.5px; font-weight: 700; color: #a1a1aa; letter-spacing: 0.5px; text-transform: uppercase; display: block; margin-top: 1px;">MARGIN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Accent line -->
        <div style="height: 3px; background: #ea580c; width: 100%;"></div>

        <!-- 4 Stat Cards -->
        <div style="display: flex; gap: 10px; padding: 12px 28px 6px;">
          <!-- Card 1: Bills Captured -->
          <div style="flex: 1; background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="width: 18px; height: 18px; border-radius: 50%; background: #ffedd5; display: inline-flex; align-items: center; justify-content: center;">
                ${receiptIconSVG()}
              </span>
              <span style="font-size: 8px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">BILLS CAPTURED</span>
            </div>
            <strong style="font-size: 22px; font-weight: 800; color: #18181b; display: block; line-height: 1.15; margin: 3px 0 5px;">${billCount.toLocaleString('en-IN')}</strong>
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              ${renderMomComparison(mom.billCount)}
              ${renderSparklineSVG(dailyBillCounts, '#ea580c', 50, 16)}
            </div>
          </div>
          <!-- Card 2: Avg. Bill Value -->
          <div style="flex: 1; background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="width: 18px; height: 18px; border-radius: 50%; background: #ffedd5; color: #ea580c; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">₹</span>
              <span style="font-size: 8px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">AVG. BILL VALUE</span>
            </div>
            <strong style="font-size: 22px; font-weight: 800; color: #18181b; display: block; line-height: 1.15; margin: 3px 0 5px;">${formatInr(avgBillValue)}</strong>
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              ${renderMomComparison(mom.avgBillValue)}
              ${renderSparklineSVG(dailyAvgBillValues, '#ea580c', 50, 16)}
            </div>
          </div>
          <!-- Card 3: Items Sold -->
          <div style="flex: 1; background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="width: 18px; height: 18px; border-radius: 50%; background: #ffedd5; display: inline-flex; align-items: center; justify-content: center;">
                ${targetIconSVG()}
              </span>
              <span style="font-size: 8px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">ITEMS SOLD</span>
            </div>
            <strong style="font-size: 22px; font-weight: 800; color: #18181b; display: block; line-height: 1.15; margin: 3px 0 5px;">${itemsSold.toLocaleString('en-IN')}</strong>
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              ${renderMomComparison(mom.itemsSold)}
              ${renderSparklineSVG(dailyBillCounts, '#ea580c', 50, 16)}
            </div>
          </div>
          <!-- Card 4: Avg. Daily Revenue -->
          <div style="flex: 1; background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="width: 18px; height: 18px; border-radius: 50%; background: #ffedd5; display: inline-flex; align-items: center; justify-content: center;">
                ${calendarIconSVG('#ea580c', 11)}
              </span>
              <span style="font-size: 8px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">AVG. DAILY REVENUE</span>
            </div>
            <strong style="font-size: 22px; font-weight: 800; color: #18181b; display: block; line-height: 1.15; margin: 3px 0 5px;">${formatInr(avgDailyRevenue)}</strong>
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              ${renderMomComparison(mom.dailyRevenue)}
              ${renderSparklineSVG(dailyRevenues, '#ea580c', 50, 16)}
            </div>
          </div>
        </div>

        <!-- Section: Daily Revenue -->
        <div style="padding: 4px 28px 6px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 3.5px; height: 14px; background: #ea580c; border-radius: 2px;"></div>
              <strong style="font-size: 13.5px; font-weight: 800; color: #18181b;">Daily revenue</strong>
            </div>
            <span style="font-size: 9.5px; color: #71717a;">Each day of the month against your daily average</span>
          </div>

          <div style="background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 12px 18px 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <!-- Legend row -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 9px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <strong style="color: #18181b;">Revenue per day</strong>
                <span style="display: flex; align-items: center; gap: 5px; color: #71717a;">
                  <span style="width: 8px; height: 8px; border-radius: 2px; background: #ea580c; display: inline-block;"></span> Above average
                </span>
                <span style="display: flex; align-items: center; gap: 5px; color: #71717a;">
                  <span style="width: 8px; height: 8px; border-radius: 2px; background: #fed7aa; display: inline-block;"></span> Below average
                </span>
                <span style="display: flex; align-items: center; gap: 5px; color: #71717a;">
                  <span style="width: 8px; height: 8px; border-radius: 2px; background: #f4f4f5; border: 1px solid #e4e4e7; display: inline-block;"></span> Weekend
                </span>
              </div>
              <strong style="color: #ea580c; font-size: 9.5px; font-weight: 700;">Avg ${formatInr(avgDailyRevenue)} / day</strong>
            </div>

            <!-- Bar Chart Area with Best Day callout -->
            <div style="position: relative; height: 130px; margin-top: 22px; padding-left: 28px; border-bottom: 1px solid #e4e4e7;">
              <!-- Y-axis labels dynamically scaled -->
              <div style="position: absolute; left: 0; top: 0; font-size: 8px; color: #a1a1aa; line-height: 1;">
                ${maxChartBarRevenue >= 25000 ? '30k' : (maxChartBarRevenue >= 1000 ? Math.round(maxChartBarRevenue / 1000) + 'k' : maxChartBarRevenue)}
              </div>
              <div style="position: absolute; left: 0; top: 38px; font-size: 8px; color: #a1a1aa; line-height: 1;">
                ${maxChartBarRevenue >= 25000 ? '20k' : (maxChartBarRevenue >= 1000 ? Math.round((maxChartBarRevenue * 0.66) / 1000) + 'k' : Math.round(maxChartBarRevenue * 0.66))}
              </div>
              <div style="position: absolute; left: 0; top: 78px; font-size: 8px; color: #a1a1aa; line-height: 1;">
                ${maxChartBarRevenue >= 25000 ? '10k' : (maxChartBarRevenue >= 1000 ? Math.round((maxChartBarRevenue * 0.33) / 1000) + 'k' : Math.round(maxChartBarRevenue * 0.33))}
              </div>
              <div style="position: absolute; left: 0; bottom: 2px; font-size: 8px; color: #a1a1aa; line-height: 1;">0</div>

              <!-- Dashed Average Line -->
              ${totalRevenue > 0 ? `
                <div style="position: absolute; left: 28px; right: 0; bottom: ${Math.min(115, Math.max(10, Math.round((avgDailyRevenue / maxChartBarRevenue) * 120)))}px; height: 1px; border-bottom: 1px dashed #9ca3af; opacity: 0.7; z-index: 1;"></div>
              ` : ''}

              <!-- Best Day Callout Tooltip (Only if best day exists and has revenue) -->
              ${bestDay && bestDay.revenue > 0 && dailyBars.length > 0 ? `
                <div style="position: absolute; left: ${Math.min(660, Math.max(90, Math.round(((bestDay.day - 0.5) / dailyBars.length) * 680) + 28))}px; top: -20px; transform: translateX(-50%); background: #18181b; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 8.5px; font-weight: 700; white-space: nowrap; z-index: 5; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
                  ${formatInr(bestDay.revenue)} · Best day
                  <div style="position: absolute; left: 50%; bottom: -4px; transform: translateX(-50%); width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 4px solid #18181b;"></div>
                </div>
              ` : ''}

              <!-- Daily Bars -->
              <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 100%; padding-right: 2px;">
                ${dailyBars.length > 0 ? dailyBars.map((b) => {
                  const barHeight = b.revenue > 0 ? Math.max(8, Math.round((b.revenue / maxChartBarRevenue) * 120)) : 2
                  const barColor = b.isAbove ? '#ea580c' : (b.revenue > 0 ? '#fed7aa' : '#e4e4e7')
                  const bgShade = b.isWeekend ? 'background: rgba(244, 244, 245, 0.4);' : ''
                  return `
                    <div style="width: 14px; height: 100%; display: flex; align-items: flex-end; ${bgShade}">
                      <div style="width: 100%; height: ${barHeight}px; background: ${barColor}; border-top-left-radius: 2px; border-top-right-radius: 2px;" title="Day ${b.day}: ₹${b.revenue}"></div>
                    </div>
                  `
                }).join('') : `
                  <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #a1a1aa;">
                    Not enough data yet — no daily sales recorded for this month
                  </div>
                `}
              </div>
            </div>

            <!-- X-axis scale labels -->
            <div style="display: flex; justify-content: space-between; padding-left: 28px; padding-right: 4px; margin-top: 4px; font-size: 8px; color: #a1a1aa;">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
              <span>${dailyBars.length || 30}</span>
            </div>
          </div>
        </div>

        <!-- Section: Weekday pattern -->
        <div style="padding: 4px 28px 6px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 3.5px; height: 14px; background: #ea580c; border-radius: 2px;"></div>
              <strong style="font-size: 13.5px; font-weight: 800; color: #18181b;">Weekday pattern</strong>
            </div>
            <span style="font-size: 9.5px; color: #71717a;">Which days bring in the money</span>
          </div>

          <div style="background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 12px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; gap: 24px;">
            <!-- Left Column: Horizontal Bar Chart -->
            <div style="flex: 1.25;">
              <span style="font-size: 9.5px; font-weight: 700; color: #27272a; display: block; margin-bottom: 8px;">Average revenue by weekday</span>
              ${hasWeekdayData ? `
                <div style="display: flex; flex-direction: column; gap: 6.5px;">
                  ${weekdayAvg.map((w) => {
                    const pct = w.amount > 0 ? Math.max(4, Math.round((w.amount / maxWeekdayAmount) * 100)) : 0
                    const isTop = w.amount > 0 && w.amount === maxWeekdayAmount
                    const barColor = isTop ? '#ea580c' : '#f97316'
                    return `
                      <div style="display: flex; align-items: center; gap: 8px; font-size: 9px;">
                        <span style="width: 24px; color: #71717a; font-weight: 600;">${w.day}</span>
                        <div style="flex: 1; height: 8px; background: #f4f4f5; border-radius: 4px; overflow: hidden;">
                          <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 4px;"></div>
                        </div>
                        <strong style="width: 52px; text-align: right; color: #18181b; font-weight: 700;">${formatInr(w.amount)}</strong>
                      </div>
                    `
                  }).join('')}
                </div>
              ` : `
                <div style="padding: 24px 10px; text-align: center; color: #a1a1aa; font-size: 9px; line-height: 1.4;">
                  Not enough data yet — record bills across different days of the week to reveal weekday sales trends.
                </div>
              `}
            </div>

            <!-- Right Column: 3 KPI Highlight Cards -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: center;">
              <!-- Best Day -->
              <div style="background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 28px; height: 28px; border-radius: 50%; background: #16a34a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 13px;">★</div>
                  <div>
                    <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; display: block;">BEST DAY</span>
                    <strong style="font-size: 11.5px; font-weight: 700; color: #18181b;">${bestDay?.label || '—'}</strong>
                  </div>
                </div>
                <strong style="font-size: 13.5px; font-weight: 800; color: #16a34a;">${formatInr(bestDay?.revenue || 0)}</strong>
              </div>

              <!-- Slowest Day -->
              <div style="background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 28px; height: 28px; border-radius: 50%; background: #dc2626; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px;">▼</div>
                  <div>
                    <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; display: block;">SLOWEST DAY</span>
                    <strong style="font-size: 11.5px; font-weight: 700; color: #18181b;">${slowestDay?.label || '—'}</strong>
                  </div>
                </div>
                <strong style="font-size: 13.5px; font-weight: 800; color: #dc2626;">${formatInr(slowestDay?.revenue || 0)}</strong>
              </div>

              <!-- Peak Hour -->
              <div style="background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 28px; height: 28px; border-radius: 50%; background: #ea580c; color: #ffffff; display: flex; align-items: center; justify-content: center;">
                    ${clockIconSVG('#ffffff', 13)}
                  </div>
                  <div>
                    <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; display: block;">PEAK HOUR</span>
                    <strong style="font-size: 11.5px; font-weight: 700; color: #18181b;">${peakHour}</strong>
                  </div>
                </div>
                <strong style="font-size: 13px; font-weight: 800; color: #ea580c;">${pluralize(peakHourBills, 'bill', 'bills')}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Insight Banner -->
        <div style="margin: 6px 28px 0; background: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 9px 14px; display: flex; align-items: center; gap: 10px;">
          <div style="width: 20px; height: 20px; border-radius: 50%; background: #ea580c; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0;">✦</div>
          <p style="margin: 0; font-size: 9px; color: #78350f; font-weight: 500; line-height: 1.4;">
            ${monthlyAiInsight}
          </p>
        </div>
      </div>

      <!-- Page 1 Footer -->
      <div style="padding: 10px 28px 0; border-top: 1px solid #ebe9e1; display: flex; justify-content: space-between; font-size: 8.5px; color: #a1a1aa;">
        <span><strong style="color: #ea580c;">DineIQ</strong> · Automated monthly report · Verified live data</span>
        <span>1 / 3</span>
      </div>
    </div>
  `

  // Build HTML for Page 2: MENU INTELLIGENCE
  const page2HTML = `
    <div class="report-page" style="${pageStyle}">
      <div>
        <!-- Dark Obsidian Branded Header -->
        <div style="background: #18181b; padding: 22px 28px 18px; color: #ffffff; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 8.5px; font-weight: 700; color: #ea580c; letter-spacing: 1.2px; text-transform: uppercase;">DINEIQ · MONTHLY REPORT</span>
              <h1 style="margin: 4px 0 2px; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Menu intelligence</h1>
              <span style="font-size: 12px; color: #a1a1aa; font-weight: 500;">${restaurantName} · ${monthName}</span>
            </div>
            <div style="font-size: 54px; font-weight: 900; color: #27272a; line-height: 1; user-select: none;">02</div>
          </div>
        </div>
        <div style="height: 3px; background: #ea580c; width: 100%;"></div>

        <!-- Top Selling Dish Highlight Card -->
        ${spotlightDish && spotlightDish.name ? `
          <div style="margin: 12px 28px 10px; background: linear-gradient(135deg, #f97316 0%, #ea580c 55%, #c2410c 100%); border-radius: 10px; padding: 18px 22px; color: #ffffff; position: relative; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.22); overflow: hidden;">
            <div style="position: absolute; right: 120px; top: 50%; transform: translateY(-50%); font-size: 90px; font-weight: 900; color: rgba(255, 255, 255, 0.08); line-height: 1; user-select: none; pointer-events: none;">01</div>

            <div style="background: #ffffff; color: #ea580c; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; padding: 3px 10px; border-radius: 9999px; display: inline-block; margin-bottom: 8px;">
              ★ TOP SELLING DISH OF THE MONTH
            </div>
            <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.4px;">${spotlightDish.name}</h2>
            <div style="display: flex; gap: 34px;">
              <div>
                <strong style="font-size: 21px; font-weight: 800; display: block; line-height: 1;">${spotlightDish.portions}</strong>
                <span style="font-size: 9px; color: rgba(255,255,255,0.85); font-weight: 500;">${pluralize(spotlightDish.portions, 'portion', 'portions')} sold</span>
              </div>
              <div>
                <strong style="font-size: 21px; font-weight: 800; display: block; line-height: 1;">${formatInr(spotlightDish.revenue)}</strong>
                <span style="font-size: 9px; color: rgba(255,255,255,0.85); font-weight: 500;">revenue earned</span>
              </div>
              <div>
                <strong style="font-size: 21px; font-weight: 800; display: block; line-height: 1;">${spotlightDish.soldPerDay}</strong>
                <span style="font-size: 9px; color: rgba(255,255,255,0.85); font-weight: 500;">sold per day</span>
              </div>
            </div>
            <div style="position: absolute; right: 24px; top: 50%; transform: translateY(-50%); width: 74px; height: 74px; border-radius: 50%; background: #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.12); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
              <strong style="font-size: 18px; font-weight: 900; color: #ea580c; line-height: 1;">${spotlightDish.share}</strong>
              <span style="font-size: 6.5px; font-weight: 800; color: #52525b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">OF ALL ITEMS</span>
            </div>
          </div>
        ` : `
          <div style="margin: 12px 28px 10px; background: #ffffff; border: 1px solid #ebe9e1; border-radius: 10px; padding: 22px 24px; text-align: center; color: #71717a;">
            <div style="display: inline-block; background: #ffedd5; color: #ea580c; font-size: 8px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; margin-bottom: 6px;">★ MENU INTELLIGENCE</div>
            <h3 style="margin: 4px 0 2px; font-size: 16px; font-weight: 700; color: #18181b;">Not enough dish data yet</h3>
            <p style="font-size: 9.5px; color: #a1a1aa; margin: 0;">Upload customer bills with line items to identify top-selling dishes and revenue leaders.</p>
          </div>
        `}

        <!-- Section: Top 10 selling items -->
        <div style="padding: 2px 28px 6px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 3.5px; height: 14px; background: #ea580c; border-radius: 2px;"></div>
              <strong style="font-size: 13.5px; font-weight: 800; color: #18181b;">Top 10 selling items</strong>
            </div>
            <span style="font-size: 9.5px; color: #71717a;">Ranked by portions sold this month</span>
          </div>

          <div style="background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 10px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            ${top10Dishes.length > 0 ? `
              <div style="display: flex; align-items: center; padding-bottom: 5px; border-bottom: 1px solid #f4f4f5; font-size: 7.5px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                <span style="width: 24px;">#</span>
                <span style="flex: 1.5;">DISH</span>
                <span style="width: 140px;">PORTIONS SOLD</span>
                <span style="width: 85px; text-align: right;">REVENUE</span>
                <span style="width: 55px; text-align: right;">SHARE</span>
                <span style="width: 85px; text-align: right;">VS LAST MONTH</span>
              </div>

              <div style="display: flex; flex-direction: column;">
                ${top10Dishes.map((item, idx) => {
                  const maxPortions = top10Dishes[0]?.portions || 1
                  const barWidth = Math.max(4, Math.round((item.portions / maxPortions) * 85))
                  const rankNum = item.rank || (idx + 1)
                  const isTop3 = rankNum <= 3
                  const rankBadgeBg = isTop3 ? '#ea580c' : '#f4f4f5'
                  const rankBadgeColor = isTop3 ? '#ffffff' : '#71717a'

                  let momDisplay = `<span style="color: #a1a1aa; font-weight: 500;">—</span>`
                  if (mom.hasData && item.momChange) {
                    const isUp = item.isUp !== false
                    const color = isUp ? '#16a34a' : '#dc2626'
                    momDisplay = `<span style="color: ${color}; font-weight: 700;">${isUp ? '▲' : '▼'} ${item.momChange.replace(/^[+-]/, '')}</span>`
                  }

                  return `
                    <div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #fafafa; font-size: 9px;">
                      <div style="width: 24px;">
                        <span style="width: 16px; height: 16px; border-radius: 50%; background: ${rankBadgeBg}; color: ${rankBadgeColor}; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700;">${rankNum}</span>
                      </div>
                      <div style="flex: 1.5;">
                        <strong style="color: #18181b; font-weight: 700; display: block; line-height: 1.15;">${item.name}</strong>
                        <span style="font-size: 8px; color: #a1a1aa;">${item.category || 'Specialties'}</span>
                      </div>
                      <div style="width: 140px; display: flex; align-items: center; gap: 8px;">
                        <div style="width: 85px; height: 5.5px; background: #f4f4f5; border-radius: 3px; overflow: hidden;">
                          <div style="width: ${barWidth}px; height: 100%; background: #ea580c; border-radius: 3px;"></div>
                        </div>
                        <strong style="color: #18181b; font-weight: 700; font-size: 9px;">${item.portions}</strong>
                      </div>
                      <span style="width: 85px; text-align: right; font-weight: 700; color: #18181b;">${formatInr(item.revenue)}</span>
                      <span style="width: 55px; text-align: right; color: #71717a; font-weight: 600;">${item.share}</span>
                      <span style="width: 85px; text-align: right;">${momDisplay}</span>
                    </div>
                  `
                }).join('')}
              </div>
            ` : `
              <div style="padding: 24px; text-align: center; color: #a1a1aa; font-size: 9.5px;">
                Not enough data yet — no menu item sales recorded for this month.
              </div>
            `}
          </div>
        </div>

        <!-- Section: Best combos -->
        <div style="padding: 4px 28px 6px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 3.5px; height: 14px; background: #ea580c; border-radius: 2px;"></div>
              <strong style="font-size: 13.5px; font-weight: 800; color: #18181b;">Best combos</strong>
            </div>
            <span style="font-size: 9.5px; color: #71717a;">Items most often ordered together in the same bill</span>
          </div>

          <div style="background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;">
            ${bestCombos.length > 0 ? bestCombos.map((combo) => {
              const maxCombo = bestCombos[0]?.orders || 1
              const barWidth = Math.max(4, Math.round((combo.orders / maxCombo) * 80))
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="width: 16px; height: 16px; border-radius: 50%; background: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700;">${combo.rank}</span>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <span style="background: #fafaf9; border: 1px solid #e4e4e7; border-radius: 4px; padding: 2.5px 7px; font-weight: 600; color: #27272a; font-size: 8.5px;">${combo.itemA}</span>
                      <span style="color: #a1a1aa; font-weight: 700; margin: 0 2px;">+</span>
                      <span style="background: #fafaf9; border: 1px solid #e4e4e7; border-radius: 4px; padding: 2.5px 7px; font-weight: 600; color: #27272a; font-size: 8.5px;">${combo.itemB}</span>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 80px; height: 5px; background: #f4f4f5; border-radius: 3px; overflow: hidden;">
                      <div style="width: ${barWidth}px; height: 100%; background: #ea580c; border-radius: 3px;"></div>
                    </div>
                    <strong style="color: #18181b; font-weight: 700; min-width: 60px; text-align: right;">${pluralize(combo.orders, 'order', 'orders')}</strong>
                  </div>
                </div>
              `
            }).join('') : `
              <div style="padding: 20px; text-align: center; color: #a1a1aa; font-size: 9.5px;">
                Not enough data yet — combo pairings appear as customers order multiple items together on bills.
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Page 2 Footer -->
      <div style="padding: 10px 28px 0; border-top: 1px solid #ebe9e1; display: flex; justify-content: space-between; font-size: 8.5px; color: #a1a1aa;">
        <span><strong style="color: #ea580c;">DineIQ</strong> · Automated monthly report · Verified live data</span>
        <span>2 / 3</span>
      </div>
    </div>
  `

  // Build HTML for Page 3: OPERATIONS, EXPENSES & TAX
  const page3HTML = `
    <div class="report-page" style="${pageStyle}">
      <div>
        <!-- Dark Obsidian Branded Header -->
        <div style="background: #18181b; padding: 22px 28px 18px; color: #ffffff; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 8.5px; font-weight: 700; color: #ea580c; letter-spacing: 1.2px; text-transform: uppercase;">DINEIQ · MONTHLY REPORT</span>
              <h1 style="margin: 4px 0 2px; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Operations, expenses & tax</h1>
              <span style="font-size: 12px; color: #a1a1aa; font-weight: 500;">${restaurantName} · ${monthName}</span>
            </div>
            <div style="font-size: 54px; font-weight: 900; color: #27272a; line-height: 1; user-select: none;">03</div>
          </div>
        </div>
        <div style="height: 3px; background: #ea580c; width: 100%;"></div>

        <!-- Section: Operating hours heatmap -->
        <div style="padding: 10px 28px 4px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 3.5px; height: 14px; background: #ea580c; border-radius: 2px;"></div>
              <strong style="font-size: 13.5px; font-weight: 800; color: #18181b;">Operating hours</strong>
            </div>
            <span style="font-size: 9.5px; color: #71717a;">When customers walk in, by weekday and hour</span>
          </div>

          <div style="background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; margin-bottom: 5px; padding-left: 28px;">
              ${hoursLabels.map((h) => `<span style="flex: 1; text-align: center; font-size: 7.5px; font-weight: 700; color: #71717a;">${h}</span>`).join('')}
            </div>

            <div style="display: flex; flex-direction: column; gap: 3.5px;">
              ${heatmapMatrix.map((row, rIdx) => {
                const dayLabel = daysLabels[rIdx]
                return `
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="width: 24px; font-size: 8px; font-weight: 600; color: #71717a;">${dayLabel}</span>
                    <div style="flex: 1; display: flex; gap: 3.5px;">
                      ${row.map((lvl, cIdx) => {
                        const isBusiest = (peakSlot && rIdx === peakSlot.day && cIdx === peakSlot.hour)
                        const tileBg = intensityColors[lvl] || intensityColors[1]
                        const outlineStyle = isBusiest ? 'border: 2px solid #18181b;' : 'border: 1px solid rgba(0,0,0,0.04);'
                        return `<div style="flex: 1; height: 13px; background: ${tileBg}; border-radius: 2px; ${outlineStyle}"></div>`
                      }).join('')}
                    </div>
                  </div>
                `
              }).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 7.5px; color: #71717a;">
              <span>${peakSlot ? 'Outlined cell = busiest slot of the month' : 'No peak activity recorded yet'}</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span>Quiet</span>
                <div style="width: 70px; height: 5px; border-radius: 3px; background: linear-gradient(90deg, #ffedd5 0%, #fb923c 50%, #9a3412 100%);"></div>
                <span>Busy</span>
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f4f4f5;">
              <div style="flex: 1; background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 7px 10px; display: flex; align-items: center; gap: 8px;">
                <span style="width: 24px; height: 24px; border-radius: 50%; background: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center;">
                  ${clockIconSVG('#ea580c', 12)}
                </span>
                <div>
                  <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">PEAK HOUR</span>
                  <strong style="font-size: 11px; font-weight: 800; color: #18181b; display: block; line-height: 1.1;">${peakHour}</strong>
                  <span style="font-size: 7px; color: #a1a1aa;">${pluralize(peakHourBills, 'bill', 'bills')} recorded</span>
                </div>
              </div>

              <div style="flex: 1; background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 7px 10px; display: flex; align-items: center; gap: 8px;">
                <span style="width: 24px; height: 24px; border-radius: 50%; background: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center;">
                  ${calendarIconSVG('#ea580c', 12)}
                </span>
                <div>
                  <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">BUSIEST WEEKDAY</span>
                  <strong style="font-size: 11px; font-weight: 800; color: #18181b; display: block; line-height: 1.1;">${analytics?.busiestWeekday || '—'}</strong>
                  <span style="font-size: 7px; color: #a1a1aa;">${analytics?.busiestWeekdayAvg ? `Averages ${formatInr(analytics.busiestWeekdayAvg)} per day` : 'Not enough data yet'}</span>
                </div>
              </div>

              <div style="flex: 1; background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 7px 10px; display: flex; align-items: center; gap: 8px;">
                <span style="width: 24px; height: 24px; border-radius: 50%; background: #ffedd5; color: #ea580c; display: flex; align-items: center; justify-content: center;">
                  ${clockIconSVG('#ea580c', 12)}
                </span>
                <div>
                  <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">OPERATING HOURS</span>
                  <strong style="font-size: 11px; font-weight: 800; color: #18181b; display: block; line-height: 1.1;">${operatingHoursStr}</strong>
                  <span style="font-size: 7px; color: #a1a1aa;">Set in Restaurant Settings</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Expenses & net profit -->
        <div style="padding: 2px 28px 4px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 3.5px; height: 14px; background: #ea580c; border-radius: 2px;"></div>
              <strong style="font-size: 13.5px; font-weight: 800; color: #18181b;">Expenses & net profit</strong>
            </div>
            <span style="font-size: 9.5px; color: #71717a;">Where every ₹100 of revenue went</span>
          </div>

          <div style="background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between;">
            <div style="position: relative; width: 92px; height: 92px; display: flex; align-items: center; justify-content: center;">
              ${renderExpenseDonutSVG(fixedPct, staffPct, varPct, marginPct, 92)}
              <div style="position: absolute; text-align: center; line-height: 1;">
                <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">REVENUE</span>
                <strong style="font-size: 12px; font-weight: 800; color: #18181b; display: block; margin-top: 2px;">${totalRevenue > 0 ? '100%' : '₹0'}</strong>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 5px; min-width: 250px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 7px; height: 7px; border-radius: 2px; background: #fdba74;"></span>
                  <div>
                    <span style="color: #27272a; font-weight: 700; display: block;">Fixed expenses</span>
                    <span style="color: #a1a1aa; font-size: 7.5px;">${fixedPct}% of revenue</span>
                  </div>
                </div>
                <strong style="color: #18181b; font-weight: 700; font-size: 9.5px;">${formatInr(fixedTotal)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 7px; height: 7px; border-radius: 2px; background: #f97316;"></span>
                  <div>
                    <span style="color: #27272a; font-weight: 700; display: block;">Staff expenses</span>
                    <span style="color: #a1a1aa; font-size: 7.5px;">${staffPct}% of revenue</span>
                  </div>
                </div>
                <strong style="color: #18181b; font-weight: 700; font-size: 9.5px;">${formatInr(staffTotal)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 7px; height: 7px; border-radius: 2px; background: #c2410c;"></span>
                  <div>
                    <span style="color: #27272a; font-weight: 700; display: block;">Variable expenses</span>
                    <span style="color: #a1a1aa; font-size: 7.5px;">${varPct}% of revenue</span>
                  </div>
                </div>
                <strong style="color: #18181b; font-weight: 700; font-size: 9.5px;">${formatInr(varTotal)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; padding-top: 3px; border-top: 1px dashed #e4e4e7;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 7px; height: 7px; border-radius: 2px; background: #10b981;"></span>
                  <div>
                    <strong style="color: ${netProfit >= 0 ? '#10b981' : '#ef4444'}; font-weight: 700; display: block;">Net profit</strong>
                    <span style="color: #71717a; font-size: 7.5px;">${marginPct}% of revenue</span>
                  </div>
                </div>
                <strong style="color: ${netProfit >= 0 ? '#10b981' : '#ef4444'}; font-weight: 800; font-size: 10px;">${formatInr(netProfit)}</strong>
              </div>
            </div>

            <div style="border-left: 1px solid #f4f4f5; padding-left: 16px; display: flex; flex-direction: column; gap: 6px;">
              <div>
                <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">FOOD COST</span>
                <strong style="font-size: 13.5px; font-weight: 800; color: #18181b; display: block; line-height: 1.1;">${foodCostPct != null ? foodCostPct + '%' : '—'}</strong>
                <span style="font-size: 7px; color: #a1a1aa;">raw material / revenue</span>
              </div>
              <div>
                <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">STAFF COST</span>
                <strong style="font-size: 13.5px; font-weight: 800; color: #18181b; display: block; line-height: 1.1;">${staffCostPct != null ? staffCostPct + '%' : '—'}</strong>
                <span style="font-size: 7px; color: #a1a1aa;">staff expenses / revenue</span>
              </div>
              <div>
                <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">PROFIT PER BILL</span>
                <strong style="font-size: 13.5px; font-weight: 800; color: #18181b; display: block; line-height: 1.1;">${profitPerBill != null ? formatInr(profitPerBill) : '—'}</strong>
                <span style="font-size: 7px; color: #a1a1aa;">net profit / bills</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3 Expense Category Itemized Cards -->
        <div style="padding: 4px 28px 4px; display: flex; gap: 10px;">
          <!-- Fixed expenses -->
          <div style="flex: 1; background: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="background: #ffedd5; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #fed7aa;">
              <strong style="font-size: 9.5px; color: #9a3412;">Fixed expenses</strong>
              <strong style="font-size: 10px; color: #9a3412;">${formatInr(fixedTotal)}</strong>
            </div>
            <div style="padding: 6px 12px; display: flex; flex-direction: column; gap: 3.5px; font-size: 8px;">
              ${fixedItems.length > 0 ? fixedItems.slice(0, 6).map((it) => `
                <div style="display: flex; justify-content: space-between; color: #52525b;">
                  <span>${it.label}</span>
                  <strong style="color: #18181b;">${formatInr(it.value)}</strong>
                </div>
              `).join('') : `
                <div style="color: #a1a1aa; font-size: 7.5px;">No fixed expenses configured</div>
              `}
            </div>
          </div>

          <!-- Staff expenses -->
          <div style="flex: 1; background: #ffffff; border: 1px solid #fdba74; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="background: #ea580c; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; color: #ffffff;">
              <strong style="font-size: 9.5px; color: #ffffff;">Staff expenses</strong>
              <strong style="font-size: 10px; color: #ffffff;">${formatInr(staffTotal)}</strong>
            </div>
            <div style="padding: 6px 12px; display: flex; flex-direction: column; gap: 3.5px; font-size: 8px;">
              ${staffItems.length > 0 ? staffItems.slice(0, 6).map((it) => `
                <div style="display: flex; justify-content: space-between; color: #52525b;">
                  <span>${it.label}</span>
                  <strong style="color: #18181b;">${formatInr(it.value)}</strong>
                </div>
              `).join('') : `
                <div style="color: #a1a1aa; font-size: 7.5px;">No staff expenses configured</div>
              `}
            </div>
          </div>

          <!-- Variable expenses -->
          <div style="flex: 1; background: #ffffff; border: 1px solid #fb923c; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="background: #9a3412; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; color: #ffffff;">
              <strong style="font-size: 9.5px; color: #ffffff;">Variable expenses</strong>
              <strong style="font-size: 10px; color: #ffffff;">${formatInr(varTotal)}</strong>
            </div>
            <div style="padding: 6px 12px; display: flex; flex-direction: column; gap: 3.5px; font-size: 8px;">
              ${varItems.length > 0 ? varItems.slice(0, 4).map((it) => `
                <div style="display: flex; justify-content: space-between; color: #52525b;">
                  <span>${it.label}</span>
                  <strong style="color: #18181b;">${formatInr(it.value)}</strong>
                </div>
              `).join('') : `
                <div style="color: #a1a1aa; font-size: 7.5px;">No variable expenses configured</div>
              `}
              <div style="color: #a1a1aa; font-style: italic; font-size: 7px; margin-top: 1px;">Configured in Restaurant Settings</div>
            </div>
          </div>
        </div>

        <!-- Section: GST summary -->
        <div style="padding: 4px 28px 0;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 3.5px; height: 14px; background: #ea580c; border-radius: 2px;"></div>
              <strong style="font-size: 13.5px; font-weight: 800; color: #18181b;">GST summary</strong>
            </div>
            <span style="font-size: 9.5px; color: #71717a;">Tax-ready view for your accountant</span>
          </div>

          <div style="background: #ffffff; border: 1px solid #ebe9e1; border-radius: 8px; padding: 10px 14px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; gap: 8px; margin-bottom: 6px;">
              <!-- Box 1 -->
              <div style="flex: 1; background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 7px 10px;">
                <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">TAXABLE AMOUNT</span>
                <strong style="font-size: 13.5px; font-weight: 800; color: #18181b; display: block; line-height: 1.1; margin-top: 2px;">${formatInr(gstTaxable)}</strong>
              </div>
              <!-- Box 2 -->
              <div style="flex: 1; background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 7px 10px;">
                <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">CGST · 2.5%</span>
                <strong style="font-size: 13.5px; font-weight: 800; color: #18181b; display: block; line-height: 1.1; margin-top: 2px;">${formatInr(gstCgst)}</strong>
              </div>
              <!-- Box 3 -->
              <div style="flex: 1; background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 7px 10px;">
                <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">SGST · 2.5%</span>
                <strong style="font-size: 13.5px; font-weight: 800; color: #18181b; display: block; line-height: 1.1; margin-top: 2px;">${formatInr(gstSgst)}</strong>
              </div>
              <!-- Box 4 (Highlighted in orange) -->
              <div style="flex: 1.2; background: #ea580c; border-radius: 6px; padding: 7px 10px; color: #ffffff;">
                <span style="font-size: 7px; font-weight: 700; color: rgba(255,255,255,0.85); text-transform: uppercase;">TOTAL GST COLLECTED</span>
                <strong style="font-size: 14.5px; font-weight: 900; color: #ffffff; display: block; line-height: 1.1; margin-top: 2px;">${formatInr(gstTotal)}</strong>
              </div>
              <!-- Box 5 -->
              <div style="flex: 1; background: #fafaf9; border: 1px solid #f0efe9; border-radius: 6px; padding: 7px 10px;">
                <span style="font-size: 7px; font-weight: 700; color: #71717a; text-transform: uppercase;">BILLS INCLUDED</span>
                <strong style="font-size: 13.5px; font-weight: 800; color: #18181b; display: block; line-height: 1.1; margin-top: 2px;">${pluralize(gstBillsCount, 'bill', 'bills')}</strong>
              </div>
            </div>
            <div style="font-size: 7.5px; color: #71717a; padding-top: 4px; border-top: 1px solid #f4f4f5;">
              GST at 5% (2.5% CGST + 2.5% SGST) · GSTIN: <strong>${gstin || 'Unregistered'}</strong> · Bill-wise GST register available in Reports.
            </div>
          </div>
        </div>
      </div>

      <!-- Page 3 Footer -->
      <div style="padding: 10px 28px 0; border-top: 1px solid #ebe9e1; display: flex; justify-content: space-between; font-size: 8.5px; color: #a1a1aa;">
        <span><strong style="color: #ea580c;">DineIQ</strong> · Automated monthly report · Verified live data</span>
        <span>3 / 3</span>
      </div>
    </div>
  `

  container.innerHTML = page1HTML + page2HTML + page3HTML
  document.body.appendChild(container)

  try {
    const pageNodes = container.querySelectorAll('.report-page')
    if (pageNodes.length !== 3) {
      throw new Error(`Expected 3 report pages, found ${pageNodes.length}`)
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    for (let i = 0; i < pageNodes.length; i++) {
      const pageEl = pageNodes[i]
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#faf9f6',
      })

      const imgData = canvas.toDataURL('image/png')
      if (i > 0) {
        pdf.addPage()
      }
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
    }

    const safeRest = (restaurantName || 'Restaurant').replace(/[^a-zA-Z0-9]/g, '_')
    const safeMonth = (monthName || 'September_2026').replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `DineIQ_Monthly_Performance_Report_${safeRest}_${safeMonth}.pdf`

    pdf.save(fileName)
    return { success: true, fileName }
  } finally {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }
}

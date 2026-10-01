export function getCurrentPeriod() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 6)
  const startDay = String(start.getDate()).padStart(2, '0')
  const endDay = String(now.getDate()).padStart(2, '0')
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = now.toLocaleDateString('en-US', { month: 'short' })
  const year = now.getFullYear()
  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${now.toLocaleDateString('en-US', { month: 'long' })} ${year}`
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`
}

export function getFormattedToday() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })
  const day = String(now.getDate()).padStart(2, '0')
  const month = now.toLocaleDateString('en-US', { month: 'short' })
  return `${weekday}, ${day} ${month}`
}

export function getTodayWeekday() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' })
}

export function getTimeOfDayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getInitials(name, fallback = 'SL') {
  if (!name || typeof name !== 'string') return fallback
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const restaurant = {
  name: '',
  location: '',
  period: getCurrentPeriod(),
}

export const kpis = [
  { label: 'Total revenue', value: '₹0', change: '-', note: 'from saved bills', tone: 'orange' },
  { label: 'Bills captured', value: '0', change: '-', note: 'saved bills', tone: 'orange' },
  { label: 'Avg. bill value', value: '₹0', change: '-', note: 'per bill', tone: 'green' },
  { label: 'Items sold', value: '0', change: '-', note: 'items recorded', tone: 'orange' },
]

export const calendar = [
  {
    day: 'Thu', date: '10', fullDate: '2026-09-10', formattedDate: 'Thursday, 10 Sep', revenue: '₹0', level: 1,
    dailySummary: [
      { label: 'Revenue', value: '₹0', tone: 'primary' },
      { label: 'Bills captured', value: '0', tone: 'primary' },
      { label: 'Avg. bill value', value: '₹0', tone: 'primary' },
      { label: 'Line items', value: '0', tone: 'primary' },
    ],
  },
  {
    day: 'Fri', date: '11', fullDate: '2026-09-11', formattedDate: 'Friday, 11 Sep', revenue: '₹0', level: 1,
    dailySummary: [
      { label: 'Revenue', value: '₹0', tone: 'primary' },
      { label: 'Bills captured', value: '0', tone: 'primary' },
      { label: 'Avg. bill value', value: '₹0', tone: 'primary' },
      { label: 'Line items', value: '0', tone: 'primary' },
    ],
  },
  {
    day: 'Sat', date: '12', fullDate: '2026-09-12', formattedDate: 'Saturday, 12 Sep', revenue: '₹0', level: 1,
    dailySummary: [
      { label: 'Revenue', value: '₹0', tone: 'primary' },
      { label: 'Bills captured', value: '0', tone: 'primary' },
      { label: 'Avg. bill value', value: '₹0', tone: 'primary' },
      { label: 'Line items', value: '0', tone: 'primary' },
    ],
  },
  {
    day: 'Sun', date: '13', fullDate: '2026-09-13', formattedDate: 'Sunday, 13 Sep', revenue: '₹0', level: 1,
    dailySummary: [
      { label: 'Revenue', value: '₹0', tone: 'primary' },
      { label: 'Bills captured', value: '0', tone: 'primary' },
      { label: 'Avg. bill value', value: '₹0', tone: 'primary' },
      { label: 'Line items', value: '0', tone: 'primary' },
    ],
  },
  {
    day: 'Mon', date: '14', fullDate: '2026-09-14', formattedDate: 'Monday, 14 Sep', revenue: '₹0', level: 1,
    dailySummary: [
      { label: 'Revenue', value: '₹0', tone: 'primary' },
      { label: 'Bills captured', value: '0', tone: 'primary' },
      { label: 'Avg. bill value', value: '₹0', tone: 'primary' },
      { label: 'Line items', value: '0', tone: 'primary' },
    ],
  },
  {
    day: 'Tue', date: '15', fullDate: '2026-09-15', formattedDate: 'Tuesday, 15 Sep', revenue: '₹0', level: 1,
    dailySummary: [
      { label: 'Revenue', value: '₹0', tone: 'primary' },
      { label: 'Bills captured', value: '0', tone: 'primary' },
      { label: 'Avg. bill value', value: '₹0', tone: 'primary' },
      { label: 'Line items', value: '0', tone: 'primary' },
    ],
  },
  {
    day: 'Wed', date: '16', fullDate: '2026-09-16', formattedDate: 'Wednesday, 16 Sep', revenue: '₹0', level: 1, isToday: true,
    dailySummary: [
      { label: 'Revenue', value: '₹0', tone: 'primary' },
      { label: 'Bills captured', value: '0', tone: 'primary' },
      { label: 'Avg. bill value', value: '₹0', tone: 'primary' },
      { label: 'Line items', value: '0', tone: 'primary' },
    ],
  },
]

export const dailySummary = [
  { label: 'Revenue', value: '₹0', tone: 'primary' },
  { label: 'Bills captured', value: '0', tone: 'primary' },
  { label: 'Avg. bill value', value: '₹0', tone: 'primary' },
  { label: 'Line items', value: '0', tone: 'primary' },
]

export const trend = []

export const topItems = []

export const peakHours = [
  { hour: '12p', orders: 0 }, { hour: '1p', orders: 0 }, { hour: '2p', orders: 0 },
  { hour: '6p', orders: 0 }, { hour: '7p', orders: 0 }, { hour: '8p', orders: 0 },
  { hour: '9p', orders: 0 }, { hour: '10p', orders: 0 },
]

export const recentBills = []

export const expenses = [
  { label: 'Fixed expenses', value: '₹0', percent: 0, color: 'orange' },
  { label: 'Staff expenses', value: '₹0', percent: 0, color: 'green' },
  { label: 'Variable expenses', value: '₹0', percent: 0, color: 'slate' },
]

export function getDemoDashboardData(weekOffset = 0) {
  const today = new Date()
  const offset = Number(weekOffset) || 0
  const refDate = new Date(today)
  if (offset !== 0) {
    refDate.setDate(today.getDate() + (offset * 7))
  }

  const baseRevenues = [34200, 29800, 31500, 38900, 48200, 56400, 42100]
  const baseBills = [21, 19, 20, 24, 31, 36, 27]

  const calendar = []
  let total7DayRevenue = 0

  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate)
    d.setDate(refDate.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const dayNum = String(d.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${dayNum}`
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    const fullWeekday = d.toLocaleDateString('en-US', { weekday: 'long' })
    const monthName = d.toLocaleDateString('en-US', { month: 'short' })
    const formattedDate = `${fullWeekday}, ${dayNum} ${monthName}`

    const patternIdx = (6 - i + Math.abs(offset)) % 7
    const dayRevenue = baseRevenues[patternIdx] + (offset < 0 ? -2400 : 0)
    const billsCount = baseBills[patternIdx] + (offset < 0 ? -2 : 0)
    const avgBill = Math.round(dayRevenue / billsCount)
    const lineItemsCount = billsCount * 3 + 12

    total7DayRevenue += dayRevenue

    const isToday = (offset === 0 && i === 0)
    let level = 3
    let status = 'Steady day'
    if (dayRevenue >= 50000) {
      level = 5
      status = 'Peak day'
    } else if (dayRevenue >= 40000) {
      level = 4
      status = 'High day'
    } else if (dayRevenue >= 30000) {
      level = 3
      status = 'Steady day'
    } else {
      level = 2
      status = 'Normal day'
    }

    const noteTitle = dayRevenue >= 45000 ? 'Strong dinner rush' : 'Smooth service'
    const noteDesc = dayRevenue >= 45000
      ? `Revenue is 28% above your 7-day average. Garlic Naan & Dal Makhani surged.`
      : `₹${dayRevenue.toLocaleString('en-IN')} recorded across ${billsCount} bills captured.`

    calendar.push({
      day: dayName,
      date: dayNum,
      fullDate: dateKey,
      formattedDate,
      revenue: `₹${(dayRevenue / 1000).toFixed(1)}k`,
      rawRevenue: dayRevenue,
      billsCount,
      avgBillValue: `₹${avgBill.toLocaleString('en-IN')}`,
      lineItemsCount,
      level,
      isToday,
      status,
      note: {
        title: noteTitle,
        description: noteDesc,
      },
      dailySummary: [
        { label: 'Revenue', value: `₹${dayRevenue.toLocaleString('en-IN')}`, tone: 'primary' },
        { label: 'Bills captured', value: String(billsCount), tone: 'primary' },
        { label: 'Avg. bill value', value: `₹${avgBill.toLocaleString('en-IN')}`, tone: 'primary' },
        { label: 'Line items', value: String(lineItemsCount), tone: 'primary' },
      ],
    })
  }

  const todayCal = calendar.find((c) => c.isToday) || calendar[calendar.length - 1]

  return {
    kpis: [
      { label: 'Total revenue', value: '₹2,44,540', change: '+14.2%', note: 'vs previous 30 days', tone: 'orange' },
      { label: 'Bills captured', value: '142', change: '+18', note: 'this week', tone: 'orange' },
      { label: 'Avg. bill value', value: '₹1,722', change: '+8.5%', note: 'per bill', tone: 'green' },
      { label: 'Items sold', value: '498', change: '+22%', note: 'dishes served', tone: 'orange' },
    ],
    calendar,
    weekOffset: offset,
    topItems: [
      { name: 'Paneer Butter Masala', orders: 142, revenue: '₹42,600', category: 'Main course', margin: '72%', trend: '+14%' },
      { name: 'Garlic Butter Naan', orders: 284, revenue: '₹22,720', category: 'Breads', margin: '82%', trend: '+19%' },
      { name: 'Dal Makhani', orders: 118, revenue: '₹33,040', category: 'Main course', margin: '76%', trend: '+8%' },
      { name: 'Murgh Dum Biryani', orders: 96, revenue: '₹43,200', category: 'Rice & Biryani', margin: '68%', trend: '+22%' },
      { name: 'Smoked Chaas', orders: 165, revenue: '₹14,850', category: 'Beverages', margin: '86%', trend: '+11%' },
    ],
    popularCombos: {
      combos: [
        { itemA: 'Dal Makhani', itemB: 'Garlic Butter Naan', pairLabel: 'Dal Makhani + Garlic Butter Naan', count: 58, avgPriceA: 280, avgPriceB: 80, combinedPrice: 360, suggestedPrice: 330, savings: 30, discountPercent: 8 },
        { itemA: 'Murgh Dum Biryani', itemB: 'Smoked Chaas', pairLabel: 'Murgh Dum Biryani + Smoked Chaas', count: 44, avgPriceA: 450, avgPriceB: 90, combinedPrice: 540, suggestedPrice: 495, savings: 45, discountPercent: 8 },
        { itemA: 'Paneer Butter Masala', itemB: 'Garlic Butter Naan', pairLabel: 'Paneer Butter Masala + Garlic Butter Naan', count: 41, avgPriceA: 300, avgPriceB: 80, combinedPrice: 380, suggestedPrice: 350, savings: 30, discountPercent: 8 },
      ],
      totalBillsAnalyzed: 142,
      hasEnoughData: true,
    },
    milestones: {
      activeMilestone: null,
      allMilestones: [
        { id: 'rev_2l', type: 'monthly_revenue', title: '🎉 Crossed ₹2,00,000 this month!', headline: 'Crossed ₹2,00,000', description: '₹2,44,540 recorded this month. Phenomenal momentum!', value: 244540, isAcknowledged: true },
        { id: 'bills_100', type: 'bill_count', title: '🎉 100+ bills captured!', headline: '100+ bills captured', description: '142 total bills recorded with DineIQ. High operational consistency!', value: 142, isAcknowledged: true },
      ],
      acknowledged: ['rev_2l', 'bills_100'],
    },
    complianceAlerts: { alerts: [], hasAlerts: false },
    recentBills: [
      { number: '#1048', time: '21:15', date: todayCal?.formattedDate || 'Today', items: 5, total: '₹2,450' },
      { number: '#1047', time: '20:42', date: todayCal?.formattedDate || 'Today', items: 3, total: '₹1,320' },
      { number: '#1046', time: '20:10', date: todayCal?.formattedDate || 'Today', items: 7, total: '₹3,890' },
      { number: '#1045', time: '19:48', date: todayCal?.formattedDate || 'Today', items: 4, total: '₹1,840' },
      { number: '#1044', time: '19:15', date: todayCal?.formattedDate || 'Today', items: 2, total: '₹950' },
    ],
    dailySummary: todayCal.dailySummary,
    unreadNotificationsCount: 2,
    peakHours: [
      { hour: '12p', orders: 16 }, { hour: '1p', orders: 32 }, { hour: '2p', orders: 24 },
      { hour: '6p', orders: 18 }, { hour: '7p', orders: 42 }, { hour: '8p', orders: 54 },
      { hour: '9p', orders: 46 }, { hour: '10p', orders: 20 },
    ],
  }
}

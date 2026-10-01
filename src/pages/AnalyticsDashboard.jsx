import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Bell, Calendar, ChevronRight, Download, FileScan, Filter, ImagePlus, Loader2, Menu, RefreshCw, Search, X } from 'lucide-react'
import { DailyCalendar } from '../components/DailyCalendar'
import { DailySummary } from '../components/DailySummary'
import { Sidebar } from '../components/Sidebar'
import { StatCard } from '../components/StatCard'
import { DashboardExtras } from '../components/DashboardExtras'
import { MilestoneCelebration } from '../components/MilestoneCelebration'
import { ComplianceAlertBanner, evaluateLicenseCompliance } from '../components/ComplianceAlertBanner'
import { NotificationsPanel } from '../components/NotificationsPanel'
import { getCurrentPeriod, getDemoDashboardData, getFormattedToday, getTimeOfDayGreeting } from '../mock-data/dashboard'

const getCurrentMonthKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const DEMO_RESTAURANT = {
  id: 'demo-rest-001',
  name: 'The Bombay Canteen',
  owner_name: 'Sameer Seth',
  address: 'Lower Parel, Mumbai',
  city: 'Mumbai',
  cuisine: 'Modern Indian',
}

const DEMO_USER = {
  email: 'sameer@bombaycanteen.com',
  user_metadata: { full_name: 'Sameer Seth' },
}

export function AnalyticsDashboard({
  onNavigate,
  savedBill,
  restaurant,
  user,
  onSignOut,
  onRestaurantUpdated,
  isDemo = false,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isWakingUp, setIsWakingUp] = useState(false)
  const [wakingUpAttempt, setWakingUpAttempt] = useState(1)
  const [liveRestaurant, setLiveRestaurant] = useState(restaurant || null)
  const [periodType, setPeriodType] = useState('week') // 'week' | 'month' | 'all'
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey)
  const [selectedDate, setSelectedDate] = useState(null)
  const [dismissedMilestoneIds, setDismissedMilestoneIds] = useState(new Set())
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const [isCustomiseOpen, setIsCustomiseOpen] = useState(false)

  const monthOptions = useMemo(() => {
    const currentKey = getCurrentMonthKey()
    const optionsMap = new Map()
    const now = new Date()

    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key <= currentKey) {
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        optionsMap.set(key, { key, label, isCurrent: i === 0 })
      }
    }

    if (Array.isArray(data?.availableMonths)) {
      data.availableMonths.forEach((m) => {
        if (m && m <= currentKey && !optionsMap.has(m)) {
          const [yr, mn] = m.split('-')
          const d = new Date(Number(yr), Number(mn) - 1, 1)
          const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          optionsMap.set(m, { key: m, label, isCurrent: m === currentKey })
        }
      })
    }

    return Array.from(optionsMap.values()).sort((a, b) => b.key.localeCompare(a.key))
  }, [data?.availableMonths])

  const handleSelectWeek = (offset = 0) => {
    setPeriodType('week')
    setWeekOffset(offset)
    setSelectedDate(null)
    loadData('week', offset, selectedMonth)
    setIsPeriodOpen(false)
  }

  const handleSelectMonth = (monthKey) => {
    const currentKey = getCurrentMonthKey()
    const validMonth = monthKey > currentKey ? currentKey : (monthKey || currentKey)
    setPeriodType('month')
    setSelectedMonth(validMonth)
    setSelectedDate(null)
    loadData('month', weekOffset, validMonth)
    setIsPeriodOpen(false)
  }

  const handleSelectAllTime = () => {
    setPeriodType('all')
    setSelectedDate(null)
    loadData('all', weekOffset, selectedMonth)
    setIsPeriodOpen(false)
  }

  const handlePrevPeriod = () => {
    setSelectedDate(null)
    if (periodType === 'month') {
      const [yStr, mStr] = (selectedMonth || getCurrentMonthKey()).split('-')
      const prevDate = new Date(Number(yStr), Number(mStr) - 2, 1)
      const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
      setSelectedMonth(prevKey)
      loadData('month', weekOffset, prevKey)
    } else {
      const next = weekOffset - 1
      setWeekOffset(next)
      loadData('week', next, selectedMonth)
    }
  }

  const handleNextPeriod = () => {
    setSelectedDate(null)
    if (periodType === 'month') {
      const currentKey = getCurrentMonthKey()
      if (selectedMonth >= currentKey) return
      const [yStr, mStr] = selectedMonth.split('-')
      const nextDate = new Date(Number(yStr), Number(mStr), 1)
      const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
      const validNext = nextKey > currentKey ? currentKey : nextKey
      setSelectedMonth(validNext)
      loadData('month', weekOffset, validNext)
    } else {
      if (weekOffset >= 0) return
      const next = weekOffset + 1
      setWeekOffset(next)
      loadData('week', next, selectedMonth)
    }
  }

  const canGoNext = periodType === 'month' ? (selectedMonth < getCurrentMonthKey()) : (weekOffset < 0)

  const getPeriodButtonLabel = () => {
    if (periodType === 'all') {
      return 'All Time (All bills)'
    }
    if (periodType === 'month') {
      const isCurrent = selectedMonth === getCurrentMonthKey()
      const [yr, mn] = (selectedMonth || getCurrentMonthKey()).split('-')
      const d = new Date(Number(yr), Number(mn) - 1, 1)
      const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      return isCurrent ? `This month (${monthName})` : `Month (${monthName})`
    }
    return weekOffset === 0
      ? `This week (${data?.periodLabel || getCurrentPeriod()})`
      : weekOffset === -1
      ? `Last week (${data?.periodLabel || ''})`
      : `${Math.abs(weekOffset)} wks ago (${data?.periodLabel || ''})`
  }

  const handleDismissMilestone = async (milestoneId) => {
    if (!milestoneId) return
    setDismissedMilestoneIds((prev) => new Set([...prev, milestoneId]))
    setData((prev) => {
      if (!prev?.milestones) return prev
      return {
        ...prev,
        milestones: {
          ...prev.milestones,
          activeMilestone: prev.milestones.activeMilestone?.id === milestoneId ? null : prev.milestones.activeMilestone,
        },
      }
    })

    if (isDemo) return

    try {
      const token = localStorage.getItem('dineq:auth-token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      await fetch('/api/milestones/acknowledge', {
        method: 'POST',
        headers,
        body: JSON.stringify({ milestoneId }),
      })
    } catch (err) {
      console.warn('[milestones] failed to acknowledge milestone:', err)
    }
  }

  const fetchJsonWithRetry = async (url, options = {}, maxRetries = 3, retryDelayMs = 2500, onRetry) => {
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

  const loadData = async (pType = periodType, wOffset = weekOffset, sMonth = selectedMonth) => {
    if (isDemo) {
      setLoading(true)
      setError('')
      setIsWakingUp(false)
      const demoData = getDemoDashboardData(wOffset)
      setData(demoData)
      if (demoData?.unreadNotificationsCount != null) {
        setUnreadCount(demoData.unreadNotificationsCount)
      }
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const token = localStorage.getItem('dineq:auth-token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const params = new URLSearchParams()
    params.set('periodType', pType)
    if (pType === 'week') {
      params.set('weekOffset', String(wOffset))
    } else if (pType === 'month') {
      params.set('month', sMonth || getCurrentMonthKey())
    }
    const dashUrl = `/api/dashboard?${params.toString()}`

    try {
      const [dashData, restData] = await Promise.all([
        fetchJsonWithRetry(dashUrl, { headers }, 3, 2500, (attempt) => {
          setIsWakingUp(true)
          setWakingUpAttempt(attempt)
        }),
        fetchJsonWithRetry('/api/restaurant', { headers }, 3, 2500).catch(() => null),
      ])

      setData(dashData)
      setError('')
      setIsWakingUp(false)

      if (dashData?.unreadNotificationsCount != null) {
        setUnreadCount(dashData.unreadNotificationsCount)
      }
      if (dashData?.selectedMonth) {
        setSelectedMonth(dashData.selectedMonth)
      }
      if (restData) {
        setLiveRestaurant(restData)
        onRestaurantUpdated?.(restData)
      }
    } catch (err) {
      setIsWakingUp(false)
      console.warn('[AnalyticsDashboard] Dashboard load failed after retries:', err.message)
      setError(err.message || 'Could not connect to dashboard service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [savedBill])

  const currentRestaurant = isDemo ? (restaurant || DEMO_RESTAURANT) : (liveRestaurant || restaurant)
  const currentUser = isDemo ? (user || DEMO_USER) : user
  const restaurantName = currentRestaurant?.name || 'Your Restaurant'
  const ownerName = currentRestaurant?.owner_name || currentUser?.email?.split('@')?.[0] || 'Owner'
  const dashboardKpis = data?.kpis || []
  const hasBills = (data?.recentBills && data.recentBills.length > 0) || !!savedBill || isDemo
  const activeMilestone = data?.milestones?.activeMilestone && !dismissedMilestoneIds.has(data.milestones.activeMilestone.id)
    ? data.milestones.activeMilestone
    : null
  const complianceAlerts = data?.complianceAlerts?.alerts || evaluateLicenseCompliance(currentRestaurant)

  return (
    <div className="app-shell">
      <Sidebar activeLabel="Overview" onNavigate={onNavigate} restaurant={currentRestaurant} user={currentUser} onSignOut={isDemo ? null : onSignOut} />
      <main className="dashboard">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('dineiq:toggle-sidebar'))}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="mobile-brand">Dine<span>IQ</span></div>
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Overview</strong></div>
          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Search"
              onClick={() => setIsSearchOpen(true)}
              title="Search bills, dishes, and pages"
            >
              <Search size={17} />
            </button>
            <div className="notification-button-wrapper" style={{ position: 'relative' }}>
              <button
                type="button"
                className={`icon-button notification-button ${isNotificationsOpen ? 'is-active' : ''}`}
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell size={17} />
                {unreadCount > 0 && <span className="notification-unread-dot" />}
              </button>
              <NotificationsPanel
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                onNotificationCountChange={setUnreadCount}
                isDemo={isDemo}
              />
            </div>
            <div className="topbar-divider" />
            <button className="export-button" onClick={() => onNavigate?.('Reports')}><Download size={15} />Export report</button>
          </div>
        </header>

        <div className="dashboard-content dashboard-home">
          <section className="page-intro">
            <div>
              <p className="eyebrow">{getTimeOfDayGreeting()}, {ownerName}</p>
              <h1>
                {periodType === 'all'
                  ? "Here's your all-time pulse."
                  : periodType === 'month'
                  ? "Here's your monthly pulse."
                  : "Here's your weekly pulse."}
              </h1>
              <p className="intro-copy">
                A clear view of how {restaurantName} is doing in {data?.periodLabel || 'selected period'}.
              </p>
            </div>
            <div className="date-control" style={{ position: 'relative' }}>
              <span className="date-label">Reporting period</span>
              <button
                type="button"
                onClick={() => setIsPeriodOpen((prev) => !prev)}
                aria-expanded={isPeriodOpen}
                aria-haspopup="listbox"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Calendar size={14} style={{ color: 'var(--color-orange)', flexShrink: 0 }} />
                <span>{getPeriodButtonLabel()}</span>
                <span>⌄</span>
              </button>
              {isPeriodOpen && (
                <div
                  className="period-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 6,
                    background: 'var(--color-charcoal-900)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
                    zIndex: 100,
                    minWidth: 280,
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {/* View Mode Tabs */}
                  <div className="period-tabs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, background: 'rgba(255,255,255,0.04)', padding: 3, borderRadius: 'var(--radius-sm)' }}>
                    <button
                      type="button"
                      onClick={() => handleSelectWeek(0)}
                      className={`period-tab-btn ${periodType === 'week' ? 'is-active' : ''}`}
                    >
                      Week
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMonth(selectedMonth || getCurrentMonthKey())}
                      className={`period-tab-btn ${periodType === 'month' ? 'is-active' : ''}`}
                    >
                      Month
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllTime}
                      className={`period-tab-btn ${periodType === 'all' ? 'is-active' : ''}`}
                    >
                      All Time
                    </button>
                  </div>

                  <div className="period-divider" style={{ height: 1, background: 'var(--color-border)', margin: '2px 0' }} />

                  {/* Period Specific Options */}
                  {periodType === 'week' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span className="eyebrow" style={{ fontSize: '0.7rem', padding: '4px 8px 2px' }}>Week Presets</span>
                      {[
                        { label: 'This week (Current 7 days)', offset: 0 },
                        { label: 'Last week (–1 wk)', offset: -1 },
                        { label: '2 weeks ago (–2 wks)', offset: -2 },
                        { label: '3 weeks ago (–3 wks)', offset: -3 },
                      ].map((opt) => (
                        <button
                          key={opt.offset}
                          type="button"
                          onClick={() => handleSelectWeek(opt.offset)}
                          className={`period-item-btn ${weekOffset === opt.offset ? 'is-active' : ''}`}
                        >
                          <span>{opt.label}</span>
                          {weekOffset === opt.offset && <span style={{ color: 'var(--color-orange)' }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {periodType === 'month' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px 2px' }}>
                        <span className="eyebrow" style={{ fontSize: '0.7rem', margin: 0 }}>Select Month</span>
                        {selectedMonth !== getCurrentMonthKey() && (
                          <button
                            type="button"
                            onClick={() => handleSelectMonth(getCurrentMonthKey())}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-orange)', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                          >
                            Current Month
                          </button>
                        )}
                      </div>
                      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {monthOptions.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectMonth(opt.key)}
                            className={`period-item-btn ${selectedMonth === opt.key ? 'is-active' : ''}`}
                          >
                            <span>{opt.label}{opt.isCurrent ? ' (Current)' : ''}</span>
                            {selectedMonth === opt.key && <span style={{ color: 'var(--color-orange)' }}>✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {periodType === 'all' && (
                    <div style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      <p style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                        All-Time Analytics
                      </p>
                      Viewing all bills ever captured across all months in your workspace.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {complianceAlerts && complianceAlerts.length > 0 && (
            <ComplianceAlertBanner
              alerts={complianceAlerts}
              onNavigate={onNavigate}
            />
          )}

          {activeMilestone && (
            <MilestoneCelebration
              milestone={activeMilestone}
              onDismiss={handleDismissMilestone}
            />
          )}

          {isWakingUp && (
            <div className="panel waking-up-banner" role="status" aria-live="polite">
              <div className="waking-up-content">
                <Loader2 size={20} className="spin waking-up-icon" />
                <div>
                  <strong>Waking up, this may take a moment...</strong>
                  <p>Connecting to DineIQ cloud server after inactivity (attempt {wakingUpAttempt}/3). Retrying automatically...</p>
                </div>
              </div>
            </div>
          )}

          {error && !isWakingUp && (
            <div className="panel error-banner">
              <div className="error-content">
                <AlertTriangle size={20} className="error-icon" />
                <div>
                  <strong>Dashboard connection issue</strong>
                  <p>{error}</p>
                </div>
              </div>
              <button className="secondary-button" onClick={() => loadData()}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {loading && !data && (
            <div className="state-banner">
              <Loader2 size={24} className="spin" style={{ marginRight: 10 }} />
              <span>{isWakingUp ? 'Waking up, this may take a moment...' : 'Loading your dashboard analytics...'}</span>
            </div>
          )}

          {!loading && data && (
            <>
              {!hasBills && (
                <div className="panel empty-dashboard-banner">
                  <div className="empty-icon-wrap">
                    <FileScan size={28} />
                  </div>
                  <div className="empty-text">
                    <h2>No bills scanned yet</h2>
                    <p>Start by capturing your first bill. DineIQ will extract items, calculate margins, and track revenue automatically.</p>
                  </div>
                  <button className="primary-button" onClick={() => onNavigate?.('Bill capture')}>
                    <ImagePlus size={16} /> Capture your first bill
                  </button>
                </div>
              )}

              <section className="stat-grid">
                {dashboardKpis.map((kpi) => (
                  <StatCard key={kpi.label} {...kpi} />
                ))}
              </section>

              <section className="workspace-grid">
                {(() => {
                  const calendarDays = data.calendar || []
                  const activeDay = selectedDate
                    ? calendarDays.find((d) => d.fullDate === selectedDate || d.date === selectedDate)
                    : null

                  const activeSummary = activeDay?.dailySummary || data.todaySummary || data.dailySummary || [
                    { label: 'Revenue', value: '₹0', tone: 'primary' },
                    { label: 'Bills captured', value: '0', tone: 'primary' },
                    { label: 'Avg. bill value', value: '₹0', tone: 'primary' },
                    { label: 'Line items', value: '0', tone: 'primary' },
                  ]

                  const activeDateLabel = activeDay
                    ? (activeDay.formattedDate || activeDay.date)
                    : (data.todayDateLabel || getFormattedToday())

                  const activeStatus = activeDay ? activeDay.status : (data.todayStatus || 'Steady day')
                  const activeNote = activeDay ? activeDay.note : (data.todayNote || { title: 'Today’s service', description: 'Daily pulse for today.' })

                  return (
                    <>
                      <DailyCalendar
                        days={calendarDays}
                        selectedDate={selectedDate}
                        onSelectDay={(clickedDate) => {
                          setSelectedDate((prev) => (prev === clickedDate ? null : clickedDate))
                        }}
                        onPrevPeriod={handlePrevPeriod}
                        onNextPeriod={handleNextPeriod}
                        canGoNext={canGoNext}
                        periodLabel={data.periodLabel}
                        periodType={periodType}
                        allTimeStats={data.allTimeStats}
                        onSelectMonth={(monthKey) => handleSelectMonth(monthKey)}
                      />
                      <DailySummary
                        summary={activeSummary}
                        dateLabel={activeDateLabel}
                        status={activeStatus}
                        note={activeNote}
                        isInspectingPastDay={Boolean(selectedDate && activeDay && !activeDay.isToday)}
                        onResetToToday={() => setSelectedDate(null)}
                      />
                    </>
                  )
                })()}
              </section>

              <DashboardExtras
                savedBill={savedBill}
                topItems={data.topItems || []}
                popularCombos={data.popularCombos}
                milestones={data.milestones}
                recentBills={data.recentBills || []}
                onNavigate={onNavigate}
              />

              <footer className="dashboard-footer">
                <span>Live data from Supabase & DineIQ Engine</span>
                <button type="button" onClick={() => setIsCustomiseOpen(true)}>
                  <Filter size={13} />Customise dashboard
                </button>
              </footer>
            </>
          )}
        </div>
      </main>

      {/* Quick Search Modal */}
      {isSearchOpen && (
        <div className="modal-backdrop" onClick={() => setIsSearchOpen(false)} style={{ zIndex: 1200 }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, marginTop: '10vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <Search size={18} style={{ color: 'var(--color-orange)', flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bills, dishes, reports, or settings..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                  fontSize: '1rem',
                  width: '100%',
                }}
              />
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '12px 16px' }}>
              <p className="eyebrow" style={{ padding: '4px 8px', marginBottom: 6 }}>Navigation Shortcuts</p>
              {[
                { label: 'Overview', desc: 'Performance pulse & calendar', page: 'Overview' },
                { label: 'Bill capture', desc: 'Scan and digitize physical bills', page: 'Bill capture' },
                { label: 'Ask DineIQ', desc: 'Ask natural language questions about your numbers', page: 'Ask DineIQ' },
                { label: 'Reports', desc: 'GST summary & monthly P&L export', page: 'Reports' },
                { label: 'Settings', desc: 'Restaurant profile & licenses', page: 'Settings' },
              ]
                .filter((nav) => !searchQuery || nav.label.toLowerCase().includes(searchQuery.toLowerCase()) || nav.desc.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((nav) => (
                  <button
                    key={nav.page}
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false)
                      onNavigate?.(nav.page)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-charcoal-800)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem' }}>{nav.label}</strong>
                      <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>{nav.desc}</span>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                ))}

              {data?.recentBills && data.recentBills.length > 0 && (
                <>
                  <p className="eyebrow" style={{ padding: '12px 8px 4px 8px', margin: 0 }}>Matching Bills</p>
                  {data.recentBills
                    .filter((b) => {
                      if (!searchQuery) return true
                      const q = searchQuery.toLowerCase()
                      const num = String(b.number || b.bill_number || b.id || '').toLowerCase()
                      const items = Array.isArray(b.items) ? b.items.map((i) => i.name || '').join(' ').toLowerCase() : ''
                      return num.includes(q) || items.includes(q)
                    })
                    .slice(0, 5)
                    .map((b) => (
                      <div
                        key={b.id || b.number}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          fontSize: '0.84rem',
                        }}
                      >
                        <div>
                          <strong>{b.number || b.bill_number || b.id}</strong>
                          <span style={{ marginLeft: 8, color: 'var(--color-text-muted)', fontSize: '0.76rem' }}>{b.date} • {b.paymentMode || b.payment_mode || 'UPI'}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--color-orange)' }}>
                          {typeof b.total === 'number' ? `₹${b.total.toLocaleString('en-IN')}` : b.total}
                        </span>
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customise Dashboard Modal */}
      {isCustomiseOpen && (
        <div className="modal-backdrop" onClick={() => setIsCustomiseOpen(false)} style={{ zIndex: 1200 }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="brand-mark" style={{ width: 28, height: 28 }}><Filter size={15} /></span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Customise Dashboard</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCustomiseOpen(false)}
                aria-label="Close customise modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <span style={{ display: 'inline-block', marginBottom: 12, background: 'rgba(255, 107, 53, 0.15)', color: 'var(--color-orange)', padding: '3px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600 }}>
                COMING SOON IN PRO
              </span>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                Dashboard widget customization is currently in development. You will soon be able to reorder cards, toggle performance strips, and define custom target milestones.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: 'Revenue & Volume KPI Cards', checked: true },
                  { name: 'Daily Performance Calendar', checked: true },
                  { name: 'Menu Intelligence (Top Items & Combos)', checked: true },
                  { name: 'Peak Operational Hours', checked: true },
                  { name: 'Statutory Compliance Alerts', checked: true },
                ].map((item) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-charcoal-800)', borderRadius: 6, opacity: 0.75 }}>
                    <span style={{ fontSize: '0.83rem', color: 'var(--color-text-primary)' }}>{item.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pinned</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="primary-button" onClick={() => setIsCustomiseOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

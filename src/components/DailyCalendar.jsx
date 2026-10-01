import { useState } from 'react'
import { TrendingUp, Sparkles, Calendar as CalendarIcon, ArrowRight } from 'lucide-react'

export function DailyCalendar({
  days = [],
  selectedDate,
  onSelectDay,
  onPrevPeriod,
  onNextPeriod,
  canGoNext = true,
  periodLabel,
  periodType = 'week',
  allTimeStats,
  onSelectMonth,
}) {
  const todayDateStr = String(new Date().getDate()).padStart(2, '0')
  const todayDateKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${todayDateStr}`
  const [hoveredIndex, setHoveredIndex] = useState(null)

  // Compute revenue numbers for the sparkline
  const revenues = days.map((d) => {
    if (typeof d.rawRevenue === 'number') return d.rawRevenue
    const clean = String(d.revenue || '0').replace(/[^0-9.]/g, '')
    return parseFloat(clean) || 0
  })

  const maxRevenue = Math.max(500, ...revenues)
  const totalPeriodRevenue = revenues.reduce((a, b) => a + b, 0)
  const peakIndex = revenues.length > 0 ? revenues.indexOf(Math.max(...revenues)) : -1

  // Build SVG points for days
  const chartWidth = 500
  const chartHeight = 65
  const paddingX = 24
  const paddingY = 12

  const points = days.map((_, i) => {
    const x = paddingX + (i / Math.max(1, days.length - 1)) * (chartWidth - paddingX * 2)
    const rev = revenues[i] || 0
    const normalizedY = maxRevenue > 0 ? (rev / maxRevenue) * (chartHeight - paddingY * 2) : 0
    const y = chartHeight - paddingY - normalizedY
    return { x, y, rev }
  })

  // Smooth cubic bezier path generator
  const createSmoothPath = (pts) => {
    if (pts.length === 0) return ''
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`

    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] || p2

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
  }

  const linePath = createSmoothPath(points)
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
    : ''

  // Velocity badge label
  let velocityBadgeText = `₹${totalPeriodRevenue.toLocaleString('en-IN')} 7d total`
  if (periodType === 'month') {
    velocityBadgeText = `₹${totalPeriodRevenue.toLocaleString('en-IN')} month total`
  } else if (periodType === 'all') {
    const allRev = allTimeStats?.monthlyBreakdown?.reduce((s, m) => s + (m.revenue || 0), 0) || 0
    velocityBadgeText = `₹${allRev.toLocaleString('en-IN')} all-time`
  }

  return (
    <section className="panel calendar-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>
              {periodType === 'all'
                ? 'All-time performance'
                : periodType === 'month'
                ? 'Monthly sales view'
                : 'Daily sales view'}
            </span>
            {periodLabel && (
              <span className="calendar-range-tag">
                {periodLabel}
              </span>
            )}
          </p>
          <h2>
            {periodType === 'all'
              ? 'All-time monthly performance'
              : periodType === 'month'
              ? `Performance calendar (${periodLabel || 'Month'})`
              : 'Performance calendar'}
          </h2>
        </div>
        <div className="calendar-actions">
          <div className="calendar-velocity-badge">
            <TrendingUp size={13} />
            <span>{velocityBadgeText}</span>
          </div>
          {periodType !== 'all' && (
            <div className="calendar-nav-buttons">
              <button
                type="button"
                onClick={onPrevPeriod}
                aria-label={periodType === 'month' ? 'Previous month' : 'Previous week'}
                title={periodType === 'month' ? 'Previous month' : 'Previous 7 days'}
              >
                ←
              </button>
              <button
                type="button"
                onClick={onNextPeriod}
                disabled={!canGoNext}
                aria-label={periodType === 'month' ? 'Next month' : 'Next week'}
                title={canGoNext ? (periodType === 'month' ? 'Next month' : 'Next 7 days') : 'Already at current period'}
                className={!canGoNext ? 'is-disabled' : ''}
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      {periodType === 'all' ? (
        /* ALL TIME VIEW: Monthly Breakdown Cards & Highlights */
        <div className="all-time-overview">
          <div className="all-time-grid">
            {(allTimeStats?.monthlyBreakdown || []).length === 0 ? (
              <div className="all-time-empty" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No captured bills recorded in your workspace yet.
              </div>
            ) : (
              (allTimeStats?.monthlyBreakdown || []).map((m) => (
                <button
                  key={m.monthKey}
                  type="button"
                  className="all-time-month-card"
                  onClick={() => onSelectMonth?.(m.monthKey)}
                  title={`Click to inspect ${m.monthName}`}
                >
                  <div className="month-card-header">
                    <span className="month-card-name">{m.monthName}</span>
                    <span className="month-card-arrow">Inspect <ArrowRight size={12} style={{ display: 'inline', marginLeft: 2 }} /></span>
                  </div>
                  <div className="month-card-metrics">
                    <div className="month-metric-item">
                      <span className="month-metric-label">Revenue</span>
                      <strong className="month-metric-val">{m.formattedRevenue}</strong>
                    </div>
                    <div className="month-metric-item">
                      <span className="month-metric-label">Bills</span>
                      <strong className="month-metric-val">{m.billsCount}</strong>
                    </div>
                    <div className="month-metric-item">
                      <span className="month-metric-label">Avg bill</span>
                      <strong className="month-metric-val">{m.formattedAvgBill}</strong>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="all-time-summary-row">
            <div className="all-time-stat-pill">
              <span>Active months:</span>
              <strong>{allTimeStats?.totalMonthsWithData || 0}</strong>
            </div>
            <div className="all-time-stat-pill">
              <span>Best month:</span>
              <strong>{allTimeStats?.bestMonth || '-'}</strong>
            </div>
            {allTimeStats?.earliestDate && (
              <div className="all-time-stat-pill">
                <span>First bill captured:</span>
                <strong>{allTimeStats.earliestDate}</strong>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* WEEK & MONTH VIEW: Interactive Days Calendar */
        <>
          <div className={`calendar-grid ${periodType === 'month' ? 'calendar-grid--month' : ''}`}>
            {days.map((day, idx) => {
              const isToday = day.isToday ?? (day.fullDate ? day.fullDate === todayDateKey : day.date === todayDateStr)
              const isSelected = selectedDate
                ? (day.fullDate === selectedDate || day.date === selectedDate)
                : false
              const isHovered = hoveredIndex === idx

              return (
                <button
                  type="button"
                  className={`calendar-day calendar-day--${day.level || 1} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${isHovered ? 'is-hovered' : ''}`}
                  key={day.fullDate || day.date || idx}
                  onClick={() => onSelectDay?.(day.fullDate || day.date)}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  aria-pressed={isSelected}
                  aria-label={`${day.day} ${day.date}: ${day.revenue}`}
                >
                  <span className="cal-day-name">{day.day}</span>
                  <strong className="cal-day-num">{day.date}</strong>
                  <small className="cal-day-rev">{day.revenue || '₹0'}</small>
                </button>
              )
            })}
          </div>

          {/* Sparkline Revenue Trajectory */}
          <div className="calendar-sparkline-wrap" aria-label="Revenue trend sparkline">
            <svg
              className="calendar-sparkline-svg"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="calRevGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff8a3d" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#ff8a3d" stopOpacity="0.0" />
                </linearGradient>
                <filter id="calGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Reference base guideline */}
              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="3 3"
              />

              {/* Area fill */}
              {areaPath && totalPeriodRevenue > 0 && (
                <path
                  d={areaPath}
                  fill="url(#calRevGradient)"
                  className="calendar-area-fill"
                />
              )}

              {/* Line stroke */}
              {linePath && totalPeriodRevenue > 0 && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#ff8a3d"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="calendar-line-stroke"
                />
              )}

              {/* Interactive Day Points */}
              {points.map((pt, i) => {
                const day = days[i]
                const isToday = day?.isToday ?? (day?.fullDate ? day.fullDate === todayDateKey : day?.date === todayDateStr)
                const isSelected = selectedDate
                  ? (day?.fullDate === selectedDate || day?.date === selectedDate)
                  : false
                const isPeak = i === peakIndex && pt.rev > 0

                return (
                  <g
                    key={day?.fullDate || day?.date || i}
                    className="calendar-point-group"
                    onClick={() => onSelectDay?.(day?.fullDate || day?.date)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {isSelected && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="8"
                        fill="rgba(255, 138, 61, 0.25)"
                        filter="url(#calGlow)"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? '4.5' : isPeak ? '3.5' : '2.5'}
                      fill={isSelected ? '#ffffff' : isPeak ? '#ff8a3d' : '#888888'}
                      stroke={isSelected ? '#ff8a3d' : 'rgba(23, 23, 23, 0.9)'}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                    />
                  </g>
                )
              })}
            </svg>

            <div className="calendar-sparkline-meta">
              <span className="sparkline-caption">
                <Sparkles size={11} className="caption-sparkle" />
                {periodType === 'month'
                  ? `${days.length}-day monthly sales curve`
                  : '7-day revenue trajectory'}
              </span>
              {peakIndex >= 0 && revenues[peakIndex] > 0 ? (
                <span className="peak-tag">
                  Peak: ₹{revenues[peakIndex].toLocaleString('en-IN')} ({days[peakIndex]?.day} {days[peakIndex]?.date})
                </span>
              ) : (
                <span className="caption-muted" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {totalPeriodRevenue === 0 ? 'No bill sales recorded for this period.' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="calendar-footer">
            <div className="legend-items">
              <span><i className="legend-dot legend-dot--low" />Low</span>
              <span><i className="legend-dot legend-dot--medium" />Steady</span>
              <span><i className="legend-dot legend-dot--high" />Peak</span>
            </div>
            <span className="calendar-click-hint">Click any day to inspect daily breakdown in Daily Summary</span>
          </div>
        </>
      )}
    </section>
  )
}

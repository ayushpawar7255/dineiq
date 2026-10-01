import { useState } from 'react'
import { TrendingUp } from 'lucide-react'

export function TrendChart({ calendarDays = [] }) {
  const [activePoint, setActivePoint] = useState(null)

  // Use calendarDays if provided, else fallback
  const days = calendarDays && calendarDays.length > 0 ? calendarDays : []

  const revData = days.map((d) => {
    const raw = typeof d.rawRevenue === 'number'
      ? d.rawRevenue
      : parseFloat(String(d.revenue || '0').replace(/[^0-9.]/g, '')) || 0
    return {
      day: d.day,
      date: d.date,
      fullDate: d.fullDate || d.formattedDate || `${d.day} ${d.date}`,
      revenue: raw,
      formattedRevenue: d.revenue || `₹${raw.toLocaleString('en-IN')}`,
      billsCount: d.billsCount ?? 0,
      isToday: d.isToday,
    }
  })

  const totalRev = revData.reduce((sum, d) => sum + d.revenue, 0)
  const avgRev = revData.length > 0 ? Math.round(totalRev / revData.length) : 0
  const maxRev = Math.max(100, ...revData.map((d) => d.revenue))
  const peakItem = revData.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), revData[0] || { revenue: 0 })

  const width = 640
  const height = 110
  const padX = 28
  const padY = 20

  const pts = revData.map((d, i) => {
    const x = padX + (i / Math.max(1, revData.length - 1)) * (width - padX * 2)
    const normalizedY = maxRev > 0 ? (d.revenue / maxRev) * (height - padY * 2) : 0
    const y = height - padY - normalizedY
    return { ...d, x, y }
  })

  // Build smooth bezier curve
  const buildSmoothPath = (points) => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2] || p2

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
  }

  const lineD = buildSmoothPath(pts)
  const areaD = pts.length > 0
    ? `${lineD} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`
    : ''

  const avgY = maxRev > 0 ? height - padY - (avgRev / maxRev) * (height - padY * 2) : height - padY

  return (
    <section className="panel trend-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={12} style={{ color: 'var(--color-orange)' }} />
            Revenue Velocity
          </p>
          <h2>7–14 Day Revenue Trend</h2>
        </div>
        <div className="trend-stats-summary">
          <div className="trend-stat-badge">
            <span className="trend-stat-label">Period total:</span>
            <strong className="trend-stat-val">₹{totalRev.toLocaleString('en-IN')}</strong>
          </div>
          <div className="trend-stat-badge">
            <span className="trend-stat-label">Daily avg:</span>
            <strong className="trend-stat-val">₹{avgRev.toLocaleString('en-IN')}</strong>
          </div>
          {peakItem && peakItem.revenue > 0 && (
            <div className="trend-stat-badge peak-highlight">
              <span className="trend-stat-label">Peak:</span>
              <strong className="trend-stat-val">₹{peakItem.revenue.toLocaleString('en-IN')}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="trend-chart-container">
        <svg
          className="trend-chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setActivePoint(null)}
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff8a3d" stopOpacity="0.32" />
              <stop offset="85%" stopColor="#ff8a3d" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#ff8a3d" stopOpacity="0.0" />
            </linearGradient>
            <filter id="trendDotGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Average daily guideline */}
          {avgRev > 0 && (
            <g className="avg-guideline-group">
              <line
                x1={padX}
                y1={avgY}
                x2={width - padX}
                y2={avgY}
                stroke="rgba(255, 138, 61, 0.25)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={width - padX - 4}
                y={Math.max(12, avgY - 5)}
                textAnchor="end"
                fill="rgba(255, 138, 61, 0.7)"
                fontSize="9"
                fontWeight="500"
              >
                Avg: ₹{avgRev.toLocaleString('en-IN')}
              </text>
            </g>
          )}

          {/* Area under curve */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#trendGradient)"
              className="trend-area-fill"
            />
          )}

          {/* Smooth line */}
          {lineD && (
            <path
              d={lineD}
              fill="none"
              stroke="#ff8a3d"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="trend-line-stroke"
            />
          )}

          {/* Interactive points & hover columns */}
          {pts.map((pt, index) => {
            const isHovered = activePoint?.date === pt.date
            const isPeak = pt.revenue === peakItem?.revenue && pt.revenue > 0

            return (
              <g key={pt.fullDate || index} className="trend-point-item">
                {/* Invisible hover zone */}
                <rect
                  x={pt.x - 18}
                  y={0}
                  width={36}
                  height={height}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setActivePoint(pt)}
                />

                {/* Subtle vertical marker line on hover */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={padY}
                    x2={pt.x}
                    y2={height - padY}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Glow ring on hover or peak */}
                {(isHovered || isPeak) && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? '9' : '7'}
                    fill="rgba(255, 138, 61, 0.25)"
                    filter="url(#trendDotGlow)"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? '4.5' : isPeak ? '4' : '2.8'}
                  fill={isHovered ? '#ffffff' : isPeak ? '#ff8a3d' : '#888888'}
                  stroke={isHovered ? '#ff8a3d' : 'rgba(20, 20, 20, 0.9)'}
                  strokeWidth={isHovered ? '2.5' : '1.5'}
                />
              </g>
            )
          })}
        </svg>

        {/* Floating Tooltip when hovered */}
        {activePoint && (
          <div
            className="trend-tooltip"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${Math.max(10, (activePoint.y / height) * 100 - 35)}%`,
            }}
          >
            <div className="tooltip-date">{activePoint.fullDate}</div>
            <div className="tooltip-rev">₹{activePoint.revenue.toLocaleString('en-IN')}</div>
            {activePoint.billsCount > 0 && (
              <div className="tooltip-bills">{activePoint.billsCount} bills captured</div>
            )}
          </div>
        )}
      </div>

      <div className="trend-x-axis">
        {pts.map((pt, i) => (
          <span
            key={pt.fullDate || i}
            className={`trend-x-label ${pt.isToday ? 'is-today' : ''} ${activePoint?.date === pt.date ? 'is-active' : ''}`}
            style={{ left: `${(pt.x / width) * 100}%` }}
          >
            <small>{pt.day}</small>
            <b>{pt.date}</b>
          </span>
        ))}
      </div>
    </section>
  )
}

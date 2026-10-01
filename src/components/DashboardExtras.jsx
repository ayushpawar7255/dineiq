import { useState } from 'react'
import { ArrowUpRight, Clock3, Sparkles, Trophy, UtensilsCrossed, Zap } from 'lucide-react'
import { getFormattedToday, getTodayWeekday, peakHours } from '../mock-data/dashboard'
import { PerformanceTable } from './PerformanceTable'

function billItemsCount(bill) {
  if (typeof bill.itemsCount === 'number') return bill.itemsCount
  if (Array.isArray(bill.items)) return bill.items.length
  if (Array.isArray(bill.bill_items)) return bill.bill_items.length
  return typeof bill.items === 'number' ? bill.items : 0
}

function billTotalDisplay(bill) {
  if (typeof bill.totalLabel === 'string') return bill.totalLabel
  if (typeof bill.total === 'string') return bill.total
  if (typeof bill.total === 'number') return `₹${bill.total.toLocaleString('en-IN')}`
  return '-'
}

export function DashboardExtras({
  savedBill,
  topItems = [],
  recentBills = [],
  popularCombos = null,
  milestones = null,
  onNavigate,
}) {
  const [selectedDay, setSelectedDay] = useState('Today')
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false)

  const bills = savedBill
    ? [savedBill, ...(recentBills || []).filter((bill) => bill.number !== savedBill.number)]
    : recentBills || []

  // Dynamic peak hours based on selected day
  const isWeekend = selectedDay === 'Saturday' || selectedDay === 'Sunday'
  const currentPeakHours = peakHours.map((item) => {
    if (isWeekend) {
      if (item.hour === '8 PM' || item.hour === '9 PM' || item.hour === '10 PM') {
        return { ...item, orders: Math.round(item.orders * 1.45) }
      }
      return { ...item, orders: Math.max(1, Math.round(item.orders * 0.9)) }
    }
    return item
  })

  const max = Math.max(1, ...currentPeakHours.map((item) => item.orders))
  const items = topItems || []

  // Top combo insight
  const topCombo = popularCombos?.combos && popularCombos.combos.length > 0
    ? popularCombos.combos[0]
    : null

  // Milestones info
  const activeMilestone = milestones?.activeMilestone || milestones?.allMilestones?.[0] || null

  return (
    <div className="dashboard-extras-flow">
      {/* Top Selling Items + Compact Intelligence Strip */}
      <section className="overview-mid-grid">
        {/* Left: Top Selling Items Widget */}
        <PerformanceTable items={items} onNavigate={onNavigate} />

        {/* Right: Compact Intelligence Strip (Popular Combos & Milestones) */}
        <aside className="compact-intelligence-column">
          {/* Compact Popular Combos Card */}
          <section className="panel compact-combos-panel">
            <div className="compact-panel-header">
              <div>
                <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={12} style={{ color: 'var(--color-orange)' }} />
                  Popular Combos
                </p>
                <h3>Bundle Opportunity</h3>
              </div>
              <span className="compact-badge">AI Insight</span>
            </div>

            {topCombo ? (
              <div className="compact-combo-card">
                <div className="combo-pair-names">
                  <div className="combo-item-pill">{topCombo.itemA}</div>
                  <span className="combo-plus">+</span>
                  <div className="combo-item-pill">{topCombo.itemB}</div>
                </div>

                <div className="combo-meta-line">
                  <span className="combo-freq-pill">
                    <Zap size={11} />
                    Ordered together {topCombo.count} times
                  </span>
                  <span className="combo-savings-pill">
                    Save ₹{topCombo.savings} ({topCombo.discountPercent}% off)
                  </span>
                </div>

                <div className="combo-price-row">
                  <div className="combo-separate-col">
                    <small>Bought separately</small>
                    <del>₹{topCombo.combinedPrice?.toLocaleString('en-IN')}</del>
                  </div>
                  <div className="combo-suggested-col">
                    <small>Suggested combo</small>
                    <strong>₹{topCombo.suggestedPrice?.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {popularCombos.combos.length > 1 && (
                  <div className="combo-secondary-hint">
                    +{popularCombos.combos.length - 1} more pairing detected in captured bills
                  </div>
                )}
              </div>
            ) : (
              <div className="compact-empty-state">
                <Sparkles size={20} className="empty-sparkle-icon" />
                <p>
                  <strong>Discover Pairings</strong><br />
                  When items are ordered together 2+ times, bundle savings appear here automatically.
                </p>
              </div>
            )}
          </section>

          {/* Compact Milestones Strip */}
          <section className="panel compact-milestone-panel">
            <div className="compact-panel-header">
              <div>
                <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Trophy size={12} style={{ color: '#eab308' }} />
                  Milestones
                </p>
                <h3>Growth Record</h3>
              </div>
              <span className="compact-badge gold">Live</span>
            </div>

            {activeMilestone ? (
              <div className="compact-milestone-body">
                <div className="milestone-headline-row">
                  <span className="trophy-medallion">🏆</span>
                  <div>
                    <strong>{activeMilestone.headline || activeMilestone.title}</strong>
                    <p>{activeMilestone.description || 'Highest revenue performance recorded!'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="compact-milestone-body">
                <div className="milestone-headline-row">
                  <span className="trophy-medallion">🎯</span>
                  <div>
                    <strong>Next milestone: 10 Bills</strong>
                    <p>Keep scanning customer bills to unlock performance streaks and records.</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </aside>
      </section>

      {/* 3. Operational Intelligence: Peak Hours & Recent Bills */}
      <section className="dashboard-panels-grid">
        <section className="panel peak-panel">
          <div className="panel-heading" style={{ position: 'relative' }}>
            <div>
              <p className="eyebrow">{getFormattedToday()}</p>
              <h2>Peak operating hours</h2>
            </div>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="day-select"
                onClick={() => setIsDayDropdownOpen((prev) => !prev)}
                aria-expanded={isDayDropdownOpen}
                aria-haspopup="listbox"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>{selectedDay === 'Today' ? getTodayWeekday() : selectedDay}</span>
                <span>⌄</span>
              </button>
              {isDayDropdownOpen && (
                <div
                  className="day-select-dropdown"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    background: 'var(--color-charcoal-900)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 20,
                    minWidth: 130,
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {['Today', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setSelectedDay(day)
                        setIsDayDropdownOpen(false)
                      }}
                      style={{
                        padding: '6px 10px',
                        textAlign: 'left',
                        background: selectedDay === day ? 'var(--color-charcoal-800)' : 'transparent',
                        color: selectedDay === day ? 'var(--color-orange)' : 'var(--color-text-primary)',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: selectedDay === day ? 600 : 400,
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="peak-chart">
            {currentPeakHours.map((item) => (
              <div className="peak-bar-wrap" key={item.hour}>
                <span className="peak-value">{item.orders}</span>
                <div className="peak-bar" style={{ height: `${(item.orders / max) * 100}%` }} />
                <small>{item.hour}</small>
              </div>
            ))}
          </div>
          <div className="peak-note">
            <Clock3 size={14} />
            <span>
              Your busiest service window on {selectedDay === 'Today' ? getTodayWeekday() : selectedDay} is{' '}
              <strong>{isWeekend ? '8:00 PM – 10:30 PM' : '7:00 PM – 9:00 PM'}</strong>
            </span>
          </div>
        </section>

        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Latest activity</p>
              <h2>Recent bills</h2>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate?.('Bill capture')}
            >
              Scan new bill <span>→</span>
            </button>
          </div>
          <div className="table-scroll">
            <table className="recent-bills-table">
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Time</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bills.length > 0 ? (
                  bills.map((bill) => (
                    <tr key={bill.number}>
                      <td><strong>{bill.number}</strong></td>
                      <td>{bill.time}</td>
                      <td>{bill.date}</td>
                      <td>{billItemsCount(bill)}</td>
                      <td><strong className="bill-total-highlight">{billTotalDisplay(bill)}</strong></td>
                      <td>
                        <button
                          type="button"
                          className="view-link"
                          onClick={() => onNavigate?.('Reports')}
                        >
                          View <ArrowUpRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="table-empty-row">
                      No recent bills found. Capture a bill to start tracking here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  )
}

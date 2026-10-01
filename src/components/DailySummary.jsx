import { getFormattedToday } from '../mock-data/dashboard'
import { Sparkles, CalendarDays, RotateCcw } from 'lucide-react'

export function DailySummary({
  summary = [],
  dateLabel,
  status,
  note,
  isInspectingPastDay = false,
  onResetToToday,
}) {
  const isPeak = status === 'Peak day'
  const isSteady = status === 'Steady day'
  const statusTheme = isPeak ? 'peak' : isSteady ? 'steady' : 'quiet'

  return (
    <aside className="panel summary-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <CalendarDays size={12} />
            {dateLabel || getFormattedToday()}
          </p>
          <h2>Daily summary</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isInspectingPastDay && onResetToToday && (
            <button
              type="button"
              onClick={onResetToToday}
              className="summary-today-pill"
              title="Return to Today's pulse"
            >
              <RotateCcw size={11} /> Today
            </button>
          )}
          <span className={`summary-status summary-status--${statusTheme}`}>
            <span className={`status-indicator-dot status-indicator-dot--${statusTheme}`} />
            {status || 'Steady day'}
          </span>
        </div>
      </div>

      <div className="summary-list">
        {summary.map((item) => (
          <div className="summary-row" key={item.label}>
            <span className="summary-row-label">{item.label}</span>
            <strong className={`summary-row-value ${item.tone === 'positive' ? 'is-positive' : ''}`}>
              {item.value}
            </strong>
          </div>
        ))}
      </div>

      <div className="summary-note">
        <div className="note-icon-wrap">
          <Sparkles size={14} className="note-sparkle-icon" />
        </div>
        <div className="note-text-content">
          <strong>{note?.title || 'Daily breakdown'}</strong>
          <p>{note?.description || 'Summary for this date.'}</p>
        </div>
      </div>
    </aside>
  )
}

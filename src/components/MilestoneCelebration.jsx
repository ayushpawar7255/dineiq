import { PartyPopper, Trophy, Sparkles, X } from 'lucide-react'

export function MilestoneCelebration({ milestone, onDismiss }) {
  if (!milestone) return null

  const isBestDay = milestone.type === 'best_day_ever'
  const isRevenue = milestone.type === 'monthly_revenue'

  return (
    <aside className="panel milestone-banner" role="alert" aria-live="polite">
      <div className="milestone-glow" />
      <div className="milestone-content-wrap">
        <div className="milestone-icon-box">
          {isBestDay ? (
            <Trophy size={26} className="milestone-icon-trophy" />
          ) : isRevenue ? (
            <PartyPopper size={26} className="milestone-icon-popper" />
          ) : (
            <Sparkles size={26} className="milestone-icon-sparkle" />
          )}
        </div>

        <div className="milestone-text-block">
          <div className="milestone-badge-row">
            <span className="milestone-badge">
              <Sparkles size={12} />
              {isBestDay ? 'Record Broken' : isRevenue ? 'Revenue Milestone' : 'Milestone Unlocked'}
            </span>
          </div>
          <h2 className="milestone-title">{milestone.title}</h2>
          <p className="milestone-description">{milestone.description}</p>
        </div>
      </div>

      <div className="milestone-actions">
        <button
          type="button"
          className="milestone-celebrate-btn"
          onClick={() => onDismiss(milestone.id)}
        >
          Awesome! 🎉
        </button>
        <button
          type="button"
          className="milestone-close-btn"
          onClick={() => onDismiss(milestone.id)}
          aria-label="Dismiss milestone"
        >
          <X size={18} />
        </button>
      </div>
    </aside>
  )
}

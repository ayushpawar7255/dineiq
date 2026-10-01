import { ArrowUpRight, TrendingUp, UtensilsCrossed } from 'lucide-react'

export function PerformanceTable({ items = [], onNavigate }) {
  const list = items || []
  const maxOrders = Math.max(1, ...list.map((item) => Number(item.orders) || 0))

  return (
    <section className="panel performance-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UtensilsCrossed size={12} style={{ color: 'var(--color-orange)' }} />
            Menu intelligence
          </p>
          <h2>Top Selling Items</h2>
        </div>
        <button
          type="button"
          className="text-button performance-view-all"
          onClick={() => onNavigate?.('Reports')}
        >
          View menu reports <span>→</span>
        </button>
      </div>

      <div className="table-scroll">
        <table className="performance-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>#</th>
              <th>Dish &amp; Category</th>
              <th>Volume</th>
              <th>Revenue</th>
              <th>Contribution</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.slice(0, 5).map((item, index) => {
                const orders = Number(item.orders) || 0
                const volumePercent = Math.min(100, Math.round((orders / maxOrders) * 100))
                const rankNum = String(index + 1).padStart(2, '0')
                const hasMargin = item.margin && item.margin !== '-'
                const hasTrend = item.trend && item.trend !== '-'

                return (
                  <tr key={item.name || index} className="performance-row">
                    <td>
                      <span className={`dish-rank-badge ${index === 0 ? 'is-gold' : ''}`}>
                        {rankNum}
                      </span>
                    </td>
                    <td>
                      <div className="dish-title-group">
                        <strong className="dish-primary-name">{item.name}</strong>
                        <span className="dish-category-tag">{item.category || 'Menu item'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="dish-volume-group">
                        <div className="dish-volume-count">
                          <strong>{orders}</strong>
                          <span>orders</span>
                        </div>
                        <div className="dish-volume-bar-bg" title={`${volumePercent}% of top volume`}>
                          <div
                            className="dish-volume-bar-fill"
                            style={{ width: `${volumePercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong className="dish-revenue-figure">
                        {item.revenue || '₹0'}
                      </strong>
                    </td>
                    <td>
                      <span className="dish-margin-pill">
                        {hasMargin ? item.margin : `${volumePercent}% vol`}
                      </span>
                    </td>
                    <td>
                      <span className="dish-trend-pill">
                        <TrendingUp size={12} />
                        {hasTrend ? item.trend : 'High demand'}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="6" className="table-empty-row">
                  <div className="empty-state-hint">
                    No dishes recorded yet. Capture your first bill to see your top selling items and profit margins.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import {
  IndianRupee,
  Receipt,
  CreditCard,
  UtensilsCrossed,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from 'lucide-react'

function getStatIcon(label) {
  const l = (label || '').toLowerCase()
  if (l.includes('revenue')) return <IndianRupee size={15} />
  if (l.includes('bill') && !l.includes('avg')) return <Receipt size={15} />
  if (l.includes('avg') || l.includes('value')) return <CreditCard size={15} />
  if (l.includes('item') || l.includes('sold')) return <UtensilsCrossed size={15} />
  return <Sparkles size={15} />
}

function getStatIconTheme(label) {
  const l = (label || '').toLowerCase()
  if (l.includes('revenue')) return 'revenue'
  if (l.includes('bill') && !l.includes('avg')) return 'bills'
  if (l.includes('avg') || l.includes('value')) return 'average'
  if (l.includes('item') || l.includes('sold')) return 'items'
  return 'default'
}

function CountUpValue({ value, duration = 800 }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (!value || typeof value !== 'string') {
      setDisplay(value ?? '—')
      return
    }

    const match = value.match(/^([^0-9]*)([\d,]+(?:\.\d+)?)(.*)$/)
    if (!match) {
      setDisplay(value)
      return
    }

    const prefix = match[1] || ''
    const rawNumberStr = match[2].replace(/,/g, '')
    const suffix = match[3] || ''
    const target = parseFloat(rawNumberStr)

    if (isNaN(target) || target === 0) {
      setDisplay(value)
      return
    }

    const isDecimal = match[2].includes('.')
    const decimalPlaces = isDecimal ? (match[2].split('.')[1]?.length || 1) : 0

    const startTime = performance.now()
    let frameId

    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Smooth ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = target * ease

      const formatted = isDecimal
        ? current.toLocaleString('en-IN', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          })
        : Math.round(current).toLocaleString('en-IN')

      setDisplay(`${prefix}${formatted}${suffix}`)

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        setDisplay(value)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [value, duration])

  return <span>{display}</span>
}

export function StatCard({ label, value, change, note, tone }) {
  const iconTheme = getStatIconTheme(label)
  const isHyphen = !change || change === '-'
  const isNegative = !isHyphen && String(change).startsWith('-')
  const isPositive = !isHyphen && !isNegative

  return (
    <article className={`stat-card stat-card--${iconTheme}`}>
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon stat-card-icon--${iconTheme}`} aria-hidden="true">
          {getStatIcon(label)}
        </div>
      </div>

      <strong className="stat-card-value">
        <CountUpValue value={value} />
      </strong>

      <div className="stat-meta">
        {isHyphen ? (
          <span className="trend-pill trend-pill--neutral">
            <Minus size={11} />
            <span>Active</span>
          </span>
        ) : isNegative ? (
          <span className="trend-pill trend-pill--negative">
            <TrendingDown size={11} />
            <span>{change}</span>
          </span>
        ) : (
          <span className="trend-pill trend-pill--positive">
            <TrendingUp size={11} />
            <span>{change}</span>
          </span>
        )}
        <span className="stat-card-note">{note}</span>
      </div>
    </article>
  )
}

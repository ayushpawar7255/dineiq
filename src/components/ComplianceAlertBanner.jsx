import { useState, useEffect } from 'react'
import { AlertOctagon, AlertTriangle, ArrowRight, Clock, ShieldAlert, X } from 'lucide-react'

export const COMPLIANCE_DISMISS_STORAGE_KEY = 'dineq:dismissed-compliance-alert'

export function isAlertDismissed(primaryAlert) {
  if (!primaryAlert || typeof window === 'undefined') return false
  try {
    const raw = sessionStorage.getItem(COMPLIANCE_DISMISS_STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)

    // If it's a completely different license or alert ID, don't dismiss
    if (parsed.alertId !== primaryAlert.id) return false

    // Severity hierarchy: warning (1) < urgent (2) < expired (3)
    const SEVERITY_WEIGHT = { warning: 1, urgent: 2, expired: 3 }
    const currentWeight = SEVERITY_WEIGHT[primaryAlert.severity] || 0
    const dismissedWeight = SEVERITY_WEIGHT[parsed.severity] || 0

    // If urgency level increased (e.g. from warning to urgent, or urgent to expired), reappear!
    if (currentWeight > dismissedWeight) return false

    // If days remaining crossed critical thresholds (e.g. was >30 days, now <=30 days)
    if (parsed.daysRemaining > 30 && primaryAlert.daysRemaining <= 30) return false
    // If was not yet expired (>0 days), but is now expired (<=0 days)
    if (parsed.daysRemaining > 0 && primaryAlert.daysRemaining <= 0) return false

    return true
  } catch {
    return false
  }
}

export function evaluateLicenseCompliance(restaurant = {}) {
  const alerts = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function evaluateLicense(name, expiryDateStr, licenseNo) {
    if (!expiryDateStr || typeof expiryDateStr !== 'string') return null
    const cleanDate = expiryDateStr.trim().slice(0, 10)
    const [y, m, d] = cleanDate.split('-').map(Number)
    if (!y || !m || !d) return null
    const expiry = new Date(y, m - 1, d)
    expiry.setHours(0, 0, 0, 0)
    if (isNaN(expiry.getTime())) return null

    const diffMs = expiry.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    let formattedDate = cleanDate
    try {
      formattedDate = expiry.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {}

    if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays)
      return {
        id: `lic_${name}_${cleanDate}`,
        name,
        licenseNo: licenseNo || null,
        expiryDate: cleanDate,
        formattedExpiry: formattedDate,
        daysRemaining: diffDays,
        status: 'expired',
        severity: 'expired', // Red styling
        badge: 'EXPIRED',
        headline: `⚠️ ${name} EXPIRED ${daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`}`,
        title: `⚠️ ${name} EXPIRED ${daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`} — renew immediately`,
        message: `${name}${licenseNo ? ` (#${licenseNo})` : ''} expired on ${formattedDate}. Renew immediately to avoid regulatory penalties or shutdown.`,
      }
    }

    if (diffDays === 0) {
      return {
        id: `lic_${name}_${cleanDate}`,
        name,
        licenseNo: licenseNo || null,
        expiryDate: cleanDate,
        formattedExpiry: formattedDate,
        daysRemaining: 0,
        status: 'urgent',
        severity: 'urgent', // Red styling
        badge: 'EXPIRES TODAY',
        headline: `⚠️ ${name} expires TODAY`,
        title: `⚠️ ${name} expires TODAY — renew immediately`,
        message: `Today is the final day before ${name}${licenseNo ? ` (#${licenseNo})` : ''} expires. Immediate renewal required.`,
      }
    }

    if (diffDays <= 30) {
      return {
        id: `lic_${name}_${cleanDate}`,
        name,
        licenseNo: licenseNo || null,
        expiryDate: cleanDate,
        formattedExpiry: formattedDate,
        daysRemaining: diffDays,
        status: 'urgent',
        severity: 'urgent', // Red styling
        badge: `${diffDays} DAYS LEFT`,
        headline: `⚠️ ${name} expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
        title: `⚠️ ${name} expires in ${diffDays} day${diffDays === 1 ? '' : 's'} — renew soon`,
        message: `Expires on ${formattedDate}. Action required within ${diffDays} days to ensure uninterrupted operations.`,
      }
    }

    if (diffDays <= 60) {
      return {
        id: `lic_${name}_${cleanDate}`,
        name,
        licenseNo: licenseNo || null,
        expiryDate: cleanDate,
        formattedExpiry: formattedDate,
        daysRemaining: diffDays,
        status: 'warning',
        severity: 'warning', // Orange styling
        badge: `${diffDays} DAYS LEFT`,
        headline: `⚠️ ${name} expires in ${diffDays} days`,
        title: `⚠️ ${name} expires in ${diffDays} days — renew soon`,
        message: `Expires on ${formattedDate}. Please prepare your renewal documents soon.`,
      }
    }

    // Greater than 60 days: no banner
    return null
  }

  if (restaurant?.fssai_expiry_date) {
    const alert = evaluateLicense('FSSAI license', restaurant.fssai_expiry_date, restaurant.fssai_license_number)
    if (alert) alerts.push(alert)
  }

  const others = Array.isArray(restaurant?.other_licenses) ? restaurant.other_licenses : []
  others.forEach((lic) => {
    if (lic && lic.expiry_date) {
      const alert = evaluateLicense(lic.name?.trim() || 'Permit / License', lic.expiry_date, lic.license_number)
      if (alert) alerts.push(alert)
    }
  })

  const severityScore = { expired: 0, urgent: 1, warning: 2 }
  alerts.sort((a, b) => {
    const sDiff = (severityScore[a.severity] ?? 9) - (severityScore[b.severity] ?? 9)
    if (sDiff !== 0) return sDiff
    return a.daysRemaining - b.daysRemaining
  })

  return alerts
}

export function ComplianceAlertBanner({ alerts = [], onNavigate, onDismiss }) {
  if (!alerts || alerts.length === 0) return null

  // Highlight the most critical alert
  const primaryAlert = alerts[0]
  const [dismissed, setDismissed] = useState(() => isAlertDismissed(primaryAlert))

  useEffect(() => {
    setDismissed(isAlertDismissed(primaryAlert))
  }, [primaryAlert?.id, primaryAlert?.severity, primaryAlert?.daysRemaining])

  if (dismissed) return null

  const handleDismiss = (e) => {
    e.stopPropagation()
    try {
      sessionStorage.setItem(
        COMPLIANCE_DISMISS_STORAGE_KEY,
        JSON.stringify({
          alertId: primaryAlert.id,
          severity: primaryAlert.severity,
          daysRemaining: primaryAlert.daysRemaining,
          dismissedAt: Date.now(),
        })
      )
    } catch {}
    setDismissed(true)
    onDismiss?.(primaryAlert)
  }

  const isRed = primaryAlert.severity === 'expired' || primaryAlert.severity === 'urgent'
  const isExpired = primaryAlert.severity === 'expired'

  return (
    <div
      className={`panel compliance-banner compliance-banner--${primaryAlert.severity}`}
      role="alert"
      aria-live="assertive"
    >
      <button
        type="button"
        className="compliance-close-btn"
        onClick={handleDismiss}
        aria-label="Dismiss license expiry warning"
        title="Dismiss for this session"
      >
        <X size={15} />
      </button>

      <div className="compliance-icon-wrap">
        {isExpired ? (
          <AlertOctagon size={24} className="compliance-alert-icon" />
        ) : isRed ? (
          <ShieldAlert size={24} className="compliance-alert-icon" />
        ) : (
          <AlertTriangle size={24} className="compliance-alert-icon" />
        )}
      </div>

      <div className="compliance-text-content">
        <div className="compliance-tag-row">
          <span className={`compliance-status-pill pill--${primaryAlert.severity}`}>
            {primaryAlert.badge}
          </span>
          {alerts.length > 1 && (
            <span className="compliance-count-badge">
              +{alerts.length - 1} more license alert{alerts.length > 2 ? 's' : ''}
            </span>
          )}
        </div>
        <h2 className="compliance-title">{primaryAlert.title}</h2>
        <p className="compliance-message">{primaryAlert.message}</p>
        
        {alerts.length > 1 && (
          <div className="compliance-extra-list">
            {alerts.slice(1).map((a) => (
              <div key={a.id} className={`compliance-extra-item extra--${a.severity}`}>
                <Clock size={12} />
                <span><strong>{a.name}:</strong> {a.badge} ({a.formattedExpiry})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="compliance-action-wrap">
        <button
          type="button"
          className="compliance-settings-btn"
          onClick={() => onNavigate?.('settings')}
        >
          <span>Manage licenses</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

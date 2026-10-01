import { BarChart3, FileScan, HelpCircle, LayoutDashboard, LogOut, Settings, Sparkles, Utensils, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getInitials } from '../mock-data/dashboard'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Bill capture', icon: FileScan },
  { label: 'Ask DineIQ', icon: Sparkles },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
]

export function Sidebar({ activeLabel = 'Overview', onNavigate, restaurant, user, onSignOut }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [billCount, setBillCount] = useState(0)
  const restName = restaurant?.name || 'My Restaurant'
  const restLoc = restaurant?.address?.split(',')?.[0] || ''
  const ownerName = restaurant?.owner_name || user?.email?.split('@')?.[0] || 'Owner'
  const restInitials = getInitials(restName, 'MR')
  const ownerInitials = getInitials(ownerName, 'OW')

  useEffect(() => {
    const token = localStorage.getItem('dineq:auth-token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    fetch('/api/reports/monthly', { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.gstSummary?.billCount != null) {
          setBillCount(data.gstSummary.billCount)
        } else if (data?.bills?.length != null) {
          setBillCount(data.bills.length)
        }
      })
      .catch(() => {})
  }, [restaurant?.id])

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev)
    const handleClose = () => setIsOpen(false)
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setIsHelpOpen(false)
      }
    }

    window.addEventListener('dineiq:toggle-sidebar', handleToggle)
    window.addEventListener('dineiq:close-sidebar', handleClose)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('dineiq:toggle-sidebar', handleToggle)
      window.removeEventListener('dineiq:close-sidebar', handleClose)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleNavClick = (label) => {
    setIsOpen(false)
    setIsHelpOpen(false)
    onNavigate?.(label)
  }

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-title">
            <span className="brand-mark"><Utensils size={15} /></span>
            <span>Dine<span>IQ</span></span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <button
          type="button"
          className="restaurant-switcher"
          onClick={() => handleNavClick('Settings')}
          title="Switch or manage restaurant profile in Settings"
        >
          <span className="restaurant-avatar">{restInitials}</span>
          <span>
            <strong>{restName}</strong>
            <small>{restLoc || 'Manage in Settings'}</small>
          </span>
          <span className="switcher-caret">⌄</span>
        </button>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map(({ label, icon: Icon }) => (
            <button
              className={`nav-item ${label === activeLabel ? 'is-active' : ''}`}
              key={label}
              onClick={() => handleNavClick(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === 'Bill capture' && <span className="nav-badge">{billCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            type="button"
            className="nav-item"
            onClick={() => setIsHelpOpen(true)}
            title="Open DineIQ Help Centre"
          >
            <HelpCircle size={17} />
            <span>Help centre</span>
          </button>
          <div className="sidebar-user-block">
            <button
              className="profile-chip"
              onClick={() => handleNavClick('Settings')}
              title="Go to Settings"
            >
              <span className="profile-avatar">{ownerInitials}</span>
              <span>
                <strong>{ownerName}</strong>
                <small>{user?.email || 'Owner'}</small>
              </span>
            </button>
            {onSignOut && (
              <button
                className="logout-button"
                onClick={() => {
                  setIsOpen(false)
                  onSignOut()
                }}
                title="Log out of DineIQ"
                aria-label="Log out"
              >
                <LogOut size={15} />
                <span>Log out</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Help Centre Modal */}
      {isHelpOpen && (
        <div className="modal-backdrop" onClick={() => setIsHelpOpen(false)} style={{ zIndex: 1200 }}>
          <div className="modal-container help-centre-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="brand-mark" style={{ width: 28, height: 28 }}><HelpCircle size={16} /></span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>DineIQ Help & Support</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsHelpOpen(false)}
                aria-label="Close help modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ background: 'rgba(255, 107, 53, 0.08)', border: '1px solid rgba(255, 107, 53, 0.25)', borderRadius: 8, padding: 14 }}>
                <strong style={{ color: 'var(--color-orange)', display: 'block', marginBottom: 4 }}>Need immediate assistance?</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  Our dedicated restaurant support team is available Mon–Sat from 10 AM to 10 PM IST.
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <a
                    href="mailto:support@dineiq.in?subject=DineIQ%20Support%20Request"
                    className="primary-button"
                    style={{ padding: '6px 14px', fontSize: '0.82rem', textDecoration: 'none' }}
                  >
                    Email support@dineiq.in
                  </a>
                  <a
                    href="https://wa.me/919820012345?text=Hi%20DineIQ%20Support,%20I%20need%20help%20with%20my%20restaurant%20dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                    style={{ padding: '6px 14px', fontSize: '0.82rem', textDecoration: 'none' }}
                  >
                    WhatsApp Chat
                  </a>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Frequently Asked Questions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem' }}>
                  <details style={{ background: 'var(--color-charcoal-800)', padding: '10px 12px', borderRadius: 6, cursor: 'pointer' }}>
                    <summary style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>How does automated bill capture work?</summary>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      Snap or upload a printed or handwritten customer bill in <strong>Bill Capture</strong>. Our Gemini OCR engine extracts items, quantities, taxes, and totals in seconds for you to verify.
                    </p>
                  </details>
                  <details style={{ background: 'var(--color-charcoal-800)', padding: '10px 12px', borderRadius: 6, cursor: 'pointer' }}>
                    <summary style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>How are GST summaries generated?</summary>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      Go to <strong>Reports</strong>. DineIQ splits bill totals into Taxable Value, CGST (2.5%), and SGST (2.5%), ready to export as an official audit-ready PDF for your accountant.
                    </p>
                  </details>
                  <details style={{ background: 'var(--color-charcoal-800)', padding: '10px 12px', borderRadius: 6, cursor: 'pointer' }}>
                    <summary style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Can I edit my restaurant details?</summary>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      Yes, click on <strong>Settings</strong> to update your restaurant name, GSTIN, FSSAI license number, and operational hours anytime.
                    </p>
                  </details>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="secondary-button" onClick={() => setIsHelpOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

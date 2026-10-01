import { useEffect, useState } from 'react'
import { AlertCircle, Check, CreditCard, Loader2, Menu, Plus, Save, ShieldCheck, Store, Trash2, UserRound, X } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { restaurant as defaultRestaurant } from '../mock-data/dashboard'

const sections = [
  { id: 'profile', label: 'Restaurant profile', icon: Store },
  { id: 'compliance', label: 'Licenses & Compliance', icon: ShieldCheck },
  { id: 'owner', label: 'Owner details', icon: UserRound },
  { id: 'operations', label: 'Operations', icon: CreditCard },
]

const emptyForm = {
  name: '',
  address: '',
  phone: '',
  gstin: '',
  owner_name: '',
  email: '',
  preferred_report_day: 'Monday',
  currency: 'INR',
  opening_time: '',
  closing_time: '',
  default_tax_rate: 5,
  weekly_target: 0,
  fssai_license_number: '',
  fssai_expiry_date: '',
  other_licenses: [],
}

export function Settings({ onNavigate, onRestaurantUpdated, restaurant, user, onSignOut, isOnboarding }) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    email: user?.email || '',
    name: restaurant?.name || '',
    owner_name: restaurant?.owner_name || '',
  }))
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saved' | 'saving' | 'dirty' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [activeSection, setActiveSection] = useState('profile')
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)

  const scrollToSection = (secId) => {
    setActiveSection(secId)
    const el = document.getElementById(`settings-section-${secId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    const token = localStorage.getItem('dineq:auth-token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    fetch('/api/restaurant', { headers })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch restaurant')
        return res.json()
      })
      .then((data) => {
        if (active && data) {
          const fresh = {
            name: data.name ?? '',
            address: data.address ?? '',
            phone: data.phone ?? '',
            email: data.email || user?.email || '',
            gstin: data.gstin ?? '',
            owner_name: data.owner_name ?? '',
            preferred_report_day: data.preferred_report_day || 'Monday',
            currency: data.currency || 'INR',
            opening_time: data.opening_time ?? '',
            closing_time: data.closing_time ?? '',
            default_tax_rate: data.default_tax_rate != null ? Number(data.default_tax_rate) : 5,
            weekly_target: data.weekly_target != null ? Number(data.weekly_target) : 0,
            fssai_license_number: data.fssai_license_number ?? '',
            fssai_expiry_date: data.fssai_expiry_date ? String(data.fssai_expiry_date).slice(0, 10) : '',
            other_licenses: Array.isArray(data.other_licenses) ? data.other_licenses : [],
          }
          setForm(fresh)
          onRestaurantUpdated?.(data)
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load settings:', err)
          setErrorMessage('Could not load settings from database.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveStatus('dirty')
    setErrorMessage('')
  }

  const handleAddLicense = () => {
    setForm((prev) => ({
      ...prev,
      other_licenses: [
        ...(Array.isArray(prev.other_licenses) ? prev.other_licenses : []),
        { id: `lic_${Date.now()}`, name: '', license_number: '', expiry_date: '' },
      ],
    }))
    setSaveStatus('dirty')
    setErrorMessage('')
  }

  const handleLicenseChange = (index, field, value) => {
    setForm((prev) => {
      const list = [...(Array.isArray(prev.other_licenses) ? prev.other_licenses : [])]
      list[index] = { ...list[index], [field]: value }
      return { ...prev, other_licenses: list }
    })
    setSaveStatus('dirty')
    setErrorMessage('')
  }

  const handleRemoveLicense = (index) => {
    setForm((prev) => {
      const list = [...(Array.isArray(prev.other_licenses) ? prev.other_licenses : [])]
      list.splice(index, 1)
      return { ...prev, other_licenses: list }
    })
    setSaveStatus('dirty')
    setErrorMessage('')
  }

  const saveSettings = async () => {
    setSaveStatus('saving')
    setErrorMessage('')
    try {
      const payload = {
        name: String(form.name).trim(),
        address: String(form.address).trim(),
        phone: String(form.phone).trim(),
        email: String(form.email).trim() || user?.email,
        gstin: String(form.gstin).trim(),
        owner_name: String(form.owner_name).trim(),
        preferred_report_day: form.preferred_report_day,
        currency: form.currency,
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        default_tax_rate: Number.parseFloat(form.default_tax_rate) || 0,
        weekly_target: Number(String(form.weekly_target).replace(/[^0-9.]/g, '')) || 0,
        fssai_license_number: String(form.fssai_license_number || '').trim(),
        fssai_expiry_date: form.fssai_expiry_date || null,
        other_licenses: Array.isArray(form.other_licenses) ? form.other_licenses : [],
      }
      const token = localStorage.getItem('dineq:auth-token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const res = await fetch('/api/restaurant', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save settings')
      }
      const updated = await res.json()
      setForm((prev) => ({
        ...prev,
        ...updated,
        name: updated.name ?? prev.name,
        owner_name: updated.owner_name ?? prev.owner_name,
        address: updated.address ?? prev.address,
        phone: updated.phone ?? prev.phone,
        email: updated.email ?? prev.email,
        gstin: updated.gstin ?? prev.gstin,
        fssai_license_number: updated.fssai_license_number ?? prev.fssai_license_number,
        fssai_expiry_date: updated.fssai_expiry_date ? String(updated.fssai_expiry_date).slice(0, 10) : prev.fssai_expiry_date,
        other_licenses: Array.isArray(updated.other_licenses) ? updated.other_licenses : prev.other_licenses,
      }))
      setSaveStatus('saved')
      onRestaurantUpdated?.(updated)
    } catch (err) {
      console.error('Save settings failed:', err)
      setSaveStatus('error')
      setErrorMessage(err.message || 'Could not save changes')
    }
  }

  return (
    <div className="app-shell">
      <Sidebar activeLabel="Settings" onNavigate={onNavigate} restaurant={form} user={user} onSignOut={onSignOut} />
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
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Settings</strong></div>
          <span className={`settings-save-status status--${saveStatus}`}>
            {saveStatus === 'saving' && <><Loader2 size={13} className="spin" /> Saving...</>}
            {saveStatus === 'saved' && <><Check size={13} /> All changes saved</>}
            {saveStatus === 'dirty' && <span style={{ color: 'var(--color-orange)' }}>● Unsaved changes</span>}
            {saveStatus === 'error' && <><AlertCircle size={13} /> {errorMessage || 'Save failed'}</>}
          </span>
        </header>
        <div className="dashboard-content settings-content">
          {isOnboarding && saveStatus === 'saved' && (
            <div
              className="onboarding-success-banner"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(24, 24, 27, 0.95) 100%)',
                border: '1px solid #10b981',
                borderRadius: 'var(--radius-md)',
                padding: '18px 22px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  <Check size={20} />
                </div>
                <div>
                  <strong style={{ fontSize: '1.02rem', color: '#fff', display: 'block' }}>Restaurant profile saved!</strong>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                    Your workspace is ready. Continue to your dashboard to view your weekly pulse metrics.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => onNavigate?.('Overview')}
                style={{ padding: '9px 18px', fontSize: '0.9rem', gap: 8, background: '#10b981', borderColor: '#10b981' }}
              >
                Continue to Dashboard <span>→</span>
              </button>
            </div>
          )}
          {isOnboarding && saveStatus !== 'saved' && (
            <div className="onboarding-welcome-banner">
              <div className="onboarding-icon">🎉</div>
              <div>
                <strong>Welcome to DineIQ!</strong>
                <p>Let’s set up your restaurant profile first. Once saved, your dashboard will calculate pulse metrics automatically.</p>
              </div>
            </div>
          )}
          <section className="page-intro settings-intro">
            <div>
              <p className="eyebrow">Settings</p>
              <h1>Make DineIQ yours.</h1>
              <p className="intro-copy">Manage your restaurant profile and reporting preferences.</p>
            </div>
          </section>

          {loading ? (
            <div className="state-banner"><Loader2 size={20} className="spin" style={{ marginRight: 8 }} /> Loading settings...</div>
          ) : (
            <div className="settings-layout">
              <nav className="settings-nav">
                {sections.map(({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    className={activeSection === id ? 'is-active' : ''}
                    key={label}
                    onClick={() => scrollToSection(id)}
                  >
                    <Icon size={15} />{label}
                  </button>
                ))}
              </nav>
              <div className="settings-main">
                <section className="settings-section" id="settings-section-profile">
                  <div className="settings-section-heading">
                    <div>
                      <p className="eyebrow">01 / Profile</p>
                      <h2>Restaurant profile</h2>
                    </div>
                    <Store size={18} />
                  </div>
                  <div className="settings-fields">
                    <label>
                      Restaurant name
                      <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
                    </label>
                    <label>
                      Location
                      <input value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
                    </label>
                    <label>
                      Phone number
                      <input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                    </label>
                    <label>
                      GSTIN
                      <input value={form.gstin} onChange={(e) => handleChange('gstin', e.target.value)} />
                    </label>
                  </div>
                </section>

                <section className="settings-section" id="settings-section-compliance">
                  <div className="settings-section-heading">
                    <div>
                      <p className="eyebrow">02 / Compliance</p>
                      <h2>Licenses & Compliance</h2>
                    </div>
                    <ShieldCheck size={18} />
                  </div>
                  <div className="settings-fields">
                    <label>
                      FSSAI license number
                      <input
                        placeholder="14-digit FSSAI number (e.g. 11521012345678)"
                        value={form.fssai_license_number}
                        onChange={(e) => handleChange('fssai_license_number', e.target.value)}
                      />
                    </label>
                    <label>
                      FSSAI license expiry date
                      <input
                        type="date"
                        value={form.fssai_expiry_date}
                        onChange={(e) => handleChange('fssai_expiry_date', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="other-licenses-container">
                    <div className="other-licenses-header">
                      <div>
                        <h3>Other permits & licenses</h3>
                        <p className="subheading-desc">Track liquor license, health trade permit, fire safety NOC, eating house license, etc.</p>
                      </div>
                      <button
                        type="button"
                        className="secondary-button add-license-btn"
                        onClick={handleAddLicense}
                      >
                        <Plus size={14} /> Add another license
                      </button>
                    </div>

                    {(!form.other_licenses || form.other_licenses.length === 0) ? (
                      <div className="empty-licenses-notice">
                        <p>No additional licenses added yet. Click &quot;Add another license&quot; to track custom permits.</p>
                      </div>
                    ) : (
                      <div className="licenses-card-list">
                        {form.other_licenses.map((lic, index) => (
                          <div key={lic.id || index} className="license-item-row">
                            <label className="license-field-name">
                              <span>License / Permit name</span>
                              <input
                                placeholder="e.g. Health Trade License, Liquor Permit"
                                value={lic.name || ''}
                                onChange={(e) => handleLicenseChange(index, 'name', e.target.value)}
                              />
                            </label>
                            <label className="license-field-num">
                              <span>License number (optional)</span>
                              <input
                                placeholder="e.g. HTL-2024-9812"
                                value={lic.license_number || ''}
                                onChange={(e) => handleLicenseChange(index, 'license_number', e.target.value)}
                              />
                            </label>
                            <label className="license-field-expiry">
                              <span>Expiry date</span>
                              <input
                                type="date"
                                value={lic.expiry_date || ''}
                                onChange={(e) => handleLicenseChange(index, 'expiry_date', e.target.value)}
                              />
                            </label>
                            <button
                              type="button"
                              className="remove-license-btn"
                              onClick={() => handleRemoveLicense(index)}
                              title="Remove license"
                              aria-label="Remove license"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="settings-section" id="settings-section-owner">
                  <div className="settings-section-heading">
                    <div>
                      <p className="eyebrow">03 / Contact</p>
                      <h2>Owner details</h2>
                    </div>
                    <UserRound size={18} />
                  </div>
                  <div className="settings-fields">
                    <label>
                      Full name
                      <input value={form.owner_name} onChange={(e) => handleChange('owner_name', e.target.value)} />
                    </label>
                    <label>
                      Email address
                      <input value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
                    </label>
                    <label>
                      Preferred report day
                      <select value={form.preferred_report_day} onChange={(e) => handleChange('preferred_report_day', e.target.value)}>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                    </label>
                    <label>
                      Currency
                      <select value={form.currency} onChange={(e) => handleChange('currency', e.target.value)}>
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="AED">UAE Dirham (AED)</option>
                        <option value="GBP">British Pound (£)</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="settings-section" id="settings-section-operations">
                  <div className="settings-section-heading">
                    <div>
                      <p className="eyebrow">04 / Operations</p>
                      <h2>Reporting preferences</h2>
                    </div>
                    <CreditCard size={18} />
                  </div>
                  <div className="settings-fields">
                    <label>
                      Opening time
                      <input value={form.opening_time} onChange={(e) => handleChange('opening_time', e.target.value)} />
                    </label>
                    <label>
                      Closing time
                      <input value={form.closing_time} onChange={(e) => handleChange('closing_time', e.target.value)} />
                    </label>
                    <label>
                      Default tax rate (%)
                      <input
                        type="number"
                        value={form.default_tax_rate}
                        onChange={(e) => handleChange('default_tax_rate', e.target.value)}
                      />
                    </label>
                    <label>
                      Weekly target (₹)
                      <input
                        value={form.weekly_target}
                        onChange={(e) => handleChange('weekly_target', e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                <section className="plan-panel">
                  <div>
                    <p className="eyebrow">Current plan</p>
                    <h2>Growth plan</h2>
                    <p>Automated reports and unlimited bill capture.</p>
                  </div>
                  <strong>₹1,499 <small>/ month</small></strong>
                  <button type="button" className="secondary-button" onClick={() => setIsPlanModalOpen(true)}>
                    Manage plan
                  </button>
                </section>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
                  <button type="button" className="primary-button save-settings" onClick={saveSettings} disabled={saveStatus === 'saving'}>
                    {saveStatus === 'saving' ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                    {saveStatus === 'saving' ? 'Saving changes...' : (isOnboarding ? 'Save & Setup Restaurant' : 'Save changes')}
                  </button>
                  {isOnboarding && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => onNavigate?.('Overview')}
                      style={{ padding: '10px 18px', height: '42px', gap: 6 }}
                    >
                      Continue to Dashboard <span>→</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Plan Management Modal */}
      {isPlanModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPlanModalOpen(false)} style={{ zIndex: 1200 }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="brand-mark" style={{ width: 28, height: 28 }}><CreditCard size={15} /></span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>DineIQ Subscription</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsPlanModalOpen(false)}
                aria-label="Close plan modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '1.1rem' }}>Growth Plan</h4>
                  <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>● Active Subscription</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>₹1,499</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>billed monthly</span>
                </div>
              </div>
              <div style={{ background: 'var(--color-charcoal-800)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <strong style={{ display: 'block', fontSize: '0.84rem', marginBottom: 8, color: 'var(--color-text-primary)' }}>Plan Features Included:</strong>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <li>Unlimited AI bill OCR extractions & duplicate check</li>
                  <li>Real-time gross margin & item profit insights</li>
                  <li>One-click monthly GST tax register (CGST/SGST) PDF</li>
                  <li>Automated license expiry & compliance alert banners</li>
                  <li>Daily WhatsApp manager alerts & pulse summaries</li>
                </ul>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                To upgrade to Enterprise (multi-outlet POS integrations, ERP export) or update your billing GSTIN, email <a href="mailto:billing@dineiq.in" style={{ color: 'var(--color-orange)' }}>billing@dineiq.in</a>.
              </p>
            </div>
            <div className="modal-footer" style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href="mailto:billing@dineiq.in?subject=DineIQ%20Plan%20Inquiry"
                className="secondary-button"
                style={{ fontSize: '0.82rem', textDecoration: 'none' }}
              >
                Contact Billing
              </a>
              <button type="button" className="primary-button" onClick={() => setIsPlanModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, FileScan, ImagePlus, Menu, RefreshCw, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import { billDraft, captureSteps } from '../mock-data/billCapture'
import { Sidebar } from '../components/Sidebar'

const initialItems = billDraft.items.map((item, idx) => ({ id: `init-${idx}`, ...item }))

function formatAmount(value) {
  return value == null ? 'Not detected' : `₹${Number(value).toLocaleString('en-IN')}`
}

function mapGeminiBill(data) {
  const taxTotal = data.taxes?.reduce((sum, tax) => sum + (Number(tax.amount) || 0), 0) || 0
  return {
    merchant: data.restaurantName || 'Restaurant bill',
    billNumber: data.billNumber || 'Not detected',
    date: data.date || 'Date not detected',
    time: data.time || 'Time not detected',
    total: formatAmount(data.grandTotal),
    subtotal: formatAmount(data.subtotal),
    tax: formatAmount(taxTotal),
    subtotalValue: data.subtotal,
    totalValue: data.grandTotal,
    gstValue: taxTotal,
    payment: 'Not detected',
    confidence: 100,
    items: data.lineItems.map((item) => ({ name: item.name, quantity: item.quantity || 1, price: formatAmount(item.amount ?? item.rate) })),
  }
}

function resizeBillImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      const scale = Math.min(1, 1500 / image.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl)
        if (!blob) return reject(new Error('Could not prepare the bill image'))
        resolve(new File([blob], 'bill.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.8)
    }
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not read the bill image')) }
    image.src = objectUrl
  })
}

function Stepper({ current }) {
  return <div className="capture-stepper">{captureSteps.map((step, index) => <div className={`capture-step ${index + 1 <= current ? 'is-complete' : ''} ${index + 1 === current ? 'is-current' : ''}`} key={step.number}><span>{index + 1 < current ? <Check size={12} /> : step.number}</span><strong>{step.label}</strong>{index < captureSteps.length - 1 && <i />}</div>)}</div>
}

function CaptureView({ onStart }) {
  const fileInput = useRef(null)
  const [fileError, setFileError] = useState('')
  const openPicker = (capture) => {
    if (fileInput.current) {
      fileInput.current.setAttribute('accept', 'image/*')
      if (capture) fileInput.current.setAttribute('capture', 'environment')
      else fileInput.current.removeAttribute('capture')
      fileInput.current.click()
    }
  }
  const handleFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFileError('Please choose a JPG or PNG photo of the bill.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('That file is larger than 10 MB. Please choose a smaller bill image.')
      return
    }
    setFileError('')
    onStart(false, file)
  }
  return <><Stepper current={1} /><section className="capture-layout"><div className="capture-card capture-dropzone"><input ref={fileInput} className="file-input" type="file" accept="image/*,.pdf" onChange={handleFile} /><div className="capture-icon"><Upload size={22} /></div><h2>Upload your restaurant bill</h2><p>Drop a clear photo or PDF here and we’ll pull out the details for you.</p><button className="primary-button" onClick={() => openPicker(false)}><ImagePlus size={17} />Choose bill image</button><button className="secondary-button" onClick={() => openPicker(true)}>Use camera</button><span className="file-hint">JPG, PNG or PDF · Max 10 MB</span>{fileError && <span className="file-error" role="alert">{fileError}</span>}<button className="failure-link" onClick={() => onStart(true)}>Test failed scan</button></div><div className="capture-side-note"><div className="side-note-icon"><ShieldCheck size={18} /></div><div><h3>Built for busy service</h3><p>Capture bills in seconds during a rush. DineIQ keeps your original bill attached to the record for easy checking later.</p></div></div></section></>
}

function ProcessingView() {
  return <><Stepper current={1} /><section className="capture-card processing-card"><div className="processing-orbit"><FileScan size={25} /></div><h2>Reading your bill</h2><p>We’re finding items, amounts and payment details.</p><div className="progress-track"><span /></div><div className="processing-meta"><span>Checking image quality</span><strong>In progress</strong></div></section></>
}

function ExtractedView({ billData, onBillDataChange, items, onItemChange, onAddItem, onRemoveItem, onConfirm }) {
  return (
    <>
      <Stepper current={2} />
      <section className="capture-layout extracted-layout">
        <div className="capture-card receipt-preview">
          <div className="receipt-top">
            <span className="receipt-logo">
              {(billData.merchant || 'SL').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{billData.merchant || 'Restaurant bill'}</strong>
              <small>Extracted preview</small>
            </div>
            <span className="confidence-pill"><Sparkles size={12} /> 96% match</span>
          </div>
          <div className="receipt-paper">
            <span className="paper-label">EXTRACTED BILL</span>
            <div className="paper-line paper-line--heavy" />
            <div className="paper-row"><span>Bill no.</span><strong>{billData.billNumber}</strong></div>
            <div className="paper-row"><span>Date</span><strong>{billData.date}</strong></div>
            <div className="paper-row"><span>Time</span><strong>{billData.time}</strong></div>
            <div className="paper-line" />
            {items.map((item, idx) => (
              <div className="paper-row" key={idx}>
                <span>{item.quantity} × {item.name || 'Unnamed item'}</span>
                <strong>{item.price}</strong>
              </div>
            ))}
            <div className="paper-line" />
            <div className="paper-row"><span>Subtotal</span><strong>{billData.subtotal}</strong></div>
            <div className="paper-row"><span>GST (5%)</span><strong>{billData.tax}</strong></div>
            <div className="paper-row paper-total"><span>Total</span><strong>{billData.total}</strong></div>
            <div className="paper-payment">Paid via {billData.payment || 'UPI'}</div>
          </div>
        </div>

        <div className="capture-card edit-card">
          <div className="card-title-row">
            <div>
              <p className="eyebrow">Review extraction</p>
              <h2>Check the details</h2>
            </div>
            <span className="ready-badge"><Check size={13} /> Ready</span>
          </div>
          <p className="edit-intro">
            We found {items.length} item{items.length === 1 ? '' : 's'}. Make any corrections before adding this bill to your records.
          </p>
          <div className="field-grid">
            <label>
              Restaurant
              <input
                value={billData.merchant || ''}
                onChange={(e) => onBillDataChange('merchant', e.target.value)}
                placeholder="Restaurant name"
              />
            </label>
            <label>
              Bill date
              <input
                value={billData.date || ''}
                onChange={(e) => onBillDataChange('date', e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </label>
            <label>
              Bill number
              <input
                value={billData.billNumber || ''}
                onChange={(e) => onBillDataChange('billNumber', e.target.value)}
                placeholder="Bill number"
              />
            </label>
            <label>
              Total amount
              <input
                value={billData.total || ''}
                onChange={(e) => onBillDataChange('total', e.target.value)}
                placeholder="e.g. ₹1,617"
              />
            </label>
          </div>

          <div className="items-heading">
            <strong>Line items ({items.length})</strong>
            <button type="button" onClick={onAddItem}>+ Add item</button>
          </div>

          <div className="edit-items">
            {items.map((item, index) => (
              <div className="edit-item" key={item.id || index}>
                <input
                  value={item.name}
                  placeholder="Dish name"
                  aria-label={`Item ${index + 1} name`}
                  onChange={(e) => onItemChange(index, 'name', e.target.value)}
                />
                <input
                  value={item.quantity}
                  type="number"
                  min="1"
                  placeholder="Qty"
                  aria-label={`Item ${index + 1} quantity`}
                  onChange={(e) => onItemChange(index, 'quantity', e.target.value)}
                />
                <input
                  value={item.price}
                  placeholder="Price"
                  aria-label={`Item ${index + 1} price`}
                  onChange={(e) => onItemChange(index, 'price', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  aria-label={`Remove ${item.name || 'item'}`}
                  title="Remove item"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <button className="primary-button full-button" onClick={onConfirm}>
            Continue to confirmation <span>→</span>
          </button>
        </div>
      </section>
    </>
  )
}

function FailedView({ onRetry, errorMessage }) {
  return (
    <>
      <Stepper current={1} />
      <section className="capture-card failed-card">
        <div className="failure-icon"><X size={22} /></div>
        <p className="eyebrow">Couldn’t read this bill</p>
        <h2>Let’s try that again.</h2>
        <p>{errorMessage ? errorMessage : 'The image is too dark or blurry for us to confidently find the bill details. Your original file hasn’t been saved.'}</p>
        <div className="retry-tips">
          <span><Check size={14} /> Keep the whole bill in frame</span>
          <span><Check size={14} /> Avoid glare and low light</span>
          <span><Check size={14} /> Place it flat before capturing</span>
        </div>
        <button className="primary-button" onClick={onRetry}>
          <RefreshCw size={16} />Try another bill
        </button>
      </section>
    </>
  )
}

function ConfirmationView({ billData, items, onBack, onSave, isSaving, error }) {
  const restName = billData.merchant || 'your restaurant'
  const count = items.length
  return (
    <>
      <Stepper current={3} />
      <section className="capture-card confirmation-card">
        <div className="success-icon"><Check size={23} /></div>
        <p className="eyebrow">Almost there</p>
        <h2>Ready to add this bill?</h2>
        <p>We’ll include this {billData.total} bill in your weekly report for {restName}.</p>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '8px', margin: '1rem 0', fontSize: '0.875rem', textAlign: 'left' }}>
            <strong>Database Error:</strong> {error}
          </div>
        )}
        <div className="confirm-summary">
          <div><span>Bill total</span><strong>{billData.total}</strong></div>
          <div><span>Items</span><strong>{count} item{count === 1 ? '' : 's'}</strong></div>
          <div><span>Captured</span><strong>{billData.date}</strong></div>
        </div>
        <div className="confirmation-actions">
          <button className="secondary-button" onClick={onBack} disabled={isSaving}>
            <ArrowLeft size={15} />Back to edit
          </button>
          <button className="primary-button" onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw size={16} className="spin" />Saving bill...
              </>
            ) : (
              <>
                <Check size={16} />{error ? 'Retry saving bill' : 'Save bill'}
              </>
            )}
          </button>
        </div>
      </section>
    </>
  )
}

export function BillCapture({ onNavigate, onBillSaved, restaurant, user, onSignOut }) {
  const [state, setState] = useState('capture')
  const [isSaving, setIsSaving] = useState(false)
  const [capturedCount, setCapturedCount] = useState(0)
  const [billData, setBillData] = useState(() => ({
    merchant: restaurant?.name || billDraft.merchant,
    billNumber: billDraft.billNumber,
    date: billDraft.date,
    time: billDraft.time,
    subtotal: billDraft.subtotal,
    tax: billDraft.tax,
    total: billDraft.total,
    payment: billDraft.payment || 'UPI',
  }))
  const [items, setItems] = useState(initialItems)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('dineq:auth-token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    fetch('/api/reports/monthly', { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.gstSummary?.billCount != null) {
          setCapturedCount(data.gstSummary.billCount)
        } else if (data?.bills?.length != null) {
          setCapturedCount(data.bills.length)
        }
      })
      .catch(() => {})
  }, [restaurant?.id, state])

  const handleBillDataChange = (field, value) => {
    setBillData((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: '', quantity: 1, price: '' },
    ])
  }

  const handleRemoveItem = (index) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // Auto-recalculate subtotal and total when an item is removed
      const newTotal = next.reduce((sum, it) => {
        const val = parseFloat(String(it.price || '').replace(/[^0-9.]/g, '')) || 0
        return sum + val
      }, 0)
      setBillData((d) => ({
        ...d,
        total: `₹${newTotal.toLocaleString('en-IN')}`,
        subtotal: `₹${newTotal.toLocaleString('en-IN')}`,
      }))
      return next
    })
  }

  const startProcessing = async (shouldFail, file) => {
    setState('processing')
    setErrorMsg('')
    if (shouldFail || !file) {
      window.setTimeout(() => { setErrorMsg('Test failed scan mode was triggered.'); setState('failed') }, 1300)
      return
    }

    const maxClientAttempts = 3
    let lastError = null

    try {
      const preparedFile = await resizeBillImage(file)

      for (let attempt = 1; attempt <= maxClientAttempts; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`[BillCapture] Retrying bill extraction after transient error (attempt ${attempt}/${maxClientAttempts})...`)
            await new Promise((resolve) => setTimeout(resolve, 2500))
          }

          const formData = new FormData()
          formData.append('bill', preparedFile)
          const token = localStorage.getItem('dineq:auth-token')
          const headers = token ? { Authorization: `Bearer ${token}` } : {}
          const result = await fetch('/api/extract-bill', { method: 'POST', headers, body: formData })
          const data = await result.json().catch(() => ({}))

          if (!result.ok) {
            const errMsg = data.error || 'Bill extraction failed'
            const err = new Error(errMsg)
            err.status = result.status
            err.isTransient = result.status === 503 || result.status === 429 || data.isTransient || /503|high demand|service unavailable|overloaded/i.test(errMsg)
            throw err
          }

          const extractedBill = mapGeminiBill(data)
          if (!extractedBill.items.length || extractedBill.total === 'Not detected') {
            throw new Error('Gemini returned incomplete bill data')
          }

          setBillData({
            merchant: extractedBill.merchant || restaurant?.name || 'Restaurant bill',
            billNumber: extractedBill.billNumber || `BILL-${Date.now().toString().slice(-4)}`,
            date: extractedBill.date || new Date().toISOString().slice(0, 10),
            time: extractedBill.time || new Date().toTimeString().slice(0, 5),
            subtotal: extractedBill.subtotal,
            tax: extractedBill.tax,
            total: extractedBill.total,
            payment: extractedBill.payment || 'UPI',
          })
          setItems(extractedBill.items)
          setState('extracted')
          return
        } catch (error) {
          lastError = error
          const isTransient = error.isTransient || error.status === 503 || /503|high demand|service unavailable|overloaded|fetch failed/i.test(error.message)
          if (!isTransient || attempt >= maxClientAttempts) {
            break
          }
          console.warn(`[BillCapture] Transient extraction error on attempt ${attempt}/${maxClientAttempts}, retrying silently in 2.5s:`, error.message)
        }
      }
    } catch (outerErr) {
      lastError = outerErr
    }

    console.error('Bill OCR failed after retries:', lastError)
    setErrorMsg(lastError?.message || 'Bill extraction failed.')
    setState('failed')
  }

  const saveBill = async () => {
    if (isSaving) return
    setIsSaving(true)
    setErrorMsg('')

    const rawTotal = String(billData.total || '').replace(/[^0-9.]/g, '')
    const numTotal = parseFloat(rawTotal) || 0
    const rawSubtotal = String(billData.subtotal || '').replace(/[^0-9.]/g, '')
    const numSubtotal = parseFloat(rawSubtotal) || numTotal
    const rawTax = String(billData.tax || '').replace(/[^0-9.]/g, '')
    const numTax = parseFloat(rawTax) || 0
    const cleanBillNum = String(billData.billNumber || '').trim().replace(/^#/, '') || `BILL-${Date.now().toString().slice(-4)}`
    const cleanDate = billData.date || new Date().toISOString().slice(0, 10)

    const cleanItems = items.map((it) => {
      const rawPrice = String(it.price || '').replace(/[^0-9.]/g, '')
      const priceVal = parseFloat(rawPrice) || 0
      const qtyVal = parseInt(String(it.quantity || '').replace(/[^0-9]/g, ''), 10) || 1
      return {
        name: it.name || 'Custom item',
        item_name: it.name || 'Custom item',
        quantity: qtyVal,
        price: priceVal,
        amount: priceVal,
        rate: qtyVal > 0 ? priceVal / qtyVal : priceVal,
      }
    })

    if (!cleanItems.length) {
      setErrorMsg('Cannot save bill: Please include at least one item.')
      setState('failed')
      setIsSaving(false)
      return
    }

    if (numTotal <= 0) {
      setErrorMsg('Cannot save bill: Total bill amount must be greater than ₹0.')
      setState('failed')
      setIsSaving(false)
      return
    }

    const payload = {
      billNumber: cleanBillNum,
      number: `#${cleanBillNum}`,
      date: cleanDate,
      time: billData.time || new Date().toTimeString().slice(0, 5),
      subtotal: numSubtotal,
      gst: numTax,
      total: numTotal,
      totalLabel: `₹${numTotal.toLocaleString('en-IN')}`,
      itemsCount: cleanItems.length,
      items: cleanItems,
      merchant: billData.merchant || restaurant?.name,
    }

    try {
      const token = localStorage.getItem('dineq:auth-token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const result = await fetch('/api/bills', { method: 'POST', headers, body: JSON.stringify(payload) })
      const resData = await result.json().catch(() => ({}))
      if (!result.ok || resData.persisted === false) {
        throw new Error(resData.error || resData.details || 'Save failed: Database persistence error.')
      }
      onBillSaved?.(resData)
      setState('saved')
    } catch (error) {
      console.error('Bill save failed', error)
      setErrorMsg(error.message)
      setState('save_failed')
    } finally {
      setIsSaving(false)
    }
  }

  const content = {
    capture: <CaptureView onStart={startProcessing} />,
    processing: <ProcessingView />,
    extracted: (
      <ExtractedView
        billData={billData}
        onBillDataChange={handleBillDataChange}
        items={items}
        onItemChange={handleItemChange}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onConfirm={() => {
          setErrorMsg('')
          setState('confirmation')
        }}
      />
    ),
    failed: <FailedView errorMessage={errorMsg} onRetry={() => setState('capture')} />,
    save_failed: (
      <>
        <Stepper current={3} />
        <section className="capture-card failed-card">
          <div className="failure-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><X size={22} /></div>
          <p className="eyebrow" style={{ color: '#ef4444' }}>Database Save Error</p>
          <h2>Could not save this bill</h2>
          <p style={{ maxWidth: 520, margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
            {errorMsg || 'A database error occurred while trying to commit this bill to Supabase. Your bill details are intact.'}
          </p>
          <div className="confirmation-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
            <button type="button" className="secondary-button" onClick={() => setState('confirmation')} disabled={isSaving}>
              <ArrowLeft size={15} />Review bill
            </button>
            <button type="button" className="primary-button" onClick={saveBill} disabled={isSaving}>
              <RefreshCw size={16} className={isSaving ? 'spin' : ''} />
              {isSaving ? 'Retrying...' : 'Retry Saving'}
            </button>
          </div>
        </section>
      </>
    ),
    confirmation: (
      <ConfirmationView
        billData={billData}
        items={items}
        onBack={() => setState('extracted')}
        onSave={saveBill}
        isSaving={isSaving}
        error={errorMsg}
      />
    ),
    saved: (
      <section className="capture-card confirmation-card">
        <div className="success-icon"><Check size={23} /></div>
        <p className="eyebrow">Saved successfully</p>
        <h2>Bill added to your records.</h2>
        <p>Your weekly profit report and overview dashboard have been updated with this {billData.total} bill for {billData.merchant || restaurant?.name || 'your restaurant'}.</p>
        <div className="confirm-summary" style={{ marginTop: 16 }}>
          <div><span>Bill total</span><strong>{billData.total}</strong></div>
          <div><span>Items</span><strong>{items.length} item{items.length === 1 ? '' : 's'}</strong></div>
          <div><span>Restaurant</span><strong>{billData.merchant || restaurant?.name || 'Restaurant'}</strong></div>
          <div><span>Captured</span><strong>{billData.date}</strong></div>
        </div>
        <div className="confirmation-actions" style={{ marginTop: 24 }}>
          <button type="button" className="secondary-button" onClick={() => setState('capture')}>
            Capture another bill
          </button>
          <button type="button" className="primary-button" onClick={() => onNavigate?.('Overview')}>
            View on dashboard <span>→</span>
          </button>
        </div>
      </section>
    ),
  }[state]

  return (
    <div className="app-shell">
      <Sidebar activeLabel="Bill capture" onNavigate={onNavigate} restaurant={restaurant} user={user} onSignOut={onSignOut} />
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
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Bill capture</strong></div>
          <div className="capture-header-status">
            <span className="status-dot" /> {capturedCount} bill{capturedCount === 1 ? '' : 's'} captured this month
          </div>
        </header>
        <div className="dashboard-content bill-content">
          <section className="page-intro bill-intro">
            <div>
              <p className="eyebrow">Bill capture</p>
              <h1>Turn a bill into useful data.</h1>
              <p className="intro-copy">No typing. Just capture the bill and we’ll handle the details.</p>
            </div>
            <div className="capture-count">
              <FileScan size={16} />
              <span>DineIQ Auto-Capture Engine</span>
            </div>
          </section>
          {content}
        </div>
      </main>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Award,
  Bell,
  CheckCheck,
  Clock,
  Loader2,
  Moon,
  PartyPopper,
  Sparkles,
  Trash2,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react'

function formatRelativeTime(isoString) {
  if (!isoString) return 'Just now'
  try {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  } catch {
    return 'Recently'
  }
}

function getTriggerIcon(triggerType) {
  switch (triggerType) {
    case 'best_day_ever':
      return <Trophy size={18} className="notif-icon notif-icon--trophy" />
    case 'weekly_average':
      return <TrendingUp size={18} className="notif-icon notif-icon--trending" />
    case 'license_expiring':
      return <AlertTriangle size={18} className="notif-icon notif-icon--warning" />
    case 'milestone':
      return <PartyPopper size={18} className="notif-icon notif-icon--milestone" />
    case 'daily_summary':
      return <Moon size={18} className="notif-icon notif-icon--summary" />
    default:
      return <Bell size={18} className="notif-icon notif-icon--default" />
  }
}

export function NotificationsPanel({ isOpen, onClose, onNotificationCountChange, isDemo = false }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const panelRef = useRef(null)

  const demoNotifications = [
    {
      id: 'demo-notif-1',
      trigger_type: 'daily_summary',
      title: '🌙 Daily Pulse: ₹42,100',
      message: '27 bills (avg ₹1,559). Garlic Butter Naan was today\'s top seller (36 orders)—consider featuring it in a dinner combo tomorrow.',
      created_at: new Date().toISOString(),
      is_read: false,
      data: {
        aiAdvice: 'Garlic Butter Naan was today\'s top seller (36 orders)—consider featuring it in a dinner combo tomorrow to drive higher ticket sizes.',
      },
    },
    {
      id: 'demo-notif-2',
      trigger_type: 'milestone',
      title: '🎉 Crossed ₹2,00,000 this month!',
      message: '₹2,44,540 recorded this month. Outstanding progress and consistency!',
      created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      is_read: false,
    },
  ]

  const fetchNotifications = async () => {
    if (isDemo) {
      setNotifications(demoNotifications)
      onNotificationCountChange?.(2)
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('dineq:auth-token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/notifications', { headers })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        onNotificationCountChange?.(data.unreadCount || 0)
      }
    } catch (err) {
      console.warn('[notifications] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('.notification-button')) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    onNotificationCountChange?.(0)
    if (isDemo) return
    try {
      const token = localStorage.getItem('dineq:auth-token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ all: true }),
      })
    } catch (err) {
      console.warn('[notifications] mark all read failed:', err)
    }
  }

  const handleMarkOneRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    const newUnread = notifications.filter((n) => n.id !== id && !n.is_read).length
    onNotificationCountChange?.(newUnread)
    if (isDemo) return
    try {
      const token = localStorage.getItem('dineq:auth-token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ notificationId: id }),
      })
    } catch (err) {
      console.warn('[notifications] mark read failed:', err)
    }
  }

  const handleClear = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (isDemo) return
    try {
      const token = localStorage.getItem('dineq:auth-token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      await fetch('/api/notifications/clear', {
        method: 'POST',
        headers,
        body: JSON.stringify({ notificationId: id }),
      })
    } catch (err) {
      console.warn('[notifications] clear failed:', err)
    }
  }

  const handleTriggerDailySummary = async () => {
    setGeneratingSummary(true)
    if (isDemo) {
      setTimeout(() => setGeneratingSummary(false), 500)
      return
    }
    try {
      const token = localStorage.getItem('dineq:auth-token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const res = await fetch('/api/notifications/trigger-daily-summary', {
        method: 'POST',
        headers,
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        onNotificationCountChange?.(data.unreadCount || 0)
      }
    } catch (err) {
      console.warn('[notifications] trigger daily summary failed:', err)
    } finally {
      setGeneratingSummary(false)
    }
  }

  if (!isOpen) return null

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="notifications-dropdown panel" ref={panelRef} role="dialog" aria-label="Notifications Panel">
      <div className="notifications-header">
        <div className="notif-header-title">
          <h3>Notifications</h3>
          {unreadCount > 0 && <span className="notif-unread-pill">{unreadCount} new</span>}
        </div>
        <div className="notif-header-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-action-btn"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <CheckCheck size={14} />
              <span>Read all</span>
            </button>
          )}
          <button
            type="button"
            className="notif-close-btn"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="notif-controls-bar">
        <button
          type="button"
          className="notif-simulate-btn"
          onClick={handleTriggerDailySummary}
          disabled={generatingSummary}
          title="Generates today's end-of-day summary with Gemini AI advice"
        >
          {generatingSummary ? (
            <Loader2 size={13} className="spin" />
          ) : (
            <Sparkles size={13} />
          )}
          <span>{generatingSummary ? 'Consulting Gemini...' : 'Generate Daily Summary (AI)'}</span>
        </button>
        <span className="notif-subtext">Delivery: In-App (WhatsApp stub)</span>
      </div>

      <div className="notifications-list">
        {loading && notifications.length === 0 ? (
          <div className="notif-empty-state">
            <Loader2 size={20} className="spin" />
            <p>Checking notification triggers...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty-state">
            <Bell size={28} className="empty-bell-icon" />
            <p className="empty-primary">No new notifications</p>
            <p className="empty-sub">
              Alerts will appear here when revenue records are broken, weekly averages are beaten, licenses expire, or daily summaries are ready.
            </p>
          </div>
        ) : (
          notifications.map((item) => {
            const isUnread = !item.is_read
            const isDailySummary = item.trigger_type === 'daily_summary'

            return (
              <div
                key={item.id}
                className={`notif-card ${isUnread ? 'is-unread' : 'is-read'} notif-type--${item.trigger_type}`}
                onClick={() => isUnread && handleMarkOneRead(item.id)}
              >
                <div className="notif-card-icon-box">
                  {getTriggerIcon(item.trigger_type)}
                </div>

                <div className="notif-card-body">
                  <div className="notif-card-meta">
                    <span className="notif-time">
                      <Clock size={11} /> {formatRelativeTime(item.created_at)}
                    </span>
                    {isUnread && <span className="notif-dot" title="Unread" />}
                  </div>

                  <h4 className="notif-card-title">{item.title}</h4>
                  <p className="notif-card-msg">{item.message}</p>

                  {isDailySummary && item.data?.aiAdvice && (
                    <div className="notif-ai-badge">
                      <Sparkles size={12} />
                      <span><strong>Gemini Advice:</strong> {item.data.aiAdvice}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="notif-item-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear(item.id)
                  }}
                  title="Dismiss notification"
                  aria-label="Dismiss notification"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

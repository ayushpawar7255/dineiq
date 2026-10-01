import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Send,
  Trash2,
  Database,
  ArrowRight,
  TrendingUp,
  Receipt,
  Utensils,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Menu,
  MessageSquareQuote,
  ShieldCheck,
} from 'lucide-react'
import { Sidebar } from '../components/Sidebar'

const STARTER_PROMPTS = [
  { icon: TrendingUp, title: 'How much did I make this week?', subtitle: 'Weekly revenue & bill volume pulse' },
  { icon: Utensils, title: "What's my best-selling dish?", subtitle: 'Portions sold & top revenue driver' },
  { icon: Calendar, title: 'Compare this month to last month', subtitle: 'Month-over-month performance comparison' },
  { icon: Receipt, title: 'What was my revenue today?', subtitle: "Today's sales & bill capture count" },
  { icon: Database, title: 'How many bills did we capture in September?', subtitle: 'Historical bill count & average value' },
  { icon: ShieldCheck, title: 'What are my monthly fixed expenses?', subtitle: 'Rent, overhead, and operating baseline' },
]

export function AskDineIQ({ onNavigate, restaurant, user, onSignOut }) {
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm **Ask DineIQ**, your direct database intelligence assistant.\n\nAsk me any question about your revenue, dishes, bill counts, or expenses. Every answer is computed in real time directly from your recorded bills — **never estimated or guessed**.`,
      isWelcome: true,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = async (questionText) => {
    const textToSend = String(questionText || input).trim()
    if (!textToSend || loading) return

    const userMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const token = localStorage.getItem('dineq:auth-token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: textToSend }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to query database')
      }

      const assistantMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No data found for this query.',
        plan: data.plan,
        facts: data.facts,
        modelUsed: data.modelUsed,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error('Ask DineIQ query error:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          isError: true,
          content: `Sorry, I encountered an issue querying your records: ${err.message}. Please try asking again.`,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Conversation cleared. Ask any question about your sales, menu, or operating figures to query your real database records.`,
        isWelcome: true,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasUserMessages = messages.some((m) => m.role === 'user')

  return (
    <div className="app-shell">
      <Sidebar
        activeLabel="Ask DineIQ"
        onNavigate={onNavigate}
        restaurant={restaurant}
        user={user}
        onSignOut={onSignOut}
      />
      <main className="dashboard ask-dineiq-main">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('dineiq:toggle-sidebar'))}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="mobile-brand">
            Dine<span>IQ</span>
          </div>
          <div className="breadcrumb">
            <span>Workspace</span>
            <b>/</b>
            <strong>Ask DineIQ</strong>
          </div>
          <div className="ask-topbar-badge" title="Queries run against live database">
            <span className="live-dot" />
            <Database size={13} style={{ color: 'var(--color-orange)' }} />
            <span>Live Database Query Engine</span>
          </div>
        </header>

        <div className="dashboard-content ask-content">
          <div className="ask-chat-container">
            {/* Header description */}
            <div className="ask-chat-header">
              <div className="ask-header-left">
                <span className="ask-header-avatar">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h1 className="ask-title">Ask DineIQ</h1>
                  <p className="ask-subtitle">
                    Natural language analytics for <strong>{restaurant?.name || 'your restaurant'}</strong>. Every number is grounded in your real bills.
                  </p>
                </div>
              </div>
              {hasUserMessages && (
                <button
                  type="button"
                  className="ask-clear-btn"
                  onClick={handleClearHistory}
                  title="Clear conversation history"
                >
                  <Trash2 size={14} />
                  <span>Clear chat</span>
                </button>
              )}
            </div>

            {/* Chat message stream */}
            <div className="ask-message-list">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`ask-message-row ask-message-row--${msg.role}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="ask-avatar ask-avatar--assistant">
                      <Sparkles size={16} />
                    </div>
                  )}

                  <div className={`ask-bubble ask-bubble--${msg.role} ${msg.isError ? 'ask-bubble--error' : ''}`}>
                    <div className="ask-bubble-text">
                      {msg.content.split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx}>
                          {paragraph.split('\n').map((line, lIdx) => (
                            <span key={lIdx}>
                              {renderFormattedText(line)}
                              {lIdx < paragraph.split('\n').length - 1 && <br />}
                            </span>
                          ))}
                        </p>
                      ))}
                    </div>

                    {/* Verified Metrics Fact Card */}
                    {msg.facts?.primaryPeriod && (
                      <div className="ask-fact-card">
                        <div className="ask-fact-card-header">
                          <span className="fact-badge">
                            <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                            <span>Verified from Bills Database</span>
                          </span>
                          <span className="fact-period">
                            📅 {msg.facts.primaryPeriod.label}
                          </span>
                        </div>

                        <div className="ask-fact-metrics">
                          <div className="fact-metric">
                            <small>Revenue</small>
                            <strong>₹{msg.facts.primaryPeriod.revenue.toLocaleString('en-IN')}</strong>
                          </div>
                          <div className="fact-metric">
                            <small>Bills</small>
                            <strong>{msg.facts.primaryPeriod.billsCount}</strong>
                          </div>
                          <div className="fact-metric">
                            <small>Avg Bill</small>
                            <strong>₹{msg.facts.primaryPeriod.avgBillValue.toLocaleString('en-IN')}</strong>
                          </div>
                          {msg.facts.primaryPeriod.bestDish && (
                            <div className="fact-metric fact-metric--highlight">
                              <small>Top Dish</small>
                              <strong>{msg.facts.primaryPeriod.bestDish.name}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="ask-bubble-meta">
                      <span>{msg.timestamp}</span>
                      {msg.modelUsed && (
                        <span>• Grounded via {msg.modelUsed}</span>
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="ask-avatar ask-avatar--user">
                      <span>{(user?.email?.[0] || 'U').toUpperCase()}</span>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="ask-message-row ask-message-row--assistant">
                  <div className="ask-avatar ask-avatar--assistant">
                    <Sparkles size={16} />
                  </div>
                  <div className="ask-bubble ask-bubble--assistant ask-bubble--loading">
                    <div className="ask-typing-indicator">
                      <Loader2 size={16} className="spin" style={{ color: 'var(--color-orange)' }} />
                      <span>Querying database & computing verified figures…</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Starter question chips (shown when no user queries yet) */}
            {!hasUserMessages && (
              <div className="ask-starter-section">
                <p className="starter-label">Try asking questions like:</p>
                <div className="ask-starter-grid">
                  {STARTER_PROMPTS.map((prompt) => {
                    const Icon = prompt.icon
                    return (
                      <button
                        key={prompt.title}
                        type="button"
                        className="ask-starter-chip"
                        onClick={() => handleSend(prompt.title)}
                      >
                        <div className="starter-chip-icon">
                          <Icon size={15} />
                        </div>
                        <div className="starter-chip-content">
                          <strong>{prompt.title}</strong>
                          <small>{prompt.subtitle}</small>
                        </div>
                        <ArrowRight size={13} className="starter-arrow" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Chat Input Dock */}
            <div className="ask-input-dock">
              <form
                className="ask-input-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your revenue, dishes, bills, or profit (e.g. 'How much did I make yesterday?')..."
                  rows={1}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="ask-send-btn"
                  disabled={!input.trim() || loading}
                  aria-label="Send question"
                >
                  {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                </button>
              </form>
              <div className="ask-input-hints">
                <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line</span>
                <span>All answers derived strictly from recorded restaurant data</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function renderFormattedText(text) {
  // Simple markdown bold parser **bold**
  if (!text.includes('**')) return text
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

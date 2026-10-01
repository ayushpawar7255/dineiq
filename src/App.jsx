import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import './App.css'
import { Auth } from './pages/Auth'
import { LandingPage } from './pages/LandingPage'
import { BillCapture } from './pages/BillCapture'
import { AnalyticsDashboard } from './pages/AnalyticsDashboard'
import { AskDineIQ } from './pages/AskDineIQ'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'

function App() {
  const [screen, setScreen] = useState('Overview')
  const [user, setUser] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [savedBill, setSavedBill] = useState(null)

  // Auth flow states for visitors
  const [authView, setAuthView] = useState('landing') // 'landing' | 'auth'
  const [authInitialMode, setAuthInitialMode] = useState('signup') // 'signin' | 'signup'

  // Hash / URL detection
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || ''
      const search = window.location.search || ''
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setAuthView('auth')
        setAuthInitialMode('reset')
        return
      }
      if (hash.includes('signup') || hash.includes('register') || hash.includes('start')) {
        setAuthView('auth')
        setAuthInitialMode('signup')
      } else if (hash.includes('signin') || hash.includes('login') || hash.includes('auth')) {
        setAuthView('auth')
        setAuthInitialMode('signin')
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    let active = true
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery')
    if (isRecovery) {
      localStorage.removeItem('dineq:auth-token')
      localStorage.removeItem('dineq:auth-user')
      setUser(null)
      setSessionChecked(true)
      setAuthView('auth')
      return
    }

    const token = localStorage.getItem('dineq:auth-token')
    if (!token) {
      setSessionChecked(true)
      return
    }

    const checkSessionWithRetry = async () => {
      let attempts = 0
      const maxAttempts = 3
      while (attempts < maxAttempts && active) {
        attempts++
        try {
          if (attempts > 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
          const res = await fetch('/api/auth/session', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.status === 401 || res.status === 403) {
            // Explicitly unauthorized / invalid token
            if (active) {
              localStorage.removeItem('dineq:auth-token')
              localStorage.removeItem('dineq:auth-user')
              setSessionChecked(true)
            }
            return
          }
          if (res.ok) {
            const data = await res.json().catch(() => null)
            if (active && data?.user) {
              setUser(data.user)
              if (data.restaurant) setRestaurant(data.restaurant)
            }
            if (active) setSessionChecked(true)
            return
          }
          // If 503/502/504 (cold start), loop will retry after delay
          console.warn(`[App] Session check got HTTP ${res.status}, retrying cold start (${attempts}/${maxAttempts})...`)
        } catch (err) {
          console.warn(`[App] Session check network glitch (${attempts}/${maxAttempts}):`, err.message)
        }
      }
      if (active) {
        // If server remained down after all retries, keep token for next refresh
        setSessionChecked(true)
      }
    }

    checkSessionWithRetry()

    return () => {
      active = false
    }
  }, [])

  const handleGetStarted = (mode = 'signup') => {
    setAuthInitialMode(mode)
    setAuthView('auth')
    window.location.hash = `#${mode}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSignIn = () => {
    setAuthInitialMode('signin')
    setAuthView('auth')
    window.location.hash = '#signin'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBackToLanding = () => {
    setAuthView('landing')
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAuthSuccess = (authData) => {
    const { token, user: authUser, restaurant: authRest, isNewUser } = authData
    if (token) localStorage.setItem('dineq:auth-token', token)
    if (authUser) {
      localStorage.setItem('dineq:auth-user', JSON.stringify(authUser))
      setUser(authUser)
    }
    if (authRest) setRestaurant(authRest)

    // Clear hash after successful login/signup so root URL represents dashboard
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }

    if (isNewUser) {
      setIsOnboarding(true)
      setScreen('Settings')
    } else {
      setIsOnboarding(false)
      setScreen('Overview')
    }
  }

  const handleSignOut = async () => {
    const token = localStorage.getItem('dineq:auth-token')
    if (token) {
      fetch('/api/auth/signout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem('dineq:auth-token')
    localStorage.removeItem('dineq:auth-user')
    setUser(null)
    setRestaurant(null)
    setIsOnboarding(false)
    setScreen('Overview')
    setAuthView('landing')
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  const handleRestaurantUpdated = (updated) => {
    setRestaurant((prev) => ({ ...(prev || {}), ...updated }))
    setIsOnboarding(false)
  }

  const handleNavigate = (nextScreen) => {
    setScreen(nextScreen)
  }

  const handleBillSaved = (bill) => {
    const flat = {
      number: bill.number,
      time: bill.time,
      date: bill.date,
      items: bill.itemsCount ?? (Array.isArray(bill.items) ? bill.items.length : 0),
      total: bill.totalLabel ?? (typeof bill.total === 'number' ? `₹${bill.total.toLocaleString('en-IN')}` : bill.total),
    }
    setSavedBill(flat)
  }

  // Loading initial session check
  if (!sessionChecked) {
    return (
      <div className="auth-loading-screen">
        <Loader2 size={32} className="spin" style={{ color: 'var(--color-orange)' }} />
        <span>Connecting to DineIQ…</span>
      </div>
    )
  }

  // Unauthenticated visitors: Landing Page or Auth (Sign In / Sign Up)
  if (!user) {
    if (authView === 'auth') {
      return (
        <Auth
          onAuthSuccess={handleAuthSuccess}
          initialMode={authInitialMode}
          onBackToLanding={handleBackToLanding}
        />
      )
    }
    return (
      <LandingPage
        onGetStarted={handleGetStarted}
        onSignIn={handleSignIn}
      />
    )
  }

  // Authenticated users: directly in Dashboard
  if (screen === 'Bill capture') {
    return (
      <BillCapture
        onNavigate={handleNavigate}
        onBillSaved={handleBillSaved}
        restaurant={restaurant}
        user={user}
        onSignOut={handleSignOut}
      />
    )
  }
  if (screen === 'Ask DineIQ') {
    return (
      <AskDineIQ
        onNavigate={handleNavigate}
        restaurant={restaurant}
        user={user}
        onSignOut={handleSignOut}
      />
    )
  }
  if (screen === 'Reports') {
    return (
      <Reports
        onNavigate={handleNavigate}
        restaurant={restaurant}
        user={user}
        onSignOut={handleSignOut}
        onRestaurantUpdated={handleRestaurantUpdated}
      />
    )
  }
  if (screen === 'Settings') {
    return (
      <Settings
        onNavigate={handleNavigate}
        restaurant={restaurant}
        user={user}
        onSignOut={handleSignOut}
        onRestaurantUpdated={handleRestaurantUpdated}
        isOnboarding={isOnboarding}
      />
    )
  }
  return (
    <AnalyticsDashboard
      onNavigate={handleNavigate}
      savedBill={savedBill}
      restaurant={restaurant}
      user={user}
      onSignOut={handleSignOut}
      onRestaurantUpdated={handleRestaurantUpdated}
    />
  )
}

export default App

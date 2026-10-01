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

    fetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) {
          if (data?.user) {
            setUser(data.user)
            if (data.restaurant) setRestaurant(data.restaurant)
          } else {
            localStorage.removeItem('dineq:auth-token')
            localStorage.removeItem('dineq:auth-user')
          }
          setSessionChecked(true)
        }
      })
      .catch((err) => {
        if (active) {
          console.warn('Session check failed:', err)
          setSessionChecked(true)
        }
      })

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

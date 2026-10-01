import { useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, Store, User, Utensils } from 'lucide-react'

export function Auth({ onAuthSuccess, initialRecoveryToken, initialMode = 'signin', onBackToLanding }) {
  const [mode, setMode] = useState(initialRecoveryToken ? 'reset' : initialMode) // 'signin' | 'signup' | 'forgot' | 'reset'
  const [recoveryToken, setRecoveryToken] = useState(initialRecoveryToken || null)
  const [resetSent, setResetSent] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!initialRecoveryToken && initialMode) {
      setMode(initialMode)
    }
  }, [initialMode, initialRecoveryToken])

  useEffect(() => {
    const parseRecoveryToken = () => {
      if (typeof window === 'undefined') return
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
      const params = new URLSearchParams(hash || window.location.search)
      const type = params.get('type')
      const token = params.get('token') || params.get('access_token')
      if (type === 'recovery' && token) {
        setRecoveryToken(token)
        setMode('reset')
        setError('')
      }
    }
    parseRecoveryToken()
    window.addEventListener('hashchange', parseRecoveryToken)
    return () => window.removeEventListener('hashchange', parseRecoveryToken)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim()

    // 1. Forgot password request (sends email link ONLY)
    if (mode === 'forgot') {
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setError('Please enter a valid email address.')
        return
      }
      setLoading(true)
      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send reset link.')
        }
        setResetSent(true)
      } catch (err) {
        console.error('Forgot password error:', err)
        setError(err.message || 'Unable to send reset link. Please try again.')
      } finally {
        setLoading(false)
      }
      return
    }

    // 2. Set new password (REQUIRES verified recovery token from email link)
    if (mode === 'reset') {
      if (!recoveryToken) {
        setError('No verified password reset link found. Please click the link sent to your email.')
        return
      }
      if (!password) {
        setError('Please enter your new password.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please check again.')
        return
      }
      setLoading(true)
      try {
        const response = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: recoveryToken, newPassword: password }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update password.')
        }
        // Clear recovery token from address bar
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname)
        }
        onAuthSuccess?.(data)
      } catch (err) {
        console.error('Update password error:', err)
        setError(err.message || 'Unable to update password. Please check your reset link.')
      } finally {
        setLoading(false)
      }
      return
    }

    // 3. Normal Signin / Signup
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match. Please check again.')
      return
    }

    setLoading(true)
    try {
      const endpoint = mode === 'signin' ? '/api/auth/signin' : '/api/auth/signup'
      const payload = mode === 'signin'
        ? { email: cleanEmail, password }
        : {
            email: cleanEmail,
            password,
            restaurantName: restaurantName.trim(),
            ownerName: ownerName.trim(),
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please try again.')
      }

      onAuthSuccess?.(data)
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message || 'Unable to complete request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setResetSent(false)
  }

  return (
    <div className="auth-shell">
      <div className="auth-container">
        {onBackToLanding && (
          <button
            type="button"
            className="auth-back-to-landing-btn"
            onClick={onBackToLanding}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '0.8125rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              marginBottom: '16px',
              padding: '6px 12px',
              borderRadius: '6px',
              alignSelf: 'center',
              transition: 'color 0.15s ease',
            }}
          >
            ← Back to DineIQ Home
          </button>
        )}
        <div
          className="auth-brand"
          onClick={onBackToLanding}
          style={{ cursor: onBackToLanding ? 'pointer' : 'default' }}
          title={onBackToLanding ? 'Return to DineIQ Home' : undefined}
        >
          <span className="auth-brand-mark">
            <Utensils size={20} />
          </span>
          <span className="auth-brand-text">
            Dine<span>IQ</span>
          </span>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <h1>
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && (resetSent ? 'Check your email' : 'Forgot password')}
              {mode === 'reset' && 'Set new password'}
            </h1>
            <p>
              {mode === 'signin' && 'Sign in to access your restaurant pulse & reports.'}
              {mode === 'signup' && 'Get started with automated bill capture & intelligence.'}
              {mode === 'forgot' && (resetSent
                ? `We sent a password reset link to ${email}. Open the link in your inbox to set a new password.`
                : 'Enter your email address to receive a secure password reset link.')}
              {mode === 'reset' && 'Your email has been verified. Choose a new password for your account.'}
            </p>
          </div>

          {mode !== 'reset' && !resetSent && (
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                className={`auth-tab ${mode === 'signin' ? 'is-active' : ''}`}
                onClick={() => switchMode('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === 'signup' ? 'is-active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                Create account
              </button>
            </div>
          )}

          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'forgot' && resetSent ? (
            <div className="auth-success-card">
              <div className="auth-success-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--color-orange, #f97316)' }}>
                <CheckCircle2 size={40} />
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary, #a1a1aa)', marginBottom: 20 }}>
                Please check your inbox. Only clicking the verified link will allow you to change your password.
              </p>
              <button
                type="button"
                className="secondary-button"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => switchMode('signin')}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {mode === 'signup' && (
                <>
                  <label className="auth-field">
                    <span>Restaurant name</span>
                    <div className="auth-input-wrap">
                      <Store size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="e.g. Mr. Sandwhich"
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </label>

                  <label className="auth-field">
                    <span>Owner name</span>
                    <div className="auth-input-wrap">
                      <User size={16} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="e.g. Arjun Kumar"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </label>
                </>
              )}

              {mode !== 'reset' && (
                <label className="auth-field">
                  <span>Email address</span>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="owner@yourrestaurant.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </label>
              )}

              {mode !== 'forgot' && (
                <label className="auth-field">
                  <div className="auth-field-header">
                    <span>{mode === 'reset' ? 'New password' : 'Password'}</span>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        className="auth-forgot-link"
                        onClick={() => switchMode('forgot')}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      placeholder={mode === 'signin' ? 'Enter password' : 'At least 6 characters'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              )}

              {(mode === 'signup' || mode === 'reset') && (
                <label className="auth-field">
                  <span>Confirm {mode === 'reset' ? 'new password' : 'password'}</span>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </label>
              )}

              <button
                type="submit"
                className="primary-button auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    {mode === 'signin' && 'Signing in…'}
                    {mode === 'signup' && 'Creating account…'}
                    {mode === 'forgot' && 'Sending reset link…'}
                    {mode === 'reset' && 'Saving password…'}
                  </>
                ) : (
                  <>
                    {mode === 'signin' && 'Sign in'}
                    {mode === 'signup' && 'Create account & setup profile'}
                    {mode === 'forgot' && 'Send reset link'}
                    {mode === 'reset' && 'Save password & sign in'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="auth-footer">
            {mode === 'signin' && (
              <p>
                First time using DineIQ?{' '}
                <button type="button" onClick={() => switchMode('signup')}>
                  Create an account
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && !resetSent && (
              <p>
                Remember your password?{' '}
                <button type="button" onClick={() => switchMode('signin')}>
                  Back to sign in
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <p>
                <button type="button" onClick={() => switchMode('signin')}>
                  Back to sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

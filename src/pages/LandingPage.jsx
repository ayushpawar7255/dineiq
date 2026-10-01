import React, { useState, useEffect } from 'react'
import {
  Utensils,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Star,
  Users,
  BarChart3,
  Store,
  X,
  Mail,
  Phone,
  MapPin,
  Menu as MenuIcon,
  Flame,
  Coffee,
  Pizza,
  Wine,
  FileCheck,
  Smartphone,
  Eye,
} from 'lucide-react'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import './LandingPage.css'

export function LandingPage({ onGetStarted, onSignIn }) {
  const [pricingCycle, setPricingCycle] = useState('monthly') // 'monthly' | 'annual'
  const [activeRestaurantType, setActiveRestaurantType] = useState('dining')
  const [openFaq, setOpenFaq] = useState(0)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [contactSubmitted, setContactSubmitted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Interactive Calculator State
  const [monthlyRevenue, setMonthlyRevenue] = useState(650000) // ₹6.5 Lakh
  const [foodCostPct, setFoodCostPct] = useState(36) // 36%

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    setMobileMenuOpen(false)
    const element = document.getElementById(id)
    if (element) {
      const topOffset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - topOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  // Savings calculation for interactive calculator
  // Recovering 3.5% of food wastage & margin leak
  const estimatedSavings = Math.round(monthlyRevenue * 0.038)
  const annualSavings = estimatedSavings * 12

  const restaurantTypes = {
    dining: {
      name: 'Fine Dine & Casual Dining',
      icon: Utensils,
      badge: 'High AOV & Table Turnover',
      headline: 'Stop losing margin on heavy ingredient creep and high table-wait costs.',
      description:
        'Full service dining involves complex recipe costings, high dairy/meat costs, and varying portion sizes. DineIQ gives you recipe-level gross margins and pinpoints exact food cost inflation weekly.',
      bulletPoints: [
        'Live tracking of dairy, meat, and cooking oil price variations',
        'Table AOV breakdown and waiter sales performance',
        'Automatic ingredient yield loss & kitchen waste tracking',
      ],
      quote:
        '“We realized our Dal Makhani butter portions were eating 18% more margin than calculated. DineIQ spotted it within 4 days.”',
      author: 'Rajesh Sharma, Owner of Sharma’s Kitchen, Bengaluru',
    },
    qsr: {
      name: 'Quick Service & Cafes',
      icon: Coffee,
      badge: 'High Volume & Tight Margins',
      headline: 'Track rapid-fire counter orders, combo profitability, and wastage.',
      description:
        'When you sell hundreds of burgers, rolls, or coffees a day, a ₹3 loss per item equals ₹60,000 vanished every month. DineIQ audits every combo and identifies low-margin anchors.',
      bulletPoints: [
        'Real-time counter velocity & peak lunch/dinner surge metrics',
        'Beverage & addon profitability analyzer',
        'Instant end-of-day thermal POS bill reconciliation',
      ],
      quote:
        '“Our combo meal looked like our best seller, but after DineIQ audited packaging and cheese sauce, we retuned pricing and boosted monthly net profit by ₹42,000.”',
      author: 'Karan Mehra, Founder of The Daily Grind Cafe, Delhi NCR',
    },
    cloud: {
      name: 'Cloud Kitchens & Delivery',
      icon: Pizza,
      badge: 'Multi-Brand & Commission Control',
      headline: 'Unmask the true net revenue after Swiggy, Zomato, and packaging bites.',
      description:
        'Aggregator payouts are notoriously confusing with hidden commissions, discounts, and ad spend. DineIQ breaks down your net bank take-home vs gross sales so you never deliver at a loss.',
      bulletPoints: [
        'Net margin after aggregator deductions & platform ad spends',
        'Packaging cost tracking per order format',
        'Multi-brand cloud kitchen consolidated P&L in one screen',
      ],
      quote:
        '“I run 3 virtual brands from 1 kitchen. DineIQ showed me that Brand #2 was bleeding cash after aggregator discounts. We fixed it immediately.”',
      author: 'Vikram Joshi, CloudCrafters, Mumbai',
    },
    sweets: {
      name: 'Bakeries & Sweet Shops',
      icon: Flame,
      badge: 'Batch Shelf-Life & Festive Spikes',
      headline: 'Eliminate over-production wastage and master festive demand spikes.',
      description:
        'Sweets and bakery goods have short shelf lives and intense raw material swings in ghee, dry fruits, and chocolate. DineIQ predicts exact batch volumes based on historical day trends.',
      bulletPoints: [
        'Batch production forecasting against day-of-week sales',
        'High-value raw material usage audit (Kaju, Pista, Pure Ghee)',
        'Diwali & wedding festive season profit simulators',
      ],
      quote:
        '“We cut our unsold evening bakery discards by 35% using DineIQ’s day-by-day weekday volume patterns.”',
      author: 'Anita Agarwal, Anand Sweets & Bakery, Hyderabad',
    },
    bars: {
      name: 'Bars & Breweries',
      icon: Wine,
      badge: 'Keg Yield & Pour Cost Accuracy',
      headline: 'Prevent bar leakage, unrecorded pours, and monitor beverage margins.',
      description:
        'Liquor carries your highest profit margin, but unrecorded free pours and keg foam waste can kill your bottom line. DineIQ matches bottle inventory against POS sales with pin-point accuracy.',
      bulletPoints: [
        'Pour cost percentage monitoring across spirits, cocktails & beer',
        'Weekend night revenue velocity vs weekday happy hours',
        'License & excise compliance alert tracking',
      ],
      quote:
        '“Pour cost dropped from 28% to 21% once our staff knew DineIQ cross-referenced every register bill against daily bottle counts.”',
      author: 'Rohit Shenoy, Taproom 21, Pune',
    },
  }

  const activeTypeData = restaurantTypes[activeRestaurantType]
  const ActiveIcon = activeTypeData.icon

  const handleContactSubmit = (e) => {
    e.preventDefault()
    setContactSubmitted(true)
    setTimeout(() => {
      setIsContactOpen(false)
      setContactSubmitted(false)
    }, 2800)
  }

  return (
    <div className="landing-page-root">
      {/* Background glow effects */}
      <div className="landing-ambient-glow-top" />
      <div className="landing-ambient-glow-mid" />

      {/* =========================================================================
          1. NAVIGATION BAR
          ========================================================================= */}
      <header className={`landing-navbar ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="landing-nav-container">
          <div className="landing-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="landing-brand-mark">
              <Utensils size={18} />
            </span>
            <span className="landing-brand-text">
              Dine<span>IQ</span>
            </span>
            <span className="landing-brand-badge">India</span>
          </div>

          <nav className="landing-nav-links">
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="landing-nav-link">
              How it works
            </button>
            <button type="button" onClick={() => scrollToSection('problems')} className="landing-nav-link">
              Why DineIQ
            </button>
            <button type="button" onClick={() => scrollToSection('built-for-everyone')} className="landing-nav-link">
              Solutions
            </button>
            <button type="button" onClick={() => scrollToSection('pricing')} className="landing-nav-link">
              Pricing
            </button>
            <button type="button" onClick={() => setIsContactOpen(true)} className="landing-nav-link">
              Contact
            </button>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="landing-signin-btn"
              onClick={() => (onSignIn ? onSignIn() : onGetStarted('signin'))}
            >
              Sign In
            </button>
            <button
              type="button"
              className="landing-cta-primary landing-nav-cta"
              onClick={() => onGetStarted('signup')}
            >
              <span>Start Free</span>
              <ArrowUpRight size={16} />
            </button>

            <button
              type="button"
              className="landing-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <MenuIcon size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="landing-mobile-drawer">
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="landing-mobile-link">
              How it works
            </button>
            <button type="button" onClick={() => scrollToSection('problems')} className="landing-mobile-link">
              Why DineIQ
            </button>
            <button type="button" onClick={() => scrollToSection('built-for-everyone')} className="landing-mobile-link">
              Restaurant Solutions
            </button>
            <button type="button" onClick={() => scrollToSection('pricing')} className="landing-mobile-link">
              Pricing & Plans
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                setIsContactOpen(true)
              }}
              className="landing-mobile-link"
            >
              Contact Support
            </button>
            <div className="landing-mobile-actions">
              <button
                type="button"
                className="landing-signin-btn full-w"
                onClick={() => {
                  setMobileMenuOpen(false)
                  if (onSignIn) {
                    onSignIn()
                  } else {
                    onGetStarted('signin')
                  }
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className="landing-cta-primary full-w"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onGetStarted('signup')
                }}
              >
                <span>Start Free — 14 days</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="landing-main-content">
        {/* =========================================================================
            2. HERO SECTION
            ========================================================================= */}
        <section className="landing-hero-section">
          <div className="landing-hero-container">
            {/* Live across India pill */}
            <div className="landing-live-badge-wrapper">
              <div className="landing-live-badge">
                <span className="landing-live-pulse-dot" />
                <span>Now live across India</span>
                <span className="landing-live-dot-divider">•</span>
                <span className="landing-live-accent">Trusted by 250+ F&B Outlets</span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="landing-hero-headline">
              Your restaurant makes money. <br className="hide-mobile" />
              Do you know <span className="landing-text-highlight">exactly how much?</span>
            </h1>

            {/* Subtext */}
            <p className="landing-hero-subtext">
              DineIQ connects to your billing data and tells you your real profit, top dishes,
              and where your money is going — every single week, automatically.
            </p>

            {/* Hero CTAs */}
            <div className="landing-hero-cta-group">
              <button
                type="button"
                className="landing-cta-primary landing-hero-main-cta"
                onClick={() => onGetStarted('signup')}
              >
                <span>Start Free — 14 days</span>
                <ArrowUpRight size={18} />
              </button>
              <button
                type="button"
                className="landing-cta-secondary"
                onClick={() => scrollToSection('dashboard-preview')}
              >
                <span>Explore Live Preview</span>
                <Eye size={16} />
              </button>
            </div>

            {/* Trust indicators */}
            <div className="landing-trust-pills">
              <div className="trust-pill">
                <Clock size={14} className="trust-icon" />
                <span>2 min setup</span>
              </div>
              <span className="trust-dot">•</span>
              <div className="trust-pill">
                <ShieldCheck size={14} className="trust-icon" />
                <span>Cancel anytime</span>
              </div>
              <span className="trust-dot">•</span>
              <div className="trust-pill">
                <span className="flag-badge">🇮🇳</span>
                <span>Made in India</span>
              </div>
              <span className="trust-dot hide-mobile">•</span>
              <div className="trust-pill hide-mobile">
                <CheckCircle2 size={14} className="trust-icon" />
                <span>No POS change needed</span>
              </div>
            </div>

            {/* =========================================================================
                HERO VISUAL: STYLIZED DASHBOARD MOCKUP
                ========================================================================= */}
            <div id="dashboard-preview" className="landing-mockup-wrapper">
              {/* Floating Insight Pill 1 */}
              <div className="landing-floating-card floating-top-left">
                <div className="floating-card-icon positive">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <div className="floating-card-title">Food Cost Saved</div>
                  <div className="floating-card-val">₹24,800 this month</div>
                </div>
              </div>

              {/* Floating Insight Pill 2 */}
              <div className="landing-floating-card floating-bottom-right">
                <div className="floating-card-icon orange">
                  <Flame size={16} />
                </div>
                <div>
                  <div className="floating-card-title">Top Winner Dish</div>
                  <div className="floating-card-val">Butter Chicken (68% Margin)</div>
                </div>
              </div>

              {/* App Mockup Window Frame */}
              <div className="landing-app-frame">
                {/* Browser Top Window Bar */}
                <div className="mockup-window-header">
                  <div className="mockup-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </div>
                  <div className="mockup-address-bar">
                    <span className="mockup-lock-icon">🔒</span>
                    <span className="mockup-url">app.dineiq.in/overview</span>
                    <span className="mockup-live-indicator">LIVE INTERACTIVE DEMO</span>
                  </div>
                  <div className="mockup-actions-fake">
                    <button
                      type="button"
                      className="mockup-cta-chip"
                      onClick={() => onGetStarted?.('signup')}
                    >
                      Start Free Trial →
                    </button>
                  </div>
                </div>

                {/* Actual Real Dashboard Component in Demo Mode */}
                <div className="landing-hero-demo-container">
                  <AnalyticsDashboard isDemo={true} onNavigate={onGetStarted} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. PROBLEM SECTION ("THE PROBLEM")
            ========================================================================= */}
        <section id="problems" className="landing-problem-section">
          <div className="landing-section-container">
            <div className="landing-section-header">
              <span className="landing-eyebrow-pill">THE PROBLEM</span>
              <h2 className="landing-section-title">
                Most owners run their restaurant <br />
                <span className="landing-text-highlight">completely blind</span>
              </h2>
              <p className="landing-section-subtitle">
                You work 14 hours a day. But at month end — the profit surprises you.
                That ends now.
              </p>
            </div>

            <div className="landing-problem-grid">
              {/* Card 01 */}
              <div className="landing-problem-card">
                <div className="problem-card-badge">
                  <span className="problem-number">01</span>
                  <span className="problem-emoji">💸</span>
                </div>
                <h3 className="problem-card-title">Busy week, low profit</h3>
                <p className="problem-card-desc">
                  Hundreds of orders, packed tables, and roaring kitchens — but at month end the bank balance shocks you.
                  You don’t know where the hard-earned money disappeared.
                </p>
                <div className="problem-card-footer">
                  <span className="problem-leak-tag">Hidden Leak:</span>
                  <span>Unnoticed ingredient inflation & aggregator cuts</span>
                </div>
              </div>

              {/* Card 02 */}
              <div className="landing-problem-card">
                <div className="problem-card-badge">
                  <span className="problem-number">02</span>
                  <span className="problem-emoji">🍲</span>
                </div>
                <h3 className="problem-card-title">No idea which dish wins</h3>
                <p className="problem-card-desc">
                  You guess which dishes are popular by counter chatter. But which one actually makes you real money
                  after subtracting dairy, meat, gas, and spices?
                </p>
                <div className="problem-card-footer">
                  <span className="problem-leak-tag">Cost Trap:</span>
                  <span>High-volume dishes hiding 40% margin deficits</span>
                </div>
              </div>

              {/* Card 03 */}
              <div className="landing-problem-card">
                <div className="problem-card-badge">
                  <span className="problem-number">03</span>
                  <span className="problem-emoji">📊</span>
                </div>
                <h3 className="problem-card-title">No track of data at all</h3>
                <p className="problem-card-desc">
                  Rent, kitchen salaries, electricity, supplier slips on WhatsApp, and vendor bills on paper.
                  Zero single consolidated view of real costs versus real revenue.
                </p>
                <div className="problem-card-footer">
                  <span className="problem-leak-tag">Chaos Cost:</span>
                  <span>Delayed accounting prevents quick corrective action</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. STATS / TRUST ROW
            ========================================================================= */}
        <section className="landing-stats-section">
          <div className="landing-section-container">
            <div className="landing-stats-grid">
              <div className="landing-stat-box">
                <div className="stat-big-number">2min</div>
                <div className="stat-label">Average setup time</div>
                <div className="stat-sub">Zero POS modifications or complex IT required</div>
              </div>

              <div className="landing-stat-box highlight-orange">
                <div className="stat-big-number">Every Month</div>
                <div className="stat-label">Automatic profit report</div>
                <div className="stat-sub">Instant PDF & WhatsApp performance intelligence</div>
              </div>

              <div className="landing-stat-box">
                <div className="stat-big-number">₹999</div>
                <div className="stat-label">Starting price / month</div>
                <div className="stat-sub">Less than the revenue of a single 4-person table</div>
              </div>

              <div className="landing-stat-box">
                <div className="stat-big-number">7.5M+</div>
                <div className="stat-label">Restaurants need this</div>
                <div className="stat-sub">Food businesses across India navigating blind margins</div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. HOW IT WORKS SECTION (3-STEP SIMPLE PROCESS)
            ========================================================================= */}
        <section id="how-it-works" className="landing-how-section">
          <div className="landing-section-container">
            <div className="landing-section-header">
              <span className="landing-eyebrow-pill">HOW IT WORKS</span>
              <h2 className="landing-section-title">
                From scattered bills to <span className="landing-text-highlight">total profit clarity</span> in 3 steps
              </h2>
              <p className="landing-section-subtitle">
                No software engineering degree needed. Designed for busy restaurant owners and managers on the move.
              </p>
            </div>

            <div className="landing-steps-grid">
              {/* Step 1 */}
              <div className="landing-step-card">
                <div className="step-counter">01</div>
                <div className="step-icon-wrap">
                  <Smartphone size={24} />
                </div>
                <h3>Snap or upload your bills</h3>
                <p>
                  Take a photo of physical kitchen bills, counter receipts, or simply drag and drop daily POS sales exports (Petpooja, Posist, Vyapar, CSV, or PDFs).
                </p>
                <div className="step-feature-tag">Supports paper thermal slips & camera photos</div>
              </div>

              {/* Step 2 */}
              <div className="landing-step-card">
                <div className="step-counter">02</div>
                <div className="step-icon-wrap">
                  <Sparkles size={24} />
                </div>
                <h3>AI analyzes items & costs</h3>
                <p>
                  DineIQ’s restaurant-trained intelligence breaks down every dish sold, parses GST, deductions, customer discounts, and matches food cost benchmarks.
                </p>
                <div className="step-feature-tag">Under 30 seconds processing per batch</div>
              </div>

              {/* Step 3 */}
              <div className="landing-step-card">
                <div className="step-counter">03</div>
                <div className="step-icon-wrap">
                  <BarChart3 size={24} />
                </div>
                <h3>Wake up to exact profit</h3>
                <p>
                  See your real net profit, daily sales calendar, winning high-margin items, and early warning alerts before leaks harm your month-end bank balance.
                </p>
                <div className="step-feature-tag">Actionable recommendations on your phone</div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. "BUILT FOR EVERYONE" SECTION
            ========================================================================= */}
        <section id="built-for-everyone" className="landing-built-section">
          <div className="landing-section-container">
            <div className="landing-section-header">
              <span className="landing-eyebrow-pill">BUILT FOR EVERYONE</span>
              <h2 className="landing-section-title">
                Works for <span className="landing-text-highlight">your restaurant</span> — whatever type it is
              </h2>
              <p className="landing-section-subtitle">
                Get ready to track your data like never before. Tailored workflows for every Indian food & beverage business.
              </p>
            </div>

            {/* Type selector tabs */}
            <div className="landing-tabs-container">
              {Object.keys(restaurantTypes).map((key) => {
                const item = restaurantTypes[key]
                const Icon = item.icon
                return (
                  <button
                    key={key}
                    type="button"
                    className={`landing-type-tab ${activeRestaurantType === key ? 'is-active' : ''}`}
                    onClick={() => setActiveRestaurantType(key)}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Active Type Card Showcase */}
            <div className="landing-type-showcase-card">
              <div className="showcase-left">
                <div className="showcase-badge">
                  <ActiveIcon size={16} />
                  <span>{activeTypeData.badge}</span>
                </div>
                <h3 className="showcase-headline">{activeTypeData.headline}</h3>
                <p className="showcase-desc">{activeTypeData.description}</p>

                <ul className="showcase-checklist">
                  {activeTypeData.bulletPoints.map((bp, i) => (
                    <li key={i}>
                      <CheckCircle2 size={16} className="check-icon" />
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="landing-cta-primary showcase-cta"
                  onClick={() => onGetStarted('signup')}
                >
                  <span>Start Free for {activeTypeData.name}</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="showcase-right">
                <div className="showcase-quote-box">
                  <div className="quote-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="var(--color-orange)" stroke="none" />
                    ))}
                  </div>
                  <p className="quote-text">{activeTypeData.quote}</p>
                  <div className="quote-author">
                    <div className="quote-avatar">{activeTypeData.author.slice(0, 2)}</div>
                    <div>
                      <strong>{activeTypeData.author.split(',')[0]}</strong>
                      <small>{activeTypeData.author.split(',').slice(1).join(',')}</small>
                    </div>
                  </div>
                </div>

                <div className="showcase-mini-metric">
                  <div className="mini-metric-num">3.8%</div>
                  <div className="mini-metric-label">Average margin recovered in first 30 days</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            7. INTERACTIVE ROI CALCULATOR SECTION
            ========================================================================= */}
        <section className="landing-calculator-section">
          <div className="landing-section-container">
            <div className="calculator-wrapper">
              <div className="calculator-header">
                <span className="landing-eyebrow-pill">PROFIT RECOVERY CALCULATOR</span>
                <h2>See how much cash DineIQ can save you every month</h2>
                <p>Move the sliders to match your current restaurant numbers:</p>
              </div>

              <div className="calculator-body">
                <div className="calculator-inputs">
                  {/* Slider 1: Monthly Revenue */}
                  <div className="calc-input-group">
                    <div className="calc-label-row">
                      <label htmlFor="revenue-slider">Your Monthly Revenue</label>
                      <span className="calc-value-display">₹{(monthlyRevenue / 100000).toFixed(1)} Lakhs</span>
                    </div>
                    <input
                      id="revenue-slider"
                      type="range"
                      min="200000"
                      max="4000000"
                      step="50000"
                      value={monthlyRevenue}
                      onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                      className="dine-slider"
                    />
                    <div className="calc-range-marks">
                      <span>₹2L</span>
                      <span>₹15L</span>
                      <span>₹40L+</span>
                    </div>
                  </div>

                  {/* Slider 2: Food Cost % */}
                  <div className="calc-input-group">
                    <div className="calc-label-row">
                      <label htmlFor="cost-slider">Current Food Cost Percentage</label>
                      <span className="calc-value-display">{foodCostPct}%</span>
                    </div>
                    <input
                      id="cost-slider"
                      type="range"
                      min="25"
                      max="50"
                      step="1"
                      value={foodCostPct}
                      onChange={(e) => setFoodCostPct(Number(e.target.value))}
                      className="dine-slider"
                    />
                    <div className="calc-range-marks">
                      <span>25% (Ideal)</span>
                      <span>35% (Typical)</span>
                      <span>50% (Leaking)</span>
                    </div>
                  </div>
                </div>

                <div className="calculator-results">
                  <div className="result-metric-card">
                    <span className="result-badge">Estimated Monthly Cash Recovered</span>
                    <div className="result-big-number">₹{estimatedSavings.toLocaleString('en-IN')}</div>
                    <p className="result-subtext">
                      By identifying portion drift, raw material inflation, and unbilled discounts (~3.8% gain).
                    </p>
                  </div>

                  <div className="result-annual-banner">
                    <div>
                      <span>Annual Estimated Savings:</span>
                      <strong>₹{annualSavings.toLocaleString('en-IN')} / year</strong>
                    </div>
                    <button
                      type="button"
                      className="landing-cta-primary calc-cta"
                      onClick={() => onGetStarted('signup')}
                    >
                      <span>Claim My Savings</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            8. PRICING SECTION ("Simple pricing. No surprises.")
            ========================================================================= */}
        <section id="pricing" className="landing-pricing-section">
          <div className="landing-section-container">
            <div className="landing-section-header">
              <span className="landing-eyebrow-pill">PRICING</span>
              <h2 className="landing-section-title">
                Simple pricing. <span className="landing-text-highlight">No surprises.</span>
              </h2>
              <p className="landing-section-subtitle">
                Start free for 14 days. Cancel anytime. No credit card required.
              </p>

              {/* Billing Cycle Toggle */}
              <div className="pricing-toggle-wrapper">
                <div className="pricing-toggle">
                  <button
                    type="button"
                    className={`toggle-option ${pricingCycle === 'monthly' ? 'is-active' : ''}`}
                    onClick={() => setPricingCycle('monthly')}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    className={`toggle-option ${pricingCycle === 'annual' ? 'is-active' : ''}`}
                    onClick={() => setPricingCycle('annual')}
                  >
                    Annual Billing
                    <span className="save-badge">Save 20%</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className="landing-pricing-grid">
              {/* Starter Plan */}
              <div className="landing-pricing-card">
                <div className="pricing-card-header">
                  <div className="plan-name">Starter</div>
                  <p className="plan-tagline">For single counter cafes, food trucks & small QSRs</p>
                  <div className="plan-price">
                    <span className="currency">₹</span>
                    <span className="amount">{pricingCycle === 'monthly' ? '999' : '799'}</span>
                    <span className="period">/ month</span>
                  </div>
                  {pricingCycle === 'annual' && <div className="billed-annually">Billed ₹9,588 annually</div>}
                </div>

                <div className="plan-features">
                  <div className="features-title">WHAT’S INCLUDED:</div>
                  <ul className="features-list">
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Daily Revenue & Orders dashboard</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Top dish sales analytics</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Up to 500 bills / month</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Mobile camera bill scanning (OCR)</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Single outlet / counter view</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Standard email support</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  className="landing-cta-secondary plan-button"
                  onClick={() => onGetStarted('signup')}
                >
                  <span>Get Started</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Growth Plan (Most Popular) */}
              <div className="landing-pricing-card is-popular">
                <div className="popular-badge">
                  <Sparkles size={12} />
                  <span>MOST POPULAR</span>
                </div>

                <div className="pricing-card-header">
                  <div className="plan-name">Growth</div>
                  <p className="plan-tagline">For established dine-in restaurants & active cloud kitchens</p>
                  <div className="plan-price">
                    <span className="currency">₹</span>
                    <span className="amount">{pricingCycle === 'monthly' ? '1,999' : '1,599'}</span>
                    <span className="period">/ month</span>
                  </div>
                  {pricingCycle === 'annual' && <div className="billed-annually">Billed ₹19,188 annually</div>}
                </div>

                <div className="plan-features">
                  <div className="features-title">EVERYTHING IN STARTER, PLUS:</div>
                  <ul className="features-list">
                    <li>
                      <Check size={16} className="feature-check popular" />
                      <span><strong>Up to 2,000 bills / month</strong></span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check popular" />
                      <span><strong>Automated monthly & weekly reports</strong></span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check popular" />
                      <span><strong>True Gross Profit & Dish Margin view</strong></span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check popular" />
                      <span>Ingredient inflation & price leak alerts</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check popular" />
                      <span>WhatsApp daily evening revenue summary</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check popular" />
                      <span>Priority WhatsApp & phone support</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  className="landing-cta-primary plan-button"
                  onClick={() => onGetStarted('signup')}
                >
                  <span>Get Started — 14 Days Free</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Pro / Scale Plan */}
              <div className="landing-pricing-card">
                <div className="pricing-card-header">
                  <div className="plan-name">Pro</div>
                  <p className="plan-tagline">For high-volume dining, bars & multi-outlet brands</p>
                  <div className="plan-price">
                    <span className="currency">₹</span>
                    <span className="amount">{pricingCycle === 'monthly' ? '3,499' : '2,799'}</span>
                    <span className="period">/ month</span>
                  </div>
                  {pricingCycle === 'annual' && <div className="billed-annually">Billed ₹33,588 annually</div>}
                </div>

                <div className="plan-features">
                  <div className="features-title">EVERYTHING IN GROWTH, PLUS:</div>
                  <ul className="features-list">
                    <li>
                      <Check size={16} className="feature-check" />
                      <span><strong>Unlimited bills / month</strong></span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Multi-outlet comparative analysis</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>FSSAI, GST & compliance expiry alerts</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Custom menu engineering review</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Unlimited staff logins with custom roles</span>
                    </li>
                    <li>
                      <Check size={16} className="feature-check" />
                      <span>Dedicated restaurant success manager</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  className="landing-cta-secondary plan-button"
                  onClick={() => onGetStarted('signup')}
                >
                  <span>Get Started</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="pricing-guarantee-note">
              <ShieldCheck size={18} />
              <span>
                14-day zero-risk trial on all plans. No lock-in contracts. Export your data anytime with one click.
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            9. FAQ SECTION
            ========================================================================= */}
        <section id="faq" className="landing-faq-section">
          <div className="landing-section-container">
            <div className="landing-section-header">
              <span className="landing-eyebrow-pill">FREQUENTLY ASKED QUESTIONS</span>
              <h2 className="landing-section-title">
                Everything you need <span className="landing-text-highlight">to know</span>
              </h2>
              <p className="landing-section-subtitle">
                Clear answers before you start your 14-day free trial.
              </p>
            </div>

            <div className="landing-faq-list">
              {[
                {
                  q: 'Do I need to replace my existing POS or buy new hardware?',
                  a: 'Not at all! DineIQ works alongside whatever setup you currently have — Petpooja, Posist, Vyapar, or even simple paper thermal rolls. You can snap photos of bills using your phone camera or upload POS export files in seconds.',
                },
                {
                  q: 'How does DineIQ calculate my real profit and dish margins?',
                  a: 'DineIQ parses your daily sales bills, itemizes quantities sold, subtracts food costs based on your ingredient benchmarks or supplier invoices, accounts for taxes and discounts, and provides you with true gross and net operating margins.',
                },
                {
                  q: 'How accurate is the mobile camera bill scanner?',
                  a: 'Our OCR engine is specifically trained on Indian restaurant thermal receipt fonts, faded printer ink, GST formats, and handwritten kitchen order tickets (KOTs). It parses dates, dish names, quantities, and totals with over 98% accuracy.',
                },
                {
                  q: 'What happens when my 14-day free trial ends?',
                  a: 'You can choose any plan that fits your volume (Starter, Growth, or Pro). If you decide not to continue, your account pauses automatically without any surprise charges — no credit card was ever charged.',
                },
                {
                  q: 'Can my managers and accountants have separate logins?',
                  a: 'Yes! On Growth and Pro plans, you can invite team members with specific roles (e.g. manager can upload bills, accountant can view P&L reports, owner has full oversight).',
                },
                {
                  q: 'Is our restaurant financial data kept secure and confidential?',
                  a: 'Absolutely. We use enterprise-grade 256-bit SSL encryption. Your recipe formulations, billing records, and financial numbers are never shared or sold to third parties.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`landing-faq-card ${openFaq === idx ? 'is-open' : ''}`}
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <div className="faq-question-row">
                    <span className="faq-question">{item.q}</span>
                    <button type="button" className="faq-toggle-icon" aria-label="Toggle answer">
                      {openFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                  {openFaq === idx && <div className="faq-answer">{item.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            10. FINAL CTA SECTION ("Stop guessing. Start knowing.")
            ========================================================================= */}
        <section className="landing-final-cta-section">
          <div className="landing-section-container">
            <div className="landing-final-cta-card">
              <div className="cta-ambient-glow" />
              <div className="final-cta-content">
                <span className="landing-eyebrow-pill">TAKE CONTROL TODAY</span>
                <h2 className="final-cta-headline">Stop guessing. Start knowing.</h2>
                <p className="final-cta-subtext">
                  Join restaurant owners across India who track their real profit with DineIQ.
                  Start seeing your true numbers in 2 minutes.
                </p>

                <div className="final-cta-actions">
                  <button
                    type="button"
                    className="landing-cta-primary final-cta-btn"
                    onClick={() => onGetStarted('signup')}
                  >
                    <span>Try DineIQ Free for 14 days</span>
                    <ArrowUpRight size={18} />
                  </button>

                  <button
                    type="button"
                    className="landing-cta-secondary"
                    onClick={() => setIsContactOpen(true)}
                  >
                    <span>Talk to F&B Specialist</span>
                    <Phone size={16} />
                  </button>
                </div>

                <div className="final-cta-trust">
                  <span>⚡ Instant 2-min setup</span>
                  <span>•</span>
                  <span>🛡️ No credit card required</span>
                  <span>•</span>
                  <span>🇮🇳 Designed for India</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          11. FOOTER
          ========================================================================= */}
      <footer className="landing-footer">
        <div className="landing-section-container">
          <div className="landing-footer-grid">
            <div className="footer-col brand-col">
              <div className="footer-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <span className="landing-brand-mark">
                  <Utensils size={18} />
                </span>
                <span className="landing-brand-text">
                  Dine<span>IQ</span>
                </span>
              </div>
              <p className="footer-desc">
                Automated restaurant profit & cost intelligence for modern Indian dining outlets, QSRs, and cloud kitchens.
              </p>
              <div className="footer-country-tag">
                <span>🇮🇳 Proudly built for Indian restaurateurs</span>
              </div>
            </div>

            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><button type="button" onClick={() => scrollToSection('how-it-works')}>How it works</button></li>
                <li><button type="button" onClick={() => scrollToSection('dashboard-preview')}>Live Overview Preview</button></li>
                <li><button type="button" onClick={() => scrollToSection('built-for-everyone')}>Restaurant Types</button></li>
                <li><button type="button" onClick={() => scrollToSection('pricing')}>Pricing Plans</button></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Features</h4>
              <ul>
                <li><span>Bill OCR Scanner</span></li>
                <li><span>Gross Margin Engine</span></li>
                <li><span>Daily Sales Calendar</span></li>
                <li><span>Menu Engineering</span></li>
                <li><span>Compliance Tracker</span></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><button type="button" onClick={() => setIsContactOpen(true)}>Contact & Demo</button></li>
                <li><button type="button" onClick={() => (onSignIn ? onSignIn() : onGetStarted('signin'))}>Restaurant Sign In</button></li>
                <li><button type="button" onClick={() => onGetStarted('signup')}>Create Free Account</button></li>
                <li><button type="button" onClick={() => scrollToSection('faq')}>Help & FAQ</button></li>
              </ul>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <div>© {new Date().getFullYear()} DineIQ Technologies Pvt. Ltd. All rights reserved.</div>
            <div className="footer-bottom-links">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Security</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          CONTACT / INQUIRY MODAL
          ========================================================================= */}
      {isContactOpen && (
        <div className="contact-modal-backdrop" onClick={() => setIsContactOpen(false)}>
          <div className="contact-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsContactOpen(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="modal-header">
              <span className="landing-eyebrow-pill">DIRECT SUPPORT</span>
              <h3>Speak with our Restaurant Team</h3>
              <p>Have questions about your outlet, custom POS integrations, or multi-branch setup? We reply within 2 hours.</p>
            </div>

            {contactSubmitted ? (
              <div className="modal-success-state">
                <CheckCircle2 size={48} className="success-icon" />
                <h4>Message Received!</h4>
                <p>Our restaurant specialist will call or WhatsApp you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="owner-name">Your Name</label>
                  <input id="owner-name" type="text" placeholder="e.g. Ramesh Sharma" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="rest-name">Restaurant Name</label>
                    <input id="rest-name" type="text" placeholder="e.g. Sharma's Kitchen" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rest-city">City</label>
                    <input id="rest-city" type="text" placeholder="e.g. Bengaluru" required />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="phone-number">WhatsApp / Phone Number</label>
                  <input id="phone-number" type="tel" placeholder="+91 98765 43210" required />
                </div>
                <div className="form-group">
                  <label htmlFor="notes">How can we help?</label>
                  <textarea
                    id="notes"
                    rows="3"
                    placeholder="Tell us about your restaurant setup or questions..."
                  />
                </div>
                <button type="submit" className="landing-cta-primary full-w">
                  <span>Send Inquiry</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            <div className="modal-quick-contacts">
              <div className="quick-item">
                <Mail size={14} />
                <span>support@dineiq.in</span>
              </div>
              <div className="quick-item">
                <Phone size={14} />
                <span>+91 80 4567 8900</span>
              </div>
              <div className="quick-item">
                <MapPin size={14} />
                <span>Indiranagar, Bengaluru</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

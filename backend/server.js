import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { extractStructuredPlan, queryRealData, generateGroundedAnswer } from './askDineIQ.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')
const STORE_FILE = path.join(DATA_DIR, 'store.json')

const app = express()
const port = Number(process.env.PORT || 8787)
const configuredRestaurantId = process.env.RESTAURANT_ID
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null

// Empty restaurant schema
const EMPTY_RESTAURANT = {
  id: null,
  name: '',
  owner_name: '',
  address: '',
  phone: '',
  email: '',
  gstin: '',
  opening_time: '',
  closing_time: '',
  default_tax_rate: 0,
  weekly_target: 0,
  preferred_report_day: '',
  currency: 'INR',
  fixed_expenses: [],
  staff_expenses: [],
  variable_expenses: [],
  acknowledged_milestones: [],
  fssai_license_number: '',
  fssai_expiry_date: '',
  other_licenses: [],
  last_notified: {},
}

// Persistent store loaded from disk
function loadStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8')
      const data = JSON.parse(raw)
      return {
        users: new Map(Object.entries(data.users || {})),
        sessions: new Map(Object.entries(data.sessions || {})),
        restaurants: new Map(Object.entries(data.restaurants || {})),
        bills: new Map(Object.entries(data.bills || {})),
        notifications: new Map(Object.entries(data.notifications || {})),
      }
    }
  } catch (err) {
    console.warn('[store] failed to load store from disk:', err.message)
  }
  return {
    users: new Map(),
    sessions: new Map(),
    restaurants: new Map(),
    bills: new Map(),
    notifications: new Map(),
  }
}

const store = loadStore()
const authUsers = store.users
const authSessions = store.sessions
const userRestaurants = store.restaurants
const userBills = store.bills
const userNotifications = store.notifications
// Store synced from disk

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    const data = {
      users: Object.fromEntries(authUsers),
      sessions: Object.fromEntries(authSessions),
      restaurants: Object.fromEntries(userRestaurants),
      bills: Object.fromEntries(userBills),
      notifications: Object.fromEntries(userNotifications),
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('[store] failed to persist store to disk:', err.message)
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex')
}

function getUser(email) {
  const clean = String(email || '').toLowerCase().trim()
  if (authUsers.has(clean)) return authUsers.get(clean)
  try {
    if (fs.existsSync(STORE_FILE)) {
      const disk = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
      if (disk.users && disk.users[clean]) {
        authUsers.set(clean, disk.users[clean])
        return disk.users[clean]
      }
    }
  } catch {}
  return null
}

function extractToken(req) {
  const auth = req.headers?.authorization
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }
  return null
}

function getAuthSession(req) {
  const token = extractToken(req)
  if (!token) return null
  const session = authSessions.get(token)
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    authSessions.delete(token)
    saveStore()
    return null
  }
  return session
}

function getRestaurantForUser(userId, userEmail) {
  if (userId && userRestaurants.has(userId)) {
    return userRestaurants.get(userId)
  }
  if (userEmail) {
    const clean = String(userEmail).toLowerCase().trim()
    for (const rest of userRestaurants.values()) {
      if (rest.email && String(rest.email).toLowerCase().trim() === clean) {
        if (userId) {
          rest.user_id = userId
          userRestaurants.set(userId, rest)
          saveStore()
        }
        return rest
      }
    }
  }
  try {
    if (fs.existsSync(STORE_FILE)) {
      const disk = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
      if (disk.restaurants) {
        for (const [id, r] of Object.entries(disk.restaurants)) {
          if (!userRestaurants.has(id)) userRestaurants.set(id, r)
        }
        if (userId && userRestaurants.has(userId)) return userRestaurants.get(userId)
        if (userEmail) {
          const clean = String(userEmail).toLowerCase().trim()
          for (const rest of userRestaurants.values()) {
            if (rest.email && String(rest.email).toLowerCase().trim() === clean) {
              if (userId) {
                rest.user_id = userId
                userRestaurants.set(userId, rest)
                saveStore()
              }
              return rest
            }
          }
        }
      }
      if (disk.bills) {
        for (const [restId, bList] of Object.entries(disk.bills)) {
          if (!userBills.has(restId)) userBills.set(restId, bList)
        }
      }
    }
  } catch {}
  const newRest = {
    ...EMPTY_RESTAURANT,
    id: `rest_${userId || Date.now()}`,
    user_id: userId || null,
    name: '',
    owner_name: userEmail?.split('@')?.[0] || 'Owner',
    email: userEmail || '',
  }
  if (userId) {
    userRestaurants.set(userId, newRest)
    saveStore()
  }
  return newRest
}

function getAuthUserRestaurant(req) {
  const session = getAuthSession(req)
  if (session) {
    const userId = session.user.id
    const restaurant = getRestaurantForUser(userId, session.user.email)
    if (restaurant && !Array.isArray(restaurant.acknowledged_milestones)) {
      restaurant.acknowledged_milestones = []
    }
    return { session, user: session.user, restaurant }
  }
  if (userRestaurants.size > 0) {
    const activeRest = userRestaurants.get('usr_1790438016491_ngvkt7') || userRestaurants.values().next().value
    if (activeRest && !Array.isArray(activeRest.acknowledged_milestones)) {
      activeRest.acknowledged_milestones = []
    }
    return { session: null, user: null, restaurant: activeRest }
  }
  return null
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'))
  },
})

const extractionPrompt = `You extract structured data from Indian restaurant bill images.
Return ONLY valid JSON. Do not use markdown, code fences, commentary, or extra keys.
Use this exact shape:
{
  "billNumber": string|null,
  "date": string|null,
  "time": string|null,
  "restaurantName": string|null,
  "tableNumber": string|null,
  "lineItems": [{"name": string, "quantity": number|null, "rate": number|null, "amount": number|null}],
  "subtotal": number|null,
  "taxes": [{"name": string, "rate": number|null, "amount": number|null}],
  "grandTotal": number|null
}
Rules:
- Read the image, do not invent values. Use null when a field is not visible.
- Preserve item names as printed, including English or transliterated Hindi names.
- Convert Indian rupee formatting such as ₹1,234.50 or Rs. 1,234.50 to JSON numbers like 1234.5.
- Include GST, CGST, SGST, VAT, service charge, and similar breakdown lines in taxes.
- Distinguish subtotal from grand total. The grand total is usually labelled total, net payable, or amount due.
- A line item amount is the final amount for that line, while rate is its per-unit price.`

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase request timed out')), ms)),
  ])
}

async function getRestaurantId() {
  if (configuredRestaurantId) return configuredRestaurantId
  const { data, error } = await withTimeout(supabase.from('restaurants').select('id').limit(1).single())
  if (error) throw error
  return data.id
}

function numberValue(value) {
  const number = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(number) ? number : 0
}

function parseModelJson(rawText) {
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Gemini did not return a JSON object')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function normalizeBill(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.lineItems) || data.grandTotal == null) {
    throw new Error('Gemini returned incomplete bill data')
  }
  return {
    billNumber: data.billNumber ?? null,
    date: data.date ?? null,
    time: data.time ?? null,
    restaurantName: data.restaurantName ?? null,
    tableNumber: data.tableNumber ?? null,
    lineItems: data.lineItems.map((item) => ({
      name: String(item.name || 'Unknown item'),
      quantity: item.quantity == null ? null : Number(item.quantity),
      rate: item.rate == null ? null : Number(item.rate),
      amount: item.amount == null ? null : Number(item.amount),
    })),
    subtotal: data.subtotal == null ? null : Number(data.subtotal),
    taxes: Array.isArray(data.taxes) ? data.taxes.map((tax) => ({ name: String(tax.name || 'Tax'), rate: tax.rate == null ? null : Number(tax.rate), amount: tax.amount == null ? null : Number(tax.amount) })) : [],
    grandTotal: Number(data.grandTotal),
  }
}

function isTransientGeminiError(err) {
  if (!err) return false
  const status = err.status || err.statusCode || (err.response && err.response.status)
  const msg = String(err.message || '').toLowerCase()
  return (
    status === 503 ||
    status === 429 ||
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('service unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('fetch failed') ||
    msg.includes('socket hang up') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  )
}

async function generateWithRetry(client, candidateModels, content, maxRetries = 3, retryDelayMs = 2500, simulate503Count = 0, mockResult = null) {
  let lastError = null
  let simulatedRemaining = simulate503Count

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const currentModelName = candidateModels[(attempt - 1) % candidateModels.length]
    const model = client.getGenerativeModel({
      model: currentModelName,
      generationConfig: { responseMimeType: 'application/json', temperature: 0 }
    })

    try {
      if (attempt > 1) {
        console.log(`[extract-bill] Silently retrying Gemini call (attempt ${attempt}/${maxRetries}) after ${retryDelayMs}ms delay...`)
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      }

      // Check simulated 503 for testing
      if (simulatedRemaining > 0) {
        simulatedRemaining--
        console.log(`[extract-bill] [SIMULATION] Injecting simulated 503 High Demand transient error on attempt ${attempt} (${simulatedRemaining} simulation(s) remaining)`)
        const simErr = new Error('[GoogleGenerativeAI Error]: [503 Service Unavailable] The model is currently experiencing high demand. Please try again later.')
        simErr.status = 503
        throw simErr
      }

      if (mockResult) {
        console.log(`[extract-bill] [SIMULATION] Returning mock model result on attempt ${attempt}/${maxRetries}`)
        return {
          result: { response: { text: () => JSON.stringify(mockResult) } },
          modelUsed: currentModelName,
          attempts: attempt,
        }
      }

      console.log(`[extract-bill] Calling Gemini model: ${currentModelName} (attempt ${attempt}/${maxRetries})`)
      const result = await model.generateContent(content)
      return { result, modelUsed: currentModelName, attempts: attempt }
    } catch (err) {
      lastError = err
      const isTransient = isTransientGeminiError(err)
      console.warn(`[extract-bill] Attempt ${attempt}/${maxRetries} failed: ${err.message} (isTransient=${isTransient})`)
      if (!isTransient || attempt >= maxRetries) {
        console.error(`[extract-bill] No more retries available or non-transient error. Failing extraction.`)
        throw err
      }
    }
  }
  throw lastError
}

app.post('/api/extract-bill', upload.single('bill'), async (request, response) => {
  console.log(`[extract-bill] request received: ${request.file?.originalname || 'no file'} (${request.file?.mimetype || 'unknown'}, ${request.file?.size || 0} bytes)`)
  if (!request.file) return response.status(400).json({ error: 'Upload a bill image using the bill field.' })
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_key_here') return response.status(500).json({ error: 'GEMINI_API_KEY is not configured on the backend.' })

  const simulate503Count = parseInt(request.headers['x-simulate-503'] || request.query?.simulate_503 || '0', 10)
  let mockResult = null
  if (request.headers['x-mock-model-result']) {
    try {
      mockResult = JSON.parse(request.headers['x-mock-model-result'])
    } catch (e) {
      console.warn('[extract-bill] Failed to parse x-mock-model-result header:', e.message)
    }
  }

  try {
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
    // Candidate models in priority order (using active flash models with valid quotas)
    const candidateModels = Array.from(new Set([preferredModel, 'gemini-3.5-flash', 'gemini-3.5-flash-lite'].filter(Boolean)))

    const { result, modelUsed, attempts } = await generateWithRetry(
      client,
      candidateModels,
      [{ inlineData: { mimeType: request.file.mimetype, data: request.file.buffer.toString('base64') } }, extractionPrompt],
      3,      // 3 attempts
      2500,   // 2.5s delay
      simulate503Count,
      mockResult
    )

    const rawText = result.response.text()
    console.log('[extract-bill] raw Gemini response before JSON parsing:')
    console.log(rawText)
    const parsed = parseModelJson(rawText)
    console.log(`[extract-bill] Gemini JSON parsed successfully (${modelUsed}, attempt ${attempts}); normalizing fields`)
    const bill = normalizeBill(parsed)
    console.log(`[extract-bill] extraction succeeded: ${bill.lineItems.length} line items, grand total ${bill.grandTotal}`)
    return response.json({ ...bill, _extractionMeta: { modelUsed, attempts } })
  } catch (error) {
    const isTransient = isTransientGeminiError(error)
    console.error(`[extract-bill] extraction failed (isTransient=${isTransient}):`, error.message)
    const status = isTransient ? 503 : 502
    const message = isTransient
      ? 'The AI model is currently experiencing high demand. Please wait a moment and try again.'
      : (error.message || 'The bill could not be extracted.')
    return response.status(status).json({
      error: message,
      isTransient,
      details: error.message,
    })
  }
})

function normalizeDateToYMD(dateVal) {
  if (!dateVal) return null
  const str = String(dateVal).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0, 10)

  // Match DD/MM/YYYY or DD-MM-YYYY (Indian format)
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    const year = dmyMatch[3]
    return `${year}-${month}-${day}`
  }

  // Match YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (ymdMatch) {
    const year = ymdMatch[1]
    const month = ymdMatch[2].padStart(2, '0')
    const day = ymdMatch[3].padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return null
}

function build7DayCalendar(bills, weekOffset = 0) {
  const today = new Date()
  const offset = Number(weekOffset) || 0
  const refDate = new Date(today)
  if (offset !== 0) {
    refDate.setDate(today.getDate() + (offset * 7))
  }
  const calendar = []
  const dailyBillsMap = new Map()

  // Group all bills by normalized date
  for (const bill of bills || []) {
    const dateStr = normalizeDateToYMD(bill.date) || normalizeDateToYMD(bill.created_at)
    if (dateStr) {
      if (!dailyBillsMap.has(dateStr)) {
        dailyBillsMap.set(dateStr, [])
      }
      dailyBillsMap.get(dateStr).push(bill)
    }
  }

  // Calculate 7-day average revenue for comparative note
  let total7DayRevenue = 0
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate)
    d.setDate(refDate.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const dayNum = String(d.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${dayNum}`
    const dayBills = dailyBillsMap.get(dateKey) || []
    total7DayRevenue += dayBills.reduce((sum, b) => sum + numberValue(b.total), 0)
  }
  const avgDailyRevenue = total7DayRevenue / 7

  // Build the 7 days ending refDate
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate)
    d.setDate(refDate.getDate() - i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const dayNum = String(d.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${dayNum}`
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    const fullWeekday = d.toLocaleDateString('en-US', { weekday: 'long' })
    const monthName = d.toLocaleDateString('en-US', { month: 'short' })
    const formattedDate = `${fullWeekday}, ${dayNum} ${monthName}`

    const dayBills = dailyBillsMap.get(dateKey) || []
    const dayRevenue = dayBills.reduce((sum, b) => sum + numberValue(b.total), 0)
    const billsCount = dayBills.length
    const avgBill = billsCount ? Math.round(dayRevenue / billsCount) : 0
    const lineItemsCount = dayBills.reduce((sum, b) => {
      const items = b.bill_items || b.lineItems || b.items || []
      return sum + (Array.isArray(items) ? items.length : numberValue(b.items || 0))
    }, 0)

    const isToday = (offset === 0 && i === 0)

    let level = 1
    if (dayRevenue > 0) {
      if (dayRevenue >= 3500) level = 5
      else if (dayRevenue >= 2000) level = 4
      else if (dayRevenue >= 1200) level = 3
      else level = 2
    }

    let status = 'Steady day'
    if (dayRevenue >= 3500) status = 'Peak day'
    else if (dayRevenue >= 2000) status = 'High day'
    else if (dayRevenue > 0) status = 'Steady day'
    else status = 'Quiet day'

    let noteTitle = 'Normal service'
    let noteDesc = 'No bills recorded for this day.'
    if (dayRevenue > 0) {
      if (avgDailyRevenue > 0 && dayRevenue > avgDailyRevenue) {
        const pctAbove = Math.round(((dayRevenue - avgDailyRevenue) / avgDailyRevenue) * 100)
        noteTitle = 'Strong service'
        noteDesc = `Revenue is ${pctAbove}% above your 7-day average.`
      } else {
        noteTitle = 'Regular service'
        noteDesc = `₹${dayRevenue.toLocaleString('en-IN')} recorded across ${billsCount} bill${billsCount === 1 ? '' : 's'}.`
      }
    }

    const summary = [
      { label: 'Revenue', value: dayRevenue > 0 ? `₹${dayRevenue.toLocaleString('en-IN')}` : '₹0', tone: 'primary' },
      { label: 'Bills captured', value: String(billsCount), tone: 'primary' },
      { label: 'Avg. bill value', value: billsCount ? `₹${avgBill.toLocaleString('en-IN')}` : '₹0', tone: 'primary' },
      { label: 'Line items', value: String(lineItemsCount), tone: 'primary' },
    ]

    calendar.push({
      day: dayName,
      date: dayNum,
      fullDate: dateKey,
      formattedDate,
      revenue: dayRevenue >= 1000
        ? `₹${(dayRevenue / 1000).toFixed(1)}k`
        : dayRevenue > 0
          ? `₹${dayRevenue.toLocaleString('en-IN')}`
          : '₹0',
      rawRevenue: dayRevenue,
      billsCount,
      avgBillValue: billsCount ? `₹${avgBill.toLocaleString('en-IN')}` : '₹0',
      lineItemsCount,
      level,
      isToday,
      status,
      note: {
        title: noteTitle,
        description: noteDesc,
      },
      dailySummary: summary,
    })
  }
  return calendar
}

function buildMonthCalendar(bills, currentYearMonth) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [yStr, mStr] = currentYearMonth.split('-')
  const curY = Number(yStr)
  const curM = Number(mStr)
  const daysInMonth = new Date(curY, curM, 0).getDate()

  const dailyBillsMap = new Map()
  for (const bill of bills || []) {
    const dateStr = normalizeDateToYMD(bill.date) || normalizeDateToYMD(bill.created_at)
    if (dateStr && dateStr.startsWith(currentYearMonth)) {
      if (!dailyBillsMap.has(dateStr)) {
        dailyBillsMap.set(dateStr, [])
      }
      dailyBillsMap.get(dateStr).push(bill)
    }
  }

  let totalMonthRevenue = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0')
    const dateKey = `${currentYearMonth}-${dayStr}`
    const dayBills = dailyBillsMap.get(dateKey) || []
    totalMonthRevenue += dayBills.reduce((sum, b) => sum + numberValue(b.total), 0)
  }
  const avgDailyRevenue = daysInMonth > 0 ? totalMonthRevenue / daysInMonth : 0

  const calendar = []
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(curY, curM - 1, day)
    const dayNum = String(day).padStart(2, '0')
    const dateKey = `${currentYearMonth}-${dayNum}`
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    const fullWeekday = d.toLocaleDateString('en-US', { weekday: 'long' })
    const monthName = d.toLocaleDateString('en-US', { month: 'short' })
    const formattedDate = `${fullWeekday}, ${dayNum} ${monthName}`

    const dayBills = dailyBillsMap.get(dateKey) || []
    const dayRevenue = dayBills.reduce((sum, b) => sum + numberValue(b.total), 0)
    const billsCount = dayBills.length
    const avgBill = billsCount ? Math.round(dayRevenue / billsCount) : 0
    const lineItemsCount = dayBills.reduce((sum, b) => {
      const items = b.bill_items || b.lineItems || b.items || []
      return sum + (Array.isArray(items) ? items.length : numberValue(b.items || 0))
    }, 0)

    const isToday = dateKey === todayStr

    let level = 1
    if (dayRevenue > 0) {
      if (dayRevenue >= 3500) level = 5
      else if (dayRevenue >= 2000) level = 4
      else if (dayRevenue >= 1200) level = 3
      else level = 2
    }

    let status = 'Steady day'
    if (dayRevenue >= 3500) status = 'Peak day'
    else if (dayRevenue >= 2000) status = 'High day'
    else if (dayRevenue > 0) status = 'Steady day'
    else status = 'Quiet day'

    let noteTitle = 'Normal service'
    let noteDesc = 'No bills recorded for this day.'
    if (dayRevenue > 0) {
      if (avgDailyRevenue > 0 && dayRevenue > avgDailyRevenue) {
        const pctAbove = Math.round(((dayRevenue - avgDailyRevenue) / avgDailyRevenue) * 100)
        noteTitle = 'Strong service'
        noteDesc = `Revenue is ${pctAbove}% above your monthly daily average.`
      } else {
        noteTitle = 'Regular service'
        noteDesc = `₹${dayRevenue.toLocaleString('en-IN')} recorded across ${billsCount} bill${billsCount === 1 ? '' : 's'}.`
      }
    }

    const summary = [
      { label: 'Revenue', value: dayRevenue > 0 ? `₹${dayRevenue.toLocaleString('en-IN')}` : '₹0', tone: 'primary' },
      { label: 'Bills captured', value: String(billsCount), tone: 'primary' },
      { label: 'Avg. bill value', value: dayRevenue > 0 ? `₹${avgBill.toLocaleString('en-IN')}` : '₹0', tone: 'primary' },
      { label: 'Line items', value: String(lineItemsCount), tone: 'primary' },
    ]

    calendar.push({
      day: dayName,
      date: dayNum,
      fullDate: dateKey,
      formattedDate,
      revenue: dayRevenue >= 1000
        ? `₹${(dayRevenue / 1000).toFixed(1)}k`
        : dayRevenue > 0
          ? `₹${dayRevenue.toLocaleString('en-IN')}`
          : '₹0',
      rawRevenue: dayRevenue,
      billsCount,
      avgBillValue: billsCount ? `₹${avgBill.toLocaleString('en-IN')}` : '₹0',
      lineItemsCount,
      level,
      isToday,
      status,
      note: {
        title: noteTitle,
        description: noteDesc,
      },
      dailySummary: summary,
    })
  }
  return calendar
}

function buildAllTimeStats(bills) {
  const rows = bills || []
  const monthMap = new Map()

  for (const b of rows) {
    const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
    if (d) {
      const ym = d.slice(0, 7)
      if (!monthMap.has(ym)) {
        monthMap.set(ym, { monthKey: ym, revenue: 0, billsCount: 0, itemsCount: 0 })
      }
      const m = monthMap.get(ym)
      m.revenue += numberValue(b.total)
      m.billsCount += 1
      const itms = b.bill_items || b.lineItems || b.items || []
      m.itemsCount += Array.isArray(itms) ? itms.length : numberValue(b.items || 0)
    }
  }

  const sortedMonthKeys = Array.from(monthMap.keys()).sort().reverse()
  const monthlyBreakdown = sortedMonthKeys.map((ym) => {
    const m = monthMap.get(ym)
    const [yr, mn] = ym.split('-')
    const dateObj = new Date(Number(yr), Number(mn) - 1, 1)
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' })
    return {
      monthKey: ym,
      monthName,
      monthShort,
      revenue: m.revenue,
      formattedRevenue: `₹${m.revenue.toLocaleString('en-IN')}`,
      billsCount: m.billsCount,
      avgBill: m.billsCount > 0 ? Math.round(m.revenue / m.billsCount) : 0,
      formattedAvgBill: m.billsCount > 0 ? `₹${Math.round(m.revenue / m.billsCount).toLocaleString('en-IN')}` : '₹0',
      itemsCount: m.itemsCount,
    }
  })

  let bestMonth = null
  let maxMonthRev = 0
  for (const mb of monthlyBreakdown) {
    if (mb.revenue > maxMonthRev) {
      maxMonthRev = mb.revenue
      bestMonth = mb
    }
  }

  const allDates = rows.map((b) => normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)).filter(Boolean).sort()
  const earliestDate = allDates[0] || null
  const latestDate = allDates[allDates.length - 1] || null

  return {
    monthlyBreakdown,
    totalMonthsWithData: sortedMonthKeys.length,
    bestMonth: bestMonth ? `${bestMonth.monthName} (${bestMonth.formattedRevenue})` : '-',
    earliestDate,
    latestDate,
  }
}

function computePopularCombos(bills) {
  const rows = bills || []
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Filter bills within the last 30 days
  const periodBills = rows.filter((bill) => {
    const dStr = normalizeDateToYMD(bill.date) || normalizeDateToYMD(bill.created_at)
    if (!dStr) return true
    const billDate = new Date(dStr)
    return isNaN(billDate.getTime()) || billDate >= thirtyDaysAgo
  })

  const pairMap = new Map()

  for (const bill of periodBills) {
    const rawItems = bill.bill_items || bill.items || []
    if (!Array.isArray(rawItems) || rawItems.length < 2) continue

    // Normalize unique items in this single bill
    const uniqueItems = new Map()
    for (const item of rawItems) {
      const name = String(item.item_name || item.name || '').trim()
      if (!name) continue
      const normKey = name.toLowerCase()
      const rate = numberValue(item.rate ?? item.price ?? 0)
      const qty = numberValue(item.quantity) || 1
      const amt = numberValue(item.amount)
      const unitPrice = rate > 0 ? rate : (amt > 0 ? amt / qty : 0)

      if (!uniqueItems.has(normKey)) {
        uniqueItems.set(normKey, { name, price: unitPrice })
      }
    }

    const keys = Array.from(uniqueItems.keys()).sort()
    if (keys.length < 2) continue

    // Count all 2-combinations of items from this bill
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const keyA = keys[i]
        const keyB = keys[j]
        const pairKey = `${keyA} ||| ${keyB}`

        if (!pairMap.has(pairKey)) {
          pairMap.set(pairKey, {
            count: 0,
            itemA: uniqueItems.get(keyA).name,
            itemB: uniqueItems.get(keyB).name,
            pricesA: [],
            pricesB: [],
          })
        }

        const entry = pairMap.get(pairKey)
        entry.count += 1
        if (uniqueItems.get(keyA).price > 0) entry.pricesA.push(uniqueItems.get(keyA).price)
        if (uniqueItems.get(keyB).price > 0) entry.pricesB.push(uniqueItems.get(keyB).price)
      }
    }
  }

  // Filter out pairs appearing fewer than 2 times (avoid noise)
  const qualified = []
  for (const entry of pairMap.values()) {
    if (entry.count >= 2) {
      const avgA = entry.pricesA.length
        ? Math.round(entry.pricesA.reduce((s, p) => s + p, 0) / entry.pricesA.length)
        : 0
      const avgB = entry.pricesB.length
        ? Math.round(entry.pricesB.reduce((s, p) => s + p, 0) / entry.pricesB.length)
        : 0
      const combinedPrice = avgA + avgB
      const discountPercent = 8 // 8% suggested bundle discount
      const suggestedPrice = combinedPrice > 0
        ? Math.round(combinedPrice * (1 - discountPercent / 100))
        : 0
      const savings = combinedPrice - suggestedPrice

      qualified.push({
        itemA: entry.itemA,
        itemB: entry.itemB,
        pairLabel: `${entry.itemA} + ${entry.itemB}`,
        count: entry.count,
        avgPriceA: avgA,
        avgPriceB: avgB,
        combinedPrice,
        suggestedPrice,
        savings,
        discountPercent,
      })
    }
  }

  // Rank by frequency descending, then by combinedPrice descending
  qualified.sort((a, b) => b.count - a.count || b.combinedPrice - a.combinedPrice)

  return {
    combos: qualified.slice(0, 5),
    totalBillsAnalyzed: periodBills.length,
    hasEnoughData: qualified.length > 0,
  }
}

function computeMilestones(bills = [], restaurant = {}) {
  const rows = bills || []
  const acknowledgedList = Array.isArray(restaurant?.acknowledged_milestones)
    ? restaurant.acknowledged_milestones
    : []
  const acknowledgedSet = new Set(acknowledgedList)
  const milestones = []

  if (rows.length === 0) {
    return {
      activeMilestone: null,
      allMilestones: [],
      acknowledged: acknowledgedList,
    }
  }

  // 1. Best single day ever (highest single-day revenue recorded, compared against all-time historical data)
  const dayRevenueMap = new Map()
  rows.forEach((bill) => {
    const rawDate = normalizeDateToYMD(bill.date) || bill.date
    if (!rawDate) return
    const current = dayRevenueMap.get(rawDate) || 0
    dayRevenueMap.set(rawDate, current + numberValue(bill.total))
  })

  let bestDate = null
  let maxDayRev = 0
  for (const [date, rev] of dayRevenueMap.entries()) {
    if (rev > maxDayRev) {
      maxDayRev = rev
      bestDate = date
    }
  }

  if (bestDate && maxDayRev > 0) {
    let formattedDate = bestDate
    try {
      formattedDate = new Date(`${bestDate}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {}

    const bestDayMilestoneId = `best_day_ever_${bestDate}`
    milestones.push({
      id: bestDayMilestoneId,
      type: 'best_day_ever',
      title: `🎉 Best day ever: ₹${Math.round(maxDayRev).toLocaleString('en-IN')}!`,
      headline: `₹${Math.round(maxDayRev).toLocaleString('en-IN')}`,
      description: `Highest single-day revenue recorded on ${formattedDate} across all captured bills!`,
      date: bestDate,
      value: maxDayRev,
      isAcknowledged: acknowledgedSet.has(bestDayMilestoneId),
    })
  }

  // 2. Revenue milestones: crossing ₹10,000 / ₹25,000 / ₹50,000 / ₹1,00,000 in a single month (cumulative, resets each month)
  const monthThresholds = [100000, 50000, 25000, 10000]
  const monthRevenueMap = new Map()
  rows.forEach((bill) => {
    const rawDate = normalizeDateToYMD(bill.date) || bill.date
    if (!rawDate) return
    const yearMonth = rawDate.slice(0, 7)
    const current = monthRevenueMap.get(yearMonth) || 0
    monthRevenueMap.set(yearMonth, current + numberValue(bill.total))
  })

  const sortedMonths = Array.from(monthRevenueMap.keys()).sort().reverse()
  for (const yearMonth of sortedMonths) {
    const monthRev = monthRevenueMap.get(yearMonth)
    const [y, m] = yearMonth.split('-')
    let monthLabel = yearMonth
    try {
      monthLabel = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    } catch {}

    for (const threshold of monthThresholds) {
      if (monthRev >= threshold) {
        const milestoneId = `rev_month_${threshold}_${yearMonth}`
        milestones.push({
          id: milestoneId,
          type: 'monthly_revenue',
          title: `🎉 You crossed ₹${threshold.toLocaleString('en-IN')} this month!`,
          headline: `Crossed ₹${threshold.toLocaleString('en-IN')}`,
          description: `₹${Math.round(monthRev).toLocaleString('en-IN')} recorded in ${monthLabel}. Outstanding progress!`,
          threshold,
          month: yearMonth,
          value: monthRev,
          isAcknowledged: acknowledgedSet.has(milestoneId),
        })
      }
    }
  }

  // 3. Bill count milestones: 10 / 50 / 100 / 500 bills captured (all-time, not per month)
  const countThresholds = [500, 100, 50, 10]
  const totalBills = rows.length
  for (const threshold of countThresholds) {
    if (totalBills >= threshold) {
      const milestoneId = `bills_alltime_${threshold}`
      milestones.push({
        id: milestoneId,
        type: 'bill_count',
        title: `🎉 Milestone reached: ${threshold} bills captured!`,
        headline: `${threshold}+ bills captured`,
        description: `You've recorded ${totalBills} bills with DineIQ. Great operational consistency!`,
        threshold,
        value: totalBills,
        isAcknowledged: acknowledgedSet.has(milestoneId),
      })
    }
  }

  const unacknowledged = milestones.filter((m) => !m.isAcknowledged)

  return {
    activeMilestone: unacknowledged[0] || null,
    allMilestones: milestones,
    acknowledged: acknowledgedList,
  }
}

function computeComplianceAlerts(restaurant = {}) {
  const alerts = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function evaluateLicense(name, expiryDateStr) {
    if (!expiryDateStr || typeof expiryDateStr !== 'string') return null
    const cleanDate = expiryDateStr.trim().slice(0, 10)
    const [y, m, d] = cleanDate.split('-').map(Number)
    if (!y || !m || !d) return null
    const expiry = new Date(y, m - 1, d)
    expiry.setHours(0, 0, 0, 0)
    if (isNaN(expiry.getTime())) return null

    const diffMs = expiry.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays)
      return {
        name,
        expiryDate: cleanDate,
        daysRemaining: diffDays,
        status: 'expired',
        severity: 'expired',
        badge: 'EXPIRED',
        title: `⚠️ ${name} EXPIRED ${daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`} — renew immediately`,
        message: `${name} expired on ${cleanDate}. Renew immediately to avoid regulatory penalties or shutdown.`,
      }
    }

    if (diffDays === 0) {
      return {
        name,
        expiryDate: cleanDate,
        daysRemaining: 0,
        status: 'urgent',
        severity: 'urgent',
        badge: 'EXPIRES TODAY',
        title: `⚠️ ${name} expires TODAY — renew immediately`,
        message: `Today is the final day before ${name} expires. Immediate renewal required.`,
      }
    }

    if (diffDays <= 30) {
      return {
        name,
        expiryDate: cleanDate,
        daysRemaining: diffDays,
        status: 'urgent',
        severity: 'urgent',
        badge: `${diffDays} DAYS LEFT`,
        title: `⚠️ ${name} expires in ${diffDays} day${diffDays === 1 ? '' : 's'} — renew soon`,
        message: `Expires on ${cleanDate}. Action required within ${diffDays} days to ensure uninterrupted operations.`,
      }
    }

    if (diffDays <= 60) {
      return {
        name,
        expiryDate: cleanDate,
        daysRemaining: diffDays,
        status: 'warning',
        severity: 'warning',
        badge: `${diffDays} DAYS LEFT`,
        title: `⚠️ ${name} expires in ${diffDays} days — renew soon`,
        message: `Expires on ${cleanDate}. Please prepare your renewal documents.`,
      }
    }

    return null
  }

  if (restaurant?.fssai_expiry_date) {
    const alert = evaluateLicense('FSSAI license', restaurant.fssai_expiry_date)
    if (alert) alerts.push(alert)
  }

  const others = Array.isArray(restaurant?.other_licenses) ? restaurant.other_licenses : []
  others.forEach((lic) => {
    if (lic && lic.expiry_date) {
      const alert = evaluateLicense(lic.name?.trim() || 'Permit / License', lic.expiry_date)
      if (alert) alerts.push(alert)
    }
  })

  const severityScore = { expired: 0, urgent: 1, warning: 2 }
  alerts.sort((a, b) => {
    const sDiff = (severityScore[a.severity] ?? 9) - (severityScore[b.severity] ?? 9)
    if (sDiff !== 0) return sDiff
    return a.daysRemaining - b.daysRemaining
  })

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    activeAlert: alerts[0] || null,
  }
}

// ============================================================================
// Notification Engine & Trigger Detection Layer
// ============================================================================

function formatLocalDate(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Delivery layer stub: provides isolated hook for future WhatsApp API integration
async function deliverNotification(notification, restaurant = {}) {
  // Current channels: in_app notification inbox
  // FUTURE: WhatsApp API integration hook:
  // if (restaurant.phone && restaurant.whatsapp_enabled) {
  //   await sendWhatsAppTemplate(restaurant.phone, notification.title, notification.message)
  // }
  console.log(`[notifications/deliver] [Channel: in_app] Delivered "${notification.title}" to restaurant "${restaurant.name || restaurant.id}"`)
}

async function generateGeminiAdvice({ todayDate, totalRevenue, billsCaptured, avgBillValue, busiestHour, topItem, yesterdayRevenue, diffYesterdayPercent }, restaurant = {}) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_key_here') {
    if (topItem && busiestHour) {
      return `Busiest rush was ${busiestHour} led by ${topItem.name} (${topItem.quantity} sold)—ensure high-prep ingredients are stocked for this shift tomorrow.`
    }
    return `Recorded ₹${Math.round(totalRevenue).toLocaleString('en-IN')} across ${billsCaptured} bills. Maintain menu availability for tomorrow's peak rush.`
  }

  try {
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const candidateModels = [process.env.GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.8-flash'].filter(Boolean)

    const prompt = `You are an expert restaurant operations consultant for Indian restaurants.
Analyze today's performance data for "${restaurant.name || 'the restaurant'}":
- Date: ${todayDate}
- Total Revenue: ₹${Math.round(totalRevenue).toLocaleString('en-IN')}
- Bills Captured: ${billsCaptured}
- Average Bill Value: ₹${Math.round(avgBillValue).toLocaleString('en-IN')}
- Busiest Hour: ${busiestHour || 'Evenly distributed'}
- Best-Selling Item: ${topItem ? `${topItem.name} (${topItem.quantity} orders, ₹${Math.round(topItem.revenue)})` : 'None'}
- Yesterday's Revenue: ₹${Math.round(yesterdayRevenue).toLocaleString('en-IN')} (${diffYesterdayPercent >= 0 ? `+${diffYesterdayPercent}%` : `${diffYesterdayPercent}%`} vs yesterday)

Task: Write EXACTLY ONE concise, specific, actionable operational advice sentence (under 25 words) for the restaurant owner.
Requirements:
1. Connect the busiest hour, best-selling item, or revenue shift directly to an operational action for tomorrow (prep, staffing, combo upsell, or ingredient stock).
2. Do NOT write generic motivational praise like "Great job!" or "Keep up the momentum!".
3. Output plain text only without quotes or bullet points.`

    for (const modelName of candidateModels) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
        })
        const result = await model.generateContent(prompt)
        const text = result?.response?.text()?.trim()
        if (text) {
          return text.replace(/^["']|["']$/g, '').trim()
        }
      } catch (mErr) {
        console.warn(`[notifications/gemini] Model ${modelName} attempt failed:`, mErr.message)
      }
    }
  } catch (err) {
    console.warn('[notifications/gemini] AI advice generation failed, using smart fallback:', err.message)
  }

  if (topItem) {
    return `${topItem.name} was today's top seller (${topItem.quantity} orders)—consider featuring it in a lunch combo tomorrow to drive higher bill sizes.`
  }
  return `Consistent operational performance across ${billsCaptured} bills. Align inventory prep early ahead of tomorrow's peak hours.`
}

async function checkAndTriggerNotifications(bills = [], restaurant = EMPTY_RESTAURANT, forceDailySummary = false) {
  const restaurantId = restaurant.id || EMPTY_RESTAURANT.id
  if (!restaurantId) return []

  if (!userNotifications.has(restaurantId)) {
    userNotifications.set(restaurantId, [])
  }
  const notifs = userNotifications.get(restaurantId)
  const firedDedupKeys = new Set(notifs.map((n) => n.dedup_key))
  const lastNotified = restaurant.last_notified || {}

  async function addNotification({ trigger_type, dedup_key, title, message, data = {} }) {
    if (firedDedupKeys.has(dedup_key)) return false
    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      restaurant_id: restaurantId,
      trigger_type,
      dedup_key,
      title,
      message,
      data,
      is_read: false,
      delivered_channels: ['in_app'],
      created_at: new Date().toISOString(),
    }
    notifs.unshift(newNotif)
    firedDedupKeys.add(dedup_key)
    lastNotified[trigger_type] = {
      dedup_key,
      title,
      triggered_at: newNotif.created_at,
    }
    await deliverNotification(newNotif, restaurant)

    if (supabase && restaurantId && restaurantId !== EMPTY_RESTAURANT.id) {
      try {
        await withTimeout(
          supabase.from('notifications').insert({
            restaurant_id: restaurantId,
            trigger_type,
            dedup_key,
            title,
            message,
            data,
            is_read: false,
            delivered_channels: ['in_app'],
          })
        )
      } catch (err) {
        console.warn('[notifications] supabase insert failed:', err.message)
      }
    }
    return true
  }

  const now = new Date()
  const todayStr = formatLocalDate(now)

  // Aggregate bills by normalized date
  const dayMap = new Map()
  bills.forEach((b) => {
    const d = normalizeDateToYMD(b.date) || b.date
    if (!d) return
    dayMap.set(d, (dayMap.get(d) || 0) + numberValue(b.total))
  })

  const todayRev = dayMap.get(todayStr) || 0

  // 1. TRIGGER: Best-day-ever record
  let previousMax = 0
  for (const [d, rev] of dayMap.entries()) {
    if (d !== todayStr && rev > previousMax) {
      previousMax = rev
    }
  }

  if (todayRev > 0 && todayRev > previousMax) {
    await addNotification({
      trigger_type: 'best_day_ever',
      dedup_key: `best_day_ever_${todayStr}`,
      title: '🏆 New Best-Day-Ever Record!',
      message: `Today's revenue reached ₹${Math.round(todayRev).toLocaleString('en-IN')}, beating your previous record of ₹${Math.round(previousMax).toLocaleString('en-IN')}!`,
      data: { todayRev, previousRecord: previousMax, date: todayStr },
    })
  }

  // 2. TRIGGER: Weekly average crossed (trailing 7-day average exceeded by >= 15%)
  let trailing7Sum = 0
  for (let i = 1; i <= 7; i++) {
    const prevDate = new Date(now)
    prevDate.setDate(prevDate.getDate() - i)
    const pStr = formatLocalDate(prevDate)
    trailing7Sum += dayMap.get(pStr) || 0
  }
  const trailing7Avg = trailing7Sum / 7
  if (trailing7Avg > 0 && todayRev > 0) {
    const marginPercent = Math.round(((todayRev - trailing7Avg) / trailing7Avg) * 100)
    if (marginPercent >= 15) {
      await addNotification({
        trigger_type: 'weekly_average',
        dedup_key: `weekly_avg_crossed_${todayStr}`,
        title: `📈 Trailing 7-Day Average Beaten by ${marginPercent}%!`,
        message: `Today's revenue (₹${Math.round(todayRev).toLocaleString('en-IN')}) beat your trailing 7-day daily average of ₹${Math.round(trailing7Avg).toLocaleString('en-IN')} by ${marginPercent}%.`,
        data: { todayRev, trailing7Avg, marginPercent, date: todayStr },
      })
    }
  }

  // 3. TRIGGER: License expiring (60-day, 30-day, and expired thresholds)
  const compliance = computeComplianceAlerts(restaurant)
  for (const alert of compliance.alerts) {
    let dedup_key = ''
    if (alert.severity === 'expired') {
      dedup_key = `license_expired_${alert.name}_${alert.expiryDate}`
    } else if (alert.severity === 'urgent') {
      dedup_key = `license_urgent_30d_${alert.name}_${alert.expiryDate}`
    } else if (alert.severity === 'warning') {
      dedup_key = `license_warning_60d_${alert.name}_${alert.expiryDate}`
    }

    if (dedup_key) {
      await addNotification({
        trigger_type: 'license_expiring',
        dedup_key,
        title: alert.title,
        message: alert.message,
        data: alert,
      })
    }
  }

  // 4. TRIGGER: Milestone achievements (monthly revenue & bill count milestones)
  const milestonesResult = computeMilestones(bills, restaurant)
  for (const milestone of milestonesResult.allMilestones) {
    if (milestone.type === 'monthly_revenue' || milestone.type === 'bill_count') {
      await addNotification({
        trigger_type: 'milestone',
        dedup_key: `milestone_notif_${milestone.id}`,
        title: milestone.title,
        message: milestone.description,
        data: milestone,
      })
    }
  }

  // 5. TRIGGER: Daily summary generation at closing time with Gemini advice line
  const closingTime = restaurant.closing_time?.trim() || '23:00'
  const [closeH, closeM] = closingTime.split(':').map((v) => parseInt(v, 10) || 0)
  const currentH = now.getHours()
  const currentM = now.getMinutes()
  const isPastClosing = currentH > closeH || (currentH === closeH && currentM >= closeM)

  if ((isPastClosing || forceDailySummary) && todayRev > 0) {
    const summaryDedupKey = `daily_summary_${todayStr}`
    if (!firedDedupKeys.has(summaryDedupKey) || forceDailySummary) {
      const todayBills = bills.filter((b) => (normalizeDateToYMD(b.date) || b.date) === todayStr)
      const billsCaptured = todayBills.length
      const avgBillValue = billsCaptured > 0 ? todayRev / billsCaptured : 0

      // Busiest hour
      const hourMap = new Map()
      todayBills.forEach((b) => {
        const timeStr = String(b.time || '12:00').slice(0, 2)
        const h = parseInt(timeStr, 10) || 12
        hourMap.set(h, (hourMap.get(h) || 0) + numberValue(b.total))
      })
      let maxHour = null
      let maxHourRev = 0
      for (const [h, r] of hourMap.entries()) {
        if (r > maxHourRev) {
          maxHourRev = r
          maxHour = h
        }
      }
      const busiestHourStr = maxHour !== null
        ? `${maxHour % 12 || 12} ${maxHour >= 12 ? 'PM' : 'AM'} - ${(maxHour + 1) % 12 || 12} ${maxHour + 1 >= 12 ? 'PM' : 'AM'}`
        : 'Evenly distributed'

      // Top-selling dish
      const dishMap = new Map()
      todayBills.flatMap((b) => b.bill_items || []).forEach((item) => {
        const n = item.item_name || item.name || 'Special'
        const cur = dishMap.get(n) || { name: n, quantity: 0, revenue: 0 }
        cur.quantity += numberValue(item.quantity)
        cur.revenue += numberValue(item.amount)
        dishMap.set(n, cur)
      })
      let topItem = null
      let maxOrders = 0
      for (const it of dishMap.values()) {
        if (it.quantity > maxOrders) {
          maxOrders = it.quantity
          topItem = it
        }
      }

      // Comparison to yesterday
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = formatLocalDate(yesterday)
      const yesterdayRev = dayMap.get(yesterdayStr) || 0
      const diffYesterdayPercent = yesterdayRev > 0
        ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100)
        : 0

      const aiAdvice = await generateGeminiAdvice(
        {
          todayDate: todayStr,
          totalRevenue: todayRev,
          billsCaptured,
          avgBillValue,
          busiestHour: busiestHourStr,
          topItem,
          yesterdayRevenue: yesterdayRev,
          diffYesterdayPercent,
        },
        restaurant
      )

      if (forceDailySummary && firedDedupKeys.has(summaryDedupKey)) {
        const idx = notifs.findIndex((n) => n.dedup_key === summaryDedupKey)
        if (idx >= 0) notifs.splice(idx, 1)
        firedDedupKeys.delete(summaryDedupKey)
      }

      await addNotification({
        trigger_type: 'daily_summary',
        dedup_key: summaryDedupKey,
        title: `🌙 Daily Pulse: ₹${Math.round(todayRev).toLocaleString('en-IN')}`,
        message: `${billsCaptured} bills (avg ₹${Math.round(avgBillValue).toLocaleString('en-IN')}). ${aiAdvice}`,
        data: {
          totalRevenue: todayRev,
          billsCaptured,
          avgBillValue,
          busiestHour: busiestHourStr,
          topItem: topItem?.name,
          yesterdayRevenue: yesterdayRev,
          aiAdvice,
        },
      })
    }
  }

  restaurant.last_notified = lastNotified
  saveStore()
  return notifs
}

function computeDashboard(bills, restaurant = EMPTY_RESTAURANT, options = {}) {
  const allBills = bills || []
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Options parsing
  const opts = typeof options === 'number' ? { weekOffset: options, periodType: 'week' } : (options || {})
  const periodType = (opts.periodType || (opts.month ? 'month' : 'week')).toLowerCase()
  const weekOffset = parseInt(opts.weekOffset, 10) || 0
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // Available months list (matching Reports logic)
  const allMonthsWithBills = [...new Set(allBills.map((b) => {
    const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
    return d ? d.slice(0, 7) : null
  }).filter(Boolean))].sort().reverse()

  if (!allMonthsWithBills.includes(currentMonthStr)) {
    allMonthsWithBills.unshift(currentMonthStr)
  }

  // 1. TODAY'S DAILY SUMMARY (Always calculated for TODAY across all bills so Daily Summary panel never breaks)
  const todayBills = allBills.filter((b) => {
    const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
    return d === todayStr
  })
  const todayRev = todayBills.reduce((sum, b) => sum + numberValue(b.total), 0)
  const todayBillsCount = todayBills.length
  const todayAvgBill = todayBillsCount ? Math.round(todayRev / todayBillsCount) : 0
  const todayLineItems = todayBills.reduce((sum, b) => {
    const items = b.bill_items || b.lineItems || b.items || []
    return sum + (Array.isArray(items) ? items.length : numberValue(b.items || 0))
  }, 0)

  const todaySummary = [
    { label: 'Revenue', value: todayRev > 0 ? `₹${todayRev.toLocaleString('en-IN')}` : '₹0', tone: 'primary' },
    { label: 'Bills captured', value: String(todayBillsCount), tone: 'primary' },
    { label: 'Avg. bill value', value: todayBillsCount > 0 ? `₹${todayAvgBill.toLocaleString('en-IN')}` : '₹0', tone: 'primary' },
    { label: 'Line items', value: String(todayLineItems), tone: 'primary' },
  ]
  const todayDateLabel = today.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'short' })
  const todayStatus = todayRev >= 3500 ? 'Peak day' : todayRev >= 2000 ? 'High day' : todayRev > 0 ? 'Steady day' : 'Quiet day'
  const todayNote = {
    title: todayRev > 0 ? (todayStatus === 'Peak day' ? 'Strong service' : 'Regular service') : 'Today’s service',
    description: todayRev > 0 ? `₹${todayRev.toLocaleString('en-IN')} recorded across ${todayBillsCount} bill(s) today.` : 'No bills recorded today yet.',
  }

  // 2. PERIOD RESOLUTION
  let periodBills = []
  let calendar = []
  let periodLabel = ''
  let selectedMonth = null
  let allTimeStats = null
  let kpiNoteRev = 'from saved bills'
  let kpiNoteBills = 'saved bills'

  if (periodType === 'month') {
    let targetMonth = opts.month && /^\d{4}-\d{2}$/.test(opts.month) ? opts.month : currentMonthStr
    // Prevent selecting future months
    if (targetMonth > currentMonthStr) {
      targetMonth = currentMonthStr
    }
    selectedMonth = targetMonth
    periodBills = allBills.filter((b) => {
      const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
      return d && d.startsWith(selectedMonth)
    })
    calendar = buildMonthCalendar(allBills, selectedMonth)
    const [yStr, mStr] = selectedMonth.split('-')
    const reportDate = new Date(Number(yStr), Number(mStr) - 1, 1)
    const monthName = reportDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    periodLabel = monthName
    kpiNoteRev = `in ${reportDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    kpiNoteBills = `in ${reportDate.toLocaleDateString('en-US', { month: 'short' })}`
  } else if (periodType === 'all') {
    periodBills = allBills
    periodLabel = 'All Time'
    allTimeStats = buildAllTimeStats(allBills)
    calendar = []
    kpiNoteRev = 'all-time total'
    kpiNoteBills = 'all-time captured'
  } else {
    // Default: 'week'
    calendar = build7DayCalendar(allBills, weekOffset)
    const startStr = calendar[0]?.fullDate
    const endStr = calendar[calendar.length - 1]?.fullDate
    periodBills = allBills.filter((b) => {
      const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
      return d && startStr && endStr && d >= startStr && d <= endStr
    })
    const firstDay = calendar[0]
    const lastDay = calendar[calendar.length - 1]
    periodLabel = firstDay && lastDay ? `${firstDay.date} ${firstDay.day} – ${lastDay.date} ${lastDay.day}` : 'This week'
    kpiNoteRev = 'in 7-day period'
    kpiNoteBills = 'in 7-day period'
  }

  // 3. STAT CARDS / KPIS COMPUTED FROM PERIOD BILLS
  const periodRevenue = periodBills.reduce((sum, bill) => sum + numberValue(bill.total), 0)
  const periodBillCount = periodBills.length
  const periodAvgBill = periodBillCount ? Math.round(periodRevenue / periodBillCount) : 0
  const periodItems = periodBills.flatMap((bill) => bill.bill_items || [])
  const periodItemCount = periodItems.reduce((s, it) => s + (numberValue(it.quantity) || 1), 0)

  // 4. TOP ITEMS
  const dishMap = new Map()
  periodItems.forEach((item) => {
    const name = item.item_name || item.name || 'Unknown dish'
    const current = dishMap.get(name) || { name, orders: 0, revenue: 0 }
    current.orders += numberValue(item.quantity)
    current.revenue += numberValue(item.amount)
    dishMap.set(name, current)
  })

  let topSources = [...dishMap.values()]
  if (topSources.length === 0 && allBills.length > 0) {
    const allItems = allBills.flatMap((bill) => bill.bill_items || [])
    const allDishMap = new Map()
    allItems.forEach((item) => {
      const name = item.item_name || item.name || 'Unknown dish'
      const cur = allDishMap.get(name) || { name, orders: 0, revenue: 0 }
      cur.orders += numberValue(item.quantity)
      cur.revenue += numberValue(item.amount)
      allDishMap.set(name, cur)
    })
    topSources = [...allDishMap.values()]
  }

  const top = topSources
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5)
    .map((item) => ({ ...item, revenue: `₹${item.revenue.toLocaleString('en-IN')}`, category: 'Menu item', margin: '-', trend: '-' }))

  // 5. RECENT BILLS
  const recentSourceBills = periodBills.length > 0 ? periodBills : allBills
  const recentBills = recentSourceBills.slice(0, 8).map((bill) => ({
    number: `#${bill.bill_number || String(bill.id || '').slice(0, 8)}`,
    time: String(bill.time || '-').slice(0, 5),
    date: normalizeDateToYMD(bill.date) || bill.date || '-',
    items: bill.bill_items?.length || 0,
    total: `₹${numberValue(bill.total).toLocaleString('en-IN')}`,
  }))

  return {
    kpis: [
      { label: 'Total revenue', value: `₹${periodRevenue.toLocaleString('en-IN')}`, change: '-', note: kpiNoteRev, tone: 'orange' },
      { label: 'Bills captured', value: String(periodBillCount), change: '-', note: kpiNoteBills, tone: 'orange' },
      { label: 'Avg. bill value', value: periodBillCount ? `₹${periodAvgBill.toLocaleString('en-IN')}` : '₹0', change: '-', note: 'per bill', tone: 'green' },
      { label: 'Items sold', value: String(periodItemCount), change: '-', note: 'items recorded', tone: 'orange' },
    ],
    calendar,
    periodType,
    weekOffset: Number(weekOffset) || 0,
    selectedMonth,
    periodLabel,
    availableMonths: allMonthsWithBills,
    allTimeStats,
    topItems: top,
    popularCombos: computePopularCombos(periodBills.length ? periodBills : allBills),
    milestones: computeMilestones(allBills, restaurant),
    complianceAlerts: computeComplianceAlerts(restaurant),
    notifications: userNotifications.get(restaurant.id) || [],
    unreadNotificationsCount: (userNotifications.get(restaurant.id) || []).filter((n) => !n.is_read).length,
    recentBills,
    todaySummary,
    todayDateLabel,
    todayStatus,
    todayNote,
    dailySummary: todaySummary,
  }
}

app.get('/api/dashboard', async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id
  const periodType = (request.query.periodType || (request.query.month ? 'month' : 'week')).toLowerCase()
  const weekOffset = parseInt(request.query.weekOffset, 10) || 0
  const month = request.query.month || ''

  let bills = []
  if (restaurantId && userBills.has(restaurantId)) {
    bills = [...userBills.get(restaurantId)]
  }

  if (supabase && restaurantId && restaurantId !== EMPTY_RESTAURANT.id) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('bills').select('*, bill_items(*)').eq('restaurant_id', restaurantId).order('date', { ascending: false }).order('time', { ascending: false })
      )
      if (!error && data) {
        const existingIds = new Set(data.map((b) => b.id || b.bill_number))
        bills = [...data, ...bills.filter((b) => !existingIds.has(b.id || b.bill_number))]
      }
    } catch (error) {
      console.warn('[dashboard] supabase fetch failed for restaurantId:', restaurantId, error.message)
    }
  }

  try {
    await checkAndTriggerNotifications(bills, restaurant)
  } catch (err) {
    console.warn('[dashboard] checkAndTriggerNotifications failed:', err.message)
  }

  return response.json(computeDashboard(bills, restaurant, { periodType, weekOffset, month }))
})

function inferDishCategory(dishName) {
  const name = String(dishName || '').toLowerCase()
  if (/(sandwich|burger|roll|wrap|toast|panini|sub|frankie)/i.test(name)) return 'Sandwiches'
  if (/(mojito|shake|coffee|tea|chaas|lassi|juice|soda|cooler|mocktail|drink|beverage|latte|cappuccino|espresso)/i.test(name)) return 'Beverages'
  if (/(soup|tikka|kebab|chilli|samosa|pakoda|nachos|momo|starter|appetizer|wings|crispy|manchow)/i.test(name)) return 'Starters'
  if (/(naan|roti|paratha|kulcha|bhature|puri|bread)/i.test(name)) return 'Breads'
  if (/(fries|raita|salad|papad|dip|chutney)/i.test(name)) return 'Sides'
  if (/(jamun|brownie|ice\s*cream|kheer|halwa|pastry|cake|sundae|dessert|mithai|lava)/i.test(name)) return 'Desserts'
  if (/(paneer|dal|makhani|biryani|rice|pulao|curry|korma|thali|noodles|pasta|pizza|lababdar|masala|gravy|kofta)/i.test(name)) return 'Mains'
  return 'Specialties'
}

function computeMonthlyReportFullAnalytics(monthBills, allBills, currentYearMonth, restaurant, monthRevenue, gstSummary) {
  const [yStr, mStr] = currentYearMonth.split('-')
  const curY = Number(yStr)
  const curM = Number(mStr)
  const daysInMonth = new Date(curY, curM, 0).getDate()
  const billCount = monthBills.length
  const avgBillValue = billCount > 0 ? Math.round(monthRevenue / billCount) : 0
  const avgDailyRevenue = Math.round(monthRevenue / daysInMonth)

  // 1. Items sold
  const allItems = monthBills.flatMap((b) => b.bill_items || b.items || [])
  const itemsSold = allItems.reduce((s, it) => s + (numberValue(it.quantity) || 1), 0)

  // 2. Previous Month Comparisons
  const prevDate = new Date(curY, curM - 2, 1)
  const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const prevMonthBills = allBills.filter((b) => {
    const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
    return d && d.startsWith(prevYearMonth)
  })
  const hasPrevData = prevMonthBills.length > 0
  const prevMonthName = prevDate.toLocaleDateString('en-US', { month: 'short' })

  let mom = {
    hasData: false,
    prevMonthName,
    revenue: null,
    billCount: null,
    avgBillValue: null,
    itemsSold: null,
    dailyRevenue: null,
  }

  const prevItemMap = new Map()
  if (hasPrevData) {
    const prevRevenue = prevMonthBills.reduce((s, b) => s + numberValue(b.total), 0)
    const prevBillCount = prevMonthBills.length
    const prevAvgBill = prevBillCount > 0 ? Math.round(prevRevenue / prevBillCount) : 0
    const prevItems = prevMonthBills.flatMap((b) => b.bill_items || b.items || [])
    const prevItemsSold = prevItems.reduce((s, it) => s + (numberValue(it.quantity) || 1), 0)
    const prevDaysInMonth = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate()
    const prevDailyAvg = Math.round(prevRevenue / prevDaysInMonth)

    prevItems.forEach((it) => {
      const name = String(it.item_name || it.name || '').trim()
      if (name) {
        prevItemMap.set(name.toLowerCase(), (prevItemMap.get(name.toLowerCase()) || 0) + (numberValue(it.quantity) || 1))
      }
    })

    mom = {
      hasData: true,
      prevMonthName,
      revenue: prevRevenue > 0 ? (((monthRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : null,
      billCount: prevBillCount > 0 ? (((billCount - prevBillCount) / prevBillCount) * 100).toFixed(1) : null,
      avgBillValue: prevAvgBill > 0 ? (((avgBillValue - prevAvgBill) / prevAvgBill) * 100).toFixed(1) : null,
      itemsSold: prevItemsSold > 0 ? (((itemsSold - prevItemsSold) / prevItemsSold) * 100).toFixed(1) : null,
      dailyRevenue: prevDailyAvg > 0 ? (((avgDailyRevenue - prevDailyAvg) / prevDailyAvg) * 100).toFixed(1) : null,
    }
  }

  // 3. Daily Revenue Breakdown (1 to daysInMonth)
  const dailyBreakdown = []
  let maxDayRev = 0
  let minDayRev = Infinity
  let bestDay = null
  let slowestDay = null

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0')
    const dateKey = `${currentYearMonth}-${dayStr}`
    const dateObj = new Date(curY, curM - 1, d)
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
    const fullWeekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    const isWeekend = (dayOfWeek === 'Sat' || dayOfWeek === 'Sun')

    const dayBills = monthBills.filter((b) => {
      const bDate = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
      return bDate === dateKey
    })
    const dayRev = dayBills.reduce((s, b) => s + numberValue(b.total), 0)
    const bCount = dayBills.length

    if (dayRev > maxDayRev) {
      maxDayRev = dayRev
      bestDay = { day: d, date: dateKey, label: `${d} ${dateObj.toLocaleDateString('en-US', { month: 'short' })} · ${dayOfWeek}`, revenue: dayRev, billsCount: bCount }
    }
    if (dayRev > 0 && dayRev < minDayRev) {
      minDayRev = dayRev
      slowestDay = { day: d, date: dateKey, label: `${d} ${dateObj.toLocaleDateString('en-US', { month: 'short' })} · ${dayOfWeek}`, revenue: dayRev, billsCount: bCount }
    }

    dailyBreakdown.push({
      day: d,
      date: dateKey,
      dayOfWeek,
      fullWeekday,
      isWeekend,
      revenue: dayRev,
      billsCount: bCount,
      isAboveAverage: dayRev >= avgDailyRevenue,
    })
  }



  // 4. Weekday Pattern
  const weekdaySums = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  const weekdayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  dailyBreakdown.forEach((day) => {
    if (weekdaySums[day.dayOfWeek] !== undefined) {
      weekdaySums[day.dayOfWeek] += day.revenue
      weekdayCounts[day.dayOfWeek] += 1
    }
  })
  const weekdayPattern = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
    day,
    amount: weekdayCounts[day] > 0 ? Math.round(weekdaySums[day] / weekdayCounts[day]) : 0,
  }))
  const weekdaysWithBills = weekdayPattern.filter((w) => w.amount > 0)
  const busiestWeekday = weekdaysWithBills.length > 0 ? [...weekdaysWithBills].sort((a, b) => b.amount - a.amount)[0] : null
  const slowestWeekday = weekdaysWithBills.length > 0 ? [...weekdaysWithBills].sort((a, b) => a.amount - b.amount)[0] : null

  // 5. Operating Hours Heatmap & Synchronized Peak Hour (7 weekdays x 14 hours: 9A to 10P)
  const heatmapHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
  const heatmapCounts = Array.from({ length: 7 }, () => new Array(14).fill(0))

  monthBills.forEach((b) => {
    const dStr = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
    if (!dStr) return
    const dObj = new Date(dStr)
    const dayIdx = (dObj.getDay() + 6) % 7 // Mon=0, Sun=6
    const tStr = String(b.time || '').trim()
    const match = tStr.match(/^(\d{1,2})/)
    if (match) {
      const h = parseInt(match[1], 10)
      const hIdx = heatmapHours.indexOf(h)
      if (hIdx !== -1) {
        heatmapCounts[dayIdx][hIdx] += 1
      }
    }
  })

  let maxSlotCount = 0
  let peakSlotDay = null
  let peakSlotHour = null
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 14; c++) {
      if (heatmapCounts[r][c] > maxSlotCount) {
        maxSlotCount = heatmapCounts[r][c]
        peakSlotDay = r
        peakSlotHour = c
      }
    }
  }

  let peakHourStr = '—'
  let peakHourBillsCount = 0
  let peakSlotObj = null

  if (maxSlotCount > 0 && peakSlotDay !== null && peakSlotHour !== null) {
    const peakH = heatmapHours[peakSlotHour]
    const h1 = peakH % 12 || 12
    const h2 = (peakH + 1) % 12 || 12
    const ampm = (peakH + 1) >= 12 && (peakH + 1) < 24 ? 'PM' : (peakH >= 12 ? 'PM' : 'AM')
    peakHourStr = `${h1} – ${h2} ${ampm}`
    peakHourBillsCount = maxSlotCount
    peakSlotObj = { day: peakSlotDay, hour: peakSlotHour }
  } else if (monthBills.length > 0) {
    // If bills exist but times are outside 9A-10P or unformatted
    const hourCounts = new Array(24).fill(0)
    monthBills.forEach((b) => {
      const tStr = String(b.time || '').trim()
      const match = tStr.match(/^(\d{1,2})/)
      if (match) {
        const h = parseInt(match[1], 10)
        if (h >= 0 && h < 24) hourCounts[h] += 1
      }
    })
    let fallbackMax = 0
    let fallbackH = -1
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > fallbackMax) {
        fallbackMax = hourCounts[h]
        fallbackH = h
      }
    }
    if (fallbackMax > 0 && fallbackH >= 0) {
      const h1 = fallbackH % 12 || 12
      const h2 = (fallbackH + 1) % 12 || 12
      const ampm = (fallbackH + 1) >= 12 && (fallbackH + 1) < 24 ? 'PM' : (fallbackH >= 12 ? 'PM' : 'AM')
      peakHourStr = `${h1} – ${h2} ${ampm}`
      peakHourBillsCount = fallbackMax
    }
  }

  const heatmapLevels = heatmapCounts.map((row) =>
    row.map((cnt) => {
      if (cnt === 0) return 1
      if (!maxSlotCount || maxSlotCount <= 1) return 2
      const ratio = cnt / maxSlotCount
      if (ratio > 0.8) return 5
      if (ratio > 0.55) return 4
      if (ratio > 0.3) return 3
      if (ratio > 0.1) return 2
      return 1
    })
  )

  // 6. Top Dishes & Spotlight Dish (100% Real, null if no bills)
  const dishMap = new Map()
  allItems.forEach((it) => {
    const name = String(it.item_name || it.name || '').trim()
    if (!name) return
    const current = dishMap.get(name) || { name, portions: 0, revenue: 0 }
    current.portions += numberValue(it.quantity) || 1
    current.revenue += numberValue(it.amount) || (numberValue(it.rate) * (numberValue(it.quantity) || 1)) || 0
    dishMap.set(name, current)
  })

  const sortedDishes = [...dishMap.values()].sort((a, b) => b.portions - a.portions)
  const top10Dishes = sortedDishes.slice(0, 10).map((d, idx) => {
    const category = inferDishCategory(d.name)
    const share = itemsSold > 0 ? ((d.portions / itemsSold) * 100).toFixed(1) + '%' : '0%'
    let momChange = null
    let isUp = true
    if (hasPrevData) {
      const prevPortions = prevItemMap.get(d.name.toLowerCase()) || 0
      if (prevPortions > 0) {
        const diff = d.portions - prevPortions
        isUp = diff >= 0
        momChange = (diff >= 0 ? '+' : '') + (((diff) / prevPortions) * 100).toFixed(0) + '%'
      }
    }
    return {
      rank: idx + 1,
      name: d.name,
      category,
      portions: d.portions,
      revenue: d.revenue,
      share,
      momChange,
      isUp,
    }
  })

  const topDish = sortedDishes.length > 0 ? sortedDishes[0] : null
  const spotlightDish = topDish ? {
    name: topDish.name,
    category: inferDishCategory(topDish.name),
    portions: topDish.portions,
    revenue: topDish.revenue,
    soldPerDay: daysInMonth > 0 ? (topDish.portions / daysInMonth).toFixed(1) : '0.0',
    share: itemsSold > 0 ? ((topDish.portions / itemsSold) * 100).toFixed(1) + '%' : '0%',
  } : null

  // 7. Popular Combos (100% Real, empty if insufficient multi-item orders)
  const popularCombos = computePopularCombos(monthBills)

  const openTime = restaurant.opening_time || '9:00 AM'
  const closeTime = restaurant.closing_time || '11:00 PM'
  const operatingHoursStr = `${openTime} – ${closeTime}`

  let monthlyAiInsight = ''
  if (monthBills.length === 0) {
    monthlyAiInsight = 'No bills recorded for this month yet. Capture bills or upload invoices to view performance insights.'
  } else {
    const insightParts = []
    if (busiestWeekday && busiestWeekday.amount > 0) {
      if (slowestWeekday && slowestWeekday.amount > 0 && busiestWeekday.day !== slowestWeekday.day) {
        const ratio = (busiestWeekday.amount / slowestWeekday.amount).toFixed(1)
        insightParts.push(`${busiestWeekday.day}s average ₹${busiestWeekday.amount.toLocaleString('en-IN')}, ${ratio}x a typical ${slowestWeekday.day}.`)
      } else {
        insightParts.push(`${busiestWeekday.day}s are your highest grossing weekday, averaging ₹${busiestWeekday.amount.toLocaleString('en-IN')}.`)
      }
    }
    if (top10Dishes.length > 0 && itemsSold > 0) {
      const top10DishPortions = top10Dishes.reduce((s, d) => s + d.portions, 0)
      const top10Share = Math.round((top10DishPortions / itemsSold) * 100)
      insightParts.push(`Top ${top10Dishes.length} dishes drive ${top10Share}% of items sold.`)
    }
    monthlyAiInsight = insightParts.join(' ') || `Monthly performance tracked across ${monthBills.length} ${monthBills.length === 1 ? 'bill' : 'bills'}.`
  }

  // Real bestDay & slowestDay (null if no revenue recorded)
  const daysWithRevenue = dailyBreakdown.filter((d) => d.revenue > 0)
  bestDay = null
  slowestDay = null
  if (daysWithRevenue.length > 0) {
    const sortedByRev = [...daysWithRevenue].sort((a, b) => b.revenue - a.revenue)
    const topD = sortedByRev[0]
    const lowD = sortedByRev[sortedByRev.length - 1]
    bestDay = {
      day: topD.day,
      date: topD.date,
      label: `${topD.day} ${new Date(curY, curM - 1, topD.day).toLocaleDateString('en-US', { month: 'short' })} · ${topD.dayOfWeek}`,
      revenue: topD.revenue,
      billsCount: topD.billsCount,
    }
    slowestDay = {
      day: lowD.day,
      date: lowD.date,
      label: `${lowD.day} ${new Date(curY, curM - 1, lowD.day).toLocaleDateString('en-US', { month: 'short' })} · ${lowD.dayOfWeek}`,
      revenue: lowD.revenue,
      billsCount: lowD.billsCount,
    }
  }

  return {
    mom,
    dailyBreakdown,
    bestDay,
    slowestDay,
    weekdayPattern,
    busiestWeekday: busiestWeekday?.day || '—',
    busiestWeekdayAvg: busiestWeekday?.amount || 0,
    peakHour: peakHourStr,
    peakHourBills: peakHourBillsCount,
    itemsSold,
    top10Dishes,
    spotlightDish,
    popularCombos: popularCombos?.combos || [],
    heatmap: {
      matrix: heatmapLevels,
      peakSlot: peakSlotObj,
    },
    operatingHours: operatingHoursStr,
    monthlyAiInsight,
  }
}

app.get('/api/reports/monthly', async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id

  let allBills = []
  if (restaurantId && userBills.has(restaurantId)) {
    allBills = [...userBills.get(restaurantId)]
  }
  if (fs.existsSync(STORE_FILE)) {
    try {
      const disk = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
      if (disk.bills && disk.bills[restaurantId]) {
        const diskBills = disk.bills[restaurantId]
        const existingIds = new Set(allBills.map((b) => b.id || b.bill_number))
        for (const db of diskBills) {
          if (!existingIds.has(db.id || db.bill_number)) {
            allBills.push(db)
          }
        }
        userBills.set(restaurantId, allBills)
      }
    } catch {}
  }

  if (supabase && restaurantId && restaurantId !== EMPTY_RESTAURANT.id) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('bills').select('*, bill_items(*)').eq('restaurant_id', restaurantId).order('date', { ascending: false })
      )
      if (!error && data) {
        const existingIds = new Set(data.map((b) => b.id || b.bill_number))
        allBills = [...data, ...allBills.filter((b) => !existingIds.has(b.id || b.bill_number))]
      }
    } catch (err) {
      console.warn('[reports/monthly] supabase fetch failed for restaurantId:', restaurantId, err.message)
    }
  }

  const allMonthsWithBills = [...new Set(allBills.map((b) => {
    const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
    return d ? d.slice(0, 7) : null
  }).filter(Boolean))].sort().reverse()

  const today = new Date()
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  let currentYearMonth = request.query.month && /^\d{4}-\d{2}$/.test(request.query.month)
    ? request.query.month
    : currentMonthStr

  // Prevent selecting future months
  if (currentYearMonth > currentMonthStr) {
    currentYearMonth = currentMonthStr
  }

  const monthBills = allBills.filter((b) => {
    const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
    return d && d.startsWith(currentYearMonth)
  })

  const [yStr, mStr] = currentYearMonth.split('-')
  const reportDate = new Date(Number(yStr), Number(mStr) - 1, 1)
  const monthRevenue = monthBills.reduce((sum, b) => sum + numberValue(b.total), 0)
  const monthName = reportDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const lastDay = new Date(Number(yStr), Number(mStr), 0).getDate()
  const periodLabel = `1 – ${lastDay} ${monthName.toUpperCase()}`

  // Compute GST Summary across all bills in the selected month
  const totalTaxable = monthBills.reduce((sum, b) => {
    const tot = numberValue(b.total)
    const tax = numberValue(b.gst ?? b.tax ?? 0)
    const sub = b.subtotal != null ? numberValue(b.subtotal) : (tot - tax > 0 ? tot - tax : tot)
    return sum + sub
  }, 0)

  const totalGst = monthBills.reduce((sum, b) => {
    const tax = numberValue(b.gst ?? b.tax ?? 0)
    const tot = numberValue(b.total)
    const sub = numberValue(b.subtotal)
    if (tax > 0) return sum + tax
    if (tot > sub && sub > 0) return sum + (tot - sub)
    return sum
  }, 0)

  const totalCgst = Math.round((totalGst / 2) * 100) / 100
  const totalSgst = Math.round((totalGst - totalCgst) * 100) / 100

  const gstSummary = {
    taxableAmount: Math.round(totalTaxable * 100) / 100,
    cgst: totalCgst,
    sgst: totalSgst,
    totalGst: Math.round(totalGst * 100) / 100,
    billCount: monthBills.length,
  }

  const availableMonths = [...new Set(allBills.map((b) => {
    const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
    return d ? d.slice(0, 7) : null
  }).filter(Boolean))].sort().reverse()

  if (!availableMonths.includes(currentYearMonth)) {
    availableMonths.unshift(currentYearMonth)
  }

  const analytics = computeMonthlyReportFullAnalytics(
    monthBills,
    allBills,
    currentYearMonth,
    restaurant,
    monthRevenue,
    gstSummary
  )

  return response.json({
    month: currentYearMonth,
    monthName,
    periodLabel,
    revenue: monthRevenue,
    billCount: monthBills.length,
    bills: monthBills,
    gstSummary,
    availableMonths,
    analytics,
  })
})

app.get('/api/reports/gst-summary', async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id

  let allBills = []
  if (restaurantId && userBills.has(restaurantId)) {
    allBills = [...userBills.get(restaurantId)]
  }
  if (fs.existsSync(STORE_FILE)) {
    try {
      const disk = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
      if (disk.bills && disk.bills[restaurantId]) {
        const diskBills = disk.bills[restaurantId]
        const existingIds = new Set(allBills.map((b) => b.id || b.bill_number))
        for (const db of diskBills) {
          if (!existingIds.has(db.id || db.bill_number)) {
            allBills.push(db)
          }
        }
        userBills.set(restaurantId, allBills)
      }
    } catch {}
  }

  if (supabase && restaurantId && restaurantId !== EMPTY_RESTAURANT.id) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('bills').select('*, bill_items(*)').eq('restaurant_id', restaurantId).order('date', { ascending: false })
      )
      if (!error && data) {
        const existingIds = new Set(data.map((b) => b.id || b.bill_number))
        allBills = [...data, ...allBills.filter((b) => !existingIds.has(b.id || b.bill_number))]
      }
    } catch (err) {
      console.warn('[reports/gst-summary] supabase fetch failed for restaurantId:', restaurantId, err.message)
    }
  }

  const today = new Date()
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  let currentYearMonth = request.query.month && /^\d{4}-\d{2}$/.test(request.query.month)
    ? request.query.month
    : currentMonthStr

  if (currentYearMonth > currentMonthStr) {
    currentYearMonth = currentMonthStr
  }

  const monthBills = allBills.filter((b) => {
    const d = normalizeDateToYMD(b.date) || normalizeDateToYMD(b.created_at)
    return d && d.startsWith(currentYearMonth)
  })

  const [yStr, mStr] = currentYearMonth.split('-')
  const reportDate = new Date(Number(yStr), Number(mStr) - 1, 1)
  const monthName = reportDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const lastDay = new Date(Number(yStr), Number(mStr), 0).getDate()
  const periodLabel = `01 ${reportDate.toLocaleDateString('en-US', { month: 'short' })} ${yStr} – ${String(lastDay).padStart(2, '0')} ${reportDate.toLocaleDateString('en-US', { month: 'short' })} ${yStr}`

  const totalTaxable = monthBills.reduce((sum, b) => {
    const tot = numberValue(b.total)
    const tax = numberValue(b.gst ?? b.tax ?? 0)
    const sub = b.subtotal != null ? numberValue(b.subtotal) : (tot - tax > 0 ? tot - tax : tot)
    return sum + sub
  }, 0)

  const totalGst = monthBills.reduce((sum, b) => {
    const tax = numberValue(b.gst ?? b.tax ?? 0)
    const tot = numberValue(b.total)
    const sub = numberValue(b.subtotal)
    if (tax > 0) return sum + tax
    if (tot > sub && sub > 0) return sum + (tot - sub)
    return sum
  }, 0)

  const totalCgst = Math.round((totalGst / 2) * 100) / 100
  const totalSgst = Math.round((totalGst - totalCgst) * 100) / 100

  return response.json({
    month: currentYearMonth,
    monthName,
    periodLabel,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      gstin: restaurant.gstin || '',
      address: restaurant.address || '',
    },
    gstSummary: {
      taxableAmount: Math.round(totalTaxable * 100) / 100,
      cgst: totalCgst,
      sgst: totalSgst,
      totalGst: Math.round(totalGst * 100) / 100,
      billCount: monthBills.length,
    },
    bills: monthBills.map((b) => {
      const tot = numberValue(b.total)
      const tax = numberValue(b.gst ?? b.tax ?? 0)
      const sub = b.subtotal != null ? numberValue(b.subtotal) : (tot - tax > 0 ? tot - tax : tot)
      return {
        id: b.id,
        billNumber: b.bill_number || b.number || String(b.id || '').slice(0, 8),
        date: normalizeDateToYMD(b.date) || b.date,
        time: b.time || '-',
        subtotal: sub,
        gst: tax,
        cgst: Math.round((tax / 2) * 100) / 100,
        sgst: Math.round((tax / 2) * 100) / 100,
        total: tot,
        paymentMode: b.payment_mode || b.paymentMode || 'UPI',
      }
    }),
  })
})

app.get('/api/insights/combos', async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id

  let allBills = []
  if (restaurantId && userBills.has(restaurantId)) {
    allBills = [...userBills.get(restaurantId)]
  }
  if (fs.existsSync(STORE_FILE)) {
    try {
      const disk = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
      if (disk.bills && disk.bills[restaurantId]) {
        const diskBills = disk.bills[restaurantId]
        const existingIds = new Set(allBills.map((b) => b.id || b.bill_number))
        for (const db of diskBills) {
          if (!existingIds.has(db.id || db.bill_number)) {
            allBills.push(db)
          }
        }
        userBills.set(restaurantId, allBills)
      }
    } catch {}
  }
  return response.json(computePopularCombos(allBills))
})

app.post('/api/bills', express.json(), async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id || `rest_${Date.now()}`

  const bill = request.body
  const billNumber = bill.billNumber || bill.number?.replace(/^#/, '') || `BILL-${Math.floor(10000 + Math.random() * 90000)}`
  const billTotal = numberValue(bill.total ?? bill.totalValue)
  const billSubtotal = numberValue(bill.subtotal ?? bill.subtotalValue)
  const billGst = numberValue(bill.gst ?? bill.tax ?? bill.gstValue)

  // Validate non-empty bill items and non-zero total
  if (!Array.isArray(bill.items) || bill.items.length === 0) {
    return response.status(400).json({
      error: 'Cannot record bill: At least one line item is required.',
      code: 'EMPTY_BILL_ITEMS',
    })
  }

  if (billTotal <= 0) {
    return response.status(400).json({
      error: 'Cannot record bill: Total bill amount must be greater than ₹0.',
      code: 'INVALID_BILL_TOTAL',
    })
  }

  const billItems = (bill.items || []).map((item, index) => ({
    id: `bi-${Date.now()}-${index}`,
    item_name: item.name || 'Unknown item',
    quantity: numberValue(item.quantity) || 1,
    rate: numberValue(item.rate ?? item.price),
    amount: numberValue(item.amount ?? item.price),
  }))

  const normalizedDate = normalizeDateToYMD(bill.date) || new Date().toISOString().slice(0, 10)

  // Check duplicate billNumber + date combination for this restaurant
  const existingBills = userBills.get(restaurantId) || []
  const cleanBillNum = String(billNumber).replace(/^#/, '').trim().toLowerCase()
  const isDuplicate = existingBills.some((b) => {
    const existingNum = String(b.bill_number || b.number || b.id || '').replace(/^#/, '').trim().toLowerCase()
    const existingDate = normalizeDateToYMD(b.date)
    return existingNum === cleanBillNum && existingDate === normalizedDate
  })

  if (isDuplicate) {
    return response.status(409).json({
      error: `Duplicate bill: Bill #${cleanBillNum.toUpperCase()} on ${normalizedDate} is already recorded for this restaurant.`,
      code: 'DUPLICATE_BILL',
    })
  }

  const newBillRecord = {
    id: `bill-${Date.now()}`,
    restaurant_id: restaurantId,
    bill_number: billNumber,
    date: normalizedDate,
    time: bill.time || new Date().toTimeString().slice(0, 5),
    table_no: bill.tableNumber || null,
    subtotal: billSubtotal,
    gst: billGst,
    total: billTotal,
    payment_mode: bill.paymentMode || 'UPI',
    bill_items: billItems,
  }

  if (!userBills.has(restaurantId)) {
    userBills.set(restaurantId, [])
  }
  userBills.get(restaurantId).unshift(newBillRecord)
  saveStore()

  if (supabase && restaurantId && restaurantId !== EMPTY_RESTAURANT.id) {
    try {
      const { data: saved, error } = await withTimeout(supabase.from('bills').insert({
        restaurant_id: restaurantId,
        bill_number: newBillRecord.bill_number,
        date: newBillRecord.date,
        time: newBillRecord.time,
        table_no: newBillRecord.table_no,
        subtotal: newBillRecord.subtotal,
        gst: newBillRecord.gst,
        total: newBillRecord.total,
        payment_mode: newBillRecord.payment_mode,
      }).select().single())
      if (!error && saved) {
        await withTimeout(supabase.from('bill_items').insert(billItems.map((item) => ({
          bill_id: saved.id,
          item_name: item.item_name,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
        }))))
        return response.status(201).json({ ...saved, items: bill.items || [] })
      }
    } catch (error) {
      console.warn('[bills] supabase insert failed, saved to local user store:', error.message)
    }
  }

  return response.status(201).json({ ...newBillRecord, items: bill.items || [] })
})

const SUPABASE_RESTAURANT_COLUMNS = new Set([
  'name',
  'address',
  'phone',
  'email',
  'gstin',
  'opening_time',
  'closing_time',
  'default_tax_rate',
  'weekly_target',
  'preferred_report_day',
  'currency',
  'fixed_expenses',
  'staff_expenses',
  'variable_expenses',
  'acknowledged_milestones',
  'fssai_license_number',
  'fssai_expiry_date',
  'other_licenses',
  'last_notified',
])

app.post('/api/auth/signup', express.json(), async (request, response) => {
  const { email, password, restaurantName, ownerName } = request.body || {}
  const cleanEmail = String(email || '').toLowerCase().trim()
  const cleanPassword = String(password || '')

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return response.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    return response.status(400).json({ error: 'Password must be at least 6 characters long.' })
  }

  let supabaseUserId = null
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
      })
      if (!error && data?.user) {
        supabaseUserId = data.user.id
      }
    } catch (err) {
      console.warn('[auth/signup] supabase auth signup failed:', err.message)
    }
  }

  if (authUsers.has(cleanEmail)) {
    return response.status(400).json({ error: 'An account with this email already exists. Please sign in.' })
  }

  const userId = supabaseUserId || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const user = {
    id: userId,
    email: cleanEmail,
    passwordHash: hashPassword(cleanPassword),
    created_at: new Date().toISOString(),
  }
  authUsers.set(cleanEmail, user)

  const restaurant = {
    ...EMPTY_RESTAURANT,
    id: `rest_${userId}`,
    user_id: userId,
    name: restaurantName || '',
    owner_name: ownerName || '',
    email: cleanEmail,
  }
  userRestaurants.set(userId, restaurant)

  const token = `dqt_${crypto.randomBytes(24).toString('hex')}`
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  authSessions.set(token, { token, user: { id: user.id, email: user.email }, expiresAt })
  saveStore()

  return response.status(201).json({
    token,
    user: { id: user.id, email: user.email },
    restaurant,
    isNewUser: true,
  })
})

app.post('/api/auth/signin', express.json(), async (request, response) => {
  const { email, password } = request.body || {}
  const cleanEmail = String(email || '').toLowerCase().trim()
  const cleanPassword = String(password || '')

  if (!cleanEmail || !cleanPassword) {
    return response.status(400).json({ error: 'Please provide both email and password.' })
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      })
      if (!error && data?.user) {
        const userId = data.user.id
        const user = { id: userId, email: cleanEmail }
        const restaurant = getRestaurantForUser(userId, cleanEmail)
        const token = data.session?.access_token || `dqt_${crypto.randomBytes(24).toString('hex')}`
        authSessions.set(token, { token, user, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 })
        saveStore()
        return response.json({ token, user, restaurant })
      }
    } catch (err) {
      console.warn('[auth/signin] supabase auth signin failed:', err.message)
    }
  }

  const user = getUser(cleanEmail)
  if (!user || user.passwordHash !== hashPassword(cleanPassword)) {
    return response.status(401).json({ error: 'Invalid email or password. Please check your credentials.' })
  }

  const token = `dqt_${crypto.randomBytes(24).toString('hex')}`
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
  authSessions.set(token, { token, user: { id: user.id, email: user.email }, expiresAt })

  const restaurant = getRestaurantForUser(user.id, user.email)
  saveStore()

  return response.json({
    token,
    user: { id: user.id, email: user.email },
    restaurant,
  })
})

// Step 1: Request password reset link (NO PASSWORD CHANGED HERE)
app.post('/api/auth/forgot-password', express.json(), async (request, response) => {
  const { email, redirectTo } = request.body || {}
  const cleanEmail = String(email || '').toLowerCase().trim()

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return response.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const origin = request.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'
  const clientOrigin = origin.includes(':8787') ? 'http://localhost:5173' : origin
  const redirectUrl = redirectTo || `${clientOrigin}/#type=recovery`

  let supabaseSent = false
  if (supabase) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      })
      if (!error) {
        supabaseSent = true
      } else {
        console.warn('[auth/forgot-password] Supabase reset error:', error.message)
      }
    } catch (err) {
      console.warn('[auth/forgot-password] Supabase reset exception:', err.message)
    }
  }

  // Generate secure verification token for the user if they exist
  let user = authUsers.get(cleanEmail)
  if (user) {
    const recoveryToken = crypto.randomBytes(32).toString('hex')
    user.resetToken = recoveryToken
    user.resetExpiresAt = Date.now() + 15 * 60 * 1000 // 15 mins
    authUsers.set(cleanEmail, user)
    saveStore()
    const recoveryLink = `${origin}/#token=${recoveryToken}&type=recovery`
    console.log(`[auth/forgot-password] Password reset link for ${cleanEmail}: ${recoveryLink}`)
  }

  return response.json({
    message: 'If an account exists for this email, a password reset link has been sent. Please check your inbox.',
    supabaseSent,
  })
})

// Step 2: Verify reset token validity
app.post('/api/auth/verify-reset-token', express.json(), async (request, response) => {
  const { token } = request.body || {}
  if (!token) {
    return response.status(400).json({ error: 'Reset token is required.' })
  }

  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) {
        return response.json({ valid: true, email: user.email })
      }
    } catch {}
  }

  for (const user of authUsers.values()) {
    if (user.resetToken === token) {
      if (user.resetExpiresAt > Date.now()) {
        return response.json({ valid: true, email: user.email })
      } else {
        return response.status(401).json({ error: 'This password reset link has expired. Please request a new one.' })
      }
    }
  }

  return response.status(401).json({ error: 'Invalid or expired password reset link.' })
})

// Step 3: Update password — ONLY allowed with verified token from the emailed link!
app.post('/api/auth/update-password', express.json(), async (request, response) => {
  const { token, newPassword } = request.body || {}
  const cleanPassword = String(newPassword || '')

  if (!token) {
    return response.status(401).json({ error: 'A verified password reset link is required to change your password.' })
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    return response.status(400).json({ error: 'Password must be at least 6 characters long.' })
  }

  let matchedUser = null

  // 1. If Supabase token, verify with Supabase
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) {
        await supabase.auth.admin.updateUserById(user.id, { password: cleanPassword })
        matchedUser = authUsers.get(user.email?.toLowerCase().trim()) || {
          id: user.id,
          email: user.email?.toLowerCase().trim(),
        }
      }
    } catch (err) {
      console.warn('[auth/update-password] Supabase token check:', err.message)
    }
  }

  // 2. Check local store resetToken
  if (!matchedUser) {
    for (const u of authUsers.values()) {
      if (u.resetToken === token) {
        if (u.resetExpiresAt < Date.now()) {
          return response.status(401).json({ error: 'This password reset link has expired. Please request a new one.' })
        }
        matchedUser = u
        break
      }
    }
  }

  if (!matchedUser) {
    return response.status(401).json({ error: 'Invalid or expired password reset link. Access denied.' })
  }

  // 3. Update password on EXISTING user only — NEVER change user.id or create new restaurant!
  const cleanEmail = matchedUser.email.toLowerCase().trim()
  let user = authUsers.get(cleanEmail)
  if (!user) {
    user = {
      id: matchedUser.id,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPassword),
      created_at: new Date().toISOString(),
    }
  } else {
    user.passwordHash = hashPassword(cleanPassword)
    delete user.resetToken
    delete user.resetExpiresAt
  }
  authUsers.set(cleanEmail, user)

  // Re-link to existing restaurant (e.g. Mr. Sandwhich) without ever creating a blank one!
  const restaurant = getRestaurantForUser(user.id, cleanEmail)

  const authToken = `dqt_${crypto.randomBytes(24).toString('hex')}`
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
  authSessions.set(authToken, { token: authToken, user: { id: user.id, email: user.email }, expiresAt })
  saveStore()

  return response.json({
    message: 'Password updated successfully. You are now signed in.',
    token: authToken,
    user: { id: user.id, email: user.email },
    restaurant,
  })
})

// Strict fallback for reset-password
app.post('/api/auth/reset-password', express.json(), async (request, response) => {
  const { token, newPassword, email } = request.body || {}
  if (token && newPassword) {
    return app._router.handle({ ...request, url: '/api/auth/update-password' }, response)
  }
  if (email && !newPassword && !token) {
    return app._router.handle({ ...request, url: '/api/auth/forgot-password' }, response)
  }
  return response.status(401).json({
    error: 'Direct password reset without email verification is not permitted. Please click the reset link sent to your email inbox.',
  })
})

app.get('/api/auth/session', async (request, response) => {
  const session = getAuthSession(request)
  if (!session) {
    return response.status(401).json({ error: 'Not authenticated' })
  }
  const restaurant = getRestaurantForUser(session.user.id, session.user.email) || EMPTY_RESTAURANT
  return response.json({
    user: session.user,
    restaurant,
  })
})

app.post('/api/auth/signout', async (request, response) => {
  const token = extractToken(request)
  if (token) {
    authSessions.delete(token)
  }
  if (supabase) {
    try {
      await supabase.auth.signOut().catch(() => {})
    } catch {}
  }
  return response.json({ message: 'Signed out successfully' })
})

app.get('/api/restaurant', async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  if (auth?.restaurant) {
    return response.json(auth.restaurant)
  }

  if (supabase) {
    try {
      const id = await getRestaurantId()
      const { data, error } = await withTimeout(supabase.from('restaurants').select('*').eq('id', id).single())
      if (!error && data) {
        Object.assign(EMPTY_RESTAURANT, data)
        return response.json(EMPTY_RESTAURANT)
      }
    } catch (error) {
      console.warn('[restaurant] supabase fetch failed, using fallback:', error.message)
    }
  }
  return response.json(EMPTY_RESTAURANT)
})

app.patch('/api/restaurant', express.json(), async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  let targetRestaurant = auth?.restaurant || EMPTY_RESTAURANT

  Object.assign(targetRestaurant, request.body)
  saveStore()

  if (supabase) {
    try {
      const id = await getRestaurantId()
      const supabasePayload = {}
      for (const [key, val] of Object.entries(request.body || {})) {
        if (SUPABASE_RESTAURANT_COLUMNS.has(key)) {
          supabasePayload[key] = val
        }
      }
      if (Object.keys(supabasePayload).length > 0) {
        const { data, error } = await withTimeout(
          supabase.from('restaurants').update(supabasePayload).eq('id', id).select().single()
        )
        if (!error && data) {
          Object.assign(targetRestaurant, data)
          saveStore()
        }
      }
    } catch (error) {
      console.warn('[restaurant] supabase update failed, saved to local store:', error.message)
    }
  }
  return response.json(targetRestaurant)
})

app.post('/api/milestones/acknowledge', express.json(), async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const { milestoneId } = request.body || {}

  if (!milestoneId || typeof milestoneId !== 'string') {
    return response.status(400).json({ error: 'milestoneId is required' })
  }

  if (!Array.isArray(restaurant.acknowledged_milestones)) {
    restaurant.acknowledged_milestones = []
  }

  if (!restaurant.acknowledged_milestones.includes(milestoneId)) {
    restaurant.acknowledged_milestones.push(milestoneId)
    saveStore()
  }

  if (supabase && restaurant.id && restaurant.id !== EMPTY_RESTAURANT.id) {
    try {
      await withTimeout(
        supabase
          .from('restaurants')
          .update({ acknowledged_milestones: restaurant.acknowledged_milestones })
          .eq('id', restaurant.id)
      )
    } catch (error) {
      console.warn('[milestones/acknowledge] supabase update failed, saved to local store:', error.message)
    }
  }

  return response.json({
    success: true,
    acknowledged: restaurant.acknowledged_milestones,
  })
})

app.get('/api/notifications', async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id

  let bills = []
  if (restaurantId && userBills.has(restaurantId)) {
    bills = [...userBills.get(restaurantId)]
  }

  // Trigger evaluation
  try {
    await checkAndTriggerNotifications(bills, restaurant)
  } catch (err) {
    console.warn('[notifications] checkAndTriggerNotifications failed:', err.message)
  }

  const notifs = userNotifications.get(restaurantId) || []
  return response.json({
    notifications: notifs,
    unreadCount: notifs.filter((n) => !n.is_read).length,
    lastNotified: restaurant.last_notified || {},
  })
})

app.post('/api/notifications/read', express.json(), async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id
  const { notificationId, all } = request.body || {}

  const notifs = userNotifications.get(restaurantId) || []
  if (all) {
    notifs.forEach((n) => { n.is_read = true })
  } else if (notificationId) {
    const target = notifs.find((n) => n.id === notificationId)
    if (target) target.is_read = true
  }
  saveStore()

  if (supabase && restaurantId && restaurantId !== EMPTY_RESTAURANT.id) {
    try {
      if (all) {
        await withTimeout(supabase.from('notifications').update({ is_read: true }).eq('restaurant_id', restaurantId))
      } else if (notificationId) {
        await withTimeout(supabase.from('notifications').update({ is_read: true }).eq('id', notificationId))
      }
    } catch (err) {
      console.warn('[notifications/read] supabase update failed:', err.message)
    }
  }

  return response.json({
    success: true,
    unreadCount: notifs.filter((n) => !n.is_read).length,
  })
})

app.post('/api/notifications/clear', express.json(), async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id
  const { notificationId, all } = request.body || {}

  if (all) {
    userNotifications.set(restaurantId, [])
  } else if (notificationId) {
    const list = userNotifications.get(restaurantId) || []
    userNotifications.set(restaurantId, list.filter((n) => n.id !== notificationId))
  }
  saveStore()

  if (supabase && restaurantId && restaurantId !== EMPTY_RESTAURANT.id) {
    try {
      if (all) {
        await withTimeout(supabase.from('notifications').delete().eq('restaurant_id', restaurantId))
      } else if (notificationId) {
        await withTimeout(supabase.from('notifications').delete().eq('id', notificationId))
      }
    } catch (err) {
      console.warn('[notifications/clear] supabase delete failed:', err.message)
    }
  }

  const updated = userNotifications.get(restaurantId) || []
  return response.json({
    success: true,
    notifications: updated,
    unreadCount: updated.filter((n) => !n.is_read).length,
  })
})

app.post('/api/notifications/trigger-daily-summary', express.json(), async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id

  let bills = []
  if (restaurantId && userBills.has(restaurantId)) {
    bills = [...userBills.get(restaurantId)]
  }

  try {
    await checkAndTriggerNotifications(bills, restaurant, true)
  } catch (err) {
    console.warn('[notifications/trigger-daily-summary] failed:', err.message)
  }

  const notifs = userNotifications.get(restaurantId) || []
  const summaryNotif = notifs.find((n) => n.trigger_type === 'daily_summary')

  return response.json({
    success: true,
    notification: summaryNotif,
    notifications: notifs,
    unreadCount: notifs.filter((n) => !n.is_read).length,
  })
})

async function getRestaurantBillsWithItems(restaurantId) {
  let allBills = []
  if (restaurantId && userBills.has(restaurantId)) {
    allBills = [...userBills.get(restaurantId)]
  }
  if (fs.existsSync(STORE_FILE)) {
    try {
      const disk = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
      if (disk.bills && disk.bills[restaurantId]) {
        const diskBills = disk.bills[restaurantId]
        const existingIds = new Set(allBills.map((b) => b.id || b.bill_number))
        for (const db of diskBills) {
          if (!existingIds.has(db.id || db.bill_number)) {
            allBills.push(db)
          }
        }
        userBills.set(restaurantId, allBills)
      }
    } catch {}
  }

  if (supabase && restaurantId && restaurantId !== EMPTY_RESTAURANT.id) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('bills').select('*, bill_items(*)').eq('restaurant_id', restaurantId).order('date', { ascending: false })
      )
      if (!error && data) {
        const existingIds = new Set(data.map((b) => b.id || b.bill_number))
        allBills = [...data, ...allBills.filter((b) => !existingIds.has(b.id || b.bill_number))]
      }
    } catch (err) {
      console.warn('[bills] supabase fetch failed for restaurantId:', restaurantId, err.message)
    }
  }
  return allBills
}

app.post('/api/ask', express.json(), async (request, response) => {
  const auth = getAuthUserRestaurant(request)
  const restaurant = auth?.restaurant || EMPTY_RESTAURANT
  const restaurantId = restaurant.id

  const { question } = request.body || {}
  const cleanQ = String(question || '').trim()

  if (!cleanQ) {
    return response.status(400).json({ error: 'Please provide a question.' })
  }

  try {
    // 1. Fetch real bills & items for this restaurant
    const bills = await getRestaurantBillsWithItems(restaurantId)

    // 2. Step 1: Extract structured query plan
    const plan = extractStructuredPlan(cleanQ, new Date())

    // 3. Step 2: Fetch and calculate real data
    const facts = queryRealData(plan, bills, restaurant)

    // 4. Step 3: Generate grounded natural language answer
    const result = await generateGroundedAnswer(cleanQ, plan, facts, process.env.GEMINI_API_KEY)

    return response.json({
      question: cleanQ,
      plan,
      facts,
      answer: result.answer,
      modelUsed: result.modelUsed,
      queriedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[askDineIQ] query pipeline error:', err)
    return response.status(500).json({ error: 'Failed to process question. Please try again.' })
  }
})

// Serve production frontend assets if built
const distPath = path.resolve(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'))
    }
    next()
  })
}

app.use((error, _request, response, _next) => {
  console.error('[extract-bill] upload middleware failed:', error.message)
  return response.status(400).json({ error: 'The bill upload could not be read.' })
})

app.listen(port, () => console.log(`DineIQ extraction API listening on http://localhost:${port}`))

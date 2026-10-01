import { extractStructuredPlan, queryRealData, generateGroundedAnswer } from '../backend/askDineIQ.js'
import fs from 'fs'

async function run() {
  console.log('Testing askDineIQ engine in isolation...\n')

  const envPath = fs.existsSync('.env') ? '.env' : 'backend/.env'
  const envText = fs.readFileSync(envPath, 'utf-8')
  const apiKey = envText.match(/GEMINI_API_KEY=([^\r\n]+)/)[1]

  const mockRestaurant = {
    name: 'Gourmet Bistro',
    fixed_expense_total: 45000,
    staff_expense_total: 30000,
    variable_expense_total: 15000,
  }

  const mockBills = [
    {
      id: 'b1',
      date: '2026-10-01',
      total: 1260,
      bill_items: [
        { item_name: 'Paneer Butter Masala', quantity: 2, amount: 600 },
        { item_name: 'Garlic Naan', quantity: 4, amount: 400 },
        { item_name: 'Sweet Lassi', quantity: 2, amount: 200 },
      ],
    },
    {
      id: 'b2',
      date: '2026-09-28',
      total: 2520,
      bill_items: [
        { item_name: 'Biryani Special', quantity: 2, amount: 1600 },
        { item_name: 'Gulab Jamun', quantity: 4, amount: 800 },
      ],
    },
    {
      id: 'b3',
      date: '2026-09-25',
      total: 3400,
      bill_items: [
        { item_name: 'Biryani Special', quantity: 4, amount: 3200 },
        { item_name: 'Sweet Lassi', quantity: 2, amount: 200 },
      ],
    },
  ]

  const questions = [
    'How much did I make today?',
    "What's my best-selling dish this week?",
    'How many biryanis did I sell in September?',
    'Compare this month to last month',
    'What was my revenue in September?',
    'What are my fixed expenses?',
  ]

  for (const q of questions) {
    console.log(`\n-----------------------------------------`)
    console.log(`QUESTION: "${q}"`)
    const plan = extractStructuredPlan(q, '2026-10-01')
    console.log('PLAN:', JSON.stringify(plan.timeframe), 'intent:', plan.intent, 'item:', plan.itemFilter)

    const facts = queryRealData(plan, mockBills, mockRestaurant)
    console.log('FACTS:', {
      primary: { label: facts.primaryPeriod.label, rev: facts.primaryPeriod.revenue, bills: facts.primaryPeriod.billsCount },
      targetDish: facts.targetDishData,
      compare: facts.comparePeriod ? { label: facts.comparePeriod.label, rev: facts.comparePeriod.revenue } : null,
    })

    const result = await generateGroundedAnswer(q, plan, facts, apiKey)
    console.log(`ANSWER (${result.modelUsed}):\n${result.answer}`)
  }
}

run().catch(console.error)

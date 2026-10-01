const now = new Date()
const formattedDate = now.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
const formattedTime = now.toTimeString().slice(0, 5)

export const billDraft = {
  merchant: 'Saffron Leaf Kitchen',
  billNumber: 'SLK-24091',
  date: formattedDate,
  time: formattedTime,
  subtotal: '₹1,540',
  tax: '₹77',
  total: '₹1,617',
  payment: 'UPI',
  items: [
    { name: 'Butter Chicken', quantity: 2, price: '₹560' },
    { name: 'Garlic Naan', quantity: 4, price: '₹320' },
    { name: 'Paneer Tikka', quantity: 1, price: '₹280' },
    { name: 'Masala Chaas', quantity: 3, price: '₹180' },
    { name: 'Gulab Jamun', quantity: 2, price: '₹200' },
  ],
}

export const captureSteps = [
  { number: '01', label: 'Capture bill' },
  { number: '02', label: 'Review details' },
  { number: '03', label: 'Confirm save' },
]

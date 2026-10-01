import { useEffect, useMemo, useState } from 'react'
import {
  BadgeIndianRupee,
  Bike,
  Box,
  Calendar,
  Check,
  ChefHat,
  CreditCard,
  Droplets,
  FileCheck,
  FileDown,
  FileText,
  HardHat,
  HeartHandshake,
  House,
  Landmark,
  Loader2,
  Megaphone,
  Menu,
  MoreHorizontal,
  ReceiptText,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Utensils,
  WalletCards,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { Sidebar } from '../components/Sidebar'
import { generateMonthlyPerformanceReportPDF } from '../services/monthlyReportPdfGenerator'

const expenseGroups = [
  {
    key: 'fixed_expenses',
    label: 'Fixed expense',
    pluralLabel: 'Fixed expenses',
    color: 'orange',
    icon: Landmark,
    items: [
      { key: 'rent', label: 'rent', icon: House, value: 0 },
      { key: 'electricity', label: 'electricity', icon: Zap, value: 0 },
      { key: 'water_gas', label: 'water & gas', icon: Droplets, value: 0 },
      { key: 'internet_phone', label: 'internet & phone', icon: Wifi, value: 0 },
      { key: 'licenses_permits', label: 'licenses & permits', icon: ReceiptText, value: 0 },
      { key: 'maintenance', label: 'maintenance', icon: Wrench, value: 0 },
    ],
  },
  {
    key: 'staff_expenses',
    label: 'Staff expenses',
    pluralLabel: 'Staff expenses',
    color: 'green',
    icon: Users,
    items: [
      { key: 'chef_salaries', label: 'chef salaries', icon: ChefHat, value: 0 },
      { key: 'staff_salaries', label: 'staff salaries', icon: Users, value: 0 },
      { key: 'manager_salary', label: 'manager salary', icon: HardHat, value: 0 },
      { key: 'cleaning', label: 'cleaning', icon: Sparkles, value: 0 },
      { key: 'staff_benefits', label: 'staff benefits', icon: HeartHandshake, value: 0 },
      { key: 'delivery', label: 'delivery', icon: Bike, value: 0 },
    ],
  },
  {
    key: 'variable_expenses',
    label: 'Variable expenses',
    pluralLabel: 'Variable expenses',
    color: 'slate',
    icon: WalletCards,
    items: [
      { key: 'raw_material', label: 'raw material', icon: Utensils, value: 0 },
      { key: 'packaging_supplies', label: 'packaging & supplies', icon: Box, value: 0 },
      { key: 'marketing_ads', label: 'marketing & ads', icon: Megaphone, value: 0 },
      { key: 'payment_gateways', label: 'payment gateways', icon: CreditCard, value: 0 },
      { key: 'others', label: 'others', icon: MoreHorizontal, value: 0 },
      { key: 'miscellaneous', label: 'miscellaneous', icon: Wrench, value: 0 },
    ],
  },
]

const defaults = Object.fromEntries(
  expenseGroups.map((group) => [
    group.key,
    group.items.map(({ key, label }) => ({ key, label, value: 0 })),
  ])
)

const asNumber = (value) => Math.max(0, Number(String(value ?? '').replace(/[^0-9.]/g, '')) || 0)
const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`
const getCurrentMonthKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function normalizeExpenses(data = {}) {
  return Object.fromEntries(
    expenseGroups.map((group) => {
      const saved = Array.isArray(data[group.key]) ? data[group.key] : []
      return [
        group.key,
        group.items.map((item) => {
          const match = saved.find((entry) => typeof entry === 'object' && entry.key === item.key)
          return { key: item.key, label: item.label, value: match ? asNumber(match.value) : 0 }
        }),
      ]
    })
  )
}

function generatePDFReport({ restaurantName, address, monthName, periodLabel, monthlyRevenue, monthlyBillCount, totals, totalExpense, netProfit, profitMargin, expenseValues }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header Background Banner
  doc.setFillColor(24, 24, 27) // Dark Slate
  doc.rect(0, 0, pageWidth, 90, 'F')

  // Accent Line
  doc.setFillColor(249, 115, 22) // DineIQ Orange
  doc.rect(0, 90, pageWidth, 4, 'F')

  // DineIQ Brand Logo / Title
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('DineIQ', 40, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(161, 161, 170)
  doc.text('Monthly Financial & P&L Statement', 40, 60)

  // Restaurant details right aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text(restaurantName || 'Saffron Leaf Kitchen', pageWidth - 40, 40, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(212, 212, 216)
  doc.text(address || 'Indiranagar, Bengaluru', pageWidth - 40, 56, { align: 'right' })
  doc.text(`Reporting Period: ${periodLabel}`, pageWidth - 40, 70, { align: 'right' })

  let y = 120

  // Section: Executive Summary
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(39, 39, 42)
  doc.text('1. EXECUTIVE FINANCIAL SUMMARY', 40, y)
  y += 15

  // 3 Metric Cards Layout
  const cardWidth = (pageWidth - 80 - 24) / 3
  const cardHeight = 62

  // Revenue Card
  doc.setFillColor(244, 244, 245)
  doc.roundedRect(40, y, cardWidth, cardHeight, 4, 4, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text('TOTAL MONTHLY REVENUE', 52, y + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(24, 24, 27)
  doc.text(`Rs. ${monthlyRevenue.toLocaleString('en-IN')}`, 52, y + 38)
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text(`From ${monthlyBillCount} captured bill(s)`, 52, y + 52)

  // Expense Card
  const expX = 40 + cardWidth + 12
  doc.setFillColor(244, 244, 245)
  doc.roundedRect(expX, y, cardWidth, cardHeight, 4, 4, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text('TOTAL OPERATING EXPENSES', expX + 12, y + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(239, 68, 68)
  doc.text(`Rs. ${totalExpense.toLocaleString('en-IN')}`, expX + 12, y + 38)
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text('Sum of Fixed, Staff & Variable', expX + 12, y + 52)

  // Net Profit Card
  const profX = expX + cardWidth + 12
  doc.setFillColor(netProfit >= 0 ? 240 : 254, netProfit >= 0 ? 253 : 242, netProfit >= 0 ? 244 : 242)
  doc.roundedRect(profX, y, cardWidth, cardHeight, 4, 4, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text('NET MONTHLY PROFIT / (LOSS)', profX + 12, y + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(netProfit >= 0 ? 22 : 220, netProfit >= 0 ? 101 : 38, netProfit >= 0 ? 52 : 38)
  const netProfitStr = netProfit < 0
    ? `-Rs. ${Math.abs(Math.round(netProfit)).toLocaleString('en-IN')}`
    : `Rs. ${Math.round(netProfit).toLocaleString('en-IN')}`
  doc.text(netProfitStr, profX + 12, y + 38)
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text(`Margin: ${profitMargin}`, profX + 12, y + 52)

  y += cardHeight + 30

  // Section: Expense Breakdown
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(39, 39, 42)
  doc.text('2. OPERATING EXPENSE BREAKDOWN', 40, y)
  y += 18

  // Expense Tables (3 Columns)
  expenseGroups.forEach((group) => {
    const groupTotal = totals[group.key] || 0
    const groupItems = expenseValues[group.key] || []

    doc.setFillColor(244, 244, 245)
    doc.rect(40, y, pageWidth - 80, 20, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(24, 24, 27)
    doc.text(group.pluralLabel.toUpperCase(), 48, y + 14)
    doc.text(`Rs. ${groupTotal.toLocaleString('en-IN')}`, pageWidth - 48, y + 14, { align: 'right' })
    y += 24

    // Table rows
    groupItems.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250)
        doc.rect(40, y - 10, pageWidth - 80, 16, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(82, 82, 91)
      doc.text(item.label.charAt(0).toUpperCase() + item.label.slice(1), 52, y + 2)
      doc.setTextColor(39, 39, 42)
      doc.text(`Rs. ${asNumber(item.value).toLocaleString('en-IN')}`, pageWidth - 52, y + 2, { align: 'right' })
      y += 16
    })
    y += 10
  })

  y += 10

  // Section: P&L Summary Reconciliation Box
  doc.setFillColor(24, 24, 27)
  doc.roundedRect(40, y, pageWidth - 80, 72, 4, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('P&L SUMMARY RECONCILIATION', 52, y + 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(212, 212, 216)
  doc.text(`Total Monthly Revenue:`, 52, y + 38)
  doc.text(`Rs. ${monthlyRevenue.toLocaleString('en-IN')}`, 200, y + 38)

  doc.text(`(-) Total Operating Expenses:`, 52, y + 54)
  doc.text(`Rs. ${totalExpense.toLocaleString('en-IN')}`, 200, y + 54)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(netProfit >= 0 ? 74 : 248, netProfit >= 0 ? 222 : 113, netProfit >= 0 ? 128 : 113)
  doc.text(`NET PROFIT / (LOSS):  ${netProfitStr}`, pageWidth - 52, y + 46, { align: 'right' })

  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(161, 161, 170)
  const now = new Date()
  doc.text(`Report generated on ${now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • DineIQ SaaS`, pageWidth / 2, 810, { align: 'center' })

  const safeMonth = monthName.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`DineIQ_Financial_Report_${safeMonth}.pdf`)
}

function generateGSTSummaryPDF({
  restaurantName,
  gstin,
  address,
  phone,
  monthName,
  periodLabel,
  gstSummary,
  bills = [],
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Header Banner (Dark Charcoal)
  doc.setFillColor(24, 24, 27)
  doc.rect(0, 0, pageWidth, 94, 'F')

  // Accent Line (DineIQ Orange)
  doc.setFillColor(249, 115, 22)
  doc.rect(0, 94, pageWidth, 4, 'F')

  // Brand Name & Doc Title
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('DineIQ', 40, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(161, 161, 170)
  doc.text('MONTHLY GST SUMMARY & TAX STATEMENT', 40, 58)
  doc.text(`Tax Period: ${periodLabel}`, 40, 72)

  // Restaurant details right aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text(restaurantName || 'Restaurant', pageWidth - 40, 38, { align: 'right' })

  // GSTIN in Orange / Highlight
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(249, 115, 22)
  const gstinDisplay = gstin ? `GSTIN: ${gstin}` : 'GSTIN: Not Configured'
  doc.text(gstinDisplay, pageWidth - 40, 54, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(212, 212, 216)
  const contactText = [address, phone ? `Ph: ${phone}` : ''].filter(Boolean).join(' • ')
  if (contactText) {
    doc.text(contactText.slice(0, 55), pageWidth - 40, 68, { align: 'right' })
  }
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    pageWidth - 40,
    80,
    { align: 'right' }
  )

  let y = 122

  // Section 1: Executive Tax Summary
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(39, 39, 42)
  doc.text(`1. TAX LIABILITY & COLLECTION SUMMARY (${(monthName || '').toUpperCase()})`, 40, y)
  y += 14

  const margin = 40
  const gap = 10
  const availableWidth = pageWidth - margin * 2
  const cardW = (availableWidth - gap * 3) / 4
  const cardH = 64

  const cards = [
    { label: 'TOTAL TAXABLE AMOUNT', value: money(gstSummary.taxableAmount), sub: 'Bill subtotals (pre-tax)' },
    { label: 'CENTRAL GST (CGST)', value: money(gstSummary.cgst), sub: '50% of total GST' },
    { label: 'STATE GST (SGST)', value: money(gstSummary.sgst), sub: '50% of total GST' },
    { label: 'TOTAL GST COLLECTED', value: money(gstSummary.totalGst), sub: `${gstSummary.billCount} bill(s) evaluated`, highlight: true },
  ]

  cards.forEach((c, i) => {
    const x = margin + i * (cardW + gap)
    if (c.highlight) {
      doc.setFillColor(255, 247, 237) // warm orange tint
    } else {
      doc.setFillColor(244, 244, 245)
    }
    doc.roundedRect(x, y, cardW, cardH, 4, 4, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(113, 113, 122)
    doc.text(c.label, x + 10, y + 18)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    if (c.highlight) {
      doc.setTextColor(234, 88, 12)
    } else {
      doc.setTextColor(24, 24, 27)
    }
    doc.text(c.value, x + 10, y + 38)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(113, 113, 122)
    doc.text(c.sub, x + 10, y + 52)
  })

  y += cardH + 24

  // Section 2: Itemized Bill-by-Bill GST Schedule
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(39, 39, 42)
  doc.text('2. ITEMIZED BILL-BY-BILL GST AUDIT SCHEDULE', 40, y)
  y += 14

  const colX = {
    billNo: 46,
    date: 130,
    time: 195,
    mode: 240,
    taxable: 340,
    cgst: 400,
    sgst: 460,
    totalGst: 515,
    total: 555,
  }

  const renderTableHeader = (headerY) => {
    doc.setFillColor(24, 24, 27)
    doc.rect(40, headerY, availableWidth, 20, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    doc.text('BILL NO.', colX.billNo, headerY + 13)
    doc.text('DATE', colX.date, headerY + 13)
    doc.text('TIME', colX.time, headerY + 13)
    doc.text('MODE', colX.mode, headerY + 13)
    doc.text('TAXABLE (Rs.)', colX.taxable, headerY + 13, { align: 'right' })
    doc.text('CGST (Rs.)', colX.cgst, headerY + 13, { align: 'right' })
    doc.text('SGST (Rs.)', colX.sgst, headerY + 13, { align: 'right' })
    doc.text('GST (Rs.)', colX.totalGst, headerY + 13, { align: 'right' })
    doc.text('TOTAL (Rs.)', colX.total, headerY + 13, { align: 'right' })
  }

  renderTableHeader(y)
  y += 20

  let totalInvoiced = 0

  if (bills.length === 0) {
    doc.setFillColor(250, 250, 250)
    doc.rect(40, y, availableWidth, 24, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(113, 113, 122)
    doc.text('No bills recorded for this month.', availableWidth / 2 + 40, y + 16, { align: 'center' })
    y += 24
  } else {
    bills.forEach((bill, idx) => {
      // Check if bill row exceeds page boundary before drawing
      if (y + 18 > 770) {
        doc.addPage()
        y = 40
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(113, 113, 122)
        doc.text(`GST AUDIT SCHEDULE (CONTINUED) — ${restaurantName || 'Restaurant'} • ${monthName || 'Month'}`, 40, y + 8)
        y += 18
        renderTableHeader(y)
        y += 20
      }

      const isAlt = idx % 2 === 1
      if (isAlt) {
        doc.setFillColor(248, 248, 250)
        doc.rect(40, y, availableWidth, 18, 'F')
      }

      const tot = asNumber(bill.total)
      const gst = asNumber(bill.gst ?? bill.tax ?? 0)
      const sub = bill.subtotal != null ? asNumber(bill.subtotal) : (tot - gst > 0 ? tot - gst : tot)
      const cgst = Math.round((gst / 2) * 100) / 100
      const sgst = Math.round((gst - cgst) * 100) / 100
      totalInvoiced += tot

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(24, 24, 27)

      const billNumStr = String(bill.billNumber || bill.bill_number || bill.number || bill.id || '').replace(/^#/, '')
      doc.text(billNumStr.slice(0, 14), colX.billNo, y + 12)
      doc.setTextColor(113, 113, 122)
      doc.text(String(bill.date || '-').slice(0, 10), colX.date, y + 12)
      doc.text(String(bill.time || '-').slice(0, 8), colX.time, y + 12)
      doc.text(String(bill.paymentMode || bill.payment_mode || 'UPI').slice(0, 6), colX.mode, y + 12)

      doc.setTextColor(24, 24, 27)
      doc.text(sub.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX.taxable, y + 12, { align: 'right' })
      doc.text(cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX.cgst, y + 12, { align: 'right' })
      doc.text(sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX.sgst, y + 12, { align: 'right' })
      doc.text(gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX.totalGst, y + 12, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.text(tot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX.total, y + 12, { align: 'right' })

      y += 18
    })
  }

  // Check if Totals row exceeds page boundary
  if (y + 26 > 770) {
    doc.addPage()
    y = 40
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(113, 113, 122)
    doc.text(`GST AUDIT SCHEDULE (CONTINUED) — ${restaurantName || 'Restaurant'} • ${monthName || 'Month'}`, 40, y + 8)
    y += 18
    renderTableHeader(y)
    y += 20
  }

  // Totals Row
  doc.setFillColor(235, 235, 238)
  doc.rect(40, y, availableWidth, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(24, 24, 27)
  doc.text(`TOTALS (${bills.length} BILLS)`, colX.billNo, y + 15)

  doc.text(
    Number(gstSummary.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    colX.taxable,
    y + 15,
    { align: 'right' }
  )
  doc.text(
    Number(gstSummary.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    colX.cgst,
    y + 15,
    { align: 'right' }
  )
  doc.text(
    Number(gstSummary.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    colX.sgst,
    y + 15,
    { align: 'right' }
  )
  doc.setTextColor(234, 88, 12)
  doc.text(
    Number(gstSummary.totalGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    colX.totalGst,
    y + 15,
    { align: 'right' }
  )
  doc.setTextColor(24, 24, 27)
  doc.text(
    (totalInvoiced || gstSummary.taxableAmount + gstSummary.totalGst).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    colX.total,
    y + 15,
    { align: 'right' }
  )

  y += 34

  // Section 3: Statutory Declaration & Accountant Sign-off Box (Never skipped!)
  if (y + 115 > 770) {
    doc.addPage()
    y = 50
  }

  doc.setFillColor(250, 250, 250)
  doc.setDrawColor(228, 228, 231)
  doc.roundedRect(40, y, availableWidth, 54, 4, 4, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(39, 39, 42)
  doc.text('STATUTORY DECLARATION & ACCOUNTING RECONCILIATION', 50, y + 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(113, 113, 122)
  doc.text('This document represents the computerized GST sales register for intra-state restaurant supplies under the GST Act.', 50, y + 29)
  doc.text('Tax amounts are computed in accordance with prevailing restaurant composite/regular tax rate specifications (CGST + SGST).', 50, y + 40)

  y += 74

  // Signature blocks
  doc.setDrawColor(212, 212, 216)
  doc.line(50, y + 30, 220, y + 30)
  doc.line(availableWidth - 130, y + 30, availableWidth + 40, y + 30)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(113, 113, 122)
  doc.text(`Authorized Signatory (${restaurantName || 'Restaurant'})`, 50, y + 42)
  doc.text('Chartered Accountant / Tax Auditor', availableWidth - 130, y + 42)

  // Stamp Footers with page numbers across all pages
  const totalPages = doc.getNumberOfPages()
  const now = new Date()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(161, 161, 170)
    const pageSuffix = totalPages > 1 ? ` • Page ${p} of ${totalPages}` : ''
    doc.text(
      `Generated on ${now.toLocaleDateString('en-IN')} at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • Certified DineIQ Tax Intelligence${pageSuffix}`,
      pageWidth / 2,
      815,
      { align: 'center' }
    )
  }

  const safeMonth = (monthName || 'Month').replace(/[^a-zA-Z0-9]/g, '_')
  const safeRest = (restaurantName || 'Restaurant').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`DineIQ_GST_Summary_${safeRest}_${safeMonth}.pdf`)
}

export function Reports({ onNavigate, restaurant, user, onSignOut, onRestaurantUpdated }) {
  const [expenseValues, setExpenseValues] = useState(defaults)
  const [currentRestaurant, setCurrentRestaurant] = useState(restaurant || null)
  const [status, setStatus] = useState('saved')
  const [error, setError] = useState('')
  const [monthlyData, setMonthlyData] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfSuccess, setPdfSuccess] = useState(false)
  const [downloadingGstPdf, setDownloadingGstPdf] = useState(false)
  const [gstPdfSuccess, setGstPdfSuccess] = useState(false)

  const monthOptions = useMemo(() => {
    const currentKey = getCurrentMonthKey()
    const optionsMap = new Map()

    // Up to 24 past calendar months starting dynamically from the current month
    const now = new Date()
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key <= currentKey) {
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        optionsMap.set(key, { key, label, isCurrent: i === 0 })
      }
    }

    if (Array.isArray(monthlyData?.availableMonths)) {
      monthlyData.availableMonths.forEach((m) => {
        if (m && m <= currentKey && !optionsMap.has(m)) {
          const [yr, mn] = m.split('-')
          const d = new Date(Number(yr), Number(mn) - 1, 1)
          const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          optionsMap.set(m, { key: m, label, isCurrent: m === currentKey })
        }
      })
    }

    return Array.from(optionsMap.values()).sort((a, b) => b.key.localeCompare(a.key))
  }, [monthlyData?.availableMonths])

  const loadData = (month) => {
    const currentKey = getCurrentMonthKey()
    const targetMonth = month || selectedMonth || currentKey
    const validMonth = targetMonth > currentKey ? currentKey : targetMonth
    const token = localStorage.getItem('dineq:auth-token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const query = validMonth ? `?month=${encodeURIComponent(validMonth)}` : ''

    const fetchWithRetry = async (url) => {
      for (let i = 0; i < 3; i++) {
        try {
          if (i > 0) await new Promise((r) => setTimeout(r, 2000))
          const res = await fetch(url, { headers })
          if (res.ok) return await res.json()
          if (res.status !== 503 && res.status !== 502) return null
        } catch {
          if (i === 2) return null
        }
      }
      return null
    }

    Promise.all([
      fetchWithRetry('/api/restaurant'),
      fetchWithRetry(`/api/reports/monthly${query}`),
    ])
      .then(([restData, monthRes]) => {
        if (restData) {
          setCurrentRestaurant(restData)
          setExpenseValues(normalizeExpenses(restData))
          onRestaurantUpdated?.(restData)
        }
        if (monthRes) {
          setMonthlyData(monthRes)
          if (monthRes.month) {
            setSelectedMonth(monthRes.month)
          }
        }
        setStatus('saved')
      })
      .catch((err) => {
        setError(err.message || 'Failed to load reports')
        setStatus('error')
      })
  }

  const handleMonthChange = (newMonth) => {
    const currentKey = getCurrentMonthKey()
    const targetMonth = newMonth > currentKey ? currentKey : newMonth
    setSelectedMonth(targetMonth)
    loadData(targetMonth)
  }

  useEffect(() => {
    loadData(getCurrentMonthKey())
  }, [])

  const gstSummary = useMemo(() => {
    const bills = monthlyData?.bills || []
    const totalTaxable = bills.reduce((sum, b) => {
      const tot = asNumber(b.total)
      const tax = asNumber(b.gst ?? b.tax ?? 0)
      const sub = b.subtotal != null ? asNumber(b.subtotal) : (tot - tax > 0 ? tot - tax : tot)
      return sum + sub
    }, 0)

    const totalGst = bills.reduce((sum, b) => {
      const tax = asNumber(b.gst ?? b.tax ?? 0)
      const tot = asNumber(b.total)
      const sub = asNumber(b.subtotal)
      if (tax > 0) return sum + tax
      if (tot > sub && sub > 0) return sum + (tot - sub)
      return sum
    }, 0)

    const totalCgst = Math.round((totalGst / 2) * 100) / 100
    const totalSgst = Math.round((totalGst - totalCgst) * 100) / 100

    return {
      taxableAmount: monthlyData?.gstSummary?.taxableAmount ?? Math.round(totalTaxable * 100) / 100,
      cgst: monthlyData?.gstSummary?.cgst ?? totalCgst,
      sgst: monthlyData?.gstSummary?.sgst ?? totalSgst,
      totalGst: monthlyData?.gstSummary?.totalGst ?? Math.round(totalGst * 100) / 100,
      billCount: monthlyData?.gstSummary?.billCount ?? bills.length,
    }
  }, [monthlyData])

  const handleDownloadGstPdf = () => {
    setDownloadingGstPdf(true)
    setGstPdfSuccess(false)
    try {
      const rest = currentRestaurant || restaurant
      generateGSTSummaryPDF({
        restaurantName: rest?.name || 'Restaurant',
        gstin: rest?.gstin || '',
        address: rest?.address || '',
        phone: rest?.phone || '',
        monthName: monthlyData?.monthName || 'Current Month',
        periodLabel: monthlyData?.periodLabel || '',
        gstSummary,
        bills: monthlyData?.bills || [],
      })
      setGstPdfSuccess(true)
      setTimeout(() => setGstPdfSuccess(false), 4000)
    } catch (err) {
      console.error('Failed to generate GST PDF:', err)
      setError('Could not generate GST PDF. Please try again.')
    } finally {
      setDownloadingGstPdf(false)
    }
  }

  const totals = useMemo(
    () =>
      Object.fromEntries(
        expenseGroups.map((group) => [
          group.key,
          (expenseValues[group.key] || []).reduce((sum, item) => sum + asNumber(item.value), 0),
        ])
      ),
    [expenseValues]
  )

  const totalExpense = Object.values(totals).reduce((sum, value) => sum + value, 0)
  const monthlyRevenue = monthlyData?.revenue ?? 0
  const monthlyBillCount = monthlyData?.billCount ?? 0
  const netProfit = monthlyRevenue - totalExpense
  const profitMargin = monthlyRevenue > 0 ? `${((netProfit / monthlyRevenue) * 100).toFixed(1)}%` : '0%'

  const changeValue = (groupKey, itemKey, value) => {
    setExpenseValues((current) => ({
      ...current,
      [groupKey]: current[groupKey].map((item) =>
        item.key === itemKey ? { ...item, value } : item
      ),
    }))
    setStatus('dirty')
    setError('')
    setPdfSuccess(false)
  }

  const saveExpenses = async () => {
    setStatus('saving')
    setError('')
    const payload = {
      ...Object.fromEntries(
        expenseGroups.map((group) => [
          group.key,
          (expenseValues[group.key] || []).map((item) => ({ ...item, value: asNumber(item.value) })),
        ])
      ),
      fixed_expense_total: totals.fixed_expenses || 0,
      staff_expense_total: totals.staff_expenses || 0,
      variable_expense_total: totals.variable_expenses || 0,
    }

    try {
      const token = localStorage.getItem('dineq:auth-token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const response = await fetch('/api/restaurant', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })
      const saved = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(saved.error || 'Could not save expenses')
      setCurrentRestaurant(saved)
      setExpenseValues(normalizeExpenses(saved))
      onRestaurantUpdated?.(saved)
      setStatus('saved')
    } catch (saveError) {
      setError(saveError.message)
      setStatus('error')
    }
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true)
    setPdfSuccess(false)
    try {
      // Refresh monthly revenue figures
      let freshMonthly = monthlyData
      try {
        const activeMonth = selectedMonth || monthlyData?.month || getCurrentMonthKey()
        const token = localStorage.getItem('dineq:auth-token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const query = activeMonth ? `?month=${encodeURIComponent(activeMonth)}` : ''
        const res = await fetch(`/api/reports/monthly${query}`, { headers })
        if (res.ok) freshMonthly = await res.json()
      } catch (err) {
        console.warn('Could not refresh monthly data:', err)
      }

      const rev = freshMonthly?.revenue ?? monthlyRevenue
      const billCount = freshMonthly?.billCount ?? monthlyBillCount
      const monthName = freshMonthly?.monthName || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const periodLabel = freshMonthly?.periodLabel || `1 – 30 ${monthName.toUpperCase()}`
      const profit = rev - totalExpense
      const margin = rev > 0 ? `${((profit / rev) * 100).toFixed(1)}%` : '0%'

      await generateMonthlyPerformanceReportPDF({
        restaurantName: currentRestaurant?.name || restaurant?.name || 'Your Restaurant Name',
        gstin: currentRestaurant?.gstin || restaurant?.gstin || '27XXXXX0000X1ZX',
        address: currentRestaurant?.address || restaurant?.address || '',
        phone: currentRestaurant?.phone || restaurant?.phone || '',
        monthName,
        periodLabel,
        monthlyRevenue: rev,
        monthlyBillCount: billCount,
        totals,
        totalExpense,
        netProfit: profit,
        profitMargin: margin,
        expenseValues,
        bills: freshMonthly?.bills || monthlyData?.bills || [],
        gstSummary: freshMonthly?.gstSummary || gstSummary,
        analytics: freshMonthly?.analytics || monthlyData?.analytics,
      })

      setPdfSuccess(true)
      setTimeout(() => setPdfSuccess(false), 4000)
    } catch (err) {
      console.error('PDF generation failed:', err)
      setError('Failed to generate PDF. Please try again.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar activeLabel="Reports" onNavigate={onNavigate} restaurant={currentRestaurant || restaurant} user={user} onSignOut={onSignOut} />
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
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Reports</strong></div>
          <div className={`reports-save-status status--${status}`} aria-live="polite">
            {status === 'saving' && <><Loader2 size={14} className="spin" /> Saving…</>}
            {status === 'saved' && <><Check size={14} /> Saved</>}
            {status === 'dirty' && <>● Unsaved changes</>}
            {status === 'error' && <>{error}</>}
          </div>
        </header>

        <div className="dashboard-content reports-content">
          <section className="page-intro reports-intro">
            <div>
              <p className="eyebrow">Monthly financial statement</p>
              <div className="reports-title-row">
                <h1>Financial Health & Reports</h1>
                <div className="reports-month-selector">
                  <Calendar size={15} className="reports-calendar-icon" />
                  <select
                    id="reports-month-select"
                    className="reports-month-dropdown"
                    value={selectedMonth || monthlyData?.month || getCurrentMonthKey()}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    aria-label="Select report month"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}{opt.isCurrent ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="intro-copy">
                Financial performance and statutory statements for <strong>{monthlyData?.monthName || 'selected month'}</strong>. Enter monthly expenses below to compute net profit and export official reports.
              </p>
            </div>
            <div className="reports-top-cta">
              <button
                className="primary-button"
                onClick={handleGeneratePdf}
                disabled={generatingPdf}
              >
                {generatingPdf ? (
                  <><Loader2 size={15} className="spin" /> Generating PDF…</>
                ) : pdfSuccess ? (
                  <><FileCheck size={15} /> PDF Downloaded</>
                ) : (
                  <><FileText size={15} /> Generate report (PDF)</>
                )}
              </button>
            </div>
          </section>

          {/* Monthly P&L Overview Card */}
          <section className="panel monthly-profit-card" style={{ marginBottom: 20, padding: 20 }}>
            <div className="panel-heading" style={{ marginBottom: 16 }}>
              <div>
                <p className="eyebrow">Monthly profit & loss ({monthlyData?.monthName || 'Current Month'})</p>
                <h2>Net Profit Overview</h2>
              </div>
              <span className={`summary-status ${netProfit >= 0 ? 'status--positive' : ''}`}>
                {netProfit >= 0 ? <TrendingUp size={14} style={{ marginRight: 4 }} /> : <TrendingDown size={14} style={{ marginRight: 4 }} />}
                {profitMargin} margin
              </span>
            </div>

            <div className="stat-grid" style={{ marginBottom: 0 }}>
              <article className="stat-card">
                <p>Monthly Revenue</p>
                <strong>{money(monthlyRevenue)}</strong>
                <div className="stat-meta">
                  <span>{monthlyBillCount} bill(s) captured this month</span>
                </div>
              </article>

              <article className="stat-card">
                <p>Total Expenses</p>
                <strong style={{ color: totalExpense > 0 ? 'var(--color-orange)' : 'var(--color-text-primary)' }}>
                  {money(totalExpense)}
                </strong>
                <div className="stat-meta">
                  <span>Recurring monthly baseline overhead</span>
                </div>
              </article>

              <article className="stat-card">
                <p>Net Monthly Profit</p>
                <strong style={{ color: netProfit >= 0 ? 'var(--color-green)' : 'var(--color-orange)' }}>
                  {netProfit < 0 ? `-₹${Math.abs(Math.round(netProfit)).toLocaleString('en-IN')}` : money(netProfit)}
                </strong>
                <div className="stat-meta">
                  <span>Revenue minus monthly expenses</span>
                </div>
              </article>
            </div>
          </section>

          {/* GST Summary Card */}
          <section className="gst-summary-panel">
            <div className="gst-header-flex">
              <div className="gst-title-group">
                <p className="eyebrow">Tax compliance & accounting schedule</p>
                <h2>
                  <ReceiptText size={20} style={{ color: 'var(--color-orange)' }} />
                  GST Summary ({monthlyData?.monthName || 'Current Month'})
                </h2>
                <div className="gst-meta-badges">
                  <div className="gst-badge gst-badge--orange">
                    <span>GSTIN:</span>
                    <strong>{currentRestaurant?.gstin || restaurant?.gstin || 'Not configured'}</strong>
                  </div>
                  <div className="gst-badge">
                    <span>Rate:</span>
                    <strong>5% Intra-State (2.5% CGST + 2.5% SGST)</strong>
                  </div>
                </div>
              </div>

              <div className="gst-header-actions">
                <div className="gst-month-select-wrapper">
                  <Calendar size={14} className="gst-calendar-icon" />
                  <select
                    className="gst-month-select"
                    value={selectedMonth || monthlyData?.month || getCurrentMonthKey()}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    aria-label="Select GST report month"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}{opt.isCurrent ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="secondary-button"
                  onClick={handleDownloadGstPdf}
                  disabled={downloadingGstPdf}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {downloadingGstPdf ? (
                    <><Loader2 size={15} className="spin" /> Generating GST PDF…</>
                  ) : gstPdfSuccess ? (
                    <><FileCheck size={15} style={{ color: 'var(--color-green)' }} /> GST Summary Downloaded</>
                  ) : (
                    <><FileDown size={15} /> Download GST Summary (PDF)</>
                  )}
                </button>
              </div>
            </div>

            <div className="gst-stat-grid">
              <article className="gst-stat-card">
                <p>Taxable Amount</p>
                <strong>{money(gstSummary.taxableAmount)}</strong>
                <span>Total bill subtotals</span>
              </article>

              <article className="gst-stat-card">
                <p>Total CGST</p>
                <strong>{money(gstSummary.cgst)}</strong>
                <span>Central GST (50%)</span>
              </article>

              <article className="gst-stat-card">
                <p>Total SGST</p>
                <strong>{money(gstSummary.sgst)}</strong>
                <span>State GST (50%)</span>
              </article>

              <article className="gst-stat-card is-accent">
                <p>Total GST Collected</p>
                <strong>{money(gstSummary.totalGst)}</strong>
                <span>CGST + SGST combined</span>
              </article>

              <article className="gst-stat-card">
                <p>Bills Included</p>
                <strong>{gstSummary.billCount}</strong>
                <span>In {monthlyData?.monthName || 'month'}</span>
              </article>
            </div>

            {/* Bill-by-Bill GST Schedule Table */}
            <div className="gst-table-wrapper">
              <table className="gst-table">
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Date & Time</th>
                    <th>Payment</th>
                    <th className="is-number">Taxable Subtotal</th>
                    <th className="is-number">CGST (2.5%)</th>
                    <th className="is-number">SGST (2.5%)</th>
                    <th className="is-number">Total GST (5%)</th>
                    <th className="is-number">Bill Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlyData?.bills || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="gst-empty-row">
                        No bills captured for this month.
                      </td>
                    </tr>
                  ) : (
                    (monthlyData?.bills || []).map((b, i) => {
                      const tot = asNumber(b.total)
                      const gst = asNumber(b.gst ?? b.tax ?? 0)
                      const sub = b.subtotal != null ? asNumber(b.subtotal) : (tot - gst > 0 ? tot - gst : tot)
                      const cgst = Math.round((gst / 2) * 100) / 100
                      const sgst = Math.round((gst - cgst) * 100) / 100
                      const billNum = b.bill_number || b.number || b.id || `BILL-${i + 1}`

                      return (
                        <tr key={b.id || i}>
                          <td className="is-bill-number">#{String(billNum).replace(/^#/, '')}</td>
                          <td>
                            {b.date || '-'} <small style={{ color: 'var(--color-text-muted)' }}>{b.time ? `• ${b.time}` : ''}</small>
                          </td>
                          <td>
                            <span className="badge badge--subtle" style={{ fontSize: '10px' }}>
                              {b.payment_mode || b.paymentMode || 'UPI'}
                            </span>
                          </td>
                          <td className="is-number">{money(sub)}</td>
                          <td className="is-number">{money(cgst)}</td>
                          <td className="is-number">{money(sgst)}</td>
                          <td className="is-number" style={{ color: 'var(--color-orange)', fontWeight: 600 }}>{money(gst)}</td>
                          <td className="is-number is-total">{money(tot)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {(monthlyData?.bills || []).length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3}>
                        TOTALS ({gstSummary.billCount} BILLS)
                      </td>
                      <td className="is-number">{money(gstSummary.taxableAmount)}</td>
                      <td className="is-number">{money(gstSummary.cgst)}</td>
                      <td className="is-number">{money(gstSummary.sgst)}</td>
                      <td className="is-number is-gst">{money(gstSummary.totalGst)}</td>
                      <td className="is-number is-total">
                        {money(gstSummary.taxableAmount + gstSummary.totalGst)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <div className="report-expense-intro-card" style={{ marginBottom: 16, background: 'var(--color-charcoal-800)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Monthly Operating Expenses (Recurring Overhead Baseline)
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                These baseline expenses (rent, salaries, utilities) automatically recur and apply across each month's P&L calculation. Update anytime to recalculate all monthly statements.
              </p>
            </div>
            <span className="badge badge--subtle" style={{ fontSize: '11px', padding: '4px 8px', whiteSpace: 'nowrap' }}>
              Recurring baseline across all months
            </span>
          </div>

          <section className="report-expense-groups">
            {expenseGroups.map((group) => {
              const GroupIcon = group.icon
              const groupTotal = totals[group.key] || 0
              return (
                <section className="panel report-expense-card" key={group.key}>
                  <div className="panel-heading">
                    <h2 className="report-panel-title">
                      <GroupIcon size={18} /> {group.label}
                    </h2>
                    <strong style={{ fontSize: 'var(--text-sm)' }}>{money(groupTotal)}</strong>
                  </div>
                  <div className="expense-input-grid">
                    {group.items.map((item) => {
                      const input = (expenseValues[group.key] || []).find((entry) => entry.key === item.key)
                      const val = input?.value !== undefined ? input.value : 0
                      return (
                        <label className="expense-input" key={item.key}>
                          <span>{item.label}</span>
                          <span className="expense-value">
                            ₹
                            <input
                              aria-label={item.label}
                              inputMode="numeric"
                              type="number"
                              min="0"
                              value={val}
                              onFocus={() => {
                                if (val === 0 || val === '0') {
                                  changeValue(group.key, item.key, '')
                                }
                              }}
                              onChange={(event) => {
                                const raw = event.target.value
                                if (raw === '') {
                                  changeValue(group.key, item.key, '')
                                } else {
                                  const cleaned = raw.replace(/^0+(?=\d)/, '')
                                  changeValue(group.key, item.key, cleaned)
                                }
                              }}
                              onBlur={(event) => {
                                const raw = event.target.value.trim()
                                if (raw === '' || isNaN(Number(raw))) {
                                  changeValue(group.key, item.key, 0)
                                } else {
                                  changeValue(group.key, item.key, asNumber(raw))
                                }
                              }}
                            />
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </section>

          <section className="panel expense-breakdown-card">
            <div className="panel-heading">
              <h2 className="report-panel-title">
                <BadgeIndianRupee size={18} /> Expense breakdown
              </h2>
            </div>
            {expenseGroups.map((group) => {
              const groupTotal = totals[group.key]
              const percent = totalExpense ? Math.round((groupTotal / totalExpense) * 100) : 0
              return (
                <div className="breakdown-row" key={group.key}>
                  <span className={`breakdown-label breakdown-label--${group.color}`}>
                    {group.pluralLabel}
                  </span>
                  <div className="breakdown-track">
                    <i
                      className={`expense-fill expense-fill--${group.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <strong>
                    {money(groupTotal)} ({percent}%)
                  </strong>
                </div>
              )
            })}
            <p className="breakdown-total">
              Total monthly expense <strong>{money(totalExpense)}</strong>
            </p>
          </section>

          <div className="reports-actions">
            <button
              className="secondary-button"
              onClick={saveExpenses}
              disabled={status === 'saving'}
            >
              <Save size={15} />
              {status === 'saving' ? 'Saving…' : 'Save expenses'}
            </button>
            <button
              className="primary-button"
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <><Loader2 size={15} className="spin" /> Generating PDF…</>
              ) : pdfSuccess ? (
                <><FileCheck size={15} /> PDF Downloaded</>
              ) : (
                <><FileText size={15} /> Generate report (PDF)</>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

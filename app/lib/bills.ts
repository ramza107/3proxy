/** Helpers for monthly bills / subscriptions. */

import type { Bill } from '../types'

export function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

/** This month’s calendar due date (may already be past). */
export function dueDateThisMonth(bill: Bill, from = new Date()): Date {
  const day = Math.min(bill.dayOfMonth, daysInMonth(from.getFullYear(), from.getMonth()))
  return new Date(from.getFullYear(), from.getMonth(), day, 12, 0, 0, 0)
}

/** Next due date for a bill (today or future). */
export function nextDueDate(bill: Bill, from = new Date()): Date {
  const due = dueDateThisMonth(bill, from)
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0)
  if (due >= start) return due
  const y = from.getMonth() === 11 ? from.getFullYear() + 1 : from.getFullYear()
  const m = (from.getMonth() + 1) % 12
  const d = Math.min(bill.dayOfMonth, daysInMonth(y, m))
  return new Date(y, m, d, 12, 0, 0, 0)
}

/**
 * Due date for unpaid tracking this month: keep past days as overdue
 * instead of rolling to next month until marked paid.
 */
export function effectiveDueDate(bill: Bill, from = new Date(), month = currentMonthKey(from)): Date {
  if (!isPaidThisMonth(bill, month)) {
    return dueDateThisMonth(bill, from)
  }
  return nextDueDate(bill, from)
}

export function isPaidThisMonth(bill: Bill, month = currentMonthKey()) {
  return bill.lastPaidMonth === month
}

/** Due (unpaid) amounts this month, grouped by currency. */
export function dueTotalsByCurrency(bills: Bill[], month = currentMonthKey()) {
  const byCur: Record<string, number> = {}
  let count = 0
  for (const b of bills) {
    if (b.active === false) continue
    if (isPaidThisMonth(b, month)) continue
    const cur = (b.currency || 'UAH').toUpperCase()
    byCur[cur] = (byCur[cur] || 0) + b.amount
    count += 1
  }
  return { byCur, count }
}

export function formatMoney(amount: number, currency: string) {
  const cur = (currency || 'UAH').toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(amount % 1 === 0 ? 0 : 2)} ${cur}`
  }
}

export function sortBills(bills: Bill[]) {
  const month = currentMonthKey()
  return [...bills].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    const aPaid = isPaidThisMonth(a, month)
    const bPaid = isPaidThisMonth(b, month)
    if (aPaid !== bPaid) return aPaid ? 1 : -1
    return effectiveDueDate(a).getTime() - effectiveDueDate(b).getTime()
  })
}

/** Unpaid active bills due within the next `withinDays` (includes overdue this month). */
export function upcomingUnpaidBills(bills: Bill[], withinDays = 14, from = new Date()) {
  const month = currentMonthKey(from)
  const horizon = new Date(from.getFullYear(), from.getMonth(), from.getDate() + withinDays, 23, 59, 0, 0)
  return sortBills(bills).filter((b) => {
    if (b.active === false) return false
    if (isPaidThisMonth(b, month)) return false
    return effectiveDueDate(b, from, month).getTime() <= horizon.getTime()
  })
}

/** Soonest unpaid bill for widgets / glances. */
export function findNextBill(bills: Bill[], from = new Date()): Bill | null {
  return upcomingUnpaidBills(bills, 45, from)[0] || null
}

export function formatBillDueLabel(bill: Bill, from = new Date()): string {
  const due = effectiveDueDate(bill, from)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return `in ${diff}d`
}

export function isPayUrl(payHowTo: string | null | undefined): boolean {
  return !!payHowTo && /^https?:\/\//i.test(payHowTo.trim())
}

export const BILL_CATEGORIES = [
  'Housing',
  'Utilities',
  'Internet',
  'Phone',
  'Streaming',
  'Fitness',
  'Insurance',
  'Transport',
  'General',
] as const

export function sampleBills(): Omit<Bill, 'id' | 'created_at' | 'updated_at'>[] {
  return [
    {
      title: 'Rent',
      amount: 18500,
      currency: 'UAH',
      dayOfMonth: 1,
      category: 'Housing',
      notes: 'Apartment',
      payHowTo: 'Bank transfer · IBAN in notes',
      active: true,
      lastPaidMonth: null,
      paidHistory: [],
    },
    {
      title: 'Internet',
      amount: 299,
      currency: 'UAH',
      dayOfMonth: 5,
      category: 'Internet',
      notes: null,
      payHowTo: 'https://my.provider.example/pay',
      active: true,
      lastPaidMonth: null,
      paidHistory: [],
    },
    {
      title: 'Netflix',
      amount: 7.99,
      currency: 'USD',
      dayOfMonth: 12,
      category: 'Streaming',
      notes: null,
      payHowTo: 'App Store / Google Play subscription',
      active: true,
      lastPaidMonth: null,
      paidHistory: [],
    },
    {
      title: 'Phone',
      amount: 250,
      currency: 'UAH',
      dayOfMonth: 15,
      category: 'Phone',
      notes: null,
      payHowTo: null,
      active: true,
      lastPaidMonth: null,
      paidHistory: [],
    },
    {
      title: 'Gym',
      amount: 1200,
      currency: 'UAH',
      dayOfMonth: 20,
      category: 'Fitness',
      notes: null,
      payHowTo: 'Front desk or bank app',
      active: true,
      lastPaidMonth: null,
      paidHistory: [],
    },
  ]
}

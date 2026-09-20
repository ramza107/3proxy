/** Helpers for monthly bills / subscriptions. */

import type { Bill } from '../types'

export function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

/** Next due date for a bill (today or future). */
export function nextDueDate(bill: Bill, from = new Date()): Date {
  const day = Math.min(bill.dayOfMonth, daysInMonth(from.getFullYear(), from.getMonth()))
  let due = new Date(from.getFullYear(), from.getMonth(), day, 12, 0, 0, 0)
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0)
  if (due < start) {
    const y = from.getMonth() === 11 ? from.getFullYear() + 1 : from.getFullYear()
    const m = (from.getMonth() + 1) % 12
    const d = Math.min(bill.dayOfMonth, daysInMonth(y, m))
    due = new Date(y, m, d, 12, 0, 0, 0)
  }
  return due
}

export function isPaidThisMonth(bill: Bill, month = currentMonthKey()) {
  return bill.lastPaidMonth === month
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
    return nextDueDate(a).getTime() - nextDueDate(b).getTime()
  })
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
      active: true,
      lastPaidMonth: null,
    },
    {
      title: 'Internet',
      amount: 299,
      currency: 'UAH',
      dayOfMonth: 5,
      category: 'Internet',
      notes: null,
      active: true,
      lastPaidMonth: null,
    },
    {
      title: 'Netflix',
      amount: 7.99,
      currency: 'USD',
      dayOfMonth: 12,
      category: 'Streaming',
      notes: null,
      active: true,
      lastPaidMonth: null,
    },
    {
      title: 'Phone',
      amount: 250,
      currency: 'UAH',
      dayOfMonth: 15,
      category: 'Phone',
      notes: null,
      active: true,
      lastPaidMonth: null,
    },
    {
      title: 'Gym',
      amount: 1200,
      currency: 'UAH',
      dayOfMonth: 20,
      category: 'Fitness',
      notes: null,
      active: true,
      lastPaidMonth: null,
    },
  ]
}

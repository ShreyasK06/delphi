import type { DebtItem } from '../types'

export interface PayoffResult {
  method: 'avalanche' | 'snowball'
  months: number
  totalInterest: number
  totalPaid: number
  /** order debts were targeted, by type label */
  payoffOrder: string[]
  /** true if the payment can't outpace interest accrual */
  stalled: boolean
}

const MAX_MONTHS = 600

/**
 * Simulates paying `monthlyPayment` toward all debts, cascading the full
 * budget into debts in priority order each month after interest accrues.
 */
function simulate(debts: DebtItem[], monthlyPayment: number, method: 'avalanche' | 'snowball'): PayoffResult {
  const order = [...debts].sort((a, b) =>
    method === 'avalanche' ? b.rate - a.rate : a.balance - b.balance,
  )
  const balances = order.map((d) => d.balance)
  let months = 0
  let totalInterest = 0

  while (balances.some((b) => b > 0.005) && months < MAX_MONTHS) {
    months++
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue
      const interest = balances[i] * (order[i].rate / 100 / 12)
      balances[i] += interest
      totalInterest += interest
    }
    let remaining = monthlyPayment
    for (let i = 0; i < balances.length && remaining > 0; i++) {
      if (balances[i] <= 0) continue
      const pay = Math.min(balances[i], remaining)
      balances[i] -= pay
      remaining -= pay
    }
  }

  const stalled = months >= MAX_MONTHS
  const principal = debts.reduce((s, d) => s + d.balance, 0)
  return {
    method,
    months,
    totalInterest,
    totalPaid: principal + totalInterest,
    payoffOrder: order.map((d) => d.type),
    stalled,
  }
}

export interface PayoffComparison {
  avalanche: PayoffResult
  snowball: PayoffResult
  /** dollars saved by avalanche over snowball (>= 0) */
  avalancheSavings: number
  monthlyInterestNow: number
}

export function compareStrategies(debts: DebtItem[], monthlyPayment: number): PayoffComparison {
  const avalanche = simulate(debts, monthlyPayment, 'avalanche')
  const snowball = simulate(debts, monthlyPayment, 'snowball')
  const monthlyInterestNow = debts.reduce((s, d) => s + d.balance * (d.rate / 100 / 12), 0)
  return {
    avalanche,
    snowball,
    avalancheSavings: Math.max(snowball.totalInterest - avalanche.totalInterest, 0),
    monthlyInterestNow,
  }
}

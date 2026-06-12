import type { Profile } from '../types'
import { fmtMoney } from '../types'
import { emergencyPlan } from './emergency'
import { planGoal } from './goals'

export interface Allocation {
  label: string
  amount: number
  why: string
  kind: 'debt' | 'emergency' | 'goal' | 'savings' | 'fun'
}

/**
 * Spec decision tree:
 * 1. High-interest debt (>7% APR) → pay that first
 * 2. Emergency fund < $500 → fund to $500
 * 3. Goal due within 6 months → allocate toward it
 * 4. Otherwise → 50% savings / 30% goals / 20% guilt-free
 */
export function allocateWindfall(amount: number, p: Profile): Allocation[] {
  const allocations: Allocation[] = []
  let left = amount

  const highInterest = [...p.debt_breakdown]
    .filter((d) => d.rate > 7 && d.balance > 0)
    .sort((a, b) => b.rate - a.rate)
  for (const d of highInterest) {
    if (left <= 0) break
    const pay = Math.min(d.balance, left)
    const monthlyInterest = d.balance * (d.rate / 100 / 12)
    allocations.push({
      label: `Pay down ${d.type} (${d.rate}% APR)`,
      amount: pay,
      why: `This debt costs you about ${fmtMoney(monthlyInterest)}/month in interest. Paying it is a guaranteed ${d.rate}% return, better than any savings account.`,
      kind: 'debt',
    })
    left -= pay
  }

  if (left > 0 && p.emergency_fund < 500) {
    const fund = Math.min(500 - p.emergency_fund, left)
    allocations.push({
      label: 'Emergency fund (to $500)',
      amount: fund,
      why: `A $500 buffer keeps the next surprise expense off a credit card. You're at ${fmtMoney(p.emergency_fund)} now.`,
      kind: 'emergency',
    })
    left -= fund
  }

  if (left > 0) {
    const nearGoals = p.goals
      .map((g) => planGoal(g, p))
      .filter((plan) => plan.monthsLeft <= 6 && plan.remaining > 0)
      .sort((a, b) => a.monthsLeft - b.monthsLeft)
    for (const plan of nearGoals) {
      if (left <= 0) break
      const put = Math.min(plan.remaining, left)
      allocations.push({
        label: `Goal: ${plan.goal.name}`,
        amount: put,
        why: `Due in ${plan.monthsLeft <= 1 ? 'about a month' : `${plan.monthsLeft} months`}, this covers ${fmtMoney(put)} of the ${fmtMoney(plan.remaining)} still needed.`,
        kind: 'goal',
      })
      left -= put
    }
  }

  if (left > 0) {
    const savings = Math.round(left * 0.5)
    const goal = Math.round(left * 0.3)
    const fun = left - savings - goal
    const ep = emergencyPlan(p)
    if (savings > 0)
      allocations.push({
        label: 'Savings',
        amount: savings,
        why: ep.gap > 0
          ? `Builds toward your ${fmtMoney(ep.target)} emergency target (currently ${Math.round(ep.pctFunded)}% funded).`
          : 'Grows your cushion for next semester.',
        kind: 'savings',
      })
    if (goal > 0)
      allocations.push({
        label: p.goals.length > 0 ? `Toward "${p.goals[0].name}"` : 'Future goals',
        amount: goal,
        why: p.goals.length > 0
          ? 'Accelerates your top goal ahead of schedule.'
          : 'Set a goal and this becomes its head start.',
        kind: 'goal',
      })
    if (fun > 0)
      allocations.push({
        label: 'Guilt-free spending',
        amount: fun,
        why: 'You handled the rest responsibly, enjoying some of it makes the plan sustainable.',
        kind: 'fun',
      })
  }

  return allocations
}

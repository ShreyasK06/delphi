import type { Profile } from '../types'
import { essentialExpenses } from '../types'

export interface EmergencyPlan {
  /** 1 month of essentials, the college-adjusted target */
  target: number
  current: number
  gap: number
  /** suggested weekly auto-save, rounded to $5 */
  weeklySave: number
  weeksToTarget: number
  /** true when starting from zero: first micro-goal is $500 */
  microGoal: boolean
  pctFunded: number
}

export function emergencyPlan(p: Profile): EmergencyPlan {
  const essentials = essentialExpenses(p.monthly_expenses)
  const microGoal = p.emergency_fund <= 0 && p.savings <= 0
  // Students: 1 month of essentials, not the traditional 3–6. From zero, start at $500.
  const target = microGoal ? Math.min(500, Math.max(essentials, 500)) : Math.max(essentials, 500)
  const current = p.emergency_fund
  const gap = Math.max(target - current, 0)
  const weeklySave = gap > 0 ? Math.max(Math.ceil(gap / 12 / 5) * 5, 10) : 0
  return {
    target,
    current,
    gap,
    weeklySave,
    weeksToTarget: weeklySave > 0 ? Math.ceil(gap / weeklySave) : 0,
    microGoal,
    pctFunded: target > 0 ? Math.min((current / target) * 100, 100) : 100,
  }
}

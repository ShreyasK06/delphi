import type { Goal, Profile } from '../types'
import { monthlySurplus } from '../types'

export interface GoalPlan {
  goal: Goal
  remaining: number
  monthsLeft: number
  monthlyNeeded: number
  weeklyNeeded: number
  progressPct: number
  feasible: boolean
  /** suggested timeline (months from now) if the current one is unrealistic */
  adjustedMonths: number | null
  deadlineSoon: boolean
}

/** Parse "yyyy-mm" as a local date, `new Date('yyyy-mm-01')` parses as UTC and can shift a day back. */
function parseTarget(by: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(by)
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1)
  return new Date(by)
}

export function monthsUntil(by: string, from = new Date()): number {
  const target = parseTarget(by)
  if (isNaN(target.getTime())) return 0
  const months =
    (target.getFullYear() - from.getFullYear()) * 12 + (target.getMonth() - from.getMonth())
  return Math.max(months, 0)
}

export function planGoal(goal: Goal, profile: Profile, now = new Date()): GoalPlan {
  const remaining = Math.max(goal.amount - goal.saved, 0)
  const monthsLeft = monthsUntil(goal.by, now)
  const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : remaining
  const surplus = monthlySurplus(profile)
  const feasible = remaining === 0 || (surplus > 0 && monthlyNeeded <= surplus)
  const adjustedMonths =
    !feasible && surplus > 0 ? Math.ceil(remaining / surplus) : !feasible ? null : null
  const target = parseTarget(goal.by)
  const deadlineSoon =
    !isNaN(target.getTime()) &&
    target.getTime() - now.getTime() < 60 * 24 * 60 * 60 * 1000 &&
    remaining > 0
  return {
    goal,
    remaining,
    monthsLeft,
    monthlyNeeded,
    weeklyNeeded: monthlyNeeded / 4.33,
    progressPct: goal.amount > 0 ? Math.min((goal.saved / goal.amount) * 100, 100) : 0,
    feasible,
    adjustedMonths,
    deadlineSoon,
  }
}

export function milestoneMessage(plan: GoalPlan): string | null {
  const pct = Math.floor(plan.progressPct)
  if (pct >= 100) return `🎉 "${plan.goal.name}" is fully funded!`
  if (pct >= 75) return `You're ${pct}% of the way to "${plan.goal.name}". Home stretch!`
  if (pct >= 50) return `Halfway there: ${pct}% of "${plan.goal.name}" saved.`
  if (pct >= 25) return `You're ${pct}% of the way to "${plan.goal.name}". Keep the momentum going!`
  return null
}

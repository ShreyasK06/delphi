import type { ChatMessage, Profile } from '../../types'
import { totalExpenses, essentialExpenses, totalDebt, monthlySurplus, fmtMoney } from '../../types'
import type { CoachAdapter } from './adapter'
import { calculateScore, scoreLabel } from '../score'
import { emergencyPlan } from '../emergency'
import { compareStrategies } from '../debt'
import { planGoal } from '../goals'
import { allocateWindfall } from '../windfall'

const DISTRESS = /can't afford (food|rent|to eat)|evict|homeless|starving|skipping meals|desperate|drowning in debt|panic|overwhelmed/i

function distressReply(): string {
  return [
    "First, that sounds genuinely stressful, and you're not alone in it. A lot of students hit this wall, and there is real help on campus before we talk numbers.",
    '• Your **financial aid office** can often do emergency grants or aid adjustments mid-semester.',
    "• Most campuses have a **food pantry**, no questions, no stigma, that's what it's for.",
    '• Ask about **emergency student funds**, many schools have small no-strings grants for exactly this.',
    "Once you've reached out to one of those, come back and we'll build a short-term plan together. What's the most urgent bill right now?",
  ].join('\n\n')
}

function scoreReply(p: Profile): string {
  const s = calculateScore(p)
  const lines = s.categories.map((c) => `• ${c.label}: **${c.points}/${c.max}**, ${c.note}`)
  return [
    `Your Financial Health Score is **${s.total}/100** (${scoreLabel(s.total)}). Here's the breakdown:`,
    lines.join('\n'),
    `**Your one move:** ${s.priorityAction}`,
  ].join('\n\n')
}

function debtReply(p: Profile): string {
  if (p.debt_breakdown.length === 0) {
    return "Good news, you have no debt on file. That's a 20/20 on the debt portion of your score. If that changes (student loans, a card balance), add it in your profile and I'll build a payoff plan."
  }
  const debt = totalDebt(p)
  const surplus = monthlySurplus(p)
  const payment = Math.max(surplus, 25)
  const cmp = compareStrategies(p.debt_breakdown, payment)
  const lines = [
    `You're carrying **${fmtMoney(debt)}** across ${p.debt_breakdown.length} ${p.debt_breakdown.length === 1 ? 'balance' : 'balances'}, costing about ${fmtMoney(cmp.monthlyInterestNow)}/month in interest.`,
  ]
  if (cmp.avalanche.stalled) {
    lines.push(`At ${fmtMoney(payment)}/month the balances can't outrun the interest. Let's look at your budget first to free up more, or check the Debt Planner page to test different payment amounts.`)
  } else {
    lines.push(
      `Putting your ${fmtMoney(payment)}/month surplus toward it: **avalanche** (highest rate first: ${cmp.avalanche.payoffOrder.join(' → ')}) clears it in ${cmp.avalanche.months} months with ${fmtMoney(cmp.avalanche.totalInterest)} interest; **snowball** (smallest balance first) takes ${cmp.snowball.months} months and ${fmtMoney(cmp.snowball.totalInterest)}.`,
      cmp.avalancheSavings > 10
        ? `Avalanche saves you ${fmtMoney(cmp.avalancheSavings)}. If you need quick wins to stay motivated, snowball is worth that price. The Debt Planner page has the full comparison.`
        : 'The two methods are nearly identical for you, pick snowball for the early momentum.',
    )
  }
  return lines.join('\n\n')
}

function emergencyReply(p: Profile): string {
  const ep = emergencyPlan(p)
  if (ep.gap <= 0) {
    return `Your emergency fund is fully funded at ${fmtMoney(ep.current)}, that covers a month of essentials. Next dollar can go to goals or debt.`
  }
  return [
    `For students I target **1 month of essential expenses**, not the traditional 3–6, college reality. Your essentials run about ${fmtMoney(essentialExpenses(p.monthly_expenses))}/month${ep.microGoal ? ", but since you're starting from zero, the first micro-goal is **$500**" : ''}.`,
    `You have ${fmtMoney(ep.current)} saved, **${fmtMoney(ep.gap)}** to go. Auto-save **${fmtMoney(ep.weeklySave)}/week** and you're there in about ${ep.weeksToTarget} weeks.`,
  ].join('\n\n')
}

function goalsReply(p: Profile): string {
  if (p.goals.length === 0) {
    return 'No goals on file yet. Give me one with a number and a date, "$800 spring break trip by March", and I\'ll tell you exactly what to set aside each week.'
  }
  const lines = p.goals.map((g) => {
    const plan = planGoal(g, p)
    if (plan.remaining <= 0) return `• **${g.name}**: fully funded 🎉`
    const base = `• **${g.name}**: ${fmtMoney(g.saved)} of ${fmtMoney(g.amount)} saved (${Math.round(plan.progressPct)}%). Needs ${fmtMoney(plan.monthlyNeeded)}/month for ${plan.monthsLeft || 'under a'} month${plan.monthsLeft === 1 ? '' : 's'}.`
    return plan.feasible
      ? base
      : `${base} ⚠️ That's more than your ${fmtMoney(monthlySurplus(p))}/month surplus, ${plan.adjustedMonths ? `a ${plan.adjustedMonths}-month timeline would fit your budget` : 'we need to free up budget first'}.`
  })
  return [`Here's where your goals stand:`, lines.join('\n')].join('\n\n')
}

function budgetReply(p: Profile): string {
  const spent = totalExpenses(p.monthly_expenses)
  const surplus = monthlySurplus(p)
  const e = p.monthly_expenses
  return [
    `You bring in ${fmtMoney(p.monthly_income)}/month and spend ${fmtMoney(spent)}, ${surplus >= 0 ? `**${fmtMoney(surplus)}** left over` : `**${fmtMoney(-surplus)} over budget**`}.`,
    `Biggest categories: rent ${fmtMoney(e.rent)}, food ${fmtMoney(e.food)}, transport ${fmtMoney(e.transportation)}, utilities ${fmtMoney(e.utilities)}, subscriptions ${fmtMoney(e.subscriptions)}, going out ${fmtMoney(e.going_out)}, other ${fmtMoney(e.other)}. The Budget page breaks this down against the 50/30/20 framework with flags on anything running hot.`,
  ].join('\n\n')
}

function windfallReply(p: Profile, amount: number): string {
  const allocs = allocateWindfall(amount, p)
  const lines = allocs.map((a) => `• **${a.label}**, ${fmtMoney(a.amount)}. ${a.why}`)
  return [
    `Nice, ${fmtMoney(amount)} is a real decision to make well. Here's my allocation:`,
    lines.join('\n'),
    'Want the full breakdown? The Extra Cash page shows this with the reasoning for each step.',
  ].join('\n\n')
}

function investReply(p: Profile): string {
  return [
    "Quick honesty check: I'm not a licensed financial advisor, so treat this as education, not a recommendation.",
    p.has_retirement_account
      ? 'Since you already have a retirement account, the usual student move is low-cost index funds inside it, broad market, set-and-forget.'
      : 'If you have earned income from a job, a **Roth IRA** is the classic student move, you pay tax now (while your rate is low) and withdrawals in retirement are tax-free. Low-cost index funds inside it do the heavy lifting.',
    `Before investing though: high-interest debt and your emergency fund come first. ${totalDebt(p) > 0 ? `You still have ${fmtMoney(totalDebt(p))} in debt to weigh.` : "You're debt-free, so you're in good shape to start small."} The Invest page walks through Roth IRAs, index funds, and exactly how much to start with at your income level.`,
  ].join('\n\n')
}

const moneyPattern = /\$?\s?([\d,]+(?:\.\d{1,2})?)/

export class MockCoach implements CoachAdapter {
  async send(profile: Profile, _history: ChatMessage[], message: string): Promise<string> {
    // small delay so the typing indicator reads naturally
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500))
    const m = message.toLowerCase()

    if (DISTRESS.test(message)) return distressReply()

    if (/refund|windfall|birthday money|scholarship|got \$|received \$|what (should|do) i do with/i.test(m)) {
      const match = message.match(moneyPattern)
      const amount = match ? parseFloat(match[1].replace(/,/g, '')) : 0
      if (amount > 0) return windfallReply(profile, amount)
    }
    if (/invest|roth|ira|401k|retirement|stock|index fund/.test(m)) return investReply(profile)
    if (/score|health|how am i doing|doing financially/.test(m)) return scoreReply(profile)
    if (/debt|loan|credit card balance|payoff|pay off|owe/.test(m)) return debtReply(profile)
    if (/emergency|rainy day|cushion|buffer|safety net/.test(m)) return emergencyReply(profile)
    if (/goal|trip|save for|saving for|laptop|spring break/.test(m)) return goalsReply(profile)
    if (/budget|spending|expenses|afford|money going/.test(m)) return budgetReply(profile)
    if (/tax|filing|deduction|aotc/.test(m)) {
      return "Taxes for students usually come down to: file if you had a job (you'll likely get withholding back), and check the **AOTC credit** if you're paying tuition, worth up to $2,500. I can give you the overview, but for actual filing, your campus **VITA site** (free, IRS-trained volunteers) or IRS Free File is the move. Big picture questions, fire away."
    }
    if (/fafsa|financial aid/.test(m)) {
      return profile.has_fafsa
        ? "You've got FAFSA filed, good. Renewal opens every fall; refile each year even if you think nothing changed, because aid formulas shift. Anything specific about your aid package I can help decode?"
        : "You haven't filed FAFSA yet, and that's potentially free money on the table (grants, work-study, subsidized loans). It takes about 30 minutes at studentaid.gov, and your school's financial aid office can walk you through the award letter when it arrives."
    }

    const s = calculateScore(profile)
    return [
      `I'm grounded in your actual numbers, so ask me anything specific, your budget, your ${profile.debt_breakdown.length > 0 ? `${fmtMoney(totalDebt(profile))} in debt` : 'savings'}, your goals, or a windfall decision.`,
      `Quick pulse: your Financial Health Score is **${s.total}/100**, and the highest-impact move right now is in **${s.lowest.label}**. ${s.priorityAction}`,
    ].join('\n\n')
  }
}

export const mockCoach = new MockCoach()

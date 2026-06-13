import type { Profile, ScoreCategory, ScoreResult } from '../types'
import { totalExpenses, totalCustomExpenses, fmtMoney } from '../types'

export const knowledgeQuiz = [
  {
    id: 'credit_payment',
    topic: 'Credit cards',
    question: 'What is the most important thing to do with a credit card?',
    options: [
      'Pay the minimum balance each month',
      'Pay the full balance every month',
      'Keep utilization above 50%',
      'Only use it for emergencies',
    ],
    correct: 1,
  },
  {
    id: 'emergency_fund',
    topic: 'Emergency fund',
    question: 'How many months of expenses should an emergency fund cover?',
    options: ['1 month', '3 to 6 months', '12 months', 'Only one paycheck'],
    correct: 1,
  },
  {
    id: 'debt_order',
    topic: 'Debt payoff',
    question: 'Which debt should you pay off first with extra money?',
    options: [
      'The largest balance',
      'The oldest account',
      'The highest interest rate',
      'Student loans first, always',
    ],
    correct: 2,
  },
  {
    id: 'investing_start',
    topic: 'Investing',
    question: 'When is the best time to start investing?',
    options: [
      'After you pay off all debt',
      'After you have 6 months of savings',
      'As early as possible',
      'Once you have a full-time job',
    ],
    correct: 2,
  },
  {
    id: 'credit_score_factor',
    topic: 'Credit score',
    question: 'What factor has the biggest impact on your credit score?',
    options: [
      'Total amount of debt',
      'Number of credit cards',
      'Payment history',
      'Your income',
    ],
    correct: 2,
  },
]

export function knowledgeLevel(p: Profile): { correct: number; total: number } {
  const total = knowledgeQuiz.length
  const correct = knowledgeQuiz.reduce((count, q) => {
    const answer = (p.quiz_answers ?? {})[q.id]
    return answer !== undefined && Number(answer) === q.correct ? count + 1 : count
  }, 0)
  return { correct, total }
}

// 1. PAYMENT BEHAVIOR — 25 pts
function paymentBehaviorScore(p: Profile): ScoreCategory {
  let points = 0

  // On-time payment rate over last 6 months: up to 15 pts
  const ph = p.payment_history ?? ''
  if (ph === 'perfect') points += 15
  else if (ph === 'one_miss') points += 10
  else if (ph === 'two_misses') points += 5
  // three_plus or '' = 0

  // Types of bills paid on time: up to 6 pts (2 each)
  const bills = p.bills_on_time ?? []
  if (bills.includes('credit_card')) points += 2
  if (bills.includes('rent')) points += 2
  if (bills.includes('phone_utilities')) points += 2

  // Auto-pay enrollment: 4 pts
  if (p.has_autopay) points += 4

  let note: string
  if (ph === 'perfect') {
    note = `Perfect payment record over the last 6 months${p.has_autopay ? ', and autopay is set up' : ''}. Keep it going.`
  } else if (ph === 'one_miss') {
    note = `One missed payment in 6 months. Setting up autopay prevents these from happening again.`
  } else if (ph === 'two_misses') {
    note = `Two missed payments in 6 months. Autopay on even one bill locks in points and protects your credit.`
  } else if (ph === 'three_plus') {
    note = `Three or more missed payments is a real credit risk. Start with one autopay setup this week.`
  } else {
    note = `Payment history not filled in yet. This is the highest-weight category at 25 points.`
  }

  return { key: 'payment_behavior', label: 'Payment Behavior', points, max: 25, note }
}

// 2. SPENDING CONTROL — 20 pts
function spendingControlScore(p: Profile): ScoreCategory {
  let points = 0
  const income = p.monthly_income
  const totalExp = totalExpenses(p.monthly_expenses)
  const totalCust = totalCustomExpenses(p)
  const totalSpend = totalExp + totalCust

  // Has a tracked budget: 5 pts (total expenses + custom expenses > 0)
  const hasBudget = totalSpend > 0
  if (hasBudget) points += 5

  // Spending within income last month: up to 8 pts
  if (income > 0) {
    const ratio = totalSpend / income
    if (ratio <= 1.0) points += 8
    else if (ratio <= 1.1) points += 4
    // else 0
  }

  // Discretionary as % of take-home: up to 7 pts
  // Discretionary = subscriptions + going_out + other + custom expenses
  const discretionary = p.monthly_expenses.subscriptions + p.monthly_expenses.going_out + p.monthly_expenses.other + totalCust
  if (income > 0) {
    const discPct = discretionary / income
    if (discPct < 0.30) points += 7
    else if (discPct <= 0.40) points += 4
    else points += 1
  }

  let note: string
  if (income === 0) {
    note = 'Add your monthly income so spending control can be calculated.'
  } else {
    const spendPct = Math.round((totalSpend / income) * 100)
    const discPct = Math.round((discretionary / income) * 100)
    note = `Spending is ${spendPct}% of income. Discretionary (subscriptions, going out, other) is ${discPct}% of take-home.`
    if (!hasBudget) note = 'No expenses entered yet. Filling in your budget unlocks 5 points here.'
  }

  return { key: 'spending_control', label: 'Spending Control', points, max: 20, note }
}

// 3. EMERGENCY SAVINGS — 5 pts
function emergencySavingsScore(p: Profile): ScoreCategory {
  let points = 0

  // Has any emergency fund: 2 pts
  if (p.emergency_fund > 0) points += 2

  // Fund size relative to total monthly expenses
  if (p.emergency_fund > 0) {
    const totalExp = totalExpenses(p.monthly_expenses) + totalCustomExpenses(p)
    if (totalExp > 0) {
      const weeks = (p.emergency_fund / totalExp) * 4 // approximate weeks of coverage
      if (weeks < 2) points += 1          // less than 2 weeks
      else if (weeks < 4) points += 2     // 2 weeks to 1 month
      else points += 3                    // 1 month or more
    } else {
      // No expenses entered, fund exists, give full fund-size points
      points += 3
    }
  }

  let note: string
  if (p.emergency_fund <= 0) {
    note = 'No emergency fund yet. Even $200 gets you the base 2 points and covers a surprise expense.'
  } else {
    const totalExp = totalExpenses(p.monthly_expenses) + totalCustomExpenses(p)
    const weeksStr = totalExp > 0 ? `${((p.emergency_fund / totalExp) * 4).toFixed(1)} weeks` : 'some'
    note = `${fmtMoney(p.emergency_fund)} set aside, covering about ${weeksStr} of expenses. This category is capped at 5 points intentionally.`
  }

  return { key: 'emergency_savings', label: 'Emergency Savings', points, max: 5, note }
}

// 4. DEBT MANAGEMENT — 15 pts
function debtManagementScore(p: Profile): ScoreCategory {
  let points = 0

  // Credit card utilization: up to 6 pts
  const util = p.credit_utilization ?? ''
  if (util === 'no_card' || util === '') {
    // No card = 6 (zero utilization risk)
    points += 6
  } else if (util === 'under_10') points += 6
  else if (util === '10_30') points += 4
  else if (util === '30_50') points += 2
  // over_50 = 0

  // High-interest debt (APR > 20): none = 5, some = 2
  const highInterestDebt = p.debt_breakdown.filter((d) => d.rate > 20)
  if (highInterestDebt.length === 0) points += 5
  else points += 2

  // Student loan awareness: up to 4 pts
  const studentLoans = p.debt_breakdown.filter((d) => d.type.toLowerCase().includes('student'))
  if (studentLoans.length === 0) {
    // No student loans = full 4 pts
    points += 4
  } else {
    const knowsBalance = studentLoans.some((d) => d.balance > 0)
    const knowsRate = studentLoans.some((d) => d.rate > 0)
    if (knowsBalance) points += 2
    if (knowsRate) points += 2
  }

  const highInterestNames = highInterestDebt.map((d) => d.type).join(', ')
  let note: string
  if (highInterestDebt.length > 0) {
    note = `High-interest debt (${highInterestNames}) at over 20% APR is costing you. Paying it down is the highest-return move.`
  } else if (util === 'over_50') {
    note = `Credit utilization over 50% is hurting your credit score. Paying down the balance improves it quickly.`
  } else if (util === '30_50') {
    note = `Credit utilization is in the 30 to 50% range. Keeping it under 30% adds points and improves your score.`
  } else {
    note = `Debt profile looks manageable. No high-interest debt and utilization is under control.`
  }

  return { key: 'debt_management', label: 'Debt Management', points, max: 15, note }
}

// 5. GOAL TRACKING — 15 pts
function goalTrackingScore(p: Profile): ScoreCategory {
  let points = 0
  const goals = p.goals

  // Has at least one goal: 4 pts
  if (goals.length >= 1) points += 4

  // Goal is specific with deadline (amount > 0 and by date set): 4 pts
  const specificGoal = goals.find((g) => g.amount > 0 && g.by)
  if (specificGoal) points += 4

  // Made measurable progress (any goal with saved > 0): 4 pts
  if (goals.some((g) => g.saved > 0)) points += 4

  // More than one active goal: 3 pts
  if (goals.length > 1) points += 3

  let note: string
  if (goals.length === 0) {
    note = 'No goals set yet. Even one goal with an amount and a date is worth 8 points here.'
  } else if (goals.length === 1) {
    const g = goals[0]
    const isCreditGoal = (g.type ?? 'savings') === 'credit'
    const progressNote = g.saved > 0
      ? isCreditGoal
        ? `, currently at ${g.saved} points`
        : `, with ${fmtMoney(g.saved)} saved so far`
      : ''
    note = `"${g.name}" is your current goal${progressNote}. Adding a second goal earns 3 more points.`
  } else {
    const progress = goals.filter((g) => g.saved > 0).length
    note = `${goals.length} goals active${progress > 0 ? `, ${progress} with money already saved toward them` : ''}. Good momentum.`
  }

  return { key: 'goal_tracking', label: 'Goal Tracking', points, max: 15, note }
}

// 6. FINANCIAL AWARENESS — 10 pts
function financialAwarenessScore(p: Profile): ScoreCategory {
  let points = 0

  // Knows credit score within 20 points: 3 pts
  if (p.knows_credit_score) points += 3

  // Knows student loan servicer and repayment start date: 3 pts
  if (p.knows_loan_terms) points += 3

  // Knows APR on every card: 2 pts
  if (p.knows_card_apr) points += 2

  // Engaged with finance resource in last 3 months (quiz performance): up to 2 pts
  const quizTaken = Object.keys(p.quiz_answers ?? {}).length > 0
  const { correct } = knowledgeLevel(p)
  if (quizTaken) points += correct >= 4 ? 2 : 1

  let note: string
  if (points >= 8) {
    note = `Strong financial awareness. You know your numbers${quizTaken ? `. Knowledge check: ${correct}/5 correct.` : ''}`
  } else if (points >= 5) {
    note = `Good baseline awareness${!p.knows_credit_score ? '. Checking your credit score (free via Credit Karma) adds 3 points' : ''}${quizTaken ? `. Knowledge check: ${correct}/5 correct.` : ''}`
  } else {
    note = `Knowing your credit score, loan terms, and card APRs each adds points here. Check your credit for free at Credit Karma.${quizTaken ? ` Knowledge check: ${correct}/5 correct.` : ''}`
  }

  return { key: 'financial_awareness', label: 'Financial Awareness', points, max: 10, note }
}

// 7. CREDIT BUILDING — 10 pts
function creditBuildingScore(p: Profile): ScoreCategory {
  let points = 0

  // Has at least one open credit account in good standing: 3 pts
  if (p.has_credit_card && p.payment_history !== 'three_plus') points += 3

  // Oldest account is 6 months or more: 2 pts
  if (p.oldest_account_6mo) points += 2

  // Credit utilization consistently below 30%: 3 pts
  // (utilization under_10 or 10_30; no card = 0 here)
  const util = p.credit_utilization ?? ''
  if (util === 'under_10' || util === '10_30') points += 3

  // No hard inquiries in the last 6 months: 2 pts
  if (p.no_new_credit_6mo !== false) points += 2

  let note: string
  if (!p.has_credit_card) {
    note = `No credit card on file. A student secured card used for one small bill, paid in full monthly, builds credit steadily.`
  } else if (util === 'over_50' || util === '30_50') {
    note = `Card utilization is high. Paying down the balance to under 30% of your limit adds 3 points and lifts your credit score.`
  } else {
    note = `${p.oldest_account_6mo ? 'Account history is building' : 'Keep your oldest account open'}. Consistent low utilization is the key driver here.`
  }

  return { key: 'credit_building', label: 'Credit Building', points, max: 10, note }
}

const priorityActions: Record<string, (p: Profile) => string> = {
  payment_behavior: (p) => {
    if (!p.has_autopay) {
      return 'Set up autopay today, even just for the minimum on one bill. It takes 5 minutes and eliminates the most common credit mistake.'
    }
    const ph = p.payment_history ?? ''
    if (ph === 'three_plus' || ph === 'two_misses') {
      return 'Focus on catching up any overdue payments first, then set autopay so this cannot happen again.'
    }
    return 'Expand autopay to cover all recurring bills and keep that payment record clean.'
  },
  spending_control: (p) => {
    const income = p.monthly_income
    const totalSpend = totalExpenses(p.monthly_expenses) + totalCustomExpenses(p)
    if (income > 0 && totalSpend > income) {
      return `You're spending ${fmtMoney(totalSpend - income)} more than you earn. Find one subscription or going-out line to cut this week.`
    }
    const disc = p.monthly_expenses.subscriptions + p.monthly_expenses.going_out + p.monthly_expenses.other + totalCustomExpenses(p)
    if (income > 0 && disc / income > 0.40) {
      return `Discretionary spending is over 40% of income. Trimming ${fmtMoney(Math.round((disc - income * 0.30) / 10) * 10)}/month in subscriptions or going-out gets you to the 30% target.`
    }
    return 'Track every expense for one month using the Budget page to find the biggest leak.'
  },
  emergency_savings: (p) => {
    const totalExp = totalExpenses(p.monthly_expenses) + totalCustomExpenses(p)
    const target = totalExp > 0 ? totalExp : 500
    const gap = Math.max(target - p.emergency_fund, 0)
    const weekly = Math.max(Math.ceil(gap / 12 / 5) * 5, 10)
    return `Auto-save ${fmtMoney(weekly)}/week to a separate savings account. Even a small fund means a surprise expense does not become credit card debt.`
  },
  debt_management: (p) => {
    const highInterest = [...p.debt_breakdown].filter((d) => d.rate > 20).sort((a, b) => b.rate - a.rate)
    if (highInterest.length > 0) {
      return `Your ${highInterest[0].type} at ${highInterest[0].rate}% APR is your most expensive money. Pay more than the minimum every month and check the Debt Planner for a payoff timeline.`
    }
    const util = p.credit_utilization ?? ''
    if (util === 'over_50' || util === '30_50') {
      return 'Paying down your credit card balance is the fastest way to improve your score. Target getting under 30% of your limit.'
    }
    return 'Your debt load is manageable. Use the Debt Planner to map out a payoff order and see the exact payoff date.'
  },
  goal_tracking: () =>
    'Set one goal with a specific dollar amount and a target date. "$800 for spring break by March" is concrete enough to save toward.',
  financial_awareness: (p) => {
    if (!p.knows_credit_score) {
      return 'Check your credit score for free on Credit Karma or through your bank app. Knowing your number is the first step to improving it.'
    }
    if (!p.knows_loan_terms) {
      return 'Log into studentaid.gov to find your loan servicer and repayment start date. It takes 5 minutes and earns you 3 points here.'
    }
    return 'Take the in-app knowledge check to lock in the financial awareness points and find any gaps.'
  },
  credit_building: (p) => {
    if (!p.has_credit_card) {
      return 'Look into a student secured card. Put one small recurring bill on it, pay in full monthly, and your credit score will grow steadily over 6 to 12 months.'
    }
    const util = p.credit_utilization ?? ''
    if (util === 'over_50' || util === '30_50') {
      return 'Bring your credit card balance below 30% of your limit. That single move can lift your score by 20 to 40 points.'
    }
    return 'Keep your oldest card open and active, even for small purchases. Account age is one of the key credit score inputs.'
  },
}

export function calculateScore(p: Profile): ScoreResult {
  const categories = [
    paymentBehaviorScore(p),
    spendingControlScore(p),
    emergencySavingsScore(p),
    debtManagementScore(p),
    goalTrackingScore(p),
    financialAwarenessScore(p),
    creditBuildingScore(p),
  ]
  const total = Math.min(categories.reduce((sum, c) => sum + c.points, 0), 100)
  const lowest = [...categories].sort((a, b) => a.points / a.max - b.points / b.max)[0]
  return { total, categories, lowest, priorityAction: priorityActions[lowest.key]?.(p) ?? '' }
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 55) return 'Fair'
  if (score >= 35) return 'Needs Work'
  return 'Poor'
}

export function scoreDescription(score: number): string {
  if (score >= 90) return 'Ahead of 95 percent of students your age'
  if (score >= 75) return 'Solid habits with a few gaps to close'
  if (score >= 55) return 'Right direction but real risks present'
  if (score >= 35) return 'One emergency away from a debt problem'
  return 'Core habits missing. Start with payments and savings.'
}

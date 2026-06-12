import type { Profile, ScoreCategory, ScoreResult } from '../types'
import { totalExpenses, essentialExpenses, totalDebt, monthlySurplus, fmtMoney } from '../types'

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

function expenseRatioScore(p: Profile): ScoreCategory {
  const income = p.monthly_income
  const expenses = totalExpenses(p.monthly_expenses)
  const ratio = income > 0 ? expenses / income : Infinity
  let points: number
  let note: string
  if (ratio < 0.8) {
    points = 20
    note = `You spend ${Math.round(ratio * 100)}% of your income, healthy breathing room.`
  } else if (ratio <= 0.9) {
    points = 12
    note = `Expenses are ${Math.round(ratio * 100)}% of income, a little tight.`
  } else if (ratio <= 1.0) {
    points = 6
    note = `Expenses are ${Math.round(ratio * 100)}% of income, nearly every dollar is spoken for.`
  } else {
    points = 0
    note = income > 0
      ? `You're spending more than you bring in each month.`
      : `No income on file yet, everything out is unfunded.`
  }
  return { key: 'expense_ratio', label: 'Expense-to-Income Ratio', points, max: 20, note }
}

function emergencyFundScore(p: Profile): ScoreCategory {
  const essentials = essentialExpenses(p.monthly_expenses)
  const months = essentials > 0 ? p.emergency_fund / essentials : p.emergency_fund > 0 ? 3 : 0
  let points: number
  let note: string
  if (p.emergency_fund <= 0) {
    points = 0
    note = 'No emergency cushion yet, one surprise expense lands on a card or a loan.'
  } else if (months >= 3) {
    points = 20
    note = `${months.toFixed(1)} months of essentials covered, excellent for a student.`
  } else if (months >= 1) {
    points = 12
    note = `${months.toFixed(1)} months of essentials covered, solid buffer.`
  } else {
    points = 5
    note = `${fmtMoney(p.emergency_fund)} saved, less than a month of essentials (${fmtMoney(essentials)}).`
  }
  return { key: 'emergency_fund', label: 'Emergency Fund', points, max: 20, note }
}

function debtLoadScore(p: Profile): ScoreCategory {
  const debt = totalDebt(p)
  const annualIncome = p.monthly_income * 12
  let points: number
  let note: string
  if (debt === 0) {
    points = 20
    note = 'Debt-free, every dollar you earn is yours.'
  } else if (annualIncome > 0 && debt < annualIncome) {
    points = 14
    note = `${fmtMoney(debt)} in debt, under one year of income, manageable.`
  } else if (annualIncome > 0 && debt < annualIncome * 2) {
    points = 8
    note = `${fmtMoney(debt)} in debt, between 1-2x your annual income.`
  } else {
    points = 3
    note = `${fmtMoney(debt)} in debt, heavy relative to current income.`
  }
  return { key: 'debt_load', label: 'Debt Load', points, max: 20, note }
}

function savingsHabitScore(p: Profile): ScoreCategory {
  const income = p.monthly_income
  const surplus = monthlySurplus(p)
  const rate = income > 0 ? surplus / income : 0
  let points: number
  let note: string
  if (rate > 0.1) {
    points = 15
    note = `About ${Math.round(rate * 100)}% of income is left over each month to save.`
  } else if (rate >= 0.05) {
    points = 10
    note = `Roughly ${Math.round(rate * 100)}% of income free to save, decent start.`
  } else if (rate > 0) {
    points = 5
    note = `Under 5% of income left to save each month.`
  } else {
    points = 0
    note = 'Nothing left over to save right now.'
  }
  return { key: 'savings_habit', label: 'Savings Habit', points, max: 15, note }
}

function goalsScore(p: Profile): ScoreCategory {
  const count = p.goals.length
  let points: number
  let note: string
  if (count >= 2) {
    points = 10
    note = `${count} goals defined, money with a job to do.`
  } else if (count === 1) {
    points = 6
    note = `1 goal set ("${p.goals[0].name}"), consider a second.`
  } else {
    points = 0
    note = 'No goals set yet, even one makes saving concrete.'
  }
  return { key: 'goals', label: 'Has Goals Set', points, max: 10, note }
}

function creditScore(p: Profile): ScoreCategory {
  const points = p.has_credit_card ? 10 : 5
  const note = p.has_credit_card
    ? 'You have a credit card. Used responsibly, it builds your score.'
    : 'No credit card yet, building credit early pays off after graduation.'
  return { key: 'credit', label: 'Credit Awareness', points, max: 10, note }
}

function knowledgeScore(p: Profile): ScoreCategory {
  const answers = p.quiz_answers ?? {}
  const correct = knowledgeQuiz.filter((q) => {
    const answered = answers[q.id]
    return answered !== undefined && Number(answered) === q.correct
  }).length
  const points = correct
  const total = knowledgeQuiz.length
  const note = Object.keys(answers).length === 0
    ? 'Knowledge quiz not taken yet.'
    : `${correct} of ${total} correct. ${correct === total ? 'Perfect score.' : correct >= 3 ? 'Solid financial literacy.' : 'Worth reviewing the sections below.'}`
  return { key: 'knowledge', label: 'Financial Knowledge', points, max: total, note }
}

const priorityActions: Record<string, (p: Profile) => string> = {
  expense_ratio: (p) => {
    const over = totalExpenses(p.monthly_expenses) - p.monthly_income * 0.8
    return `Your biggest lever is spending. Trimming about ${fmtMoney(Math.max(over, 25))}/month gets you under the 80% expense-to-income line.`
  },
  emergency_fund: (p) => {
    const target = p.emergency_fund <= 0 && p.savings <= 0 ? 500 : essentialExpenses(p.monthly_expenses)
    const gap = Math.max(target - p.emergency_fund, 0)
    const weekly = Math.max(Math.ceil(gap / 12 / 5) * 5, 10)
    return `Start your emergency cushion: ${fmtMoney(weekly)}/week auto-saved gets you to ${fmtMoney(target)} in about 12 weeks.`
  },
  debt_load: (p) => {
    const highest = [...p.debt_breakdown].sort((a, b) => b.rate - a.rate)[0]
    return highest
      ? `Attack your ${highest.type} first. At ${highest.rate}% APR it is your most expensive debt. Check the Debt Planner for a payoff plan.`
      : 'Open the Debt Planner to map out a payoff strategy.'
  },
  savings_habit: () =>
    'Find one recurring expense to cut and auto-transfer that amount to savings on payday, even $20/month builds the habit.',
  goals: () =>
    'Set one concrete goal with a number and a date (e.g. "$800 spring break trip by March"). It turns saving from a chore into progress.',
  credit: () =>
    'Look into a student credit card or secured card, put one small recurring bill on it and pay it in full monthly.',
  knowledge: () =>
    'Review the Debt Planner and Discounts sections to brush up on the areas the quiz flagged.',
}

export function calculateScore(p: Profile): ScoreResult {
  const categories = [
    expenseRatioScore(p),
    emergencyFundScore(p),
    debtLoadScore(p),
    savingsHabitScore(p),
    goalsScore(p),
    creditScore(p),
    knowledgeScore(p),
  ]
  const total = Math.min(categories.reduce((sum, c) => sum + c.points, 0), 100)
  const lowest = [...categories].sort((a, b) => a.points / a.max - b.points / b.max)[0]
  return { total, categories, lowest, priorityAction: priorityActions[lowest.key]?.(p) ?? '' }
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Strong'
  if (score >= 50) return 'Getting There'
  if (score >= 35) return 'Needs Work'
  return 'Just Starting'
}

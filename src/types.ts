export interface DebtItem {
  id: string
  type: string
  balance: number
  rate: number
}

export interface Goal {
  id: string
  name: string
  amount: number
  saved: number
  by: string
}

export interface MonthlyExpenses {
  rent: number
  food: number
  transportation: number
  utilities: number
  subscriptions: number
  going_out: number
  other: number
}

export interface CustomExpense {
  id: string
  label: string
  amount: number
}

export type SchoolYear = 'freshman' | 'sophomore' | 'junior' | 'senior' | 'grad'

export interface Profile {
  monthly_income: number
  income_sources: string[]
  monthly_expenses: MonthlyExpenses
  debt_breakdown: DebtItem[]
  savings: number
  emergency_fund: number
  goals: Goal[]
  school_year: SchoolYear | ''
  has_fafsa: boolean
  has_credit_card: boolean
  has_retirement_account: boolean
  custom_expenses: CustomExpense[]
  hidden_expense_fields?: (keyof MonthlyExpenses)[]
  quiz_answers: Record<string, string>
}

export interface ScoreCategory {
  key: string
  label: string
  points: number
  max: number
  note: string
}

export interface ScoreResult {
  total: number
  categories: ScoreCategory[]
  lowest: ScoreCategory
  priorityAction: string
}

export interface ScoreSnapshot {
  date: string
  score: number
}

export interface ChatMessage {
  role: 'user' | 'coach'
  text: string
}

export function totalExpenses(e: MonthlyExpenses): number {
  return e.rent + e.food + e.transportation + e.utilities + e.subscriptions + e.going_out + e.other
}

export function totalCustomExpenses(p: Profile): number {
  return (p.custom_expenses ?? []).reduce((sum, c) => sum + c.amount, 0)
}

export function essentialExpenses(e: MonthlyExpenses): number {
  return e.rent + e.food + e.transportation + e.utilities
}

export function totalDebt(p: Profile): number {
  return p.debt_breakdown.reduce((sum, d) => sum + d.balance, 0)
}

export function monthlySurplus(p: Profile): number {
  return p.monthly_income - totalExpenses(p.monthly_expenses) - totalCustomExpenses(p)
}

export const emptyProfile: Profile = {
  monthly_income: 0,
  income_sources: [],
  monthly_expenses: { rent: 0, food: 0, transportation: 0, utilities: 0, subscriptions: 0, going_out: 0, other: 0 },
  debt_breakdown: [],
  savings: 0,
  emergency_fund: 0,
  goals: [],
  school_year: '',
  has_fafsa: false,
  has_credit_card: false,
  has_retirement_account: false,
  custom_expenses: [],
  quiz_answers: {},
}

export function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function fmtMoneyCents(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

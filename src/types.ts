export type AssetType = 'stock' | 'etf' | 'crypto'

export type CardRewardType = 'cashback' | 'flat-cashback' | 'dining' | 'travel' | 'builder'

export interface CustomCard {
  id: string
  name: string
  issuer?: string
  rewardType: CardRewardType
  tier: number // 1-4, parallels stage
}

export interface Holding {
  id: string
  symbol: string          // uppercase ticker, e.g. AAPL, VOO, BTC-USD
  name?: string           // display name resolved from the API
  assetType: AssetType
  shares: number
  buyPrice: number        // price per share/coin at purchase, USD
  purchaseDate: string    // YYYY-MM-DD
}

export interface DebtItem {
  id: string
  type: string
  balance: number
  rate: number
}

export interface Contribution {
  id: string
  amount: number
  date: string // ISO string; amount may be negative for a withdrawal/correction
}

export interface ScoreReading {
  id: string
  score: number
  date: string // ISO string
}

export interface Goal {
  id: string
  name: string
  amount: number
  saved: number
  by: string
  type?: 'savings' | 'debt' | 'credit' | 'income' | 'spending'
  behaviors_done?: string[]
  contributions?: Contribution[]   // money goals: incremental progress log
  score_log?: ScoreReading[]       // credit goals: history of logged credit-score readings
  start_score?: number             // credit goals: baseline score captured at creation
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
  owned_cards?: string[]           // names of specific credit cards the user already holds
  custom_cards?: CustomCard[]      // cards not in the catalog, with structured metadata
  has_retirement_account: boolean
  custom_expenses: CustomExpense[]
  hidden_expense_fields?: (keyof MonthlyExpenses)[]
  quiz_answers: Record<string, string>
  // Credit and habits fields (added for new score engine)
  payment_history?: 'perfect' | 'one_miss' | 'two_misses' | 'three_plus' | ''
  bills_on_time?: ('credit_card' | 'rent' | 'phone_utilities')[]
  has_autopay?: boolean
  credit_utilization?: 'no_card' | 'under_10' | '10_30' | '30_50' | 'over_50' | ''
  knows_credit_score?: boolean
  knows_loan_terms?: boolean
  knows_card_apr?: boolean
  oldest_account_6mo?: boolean
  no_new_credit_6mo?: boolean
  investments?: Holding[]
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
  owned_cards: [],
  custom_cards: [],
  has_retirement_account: false,
  custom_expenses: [],
  quiz_answers: {},
  payment_history: '',
  bills_on_time: [],
  has_autopay: false,
  credit_utilization: '',
  knows_credit_score: false,
  knows_loan_terms: false,
  knows_card_apr: false,
  oldest_account_6mo: false,
  no_new_credit_6mo: true,
  investments: [],
}

export function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function fmtMoneyCents(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

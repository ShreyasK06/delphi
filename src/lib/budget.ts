import type { Profile } from '../types'
import { totalCustomExpenses } from '../types'

export type BudgetStatus = 'on-track' | 'over' | 'under'

export interface BudgetRow {
  label: string
  actual: number
  target: number
  share: number
  status: BudgetStatus
}

export interface BudgetSummary {
  rows: BudgetRow[]
  customRows: BudgetRow[]
  needs: BudgetRow
  wants: BudgetRow
  savingsDebt: BudgetRow
  income: number
  totalSpent: number
  leftover: number
}

function status(actual: number, target: number, tolerance = 0.05): BudgetStatus {
  if (actual > target * (1 + tolerance)) return 'over'
  if (actual < target * (1 - tolerance)) return 'under'
  return 'on-track'
}

export function buildBudget(p: Profile): BudgetSummary {
  const income = p.monthly_income
  const e = p.monthly_expenses
  const hidden = new Set(p.hidden_expense_fields ?? [])
  const v = (key: keyof typeof e) => (hidden.has(key) ? 0 : e[key])
  const customTotal = totalCustomExpenses(p)
  const needsActual = v('rent') + v('food') + v('transportation') + v('utilities')
  const wantsActual = v('subscriptions') + v('going_out') + v('other') + customTotal
  const totalSpent = needsActual + wantsActual
  const leftover = income - totalSpent

  const needs: BudgetRow = {
    label: 'Needs (rent, food, transport)',
    actual: needsActual,
    target: income * 0.5,
    share: income > 0 ? needsActual / income : 0,
    status: income > 0 ? status(needsActual, income * 0.5) : 'over',
  }
  const wants: BudgetRow = {
    label: 'Wants (subscriptions, fun, other)',
    actual: wantsActual,
    target: income * 0.3,
    share: income > 0 ? wantsActual / income : 0,
    status: income > 0 ? status(wantsActual, income * 0.3) : 'over',
  }
  const savingsDebt: BudgetRow = {
    label: 'Savings + debt payments',
    actual: Math.max(leftover, 0),
    target: income * 0.2,
    share: income > 0 ? Math.max(leftover, 0) / income : 0,
    status: leftover >= income * 0.2 * 0.95 ? 'on-track' : 'under',
  }

  const allRows: { key: keyof typeof e; row: BudgetRow }[] = [
    { key: 'rent', row: { label: 'Rent / housing', actual: e.rent, target: income * 0.3, share: income > 0 ? e.rent / income : 0, status: income > 0 ? status(e.rent, income * 0.3, 0.1) : 'over' } },
    { key: 'food', row: { label: 'Food (meal plan + eating out)', actual: e.food, target: income * 0.13, share: income > 0 ? e.food / income : 0, status: income > 0 ? status(e.food, income * 0.13, 0.1) : 'over' } },
    { key: 'transportation', row: { label: 'Transportation', actual: e.transportation, target: income * 0.07, share: income > 0 ? e.transportation / income : 0, status: income > 0 ? status(e.transportation, income * 0.07, 0.15) : 'over' } },
    { key: 'utilities', row: { label: 'Utilities', actual: e.utilities, target: income * 0.05, share: income > 0 ? e.utilities / income : 0, status: income > 0 ? status(e.utilities, income * 0.05, 0.15) : 'over' } },
    { key: 'subscriptions', row: { label: 'Subscriptions', actual: e.subscriptions, target: income * 0.05, share: income > 0 ? e.subscriptions / income : 0, status: income > 0 ? status(e.subscriptions, income * 0.05, 0.15) : 'over' } },
    { key: 'going_out', row: { label: 'Going out', actual: e.going_out, target: income * 0.1, share: income > 0 ? e.going_out / income : 0, status: income > 0 ? status(e.going_out, income * 0.1, 0.15) : 'over' } },
    { key: 'other', row: { label: 'Other (textbooks, fees, trips)', actual: e.other, target: income * 0.1, share: income > 0 ? e.other / income : 0, status: income > 0 ? status(e.other, income * 0.1, 0.15) : 'over' } },
  ]
  const rows = allRows.filter(({ key }) => !hidden.has(key)).map(({ row }) => row)

  const customRows: BudgetRow[] = (p.custom_expenses ?? []).map((c) => ({
    label: c.label,
    actual: c.amount,
    target: 0,
    share: income > 0 ? c.amount / income : 0,
    status: 'on-track' as BudgetStatus,
  }))

  return { rows, customRows, needs, wants, savingsDebt, income, totalSpent, leftover }
}

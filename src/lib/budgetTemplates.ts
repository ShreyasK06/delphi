import type { CustomExpense, MonthlyExpenses } from '../types'

export interface BudgetTemplate {
  id: string
  name: string
  monthly_income: number
  monthly_expenses: MonthlyExpenses
  custom_expenses: CustomExpense[]
  createdAt: string // ISO datetime
}

const KEY = 'delphi_budget_templates_v1'

const emptyExpenses: MonthlyExpenses = {
  rent: 0,
  food: 0,
  transportation: 0,
  utilities: 0,
  subscriptions: 0,
  going_out: 0,
  other: 0,
}

function normalize(t: BudgetTemplate): BudgetTemplate {
  return {
    ...t,
    monthly_expenses: { ...emptyExpenses, ...t.monthly_expenses },
    custom_expenses: (t.custom_expenses ?? []).map((c) => ({
      id: c.id || crypto.randomUUID(),
      label: String(c.label),
      amount: Number(c.amount) || 0,
    })),
  }
}

export function loadTemplates(): BudgetTemplate[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as BudgetTemplate[]
    return Array.isArray(list) ? list.map(normalize) : []
  } catch {
    return []
  }
}

function persist(list: BudgetTemplate[]): void {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function saveTemplate(
  name: string,
  monthly_income: number,
  monthly_expenses: MonthlyExpenses,
  custom_expenses: CustomExpense[],
): BudgetTemplate {
  const t: BudgetTemplate = normalize({
    id: crypto.randomUUID(),
    name: name.trim(),
    monthly_income,
    monthly_expenses,
    custom_expenses,
    createdAt: new Date().toISOString(),
  })
  const list = loadTemplates()
  list.push(t)
  persist(list)
  return t
}

export function deleteTemplate(id: string): BudgetTemplate[] {
  const list = loadTemplates().filter((t) => t.id !== id)
  persist(list)
  return list
}

/** Compact share code so a template can be pasted to a friend. */
export function encodeTemplate(t: BudgetTemplate): string {
  const payload = {
    n: t.name,
    i: t.monthly_income,
    e: t.monthly_expenses,
    c: t.custom_expenses.map((x) => ({ l: x.label, a: x.amount })),
  }
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
}

export function decodeTemplate(code: string): BudgetTemplate | null {
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(code.trim()))))
    if (typeof payload.n !== 'string' || typeof payload.i !== 'number' || typeof payload.e !== 'object') {
      return null
    }
    return normalize({
      id: crypto.randomUUID(),
      name: payload.n,
      monthly_income: payload.i,
      monthly_expenses: payload.e,
      custom_expenses: Array.isArray(payload.c)
        ? payload.c.map((x: { l: string; a: number }) => ({
            id: crypto.randomUUID(),
            label: String(x.l),
            amount: Number(x.a) || 0,
          }))
        : [],
      createdAt: new Date().toISOString(),
    })
  } catch {
    return null
  }
}

export function importTemplate(code: string): BudgetTemplate | null {
  const t = decodeTemplate(code)
  if (!t) return null
  const list = loadTemplates()
  list.push(t)
  persist(list)
  return t
}

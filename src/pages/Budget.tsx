import { useEffect, useRef, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { buildBudget } from '../lib/budget'
import {
  loadTemplates,
  saveTemplate,
  deleteTemplate,
  encodeTemplate,
  importTemplate,
  type BudgetTemplate,
} from '../lib/budgetTemplates'
import { fmtMoney, totalExpenses, totalCustomExpenses } from '../types'
import type { CustomExpense, MonthlyExpenses, Profile } from '../types'
import BudgetTable from '../components/BudgetTable'
import PageNav from '../components/PageNav'

const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'breakdown', label: 'Category detail' },
  { id: 'templates', label: 'Templates' },
  { id: 'guide', label: 'Category guide' },
]

const EXPENSE_FIELDS: { key: keyof MonthlyExpenses; label: string; hint?: string }[] = [
  { key: 'rent', label: 'Rent / housing' },
  { key: 'food', label: 'Food', hint: 'meal plan + groceries' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'utilities', label: 'Utilities', hint: 'electric, wifi, phone' },
  { key: 'subscriptions', label: 'Subscriptions', hint: 'streaming, music, gym' },
  { key: 'going_out', label: 'Going out', hint: 'dining out, events, nights out' },
  { key: 'other', label: 'Everything else', hint: 'textbooks, fees, trips' },
]

const categories = [
  {
    name: 'Rent',
    description: 'Housing is usually the biggest line item. If it exceeds 30% of take-home pay, roommates or moving closer to campus are the levers to pull.',
  },
  {
    name: 'Food',
    description: 'Combines groceries and the meal plan. One home-cooked meal per day typically cuts this category by 30-40% compared to daily takeout.',
  },
  {
    name: 'Transportation',
    description: 'Commuting, rideshare, gas, insurance, parking. Check if your campus offers free or discounted transit passes through student fees.',
  },
  {
    name: 'Utilities',
    description: 'Electric, water, wifi, and your phone bill. Splitting with roommates and switching to a student phone plan are the quick wins here.',
  },
  {
    name: 'Subscriptions',
    description: 'The most underestimated category. List every recurring charge and cancel anything unused in 30 days. Use your .edu email for student pricing on everything.',
  },
  {
    name: 'Going out',
    description: 'Dining out, events, and nights out. Budgeting for fun on purpose beats pretending it will not happen and blowing the plan.',
  },
  {
    name: 'Other',
    description: 'Everything else: personal care, clothing, laundry, textbooks. Track this for one month and the number usually surprises people.',
  },
]

function expensesTotal(p: Profile): number {
  return totalExpenses(p.monthly_expenses) + totalCustomExpenses(p)
}

/** Slider + number input pair that stays in sync. */
function MoneySlider({
  label,
  hint,
  value,
  max,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  max: number
  onChange: (n: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="block text-sm text-ink-mid">
          {label}
          {hint && <span className="text-ink-faint"> ({hint})</span>}
        </label>
        <span className="text-xs text-ink-faint tabular-nums">{fmtMoney(value)}/mo</span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={max}
          step={10}
          value={Math.min(value, max)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-brand cursor-pointer"
          aria-label={`${label} slider`}
        />
        <div className="relative w-28 shrink-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">$</span>
          <input
            type="number"
            min={0}
            value={value || ''}
            placeholder="0"
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            className="w-full rounded-lg border border-line-strong bg-surface pl-7 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>
    </div>
  )
}

/** Stacked needs / wants / left-over bar so changes are visible instantly. */
function AllocationBar({ plan }: { plan: Profile }) {
  const budget = buildBudget(plan)
  const income = budget.income
  if (income <= 0) return null
  const needsPct = Math.min((budget.needs.actual / income) * 100, 100)
  const wantsPct = Math.min((budget.wants.actual / income) * 100, Math.max(100 - needsPct, 0))
  const leftPct = Math.max(100 - needsPct - wantsPct, 0)
  const over = budget.leftover < 0
  return (
    <div className="bg-surface rounded-2xl border border-line p-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Where each dollar goes</h2>
        <span className="text-xs text-ink-faint">targets: 50 / 30 / 20</span>
      </div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${needsPct}%` }} />
        <div className="h-full bg-info transition-all duration-300" style={{ width: `${wantsPct}%` }} />
        <div className={`h-full transition-all duration-300 ${over ? 'bg-bad' : 'bg-ok'}`} style={{ width: `${leftPct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-mid">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand" />
          Needs {Math.round(budget.needs.share * 100)}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-info" />
          Wants {Math.round(budget.wants.share * 100)}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${over ? 'bg-bad' : 'bg-ok'}`} />
          {over ? `Over by ${fmtMoney(-budget.leftover)}` : `Left over ${Math.round(Math.max(budget.leftover, 0) / income * 100)}%`}
        </span>
      </div>
    </div>
  )
}

export default function Budget() {
  const { state, update } = useProfile()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => state ? structuredClone(state.profile) : null)
  const [newCategory, setNewCategory] = useState('')
  const [newAmount, setNewAmount] = useState(0)

  // templates
  const [templates, setTemplates] = useState<BudgetTemplate[]>(() => loadTemplates())
  const [templateName, setTemplateName] = useState('')
  const [importCode, setImportCode] = useState('')
  const [importError, setImportError] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  if (!state || !draft) return null

  const activePlan = editing ? draft : state.profile
  const budget = buildBudget(activePlan)

  const flags = [
    ...(budget.needs.status === 'over'
      ? [`Needs are ${Math.round(budget.needs.share * 100)}% of income (target 50%). Housing and food are the biggest levers. Meal planning and roommates beat skipping coffee.`]
      : []),
    ...(budget.wants.status === 'over'
      ? [`Wants are running ${Math.round(budget.wants.share * 100)}% of income vs. a 30% target. Check the subscriptions and going out rows.`]
      : []),
    ...(budget.leftover < 0
      ? [`You're spending ${fmtMoney(-budget.leftover)} more than you bring in each month. That gap compounds fast.`]
      : []),
  ]

  const sliderMax = Math.max(draft.monthly_income, 2000)

  const setExpense = (key: keyof MonthlyExpenses, val: number) =>
    setDraft((d) => d ? { ...d, monthly_expenses: { ...d.monthly_expenses, [key]: val } } : d)

  const addCustom = () => {
    if (!newCategory.trim() || newAmount <= 0) return
    const item: CustomExpense = { id: crypto.randomUUID(), label: newCategory.trim(), amount: newAmount }
    setDraft((d) => d ? { ...d, custom_expenses: [...(d.custom_expenses ?? []), item] } : d)
    setNewCategory('')
    setNewAmount(0)
  }

  const removeCustom = (id: string) =>
    setDraft((d) => d ? { ...d, custom_expenses: (d.custom_expenses ?? []).filter((c) => c.id !== id) } : d)

  const saveChanges = () => {
    if (!draft) return
    update(draft)
    setEditing(false)
  }

  const cancelEdit = () => {
    setDraft(structuredClone(state.profile))
    setEditing(false)
  }

  const startBlank = () => {
    setDraft((d) => d ? {
      ...d,
      monthly_income: 0,
      monthly_expenses: { rent: 0, food: 0, transportation: 0, utilities: 0, subscriptions: 0, going_out: 0, other: 0 },
      custom_expenses: [],
      hidden_expense_fields: [],
    } : d)
    setEditing(true)
  }

  const hideField = (key: keyof typeof draft.monthly_expenses) =>
    setDraft((d) => d ? { ...d, hidden_expense_fields: [...(d.hidden_expense_fields ?? []).filter((k) => k !== key), key] } : d)

  const restoreField = (key: keyof typeof draft.monthly_expenses) =>
    setDraft((d) => d ? { ...d, hidden_expense_fields: (d.hidden_expense_fields ?? []).filter((k) => k !== key) } : d)

  // ── template actions ──
  const saveCurrentAsTemplate = () => {
    if (!templateName.trim()) return
    const source = editing ? draft : state.profile
    saveTemplate(templateName, source.monthly_income, source.monthly_expenses, source.custom_expenses ?? [])
    setTemplates(loadTemplates())
    setTemplateName('')
  }

  const applyTemplate = (t: BudgetTemplate) => {
    const next: Profile = {
      ...state.profile,
      monthly_income: t.monthly_income,
      monthly_expenses: { ...t.monthly_expenses },
      custom_expenses: t.custom_expenses.map((c) => ({ ...c, id: crypto.randomUUID() })),
    }
    update(next)
    setDraft(structuredClone(next))
    setEditing(false)
  }

  const removeTemplate = (id: string) => {
    setTemplates(deleteTemplate(id))
  }

  const shareTemplate = async (t: BudgetTemplate) => {
    const code = encodeTemplate(t)
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(t.id)
      window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedId(null), 1600)
    } catch {
      // clipboard unavailable: surface the code via prompt as a fallback
      window.prompt('Copy this template code:', code)
    }
  }

  const doImport = () => {
    if (!importCode.trim()) return
    const t = importTemplate(importCode)
    if (!t) {
      setImportError(true)
      return
    }
    setImportError(false)
    setImportCode('')
    setTemplates(loadTemplates())
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">PLAN</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Budget</h1>
          <p className="text-sm text-ink-faint max-w-2xl mt-1">
            The 50/30/20 framework adapted for college: needs, wants, savings and debt payoff.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(structuredClone(state.profile)); setEditing(true) }}
            className="shrink-0 rounded-xl border border-line-strong px-3 py-2 text-sm font-medium text-ink-mid hover:border-brand hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Edit numbers
          </button>
        )}
      </header>

      <PageNav sections={NAV_SECTIONS} />

      {/* Summary tiles */}
      <div id="overview" className="grid sm:grid-cols-3 gap-3 scroll-mt-6">
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold">Income</div>
          <div className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">
            {fmtMoney(budget.income)}<span className="text-sm font-normal text-ink-faint">/mo</span>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold">Spending</div>
          <div className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">
            {fmtMoney(budget.totalSpent)}<span className="text-sm font-normal text-ink-faint">/mo</span>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-line p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink-faint font-semibold">Left over</div>
          <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${budget.leftover >= 0 ? 'text-ok' : 'text-bad'}`}>
            {fmtMoney(budget.leftover)}<span className="text-sm font-normal text-ink-faint">/mo</span>
          </div>
        </div>
      </div>

      {/* Live allocation bar, updates as you drag sliders */}
      <AllocationBar plan={activePlan} />

      {/* Flags */}
      {!editing && flags.map((f) => (
        <div key={f} className="rounded-xl bg-bad-soft border border-bad-line px-4 py-3 text-sm text-bad-ink">
          {f}
        </div>
      ))}

      {/* Edit mode panel */}
      {editing && draft && (
        <div className="bg-surface rounded-2xl border border-brand-line p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Edit your budget</h2>
            <div className="flex gap-2">
              <button onClick={cancelEdit} className="text-sm text-ink-faint hover:text-ink px-3 py-1.5 rounded-lg border border-line hover:border-line-strong transition-colors">
                Cancel
              </button>
              <button onClick={saveChanges} className="text-sm font-semibold bg-brand text-on-brand px-4 py-1.5 rounded-lg hover:bg-brand-strong transition-colors">
                Save
              </button>
            </div>
          </div>

          {/* Income */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Monthly income</label>
            <div className="mt-1.5 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">$</span>
              <input
                type="number"
                min={0}
                value={draft.monthly_income || ''}
                placeholder="0"
                onChange={(e) => setDraft((d) => d ? { ...d, monthly_income: Number(e.target.value) || 0 } : d)}
                className="w-full rounded-xl border border-line-strong pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          {/* Expense sliders */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Monthly expenses</label>
            <p className="mt-0.5 text-xs text-ink-faint">Drag a slider or type a number. Hit remove to hide a category that does not apply to you.</p>
            <div className="mt-3 space-y-4">
              {EXPENSE_FIELDS.filter(({ key }) => !(draft.hidden_expense_fields ?? []).includes(key)).map(({ key, label, hint }) => (
                <div key={key} className="flex items-start gap-2">
                  <div className="flex-1">
                    <MoneySlider
                      label={label}
                      hint={hint}
                      value={draft.monthly_expenses[key]}
                      max={sliderMax}
                      onChange={(n) => setExpense(key, n)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => hideField(key)}
                    title={`Remove ${label}`}
                    aria-label={`Remove ${label}`}
                    className="mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-ink-faint hover:bg-bad-soft hover:text-bad transition-colors text-sm leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {(draft.hidden_expense_fields ?? []).length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-ink-faint mb-1.5">Hidden categories (not counted in your budget):</p>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_FIELDS.filter(({ key }) => (draft.hidden_expense_fields ?? []).includes(key)).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => restoreField(key)}
                      className="rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-xs text-ink-mid hover:border-brand hover:text-brand transition-colors"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom categories */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Custom categories</label>
            <p className="mt-0.5 text-xs text-ink-faint">Your budget, your rows. Add anything you track that the defaults miss.</p>
            {(draft.custom_expenses ?? []).length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {(draft.custom_expenses ?? []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2 text-sm">
                    <span className="text-ink">{c.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-ink">{fmtMoney(c.amount)}/mo</span>
                      <button onClick={() => removeCustom(c.id)} className="text-bad hover:text-bad-ink text-xs font-medium">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex gap-2 items-end">
              <div className="flex-1">
                <input
                  value={newCategory}
                  placeholder="Category name (e.g. Gym, Tutoring)"
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  value={newAmount || ''}
                  placeholder="0"
                  onChange={(e) => setNewAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-line-strong pl-7 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <button
                onClick={addCustom}
                className="rounded-lg bg-brand text-on-brand px-3 py-2 text-sm font-medium hover:bg-brand-strong"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget tables (read mode) */}
      {!editing && (
        <div id="breakdown" className="space-y-6 scroll-mt-6">
          <BudgetTable budget={budget} />
          <BudgetTable budget={budget} detailed />
        </div>
      )}

      {/* Live preview in edit mode */}
      {editing && (
        <div className="opacity-70">
          <BudgetTable budget={budget} />
        </div>
      )}

      {/* Templates */}
      <section id="templates" className="bg-surface rounded-2xl border border-line p-6 space-y-4 scroll-mt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Budget templates</h2>
            <p className="mt-1 text-xs text-ink-faint">
              Save versions of your budget (semester vs. summer, with or without a job) and switch
              between them anytime. Share codes let a friend import your setup.
            </p>
          </div>
          <button
            onClick={startBlank}
            className="shrink-0 rounded-xl border border-line-strong px-3 py-2 text-xs font-medium text-ink-mid hover:border-brand hover:text-brand transition-colors"
          >
            Start from blank
          </button>
        </div>

        {templates.length > 0 && (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{t.name}</p>
                  <p className="text-xs text-ink-faint">
                    {fmtMoney(t.monthly_income)}/mo income, {fmtMoney(totalExpenses(t.monthly_expenses) + t.custom_expenses.reduce((s, c) => s + c.amount, 0))}/mo spending
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => applyTemplate(t)}
                    className="rounded-lg bg-brand text-on-brand px-3 py-1.5 text-xs font-semibold hover:bg-brand-strong transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => shareTemplate(t)}
                    className="rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-ink-mid hover:border-brand hover:text-brand transition-colors"
                  >
                    {copiedId === t.id ? 'Copied' : 'Share'}
                  </button>
                  <button
                    onClick={() => removeTemplate(t.id)}
                    className="text-bad hover:text-bad-ink text-xs font-medium px-1"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-ink-faint mb-1">Save current numbers as a template</label>
            <input
              value={templateName}
              placeholder="Template name (e.g. Fall semester)"
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveCurrentAsTemplate()}
              className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            onClick={saveCurrentAsTemplate}
            disabled={!templateName.trim()}
            className="rounded-lg bg-brand text-on-brand px-3 py-2 text-sm font-medium hover:bg-brand-strong disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-ink-faint mb-1">Import a shared template code</label>
            <input
              value={importCode}
              placeholder="Paste a template code"
              onChange={(e) => { setImportCode(e.target.value); setImportError(false) }}
              onKeyDown={(e) => e.key === 'Enter' && doImport()}
              className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            onClick={doImport}
            disabled={!importCode.trim()}
            className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-ink-mid hover:border-brand hover:text-brand disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Import
          </button>
        </div>
        {importError && (
          <p className="text-xs text-bad-ink">That code did not parse as a template. Double-check you copied the whole thing.</p>
        )}
      </section>

      {/* Category guidance -- reference card with left accent border */}
      <div id="guide" className="bg-surface-2/50 rounded-2xl border-l-2 border-brand-line border border-line p-6 scroll-mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">What each category means</h2>
        <p className="text-xs text-ink-faint mb-4">College budgets rarely fit textbook ratios and that is fine.</p>
        <div className="space-y-4">
          {categories.map((c) => (
            <div key={c.name} className="flex gap-3">
              <div className="shrink-0 w-1 rounded-full bg-brand-line self-stretch" />
              <div>
                <p className="text-sm font-semibold text-ink">{c.name}</p>
                <p className="text-sm text-ink-mid leading-relaxed">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 50/30/20 rule -- reference callout */}
      <div className="rounded-xl bg-brand-soft border border-brand-line p-5">
        <h3 className="font-semibold text-sm text-brand-ink">The 50/30/20 rule for college</h3>
        <p className="mt-2 text-sm text-brand-ink leading-relaxed">
          50% to needs (rent, food, transportation, utilities), 30% to wants (going out,
          entertainment, subscriptions), 20% to savings and debt payoff. These are targets, not
          requirements. A student with high rent may run 60/20/20 and that is still healthy as long
          as the savings piece stays positive.
        </p>
      </div>

      <p className="text-xs text-ink-faint">
        Spending {fmtMoney(expensesTotal(activePlan))} of {fmtMoney(activePlan.monthly_income)} each
        month. Use "Edit numbers" to adjust, everything recalculates instantly.
      </p>
    </div>
  )
}

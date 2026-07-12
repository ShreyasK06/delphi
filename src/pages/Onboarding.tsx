import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DebtItem, Goal, Profile, SchoolYear, CustomCard } from '../types'
import { emptyProfile } from '../types'
import { calculateScore } from '../lib/score'
import { knowledgeQuiz } from '../lib/score'
import { useProfile } from '../hooks/useProfile'
import ScoreCard from '../components/ScoreCard'
import { creditCardStages, cardByName, REWARD_TYPE_LABELS } from '../lib/creditCards'
import type { CardRewardType } from '../lib/creditCards'

const INCOME_SOURCES = ['Part-time job', 'Financial aid disbursement', 'Parental support', 'Scholarship', 'Side hustle']
const SCHOOL_YEARS: SchoolYear[] = ['freshman', 'sophomore', 'junior', 'senior', 'grad']
const DEBT_TYPES = ['Student loan', 'Credit card', 'Car payment', 'Personal loan', 'Other']

// Steps: 0=Welcome 1=Income 2=Expenses 3=Debt 4=Savings 5=Payments 6=Credit 7=Goals 8=Quiz 9=Score
const TOTAL_DATA_STEPS = 8 // steps 1-8 have progress bar

// Compute a date ~6 months from today as YYYY-MM
function sixMonthsOut(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function Money({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  hint?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-mid">{label}</span>
      {hint && <span className="block text-xs text-ink-faint">{hint}</span>}
      <div className="mt-1 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm">$</span>
        <input
          type="number"
          min={0}
          value={value === 0 ? '' : value}
          placeholder={placeholder ?? '0'}
          onChange={(e) => onChange(Math.max(Number(e.target.value) || 0, 0))}
          className="w-full rounded-xl border border-line-strong pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
    </label>
  )
}

const stepTitles = [
  'Welcome',
  "What's coming in?",
  "What's going out?",
  'Any debt right now?',
  "What's saved up?",
  'Payments',
  'Credit and awareness',
  "What are you working toward?",
  'Quick knowledge check',
  'Your Financial Health Score',
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { state, update } = useProfile()

  // Determine if this is a returning user with existing quiz answers
  const hasExistingQuizAnswers =
    state != null &&
    state.profile.quiz_answers != null &&
    Object.keys(state.profile.quiz_answers).length >= knowledgeQuiz.length

  const [step, setStep] = useState(state ? 1 : 0)
  const [profile, setProfile] = useState<Profile>(() =>
    state ? structuredClone(state.profile) : { ...emptyProfile },
  )
  const [newDebt, setNewDebt] = useState<Omit<DebtItem, 'id'>>({ type: 'Student loan', balance: 0, rate: 5.5 })
  const [newGoal, setNewGoal] = useState<Omit<Goal, 'id' | 'saved'>>({ name: '', amount: 0, by: '' })
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizSelected, setQuizSelected] = useState<number | null>(null)
  const [quizRevealed, setQuizRevealed] = useState(false)
  // Whether the user has opted to retake the quiz (overrides skip logic)
  const [retakingQuiz, setRetakingQuiz] = useState(false)
  // Catalog picker state (step 6)
  const [catalogPickerValue, setCatalogPickerValue] = useState('')
  // Custom card form state (step 6)
  const [showCustomCardForm, setShowCustomCardForm] = useState(false)
  const [customCardName, setCustomCardName] = useState('')
  const [customCardRewardType, setCustomCardRewardType] = useState<CardRewardType>('cashback')
  const [customCardTier, setCustomCardTier] = useState<number>(1)

  const set = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }))
  const setExpense = (key: keyof Profile['monthly_expenses'], val: number) =>
    setProfile((p) => ({ ...p, monthly_expenses: { ...p.monthly_expenses, [key]: val } }))

  const addDebt = () => {
    if (newDebt.balance <= 0) return
    set({ debt_breakdown: [...profile.debt_breakdown, { ...newDebt, id: crypto.randomUUID() }] })
    setNewDebt({ type: 'Student loan', balance: 0, rate: 5.5 })
  }

  const addGoal = () => {
    if (!newGoal.name.trim() || newGoal.amount <= 0 || !newGoal.by) return
    set({ goals: [...profile.goals, { ...newGoal, id: crypto.randomUUID(), saved: 0 }] })
    setNewGoal({ name: '', amount: 0, by: '' })
  }

  const finish = (p: Profile = profile) => {
    update(p)
    navigate('/dashboard')
  }

  const skipOnboarding = () => {
    if (state) {
      navigate('/dashboard')
    } else {
      finish({ ...emptyProfile })
    }
  }

  const answerQuiz = (optionIndex: number) => {
    if (quizRevealed) return
    setQuizSelected(optionIndex)
    setQuizRevealed(true)
    const q = knowledgeQuiz[quizIndex]
    set({ quiz_answers: { ...profile.quiz_answers, [q.id]: String(optionIndex) } })
  }

  const nextQuizQuestion = () => {
    if (quizIndex < knowledgeQuiz.length - 1) {
      setQuizIndex(quizIndex + 1)
      setQuizSelected(null)
      setQuizRevealed(false)
    } else {
      setStep(9)
    }
  }

  // Called from step 7 "Next" button (Goals)
  const proceedFromGoals = () => {
    if (hasExistingQuizAnswers && !retakingQuiz) {
      // Skip quiz, go straight to score reveal
      setStep(9)
    } else {
      setStep(8)
    }
  }

  // Pre-fill goal form from a template chip
  const applyGoalTemplate = (name: string, amount: number) => {
    setNewGoal({ name, amount, by: sixMonthsOut() })
  }

  // Add a catalog card by name from the picker (step 6)
  const addCatalogCard = (name: string) => {
    if (!name) return
    const cur = profile.owned_cards ?? []
    const alreadyPresent = cur.some((c) => c.toLowerCase() === name.toLowerCase())
    if (!alreadyPresent) {
      set({ owned_cards: [...cur, name], has_credit_card: true })
    }
    setCatalogPickerValue('')
  }

  // Add a structured custom card (step 6)
  const addCustomCard = () => {
    const trimmed = customCardName.trim()
    if (!trimmed) return
    const newCard: CustomCard = {
      id: crypto.randomUUID(),
      name: trimmed,
      rewardType: customCardRewardType,
      tier: customCardTier,
    }
    const curCustom = profile.custom_cards ?? []
    set({ custom_cards: [...curCustom, newCard], has_credit_card: true })
    setCustomCardName('')
    setCustomCardRewardType('cashback')
    setCustomCardTier(1)
    setShowCustomCardForm(false)
  }

  // Remove a catalog card from owned_cards (step 6)
  const removeCatalogCard = (name: string) => {
    const next = (profile.owned_cards ?? []).filter((c) => c !== name)
    set({ owned_cards: next })
  }

  // Remove a custom card by id (step 6)
  const removeCustomCard = (id: string) => {
    const next = (profile.custom_cards ?? []).filter((c) => c.id !== id)
    set({ custom_cards: next })
  }

  // Credit card debt balance (for "Pay off my card" template)
  const cardDebtBalance = profile.debt_breakdown
    .filter((d) => d.type === 'Credit card')
    .reduce((s, d) => s + d.balance, 0)

  const score = step === 9 ? calculateScore(profile) : null
  const currentQuiz = knowledgeQuiz[quizIndex]

  const ownedCatalogCards = profile.owned_cards ?? []
  const ownedCustomCards = profile.custom_cards ?? []
  const hasNoCards = ownedCatalogCards.length === 0 && ownedCustomCards.length === 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#03201a] to-[#06302a] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2.5 justify-center text-white mb-6 animate-fade-up">
          <img src={`${import.meta.env.BASE_URL}logo-mark.png`} alt="" className="w-9 h-9 object-contain" />
          <span className="text-xl font-extrabold tracking-tight">delphi<span className="text-emerald-400">.</span></span>
        </div>

        {step > 0 && step < 9 && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-emerald-100/60">
              <span className="font-medium uppercase tracking-wide">Step {step} of {TOTAL_DATA_STEPS}</span>
              <span>{Math.round((step / TOTAL_DATA_STEPS) * 100)}% there</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_DATA_STEPS }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-150 ${i + 1 <= step ? 'bg-emerald-400' : 'bg-white/15'}`} />
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface rounded-2xl shadow-xl p-6 md:p-8">
          <h1 className="text-xl font-bold text-ink">{stepTitles[step]}</h1>

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div className="mt-3 space-y-4">
              <p className="text-sm text-ink-mid leading-relaxed">
                Hey, I'm your personal money coach, built for how college actually works: part-time
                jobs, aid disbursements, ramen weeks, and figuring this stuff out for the first time.
                A few quick questions and I'll give you a Financial Health Score with one concrete next move.
              </p>
              <p className="text-xs text-ink-faint bg-surface-2 rounded-lg p-3">
                Your numbers are saved securely to your account, so they're here when you come back. No bank connections, no judgment.
              </p>
              <button
                onClick={() => setStep(1)}
                className="w-full rounded-xl bg-brand text-on-brand py-3 text-sm font-semibold hover:bg-brand-strong transition-colors"
              >
                Let's do it
              </button>
              <button
                onClick={skipOnboarding}
                className="w-full rounded-xl border border-line-strong text-ink-faint py-2.5 text-sm hover:text-ink hover:border-brand transition-colors"
              >
                I'll do this later
              </button>
            </div>
          )}

          {/* ── Step 1: Income ── */}
          {step === 1 && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-ink-mid">
                What's coming in each month? Include your job, financial aid disbursements (divided monthly), or money from family.
              </p>
              <Money label="Total monthly income" value={profile.monthly_income} onChange={(n) => set({ monthly_income: n })} />
              <div>
                <span className="text-sm font-medium text-ink-mid">Where does it come from?</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {INCOME_SOURCES.map((src) => {
                    const on = profile.income_sources.includes(src)
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() =>
                          set({ income_sources: on ? profile.income_sources.filter((s) => s !== src) : [...profile.income_sources, src] })
                        }
                        className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${on ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                      >
                        {src}
                      </button>
                    )
                  })}
                </div>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-ink-mid">School year</span>
                <select
                  value={profile.school_year}
                  onChange={(e) => set({ school_year: e.target.value as SchoolYear })}
                  className="mt-1 w-full rounded-xl border border-line-strong px-3 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Select…</option>
                  {SCHOOL_YEARS.map((y) => (
                    <option key={y} value={y}>{y[0].toUpperCase() + y.slice(1)}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* ── Step 2: Expenses ── */}
          {step === 2 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-ink-mid">
                The basics going out each month: rent, food, getting around, and everything else that hits regularly.
              </p>
              <p className="text-xs text-ink-faint">Rough guesses are fine. You can fine-tune everything later on the Budget page.</p>
              <Money label="Rent / housing" value={profile.monthly_expenses.rent} onChange={(n) => setExpense('rent', n)} placeholder="e.g. 600" />
              <Money label="Food" hint="meal plan + groceries + eating out" value={profile.monthly_expenses.food} onChange={(n) => setExpense('food', n)} placeholder="e.g. 250" />
              <Money label="Transportation" value={profile.monthly_expenses.transportation} onChange={(n) => setExpense('transportation', n)} placeholder="e.g. 50" />
              <Money label="Utilities" hint="electric, wifi, phone" value={profile.monthly_expenses.utilities} onChange={(n) => setExpense('utilities', n)} placeholder="e.g. 40" />
              <Money label="Subscriptions" hint="streaming, music, gym" value={profile.monthly_expenses.subscriptions} onChange={(n) => setExpense('subscriptions', n)} placeholder="e.g. 25" />
              <Money label="Going out" hint="dining out, events, nights out" value={profile.monthly_expenses.going_out} onChange={(n) => setExpense('going_out', n)} placeholder="e.g. 100" />
              <Money label="Everything else" hint="textbooks, fees, Greek life, trips" value={profile.monthly_expenses.other} onChange={(n) => setExpense('other', n)} placeholder="e.g. 50" />
            </div>
          )}

          {/* ── Step 3: Debt ── */}
          {step === 3 && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-ink-mid">
                Any debt right now? Student loans, credit cards, car payments. A rough number is fine.
              </p>
              {profile.debt_breakdown.length > 0 && (
                <ul className="space-y-2">
                  {profile.debt_breakdown.map((d) => (
                    <li key={d.id} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2 text-sm">
                      <span>{d.type}, ${d.balance.toLocaleString()} @ {d.rate}%</span>
                      <button
                        type="button"
                        onClick={() => set({ debt_breakdown: profile.debt_breakdown.filter((x) => x.id !== d.id) })}
                        className="text-bad hover:text-bad-ink text-xs font-medium"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                <label className="block">
                  <span className="text-xs font-medium text-ink-faint">Type</span>
                  <select value={newDebt.type} onChange={(e) => setNewDebt({ ...newDebt, type: e.target.value })} className="mt-1 w-full rounded-lg border border-line-strong px-2 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand">
                    {DEBT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-faint">Balance</span>
                  <input type="number" min={0} value={newDebt.balance || ''} placeholder="0" onChange={(e) => setNewDebt({ ...newDebt, balance: Number(e.target.value) || 0 })} className="mt-1 w-full sm:w-28 rounded-lg border border-line-strong px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-faint">APR %</span>
                  <div>
                    <input type="number" min={0} step={0.1} value={newDebt.rate || ''} placeholder="5.5" onChange={(e) => setNewDebt({ ...newDebt, rate: Number(e.target.value) || 0 })} className="mt-1 w-full sm:w-20 rounded-lg border border-line-strong px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    <span className="block text-xs text-ink-faint mt-0.5">The interest rate on your statement. Credit cards are usually 18 to 28.</span>
                  </div>
                </label>
                <button type="button" onClick={addDebt} className="rounded-lg bg-brand text-on-brand px-3 py-2 text-sm font-medium hover:bg-brand-strong">
                  Add
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-mid">
                <input type="checkbox" checked={profile.has_credit_card} onChange={(e) => set({ has_credit_card: e.target.checked })} className="rounded" />
                I have a credit card (even if I pay it off every month)
              </label>
            </div>
          )}

          {/* ── Step 4: Savings ── */}
          {step === 4 && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-ink-mid">
                What do you have saved right now, checking, savings, anything liquid?
              </p>
              <Money label="Total savings" value={profile.savings} onChange={(n) => set({ savings: n })} />
              <Money label="Of that, set aside for emergencies" hint="Fine if this is $0, most students start there" value={profile.emergency_fund} onChange={(n) => set({ emergency_fund: n })} />
              <label className="flex items-center gap-2 text-sm text-ink-mid">
                <input type="checkbox" checked={profile.has_fafsa} onChange={(e) => set({ has_fafsa: e.target.checked })} className="rounded" />
                I've filed the FAFSA
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-mid">
                <input type="checkbox" checked={profile.has_retirement_account} onChange={(e) => set({ has_retirement_account: e.target.checked })} className="rounded" />
                I have a retirement account (Roth IRA, 401k)
              </label>
            </div>
          )}

          {/* ── Step 5: Payments ── */}
          {step === 5 && (
            <div className="mt-4 space-y-5">
              <p className="text-sm text-ink-mid">A few quick questions about your payment habits. No judgment, these just tune your score.</p>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Payments</p>
                <p className="text-sm text-ink-mid mb-2">In the last 6 months, how were your bill payments?</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'perfect', label: 'Perfect' },
                    { value: 'one_miss', label: 'Missed one' },
                    { value: 'two_misses', label: 'Missed two' },
                    { value: 'three_plus', label: 'Missed three or more' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set({ payment_history: value })}
                      className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${profile.payment_history === value ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="text-sm text-ink-mid mt-3 mb-2">Which do you pay on time every month? (select all that apply)</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'credit_card', label: 'Credit card' },
                    { value: 'rent', label: 'Rent' },
                    { value: 'phone_utilities', label: 'Phone and utilities' },
                  ] as const).map(({ value, label }) => {
                    const on = (profile.bills_on_time ?? []).includes(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          const cur = profile.bills_on_time ?? []
                          set({ bills_on_time: on ? cur.filter((x) => x !== value) : [...cur, value] })
                        }}
                        className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${on ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-ink-mid">Autopay set up for at least one bill?</span>
                  <div className="flex gap-2">
                    {([{ val: true, label: 'Yes' }, { val: false, label: 'No' }] as const).map(({ val, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set({ has_autopay: val })}
                        className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${profile.has_autopay === val ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: Credit and awareness ── */}
          {step === 6 && (
            <div className="mt-4 space-y-5">
              <p className="text-sm text-ink-mid">A few quick questions about your credit and financial awareness.</p>

              {/* CREDIT */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Credit</p>
                <p className="text-sm text-ink-mid mb-2">Roughly how much of your credit limit do you use?</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'no_card', label: 'No card' },
                    { value: 'under_10', label: 'Under 10%' },
                    { value: '10_30', label: '10 to 30%' },
                    { value: '30_50', label: '30 to 50%' },
                    { value: 'over_50', label: 'Over 50%' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set({ credit_utilization: value })}
                      className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${profile.credit_utilization === value ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Cards you already have */}
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-1">Cards you already have</p>
                  <p className="text-xs text-ink-faint mb-2">Add any cards you hold. We will tailor your roadmap to your next move.</p>

                  {/* Current owned chips */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ownedCatalogCards.map((cardName) => {
                      const spec = cardByName(cardName)
                      return (
                        <span
                          key={cardName}
                          className="inline-flex items-center gap-1 text-xs rounded-full px-3 py-1.5 border bg-brand-soft text-brand-ink border-brand-line"
                        >
                          {cardName}{spec ? ` · ${spec.issuer}` : ''}
                          <button
                            type="button"
                            aria-label={`Remove ${cardName}`}
                            onClick={() => removeCatalogCard(cardName)}
                            className="ml-0.5 hover:opacity-70 transition-opacity"
                          >
                            &times;
                          </button>
                        </span>
                      )
                    })}
                    {ownedCustomCards.map((card) => (
                      <span
                        key={card.id}
                        className="inline-flex items-center gap-1 text-xs rounded-full px-3 py-1.5 border bg-brand-soft text-brand-ink border-brand-line"
                      >
                        {card.name} · {REWARD_TYPE_LABELS[card.rewardType]}
                        <button
                          type="button"
                          aria-label={`Remove ${card.name}`}
                          onClick={() => removeCustomCard(card.id)}
                          className="ml-0.5 hover:opacity-70 transition-opacity"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    {/* "I do not have any yet" chip */}
                    <button
                      type="button"
                      onClick={() => set({ owned_cards: [], custom_cards: [] })}
                      className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${hasNoCards ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                    >
                      I do not have any yet
                    </button>
                  </div>

                  {/* Catalog picker */}
                  <select
                    value={catalogPickerValue}
                    onChange={(e) => { addCatalogCard(e.target.value) }}
                    className="w-full rounded-xl border border-line-strong px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Add a card from our list...</option>
                    {creditCardStages.map((stage) => (
                      <optgroup key={stage.id} label={`Stage ${stage.stageNumber}`}>
                        {stage.cards.map((card) => (
                          <option key={card.name} value={card.name}>
                            {card.name} — {card.issuer}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {/* "My card isn't listed" toggle */}
                  <button
                    type="button"
                    onClick={() => setShowCustomCardForm((v) => !v)}
                    className="mt-2 text-xs text-brand hover:text-brand-strong underline transition-colors"
                  >
                    {showCustomCardForm ? 'Cancel' : 'My card is not listed'}
                  </button>

                  {/* Structured custom card form */}
                  {showCustomCardForm && (
                    <div className="mt-3 space-y-2 bg-surface-2 rounded-xl border border-line p-3">
                      <input
                        type="text"
                        value={customCardName}
                        placeholder="Card name"
                        onChange={(e) => setCustomCardName(e.target.value)}
                        className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <select
                        value={customCardRewardType}
                        onChange={(e) => setCustomCardRewardType(e.target.value as CardRewardType)}
                        className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        {(Object.entries(REWARD_TYPE_LABELS) as [CardRewardType, string][]).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <select
                        value={customCardTier}
                        onChange={(e) => setCustomCardTier(Number(e.target.value))}
                        className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value={1}>Starter / first card</option>
                        <option value={2}>Building credit / rewards</option>
                        <option value={3}>Established rewards</option>
                        <option value={4}>Premium / travel</option>
                      </select>
                      <button
                        type="button"
                        onClick={addCustomCard}
                        disabled={!customCardName.trim()}
                        className="w-full rounded-lg bg-brand text-on-brand px-3 py-2 text-sm font-medium hover:bg-brand-strong disabled:opacity-40 transition-colors"
                      >
                        Add card
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-ink-mid">Oldest credit account at least 6 months old?</span>
                  <div className="flex gap-2">
                    {([{ val: true, label: 'Yes' }, { val: false, label: 'No' }] as const).map(({ val, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set({ oldest_account_6mo: val })}
                        className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${profile.oldest_account_6mo === val ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-ink-mid">Applied for new credit in the last 6 months?</span>
                  <div className="flex gap-2">
                    {([{ applied: true, label: 'Yes' }, { applied: false, label: 'No' }] as const).map(({ applied, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set({ no_new_credit_6mo: !applied })}
                        className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${profile.no_new_credit_6mo === !applied ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AWARENESS */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Awareness</p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-mid">Know your credit score within about 20 points?</span>
                  <div className="flex gap-2">
                    {([{ val: true, label: 'Yes' }, { val: false, label: 'No' }] as const).map(({ val, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set({ knows_credit_score: val })}
                        className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${profile.knows_credit_score === val ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-ink-mid">Know your loan servicer and when repayment starts?</span>
                  <div className="flex gap-2">
                    {([{ val: true, label: 'Yes' }, { val: false, label: 'No' }, { val: true, label: 'No loans' }] as {val: boolean, label: string}[]).map(({ val, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set({ knows_loan_terms: val })}
                        className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                          label === 'No loans' && profile.knows_loan_terms === true && profile.debt_breakdown.filter((d) => d.type.toLowerCase().includes('student')).length === 0
                            ? 'bg-brand text-on-brand border-brand'
                            : label !== 'No loans' && profile.knows_loan_terms === val
                            ? 'bg-brand text-on-brand border-brand'
                            : 'border-line-strong text-ink-mid hover:border-brand'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-ink-mid">Know the APR on every card you carry?</span>
                  <div className="flex gap-2">
                    {([{ val: true, label: 'Yes' }, { val: false, label: 'No' }, { val: true, label: 'No cards' }] as {val: boolean, label: string}[]).map(({ val, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set({ knows_card_apr: val })}
                        className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${profile.knows_card_apr === val ? 'bg-brand text-on-brand border-brand' : 'border-line-strong text-ink-mid hover:border-brand'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 7: Goals ── */}
          {step === 7 && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-ink-mid">
                What are you actually trying to do with money in the next 6-12 months? Give it a name, a number, and a date.
              </p>
              {/* Goal template chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyGoalTemplate('Emergency fund', 500)}
                  className="text-xs rounded-full px-3 py-1.5 border border-line-strong text-ink-mid hover:border-brand transition-colors"
                >
                  Emergency fund · $500
                </button>
                <button
                  type="button"
                  onClick={() => applyGoalTemplate('Spring break', 800)}
                  className="text-xs rounded-full px-3 py-1.5 border border-line-strong text-ink-mid hover:border-brand transition-colors"
                >
                  Spring break · $800
                </button>
                <button
                  type="button"
                  onClick={() => applyGoalTemplate('Pay off my card', cardDebtBalance > 0 ? cardDebtBalance : 500)}
                  className="text-xs rounded-full px-3 py-1.5 border border-line-strong text-ink-mid hover:border-brand transition-colors"
                >
                  Pay off my card
                </button>
              </div>
              {profile.goals.length > 0 && (
                <ul className="space-y-2">
                  {profile.goals.map((g) => (
                    <li key={g.id} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2 text-sm">
                      <span>{g.name}, {(g.type ?? 'savings') === 'credit' ? `${g.amount} score` : `$${g.amount.toLocaleString()}`} by {g.by}</span>
                      <button type="button" onClick={() => set({ goals: profile.goals.filter((x) => x.id !== g.id) })} className="text-bad hover:text-bad-ink text-xs font-medium">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                <label className="block">
                  <span className="text-xs font-medium text-ink-faint">Goal</span>
                  <input value={newGoal.name} placeholder="Spring break trip" onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} className="mt-1 w-full rounded-lg border border-line-strong px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-faint">Amount</span>
                  <input type="number" min={0} value={newGoal.amount || ''} placeholder="800" onChange={(e) => setNewGoal({ ...newGoal, amount: Number(e.target.value) || 0 })} className="mt-1 w-full sm:w-24 rounded-lg border border-line-strong px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-faint">By</span>
                  <input type="month" value={newGoal.by} onChange={(e) => setNewGoal({ ...newGoal, by: e.target.value })} className="mt-1 w-full sm:w-36 rounded-lg border border-line-strong px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </label>
                <button type="button" onClick={addGoal} className="rounded-lg bg-brand text-on-brand px-3 py-2 text-sm font-medium hover:bg-brand-strong">Add</button>
              </div>
            </div>
          )}

          {/* ── Step 8: Knowledge Quiz ── */}
          {step === 8 && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-ink-faint">Not a test. This just helps your coach pitch advice at the right level.</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-faint font-medium uppercase tracking-wide">{currentQuiz.topic}</span>
                <span className="text-xs text-ink-faint">{quizIndex + 1} / {knowledgeQuiz.length}</span>
              </div>
              <p className="text-sm font-medium text-ink leading-relaxed">{currentQuiz.question}</p>
              <div className="space-y-2">
                {currentQuiz.options.map((opt, i) => {
                  let cls = 'w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors '
                  if (!quizRevealed) {
                    cls += quizSelected === i
                      ? 'border-brand bg-brand-soft text-brand-ink'
                      : 'border-line-strong text-ink-mid hover:border-brand hover:bg-brand-soft/50'
                  } else if (i === currentQuiz.correct) {
                    cls += 'border-ok bg-ok-soft text-ok-ink font-medium'
                  } else if (i === quizSelected && i !== currentQuiz.correct) {
                    cls += 'border-bad bg-bad-soft text-bad-ink'
                  } else {
                    cls += 'border-line text-ink-faint'
                  }
                  return (
                    <button key={i} type="button" className={cls} onClick={() => answerQuiz(i)}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {quizRevealed && (
                <div className="mt-2">
                  <div className={`rounded-lg px-4 py-2.5 text-sm ${quizSelected === currentQuiz.correct ? 'bg-ok-soft text-ok-ink' : 'bg-bad-soft text-bad-ink'}`}>
                    {quizSelected === currentQuiz.correct ? 'Correct.' : `Not quite, the answer is: ${currentQuiz.options[currentQuiz.correct]}.`}
                  </div>
                  <button
                    onClick={nextQuizQuestion}
                    className="mt-3 w-full rounded-xl bg-brand text-on-brand py-2.5 text-sm font-semibold hover:bg-brand-strong transition-colors"
                  >
                    {quizIndex < knowledgeQuiz.length - 1 ? 'Next question →' : 'See my score →'}
                  </button>
                </div>
              )}
              {!quizRevealed && (
                <p className="text-xs text-ink-faint text-center">Select an answer to continue</p>
              )}
            </div>
          )}

          {/* ── Step 9: Score ── */}
          {step === 9 && score && (
            <div className="mt-4 space-y-4">
              <ScoreCard result={score} />
              <p className="text-xs text-ink-faint text-center">
                Most students start between 25 and 45. The score moves fast once you make your first move.
              </p>
              <button onClick={() => finish()} className="w-full rounded-xl bg-brand text-on-brand py-3 text-sm font-semibold hover:bg-brand-strong transition-colors">
                Take me to my dashboard →
              </button>
            </div>
          )}

          {/* ── Back / Next navigation (steps 1-7) ── */}
          {step > 0 && step < 8 && (
            <div className="mt-6 flex justify-between items-center">
              <button type="button" onClick={() => setStep(step - 1)} className="text-sm text-ink-faint hover:text-ink px-3 py-2">
                ← Back
              </button>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={step === 7 ? proceedFromGoals : () => setStep(step + 1)}
                  disabled={step === 1 && profile.monthly_income <= 0}
                  className="rounded-xl bg-brand text-on-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-strong disabled:opacity-40 transition-colors"
                >
                  {step === 7
                    ? hasExistingQuizAnswers && !retakingQuiz
                      ? 'See my score →'
                      : 'Knowledge check →'
                    : 'Next →'}
                </button>
                {step === 7 && hasExistingQuizAnswers && !retakingQuiz && (
                  <button
                    type="button"
                    onClick={() => { setRetakingQuiz(true); setStep(8) }}
                    className="text-xs text-ink-faint hover:text-ink underline"
                  >
                    Retake the knowledge check
                  </button>
                )}
              </div>
            </div>
          )}
          {step === 8 && quizRevealed === false && (
            <div className="mt-4 flex">
              <button type="button" onClick={() => { if (quizIndex > 0) { setQuizIndex(quizIndex - 1); setQuizSelected(null); setQuizRevealed(false); } else { setStep(7); } }} className="text-sm text-ink-faint hover:text-ink px-3 py-2">
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

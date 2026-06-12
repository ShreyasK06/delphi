import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DebtItem, Goal, Profile, SchoolYear } from '../types'
import { emptyProfile } from '../types'
import { calculateScore } from '../lib/score'
import { knowledgeQuiz } from '../lib/score'
import { useProfile } from '../hooks/useProfile'
import ScoreCard from '../components/ScoreCard'

const INCOME_SOURCES = ['Part-time job', 'Financial aid disbursement', 'Parental support', 'Scholarship', 'Side hustle']
const SCHOOL_YEARS: SchoolYear[] = ['freshman', 'sophomore', 'junior', 'senior', 'grad']
const DEBT_TYPES = ['Student loan', 'Credit card', 'Car payment', 'Personal loan', 'Other']

// Steps: 0=Welcome 1=Income 2=Expenses 3=Debt 4=Savings 5=Goals 6=Quiz 7=Score
const TOTAL_DATA_STEPS = 6 // steps 1-6 have progress bar

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
      setStep(7)
    }
  }

  // Called from step 5 "Next" button
  const proceedFromGoals = () => {
    if (hasExistingQuizAnswers && !retakingQuiz) {
      // Skip quiz, go straight to score reveal
      setStep(7)
    } else {
      setStep(6)
    }
  }

  // Pre-fill goal form from a template chip
  const applyGoalTemplate = (name: string, amount: number) => {
    setNewGoal({ name, amount, by: sixMonthsOut() })
  }

  // Credit card debt balance (for "Pay off my card" template)
  const cardDebtBalance = profile.debt_breakdown
    .filter((d) => d.type === 'Credit card')
    .reduce((s, d) => s + d.balance, 0)

  const score = step === 7 ? calculateScore(profile) : null
  const currentQuiz = knowledgeQuiz[quizIndex]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#03201a] to-[#06302a] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2.5 justify-center text-white mb-6 animate-fade-up">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-black text-lg">
            d
          </div>
          <span className="text-xl font-extrabold tracking-tight">delphi<span className="text-emerald-400">.</span></span>
        </div>

        {step > 0 && step < 7 && (
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

          {/* ── Step 5: Goals ── */}
          {step === 5 && (
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
                      <span>{g.name}, ${g.amount.toLocaleString()} by {g.by}</span>
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

          {/* ── Step 6: Knowledge Quiz ── */}
          {step === 6 && (
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

          {/* ── Step 7: Score ── */}
          {step === 7 && score && (
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

          {/* ── Back / Next navigation (steps 1-5) ── */}
          {step > 0 && step < 6 && (
            <div className="mt-6 flex justify-between items-center">
              <button type="button" onClick={() => setStep(step - 1)} className="text-sm text-ink-faint hover:text-ink px-3 py-2">
                ← Back
              </button>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={step === 5 ? proceedFromGoals : () => setStep(step + 1)}
                  disabled={step === 1 && profile.monthly_income <= 0}
                  className="rounded-xl bg-brand text-on-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-strong disabled:opacity-40 transition-colors"
                >
                  {step === 5
                    ? hasExistingQuizAnswers && !retakingQuiz
                      ? 'See my score →'
                      : 'Knowledge check →'
                    : 'Next →'}
                </button>
                {step === 5 && hasExistingQuizAnswers && !retakingQuiz && (
                  <button
                    type="button"
                    onClick={() => { setRetakingQuiz(true); setStep(6) }}
                    className="text-xs text-ink-faint hover:text-ink underline"
                  >
                    Retake the knowledge check
                  </button>
                )}
              </div>
            </div>
          )}
          {step === 6 && quizRevealed === false && (
            <div className="mt-4 flex">
              <button type="button" onClick={() => { if (quizIndex > 0) { setQuizIndex(quizIndex - 1); setQuizSelected(null); setQuizRevealed(false); } else { setStep(5); } }} className="text-sm text-ink-faint hover:text-ink px-3 py-2">
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

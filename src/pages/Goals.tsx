import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { planGoal, milestoneMessage } from '../lib/goals'
import { monthlySurplus, fmtMoney, type Goal } from '../types'
import { TargetIcon, SparklesIcon, TrendDownIcon, WalletIcon, TagIcon } from '../components/icons'
import PageNav from '../components/PageNav'

const NAV_SECTIONS = [
  { id: 'goals-list', label: 'My goals' },
  { id: 'add-goal-form', label: 'Add a goal' },
]

type GoalType = 'savings' | 'debt' | 'credit' | 'income' | 'spending'

interface GoalTypeConfig {
  label: string
  icon: typeof TargetIcon
  description: string
  tips: string[]
  placeholder: string
}

const goalTypes: Record<GoalType, GoalTypeConfig> = {
  savings: {
    label: 'Savings',
    icon: WalletIcon,
    description: 'A specific dollar target by a specific date. Covers trips, emergency funds, deposits, laptops, study abroad.',
    placeholder: 'Europe summer 2027',
    tips: [
      'Automate the contribution immediately. Even $10/week moved to a separate labeled savings account on payday removes the decision from your hands. The account label matters: "Europe trip" performs better than "savings account 2."',
      'Use a high-yield savings account (Marcus, Ally, SoFi) rather than a standard one. Rates are meaningfully higher and slight friction of transferring back reduces impulse withdrawals.',
      'Sell textbooks, unused electronics, or clothes on Facebook Marketplace, eBay, or Depop and direct the full proceeds to the goal. One good textbook sale can add two or three weeks of progress instantly.',
      'Look for a specific income boost rather than just cutting spending. One extra shift, a weekend gig, or a freelance project creates a one-time injection that can move a progress bar significantly.',
      'Round-up features on apps like Acorns or your bank add small amounts passively without requiring active decisions.',
    ],
  },
  debt: {
    label: 'Debt payoff',
    icon: TrendDownIcon,
    description: 'Paying down a credit card balance, store card, or personal loan by a date.',
    placeholder: 'Pay off Discover card',
    tips: [
      'Pay more than the minimum every single month. Even $10 over the minimum meaningfully reduces total interest paid over time.',
      'Avalanche method: pay minimums on all debts, then throw every extra dollar at the highest-APR balance first. Mathematically optimal.',
      'Snowball method: pay minimums on all debts, then attack the smallest balance first regardless of rate. Psychologically superior for students who need quick wins.',
      'Never use a card you are actively paying down for new purchases. New spending offsets payoff progress and extends the timeline.',
      'Request a lower APR directly from the card issuer. Students with 12+ months of on-time payments have a reasonable chance of getting a rate reduction with a single phone call.',
    ],
  },
  credit: {
    label: 'Credit score',
    icon: SparklesIcon,
    description: 'Moving from one score band to another by a target date. Progress is measured through proxy behaviors.',
    placeholder: 'Reach 700 by December',
    tips: [
      'Getting credit utilization below 10% is the single highest-impact action and can move a score 20-50 points within one to two billing cycles.',
      'Pay the balance twice a month. Issuers report to bureaus at the statement close date, not the payment due date. Paying mid-cycle keeps the reported balance lower.',
      'Do not close old cards even if you do not use them. Account age is a meaningful factor and closing an old card shortens your average credit age.',
      'Dispute any errors on your credit report through annualcreditreport.com. Incorrect late payments are your legal right to have corrected.',
      'Becoming an authorized user on a trusted family member account adds their history to your report immediately.',
    ],
  },
  income: {
    label: 'Income',
    icon: TagIcon,
    description: 'Earning a target amount from a side hustle, part-time job, or freelance work by a date.',
    placeholder: 'Earn $500/month freelancing',
    tips: [
      'Campus jobs are underrated. They offer flexible scheduling built around class times, often pay reasonably well, and do not require commuting. Check your university student employment portal before looking off-campus.',
      'Freelance work using skills you already have (video editing, social media, tutoring, web design, data entry) is the fastest path to meaningful extra income because startup cost is zero.',
      'Set aside 25-30% of every freelance payment for taxes immediately. The self-employment tax bill in April is the most common financial shock for first-time freelancers.',
      'Selling skills on Fiverr, Upwork, or directly to small local businesses can reach $500-$1,000/month within a few months for students who are consistent.',
    ],
  },
  spending: {
    label: 'Spending reduction',
    icon: WalletIcon,
    description: 'Cutting a specific category (eating out, subscriptions, rideshare) by a target percentage or dollar amount per month.',
    placeholder: 'Cut food delivery by $100/mo',
    tips: [
      'Start by auditing subscriptions. The average person underestimates their subscription spend by 2.5x. List every recurring charge, then cancel anything unused in 30 days.',
      'Cook one more meal per week than you currently do. Students who meal prep on Sunday reduce their weekly food spend by 30-40% on average without feeling restricted.',
      'Uninstall delivery apps like DoorDash and Uber Eats from your phone. Delivery fees, service charges, and tips routinely add 40-60% to the base food cost. The friction of reinstalling before ordering is often enough to break the habit.',
      'Use your university free resources before paying. Gym, counseling, printing, software, tutoring, legal services are typically included in student fees and dramatically underused.',
    ],
  },
}

const goalTypeKeys: GoalType[] = ['savings', 'debt', 'credit', 'income', 'spending']

const templates = [
  { name: 'Emergency fund', amount: 500, type: 'savings' as GoalType, months: 6 },
  { name: 'Pay off credit card', amount: 1200, type: 'debt' as GoalType, months: 12 },
  { name: 'Reach 700 credit score', amount: 700, type: 'credit' as GoalType, months: 6 },
]

function addMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Goals() {
  const { state, update } = useProfile()
  const [newGoal, setNewGoal] = useState({ name: '', amount: 0, by: '', type: 'savings' as GoalType })
  const [filter, setFilter] = useState<'all' | GoalType>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, 'progress' | 'tips'>>({})

  if (!state) return null
  const { profile } = state
  const surplus = monthlySurplus(profile)

  const saveGoals = (goals: Goal[]) => update({ ...profile, goals })

  const addGoal = () => {
    if (!newGoal.name.trim() || newGoal.amount <= 0 || !newGoal.by) return
    saveGoals([...profile.goals, { ...newGoal, id: crypto.randomUUID(), saved: 0 }])
    setNewGoal({ name: '', amount: 0, by: '', type: 'savings' })
  }

  const useTemplate = (t: typeof templates[0]) => {
    setNewGoal({ name: t.name, amount: t.amount, by: addMonths(t.months), type: t.type })
    document.getElementById('add-goal-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const setSaved = (id: string, saved: number) =>
    saveGoals(profile.goals.map((g) => (g.id === id ? { ...g, saved: Math.max(saved, 0) } : g)))

  const remove = (id: string) => saveGoals(profile.goals.filter((g) => g.id !== id))

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id)
  const getTab = (id: string) => activeTab[id] ?? 'progress'
  const setTab = (id: string, tab: 'progress' | 'tips') =>
    setActiveTab((prev) => ({ ...prev, [id]: tab }))

  const filtered =
    filter === 'all' ? profile.goals : profile.goals.filter((g) => (g as unknown as Record<string, unknown>)['type'] === filter)

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-ink">Goals</h1>
        <p className="text-sm text-ink-faint">
          Set a goal, track your progress, and find the fastest path to get there. You have about{' '}
          {fmtMoney(Math.max(surplus, 0))}/month of budget room to put toward these.
        </p>
      </header>

      <PageNav sections={NAV_SECTIONS} />

      {/* Goal type filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...goalTypeKeys] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-brand text-on-brand'
                : 'bg-surface border border-line text-ink-mid hover:border-brand'
            }`}
          >
            {f === 'all' ? 'All' : goalTypes[f].label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {profile.goals.length === 0 && (
        <div className="bg-surface rounded-2xl border border-line p-8 text-center">
          <TargetIcon className="w-8 h-8 text-ink-faint mx-auto" />
          <p className="mt-3 font-semibold text-ink">No goals yet</p>
          <p className="mt-1 text-sm text-ink-faint max-w-sm mx-auto">
            Goals with a specific target and deadline are 3x more likely to be reached. Money without a job tends to wander, give it one.
          </p>
          <div className="mt-5 grid sm:grid-cols-3 gap-3 text-left">
            {templates.map((t) => {
              const cfg = goalTypes[t.type]
              return (
                <button
                  key={t.name}
                  onClick={() => useTemplate(t)}
                  className="bg-surface-2 rounded-xl border border-line p-4 text-left hover:border-brand transition-colors"
                >
                  <cfg.icon className="w-4 h-4 text-brand" />
                  <div className="mt-2 font-medium text-sm text-ink">{t.name}</div>
                  <div className="text-xs text-ink-faint mt-0.5">{t.type === 'credit' ? `${t.amount} score` : fmtMoney(t.amount)} in {t.months} months</div>
                  <div className="mt-2 text-xs text-brand font-medium">Use template</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Goal cards */}
      <div id="goals-list" className="space-y-4 scroll-mt-6">
        {filtered.map((g) => {
          const plan = planGoal(g, profile)
          const milestone = milestoneMessage(plan)
          const isExpanded = expandedId === g.id
          const tab = getTab(g.id)
          const cfg = goalTypes[(g as unknown as Record<string, unknown>)['type'] as GoalType] ?? goalTypes.savings

          return (
            <div key={g.id} className="bg-surface rounded-2xl border border-line overflow-hidden hover:border-brand/50 transition-colors duration-150">
              {/* Card header */}
              <div className="p-6 cursor-pointer" onClick={() => toggleExpand(g.id)}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                      <cfg.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-ink leading-tight">{g.name}</h2>
                      <p className="text-xs text-ink-faint">{cfg.label} · {(g as unknown as Record<string, unknown>)['type'] === 'credit' ? `${g.amount} score` : fmtMoney(g.amount)} by {g.by}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      plan.progressPct >= 100
                        ? 'bg-ok-soft text-ok-ink'
                        : plan.feasible
                        ? 'bg-brand-soft text-brand-ink'
                        : 'bg-warn-soft text-warn-ink'
                    }`}>
                      {plan.progressPct >= 100 ? 'Completed' : plan.feasible ? 'On track' : 'Needs attention'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(g.id) }}
                      className="text-xs text-bad hover:text-bad-ink font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-2.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.max(plan.progressPct, 2)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-ink-faint tabular-nums">
                  {(g as unknown as Record<string, unknown>)['type'] === 'credit' ? (
                    <>
                      <span>{g.saved} saved ({Math.round(plan.progressPct)}%)</span>
                      <span>{plan.remaining > 0 ? `${plan.remaining} to go` : 'Goal reached'}</span>
                    </>
                  ) : (
                    <>
                      <span>{fmtMoney(g.saved)} saved ({Math.round(plan.progressPct)}%)</span>
                      <span>{plan.remaining > 0 ? `${fmtMoney(plan.remaining)} to go` : 'Goal reached'}</span>
                    </>
                  )}
                </div>
                {milestone && <p className="mt-2 text-sm text-ok-ink">{milestone}</p>}
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-line">
                  <div className="flex border-b border-line">
                    {(['progress', 'tips'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(g.id, t)}
                        className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                          tab === t
                            ? 'text-brand border-b-2 border-brand'
                            : 'text-ink-faint hover:text-ink'
                        }`}
                      >
                        {t === 'progress' ? 'Progress' : 'Tips'}
                      </button>
                    ))}
                  </div>

                  <div className="p-6">
                    {tab === 'progress' && (
                      <div className="space-y-4">
                        {plan.remaining > 0 && (
                          <div className="rounded-xl bg-surface-2 p-4">
                            <div className="text-xs uppercase tracking-wide text-ink-faint mb-3">Pace needed to hit target</div>
                            <div className="flex flex-wrap gap-5">
                              <div>
                                <div className="font-display text-2xl font-bold text-ink tabular-nums">{fmtMoney(plan.monthlyNeeded)}</div>
                                <div className="text-xs text-ink-faint">per month</div>
                              </div>
                              <div>
                                <div className="font-display text-2xl font-bold text-ink tabular-nums">{fmtMoney(plan.weeklyNeeded)}</div>
                                <div className="text-xs text-ink-faint">per week</div>
                              </div>
                              <div>
                                <div className="font-display text-2xl font-bold text-ink tabular-nums">{plan.monthsLeft}</div>
                                <div className="text-xs text-ink-faint">months left</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {!plan.feasible && plan.remaining > 0 && (
                          <div className="rounded-xl bg-warn-soft border border-warn-line px-4 py-3 text-sm text-warn-ink">
                            That is more than your {fmtMoney(Math.max(surplus, 0))}/month surplus.{' '}
                            {plan.adjustedMonths
                              ? `A ${plan.adjustedMonths}-month timeline would fit your current budget.`
                              : 'With no monthly surplus right now, this needs a budget change or a windfall first.'}
                          </div>
                        )}

                        <label className="flex items-center gap-2 text-sm text-ink-mid">
                          Update saved amount:
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint text-sm">$</span>
                            <input
                              type="number"
                              min={0}
                              value={g.saved || ''}
                              placeholder="0"
                              onChange={(e) => setSaved(g.id, Number(e.target.value) || 0)}
                              className="w-28 rounded-lg border border-line-strong pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                            />
                          </div>
                        </label>
                      </div>
                    )}

                    {tab === 'tips' && (
                      <div className="space-y-3">
                        <p className="text-xs text-ink-faint uppercase tracking-wide font-semibold">
                          {cfg.label} tips, ordered by estimated impact
                        </p>
                        {cfg.tips.map((tip, i) => (
                          <div key={i} className="flex gap-3 bg-surface-2 rounded-xl p-4">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-brand-soft text-brand text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <p className="text-sm text-ink-mid leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add goal form */}
      <div id="add-goal-form" className="bg-surface rounded-2xl border border-line p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Add a goal</h2>
        <p className="mt-1 text-xs text-ink-faint">Keep the name personal. "Europe summer 2027" beats "savings goal."</p>

        <div className="mt-4 space-y-3">
          <div>
            <span className="text-xs font-medium text-ink-faint">Goal type</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {goalTypeKeys.map((t) => (
                <button
                  key={t}
                  onClick={() => setNewGoal({ ...newGoal, type: t })}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    newGoal.type === t
                      ? 'bg-brand text-on-brand border-brand'
                      : 'border-line text-ink-mid hover:border-brand bg-surface'
                  }`}
                >
                  {goalTypes[t].label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">{goalTypes[newGoal.type].description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
            <label className="block">
              <span className="text-xs font-medium text-ink-faint">Goal name</span>
              <input
                value={newGoal.name}
                placeholder={goalTypes[newGoal.type].placeholder}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-line-strong px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-faint">Amount</span>
              <input
                type="number"
                min={0}
                value={newGoal.amount || ''}
                placeholder="1200"
                onChange={(e) => setNewGoal({ ...newGoal, amount: Number(e.target.value) || 0 })}
                className="mt-1 w-full sm:w-24 rounded-lg border border-line-strong px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-faint">By</span>
              <input
                type="month"
                value={newGoal.by}
                onChange={(e) => setNewGoal({ ...newGoal, by: e.target.value })}
                className="mt-1 w-full sm:w-36 rounded-lg border border-line-strong px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <button
              onClick={addGoal}
              className="rounded-lg bg-brand text-on-brand px-4 py-2 text-sm font-medium hover:bg-brand-strong transition-colors"
            >
              Add goal
            </button>
          </div>
        </div>
      </div>

      {profile.goals.length > 0 && (
        <div className="rounded-xl bg-brand-soft border border-brand-line px-4 py-3 text-sm text-brand-ink">
          Goals with a weekly check-in are completed 60% more often. Set a recurring reminder to update your saved amount each week.
        </div>
      )}
    </div>
  )
}

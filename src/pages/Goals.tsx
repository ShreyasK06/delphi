import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { planGoal, milestoneMessage, type GoalPlan } from '../lib/goals'
import { monthlySurplus, fmtMoney, type Goal, type Contribution, type ScoreReading } from '../types'
import { TargetIcon, SparklesIcon, TrendDownIcon, WalletIcon, TagIcon } from '../components/icons'
import PageNav from '../components/PageNav'

const NAV_SECTIONS = [
  { id: 'goals-list', label: 'My goals' },
  { id: 'add-goal-form', label: 'Add a goal' },
]

type GoalType = 'savings' | 'debt' | 'credit' | 'income' | 'spending'
type DetailTab = 'progress' | 'tips' | 'whatif'

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

const creditBehaviors: { id: string; label: string }[] = [
  { id: 'util_10', label: 'Get credit utilization below 10%' },
  { id: 'pay_twice', label: 'Pay the balance twice a month so the reported balance stays low' },
  { id: 'on_time', label: 'Keep a perfect on-time payment streak this month' },
  { id: 'no_close', label: 'Keep old cards open, do not close your oldest account' },
  { id: 'check_report', label: 'Pull your report at annualcreditreport.com and dispute any errors' },
]

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

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi)
}

function shortDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── What-if computation ───────────────────────────────────────────────────────

function whatIfExtra10(remaining: number, monthlyNeeded: number, monthsLeft: number) {
  const EXTRA_PER_WEEK = 10
  const EXTRA_PER_MONTH = EXTRA_PER_WEEK * 4.33
  const baseMonths = monthlyNeeded > 0 ? remaining / monthlyNeeded : monthsLeft
  const newMonthlyRate = monthlyNeeded + EXTRA_PER_MONTH
  const newMonths = newMonthlyRate > 0 ? remaining / newMonthlyRate : baseMonths
  const weeksSaved = Math.max((baseMonths - newMonths) * 4.33, 0)
  return {
    weeksSaved: Math.round(weeksSaved),
    newCompletionMonths: Math.max(Math.ceil(newMonths), 0),
  }
}

// ── Inline tab bar for goal detail ───────────────────────────────────────────

interface GoalTabBarProps {
  goalId: string
  active: DetailTab
  onSelect: (t: DetailTab) => void
}

function GoalTabBar({ goalId, active, onSelect }: GoalTabBarProps) {
  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'progress', label: 'Progress' },
    { id: 'tips', label: 'Tips' },
    { id: 'whatif', label: 'What-if' },
  ]
  return (
    <div className="flex border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`goal-tab-${goalId}-${t.id}`}
          role="tab"
          aria-selected={active === t.id}
          aria-controls={`goal-panel-${goalId}-${t.id}`}
          onClick={() => onSelect(t.id)}
          className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            active === t.id
              ? 'text-brand border-b-2 border-brand'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── What-if panel ─────────────────────────────────────────────────────────────

interface WhatIfPanelProps {
  goal: Goal
  plan: GoalPlan
  isCreditType: boolean
  surplus: number
}

const creditScenarios = [
  {
    title: 'Get utilization below 10%',
    body: 'Getting credit utilization below 10% can move a score 20 to 50 points within one to two billing cycles. This is the single highest-leverage action available.',
  },
  {
    title: 'Dispute a report error',
    body: 'An incorrect late payment or collection on your report can cost 50 to 100 points. Pulling your report at annualcreditreport.com and filing a dispute restores those points if the error is corrected.',
  },
  {
    title: 'Become an authorized user',
    body: 'Being added as an authorized user on a trusted family member\'s old account adds their entire account history to your report, which can instantly lengthen your credit age.',
  },
]

function WhatIfPanel({ goal: _goal, plan, isCreditType, surplus: _surplus }: WhatIfPanelProps) {
  if (isCreditType) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">
          Score scenarios
        </p>
        {creditScenarios.map((s, i) => (
          <div key={i} className="rounded-xl bg-surface-2 p-4">
            <p className="text-sm font-semibold text-ink mb-1">{s.title}</p>
            <p className="text-sm text-ink-mid leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    )
  }

  if (plan.remaining <= 0) {
    return (
      <p className="text-sm text-ink-mid">
        This goal is already fully funded. Nothing to calculate here.
      </p>
    )
  }

  const { weeksSaved, newCompletionMonths } = whatIfExtra10(
    plan.remaining,
    plan.monthlyNeeded,
    plan.monthsLeft,
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-surface-2 p-4">
        <p className="text-xs uppercase tracking-wide text-ink-faint mb-3">
          What if you added $10 more per week?
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-display text-2xl font-bold text-ink-mid tabular-nums">
              {plan.monthsLeft > 0 ? plan.monthsLeft : '?'}
            </div>
            <div className="text-xs text-ink-faint mt-0.5">
              month{plan.monthsLeft !== 1 ? 's' : ''} at current pace
            </div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-brand tabular-nums">
              {newCompletionMonths}
            </div>
            <div className="text-xs text-ink-faint mt-0.5">
              month{newCompletionMonths !== 1 ? 's' : ''} with $10/week extra
            </div>
          </div>
        </div>

        {weeksSaved > 0 && (
          <div className="mt-4 rounded-lg bg-brand-soft border border-brand-line px-3 py-2.5">
            <p className="text-sm font-semibold text-brand-ink tabular-nums">
              {weeksSaved} week{weeksSaved !== 1 ? 's' : ''} sooner
            </p>
            <p className="text-xs text-brand-ink/80 mt-0.5">
              That is {fmtMoney(10 * weeksSaved)} more contributed over the accelerated period.
              {weeksSaved >= 4
                ? ' Over a month saved just by adding one small income boost per week.'
                : ' A small change with a real impact on your timeline.'}
            </p>
          </div>
        )}

        {weeksSaved === 0 && (
          <p className="mt-3 text-xs text-ink-faint">
            The timeline difference is less than one week at this goal size. Focus on a bigger
            income boost or a one-time lump sum to move the needle more.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">
          Ways to find $10 more per week
        </p>
        {[
          'Sell one unused item on Facebook Marketplace or eBay.',
          'Skip one food delivery order and cook instead.',
          'Take one extra shift or pick up a gig this week.',
          'Cancel one subscription you have not used in 30 days.',
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-ink-mid">
            <span className="text-brand mt-0.5 shrink-0">&#8594;</span>
            {tip}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Money goal progress panel ─────────────────────────────────────────────────

interface MoneyProgressPanelProps {
  g: Goal
  plan: GoalPlan
  surplus: number
  onLogContribution: (goalId: string, amount: number) => void
  onRemoveContribution: (goalId: string, entryId: string) => void
  onSetSaved: (goalId: string, value: number) => void
}

function MoneyProgressPanel({
  g,
  plan,
  surplus,
  onLogContribution,
  onRemoveContribution,
  onSetSaved,
}: MoneyProgressPanelProps) {
  const [contribInput, setContribInput] = useState('')
  const [showExact, setShowExact] = useState(false)
  const [exactInput, setExactInput] = useState(String(g.saved || ''))

  const contributions: Contribution[] = g.contributions ?? []
  const recent = [...contributions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  const handleAdd = () => {
    const val = parseFloat(contribInput)
    if (!isNaN(val) && val !== 0) {
      onLogContribution(g.id, val)
      setContribInput('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Pace stat block */}
      {plan.remaining > 0 && (
        <div className="rounded-xl bg-surface-2 p-4">
          <div className="text-xs uppercase tracking-wide text-ink-faint mb-3">
            Pace needed to hit target
          </div>
          <div className="flex flex-wrap gap-5">
            <div>
              <div className="font-display text-2xl font-bold text-ink tabular-nums">
                {fmtMoney(plan.monthlyNeeded)}
              </div>
              <div className="text-xs text-ink-faint">per month</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-ink tabular-nums">
                {fmtMoney(plan.weeklyNeeded)}
              </div>
              <div className="text-xs text-ink-faint">per week</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-ink tabular-nums">
                {plan.monthsLeft}
              </div>
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

      {/* Log progress card */}
      <div className="rounded-xl bg-surface-2 p-4 space-y-3">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Log progress</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint text-sm select-none">
              $
            </span>
            <input
              type="number"
              value={contribInput}
              placeholder="25"
              onChange={(e) => setContribInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full rounded-lg border border-line-strong bg-surface pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-brand text-on-brand px-4 py-2 text-sm font-medium hover:bg-brand-strong transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex gap-2">
          {[10, 25, 50].map((amt) => (
            <button
              key={amt}
              onClick={() => onLogContribution(g.id, amt)}
              className="rounded-full px-3 py-1 text-xs font-medium bg-surface border border-line text-ink-mid hover:border-brand hover:text-brand transition-colors"
            >
              +${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Recent activity</p>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No contributions logged yet. Add your first above.
          </p>
        ) : (
          <div className="space-y-1">
            {recent.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      c.amount >= 0 ? 'text-ok-ink' : 'text-bad-ink'
                    }`}
                  >
                    {c.amount >= 0 ? '+' : ''}
                    {fmtMoney(c.amount)}
                  </span>
                  <span className="text-xs text-ink-faint">{shortDate(c.date)}</span>
                </div>
                <button
                  onClick={() => onRemoveContribution(g.id, c.id)}
                  className="text-ink-faint hover:text-bad text-xs leading-none px-1"
                  aria-label="Remove contribution"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Set exact total disclosure */}
      <div>
        <button
          onClick={() => {
            setShowExact((v) => !v)
            setExactInput(String(g.saved || ''))
          }}
          className="text-xs text-ink-faint hover:text-ink-mid underline underline-offset-2"
        >
          {showExact ? 'Hide' : 'Set exact total'} (for corrections)
        </button>
        {showExact && (
          <div className="mt-2 flex gap-2 items-center">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint text-sm select-none">
                $
              </span>
              <input
                type="number"
                min={0}
                value={exactInput}
                placeholder="0"
                onChange={(e) => setExactInput(e.target.value)}
                className="w-28 rounded-lg border border-line-strong bg-surface pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <button
              onClick={() => {
                const val = parseFloat(exactInput)
                if (!isNaN(val)) {
                  onSetSaved(g.id, val)
                  setShowExact(false)
                }
              }}
              className="text-xs text-brand hover:text-brand-strong font-medium"
            >
              Save
            </button>
            <span className="text-xs text-ink-faint">Current: {fmtMoney(g.saved)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Credit goal progress panel ────────────────────────────────────────────────

interface CreditProgressPanelProps {
  g: Goal
  behaviorsCompleted: number
  onLogScore: (goalId: string, score: number) => void
  onRemoveScoreReading: (goalId: string, entryId: string) => void
  onToggleBehavior: (goalId: string, behaviorId: string) => void
}

function CreditProgressPanel({
  g,
  behaviorsCompleted,
  onLogScore,
  onRemoveScoreReading,
  onToggleBehavior,
}: CreditProgressPanelProps) {
  const [scoreInput, setScoreInput] = useState('')
  const [scoreError, setScoreError] = useState('')

  const scoreLog: ScoreReading[] = g.score_log ?? []
  const start = g.start_score ?? (scoreLog.length > 0 ? scoreLog[0].score : undefined) ?? g.saved ?? g.amount
  const currentScore = g.saved ?? start
  const netChange = currentScore - start

  const sortedLog = [...scoreLog].sort((a, b) => b.date.localeCompare(a.date))

  const handleSaveReading = () => {
    const val = parseInt(scoreInput, 10)
    if (isNaN(val) || val < 300 || val > 850) {
      setScoreError('Enter a score between 300 and 850.')
      return
    }
    setScoreError('')
    onLogScore(g.id, val)
    setScoreInput('')
  }

  return (
    <div className="space-y-5">
      {/* Score summary card */}
      <div className="rounded-xl bg-surface-2 p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-display text-2xl font-bold text-ink-mid tabular-nums">{start}</div>
            <div className="text-xs text-ink-faint mt-0.5">Start</div>
          </div>
          <div>
            <div className="font-display text-3xl font-bold text-brand tabular-nums">{currentScore || start}</div>
            <div className="text-xs text-ink-faint mt-0.5">Now</div>
          </div>
          <div>
            <div className="font-display text-2xl font-bold text-ink-mid tabular-nums">{g.amount}</div>
            <div className="text-xs text-ink-faint mt-0.5">Target</div>
          </div>
        </div>
        {netChange !== 0 ? (
          <p className={`mt-3 text-center text-sm font-medium tabular-nums ${netChange > 0 ? 'text-ok-ink' : 'text-bad-ink'}`}>
            {netChange > 0 ? '+' : ''}{netChange} points since you started
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-ink-faint">Log your first score reading to start tracking progress.</p>
        )}
      </div>

      {/* Log a new score */}
      <div className="rounded-xl bg-surface-2 p-4 space-y-3">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Log a new score</p>
        <div className="flex gap-2">
          <input
            type="number"
            min={300}
            max={850}
            value={scoreInput}
            placeholder="680"
            onChange={(e) => { setScoreError(''); setScoreInput(e.target.value) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveReading()}
            className={`flex-1 rounded-lg border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${scoreError ? 'border-bad' : 'border-line-strong'}`}
          />
          <button
            onClick={handleSaveReading}
            className="rounded-lg bg-brand text-on-brand px-4 py-2 text-sm font-medium hover:bg-brand-strong transition-colors"
          >
            Save reading
          </button>
        </div>
        {scoreError && <p className="text-xs text-bad">{scoreError}</p>}
        <p className="text-xs text-ink-faint leading-relaxed">
          Pull your latest score from your card app, Credit Karma, or your bank, then log it here.
        </p>
      </div>

      {/* Score history */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Score history</p>
        {sortedLog.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No readings logged yet. Log your current score above to start tracking.
          </p>
        ) : (
          <div className="space-y-1">
            {sortedLog.map((r, idx) => {
              const prevEntry = sortedLog[idx + 1]
              const delta = prevEntry ? r.score - prevEntry.score : null
              const isFirst = idx === sortedLog.length - 1
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-bold text-ink tabular-nums">{r.score}</span>
                    <span className="text-xs text-ink-faint">{shortDate(r.date)}</span>
                    {isFirst ? (
                      <span className="text-xs text-ink-faint italic">first reading</span>
                    ) : delta !== null ? (
                      <span className={`text-xs font-medium tabular-nums ${delta > 0 ? 'text-ok-ink' : delta < 0 ? 'text-bad-ink' : 'text-ink-faint'}`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={() => onRemoveScoreReading(g.id, r.id)}
                    className="text-ink-faint hover:text-bad text-xs leading-none px-1"
                    aria-label="Remove score reading"
                  >
                    &times;
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Behaviors checklist */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">
          Habits that move your score
        </p>
        {creditBehaviors.map((b) => {
          const done = (g.behaviors_done ?? []).includes(b.id)
          return (
            <button
              key={b.id}
              onClick={() => onToggleBehavior(g.id, b.id)}
              className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                done
                  ? 'bg-ok-soft border-ok-line text-ok-ink'
                  : 'bg-surface-2 border-line text-ink-mid hover:border-brand'
              }`}
            >
              <span className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center text-xs font-bold ${done ? 'bg-ok border-ok text-on-ok' : 'bg-surface border-line-strong'}`}>
                {done ? '✓' : ''}
              </span>
              <span className="text-sm leading-snug">{b.label}</span>
            </button>
          )
        })}
        <p className="text-xs text-ink-faint tabular-nums">
          {behaviorsCompleted}/{creditBehaviors.length} habits completed
        </p>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Goals() {
  const { state, update } = useProfile()
  const [newGoal, setNewGoal] = useState({ name: '', amount: 0, by: '', type: 'savings' as GoalType, saved: 0 })
  const [filter, setFilter] = useState<'all' | GoalType>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, DetailTab>>({})
  const [creditScoreError, setCreditScoreError] = useState('')

  if (!state) return null
  const { profile } = state
  const surplus = monthlySurplus(profile)

  const saveGoals = (goals: Goal[]) => update({ ...profile, goals })

  const addGoal = () => {
    if (!newGoal.name.trim() || newGoal.amount <= 0 || !newGoal.by) return
    if (newGoal.type === 'credit') {
      if (newGoal.amount < 300 || newGoal.amount > 850) {
        setCreditScoreError('Target score must be between 300 and 850.')
        return
      }
    }
    setCreditScoreError('')
    const currentScore = newGoal.saved
    const goal: Goal = {
      id: crypto.randomUUID(),
      name: newGoal.name,
      amount: newGoal.amount,
      by: newGoal.by,
      type: newGoal.type,
      saved: newGoal.type === 'credit' ? currentScore : 0,
      ...(newGoal.type === 'credit' && currentScore > 0 ? { start_score: currentScore } : {}),
    }
    saveGoals([...profile.goals, goal])
    setNewGoal({ name: '', amount: 0, by: '', type: 'savings', saved: 0 })
  }

  const useTemplate = (t: typeof templates[0]) => {
    setNewGoal({ name: t.name, amount: t.amount, by: addMonths(t.months), type: t.type, saved: 0 })
    setCreditScoreError('')
    document.getElementById('add-goal-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  const setSaved = (id: string, saved: number) =>
    saveGoals(profile.goals.map((g) => (g.id === id ? { ...g, saved: Math.max(saved, 0) } : g)))

  const remove = (id: string) => saveGoals(profile.goals.filter((g) => g.id !== id))

  const toggleBehavior = (goalId: string, behaviorId: string) => {
    saveGoals(profile.goals.map((g) => {
      if (g.id !== goalId) return g
      const done = g.behaviors_done ?? []
      const next = done.includes(behaviorId)
        ? done.filter((b) => b !== behaviorId)
        : [...done, behaviorId]
      return { ...g, behaviors_done: next }
    }))
  }

  // ── Money goal contribution handlers ────────────────────────────────────────

  const logContribution = (goalId: string, amount: number) => {
    saveGoals(profile.goals.map((g) => {
      if (g.id !== goalId) return g
      const newSaved = Math.max((g.saved || 0) + amount, 0)
      const entry: Contribution = {
        id: crypto.randomUUID(),
        amount,
        date: new Date().toISOString(),
      }
      return {
        ...g,
        saved: newSaved,
        contributions: [...(g.contributions ?? []), entry],
      }
    }))
  }

  const removeContribution = (goalId: string, entryId: string) => {
    saveGoals(profile.goals.map((g) => {
      if (g.id !== goalId) return g
      const entry = (g.contributions ?? []).find((c) => c.id === entryId)
      if (!entry) return g
      const newSaved = Math.max((g.saved || 0) - entry.amount, 0)
      return {
        ...g,
        saved: newSaved,
        contributions: (g.contributions ?? []).filter((c) => c.id !== entryId),
      }
    }))
  }

  // ── Credit goal score handlers ───────────────────────────────────────────────

  const logScore = (goalId: string, score: number) => {
    const clamped = clamp(score, 300, 850)
    saveGoals(profile.goals.map((g) => {
      if (g.id !== goalId) return g
      const reading: ScoreReading = {
        id: crypto.randomUUID(),
        score: clamped,
        date: new Date().toISOString(),
      }
      const startScore = g.start_score ?? (g.saved && g.saved > 0 ? g.saved : clamped)
      return {
        ...g,
        saved: clamped,
        start_score: startScore,
        score_log: [...(g.score_log ?? []), reading],
      }
    }))
  }

  const removeScoreReading = (goalId: string, entryId: string) => {
    saveGoals(profile.goals.map((g) => {
      if (g.id !== goalId) return g
      const updatedLog = (g.score_log ?? []).filter((r) => r.id !== entryId)
      const sorted = [...updatedLog].sort((a, b) => b.date.localeCompare(a.date))
      const latestScore = sorted.length > 0 ? sorted[0].score : (g.start_score ?? g.saved ?? 0)
      return {
        ...g,
        saved: latestScore,
        score_log: updatedLog,
      }
    }))
  }

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id)
  const getTab = (id: string): DetailTab => activeTab[id] ?? 'progress'
  const setTab = (id: string, tab: DetailTab) =>
    setActiveTab((prev) => ({ ...prev, [id]: tab }))

  const filtered =
    filter === 'all'
      ? profile.goals
      : profile.goals.filter((g) => (g.type ?? 'savings') === filter)

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">SAVE</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Goals</h1>
        <p className="text-sm text-ink-faint max-w-2xl mt-1">
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
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              filter === f
                ? 'bg-brand text-on-brand'
                : 'bg-surface border border-line text-ink-mid hover:border-brand hover:text-brand'
            }`}
          >
            {f === 'all' ? 'All' : goalTypes[f].label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {profile.goals.length === 0 && (
        <div className="bg-surface rounded-2xl border border-line p-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center mx-auto">
            <TargetIcon className="w-5 h-5" />
          </div>
          <p className="mt-3 font-semibold text-ink">No goals yet</p>
          <p className="mt-1 text-sm text-ink-faint max-w-sm mx-auto leading-relaxed">
            Goals with a specific target and deadline are 3x more likely to be reached. Give your money a purpose.
          </p>
          <div className="mt-5 grid sm:grid-cols-3 gap-3 text-left">
            {templates.map((t) => {
              const cfg = goalTypes[t.type]
              return (
                <button
                  key={t.name}
                  onClick={() => useTemplate(t)}
                  className="bg-surface-2 rounded-xl border border-line p-4 text-left hover:border-brand hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
                    <cfg.icon className="w-4 h-4" />
                  </div>
                  <div className="mt-2 font-medium text-sm text-ink">{t.name}</div>
                  <div className="text-xs text-ink-faint mt-0.5">
                    {t.type === 'credit' ? `${t.amount} score` : fmtMoney(t.amount)} in {t.months} months
                  </div>
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
          const isCreditType = (g.type ?? 'savings') === 'credit'
          const behaviorsCompleted = isCreditType ? (g.behaviors_done ?? []).length : 0

          // Credit progress math
          const scoreLog: ScoreReading[] = g.score_log ?? []
          const creditStart = g.start_score ?? (scoreLog.length > 0 ? scoreLog[0].score : undefined) ?? g.saved ?? g.amount
          const creditCurrentScore = g.saved ?? creditStart
          const creditSpan = g.amount - creditStart
          const creditProgressPct = isCreditType
            ? (creditSpan > 0
                ? clamp(((creditCurrentScore - creditStart) / creditSpan) * 100, 0, 100)
                : (creditCurrentScore >= g.amount ? 100 : 0))
            : 0

          const plan = isCreditType ? null : planGoal(g, profile)
          const milestone = plan ? milestoneMessage(plan) : null
          const isExpanded = expandedId === g.id
          const tab = getTab(g.id)
          const cfg = goalTypes[g.type ?? 'savings'] ?? goalTypes.savings

          // Status badge logic
          let statusClass = 'bg-brand-soft text-brand-ink'
          let statusLabel = 'In progress'
          if (isCreditType) {
            const hasReadings = scoreLog.length > 0
            if (creditCurrentScore >= g.amount) { statusClass = 'bg-ok-soft text-ok-ink'; statusLabel = 'Completed' }
            else if (hasReadings && creditCurrentScore > creditStart) { statusClass = 'bg-brand-soft text-brand-ink'; statusLabel = 'On track' }
            else if (!hasReadings) { statusClass = 'bg-warn-soft text-warn-ink'; statusLabel = 'Not started' }
          } else if (plan) {
            if (plan.progressPct >= 100) { statusClass = 'bg-ok-soft text-ok-ink'; statusLabel = 'Completed' }
            else if (plan.feasible) { statusClass = 'bg-brand-soft text-brand-ink'; statusLabel = 'On track' }
            else { statusClass = 'bg-warn-soft text-warn-ink'; statusLabel = 'Needs attention' }
          }

          const displayProgressPct = isCreditType ? creditProgressPct : (plan?.progressPct ?? 0)

          return (
            <div
              key={g.id}
              className="bg-surface rounded-2xl border border-line overflow-hidden hover:border-brand/50 transition-colors duration-150"
            >
              {/* Card header -- always visible, click to expand */}
              <div className="p-6 cursor-pointer" onClick={() => toggleExpand(g.id)}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                      <cfg.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-ink leading-tight">{g.name}</h2>
                      <p className="text-xs text-ink-faint">
                        {cfg.label} · {isCreditType ? `${g.amount} score` : fmtMoney(g.amount)} by {g.by}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
                      {statusLabel}
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
                    style={{ width: `${Math.max(displayProgressPct, 2)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-ink-faint tabular-nums">
                  {isCreditType ? (
                    <>
                      <span className="tabular-nums">{creditCurrentScore || creditStart} now, {g.amount} target</span>
                      <span className="tabular-nums">{behaviorsCompleted}/{creditBehaviors.length} habits</span>
                    </>
                  ) : plan ? (
                    <>
                      <span>{fmtMoney(g.saved)} saved ({Math.round(plan.progressPct)}%)</span>
                      <span>{plan.remaining > 0 ? `${fmtMoney(plan.remaining)} to go` : 'Goal reached'}</span>
                    </>
                  ) : null}
                </div>
                {milestone && <p className="mt-2 text-sm text-ok-ink">{milestone}</p>}
              </div>

              {/* Expanded detail -- three tabs: Progress, Tips, What-if */}
              {isExpanded && (
                <div className="border-t border-line">
                  <GoalTabBar goalId={g.id} active={tab} onSelect={(t) => setTab(g.id, t)} />

                  <div
                    id={`goal-panel-${g.id}-${tab}`}
                    role="tabpanel"
                    aria-labelledby={`goal-tab-${g.id}-${tab}`}
                    className="p-6"
                  >
                    {tab === 'progress' && (
                      <>
                        {isCreditType ? (
                          <CreditProgressPanel
                            g={g}
                            behaviorsCompleted={behaviorsCompleted}
                            onLogScore={logScore}
                            onRemoveScoreReading={removeScoreReading}
                            onToggleBehavior={toggleBehavior}
                          />
                        ) : plan ? (
                          <MoneyProgressPanel
                            g={g}
                            plan={plan}
                            surplus={surplus}
                            onLogContribution={logContribution}
                            onRemoveContribution={removeContribution}
                            onSetSaved={setSaved}
                          />
                        ) : null}
                      </>
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

                    {tab === 'whatif' && (
                      <WhatIfPanel
                        goal={g}
                        plan={plan ?? planGoal(g, profile)}
                        isCreditType={isCreditType}
                        surplus={surplus}
                      />
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">Add a goal</h2>
        <p className="text-xs text-ink-faint">
          Keep the name personal. "Europe summer 2027" beats "savings goal."
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <span className="text-xs font-medium text-ink-faint">Goal type</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {goalTypeKeys.map((t) => (
                <button
                  key={t}
                  onClick={() => setNewGoal({ ...newGoal, type: t })}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    newGoal.type === t
                      ? 'bg-brand text-on-brand border-brand'
                      : 'border-line text-ink-mid hover:border-brand hover:text-brand bg-surface'
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
              <span className="text-xs font-medium text-ink-faint">
                {newGoal.type === 'credit' ? 'Target score' : 'Amount'}
              </span>
              <input
                type="number"
                min={newGoal.type === 'credit' ? 300 : 0}
                max={newGoal.type === 'credit' ? 850 : undefined}
                value={newGoal.amount || ''}
                placeholder={newGoal.type === 'credit' ? '700' : '1200'}
                onChange={(e) => {
                  setCreditScoreError('')
                  setNewGoal({ ...newGoal, amount: Number(e.target.value) || 0 })
                }}
                className={`mt-1 w-full sm:w-24 rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${creditScoreError ? 'border-bad' : 'border-line-strong'}`}
              />
              {creditScoreError && (
                <p className="mt-1 text-xs text-bad">{creditScoreError}</p>
              )}
            </label>
            {newGoal.type === 'credit' && (
              <label className="block">
                <span className="text-xs font-medium text-ink-faint">Current score (optional)</span>
                <input
                  type="number"
                  min={300}
                  max={850}
                  value={newGoal.saved || ''}
                  placeholder="650"
                  onChange={(e) => setNewGoal({ ...newGoal, saved: Number(e.target.value) || 0 })}
                  className="mt-1 w-full sm:w-24 rounded-lg border border-line-strong px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </label>
            )}
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
          Goals with a weekly check-in are completed 60% more often. Set a recurring reminder to update your progress each week.
        </div>
      )}
    </div>
  )
}

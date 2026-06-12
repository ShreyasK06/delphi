import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { calculateScore } from '../lib/score'
import { buildBudget } from '../lib/budget'
import { emergencyPlan } from '../lib/emergency'
import { planGoal, milestoneMessage } from '../lib/goals'
import { suggestedVideos } from '../lib/videos'
import { fmtMoney } from '../types'
import ScoreCard from '../components/ScoreCard'
import BudgetTable from '../components/BudgetTable'
import VideoModuleCard from '../components/VideoModuleCard'
import { PencilIcon, TrendDownIcon, TargetIcon, TrendUpIcon, GiftIcon, TagIcon } from '../components/icons'
import PageNav from '../components/PageNav'

const NAV_SECTIONS = [
  { id: 'score', label: 'Score' },
  { id: 'budget', label: 'Budget' },
  { id: 'emergency', label: 'Emergency fund' },
  { id: 'tools', label: 'Tools' },
  { id: 'learning', label: 'Learning' },
]

const tools = [
  { to: '/debt', label: 'Debt Planner', desc: 'Avalanche vs. snowball', Icon: TrendDownIcon },
  { to: '/goals', label: 'Goals', desc: 'Track your targets', Icon: TargetIcon },
  { to: '/invest', label: 'Invest', desc: 'Start small, start now', Icon: TrendUpIcon },
  { to: '/extra-cash', label: 'Extra Cash', desc: 'Refund, gift, surplus', Icon: GiftIcon },
  { to: '/discounts', label: 'Discounts', desc: 'Your .edu email pays', Icon: TagIcon },
]

export default function Dashboard() {
  const { state } = useProfile()
  const { user } = useAuth()
  const navigate = useNavigate()
  if (!state) return null // route guard handles redirect

  const { profile, scoreHistory } = state
  const score = calculateScore(profile)
  const budget = buildBudget(profile)
  const ep = emergencyPlan(profile)
  const plans = profile.goals.map((g) => planGoal(g, profile))
  const milestones = plans.map(milestoneMessage).filter(Boolean) as string[]
  const dueSoon = plans.filter((p) => p.deadlineSoon)
  const stale = Date.now() - new Date(state.lastUpdated).getTime() > 30 * 24 * 60 * 60 * 1000
  const videos = suggestedVideos(profile, 3)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-ink-faint">
            Your score is at <strong className="text-ink-mid">{score.total}</strong>, pick up where you left off or update your numbers.
          </p>
        </div>
        <button
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink-mid hover:border-brand transition-colors"
        >
          <PencilIcon className="w-4 h-4" />
          Update my numbers
        </button>
      </header>

      {stale && (
        <div className="rounded-xl bg-warn-soft border border-warn-line px-4 py-3 text-sm text-warn-ink">
          It's been over a month since you updated your numbers. Income or expenses shift fast in
          college, a 2-minute refresh keeps your coaching accurate.
        </div>
      )}

      {dueSoon.map((p) => (
        <div key={p.goal.id} className="rounded-xl bg-info-soft border border-info-line px-4 py-3 text-sm text-info-ink">
          <strong>"{p.goal.name}"</strong> is due {p.monthsLeft <= 1 ? 'within a month' : `in ${p.monthsLeft} months`} and
          still needs {fmtMoney(p.remaining)}, that's {fmtMoney(p.weeklyNeeded)}/week from here.
        </div>
      ))}

      {milestones.map((m) => (
        <div key={m} className="rounded-xl bg-ok-soft border border-ok-line px-4 py-3 text-sm text-ok-ink">
          {m}
        </div>
      ))}

      <PageNav sections={NAV_SECTIONS} />

      {/* single-column feed per STYLEGUIDE.md: score, budget, emergency fund, tools, learning */}
      <section id="score" className="scroll-mt-6">
        <ScoreCard result={score} history={scoreHistory} />
      </section>

      <section id="budget" className="scroll-mt-6">
        <BudgetTable budget={budget} />
      </section>

      <div id="emergency" className="bg-surface rounded-2xl border border-line p-6 scroll-mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Emergency fund</h2>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-ink">{fmtMoney(ep.current)}</span>
          <span className="text-sm text-ink-faint">of {fmtMoney(ep.target)} {ep.microGoal ? 'starter goal' : '(1 month of essentials)'}</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full rounded-full bg-ok" style={{ width: `${Math.max(ep.pctFunded, 2)}%` }} />
        </div>
        {ep.gap > 0 ? (
          <p className="mt-2 text-sm text-ink-mid">
            {fmtMoney(ep.gap)} to go. Auto-save <strong>{fmtMoney(ep.weeklySave)}/week</strong> and
            you're covered in about {ep.weeksToTarget} weeks.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ok-ink">Fully funded, nice work. 🎉</p>
        )}
      </div>

      <div id="tools" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 scroll-mt-6">
        {tools.map(({ to, label, desc, Icon }) => (
          <Link key={to} to={to} className="bg-surface rounded-xl border border-line p-4 hover:border-brand transition-colors">
            <Icon className="w-5 h-5 text-brand" />
            <div className="mt-2 font-semibold text-sm text-ink">{label}</div>
            <div className="text-xs text-ink-faint">{desc}</div>
          </Link>
        ))}
      </div>

      {videos.length > 0 && (
        <section id="learning" className="scroll-mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-2">
            2-minute explainers picked for you
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videos.map((v) => <VideoModuleCard key={v.id} video={v} />)}
          </div>
        </section>
      )}
    </div>
  )
}

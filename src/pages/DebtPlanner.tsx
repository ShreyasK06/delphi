import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { compareStrategies, type PayoffResult } from '../lib/debt'
import { monthlySurplus, totalDebt, fmtMoney } from '../types'
import VideoModuleCard from '../components/VideoModuleCard'
import PageNav from '../components/PageNav'

const NAV_SECTIONS = [
  { id: 'strategy', label: 'Payoff strategy' },
  { id: 'debt-breakdown', label: 'Debt detail' },
  { id: 'debt-guide', label: 'Student debt guide' },
]
import { videoFor } from '../lib/videos'

function MethodCard({ result, title, tagline, highlight }: { result: PayoffResult; title: string; tagline: string; highlight: boolean }) {
  return (
    <div className={`bg-surface rounded-2xl border p-6 ${highlight ? 'border-brand ring-2 ring-brand-line' : 'border-line'}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink">{title}</h2>
        {highlight && (
          <span className="text-[11px] font-semibold bg-brand-line text-brand-ink rounded-full px-2.5 py-1">
            Cheapest
          </span>
        )}
      </div>
      <p className="text-xs text-ink-faint mt-0.5">{tagline}</p>
      {result.stalled ? (
        <p className="mt-4 text-sm text-bad">
          At this payment, balances can't outrun the interest. Raise the monthly amount.
        </p>
      ) : (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-faint">Debt-free in</dt>
            <dd className="font-semibold text-ink">
              {result.months} months{result.months >= 12 ? ` (~${(result.months / 12).toFixed(1)} yrs)` : ''}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-faint">Total interest</dt>
            <dd className="font-semibold text-ink">{fmtMoney(result.totalInterest)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-faint">Total paid</dt>
            <dd className="font-semibold text-ink">{fmtMoney(result.totalPaid)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-faint shrink-0">Payoff order</dt>
            <dd className="font-medium text-ink-mid text-right">{result.payoffOrder.join(' → ')}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

const borrowingHierarchy = [
  { rank: 1, label: 'Scholarships and grants', detail: 'Use first. Never need to be repaid.' },
  { rank: 2, label: 'Income', detail: 'Earnings from internships, part-time jobs, and summer work.' },
  { rank: 3, label: 'Federal student loans', detail: 'Generally the safest borrowing option. Lower rates, flexible repayment.' },
  { rank: 4, label: 'Private student loans', detail: 'Use only after exhausting federal options.' },
  { rank: 5, label: 'Credit cards', detail: 'Never use credit cards to pay for tuition or long-term expenses.' },
]

const quickRules = [
  { ok: true, rule: 'Pay credit cards in full every month' },
  { ok: true, rule: 'Prioritize scholarships and grants' },
  { ok: true, rule: 'Understand every loan before accepting it' },
  { ok: true, rule: 'Track total debt annually' },
  { ok: true, rule: 'Maintain emergency savings before borrowing more' },
  { ok: false, rule: 'Use credit cards for long-term borrowing' },
  { ok: false, rule: 'Ignore interest rates when choosing a loan' },
  { ok: false, rule: 'Borrow more than you need' },
  { ok: false, rule: 'Assume future income will solve debt problems' },
]

export default function DebtPlanner() {
  const { state } = useProfile()
  const [showGuide, setShowGuide] = useState(false)
  const profile = state?.profile
  const surplus = profile ? Math.max(monthlySurplus(profile), 25) : 100
  const [payment, setPayment] = useState(() => Math.round(surplus))
  if (!profile) return null

  const debts = profile.debt_breakdown
  const debtVideo = videoFor('debt')
  const loanVideo = videoFor('student-loans')

  if (debts.length === 0) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-ink">Debt Payoff Planner</h1>
          <p className="text-sm text-ink-faint">
            The goal is not to avoid all debt. It's to borrow only when necessary and graduate with
            manageable obligations.
          </p>
        </header>
        <div className="bg-surface rounded-2xl border border-line p-8 text-center">
          <p className="mt-2 font-semibold text-ink">You're debt-free.</p>
          <p className="mt-1 text-sm text-ink-faint">
            Nothing to plan here, that's a perfect 20/20 on the debt portion of your score. If you
            take on a loan later, add it via{' '}
            <Link to="/onboarding" className="text-brand font-medium">Update my numbers</Link>.
          </p>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-sm text-brand font-medium hover:text-brand-strong transition-colors"
        >
          {showGuide ? 'Hide' : 'Show'} student debt guide for future reference
        </button>
        {showGuide && <DebtGuide />}
      </div>
    )
  }

  const cmp = compareStrategies(debts, payment)
  const avalancheBest = cmp.avalanche.totalInterest <= cmp.snowball.totalInterest
  const graduatingSoon = profile.school_year === 'senior' || profile.school_year === 'grad'
  const hasStudentLoan = debts.some((d) => /student|loan/i.test(d.type))

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-ink">Debt Payoff Planner</h1>
        <p className="text-sm text-ink-faint">
          You owe {fmtMoney(totalDebt(profile))} across {debts.length}{' '}
          {debts.length === 1 ? 'balance' : 'balances'}, accruing about{' '}
          {fmtMoney(cmp.monthlyInterestNow)}/month in interest right now.
        </p>
      </header>

      <PageNav sections={NAV_SECTIONS} />

      <div className="rounded-xl bg-bad-soft border border-bad-line px-4 py-3 text-sm text-bad-ink">
        <strong>Credit card debt at 20-25% APR costs you more than any investment earns.</strong>{' '}
        Every dollar here before investing is a guaranteed return equal to your interest rate.
      </div>

      <div className="bg-surface rounded-2xl border border-line p-6">
        <label className="block text-sm font-medium text-ink-mid">
          Monthly amount you can put toward debt
          <span className="block text-xs font-normal text-ink-faint mt-0.5">
            Your budget surplus is about {fmtMoney(Math.max(monthlySurplus(profile), 0))}/month. Drag to test amounts.
          </span>
        </label>
        <div className="mt-3 flex items-center gap-4">
          <input
            type="range"
            min={25}
            max={Math.max(surplus * 3, 500)}
            step={5}
            value={payment}
            onChange={(e) => setPayment(Number(e.target.value))}
            className="flex-1 accent-brand"
          />
          <span className="font-bold text-ink w-24 text-right">{fmtMoney(payment)}/mo</span>
        </div>
      </div>

      <div id="strategy" className="grid md:grid-cols-2 gap-4 scroll-mt-6">
        <MethodCard
          result={cmp.avalanche}
          title="Avalanche"
          tagline="Highest interest rate first. Mathematically cheapest."
          highlight={avalancheBest}
        />
        <MethodCard
          result={cmp.snowball}
          title="Snowball"
          tagline="Smallest balance first. Fastest first win."
          highlight={!avalancheBest}
        />
      </div>

      <div className="rounded-xl bg-brand-soft border border-brand-line p-4 text-sm text-brand-ink">
        <strong>Which one?</strong>{' '}
        {cmp.avalancheSavings > 10 ? (
          <>
            Avalanche saves you {fmtMoney(cmp.avalancheSavings)} in interest. But if crossing a
            balance off the list is what keeps you going, snowball's early wins are worth that price.
            The best plan is the one you stick with.
          </>
        ) : (
          <>
            For your balances the two methods cost nearly the same. Go snowball and enjoy the early
            momentum.
          </>
        )}
      </div>

      {graduatingSoon && hasStudentLoan && (
        <div className="rounded-xl bg-warn-soft border border-warn-line p-4 text-sm text-warn-ink">
          <strong>Graduating soon?</strong> Federal student loans typically have a 6-month grace
          period after graduation before payments start. Interest may still accrue on unsubsidized
          loans during that window. Paying even small amounts during the grace period prevents
          capitalization.
        </div>
      )}

      <div id="debt-breakdown" className="grid sm:grid-cols-2 gap-3 scroll-mt-6">
        {debtVideo && <VideoModuleCard video={debtVideo} />}
        {hasStudentLoan && loanVideo && <VideoModuleCard video={loanVideo} />}
      </div>

      <div id="debt-guide" className="bg-surface rounded-2xl border border-line overflow-hidden scroll-mt-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-2 transition-colors"
        >
          <div>
            <span className="font-semibold text-sm text-ink">Student debt guide</span>
            <p className="text-xs text-ink-faint mt-0.5">Good debt vs bad debt, borrowing hierarchy, quick rules</p>
          </div>
          <span className="text-ink-faint">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="border-t border-line px-6 pb-6 pt-4">
            <DebtGuide />
          </div>
        )}
      </div>
    </div>
  )
}

function DebtGuide() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-ok-soft border border-ok-line p-4">
          <h3 className="font-semibold text-sm text-ok-ink">Good debt</h3>
          <p className="text-xs text-ok-ink/80 mt-1">Generally helps increase future earning potential.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-ok-ink">
            {['Federal student loans', 'Educational expenses', 'Professional certifications', 'Career-related investments'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-ok">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ok-ink/80">Lower rates, flexible repayment, potential long-term return.</p>
        </div>
        <div className="rounded-xl bg-bad-soft border border-bad-line p-4">
          <h3 className="font-semibold text-sm text-bad-ink">Bad debt</h3>
          <p className="text-xs text-bad-ink/80 mt-1">Finances short-term wants without creating future value.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-bad-ink">
            {['Credit card balances', 'Buy Now Pay Later purchases', 'High-interest personal loans', 'Financing unnecessary purchases'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span>✗</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-bad-ink/80">High rates, rapid balance growth, limited long-term benefit.</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">When paying for college, use this order</h3>
        <p className="text-xs text-ink-faint mt-0.5">The rule: use debt to invest in your future, not to fund your lifestyle.</p>
        <div className="mt-3 space-y-2">
          {borrowingHierarchy.map((item) => (
            <div key={item.rank} className="flex gap-3 items-start">
              <span className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
                item.rank <= 3 ? 'bg-ok-soft text-ok-ink' : 'bg-bad-soft text-bad-ink'
              }`}>
                {item.rank}
              </span>
              <div>
                <span className="text-sm font-medium text-ink">{item.label}</span>
                <span className="text-xs text-ink-faint ml-2">{item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">Quick rules</h3>
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          {quickRules.map((r) => (
            <div key={r.rule} className="flex items-center gap-2 text-sm">
              <span className={r.ok ? 'text-ok' : 'text-bad'}>{r.ok ? '✓' : '✗'}</span>
              <span className="text-ink-mid">{r.rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-surface-2 border border-line p-4">
        <h3 className="text-sm font-semibold text-ink">The number to know before graduation</h3>
        <p className="mt-2 text-sm text-ink-mid">
          A common guideline: don't borrow more than your expected first-year salary. If you expect
          to earn $60,000, keep total student debt under $60,000. This keeps monthly payments
          manageable after graduation.
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          Example: $25,000 at 5% over 10 years = ~$265/month. Always estimate the payment before
          accepting a loan.
        </p>
      </div>
    </div>
  )
}

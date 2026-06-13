import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { compareStrategies, type PayoffResult } from '../lib/debt'
import { monthlySurplus, totalDebt, fmtMoney } from '../types'
import VideoModuleCard from '../components/VideoModuleCard'
import Collapsible from '../components/Collapsible'
import { videoFor } from '../lib/videos'

interface MethodCardProps {
  result: PayoffResult
  title: string
  tagline: string
  highlight: boolean
}

function MethodCard({ result, title, tagline, highlight }: MethodCardProps) {
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
        <dl className="mt-4 space-y-2 text-sm tabular-nums">
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
      <div className="space-y-6">
        <header>
          <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">PAY DOWN</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Debt Payoff Planner</h1>
          <p className="text-sm text-ink-faint max-w-2xl mt-1">
            The goal is not to avoid all debt. It's to borrow only when necessary and graduate with manageable obligations.
          </p>
        </header>
        <div className="bg-surface rounded-2xl border border-line p-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center mx-auto mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="font-semibold text-ink">You're debt-free.</p>
          <p className="mt-1 text-sm text-ink-faint max-w-sm mx-auto leading-relaxed">
            That's a perfect 20/20 on the debt portion of your score. If you take on a loan later, add it via{' '}
            <Link to="/onboarding" className="text-brand font-medium hover:text-brand-strong transition-colors">Update my numbers</Link>.
          </p>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="mt-4 inline-block rounded-xl bg-brand text-on-brand px-5 py-2 text-sm font-semibold hover:bg-brand-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {showGuide ? 'Hide' : 'Read'} the student debt guide
          </button>
        </div>
        {showGuide && <DebtGuide />}
      </div>
    )
  }

  const cmp = compareStrategies(debts, payment)
  const avalancheBest = cmp.avalanche.totalInterest <= cmp.snowball.totalInterest
  const graduatingSoon = profile.school_year === 'senior' || profile.school_year === 'grad'
  const hasStudentLoan = debts.some((d) => /student|loan/i.test(d.type))

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">PAY DOWN</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Debt Payoff Planner</h1>
        <p className="text-sm text-ink-faint max-w-2xl mt-1">
          You owe {fmtMoney(totalDebt(profile))} across {debts.length}{' '}
          {debts.length === 1 ? 'balance' : 'balances'}, accruing about{' '}
          {fmtMoney(cmp.monthlyInterestNow)}/month in interest right now.
        </p>
      </header>

      <div className="rounded-xl bg-bad-soft border border-bad-line px-4 py-3 text-sm text-bad-ink">
        <strong>Credit card debt at 20-25% APR costs you more than any investment earns.</strong>{' '}
        Every dollar here before investing is a guaranteed return equal to your interest rate.
      </div>

      {/* Monthly payment slider */}
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
          <span className="font-display text-lg font-bold text-ink w-28 text-right tabular-nums">
            {fmtMoney(payment)}/mo
          </span>
        </div>
      </div>

      {/* Strategy cards */}
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

      {/* Student debt guide as accordion -- reference content with tinted background */}
      <div id="debt-guide" className="scroll-mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint px-1 mb-3">
          Student debt guide
        </h2>
        <p className="text-xs text-ink-faint px-1 mb-2">Tap any section to read the detail.</p>
        <DebtGuide />
      </div>
    </div>
  )
}

function DebtGuide() {
  return (
    <div className="space-y-2">
      {/* Step 1: Good vs bad debt */}
      <Collapsible
        title="Good debt vs bad debt"
        summary="Borrow to invest in your future, not your lifestyle"
        defaultOpen={true}
      >
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
      </Collapsible>

      {/* Step 2: Borrowing hierarchy */}
      <Collapsible
        title="When paying for college, use this order"
        summary="Scholarships first, income second, credit cards never"
      >
        <p className="text-xs text-ink-faint mb-3">The rule: use debt to invest in your future, not to fund your lifestyle.</p>
        <div className="space-y-2">
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
      </Collapsible>

      {/* Step 3: Credit card warning */}
      <Collapsible
        title="Credit card debt warning"
        summary="25% APR turns $2,000 into a long-term problem fast"
      >
        <div className="rounded-xl bg-bad-soft border border-bad-line p-4">
          <p className="text-sm text-bad-ink/90">
            Credit cards are not a borrowing tool for tuition or living expenses. A $2,000 balance
            at 25% APR costs about $500 per year in interest alone, and the balance can grow faster
            than you can pay it down if you only make minimum payments.
          </p>
          <p className="mt-2 text-xs text-bad-ink/80">
            Rule: if you carry a credit card balance, eliminate it before investing in anything.
            Paying off 25% APR debt is a guaranteed 25% return.
          </p>
        </div>
      </Collapsible>

      {/* Step 4: Emergency fund */}
      <Collapsible
        title="Build an emergency fund before new debt"
        summary="A $500 buffer prevents most student financial emergencies"
      >
        <div className="rounded-xl bg-warn-soft border border-warn-line p-4">
          <p className="text-sm text-warn-ink/90">
            Start with a $500 to $1,000 cash cushion in a separate savings account before accepting
            any new loan. Without a buffer, one unexpected expense forces you onto a credit card,
            turning a manageable situation into an expensive one.
          </p>
          <p className="mt-2 text-xs text-warn-ink/80">
            Long-term target: 3 to 6 months of essential expenses. Work toward this after high-interest
            debt is cleared.
          </p>
        </div>
      </Collapsible>

      {/* Step 5: Know your payments */}
      <Collapsible
        title="Know your future loan payments before you borrow"
        summary="Don't borrow more than your expected first-year salary"
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-surface-2 border border-line p-4">
            <p className="text-sm text-ink-mid">
              Do not borrow more than your expected first-year salary. If you expect to earn $60,000,
              keep total student debt under $60,000. This keeps monthly payments manageable after
              graduation.
            </p>
            <p className="mt-2 text-sm text-ink-mid">
              Before accepting any loan, calculate the real monthly cost. Example: $25,000 at 5% over
              10 years is about $265/month. Ask yourself: can I afford this payment on my expected
              starting salary?
            </p>
          </div>
        </div>
      </Collapsible>

      {/* Step 6: Strategy in school */}
      <Collapsible
        title="Strategy while you are still in school"
        summary="Accept only what you need, pay interest on unsubsidized loans"
      >
        <div className="space-y-2">
          {[
            'Accept only what you need, not the full amount offered',
            'Pay interest on unsubsidized loans while in school to prevent capitalization',
            'Keep a record of every loan: lender, balance, rate, and repayment terms',
            'Maximize scholarships, grants, and work-study before borrowing',
            'Avoid private loans unless federal options are fully exhausted',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-ink-mid">
              <span className="text-ok mt-0.5 shrink-0">&#10003;</span>
              {item}
            </div>
          ))}
        </div>
      </Collapsible>

      {/* Step 7: Strategy after graduation */}
      <Collapsible
        title="Strategy after graduation"
        summary="Income-driven repayment, autopay discount, attack private loans"
      >
        <div className="space-y-2">
          {[
            'Enroll in income-driven repayment if your federal loan payments exceed 10% of take-home pay',
            'Set up autopay for a 0.25% rate reduction on federal loans',
            'Attack high-interest private loans aggressively using the avalanche method',
            'Look into Public Service Loan Forgiveness if you work for government or a non-profit',
            'Refinance private loans only after you have a stable income and emergency fund',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-ink-mid">
              <span className="text-ok mt-0.5 shrink-0">&#10003;</span>
              {item}
            </div>
          ))}
        </div>
      </Collapsible>

      {/* Step 8: Quick rules */}
      <Collapsible
        title="Quick rules"
        summary="The dos and don'ts at a glance"
      >
        <div className="grid sm:grid-cols-2 gap-2">
          {quickRules.map((r) => (
            <div key={r.rule} className="flex items-center gap-2 text-sm">
              <span className={r.ok ? 'text-ok' : 'text-bad'}>{r.ok ? '✓' : '✗'}</span>
              <span className="text-ink-mid">{r.rule}</span>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* Step 9: 5-step formula */}
      <Collapsible
        title="The 5-step student debt formula"
        summary="List every debt, cover minimums, build a buffer, attack the worst rate, then invest"
      >
        <div className="rounded-xl bg-brand-soft border border-brand-line p-4">
          <div className="space-y-2">
            {[
              'List every debt you have with its balance, interest rate, and minimum payment.',
              'Cover all minimum payments first, every month, without exception.',
              'Build a $500 to $1,000 emergency fund before sending extra money to debt.',
              'Direct every extra dollar to the highest-rate balance (avalanche) or smallest balance (snowball).',
              'Once debt is cleared, redirect that same payment amount to your savings and investments.',
            ].map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-line text-brand-ink text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-brand-ink/90 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-brand-ink font-medium">
            The best debt strategy is having debt that remains manageable while helping you achieve
            your educational and career goals.
          </p>
        </div>
      </Collapsible>
    </div>
  )
}

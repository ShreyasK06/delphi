import { useMemo, useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { fmtMoney } from '../types'
import PageNav from '../components/PageNav'

// ── content (from the product spec) ─────────────────────────────────────────

const conceptCards = [
  {
    title: 'What is a stock?',
    body: 'A fractional ownership stake in a company. Owning a share means owning a small piece of that company\'s assets and future earnings.',
    why: 'You are buying a business, not a lottery ticket.',
  },
  {
    title: 'What is an index fund?',
    body: 'One fund that holds every stock in an index, like all 500 companies in the S&P 500. Historical average return is about 10% a year before inflation, 7% after.',
    why: 'No stock picker reliably beats it long term, including the pros.',
  },
  {
    title: 'What is an ETF?',
    body: 'An index fund that trades like a regular stock. VTI, VOO, and FXAIX are the classic starting points with expense ratios near 0.03%.',
    why: 'One purchase buys you hundreds of companies.',
  },
  {
    title: 'What is an expense ratio?',
    body: 'The annual fee a fund charges. 0.04% on $10,000 costs $4 a year. 1% costs $100 a year and can exceed $100,000 in lost returns over 40 years.',
    why: 'Never pay above 0.2% without a specific reason.',
  },
]

const platforms = [
  { name: 'Fidelity', minimum: 'None', fractional: 'Yes', roth: 'Yes', bestFor: 'Best overall for beginners' },
  { name: 'Charles Schwab', minimum: 'None', fractional: 'Yes', roth: 'Yes', bestFor: 'Strong all-rounder, good research' },
  { name: 'Vanguard', minimum: 'None', fractional: 'Limited', roth: 'Yes', bestFor: 'Long-term index investors' },
  { name: 'Robinhood', minimum: 'None', fractional: 'Yes', roth: 'Yes', bestFor: 'Later supplement, not a starting point' },
  { name: 'Public', minimum: 'None', fractional: 'Yes', roth: 'No', bestFor: 'Social and educational framing' },
]

const startingSteps = [
  {
    action: 'Open a Roth IRA at Fidelity or Schwab',
    detail: 'Contribute any amount, even $25 a month. Put it in a target-date fund or VOO/VTI and automate the contribution.',
  },
  {
    action: 'Add a taxable brokerage account once the habit sticks',
    detail: 'Same institution, opened only after Roth IRA contributions are automated and you want to invest beyond retirement.',
  },
  {
    action: 'Only then consider individual stocks',
    detail: 'Cap them at 10-15% of your investable money, and only after you understand index funds.',
  },
]

const chartPatterns = [
  {
    name: 'Support and resistance',
    signal: 'medium',
    body: 'Price levels where a stock has historically stopped falling (support) or rising (resistance). Widely watched, somewhat self-fulfilling, never guaranteed.',
  },
  {
    name: 'Moving averages',
    signal: 'medium',
    body: 'A stock above its 200-day average is in a longer-term uptrend. The 50-day crossing above it (golden cross) reads bullish, crossing below (death cross) reads bearish. Lagging, not predictive.',
  },
  {
    name: 'Volume',
    signal: 'high',
    body: 'A price move on heavy volume means more than the same move on light volume. A breakout on three times average volume is far more credible.',
  },
  {
    name: 'RSI',
    signal: 'low',
    body: 'Momentum gauge. Above 70 suggests overbought, below 30 suggests oversold. Useful as a secondary confirmation, weak as a standalone signal.',
  },
  {
    name: 'Earnings surprises',
    signal: 'high',
    body: 'Prices gap on earnings reports. Holding individual stocks through earnings without knowing the expectations is high risk for beginners.',
  },
] as const

const behavioralTraps = [
  {
    name: 'FOMO buying',
    looks: 'Buying after a stock already ran up because social media is talking about it.',
    antidote: 'By the time you hear about the move, it has usually already happened.',
  },
  {
    name: 'Panic selling',
    looks: 'Selling during a downturn and locking in the loss.',
    antidote: 'Every crash so far has been followed by a recovery above the old high. Keep contributing instead.',
  },
  {
    name: 'Confirmation bias',
    looks: 'Reading only the positive coverage of a stock you already like.',
    antidote: 'Actively hunt for the bear case before you buy.',
  },
  {
    name: 'Overtrading',
    looks: 'Frequent buying and selling that feels productive.',
    antidote: 'Fees, spreads, and taxes eat returns. Index investors can go years without a taxable event.',
  },
  {
    name: 'Meme stocks and crypto',
    looks: 'Big positions in whatever is loud this month.',
    antidote: 'If you want the learning experience, cap it at 2-5% of your investable money.',
  },
]

const growthTable = [
  { monthly: 25, at65: 80000 },
  { monthly: 50, at65: 160000 },
  { monthly: 100, at65: 320000 },
  { monthly: 200, at65: 640000 },
]

const sections = [
  { id: 'retirement', label: 'Retirement accounts' },
  { id: 'stocks', label: 'Stocks and funds' },
  { id: 'horizon', label: 'Long vs short term' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'how-much', label: 'How much and how often' },
]

const signalStyles: Record<string, string> = {
  high: 'bg-ok-soft text-ok-ink',
  medium: 'bg-warn-soft text-warn-ink',
  low: 'bg-info-soft text-info-ink',
}

// ── helpers ──────────────────────────────────────────────────────────────────

function dcaProjection(monthly: number, startAge: number, retireAge = 65, annualRate = 0.07) {
  const months = Math.max((retireAge - startAge) * 12, 0)
  const r = annualRate / 12
  const futureValue = months === 0 ? 0 : monthly * ((Math.pow(1 + r, months) - 1) / r)
  const contributed = monthly * months
  return { futureValue, contributed, growth: Math.max(futureValue - contributed, 0) }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{children}</h2>
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function Invest() {
  const { state } = useProfile()
  const [account, setAccount] = useState<'roth' | '401k'>('roth')
  const [dcaMonthly, setDcaMonthly] = useState(50)
  const [dcaAge, setDcaAge] = useState(20)

  const profile = state?.profile
  const income = profile?.monthly_income ?? 0
  const tier: 0 | 1 | 2 = income > 1500 ? 2 : income >= 500 ? 1 : 0

  const hasHighAprDebt = (profile?.debt_breakdown ?? []).some((d) => d.rate >= 8)
  const ladder = [
    {
      label: 'Emergency fund',
      note: 'At least two weeks of expenses set aside',
      done: (profile?.emergency_fund ?? 0) >= 500,
    },
    {
      label: 'Clear high-APR debt',
      note: 'Anything above 8-10% APR beats market returns',
      done: !hasHighAprDebt,
    },
    {
      label: 'Roth IRA',
      note: 'Any amount counts, even $25 a month',
      done: profile?.has_retirement_account ?? false,
    },
    {
      label: '401k match',
      note: 'First move after graduation, it is free money',
      done: false,
    },
    {
      label: 'Taxable brokerage',
      note: 'Once the Roth habit is automated',
      done: false,
    },
  ]

  const dca = useMemo(() => dcaProjection(dcaMonthly, dcaAge), [dcaMonthly, dcaAge])
  const decades = useMemo(() => {
    const out: { age: number; contributed: number; growth: number }[] = []
    for (let age = dcaAge + 10; age <= 65; age += 10) {
      const p = dcaProjection(dcaMonthly, dcaAge, age)
      out.push({ age, contributed: p.contributed, growth: p.growth })
    }
    return out
  }, [dcaMonthly, dcaAge])
  const decadeMax = decades.length > 0 ? decades[decades.length - 1].contributed + decades[decades.length - 1].growth : 1

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-ink">Invest</h1>
        <p className="text-sm text-ink-faint">
          Time is the asset. A 20-year-old investing $50 a month has a structural advantage over a
          35-year-old investing $500, because of compounding.
        </p>
      </header>

      {/* Priority ladder */}
      <div className="bg-surface rounded-2xl border border-line p-6">
        <SectionLabel>Do these in order</SectionLabel>
        <p className="mt-1 text-xs text-ink-faint">
          The order of operations before any money touches the market. Steps light up as your
          profile covers them.
        </p>
        <div className="mt-4 space-y-3">
          {ladder.map((step, i) => (
            <div key={step.label} className="flex gap-3 items-start">
              <span
                className={`shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
                  step.done ? 'bg-ok text-on-brand' : 'bg-surface-2 border border-line-strong text-ink-faint'
                }`}
              >
                {step.done ? '✓' : i + 1}
              </span>
              <div>
                <p className={`text-sm font-semibold ${step.done ? 'text-ok-ink' : 'text-ink'}`}>{step.label}</p>
                <p className="text-sm text-ink-mid">{step.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The most persuasive stat */}
      <div className="rounded-xl bg-brand-soft border border-brand-line p-5">
        <h3 className="font-semibold text-sm text-brand-ink">The ten-year delay that costs $168,000</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="font-display text-3xl font-bold text-brand-ink tabular-nums">$320,000</div>
            <p className="text-xs text-brand-ink/80">$100/month starting at age 20, by 65 at 7% average return</p>
          </div>
          <div>
            <div className="font-display text-3xl font-bold text-brand-ink tabular-nums">$152,000</div>
            <p className="text-xs text-brand-ink/80">The same $100/month starting at age 30</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-brand-ink">
          The ten-year head start contributes only $12,000 more out of pocket. Compounding does the rest.
        </p>
      </div>

      <PageNav sections={sections} />

      {/* ── Section 1: retirement accounts ── */}
      <section id="retirement" className="bg-surface rounded-2xl border border-line p-6 scroll-mt-6">
        <SectionLabel>Retirement accounts</SectionLabel>
        <p className="mt-1 text-xs text-ink-faint">
          The most ignored section at 20 and the highest-return one. Pick an account type to compare.
        </p>

        <div className="mt-4 inline-flex rounded-xl border border-line-strong p-1 gap-1">
          <button
            onClick={() => setAccount('roth')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              account === 'roth' ? 'bg-brand text-on-brand' : 'text-ink-mid hover:text-ink'
            }`}
          >
            Roth IRA
          </button>
          <button
            onClick={() => setAccount('401k')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              account === '401k' ? 'bg-brand text-on-brand' : 'text-ink-mid hover:text-ink'
            }`}
          >
            401k
          </button>
        </div>

        {account === 'roth' ? (
          <div className="mt-5 space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-2 border border-line p-4">
                <div className="text-xs uppercase tracking-wide text-ink-faint">2026 contribution limit</div>
                <div className="mt-1 text-lg font-bold text-ink">$7,000/yr</div>
                <p className="text-xs text-ink-faint">About $583/month, and never more than you earned that year</p>
              </div>
              <div className="rounded-xl bg-surface-2 border border-line p-4">
                <div className="text-xs uppercase tracking-wide text-ink-faint">Tax treatment</div>
                <div className="mt-1 text-lg font-bold text-ink">Pay tax now, never again</div>
                <p className="text-xs text-ink-faint">After-tax dollars in, tax-free growth and withdrawals in retirement</p>
              </div>
              <div className="rounded-xl bg-surface-2 border border-line p-4">
                <div className="text-xs uppercase tracking-wide text-ink-faint">Withdrawal rule</div>
                <div className="mt-1 text-lg font-bold text-ink">Contributions stay accessible</div>
                <p className="text-xs text-ink-faint">Principal can come out anytime without penalty, only growth is locked until 59½</p>
              </div>
              <div className="rounded-xl bg-surface-2 border border-line p-4">
                <div className="text-xs uppercase tracking-wide text-ink-faint">Who it suits</div>
                <div className="mt-1 text-lg font-bold text-ink">Students, almost always</div>
                <p className="text-xs text-ink-faint">Low income now means a low tax rate now, the ideal time to pay it</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink">Where to open one</h3>
              <p className="text-sm text-ink-mid mt-1">
                Fidelity, Schwab, and Vanguard all offer Roth IRAs with no minimums and no fees on
                index funds. Fidelity and Schwab support fractional shares, which helps when you are
                starting with small amounts.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink">What to invest in, inside it</h3>
              <p className="text-sm text-ink-mid mt-1">
                A single target-date fund matching your expected retirement year (a 22-year-old in
                2026 picks a 2068 or 2070 fund) handles allocation and rebalancing automatically.
                That is the right answer for most students who do not want to think about it further.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-ink">The employer match is free money</h3>
              <p className="text-sm text-ink-mid mt-1">
                If an employer matches 50% of contributions up to 6% of salary, contributing 6% of a
                $50,000 salary ($3,000/yr) earns an extra $1,500 from the employer. That is a
                guaranteed 50% return before any market gains. Not capturing the full match leaves
                free money on the table.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-2 border border-line p-4">
                <div className="text-xs uppercase tracking-wide text-ink-faint">2026 contribution limit</div>
                <div className="mt-1 text-lg font-bold text-ink">$23,500/yr</div>
                <p className="text-xs text-ink-faint">Pre-tax dollars, through an employer plan</p>
              </div>
              <div className="rounded-xl bg-surface-2 border border-line p-4">
                <div className="text-xs uppercase tracking-wide text-ink-faint">Traditional vs Roth 401k</div>
                <div className="mt-1 text-lg font-bold text-ink">Roth, early career</div>
                <p className="text-xs text-ink-faint">Same after-tax logic as the Roth IRA while your bracket is low</p>
              </div>
            </div>
            <div className="rounded-xl bg-info-soft border border-info-line px-4 py-3 text-sm text-info-ink">
              Order of operations after graduation: contribute enough for the full employer match
              first, then max the Roth IRA, then come back to the 401k if you still have room.
            </div>
          </div>
        )}
      </section>

      {/* ── Section 2: stocks and funds ── */}
      <section id="stocks" className="scroll-mt-6 space-y-3">
        <div>
          <SectionLabel>Stocks and funds</SectionLabel>
          <p className="mt-0.5 text-xs text-ink-faint">
            Not to make you a stock picker. To make sure you know what you are buying before you buy it.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {conceptCards.map((c) => (
            <div key={c.title} className="bg-surface rounded-xl border border-line p-4">
              <h3 className="font-semibold text-sm text-ink">{c.title}</h3>
              <p className="mt-1 text-sm text-ink-mid">{c.body}</p>
              <p className="mt-2 text-xs font-medium text-brand">{c.why}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6 overflow-x-auto">
          <SectionLabel>Where to actually buy</SectionLabel>
          <table className="w-full mt-3 text-sm">
            <thead>
              <tr className="text-xs text-ink-faint uppercase tracking-wide">
                <th className="text-left font-medium pb-1">Platform</th>
                <th className="text-left font-medium pb-1">Minimum</th>
                <th className="text-left font-medium pb-1">Fractional</th>
                <th className="text-left font-medium pb-1">Roth IRA</th>
                <th className="text-left font-medium pb-1">Best for</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p) => (
                <tr key={p.name} className="border-t border-line">
                  <td className="py-2.5 pr-3 font-medium text-ink">{p.name}</td>
                  <td className="py-2.5 pr-3 text-ink-mid">{p.minimum}</td>
                  <td className="py-2.5 pr-3 text-ink-mid">{p.fractional}</td>
                  <td className="py-2.5 pr-3 text-ink-mid">{p.roth}</td>
                  <td className="py-2.5 text-ink-faint">{p.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6">
          <SectionLabel>Starting from zero, in order</SectionLabel>
          <div className="mt-4 space-y-3">
            {startingSteps.map((s, i) => (
              <div key={s.action} className="flex gap-3 items-start">
                <span className="shrink-0 w-7 h-7 rounded-full bg-brand-soft text-brand text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{s.action}</p>
                  <p className="text-sm text-ink-mid">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: long vs short term ── */}
      <section id="horizon" className="scroll-mt-6 space-y-3">
        <div>
          <SectionLabel>Long term vs short term</SectionLabel>
          <p className="mt-0.5 text-xs text-ink-faint">The five-year line decides where the money goes.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-surface rounded-2xl border border-line p-5">
            <span className="inline-block rounded-full bg-ok-soft text-ok-ink px-2.5 py-0.5 text-xs font-medium">5+ years</span>
            <h3 className="mt-2 font-semibold text-sm text-ink">Buy and hold</h3>
            <p className="mt-1 text-sm text-ink-mid">
              Broad index funds held through every dip. Selling in a downturn locks in the loss,
              holding through it has historically recovered and then some.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-mid">
              <li>• Core: VTI or VOO (60-80%)</li>
              <li>• International like VXUS (10-20%)</li>
              <li>• Bonds like BND as the goal gets closer</li>
            </ul>
            <p className="mt-3 text-xs text-ink-faint">
              Tax bonus: in the 10-12% bracket, long-term capital gains are taxed at 0%.
            </p>
          </div>
          <div className="bg-surface rounded-2xl border border-line p-5">
            <span className="inline-block rounded-full bg-info-soft text-info-ink px-2.5 py-0.5 text-xs font-medium">Under 5 years</span>
            <h3 className="mt-2 font-semibold text-sm text-ink">Keep it out of stocks</h3>
            <p className="mt-1 text-sm text-ink-mid">
              Money for a down payment, grad school, or a major purchase cannot ride out a 30% down
              year. The risk tolerance for short-term money is zero.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-mid">
              <li>• High-yield savings (4-5% APY)</li>
              <li>• Money market funds</li>
              <li>• Treasury bills and CDs for fixed dates</li>
            </ul>
            <p className="mt-3 text-xs text-ink-faint">
              An emergency fund in stocks during a crash forces selling at a loss.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-warn-soft border border-warn-line px-4 py-3 text-sm text-warn-ink">
          <strong>Before you try day trading:</strong> more than 70% of active traders underperform a
          simple index fund over five years, and short-term gains are taxed as ordinary income. If
          you want to learn by doing, paper trade with fake money first, and only consider real
          money after six months of consistent paper profits.
        </div>
      </section>

      {/* ── Section 4: patterns ── */}
      <section id="patterns" className="scroll-mt-6 space-y-3">
        <div>
          <SectionLabel>Patterns worth knowing</SectionLabel>
          <p className="mt-0.5 text-xs text-ink-faint">
            What actually moves prices, and the psychology that loses students money.
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6">
          <h3 className="text-sm font-semibold text-ink">Market and chart patterns</h3>
          <div className="mt-3 space-y-3">
            {chartPatterns.map((p) => (
              <div key={p.name} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{p.name}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${signalStyles[p.signal]}`}>
                    {p.signal} signal
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-mid">{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6">
          <h3 className="text-sm font-semibold text-ink">Behavioral traps</h3>
          <p className="mt-1 text-xs text-ink-faint">These are risks, not tools. Each one has a one-line antidote.</p>
          <div className="mt-3 space-y-3">
            {behavioralTraps.map((t) => (
              <div key={t.name} className="rounded-xl bg-surface-2 border border-line p-4">
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <p className="mt-0.5 text-sm text-ink-mid">{t.looks}</p>
                <p className="mt-1 text-xs font-medium text-brand">{t.antidote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: how much and how often ── */}
      <section id="how-much" className="scroll-mt-6 space-y-3">
        <div>
          <SectionLabel>How much and how often</SectionLabel>
          <p className="mt-0.5 text-xs text-ink-faint">
            {income > 0
              ? `Based on your ${fmtMoney(income)}/month income, your tier is highlighted.`
              : 'Add your income in the Budget page to highlight your tier.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[
            {
              label: 'Under $500/mo',
              amount: '$25-$50/month',
              where: 'All of it into a Roth IRA target-date fund',
              note: 'Habit formation matters more than the amount at this stage.',
            },
            {
              label: '$500-$1,500/mo',
              amount: '$50-$150/month',
              where: 'Aim for 10% of take-home, all into the Roth IRA',
              note: 'Adjust down if rent or loan payments make 10% impossible.',
            },
            {
              label: 'Over $1,500/mo',
              amount: '$150-$400/month',
              where: 'Max the Roth IRA first, then a taxable brokerage',
              note: 'Internship and co-op money is the classic source here.',
            },
          ].map((t, i) => (
            <div
              key={t.label}
              className={`bg-surface rounded-2xl p-5 border ${
                income > 0 && tier === i ? 'border-brand ring-1 ring-brand' : 'border-line'
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-ink-faint">{t.label}</div>
              <div className="mt-1 text-lg font-bold text-ink">{t.amount}</div>
              <p className="mt-1 text-sm text-ink-mid">{t.where}</p>
              <p className="mt-2 text-xs text-ink-faint">{t.note}</p>
              {income > 0 && tier === i && (
                <span className="mt-3 inline-block rounded-full bg-brand-soft text-brand-ink px-2.5 py-0.5 text-xs font-medium">
                  Your tier
                </span>
              )}
            </div>
          ))}
        </div>

        {/* DCA calculator */}
        <div className="bg-surface rounded-2xl border border-line p-6">
          <SectionLabel>What your monthly amount becomes</SectionLabel>
          <p className="mt-1 text-xs text-ink-faint">
            Dollar-cost averaging: the same amount every month, automated, regardless of what the
            market is doing. Assumes a 7% average annual return.
          </p>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm text-ink-mid">Monthly contribution</label>
                <span className="text-xs text-ink-faint">{fmtMoney(dcaMonthly)}/mo</span>
              </div>
              <input
                type="range"
                min={10}
                max={600}
                step={5}
                value={dcaMonthly}
                onChange={(e) => setDcaMonthly(Number(e.target.value))}
                className="mt-1 w-full accent-brand cursor-pointer"
                aria-label="Monthly contribution slider"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm text-ink-mid">Starting age</label>
                <span className="text-xs text-ink-faint">{dcaAge}</span>
              </div>
              <input
                type="range"
                min={18}
                max={40}
                step={1}
                value={dcaAge}
                onChange={(e) => setDcaAge(Number(e.target.value))}
                className="mt-1 w-full accent-brand cursor-pointer"
                aria-label="Starting age slider"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <div className="font-display text-4xl font-bold text-ink tabular-nums tracking-tight">{fmtMoney(dca.futureValue)}</div>
              <div className="text-xs text-ink-faint">projected at age 65</div>
            </div>
            <div className="text-sm text-ink-mid">
              {fmtMoney(dca.contributed)} contributed + {fmtMoney(dca.growth)} growth
            </div>
          </div>

          {decades.length > 0 && (
            <div className="mt-4 space-y-2">
              {decades.map((d) => (
                <div key={d.age} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-ink-faint">Age {d.age}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full bg-brand-line"
                      style={{ width: `${(d.contributed / decadeMax) * 100}%` }}
                    />
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${(d.growth / decadeMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-ink-mid">
                    {fmtMoney(d.contributed + d.growth)}
                  </span>
                </div>
              ))}
              <div className="flex gap-4 pt-1 text-xs text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-line" /> contributed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand" /> growth
                </span>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-ink-faint">
            The single most important rule: never stop contributing during a downturn. Those are the
            months your fixed amount buys the most shares.
          </p>
        </div>

        {/* Rule of thumb */}
        <div className="rounded-xl bg-brand-soft border border-brand-line p-5">
          <h3 className="font-semibold text-sm text-brand-ink">The rule of thumb that covers most situations</h3>
          <p className="mt-2 text-sm text-brand-ink">
            Invest at least 10% of every dollar you earn. Earning $800/month means $80: put $50 on
            an automated monthly schedule into a Roth IRA, hold $30 in high-yield savings toward a
            brokerage account once it reaches $500. Scale the proportions as income grows. A
            windfall (tax refund, gift, sold item) can go in as a lump sum, which historically beats
            drip-feeding it about two-thirds of the time.
          </p>
        </div>

        {/* Compound table */}
        <div className="bg-surface rounded-2xl border border-line p-6 overflow-x-auto">
          <SectionLabel>From age 20 to 65 at 7%</SectionLabel>
          <table className="w-full mt-3 text-sm">
            <thead>
              <tr className="text-xs text-ink-faint uppercase tracking-wide">
                <th className="text-left font-medium pb-1">Monthly</th>
                <th className="text-right font-medium pb-1">At age 65</th>
              </tr>
            </thead>
            <tbody>
              {growthTable.map((g) => (
                <tr key={g.monthly} className="border-t border-line">
                  <td className="py-2.5 pr-3 text-ink-mid">{fmtMoney(g.monthly)}/month</td>
                  <td className="py-2.5 text-right font-medium text-ink">about {fmtMoney(g.at65)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink-faint">
            Assumes no increase in contributions over time. Starting at $50 and raising it as income
            grows will land well above these figures.
          </p>
        </div>
      </section>

      {/* Bottom banner */}
      <div className="rounded-2xl bg-brand-soft border border-brand-line p-6 text-center">
        <p className="font-display text-lg font-bold text-brand-ink">
          The best time to start was yesterday. The second best time is today.
        </p>
        <a
          href="https://www.fidelity.com/retirement-ira/roth-ira"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block rounded-xl bg-brand text-on-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-strong transition-colors"
        >
          Open a Roth IRA
        </a>
      </div>

      <p className="text-xs text-ink-faint">
        Educational content, not personalized financial advice. Returns shown use historical
        averages and are not guaranteed. Contribution limits are for 2026 and change over time.
      </p>
    </div>
  )
}

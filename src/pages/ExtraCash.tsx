import { useState } from 'react'

interface SpecialSituation {
  title: string
  description: string
  tips: string[]
}

const specialSituations: SpecialSituation[] = [
  {
    title: 'FAFSA refund',
    description: 'Federal aid that exceeds tuition is disbursed directly to you. It feels like income but it is a loan — treat it as tuition money, not spending money.',
    tips: [
      'Hold it in a separate account so you cannot accidentally spend it.',
      'If you genuinely have excess, apply it to next semester\'s costs before anything else.',
      'Never invest borrowed money — if the market drops you still owe the loan.',
    ],
  },
  {
    title: 'Scholarship overage',
    description: 'Scholarships that exceed direct education costs are often taxable. The portion not used for tuition, fees, and required course materials counts as income.',
    tips: [
      'Set aside 15-25% of the excess for taxes if the scholarship is merit-based and taxable.',
      'Check the scholarship terms: some restrict how excess funds can be used.',
      'Apply surplus to living costs before drawing on savings or taking on more debt.',
    ],
  },
  {
    title: 'Tax refund',
    description: 'Especially common in your first year of earning. The refund is not a bonus — it is your own money the government held interest-free. Do not treat it as a windfall.',
    tips: [
      'Build or top off your emergency fund first.',
      'If you have credit card debt, put the full refund toward the highest-rate balance.',
      'If no debt and fund is full, this is your best opportunity to open or contribute to a Roth IRA.',
    ],
  },
  {
    title: 'Internship bonus or signing bonus',
    description: 'A signing or completion bonus is compensation and will be taxed as income. Make sure you budget for the tax bill before spending.',
    tips: [
      'Hold 25-30% in cash if no taxes were withheld at the time of payment.',
      'After taxes are covered, treat the rest like any other windfall: 50/30/20.',
      'Resist lifestyle inflation — this money should increase your net worth, not your monthly spending.',
    ],
  },
]

const priorityList = [
  { rank: 1, item: 'Cover any immediate essentials', detail: 'Rent due, medication, food — handle non-negotiables first.' },
  { rank: 2, item: 'Build a one-month emergency fund', detail: 'Before investing or paying extra debt, have a floor of $500-1,000 that you do not touch.' },
  { rank: 3, item: 'Pay off high-interest debt', detail: 'Any balance above 8-10% APR costs more in interest than you can reliably earn investing.' },
  { rank: 4, item: 'Contribute to a Roth IRA', detail: 'If you have earned income, the Roth IRA contribution limit is $7,000 for 2025. Time in market beats market timing, and student years are valuable Roth years.' },
  { rank: 5, item: 'Build toward a three-month emergency fund', detail: 'Once basics are covered, extend your runway from one month to three.' },
  { rank: 6, item: 'Invest or save for specific goals', detail: 'Now you can optimize: low-cost index funds, saving for a car, or any goal with a timeline.' },
]

export default function ExtraCash() {
  const [openSituation, setOpenSituation] = useState<number | null>(null)

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-ink">Extra cash</h1>
        <p className="text-sm text-ink-faint">
          Money that shows up deserves a plan before it disappears.
        </p>
      </header>

      {/* The windfall rule */}
      <div className="bg-surface rounded-2xl border border-line p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">The student windfall rule</h2>
        <p className="mt-1 text-xs text-ink-faint">Give every dollar a purpose before you spend any of it.</p>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-ok-soft border border-ok-line p-4">
            <div className="text-2xl font-bold text-ok">50%</div>
            <div className="mt-1 font-semibold text-sm text-ok-ink">Future goals</div>
            <p className="mt-1 text-xs text-ok-ink/80">Emergency fund, debt payoff, investing, savings for upcoming expenses</p>
          </div>
          <div className="rounded-xl bg-warn-soft border border-warn-line p-4">
            <div className="text-2xl font-bold text-warn">30%</div>
            <div className="mt-1 font-semibold text-sm text-warn-ink">Near-term needs</div>
            <p className="mt-1 text-xs text-warn-ink/80">Career development, certifications, professional tools, education expenses</p>
          </div>
          <div className="rounded-xl bg-info-soft border border-info-line p-4">
            <div className="text-2xl font-bold text-info">20%</div>
            <div className="mt-1 font-semibold text-sm text-info-ink">Enjoy it</div>
            <p className="mt-1 text-xs text-info-ink/80">Guilt-free spending. You earned it. Enjoy a real slice before optimizing the rest.</p>
          </div>
        </div>
      </div>

      {/* 24-hour rule */}
      <div className="rounded-xl bg-warn-soft border border-warn-line px-4 py-3 text-sm text-warn-ink">
        <strong>The 24-hour rule:</strong> When unexpected money arrives, wait 24 hours before spending any of it.
        Write down your plan first. Windfalls disappear fastest when spent reactively.
      </div>

      {/* Special situations */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Student-specific situations</h2>
        <p className="mt-0.5 text-xs text-ink-faint">
          Each has a different tax and priority profile. Tap to see how to handle it.
        </p>
        <div className="mt-3 space-y-2">
          {specialSituations.map((s, i) => (
            <div key={s.title} className="bg-surface rounded-xl border border-line overflow-hidden">
              <button
                onClick={() => setOpenSituation(openSituation === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
              >
                <div>
                  <span className="font-semibold text-sm text-ink">{s.title}</span>
                  <p className="text-xs text-ink-faint mt-0.5 line-clamp-1">{s.description}</p>
                </div>
                <span className="ml-4 text-ink-faint shrink-0">{openSituation === i ? '−' : '+'}</span>
              </button>
              {openSituation === i && (
                <div className="border-t border-line px-5 pb-4 pt-3 space-y-3">
                  <p className="text-sm text-ink-mid">{s.description}</p>
                  <ul className="space-y-2">
                    {s.tips.map((tip, j) => (
                      <li key={j} className="flex gap-2.5 text-sm">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-brand-soft text-brand text-xs font-bold flex items-center justify-center mt-0.5">
                          {j + 1}
                        </span>
                        <span className="text-ink-mid">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Priority list */}
      <section className="bg-surface rounded-2xl border border-line p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Student cash priority list</h2>
        <p className="mt-1 text-xs text-ink-faint">
          When you have money to allocate, work down this list from top to bottom. Do not skip ahead.
        </p>
        <div className="mt-4 space-y-3">
          {priorityList.map((p) => (
            <div key={p.rank} className="flex gap-3 items-start">
              <span className="shrink-0 w-7 h-7 rounded-full bg-brand-soft text-brand text-xs font-bold flex items-center justify-center mt-0.5">
                {p.rank}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{p.item}</p>
                <p className="text-sm text-ink-mid">{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-ink-faint">
        These are general guidelines, not personalized financial advice. Tax rules vary. Consider
        speaking with your school's financial wellness office for guidance specific to your situation.
      </p>
    </div>
  )
}

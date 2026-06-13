import { useState } from 'react'
import Tabs, { TabPanel } from '../components/Tabs'
import Collapsible from '../components/Collapsible'

interface SpecialSituation {
  title: string
  description: string
  tips: string[]
  summary: string
}

const specialSituations: SpecialSituation[] = [
  {
    title: 'FAFSA refund',
    summary: "It's a loan disbursement, not income. Treat it that way.",
    description: 'Federal aid that exceeds tuition is disbursed directly to you. It feels like income but it is a loan. Treat it as tuition money, not spending money.',
    tips: [
      'Hold it in a separate account so you cannot accidentally spend it.',
      "If you genuinely have excess, apply it to next semester's costs before anything else.",
      'Never invest borrowed money. If the market drops you still owe the loan.',
    ],
  },
  {
    title: 'Scholarship overage',
    summary: 'The excess above tuition may be taxable income.',
    description: 'Scholarships that exceed direct education costs are often taxable. The portion not used for tuition, fees, and required course materials counts as income.',
    tips: [
      'Set aside 15-25% of the excess for taxes if the scholarship is merit-based and taxable.',
      'Check the scholarship terms: some restrict how excess funds can be used.',
      'Apply surplus to living costs before drawing on savings or taking on more debt.',
    ],
  },
  {
    title: 'Tax refund',
    summary: "Your own money back, not a bonus. Direct it purposefully.",
    description: "Especially common in your first year of earning. The refund is not a bonus. It is your own money the government held interest-free. Do not treat it as a windfall.",
    tips: [
      'Build or top off your emergency fund first.',
      'If you have credit card debt, put the full refund toward the highest-rate balance.',
      'If no debt and fund is full, this is your best opportunity to open or contribute to a Roth IRA.',
    ],
  },
  {
    title: 'Internship bonus or signing bonus',
    summary: 'Compensation. Budget for taxes before spending any of it.',
    description: 'A signing or completion bonus is compensation and will be taxed as income. Make sure you budget for the tax bill before spending.',
    tips: [
      'Hold 25-30% in cash if no taxes were withheld at the time of payment.',
      'After taxes are covered, treat the rest like any other windfall: 50/30/20.',
      'Resist lifestyle inflation. This money should increase your net worth, not your monthly spending.',
    ],
  },
]

const priorityList = [
  { rank: 1, item: 'Cover any immediate essentials', detail: 'Rent due, medication, food. Handle non-negotiables first.' },
  { rank: 2, item: 'Build a one-month emergency fund', detail: 'Before investing or paying extra debt, have a floor of $500-1,000 that you do not touch.' },
  { rank: 3, item: 'Pay off high-interest debt', detail: 'Any balance above 8-10% APR costs more in interest than you can reliably earn investing.' },
  { rank: 4, item: 'Contribute to a Roth IRA', detail: 'If you have earned income, the Roth IRA contribution limit is $7,000 for 2025. Time in market beats market timing, and student years are valuable Roth years.' },
  { rank: 5, item: 'Build toward a three-month emergency fund', detail: 'Once basics are covered, extend your runway from one month to three.' },
  { rank: 6, item: 'Invest or save for specific goals', detail: 'Now you can optimize: low-cost index funds, saving for a car, or any goal with a timeline.' },
]

const PLAN_TABS = [
  { id: 'plan-500', label: '$500' },
  { id: 'plan-1000', label: '$1,000' },
  { id: 'plan-5000', label: '$5,000' },
]

const plans = [
  {
    id: 'plan-500',
    amount: '$500',
    future: '$250',
    near: '$150',
    enjoy: '$100',
    notes: [
      'Put $250 toward your emergency fund if it is under $500, or toward the highest-APR debt.',
      '$150 toward a certification, professional tool, or career-related expense.',
      '$100 to spend on whatever you want, with zero guilt.',
    ],
  },
  {
    id: 'plan-1000',
    amount: '$1,000',
    future: '$500',
    near: '$300',
    enjoy: '$200',
    notes: [
      'Put $500 toward your emergency fund, then debt payoff, then Roth IRA in that order.',
      '$300 toward near-term career or education investment.',
      '$200 guilt-free spending. You planned the other 80%.',
    ],
  },
  {
    id: 'plan-5000',
    amount: '$5,000',
    future: '$2,500',
    near: '$1,500',
    enjoy: '$1,000',
    notes: [
      '$2,500 can fully fund a Roth IRA contribution and still leave a buffer for debt payoff.',
      '$1,500 could cover a semester of professional development, a certification, or a career move.',
      '$1,000 is a real reward. Travel, an experience, or something meaningful.',
    ],
  },
]

export default function ExtraCash() {
  const [activePlan, setActivePlan] = useState('plan-500')

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">FREE MONEY</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Extra cash</h1>
        <p className="text-sm text-ink-faint max-w-2xl mt-1">
          Money that shows up deserves a plan before it disappears.
        </p>
      </header>

      {/* The windfall rule -- reference card with left accent border */}
      <div id="windfall-rule" className="bg-surface-2/50 rounded-2xl border-l-2 border-brand-line border border-line p-6 scroll-mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">The student windfall rule</h2>
        <p className="text-xs text-ink-faint mb-4">Give every dollar a purpose before you spend any of it.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-ok-soft border border-ok-line p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ok-ink/70 mb-1">Future goals</div>
            <div className="font-display text-3xl font-bold text-ok tabular-nums">50%</div>
            <p className="mt-1 text-xs text-ok-ink/80">Emergency fund, debt payoff, investing, savings for upcoming expenses</p>
          </div>
          <div className="rounded-xl bg-warn-soft border border-warn-line p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-warn-ink/70 mb-1">Near-term needs</div>
            <div className="font-display text-3xl font-bold text-warn tabular-nums">30%</div>
            <p className="mt-1 text-xs text-warn-ink/80">Career development, certifications, professional tools, education expenses</p>
          </div>
          <div className="rounded-xl bg-info-soft border border-info-line p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-info-ink/70 mb-1">Enjoy it</div>
            <div className="font-display text-3xl font-bold text-info tabular-nums">20%</div>
            <p className="mt-1 text-xs text-info-ink/80">Guilt-free spending. You earned it. Enjoy a real slice before optimizing the rest.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-warn-soft border border-warn-line px-4 py-3 text-sm text-warn-ink">
        <strong>The 24-hour rule:</strong> For any purchase over $100, wait 24 hours before deciding.
        For anything over $500, wait a full week. Write down your plan first. Windfalls disappear
        fastest when spent reactively.
      </div>

      {/* Example plans as tabs -- reference content */}
      <div id="examples" className="bg-surface-2/50 rounded-2xl border-l-2 border-brand-line border border-line p-6 scroll-mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">Example plans</h2>
        <p className="text-xs text-ink-faint mb-4">How to split common windfall amounts using the 50/30/20 rule.</p>
        <div className="mt-4">
          <Tabs tabs={PLAN_TABS} activeId={activePlan} onChange={setActivePlan}>
            {plans.map((plan) => (
              <TabPanel key={plan.id} id={plan.id} activeId={activePlan}>
                <div className="space-y-4">
                  <div className="rounded-xl border border-line p-4 space-y-2">
                    <p className="font-display font-bold text-lg text-ink tabular-nums">{plan.amount}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-faint">Future goals (50%)</span>
                      <span className="font-semibold text-ok tabular-nums">{plan.future}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-faint">Near-term needs (30%)</span>
                      <span className="font-semibold text-warn tabular-nums">{plan.near}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-faint">Enjoy it (20%)</span>
                      <span className="font-semibold text-info tabular-nums">{plan.enjoy}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {plan.notes.map((note, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-brand-soft text-brand text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-ink-mid">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabPanel>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Priority list -- reference card with accent border */}
      <section id="priority-list" className="bg-surface-2/50 rounded-2xl border-l-2 border-brand-line border border-line p-6 scroll-mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">Student cash priority list</h2>
        <p className="text-xs text-ink-faint mb-4">
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

      {/* Special situations as collapsibles */}
      <section id="situations" className="scroll-mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">Student-specific situations</h2>
        <p className="text-xs text-ink-faint mb-2">
          Each has a different tax and priority profile. Tap to see how to handle it.
        </p>
        <div className="mt-2 space-y-2">
          {specialSituations.map((s, i) => (
            <Collapsible
              key={s.title}
              title={s.title}
              summary={s.summary}
              defaultOpen={i === 0}
            >
              <div className="space-y-3">
                <p className="text-sm text-ink-mid">{s.description}</p>
                <ul className="space-y-2 mt-2">
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
            </Collapsible>
          ))}
        </div>
      </section>

    </div>
  )
}

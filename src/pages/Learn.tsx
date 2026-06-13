import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { knowledgeLevel } from '../lib/score'
import { suggestedVideos } from '../lib/videos'
import KnowledgeQuiz from '../components/KnowledgeQuiz'
import PageNav from '../components/PageNav'
import { BookOpenIcon, PlayIcon, ArrowRightIcon } from '../components/icons'

const pageSections = [
  { id: 'knowledge', label: 'Your knowledge' },
  { id: 'resources', label: 'Resources by topic' },
  { id: 'videos', label: 'Recommended for you' },
]

interface ResourceLink {
  title: string
  description: string
  url: string
  domain: string
}

interface ResourceGroup {
  id: string
  heading: string
  links: ResourceLink[]
}

const resourceGroups: ResourceGroup[] = [
  {
    id: 'credit',
    heading: 'Credit and scores',
    links: [
      {
        title: 'Annual Credit Report',
        description: 'The only federally authorized site for free credit reports from all three bureaus. One free report per bureau per year.',
        url: 'https://www.annualcreditreport.com',
        domain: 'annualcreditreport.com',
      },
      {
        title: 'Credit Karma',
        description: 'Free credit score monitoring with weekly updates. No credit card required.',
        url: 'https://www.creditkarma.com',
        domain: 'creditkarma.com',
      },
      {
        title: 'CFPB: Understanding your credit',
        description: 'Plain-language guides from the Consumer Financial Protection Bureau on how scores are calculated and how to improve yours.',
        url: 'https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/',
        domain: 'consumerfinance.gov',
      },
    ],
  },
  {
    id: 'student-loans',
    heading: 'Student loans',
    links: [
      {
        title: 'Federal Student Aid',
        description: 'Find your loan servicer, check your balance, and explore repayment options including income-driven plans.',
        url: 'https://studentaid.gov',
        domain: 'studentaid.gov',
      },
      {
        title: 'CFPB: Paying for college',
        description: 'Tools to compare loan options, understand your repayment rights, and manage your loan servicer.',
        url: 'https://www.consumerfinance.gov/paying-for-college/',
        domain: 'consumerfinance.gov',
      },
    ],
  },
  {
    id: 'budgeting',
    heading: 'Budgeting and saving',
    links: [
      {
        title: 'CFPB: Budgeting worksheets',
        description: 'Free downloadable budget templates and interactive tools from the Consumer Financial Protection Bureau.',
        url: 'https://www.consumerfinance.gov/consumer-tools/money-as-you-grow/budget/',
        domain: 'consumerfinance.gov',
      },
      {
        title: 'Khan Academy: Personal finance',
        description: 'Free video lessons on budgeting, banking, taxes, and saving. No account required.',
        url: 'https://www.khanacademy.org/college-careers-more/personal-finance',
        domain: 'khanacademy.org',
      },
      {
        title: 'NerdWallet: Budgeting basics',
        description: 'Step-by-step guide to building a budget, including the 50/30/20 rule explained with examples.',
        url: 'https://www.nerdwallet.com/article/finance/how-to-budget',
        domain: 'nerdwallet.com',
      },
    ],
  },
  {
    id: 'investing',
    heading: 'Investing basics',
    links: [
      {
        title: 'Investor.gov: Compound interest calculator',
        description: 'SEC-run tool showing exactly how compound interest builds wealth over time. Run the numbers yourself.',
        url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator',
        domain: 'investor.gov',
      },
      {
        title: 'Khan Academy: Investing',
        description: 'Free lessons on stocks, bonds, mutual funds, and how the market works.',
        url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/investment-vehicles-tutorial',
        domain: 'khanacademy.org',
      },
      {
        title: 'Bogleheads: Getting started',
        description: 'Community-maintained wiki on low-cost index fund investing. Practical, jargon-free, and beginner-friendly.',
        url: 'https://www.bogleheads.org/wiki/Getting_started',
        domain: 'bogleheads.org',
      },
    ],
  },
  {
    id: 'taxes',
    heading: 'Taxes',
    links: [
      {
        title: 'IRS Free File',
        description: 'File your federal taxes for free if your income is under $73,000. Includes guided software from IRS partners.',
        url: 'https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free',
        domain: 'irs.gov',
      },
      {
        title: 'CFPB: Tax-time guides',
        description: 'Guides on tax credits for students, EITC eligibility, and how to avoid tax prep scams.',
        url: 'https://www.consumerfinance.gov/about-us/blog/get-prepared-for-tax-season/',
        domain: 'consumerfinance.gov',
      },
    ],
  },
]

export default function Learn() {
  const { state, update } = useProfile()
  const profile = state?.profile

  const [quizOpen, setQuizOpen] = useState(false)
  const [quizResult, setQuizResult] = useState<{ correctCount: number } | null>(null)

  if (!profile) return null

  const { correct, total } = knowledgeLevel(profile)
  const hasTaken = Object.keys(profile.quiz_answers ?? {}).length > 0
  const videos = suggestedVideos(profile, 3)

  function handleQuizComplete(answers: Record<string, string>, correctCount: number) {
    update({ ...profile!, quiz_answers: { ...(profile!.quiz_answers ?? {}), ...answers } })
    setQuizOpen(false)
    setQuizResult({ correctCount })
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">LEARN</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Learn</h1>
        <p className="text-sm text-ink-faint max-w-2xl mt-1">
          Build your financial knowledge, check trusted resources, and retake the knowledge quiz to raise your Financial Awareness score.
        </p>
      </header>

      <PageNav sections={pageSections} />

      {/* 1. Your knowledge */}
      <section id="knowledge" className="scroll-mt-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Your knowledge</h2>

        <div className="bg-surface rounded-2xl border border-line p-6 space-y-4">
          {hasTaken ? (
            <>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <BookOpenIcon />
                </div>
                <div>
                  <p className="font-display text-4xl font-bold tabular-nums text-ink leading-none">
                    {correct}/{total}
                  </p>
                  <p className="text-sm text-ink-mid mt-1">correct on the knowledge check</p>
                </div>
              </div>

              <p className="text-sm text-ink-mid leading-relaxed">
                {correct >= 4
                  ? 'You scored 4 or more correct, earning the full Financial Awareness engagement points. Retake anytime to confirm your understanding.'
                  : `Scoring 4 or more correct earns the full Financial Awareness engagement points. You need ${4 - correct} more correct answer${4 - correct === 1 ? '' : 's'} to reach that threshold.`}
              </p>

              {quizResult && (
                <div className="rounded-xl bg-brand-soft border border-brand-line px-4 py-3 text-sm text-brand-ink">
                  You got {quizResult.correctCount}/{total}. Your score updates automatically.
                </div>
              )}

              {quizOpen ? (
                <div className="rounded-2xl border border-line bg-surface-2 p-5">
                  <KnowledgeQuiz
                    initialAnswers={profile.quiz_answers ?? {}}
                    onComplete={handleQuizComplete}
                    onCancel={() => { setQuizOpen(false); setQuizResult(null) }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setQuizOpen(true); setQuizResult(null) }}
                  className="rounded-xl bg-brand text-on-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-strong transition-colors"
                >
                  Retake the knowledge check
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <BookOpenIcon />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">You have not taken the knowledge check yet</p>
                  <p className="text-sm text-ink-mid mt-0.5">
                    Five quick questions that measure your financial literacy. Scoring 4 or more correct earns the full Financial Awareness engagement points.
                  </p>
                </div>
              </div>

              {quizResult && (
                <div className="rounded-xl bg-brand-soft border border-brand-line px-4 py-3 text-sm text-brand-ink">
                  You got {quizResult.correctCount}/{total}. Your score updates automatically.
                </div>
              )}

              {quizOpen ? (
                <div className="rounded-2xl border border-line bg-surface-2 p-5">
                  <KnowledgeQuiz
                    initialAnswers={profile.quiz_answers ?? {}}
                    onComplete={handleQuizComplete}
                    onCancel={() => { setQuizOpen(false) }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setQuizOpen(true)}
                  className="rounded-xl bg-brand text-on-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-strong transition-colors"
                >
                  Take the knowledge check
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* 2. Resources by topic */}
      <section id="resources" className="scroll-mt-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Resources by topic</h2>
        <p className="text-sm text-ink-mid">
          Curated links from government agencies and widely trusted financial education sites. All free, no sign-up required unless noted.
        </p>

        <div className="space-y-5">
          {resourceGroups.map((group) => (
            <div key={group.id}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-2">{group.heading}</h3>
              <div className="space-y-2">
                {group.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 bg-surface-2 border border-line rounded-2xl p-4 hover:border-brand transition-colors group"
                  >
                    <div className="shrink-0 w-1 self-stretch rounded-full bg-brand-line" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink group-hover:text-brand transition-colors">
                          {link.title}
                        </span>
                        <span className="text-xs text-brand font-medium">{link.domain}</span>
                      </div>
                      <p className="text-xs text-ink-faint mt-0.5 leading-relaxed">{link.description}</p>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 shrink-0 text-ink-faint group-hover:text-brand transition-colors mt-0.5" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Recommended videos */}
      {videos.length > 0 && (
        <section id="videos" className="scroll-mt-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Recommended for you</h2>
          <p className="text-sm text-ink-mid">Short modules picked based on your profile.</p>
          <div className="space-y-2">
            {videos.map((v) => (
              <div
                key={v.id}
                className="bg-surface border border-line rounded-2xl p-4 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <PlayIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-ink">{v.title}</span>
                    <span className="text-xs text-ink-faint tabular-nums">{v.duration}</span>
                  </div>
                  <p className="text-xs text-ink-mid mt-0.5 leading-relaxed">{v.blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

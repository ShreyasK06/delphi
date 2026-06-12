import type { Profile } from '../types'
import { calculateScore } from './score'

export interface VideoModule {
  id: string
  title: string
  blurb: string
  duration: string
  suggestWhen: (p: Profile) => boolean
}

export const videoModules: VideoModule[] = [
  {
    id: 'retirement',
    title: '401k & Roth IRA',
    blurb: 'Why starting retirement savings at 20 beats starting at 30, even with small amounts.',
    duration: '3 min',
    suggestWhen: (p) =>
      p.income_sources.some((s) => /job/i.test(s)) || calculateScore(p).total > 65,
  },
  {
    id: 'emergency',
    title: 'Emergency Funds',
    blurb: 'What an emergency fund actually protects you from, and the student-sized target.',
    duration: '2 min',
    suggestWhen: (p) => p.emergency_fund < 500,
  },
  {
    id: 'credit',
    title: 'Credit Scores',
    blurb: 'How credit scores work, why they matter after graduation, and safe ways to build one.',
    duration: '3 min',
    suggestWhen: (p) => !p.has_credit_card,
  },
  {
    id: 'debt',
    title: 'Debt Payoff Strategies',
    blurb: 'Avalanche vs. snowball, explained with real numbers, and which fits your brain.',
    duration: '2 min',
    suggestWhen: (p) => p.debt_breakdown.length > 0,
  },
  {
    id: 'investing',
    title: 'Index Funds & Compound Interest',
    blurb: 'The boring-but-powerful way most wealth actually gets built.',
    duration: '3 min',
    suggestWhen: (p) => calculateScore(p).total > 70 || p.savings > 2000,
  },
  {
    id: 'student-loans',
    title: 'Student Loans (College Edition)',
    blurb: 'Grace periods, subsidized vs. unsubsidized, and what to do before repayment starts.',
    duration: '3 min',
    suggestWhen: (p) =>
      p.debt_breakdown.some((d) => /student|loan/i.test(d.type)) || p.school_year === 'senior',
  },
  {
    id: 'fafsa',
    title: 'FAFSA Basics',
    blurb: 'What the FAFSA actually unlocks and how to file it in 30 minutes.',
    duration: '2 min',
    suggestWhen: (p) => !p.has_fafsa,
  },
]

export function suggestedVideos(p: Profile, limit = 3): VideoModule[] {
  return videoModules.filter((v) => v.suggestWhen(p)).slice(0, limit)
}

export function videoFor(id: string): VideoModule | undefined {
  return videoModules.find((v) => v.id === id)
}

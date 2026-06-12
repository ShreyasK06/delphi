import { useProfile } from '../hooks/useProfile'
import { useCoachChat } from '../hooks/useCoachChat'
import { mockCoach } from '../lib/coach/mockCoach'
import { suggestedVideos } from '../lib/videos'
import { totalDebt, fmtMoney } from '../types'
import ChatPanel from '../components/ChatPanel'
import VideoModuleCard from '../components/VideoModuleCard'

export default function Coach() {
  const { state } = useProfile()
  const { messages, appendMessage } = useCoachChat()
  if (!state) return null
  const { profile } = state
  const videos = suggestedVideos(profile, 2)

  const starters = [
    'Should I open a Roth IRA or pay off my credit card first?',
    profile.debt_breakdown.length > 0
      ? `What's the fastest way to pay off my ${fmtMoney(totalDebt(profile))} of debt?`
      : 'How do I start investing with only $50/month?',
    'I keep overspending on food — how do I fix it?',
    'How do I raise my credit score fast?',
    'What student discounts should I set up right now?',
    "What's the best student credit card for someone with no credit?",
  ]

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-ink">Coach</h1>
        <p className="text-sm text-ink-faint">
          Your financial coach. Ask anything about budgeting, credit, investing, student discounts,
          or your goals. Every answer is grounded in your actual numbers.
        </p>
      </header>

      <ChatPanel profile={profile} coach={mockCoach} starters={starters} messages={messages} onMessage={appendMessage} />

      {videos.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-2">
            Worth 2 minutes of your time
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {videos.map((v) => <VideoModuleCard key={v.id} video={v} />)}
          </div>
        </section>
      )}

      <p className="text-xs text-ink-faint">
        This is an educational tool, not a licensed financial advisor. For major investment or
        tax decisions, talk to a fiduciary advisor or your school's financial wellness center.
      </p>
    </div>
  )
}

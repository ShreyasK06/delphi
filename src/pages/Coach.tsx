import { useProfile } from '../hooks/useProfile'
import { useCoachChat } from '../hooks/useCoachChat'
import { mockCoach } from '../lib/coach/mockCoach'
import { suggestedVideos } from '../lib/videos'
import ChatPanel from '../components/ChatPanel'
import VideoModuleCard from '../components/VideoModuleCard'

const STARTERS = [
  'Should I open a Roth IRA or pay off my credit card first?',
  "What's the best student credit card for someone with no credit?",
  'How do I start investing with only $50/month?',
  'I keep overspending on food, how do I fix it?',
  'How do I raise my credit score fast?',
  'What student discounts should I set up right now?',
]

export default function Coach() {
  const { state } = useProfile()
  const { messages, appendMessage } = useCoachChat()
  if (!state) return null
  const { profile } = state
  const videos = suggestedVideos(profile, 2)

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">ASK</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Coach</h1>
        <p className="text-sm text-ink-faint max-w-2xl mt-1">
          Ask anything about budgeting, credit, investing, discounts, or your goals. Every answer is grounded in your actual numbers.
        </p>
      </header>

      <ChatPanel profile={profile} coach={mockCoach} starters={STARTERS} messages={messages} onMessage={appendMessage} />

      {videos.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">
            Worth 2 minutes of your time
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {videos.map((v) => <VideoModuleCard key={v.id} video={v} />)}
          </div>
        </section>
      )}
    </div>
  )
}

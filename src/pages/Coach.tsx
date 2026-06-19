import { useProfile } from '../hooks/useProfile'
import { useCoachChat } from '../hooks/useCoachChat'
import { nemotronCoach } from '../lib/coach/nemotronCoach'
import { suggestedVideos } from '../lib/videos'
import ChatPanel from '../components/ChatPanel'
import VideoModuleCard from '../components/VideoModuleCard'
import { PlusCircleIcon } from '../components/icons'

const STARTERS = [
  'Should I open a Roth IRA or pay off my credit card first?',
  "What's the best student credit card for someone with no credit?",
  'How do I start investing with only $50/month?',
  'I keep overspending on food, how do I fix it?',
  'How do I raise my credit score fast?',
  'What student discounts should I set up right now?',
]

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Coach() {
  const { state } = useProfile()
  const {
    messages,
    appendMessage,
    conversations,
    activeConversationId,
    startNewConversation,
    openConversation,
    deleteConversation,
  } = useCoachChat()
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

      {/* Saved conversations */}
      <section className="bg-surface rounded-2xl border border-line p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Your chats</h2>
          <button
            onClick={startNewConversation}
            disabled={activeConversationId === null && messages.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <PlusCircleIcon className="w-4 h-4" />
            New chat
          </button>
        </div>

        {conversations.length === 0 ? (
          <p className="text-xs text-ink-faint">
            No saved chats yet. Send a message below and it'll show up here so you can come back to it later.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {conversations.map((c) => (
              <li
                key={c.id}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                  c.id === activeConversationId
                    ? 'bg-brand-soft border border-brand-line'
                    : 'border border-line hover:border-line-strong'
                }`}
              >
                <button
                  onClick={() => openConversation(c.id)}
                  className="flex-1 min-w-0 text-left truncate text-ink"
                >
                  {c.title}
                </button>
                <span className="shrink-0 text-xs text-ink-faint">{timeAgo(c.updatedAt)}</span>
                <button
                  onClick={() => deleteConversation(c.id)}
                  className="shrink-0 text-xs font-medium text-bad hover:text-bad-ink px-1"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChatPanel
        key={activeConversationId ?? 'new'}
        profile={profile}
        coach={nemotronCoach}
        starters={STARTERS}
        messages={messages}
        onMessage={appendMessage}
      />

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

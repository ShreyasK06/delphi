import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ChatMessage, Profile } from '../types'
import type { CoachAdapter } from '../lib/coach/adapter'

/** Minimal renderer for the coach's **bold** + paragraph + bullet formatting. */
function CoachText({ text }: { text: string }) {
  const paragraphs = text.split('\n\n')
  return (
    <div className="space-y-2">
      {paragraphs.map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={j}>{part.slice(2, -2)}</strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </p>
      ))}
    </div>
  )
}

interface Props {
  profile: Profile
  coach: CoachAdapter
  starters?: string[]
  /** Seed messages for uncontrolled mode (e.g. an auto-greeting from the coach) */
  initialMessages?: ChatMessage[]
  /** If provided, overrides internal message state (controlled mode) */
  messages?: ChatMessage[]
  /** Called when a message is sent/received (controlled mode) */
  onMessage?: (msg: ChatMessage) => Promise<void>
  className?: string
}

export default function ChatPanel({ profile, coach, starters = [], initialMessages = [], messages: externalMessages, onMessage, className }: Props) {
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>(initialMessages)
  const messages = externalMessages ?? internalMessages
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const ask = async (text: string) => {
    if (!text.trim() || thinking) return
    const userMsg: ChatMessage = { role: 'user', text: text.trim() }

    if (onMessage) {
      await onMessage(userMsg)
    } else {
      setInternalMessages((prev) => [...prev, userMsg])
    }

    setInput('')
    setThinking(true)
    try {
      const history = [...messages, userMsg]
      const reply = await coach.send(profile, history, text.trim())
      const coachMsg: ChatMessage = { role: 'coach', text: reply }
      if (onMessage) {
        await onMessage(coachMsg)
      } else {
        setInternalMessages((prev) => [...prev, coachMsg])
      }
    } finally {
      setThinking(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void ask(input)
  }

  const noUserMessagesYet = !messages.some((m) => m.role === 'user')

  return (
    <div className={`bg-surface rounded-2xl shadow-sm border border-line flex flex-col ${className ?? 'h-[32rem]'}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-ink-faint">
            Hey, I'm your money coach, grounded in <em>your</em> actual numbers. Ask me anything,
            or try one of these:
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-brand text-on-brand rounded-br-sm'
                  : 'bg-surface-2 text-ink rounded-bl-sm'
              }`}
            >
              {m.role === 'coach' ? <CoachText text={m.text} /> : m.text}
            </div>
          </div>
        ))}
        {noUserMessagesYet && starters.length > 0 && !thinking && (
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void ask(s)}
                className="text-xs bg-brand-soft text-brand-ink border border-brand-line rounded-full px-3 py-1.5 hover:bg-brand-line transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-surface-2 rounded-2xl rounded-bl-sm px-4 py-3 text-ink-faint text-sm">
              <span className="animate-pulse">delphi is thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={onSubmit} className="border-t border-line p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your budget, debt, goals, extra cash…"
          className="flex-1 rounded-xl border border-line-strong px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          className="rounded-xl bg-brand text-on-brand px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-brand-strong transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}

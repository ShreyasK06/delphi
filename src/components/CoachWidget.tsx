import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { calculateScore } from '../lib/score'
import { mockCoach } from '../lib/coach/mockCoach'
import type { ChatMessage } from '../types'
import ChatPanel from './ChatPanel'
import { ChatIcon, CloseIcon } from './icons'

const GREETED_KEY = 'delphi_coach_greeted'

export default function CoachWidget() {
  const { user } = useAuth()
  const { state } = useProfile()
  // Auto-pop the coach once per browser session when the app opens.
  const [open, setOpen] = useState(false)
  const [hasAutoOpened, setHasAutoOpened] = useState(() => sessionStorage.getItem(GREETED_KEY) === '1')

  useEffect(() => {
    if (hasAutoOpened) return
    const t = setTimeout(() => {
      setOpen(true)
      setHasAutoOpened(true)
      sessionStorage.setItem(GREETED_KEY, '1')
    }, 900)
    return () => clearTimeout(t)
  }, [hasAutoOpened])

  if (!state) return null
  const { profile } = state
  const score = calculateScore(profile)
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const greeting: ChatMessage = {
    role: 'coach',
    text: `Hey ${firstName}! 👋 Your Financial Health Score is sitting at **${score.total}/100**.\n\n${score.priorityAction}\n\nAsk me anything, I know your numbers, so no generic advice here.`,
  }

  const starters = [
    'How am I doing financially?',
    'Help me with my debt',
    'I just got some money, now what?',
  ]

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* keep the panel mounted when closed so the conversation survives reopening */}
      <div className={open ? 'w-[calc(100vw-2.5rem)] sm:w-96 animate-pop' : 'hidden'}>
          <div className="rounded-t-2xl bg-[#04231c]/90 backdrop-blur-xl border border-white/10 border-b-0 px-4 py-3 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-sm font-black text-white">
                  n
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#04231c]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">Coach</div>
                <div className="text-[11px] text-emerald-100/60 leading-tight">knows your numbers</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close coach chat"
              className="text-emerald-100/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
          <ChatPanel
            profile={profile}
            coach={mockCoach}
            starters={starters}
            initialMessages={[greeting]}
            className="h-[24rem] rounded-t-none border-t-0 shadow-2xl"
          />
      </div>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open coach chat"
          className="group relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-900/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <ChatIcon className="w-6 h-6" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
          <span className="absolute right-full mr-3 whitespace-nowrap rounded-lg bg-[#04231c] text-white text-xs font-medium px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Talk to your coach
          </span>
        </button>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ChatMessage } from '../types'

interface CoachChatState {
  messages: ChatMessage[]
  appendMessage: (msg: ChatMessage) => Promise<void>
  loading: boolean
}

export function useCoachChat(): CoachChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, text')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(50)

      if (!error && data) {
        setMessages(data as ChatMessage[])
      }
      setLoading(false)
    }

    load()
  }, [])

  const appendMessage = async (msg: ChatMessage): Promise<void> => {
    setMessages((prev) => [...prev, msg])

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    let retries = 0
    while (retries < 2) {
      const { error } = await supabase.from('chat_messages').insert({
        user_id: session.user.id,
        role: msg.role,
        text: msg.text,
        created_at: new Date().toISOString(),
      })
      if (!error) return
      retries++
    }
    // Silently fail after 2 retries — message is still in local state
  }

  return { messages, appendMessage, loading }
}

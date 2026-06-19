import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ChatMessage } from '../types'

export interface Conversation {
  id: string
  title: string
  updatedAt: string
}

interface CoachChatState {
  messages: ChatMessage[]
  appendMessage: (msg: ChatMessage) => Promise<void>
  loading: boolean
  conversations: Conversation[]
  activeConversationId: string | null
  startNewConversation: () => void
  openConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
}

const TITLE_MAX = 60

function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX)}…` : t
}

export function useCoachChat(): CoachChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const initialized = useRef(false)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }
      userIdRef.current = session.user.id

      // Lazy migration: fold any pre-conversation messages (conversation_id
      // null, from before this feature existed) into one "Earlier" thread so
      // that history isn't silently dropped.
      const { data: orphans } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('user_id', session.user.id)
        .is('conversation_id', null)
        .limit(1)

      if (orphans && orphans.length > 0) {
        const { data: created } = await supabase
          .from('chat_conversations')
          .insert({ user_id: session.user.id, title: 'Earlier conversation' })
          .select('id')
          .single()
        if (created) {
          await supabase
            .from('chat_messages')
            .update({ conversation_id: created.id })
            .eq('user_id', session.user.id)
            .is('conversation_id', null)
        }
      }

      const { data: convos } = await supabase
        .from('chat_conversations')
        .select('id, title, updated_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })

      const list: Conversation[] = (convos ?? []).map((c) => ({
        id: c.id as string,
        title: c.title as string,
        updatedAt: c.updated_at as string,
      }))
      setConversations(list)

      if (list.length > 0) {
        await loadMessagesFor(list[0].id)
        setActiveConversationId(list[0].id)
      }
      setLoading(false)
    }

    load()
  }, [])

  async function loadMessagesFor(conversationId: string): Promise<void> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, text')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200)
    if (!error && data) setMessages(data as ChatMessage[])
  }

  const startNewConversation = (): void => {
    setActiveConversationId(null)
    setMessages([])
  }

  const openConversation = async (id: string): Promise<void> => {
    setActiveConversationId(id)
    await loadMessagesFor(id)
  }

  const deleteConversation = async (id: string): Promise<void> => {
    await supabase.from('chat_conversations').delete().eq('id', id)
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeConversationId === id) {
      setActiveConversationId(null)
      setMessages([])
    }
  }

  const appendMessage = async (msg: ChatMessage): Promise<void> => {
    setMessages((prev) => [...prev, msg])

    const userId = userIdRef.current
    if (!userId) return

    let conversationId = activeConversationId
    if (!conversationId) {
      const { data: created, error } = await supabase
        .from('chat_conversations')
        .insert({ user_id: userId, title: titleFrom(msg.text) })
        .select('id, title, updated_at')
        .single()
      if (error || !created) return // can't persist without a conversation row
      conversationId = created.id as string
      setActiveConversationId(conversationId)
      setConversations((prev) => [
        { id: conversationId as string, title: created.title as string, updatedAt: created.updated_at as string },
        ...prev,
      ])
    }

    let retries = 0
    while (retries < 2) {
      const { error } = await supabase.from('chat_messages').insert({
        user_id: userId,
        conversation_id: conversationId,
        role: msg.role,
        text: msg.text,
        created_at: new Date().toISOString(),
      })
      if (!error) break
      retries++
      // Silently fail after 2 retries — message is still in local state
    }

    const updatedAt = new Date().toISOString()
    await supabase.from('chat_conversations').update({ updated_at: updatedAt }).eq('id', conversationId)
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === conversationId ? { ...c, updatedAt } : c))
      return next.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    })
  }

  return {
    messages,
    appendMessage,
    loading,
    conversations,
    activeConversationId,
    startNewConversation,
    openConversation,
    deleteConversation,
  }
}

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { calculateScore } from '../lib/score'
import {
  loadCachedState,
  writeCachedState,
  clearCachedState,
  type StoredState,
} from '../lib/storage'

interface ProfileContextValue {
  state: StoredState | null
  /** true while the initial async load is in flight */
  loading: boolean
  /** Saves the profile, recalculates the score, appends to history. */
  update: (profile: Profile) => StoredState
  reset: () => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function dispatchSyncError() {
  window.dispatchEvent(new CustomEvent('delphi:sync-error'))
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState | null>(null)
  const [loading, setLoading] = useState(true)
  const currentUserId = useRef<string | null>(null)

  useEffect(() => {
    async function loadForUser(userId: string) {
      setLoading(true)
      try {
        const { data: row, error } = await supabase
          .from('profiles')
          .select('profile_data')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          // Fall back to cache only if it belongs to this user
          const cached = loadCachedState()
          if (cached?.owner_id === userId) {
            setState(cached)
          } else {
            setState(null)
          }
          dispatchSyncError()
          return
        }

        if (row?.profile_data && Object.keys(row.profile_data).length > 0) {
          // Supabase has data — stamp owner and use as source of truth
          const remote = row.profile_data as StoredState
          remote.owner_id = userId
          writeCachedState(remote)
          setState(remote)
        } else {
          // No profile row yet — this is a brand-new account
          clearCachedState()
          setState(null)
        }
      } finally {
        setLoading(false)
      }
    }

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        currentUserId.current = session.user.id
        await loadForUser(session.user.id)
      } else {
        // Not logged in — show cached state for routing purposes only
        setState(loadCachedState())
        setLoading(false)
      }
    })

    // React to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        clearCachedState()
        setState(null)
        currentUserId.current = null
        setLoading(false)
        return
      }

      if (session?.user) {
        const incomingId = session.user.id
        // Only reload if the user actually changed (ignore token refresh etc.)
        if (incomingId !== currentUserId.current) {
          currentUserId.current = incomingId
          clearCachedState()
          await loadForUser(incomingId)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const update = (profile: Profile): StoredState => {
    const score = calculateScore(profile).total
    const prev = state
    const today = new Date().toISOString()
    const history = [...(prev?.scoreHistory ?? [])]
    const last = history[history.length - 1]
    if (!last || last.score !== score) {
      history.push({ date: today, score })
    }
    const next: StoredState = {
      profile,
      scoreHistory: history,
      lastUpdated: today,
      owner_id: currentUserId.current ?? undefined,
    }

    // Optimistic local write
    writeCachedState(next)
    setState(next)

    // Background Supabase sync
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const userId = session.user.id

      supabase.from('profiles').upsert({
        id: userId,
        profile_data: next,
        updated_at: today,
      }).then(({ error }) => {
        if (error) dispatchSyncError()
      })

      // Insert score_history row if score changed
      if (!last || last.score !== score) {
        supabase.from('score_history').insert({
          user_id: userId,
          score,
          recorded_at: today,
        })
      }
    })

    return next
  }

  const reset = () => {
    clearCachedState()
    setState(null)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('profiles').upsert({
        id: session.user.id,
        profile_data: {},
        updated_at: new Date().toISOString(),
      })
    })
  }

  return (
    <ProfileContext.Provider value={{ state, loading, update, reset }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}

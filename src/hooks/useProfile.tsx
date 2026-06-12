import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { calculateScore } from '../lib/score'
import {
  loadCachedState,
  writeCachedState,
  clearCachedState,
  loadLegacyState,
  type StoredState,
} from '../lib/storage'

interface ProfileContextValue {
  state: StoredState | null
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
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Not logged in — load from cache so onboarding still works offline
        setState(loadCachedState())
        return
      }

      const userId = session.user.id

      // Try to load from Supabase
      const { data: row, error } = await supabase
        .from('profiles')
        .select('profile_data')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        // Fall back to cache
        setState(loadCachedState())
        dispatchSyncError()
        return
      }

      if (row?.profile_data && Object.keys(row.profile_data).length > 0) {
        // Supabase has data — use it as source of truth
        const remote = row.profile_data as StoredState
        writeCachedState(remote)
        setState(remote)
      } else {
        // No Supabase row yet — migrate local data if any
        const local = loadLegacyState()
        if (local) {
          const { error: upsertError } = await supabase.from('profiles').upsert({
            id: userId,
            profile_data: local,
            updated_at: new Date().toISOString(),
          })
          if (upsertError) dispatchSyncError()
        }
        setState(local)
      }
    }

    init()
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
    const next: StoredState = { profile, scoreHistory: history, lastUpdated: today }

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
    <ProfileContext.Provider value={{ state, update, reset }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}

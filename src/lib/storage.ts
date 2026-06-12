import type { Profile, ScoreSnapshot } from '../types'

const KEY = 'delphi_state_v1'

export interface StoredState {
  profile: Profile
  scoreHistory: ScoreSnapshot[]
  lastUpdated: string
}

export function loadCachedState(): StoredState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as StoredState
    const e = state.profile.monthly_expenses as Partial<typeof state.profile.monthly_expenses>
    state.profile.monthly_expenses = {
      rent: e.rent ?? 0,
      food: e.food ?? 0,
      transportation: e.transportation ?? 0,
      utilities: e.utilities ?? 0,
      subscriptions: e.subscriptions ?? 0,
      going_out: e.going_out ?? 0,
      other: e.other ?? 0,
    }
    return state
  } catch {
    return null
  }
}

export function writeCachedState(state: StoredState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function clearCachedState(): void {
  localStorage.removeItem(KEY)
}

/** Read legacy keys for one-time migration */
export function loadLegacyState(): StoredState | null {
  const LEGACY_KEYS = ['nudge_state_v1', 'fincoach_state_v1', 'delphi_state_v1']
  for (const k of LEGACY_KEYS) {
    const raw = localStorage.getItem(k)
    if (!raw) continue
    try {
      const state = JSON.parse(raw) as StoredState
      const e = state.profile.monthly_expenses as Partial<typeof state.profile.monthly_expenses>
      state.profile.monthly_expenses = {
        rent: e.rent ?? 0,
        food: e.food ?? 0,
        transportation: e.transportation ?? 0,
        utilities: e.utilities ?? 0,
        subscriptions: e.subscriptions ?? 0,
        going_out: e.going_out ?? 0,
        other: e.other ?? 0,
      }
      return state
    } catch {
      continue
    }
  }
  return null
}

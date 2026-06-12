import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface User {
  name: string
  email: string
}

interface AuthContextValue {
  user: User | null
  /** true while the initial session check is in flight */
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  signup: (name: string, email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

function toUser(u: SupabaseUser): User {
  return {
    name: (u.user_metadata?.name as string) ?? u.email ?? 'User',
    email: u.email ?? '',
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? toUser(data.session.user) : null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toUser(session.user) : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return error.message
    return null
  }

  const signup = async (name: string, email: string, password: string): Promise<string | null> => {
    if (!name.trim()) return 'Tell us what to call you.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'That email looks off, double-check it.'
    if (password.length < 6) return 'Password needs at least 6 characters.'
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    })
    if (error) return error.message
    // When "Confirm email" is enabled, signUp succeeds but session is null.
    if (!data.session) return 'CONFIRM_EMAIL'
    return null
  }

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

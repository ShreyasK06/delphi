# Supabase Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace delphi's localStorage-only demo with real Supabase Auth, profile persistence, score history, and coach chat history — making the app production-ready for Vercel deployment.

**Architecture:** Supabase JS SDK handles auth sessions automatically. Profile is stored as a single JSONB row per user with localStorage as an optimistic write-back cache. Score history and chat messages are append-only normalized rows. Existing localStorage data migrates automatically on first login.

**Tech Stack:** React 19, Vite, TypeScript, Supabase JS v2 (`@supabase/supabase-js`), Tailwind CSS v4, Vercel

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/supabase.ts` | Create | Supabase JS client singleton |
| `src/lib/storage.ts` | Modify | Offline cache only; no longer source of truth |
| `src/hooks/useAuth.tsx` | Replace | Supabase Auth (signUp, signIn, signOut, session listener) |
| `src/hooks/useProfile.tsx` | Replace | Fetch/upsert profile + score history via Supabase |
| `src/hooks/useCoachChat.tsx` | Create | Load and persist chat messages via Supabase |
| `src/components/ChatPanel.tsx` | Modify | Accept `messages`/`onSend` props instead of owning state |
| `src/pages/Coach.tsx` | Modify | Wire up `useCoachChat` |
| `src/App.tsx` | Modify | Auth loading state; `RequireProfile` uses loading from useProfile |
| `.gitignore` | Create | Ignore `.env.local`, `node_modules`, `dist` |
| `.env.local` | Create | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (not committed) |
| `.env.example` | Create | Safe-to-commit placeholder showing required env vars |
| `supabase/schema.sql` | Create | SQL to run manually in Supabase dashboard |

---

## Task 1: Install Supabase and create .gitignore

**Files:**
- Modify: `package.json`
- Create: `.gitignore`
- Create: `.env.local`

- [ ] **Step 1: Install the Supabase JS client**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm install @supabase/supabase-js
```

Expected: `@supabase/supabase-js` appears in `package.json` dependencies.

- [ ] **Step 2: Create .gitignore**

Create `.gitignore` in the project root:

```
node_modules/
dist/
.env.local
.env*.local
*.local
```

- [ ] **Step 3: Create .env.local placeholder**

Create `.env.local` in the project root (fill in real values from Supabase dashboard → Settings → API):

```
VITE_SUPABASE_URL=https://REPLACE_ME.supabase.co
VITE_SUPABASE_ANON_KEY=REPLACE_ME
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "feat: install @supabase/supabase-js, add .gitignore"
```

---

## Task 2: Supabase client singleton

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Create the client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables.')
}

export const supabase = createClient(url, key)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npx tsc -b 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client singleton"
```

---

## Task 3: Database schema

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Create schema reference file**

Create `supabase/schema.sql`:

```sql
-- profiles: one row per authenticated user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  profile_data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "users manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- score_history: append-only snapshots
create table public.score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  recorded_at timestamptz not null default now()
);
alter table public.score_history enable row level security;
create policy "users manage own score history"
  on public.score_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- chat_messages: append-only coach conversation log
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'coach')),
  text text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "users manage own chat"
  on public.chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Run the schema in Supabase**

1. Go to your Supabase project dashboard → SQL Editor
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run**
4. Verify in Table Editor that `profiles`, `score_history`, and `chat_messages` all appear

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add Supabase schema SQL reference"
```

---

## Task 4: Replace useAuth with Supabase Auth

**Files:**
- Replace: `src/hooks/useAuth.tsx`

The exported interface (`user`, `login`, `signup`, `logout`) stays identical in shape, except `login` and `signup` are now `async` (return `Promise<string | null>` instead of `string | null`), and a new `loading` field is added.

- [ ] **Step 1: Replace useAuth.tsx**

Overwrite `src/hooks/useAuth.tsx`:

```typescript
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
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    })
    if (error) return error.message
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
```

- [ ] **Step 2: Verify TypeScript (expect errors about async callers — fixed next task)**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npx tsc -b 2>&1
```

Expected: errors only on `login`/`signup` call sites not awaiting the promise. Those are fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.tsx
git commit -m "feat: replace useAuth with Supabase Auth"
```

---

## Task 5: Fix auth callers and update App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Landing.tsx`

- [ ] **Step 1: Find all login/signup call sites**

```bash
grep -rn "login\|signup" src/pages/ --include="*.tsx"
```

- [ ] **Step 2: Update App.tsx**

Overwrite `src/App.tsx`:

```typescript
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ProfileProvider, useProfile } from './hooks/useProfile'
import { ThemeProvider } from './hooks/useTheme'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Budget from './pages/Budget'
import DebtPlanner from './pages/DebtPlanner'
import Goals from './pages/Goals'
import Invest from './pages/Invest'
import ExtraCash from './pages/ExtraCash'
import Discounts from './pages/Discounts'
import Coach from './pages/Coach'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-faint text-sm">Loading…</div>
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireProfile({ children }: { children: React.ReactNode }) {
  const { state, loading } = useProfile()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-faint text-sm">Loading…</div>
  if (!state) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route
              element={
                <RequireAuth>
                  <RequireProfile>
                    <Layout />
                  </RequireProfile>
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/debt" element={<DebtPlanner />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/invest" element={<Invest />} />
              <Route path="/extra-cash" element={<ExtraCash />} />
              <Route path="/windfall" element={<Navigate to="/extra-cash" replace />} />
              <Route path="/discounts" element={<Discounts />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 3: Update login/signup calls in Landing.tsx to be async**

Open `src/pages/Landing.tsx`. Find every form submit handler that calls `login(...)` or `signup(...)`. Change:

```typescript
// Before
const err = login(email, password)
```

```typescript
// After — make the handler async and await the call
const err = await login(email, password)
```

Do the same for `signup(...)`. If the handler is `(e: FormEvent) => { ... }` change it to `async (e: FormEvent) => { ... }`.

Also update the `logout` call in `Layout.tsx` from `logout()` to `void logout()` (it's already called in an onClick, so this is safe).

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npx tsc -b 2>&1
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/pages/Landing.tsx src/components/Layout.tsx
git commit -m "fix: update auth callers for async login/signup/logout"
```

---

## Task 6: Replace useProfile with Supabase persistence

**Files:**
- Replace: `src/hooks/useProfile.tsx`
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Simplify storage.ts to offline cache only**

Overwrite `src/lib/storage.ts`:

```typescript
import type { Profile } from '../types'

const CACHE_KEY = 'delphi_state_v1'
const LEGACY_KEYS = ['nudge_state_v1', 'fincoach_state_v1']

export interface CachedState {
  profile: Profile
  lastUpdated: string
}

export function loadCachedState(): CachedState | null {
  try {
    const raw =
      localStorage.getItem(CACHE_KEY) ??
      LEGACY_KEYS.map((k) => localStorage.getItem(k)).find((v) => v !== null) ??
      null
    if (!raw) return null
    const state = JSON.parse(raw) as { profile: Profile; lastUpdated: string }
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
    return { profile: state.profile, lastUpdated: state.lastUpdated }
  } catch {
    return null
  }
}

export function writeCachedState(profile: Profile): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ profile, lastUpdated: new Date().toISOString() }))
}

export function clearCachedState(): void {
  localStorage.removeItem(CACHE_KEY)
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
}
```

- [ ] **Step 2: Replace useProfile.tsx**

Overwrite `src/hooks/useProfile.tsx`:

```typescript
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { calculateScore } from '../lib/score'
import { loadCachedState, writeCachedState, clearCachedState } from '../lib/storage'
import type { Profile, ScoreSnapshot } from '../types'

export interface StoredState {
  profile: Profile
  scoreHistory: ScoreSnapshot[]
  lastUpdated: string
}

interface ProfileContextValue {
  state: StoredState | null
  loading: boolean
  update: (profile: Profile) => Promise<StoredState>
  reset: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState | null>(null)
  const [loading, setLoading] = useState(true)
  const syncErrorShownRef = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setState(null)
        setLoading(false)
        return
      }

      const userId = session.user.id
      setLoading(true)

      // One-time migration from localStorage
      const cached = loadCachedState()
      if (cached) {
        await supabase.from('profiles').upsert({
          id: userId,
          profile_data: cached.profile,
          updated_at: new Date().toISOString(),
        })
        clearCachedState()
      }

      // Fetch profile
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('profile_data, updated_at')
        .eq('id', userId)
        .maybeSingle()

      // Fetch score history (last 90 entries)
      const { data: historyRows } = await supabase
        .from('score_history')
        .select('score, recorded_at')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: true })
        .limit(90)

      const scoreHistory: ScoreSnapshot[] = (historyRows ?? []).map((r) => ({
        date: r.recorded_at as string,
        score: r.score as number,
      }))

      if (profileRow) {
        setState({
          profile: profileRow.profile_data as Profile,
          scoreHistory,
          lastUpdated: profileRow.updated_at as string,
        })
      } else {
        setState(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const update = async (profile: Profile): Promise<StoredState> => {
    const score = calculateScore(profile).total
    const now = new Date().toISOString()
    const prevScore = state?.scoreHistory.at(-1)?.score

    const scoreHistory: ScoreSnapshot[] =
      prevScore === score
        ? (state?.scoreHistory ?? [])
        : [...(state?.scoreHistory ?? []).slice(-89), { date: now, score }]

    const next: StoredState = { profile, scoreHistory, lastUpdated: now }
    setState(next)
    writeCachedState(profile)

    // Background sync
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user.id
    if (userId) {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        profile_data: profile,
        updated_at: now,
      })
      if (error && !syncErrorShownRef.current) {
        syncErrorShownRef.current = true
        window.dispatchEvent(new CustomEvent('delphi:sync-error'))
      } else if (!error) {
        syncErrorShownRef.current = false
      }

      if (prevScore !== score) {
        await supabase.from('score_history').insert({ user_id: userId, score, recorded_at: now })
      }
    }

    return next
  }

  const reset = async (): Promise<void> => {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user.id
    if (userId) {
      await supabase.from('profiles').delete().eq('id', userId)
      await supabase.from('score_history').delete().eq('user_id', userId)
    }
    clearCachedState()
    setState(null)
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
```

- [ ] **Step 3: Fix all update() callers — it is now async**

Find every call to `update(...)` and `reset()`:

```bash
grep -rn "update(\|reset()" src/pages/ src/components/ --include="*.tsx"
```

For each call site, prefix with `void` so the UI doesn't block:

```typescript
// Before
update(draft)
update({ ...profile, goals })
reset()

// After
void update(draft)
void update({ ...profile, goals })
void reset()
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npx tsc -b 2>&1
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProfile.tsx src/lib/storage.ts src/pages/
git commit -m "feat: replace useProfile with Supabase persistence + localStorage cache"
```

---

## Task 7: Add sync-error toast to Layout

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Add the toast state and listener inside the Layout component**

In `src/components/Layout.tsx`, inside the `Layout` function body (after the existing `useAuth` and `useNavigate` lines), add:

```typescript
const [syncError, setSyncError] = useState(false)
useEffect(() => {
  const handler = () => {
    setSyncError(true)
    window.setTimeout(() => setSyncError(false), 4000)
  }
  window.addEventListener('delphi:sync-error', handler)
  return () => window.removeEventListener('delphi:sync-error', handler)
}, [])
```

- [ ] **Step 2: Add the toast element**

In the Layout JSX, just before the final `</div>` closing tag (after `<BackToTop />`), add:

```tsx
{syncError && (
  <div className="fixed bottom-16 right-6 z-50 rounded-xl bg-warn-soft border border-warn-line px-4 py-2.5 text-xs font-medium text-warn-ink shadow-lg">
    Sync failed — changes saved locally
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npx tsc -b 2>&1
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add sync-error toast to Layout"
```

---

## Task 8: Create useCoachChat and wire up Coach page

**Files:**
- Create: `src/hooks/useCoachChat.tsx`
- Modify: `src/components/ChatPanel.tsx`
- Modify: `src/pages/Coach.tsx`

- [ ] **Step 1: Create useCoachChat.tsx**

Create `src/hooks/useCoachChat.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ChatMessage } from '../types'

interface UseCoachChat {
  messages: ChatMessage[]
  loading: boolean
  send: (userText: string, getReply: (history: ChatMessage[]) => Promise<string>) => Promise<void>
}

export function useCoachChat(): UseCoachChat {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session || cancelled) return
      userIdRef.current = data.session.user.id

      const { data: rows } = await supabase
        .from('chat_messages')
        .select('role, text')
        .eq('user_id', data.session.user.id)
        .order('created_at', { ascending: true })
        .limit(50)

      if (!cancelled) {
        setMessages((rows ?? []).map((r) => ({ role: r.role as 'user' | 'coach', text: r.text as string })))
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const send = async (userText: string, getReply: (history: ChatMessage[]) => Promise<string>): Promise<void> => {
    const userId = userIdRef.current
    const userMsg: ChatMessage = { role: 'user', text: userText.trim() }
    const withUser = [...messages, userMsg]
    setMessages(withUser)

    if (userId) {
      await supabase.from('chat_messages').insert({ user_id: userId, role: 'user', text: userMsg.text })
    }

    let replyText: string
    try {
      replyText = await getReply(withUser)
    } catch {
      replyText = "I'm having trouble responding right now. Try again in a moment."
    }

    const coachMsg: ChatMessage = { role: 'coach', text: replyText }
    setMessages([...withUser, coachMsg])

    if (userId) {
      await supabase.from('chat_messages').insert({ user_id: userId, role: 'coach', text: replyText })
    }
  }

  return { messages, loading, send }
}
```

- [ ] **Step 2: Update ChatPanel to accept external state**

Overwrite `src/components/ChatPanel.tsx`:

```typescript
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ChatMessage, Profile } from '../types'
import type { CoachAdapter } from '../lib/coach/adapter'

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
  messages: ChatMessage[]
  onSend: (text: string, getReply: (history: ChatMessage[]) => Promise<string>) => Promise<void>
  starters?: string[]
  className?: string
}

export default function ChatPanel({ profile, coach, messages, onSend, starters = [], className }: Props) {
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const ask = async (text: string) => {
    if (!text.trim() || thinking) return
    setInput('')
    setThinking(true)
    try {
      await onSend(text, (history) => coach.send(profile, history, text.trim()))
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
```

- [ ] **Step 3: Update Coach.tsx to use useCoachChat**

Overwrite `src/pages/Coach.tsx`:

```typescript
import { useProfile } from '../hooks/useProfile'
import { useCoachChat } from '../hooks/useCoachChat'
import { mockCoach } from '../lib/coach/mockCoach'
import { suggestedVideos } from '../lib/videos'
import { totalDebt, fmtMoney } from '../types'
import ChatPanel from '../components/ChatPanel'
import VideoModuleCard from '../components/VideoModuleCard'

export default function Coach() {
  const { state } = useProfile()
  const { messages, send } = useCoachChat()

  if (!state) return null
  const { profile } = state
  const videos = suggestedVideos(profile, 2)

  const starters = [
    'Should I open a Roth IRA or pay off my credit card first?',
    profile.debt_breakdown.length > 0
      ? `What's the fastest way to pay off my ${fmtMoney(totalDebt(profile))} of debt?`
      : 'How do I start investing with only $50/month?',
    'I keep overspending on food — how do I fix it?',
    'How do I raise my credit score fast?',
    'What student discounts should I set up right now?',
    "What's the best student credit card for someone with no credit?",
  ]

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-ink">Delphi</h1>
        <p className="text-sm text-ink-faint">
          Your financial coach. Ask anything about budgeting, credit, investing, student discounts,
          or your goals. Every answer is grounded in your actual numbers.
        </p>
      </header>

      <ChatPanel
        profile={profile}
        coach={mockCoach}
        messages={messages}
        onSend={send}
        starters={starters}
      />

      {videos.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-2">
            Worth 2 minutes of your time
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {videos.map((v) => <VideoModuleCard key={v.id} video={v} />)}
          </div>
        </section>
      )}

      <p className="text-xs text-ink-faint">
        Delphi is an educational tool, not a licensed financial advisor. For major investment or
        tax decisions, talk to a fiduciary advisor or your school's financial wellness center.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npx tsc -b 2>&1
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCoachChat.tsx src/components/ChatPanel.tsx src/pages/Coach.tsx
git commit -m "feat: add useCoachChat, persist coach messages to Supabase"
```

---

## Task 9: Final build and .env.example

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

Create `.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 2: Fill in real values in .env.local**

Open `.env.local` and replace the placeholder values with your actual Supabase project URL and anon key (found in Supabase dashboard → Settings → API).

- [ ] **Step 3: Run full production build**

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run build 2>&1
```

Expected: build succeeds, `dist/` folder created with no TypeScript or Vite errors.

- [ ] **Step 4: Commit**

```bash
git add .env.example supabase/
git commit -m "feat: add .env.example, verify production build"
```

---

## Task 10: Vercel deployment

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Create Vercel project**

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your `personal-finance-coach` GitHub repo
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

- [ ] **Step 3: Add environment variables in Vercel**

In Vercel → Project Settings → Environment Variables:
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

- [ ] **Step 4: Deploy**

Click **Deploy**. Wait for the build to complete. Copy your live URL (e.g. `https://your-app.vercel.app`).

- [ ] **Step 5: Configure Supabase Auth redirect URLs**

In Supabase dashboard → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/**`

- [ ] **Step 6: Smoke test the live app**

1. Visit your Vercel URL
2. Sign up with a new email + password
3. Complete onboarding
4. Check Supabase Table Editor → `profiles` — your row should appear
5. Open Coach, send a message
6. Check `chat_messages` — rows should appear
7. Log out, log back in — all data should persist
8. Open the app in a different browser — data should still be there

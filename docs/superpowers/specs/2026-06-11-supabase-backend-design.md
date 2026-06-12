# Supabase Backend Design

**Date:** 2026-06-11  
**Status:** Approved  
**Deployment target:** Vercel

---

## Overview

Replace delphi's localStorage-only demo with a real Supabase backend. Covers auth, profile persistence, score history, and coach chat history. Profile data is stored as JSONB for simplicity; score history and chat messages get normalized rows.

---

## Architecture

```
Browser
├── src/lib/supabase.ts          Supabase JS client singleton
├── src/hooks/useAuth.tsx        Replaced: Supabase Auth
├── src/hooks/useProfile.tsx     Replaced: SELECT/UPSERT profiles table
└── src/hooks/useCoachChat.tsx   New: INSERT/SELECT chat_messages table

Supabase (hosted)
├── Auth                         email + password
├── profiles                     user_id PK, profile_data JSONB, updated_at
├── score_history                user_id, score, recorded_at
└── chat_messages                user_id, role, text, created_at
```

---

## Database Schema

```sql
-- profiles: one row per user
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  profile_data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "users manage own profile"
  on profiles for all using (auth.uid() = id);

-- score_history: append-only score snapshots
create table score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  recorded_at timestamptz not null default now()
);
alter table score_history enable row level security;
create policy "users manage own score history"
  on score_history for all using (auth.uid() = user_id);

-- chat_messages: append-only coach conversation
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'coach')),
  text text not null,
  created_at timestamptz not null default now()
);
alter table chat_messages enable row level security;
create policy "users manage own chat"
  on chat_messages for all using (auth.uid() = user_id);
```

---

## Data Flow

### Auth
- Sign up: `supabase.auth.signUp()` — session auto-persisted by SDK
- Log in: `supabase.auth.signInWithPassword()` — triggers one-time localStorage migration
- Log out: `supabase.auth.signOut()` — clear React state, redirect to `/`
- Session restore: `onAuthStateChange` listener on app mount

### Profile
- Read: fetch `profiles` row on auth, hydrate React state (loading spinner while pending)
- Write: write to localStorage immediately (optimistic), upsert to Supabase in background
- Migration: on first login, if localStorage has `delphi_state_v1`, upsert it to Supabase then remove from localStorage
- Score history: each `update()` that changes score INSERTs a `score_history` row

### Coach chat
- `useCoachChat` hook: loads last 50 messages from `chat_messages` on mount
- On user send: INSERT user message, call mock coach, INSERT coach reply
- Retry once on network error; show inline error on second failure

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Profile sync fails | Toast "Sync failed, changes saved locally"; data safe in localStorage |
| Auth error | Inline form message (existing pattern) |
| Chat send fails | Retry once silently; inline error on message |
| Session expired | `onAuthStateChange` fires SIGNED_OUT; redirect to `/` |

---

## Environment Variables

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Set in `.env.local` for dev, Vercel environment variables for prod.

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/supabase.ts` | New — client singleton |
| `src/lib/storage.ts` | Keep for offline cache; remove as source of truth |
| `src/hooks/useAuth.tsx` | Replace with Supabase Auth |
| `src/hooks/useProfile.tsx` | Replace localStorage with Supabase + localStorage cache |
| `src/hooks/useCoachChat.tsx` | New — chat persistence hook |
| `src/pages/Coach.tsx` | Wire up `useCoachChat` |
| `.env.local` | New — dev env vars (gitignored) |
| `package.json` | Add `@supabase/supabase-js` |

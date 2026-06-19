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

-- chat_conversations: one row per saved/resumable coach conversation
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chat_conversations enable row level security;
create policy "users manage own conversations"
  on public.chat_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- chat_messages: append-only coach conversation log
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'coach')),
  text text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "users manage own chat"
  on public.chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Migration for existing databases that already have chat_messages without
-- chat_conversations (run this block alone if the tables above already exist):
--   create table public.chat_conversations ( ... same as above ... );
--   alter table public.chat_conversations enable row level security;
--   create policy "users manage own conversations" on public.chat_conversations for all
--     using (auth.uid() = user_id) with check (auth.uid() = user_id);
--   alter table public.chat_messages add column conversation_id uuid
--     references public.chat_conversations(id) on delete cascade;

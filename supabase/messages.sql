-- Ubutumwa (Message) muri app -- ukore ibi rimwe gusa muri Supabase > SQL Editor > Run

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages: sender or recipient can select" on public.messages;
create policy "messages: sender or recipient can select" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "messages: sender can insert" on public.messages;
create policy "messages: sender can insert" on public.messages
  for insert with check (auth.uid() = sender_id);

-- Kugira umwakira ashobore kugenekereza ubutumwa nk'ubusomwe (read_at)
drop policy if exists "messages: recipient can mark read" on public.messages;
create policy "messages: recipient can mark read" on public.messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- Kugira uwohereje ashobore gusiba ubutumwa yandikishe
drop policy if exists "messages: sender can delete" on public.messages;
create policy "messages: sender can delete" on public.messages
  for delete using (auth.uid() = sender_id);

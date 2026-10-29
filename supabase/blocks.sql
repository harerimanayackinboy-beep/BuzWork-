-- Kubuza umuntu (block): ukore ibi vyose muri Supabase > SQL Editor > Run (rimwe gusa)

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "blocks: owner can select own" on public.blocks;
create policy "blocks: owner can select own" on public.blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists "blocks: owner can insert" on public.blocks;
create policy "blocks: owner can insert" on public.blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists "blocks: owner can delete" on public.blocks;
create policy "blocks: owner can delete" on public.blocks
  for delete using (auth.uid() = blocker_id);

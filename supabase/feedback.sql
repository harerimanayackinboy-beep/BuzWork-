-- Submit feedback + gusiba konti: ukore ibi vyose muri Supabase > SQL Editor > Run (rimwe gusa)

-- 1) Aho hashirwa ivyiyumviro/ibibazo abakoresha batanga
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback: owner can insert" on public.feedback;
create policy "feedback: owner can insert" on public.feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "feedback: owner can select own" on public.feedback;
create policy "feedback: owner can select own" on public.feedback
  for select using (auth.uid() = user_id);

-- 2) Kugira umukoresha ashobore gusiba umwirondoro we ubwiwe (gusiba konti)
drop policy if exists "profiles: owner can delete own" on public.profiles;
create policy "profiles: owner can delete own" on public.profiles
  for delete using (auth.uid() = user_id);

-- Ibyiciro (categories) + Ibyashimwe (favorites): ukore ibi vyose muri
-- Supabase > SQL Editor > Run (rimwe gusa, birakingiwe gusubiramwo)

-- 1) Ibyiciro ku bicuruzwa (Business). Ni option, atari ngombwa.
alter table public.products add column if not exists category text;
create index if not exists products_category_idx on public.products (category);

-- 2) Ibyashimwe (favorites/bookmarks): umukoresha abika itangazo kugira
--    aze ariyibutse nyuma, atagomba kuyashakisha mu feed nanone
create table if not exists public.product_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create table if not exists public.job_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

alter table public.product_favorites enable row level security;
alter table public.job_favorites enable row level security;

drop policy if exists "product_favorites: owner can select own" on public.product_favorites;
create policy "product_favorites: owner can select own" on public.product_favorites
  for select using (auth.uid() = user_id);
drop policy if exists "product_favorites: owner can insert own" on public.product_favorites;
create policy "product_favorites: owner can insert own" on public.product_favorites
  for insert with check (auth.uid() = user_id);
drop policy if exists "product_favorites: owner can delete own" on public.product_favorites;
create policy "product_favorites: owner can delete own" on public.product_favorites
  for delete using (auth.uid() = user_id);

drop policy if exists "job_favorites: owner can select own" on public.job_favorites;
create policy "job_favorites: owner can select own" on public.job_favorites
  for select using (auth.uid() = user_id);
drop policy if exists "job_favorites: owner can insert own" on public.job_favorites;
create policy "job_favorites: owner can insert own" on public.job_favorites
  for insert with check (auth.uid() = user_id);
drop policy if exists "job_favorites: owner can delete own" on public.job_favorites;
create policy "job_favorites: owner can delete own" on public.job_favorites
  for delete using (auth.uid() = user_id);

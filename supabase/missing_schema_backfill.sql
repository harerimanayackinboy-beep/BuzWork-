-- Backfill: ibi bibiri (reports, comments, likes, n'imikwano ya storage ku
-- mafoto y'ibicuruzwa/akazi) vyari vyarakozwe mu Supabase ariko ntakimigongo
-- (.sql) kavyerekana mu bubiko (repo). Iyi migration ni idempotent: niba
-- amatafari / amategeko asanzwe ahari, ntazosubira kuvyandukuza canke
-- kuvyonona -- ni ngombwa kuyinjiza gusa kugira repo ihuye n'ivyo app
-- ikoresha vy'ukuri.

-- ===================== REPORTS =====================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  reason text not null,
  description text,
  created_at timestamptz not null default now()
);
create unique index if not exists reports_unique_report
  on public.reports (reporter_id, entity_type, entity_id);

alter table public.reports enable row level security;

drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports select own" on public.reports;
create policy "reports select own" on public.reports
  for select using (auth.uid() = reporter_id);

-- ===================== COMMENTS =====================
create table if not exists public.product_comments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists product_comments_product_id_idx on public.product_comments (product_id);

create table if not exists public.job_comments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists job_comments_job_id_idx on public.job_comments (job_id);

alter table public.product_comments enable row level security;
alter table public.job_comments enable row level security;

drop policy if exists "product_comments select all" on public.product_comments;
create policy "product_comments select all" on public.product_comments for select using (true);
drop policy if exists "product_comments insert own" on public.product_comments;
create policy "product_comments insert own" on public.product_comments for insert with check (auth.uid() = author_id);
drop policy if exists "product_comments delete own" on public.product_comments;
create policy "product_comments delete own" on public.product_comments for delete using (auth.uid() = author_id);

drop policy if exists "job_comments select all" on public.job_comments;
create policy "job_comments select all" on public.job_comments for select using (true);
drop policy if exists "job_comments insert own" on public.job_comments;
create policy "job_comments insert own" on public.job_comments for insert with check (auth.uid() = author_id);
drop policy if exists "job_comments delete own" on public.job_comments;
create policy "job_comments delete own" on public.job_comments for delete using (auth.uid() = author_id);

-- ===================== LIKES =====================
create table if not exists public.product_likes (
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, user_id)
);
create table if not exists public.job_likes (
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);

alter table public.product_likes enable row level security;
alter table public.job_likes enable row level security;

drop policy if exists "product_likes select all" on public.product_likes;
create policy "product_likes select all" on public.product_likes for select using (true);
drop policy if exists "product_likes insert own" on public.product_likes;
create policy "product_likes insert own" on public.product_likes for insert with check (auth.uid() = user_id);
drop policy if exists "product_likes delete own" on public.product_likes;
create policy "product_likes delete own" on public.product_likes for delete using (auth.uid() = user_id);

drop policy if exists "job_likes select all" on public.job_likes;
create policy "job_likes select all" on public.job_likes for select using (true);
drop policy if exists "job_likes insert own" on public.job_likes;
create policy "job_likes insert own" on public.job_likes for insert with check (auth.uid() = user_id);
drop policy if exists "job_likes delete own" on public.job_likes;
create policy "job_likes delete own" on public.job_likes for delete using (auth.uid() = user_id);

-- ===================== STORAGE: product-images / job-images =====================
drop policy if exists "product-images public read" on storage.objects;
create policy "product-images public read" on storage.objects
  for select using (bucket_id = 'product-images');
drop policy if exists "product-images owner write" on storage.objects;
create policy "product-images owner write" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "product-images owner delete" on storage.objects;
create policy "product-images owner delete" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "job-images public read" on storage.objects;
create policy "job-images public read" on storage.objects
  for select using (bucket_id = 'job-images');
drop policy if exists "job-images owner write" on storage.objects;
create policy "job-images owner write" on storage.objects
  for insert with check (bucket_id = 'job-images' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "job-images owner delete" on storage.objects;
create policy "job-images owner delete" on storage.objects
  for delete using (bucket_id = 'job-images' and auth.uid()::text = (storage.foldername(name))[1]);

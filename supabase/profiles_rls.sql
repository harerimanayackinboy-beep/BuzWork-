-- Impushya (RLS) zikenewe kugira umukoresha mushasha abashe kwiyandikisha:
-- ukore ibi vyose muri Supabase > SQL Editor > Run (rimwe gusa, birakingiwe gusubiramwo)

-- 1) Kureka RLS ikore kuri profiles (iyo yari imaze gukora, ntibiterwa na kabiri)
alter table public.profiles enable row level security;

-- 2) Umukoresha abashe kubona umwirondoro wiwe bwite
drop policy if exists "profiles: owner can select own" on public.profiles;
create policy "profiles: owner can select own" on public.profiles
  for select using (auth.uid() = user_id);

-- 3) Umukoresha abashe GUSHIRAHO umwirondoro wiwe bwite (iki ni co gisigaye
--    gukenewe mu nzira yo kwiyandikisha -- niyo mpamvu abashasha batabashaga
--    kurangiza kwiyandikisha: nta ruhushya rwo "insert" rwariho)
drop policy if exists "profiles: owner can insert own" on public.profiles;
create policy "profiles: owner can insert own" on public.profiles
  for insert with check (auth.uid() = user_id);

-- 4) Umukoresha abashe guhindura umwirondoro wiwe bwite
drop policy if exists "profiles: owner can update own" on public.profiles;
create policy "profiles: owner can update own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Storage: ifoto ya profile (bucket "profile-photos") -- umukoresha
--    abashe gushiramwo/guhindura/gusiba ifoto yiwe bwite gusa (yashizwe mu
--    bubiko bufise izina rye mu izina ry'inzira, nk'uko app ibikora:
--    `${user.id}/${Date.now()}.jpg`)
drop policy if exists "profile-photos: owner can insert own" on storage.objects;
create policy "profile-photos: owner can insert own" on storage.objects
  for insert with check (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "profile-photos: owner can update own" on storage.objects;
create policy "profile-photos: owner can update own" on storage.objects
  for update using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "profile-photos: owner can delete own" on storage.objects;
create policy "profile-photos: owner can delete own" on storage.objects
  for delete using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6) Ifoto za profile zirabwa na bose (public bucket), kugira zigaragare kuri
--    feed/seller pages; niba bwaba atari bwo, iyi policy irabyemeza
drop policy if exists "profile-photos: anyone can view" on storage.objects;
create policy "profile-photos: anyone can view" on storage.objects
  for select using (bucket_id = 'profile-photos');

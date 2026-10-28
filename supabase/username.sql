-- @username + Search: ukore ibi vyose muri Supabase > SQL Editor > Run (rimwe gusa)

-- 1) Ahabikwa @username (si ngombwa, ariko niwayandika igomba kuba iyawe wenyene)
alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_unique
  on public.profiles (username) where username is not null;

-- 2) View yo gushakisha abantu (izina canke @username) -- ibintu bike gusa, nta banga
create or replace view public.search_profiles as
  select user_id, full_name, username, profile_photo_path
  from public.profiles;

revoke all on public.search_profiles from anon;
grant select on public.search_profiles to authenticated;

-- 3) Kwinjira (login) ukoresheje @username aho gukoresha email/telefone gusa
--    (bikora gusa ku bakoresha barashize email mu mwirondoro wabo)
create or replace function public.email_for_username(uname text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.profiles where username = lower(uname) limit 1
$$;

revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;

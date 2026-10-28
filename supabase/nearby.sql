-- Amatangazo ari hafi yawe (nearby): ukore ibi vyose muri Supabase > SQL Editor > Run (rimwe gusa)

-- 1) Aho hashirwa intera (lat/lng) y'umukoresha, bikoreshwa gusa kugira yerekwe amatangazo ari hafi
alter table public.profiles add column if not exists lat double precision;
alter table public.profiles add column if not exists lng double precision;

-- 2) View ireba gusa lat/lng (nta kindi kibanga), ku bakoresha bashize intera yabo
create or replace view public.public_geo as
  select user_id, lat, lng
  from public.profiles
  where lat is not null and lng is not null;

revoke all on public.public_geo from anon;
grant select on public.public_geo to authenticated;

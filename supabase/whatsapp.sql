-- WhatsApp button: ukore ibi rimwe gusa muri Supabase > SQL Editor > Run

-- 1) Ahabikwa numero ya WhatsApp (si ngombwa)
alter table public.profiles add column if not exists whatsapp_number text;

alter table public.profiles drop constraint if exists profiles_whatsapp_format;
alter table public.profiles add constraint profiles_whatsapp_format
  check (whatsapp_number is null or whatsapp_number ~ '^\+[0-9]{8,15}$');

-- 2) View yerekana numero ya WhatsApp gusa ku bakoresha binjiye, kandi gusa iyo uyirufise yayanditse
create or replace view public.public_whatsapp as
  select user_id, whatsapp_number
  from public.profiles
  where whatsapp_number is not null;

revoke all on public.public_whatsapp from anon;
grant select on public.public_whatsapp to authenticated;

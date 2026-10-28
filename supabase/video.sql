-- Video kuri amatangazo: ukore ibi vyose muri Supabase > SQL Editor > Run (rimwe gusa)

-- 1) Menyekanisha ko ikintu ari ifoto canke video
alter table public.product_images add column if not exists media_type text not null default 'image';
alter table public.product_images drop constraint if exists product_images_media_type_chk;
alter table public.product_images add constraint product_images_media_type_chk
  check (media_type in ('image','video'));

alter table public.job_images add column if not exists media_type text not null default 'image';
alter table public.job_images drop constraint if exists job_images_media_type_chk;
alter table public.job_images add constraint job_images_media_type_chk
  check (media_type in ('image','video'));

-- 2) Reka storage yemere video (si amafoto gusa), kandi yemere faili nini gato (50MB)
update storage.buckets set
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm'],
  file_size_limit = 52428800
where id in ('product-images','job-images');

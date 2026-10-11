import { supabase } from '../supabase'

export const PAGE_SIZE = 10
export const FEED_IMAGES = 4 // amafoto yerekanwa mu ntango (andi aza igihe ukanze "reba yose")
export const IMG_CHUNK = 24

export const KINDS = {
  product: {
    key: 'product',
    title: 'Ubudandaji',
    table: 'products',
    ownerCol: 'seller_id',
    imgTable: 'product_images',
    fk: 'product_id',
    likeTable: 'product_likes',
    commentTable: 'product_comments',
    bucket: 'product-images',
    maxImages: 500,
    reportType: 'product',
    commentReportType: 'product_comment',
  },
  job: {
    key: 'job',
    title: 'Akazi',
    table: 'jobs',
    ownerCol: 'owner_id',
    imgTable: 'job_images',
    fk: 'job_id',
    likeTable: 'job_likes',
    commentTable: 'job_comments',
    bucket: 'job-images',
    maxImages: 2,
    reportType: 'job',
    commentReportType: 'job_comment',
  },
}

// Gufata amatangazo (page ya 10) hamwe n'ibijyanye na byo
export async function fetchPosts(kind, { cursor, ownerId, id } = {}) {
  const c = KINDS[kind]
  let q = supabase.from(c.table).select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE)
  if (cursor) q = q.lt('created_at', cursor)
  if (ownerId) q = q.eq(c.ownerCol, ownerId)
  if (id) q = q.eq('id', id)
  const { data: posts, error } = await q
  if (error) throw error
  if (!posts.length) return []

  const ids = posts.map((p) => p.id)
  const owners = [...new Set(posts.map((p) => p[c.ownerCol]))]

  const [prof, imgs, likes, comments] = await Promise.all([
    supabase.from('public_profiles').select('*').in('user_id', owners),
    supabase.from(c.imgTable).select('*').in(c.fk, ids).lt('display_order', FEED_IMAGES).order('display_order'),
    supabase.from(c.likeTable).select(`user_id,${c.fk}`).in(c.fk, ids),
    supabase.from(c.commentTable).select(`id,${c.fk}`).in(c.fk, ids),
  ])
  for (const r of [prof, imgs, likes, comments]) if (r.error) throw r.error

  const byId = (rows, key) =>
    rows.reduce((m, r) => ((m[r[key]] ||= []).push(r), m), {})
  const profMap = Object.fromEntries(prof.data.map((p) => [p.user_id, p]))
  const imgMap = byId(imgs.data, c.fk)
  const likeMap = byId(likes.data, c.fk)
  const comMap = byId(comments.data, c.fk)

  return posts.map((p) => ({
    ...p,
    owner: profMap[p[c.ownerCol]] || null,
    images: imgMap[p.id] || [],
    likes: likeMap[p.id] || [],
    commentCount: (comMap[p.id] || []).length,
  }))
}

export async function fetchMoreImages(kind, postId, from) {
  const c = KINDS[kind]
  const { data, error } = await supabase
    .from(c.imgTable)
    .select('*')
    .eq(c.fk, postId)
    .gte('display_order', from)
    .order('display_order')
    .limit(IMG_CHUNK)
  if (error) throw error
  return data
}

export function postUrl(kind, id) {
  return `${window.location.origin}${window.location.pathname}#/post/${kind}/${id}`
}

import { supabase } from '../supabase'
import { KINDS, fetchPosts } from './posts'

// Gusiba konti: amatangazo yose (amafoto/video harimwo), ubutumwa yanditse,
// ifoto y'umwirondoro, n'umwirondoro ubwawo -- hanyuma gusohoka.
export async function deleteMyAccount(user) {
  for (const kind of Object.keys(KINDS)) {
    const c = KINDS[kind]
    const posts = await fetchPosts(kind, { ownerId: user.id })
    for (const p of posts) {
      const { data: all } = await supabase.from(c.imgTable).select('storage_path').eq(c.fk, p.id)
      const paths = (all || []).map((i) => i.storage_path)
      for (let i = 0; i < paths.length; i += 100) {
        await supabase.storage.from(c.bucket).remove(paths.slice(i, i + 100))
      }
      await supabase.from(c.table).delete().eq('id', p.id)
    }
  }

  await supabase.from('messages').delete().eq('sender_id', user.id)

  const { data: prof } = await supabase.from('profiles').select('profile_photo_path').eq('user_id', user.id).maybeSingle()
  if (prof?.profile_photo_path) {
    await supabase.storage.from('profile-photos').remove([prof.profile_photo_path])
  }

  const { error } = await supabase.from('profiles').delete().eq('user_id', user.id)
  if (error) throw error

  // Gusiba konti burundu (auth.users) -- iki gice gisaba "service role",
  // niyo mpamvu gikorerwa kuri Edge Function "delete-account" aho gukorerwa
  // hano ku ruhande rwa app. Nta iyi Edge Function, konti ya Supabase Auth
  // ntiyasibwa -- umukoresha yasangaga ashobora kongera kwinjira nk'aho
  // "delete my account" yari gusa logout.
  const { error: fnError } = await supabase.functions.invoke('delete-account')
  if (fnError) throw fnError

  await supabase.auth.signOut()
}

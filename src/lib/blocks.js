import { supabase } from '../supabase'

export async function isBlocked(myId, otherId) {
  const { data } = await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', myId)
    .eq('blocked_id', otherId)
    .maybeSingle()
  return !!data
}

export async function blockUser(myId, otherId) {
  const { error } = await supabase.from('blocks').insert({ blocker_id: myId, blocked_id: otherId })
  if (error && error.code !== '23505') throw error
}

export async function unblockUser(myId, otherId) {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', otherId)
  if (error) throw error
}

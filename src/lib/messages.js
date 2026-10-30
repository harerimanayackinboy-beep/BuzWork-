import { supabase } from '../supabase'
import { sendPushTo } from './push'

export const MSG_PAGE = 300

// Urutonde rw'ababwirizwa (umwe kuri buri wese wavuganye, hamwe n'ubutumwa bwa nyuma)
export async function fetchConversations(myId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
    .order('created_at', { ascending: false })
    .limit(MSG_PAGE)
  if (error) throw error

  const map = new Map()
  for (const m of data) {
    const otherId = m.sender_id === myId ? m.recipient_id : m.sender_id
    if (!map.has(otherId)) map.set(otherId, { otherId, last: m, unread: 0 })
    if (m.recipient_id === myId && !m.read_at) map.get(otherId).unread++
  }
  const convos = [...map.values()]
  if (!convos.length) return []

  const ids = convos.map((c) => c.otherId)
  const { data: profs } = await supabase.from('public_profiles').select('*').in('user_id', ids)
  const profMap = Object.fromEntries((profs || []).map((p) => [p.user_id, p]))
  return convos.map((c) => ({ ...c, profile: profMap[c.otherId] || null }))
}

// Ubutumwa hagati y'abantu babiri
export async function fetchThread(myId, otherId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw error
  return data
}

export async function sendMessage(myId, otherId, body) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: myId, recipient_id: otherId, body })
    .select()
    .single()
  if (error) throw error

  // Itangazo (push) ku muntu abonye ubutumwa, n'iyo app yiwe itafunguye.
  // Ntidutegereza (fire-and-forget): niba push itagenze, ubutumwa bwarungitswe.
  supabase
    .from('public_profiles')
    .select('full_name')
    .eq('user_id', myId)
    .maybeSingle()
    .then(({ data: me }) => {
      sendPushTo(otherId, {
        title: me?.full_name || 'BizWork',
        body: body.slice(0, 120),
        url: `/#/chat/${myId}`,
      })
    })

  return data
}

export async function deleteMessage(id) {
  const { error } = await supabase.from('messages').delete().eq('id', id)
  if (error) throw error
}

// Gusiba ikiganiro cose hagati y'abantu babiri
export async function deleteThread(myId, otherId) {
  const { error } = await supabase
    .from('messages')
    .delete()
    .or(`and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`)
  if (error) throw error
}

export async function markThreadRead(myId, otherId) {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', myId)
    .eq('sender_id', otherId)
    .is('read_at', null)
}

export async function countUnread(myId) {
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', myId)
    .is('read_at', null)
  return count || 0
}

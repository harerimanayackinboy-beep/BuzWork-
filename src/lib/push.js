import { supabase } from '../supabase'

// Urufunguzo rwa VAPID rukoreshwa na buri mukoresha (public key gusa, ntaco
// gitangaje kuba hano kuko ni "public")
const VAPID_PUBLIC_KEY = 'BFTekUf-40Izr3vUpQZ7irN4MoLzmgasStscctkTo5tqkpB8t16Nkj5jzKuEH-JcYurxMUjfPm74dKOjET28re4'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export function pushPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

async function getRegistration() {
  return navigator.serviceWorker.register('/sw.js')
}

// Gusaba uruhushya rw'amatangazo hanyuma ukandikisha (subscribe) kuri push,
// ukabika subscription muri Supabase kugira ngo ibikorwa vy'inyuma bibashe
// kohereza amatangazo kuri uyu mukoresha
export async function enablePush(userId) {
  if (!isPushSupported()) throw new Error('unsupported')
  const reg = await getRegistration()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('denied')

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
  return true
}

export async function disablePush(userId) {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).eq('user_id', userId)
    await sub.unsubscribe()
  }
}

export async function isPushEnabled() {
  if (!isPushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return !!sub
}

// Kohereza itangazo (push) ku mukoresha runaka, biciye ku Edge Function
// "send-push". Ntidusaba ko bigenda neza (fire-and-forget): niba
// bitagenze, ntibibuza ubutumwa kuoherezwa muri app.
export async function sendPushTo(userId, { title, body, url }) {
  try {
    await supabase.functions.invoke('send-push', { body: { to: userId, title, body, url } })
  } catch {
    /* ntakibazo: push ni ivyongera gusa, ntibibuza ubutumwa */
  }
}

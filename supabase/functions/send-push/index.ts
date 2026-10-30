// Edge Function: send-push
// Yohereza itangazo (push notification) ku mukoresha runaka, kuri telefoni
// yiwe, n'iyo app ya BizWork itari ifunguye.
//
// Gushira iyi fonction kuri Supabase (bikorwa rimwe gusa):
//   1) Supabase Dashboard -> Edge Functions -> Create a new function
//   2) Izina: send-push
//   3) Kopera ibiri muri iyi fayili yose, ushishire aho biherereye
//   4) Deploy
//   5) Edge Functions -> Manage secrets (environment variables), shiramwo:
//        VAPID_PUBLIC_KEY  = (kimwe cya VITE_PUBLIC_VAPID_KEY mu app)
//        VAPID_PRIVATE_KEY = (iryo banga, ntiwigere uryerekana ahandi)
//        VAPID_SUBJECT     = mailto:yourmail@example.com

// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@bizwork.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { to, title, body, url } = await req.json()
    if (!to) return new Response(JSON.stringify({ error: 'missing "to"' }), { status: 400, headers: cors })

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', to)
    if (error) throw error

    const payload = JSON.stringify({
      title: title || 'BizWork',
      body: body || '',
      url: url || '/',
    })

    const results = await Promise.allSettled(
      (subs || []).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    )

    // Iyo subscription itagikora (ex: umukoresha yakuyeho uruhushya), uyisibe
    const dead = []
    results.forEach((r, i) => {
      if (r.status === 'rejected' && (r.reason?.statusCode === 404 || r.reason?.statusCode === 410)) {
        dead.push(subs[i].endpoint)
      }
    })
    if (dead.length) await supabase.from('push_subscriptions').delete().in('endpoint', dead)

    return new Response(JSON.stringify({ sent: results.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

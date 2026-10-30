// Edge Function: delete-account
// Isiba burundu konti y'umukoresha (auth.users), kuko ibi bisaba "service
// role" idashobora gukoreshwa ku ruhande rwa app (browser) kubera umutekano.
// Nta bishaho iyo iyi function itariho: umukoresha avuga ko "delete my
// account" ikora nka logout gusa -- ni uko konti ya Supabase Auth itigera
// isibwa, igumaho, bityo umukoresha agasubira kwinjira.
//
// Gushira iyi fonction kuri Supabase (bikorwa rimwe gusa):
//   1) Supabase Dashboard -> Edge Functions -> Deploy a new function -> Via Editor
//   2) Izina: delete-account
//   3) Kopera ibiri muri iyi fayili yose, ushishire aho biherereye
//   4) Deploy
//   (Nta secret nshasha ikenewe kuri iyi function: ikoresha SUPABASE_URL na
//   SUPABASE_SERVICE_ROLE_KEY, izo zishirwaho ubwazo na Supabase kuri buri
//   Edge Function.)

// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return new Response(JSON.stringify({ error: 'no auth' }), { status: 401, headers: cors })

    // 1) Menya neza ni nde muntu (uwasabye) akoresheje token ye bwite
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await asUser.auth.getUser(token)
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'invalid session' }), { status: 401, headers: cors })
    }
    const userId = userData.user.id

    // 2) Koresha service role gusiba imibare yose ifitanye isano n'uyu
    //    mukoresha, hanyuma gusiba konti ubwayo muri auth.users
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    await admin.from('push_subscriptions').delete().eq('user_id', userId)
    await admin.from('messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    await admin.from('profiles').delete().eq('user_id', userId)

    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) throw delErr

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

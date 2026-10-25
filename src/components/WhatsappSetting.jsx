import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { normWhatsapp, isValidWhatsapp } from '../lib/whatsapp'

// Ahandikwa numero ya WhatsApp (si ngombwa). Nimba itanditse, button ya WhatsApp ntizogaragara ku matangazo yawe.
export default function WhatsappSetting() {
  const { user, profile, reloadProfile } = useAuth()
  const [value, setValue] = useState(profile?.whatsapp_number || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setMsg(''); setError('')
    const v = normWhatsapp(value)
    if (v && !isValidWhatsapp(v)) return setError("Andika numero hamwe n'ikode y'igihugu, nka +25779123456.")
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({ whatsapp_number: v || null })
      .eq('user_id', user.id)
    setBusy(false)
    if (error) return setError('Ntibyashobotse kubikwa. Ongera ugerageze nyuma.')
    setValue(v)
    await reloadProfile()
    setMsg(v ? 'Numero ya WhatsApp yabitswe ✅' : 'Numero ya WhatsApp yakuweho.')
  }

  return (
    <form onSubmit={save} className="card stack wa-box">
      <h3>🟢 WhatsApp yanje</h3>
      <p className="muted small">
        Nushiraho numero yawe ya WhatsApp, abandi bazobona button ya WhatsApp ku matangazo yawe.
        Nuyisiga ubusa, button ntizogaragara.
      </p>
      <input
        type="tel"
        inputMode="tel"
        placeholder="+25779123456"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="btn" disabled={busy}>{busy ? 'Ndabika…' : 'Bika'}</button>
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </form>
  )
}

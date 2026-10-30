import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { normWhatsapp, isValidWhatsapp } from '../lib/whatsapp'
import { useT } from '../i18n'
import PhoneInput from './PhoneInput'

// Ahandikwa numero ya WhatsApp (si ngombwa). Nimba itanditse, button ya WhatsApp ntizogaragara ku matangazo yawe.
export default function WhatsappSetting() {
  const t = useT()
  const { user, profile, reloadProfile } = useAuth()
  const [value, setValue] = useState(profile?.whatsapp_number || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setMsg(''); setError('')
    const v = normWhatsapp(value)
    if (v && !isValidWhatsapp(v)) return setError(t('settings.waInvalid'))
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({ whatsapp_number: v || null })
      .eq('user_id', user.id)
    setBusy(false)
    if (error) return setError(t('settings.waSaveFail'))
    setValue(v)
    await reloadProfile()
    setMsg(v ? t('settings.waSaved') : t('settings.waRemoved'))
  }

  return (
    <form onSubmit={save} className="card stack wa-box">
      <h3>{t('settings.waTitle')}</h3>
      <p className="muted small">{t('settings.waHelp')}</p>
      <PhoneInput value={value} onChange={setValue} />
      <button className="btn" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </form>
  )
}

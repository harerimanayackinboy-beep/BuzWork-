import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useT } from '../i18n'

// Ahandikwa @username (si ngombwa). Nimba yarandikwa, abandi barashaka ukoresheje iyo @username.
export default function UsernameSetting() {
  const t = useT()
  const { user, profile, reloadProfile } = useAuth()
  const [value, setValue] = useState(profile?.username || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setMsg(''); setError('')
    const v = value.trim().toLowerCase().replace(/^@/, '')
    if (v && !/^[a-z0-9_]{3,20}$/.test(v)) return setError(t('settings.usernameInvalid'))
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({ username: v || null })
      .eq('user_id', user.id)
    setBusy(false)
    if (error) {
      if (error.code === '23505') return setError(t('settings.usernameTaken'))
      return setError(t('settings.usernameSaveFail'))
    }
    setValue(v)
    await reloadProfile()
    setMsg(v ? t('settings.usernameSaved') : t('settings.usernameRemoved'))
  }

  return (
    <form onSubmit={save} className="card stack">
      <p className="muted small">{t('settings.usernameHelp')}</p>
      <input
        type="text"
        autoCapitalize="none"
        placeholder={t('settings.usernamePlaceholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="btn" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </form>
  )
}

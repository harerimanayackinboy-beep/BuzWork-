import { useState } from 'react'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { deleteMyAccount } from '../lib/account'

// Gusiba konti burundu: amatangazo, ubutumwa n'umwirondoro byose birasibwa.
export default function AccountDelete() {
  const t = useT()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (!confirm(t('settings.deleteConfirm1'))) return
    if (!confirm(t('settings.deleteConfirm2'))) return
    setBusy(true)
    setError('')
    try {
      await deleteMyAccount(user)
    } catch {
      setError(t('settings.deleteFail'))
      setBusy(false)
    }
  }

  return (
    <div className="card stack">
      <p className="muted small">{t('settings.deleteHelp')}</p>
      <button className="btn danger" disabled={busy} onClick={run}>
        {busy ? t('common.saving') : t('settings.deleteAccount')}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

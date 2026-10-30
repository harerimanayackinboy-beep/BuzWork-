import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { isPushSupported, isPushEnabled, enablePush, disablePush, pushPermission } from '../lib/push'

export default function NotificationSetting() {
  const t = useT()
  const { user } = useAuth()
  const [supported] = useState(isPushSupported())
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supported) return
    isPushEnabled().then(setOn)
  }, [supported])

  async function toggle() {
    setError('')
    setBusy(true)
    try {
      if (on) {
        await disablePush(user.id)
        setOn(false)
      } else {
        await enablePush(user.id)
        setOn(true)
      }
    } catch (err) {
      if (err.message === 'denied' || pushPermission() === 'denied') setError(t('settings.notifDenied'))
      else setError(t('common.genericError'))
    }
    setBusy(false)
  }

  if (!supported) {
    return <div className="card"><p className="muted small">{t('settings.notifUnsupported')}</p></div>
  }

  return (
    <div className="card stack">
      <p className="muted small">{t('settings.notifHelp')}</p>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <button className={`btn small ${on ? '' : 'ghost'}`} disabled={busy} onClick={toggle}>
          {busy ? t('common.loading') : on ? t('settings.notifOn') : t('settings.notifOff')}
        </button>
      </div>
      {error && <p className="error small">{error}</p>}
    </div>
  )
}

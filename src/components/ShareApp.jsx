import { useState } from 'react'
import { useT } from '../i18n'

const APP_URL = 'https://buz-work.vercel.app'

export default function ShareApp() {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  async function doShare() {
    setError('')
    try {
      await navigator.share({ title: 'BizWork', text: t('settings.shareText'), url: APP_URL })
    } catch (err) {
      if (err?.name !== 'AbortError') setError(t('common.genericError'))
    }
  }

  async function doCopy() {
    setError('')
    try {
      await navigator.clipboard.writeText(APP_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError(t('settings.shareCopyFail'))
    }
  }

  return (
    <div className="card stack">
      <p className="muted small">{t('settings.shareHelp')}</p>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <input readOnly value={APP_URL} onFocus={(e) => e.target.select()} style={{ flex: 1 }} />
      </div>
      <div className="row" style={{ gap: 8 }}>
        {canShare && <button className="btn small" onClick={doShare}>{t('settings.shareButton')}</button>}
        <button className="btn small ghost" onClick={doCopy}>{t('settings.shareCopy')}</button>
      </div>
      {copied && <p className="muted small">{t('settings.shareCopied')}</p>}
      {error && <p className="error small">{error}</p>}
    </div>
  )
}

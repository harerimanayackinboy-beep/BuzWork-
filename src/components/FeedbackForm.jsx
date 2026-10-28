import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useT } from '../i18n'

// Kohereza ivyiyumviro/ikibazo ku bagira BuzWork
export default function FeedbackForm() {
  const t = useT()
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function send(e) {
    e.preventDefault()
    const v = body.trim()
    if (!v) return
    setBusy(true)
    setMsg(''); setError('')
    const { error } = await supabase.from('feedback').insert({ user_id: user.id, body: v })
    setBusy(false)
    if (error) return setError(t('settings.feedbackFail'))
    setBody('')
    setMsg(t('settings.feedbackSent'))
  }

  return (
    <form onSubmit={send} className="card stack">
      <p className="muted small">{t('settings.feedbackHelp')}</p>
      <textarea rows={4} maxLength={2000} placeholder={t('settings.feedbackPlaceholder')} value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="btn" disabled={busy || !body.trim()}>{busy ? t('common.saving') : t('settings.feedbackSend')}</button>
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </form>
  )
}

import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useT } from '../i18n'

export default function ReportButton({ entityType, entityId }) {
  const t = useT()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const REASONS = [t('report.scam'), t('report.false'), t('report.inappropriate'), t('report.fakeAccount'), t('report.other')]
  const [reason, setReason] = useState(REASONS[0])
  const [desc, setDesc] = useState('')
  const [msg, setMsg] = useState('')

  async function send() {
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      reason,
      description: desc.trim() || null,
    })
    if (error) {
      setMsg(error.code === '23505' ? t('report.already') : t('report.fail'))
    } else {
      setMsg(t('report.thanks'))
    }
    setTimeout(() => { setOpen(false); setMsg('') }, 1800)
  }

  if (!open) return <button className="link" onClick={() => setOpen(true)}>{t('report.open')}</button>
  return (
    <div className="report-box">
      {msg ? <p>{msg}</p> : (
        <>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <textarea placeholder={t('report.describe')} value={desc} maxLength={2000} onChange={(e) => setDesc(e.target.value)} />
          <div className="row">
            <button className="btn ghost small" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button className="btn small" onClick={send}>{t('common.send')}</button>
          </div>
        </>
      )}
    </div>
  )
}

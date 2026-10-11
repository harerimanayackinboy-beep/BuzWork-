import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'

const REASONS = ['Ubuhemu / scam', 'Ibinyoma', 'Ibitesha agaciro', 'Konti y\'ibinyoma', 'Ikindi']

export default function ReportButton({ entityType, entityId }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
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
      setMsg(error.code === '23505' ? 'Wamaze gutanga raporo kuri ibi.' : 'Raporo ntiyashobotse kuja.')
    } else {
      setMsg('Murakoze. Raporo yawe yarakiriwe.')
    }
    setTimeout(() => { setOpen(false); setMsg('') }, 1800)
  }

  if (!open) return <button className="link" onClick={() => setOpen(true)}>Tanga raporo</button>
  return (
    <div className="report-box">
      {msg ? <p>{msg}</p> : (
        <>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <textarea placeholder="Sobanura (si ngombwa)" value={desc} maxLength={2000} onChange={(e) => setDesc(e.target.value)} />
          <div className="row">
            <button className="btn ghost small" onClick={() => setOpen(false)}>Reka</button>
            <button className="btn small" onClick={send}>Ohereza</button>
          </div>
        </>
      )}
    </div>
  )
}

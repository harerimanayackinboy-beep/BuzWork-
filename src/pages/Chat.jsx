import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { fetchThread, sendMessage, markThreadRead } from '../lib/messages'

export default function Chat() {
  const t = useT()
  const nav = useNavigate()
  const { id: otherId } = useParams()
  const { user } = useAuth()
  const [other, setOther] = useState(undefined)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.from('public_profiles').select('*').eq('user_id', otherId).maybeSingle().then(({ data }) => setOther(data || null))
  }, [otherId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchThread(user.id, otherId)
      .then((data) => { if (!cancelled) setMessages(data) })
      .catch(() => { if (!cancelled) setError(t('chat.loadFail')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    markThreadRead(user.id, otherId).catch(() => {})

    // Dusoma ubutumwa bushasha buri masegonda 4 (nta realtime isaba kwishyura)
    const poll = setInterval(() => {
      fetchThread(user.id, otherId).then((data) => { if (!cancelled) setMessages(data) }).catch(() => {})
      markThreadRead(user.id, otherId).catch(() => {})
    }, 4000)
    return () => { cancelled = true; clearInterval(poll) }
  }, [otherId, user.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function submit(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setBusy(true)
    setError('')
    const optimistic = { id: `tmp-${Date.now()}`, sender_id: user.id, recipient_id: otherId, body, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, optimistic])
    setText('')
    try {
      const saved = await sendMessage(user.id, otherId, body)
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)))
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setError(t('chat.sendFail'))
    }
    setBusy(false)
  }

  return (
    <div className="page narrow chat-page">
      <header className="topbar">
        <button className="link" onClick={() => nav(-1)}>{t('common.back')}</button>
        <span className="strong">{other?.full_name || t('common.user')}</span>
        <span />
      </header>

      {loading && <p className="muted center">{t('common.loading')}</p>}
      {error && <p className="error center">{error}</p>}

      {!loading && (
        <>
          <div className="chat-thread">
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.sender_id === user.id ? 'mine' : ''}`}>
                <p>{m.body}</p>
                <span className="muted small">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={submit} className="row chat-input">
            <input value={text} maxLength={2000} placeholder={t('chat.placeholder')} onChange={(e) => setText(e.target.value)} />
            <button className="btn small" disabled={busy || !text.trim()}>{t('common.send')}</button>
          </form>
        </>
      )}
    </div>
  )
}

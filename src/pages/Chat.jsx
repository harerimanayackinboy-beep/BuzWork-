import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { fetchThread, sendMessage, markThreadRead, deleteMessage, deleteThread } from '../lib/messages'
import { isBlocked, blockUser, unblockUser } from '../lib/blocks'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const bottomRef = useRef(null)
  const pressTimer = useRef(null)

  useEffect(() => {
    supabase.from('public_profiles').select('*').eq('user_id', otherId).maybeSingle().then(({ data }) => setOther(data || null))
    isBlocked(user.id, otherId).then(setBlocked).catch(() => {})
  }, [otherId, user.id])

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
    if (blocked) return setError(t('chat.youBlocked'))
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

  function startPress(id) {
    if (String(id).startsWith('tmp-')) return
    clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => {
      setSelecting(true)
      setSelected(new Set([id]))
    }, 450)
  }
  function cancelPress() {
    clearTimeout(pressTimer.current)
  }
  function tapBubble(id) {
    if (!selecting || String(id).startsWith('tmp-')) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) setSelecting(false)
      return next
    })
  }
  function cancelSelection() {
    setSelecting(false)
    setSelected(new Set())
  }

  async function deleteSelected() {
    if (!confirm(t('chat.confirmDelete'))) return
    const ids = [...selected]
    setMessages((prev) => prev.filter((m) => !selected.has(m.id)))
    cancelSelection()
    try { await Promise.all(ids.map((id) => deleteMessage(id))) } catch { setError(t('common.deleteFail')) }
  }

  async function resendSelected() {
    const toSend = messages.filter((m) => selected.has(m.id)).map((m) => m.body)
    cancelSelection()
    for (const body of toSend) {
      const optimistic = { id: `tmp-${Date.now()}-${Math.random()}`, sender_id: user.id, recipient_id: otherId, body, created_at: new Date().toISOString() }
      setMessages((prev) => [...prev, optimistic])
      try {
        const saved = await sendMessage(user.id, otherId, body)
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)))
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setError(t('chat.sendFail'))
      }
    }
  }

  async function shareSelected() {
    const text = messages.filter((m) => selected.has(m.id)).map((m) => m.body).join('\n')
    cancelSelection()
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setError(''); }
    } catch { /* umukoresha yaretse */ }
  }

  async function removeThread() {
    if (!confirm(t('chat.confirmDeleteThread'))) return
    setMenuOpen(false)
    try {
      await deleteThread(user.id, otherId)
      setMessages([])
    } catch {
      setError(t('common.deleteFail'))
    }
  }

  async function toggleBlock() {
    setMenuOpen(false)
    try {
      if (blocked) { await unblockUser(user.id, otherId); setBlocked(false) }
      else { if (!confirm(t('chat.confirmBlock'))) return; await blockUser(user.id, otherId); setBlocked(true) }
    } catch {
      setError(t('common.saveFail'))
    }
  }

  return (
    <div className="page narrow chat-page">
      {selecting ? (
        <header className="topbar">
          <button className="link" onClick={cancelSelection}>✕</button>
          <span className="strong">{t('chat.selectedCount', { n: selected.size })}</span>
          <div className="row" style={{ gap: 14 }}>
            <button className="link" aria-label={t('chat.share')} style={{ fontSize: 20 }} onClick={shareSelected}>📤</button>
            <button className="link" aria-label={t('chat.resend')} style={{ fontSize: 20 }} onClick={resendSelected}>🔁</button>
            <button className="link danger" aria-label={t('common.delete')} style={{ fontSize: 20 }} onClick={deleteSelected}>🗑️</button>
          </div>
        </header>
      ) : (
        <header className="topbar">
          <button className="link" onClick={() => nav(-1)}>{t('common.back')}</button>
          <span className="strong">{other?.full_name || t('common.user')}</span>
          <button className="link kebab" aria-label={t('chat.options')} onClick={() => setMenuOpen(true)}>⋮</button>
        </header>
      )}

      {menuOpen && (
        <div className="sheet-overlay" onClick={() => setMenuOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {other && <Link to={`/seller/${other.user_id}`} className="link" onClick={() => setMenuOpen(false)}>{t('chat.viewProfile')}</Link>}
            <button className="link danger" onClick={toggleBlock}>{blocked ? t('chat.unblock') : t('chat.block')}</button>
            <button className="link danger" onClick={removeThread}>{t('chat.deleteThread')}</button>
            <button className="link" onClick={() => setMenuOpen(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {loading && <p className="muted center">{t('common.loading')}</p>}
      {error && <p className="error center">{error}</p>}
      {blocked && <p className="muted center small">{t('chat.blockedNotice')}</p>}

      {!loading && (
        <>
          <div className="chat-thread">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`bubble ${m.sender_id === user.id ? 'mine' : ''} ${selected.has(m.id) ? 'selected' : ''}`}
                onPointerDown={() => startPress(m.id)}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onClick={() => tapBubble(m.id)}
              >
                <p>{m.body}</p>
                <span className="muted small">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={submit} className="row chat-input">
            <input value={text} maxLength={2000} placeholder={t('chat.placeholder')} onChange={(e) => setText(e.target.value)} disabled={blocked} />
            <button className="btn small" disabled={busy || blocked || !text.trim()}>{t('common.send')}</button>
          </form>
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { KINDS } from '../lib/posts'
import ReportButton from './ReportButton'

export default function Comments({ kind, postId, onCount }) {
  const c = KINDS[kind]
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [names, setNames] = useState({})
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from(c.commentTable)
      .select('*')
      .eq(c.fk, postId)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) { setError('Ibitekerezo ntibyashobotse kuza.'); setLoading(false); return }
    setItems(data)
    onCount?.(data.length)
    const ids = [...new Set(data.map((d) => d.author_id))]
    if (ids.length) {
      const { data: ps } = await supabase.from('public_profiles').select('user_id,full_name').in('user_id', ids)
      setNames(Object.fromEntries((ps || []).map((p) => [p.user_id, p.full_name])))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [postId])

  async function add(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setError('')
    const { error } = await supabase.from(c.commentTable).insert({ [c.fk]: postId, author_id: user.id, body })
    if (error) return setError('Igitekerezo ntikinjiye.')
    setText('')
    load()
  }

  async function remove(id) {
    if (!confirm('Gusiba iki gitekerezo?')) return
    const { error } = await supabase.from(c.commentTable).delete().eq('id', id)
    if (error) return setError('Ntibishobotse gusibwa.')
    load()
  }

  return (
    <div className="comments">
      {loading && <p className="muted">Ndikuzana…</p>}
      {items.map((it) => (
        <div key={it.id} className="comment">
          <Link to={`/seller/${it.author_id}`} className="strong">{names[it.author_id] || 'Umukoresha'}</Link>
          <span> {it.body}</span>
          <div className="comment-actions">
            {it.author_id === user.id
              ? <button className="link" onClick={() => remove(it.id)}>Siba</button>
              : <ReportButton entityType={c.commentReportType} entityId={it.id} />}
          </div>
        </div>
      ))}
      <form onSubmit={add} className="row">
        <input value={text} maxLength={1000} placeholder="Andika igitekerezo…" onChange={(e) => setText(e.target.value)} />
        <button className="btn small" type="submit">Ohereza</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

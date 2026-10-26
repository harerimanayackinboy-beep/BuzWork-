import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { KINDS } from '../lib/posts'
import ReportButton from './ReportButton'
import { useT } from '../i18n'

export default function Comments({ kind, postId, onCount }) {
  const t = useT()
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
    if (error) { setError(t('comments.loadFail')); setLoading(false); return }
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
    if (error) return setError(t('comments.sendFail'))
    setText('')
    load()
  }

  async function remove(id) {
    if (!confirm(t('comments.confirmDelete'))) return
    const { error } = await supabase.from(c.commentTable).delete().eq('id', id)
    if (error) return setError(t('common.deleteFail'))
    load()
  }

  return (
    <div className="comments">
      {loading && <p className="muted">{t('common.loading')}</p>}
      {items.map((it) => (
        <div key={it.id} className="comment">
          <Link to={`/seller/${it.author_id}`} className="strong">{names[it.author_id] || t('common.user')}</Link>
          <span> {it.body}</span>
          <div className="comment-actions">
            {it.author_id === user.id
              ? <button className="link" onClick={() => remove(it.id)}>{t('common.delete')}</button>
              : <ReportButton entityType={c.commentReportType} entityId={it.id} />}
          </div>
        </div>
      ))}
      <form onSubmit={add} className="row">
        <input value={text} maxLength={1000} placeholder={t('comments.placeholder')} onChange={(e) => setText(e.target.value)} />
        <button className="btn small" type="submit">{t('common.send')}</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

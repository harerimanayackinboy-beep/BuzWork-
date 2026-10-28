import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { Avatar } from '../components/PostCard'
import { useT } from '../i18n'

export default function Search() {
  const t = useT()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const term = q.trim().replace(/^@/, '')
    if (!term) { setResults([]); setLoading(false); return }
    setLoading(true)
    const timer = setTimeout(() => {
      supabase
        .from('search_profiles')
        .select('*')
        .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
        .limit(25)
        .then(({ data }) => setResults(data || []))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [q])

  return (
    <div className="page narrow">
      <header className="topbar">
        <button className="link" onClick={() => nav(-1)}>{t('common.back')}</button>
        <h2>{t('search.title')}</h2>
        <span />
      </header>

      <input
        type="text"
        autoFocus
        placeholder={t('search.placeholder')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {loading && <p className="muted center">{t('common.loading')}</p>}
      {!loading && q.trim() && !results.length && <p className="muted center">{t('search.noResults')}</p>}
      {!q.trim() && <p className="muted center">{t('search.empty')}</p>}

      <div className="stack" style={{ marginTop: 12 }}>
        {results.map((p) => (
          <Link key={p.user_id} to={`/seller/${p.user_id}`} className="card row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Avatar profile={p} size={48} />
            <div>
              <div className="strong">{p.full_name}</div>
              {p.username && <div className="muted small">@{p.username}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

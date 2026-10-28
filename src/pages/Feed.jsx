import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPosts, KINDS, PAGE_SIZE } from '../lib/posts'
import PostCard from '../components/PostCard'
import { useT } from '../i18n'

export default function Feed({ kind }) {
  const t = useT()
  const c = KINDS[kind]
  const nav = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(true)
  const [error, setError] = useState('')
  const loadingRef = useRef(false)

  async function load(reset = false) {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError('')
    try {
      const cursor = reset || !posts.length ? undefined : posts[posts.length - 1].created_at
      const page = await fetchPosts(kind, { cursor })
      setPosts(reset ? page : [...posts, ...page])
      setMore(page.length === PAGE_SIZE)
    } catch {
      setError(t('feed.error'))
    }
    setLoading(false)
    loadingRef.current = false
  }

  useEffect(() => { load(true) }, [kind])

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav(-1)}>{t('common.back')}</button>
        <h2>{kind === 'product' ? t('kind.product') : t('kind.job')}</h2>
        <div className="row" style={{ gap: 10 }}>
          <Link to={`/new/${kind}`} className="fab-plus" aria-label={t('home.newPost')}>+</Link>
          <Link to="/search" className="link" aria-label={t('home.searchLabel')} style={{ fontSize: 22, textDecoration: 'none' }}>🔎</Link>
          <Link to="/settings" className="link kebab" aria-label={t('home.settingsLabel')}>⋮</Link>
        </div>
      </header>

      {posts.map((p) => (
        <PostCard key={p.id} kind={kind} post={p} onDeleted={(id) => setPosts(posts.filter((x) => x.id !== id))} />
      ))}
      {!loading && !posts.length && !error && <p className="muted center">{t('feed.empty')}</p>}
      {error && <p className="error center">{error}</p>}
      {loading && <p className="muted center">{t('common.loading')}</p>}
      {!loading && more && posts.length > 0 && <button className="btn ghost" onClick={() => load()}>{t('feed.more')}</button>}
    </div>
  )
}

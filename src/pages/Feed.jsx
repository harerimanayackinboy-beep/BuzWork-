import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPosts, KINDS, PAGE_SIZE } from '../lib/posts'
import PostCard from '../components/PostCard'

export default function Feed({ kind }) {
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
      setError('Amatangazo ntiyashobotse kuza. Reba internet.')
    }
    setLoading(false)
    loadingRef.current = false
  }

  useEffect(() => { load(true) }, [kind])

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav(-1)}>← Subira</button>
        <h2>{c.title}</h2>
        <Link to={`/new/${kind}`} className="btn small">+ Shiraho</Link>
      </header>

      {posts.map((p) => (
        <PostCard key={p.id} kind={kind} post={p} onDeleted={(id) => setPosts(posts.filter((x) => x.id !== id))} />
      ))}
      {!loading && !posts.length && !error && <p className="muted center">Nta tangazo riraboneka.</p>}
      {error && <p className="error center">{error}</p>}
      {loading && <p className="muted center">Ndikuzana…</p>}
      {!loading && more && posts.length > 0 && <button className="btn ghost" onClick={() => load()}>Zana ibindi</button>}
    </div>
  )
}

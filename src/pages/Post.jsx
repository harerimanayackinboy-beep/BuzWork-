import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPosts, KINDS } from '../lib/posts'
import PostCard from '../components/PostCard'

export default function Post() {
  const { kind, id } = useParams()
  const nav = useNavigate()
  const [post, setPost] = useState(undefined)

  useEffect(() => {
    if (!KINDS[kind]) return setPost(null)
    fetchPosts(kind, { id }).then((r) => setPost(r[0] || null)).catch(() => setPost(null))
  }, [kind, id])

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>← Ahabanza</button>
        <span />
      </header>
      {post === undefined && <p className="muted center">Ndikuzana…</p>}
      {post === null && <p className="center">Iri tangazo ntiriboneka.</p>}
      {post && <PostCard kind={kind} post={post} onDeleted={() => nav('/')} />}
    </div>
  )
}

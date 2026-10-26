import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPosts, KINDS } from '../lib/posts'
import PostCard from '../components/PostCard'
import { useT } from '../i18n'

export default function Post() {
  const t = useT()
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
        <button className="link" onClick={() => nav('/')}>{t('common.backHome')}</button>
        <span />
      </header>
      {post === undefined && <p className="muted center">{t('common.loading')}</p>}
      {post === null && <p className="center">{t('post.notFound')}</p>}
      {post && <PostCard kind={kind} post={post} onDeleted={() => nav('/')} />}
    </div>
  )
}

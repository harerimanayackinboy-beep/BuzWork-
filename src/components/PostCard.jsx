import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, publicUrl } from '../supabase'
import { useAuth } from '../auth'
import { KINDS, fetchMoreImages, postUrl, FEED_IMAGES } from '../lib/posts'
import Comments from './Comments'
import ReportButton from './ReportButton'

export default function PostCard({ kind, post, onDeleted }) {
  const c = KINDS[kind]
  const { user } = useAuth()
  const isOwner = post[c.ownerCol] === user.id

  const [images, setImages] = useState(post.images)
  const [moreImages, setMoreImages] = useState(post.images.length >= FEED_IMAGES && c.maxImages > 2)
  const [likes, setLikes] = useState(post.likes)
  const [commentCount, setCommentCount] = useState(post.commentCount)
  const [showComments, setShowComments] = useState(false)
  const [status, setStatus] = useState(post.status)
  const [msg, setMsg] = useState('')

  const liked = likes.some((l) => l.user_id === user.id)

  async function toggleLike() {
    if (liked) {
      setLikes(likes.filter((l) => l.user_id !== user.id))
      const { error } = await supabase.from(c.likeTable).delete().eq(c.fk, post.id).eq('user_id', user.id)
      if (error) setLikes(likes)
    } else {
      const next = [...likes, { user_id: user.id, [c.fk]: post.id }]
      setLikes(next)
      const { error } = await supabase.from(c.likeTable).insert({ [c.fk]: post.id, user_id: user.id })
      if (error && error.code !== '23505') setLikes(likes)
    }
  }

  async function share() {
    const url = postUrl(kind, post.id)
    try {
      if (navigator.share) await navigator.share({ title: post.caption.slice(0, 60), url })
      else { await navigator.clipboard.writeText(url); setMsg('Link yakopewe.'); setTimeout(() => setMsg(''), 1800) }
    } catch { /* umukoresha yaretse */ }
  }

  async function loadMore() {
    const last = images.length ? images[images.length - 1].display_order + 1 : 0
    const more = await fetchMoreImages(kind, post.id, last)
    setImages([...images, ...more])
    if (more.length < 24) setMoreImages(false)
  }

  async function toggleTaken() {
    const next = status === 'taken' ? 'open' : 'taken'
    const { error } = await supabase.from('jobs').update({ status: next }).eq('id', post.id)
    if (error) return setMsg('Ntibishobotse guhinduka.')
    setStatus(next)
  }

  async function remove() {
    if (!confirm('Gusiba iri tangazo burundu?')) return
    const { data: all } = await supabase.from(c.imgTable).select('storage_path').eq(c.fk, post.id)
    const paths = (all || []).map((i) => i.storage_path)
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from(c.bucket).remove(paths.slice(i, i + 100))
    }
    const { error } = await supabase.from(c.table).delete().eq('id', post.id)
    if (error) return setMsg('Ntibishobotse gusibwa.')
    onDeleted?.(post.id)
  }

  return (
    <article className="card post">
      <header className="post-head">
        <Link to={`/seller/${post[c.ownerCol]}`} className="seller">
          <Avatar profile={post.owner} />
          <div>
            <div className="strong">{post.owner?.full_name || 'Umukoresha'}</div>
            <div className="muted small">
              {new Date(post.created_at).toLocaleDateString()} {post.location ? `· ${post.location}` : ''}
            </div>
          </div>
        </Link>
        {kind === 'job' && status === 'taken' && <span className="badge">TAKEN ✅</span>}
      </header>

      {images.length > 0 && (
        <div className={`gallery g${Math.min(images.length, 4)}`}>
          {images.map((im) => (
            <img key={im.id} loading="lazy" src={publicUrl(c.bucket, im.storage_path)} alt="" />
          ))}
        </div>
      )}
      {moreImages && <button className="link" onClick={loadMore}>Reba amafoto menshi</button>}

      <p className="caption">{post.caption}</p>
      {kind === 'product' && (post.price != null || post.details) && (
        <p className="muted">
          {post.price != null && <strong>{post.price} {post.currency || ''}</strong>}
          {post.details ? ` · ${post.details}` : ''}
        </p>
      )}

      <div className="actions">
        <button className={`act ${liked ? 'on' : ''}`} onClick={toggleLike}>👍 Like {likes.length || ''}</button>
        <button className="act" onClick={() => setShowComments(!showComments)}>💬 Comment {commentCount || ''}</button>
        <button className="act" onClick={share}>↗ Share</button>
      </div>

      {showComments && <Comments kind={kind} postId={post.id} onCount={setCommentCount} />}

      <footer className="post-foot">
        {isOwner ? (
          <>
            {kind === 'job' && (
              <button className="btn small ghost" onClick={toggleTaken}>
                {status === 'taken' ? 'Subiza nk\'ifunguye' : 'Shiraho TAKEN ✅'}
              </button>
            )}
            <button className="link danger" onClick={remove}>Siba</button>
          </>
        ) : (
          <ReportButton entityType={c.reportType} entityId={post.id} />
        )}
        {msg && <span className="muted small">{msg}</span>}
      </footer>
    </article>
  )
}

export function Avatar({ profile, size = 40 }) {
  const url = publicUrl('profile-photos', profile?.profile_photo_path)
  return url
    ? <img className="avatar" style={{ width: size, height: size }} src={url} alt="" />
    : <div className="avatar ph" style={{ width: size, height: size }} />
}

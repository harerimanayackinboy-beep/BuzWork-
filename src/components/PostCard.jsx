import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, publicUrl } from '../supabase'
import { useAuth } from '../auth'
import { KINDS, fetchMoreImages, postUrl, FEED_IMAGES } from '../lib/posts'
import Comments from './Comments'
import ReportButton from './ReportButton'
import { whatsappLink } from '../lib/whatsapp'
import { useT } from '../i18n'

export default function PostCard({ kind, post, onDeleted }) {
  const t = useT()
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
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const isLongCaption = post.caption.length > 90 || post.caption.includes('\n')
  const [caption, setCaption] = useState(post.caption)
  const [price, setPrice] = useState(post.price ?? '')
  const [currency, setCurrency] = useState(post.currency || 'ZAR')
  const [details, setDetails] = useState(post.details || '')
  const [editBusy, setEditBusy] = useState(false)

  const liked = likes.some((l) => l.user_id === user.id)
  const waHref = isOwner ? null : whatsappLink(
    post.owner?.whatsapp_number,
    t('card.waText', { url: postUrl(kind, post.id) }),
  )

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
      else { await navigator.clipboard.writeText(url); setMsg(t('card.linkCopied')); setTimeout(() => setMsg(''), 1800) }
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
    if (error) return setMsg(t('card.changeFail'))
    setStatus(next)
  }

  // Guhindura itangazo nyuma yo kurishiraho (urugero: wanditse ikosa)
  async function saveEdit() {
    setEditBusy(true)
    const row = { caption: caption.trim() }
    if (kind === 'product') {
      row.price = price === '' ? null : Number(price)
      row.currency = price === '' ? null : currency.toUpperCase()
      row.details = details.trim() || null
    }
    const { error } = await supabase.from(c.table).update(row).eq('id', post.id)
    setEditBusy(false)
    if (error) return setMsg(t('card.editFail'))
    post.caption = row.caption
    if (kind === 'product') { post.price = row.price; post.currency = row.currency; post.details = row.details }
    setEditing(false)
  }

  async function remove() {
    if (!confirm(t('card.confirmDelete'))) return
    const { data: all } = await supabase.from(c.imgTable).select('storage_path').eq(c.fk, post.id)
    const paths = (all || []).map((i) => i.storage_path)
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from(c.bucket).remove(paths.slice(i, i + 100))
    }
    const { error } = await supabase.from(c.table).delete().eq('id', post.id)
    if (error) return setMsg(t('common.deleteFail'))
    onDeleted?.(post.id)
  }

  return (
    <article className="card post">
      <header className="post-head">
        <Link to={`/seller/${post[c.ownerCol]}`} className="seller">
          <Avatar profile={post.owner} />
          <div>
            <div className="strong">{post.owner?.full_name || t('common.user')}</div>
            <div className="muted small">
              {new Date(post.created_at).toLocaleDateString()} {post.location ? `· ${post.location}` : ''}
            </div>
          </div>
        </Link>
        {kind === 'job' && status === 'taken' && <span className="badge">{t('card.taken')}</span>}
      </header>

      {images.length > 0 && (
        <div className={`gallery g${Math.min(images.length, 4)}`}>
          {images.map((im) => (
            im.media_type === 'video'
              ? <video key={im.id} src={publicUrl(c.bucket, im.storage_path)} controls />
              : <img key={im.id} loading="lazy" src={publicUrl(c.bucket, im.storage_path)} alt="" />
          ))}
        </div>
      )}
      {moreImages && <button className="link" onClick={loadMore}>{t('card.moreImages')}</button>}

      {editing ? (
        <div className="stack edit-box">
          <textarea rows={3} maxLength={2000} value={caption} onChange={(e) => setCaption(e.target.value)} />
          {kind === 'product' && (
            <>
              <div className="row">
                <input className="grow" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                <input style={{ maxWidth: 70 }} maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <textarea rows={2} maxLength={4000} value={details} onChange={(e) => setDetails(e.target.value)} />
            </>
          )}
          <div className="row">
            <button className="btn ghost small" disabled={editBusy} onClick={() => setEditing(false)}>{t('card.editCancel')}</button>
            <button className="btn small" disabled={editBusy} onClick={saveEdit}>{editBusy ? t('common.saving') : t('card.editSave')}</button>
          </div>
        </div>
      ) : (
        <>
          <p className={`caption ${!expanded && isLongCaption ? 'clamp' : ''}`}>{post.caption}</p>
          {isLongCaption && (
            <button className="link small" onClick={() => setExpanded(!expanded)}>
              {expanded ? t('card.showLess') : t('card.showMore')}
            </button>
          )}
          {kind === 'product' && (post.price != null || post.details) && (
            <p className="muted">
              {post.price != null && <strong>{post.price} {post.currency || ''}</strong>}
              {post.details ? ` · ${post.details}` : ''}
            </p>
          )}
        </>
      )}

      <div className="actions">
        <button className={`act ${liked ? 'on' : ''}`} onClick={toggleLike}>{t('card.like')} {likes.length || ''}</button>
        <button className="act" onClick={() => setShowComments(!showComments)}>{t('card.comment')} {commentCount || ''}</button>
        <button className="act" onClick={share}>{t('card.share')}</button>
        {waHref && (
          <a className="act wa" href={waHref} target="_blank" rel="noopener noreferrer">{t('card.whatsapp')}</a>
        )}
      </div>

      {showComments && <Comments kind={kind} postId={post.id} onCount={setCommentCount} />}

      <footer className="post-foot">
        {isOwner ? (
          <>
            {kind === 'job' && (
              <button className="btn small ghost" onClick={toggleTaken}>
                {status === 'taken' ? t('card.reopen') : t('card.setTaken')}
              </button>
            )}
            {!editing && <button className="link" onClick={() => setEditing(true)}>{t('card.edit')}</button>}
            <button className="link danger" onClick={remove}>{t('common.delete')}</button>
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

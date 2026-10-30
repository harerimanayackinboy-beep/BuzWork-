import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { fetchFavorites } from '../lib/posts'
import PostCard from '../components/PostCard'

export default function Favorites() {
  const t = useT()
  const nav = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState(undefined)

  useEffect(() => {
    fetchFavorites(user.id).then(setItems).catch(() => setItems([]))
  }, [user.id])

  function removeFromList(kind, id) {
    setItems((prev) => (prev || []).filter((it) => !(it.kind === kind && it.post.id === id)))
  }

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>{t('common.backHome')}</button>
        <h2>{t('favorites.title')}</h2>
        <span />
      </header>

      {items === undefined && <p className="muted center">{t('common.loading')}</p>}
      {items && !items.length && <p className="muted center">{t('favorites.empty')}</p>}

      <div className="feed-full">
        {items && items.map(({ kind, post }) => (
          <PostCard key={`${kind}-${post.id}`} kind={kind} post={post} onDeleted={() => removeFromList(kind, post.id)} />
        ))}
      </div>
    </div>
  )
}

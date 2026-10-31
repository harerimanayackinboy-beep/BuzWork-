import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Avatar } from '../components/PostCard'
import { useT } from '../i18n'
import { countUnread } from '../lib/messages'
import { supabase } from '../supabase'

export default function Home() {
  const t = useT()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [choosing, setChoosing] = useState(false)
  const [unread, setUnread] = useState(0)
  const [counts, setCounts] = useState({ product: null, job: null })

  useEffect(() => {
    let cancelled = false
    const check = () => countUnread(profile.user_id).then((n) => { if (!cancelled) setUnread(n) }).catch(() => {})
    check()
    // Dusubiramwo buri masegonda 8 kugira ikimenyetso c'ubutumwa bushasha kigaragare nta kongera gufungura app
    const poll = setInterval(check, 8000)
    return () => { cancelled = true; clearInterval(poll) }
  }, [profile.user_id])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
    ]).then(([p, j]) => {
      if (cancelled) return
      setCounts({ product: p.count ?? null, job: j.count ?? null })
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="page">
      <header className="topbar">
        <Link to={`/seller/${profile.user_id}`} className="seller">
          <Avatar profile={profile} />
          <span className="strong">{profile.full_name}</span>
        </Link>
        <div className="row" style={{ gap: 16 }}>
          <Link to="/messages" className="link" aria-label={t('home.messagesLabel')} style={{ fontSize: 24, textDecoration: 'none', position: 'relative' }}>
            💬
            {unread > 0 && <span className="badge dot">{unread}</span>}
          </Link>
          <button
            className="fab-plus"
            aria-label={t('home.newPost')}
            onClick={() => setChoosing(true)}
          >+</button>
          <Link to="/settings" className="link" aria-label={t('home.settingsLabel')} style={{ fontSize: 24, textDecoration: 'none' }}>⚙️</Link>
        </div>
      </header>

      {choosing && (
        <div className="sheet-overlay" onClick={() => setChoosing(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="muted center">{t('home.newPostChoose')}</p>
            <button className="btn" onClick={() => nav('/new/product')}>🛒 {t('kind.product')}</button>
            <button className="btn amber2" onClick={() => nav('/new/job')}>💼 {t('kind.job')}</button>
            <button className="link" onClick={() => setChoosing(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="row home-quicklinks">
        <Link to={`/seller/${profile.user_id}`} className="link small">📋 {t('home.myPosts')}</Link>
        <Link to="/favorites" className="link small">⭐ {t('home.favorites')}</Link>
      </div>

      <Link to="/business" className="big-tile teal">
        <span className="emoji">🛒</span>
        <span>{t('home.business')}</span>
        <small>{t('home.businessSub')}</small>
        {counts.product != null && <small className="tile-count">{t('home.listingCount', { n: counts.product })}</small>}
      </Link>
      <Link to="/jobs" className="big-tile amber">
        <span className="emoji">💼</span>
        <span>{t('home.jobs')}</span>
        <small>{t('home.jobsSub')}</small>
        {counts.job != null && <small className="tile-count">{t('home.listingCount', { n: counts.job })}</small>}
      </Link>
    </div>
  )
}

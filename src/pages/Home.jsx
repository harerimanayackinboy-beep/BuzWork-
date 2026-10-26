import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Avatar } from '../components/PostCard'
import { useT } from '../i18n'

export default function Home() {
  const t = useT()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [choosing, setChoosing] = useState(false)

  return (
    <div className="page">
      <header className="topbar">
        <Link to={`/seller/${profile.user_id}`} className="seller">
          <Avatar profile={profile} />
          <span className="strong">{profile.full_name}</span>
        </Link>
        <div className="row" style={{ gap: 16 }}>
          <button
            className="link"
            aria-label={t('home.newPost')}
            style={{ fontSize: 24, padding: 0 }}
            onClick={() => setChoosing(true)}
          >➕</button>
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

      <Link to="/business" className="big-tile teal">
        <span className="emoji">🛒</span>
        <span>{t('home.business')}</span>
        <small>{t('home.businessSub')}</small>
      </Link>
      <Link to="/jobs" className="big-tile amber">
        <span className="emoji">💼</span>
        <span>{t('home.jobs')}</span>
        <small>{t('home.jobsSub')}</small>
      </Link>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { Avatar } from '../components/PostCard'
import { useT } from '../i18n'

export default function Home() {
  const t = useT()
  const { profile } = useAuth()
  return (
    <div className="page">
      <header className="topbar">
        <Link to={`/seller/${profile.user_id}`} className="seller">
          <Avatar profile={profile} />
          <span className="strong">{profile.full_name}</span>
        </Link>
        <Link to="/settings" className="link" aria-label={t('home.settingsLabel')} style={{ fontSize: 24, textDecoration: 'none' }}>⚙️</Link>
      </header>

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

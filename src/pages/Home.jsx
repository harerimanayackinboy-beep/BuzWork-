import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { Avatar } from '../components/PostCard'

export default function Home() {
  const { profile } = useAuth()
  return (
    <div className="page">
      <header className="topbar">
        <Link to={`/seller/${profile.user_id}`} className="seller">
          <Avatar profile={profile} />
          <span className="strong">{profile.full_name}</span>
        </Link>
        <Link to="/settings" className="link" aria-label="Settings" style={{ fontSize: 24, textDecoration: 'none' }}>⚙️</Link>
      </header>

      <Link to="/business" className="big-tile teal">
        <span className="emoji">🛒</span>
        <span>Ubudandaji</span>
        <small>Gurisha canke gura ibicuruzwa</small>
      </Link>
      <Link to="/jobs" className="big-tile amber">
        <span className="emoji">💼</span>
        <span>Akazi n'abakozi</span>
        <small>Tangaza akazi canke ushake akazi</small>
      </Link>
    </div>
  )
}

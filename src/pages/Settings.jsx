import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Avatar } from '../components/PostCard'
import WhatsappSetting from '../components/WhatsappSetting'

export default function Settings() {
  const nav = useNavigate()
  const { profile, logout } = useAuth()

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>← Ahabanza</button>
        <h2>⚙️ Settings</h2>
        <span />
      </header>

      <div className="card profile">
        <Avatar profile={profile} size={72} />
        <h3>{profile.full_name}</h3>
        <p className="muted">{profile.location}</p>
      </div>

      <WhatsappSetting />

      <button className="btn ghost" style={{ marginTop: 16, width: '100%' }} onClick={logout}>Sohoka</button>
    </div>
  )
}

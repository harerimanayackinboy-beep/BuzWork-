import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Avatar } from '../components/PostCard'
import WhatsappSetting from '../components/WhatsappSetting'
import ThemeSetting from '../components/ThemeSetting'
import ProfileEdit from '../components/ProfileEdit'

// Hano hari gusa ibikora. Ibindi (nk'indimi) tuzabyongeramwo igihe bizaba byuzuye.
const ITEMS = [
  { key: 'profile', label: '✏️ Guhindura umwirondoro', Panel: ProfileEdit },
  { key: 'whatsapp', label: '🟢 WhatsApp', Panel: WhatsappSetting },
  { key: 'theme', label: '🌗 Mode (umucyo / umwijima)', Panel: ThemeSetting },
]

export default function Settings() {
  const nav = useNavigate()
  const { profile, logout } = useAuth()
  const [open, setOpen] = useState(null)

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

      <div className="menu">
        {ITEMS.map(({ key, label, Panel }) => (
          <div key={key}>
            <button className={`menu-item ${open === key ? 'on' : ''}`} onClick={() => setOpen(open === key ? null : key)}>
              <span>{label}</span>
              <span>{open === key ? '▲' : '▼'}</span>
            </button>
            {open === key && <div className="menu-panel"><Panel /></div>}
          </div>
        ))}
        <button className="menu-item" onClick={logout}><span>🚪 Sohoka</span></button>
      </div>
    </div>
  )
}

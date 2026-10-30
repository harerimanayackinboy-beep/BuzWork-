import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { Avatar } from '../components/PostCard'
import WhatsappSetting from '../components/WhatsappSetting'
import UsernameSetting from '../components/UsernameSetting'
import ThemeSetting from '../components/ThemeSetting'
import ProfileEdit from '../components/ProfileEdit'
import PhotoSetting from '../components/PhotoSetting'
import LanguageSetting from '../components/LanguageSetting'
import NotificationSetting from '../components/NotificationSetting'
import FeedbackForm from '../components/FeedbackForm'
import AccountDelete from '../components/AccountDelete'

// Hano hari gusa ibikora.
export default function Settings() {
  const t = useT()
  const nav = useNavigate()
  const { profile, logout } = useAuth()
  const [open, setOpen] = useState(null)

  const ITEMS = [
    { key: 'profile', label: t('settings.editProfile'), Panel: ProfileEdit },
    { key: 'photo', label: t('settings.changePhoto'), Panel: PhotoSetting },
    { key: 'whatsapp', label: t('settings.whatsapp'), Panel: WhatsappSetting },
    { key: 'username', label: t('settings.username'), Panel: UsernameSetting },
    { key: 'theme', label: t('settings.theme'), Panel: ThemeSetting },
    { key: 'language', label: t('settings.language'), Panel: LanguageSetting },
    { key: 'notifications', label: t('settings.notifications'), Panel: NotificationSetting },
    { key: 'feedback', label: t('settings.feedback'), Panel: FeedbackForm },
    { key: 'delete', label: t('settings.deleteAccount'), Panel: AccountDelete },
  ]

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>{t('common.backHome')}</button>
        <h2>{t('settings.title')}</h2>
        <span />
      </header>

      <div className="card profile">
        <Avatar profile={profile} size={72} />
        <h3>{profile.full_name}</h3>
        {profile.username && <p className="muted">@{profile.username}</p>}
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
        <button className="menu-item" onClick={logout}><span>{t('settings.logout')}</span></button>
      </div>
    </div>
  )
}

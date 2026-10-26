import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { fetchConversations } from '../lib/messages'
import { Avatar } from '../components/PostCard'

export default function Messages() {
  const t = useT()
  const nav = useNavigate()
  const { user } = useAuth()
  const [convos, setConvos] = useState(undefined)

  useEffect(() => {
    fetchConversations(user.id).then(setConvos).catch(() => setConvos([]))
  }, [user.id])

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav('/')}>{t('common.backHome')}</button>
        <h2>{t('messages.title')}</h2>
        <span />
      </header>

      {convos === undefined && <p className="muted center">{t('common.loading')}</p>}
      {convos && !convos.length && <p className="muted center">{t('messages.empty')}</p>}
      {convos && convos.map((c) => (
        <Link key={c.otherId} to={`/chat/${c.otherId}`} className="card convo">
          <Avatar profile={c.profile} />
          <div className="grow">
            <div className="strong">{c.profile?.full_name || t('common.user')}</div>
            <div className="muted small convo-preview">{c.last.body}</div>
          </div>
          {c.unread > 0 && <span className="badge">{c.unread}</span>}
        </Link>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { fetchPosts, KINDS } from '../lib/posts'
import PostCard, { Avatar } from '../components/PostCard'
import ReportButton from '../components/ReportButton'
import { whatsappLink } from '../lib/whatsapp'

export default function Seller() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [p, setP] = useState(undefined)
  const [tab, setTab] = useState('product')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [wa, setWa] = useState(null)

  useEffect(() => {
    supabase.from('public_profiles').select('*').eq('user_id', id).maybeSingle().then(({ data }) => setP(data || null))
    // Nimba view itaraboneka, ntibitubuza gukora: button ya WhatsApp ntizigaragara
    supabase.from('public_whatsapp').select('whatsapp_number').eq('user_id', id).maybeSingle()
      .then(({ data, error }) => setWa(error ? null : data?.whatsapp_number || null))
  }, [id])

  useEffect(() => {
    setLoading(true)
    fetchPosts(tab, { ownerId: id }).then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false))
  }, [id, tab])

  if (p === undefined) return <div className="page"><p className="muted center">Ndikuzana…</p></div>
  if (p === null) return <div className="page"><button className="link" onClick={() => nav(-1)}>← Subira</button><p>Uyu mukoresha ntaboneka.</p></div>

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav(-1)}>← Subira</button>
        <span />
      </header>
      <div className="card profile">
        <Avatar profile={p} size={96} />
        <h2>{p.full_name}</h2>
        <p className="muted">{p.location}</p>
        {p.user_id !== user.id && (
          <div className="row center">
            {whatsappLink(wa) && (
              <a className="btn wa" href={whatsappLink(wa, 'Mwaramutse, nabonye profile yanyu kuri BuzWork.')} target="_blank" rel="noopener noreferrer">🟢 WhatsApp</a>
            )}
            {p.phone_number
              ? <a className="btn" href={`tel:${p.phone_number}`}>📞 Call</a>
              : <button className="btn ghost" disabled title="Nyirayo ntiyemeye ko numero iboneka">📞 Call</button>}
          </div>
        )}
        {p.user_id !== user.id && <ReportButton entityType="profile" entityId={p.user_id} />}
      </div>

      <div className="tabs">
        {Object.values(KINDS).map((k) => (
          <button key={k.key} className={tab === k.key ? 'on' : ''} onClick={() => setTab(k.key)}>{k.title}</button>
        ))}
      </div>
      {loading && <p className="muted center">Ndikuzana…</p>}
      {!loading && !posts.length && <p className="muted center">Nta tangazo.</p>}
      {posts.map((post) => (
        <PostCard key={post.id} kind={tab} post={post} onDeleted={(pid) => setPosts(posts.filter((x) => x.id !== pid))} />
      ))}
    </div>
  )
}

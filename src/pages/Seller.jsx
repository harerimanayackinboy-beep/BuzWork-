import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { fetchPosts, KINDS } from '../lib/posts'
import PostCard, { Avatar } from '../components/PostCard'
import ReportButton from '../components/ReportButton'
import { whatsappLink } from '../lib/whatsapp'
import { useT } from '../i18n'

export default function Seller() {
  const t = useT()
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
    supabase.from('public_whatsapp').select('whatsapp_number').eq('user_id', id).maybeSingle()
      .then(({ data, error }) => setWa(error ? null : data?.whatsapp_number || null))
  }, [id])

  useEffect(() => {
    setLoading(true)
    fetchPosts(tab, { ownerId: id }).then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false))
  }, [id, tab])

  if (p === undefined) return <div className="page"><p className="muted center">{t('common.loading')}</p></div>
  if (p === null) return <div className="page"><button className="link" onClick={() => nav(-1)}>{t('common.back')}</button><p>{t('seller.notFound')}</p></div>

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav(-1)}>{t('common.back')}</button>
        <span />
      </header>
      <div className="card profile">
        <Avatar profile={p} size={96} />
        <h2>{p.full_name}</h2>
        <p className="muted">{p.location}</p>
        {p.user_id !== user.id && (
          <div className="row center">
            <Link to={`/chat/${p.user_id}`} className="btn">{t('seller.message')}</Link>
            {whatsappLink(wa) && (
              <a className="btn wa" href={whatsappLink(wa, t('seller.waText'))} target="_blank" rel="noopener noreferrer">{t('card.whatsapp')}</a>
            )}
            {p.phone_number
              ? <a className="btn" href={`tel:${p.phone_number}`}>{t('seller.call')}</a>
              : <button className="btn ghost" disabled title={t('seller.callDisabled')}>{t('seller.call')}</button>}
          </div>
        )}
        {p.user_id !== user.id && <ReportButton entityType="profile" entityId={p.user_id} />}
      </div>

      <div className="tabs">
        {Object.values(KINDS).map((k) => (
          <button key={k.key} className={tab === k.key ? 'on' : ''} onClick={() => setTab(k.key)}>
            {k.key === 'product' ? t('kind.product') : t('kind.job')}
          </button>
        ))}
      </div>
      {loading && <p className="muted center">{t('common.loading')}</p>}
      {!loading && !posts.length && <p className="muted center">{t('seller.noPosts')}</p>}
      {posts.map((post) => (
        <PostCard key={post.id} kind={tab} post={post} onDeleted={(pid) => setPosts(posts.filter((x) => x.id !== pid))} />
      ))}
    </div>
  )
}

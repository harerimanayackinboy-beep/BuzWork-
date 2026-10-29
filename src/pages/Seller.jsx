import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { fetchPosts, KINDS } from '../lib/posts'
import PostCard, { Avatar } from '../components/PostCard'
import ReportButton from '../components/ReportButton'
import { whatsappLink } from '../lib/whatsapp'
import WhatsAppIcon from '../components/WhatsAppIcon'
import { useT } from '../i18n'

const css = `
.zw-page{background:#f5f8f7;min-height:100vh;color:#123b38}
.zw-header{background:linear-gradient(145deg,#087568,#004e47);color:#fff;padding:12px 14px 12px;border-radius:0 0 22px 22px}
.zw-info{display:flex;align-items:center;gap:10px}
.zw-back{border:0;border-radius:50%;background:#ffffff20;color:#fff;font-size:20px;width:36px;height:36px;flex-shrink:0;cursor:pointer}
.zw-text{min-width:0;flex:1}
.zw-text h1{font-size:clamp(16px,4.5vw,20px);margin:0 0 3px;overflow-wrap:anywhere;color:#fff}
.zw-user{font-size:13px;color:#bce9df;margin-bottom:2px}
.zw-addr{font-size:13px;margin:0}
.zw-avatar{flex-shrink:0;border-radius:50%;border:3px solid #fff;line-height:0;overflow:hidden}
.zw-actions{display:flex;align-items:center;gap:10px;margin-top:12px}
.zw-act{width:42px;height:42px;border:1px solid #ffffff70;border-radius:50%;display:flex;justify-content:center;align-items:center;font-size:20px;color:#fff;text-decoration:none;background:transparent;cursor:pointer;flex-shrink:0}
.zw-act.wa{background:#16a34a;border-color:#16a34a}
.zw-act:disabled{opacity:.4}
.zw-share{flex:1;min-height:42px;border:none;border-radius:21px;background:#fff;color:#006b60;font-size:14px;font-weight:bold;cursor:pointer}
.zw-report{margin-top:6px;text-align:center;font-size:12px}
.zw-report button,.zw-report a{color:#dff4ee;font-size:12px}
.zw-content{padding:14px 16px}
.zw-tabs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.zw-tab{background:#fff;border:1px solid #e0e9e6;color:#244744;padding:12px 8px;border-radius:15px;font-size:15px;font-weight:bold;cursor:pointer}
.zw-tab.on{background:#087568;color:#fff;border-color:#087568}
`

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
    async function loadProfile() {
      const { data } = await supabase.from('public_profiles').select('*').eq('user_id', id).maybeSingle()
      if (!data) { setP(null); return }
      let profile = data
      try {
        const { data: found } = await supabase
          .from('search_profiles')
          .select('username')
          .eq('user_id', id)
          .maybeSingle()
        if (found?.username) profile = { ...profile, username: found.username }
      } catch { /* nta kibazo */ }
      setP(profile)
    }
    loadProfile()
    supabase.from('public_whatsapp').select('whatsapp_number').eq('user_id', id).maybeSingle()
      .then(({ data, error }) => setWa(error ? null : data?.whatsapp_number || null))
  }, [id])

  useEffect(() => {
    setLoading(true)
    fetchPosts(tab, { ownerId: id }).then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false))
  }, [id, tab])

  if (p === undefined) return <div className="page"><p className="muted center">{t('common.loading')}</p></div>
  if (p === null) return <div className="page"><button className="link" onClick={() => nav(-1)}>{t('common.back')}</button><p>{t('seller.notFound')}</p></div>

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}#/seller/${p.user_id}`
    try {
      if (navigator.share) await navigator.share({ title: p.full_name, url })
      else await navigator.clipboard.writeText(url)
    } catch { /* umukoresha yaretse */ }
  }

  const isMe = p.user_id === user.id

  return (
    <div className="zw-page">
      <style>{css}</style>
      <header className="zw-header">
        <div className="zw-info">
          <button className="zw-back" onClick={() => nav(-1)} aria-label="Subira inyuma">←</button>
          <div className="zw-text">
            <h1>{p.full_name}</h1>
            {p.username && <div className="zw-user">@{p.username}</div>}
            {p.location && <p className="zw-addr">📍 {p.location}</p>}
          </div>
          <div className="zw-avatar">
            <Avatar profile={p} size={72} zoomable />
          </div>
        </div>

        {!isMe && (
          <>
            <div className="zw-actions">
              <Link to={`/chat/${p.user_id}`} className="zw-act" aria-label={t('seller.message')} title={t('seller.message')}>💬</Link>
              {whatsappLink(wa) && (
                <a className="zw-act wa" href={whatsappLink(wa, t('seller.waText'))} target="_blank" rel="noopener noreferrer" aria-label={t('card.whatsapp')} title={t('card.whatsapp')}><WhatsAppIcon /></a>
              )}
              {p.phone_number
                ? <a className="zw-act" href={`tel:${p.phone_number}`} aria-label={t('seller.call')} title={t('seller.call')}>📞</a>
                : <button className="zw-act" disabled aria-label={t('seller.call')} title={t('seller.callDisabled')}>📞</button>}
              <button className="zw-share" onClick={share}>{t('card.share')}</button>
            </div>
            <div className="zw-report">
              <ReportButton entityType="profile" entityId={p.user_id} />
            </div>
          </>
        )}
      </header>

      <main className="zw-content">
        <div className="zw-tabs">
          {Object.values(KINDS).map((k) => (
            <button key={k.key} className={`zw-tab ${tab === k.key ? 'on' : ''}`} onClick={() => setTab(k.key)}>
              {k.key === 'product' ? t('kind.product') : t('kind.job')}
            </button>
          ))}
        </div>
        {loading && <p className="muted center">{t('common.loading')}</p>}
        {!loading && !posts.length && <p className="muted center">{t('seller.noPosts')}</p>}
        {posts.map((post) => (
          <PostCard key={post.id} kind={tab} post={post} onDeleted={(pid) => setPosts(posts.filter((x) => x.id !== pid))} />
        ))}
      </main>
    </div>
  )
}

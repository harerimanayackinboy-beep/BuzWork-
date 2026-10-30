import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchPosts, KINDS, PAGE_SIZE } from '../lib/posts'
import { distanceKm, getMyPosition } from '../lib/geo'
import { CATEGORIES } from '../lib/categories'
import PostCard from '../components/PostCard'
import { useT } from '../i18n'

const RADII = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]

export default function Feed({ kind }) {
  const t = useT()
  const c = KINDS[kind]
  const nav = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(true)
  const [error, setError] = useState('')
  const loadingRef = useRef(false)

  const [nearbyOn, setNearbyOn] = useState(false)
  const [radiusKm, setRadiusKm] = useState(25)
  const [myPos, setMyPos] = useState(null)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [category, setCategory] = useState('')

  async function toggleNearby() {
    if (nearbyOn) { setNearbyOn(false); return }
    setGeoError('')
    setGeoBusy(true)
    try {
      const pos = myPos || (await getMyPosition())
      setMyPos(pos)
      setNearbyOn(true)
    } catch (err) {
      const reason = err?.reason
      if (reason === 'denied') setGeoError(t('feed.geoDenied'))
      else if (reason === 'timeout' || reason === 'unavailable') setGeoError(t('feed.geoTimeout'))
      else setGeoError(t('feed.geoFail'))
    }
    setGeoBusy(false)
  }

  const visiblePosts = useMemo(() => {
    if (!nearbyOn || !myPos) return posts
    if (radiusKm === 'all') return posts // Hose ku isi: nta ntera igenwa
    return posts.filter((p) => {
      const lat = p.owner?.lat
      const lng = p.owner?.lng
      if (lat == null || lng == null) return false
      return distanceKm(myPos.lat, myPos.lng, lat, lng) <= radiusKm
    })
  }, [posts, nearbyOn, myPos, radiusKm])

  async function load(reset = false) {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError('')
    try {
      const cursor = reset || !posts.length ? undefined : posts[posts.length - 1].created_at
      const page = await fetchPosts(kind, { cursor, category: kind === 'product' ? category || undefined : undefined })
      setPosts(reset ? page : [...posts, ...page])
      setMore(page.length === PAGE_SIZE)
    } catch {
      setError(t('feed.error'))
    }
    setLoading(false)
    loadingRef.current = false
  }

  useEffect(() => { load(true) }, [kind, category])

  return (
    <div className="page">
      <header className="topbar">
        <button className="link" onClick={() => nav(-1)}>{t('common.back')}</button>
        <h2>{kind === 'product' ? t('kind.product') : t('kind.job')}</h2>
        <div className="row" style={{ gap: 10 }}>
          <Link to={`/new/${kind}`} className="fab-plus" aria-label={t('home.newPost')}>+</Link>
          <Link to="/search" className="link" aria-label={t('home.searchLabel')} style={{ fontSize: 22, textDecoration: 'none' }}>🔎</Link>
          <Link to="/settings" className="link kebab" aria-label={t('home.settingsLabel')}>⋮</Link>
        </div>
      </header>

      <div className="row" style={{ gap: 8, margin: '0 0 10px', flexWrap: 'wrap' }}>
        <button className={`btn small ${nearbyOn ? '' : 'ghost'}`} disabled={geoBusy} onClick={toggleNearby}>
          {geoBusy ? t('common.loading') : `📍 ${t('feed.nearby')}`}
        </button>
        {nearbyOn && (
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={{ width: 'auto' }}
          >
            {RADII.map((km) => <option key={km} value={km}>{t('feed.withinKm', { n: km })}</option>)}
            <option value="all">{t('feed.worldwide')}</option>
          </select>
        )}
      </div>
      {geoError && <p className="error small">{geoError}</p>}

      {kind === 'product' && (
        <div className="chip-row">
          <button className={`chip ${!category ? 'on' : ''}`} onClick={() => setCategory('')}>{t('category.all')}</button>
          {CATEGORIES.map((k) => (
            <button key={k} className={`chip ${category === k ? 'on' : ''}`} onClick={() => setCategory(k)}>
              {t(`category.${k}`)}
            </button>
          ))}
        </div>
      )}

      <div className="feed-full">
        {visiblePosts.map((p) => (
          <PostCard key={p.id} kind={kind} post={p} onDeleted={(id) => setPosts(posts.filter((x) => x.id !== id))} />
        ))}
      </div>
      {!loading && nearbyOn && posts.length > 0 && !visiblePosts.length && <p className="muted center">{t('feed.nearbyEmpty')}</p>}
      {!loading && !nearbyOn && !posts.length && !error && <p className="muted center">{t('feed.empty')}</p>}
      {error && <p className="error center">{error}</p>}
      {loading && <p className="muted center">{t('common.loading')}</p>}
      {!loading && more && posts.length > 0 && <button className="btn ghost" onClick={() => load()}>{t('feed.more')}</button>}
    </div>
  )
}

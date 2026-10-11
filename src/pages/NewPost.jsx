import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { KINDS } from '../lib/posts'
import { compressImage, runPool } from '../lib/image'

export default function NewPost() {
  const { kind } = useParams()
  const c = KINDS[kind]
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [caption, setCaption] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('ZAR')
  const [details, setDetails] = useState('')
  const [location, setLocation] = useState(profile.location || '')
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!c) return <p className="page">Ntibimenyekana.</p>

  function pick(e) {
    const chosen = [...e.target.files]
    if (chosen.length > c.maxImages) setError(`Ushobora gushiraho amafoto ${c.maxImages} gusa.`)
    else setError('')
    setFiles(chosen.slice(0, c.maxImages))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    let postId
    const uploaded = []
    try {
      const row = { caption: caption.trim(), location: location.trim() || null, [c.ownerCol]: user.id }
      if (kind === 'product') {
        row.price = price === '' ? null : Number(price)
        row.currency = price === '' ? null : currency.toUpperCase()
        row.details = details.trim() || null
      }
      const { data: post, error: pe } = await supabase.from(c.table).insert(row).select().single()
      if (pe) throw pe
      postId = post.id

      if (files.length) {
        setProgress([0, files.length])
        await runPool(
          files,
          4,
          async (file, i) => {
            const blob = await compressImage(file)
            const path = `${user.id}/${postId}/${i}-${Date.now()}.jpg`
            const { error } = await supabase.storage.from(c.bucket).upload(path, blob, { contentType: 'image/jpeg' })
            if (error) throw error
            uploaded.push(path)
            return { [c.fk]: postId, storage_path: path, display_order: i }
          },
          (d, t) => setProgress([d, t])
        ).then(async (rows) => {
          for (let i = 0; i < rows.length; i += 100) {
            const { error } = await supabase.from(c.imgTable).insert(rows.slice(i, i + 100))
            if (error) throw error
          }
        })
      }
      nav(kind === 'product' ? '/business' : '/jobs', { replace: true })
    } catch (err) {
      // Gusubiza inyuma: gusiba ibyari byamaze kujyaho kugira nta tangazo ridakwiye rigumaho
      if (uploaded.length) await supabase.storage.from(c.bucket).remove(uploaded)
      if (postId) await supabase.from(c.table).delete().eq('id', postId)
      setError(err.message || 'Itangazo ntiryashobotse kujyaho. Ongera ugerageze.')
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="page narrow">
      <header className="topbar">
        <button className="link" onClick={() => nav(-1)}>← Reka</button>
        <h2>{kind === 'product' ? 'Itangazo ry\'ubudandaji' : 'Itangazo ry\'akazi'}</h2>
        <span />
      </header>
      <form onSubmit={submit} className="stack">
        <label>{kind === 'product' ? 'Sobanura ico ugurisha *' : 'Sobanura akazi *'}
          <textarea required maxLength={2000} rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>
        {kind === 'product' && (
          <>
            <div className="row">
              <label className="grow">Igiciro<input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
              <label>Ifaranga<input maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
            </div>
            <label>Ibindi bisobanuro<textarea maxLength={4000} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} /></label>
          </>
        )}
        <label>Aho biri (location)<input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label>
          Amafoto {kind === 'job' ? '(1 canke 2)' : ''}
          <input type="file" accept="image/*" multiple onChange={pick} />
        </label>
        {files.length > 0 && <p className="muted small">{files.length} amafoto yatoranijwe</p>}
        {progress && <progress value={progress[0]} max={progress[1]} />}
        <button className="btn" disabled={busy}>{busy ? 'Ndashiraho…' : 'Shiraho itangazo'}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}

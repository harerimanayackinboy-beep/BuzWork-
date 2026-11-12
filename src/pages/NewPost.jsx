import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { KINDS } from '../lib/posts'
import { compressImage, runPool } from '../lib/image'
import { CATEGORIES } from '../lib/categories'
import ImageEditor from '../components/ImageEditor'
import { useT } from '../i18n'

export default function NewPost() {
  const t = useT()
  const { kind } = useParams()
  const c = KINDS[kind]
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [step, setStep] = useState('form') // 'form' | 'preview'
  const [caption, setCaption] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('ZAR')
  const [details, setDetails] = useState('')
  const [category, setCategory] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [location, setLocation] = useState(profile.location || '')
  const [files, setFiles] = useState([])
  const [editIndex, setEditIndex] = useState(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Ishusho z'akarorero (ntizishirwa kuri internet kugeza ubwo umukoresha yemeje)
  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])

  if (!c) return <p className="page">{t('new.unknown')}</p>

  function pick(e) {
    const chosen = [...e.target.files]
    e.target.value = '' // kugira umukoresha ashobore guhitamo rimwe na rimwe iyo foto nyene
    const combined = [...files, ...chosen]
    const videos = combined.filter((f) => f.type.startsWith('video/'))
    if (videos.length > 1) return setError(t('new.oneVideo'))
    if (videos.some((f) => f.size > 50 * 1024 * 1024)) return setError(t('new.videoTooBig'))
    if (combined.length > c.maxImages) setError(t('new.maxImages', { n: c.maxImages }))
    else setError('')
    setFiles(combined.slice(0, c.maxImages))
  }

  function removePhoto(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setError('')
  }

  function savePhoto(newFile) {
    setFiles((prev) => prev.map((f, i) => (i === editIndex ? newFile : f)))
    setEditIndex(null)
  }

  // Intambwe ya 1: ntishira kuri internet, ireba akarorero gusa
  function reviewFirst(e) {
    e.preventDefault()
    setError('')
    setStep('preview')
  }

  // Intambwe ya 2: ni bwo itangazo rishirwa ku bantu bose nyuma yo kwemeza
  async function publish() {
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
        row.category = category || null
        row.business_name = businessName.trim() || null
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
            const isVideo = file.type.startsWith('video/')
            let blob, ext, contentType
            if (isVideo) {
              blob = file
              ext = (file.name.split('.').pop() || 'mp4').toLowerCase()
              contentType = file.type || 'video/mp4'
            } else {
              blob = await compressImage(file)
              ext = 'jpg'
              contentType = 'image/jpeg'
            }
            const path = `${user.id}/${postId}/${i}-${Date.now()}.${ext}`
            const { error } = await supabase.storage.from(c.bucket).upload(path, blob, { contentType })
            if (error) throw error
            uploaded.push(path)
            return { [c.fk]: postId, storage_path: path, display_order: i, media_type: isVideo ? 'video' : 'image' }
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
      setError(err.message || t('new.fail'))
      setBusy(false)
      setProgress(null)
    }
  }

  if (step === 'preview') {
    return (
      <div className="page narrow">
        <header className="topbar">
          <button className="link" onClick={() => setStep('form')}>{t('new.editAgain')}</button>
          <h2>{t('new.previewTitle')}</h2>
          <span />
        </header>
        <p className="muted small">{t('new.previewHelp')}</p>

        <article className="card post">
          {previewUrls.length > 0 && (
            <div className={`gallery g${Math.min(previewUrls.length, 4)}`}>
              {files.map((f, i) => f.type.startsWith('video/')
                ? <video key={previewUrls[i]} src={previewUrls[i]} controls muted />
                : <img key={previewUrls[i]} src={previewUrls[i]} alt="" />)}
            </div>
          )}
          {kind === 'product' && businessName && <p className="strong">🏪 {businessName}</p>}
          {kind === 'product' && category && <span className="badge">{t(`category.${category}`)}</span>}
          <p className="caption">{caption}</p>
          {kind === 'product' && (price !== '' || details) && (
            <p className="muted">
              {price !== '' && <strong>{price} {currency}</strong>}
              {details ? ` · ${details}` : ''}
            </p>
          )}
          {location && <p className="muted small">{location}</p>}
        </article>

        {progress && <progress value={progress[0]} max={progress[1]} />}
        <div className="row">
          <button className="btn ghost" disabled={busy} onClick={() => setStep('form')}>{t('new.editAgain')}</button>
          <button className="btn" disabled={busy} onClick={publish}>{busy ? t('new.posting') : t('new.confirmPost')}</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="page narrow">
      <header className="topbar">
        <button className="link" onClick={() => nav(-1)}>{t('common.cancel')}</button>
        <h2>{kind === 'product' ? t('new.titleProduct') : t('new.titleJob')}</h2>
        <span />
      </header>
      <form onSubmit={reviewFirst} className="stack">
        {files.length === 0 ? (
          <label className="photo-upload">
            <div className="photo-upload-ic">▧ ＋</div>
            <strong>{t('new.addPhotosTitle')}</strong>
            <p className="muted small">
              {t('new.addPhotosHint')}{kind === 'job' ? ` ${t('new.photosJob')}` : ''} — {t('new.mediaHint')}
            </p>
            <input type="file" accept="image/*,video/*" multiple onChange={pick} hidden />
          </label>
        ) : (
          <div className="photo-grid">
            {files.map((f, i) => (
              <div className="photo-thumb" key={previewUrls[i]}>
                {f.type.startsWith('video/')
                  ? <video src={previewUrls[i]} muted />
                  : <img src={previewUrls[i]} alt="" />}
                {!f.type.startsWith('video/') && (
                  <button type="button" className="photo-edit" aria-label={t('new.editPhoto')} onClick={() => setEditIndex(i)}>✏️</button>
                )}
                <button type="button" className="photo-remove" aria-label={t('new.removePhoto')} onClick={() => removePhoto(i)}>×</button>
              </div>
            ))}
            {files.length < c.maxImages && (
              <label className="photo-add-tile">
                <span>＋</span>
                <input type="file" accept="image/*,video/*" multiple onChange={pick} hidden />
              </label>
            )}
          </div>
        )}
        {files.length > 0 && <p className="muted small">{t('new.picked', { n: files.length })}</p>}

        {kind === 'product' && (
          <label>{t('new.businessName')}<input value={businessName} maxLength={120} placeholder={t('new.businessNamePh')} onChange={(e) => setBusinessName(e.target.value)} /></label>
        )}

        {kind === 'product' && (
          <label>
            {t('new.category')}
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t('new.categoryChoose')}</option>
              {CATEGORIES.map((k) => <option key={k} value={k}>{t(`category.${k}`)}</option>)}
            </select>
          </label>
        )}

        {kind === 'product' && (
          <div className="row">
            <label className="grow">{t('new.price')}<input type="number" min="0" step="0.01" placeholder={t('new.pricePh')} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
            <label>{t('new.currency')}<input maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
          </div>
        )}

        <label>{t('new.where')}<input value={location} placeholder={kind === 'product' ? t('new.locationPh') : ''} onChange={(e) => setLocation(e.target.value)} /></label>

        <label>{kind === 'product' ? t('new.describeProduct') : t('new.describeJob')}
          <textarea
            required maxLength={2000} rows={4} value={caption}
            placeholder={kind === 'product' ? t('new.descriptionPhProduct') : ''}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>

        {kind === 'product' && (
          <label>{t('new.moreDetails')}<textarea maxLength={4000} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} /></label>
        )}

        <button className="btn">{t('new.continueBtn')}</button>
        {error && <p className="error">{error}</p>}
        <p className="muted small center">ⓘ {t('new.reviewNotice')}</p>
      </form>
      {editIndex !== null && (
        <ImageEditor file={files[editIndex]} onCancel={() => setEditIndex(null)} onSave={savePhoto} />
      )}
    </div>
  )
}

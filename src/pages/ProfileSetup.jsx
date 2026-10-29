import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import CameraCapture from '../components/CameraCapture'
import { compressImage } from '../lib/image'
import { getMyPosition } from '../lib/geo'
import './ProfileSetup.css'

export default function ProfileSetup() {
  const t = useT()
  const { user, profile, reloadProfile, logout } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || user.user_metadata?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone_number || user.phone ? `+${(profile?.phone_number || user.phone).replace(/^\+/, '')}` : '')
  const [email, setEmail] = useState(profile?.email || user.email || '')
  const [location, setLocation] = useState(profile?.location || '')
  const [showPhone, setShowPhone] = useState(profile?.show_phone || false)
  const [geo, setGeo] = useState(profile?.lat != null ? { lat: profile.lat, lng: profile.lng } : null)
  const [geoBusy, setGeoBusy] = useState(false)
  const [step, setStep] = useState(profile ? 'photo' : 'info')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // --- Location autocomplete ---
  // picked = umukoresha yahisemo ikibanza nyakuri mu rutonde (cyangwa yakoresheje Detect)
  const [picked, setPicked] = useState(profile?.lat != null && !!profile?.location)
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (picked) return
    const q = location.trim()
    if (q.length < 3) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true)
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`)
        const data = await res.json()
        setResults(
          data.features.map((f) => {
            const p = f.properties
            const label = [p.name, p.city, p.state, p.country]
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(', ')
            return { label, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }
          })
        )
      } catch {
        setResults([])
      }
      setSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [location, picked])

  function onLocationType(value) {
    setLocation(value)
    setPicked(false) // iyo ahinduye inyandiko, ikibanza cahiswemo gisibangana
    setGeo(null)
  }

  function choosePlace(place) {
    setLocation(place.label)
    setGeo({ lat: place.lat, lng: place.lng })
    setPicked(true)
    setResults([])
    setError('')
  }

  async function detectGeo() {
    setGeoBusy(true)
    setError('')
    try {
      const pos = await getMyPosition()
      let label = ''
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lng}`
        )
        const d = await res.json()
        label = d.display_name || ''
      } catch {}
      choosePlace({ label: label || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`, lat: pos.lat, lng: pos.lng })
    } catch {
      setError(t('setup.geoFail'))
    }
    setGeoBusy(false)
  }

  function next(e) {
    e.preventDefault()
    const p = phone.replace(/[\s\-()]/g, '')
    if (!/^\+?[0-9]{7,15}$/.test(p)) return setError(t('setup.phoneBad'))
    // Aho uri (location): niba umukoresha yahisemo ikibanza ku rutonde cyangwa
    // akoresheje "Emeza aho uri" (detect), turabona geo (lat/lng) nk'umugati.
    // Ariko ntidusaba ko ari ngombwa kugira ngo akomeze kwiyandikisha — iyo
    // internet cyangwa location ya telefoni bitagenda neza, umukoresha
    // ntiyagombye gufungirwa hanze y'app. Inyandiko yanditse mu mwanya ni
    // ihagije: geo irakenewe gusa kugira "Hafi yanje" ibashe gukora.
    if (location.trim().length < 2) return setError(t('setup.locationPick'))
    setPhone(p)
    setError('')
    setStep('photo')
  }

  async function save(blob) {
    setBusy(true)
    setError('')
    let uploadedPath
    try {
      const small = await compressImage(blob, 800, 0.85)
      uploadedPath = `${user.id}/${Date.now()}.jpg`
      const up = await supabase.storage.from('profile-photos').upload(uploadedPath, small, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const { error } = await supabase.from('profiles').upsert({
        user_id: user.id,
        full_name: fullName.trim(),
        phone_number: phone,
        email: email.trim() || null,
        location: location.trim().slice(0, 150),
        show_phone: showPhone,
        profile_photo_path: uploadedPath,
        ...(geo ? { lat: geo.lat, lng: geo.lng } : {}),
      })
      if (error) throw error
      await reloadProfile()
    } catch (err) {
      if (uploadedPath) await supabase.storage.from('profile-photos').remove([uploadedPath])
      setError(err.message || t('common.saveFail'))
      setBusy(false)
    }
  }

  return (
    <div className="page narrow profile-setup">
      <h1>{t('setup.title')}</h1>
      <div className="ps-steps" aria-hidden="true">
        <span className="on" />
        <span className={step === 'photo' ? 'on' : ''} />
      </div>
      {step === 'info' ? (
        <form onSubmit={next} className="stack">
          <label>{t('setup.fullName')}<input required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
          <label>{t('setup.phone')}<input required type="tel" placeholder="+27712345678" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>{t('setup.email')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>

          <label style={{ position: 'relative', display: 'block' }}>
            {t('setup.location')}
            <input
              required
              minLength={2}
              maxLength={150}
              autoComplete="off"
              value={location}
              onChange={(e) => onLocationType(e.target.value)}
            />
            {searching && <small>{t('common.loading')}</small>}
            {results.length > 0 && (
              <ul className="ps-suggest">
                {results.map((r, i) => (
                  <li key={i} onClick={() => choosePlace(r)}>
                    📍 {r.label}
                  </li>
                ))}
              </ul>
            )}
            {!picked && !searching && location.trim().length >= 3 && results.length === 0 && (
              <small className="ps-hint">{t('setup.locationPick')}</small>
            )}
          </label>

          <label className="check">
            <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
            {t('setup.showPhone')}
          </label>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <button type="button" className="btn ghost small" disabled={geoBusy} onClick={detectGeo}>
              {geoBusy ? t('common.loading') : t('setup.detectGeo')}
            </button>
            {picked && geo && <span className="muted small">✓ {t('setup.geoOk')}</span>}
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit">{t('setup.continue')}</button>
          <button type="button" className="link" onClick={logout}>{t('common.logout')}</button>
        </form>
      ) : (
        <div className="stack">
          <CameraCapture onAccept={save} />
          {busy && <p>{t('common.loading')}</p>}
          {error && <p className="error">{error}</p>}
          {!profile && (
            <button type="button" className="link" onClick={() => setStep('info')}>{t('common.back')}</button>
          )}
        </div>
      )}
    </div>
  )
}

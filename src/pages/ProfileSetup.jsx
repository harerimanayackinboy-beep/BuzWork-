import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import CameraCapture from '../components/CameraCapture'
import { compressImage } from '../lib/image'
import { getMyPosition } from '../lib/geo'

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
  const [photo, setPhoto] = useState(null)
  const [step, setStep] = useState(profile ? 'photo' : 'info')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function detectGeo() {
    setGeoBusy(true)
    try {
      setGeo(await getMyPosition())
    } catch {
      setError(t('setup.geoFail'))
    }
    setGeoBusy(false)
  }

  function next(e) {
    e.preventDefault()
    const p = phone.replace(/[\s\-()]/g, '')
    if (!/^\+?[0-9]{7,15}$/.test(p)) return setError(t('setup.phoneBad'))
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
        location: location.trim(),
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
    <div className="page narrow">
      <h1>{t('setup.title')}</h1>
      {step === 'info' ? (
        <form onSubmit={next} className="stack">
          <label>{t('setup.fullName')}<input required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
          <label>{t('setup.phone')}<input required type="tel" placeholder="+27712345678" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>{t('setup.email')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>{t('setup.location')}<input required minLength={2} maxLength={150} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
          <label className="check">
            <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
            {t('setup.showPhone')}
          </label>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <button type="button" className="btn ghost small" disabled={geoBusy} onClick={detectGeo}>
              {geoBusy ? t('common.loading') : t('setup.detectGeo')}
            </button>
            {geo && <span clas

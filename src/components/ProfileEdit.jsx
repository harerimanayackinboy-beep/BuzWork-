import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { getMyPosition } from '../lib/geo'
import PhoneInput from './PhoneInput'

// Guhindura umwirondoro (amazina, telefone, email, aho uri, kwerekana telefone)
export default function ProfileEdit() {
  const t = useT()
  const { user, profile, reloadProfile } = useAuth()
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone_number || '')
  const [email, setEmail] = useState(profile.email || '')
  const [location, setLocation] = useState(profile.location || '')
  const [showPhone, setShowPhone] = useState(!!profile.show_phone)
  const [geo, setGeo] = useState(profile.lat != null ? { lat: profile.lat, lng: profile.lng } : null)
  const [geoBusy, setGeoBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function detectGeo() {
    setGeoBusy(true)
    setError('')
    try {
      const pos = await getMyPosition()
      setGeo(pos)
    } catch {
      setError(t('setup.geoFail'))
    }
    setGeoBusy(false)
  }

  async function save(e) {
    e.preventDefault()
    setMsg(''); setError('')
    const p = phone.replace(/[\s\-()]/g, '')
    if (!/^\+?[0-9]{7,15}$/.test(p)) return setError(t('setup.phoneBad'))
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone_number: p,
        email: email.trim() || null,
        location: location.trim(),
        show_phone: showPhone,
        ...(geo ? { lat: geo.lat, lng: geo.lng } : {}),
      })
      .eq('user_id', user.id)
    setBusy(false)
    if (error) return setError(t('common.saveFail'))
    setPhone(p)
    await reloadProfile()
    setMsg(t('common.saved'))
  }

  return (
    <form onSubmit={save} className="card stack">
      <label>{t('setup.fullName')}<input required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
      <label>{t('setup.phone')}<PhoneInput value={phone} onChange={setPhone} /></label>
      <label>{t('setup.email')}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>{t('setup.location')}<input required minLength={2} maxLength={150} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <button type="button" className="btn ghost small" disabled={geoBusy} onClick={detectGeo}>
          {geoBusy ? t('common.loading') : t('setup.detectGeo')}
        </button>
        {geo && <span className="muted small">{t('setup.geoSet')}</span>}
      </div>
      <label className="check">
        <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
        {t('setup.showPhone')}
      </label>
      <button className="btn" disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button>
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </form>
  )
}

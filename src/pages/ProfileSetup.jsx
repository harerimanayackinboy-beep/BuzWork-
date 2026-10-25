import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import CameraCapture from '../components/CameraCapture'
import { compressImage } from '../lib/image'
import { normWhatsapp, isValidWhatsapp } from '../lib/whatsapp'

export default function ProfileSetup() {
  const { user, profile, reloadProfile, logout } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || user.user_metadata?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone_number || user.phone ? `+${(profile?.phone_number || user.phone).replace(/^\+/, '')}` : '')
  const [email, setEmail] = useState(profile?.email || user.email || '')
  const [location, setLocation] = useState(profile?.location || '')
  const [showPhone, setShowPhone] = useState(profile?.show_phone || false)
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp_number || '')
  const [photo, setPhoto] = useState(null)
  const [step, setStep] = useState(profile ? 'photo' : 'info')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function next(e) {
    e.preventDefault()
    const p = phone.replace(/[\s\-()]/g, '')
    if (!/^\+?[0-9]{7,15}$/.test(p)) return setError('Numero ya telefone ntiyanditse neza (nka +27712345678).')
    if (whatsapp.trim() && !isValidWhatsapp(whatsapp)) return setError("Numero ya WhatsApp ntiyanditse neza (nka +25779123456, hamwe n'ikode y'igihugu).")
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
        // Yoherezwa gusa iyo umukoresha yayanditse (WhatsApp ni option)
        ...(whatsapp.trim() ? { whatsapp_number: normWhatsapp(whatsapp) } : {}),
      })
      if (error) throw error
      await reloadProfile()
    } catch (err) {
      if (uploadedPath) await supabase.storage.from('profile-photos').remove([uploadedPath])
      setError(err.message || 'Ntibyashobotse kubikwa. Ongera ugerageze.')
      setBusy(false)
    }
  }

  return (
    <div className="page narrow">
      <h1>Uzuza profile yawe</h1>
      {step === 'info' ? (
        <form onSubmit={next} className="stack">
          <label>Amazina yose *<input required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
          <label>Numero ya telefone *<input required type="tel" placeholder="+27712345678" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>Numero ya WhatsApp (si ngombwa)<input type="tel" placeholder="+25779123456" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></label>
          <label>Email (si ngombwa)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Aho uri (location) *<input required minLength={2} maxLength={150} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
          <label className="check">
            <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
            Nemeye ko abandi babona numero yanje kugira bampamagare
          </label>
          <button className="btn">Komeza ku foto</button>
          {error && <p className="error">{error}</p>}
        </form>
      ) : (
        <div className="stack">
          <p className="muted">Intambwe ya nyuma: fata ifoto yawe kuri camera.</p>
          {busy ? <p>Ndabika…</p> : <CameraCapture onAccept={(b) => { setPhoto(b); save(b) }} />}
          {error && <p className="error">{error}</p>}
          {!profile && <button className="link" onClick={() => setStep('info')}>Subira inyuma</button>}
        </div>
      )}
      <button className="link" onClick={logout}>Sohoka</button>
    </div>
  )
}

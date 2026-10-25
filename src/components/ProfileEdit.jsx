import { useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'

// Guhindura umwirondoro (amazina, telefone, email, aho uri, kwerekana telefone)
export default function ProfileEdit() {
  const { user, profile, reloadProfile } = useAuth()
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone_number || '')
  const [email, setEmail] = useState(profile.email || '')
  const [location, setLocation] = useState(profile.location || '')
  const [showPhone, setShowPhone] = useState(!!profile.show_phone)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setMsg(''); setError('')
    const p = phone.replace(/[\s\-()]/g, '')
    if (!/^\+?[0-9]{7,15}$/.test(p)) return setError('Numero ya telefone ntiyanditse neza (nka +27712345678).')
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone_number: p,
        email: email.trim() || null,
        location: location.trim(),
        show_phone: showPhone,
      })
      .eq('user_id', user.id)
    setBusy(false)
    if (error) return setError('Ntibyashobotse kubikwa. Ongera ugerageze.')
    setPhone(p)
    await reloadProfile()
    setMsg('Vyabitswe ✅')
  }

  return (
    <form onSubmit={save} className="card stack">
      <label>Amazina yose *<input required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
      <label>Numero ya telefone *<input required type="tel" placeholder="+27712345678" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <label>Email (si ngombwa)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Aho uri (location) *<input required minLength={2} maxLength={150} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
      <label className="check">
        <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
        Nemeye ko abandi babona numero yanje kugira bampamagare
      </label>
      <button className="btn" disabled={busy}>{busy ? 'Ndabika…' : 'Bika'}</button>
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </form>
  )
}

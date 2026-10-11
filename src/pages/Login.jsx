import { useState } from 'react'
import { supabase } from '../supabase'

const normPhone = (p) => p.replace(/[\s\-()]/g, '')

export default function Login() {
  const [tab, setTab] = useState('email')
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const wrap = (fn) => async (e) => {
    e?.preventDefault()
    setError(''); setMsg(''); setBusy(true)
    try { await fn() } catch (err) { setError(err.message || 'Hari ikibazo. Ongera ugerageze.') }
    setBusy(false)
  }

  const google = wrap(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
    if (error) throw error
  })

  const emailSubmit = wrap(async () => {
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      })
      if (error) throw error
      if (!data.session) setMsg('Turakohereje email yo kwemeza. Hagarare link iyirimwo hanyuma winjire.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    }
  })

  const forgot = wrap(async () => {
    if (!email) throw new Error('Andika email yawe mbere.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    })
    if (error) throw error
    setMsg('Turakohereje link yo guhindura ijambo ry\'ibanga.')
  })

  const sendOtp = wrap(async () => {
    const p = normPhone(phone)
    if (!/^\+[0-9]{8,15}$/.test(p)) throw new Error('Andika numero hamwe n\'ikode y\'igihugu, nka +27712345678.')
    const { error } = await supabase.auth.signInWithOtp({ phone: p })
    if (error) throw error
    setOtpSent(true)
    setMsg('Kode yoherejwe kuri telefone yawe.')
  })

  const verifyOtp = wrap(async () => {
    const { error } = await supabase.auth.verifyOtp({ phone: normPhone(phone), token: otp.trim(), type: 'sms' })
    if (error) throw error
  })

  return (
    <div className="page narrow">
      <h1 className="logo">BizWork</h1>
      <p className="muted center">Gurisha, gura, shaka akazi canke abakozi.</p>

      <button className="btn google" onClick={google} disabled={busy}>Komeza na Google</button>
      <div className="or">canke</div>

      <div className="tabs">
        <button className={tab === 'email' ? 'on' : ''} onClick={() => setTab('email')}>Email</button>
        <button className={tab === 'phone' ? 'on' : ''} onClick={() => setTab('phone')}>Telefone</button>
      </div>

      {tab === 'email' ? (
        <form onSubmit={emailSubmit} className="stack">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required minLength={6} placeholder="Ijambo ry'ibanga" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn" disabled={busy}>{mode === 'signup' ? 'Iyandikishe' : 'Injira'}</button>
          <button type="button" className="link" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
            {mode === 'signup' ? 'Usanzwe ufise konti? Injira' : 'Nta konti ufise? Iyandikishe'}
          </button>
          {mode === 'login' && <button type="button" className="link" onClick={forgot}>Wibagiwe ijambo ry'ibanga?</button>}
        </form>
      ) : (
        <form onSubmit={otpSent ? verifyOtp : sendOtp} className="stack">
          <input type="tel" required placeholder="+27712345678" value={phone} disabled={otpSent} onChange={(e) => setPhone(e.target.value)} />
          {otpSent && <input inputMode="numeric" required placeholder="Kode wakiriye" value={otp} onChange={(e) => setOtp(e.target.value)} />}
          <button className="btn" disabled={busy}>{otpSent ? 'Emeza kode' : 'Ohereza kode'}</button>
          {otpSent && <button type="button" className="link" onClick={() => { setOtpSent(false); setOtp('') }}>Hindura numero</button>}
        </form>
      )}

      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export function ResetPassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return setError(error.message)
    onDone()
  }
  return (
    <div className="page narrow">
      <h1>Ijambo rishasha ry'ibanga</h1>
      <form onSubmit={submit} className="stack">
        <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Ijambo rishasha" />
        <button className="btn">Bika</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}

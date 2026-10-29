import { useState } from 'react'
import { supabase } from '../supabase'
import { useI18n, useT, LANGS } from '../i18n'

export default function Login() {
  const t = useT()
  const { lang, setLang } = useI18n()
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const wrap = (fn) => async (e) => {
    e?.preventDefault()
    setError(''); setMsg(''); setBusy(true)
    try { await fn() } catch (err) { setError(err.message || t('common.genericError')) }
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
      if (!data.session) setMsg(t('login.confirmSent'))
    } else {
      let loginEmail = email.trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
        const uname = loginEmail.replace(/^@/, '').toLowerCase()
        const { data: resolved } = await supabase.rpc('email_for_username', { uname })
        if (!resolved) throw new Error(t('login.usernameNotFound'))
        loginEmail = resolved
      }
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) throw error
    }
  })

  const forgot = wrap(async () => {
    if (!email) throw new Error(t('login.emailFirst'))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error(t('login.forgotNeedsEmail'))
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    })
    if (error) throw error
    setMsg(t('login.resetSent'))
  })

  return (
    <div className="page narrow">
      <div className="lang-row">
        {Object.entries(LANGS).map(([code, l]) => (
          <button
            key={code}
            className={`lang-pill ${lang === code ? 'on' : ''}`}
            onClick={() => setLang(code)}
            title={l.label}
          >
            {l.flag}
          </button>
        ))}
      </div>

      <h1 className="logo">BizWork</h1>
      <p className="muted center">{t('login.tagline')}</p>

      <button className="btn google" onClick={google} disabled={busy}>{t('login.google')}</button>
      <div className="or">{t('login.or')}</div>

      <form onSubmit={emailSubmit} className="stack">
        <input
          type={mode === 'signup' ? 'email' : 'text'}
          required
          placeholder={mode === 'signup' ? t('login.email') : t('login.emailOrUsername')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input type="password" required minLength={6} placeholder={t('login.password')} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn" disabled={busy}>{mode === 'signup' ? t('login.signup') : t('login.signin')}</button>
        <button type="button" className="link" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
          {mode === 'signup' ? t('login.haveAccount') : t('login.noAccount')}
        </button>
        {mode === 'login' && <button type="button" className="link" onClick={forgot}>{t('login.forgot')}</button>}
      </form>

      {msg && <p className="ok">{msg}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export function ResetPassword({ onDone }) {
  const t = useT()
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
      <h1>{t('login.resetTitle')}</h1>
      <form onSubmit={submit} className="stack">
        <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('login.newPassword')} />
        <button className="btn">{t('common.save')}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../supabase'
import { useI18n, useT, LANGS } from '../i18n'

const css = `
.lg-page{min-height:100vh;background:#f5f8f7;color:#123b38}
.lg-hero{background:linear-gradient(145deg,#087568,#004e47);padding:18px 18px 74px;border-radius:0 0 32px 32px;text-align:center;color:#fff}
.lang-select{position:relative;display:flex;justify-content:center;margin-bottom:22px}
.lang-btn{display:flex;align-items:center;gap:6px;background:#ffffff25;border:1px solid #ffffff50;border-radius:20px;padding:9px 18px;font-size:15px;font-weight:bold;color:#fff;cursor:pointer}
.lang-menu{position:absolute;top:100%;margin-top:6px;z-index:20;background:#fff;border:1px solid #d5e3df;border-radius:14px;box-shadow:0 6px 20px #00000030;min-width:200px;max-height:300px;overflow-y:auto;padding:6px}
.lang-item{display:block;width:100%;text-align:left;background:transparent;border:0;border-radius:10px;padding:12px 14px;font-size:15px;color:#123b38;cursor:pointer}
.lang-item:hover{background:#eef6f4}
.lang-item.on{background:#087568;color:#fff;font-weight:bold}
.lg-logo{font-size:42px;font-weight:800;margin:0;color:#fff;letter-spacing:.5px}
.lg-logo span{color:#f5b301}
.lg-tag{color:#bce9df;margin:8px 0 0;font-size:15px}
.lg-card{background:#fff;margin:-46px 16px 24px;border-radius:22px;padding:20px 16px;box-shadow:0 8px 24px #003d3520;position:relative}
.lg-google{width:100%;min-height:50px;border:1px solid #d5e3df;background:#fff;border-radius:14px;font-size:16px;font-weight:bold;color:#123b38;cursor:pointer}
.lg-or{display:flex;align-items:center;gap:10px;color:#7a8f8b;font-size:14px;margin:16px 0}
.lg-or:before,.lg-or:after{content:'';flex:1;height:1px;background:#e0e9e6}
.lg-form{display:flex;flex-direction:column;gap:12px}
.lg-form input{width:100%;min-height:50px;border:1px solid #d5e3df;border-radius:14px;padding:0 14px;font-size:16px;background:#f9fbfa;color:#123b38}
.lg-form input:focus{outline:none;border-color:#087568;box-shadow:0 0 0 3px #08756830}
.lg-pw-wrap{position:relative}
.lg-pw-wrap input{padding-right:46px}
.lg-pw-toggle{position:absolute;right:4px;top:0;bottom:0;background:none;border:0;cursor:pointer;font-size:19px;padding:0 10px;color:#7a8f8b;display:flex;align-items:center}
.lg-submit{min-height:50px;border:0;border-radius:14px;background:#087568;color:#fff;font-size:16px;font-weight:bold;cursor:pointer}
.lg-submit:disabled,.lg-google:disabled{opacity:.6}
.lg-link{background:none;border:0;color:#087568;font-size:15px;padding:6px 0;cursor:pointer;text-align:left}
.lg-link.strong{font-weight:bold}
.lg-ok{color:#087568;margin:12px 0 0}
.lg-error{color:#c0392b;margin:12px 0 0}
`

export default function Login() {
  const t = useT()
  const { lang, setLang } = useI18n()
  const [langOpen, setLangOpen] = useState(false)
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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
    <div className="lg-page">
      <style>{css}</style>

      <div className="lg-hero">
        <div className="lang-select">
          <button type="button" className="lang-btn" onClick={() => setLangOpen(!langOpen)}>
            {LANGS[lang]?.label || lang} <span>▾</span>
          </button>
          {langOpen && (
            <div className="lang-menu">
              {Object.entries(LANGS).map(([code, l]) => (
                <button
                  key={code}
                  type="button"
                  className={`lang-item ${lang === code ? 'on' : ''}`}
                  onClick={() => { setLang(code); setLangOpen(false) }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <h1 className="lg-logo">Biz<span>Work</span></h1>
        <p className="lg-tag">{t('login.tagline')}</p>
      </div>

      <div className="lg-card">
        <button className="lg-google" onClick={google} disabled={busy}>{t('login.google')}</button>
        <div className="lg-or">{t('login.or')}</div>

        <form onSubmit={emailSubmit} className="lg-form">
          <input
            type={mode === 'signup' ? 'email' : 'text'}
            required
            placeholder={mode === 'signup' ? t('login.email') : t('login.emailOrUsername')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="lg-pw-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              required
              minLength={6}
              placeholder={t('login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="lg-pw-toggle"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
              title={showPw ? t('login.hidePassword') : t('login.showPassword')}
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          <button className="lg-submit" disabled={busy}>{mode === 'signup' ? t('login.signup') : t('login.signin')}</button>
          <button type="button" className="lg-link strong" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
            {mode === 'signup' ? t('login.haveAccount') : t('login.noAccount')}
          </button>
          {mode === 'login' && <button type="button" className="lg-link" onClick={forgot}>{t('login.forgot')}</button>}
        </form>

        {msg && <p className="lg-ok">{msg}</p>}
        {error && <p className="lg-error">{error}</p>}
      </div>
    </div>
  )
}

export function ResetPassword({ onDone }) {
  const t = useT()
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return setError(error.message)
    onDone()
  }
  return (
    <div className="page narrow">
      <style>{`.rp-pw-wrap{position:relative}.rp-pw-wrap input{padding-right:46px}.rp-pw-toggle{position:absolute;right:4px;top:0;bottom:0;background:none;border:0;cursor:pointer;font-size:19px;padding:0 10px;color:var(--muted);display:flex;align-items:center}`}</style>
      <h1>{t('login.resetTitle')}</h1>
      <form onSubmit={submit} className="stack">
        <div className="rp-pw-wrap">
          <input
            type={showPw ? 'text' : 'password'}
            required
            minLength={6}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder={t('login.newPassword')}
          />
          <button
            type="button"
            className="rp-pw-toggle"
            onClick={() => setShowPw(!showPw)}
            aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
            title={showPw ? t('login.hidePassword') : t('login.showPassword')}
          >
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>
        <button className="btn">{t('common.save')}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}

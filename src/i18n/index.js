import { createContext, useCallback, useContext, useState } from 'react'
import af from './langs/af'
import de from './langs/de'
import en from './langs/en'
import es from './langs/es'
import fr from './langs/fr'
import ln from './langs/ln'
import pt from './langs/pt'
import rn from './langs/rn'
import rw from './langs/rw'
import sw from './langs/sw'
import zu from './langs/zu'

export const LANGS = {
  rn: { label: 'Ikirundi', flag: '🇧🇮', dict: rn },
  rw: { label: 'Ikinyarwanda', flag: '🇷🇼', dict: rw },
  en: { label: 'English', flag: '🇬🇧', dict: en },
  fr: { label: 'Français', flag: '🇫🇷', dict: fr },
  sw: { label: 'Kiswahili', flag: '🇰🇪', dict: sw },
  pt: { label: 'Português', flag: '🇵🇹', dict: pt },
  zu: { label: 'isiZulu', flag: '🇿🇦', dict: zu },
  af: { label: 'Afrikaans', flag: '🇿🇦', dict: af },
  ln: { label: 'Lingála', flag: '🇨🇩', dict: ln },
  es: { label: 'Español', flag: '🇪🇸', dict: es },
  de: { label: 'Deutsch', flag: '🇩🇪', dict: de },
}

const DEFAULT_LANG = 'rn'
const KEY = 'bizwork-lang'

export function getLang() {
  try {
    const v = localStorage.getItem(KEY)
    if (v && LANGS[v]) return v
  } catch { /* nta kibazo */ }
  return DEFAULT_LANG
}

export function setLang(code) {
  try { localStorage.setItem(KEY, code) } catch { /* nta kibazo */ }
}

const Ctx = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getLang())

  const change = useCallback((code) => {
    if (!LANGS[code]) return
    setLang(code)
    setLangState(code)
  }, [])

  const t = useCallback((key, vars) => {
    const dict = LANGS[lang]?.dict || LANGS[DEFAULT_LANG].dict
    let str = dict[key] ?? LANGS[DEFAULT_LANG].dict[key] ?? key
    if (vars) for (const k in vars) str = str.replaceAll(`{${k}}`, vars[k])
    return str
  }, [lang])

  return <Ctx.Provider value={{ lang, setLang: change, t }}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
export const useT = () => useContext(Ctx).t

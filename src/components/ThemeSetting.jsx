import { useState } from 'react'
import { getTheme, setTheme } from '../lib/theme'
import { useT } from '../i18n'

export default function ThemeSetting() {
  const t = useT()
  const [theme, setT] = useState(getTheme())
  const pick = (k) => { setTheme(k); setT(k) }
  const OPTIONS = [
    { key: 'auto', label: t('settings.themeAuto') },
    { key: 'light', label: t('settings.themeLight') },
    { key: 'dark', label: t('settings.themeDark') },
  ]

  return (
    <div className="card stack">
      <p className="muted small">{t('settings.themeHelp')}</p>
      <div className="seg">
        {OPTIONS.map((o) => (
          <button key={o.key} className={`btn small ${theme === o.key ? '' : 'ghost'}`} onClick={() => pick(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

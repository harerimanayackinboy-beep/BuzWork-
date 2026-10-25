import { useState } from 'react'
import { getTheme, setTheme } from '../lib/theme'

const OPTIONS = [
  { key: 'auto', label: '📱 Otomatike' },
  { key: 'light', label: '☀️ Umucyo' },
  { key: 'dark', label: '🌙 Umwijima' },
]

export default function ThemeSetting() {
  const [theme, setT] = useState(getTheme())
  const pick = (k) => { setTheme(k); setT(k) }

  return (
    <div className="card stack">
      <p className="muted small">Hitamo uko app igaragara. "Otomatike" ikurikira telefone yawe.</p>
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

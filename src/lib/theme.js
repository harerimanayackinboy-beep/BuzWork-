// Mode ya app: 'auto' (ukurikije telefone), 'light' (umucyo), 'dark' (umwijima)
const KEY = 'bizwork-theme'

export function getTheme() {
  try { return localStorage.getItem(KEY) || 'auto' } catch { return 'auto' }
}

export function applyTheme(t) {
  const root = document.documentElement
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t)
  else root.removeAttribute('data-theme')
}

export function setTheme(t) {
  try { if (t === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t) } catch { /* nta kibazo */ }
  applyTheme(t)
}

export const initTheme = () => applyTheme(getTheme())

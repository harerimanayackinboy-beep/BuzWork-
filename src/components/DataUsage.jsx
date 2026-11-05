import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { getDataSaver, setDataSaver } from '../lib/dataSaver'

function fmtBytes(n) {
  if (!n && n !== 0) return '—'
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function DataUsage() {
  const t = useT()
  const [saver, setSaver] = useState(getDataSaver())
  const [usage, setUsage] = useState(null) // { used, quota } | null | 'unsupported'
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)

  async function loadUsage() {
    if (!navigator.storage?.estimate) { setUsage('unsupported'); return }
    try {
      const { usage: used, quota } = await navigator.storage.estimate()
      setUsage({ used, quota })
    } catch {
      setUsage('unsupported')
    }
  }

  useEffect(() => { loadUsage() }, [])

  function toggleSaver() {
    const next = !saver
    setDataSaver(next)
    setSaver(next)
  }

  async function clearCache() {
    setClearing(true); setCleared(false)
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      setCleared(true)
      await loadUsage()
    } catch { /* ignore */ }
    setClearing(false)
  }

  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{t('settings.dataSaver')}</strong>
          <p className="muted small" style={{ margin: '2px 0 0' }}>{t('settings.dataSaverHelp')}</p>
        </div>
        <button className={`btn small ${saver ? '' : 'ghost'}`} onClick={toggleSaver}>
          {saver ? t('settings.dataSaverOn') : t('settings.dataSaverOff')}
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--line, #27454c)', marginTop: 10, paddingTop: 10 }}>
        <strong>{t('settings.storageUsed')}</strong>
        {usage === null && <p className="muted small">{t('common.loading')}</p>}
        {usage === 'unsupported' && <p className="muted small">{t('settings.storageUnsupported')}</p>}
        {usage && usage !== 'unsupported' && (
          <p className="muted small">{fmtBytes(usage.used)} {usage.quota ? `/ ${fmtBytes(usage.quota)}` : ''}</p>
        )}
        <button className="btn small ghost" disabled={clearing} onClick={clearCache}>
          {clearing ? t('common.loading') : t('settings.clearCache')}
        </button>
        {cleared && <p className="muted small">{t('settings.clearCacheDone')}</p>}
      </div>
    </div>
  )
}

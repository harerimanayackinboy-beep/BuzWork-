import { useI18n, LANGS } from '../i18n'

export default function LanguageSetting() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="card stack">
      <p className="muted small">{t('settings.languageHelp')}</p>
      <div className="lang-grid">
        {Object.entries(LANGS).map(([code, l]) => (
          <button
            key={code}
            className={`lang-item ${lang === code ? 'on' : ''}`}
            onClick={() => setLang(code)}
          >
            <span>{l.flag}</span> {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

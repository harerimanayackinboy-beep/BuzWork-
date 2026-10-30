import { useEffect, useState } from 'react'
import { COUNTRY_CODES, findCountryForNumber } from '../lib/countryCodes'
import { useT } from '../i18n'

// Umwanya wo kwandika numero: umukoresha ahitamwo igihugu ciwe (afise
// ubushakashatsi/search kugira abone igihugu ciwe vuba), code igashirwaho
// ubwayo, akandika gusa ibiharuro bisigaye.
export default function PhoneInput({ value, onChange, placeholder }) {
  const t = useT()
  const initial = findCountryForNumber(value) || COUNTRY_CODES[0]
  const [country, setCountry] = useState(initial)
  const [digits, setDigits] = useState(value ? value.slice(initial.code.length).replace(/[^0-9]/g, '') : '')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    onChange(digits ? country.code + digits : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, digits])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? COUNTRY_CODES.filter((c) => c.name.toLowerCase().includes(q) || c.code.includes(q))
    : COUNTRY_CODES

  function pick(c) {
    setCountry(c)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="phone-input">
      <div className="phone-country">
        <button type="button" className="phone-country-btn" onClick={() => setOpen(!open)}>
          {country.flag} {country.code} <span>▾</span>
        </button>
        {open && (
          <>
            <div className="phone-country-backdrop" onClick={() => setOpen(false)} />
            <div className="phone-country-menu">
              <input
                autoFocus
                type="text"
                className="phone-country-search"
                placeholder={t('phone.searchCountry')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="phone-country-list">
                {filtered.map((c) => (
                  <button
                    key={c.iso}
                    type="button"
                    className={`phone-country-item ${c.iso === country.iso ? 'on' : ''}`}
                    onClick={() => pick(c)}
                  >
                    <span>{c.flag} {c.code}</span>
                    <span className="muted small">{c.name}</span>
                  </button>
                ))}
                {!filtered.length && <p className="muted small phone-country-empty">{t('phone.noResults')}</p>}
              </div>
            </div>
          </>
        )}
      </div>
      <input
        type="tel"
        inputMode="numeric"
        placeholder={placeholder || '712345678'}
        value={digits}
        onChange={(e) => setDigits(e.target.value.replace(/[^0-9]/g, ''))}
      />
    </div>
  )
}

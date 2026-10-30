import { useEffect, useState } from 'react'
import { COUNTRY_CODES, findCountryForNumber } from '../lib/countryCodes'

// Umwanya wo kwandika numero: umukoresha ahitamwo igihugu ciwe (code
// y'igihugu igashirwaho ubwayo), akandika gusa ibiharuro bisigaye.
export default function PhoneInput({ value, onChange, placeholder }) {
  const initial = findCountryForNumber(value) || COUNTRY_CODES[0]
  const [code, setCode] = useState(initial.code)
  const [digits, setDigits] = useState(value ? value.slice(initial.code.length).replace(/[^0-9]/g, '') : '')

  useEffect(() => {
    onChange(digits ? code + digits : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, digits])

  return (
    <div className="phone-input">
      <select value={code} onChange={(e) => setCode(e.target.value)} aria-label="Country code">
        {COUNTRY_CODES.map((c) => (
          <option key={c.iso} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>
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

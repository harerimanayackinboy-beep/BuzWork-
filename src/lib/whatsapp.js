// Gutegura numero ya WhatsApp: "+257 79 12 34 56" -> "+25779123456"
export const normWhatsapp = (v) => (v || '').replace(/[\s\-()]/g, '')

export const isValidWhatsapp = (v) => /^\+[0-9]{8,15}$/.test(normWhatsapp(v))

// Link ya wa.me (nta "+", imibare gusa), hamwe n'ubutumwa bwateguwe
export function whatsappLink(number, text) {
  const digits = normWhatsapp(number).replace(/^\+/, '')
  if (!/^[0-9]{8,15}$/.test(digits)) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

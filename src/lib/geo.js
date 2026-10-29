// Intera hagati y'ahantu habiri (km), ukoresheje Haversine formula
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function askPosition(opts) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      opts
    )
  })
}

// Gusaba intera y'uyu muntu ubu (browser geolocation).
// Itanga reason yihariye ('denied' | 'timeout' | 'unavailable' | 'no-geo')
// kugira ngo ubutumwa buboneke neza ku mukoresha (aho kuvuga "denied" gusa).
export async function getMyPosition() {
  if (!navigator.geolocation) {
    const e = new Error('no-geo')
    e.reason = 'no-geo'
    throw e
  }
  try {
    // Igerageza rya mbere: vuba (network/wifi-based), ntibisaba GPS ngeri
    return await askPosition({ enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 })
  } catch (err1) {
    // code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
    if (err1 && err1.code === 1) {
      const e = new Error('denied')
      e.reason = 'denied'
      throw e
    }
    // Iyo ari TIMEOUT canke UNAVAILABLE, gerageza nanone ukoresheje GPS ngeri
    // (enableHighAccuracy), hamwe n'igihe kirekire, mbere yo kuvuga ko byanze.
    try {
      return await askPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
    } catch (err2) {
      const e = new Error(err2?.code === 1 ? 'denied' : err2?.code === 3 ? 'timeout' : 'unavailable')
      e.reason = e.message
      throw e
    }
  }
}

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

// Iyo nta internet ihari (canke Supabase idasubije), ntidushaka ko app
// isigara yikaraye kuri "Ndikuzana..." ubuzima bwayo bwose -- dufisha
// profile ya nyuma yabitswe kuri iyi terefone (localStorage) kugira app
// ifungure vuba, naho ibintu bisaba internet (nko kurungika ubutumwa
// bushasha) ata zoshobora gukora kugeza umurandasi ugarutse.
const PROFILE_CACHE_KEY = 'bw_profile_cache_v1'

function readCachedProfile(uid) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    return obj && obj.uid === uid ? obj.profile : null
  } catch { return null }
}

function writeCachedProfile(uid, profile) {
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ uid, profile })) } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); setProfileLoaded(true); return }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle()
      if (error) throw error
      setProfile(data || null)
      writeCachedProfile(uid, data || null)
    } catch {
      // Nta internet (canke Supabase ntiyashoboye gusubiza) -- koresha
      // iyabitswe aha iheruka, aho kugumya app "Ndikuzana..." ibuzima bwayo.
      setProfile(readCachedProfile(uid))
    } finally {
      setProfileLoaded(true)
    }
  }, [])

  useEffect(() => {
    // getSession() isoma session yabitswe kuri iyi terefone (localStorage),
    // ntago igomba kugira internet kugira isubize. Dushize .catch() hamwe
    // n'igihe ntarengwa (timeout) ngo app itagumayo "Ndikuzana..." iteka
    // niba hari ikibazo kitazwi (urugero: internet idahari rwose).
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 5000))
    Promise.race([supabase.auth.getSession(), timeout])
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    setProfileLoaded(false)
    loadProfile(session?.user?.id)
  }, [session?.user?.id, session === undefined, loadProfile])

  const value = {
    session,
    user: session?.user || null,
    profile,
    profileLoaded,
    recovery,
    online,
    clearRecovery: () => setRecovery(false),
    reloadProfile: () => loadProfile(session?.user?.id),
    logout: () => supabase.auth.signOut(),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

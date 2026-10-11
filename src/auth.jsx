import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [recovery, setRecovery] = useState(false)

  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); setProfileLoaded(true); return }
    const { data } = await supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle()
    setProfile(data || null)
    setProfileLoaded(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
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
    clearRecovery: () => setRecovery(false),
    reloadProfile: () => loadProfile(session?.user?.id),
    logout: () => supabase.auth.signOut(),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

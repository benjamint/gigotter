import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, myProfile, type AuthUser } from './api'
import type { Profile } from './types'

interface Ctx { user: AuthUser | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void> }
const SessionCtx = createContext<Ctx>({ user: null, profile: null, loading: true, refresh: async () => {} })

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    try {
      const u = await auth.user()
      setUser(u)
      setProfile(u ? await myProfile() : null)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh(); return auth.onChange(() => { refresh() }) }, [refresh])
  return <SessionCtx.Provider value={{ user, profile, loading, refresh }}>{children}</SessionCtx.Provider>
}
export const useSession = () => useContext(SessionCtx)

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const run = useCallback(async () => {
    setLoading(true)
    try { setData(await fn()); setError(null) } catch (e: any) { setError(e.message) } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { run() }, [run])
  return { data, error, loading, reload: run, setData }
}

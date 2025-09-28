import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SocialLogin } from '@capgo/capacitor-social-login'

type AuthUser = {
  name: string
  email: string
  imageUrl?: string
}

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const isAuthenticated = !!user
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Initialize GoogleAuth once
  useEffect(() => {
    const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined
    const iOSClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined
    ;(async () => {
      try {
        await SocialLogin.initialize({
          google: {
            webClientId: webClientId ?? '',
            iOSClientId: iOSClientId ?? '',
            mode: 'online',
          },
        })
      } catch {}
    })()

    // Dev-only mock auth for tests: ?mockAuth=1 or localStorage mock_auth=1
    try {
      const url = new URL(window.location.href)
      const mock = url.searchParams.get('mockAuth') === '1' || localStorage.getItem('mock_auth') === '1'
      if (import.meta.env.DEV && mock) {
        setUser({ name: 'Mock User', email: 'mock@example.com', imageUrl: '' })
        setAccessToken('mock')
      }
    } catch {}
  }, [])

  const signIn = useCallback(async () => {
    try {
      const loginRes = await SocialLogin.login({
        provider: 'google',
        options: { scopes: ['email', 'profile', 'https://www.googleapis.com/auth/drive.appdata'] },
      })
      const data = (loginRes as any)?.result
      const profile = data?.profile
      const token = data?.accessToken?.token as string | undefined
      if (token) setAccessToken(token)
      if (profile?.email) {
        setUser({ name: profile.name ?? profile.email, email: profile.email, imageUrl: profile.imageUrl ?? profile.imageUrl })
      }
    } catch (err) {
      console.warn('Google sign-in failed', err)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await SocialLogin.logout({ provider: 'google' })
    } catch {}
    setUser(null)
    setAccessToken(null)
  }, [])

  const getAccessToken = useCallback(async () => accessToken ?? null, [accessToken])

  const value = useMemo(() => ({ user, isAuthenticated, signIn, signOut, getAccessToken }), [user, isAuthenticated, signIn, signOut, getAccessToken])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}



import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { Capacitor } from '@capacitor/core'

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

const STORAGE_USER = 'auth_user'
const STORAGE_TOKEN = 'auth_access_token'

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
            mode: 'online'
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

    // Hydrate from persisted storage (non-mock)
    try {
      const rawUser = localStorage.getItem(STORAGE_USER)
      const rawToken = localStorage.getItem(STORAGE_TOKEN)
      if (rawUser && rawToken) {
        const parsed = JSON.parse(rawUser) as AuthUser
        if (parsed && parsed.email) {
          setUser(parsed)
          setAccessToken(rawToken)
        }
      }
    } catch {}
  }, [])

  const signIn = useCallback(async () => {
    try {
      const isAndroid = Capacitor.getPlatform() === 'android'
      const nonAndroidScopes = ['email', 'profile', 'https://www.googleapis.com/auth/drive.appdata']
      const loginRes = await SocialLogin.login({
        provider: 'google',
        options: isAndroid ? {} : { scopes: nonAndroidScopes },
      })
      const data = (loginRes as any)?.result
      const profile = data?.profile
      const token = data?.accessToken?.token as string | undefined
      if (token) setAccessToken(token)
      if (profile?.email) {
        const nextUser: AuthUser = { name: profile.name ?? profile.email, email: profile.email, imageUrl: profile.imageUrl ?? profile.imageUrl }
        setUser(nextUser)
        try {
          if (token) localStorage.setItem(STORAGE_TOKEN, token)
          localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser))
        } catch {}
      }
    } catch (err: any) {
      console.warn('Google sign-in failed', err)
      const errText = err?.message || err?.error || err?.toString?.() || 'Unknown error'
      try { alert(`Sign-in failed: ${errText}`) } catch {}
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await SocialLogin.logout({ provider: 'google' })
    } catch {}
    setUser(null)
    setAccessToken(null)
    try { localStorage.removeItem(STORAGE_USER); localStorage.removeItem(STORAGE_TOKEN) } catch {}
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



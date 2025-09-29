import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { createOrUpdateAppDataJson, exportAllLocalStorage, readAppDataJson, importAllToLocalStorage } from './driveClient'

type SyncContextValue = {
  lastBackupAt: number | null
  backupNow: () => Promise<void>
  restoreNow: (force?: boolean) => Promise<boolean>
  autoBackupEnabled: boolean
  setAutoBackupEnabled: (v: boolean) => void
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined)

function formatShort(ts: number) {
  try { return new Date(ts).toLocaleTimeString() } catch { return '' }
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getAccessToken } = useAuth()
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null)
  const [toast, setToast] = useState<string>('')
  const [toastAction, setToastAction] = useState<null | (() => void)>(null)
  const toastTimer = useRef<number | null>(null)
  const shownRestoreOnce = useRef(false)
  const promptedNewerOnce = useRef(false)
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState<boolean>(() => {
    try { return localStorage.getItem('auto_backup_enabled') !== '0' } catch { return true }
  })

  const setAutoBackupEnabled = useCallback((v: boolean) => {
    setAutoBackupEnabledState(v)
    try { localStorage.setItem('auto_backup_enabled', v ? '1' : '0') } catch {}
  }, [])

  const showToast = (msg: string, action?: () => void) => {
    setToast(msg)
    setToastAction(action ?? null)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => { setToast(''); setToastAction(null) }, 2500)
  }

  const backupNow = useCallback(async () => {
    try {
      const token = await getAccessToken()
      if (!token) return
      const snapshot = exportAllLocalStorage()
      const ts = Date.now()
      await createOrUpdateAppDataJson(token, 'app_data.json', { snapshot, ts })
      setLastBackupAt(ts)
      try { localStorage.setItem('last_backup_ts', String(ts)) } catch {}
      showToast(`Backed up • ${formatShort(ts)}`)
    } catch (e: any) {
      if (e?.code === 'AUTH_401') showToast('Login expired. Please sign in again.')
      else showToast('Backup failed – Retry', () => { backupNow().catch(() => {}) })
    }
  }, [getAccessToken])

  const restoreNow = useCallback(async (_force = false) => {
    try {
      const token = await getAccessToken()
      if (!token) return false
      const data = await readAppDataJson<{ snapshot: Record<string,string>, ts?: number }>(token, 'app_data.json')
      if (data?.snapshot) {
        importAllToLocalStorage(data.snapshot)
        showToast('Restored backup')
        return true
      }
      return false
    } catch (e: any) {
      if (e?.code === 'AUTH_401') showToast('Login expired. Please sign in again.')
      else showToast('Restore failed – Retry', () => { restoreNow(true).catch(() => {}) })
      return false
    }
  }, [getAccessToken])

  // On mount: load last backup ts
  useEffect(() => {
    try {
      const v = localStorage.getItem('last_backup_ts')
      if (v) setLastBackupAt(Number(v))
    } catch {}
  }, [])

  // Auto-restore on first run if empty
  useEffect(() => {
    if (!isAuthenticated) return
    if (shownRestoreOnce.current) return
    // consider empty if no saved games list
    let empty = false
    try {
      const raw = localStorage.getItem('dice_tracker_games')
      empty = !raw || raw === '[]'
    } catch { empty = true }
    if (!empty) { shownRestoreOnce.current = true; return }
    ;(async () => {
      shownRestoreOnce.current = true
      await restoreNow(false)
    })()
  }, [isAuthenticated, restoreNow])

  // Conflict check: if newer remote backup exists, offer restore
  useEffect(() => {
    if (!isAuthenticated) return
    if (promptedNewerOnce.current) return
    let localTs = 0
    try { const v = localStorage.getItem('last_backup_ts'); if (v) localTs = Number(v) || 0 } catch {}
    ;(async () => {
      try {
        const token = await getAccessToken(); if (!token) return
        const data = await readAppDataJson<{ snapshot: Record<string,string>, ts?: number }>(token, 'app_data.json')
        const remoteTs = Number(data?.ts || 0)
        if (remoteTs > 0 && remoteTs > localTs) {
          promptedNewerOnce.current = true
          const ok = window.confirm('A newer backup was found in Drive. Restore it now?')
          if (ok) await restoreNow(true)
        }
      } catch { /* ignore */ }
    })()
  }, [isAuthenticated, getAccessToken, restoreNow])

  // Auto-backup on background / pagehide
  useEffect(() => {
    if (!isAuthenticated || !autoBackupEnabled) return
    const onHide = () => { backupNow().catch(() => {}) }
    document.addEventListener('visibilitychange', () => { if (document.hidden) onHide() })
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
    }
  }, [isAuthenticated, autoBackupEnabled, backupNow])

  const value = useMemo(() => ({ lastBackupAt, backupNow, restoreNow, autoBackupEnabled, setAutoBackupEnabled }), [lastBackupAt, backupNow, restoreNow, autoBackupEnabled, setAutoBackupEnabled])

  return (
    <SyncContext.Provider value={value}>
      {children}
      {/* toast */}
      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: 'calc(12px + var(--safe-bottom))', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <div className="px-3 py-2 rounded-md text-xs text-white flex items-center gap-2" style={{ background: 'rgba(20,20,20,0.85)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span>{toast}</span>
            {toastAction && (
              <button onClick={toastAction} className="underline text-white/90">Retry</button>
            )}
          </div>
        </div>
      ) : null}
    </SyncContext.Provider>
  )
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}



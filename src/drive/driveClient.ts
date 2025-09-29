/**
 * Minimal Google Drive AppData helpers
 * Stores a single JSON file in the user's Drive AppData folder
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export type DriveFileMeta = { id: string; name: string; modifiedTime?: string }

async function authFetch(url: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    if (res.status === 401) {
      const err: any = new Error('Unauthorized')
      err.code = 'AUTH_401'
      throw err
    }
    const text = await res.text().catch(() => '')
    throw new Error(`Drive API error ${res.status}: ${text}`)
  }
  return res
}

export async function findAppDataFile(accessToken: string, name: string): Promise<DriveFileMeta | null> {
  const q = encodeURIComponent(`name='${name.replace(/'/g, "\'" )}' and trashed=false`)
  const url = `${DRIVE_API}/files?q=${q}&spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=1`
  const res = await authFetch(url, accessToken)
  const data = await res.json()
  const file = (data?.files?.[0] as DriveFileMeta | undefined) || null
  return file
}

export async function createOrUpdateAppDataJson(accessToken: string, name: string, json: unknown): Promise<DriveFileMeta> {
  const existing = await findAppDataFile(accessToken, name)
  const metadata = {
    name,
    parents: ['appDataFolder'],
  }
  const boundary = `boundary_${Math.random().toString(36).slice(2)}`
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelim = `\r\n--${boundary}--`
  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(existing ? { name } : metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(json) +
    closeDelim

  const method = existing ? 'PATCH' : 'POST'
  const path = existing ? `/files/${existing.id}` : '/files'
  const url = `${UPLOAD_API}${path}?uploadType=multipart&fields=id,name,modifiedTime`
  const res = await authFetch(url, accessToken, {
    method,
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  return (await res.json()) as DriveFileMeta
}

export async function readAppDataJson<T = unknown>(accessToken: string, name: string): Promise<T | null> {
  const existing = await findAppDataFile(accessToken, name)
  if (!existing) return null
  const url = `${DRIVE_API}/files/${existing.id}?alt=media`
  const res = await authFetch(url, accessToken)
  return (await res.json()) as T
}

export function exportAllLocalStorage(): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    try { out[k] = String(localStorage.getItem(k)) } catch {}
  }
  return out
}

export function importAllToLocalStorage(data: Record<string, string>): void {
  for (const [k, v] of Object.entries(data)) {
    try { localStorage.setItem(k, v) } catch {}
  }
}



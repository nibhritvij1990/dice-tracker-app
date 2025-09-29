export function exportLocalToFile(filename = 'dice-tracker-backup.json') {
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    data[k] = String(localStorage.getItem(k))
  }
  const blob = new Blob([JSON.stringify({ snapshot: data, ts: Date.now() }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function importLocalFromFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Read failed'))
    reader.onload = () => {
      try {
        const text = String(reader.result || '')
        const parsed = JSON.parse(text) as { snapshot?: Record<string,string> }
        const snap = parsed.snapshot || (parsed as any)
        Object.entries(snap).forEach(([k, v]) => {
          try { localStorage.setItem(k, String(v)) } catch {}
        })
        resolve()
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsText(file)
  })
}



import type { App } from '../types'


function isValidApp(value: unknown): value is App {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id           === 'string' &&
    typeof obj.name         === 'string' &&
    Array.isArray(obj.components) &&
    Array.isArray(obj.dataSources)
  )
}


export function exportApp(app: App): void {
  const json   = JSON.stringify(app, null, 2)
  const blob   = new Blob([json], { type: 'application/json' })
  const url    = URL.createObjectURL(blob)
  const slug   = app.name.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-') || 'app'
  const anchor = document.createElement('a')

  anchor.href     = url
  anchor.download = `${slug}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}


export async function importApp(file: File): Promise<App> {
  let text: string
  try {
    text = await file.text()
  } catch {
    throw new Error('Could not read file.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON.')
  }

  if (!isValidApp(parsed)) {
    throw new Error(
      'File does not contain a valid app. ' +
      'Make sure it was exported from this tool.',
    )
  }

  return { ...parsed, updatedAt: Date.now() }
}



const INDEX_KEY = 'itb:saves'
const APP_KEY   = (id: string) => `itb:app:${id}`
const MAX_SAVES = 20

export interface SaveMeta {
  id:             string
  name:           string
  savedAt:        number
  componentCount: number
}

function readIndex(): SaveMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    return raw ? (JSON.parse(raw) as SaveMeta[]) : []
  } catch {
    return []
  }
}

function writeIndex(index: SaveMeta[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch { }
}


export function saveApp(app: App): SaveMeta {
  const index = readIndex()
  const meta: SaveMeta = {
    id:             app.id,
    name:           app.name,
    savedAt:        Date.now(),
    componentCount: app.components.length,
  }

  const existingIdx = index.findIndex(m => m.id === app.id)
  if (existingIdx >= 0) {
    index[existingIdx] = meta              
  } else {
    index.unshift(meta)                    
    if (index.length > MAX_SAVES) index.pop()
  }

  writeIndex(index)

  try {
    localStorage.setItem(APP_KEY(app.id), JSON.stringify(app))
  } catch { }

  return meta
}

export function listSaves(): SaveMeta[] {
  return readIndex()
}

export function loadSave(id: string): App | null {
  try {
    const raw = localStorage.getItem(APP_KEY(id))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return isValidApp(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Remove snapshot from both index and localStorage. */
export function deleteSave(id: string): void {
  writeIndex(readIndex().filter(m => m.id !== id))
  try {
    localStorage.removeItem(APP_KEY(id))
  } catch { }
}
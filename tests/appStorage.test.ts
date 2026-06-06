import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { App } from '../src/types'
import {
  exportApp, importApp,
  saveApp, listSaves, loadSave, deleteSave,
} from '../src/services/appStorage'



let store: Record<string, string> = {}

beforeEach(() => {
  store = {}
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(k => store[k] ?? null)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { store[k] = v })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(k => { delete store[k] })
})

afterEach(() => vi.restoreAllMocks())



const mockApp: App = {
  id: 'app-abc-123', name: 'Test App',
  components: [{ id: 'c1', type: 'button', props: {}, events: {} }],
  dataSources: [],
  createdAt: 1000, updatedAt: 2000,
}



describe('importApp', () => {
  function makeFile(content: string, name = 'test.json') {
    return new File([new Blob([content])], name, { type: 'application/json' })
  }

  it('parses a valid app JSON file', async () => {
    const file   = makeFile(JSON.stringify(mockApp))
    const result = await importApp(file)
    expect(result.id).toBe(mockApp.id)
    expect(result.name).toBe('Test App')
    expect(result.components).toHaveLength(1)
  })

  it('updates updatedAt on import', async () => {
    const before = Date.now()
    const file   = makeFile(JSON.stringify(mockApp))
    const result = await importApp(file)
    expect(result.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('throws when the file is not valid JSON', async () => {
    const file = makeFile('this is not json')
    await expect(importApp(file)).rejects.toThrow(/not valid JSON/i)
  })

  it('throws when the JSON does not match the App shape', async () => {
    const file = makeFile(JSON.stringify({ foo: 'bar' }))
    await expect(importApp(file)).rejects.toThrow(/valid app/i)
  })

  it('throws when required fields are missing', async () => {
    const partial = { id: 'x', name: 'y' } 
    const file = makeFile(JSON.stringify(partial))
    await expect(importApp(file)).rejects.toThrow(/valid app/i)
  })
})



describe('exportApp', () => {
  it('creates an anchor and triggers a click', () => {
    const anchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement)
    vi.spyOn(document.body, 'appendChild').mockReturnValue(anchor as unknown as Node)
    vi.spyOn(document.body, 'removeChild').mockReturnValue(anchor as unknown as Node)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    exportApp(mockApp)

    expect(anchor.click).toHaveBeenCalled()
    expect(anchor.download).toBe('Test-App.json')
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('sanitises special characters in the filename', () => {
    const anchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLElement)
    vi.spyOn(document.body, 'appendChild').mockReturnValue(anchor as unknown as Node)
    vi.spyOn(document.body, 'removeChild').mockReturnValue(anchor as unknown as Node)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    exportApp({ ...mockApp, name: 'My App! (v2)' })

    expect(anchor.download).toBe('My-App--v2-.json')
  })
})



describe('saveApp', () => {
  it('stores the app and returns its metadata', () => {
    const meta = saveApp(mockApp)
    expect(meta.id).toBe(mockApp.id)
    expect(meta.name).toBe('Test App')
    expect(meta.componentCount).toBe(1)
  })

  it('written app can be retrieved with loadSave', () => {
    saveApp(mockApp)
    const loaded = loadSave(mockApp.id)
    expect(loaded).not.toBeNull()
    expect(loaded?.name).toBe('Test App')
  })

  it('appears in listSaves after saving', () => {
    saveApp(mockApp)
    const saves = listSaves()
    expect(saves).toHaveLength(1)
    expect(saves[0].id).toBe(mockApp.id)
  })

  it('updating an existing app replaces its entry in the index', () => {
    saveApp(mockApp)
    saveApp({ ...mockApp, name: 'Renamed App' })
    const saves = listSaves()
    expect(saves).toHaveLength(1)
    expect(saves[0].name).toBe('Renamed App')
  })

  it('new apps are prepended (newest first)', () => {
    const appA = { ...mockApp, id: 'a', name: 'App A' }
    const appB = { ...mockApp, id: 'b', name: 'App B' }
    saveApp(appA)
    saveApp(appB)
    const saves = listSaves()
    expect(saves[0].id).toBe('b')  
    expect(saves[1].id).toBe('a')
  })
})

describe('loadSave', () => {
  it('returns null for an unknown id', () => {
    expect(loadSave('does-not-exist')).toBeNull()
  })

  it('returns null when the stored value is corrupt', () => {
    store['itb:app:corrupt'] = 'not-json'
    expect(loadSave('corrupt')).toBeNull()
  })
})

describe('deleteSave', () => {
  it('removes the app from the save list', () => {
    saveApp(mockApp)
    deleteSave(mockApp.id)
    expect(listSaves()).toHaveLength(0)
  })

  it('removes the app data from localStorage', () => {
    saveApp(mockApp)
    deleteSave(mockApp.id)
    expect(loadSave(mockApp.id)).toBeNull()
  })

  it('is a no-op for an unknown id', () => {
    expect(() => deleteSave('ghost-id')).not.toThrow()
  })
})
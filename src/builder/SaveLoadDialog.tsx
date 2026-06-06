import { useState, useRef } from 'react'
import { X, Download, Upload, Trash2, FolderOpen, Clock, Layers } from 'lucide-react'
import type { App } from '../types'
import {
  listSaves, loadSave, deleteSave,
  exportApp, importApp, saveApp,
  type SaveMeta,
} from '../services/appStorage'

interface Props {
  currentApp: App
  onLoad:     (app: App) => void
  onClose:    () => void
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts))
}

export function SaveLoadDialog({ currentApp, onLoad, onClose }: Props) {
  const [saves,     setSaves]     = useState<SaveMeta[]>(() => listSaves())
  const [error,     setError]     = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => setSaves(listSaves())

  

  function handleSave() {
    setError(null)
    saveApp(currentApp)
    refresh()
  }

  function handleExport() {
    exportApp(currentApp)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError(null)
    try {
      const app = await importApp(file)
      onLoad(app)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleLoad(id: string) {
    setError(null)
    const app = loadSave(id)
    if (!app) {
      setError('Could not load that save — it may have been cleared from storage.')
      refresh()
      return
    }
    onLoad(app)
    onClose()
  }

  function handleDelete(id: string) {
    deleteSave(id)
    refresh()
  }

  

  return (
    <>
      
      <div
        className="fixed inset-0 bg-black/40 z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Save and load apps"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-lg bg-white rounded-xl shadow-xl
            flex flex-col max-h-[80vh] pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >

          
          <div className="flex items-center justify-between px-5 py-4
            border-b border-gray-200 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Apps</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Save, load, or transfer your apps
              </p>
            </div>
            <button
              aria-label="Close"
              onClick={onClose}
              className="p-1.5 rounded text-gray-400
                hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          
          <div className="flex items-center gap-2 px-5 py-3
            border-b border-gray-100 bg-gray-50 shrink-0">
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs font-medium text-white
                bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Save current app
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                text-gray-700 border border-gray-200 rounded
                hover:bg-gray-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export JSON
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                text-gray-700 border border-gray-200 rounded
                hover:bg-gray-100 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              {importing ? 'Importing…' : 'Import JSON'}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              aria-label="Import JSON file"
              className="sr-only"
            />
          </div>

          
          {error && (
            <p role="alert" className="mx-5 mt-3 px-3 py-2 text-xs text-red-700
              bg-red-50 border border-red-200 rounded shrink-0">
              {error}
            </p>
          )}

          
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {saves.length === 0 ? (
              <div className="flex flex-col items-center justify-center
                py-12 text-center">
                <FolderOpen className="w-8 h-8 text-gray-300 mb-2" aria-hidden="true" />
                <p className="text-sm text-gray-500">No saved apps yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click "Save current app" to create your first snapshot
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {saves.map(meta => (
                  <li
                    key={meta.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg
                      border border-gray-200 hover:border-gray-300
                      hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {meta.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {formatDate(meta.savedAt)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Layers className="w-3 h-3" aria-hidden="true" />
                          {meta.componentCount}{' '}
                          {meta.componentCount === 1 ? 'component' : 'components'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLoad(meta.id)}
                        className="px-2.5 py-1 text-xs font-medium
                          text-blue-700 bg-blue-50 rounded
                          hover:bg-blue-100 transition-colors"
                      >
                        Open
                      </button>
                      <button
                        aria-label={`Delete ${meta.name}`}
                        onClick={() => handleDelete(meta.id)}
                        className="p-1.5 rounded text-gray-400
                          hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          
          <div className="px-5 py-3 border-t border-gray-100 shrink-0">
            <p className="text-xs text-gray-400 text-center">
              Snapshots are stored in your browser.
              Use Export / Import to move apps between devices.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
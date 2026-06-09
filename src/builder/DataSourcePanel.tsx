import React from 'react'
import { Plus, Trash2, Play, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useBuilderStore } from '../store/builderStore'
import { dataSourceManager } from '../services/dataSourceManager'
import type { DataSource } from '../types'



type EditingDS = Omit<DataSource, 'id'> & { id?: string }

type TestState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success'; rows: unknown[]; ms: number }
  | { status: 'error'; message: string }



const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

const fieldClass =
  'w-full rounded-md border border-[var(--sh-b)] px-2.5 py-1.5 text-sm bg-[var(--sh)] ' +
  'focus:outline-none focus:border-[var(--ac)]/60 focus:ring-1 focus:ring-blue-400/30'

const labelClass = 'block text-xs font-medium text-[var(--sh-t)] mb-1'

const empty = (): EditingDS => ({
  name: '', type: 'rest', url: '', method: 'GET',
  headers: '', body: '', code: '', cacheTTL: 30_000,
})


interface SourceCardProps {
  source:   DataSource
  onEdit:   () => void
  onDelete: () => void
}

function SourceCard({ source, onEdit, onDelete }: SourceCardProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--sh-b)] bg-[var(--sh)] px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-800">{source.name}</p>
        <p className="text-xs uppercase text-[var(--sh-td)]">{source.type}</p>
      </div>
      <button
        aria-label={`Edit ${source.name}`}
        onClick={onEdit}
        className="rounded px-2 py-1 text-xs text-[var(--sh-t)] hover:bg-[var(--sh-b2)] transition-colors"
      >
        Edit
      </button>
      <button
        aria-label={`Delete ${source.name}`}
        onClick={onDelete}
        className="rounded p-1.5 text-[var(--sh-td)] hover:bg-red-50 hover:text-red-500 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}


interface SourceFormProps {
  editing:   EditingDS
  onChange:  (next: EditingDS) => void
  onSave:    () => void
  onCancel:  () => void
  onTest:    () => void
  testing:   boolean
  testState: TestState
}

function SourceForm({ editing, onChange, onSave, onCancel, onTest, testing, testState }: SourceFormProps) {
  const set = <K extends keyof EditingDS>(k: K, v: EditingDS[K]) => onChange({ ...editing, [k]: v })

  const canSave = editing.name.trim().length > 0 && (
    editing.type === 'rest'
      ? (editing.url?.trim().length ?? 0) > 0
      : (editing.code?.trim().length ?? 0) > 0
  )

  return (
    <div
      role="form"
      aria-label="Data source form"
      className="flex flex-col gap-3 border-t border-[var(--sh-b)] bg-[var(--sh-s)]/50 px-4 py-3"
    >
      <p className="text-xs font-semibold text-[var(--sh-t)] uppercase tracking-wider">
        {editing.id ? 'Edit source' : 'New source'}
      </p>

      {/* Name */}
      <div>
        <label className={labelClass}>Name</label>
        <input
          type="text"
          aria-label="Data source name"
          value={editing.name}
          placeholder="e.g. Users API"
          onChange={e => set('name', e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass}>Type</label>
        <select
          aria-label="Data source type"
          value={editing.type}
          onChange={e => set('type', e.target.value as DataSource['type'])}
          className={fieldClass}
        >
          <option value="rest">REST API</option>
          <option value="javascript">JavaScript</option>
        </select>
      </div>

      {editing.type === 'rest' && (
        <>
          <div>
            <label className={labelClass}>URL</label>
            <input
              type="text"
              aria-label="URL"
              value={editing.url ?? ''}
              placeholder="https://api.example.com/users"
              onChange={e => set('url', e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Method</label>
            <select
              aria-label="HTTP method"
              value={editing.method ?? 'GET'}
              onChange={e => set('method', e.target.value as DataSource['method'])}
              className={fieldClass}
            >
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Headers <span className="text-[var(--sh-td)]">(JSON)</span>
            </label>
            <textarea
              aria-label="HTTP headers"
              rows={2}
              spellCheck={false}
              value={editing.headers ?? ''}
              placeholder={'{"Authorization": "Bearer {{token}}"}'}
              onChange={e => set('headers', e.target.value)}
              className={clsx(fieldClass, 'resize-y font-mono')}
            />
          </div>
          {editing.method !== 'GET' && (
            <div>
              <label className={labelClass}>Body</label>
              <textarea
                aria-label="Request body"
                rows={3}
                spellCheck={false}
                value={editing.body ?? ''}
                placeholder='{"key": "{{value}}"}'
                onChange={e => set('body', e.target.value)}
                className={clsx(fieldClass, 'resize-y font-mono')}
              />
            </div>
          )}
        </>
      )}

      {editing.type === 'javascript' && (
        <div>
          <label className={labelClass}>
            Code <span className="text-[var(--sh-td)]">(return an array)</span>
          </label>
          <textarea
            aria-label="JavaScript code"
            rows={5}
            spellCheck={false}
            value={editing.code ?? ''}
            placeholder={'const res = await fetch("https://api.example.com/data")\nreturn res.json()'}
            onChange={e => set('code', e.target.value)}
            className={clsx(fieldClass, 'resize-y font-mono')}
          />
        </div>
      )}

      <div>
        <label className={labelClass}>Cache TTL <span className="text-[var(--sh-td)]">(ms)</span></label>
        <input
          type="number"
          aria-label="Cache TTL in milliseconds"
          value={editing.cacheTTL ?? 30_000}
          min={0}
          step={1000}
          onChange={e => set('cacheTTL', Number(e.target.value))}
          className={fieldClass}
        />
      </div>

      <div className="flex gap-2">
        <button
          aria-label="Save data source"
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {editing.id ? 'Update' : 'Add source'}
        </button>
        <button
          aria-label="Cancel"
          onClick={onCancel}
          className="flex-1 rounded-md border border-[var(--sh-b)] bg-[var(--sh)] px-3 py-1.5 text-sm font-medium text-[var(--sh-ts)] hover:bg-[var(--sh-s)] transition-colors"
        >
          Cancel
        </button>
      </div>

      <button
        aria-label="Test data source"
        onClick={onTest}
        disabled={!canSave || testing}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--sh-b)] px-3 py-1.5 text-sm font-medium text-[var(--sh-ts)] hover:bg-[var(--sh-s)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {testing
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Running…</>
          : <><Play className="h-3.5 w-3.5" />Test</>
        }
      </button>

      /* Test result */
      {testState.status === 'success' && (
        <div className="rounded-md border border-green-200 bg-green-50 overflow-hidden" role="status">
          <div className="flex items-center gap-1.5 border-b border-green-200 px-3 py-2 text-sm font-medium text-green-700">
            <CheckCircle className="h-4 w-4" />
            {testState.rows.length} row{testState.rows.length !== 1 ? 's' : ''} · {testState.ms}ms
          </div>
          <pre className="max-h-32 overflow-auto px-3 py-2 text-xs text-green-800">
            {JSON.stringify(testState.rows.slice(0, 3), null, 2)}
            {testState.rows.length > 3 && `\n… +${testState.rows.length - 3} more`}
          </pre>
        </div>
      )}

      {testState.status === 'error' && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5" role="alert">
          <div className="flex items-center gap-1.5 text-sm font-medium text-red-700">
            <XCircle className="h-4 w-4" />
            Error
          </div>
          <p className="mt-1 font-mono text-xs text-red-600">{testState.message}</p>
        </div>
      )}
    </div>
  )
}



export function DataSourcePanel() {
  const dataSources      = useBuilderStore(s => s.app.dataSources)
  const addDataSource    = useBuilderStore(s => s.addDataSource)
  const updateDataSource = useBuilderStore(s => s.updateDataSource)
  const removeDataSource = useBuilderStore(s => s.removeDataSource)

  const [editing,   setEditing]   = React.useState<EditingDS | null>(null)
  const [testState, setTestState] = React.useState<TestState>({ status: 'idle' })

  const openNew  = () => { setEditing(empty()); setTestState({ status: 'idle' }) }
  const openEdit = (ds: DataSource) => { setEditing({ ...ds }); setTestState({ status: 'idle' }) }
  const close    = () => { setEditing(null); setTestState({ status: 'idle' }) }

  const handleSave = () => {
    if (!editing) return
    if (editing.id) {
      updateDataSource(editing.id, editing)
    } else {
      addDataSource({ ...editing, id: crypto.randomUUID() } as DataSource)
    }
    close()
  }

  const handleTest = async () => {
    if (!editing) return
    const source = { ...editing, id: editing.id ?? '__preview__' } as DataSource
    setTestState({ status: 'running' })
    const t = Date.now()
    try {
      const rows = await dataSourceManager.execute(source, {})
      setTestState({ status: 'success', rows, ms: Date.now() - t })
    } catch (e) {
      setTestState({ status: 'error', message: (e as Error).message })
    }
  }

  return (
    <div
      aria-label="Data sources panel"
      className="flex flex-col rounded-lg border border-[var(--sh-b)] bg-[var(--sh)] overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-[var(--sh-b)] bg-[var(--sh-s)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--sh-ts)]">Data Sources</h2>
        <button
          aria-label="Add data source"
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        {dataSources.length === 0 && !editing && (
          <p className="py-4 text-center text-sm text-[var(--sh-td)]">No data sources yet.</p>
        )}
        {dataSources.map(ds => (
          <SourceCard
            key={ds.id}
            source={ds}
            onEdit={() => openEdit(ds)}
            onDelete={() => { removeDataSource(ds.id); if (editing?.id === ds.id) close() }}
          />
        ))}
      </div>

      {editing && (
        <SourceForm
          editing={editing}
          onChange={setEditing}
          onSave={handleSave}
          onCancel={close}
          onTest={handleTest}
          testing={testState.status === 'running'}
          testState={testState}
        />
      )}
    </div>
  )
}
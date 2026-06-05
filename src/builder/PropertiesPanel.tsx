import { useState, useCallback } from 'react'
import { Trash2, X, ChevronDown, ChevronRight, Database } from 'lucide-react'
import { clsx } from 'clsx'
import { useBuilderStore } from '../store/builderStore'
import { REGISTRY } from '../components/registry'


interface PropFieldProps {
  name:         string
  value:        unknown
  defaultValue: unknown
  onChange:     (v: unknown) => void
}

function toLabel(name: string): string {
  return name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
}

function PropField({ name, value, defaultValue, onChange }: PropFieldProps) {
  const label = toLabel(name)
  const ref = defaultValue

  
  if (typeof ref === 'boolean') {
    const checked = Boolean(value ?? defaultValue)
    return (
      <div className="flex items-center justify-between py-1.5">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <button
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={clsx(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer',
            checked ? 'bg-blue-600' : 'bg-gray-200',
          )}
        >
          <span className={clsx(
            'inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )} />
        </button>
      </div>
    )
  }

  
  if (typeof ref === 'number') {
    return (
      <div className="flex flex-col gap-1 py-1.5">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <input
          type="number"
          aria-label={label}
          value={value == null ? '' : Number(value)}
          placeholder={String(defaultValue ?? '')}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded
            focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
        />
      </div>
    )
  }

  
  if (Array.isArray(ref) || (typeof ref === 'object' && ref !== null)) {
    const display = typeof value === 'string'
      ? value
      : JSON.stringify(value ?? defaultValue, null, 2)
    return (
      <div className="flex flex-col gap-1 py-1.5">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <textarea
          aria-label={label}
          rows={3}
          spellCheck={false}
          value={display}
          onChange={e => {
            try   { onChange(JSON.parse(e.target.value)) }
            catch { onChange(e.target.value) }   // allow mid-edit invalid JSON
          }}
          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded font-mono
            resize-y focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
        />
      </div>
    )
  }

  
  return (
    <div className="flex flex-col gap-1 py-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type="text"
        aria-label={label}
        value={String(value ?? '')}
        placeholder={String(defaultValue ?? '')}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded
          focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
      />
    </div>
  )
}


interface SectionProps {
  title:        string
  defaultOpen?: boolean
  badge?:       number
  children:     React.ReactNode
}

function Section({ title, defaultOpen = true, badge, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-4 py-2.5
          hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </span>
          {badge != null && badge > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1
              text-xs font-medium bg-blue-100 text-blue-700 rounded-full tabular-nums">
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronDown  className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        }
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}



export function PropertiesPanel() {
  const app             = useBuilderStore(s => s.app)
  const selectedId      = useBuilderStore(s => s.selectedId)
  const updateComponent = useBuilderStore(s => s.updateComponent)
  const removeComponent = useBuilderStore(s => s.removeComponent)
  const selectComponent = useBuilderStore(s => s.selectComponent)

  const component  = app.components.find(c => c.id === selectedId) ?? null
  const definition = component ? (REGISTRY[component.type] ?? null) : null

  const setProp = useCallback((name: string, val: unknown) => {
    if (!component) return
    updateComponent(component.id, { props: { ...component.props, [name]: val } })
  }, [component, updateComponent])

  const setEvent = useCallback((eventName: string, expr: string) => {
    if (!component) return
    updateComponent(component.id, { events: { ...component.events, [eventName]: expr } })
  }, [component, updateComponent])

  const setDataSource = useCallback((dsId: string) => {
    if (!component) return
    updateComponent(component.id, { dataSourceId: dsId || undefined })
  }, [component, updateComponent])

  const handleDelete = useCallback(() => {
    if (!component) return
    removeComponent(component.id)
    selectComponent(null)
  }, [component, removeComponent, selectComponent])

  
  if (!component || !definition) {
    return (
      <aside
        aria-label="Properties panel"
        className="w-64 shrink-0 flex flex-col items-center justify-center
          bg-gray-50 border-l border-gray-200 h-full"
      >
        <p className="text-sm text-gray-400">Select a component</p>
      </aside>
    )
  }

  const propEntries  = Object.entries(definition.defaultProps)
  const eventEntries = Object.entries(component.events)
  const filledEvents = eventEntries.filter(([, expr]) => expr.trim() !== '').length
  const activeDs     = app.dataSources.find(ds => ds.id === component.dataSourceId)

  
  return (
    <aside
      aria-label="Properties panel"
      className="w-64 shrink-0 flex flex-col bg-white border-l border-gray-200
        h-full overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200
        bg-gray-50 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{definition.label}</p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{component.id.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            aria-label="Delete component"
            onClick={handleDelete}
            className="p-1.5 rounded text-gray-400
              hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            aria-label="Deselect"
            onClick={() => selectComponent(null)}
            className="p-1.5 rounded text-gray-400
              hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Props */}
      <Section title="Props" defaultOpen badge={propEntries.length}>
        {propEntries.map(([name, defaultValue]) => (
          <PropField
            key={name}
            name={name}
            value={component.props[name]}
            defaultValue={defaultValue}
            onChange={v => setProp(name, v)}
          />
        ))}
      </Section>

      {/* Events — only shown when the component has events */}
      {eventEntries.length > 0 && (
        <Section title="Events" defaultOpen={false} badge={filledEvents}>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            JS expression run when the event fires.{' '}
            Use <code className="bg-gray-100 px-1 rounded font-mono">{'{{state.key}}'}</code>{' '}
            to read app state.
          </p>
          {eventEntries.map(([name, expr]) => {
            const handlerLabel = `on${name.charAt(0).toUpperCase()}${name.slice(1)}`
            return (
              <div key={name} className="flex flex-col gap-1 py-1.5">
                <label className="text-xs font-medium text-gray-600">{handlerLabel}</label>
                <textarea
                  aria-label={`${handlerLabel} expression`}
                  rows={2}
                  spellCheck={false}
                  value={expr}
                  placeholder="// expression"
                  onChange={e => setEvent(name, e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded font-mono
                    resize-y focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                />
              </div>
            )
          })}
        </Section>
      )}

      {/* Data source */}
      <Section title="Data source" defaultOpen={false}>
        {app.dataSources.length === 0 ? (
          <p className="text-xs text-gray-400">
            No data sources yet — add one in the Data Sources panel.
          </p>
        ) : (
          <div className="flex flex-col gap-1 py-1.5">
            <label className="text-xs font-medium text-gray-600">Attached source</label>
            <div className="relative">
              <Database className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                text-gray-400 pointer-events-none" />
              <select
                aria-label="Attached source"
                value={component.dataSourceId ?? ''}
                onChange={e => setDataSource(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded
                  appearance-none bg-white
                  focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
              >
                <option value="">None</option>
                {app.dataSources.map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            </div>
            {activeDs && (
              <p className="text-xs text-gray-400 mt-1">
                Type:{' '}
                <span className="font-medium text-gray-600">{activeDs.type.toUpperCase()}</span>
              </p>
            )}
          </div>
        )}
      </Section>
    </aside>
  )
}
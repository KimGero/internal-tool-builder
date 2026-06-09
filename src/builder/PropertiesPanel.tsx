import { useState, useCallback } from 'react'
import { Trash2, X, ChevronDown, ChevronRight, Database } from 'lucide-react'
import { clsx } from 'clsx'
import { useBuilderStore } from '../store/builderStore'
import { REGISTRY } from '../components/registry'



const inputBaseClass =
  'w-full px-2 py-1.5 text-xs rounded ' +
  'bg-[var(--sh-s)] border border-[var(--sh-b)] ' +
  'text-[var(--sh-ts)] placeholder:text-[var(--sh-td)] ' +
  'focus:outline-none focus:border-[var(--ac)]/60 ' +
  'focus:ring-1 focus:ring-[var(--ac)]/30 transition-colors'

const monoBaseClass = `${inputBaseClass} font-mono`

const textareaBaseClass = `${monoBaseClass} resize-y min-h-[60px]`

const selectBaseClass =
  `${inputBaseClass} appearance-none ` +
  'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%2384849a\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")] ' +
  'bg-[length:1rem] bg-[right:0.5rem_center] bg-no-repeat pr-7 ' +
  '[&_option]:bg-[var(--sh)] [&_option]:text-[var(--sh-ts)]'



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
        <label className="text-xs font-medium text-[var(--sh-t)]">{label}</label>
        <button
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={clsx(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer',
            checked ? 'bg-[var(--ac)]' : 'bg-[var(--sh-b2)]',
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
        <label className="text-xs font-medium text-[var(--sh-t)]">{label}</label>
        <input
          type="number"
          aria-label={label}
          value={value == null ? '' : Number(value)}
          placeholder={String(defaultValue ?? '')}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className={inputBaseClass}
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
        <label className="text-xs font-medium text-[var(--sh-t)]">{label}</label>
        <textarea
          aria-label={label}
          rows={3}
          spellCheck={false}
          value={display}
          onChange={e => {
            try   { onChange(JSON.parse(e.target.value)) }
            catch { onChange(e.target.value) }
          }}
          className={textareaBaseClass}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 py-1.5">
      <label className="text-xs font-medium text-[var(--sh-t)]">{label}</label>
      <input
        type="text"
        aria-label={label}
        value={String(value ?? '')}
        placeholder={String(defaultValue ?? '')}
        onChange={e => onChange(e.target.value)}
        className={inputBaseClass}
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
    <div className="border-b border-[var(--sh-b)] last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-4 py-2.5
          hover:bg-[var(--sh-s)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--sh-t)] uppercase tracking-wider">
            {title}
          </span>
          {badge != null && badge > 0 && (
            <span className={clsx(
              'inline-flex items-center justify-center h-4 min-w-[16px] px-1',
              'text-xs font-medium rounded-full tabular-nums',
              'bg-[var(--ac-bg)] text-[var(--ac-t)]'
            )}>
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronDown  className="w-3.5 h-3.5 text-[var(--sh-td)]" />
          : <ChevronRight className="w-3.5 h-3.5 text-[var(--sh-td)]" />
        }
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}



export function PropertiesPanel() {
  const updateComponent = useBuilderStore(s => s.updateComponent)
  const app             = useBuilderStore(s => s.app)
  const selectedId      = useBuilderStore(s => s.selectedId)
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
          bg-[var(--sh)] border-l border-[var(--sh-b)] h-full"
      >
        <p className="text-sm text-[var(--sh-td)]">Select a component</p>
      </aside>
    )
  }

  const propEntries  = Object.entries(definition.defaultProps)
  const eventEntries = Object.entries(component.events)
  const filledEvents = eventEntries.filter(([, expr]) => expr.trim() !== '').length
  const activeDs     = app.dataSources.find(ds => ds.id === component.dataSourceId)

  // Main panel
  return (
    <aside
      aria-label="Properties panel"
      className="w-64 shrink-0 flex flex-col bg-[var(--sh)] border-l border-[var(--sh-b)]
        h-full overflow-y-auto"
    >
      /* Header */
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sh-b)]
        bg-[var(--sh-s)] shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--sh-ts)]">{definition.label}</p>
          <p className="text-xs text-[var(--sh-td)] font-mono mt-0.5">{component.id.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            aria-label="Delete component"
            onClick={handleDelete}
            className="p-1.5 rounded text-[var(--sh-td)]
              hover:bg-[var(--err-bg)] hover:text-[var(--err)] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            aria-label="Deselect"
            onClick={() => selectComponent(null)}
            className="p-1.5 rounded text-[var(--sh-td)]
              hover:bg-[var(--sh-b2)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Props Section */}
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

      /* Events Section (shown when component has events) */
      {eventEntries.length > 0 && (
        <Section title="Events" defaultOpen={false} badge={filledEvents}>
          <p className="text-xs text-[var(--sh-td)] mb-3 leading-relaxed">
            JS expression run when the event fires.
            Use <code className="bg-[var(--sh-b2)] px-1 rounded font-mono text-[var(--ac-t)]">
              {'{{state.key}}'}
            </code>
            to read app state.
          </p>
          {eventEntries.map(([name, expr]) => {
            const handlerLabel = `on${name.charAt(0).toUpperCase()}${name.slice(1)}`
            return (
              <div key={name} className="flex flex-col gap-1 py-1.5">
                <label className="text-xs font-medium text-[var(--sh-t)]">{handlerLabel}</label>
                <textarea
                  aria-label={`${handlerLabel} expression`}
                  rows={2}
                  spellCheck={false}
                  value={expr}
                  placeholder="// expression"
                  onChange={e => setEvent(name, e.target.value)}
                  className={textareaBaseClass}
                />
              </div>
            )
          })}
        </Section>
      )}

      {/* Data Source Section */}
      <Section title="Data source" defaultOpen={false}>
        {app.dataSources.length === 0 ? (
          <p className="text-xs text-[var(--sh-td)]">
            No data sources yet â€” add one in the Data Sources panel.
          </p>
        ) : (
          <div className="flex flex-col gap-1 py-1.5">
            <label className="text-xs font-medium text-[var(--sh-t)]">Attached source</label>
            <div className="relative">
              <Database className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--sh-td)] pointer-events-none z-10" />
              <select
                aria-label="Attached source"
                value={component.dataSourceId ?? ''}
                onChange={e => setDataSource(e.target.value)}
                className={selectBaseClass}
              >
                <option value="">None</option>
                {app.dataSources.map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            </div>
            {activeDs && (
              <p className="text-xs text-[var(--sh-td)] mt-1">
                Type:{' '}
                <span className="font-medium text-[var(--sh-t)]">{activeDs.type.toUpperCase()}</span>
              </p>
            )}
          </div>
        )}
      </Section>
    </aside>
  )
}

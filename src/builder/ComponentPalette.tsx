import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search } from 'lucide-react'
import { clsx } from 'clsx'
import {
  MousePointerClick, TextCursorInput, Table2, ClipboardList,
  BarChart2, CalendarDays, Kanban, Calendar, LayoutTemplate,
  type LucideIcon,
} from 'lucide-react'
import { REGISTRY, type RegistryEntry } from '../components/registry'
import { useBuilderStore } from '../store/builderStore'

const ICON_MAP: Record<string, LucideIcon> = {
  MousePointerClick,
  TextCursorInput,
  Table2,
  ClipboardList,
  BarChart2,
  CalendarDays,
  Kanban,
  Calendar,
  LayoutTemplate,
}

const CATEGORIES: Record<string, string[]> = {
  Basic:          ['button', 'input', 'datepicker'],
  'Data display': ['table', 'chart', 'kanban', 'calendar'],
  Layout:         ['container', 'form'],
}

function PaletteTile({ entry }: { entry: RegistryEntry }) {
  const addComponent = useBuilderStore(s => s.addComponent)
  const Icon = ICON_MAP[entry.icon]

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `palette:${entry.type}`,
    data: { source: 'palette', componentType: entry.type },
  })

  const handleClick = () => {
    const c = {
      id:           crypto.randomUUID(),
      type:         entry.type,
      props:        { ...entry.defaultProps },
      events:       { ...(entry.defaultEvents ?? {}) },
      dataSourceId: undefined,
    }
    addComponent(c)
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      title={entry.label}
      className={clsx(
        'flex flex-col items-center gap-2 p-3 rounded-lg',
        'bg-[var(--sh-s)] border border-[var(--sh-b)]',
        'cursor-grab select-none transition-all group',
        'hover:border-[var(--ac)] hover:bg-[var(--ac-bg)]',
        isDragging && 'opacity-30 cursor-grabbing scale-95',
      )}
    >
      <div className="p-2 rounded-md bg-[var(--sh-b)] group-hover:bg-[var(--ac-bg)] transition-colors">
        {Icon
          ? <Icon className="w-4 h-4 text-[var(--sh-t)] group-hover:text-[var(--ac-t)] transition-colors" aria-hidden />
          : <span className="w-4 h-4 block rounded bg-[var(--sh-b2)]" />
        }
      </div>
      <span className="text-[10px] font-medium leading-none text-[var(--sh-t)] group-hover:text-[var(--ac-t)] transition-colors">
        {entry.label}
      </span>
    </div>
  )
}

export function ComponentPalette() {
  const [search,    setSearch]    = React.useState('')
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())

  const toggleCat = (cat: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })

  const entriesFor = (types: string[]): RegistryEntry[] => {
    const q = search.trim().toLowerCase()
    return types
      .filter(t => REGISTRY[t])
      .filter(t => !q || REGISTRY[t].label.toLowerCase().includes(q))
      .map(t => REGISTRY[t])
  }

  return (
    <aside
      aria-label="Component palette"
      className="w-56 shrink-0 flex flex-col bg-[var(--sh)] border-r border-[var(--sh-b)] h-full"
    >
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--sh-td)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search components"
            className="w-full pl-7 pr-3 py-1.5 text-xs
              bg-[var(--sh-s)] border border-[var(--sh-b)] rounded-md
              text-[var(--sh-ts)] placeholder:text-[var(--sh-td)]
              focus:outline-none focus:border-[var(--ac)]/50
              focus:ring-1 focus:ring-[var(--ac)]/20 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-shell px-3 pb-3 space-y-3">
        {Object.entries(CATEGORIES).map(([cat, types]) => {
          const entries     = entriesFor(types)
          const isCollapsed = collapsed.has(cat)
          if (entries.length === 0) return null

          return (
            <div key={cat}>
              <button
                onClick={() => toggleCat(cat)}
                className="flex items-center justify-between w-full mb-2"
              >
                <span className="text-[10px] font-semibold text-[var(--sh-td)] uppercase tracking-[0.12em]">
                  {cat}
                </span>
                <span className={clsx(
                  'text-[var(--sh-td)] text-xs leading-none transition-transform duration-150',
                  !isCollapsed && 'rotate-90',
                )}>
                  ›
                </span>
              </button>

              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-1.5">
                  {entries.map(e => <PaletteTile key={e.type} entry={e} />)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-3 py-2.5 border-t border-[var(--sh-b)] shrink-0">
        <p className="text-[10px] text-[var(--sh-td)] text-center leading-relaxed">
          Drag to canvas · Click to add
        </p>
      </div>
    </aside>
  )
}







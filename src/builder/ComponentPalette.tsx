import { useDraggable } from '@dnd-kit/core'
import { clsx } from 'clsx'
import {
  MousePointerClick, TextCursorInput, Table2, ClipboardList,
  BarChart2, CalendarDays, Kanban, Calendar, LayoutTemplate,
  GripVertical, type LucideIcon,
} from 'lucide-react'
import { getComponentList, type RegistryEntry } from '../components/registry'
import { useBuilderStore } from '../store/builderStore'
import type { AppComponent } from '../types'


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

function PaletteIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name]
  return Icon
    ? <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
    : <span className="w-4 h-4 shrink-0 rounded bg-gray-300" aria-hidden="true" />
}

function PaletteTile({ entry }: { entry: RegistryEntry }) {
  const addComponent = useBuilderStore(s => s.addComponent)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${entry.type}`,
    data: { source: 'palette', componentType: entry.type },
  })

  const handleClick = () => {
    const newComponent = makeComponent(entry)
    addComponent(newComponent)
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-md',
        'bg-white border border-gray-200 cursor-grab select-none',
        'hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors',
        'text-gray-700 text-sm',
        isDragging && 'opacity-40 cursor-grabbing',
      )}
    >
      <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" aria-hidden="true" />
      <PaletteIcon name={entry.icon} />
      <span className="font-medium">{entry.label}</span>
    </div>
  )
}

function makeComponent(entry: RegistryEntry): AppComponent {
  return {
    id:           crypto.randomUUID(),
    type:         entry.type,
    props:        { ...entry.defaultProps },
    events:       { ...(entry.defaultEvents ?? {}) },
    dataSourceId: undefined,
  }
}

export function ComponentPalette() {
  const components = getComponentList()

  return (
    <aside
      aria-label="Component palette"
      className="w-56 shrink-0 flex flex-col bg-gray-50 border-r border-gray-200 h-full overflow-y-auto"
    >
      <div className="px-3 py-3 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Components
        </p>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        {components.map(entry => (
          <PaletteTile key={entry.type} entry={entry} />
        ))}
      </div>

      <div className="mt-auto px-3 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          Drag to canvas or click to add
        </p>
      </div>
    </aside>
  )
}
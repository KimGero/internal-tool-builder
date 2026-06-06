import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type Active,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Layout, Database, Eye, Save, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { useBuilderStore }      from './store/builderStore'
import { REGISTRY }             from './components/registry'
import { runtimeState }         from './core/stateManager'
import { ComponentPalette }     from './builder/ComponentPalette'
import { DragOverlayContent }   from './builder/DragOverlayContent'
import { PropertiesPanel }      from './builder/PropertiesPanel'
import { Canvas }               from './builder/Canvas'
import { DataSourcePanel }      from './builder/DataSourcePanel'
import type { AppComponent } from './types'
import type { RegistryEntry }   from './components/registry'
import { FolderOpen }       from 'lucide-react'
import { SaveLoadDialog }   from './builder/SaveLoadDialog'
import { saveApp as persistApp } from './services/appStorage'
import type { App }         from './types'


type Mode = 'design' | 'data' | 'preview'

const MODES: { id: Mode; label: string; Icon: React.ElementType }[] = [
  { id: 'design',  label: 'Design',  Icon: Layout   },
  { id: 'data',    label: 'Data',    Icon: Database  },
  { id: 'preview', label: 'Preview', Icon: Eye       },
]

function makeComponent(entry: RegistryEntry): AppComponent {
  return {
    id:           crypto.randomUUID(),
    type:         entry.type,
    props:        { ...entry.defaultProps },
    events:       { ...(entry.defaultEvents ?? {}) },
    dataSourceId: undefined,
  }
}

export default function App() {
  const [mode,       setMode]   = useState<Mode>('design')
  const [activeItem, setActive] = useState<Active | null>(null)

  const appName           = useBuilderStore(s => s.app.name)
  const components        = useBuilderStore(s => s.app.components)
  const isDirty           = useBuilderStore(s => s.isDirty)
  const setName           = useBuilderStore(s => s.setName)
  const newApp            = useBuilderStore(s => s.newApp)
  const addComponent      = useBuilderStore(s => s.addComponent)
  const reorderComponents = useBuilderStore(s => s.reorderComponents)
  const markClean         = useBuilderStore(s => s.markClean)
  const app     = useBuilderStore(s => s.app)
  const loadApp = useBuilderStore(s => s.loadApp)

  const [showApps, setShowApps] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActive(event.active)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActive(null)
    const { active, over } = event
    if (!over) return

    const source = active.data.current?.source as string | undefined

    if (source === 'palette') {
      const entry = REGISTRY[active.data.current?.componentType as string]
      if (entry) addComponent(makeComponent(entry))
      return
    }

    if (source === 'canvas' && active.id !== over.id) {
      const oldIdx = components.findIndex(c => c.id === active.id)
      const newIdx = components.findIndex(c => c.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        reorderComponents(arrayMove(components, oldIdx, newIdx))
      }
    }
  }, [components, addComponent, reorderComponents])

  const handleSave = useCallback(() => {
    persistApp(app)
    markClean()
  }, [app, markClean])

  const handleLoadApp = useCallback((loaded: App) => {
  loadApp(loaded)           
  runtimeState.reset()      
  setMode('design')         
  }, [loadApp])

  

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved changes and start a new app?')) return
    newApp()
    runtimeState.reset()
    setMode('design')
  }, [isDirty, newApp])

  const isDesignMode = mode === 'design'
  const isPreviewMode = mode === 'preview'

  {showApps && (
  <SaveLoadDialog
    currentApp={app}
    onLoad={handleLoadApp}
    onClose={() => setShowApps(false)}
    />
  )}

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        <header className="flex items-center gap-3 px-4 h-12 bg-white border-b border-gray-200 shrink-0 z-10">
          <input
            aria-label="App name"
            value={appName}
            onChange={e => setName(e.target.value)}
            className="w-44 px-2 py-1 text-sm font-medium text-gray-900 rounded
              border border-transparent hover:border-gray-200
              focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30
              bg-transparent"
          />

          <nav
            aria-label="Builder mode"
            className="flex items-center gap-0.5 ml-2 bg-gray-100 rounded-md p-0.5"
          >
            {MODES.map(({ id, label, Icon }) => (
              <button
                key={id}
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium',
                  'transition-colors',
                  mode === id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex-1" />

          {isDirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              Save
            </button>
          )}

          <button
              aria-label="Open apps"
              onClick={() => setShowApps(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                text-gray-600 border border-gray-200 rounded
                hover:bg-gray-50 transition-colors"
                >
            <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
              Apps
          </button>

          <button
            aria-label="New app"
            onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
              text-gray-600 border border-gray-200 rounded
              hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          {isDesignMode && <ComponentPalette />}

          {/* Main content area */}
          {mode === 'data' ? (
            <main className="flex-1 overflow-y-auto bg-white">
              <DataSourcePanel />
            </main>
          ) : (
            <main className="flex-1 overflow-hidden">
              <Canvas previewMode={isPreviewMode} />
            </main>
          )}

          {/* Right sidebar */}
          {isDesignMode && <PropertiesPanel />}
        </div>

        <DragOverlay>
          <DragOverlayContent active={activeItem} />
        </DragOverlay>
      </div>
    </DndContext>
  )
}

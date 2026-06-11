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
import { Layout, Database, Eye, Save, Plus, FolderOpen, Undo2, Redo2 } from 'lucide-react'
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
import { SaveLoadDialog }   from './builder/SaveLoadDialog'
import { saveApp as persistApp } from './services/appStorage'
import type { App }         from './types'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts' 
import { ToastContainer } from './components/ui/Toast'

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
  const [showApps, setShowApps] = useState(false)

  // Store selectors
  const appName           = useBuilderStore(s => s.app.name)
  const components        = useBuilderStore(s => s.app.components)
  const isDirty           = useBuilderStore(s => s.isDirty)
  const setName           = useBuilderStore(s => s.setName)
  const newApp            = useBuilderStore(s => s.newApp)
  const addComponent      = useBuilderStore(s => s.addComponent)
  const reorderComponents = useBuilderStore(s => s.reorderComponents)
  const markClean         = useBuilderStore(s => s.markClean)
  const app               = useBuilderStore(s => s.app)
  const loadApp           = useBuilderStore(s => s.loadApp)
  const selectedId        = useBuilderStore(s => s.selectedId)
  const removeComponent   = useBuilderStore(s => s.removeComponent)
  const selectComponent   = useBuilderStore(s => s.selectComponent)
  const duplicateComponent= useBuilderStore(s => s.duplicateComponent)
  const undo              = useBuilderStore(s => s.undo)
  const redo              = useBuilderStore(s => s.redo)
  const canUndo           = useBuilderStore(s => s.past.length > 0)
  const canRedo           = useBuilderStore(s => s.future.length > 0)
  
  // Toast selector
  const addToast = useBuilderStore(s => s.addToast)

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
      if (entry) {
        addComponent(makeComponent(entry))
        addToast(`Added ${entry.label}`, 'success')
      }
      return
    }

    if (source === 'canvas' && active.id !== over.id) {
      const oldIdx = components.findIndex(c => c.id === active.id)
      const newIdx = components.findIndex(c => c.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        reorderComponents(arrayMove(components, oldIdx, newIdx))
      }
    }
  }, [components, addComponent, reorderComponents, addToast])

  const handleSave = useCallback(() => {
    persistApp(app)
    markClean()
    addToast(`"${app.name}" saved`, 'success')
  }, [app, markClean, addToast])

  const handleLoadApp = useCallback((loaded: App) => {
    loadApp(loaded)           
    runtimeState.reset()      
    setMode('design')
    addToast(`Loaded "${loaded.name}"`, 'info')
    setShowApps(false)
  }, [loadApp, addToast])

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved changes and start a new app?')) return
    newApp()
    runtimeState.reset()
    setMode('design')
    addToast('New app created', 'info')
  }, [isDirty, newApp, addToast])

  const handleDelete = useCallback(() => {
    if (!selectedId) return
    removeComponent(selectedId)
    addToast('Component deleted', 'info')
  }, [selectedId, removeComponent, addToast])

  const handleEscape = useCallback(() => {
    selectComponent(null)
  }, [selectComponent])

  const handleDuplicate = useCallback(() => {
    if (!selectedId) return
    duplicateComponent(selectedId)
    addToast('Component duplicated', 'success')
  }, [selectedId, duplicateComponent, addToast])

  const handleUndo = useCallback(() => {
    undo()
    addToast('Undo', 'info')
  }, [undo, addToast])

  const handleRedo = useCallback(() => {
    redo()
    addToast('Redo', 'info')
  }, [redo, addToast])

  const isDesignMode = mode === 'design'
  const isPreviewMode = mode === 'preview'

  useKeyboardShortcuts({
    onDelete:    handleDelete,
    onEscape:    handleEscape,
    onUndo:      handleUndo,
    onRedo:      handleRedo,
    onSave:      handleSave,
    onDuplicate: handleDuplicate,
  })  

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        <header className="flex items-center gap-3 px-4 h-11 bg-[var(--sh)] border-b border-[var(--sh-b)] shrink-0 z-10">

          {/* Wordmark */}
          <span className="text-[var(--sh-ts)] font-semibold text-sm tracking-tight shrink-0 select-none">
            itb<span className="text-[var(--ac)]">.</span>
          </span>
          <div className="w-px h-4 bg-[var(--sh-b2)]" aria-hidden />

          {/* App name */}
          <input
            aria-label="App name"
            value={appName}
            onChange={e => setName(e.target.value)}
            className="w-40 px-2 py-1 text-sm font-medium text-[var(--sh-ts)]
              rounded border border-transparent
              hover:border-[var(--sh-b)] focus:border-[var(--ac)]/60
              focus:outline-none focus:ring-1 focus:ring-[var(--ac)]/20
              bg-transparent placeholder:text-[var(--sh-td)] transition-colors"
          />

          {/* Mode switcher */}
          <nav aria-label="Builder mode" className="flex items-center gap-0.5 bg-[var(--sh-s)] rounded-md p-0.5 ml-1">
            {MODES.map(({ id, label, Icon }) => (
              <button
                key={id}
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                  mode === id
                    ? 'bg-[var(--sh-b2)] text-[var(--sh-ts)]'
                    : 'text-[var(--sh-t)] hover:text-[var(--sh-ts)]',
                )}
              >
                <Icon className="w-3 h-3" aria-hidden />
                {label}
              </button>
            ))}
          </nav>

          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-0.5 ml-2">
            <button
              aria-label="Undo"
              title="Ctrl+Z"
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1.5 rounded text-[var(--sh-t)] transition-colors
                hover:bg-[var(--sh-b2)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              aria-label="Redo"
              title="Ctrl+Y"
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1.5 rounded text-[var(--sh-t)] transition-colors
                hover:bg-[var(--sh-b2)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1" />

          {isDirty && (
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium
                text-[var(--ac-t)] bg-[var(--ac-bg)] rounded
                hover:bg-[rgba(59,130,246,0.16)] transition-colors">
              <Save className="w-3 h-3" aria-hidden />
              Save
            </button>
          )}

          <button aria-label="Open apps" onClick={() => setShowApps(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium
              text-[var(--sh-t)] border border-[var(--sh-b)] rounded
              hover:text-[var(--sh-ts)] hover:border-[var(--sh-b2)] transition-colors">
            <FolderOpen className="w-3 h-3" aria-hidden />
            Apps
          </button>

          <button aria-label="New app" onClick={handleNew}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium
              text-[var(--sh-t)] border border-[var(--sh-b)] rounded
              hover:text-[var(--sh-ts)] hover:border-[var(--sh-b2)] transition-colors">
            <Plus className="w-3 h-3" aria-hidden />
            New
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          {isDesignMode && <ComponentPalette />}

          {/* Main content area */}
          {mode === 'data' ? (
            <main className="flex-1 overflow-y-auto bg-[var(--sh)]">
              <DataSourcePanel />
            </main>
          ) : (
            <main className="flex-1 overflow-hidden flex flex-col">
              <Canvas previewMode={isPreviewMode} />
            </main>
          )}

          {/* Right sidebar */}
          {isDesignMode && <PropertiesPanel />}
        </div>

        {/* Save/Load Dialog */}
        {showApps && (
          <SaveLoadDialog
            currentApp={app}
            onLoad={handleLoadApp}
            onClose={() => setShowApps(false)}
          />
        )}

        {/* Drag Overlay */}
        <DragOverlay>
          <DragOverlayContent active={activeItem} />
        </DragOverlay>

        {/* Toast Container */}
        <ToastContainer />
      </div>
    </DndContext>
  )
}

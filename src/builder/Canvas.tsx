import React from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable,
  type Active, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'

import { ComponentPalette } from './ComponentPalette'
import { PropertiesPanel } from './PropertiesPanel'
import { DragOverlayContent } from './DragOverlayContent'
import { useBuilderStore } from '../store/builderStore'
import { REGISTRY } from '../components/registry'
import { dataSourceManager } from '../services/dataSourceManager'
import { runtimeState } from '../core/stateManager'
import { eventBus } from '../core/eventBus'
import { ExpressionEngine } from '../core/expressionEngine'
import type { AppComponent, DataSource, Runtime } from '../types'



interface SortableWidgetProps {
  component:  AppComponent
  runtime:    Runtime
  data?:      unknown[]
  isSelected: boolean
  onSelect:   () => void
  onDelete:   () => void
}

function SortableWidget({ component, runtime, data, isSelected, onSelect, onDelete }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id:   component.id,
    data: { source: 'canvas', componentId: component.id },
  })

  const entry = REGISTRY[component.type]

  const handleEvent = (eventName: string, eventData?: unknown) => {
    const expr = component.events[eventName]
    if (!expr?.trim()) return
    ExpressionEngine.evaluateRaw(expr, {
      ...runtime.state,
      ...(typeof eventData === 'object' && eventData !== null
        ? (eventData as Record<string, unknown>)
        : {}),
      setState: runtime.setState,
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={e => { e.stopPropagation(); onSelect() }}
      className={clsx(
        'relative group rounded-lg transition-all',
        isDragging && 'opacity-40',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2',
      )}
    >
      {/* Toolbar — visible on hover or while selected */}
      <div className={clsx(
        'absolute -top-3 right-2 z-10 flex items-center gap-1 transition-opacity',
        'opacity-0 group-hover:opacity-100',
        isSelected && 'opacity-100',
      )}>
        <span
          {...attributes}
          {...listeners}
          role="button"
          aria-label="Drag to reorder"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded bg-gray-600 text-white hover:bg-gray-700 active:cursor-grabbing"
        >
          <GripVertical className="h-3 w-3" />
        </span>
        <button
          aria-label={`Delete ${entry?.label ?? component.type}`}
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="flex h-6 w-6 items-center justify-center rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {entry ? (
        <entry.Widget component={component} runtime={runtime} data={data} onEvent={handleEvent} />
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Unknown component: <code className="font-mono">{component.type}</code>
        </div>
      )}
    </div>
  )
}


interface DroppableCenterProps {
  components: AppComponent[]
  runtime:    Runtime
  sourceData: Record<string, unknown[]>
  selectedId: string | null
  onSelect:   (id: string | null) => void
  onDelete:   (id: string) => void
}

function DroppableCenter({ components, runtime, sourceData, selectedId, onSelect, onDelete }: DroppableCenterProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-droppable' })

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSelect(null)}
      className={clsx(
        'flex-1 min-h-0 overflow-y-auto p-6 transition-colors',
        isOver && 'bg-blue-50/40',
      )}
    >
      <SortableContext items={components.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {components.length === 0 ? (
            <div
              className={clsx(
                'flex min-h-[420px] flex-col items-center justify-center',
                'rounded-xl border-2 border-dashed transition-colors',
                isOver ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 bg-white/60',
              )}
            >
              <p className={clsx('text-sm font-medium', isOver ? 'text-blue-600' : 'text-gray-400')}>
                {isOver ? 'Drop to add' : 'Drag from the palette to start building'}
              </p>
              <p className="mt-1 text-xs text-gray-300">Or click a component tile to add it</p>
            </div>
          ) : (
            components.map(c => (
              <SortableWidget
                key={c.id}
                component={c}
                runtime={runtime}
                data={c.dataSourceId ? sourceData[c.dataSourceId] : undefined}
                isSelected={c.id === selectedId}
                onSelect={() => onSelect(c.id)}
                onDelete={() => onDelete(c.id)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}


function makeComponent(entry: (typeof REGISTRY)[string]): AppComponent {
  return {
    id:           crypto.randomUUID(),
    type:         entry.type,
    props:        { ...entry.defaultProps },
    events:       { ...(entry.defaultEvents ?? {}) },
    dataSourceId: undefined,
  }
}

export function Canvas() {
  const app               = useBuilderStore(s => s.app)
  const selectedId        = useBuilderStore(s => s.selectedId)
  const addComponent      = useBuilderStore(s => s.addComponent)
  const removeComponent   = useBuilderStore(s => s.removeComponent)
  const reorderComponents = useBuilderStore(s => s.reorderComponents)
  const selectComponent   = useBuilderStore(s => s.selectComponent)

 
  const [stateVersion, setStateVersion] = React.useState(0)

  React.useEffect(() => {
    return eventBus.on('state:change', () => setStateVersion(v => v + 1))
  }, [])

  const runtime: Runtime = React.useMemo(() => ({
    state:        runtimeState.stateRef,
    stateVersion,
    setState:     (key, value, persist) => runtimeState.set(key, value, persist),
    evaluate:     (expr, extra) =>
                    ExpressionEngine.evaluateRaw(expr, { ...runtimeState.stateRef, ...(extra ?? {}) }),
  }), [stateVersion])

  
  const [sourceData, setSourceData] = React.useState<Record<string, unknown[]>>({})

  const fetchSource = React.useCallback(async (ds: DataSource) => {
    try {
      const rows = await dataSourceManager.execute(ds, runtimeState.stateRef)
      setSourceData(prev => ({ ...prev, [ds.id]: rows }))
    } catch (e) {
      console.error(`[Canvas] "${ds.name}" failed:`, (e as Error).message)
    }
  }, [])

  React.useEffect(() => {
    app.dataSources.forEach(fetchSource)
  }, [app.dataSources, fetchSource])

  
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (!selectedId) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      removeComponent(selectedId)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedId, removeComponent])

  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )
  const [activeDrag, setActiveDrag] = React.useState<Active | null>(null)

  const handleDragStart = (e: DragStartEvent) => setActiveDrag(e.active)

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDrag(null)
    if (!over) return

    const data = active.data.current

    if (data?.source === 'palette') {
      const entry = REGISTRY[data.componentType as string]
      if (entry) addComponent(makeComponent(entry))
      return
    }

    if (data?.source === 'canvas' && active.id !== over.id) {
      if (over.id === 'canvas-droppable') return   // dropped on empty area, not a swap
      const oldIdx = app.components.findIndex(c => c.id === String(active.id))
      const newIdx = app.components.findIndex(c => c.id === String(over.id))
      if (oldIdx !== -1 && newIdx !== -1) reorderComponents(arrayMove(app.components, oldIdx, newIdx))
    }
  }

 

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <ComponentPalette />
        <DroppableCenter
          components={app.components}
          runtime={runtime}
          sourceData={sourceData}
          selectedId={selectedId}
          onSelect={selectComponent}
          onDelete={removeComponent}
        />
        <PropertiesPanel />
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent active={activeDrag} />
      </DragOverlay>
    </DndContext>
  )
}
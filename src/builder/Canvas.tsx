import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBuilderStore } from '../store/builderStore'
import { REGISTRY } from '../components/registry'
import { runtimeState } from '../core/stateManager'
import { ExpressionEngine } from '../core/expressionEngine'
import { clsx } from 'clsx'
import { Trash2, GripVertical, LayoutTemplate } from 'lucide-react'
import type { AppComponent, Runtime } from '../types'



let stateVersion = 0

const runtimeAdapter: Runtime = {
  get state() {
    return runtimeState.getAll()
  },
  get stateVersion() {
    return stateVersion
  },
  setState: (key: string, value: unknown, persist?: boolean) => {
    runtimeState.set(key, value, persist)
    stateVersion++
  },
  evaluate: (expression: string, extra?: Record<string, unknown>) => {
    return ExpressionEngine.evaluateRaw(expression, { ...runtimeState.getAll(), ...extra })
  }
}



interface SortableWidgetProps {
  id: string
  component: AppComponent
  isSelected: boolean
  previewMode: boolean
  onSelect: () => void
  onDelete: () => void
  children: React.ReactNode
}

function SortableWidget({ id, component, isSelected, previewMode, onSelect, onDelete, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const definition = REGISTRY[component.type]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'relative group rounded-lg transition-all',
        isDragging && 'opacity-40 scale-[0.99]',
        !previewMode && isSelected && 'ring-2 ring-[var(--ac)]/70 ring-offset-2 ring-offset-[var(--cv)]',
      )}
    >
      /* Floating Toolbar - visible in design mode only */
      {!previewMode && (
        <div className={clsx(
          'absolute -top-3 right-2 z-10 flex items-center transition-opacity',
          'opacity-0 group-hover:opacity-100',
          isSelected && 'opacity-100',
        )}>
          /* Drag Handle */
          <span
            {...attributes}
            {...listeners}
            role="button"
            aria-label="Drag to reorder"
            className="flex h-5 w-5 cursor-grab items-center justify-center
              rounded-l bg-[var(--sh)] border border-[var(--sh-b)]
              text-[var(--sh-td)] hover:text-[var(--sh-ts)]
              active:cursor-grabbing transition-colors"
          >
            <GripVertical className="h-2.5 w-2.5" />
          </span>

          <button
            aria-label={`Delete ${definition?.label ?? component.type}`}
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="flex h-5 w-5 items-center justify-center
              rounded-r bg-[var(--sh)] border border-[var(--sh-b)] border-l-0
              text-[var(--sh-td)] hover:text-[var(--err)] hover:bg-[var(--err-bg)]
              transition-colors"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      <div
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        className="cursor-pointer"
      >
        {children}
      </div>
    </div>
  )
}



interface DroppableCenterProps {
  isOver: boolean
}

function DroppableCenter({ isOver }: DroppableCenterProps) {
  return (
    <div className={clsx(
      'flex min-h-[460px] flex-col items-center justify-center',
      'rounded-xl border-2 border-dashed transition-all',
      isOver
        ? 'border-[var(--ac)]/50 bg-[var(--ac-bg)]'
        : 'border-[var(--cv-b)] bg-white/60',
    )}>
      <div className="w-10 h-10 rounded-xl bg-[var(--cv-b)] flex items-center justify-center mb-3">
        <LayoutTemplate className="w-5 h-5 text-[#9898b0]" aria-hidden />
      </div>
      <p className={clsx(
        'text-sm font-medium',
        isOver ? 'text-[var(--ac)]' : 'text-[#9898b0]',
      )}>
        {isOver ? 'Release to add' : 'Start building'}
      </p>
      <p className="mt-1 text-xs text-[#b8b8cc]">Drag from the left panel</p>
    </div>
  )
}



interface CanvasContentProps {
  previewMode?: boolean
}

function CanvasContent({ previewMode = false }: CanvasContentProps) {
  const components = useBuilderStore(s => s.app.components)
  const selectedId = useBuilderStore(s => s.selectedId)
  const selectComponent = useBuilderStore(s => s.selectComponent)
  const removeComponent = useBuilderStore(s => s.removeComponent)

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-dropzone',
  })

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Del') {
        if (selectedId) {
          e.preventDefault()
          removeComponent(selectedId)
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        selectComponent(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, removeComponent, selectComponent])

  if (components.length === 0) {
    return (
      <div ref={setNodeRef} className="flex-1 min-h-0">
        <DroppableCenter isOver={isOver} />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} className="mx-auto flex max-w-3xl flex-col gap-4">
      <SortableContext items={components.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {components.map((component) => {
          const definition = REGISTRY[component.type]
          const Widget = definition?.Widget

          if (!Widget) return null

          return (
            <SortableWidget
              key={component.id}
              id={component.id}
              component={component}
              isSelected={selectedId === component.id}
              previewMode={previewMode}
              onSelect={() => selectComponent(component.id)}
              onDelete={() => removeComponent(component.id)}
            >
              <Widget
                component={component}
                runtime={runtimeAdapter}
                data={undefined}
                onEvent={(eventName, data) => {
                  console.log(`[Canvas] Component event: ${eventName}`, data)
                }}
              />
            </SortableWidget>
          )
        })}
      </SortableContext>
    </div>
  )
}



export function Canvas({ previewMode = false }: { previewMode?: boolean }) {
  return (
    <main 
      data-preview={previewMode} 
      className="flex-1 min-h-0 overflow-y-auto p-8 transition-colors canvas-grid scrollbar-shell bg-[var(--cv)]"
    >
      <CanvasContent previewMode={previewMode} />
    </main>
  )
}
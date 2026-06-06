import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBuilderStore } from '../store/builderStore'
import { WidgetRenderer } from '../widgets/WidgetRenderer'
import { clsx } from 'clsx'
import { Trash2, GripVertical } from 'lucide-react'
import { SortableWidget } from './SortableWidget'

function CanvasContent({ previewMode = false }: { previewMode?: boolean }) {
  const components = useBuilderStore(s => s.app?.components || [])
  const selectedId = useBuilderStore(s => s.selectedId)
  const selectComponent = useBuilderStore(s => s.selectComponent)
  const removeComponent = useBuilderStore(s => s.removeComponent)

  const { setNodeRef } = useDroppable({
    id: 'canvas-dropzone',
  })

  // Delete key handler - MUST be after all hook declarations
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Del') {
        if (selectedId) {
          e.preventDefault()
          removeComponent(selectedId)
        }
      }
      // Escape key deselects
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
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-sm">Drag components here or click to add</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} className="mx-auto flex max-w-3xl flex-col gap-4">
      <SortableContext items={components.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {components.map((component) => (
          <SortableWidget key={component.id} id={component.id}>
            <div
              className={clsx(
                'relative group rounded-lg transition-all cursor-pointer',
                selectedId === component.id && 'ring-2 ring-blue-500 ring-offset-2'
              )}
              onClick={(e) => {
                e.stopPropagation()
                selectComponent(component.id)
              }}
            >
              <div className={clsx(
                'absolute -top-3 right-2 z-10 flex items-center gap-1 transition-opacity',
                'opacity-0 group-hover:opacity-100',
                selectedId === component.id && 'opacity-100'
              )}>
                <span
                  aria-label="Drag to reorder"
                  className="flex h-6 w-6 cursor-grab items-center justify-center rounded bg-gray-600 text-white hover:bg-gray-700 active:cursor-grabbing"
                >
                  <GripVertical className="h-3 w-3" />
                </span>
                <button
                  aria-label={`Delete ${component.type}`}
                  className="flex h-6 w-6 items-center justify-center rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeComponent(component.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <WidgetRenderer component={component} previewMode={previewMode} />
            </div>
          </SortableWidget>
        ))}
      </SortableContext>
    </div>
  )
}

export function Canvas({ previewMode = false }: { previewMode?: boolean }) {
  return (
    <main 
      data-preview={previewMode} 
      className="flex-1 min-h-0 overflow-y-auto p-6 transition-colors bg-gray-50"
    >
      <CanvasContent previewMode={previewMode} />
    </main>
  )
}

import React from 'react'
import { Search, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { ExpressionEngine } from '../core/expressionEngine'
import type { ComponentDefinition } from '../types'
import type { WidgetProps } from './registry'



export interface KanbanColumn {
  id: string
  title: string
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  limit?: number | null
}

type KanbanItem = Record<string, unknown>



const COLUMN_COLORS: Record<string, { header: string; border: string }> = {
  gray:   { header: 'bg-gray-100',  border: 'border-gray-200'   },
  blue:   { header: 'bg-blue-50',   border: 'border-blue-200'   },
  green:  { header: 'bg-green-50',  border: 'border-green-200'  },
  yellow: { header: 'bg-yellow-50', border: 'border-yellow-200' },
  red:    { header: 'bg-red-50',    border: 'border-red-200'    },
  purple: { header: 'bg-purple-50', border: 'border-purple-200' },
}

const PRIORITY_BADGE: Record<string, string> = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:    'bg-green-100 text-green-700 border-green-200',
}



export function KanbanWidget({ component, data: canvasData, runtime, onEvent }: WidgetProps) {
  const columns     = (component.props.columns as KanbanColumn[]) ?? []
  const idField     = String(component.props.idField            ?? 'id')
  const titleField  = String(component.props.titleField         ?? 'title')
  const statusField = String(component.props.statusField        ?? 'status')
  const descField   = String(component.props.descriptionField   ?? 'description')
  const showSearch  = component.props.enableSearch !== false

  
  const resolveSource = (): KanbanItem[] => {
    if (Array.isArray(canvasData) && canvasData.length > 0) {
      return canvasData as KanbanItem[]
    }
    const expr = String(component.props.items ?? '')
    if (!expr) return []
    const raw = ExpressionEngine.evaluateRaw(expr, runtime.state)
    return Array.isArray(raw) ? (raw as KanbanItem[]) : []
  }

  const [items, setItems] = React.useState<KanbanItem[]>(resolveSource)

  
  React.useEffect(() => {
    if (items.length === 0 && Array.isArray(canvasData) && canvasData.length > 0) {
      setItems(canvasData as KanbanItem[])
    }

  }, [canvasData])


  const dragging = React.useRef<string | number | null>(null)
  const [dragOverCol, setDragOverCol] = React.useState<string | null>(null)

  
  const [search, setSearch] = React.useState('')

  
  const totalInColumn = (colId: string): number =>
    items.filter(item => String(item[statusField]) === colId).length


  const visibleInColumn = (colId: string): KanbanItem[] => {
    const colItems = items.filter(item => String(item[statusField]) === colId)
    if (!search.trim()) return colItems
    const term = search.toLowerCase()
    return colItems.filter(
      item =>
        String(item[titleField] ?? '').toLowerCase().includes(term) ||
        String(item[descField]  ?? '').toLowerCase().includes(term),
    )
  }



  const moveCard = (cardId: string | number, toStatus: string) => {
    const card = items.find(item => item[idField] === cardId)
    if (!card) return

    const fromStatus = String(card[statusField])
    if (fromStatus === toStatus) return

   
    const col          = columns.find(c => c.id === toStatus)
    const currentCount = totalInColumn(toStatus)
    if (col?.limit != null && currentCount >= col.limit) {
      onEvent('columnFull', { columnId: toStatus, limit: col.limit })
      return
    }

    const newItems = items.map(item =>
      item[idField] === cardId ? { ...item, [statusField]: toStatus } : item
    )
    setItems(newItems)
    runtime.setState('kanbanItems', newItems)
    onEvent('itemMove', {
      item:       { ...card, [statusField]: toStatus },
      fromStatus,
      toStatus,
    })
  }



  const handleDragStart = (e: React.DragEvent, cardId: string | number) => {
    dragging.current = cardId
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    dragging.current = null
    setDragOverCol(null)
  }


  const handleDragEnter = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOverCol(colId)
  }


  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCol(null)
    }
  }

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOverCol(null)
    if (dragging.current != null) {
      moveCard(dragging.current, colId)
      dragging.current = null
    }
  }


  return (
    <div className="flex flex-col gap-4">

      {/* Toolbar */}
      {showSearch && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cards..."
              aria-label="Search cards"
              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {items.length} card{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map(column => {
          const colors   = COLUMN_COLORS[column.color ?? 'gray'] ?? COLUMN_COLORS.gray
          const total    = totalInColumn(column.id)
          const visible  = visibleInColumn(column.id)
          const isFull   = column.limit != null && total >= column.limit
          const isOver   = dragOverCol === column.id && !isFull

          return (
            <div
              key={column.id}
              role="region"
              aria-label={column.title}
              className={clsx(
                'flex min-w-[280px] flex-1 flex-col rounded-lg border transition-all',
                colors.border,
                isOver && 'ring-2 ring-blue-400 ring-offset-1',
              )}
              onDragEnter={e => handleDragEnter(e, column.id)}
              onDragLeave={handleDragLeave}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, column.id)}
            >
              {/* Column header */}
              <div className={clsx(
                'flex items-center justify-between rounded-t-lg px-4 py-3',
                colors.header,
              )}>
                <h3 className="text-sm font-semibold text-gray-700">{column.title}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums">
                    {total}
                  </span>
                  {column.limit != null && (
                    <>
                      <span className={clsx(
                        'text-xs font-medium tabular-nums',
                        isFull ? 'text-red-500' : 'text-gray-400',
                      )}>
                        / {column.limit}
                      </span>
                      {isFull && (
                        <AlertCircle
                          className="h-3.5 w-3.5 text-red-400"
                          aria-label={`${column.title} is at capacity`}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Card list */}
              <div className="flex min-h-[200px] flex-col gap-2 p-3">
                {visible.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center py-8 text-xs text-gray-400">
                    {search.trim() ? 'No matching cards' : 'Drop cards here'}
                  </div>
                ) : (
                  visible.map(item => {
                    const cardId   = item[idField] as string | number
                    const title    = String(item[titleField]  ?? '(untitled)')
                    const desc     = item[descField]  ? String(item[descField])  : null
                    const priority = item.priority    ? String(item.priority)    : null
                    const assignee = item.assignee    ? String(item.assignee)    : null
                    const rawDue   = item.dueDate     ? String(item.dueDate)     : null

                    const dueDate = rawDue ? new Date(rawDue) : null
                    const isOverdue = dueDate ? dueDate < new Date() : false

                    return (
                      <div
                        key={String(cardId)}
                        role="article"
                        aria-label={title}
                        draggable
                        onDragStart={e => handleDragStart(e, cardId)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onEvent('itemClick', { item })}
                        className="cursor-grab rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing active:opacity-70"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug text-gray-800">
                            {title}
                          </p>
                          {priority && PRIORITY_BADGE[priority] && (
                            <span className={clsx(
                              'shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium',
                              PRIORITY_BADGE[priority],
                            )}>
                              {priority}
                            </span>
                          )}
                        </div>

                        {desc && (
                          <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">{desc}</p>
                        )}

                        {(assignee || dueDate) && (
                          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                            {assignee && <span>👤 {assignee}</span>}
                            {dueDate && !isNaN(dueDate.getTime()) && (
                              <span className={clsx(isOverdue && 'text-red-500 font-medium')}>
                                {dueDate.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


export const KanbanDefinition: ComponentDefinition = {
  type: 'kanban',
  label: 'Kanban',
  icon: 'Kanban',
  defaultProps: {
    columns: [
      { id: 'todo',       title: 'To Do',      color: 'gray',  limit: null },
      { id: 'inprogress', title: 'In Progress', color: 'blue',  limit: 3    },
      { id: 'done',       title: 'Done',        color: 'green', limit: null },
    ],
    items:            '',
    idField:          'id',
    titleField:       'title',
    statusField:      'status',
    descriptionField: 'description',
    enableSearch:     true,
  },
  defaultEvents: {
    itemClick:  '',
    itemMove:   '',
    columnFull: '',
  },
}
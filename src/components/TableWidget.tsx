import React from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { ComponentDefinition } from '../types'
import type { WidgetProps } from './registry'
import { ExpressionEngine } from '../core/expressionEngine'


export interface TableColumn {
  key: string
  label: string
  visible?: boolean   
  sortable?: boolean  
  width?: string      
  render?: string     
}

type SortDir = 'asc' | 'desc' | null


function SortIcon({
  colKey,
  sortKey,
  sortDir,
}: {
  colKey: string
  sortKey: string | null
  sortDir: SortDir
}) {
  if (sortKey !== colKey || !sortDir)
    return <ChevronsUpDown className="w-3 h-3 text-gray-400" aria-hidden />
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3 text-blue-500" aria-hidden />
    : <ChevronDown className="w-3 h-3 text-blue-500" aria-hidden />
}


export function TableWidget({ component, data: canvasData, runtime, onEvent }: WidgetProps) {
  const columns    = (component.props.columns as TableColumn[]) ?? []
  const rowsPerPage = Math.max(1, Number(component.props.rowsPerPage ?? 10))
  const searchable = component.props.searchable !== false
  const selectable = component.props.selectable === true
  const idField    = String(component.props.idField ?? 'id')

  
  const rows = React.useMemo<Record<string, unknown>[]>(() => {
    if (Array.isArray(canvasData) && canvasData.length > 0) {
      return canvasData as Record<string, unknown>[]
    }
    const expr = String(component.props.data ?? '')
    if (!expr) return []
    const raw = ExpressionEngine.evaluateRaw(expr, runtime.state)
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
  }, [canvasData, component.props.data, runtime.stateVersion])

  const [page,     setPage]     = React.useState(1)
  const [search,   setSearch]   = React.useState('')
  const [sortKey,  setSortKey]  = React.useState<string | null>(null)
  const [sortDir,  setSortDir]  = React.useState<SortDir>(null)
  const [selected, setSelected] = React.useState<Set<unknown>>(new Set())

  const visibleCols = columns.filter(c => c.visible !== false)

  
  React.useEffect(() => { setPage(1) }, [search, rows.length])


  const filtered = React.useMemo(() => {
    if (!search || !searchable) return rows
    const term = search.toLowerCase()
    return rows.filter(row =>
      visibleCols.some(col =>
        String(row[col.key] ?? '').toLowerCase().includes(term)
      )
    )
  }, [rows, search, searchable, visibleCols])

  const sorted = React.useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, {
              numeric: true,
              sensitivity: 'base',
            })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages  = Math.max(1, Math.ceil(sorted.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIdx    = (currentPage - 1) * rowsPerPage
  const pageRows    = sorted.slice(startIdx, startIdx + rowsPerPage)

  const handleSortClick = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
      setSortDir(null)
    }
  }


  const toggleRow = (rowId: unknown) => {
    const next = new Set(selected)
    next.has(rowId) ? next.delete(rowId) : next.add(rowId)
    setSelected(next)
    onEvent('selectionChange', { selected: Array.from(next) })
  }

  const togglePage = (checked: boolean) => {
    const ids  = pageRows.map(r => r[idField])
    const next = checked
      ? new Set([...selected, ...ids])
      : new Set([...selected].filter(id => !ids.includes(id)))
    setSelected(next)
    onEvent('selectionChange', { selected: Array.from(next) })
  }

  const allPageSelected  = pageRows.length > 0 && pageRows.every(r => selected.has(r[idField]))
  const somePageSelected = !allPageSelected && pageRows.some(r => selected.has(r[idField]))

  
  const renderCell = (row: Record<string, unknown>, col: TableColumn): string => {
    if (col.render) {
      return ExpressionEngine.evaluate(col.render, { row, ...runtime.state })
    }
    const val = row[col.key]
    return val == null ? '' : String(val)
  }



  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden">

      {/* ── Toolbar ── */}
      {searchable && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              aria-label="Search rows"
              className={clsx(
                'pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 bg-white',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                'transition-colors',
              )}
            />
          </div>
          {selectable && selected.size > 0 && (
            <span className="text-sm text-gray-500">
              {selected.size} row{selected.size > 1 ? 's' : ''} selected
            </span>
          )}
          <span className="ml-auto text-xs text-gray-400 tabular-nums">
            {filtered.length.toLocaleString()} row{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Data table">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = somePageSelected }}
                    onChange={e => togglePage(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {visibleCols.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && handleSortClick(col.key)}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    col.sortable !== false && 'cursor-pointer select-none hover:bg-gray-100 transition-colors',
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable !== false && (
                      <SortIcon colKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleCols.length + (selectable ? 1 : 0)}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  {search ? `No results for "${search}"` : 'No data to display.'}
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => {
                const rowId     = row[idField]
                const isSelected = selectable && selected.has(rowId)
                return (
                  <tr
                    key={rowId != null ? String(rowId) : `row-${startIdx + i}`}
                    onClick={() => {
                      onEvent('rowClick', { row, index: startIdx + i })
                      if (selectable) toggleRow(rowId)
                    }}
                    className={clsx(
                      'transition-colors',
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50/70',
                      selectable && 'cursor-pointer',
                    )}
                  >
                    {selectable && (
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          aria-label={`Select row ${String(rowId ?? i)}`}
                          onChange={() => toggleRow(rowId)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-3 text-gray-700">
                        {renderCell(row, col)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-500">
          <span className="tabular-nums">
            {startIdx + 1}–{Math.min(startIdx + rowsPerPage, sorted.length)} of {sorted.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 tabular-nums">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


export const TableDefinition: ComponentDefinition = {
  type: 'table',
  label: 'Table',
  icon: 'Table2',
  defaultProps: {
    data: '',           
    idField: 'id',
    columns: [
      { key: 'id',    label: 'ID',    visible: true, sortable: true },
      { key: 'name',  label: 'Name',  visible: true, sortable: true },
      { key: 'email', label: 'Email', visible: true, sortable: true },
    ],
    rowsPerPage: 10,
    searchable: true,
    selectable: false,
  },
  defaultEvents: {
    rowClick: '',
    selectionChange: '',
  },
}
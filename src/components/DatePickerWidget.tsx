import React from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { clsx } from 'clsx'
import type { ComponentDefinition } from '../types'
import type { WidgetProps } from './registry'


export type DisplayFormat = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MMM D, YYYY'

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
}


const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const localDate = (year: number, month: number, day: number): Date =>
  new Date(year, month, day)

function startOfDay(d: Date): Date {
  return localDate(d.getFullYear(), d.getMonth(), d.getDate())
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

export function parseISODate(iso: string): Date | null {
  if (!iso) return null
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  return localDate(parts[0], parts[1] - 1, parts[2])
}


export function toISODate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

export function formatDisplay(date: Date, format: DisplayFormat): string {
  const y  = date.getFullYear()
  const m  = date.getMonth()
  const d  = date.getDate()
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  switch (format) {
    case 'YYYY-MM-DD':  return `${y}-${mm}-${dd}`
    case 'DD/MM/YYYY':  return `${dd}/${mm}/${y}`
    case 'MMM D, YYYY': return `${SHORT_MONTHS[m]} ${d}, ${y}`
    default:            return `${y}-${mm}-${dd}`
  }
}


export function buildGrid(year: number, month: number, weekStart: 0 | 1): CalendarDay[] {
  const today    = startOfDay(new Date())
  const firstDay = localDate(year, month, 1)
  const lastDay  = localDate(year, month + 1, 0)   // day 0 = last day of prev month
  const days: CalendarDay[] = []

  
  let offset = firstDay.getDay() - weekStart
  if (offset < 0) offset += 7

  for (let i = offset - 1; i >= 0; i--) {

    const date = localDate(year, month, -i)
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today) })
  }

  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = localDate(year, month, d)
    days.push({ date, isCurrentMonth: true, isToday: isSameDay(date, today) })
  }

  
  const trailing = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= trailing; i++) {
    const date = localDate(year, month + 1, i)
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today) })
  }

  return days
}


export function DatePickerWidget({ component, runtime, onEvent }: WidgetProps) {
  const label       = String(component.props.label       ?? 'Date')
  const placeholder = String(component.props.placeholder ?? 'Select a date...')
  const format      = (component.props.format as DisplayFormat) ?? 'MMM D, YYYY'
  const weekStart   = Number(component.props.weekStartsOn ?? 1) as 0 | 1
  const clearable   = component.props.clearable !== false
  const binding     = String(component.props.binding ?? '') || `_dp_${component.id}`

  const minDate = component.props.minDate
    ? startOfDay(parseISODate(String(component.props.minDate)) ?? new Date(0))
    : null
  const maxDate = component.props.maxDate
    ? startOfDay(parseISODate(String(component.props.maxDate)) ?? new Date(8.64e15))
    : null

  
  const storedIso = runtime.state[binding] as string | undefined
  const selected  = storedIso ? parseISODate(storedIso) : null

  const [open,      setOpen]      = React.useState(false)
  const [viewYear,  setViewYear]  = React.useState(
    () => selected?.getFullYear() ?? new Date().getFullYear()
  )
  const [viewMonth, setViewMonth] = React.useState(
    () => selected?.getMonth() ?? new Date().getMonth()
  )
  const containerRef = React.useRef<HTMLDivElement>(null)

  

  React.useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  

  const grid = React.useMemo(
    () => buildGrid(viewYear, viewMonth, weekStart),
    [viewYear, viewMonth, weekStart],
  )

  const dayHeaders = weekStart === 1
    ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const isOutOfRange = (date: Date): boolean => {
    const d = startOfDay(date)
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  

  const selectDay = (day: CalendarDay) => {
    if (isOutOfRange(day.date)) return
    
    if (!day.isCurrentMonth) {
      setViewYear(day.date.getFullYear())
      setViewMonth(day.date.getMonth())
    }
    const iso = toISODate(day.date)
    runtime.setState(binding, iso)
    onEvent('change', { date: iso, timestamp: day.date.getTime() })
    setOpen(false)
  }

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    runtime.setState(binding, null)
    onEvent('clear', {})
  }

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const goToToday = () => {
    const today = startOfDay(new Date())
    if (isOutOfRange(today)) return
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    const iso = toISODate(today)
    runtime.setState(binding, iso)
    onEvent('change', { date: iso, timestamp: today.getTime() })
    setOpen(false)
  }

  const displayValue = selected ? formatDisplay(selected, format) : ''

 

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">

      {label && (
        <label className="text-sm font-medium text-[var(--sh-ts)]">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label || 'Date picker'}
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm text-left',
          'bg-[var(--sh)] shadow-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          open ? 'border-blue-500' : 'border-gray-300 hover:border-gray-400',
          !displayValue && 'text-[var(--sh-td)]',
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-[var(--sh-td)]" aria-hidden />
        <span className="flex-1">{displayValue || placeholder}</span>
        {clearable && displayValue && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={clearDate}
            onKeyDown={e => e.key === 'Enter' && clearDate(e as unknown as React.MouseEvent)}
            className="rounded p-0.5 text-[var(--sh-td)] hover:bg-[var(--sh-b2)] hover:text-[var(--sh-t)]"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          role="dialog"
          aria-label="Date picker calendar"
          className="absolute left-0 top-full z-50 mt-1.5 w-72 rounded-lg border border-[var(--sh-b)] bg-[var(--sh)] shadow-lg"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b border-[var(--sh-b)] px-4 py-3">
            <button
              type="button"
              aria-label="Previous month"
              onClick={goToPrevMonth}
              className="rounded p-1.5 text-[var(--sh-t)] transition-colors hover:bg-[var(--sh-b2)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[var(--sh-ts)]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={goToNextMonth}
              className="rounded p-1.5 text-[var(--sh-t)] transition-colors hover:bg-[var(--sh-b2)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 px-3 pb-1 pt-3">
            {dayHeaders.map(h => (
              <div key={h} className="pb-1 text-center text-xs font-medium text-[var(--sh-td)]">
                {h}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-3">
            {grid.map((day, i) => {
              const disabled   = isOutOfRange(day.date)
              const isSelected = selected ? isSameDay(day.date, selected) : false
              const isMuted    = !day.isCurrentMonth

              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  aria-label={`${MONTH_NAMES[day.date.getMonth()]} ${day.date.getDate()}, ${day.date.getFullYear()}`}
                  aria-pressed={isSelected}
                  onClick={() => selectDay(day)}
                  className={clsx(
                    'flex h-8 w-full items-center justify-center rounded-md text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                    disabled
                      ? 'cursor-not-allowed text-gray-200'
                      : isSelected
                      ? 'bg-blue-600 font-semibold text-white hover:bg-blue-700'
                      : day.isToday && !isMuted
                      ? 'border border-blue-300 font-semibold text-blue-700 hover:bg-blue-50'
                      : isMuted
                      ? 'text-gray-300 hover:bg-[var(--sh-s)]'
                      : 'text-[var(--sh-ts)] hover:bg-[var(--sh-b2)]',
                  )}
                >
                  {day.date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div className="border-t border-[var(--sh-b)] px-3 py-2">
            <button
              type="button"
              aria-label="Go to today"
              disabled={isOutOfRange(startOfDay(new Date()))}
              onClick={goToToday}
              className="w-full py-0.5 text-center text-xs font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}



export const DatePickerDefinition: ComponentDefinition = {
  type: 'datepicker',
  label: 'Date Picker',
  icon: 'CalendarDays',
  defaultProps: {
    label:        'Date',
    placeholder:  'Select a date...',
    format:       'MMM D, YYYY',
    binding:      'selectedDate',
    weekStartsOn: 1,           
    clearable:    true,
    minDate:      '',
    maxDate:      '',
  },
  defaultEvents: {
    change: '',
    clear:  '',
  },
}
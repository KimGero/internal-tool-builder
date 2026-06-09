import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import type { ComponentDefinition } from '../types'
import type { WidgetProps } from './registry'

const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const EVENT_COLORS: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-800',
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  purple: 'bg-purple-100 text-purple-800',
  orange: 'bg-orange-100 text-orange-800',
  gray:   'bg-gray-100 text-[var(--sh-t)]',
}

interface CalEvent {
  id?:   string | number
  title: string
  date:  string   
  color: string
  [key: string]: unknown
}


export function buildMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const grid: Date[] = []

  
  for (let i = firstDay.getDay() - 1; i >= 0; i--) {
    grid.push(new Date(year, month, -i))
  }
  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    grid.push(new Date(year, month, d))
  }

  const tail = 42 - grid.length
  for (let i = 1; i <= tail; i++) {
    grid.push(new Date(year, month + 1, i))
  }

  return grid
}

function toDateKey(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function CalendarWidget({ component, onEvent, data = [] }: WidgetProps) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )

  const titleField = String(component.props.titleField ?? 'title')
  const dateField  = String(component.props.dateField  ?? 'date')
  const colorField = String(component.props.colorField ?? 'color')


  const events = useMemo<CalEvent[]>(() =>
    (data as Record<string, unknown>[]).map(row => ({
      ...row,
      title: String(row[titleField] ?? ''),
      date:  String(row[dateField]  ?? '').slice(0, 10),
      color: String(row[colorField] ?? 'blue'),
    })),
    [data, titleField, dateField, colorField],
  )


  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) {
      if (!ev.date) continue
      const bucket = map.get(ev.date)
      if (bucket) bucket.push(ev)
      else map.set(ev.date, [ev])
    }
    return map
  }, [events])

  const year     = viewDate.getFullYear()
  const month    = viewDate.getMonth()
  const grid     = buildMonthGrid(year, month)
  const todayKey = toDateKey(today)

  const prev = () => setViewDate(new Date(year, month - 1, 1))
  const next = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div className="rounded-lg border border-[var(--sh-b)] bg-[var(--sh)] overflow-hidden select-none">

      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--sh-s)] border-b border-[var(--sh-b)]">
        <button
          aria-label="Previous month"
          onClick={prev}
          className="p-1.5 rounded text-[var(--sh-t)] hover:bg-gray-200 hover:text-[var(--sh-ts)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <h3 className="text-sm font-semibold text-[var(--sh-ts)]">
          {MONTH_NAMES[month]} {year}
        </h3>

        <button
          aria-label="Next month"
          onClick={next}
          className="p-1.5 rounded text-[var(--sh-t)] hover:bg-gray-200 hover:text-[var(--sh-ts)] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[var(--sh-b)]">
        {DAY_LABELS.map(label => (
          <div key={label} className="py-2 text-center text-xs font-medium text-[var(--sh-td)] uppercase tracking-wide">
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {grid.map((day, idx) => {
          const key         = toDateKey(day)
          const isThisMonth = day.getMonth() === month
          const isToday     = key === todayKey
          const isLastCol   = idx % 7 === 6
          const dayEvents   = byDate.get(key) ?? []

          return (
            <div
              key={idx}
              onClick={() => onEvent('dayClick', { date: key, events: dayEvents })}
              className={clsx(
                'min-h-[88px] p-1.5 border-b border-[var(--sh-b)] cursor-pointer transition-colors hover:bg-[var(--sh-s)]',
                !isLastCol && 'border-r border-[var(--sh-b)]',
                !isThisMonth && 'bg-[var(--sh-s)]/50',
              )}
            >
              {/* Day number */}
              <div className="flex justify-end mb-1">
                <span className={clsx(
                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs',
                  isToday
                    ? 'bg-blue-600 text-white font-semibold'
                    : isThisMonth ? 'text-[var(--sh-ts)]' : 'text-[var(--sh-td)]',
                )}>
                  {day.getDate()}
                </span>
              </div>

              {/* Events — max 3 visible, then "+N more" */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); onEvent('eventClick', { event: ev, date: key }) }}
                    className={clsx(
                      'w-full text-left text-xs px-1.5 py-0.5 rounded truncate',
                      EVENT_COLORS[ev.color] ?? EVENT_COLORS.blue,
                    )}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-xs text-[var(--sh-td)] px-1.5">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

export const CalendarDefinition: ComponentDefinition = {
  type: 'calendar',
  label: 'Calendar',
  icon: 'CalendarDays',
  defaultProps: {
    titleField: 'title',
    dateField:  'date',
    colorField: 'color',
  },
  defaultEvents: {
    dayClick:   '',
    eventClick: '',
  },
}
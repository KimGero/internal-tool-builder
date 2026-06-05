import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  DatePickerWidget,
  buildGrid,
  parseISODate,
  toISODate,
  formatDisplay,
} from '../src/components/DatePickerWidget'
import type { AppComponent, Runtime } from '../src/types'



function makeRuntime(state: Record<string, unknown> = {}): Runtime {
  return { state, setState: vi.fn(), evaluate: vi.fn((e: string) => e) }
}

function makeComponent(overrides: Partial<AppComponent['props']> = {}): AppComponent {
  return {
    id: 'dp-1',
    type: 'datepicker',
    events: {},
    props: {
      label: 'Select Date',
      placeholder: 'Pick a date...',
      format: 'YYYY-MM-DD',
      binding: 'testDate',
      weekStartsOn: 1,
      clearable: true,
      minDate: '',
      maxDate: '',
      ...overrides,
    },
  }
}

const openCalendar = () =>
  fireEvent.click(screen.getByRole('button', { name: /select date/i }))



describe('toISODate / parseISODate', () => {
  it('round-trips without timezone drift', () => {
    const original = '2025-06-15'
    const date = parseISODate(original)!
    expect(toISODate(date)).toBe(original)
  })

  it('returns null for empty string', () => {
    expect(parseISODate('')).toBeNull()
  })

  it('returns null for invalid string', () => {
    expect(parseISODate('not-a-date')).toBeNull()
  })
})

describe('formatDisplay', () => {
  const d = new Date(2025, 2, 5)  

  it('formats YYYY-MM-DD', () => {
    expect(formatDisplay(d, 'YYYY-MM-DD')).toBe('2025-03-05')
  })

  it('formats DD/MM/YYYY', () => {
    expect(formatDisplay(d, 'DD/MM/YYYY')).toBe('05/03/2025')
  })

  it('formats MMM D, YYYY', () => {
    expect(formatDisplay(d, 'MMM D, YYYY')).toBe('Mar 5, 2025')
  })
})

describe('buildGrid', () => {
  it('produces 35 cells for January 2025 with Sunday start', () => {
    
    expect(buildGrid(2025, 0, 0).length).toBe(35)
  })

  it('produces 42 cells for a month needing 6 rows', () => {
    
    expect(buildGrid(2022, 9, 0).length).toBe(42)
  })

  it('first cell is a Sunday when weekStart is 0', () => {

    const grid = buildGrid(2025, 0, 0)
    expect(grid[0].date.getDay()).toBe(0)
  })

  it('first cell is a Monday when weekStart is 1', () => {
    // January 2025 Monday-start: first cell = Dec 29 2024 (Monday, day 1)
    const grid = buildGrid(2025, 0, 1)
    expect(grid[0].date.getDay()).toBe(1)
  })

  it('marks today correctly', () => {
    const today = new Date()
    const grid  = buildGrid(today.getFullYear(), today.getMonth(), 1)
    const todayCell = grid.find(d => d.isToday && d.isCurrentMonth)
    expect(todayCell).toBeDefined()
    expect(todayCell!.date.getDate()).toBe(today.getDate())
  })

  it('all cells for the current month have isCurrentMonth true', () => {
    const grid = buildGrid(2025, 0, 1)
    const currentCells = grid.filter(d => d.isCurrentMonth)
    expect(currentCells).toHaveLength(31)   // January has 31 days
    currentCells.forEach(d => expect(d.date.getMonth()).toBe(0))
  })
})


describe('DatePickerWidget — rendering', () => {
  it('renders the label', () => {
    render(<DatePickerWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    expect(screen.getByText('Select Date')).toBeInTheDocument()
  })

  it('shows placeholder when no date is selected', () => {
    render(<DatePickerWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    expect(screen.getByText('Pick a date...')).toBeInTheDocument()
  })

  it('shows the formatted date from the binding value', () => {
    render(
      <DatePickerWidget
        component={makeComponent({ format: 'YYYY-MM-DD' })}
        runtime={makeRuntime({ testDate: '2025-06-15' })}
        onEvent={vi.fn()}
      />
    )
    expect(screen.getByText('2025-06-15')).toBeInTheDocument()
  })

  it('calendar is hidden on initial render', () => {
    render(<DatePickerWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('DatePickerWidget — open / close', () => {
  it('opens the calendar on trigger click', () => {
    render(<DatePickerWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    openCalendar()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    render(<DatePickerWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    openCalendar()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navigates to the previous month', () => {
    render(<DatePickerWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    openCalendar()
    const header = () => screen.getByRole('dialog').querySelector('span.font-semibold')?.textContent
    const before = header()
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(header()).not.toBe(before)
  })

  it('navigates to the next month', () => {
    render(<DatePickerWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    openCalendar()
    const header = () => screen.getByRole('dialog').querySelector('span.font-semibold')?.textContent
    const before = header()
    fireEvent.click(screen.getByRole('button', { name: /next month/i }))
    expect(header()).not.toBe(before)
  })
})

describe('DatePickerWidget — selection', () => {
  it('calls runtime.setState with a YYYY-MM-DD string', () => {
    const runtime = makeRuntime()
    render(<DatePickerWidget component={makeComponent()} runtime={runtime} onEvent={vi.fn()} />)
    openCalendar()
    const dayBtn = screen.getAllByRole('button')
      .find(b => b.getAttribute('aria-pressed') !== null && !b.hasAttribute('disabled'))
    dayBtn && fireEvent.click(dayBtn)
    expect(runtime.setState).toHaveBeenCalledWith(
      'testDate',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    )
  })

  it('fires the change event with iso date and timestamp', () => {
    const onEvent = vi.fn()
    render(<DatePickerWidget component={makeComponent()} runtime={makeRuntime()} onEvent={onEvent} />)
    openCalendar()
    const dayBtn = screen.getAllByRole('button')
      .find(b => b.getAttribute('aria-pressed') !== null && !b.hasAttribute('disabled'))
    dayBtn && fireEvent.click(dayBtn)
    expect(onEvent).toHaveBeenCalledWith('change', expect.objectContaining({
      date:      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      timestamp: expect.any(Number),
    }))
  })

  it('closes the calendar after a date is selected', () => {
    render(<DatePickerWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    openCalendar()
    const dayBtn = screen.getAllByRole('button')
      .find(b => b.getAttribute('aria-pressed') !== null && !b.hasAttribute('disabled'))
    dayBtn && fireEvent.click(dayBtn)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('DatePickerWidget — clear', () => {
  it('shows clear button when a date is selected', () => {
    render(
      <DatePickerWidget
        component={makeComponent({ clearable: true })}
        runtime={makeRuntime({ testDate: '2025-06-15' })}
        onEvent={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /clear date/i })).toBeInTheDocument()
  })

  it('hides clear button when clearable is false', () => {
    render(
      <DatePickerWidget
        component={makeComponent({ clearable: false })}
        runtime={makeRuntime({ testDate: '2025-06-15' })}
        onEvent={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /clear date/i })).not.toBeInTheDocument()
  })

  it('calls runtime.setState with null when cleared', () => {
    const runtime = makeRuntime({ testDate: '2025-06-15' })
    render(<DatePickerWidget component={makeComponent()} runtime={runtime} onEvent={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /clear date/i }))
    expect(runtime.setState).toHaveBeenCalledWith('testDate', null)
  })

  it('fires the clear event', () => {
    const onEvent = vi.fn()
    render(
      <DatePickerWidget
        component={makeComponent()}
        runtime={makeRuntime({ testDate: '2025-06-15' })}
        onEvent={onEvent}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /clear date/i }))
    expect(onEvent).toHaveBeenCalledWith('clear', {})
  })
})

describe('DatePickerWidget — min/max', () => {
  it('disables the Today button when today is before minDate', () => {
    render(
      <DatePickerWidget
        component={makeComponent({ minDate: '2099-01-01' })}
        runtime={makeRuntime()}
        onEvent={vi.fn()}
      />
    )
    openCalendar()
    expect(screen.getByRole('button', { name: /go to today/i })).toBeDisabled()
  })

  it('disables the Today button when today is after maxDate', () => {
    render(
      <DatePickerWidget
        component={makeComponent({ maxDate: '2000-01-01' })}
        runtime={makeRuntime()}
        onEvent={vi.fn()}
      />
    )
    openCalendar()
    expect(screen.getByRole('button', { name: /go to today/i })).toBeDisabled()
  })
})
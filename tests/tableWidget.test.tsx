import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { TableWidget } from '../src/components/TableWidget'
import type { AppComponent, Runtime } from '../src/types'
import '@testing-library/jest-dom'




function makeRuntime(state: Record<string, unknown> = {}): Runtime {
  return {
    state,
    setState: vi.fn(),
    evaluate: vi.fn((expr: string) => expr),
  }
}

function makeComponent(propsOverrides: Partial<AppComponent['props']> = {}): AppComponent {
  return {
    id: 'test-table',
    type: 'table',
    events: {},
    props: {
      data: '',
      idField: 'id',
      columns: [
        { key: 'id',   label: 'ID',   visible: true, sortable: true },
        { key: 'name', label: 'Name', visible: true, sortable: true },
      ],
      rowsPerPage: 5,
      searchable: true,
      selectable: false,
      ...propsOverrides,
    },
  }
}

const ROWS = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
]


const getHeaders = () =>
  screen.getAllByRole('columnheader').map(th => th.textContent?.trim() ?? '')


describe('TableWidget — rendering', () => {
  it('renders column headers from props', () => {
    render(<TableWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    expect(getHeaders()).toEqual(expect.arrayContaining(['ID', 'Name']))
  })

  it('renders all rows from the data prop', () => {
    render(
      <TableWidget component={makeComponent()} data={ROWS} runtime={makeRuntime()} onEvent={vi.fn()} />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(
      <TableWidget component={makeComponent()} data={[]} runtime={makeRuntime()} onEvent={vi.fn()} />
    )
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('hides columns where visible is false', () => {
    render(
      <TableWidget
        component={makeComponent({
          columns: [
            { key: 'id',   label: 'ID',   visible: false },
            { key: 'name', label: 'Name', visible: true  },
          ],
        })}
        data={ROWS}
        runtime={makeRuntime()}
        onEvent={vi.fn()}
      />
    )
    expect(getHeaders()).not.toContain('ID')
    expect(getHeaders()).toContain('Name')
  })

  it('omits the search bar when searchable is false', () => {
    render(
      <TableWidget
        component={makeComponent({ searchable: false })}
        data={ROWS}
        runtime={makeRuntime()}
        onEvent={vi.fn()}
      />
    )
    expect(screen.queryByRole('textbox', { name: /search/i })).not.toBeInTheDocument()
  })
})

describe('TableWidget — data source from runtime state', () => {
  it('resolves data from runtime state when no canvasData is passed', () => {
    
    render(
      <TableWidget
        component={makeComponent({ data: 'users' })}
        runtime={makeRuntime({ users: ROWS })}
        onEvent={vi.fn()}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('prefers canvasData over runtime state when both exist', () => {
    const otherRows = [{ id: 99, name: 'Other' }]
    render(
      <TableWidget
        component={makeComponent({ data: 'users' })}
        data={otherRows}
        runtime={makeRuntime({ users: ROWS })}
        onEvent={vi.fn()}
      />
    )
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })
})

describe('TableWidget — search', () => {
  it('filters rows case-insensitively', () => {
    render(
      <TableWidget component={makeComponent()} data={ROWS} runtime={makeRuntime()} onEvent={vi.fn()} />
    )
    fireEvent.change(screen.getByRole('textbox', { name: /search/i }), {
      target: { value: 'alice' },
    })
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })

  it('shows a no-results message when nothing matches', () => {
    render(
      <TableWidget component={makeComponent()} data={ROWS} runtime={makeRuntime()} onEvent={vi.fn()} />
    )
    fireEvent.change(screen.getByRole('textbox', { name: /search/i }), {
      target: { value: 'zzz' },
    })
    expect(screen.getByText(/no results/i)).toBeInTheDocument()
  })
})

describe('TableWidget — sorting', () => {
  const UNSORTED = [
    { id: 3, name: 'Charlie' },
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]

  const rowNames = () =>
    screen.getAllByRole('row')
      .slice(1)                              
      .map(r => (r as HTMLTableRowElement).cells[1]?.textContent)   

  it('sorts ascending on first header click', () => {
    render(
      <TableWidget component={makeComponent()} data={UNSORTED} runtime={makeRuntime()} onEvent={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('columnheader', { name: /name/i }))
    expect(rowNames()).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sorts descending on second click', () => {
    render(
      <TableWidget component={makeComponent()} data={UNSORTED} runtime={makeRuntime()} onEvent={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('columnheader', { name: /name/i }))
    fireEvent.click(screen.getByRole('columnheader', { name: /name/i }))
    expect(rowNames()).toEqual(['Charlie', 'Bob', 'Alice'])
  })

  it('removes sort on third click (restores original order)', () => {
    render(
      <TableWidget component={makeComponent()} data={UNSORTED} runtime={makeRuntime()} onEvent={vi.fn()} />
    )
    const header = screen.getByRole('columnheader', { name: /name/i })
    fireEvent.click(header) 
    fireEvent.click(header) 
    fireEvent.click(header) 
    expect(rowNames()).toEqual(['Charlie', 'Alice', 'Bob'])
  })
})

describe('TableWidget — events', () => {
  it('fires rowClick with the row and index', () => {
    const onEvent = vi.fn()
    render(
      <TableWidget component={makeComponent()} data={ROWS} runtime={makeRuntime()} onEvent={onEvent} />
    )
    fireEvent.click(screen.getAllByRole('row')[1]) 
    expect(onEvent).toHaveBeenCalledWith('rowClick', { row: ROWS[0], index: 0 })
  })
})

describe('TableWidget — selection', () => {
  it('fires selectionChange when a row is clicked in selectable mode', () => {
    const onEvent = vi.fn()
    render(
      <TableWidget
        component={makeComponent({ selectable: true })}
        data={ROWS}
        runtime={makeRuntime()}
        onEvent={onEvent}
      />
    )
    fireEvent.click(screen.getAllByRole('row')[1])
    expect(onEvent).toHaveBeenCalledWith('selectionChange', { selected: [1] })
  })

  it('deselects a row on second click', () => {
    const onEvent = vi.fn()
    render(
      <TableWidget
        component={makeComponent({ selectable: true })}
        data={ROWS}
        runtime={makeRuntime()}
        onEvent={onEvent}
      />
    )
    const firstRow = screen.getAllByRole('row')[1]
    fireEvent.click(firstRow) 
    fireEvent.click(firstRow) 
    const calls = onEvent.mock.calls.filter(c => c[0] === 'selectionChange')
    expect(calls.at(-1)?.[1]).toEqual({ selected: [] })
  })
})


import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { KanbanWidget } from '../src/components/KanbanWidget'
import type { AppComponent, Runtime } from '../src/types'


function makeRuntime(state: Record<string, unknown> = {}): Runtime {
  return { state, stateVersion: 0, setState: vi.fn(), evaluate: vi.fn((e: string) => e) }
}

const DEFAULT_COLUMNS = [
  { id: 'todo',       title: 'To Do',      color: 'gray',  limit: null },
  { id: 'inprogress', title: 'In Progress', color: 'blue',  limit: 2    },
  { id: 'done',       title: 'Done',        color: 'green', limit: null },
]

function makeComponent(overrides: Partial<AppComponent['props']> = {}): AppComponent {
  return {
    id: 'kb-1',
    type: 'kanban',
    events: {},
    props: {
      columns:          DEFAULT_COLUMNS,
      idField:          'id',
      titleField:       'title',
      statusField:      'status',
      descriptionField: 'description',
      enableSearch:     true,
      ...overrides,
    },
  }
}

const ITEMS = [
  { id: 1, title: 'Fix login bug',  status: 'todo',       priority: 'high'   },
  { id: 2, title: 'Write tests',    status: 'todo',       priority: 'medium' },
  { id: 3, title: 'Deploy to prod', status: 'inprogress', priority: 'high'   },
  { id: 4, title: 'Code review',    status: 'done',       priority: 'low'    },
]


describe('KanbanWidget Ã¢â‚¬â€ column rendering', () => {
  it('renders all columns', () => {
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={vi.fn()} />)
    expect(screen.getByRole('region', { name: /to do/i        })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /in progress/i  })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /done/i         })).toBeInTheDocument()
  })

  it('shows the correct item count in each column header', () => {
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={vi.fn()} />)
    const todoCol = screen.getByRole('region', { name: /to do/i })
    expect(within(todoCol).getByText('2')).toBeInTheDocument()   // 2 todo items
  })

  it('shows empty drop target when a column has no items', () => {
    const noTodo = ITEMS.filter(i => i.status !== 'todo')
    render(<KanbanWidget component={makeComponent()} data={noTodo} runtime={makeRuntime()} onEvent={vi.fn()} />)
    const todoCol = screen.getByRole('region', { name: /to do/i })
    expect(within(todoCol).getByText(/drop cards here/i)).toBeInTheDocument()
  })
})

describe('KanbanWidget Ã¢â‚¬â€ card distribution', () => {
  it('places each card in the correct column', () => {
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={vi.fn()} />)
    const todoCol = screen.getByRole('region', { name: /to do/i })
    const doneCol = screen.getByRole('region', { name: /done/i  })
    expect(within(todoCol).getByRole('article', { name: /fix login bug/i  })).toBeInTheDocument()
    expect(within(doneCol).getByRole('article', { name: /code review/i    })).toBeInTheDocument()
    expect(within(todoCol).queryByRole('article', { name: /code review/i  })).not.toBeInTheDocument()
  })

  it('renders priority badges', () => {
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={vi.fn()} />)
    expect(screen.getAllByText('high').length).toBeGreaterThan(0)
  })
})

describe('KanbanWidget Ã¢â‚¬â€ search', () => {
  it('hides non-matching cards', () => {
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: /search cards/i }), {
      target: { value: 'login' },
    })
    expect(screen.getByRole('article', { name: /fix login bug/i })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: /write tests/i })).not.toBeInTheDocument()
  })

  it('shows "no matching cards" in empty columns after filtering', () => {
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: /search cards/i }), {
      target: { value: 'login' },
    })
    const doneCol = screen.getByRole('region', { name: /done/i })
    expect(within(doneCol).getByText(/no matching cards/i)).toBeInTheDocument()
  })

  it('column header count is not affected by search (shows total, not filtered)', () => {
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: /search cards/i }), {
      target: { value: 'login' },   
    })
    const todoCol = screen.getByRole('region', { name: /to do/i })

    expect(within(todoCol).getByText('2')).toBeInTheDocument()
  })
})

describe('KanbanWidget Ã¢â‚¬â€ drag and drop', () => {
  it('moves a card to the target column on drop', () => {
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={vi.fn()} />)
    const card       = screen.getByRole('article', { name: /write tests/i })
    const doneCol    = screen.getByRole('region',  { name: /done/i })

    fireEvent.dragStart(card)
    fireEvent.drop(doneCol)

    expect(within(doneCol).getByRole('article', { name: /write tests/i })).toBeInTheDocument()
  })

  it('fires itemMove with fromStatus, toStatus, and updated item', () => {
    const onEvent = vi.fn()
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={onEvent} />)
    const card    = screen.getByRole('article', { name: /write tests/i })
    const doneCol = screen.getByRole('region',  { name: /done/i })

    fireEvent.dragStart(card)
    fireEvent.drop(doneCol)

    expect(onEvent).toHaveBeenCalledWith('itemMove', expect.objectContaining({
      fromStatus: 'todo',
      toStatus:   'done',
    }))
  })

  it('does not move a card when dropping on its own column', () => {
    const onEvent = vi.fn()
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={onEvent} />)
    const todoCol = screen.getByRole('region', { name: /to do/i })
    const card    = within(todoCol).getByRole('article', { name: /write tests/i })

    fireEvent.dragStart(card)
    fireEvent.drop(todoCol)

    expect(onEvent).not.toHaveBeenCalledWith('itemMove', expect.anything())
  })
})

describe('KanbanWidget Ã¢â‚¬â€ WIP limits', () => {
  it('does not move the card when the target column is at its limit', () => {

    const atLimit = [
      ...ITEMS,
      { id: 5, title: 'Extra task', status: 'inprogress', priority: 'low' },
    ]
    render(<KanbanWidget component={makeComponent()} data={atLimit} runtime={makeRuntime()} onEvent={vi.fn()} />)

    const card         = screen.getByRole('article',  { name: /fix login bug/i  })
    const inprogressCol = screen.getByRole('region',  { name: /in progress/i    })

    fireEvent.dragStart(card)
    fireEvent.drop(inprogressCol)


    const todoCol = screen.getByRole('region', { name: /to do/i })
    expect(within(todoCol).getByRole('article', { name: /fix login bug/i })).toBeInTheDocument()
  })

  it('fires columnFull when the WIP limit is reached', () => {
    const onEvent  = vi.fn()
    const atLimit  = [
      ...ITEMS,
      { id: 5, title: 'Extra task', status: 'inprogress', priority: 'low' },
    ]
    render(<KanbanWidget component={makeComponent()} data={atLimit} runtime={makeRuntime()} onEvent={onEvent} />)

    const card          = screen.getByRole('article', { name: /fix login bug/i })
    const inprogressCol = screen.getByRole('region',  { name: /in progress/i   })

    fireEvent.dragStart(card)
    fireEvent.drop(inprogressCol)

    expect(onEvent).toHaveBeenCalledWith('columnFull', {
      columnId: 'inprogress',
      limit:    2,
    })
  })
})

describe('KanbanWidget Ã¢â‚¬â€ events', () => {
  it('fires itemClick with the card item', () => {
    const onEvent = vi.fn()
    render(<KanbanWidget component={makeComponent()} data={ITEMS} runtime={makeRuntime()} onEvent={onEvent} />)
    fireEvent.click(screen.getByRole('article', { name: /fix login bug/i }))
    expect(onEvent).toHaveBeenCalledWith('itemClick', {
      item: expect.objectContaining({ title: 'Fix login bug' }),
    })
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { AppComponent, App, DataSource } from '../src/types'
import { PropertiesPanel } from '../src/builder/PropertiesPanel'



const { getState, setState, mockUpdate, mockRemove, mockSelect } = vi.hoisted(() => {
  const mockUpdate = vi.fn()
  const mockRemove = vi.fn()
  const mockSelect = vi.fn()
  let _state: Record<string, unknown> = {}
  return {
    getState: () => _state,
    setState: (s: Record<string, unknown>) => { _state = s },
    mockUpdate,
    mockRemove,
    mockSelect,
  }
})

vi.mock('../src/store/builderStore', () => ({
  useBuilderStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector(getState()),
}))



const mockButton: AppComponent = {
  id: 'btn-test-id-12345678',
  type: 'button',
  props: { text: 'Click Me', variant: 'primary', disabled: false },
  events: { click: '' },
}


const mockContainer: AppComponent = {
  id: 'cnt-test-id-12345678',
  type: 'container',
  props: { title: '', layout: 'column', padding: '16px', gap: '12px', bordered: true, cols: 2, background: '' },
  events: {},
}

const baseApp: App = {
  id: 'app-test', name: 'Test',
  components: [], dataSources: [],
  createdAt: 0, updatedAt: 0,
}

function buildState(opts: {
  selectedId?: string | null
  components?: AppComponent[]
  dataSources?: DataSource[]
} = {}) {
  return {
    app: {
      ...baseApp,
      components:  opts.components  ?? [mockButton],
      dataSources: opts.dataSources ?? [],
    },
    selectedId:      opts.selectedId !== undefined ? opts.selectedId : mockButton.id,
    updateComponent: mockUpdate,
    removeComponent: mockRemove,
    selectComponent: mockSelect,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setState(buildState())
})


describe('empty state', () => {
  it('shows placeholder when nothing is selected', () => {
    setState(buildState({ selectedId: null }))
    render(<PropertiesPanel />)
    expect(screen.getByText('Select a component')).toBeInTheDocument()
  })

  it('shows placeholder when selected id does not match any component', () => {
    setState(buildState({ selectedId: 'ghost-id' }))
    render(<PropertiesPanel />)
    expect(screen.getByText('Select a component')).toBeInTheDocument()
  })
})

describe('header', () => {
  it('shows the component label', () => {
    render(<PropertiesPanel />)
    expect(screen.getByText('Button')).toBeInTheDocument()
  })

  it('shows the first 8 characters of the component id', () => {
    render(<PropertiesPanel />)
    expect(screen.getByText('btn-test')).toBeInTheDocument()
  })
})

describe('props — string', () => {
  it('renders a text input for a string prop', () => {
    render(<PropertiesPanel />)
    const input = screen.getByRole('textbox', { name: /^text$/i })
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement).value).toBe('Click Me')
  })

  it('text change calls updateComponent with the new value', () => {
    render(<PropertiesPanel />)
    fireEvent.change(screen.getByRole('textbox', { name: /^text$/i }), {
      target: { value: 'Submit' },
    })
    expect(mockUpdate).toHaveBeenCalledWith(mockButton.id, {
      props: expect.objectContaining({ text: 'Submit' }),
    })
  })

  it('updating one prop preserves all other prop values', () => {
    render(<PropertiesPanel />)
    fireEvent.change(screen.getByRole('textbox', { name: /^text$/i }), {
      target: { value: 'New Label' },
    })
    expect(mockUpdate.mock.calls[0][1].props).toMatchObject({
      text: 'New Label', variant: 'primary', disabled: false,
    })
  })
})

describe('props — boolean', () => {
  it('renders a toggle for a boolean prop', () => {
    render(<PropertiesPanel />)
    const toggle = screen.getByRole('switch', { name: /disabled/i })
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking the toggle flips the value', () => {
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('switch', { name: /disabled/i }))
    expect(mockUpdate).toHaveBeenCalledWith(mockButton.id, {
      props: expect.objectContaining({ disabled: true }),
    })
  })
})

describe('props — number', () => {
  beforeEach(() => {
    setState(buildState({ components: [mockContainer], selectedId: mockContainer.id }))
  })

  it('renders a number input for a numeric prop', () => {
    render(<PropertiesPanel />)
    const input = screen.getByRole('spinbutton', { name: /cols/i })
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement).value).toBe('2')
  })

  it('number change calls updateComponent with a parsed number', () => {
    render(<PropertiesPanel />)
    fireEvent.change(screen.getByRole('spinbutton', { name: /cols/i }), {
      target: { value: '4' },
    })
    expect(mockUpdate).toHaveBeenCalledWith(mockContainer.id, {
      props: expect.objectContaining({ cols: 4 }),
    })
  })
})

describe('header actions', () => {
  it('delete button calls removeComponent', () => {
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete component' }))
    expect(mockRemove).toHaveBeenCalledWith(mockButton.id)
  })

  it('delete button also clears the selection', () => {
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete component' }))
    expect(mockSelect).toHaveBeenCalledWith(null)
  })

  it('deselect button calls selectComponent(null) without deleting', () => {
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Deselect' }))
    expect(mockSelect).toHaveBeenCalledWith(null)
    expect(mockRemove).not.toHaveBeenCalled()
  })
})

describe('events section', () => {
  it('is collapsed by default', () => {
    render(<PropertiesPanel />)
    expect(screen.queryByPlaceholderText('// expression')).not.toBeInTheDocument()
  })

  it('expanding the section reveals expression editors', () => {
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByText('Events'))
    expect(screen.getByPlaceholderText('// expression')).toBeInTheDocument()
  })

  it('expression change calls updateComponent', () => {
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByText('Events'))
    fireEvent.change(screen.getByPlaceholderText('// expression'), {
      target: { value: 'console.log("clicked")' },
    })
    expect(mockUpdate).toHaveBeenCalledWith(mockButton.id, {
      events: expect.objectContaining({ click: 'console.log("clicked")' }),
    })
  })

  it('shows a badge for filled event expressions', () => {
    const withExpr = { ...mockButton, events: { click: 'doSomething()' } }
    setState(buildState({ components: [withExpr], selectedId: withExpr.id }))
    render(<PropertiesPanel />)
    
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('is not rendered at all for components with no events', () => {
    setState(buildState({ components: [mockContainer], selectedId: mockContainer.id }))
    render(<PropertiesPanel />)
    expect(screen.queryByText('Events')).not.toBeInTheDocument()
  })
})

describe('data source section', () => {
  it('is collapsed by default', () => {
    render(<PropertiesPanel />)
    
    expect(screen.queryByText(/no data sources yet/i)).not.toBeInTheDocument()
  })

  it('shows empty message when no data sources are configured', () => {
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByText('Data source'))
    expect(screen.getByText(/no data sources yet/i)).toBeInTheDocument()
  })

  it('shows a dropdown when data sources exist', () => {
    const ds: DataSource = { id: 'ds-1', name: 'Users API', type: 'rest' }
    setState(buildState({ dataSources: [ds] }))
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByText('Data source'))
    expect(screen.getByRole('combobox', { name: /attached source/i })).toBeInTheDocument()
    expect(screen.getByText('Users API')).toBeInTheDocument()
  })

  it('selecting a source calls updateComponent with the id', () => {
    const ds: DataSource = { id: 'ds-1', name: 'Users API', type: 'rest' }
    setState(buildState({ dataSources: [ds] }))
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByText('Data source'))
    fireEvent.change(screen.getByRole('combobox', { name: /attached source/i }), {
      target: { value: 'ds-1' },
    })
    expect(mockUpdate).toHaveBeenCalledWith(mockButton.id, { dataSourceId: 'ds-1' })
  })

  it('selecting None sets dataSourceId to undefined', () => {
    const ds: DataSource = { id: 'ds-1', name: 'Users API', type: 'rest' }
    const btnWithDs = { ...mockButton, dataSourceId: 'ds-1' }
    setState(buildState({ components: [btnWithDs], dataSources: [ds] }))
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByText('Data source'))
    fireEvent.change(screen.getByRole('combobox', { name: /attached source/i }), {
      target: { value: '' },
    })
    expect(mockUpdate).toHaveBeenCalledWith(btnWithDs.id, { dataSourceId: undefined })
  })
})
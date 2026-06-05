import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Canvas } from '../src/builder/Canvas'
import type { App, AppComponent } from '../src/types'



vi.mock('../src/builder/ComponentPalette', () => ({
  ComponentPalette: () => <div data-testid="palette">Palette</div>,
}))
vi.mock('../src/builder/PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties">Properties</div>,
}))
vi.mock('../src/builder/DragOverlayContent', () => ({
  DragOverlayContent: () => null,
}))



vi.mock('../src/services/dataSourceManager', () => ({
  dataSourceManager: { execute: vi.fn().mockResolvedValue([]) },
}))

vi.mock('../src/core/stateManager', () => ({
  runtimeState: {
    get stateRef() { return {} },
    set: vi.fn(),
  },
}))

vi.mock('../src/core/eventBus', () => ({
  eventBus: {
    on:  vi.fn(() => vi.fn()),   
    off: vi.fn(),
  },
}))



const { getState, setState, mockAdd, mockRemove, mockReorder, mockSelect } = vi.hoisted(() => {
  const mockAdd     = vi.fn()
  const mockRemove  = vi.fn()
  const mockReorder = vi.fn()
  const mockSelect  = vi.fn()
  let _state: Record<string, unknown> = {}
  return {
    getState: () => _state,
    setState: (s: Record<string, unknown>) => { _state = s },
    mockAdd, mockRemove, mockReorder, mockSelect,
  }
})

vi.mock('../src/store/builderStore', () => ({
  useBuilderStore: (sel: (s: Record<string, unknown>) => unknown) => sel(getState()),
}))



const BASE_APP: App = {
  id: 'app-1', name: 'Test',
  components: [], dataSources: [],
  createdAt: 0, updatedAt: 0,
}

const BUTTON: AppComponent = {
  id: 'btn-1', type: 'button',
  props: { text: 'Click Me', variant: 'primary', disabled: false },
  events: { click: '' },
}

function buildState(overrides: Partial<App> = {}, selectedId: string | null = null) {
  return {
    app:               { ...BASE_APP, ...overrides },
    selectedId,
    addComponent:      mockAdd,
    removeComponent:   mockRemove,
    reorderComponents: mockReorder,
    selectComponent:   mockSelect,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setState(buildState())
})



describe('Canvas — structure', () => {
  it('renders the palette sidebar', () => {
    render(<Canvas />)
    expect(screen.getByTestId('palette')).toBeInTheDocument()
  })

  it('renders the properties panel', () => {
    render(<Canvas />)
    expect(screen.getByTestId('properties')).toBeInTheDocument()
  })

  it('shows empty canvas message when there are no components', () => {
    render(<Canvas />)
    expect(screen.getByText(/drag from the palette/i)).toBeInTheDocument()
  })
})

describe('Canvas — component rendering', () => {
  it('renders a widget for each component in the store', () => {
    setState(buildState({ components: [BUTTON] }))
    render(<Canvas />)
    
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('shows an error box for unknown component types', () => {
    const unknown: AppComponent = {
      id: 'x', type: 'unknowntype', props: {}, events: {},
    }
    setState(buildState({ components: [unknown] }))
    render(<Canvas />)
    expect(screen.getByText(/unknown component/i)).toBeInTheDocument()
  })
})

describe('Canvas — selection', () => {
  it.skip('clicking the background calls selectComponent(null)', () => {
    setState(buildState({ components: [BUTTON] }, 'btn-1'))
    render(<Canvas />)
    
    const center = screen.getByText(/Click Me/).closest('[class*="flex-1"]')
    center && fireEvent.click(center.parentElement!)
    expect(mockSelect).toHaveBeenCalledWith(null)
  })

  it('clicking a component calls selectComponent with its id', () => {
    setState(buildState({ components: [BUTTON] }))
    render(<Canvas />)
    fireEvent.click(screen.getByText('Click Me'))
    expect(mockSelect).toHaveBeenCalledWith('btn-1')
  })

  it('renders the selection ring on the selected component', () => {
    setState(buildState({ components: [BUTTON] }, 'btn-1'))
    const { container } = render(<Canvas />)
    expect(container.querySelector('.ring-blue-500')).toBeInTheDocument()
  })
})

describe('Canvas — delete key', () => {
  it('Delete key calls removeComponent when a component is selected', () => {
    setState(buildState({ components: [BUTTON] }, 'btn-1'))
    render(<Canvas />)
    fireEvent.keyDown(document, { key: 'Delete' })
    expect(mockRemove).toHaveBeenCalledWith('btn-1')
  })

  it('Delete key is ignored when nothing is selected', () => {
    setState(buildState({ components: [BUTTON] }, null))
    render(<Canvas />)
    fireEvent.keyDown(document, { key: 'Delete' })
    expect(mockRemove).not.toHaveBeenCalled()
  })
})

describe('Canvas — toolbar actions', () => {
  it('toolbar Delete button calls removeComponent', () => {
    setState(buildState({ components: [BUTTON] }, 'btn-1'))
    render(<Canvas />)
    fireEvent.click(screen.getByRole('button', { name: /delete button/i }))
    expect(mockRemove).toHaveBeenCalledWith('btn-1')
  })
})
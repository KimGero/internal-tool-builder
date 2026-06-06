import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Canvas } from '../src/builder/Canvas'
import { DndContext } from '@dnd-kit/core'

// Mock the store
let mockSelect = vi.fn()
let mockRemove = vi.fn()

const mockComponents = [
  { id: 'btn-1', type: 'button', props: { text: 'Click Me', variant: 'primary' }, events: {} },
  { id: 'input-1', type: 'input', props: { placeholder: 'Enter text' }, events: {} },
]

vi.mock('../src/store/builderStore', () => ({
  useBuilderStore: vi.fn(),
}))

import { useBuilderStore } from '../src/store/builderStore'

// Mock the widget registry
vi.mock('../src/components/registry', () => ({
  REGISTRY: {
    button: { Widget: () => <button>Mock Button</button> },
    input: { Widget: () => <input placeholder="Mock Input" /> },
  },
  getComponentList: () => [],
}))

// Mock child components
vi.mock('../src/builder/SortableWidget', () => ({
  SortableWidget: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('../src/widgets/WidgetRenderer', () => ({
  WidgetRenderer: ({ component }: any) => (
    <div data-testid={`widget-${component.type}`}>
      {component.type === 'button' ? 'Mock Button' : 'Mock Input'}
    </div>
  ),
}))

function WrappedCanvas() {
  return (
    <DndContext>
      <Canvas />
    </DndContext>
  )
}

describe('Canvas — component rendering', () => {
  beforeEach(() => {
    mockSelect = vi.fn()
    mockRemove = vi.fn()
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      return selector({
        app: { components: mockComponents },
        selectedId: null,
        selectComponent: mockSelect,
        removeComponent: mockRemove,
      })
    })
  })

  it('renders a widget for each component in the store', () => {
    render(<WrappedCanvas />)
    expect(screen.getByText('Mock Button')).toBeInTheDocument()
    expect(screen.getByText('Mock Input')).toBeInTheDocument()
  })

  it('shows empty canvas message when there are no components', () => {
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      return selector({
        app: { components: [] },
        selectedId: null,
        selectComponent: mockSelect,
        removeComponent: mockRemove,
      })
    })
    render(<WrappedCanvas />)
    expect(screen.getByText(/drag components here/i)).toBeInTheDocument()
  })
})

describe('Canvas — selection', () => {
  beforeEach(() => {
    mockSelect = vi.fn()
    mockRemove = vi.fn()
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      return selector({
        app: { components: mockComponents },
        selectedId: null,
        selectComponent: mockSelect,
        removeComponent: mockRemove,
      })
    })
  })

  it('clicking a component calls selectComponent with its id', () => {
    render(<WrappedCanvas />)
    const button = screen.getByText('Mock Button').closest('[class*="relative"]')
    if (button) fireEvent.click(button)
    expect(mockSelect).toHaveBeenCalledWith('btn-1')
  })
})

describe('Canvas — delete key', () => {
  beforeEach(() => {
    mockSelect = vi.fn()
    mockRemove = vi.fn()
  })

  it('Delete key calls removeComponent when a component is selected', () => {
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      return selector({
        app: { components: mockComponents },
        selectedId: 'btn-1',
        selectComponent: mockSelect,
        removeComponent: mockRemove,
      })
    })
    render(<WrappedCanvas />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(mockRemove).toHaveBeenCalledWith('btn-1')
    expect(mockRemove).toHaveBeenCalledTimes(1)
  })

  it('Delete key is ignored when nothing is selected', () => {
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      return selector({
        app: { components: mockComponents },
        selectedId: null,
        selectComponent: mockSelect,
        removeComponent: mockRemove,
      })
    })
    render(<WrappedCanvas />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(mockRemove).not.toHaveBeenCalled()
  })
})
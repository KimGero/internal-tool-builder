import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Canvas } from '../src/builder/Canvas'
import { useBuilderStore } from '../src/store/builderStore'

// Mock the registry
vi.mock('../src/components/registry', () => ({
  REGISTRY: {
    button: { 
      Widget: ({ component }: any) => <button data-testid={component.id}>{component.props.text || 'Mock Button'}</button>
    },
    input: { 
      Widget: ({ component }: any) => <input data-testid={component.id} placeholder={component.props.placeholder || 'Mock Input'} />
    },
  },
  getComponentList: vi.fn(() => [])
}))

vi.mock('../src/core/stateManager', () => ({
  runtimeState: { getAll: vi.fn(() => ({})) }
}))

describe('Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a widget for each component in the store', () => {
    const mockComponents = [
      { id: 'btn-1', type: 'button', props: { text: 'Mock Button' }, events: {} },
      { id: 'input-1', type: 'input', props: { placeholder: 'Mock Input' }, events: {} }
    ]
    
    useBuilderStore.setState({
      app: { components: mockComponents, id: 'test', name: 'Test', dataSources: [], createdAt: 0, updatedAt: 0 },
      selectedId: null,
      isDirty: false,
      past: [],
      future: [],
    })
    
    render(<Canvas previewMode={false} />)
    expect(screen.getByTestId('btn-1')).toBeInTheDocument()
    expect(screen.getByTestId('input-1')).toBeInTheDocument()
  })

  it('shows empty canvas message when there are no components', () => {
    useBuilderStore.setState({
      app: { components: [], id: 'test', name: 'Test', dataSources: [], createdAt: 0, updatedAt: 0 },
      selectedId: null,
      isDirty: false,
      past: [],
      future: [],
    })
    
    render(<Canvas previewMode={false} />)
    expect(screen.getByText(/start building/i)).toBeInTheDocument()
  })

  it('clicking a component calls selectComponent with its id', () => {
    const mockSelectComponent = vi.fn()
    const mockComponents = [
      { id: 'btn-1', type: 'button', props: { text: 'Mock Button' }, events: {} }
    ]
    
    useBuilderStore.setState({
      app: { components: mockComponents, id: 'test', name: 'Test', dataSources: [], createdAt: 0, updatedAt: 0 },
      selectedId: null,
      isDirty: false,
      past: [],
      future: [],
      selectComponent: mockSelectComponent,
    } as any)
    
    render(<Canvas previewMode={false} />)
    const button = screen.getByTestId('btn-1')
    fireEvent.click(button)
    expect(mockSelectComponent).toHaveBeenCalledWith('btn-1')
  })

  it('Delete key calls removeComponent when a component is selected', () => {
    const mockRemoveComponent = vi.fn()
    const mockComponents = [
      { id: 'btn-1', type: 'button', props: { text: 'Mock Button' }, events: {} }
    ]
    
    useBuilderStore.setState({
      app: { components: mockComponents, id: 'test', name: 'Test', dataSources: [], createdAt: 0, updatedAt: 0 },
      selectedId: 'btn-1',
      isDirty: false,
      past: [],
      future: [],
      removeComponent: mockRemoveComponent,
    } as any)
    
    render(<Canvas previewMode={false} />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(mockRemoveComponent).toHaveBeenCalledWith('btn-1')
  })

  it('Delete key is ignored when nothing is selected', () => {
    const mockRemoveComponent = vi.fn()
    const mockComponents = [
      { id: 'btn-1', type: 'button', props: { text: 'Mock Button' }, events: {} }
    ]
    
    useBuilderStore.setState({
      app: { components: mockComponents, id: 'test', name: 'Test', dataSources: [], createdAt: 0, updatedAt: 0 },
      selectedId: null,
      isDirty: false,
      past: [],
      future: [],
      removeComponent: mockRemoveComponent,
    } as any)
    
    render(<Canvas previewMode={false} />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(mockRemoveComponent).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { ComponentPalette } from '../src/builder/ComponentPalette'


function Wrapped() {
  return (
    <DndContext>
      <ComponentPalette />
    </DndContext>
  )
}


const mockAdd = vi.fn()
vi.mock('../src/store/builderStore', () => ({
  useBuilderStore: (selector: (s: { addComponent: typeof mockAdd }) => unknown) =>
    selector({ addComponent: mockAdd }),
}))

beforeEach(() => {
  mockAdd.mockClear()
})

describe('ComponentPalette', () => {
  it('renders a tile for every registered component', () => {
    render(<Wrapped />)
    
    expect(screen.getByText('Button')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
  })

  it('calls addComponent when a tile is clicked', () => {
    render(<Wrapped />)
    fireEvent.click(screen.getByText('Button'))
    expect(mockAdd).toHaveBeenCalledTimes(1)
  })

  it('addComponent receives the correct type', () => {
    render(<Wrapped />)
    fireEvent.click(screen.getByText('Input'))
    const [component] = mockAdd.mock.calls[0]
    expect(component.type).toBe('input')
  })

  it('generated component has a UUID id', () => {
    render(<Wrapped />)
    fireEvent.click(screen.getByText('Button'))
    const [component] = mockAdd.mock.calls[0]
    expect(component.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('generated component has defaultProps from the definition', () => {
    render(<Wrapped />)
    fireEvent.click(screen.getByText('Button'))
    const [component] = mockAdd.mock.calls[0]
    expect(component.props.text).toBe('Click Me')
    expect(component.props.variant).toBe('primary')
  })

  it('generated component has defaultEvents from the definition', () => {
    render(<Wrapped />)
    fireEvent.click(screen.getByText('Button'))
    const [component] = mockAdd.mock.calls[0]
    expect(component.events).toHaveProperty('click')
  })

  it('each generated component gets a unique id', () => {
    render(<Wrapped />)
    fireEvent.click(screen.getByText('Button'))
    fireEvent.click(screen.getByText('Button'))
    const ids = mockAdd.mock.calls.map(([c]) => c.id)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('renders the drag hint footer', () => {
    render(<Wrapped />)
    expect(screen.getByText(/drag to canvas or click/i)).toBeInTheDocument()
  })
})

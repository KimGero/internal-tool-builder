import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ComponentPalette } from '../src/builder/ComponentPalette'
import { useBuilderStore } from '../src/store/builderStore'

describe('ComponentPalette', () => {
  beforeEach(() => {
    // Reset the store directly without using newApp
    const store = useBuilderStore.getState()
    useBuilderStore.setState({
      app: {
        id: crypto.randomUUID(),
        name: 'Untitled App',
        components: [],
        dataSources: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      selectedId: null,
      isDirty: false,
      past: [],
      future: [],
      toasts: [],
    })
  })

  it('renders a tile for every registered component', () => {
    render(<ComponentPalette />)
    expect(screen.getByText('Button')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
  })

  it('adds a component when a tile is clicked', async () => {
    render(<ComponentPalette />)
    const initialCount = useBuilderStore.getState().app.components.length
    
    const buttonTile = screen.getByText('Button')
    fireEvent.click(buttonTile)
    
    await waitFor(() => {
      const newCount = useBuilderStore.getState().app.components.length
      expect(newCount).toBe(initialCount + 1)
    })
  })

  it('added component has the correct type', async () => {
    render(<ComponentPalette />)
    const buttonTile = screen.getByText('Button')
    fireEvent.click(buttonTile)
    
    await waitFor(() => {
      const components = useBuilderStore.getState().app.components
      expect(components.length).toBeGreaterThan(0)
      const addedComponent = components[components.length - 1]
      expect(addedComponent.type).toBe('button')
    })
  })

  it('added component has a valid id', async () => {
    render(<ComponentPalette />)
    const buttonTile = screen.getByText('Button')
    fireEvent.click(buttonTile)
    
    await waitFor(() => {
      const components = useBuilderStore.getState().app.components
      const addedComponent = components[components.length - 1]
      expect(addedComponent.id).toBeDefined()
      expect(typeof addedComponent.id).toBe('string')
      expect(addedComponent.id.length).toBeGreaterThan(0)
    })
  })

  it('added component has defaultProps from the definition', async () => {
    render(<ComponentPalette />)
    const buttonTile = screen.getByText('Button')
    fireEvent.click(buttonTile)
    
    await waitFor(() => {
      const components = useBuilderStore.getState().app.components
      const addedComponent = components[components.length - 1]
      expect(addedComponent.props).toEqual({ text: 'Click' })
    })
  })

  it('added component has defaultEvents from the definition', async () => {
    render(<ComponentPalette />)
    const buttonTile = screen.getByText('Button')
    fireEvent.click(buttonTile)
    
    await waitFor(() => {
      const components = useBuilderStore.getState().app.components
      const addedComponent = components[components.length - 1]
      expect(addedComponent.events).toEqual({})
    })
  })

  it('each click adds a unique component', async () => {
    render(<ComponentPalette />)
    const buttonTile = screen.getByText('Button')
    fireEvent.click(buttonTile)
    fireEvent.click(buttonTile)
    
    await waitFor(() => {
      const components = useBuilderStore.getState().app.components
      expect(components).toHaveLength(2)
      expect(components[0].id).not.toBe(components[1].id)
    })
  })

  it('renders the drag hint footer', () => {
    render(<ComponentPalette />)
    expect(screen.getByText(/drag to canvas · click to add/i)).toBeInTheDocument()
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../src/App'
import { useBuilderStore } from '../src/store/builderStore'

// Mock child components
vi.mock('../src/builder/ComponentPalette', () => ({
  ComponentPalette: () => <div data-testid="component-palette">ComponentPalette</div>
}))

vi.mock('../src/builder/PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties-panel">PropertiesPanel</div>
}))

vi.mock('../src/builder/Canvas', () => ({
  Canvas: ({ previewMode }: { previewMode?: boolean }) => (
    <div data-testid="canvas" data-preview={previewMode ? 'true' : 'false'}>
      Canvas {previewMode ? '(Preview Mode)' : '(Design Mode)'}
    </div>
  )
}))

vi.mock('../src/builder/DataSourcePanel', () => ({
  DataSourcePanel: () => <div data-testid="data-source-panel">DataSourcePanel</div>
}))

vi.mock('../src/builder/SaveLoadDialog', () => ({
  SaveLoadDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="save-load-dialog">
      SaveLoadDialog
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('../src/components/ui/Toast', () => ({
  ToastContainer: () => <div data-testid="toast-container">ToastContainer</div>
}))

vi.mock('../src/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn()
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBuilderStore.setState({
      app: {
        id: 'test',
        name: 'Test App',
        components: [],
        dataSources: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      selectedId: null,
      isDirty: false,
      past: [],
      future: [],
    })
  })

  it('renders all three panels in design mode', () => {
    render(<App />)
    expect(screen.getByTestId('component-palette')).toBeInTheDocument()
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
  })

  it('canvas is not in preview mode by default', () => {
    render(<App />)
    const canvas = screen.getByTestId('canvas')
    expect(canvas.dataset.preview).toBe('false')
  })

  it('shows data source panel when Data mode is selected', () => {
    render(<App />)
    const dataButton = screen.getByRole('button', { name: /data/i })
    fireEvent.click(dataButton)
    expect(screen.getByTestId('data-source-panel')).toBeInTheDocument()
  })

  it('hides sidebars in preview mode', () => {
    render(<App />)
    const previewButton = screen.getByRole('button', { name: /preview/i })
    fireEvent.click(previewButton)
    expect(screen.queryByTestId('component-palette')).not.toBeInTheDocument()
    expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument()
  })

  it('displays the current app name', () => {
    render(<App />)
    const nameInput = screen.getByLabelText('App name')
    expect(nameInput).toBeInTheDocument()
  })

  it('design button is pressed by default', () => {
    render(<App />)
    const designButton = screen.getByRole('button', { name: /design/i })
    expect(designButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens apps dialog when Apps button is clicked', () => {
    render(<App />)
    const appsButton = screen.getByRole('button', { name: /apps/i })
    fireEvent.click(appsButton)
    expect(screen.getByTestId('save-load-dialog')).toBeInTheDocument()
  })
})

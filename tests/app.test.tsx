import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../src/App'
import type { App as AppType } from '../src/types'



vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core')
  return {
    ...actual,
    DndContext:  ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DragOverlay: () => null,
    useSensors:  () => [],
    useSensor:   () => null,
  }
})

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/sortable')>('@dnd-kit/sortable')
  return { ...actual, arrayMove: vi.fn((arr: unknown[], f: number, t: number) => {
    const r = [...arr]; const [x] = r.splice(f, 1); r.splice(t, 0, x); return r
  }) }
})



vi.mock('../src/builder/ComponentPalette', () => ({
  ComponentPalette: () => <div data-testid="component-palette" />,
}))
vi.mock('../src/builder/Canvas', () => ({
  Canvas: ({ previewMode }: { previewMode: boolean }) => (
    <div data-testid="canvas" data-preview={String(previewMode)} />
  ),
}))
vi.mock('../src/builder/PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties-panel" />,
}))
vi.mock('../src/builder/DataSourcePanel', () => ({
  DataSourcePanel: () => <div data-testid="data-source-panel" />,
}))
vi.mock('../src/builder/DragOverlayContent', () => ({
  DragOverlayContent: () => null,
}))



const { getState, setState, mockSetName, mockNewApp, mockMarkClean } = vi.hoisted(() => {
  const mockSetName   = vi.fn()
  const mockNewApp    = vi.fn()
  const mockMarkClean = vi.fn()
  let _state: Record<string, unknown> = {}
  return {
    getState:    () => _state,
    setState:    (s: Record<string, unknown>) => { _state = s },
    mockSetName, mockNewApp, mockMarkClean,
    mockAdd:     vi.fn(),
    mockReorder: vi.fn(),
  }
})

vi.mock('../src/store/builderStore', () => ({
  useBuilderStore: (sel: (s: Record<string, unknown>) => unknown) => sel(getState()),
}))

const baseApp: AppType = {
  id: 'app-1', name: 'My App',
  components: [], dataSources: [],
  createdAt: 0, updatedAt: 0,
}

function buildState(overrides: Record<string, unknown> = {}) {
  return {
    app:             baseApp,
    isDirty:         false,
    setName:         mockSetName,
    newApp:          mockNewApp,
    markClean:       mockMarkClean,
    addComponent:    vi.fn(),
    reorderComponents: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setState(buildState())
})


describe('design mode — default', () => {
  it('renders all three panels', () => {
    render(<App />)
    expect(screen.getByTestId('component-palette')).toBeInTheDocument()
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
  })

  it('canvas is not in preview mode', () => {
    render(<App />)
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-preview', 'false')
  })

  it('data source panel is not shown', () => {
    render(<App />)
    expect(screen.queryByTestId('data-source-panel')).not.toBeInTheDocument()
  })
})

describe('data mode', () => {
  function switchToData() {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /data/i }))
  }

  it('shows the data source panel', () => {
    switchToData()
    expect(screen.getByTestId('data-source-panel')).toBeInTheDocument()
  })

  it('hides the canvas', () => {
    switchToData()
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument()
  })

  it('hides both sidebars', () => {
    switchToData()
    expect(screen.queryByTestId('component-palette')).not.toBeInTheDocument()
    expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument()
  })
})

describe('preview mode', () => {
  function switchToPreview() {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /preview/i }))
  }

  it('canvas is in preview mode', () => {
    switchToPreview()
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-preview', 'true')
  })

  it('hides both sidebars', () => {
    switchToPreview()
    expect(screen.queryByTestId('component-palette')).not.toBeInTheDocument()
    expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument()
  })

  it('data source panel is not shown', () => {
    switchToPreview()
    expect(screen.queryByTestId('data-source-panel')).not.toBeInTheDocument()
  })
})

describe('top bar — app name', () => {
  it('displays the current app name', () => {
    render(<App />)
    expect((screen.getByRole('textbox', { name: /app name/i }) as HTMLInputElement).value)
      .toBe('My App')
  })

  it('editing the name calls setName', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: /app name/i }), {
      target: { value: 'My Dashboard' },
    })
    expect(mockSetName).toHaveBeenCalledWith('My Dashboard')
  })
})

describe('top bar — save', () => {
  it('save button is hidden when the app is not dirty', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })

  it('save button is shown when the app is dirty', () => {
    setState(buildState({ isDirty: true }))
    render(<App />)
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('clicking save calls markClean', () => {
    setState(buildState({ isDirty: true }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(mockMarkClean).toHaveBeenCalled()
  })
})

describe('top bar — new app', () => {
  it('calls newApp immediately when the app is not dirty', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /new app/i }))
    expect(mockNewApp).toHaveBeenCalled()
  })

  it('shows a confirmation dialog when the app is dirty', () => {
    setState(buildState({ isDirty: true }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /new app/i }))
    expect(confirm).toHaveBeenCalled()
    expect(mockNewApp).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('proceeds with new app when the user confirms', () => {
    setState(buildState({ isDirty: true }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /new app/i }))
    expect(mockNewApp).toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('switches back to design mode after creating a new app', () => {
    
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /preview/i }))
    expect(screen.queryByTestId('canvas')).toHaveAttribute('data-preview', 'true')
    fireEvent.click(screen.getByRole('button', { name: /new app/i }))
    
    expect(screen.getByTestId('component-palette')).toBeInTheDocument()
  })
})

describe('mode tab — active state', () => {
  it('design button is pressed by default', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /design/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switching mode updates aria-pressed correctly', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /preview/i }))
    expect(screen.getByRole('button', { name: /preview/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /design/i })).toHaveAttribute('aria-pressed', 'false')
  })
})
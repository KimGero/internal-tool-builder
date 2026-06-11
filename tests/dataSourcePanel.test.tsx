import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataSourcePanel } from '../src/builder/DataSourcePanel'
import type { App, DataSource } from '../src/types'

// Hoist mocks to avoid initialization issues
const { getState, setState, mockAdd, mockUpdate, mockRemove, mockExecute } = vi.hoisted(() => {
  const mockAdd    = vi.fn()
  const mockUpdate = vi.fn()
  const mockRemove = vi.fn()
  const mockExecute = vi.fn()
  let _state: Record<string, unknown> = {}
  return {
    getState: () => _state,
    setState: (s: Record<string, unknown>) => { _state = s },
    mockAdd, mockUpdate, mockRemove, mockExecute,
  }
})

// Mock the store BEFORE imports
vi.mock('../src/store/builderStore', () => ({
  useBuilderStore: (sel: (s: Record<string, unknown>) => unknown) => sel(getState()),
}))

// Mock the dataSourceManager with mockExecute
vi.mock('../src/services/dataSourceManager', () => ({
  dataSourceManager: { 
    execute: (...args: any[]) => mockExecute(...args),
    testConnection: vi.fn(),
    getDataSources: vi.fn().mockReturnValue([]),
  },
}))

const BASE_APP: App = {
  id: 'app-1', name: 'Test',
  components: [], dataSources: [],
  createdAt: 0, updatedAt: 0,
}

function buildState(dataSources: DataSource[] = []) {
  return {
    app:               { ...BASE_APP, dataSources },
    addDataSource:     mockAdd,
    updateDataSource:  mockUpdate,
    removeDataSource:  mockRemove,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setState(buildState())
})

const openForm = () => fireEvent.click(screen.getByRole('button', { name: /add data source/i }))

describe('DataSourcePanel — empty state', () => {
  it('shows empty message when no sources', () => {
    render(<DataSourcePanel />)
    expect(screen.getByText(/no data sources yet/i)).toBeInTheDocument()
  })

  it('does not show empty message when sources exist', () => {
    setState(buildState([{ id: 'ds-1', name: 'Users', type: 'rest', url: 'https://x.com' }]))
    render(<DataSourcePanel />)
    expect(screen.queryByText(/no data sources yet/i)).not.toBeInTheDocument()
  })
})

describe('DataSourcePanel — source list', () => {
  it('renders each configured source', () => {
    setState(buildState([
      { id: 'ds-1', name: 'Users API', type: 'rest' },
      { id: 'ds-2', name: 'Stats',    type: 'javascript' },
    ]))
    render(<DataSourcePanel />)
    expect(screen.getByText('Users API')).toBeInTheDocument()
    expect(screen.getByText('Stats')).toBeInTheDocument()
  })

  it('delete button calls removeDataSource', () => {
    setState(buildState([{ id: 'ds-1', name: 'Users API', type: 'rest' }]))
    render(<DataSourcePanel />)
    fireEvent.click(screen.getByRole('button', { name: /delete users api/i }))
    expect(mockRemove).toHaveBeenCalledWith('ds-1')
  })
})

describe('DataSourcePanel — add form', () => {
  it('form is hidden initially', () => {
    render(<DataSourcePanel />)
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('clicking Add opens the form', () => {
    render(<DataSourcePanel />)
    openForm()
    expect(screen.getByRole('form', { name: /data source form/i })).toBeInTheDocument()
  })

  it('Cancel closes the form', () => {
    render(<DataSourcePanel />)
    openForm()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('form shows URL field for REST type by default', () => {
    render(<DataSourcePanel />)
    openForm()
    expect(screen.getByRole('textbox', { name: /^url$/i })).toBeInTheDocument()
  })

  it('form shows code textarea when type is JavaScript', () => {
    render(<DataSourcePanel />)
    openForm()
    fireEvent.change(screen.getByRole('combobox', { name: /data source type/i }), {
      target: { value: 'javascript' },
    })
    expect(screen.getByRole('textbox', { name: /javascript code/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /^url$/i })).not.toBeInTheDocument()
  })

  it('hides body textarea for GET requests', () => {
    render(<DataSourcePanel />)
    openForm()
    expect(screen.queryByRole('textbox', { name: /request body/i })).not.toBeInTheDocument()
  })

  it('shows body textarea for POST requests', () => {
    render(<DataSourcePanel />)
    openForm()
    fireEvent.change(screen.getByRole('combobox', { name: /http method/i }), {
      target: { value: 'POST' },
    })
    expect(screen.getByRole('textbox', { name: /request body/i })).toBeInTheDocument()
  })

  it('Save is disabled until name + URL are filled', () => {
    render(<DataSourcePanel />)
    openForm()
    expect(screen.getByRole('button', { name: /save data source/i })).toBeDisabled()
  })

  it('Save calls addDataSource with a generated id', () => {
    render(<DataSourcePanel />)
    openForm()
    fireEvent.change(screen.getByRole('textbox', { name: /data source name/i }), {
      target: { value: 'My API' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /^url$/i }), {
      target: { value: 'https://api.example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save data source/i }))
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My API', url: 'https://api.example.com' })
    )
    expect(mockAdd.mock.calls[0][0].id).toBeTruthy()
  })

  it('closes the form after saving', () => {
    render(<DataSourcePanel />)
    openForm()
    fireEvent.change(screen.getByRole('textbox', { name: /data source name/i }), {
      target: { value: 'My API' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /^url$/i }), {
      target: { value: 'https://api.example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save data source/i }))
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })
})

describe('DataSourcePanel — edit', () => {
  const DS: DataSource = { id: 'ds-1', name: 'Users', type: 'rest', url: 'https://x.com/users' }

  it('Edit loads the existing values into the form', () => {
    setState(buildState([DS]))
    render(<DataSourcePanel />)
    fireEvent.click(screen.getByRole('button', { name: /edit users/i }))
    expect(screen.getByDisplayValue('Users')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://x.com/users')).toBeInTheDocument()
  })

  it('Save on edit calls updateDataSource, not addDataSource', () => {
    setState(buildState([DS]))
    render(<DataSourcePanel />)
    fireEvent.click(screen.getByRole('button', { name: /edit users/i }))
    fireEvent.click(screen.getByRole('button', { name: /save data source/i }))
    expect(mockUpdate).toHaveBeenCalledWith('ds-1', expect.objectContaining({ name: 'Users' }))
    expect(mockAdd).not.toHaveBeenCalled()
  })
})

describe('DataSourcePanel — test button', () => {
  it('Test calls dataSourceManager.execute', async () => {
    mockExecute.mockResolvedValueOnce([{ id: 1 }])
    render(<DataSourcePanel />)
    openForm()
    fireEvent.change(screen.getByRole('textbox', { name: /data source name/i }), {
      target: { value: 'Test' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /^url$/i }), {
      target: { value: 'https://api.example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /test data source/i }))
    await waitFor(() => expect(mockExecute).toHaveBeenCalled())
  })

  it('shows success result with row count', async () => {
    mockExecute.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
    render(<DataSourcePanel />)
    openForm()
    fireEvent.change(screen.getByRole('textbox', { name: /data source name/i }), {
      target: { value: 'Test' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /^url$/i }), {
      target: { value: 'https://api.example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /test data source/i }))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('2 rows')
  })

  it('shows error message when execute rejects', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Network error'))
    render(<DataSourcePanel />)
    openForm()
    fireEvent.change(screen.getByRole('textbox', { name: /data source name/i }), {
      target: { value: 'Test' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /^url$/i }), {
      target: { value: 'https://api.example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /test data source/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent('Network error')
  })
})
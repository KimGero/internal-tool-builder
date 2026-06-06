import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { App } from '../src/types'
import { SaveLoadDialog } from '../src/builder/SaveLoadDialog'


vi.mock('../src/services/appStorage')
import * as storage from '../src/services/appStorage'

const mockApp: App = {
  id: 'app-1', name: 'My App',
  components: [], dataSources: [],
  createdAt: 0, updatedAt: 0,
}

const mockMeta: storage.SaveMeta = {
  id: 'app-1', name: 'My App',
  savedAt: Date.now(), componentCount: 3,
}

const onLoad  = vi.fn()
const onClose = vi.fn()

function renderDialog() {
  render(<SaveLoadDialog currentApp={mockApp} onLoad={onLoad} onClose={onClose} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(storage.listSaves).mockReturnValue([])
  vi.mocked(storage.saveApp).mockReturnValue(mockMeta)
  vi.mocked(storage.loadSave).mockReturnValue(mockApp)
})

describe('empty state', () => {
  it('shows a message when there are no saves', () => {
    renderDialog()
    expect(screen.getByText(/no saved apps yet/i)).toBeInTheDocument()
  })
})

describe('save list', () => {
  beforeEach(() => {
    vi.mocked(storage.listSaves).mockReturnValue([mockMeta])
  })

  it('shows the app name from the save index', () => {
    renderDialog()
    expect(screen.getByText('My App')).toBeInTheDocument()
  })

  it('shows the component count', () => {
    renderDialog()
    expect(screen.getByText(/3 components/i)).toBeInTheDocument()
  })
})

describe('save button', () => {
  it('calls saveApp with the current app', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Save current app'))
    expect(storage.saveApp).toHaveBeenCalledWith(mockApp)
  })

  it('refreshes the list after saving', () => {
    vi.mocked(storage.listSaves)
      .mockReturnValueOnce([])             
      .mockReturnValueOnce([mockMeta])     
    renderDialog()
    expect(screen.queryByText('My App')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Save current app'))
    expect(screen.getByText('My App')).toBeInTheDocument()
  })
})

describe('open button', () => {
  beforeEach(() => {
    vi.mocked(storage.listSaves).mockReturnValue([mockMeta])
  })

  it('calls onLoad with the loaded app', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Open'))
    expect(onLoad).toHaveBeenCalledWith(mockApp)
  })

  it('calls onClose after loading', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Open'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows an error when loadSave returns null', () => {
    vi.mocked(storage.loadSave).mockReturnValue(null)
    renderDialog()
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onLoad).not.toHaveBeenCalled()
  })
})

describe('delete button', () => {
  beforeEach(() => {
    vi.mocked(storage.listSaves).mockReturnValue([mockMeta])
  })

  it('calls deleteSave with the app id', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: `Delete ${mockMeta.name}` }))
    expect(storage.deleteSave).toHaveBeenCalledWith(mockMeta.id)
  })

  it('refreshes the list after deletion', () => {
    vi.mocked(storage.listSaves)
      .mockReturnValueOnce([mockMeta])   
      .mockReturnValueOnce([])           
    renderDialog()
    expect(screen.getByText('My App')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `Delete ${mockMeta.name}` }))
    expect(screen.queryByText('My App')).not.toBeInTheDocument()
  })
})

describe('export button', () => {
  it('calls exportApp with the current app', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Export JSON'))
    expect(storage.exportApp).toHaveBeenCalledWith(mockApp)
  })

  it('does not close the dialog after export', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Export JSON'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('import', () => {
  it('calls onLoad and onClose on a valid file', async () => {
    const importedApp = { ...mockApp, name: 'Imported App' }
    vi.mocked(storage.importApp).mockResolvedValue(importedApp)

    renderDialog()

    const file  = new File(['{}'], 'app.json', { type: 'application/json' })
    const input = screen.getByLabelText('Import JSON file')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(onLoad).toHaveBeenCalledWith(importedApp))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows an error banner when import fails', async () => {
    vi.mocked(storage.importApp).mockRejectedValue(new Error('File is not valid JSON.'))

    renderDialog()

    const file  = new File(['bad'], 'bad.json', { type: 'application/json' })
    const input = screen.getByLabelText('Import JSON file')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('File is not valid JSON.'),
    )
    expect(onLoad).not.toHaveBeenCalled()
  })
})

describe('close button', () => {
  it('calls onClose when the X is clicked', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the backdrop is clicked', () => {
    renderDialog()
    
    fireEvent.click(document.querySelector('[aria-hidden="true"]')!)
    expect(onClose).toHaveBeenCalled()
  })
})
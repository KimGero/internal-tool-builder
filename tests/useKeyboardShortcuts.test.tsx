import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useKeyboardShortcuts, type ShortcutHandlers } from '../src/hooks/useKeyboardShortcuts'


function Fixture({ h }: { h: ShortcutHandlers }) {
  useKeyboardShortcuts(h)
  return (
    <div>
      <input data-testid="text-input" type="text" />
      <textarea data-testid="textarea" />
      <select data-testid="select"><option>x</option></select>
    </div>
  )
}

const h: ShortcutHandlers = {
  onDelete:    vi.fn(),
  onEscape:    vi.fn(),
  onUndo:      vi.fn(),
  onRedo:      vi.fn(),
  onSave:      vi.fn(),
  onDuplicate: vi.fn(),
}

function press(key: string, mods: Partial<KeyboardEventInit> = {}) {
  fireEvent.keyDown(document, { key, ...mods })
}

beforeEach(() => {
  vi.clearAllMocks()
  render(<Fixture h={h} />)
})

describe('delete', () => {
  it('Delete key fires onDelete', () => {
    press('Delete')
    expect(h.onDelete).toHaveBeenCalledTimes(1)
  })

  it('Backspace fires onDelete', () => {
    press('Backspace')
    expect(h.onDelete).toHaveBeenCalledTimes(1)
  })
})

describe('escape', () => {
  it('Escape fires onEscape', () => {
    press('Escape')
    expect(h.onEscape).toHaveBeenCalledTimes(1)
  })
})

describe('undo', () => {
  it('Ctrl+Z fires onUndo', () => {
    press('z', { ctrlKey: true })
    expect(h.onUndo).toHaveBeenCalledTimes(1)
  })

  it('Meta+Z (Cmd+Z) fires onUndo', () => {
    press('z', { metaKey: true })
    expect(h.onUndo).toHaveBeenCalledTimes(1)
  })

  it('Ctrl+Shift+Z does NOT fire onUndo (it fires onRedo)', () => {
    press('Z', { ctrlKey: true, shiftKey: true })
    expect(h.onUndo).not.toHaveBeenCalled()
  })
})

describe('redo', () => {
  it('Ctrl+Y fires onRedo', () => {
    press('y', { ctrlKey: true })
    expect(h.onRedo).toHaveBeenCalledTimes(1)
  })

  it('Ctrl+Shift+Z fires onRedo', () => {
    press('Z', { ctrlKey: true, shiftKey: true })
    expect(h.onRedo).toHaveBeenCalledTimes(1)
  })

  it('Meta+Shift+Z fires onRedo', () => {
    press('Z', { metaKey: true, shiftKey: true })
    expect(h.onRedo).toHaveBeenCalledTimes(1)
  })
})

describe('save', () => {
  it('Ctrl+S fires onSave', () => {
    press('s', { ctrlKey: true })
    expect(h.onSave).toHaveBeenCalledTimes(1)
  })

  it('Meta+S fires onSave', () => {
    press('s', { metaKey: true })
    expect(h.onSave).toHaveBeenCalledTimes(1)
  })
})

describe('duplicate', () => {
  it('Ctrl+D fires onDuplicate', () => {
    press('d', { ctrlKey: true })
    expect(h.onDuplicate).toHaveBeenCalledTimes(1)
  })
})

describe('editable elements — shortcuts suppressed', () => {
  it('Delete in a text input does not fire onDelete', () => {
    const input = document.querySelector('[data-testid="text-input"]') as HTMLElement
    input.focus()
    fireEvent.keyDown(input, { key: 'Delete' })
    expect(h.onDelete).not.toHaveBeenCalled()
  })

  it('Ctrl+Z in a textarea does not fire onUndo', () => {
    const ta = document.querySelector('[data-testid="textarea"]') as HTMLElement
    ta.focus()
    fireEvent.keyDown(ta, { key: 'z', ctrlKey: true })
    expect(h.onUndo).not.toHaveBeenCalled()
  })

  it('Backspace in a select does not fire onDelete', () => {
    const sel = document.querySelector('[data-testid="select"]') as HTMLElement
    sel.focus()
    fireEvent.keyDown(sel, { key: 'Backspace' })
    expect(h.onDelete).not.toHaveBeenCalled()
  })
})

describe('handler independence', () => {
  it('Escape does not fire any other handler', () => {
    press('Escape')
    expect(h.onDelete).not.toHaveBeenCalled()
    expect(h.onUndo).not.toHaveBeenCalled()
    expect(h.onSave).not.toHaveBeenCalled()
  })
})
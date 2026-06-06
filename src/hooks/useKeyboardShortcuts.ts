import { useEffect } from 'react'

export interface ShortcutHandlers {
  onDelete:    () => void
  onEscape:    () => void
  onUndo:      () => void
  onRedo:      () => void
  onSave:      () => void
  onDuplicate: () => void
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function targetIsEditable(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement
  return EDITABLE_TAGS.has(el.tagName) || el.isContentEditable
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const { onDelete, onEscape, onUndo, onRedo, onSave, onDuplicate } = handlers

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (targetIsEditable(e)) return

      const ctrl = e.ctrlKey || e.metaKey

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); onDelete(); return
      }
      if (e.key === 'Escape') {
        onEscape(); return
      }
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault(); onUndo(); return
      }
      
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault(); onRedo(); return
      }
      if (ctrl && e.key === 's') {
        e.preventDefault(); onSave(); return
      }
      if (ctrl && e.key === 'd') {
        e.preventDefault(); onDuplicate(); return
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onDelete, onEscape, onUndo, onRedo, onSave, onDuplicate])
}
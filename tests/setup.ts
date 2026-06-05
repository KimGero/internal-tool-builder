
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// Mock DragEvent dataTransfer for tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'DragEvent', {
    value: class DragEvent extends Event {
      dataTransfer = {
        effectAllowed: '',
        dropEffect: '',
        setData: () => {},
        getData: () => '',
        clearData: () => {},
        setDragImage: () => {},
        files: [],
        types: [],
        items: []
      }
    }
  })
}
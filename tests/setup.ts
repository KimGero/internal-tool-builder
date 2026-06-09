import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { useBuilderStore } from '../src/store/builderStore'

// Reset store to empty state before each test
beforeEach(() => {
  useBuilderStore.setState({
    app: {
      id: 'test-id',
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
  }, true)
})

afterEach(() => {
  cleanup()
})

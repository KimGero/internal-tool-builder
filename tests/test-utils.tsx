
import React from 'react'
import { render } from '@testing-library/react'
import { useBuilderStore } from '../src/store/builderStore'

// Helper to reset store to initial state
export function resetStore() {
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
}

// Wrapper that ensures store is ready
export function withStore(component: React.ReactElement) {
  return component
}

// Custom render that resets store
export function renderWithStore(ui: React.ReactElement) {
  resetStore()
  return render(ui)
}

import { useBuilderStore } from '../src/store/builderStore'

export const resetStore = () => {
  // Reset the store state directly without using methods
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
}
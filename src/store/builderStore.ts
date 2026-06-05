import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { App, AppComponent as AppComponent, DataSource } from '../types'

interface BuilderStore {
  app: App
  selectedId: string | null
  isDirty: boolean

  // App
  setName: (name: string) => void
  loadApp: (app: App) => void
  newApp: () => void

  // Components
  addComponent: (c: AppComponent) => void
  updateComponent: (id: string, updates: Partial<AppComponent>) => void
  removeComponent: (id: string) => void
  reorderComponents: (components: AppComponent[]) => void
  selectComponent: (id: string | null) => void

  // Data sources
  addDataSource: (ds: DataSource) => void
  updateDataSource: (id: string, updates: Partial<DataSource>) => void
  removeDataSource: (id: string) => void

  markClean: () => void
}

const emptyApp = (): App => ({
  id: crypto.randomUUID(),
  name: 'Untitled App',
  components: [],
  dataSources: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export const useBuilderStore = create<BuilderStore>()(
  persist(
    (set) => ({
      app: emptyApp(),
      selectedId: null,
      isDirty: false,

      setName: (name) =>
        set((s) => ({ app: { ...s.app, name, updatedAt: Date.now() }, isDirty: true })),

      loadApp: (app) => set({ app, selectedId: null, isDirty: false }),

      newApp: () => set({ app: emptyApp(), selectedId: null, isDirty: false }),

      addComponent: (c) =>
        set((s) => ({
          app: { ...s.app, components: [...s.app.components, c], updatedAt: Date.now() },
          selectedId: c.id,
          isDirty: true,
        })),

      updateComponent: (id, updates) =>
        set((s) => ({
          app: {
            ...s.app,
            components: s.app.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })),

      removeComponent: (id) =>
        set((s) => ({
          app: {
            ...s.app,
            components: s.app.components.filter((c) => c.id !== id),
            updatedAt: Date.now(),
          },
          selectedId: s.selectedId === id ? null : s.selectedId,
          isDirty: true,
        })),

      reorderComponents: (components) =>
        set((s) => ({ app: { ...s.app, components, updatedAt: Date.now() }, isDirty: true })),

      selectComponent: (id) => set({ selectedId: id }),

      addDataSource: (ds) =>
        set((s) => ({
          app: { ...s.app, dataSources: [...s.app.dataSources, ds], updatedAt: Date.now() },
          isDirty: true,
        })),

      updateDataSource: (id, updates) =>
        set((s) => ({
          app: {
            ...s.app,
            dataSources: s.app.dataSources.map((ds) => (ds.id === id ? { ...ds, ...updates } : ds)),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })),

      removeDataSource: (id) =>
        set((s) => ({
          app: {
            ...s.app,
            dataSources: s.app.dataSources.filter((ds) => ds.id !== id),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })),

      markClean: () => set({ isDirty: false }),
    }),
    {
      name: 'itb-app',                         // localStorage key
      partialize: (s) => ({ app: s.app }),     // only persist the app, not UI state
    }
  )
)
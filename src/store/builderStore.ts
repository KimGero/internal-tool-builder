import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { App, AppComponent, DataSource } from '../types'
import type { ToastMessage } from '../components/ui/Toast'

const MAX_UNDO = 50

interface BuilderStore {
  app:        App
  selectedId: string | null
  isDirty:    boolean
  past:       App[]
  future:     App[]

  setName:    (name: string) => void
  loadApp:    (app: App) => void
  newApp:     () => void

  addComponent:       (c: AppComponent) => void
  updateComponent:    (id: string, updates: Partial<AppComponent>) => void
  removeComponent:    (id: string) => void
  reorderComponents:  (components: AppComponent[]) => void
  selectComponent:    (id: string | null) => void
  duplicateComponent: (id: string) => void

  addDataSource:    (ds: DataSource) => void
  updateDataSource: (id: string, updates: Partial<DataSource>) => void
  removeDataSource: (id: string) => void

  undo:      () => void
  redo:      () => void
  markClean: () => void

  // Toast actions
  toasts:      ToastMessage[]
  addToast:    (message: string, type: ToastMessage['type']) => void
  removeToast: (id: string) => void
}

const emptyApp = (): App => ({
  id: crypto.randomUUID(), name: 'Untitled App',
  components: [], dataSources: [],
  createdAt: Date.now(), updatedAt: Date.now(),
})

// Push current app to past, then cap at MAX_UNDO
function push(past: App[], currentApp: App): App[] {
  return [...past, currentApp].slice(-MAX_UNDO)
}

export const useBuilderStore = create<BuilderStore>()(
  persist(
    (set) => ({
      app: emptyApp(),
      selectedId: null,
      isDirty: false,
      past: [],
      future: [],
      toasts: [],  

      setName: (name) =>
        set((s) => ({ app: { ...s.app, name, updatedAt: Date.now() }, isDirty: true })),

      loadApp: (app) =>
        set({ app, selectedId: null, isDirty: false, past: [], future: [] }),

      newApp: () =>
        set({ app: emptyApp(), selectedId: null, isDirty: false, past: [], future: [] }),

      addComponent: (c) =>
        set((s) => ({
          past:       push(s.past, s.app),
          future:     [],
          app:        { ...s.app, components: [...s.app.components, c], updatedAt: Date.now() },
          selectedId: c.id,
          isDirty:    true,
        })),

      updateComponent: (id, updates) =>
        set((s) => ({
          past:    push(s.past, s.app),
          future:  [],
          app:     {
            ...s.app,
            components: s.app.components.map((c) => c.id === id ? { ...c, ...updates } : c),
            updatedAt:  Date.now(),
          },
          isDirty: true,
        })),

      removeComponent: (id) =>
        set((s) => ({
          past:       push(s.past, s.app),
          future:     [],
          app:        {
            ...s.app,
            components: s.app.components.filter((c) => c.id !== id),
            updatedAt:  Date.now(),
          },
          selectedId: s.selectedId === id ? null : s.selectedId,
          isDirty:    true,
        })),

      reorderComponents: (components) =>
        set((s) => ({
          past:    push(s.past, s.app),
          future:  [],
          app:     { ...s.app, components, updatedAt: Date.now() },
          isDirty: true,
        })),

      selectComponent: (id) => set({ selectedId: id }),

      duplicateComponent: (id) =>
        set((s) => {
          const src = s.app.components.find((c) => c.id === id)
          if (!src) return {}
          const copy: AppComponent = { ...src, id: crypto.randomUUID() }
          return {
            past:       push(s.past, s.app),
            future:     [],
            app:        {
              ...s.app,
              components: [...s.app.components, copy],
              updatedAt:  Date.now(),
            },
            selectedId: copy.id,
            isDirty:    true,
          }
        }),

      addDataSource: (ds) =>
        set((s) => ({
          app:     { ...s.app, dataSources: [...s.app.dataSources, ds], updatedAt: Date.now() },
          isDirty: true,
        })),

      updateDataSource: (id, updates) =>
        set((s) => ({
          app: {
            ...s.app,
            dataSources: s.app.dataSources.map((ds) => ds.id === id ? { ...ds, ...updates } : ds),
            updatedAt: Date.now(),
          },
          isDirty: true,
        })),

      removeDataSource: (id) =>
        set((s) => ({
          app:     {
            ...s.app,
            dataSources: s.app.dataSources.filter((ds) => ds.id !== id),
            updatedAt:   Date.now(),
          },
          isDirty: true,
        })),

      undo: () =>
        set((s) => {
          if (s.past.length === 0) return {}
          return {
            past:       s.past.slice(0, -1),
            future:     [s.app, ...s.future].slice(0, MAX_UNDO),
            app:        s.past[s.past.length - 1],
            selectedId: null,
            isDirty:    true,
          }
        }),

      redo: () =>
        set((s) => {
          if (s.future.length === 0) return {}
          return {
            past:       push(s.past, s.app),
            future:     s.future.slice(1),
            app:        s.future[0],
            selectedId: null,
            isDirty:    true,
          }
        }),

      markClean: () => set({ isDirty: false }),

      // Toast actions
      addToast: (message, type) =>
        set((s) => ({
          toasts: [...s.toasts, { id: crypto.randomUUID(), message, type }],
        })),

      removeToast: (id) =>
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name:       'itb-app',
      partialize: (s) => ({ app: s.app }), 
    },
  ),
)
import { describe, it, expect, beforeEach } from 'vitest'
import { useBuilderStore } from '../src/store/builderStore'
import type { AppComponent } from '../src/types'

const c1: AppComponent = { id: 'c1', type: 'button', props: { text: 'A' }, events: {} }
const c2: AppComponent = { id: 'c2', type: 'input',  props: { label: 'B' }, events: {} }

function reset() {
  useBuilderStore.getState().newApp()
  useBuilderStore.setState({ past: [], future: [] }, false)
}

const store = () => useBuilderStore.getState()

beforeEach(reset)


describe('history recording', () => {
  it('addComponent pushes current app to past', () => {
    store().addComponent(c1)
    expect(store().past).toHaveLength(1)
  })

  it('updateComponent pushes to past', () => {
    store().addComponent(c1)
    store().updateComponent('c1', { props: { text: 'Updated' } })
    expect(store().past).toHaveLength(2)
  })

  it('removeComponent pushes to past', () => {
    useBuilderStore.setState((s) => ({ app: { ...s.app, components: [c1] } }))
    store().removeComponent('c1')
    expect(store().past).toHaveLength(1)
  })

  it('reorderComponents pushes to past', () => {
    useBuilderStore.setState((s) => ({ app: { ...s.app, components: [c1, c2] } }))
    store().reorderComponents([c2, c1])
    expect(store().past).toHaveLength(1)
  })

  it('a new mutation after undo clears future', () => {
    store().addComponent(c1)
    store().undo()
    expect(store().future).toHaveLength(1)
    store().addComponent({ ...c1, id: 'c2-new' })
    expect(store().future).toHaveLength(0)
  })
})


describe('undo', () => {
  it('reverts the last component mutation', () => {
    store().addComponent(c1)
    expect(store().app.components).toHaveLength(1)
    store().undo()
    expect(store().app.components).toHaveLength(0)
  })

  it('moves current app to future', () => {
    store().addComponent(c1)
    store().undo()
    expect(store().future).toHaveLength(1)
  })

  it('clears selectedId', () => {
    store().addComponent(c1)
    expect(store().selectedId).toBe('c1')
    store().undo()
    expect(store().selectedId).toBeNull()
  })

  it('is a no-op when past is empty', () => {
    const before = store().app
    store().undo()
    expect(store().app).toBe(before)
  })

  it('supports multiple consecutive undos', () => {
    store().addComponent(c1)
    store().addComponent(c2)
    store().undo()
    expect(store().app.components).toHaveLength(1)
    store().undo()
    expect(store().app.components).toHaveLength(0)
  })

  it('cannot undo beyond the history cap', () => {
    for (let i = 0; i < 52; i++) {
      store().addComponent({ ...c1, id: `c${i}` })
    }
    expect(store().past.length).toBeLessThanOrEqual(50)
  })
})


describe('redo', () => {
  it('reapplies the undone state', () => {
    store().addComponent(c1)
    store().undo()
    store().redo()
    expect(store().app.components).toHaveLength(1)
  })

  it('moves current app back to past', () => {
    store().addComponent(c1)
    store().undo()
    store().redo()
    expect(store().past).toHaveLength(1)
  })

  it('clears selectedId', () => {
    store().addComponent(c1)
    store().undo()
    store().redo()
    expect(store().selectedId).toBeNull()
  })

  it('is a no-op when future is empty', () => {
    store().addComponent(c1)
    const before = store().app
    store().redo()
    expect(store().app).toBe(before)
  })

  it('supports undo → redo round-trip', () => {
    store().addComponent(c1)
    store().addComponent(c2)
    store().undo()
    store().undo()
    store().redo()
    store().redo()
    expect(store().app.components).toHaveLength(2)
    expect(store().future).toHaveLength(0)
  })
})


describe('duplicateComponent', () => {
  beforeEach(() => {
    useBuilderStore.setState((s) => ({ app: { ...s.app, components: [c1] } }))
  })

  it('appends a copy with a new id', () => {
    store().duplicateComponent('c1')
    expect(store().app.components).toHaveLength(2)
    expect(store().app.components[1].id).not.toBe('c1')
  })

  it('the copy has the same props and type', () => {
    store().duplicateComponent('c1')
    const copy = store().app.components[1]
    expect(copy.type).toBe(c1.type)
    expect(copy.props).toEqual(c1.props)
  })

  it('selects the duplicate', () => {
    store().duplicateComponent('c1')
    const copyId = store().app.components[1].id
    expect(store().selectedId).toBe(copyId)
  })

  it('records history', () => {
    store().duplicateComponent('c1')
    expect(store().past).toHaveLength(1)
  })

  it('is a no-op for an unknown id', () => {
    const before = store().app
    store().duplicateComponent('ghost')
    expect(store().app).toBe(before)
  })
})


describe('history cleared on load / new', () => {
  it('loadApp clears past and future', () => {
    store().addComponent(c1)
    store().loadApp({
      id: 'x', name: 'X',
      components: [], dataSources: [],
      createdAt: 0, updatedAt: 0,
    })
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(0)
  })

  it('newApp clears past and future', () => {
    store().addComponent(c1)
    store().undo()
    store().newApp()
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(0)
  })
})
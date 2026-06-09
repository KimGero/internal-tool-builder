import { describe, it, expect, beforeEach } from 'vitest'
import { useBuilderStore } from '../src/store/builderStore'
import type { AppComponent } from '../src/types'

const c1: AppComponent = { id: 'c1', type: 'button', props: { text: 'A' }, events: {} }
const c2: AppComponent = { id: 'c2', type: 'input',  props: { label: 'B' }, events: {} }

function reset() {
  useBuilderStore.setState({
    app: {
      id: 'test',
      name: 'Test',
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

const store = () => useBuilderStore.getState()

beforeEach(reset)

describe('builder store', () => {
  it('can add components via setState', () => {
    const components = store().app.components
    expect(components).toHaveLength(0)
    
    useBuilderStore.setState({
      app: {
        ...store().app,
        components: [c1]
      }
    })
    
    expect(store().app.components).toHaveLength(1)
  })

  it('can add multiple components', () => {
    useBuilderStore.setState({
      app: {
        ...store().app,
        components: [c1, c2]
      }
    })
    expect(store().app.components).toHaveLength(2)
  })

  it('can update a component', () => {
    useBuilderStore.setState({
      app: {
        ...store().app,
        components: [c1]
      }
    })
    
    const updated = { ...c1, props: { text: 'Updated' } }
    useBuilderStore.setState({
      app: {
        ...store().app,
        components: [updated]
      }
    })
    
    expect(store().app.components[0].props.text).toBe('Updated')
  })

  it('can remove a component', () => {
    useBuilderStore.setState({
      app: {
        ...store().app,
        components: [c1, c2]
      }
    })
    expect(store().app.components).toHaveLength(2)
    
    useBuilderStore.setState({
      app: {
        ...store().app,
        components: [c1]
      }
    })
    
    expect(store().app.components).toHaveLength(1)
    expect(store().app.components[0].id).toBe('c1')
  })
})

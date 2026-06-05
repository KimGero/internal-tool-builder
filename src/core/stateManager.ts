import { eventBus } from './eventBus';

import type { Context } from '../types';

export class StateManager {
    private state: Record<string, unknown> = {}
    private persisted = new Set<string>()

    set(key: string, value: unknown, persist = false): void {
        const oldValue = this.state[key]
        this.state[key] = value

        eventBus.emit('state:change', { key, value, oldValue })
        eventBus.emit(`state:${key}`, { value, oldValue })

        if (persist) {
            this.persisted.add(key)
            try {
                localStorage.setItem(`runtime:${key}`, JSON.stringify(value))
            } catch {}
        }
    }

    get(key: string): unknown {
        return this.state[key]
    }

    getAll(): Context {
        return { ...this.state }
    }

    subscribe(
        key: string, 
        callback: (data: { value: unknown, oldValue: unknown }) => void): () => void {
            return eventBus.on(`state:${key}`, callback)
    }

    batch(updates: Record<string, unknown>): void {
        eventBus.emit('state:batchStart')
        for (const [key, value] of Object.entries(updates)) {
            this.set(key, value)
        }
        eventBus.emit('state:batchEnd', updates)

    }

    loadPersisted(): void {
        for (const key of this.persisted) {
            try {
                const raw = localStorage.getItem(`runtime:${key}`)
                if (raw) this.state[key] = JSON.parse(raw)
            } catch {/* corrupted, skip */}
        
        }

    }

    reset(): void {
        this.state = {}
        this.persisted.clear()
    }

    get stateRef(): Record<string, unknown> {
    return this.state
    }

}

export const stateManager = new StateManager()
export const runtimeState = stateManager 
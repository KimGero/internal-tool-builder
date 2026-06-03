type Cb<T = unknown> = (data: T) => void

interface Listener {
  callback: Cb
  once: boolean
}

interface HistoryEntry {
  event: string
  data: unknown
  timestamp: number
}

export class EventBus {
  private listeners = new Map<string, Listener[]>()
  private history: HistoryEntry[] = []
  private readonly MAX_HISTORY = 100

  
  on<T = unknown>(event: string, callback: Cb<T>, once = false): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push({ callback: callback as Cb, once })
    return () => this.off(event, callback as Cb)
  }

 
  once<T = unknown>(event: string, callback: Cb<T>): () => void {
    return this.on(event, callback, true)
  }


  emit<T = unknown>(event: string, data?: T): void {
    this.history.push({ event, data, timestamp: Date.now() })
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift()
    }

    const listeners = this.listeners.get(event)
    if (!listeners) return

    const listenersToCall = [...listeners]
    
    for (const { callback, once } of listenersToCall) {
      try {
        callback(data)
        if (once) {
          this.off(event, callback)
        }
      } catch (error) {
        console.error(`[EventBus] Error in "${event}" listener:`, error)
      }
    }
  }

  
  off(event: string, callback: Cb): void {
    const listeners = this.listeners.get(event)
    if (!listeners) return
    
    const filtered = listeners.filter((l) => l.callback !== callback)
    
    if (filtered.length === 0) {
      this.listeners.delete(event)
    } else {
      this.listeners.set(event, filtered)
    }
  }

  
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  
  getHistory(): HistoryEntry[] {
    return [...this.history]
  }

  
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0
  }
}


export const eventBus = new EventBus()

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

  on<T = unknown>(
    event: string,
    callback: Cb<T>,
    once = false
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }

    this.listeners.get(event)!.push({
      callback: callback as Cb,
      once,
    })

    return () => this.off(event, callback as Cb)
  }

  once<T = unknown>(
    event: string,
    callback: Cb<T>
  ): () => void {
    return this.on(event, callback, true)
  }

  emit<T = unknown>(
    event: string,
    data?: T
  ): void {
    this.history.push({
      event,
      data,
      timestamp: Date.now(),
    })

    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift()
    }

    const listeners = this.listeners.get(event)

    if (!listeners) return

    for (const { callback, once } of [...listeners]) {
      try {
        callback(data)
      } catch (error) {
        console.error(
          `[EventBus] uncaught in "${event}" listener:`,
          error
        )
      }

      if (once) {
        this.off(event, callback)
      }
    }
  }

  off(event: string, callback: Cb): void {
    const listeners = this.listeners.get(event)

    if (!listeners) return

    this.listeners.set(
      event,
      listeners.filter(
        (l) => l.callback !== callback
      )
    )
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
}

export const eventBus = new EventBus()


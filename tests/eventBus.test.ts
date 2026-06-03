import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '../src/core/eventBus'

describe('EventBus', () => {
  let bus: EventBus

  beforeEach(() => {
    bus = new EventBus()
  })

  // ─── on / emit ──────────────────────────────────────────────────────────────

  describe('on / emit', () => {
    it('fires a registered listener', () => {
      const fn = vi.fn()
      bus.on('ping', fn)
      bus.emit('ping', 42)
      expect(fn).toHaveBeenCalledOnce()
      expect(fn).toHaveBeenCalledWith(42)
    })

    it('fires multiple listeners on the same event', () => {
      const a = vi.fn()
      const b = vi.fn()
      bus.on('x', a)
      bus.on('x', b)
      bus.emit('x', 'data')
      expect(a).toHaveBeenCalledWith('data')
      expect(b).toHaveBeenCalledWith('data')
    })

    it('does not fire listeners registered on other events', () => {
      const fn = vi.fn()
      bus.on('a', fn)
      bus.emit('b')
      expect(fn).not.toHaveBeenCalled()
    })

    it('emits with no data (undefined)', () => {
      const fn = vi.fn()
      bus.on('test', fn)
      bus.emit('test')
      expect(fn).toHaveBeenCalledWith(undefined)
    })

    it('on() returns an unsubscribe function', () => {
      const fn = vi.fn()
      const unsub = bus.on('test', fn)
      unsub()
      bus.emit('test')
      expect(fn).not.toHaveBeenCalled()
    })
  })

  // ─── once ───────────────────────────────────────────────────────────────────

  describe('once', () => {
    it('fires exactly once then auto-unsubscribes', () => {
      const fn = vi.fn()
      bus.once('ping', fn)
      bus.emit('ping', 1)
      bus.emit('ping', 2)
      bus.emit('ping', 3)
      expect(fn).toHaveBeenCalledOnce()
      expect(fn).toHaveBeenCalledWith(1)
    })

    it('once listener does not suppress sibling permanent listeners', () => {
      const permanent = vi.fn()
      const single = vi.fn()
      bus.on('test', permanent)
      bus.once('test', single)
      bus.emit('test')
      bus.emit('test')
      expect(permanent).toHaveBeenCalledTimes(2)
      expect(single).toHaveBeenCalledOnce()
    })
  })

  // ─── off ────────────────────────────────────────────────────────────────────

  describe('off', () => {
    it('removes a specific listener', () => {
      const fn = vi.fn()
      bus.on('test', fn)
      bus.off('test', fn)
      bus.emit('test')
      expect(fn).not.toHaveBeenCalled()
    })

    it('removing a non-existent listener does not throw', () => {
      expect(() => bus.off('ghost', vi.fn())).not.toThrow()
    })

    it('removing one listener does not affect others on the same event', () => {
      const a = vi.fn()
      const b = vi.fn()
      bus.on('test', a)
      bus.on('test', b)
      bus.off('test', a)
      bus.emit('test')
      expect(a).not.toHaveBeenCalled()
      expect(b).toHaveBeenCalledOnce()
    })
  })

  // ─── self-removal during emit ────────────────────────────────────────────────

  describe('self-removal during emit', () => {
    it('a once-listener removing itself does not skip following listeners', () => {
      const order: number[] = []
      bus.on('e', () => order.push(1))
      bus.once('e', () => order.push(2))  // removes itself on first emit
      bus.on('e', () => order.push(3))

      bus.emit('e')  // → [1, 2, 3]
      bus.emit('e')  // once is gone → [1, 2, 3, 1, 3]

      expect(order).toEqual([1, 2, 3, 1, 3])
    })
  })

  // ─── clear ──────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('clears all listeners for a named event', () => {
      const fn = vi.fn()
      bus.on('test', fn)
      bus.clear('test')
      bus.emit('test')
      expect(fn).not.toHaveBeenCalled()
    })

    it('clears all events when called without an argument', () => {
      const a = vi.fn()
      const b = vi.fn()
      bus.on('a', a)
      bus.on('b', b)
      bus.clear()
      bus.emit('a')
      bus.emit('b')
      expect(a).not.toHaveBeenCalled()
      expect(b).not.toHaveBeenCalled()
    })

    it('clearing one event does not affect others', () => {
      const a = vi.fn()
      const b = vi.fn()
      bus.on('a', a)
      bus.on('b', b)
      bus.clear('a')
      bus.emit('a')
      bus.emit('b')
      expect(a).not.toHaveBeenCalled()
      expect(b).toHaveBeenCalledOnce()
    })
  })

  // ─── history ─────────────────────────────────────────────────────────────────

  describe('history', () => {
    it('records each emit in order', () => {
      bus.emit('foo', 1)
      bus.emit('bar', 'hello')
      const history = bus.getHistory()
      expect(history).toHaveLength(2)
      expect(history[0]).toMatchObject({ event: 'foo', data: 1 })
      expect(history[1]).toMatchObject({ event: 'bar', data: 'hello' })
    })

    it('each entry has a numeric timestamp', () => {
      bus.emit('t', null)
      expect(typeof bus.getHistory()[0].timestamp).toBe('number')
    })

    it('caps at 100 entries (MAX_HISTORY)', () => {
      for (let i = 0; i < 110; i++) bus.emit('x', i)
      expect(bus.getHistory()).toHaveLength(100)
    })

    it('getHistory returns a copy — external mutations do not leak in', () => {
      bus.emit('test', 'a')
      const snapshot = bus.getHistory()
      snapshot.push({ event: 'injected', data: null, timestamp: 0 })
      expect(bus.getHistory()).toHaveLength(1)
    })
  })
})
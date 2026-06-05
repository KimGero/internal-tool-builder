
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '../src/core/eventBus'

describe('EventBus', () => {
  let bus: EventBus

  beforeEach(() => {
    bus = new EventBus()
  })

  describe('on / emit', () => {
    it('fires a registered listener with data', () => {
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

    it('does not throw when no listeners exist for an event', () => {
      expect(() => bus.emit('ghost')).not.toThrow()
    })
  })

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

    it('once() returns an unsubscribe function', () => {
      const fn = vi.fn()
      const unsub = bus.once('test', fn)
      unsub()
      bus.emit('test')
      expect(fn).not.toHaveBeenCalled()
    })
  })

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

    it('can remove after emit without affecting future emits', () => {
      const fn = vi.fn()
      bus.on('test', fn)
      bus.emit('test', 1)
      bus.off('test', fn)
      bus.emit('test', 2)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith(1)
    })
  })

  describe('self-removal during emit', () => {
    it('a once-listener removing itself does not skip following listeners', () => {
      const order: number[] = []
      bus.on('e', () => order.push(1))
      bus.once('e', () => order.push(2)) // removes itself on first emit
      bus.on('e', () => order.push(3))

      bus.emit('e') // → [1, 2, 3]
      bus.emit('e') // once is gone → [1, 2, 3, 1, 3]

      expect(order).toEqual([1, 2, 3, 1, 3])
    })

    it('a permanent listener removing itself mid-emit works correctly', () => {
      const order: number[] = []
      const selfRemoving = vi.fn(() => {
        order.push(2)
        bus.off('e', selfRemoving)
      })
      
      bus.on('e', () => order.push(1))
      bus.on('e', selfRemoving)
      bus.on('e', () => order.push(3))

      bus.emit('e')
      bus.emit('e')

      expect(order).toEqual([1, 2, 3, 1, 3])
    })
  })

  describe('error handling', () => {
    it('continues calling later listeners if an earlier one throws', () => {
      const errorFn = vi.fn(() => {
        throw new Error('boom')
      })
      const goodFn = vi.fn()
      
      bus.on('test', errorFn)
      bus.on('test', goodFn)
      
      expect(() => bus.emit('test')).not.toThrow()
      expect(errorFn).toHaveBeenCalled()
      expect(goodFn).toHaveBeenCalled()
    })

    it('logs errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorFn = vi.fn(() => {
        throw new Error('test error')
      })
      
      bus.on('test', errorFn)
      bus.emit('test')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[EventBus] Error in "test" listener:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('multiple errors in one emit all get logged', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error1 = vi.fn(() => { throw new Error('error 1') })
      const error2 = vi.fn(() => { throw new Error('error 2') })
      
      bus.on('test', error1)
      bus.on('test', error2)
      bus.emit('test')
      
      expect(consoleSpy).toHaveBeenCalledTimes(2)
      consoleSpy.mockRestore()
    })
  })

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

    it('clearing an event with no listeners does nothing', () => {
      expect(() => bus.clear('nonexistent')).not.toThrow()
    })
  })

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
      const history = bus.getHistory()
      expect(history[0].timestamp).toBeTypeOf('number')
      expect(history[0].timestamp).toBeLessThanOrEqual(Date.now())
    })

    it('caps at 100 entries (MAX_HISTORY)', () => {
      for (let i = 0; i < 110; i++) {
        bus.emit('x', i)
      }
      expect(bus.getHistory()).toHaveLength(100)
    })

    it('getHistory returns a copy — external mutations do not leak in', () => {
      bus.emit('test', 'a')
      const snapshot = bus.getHistory()
      snapshot.push({ event: 'injected', data: null, timestamp: 0 })
      expect(bus.getHistory()).toHaveLength(1)
    })

    it('history preserves data types', () => {
      bus.emit('test', { nested: { value: 42 }, array: [1, 2, 3] })
      const history = bus.getHistory()
      expect(history[0].data).toEqual({ nested: { value: 42 }, array: [1, 2, 3] })
    })
  })

  describe('edge cases', () => {
    it('handles rapid emit/on/add/remove cycles', () => {
      const results: number[] = []
      
      for (let i = 0; i < 100; i++) {
        const fn = (val: unknown) => results.push(val as number)
        bus.on('rapid', fn)
        bus.emit('rapid', i)
        bus.off('rapid', fn)
      }
      
      expect(results).toHaveLength(100)
      expect(results[0]).toBe(0)
      expect(results[99]).toBe(99)
    })

    it('supports chaining using returned unsubscribe functions', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()
      
      const unsub1 = bus.on('chain', fn1)
      const unsub2 = bus.on('chain', fn2)
      
      bus.emit('chain', 'first')
      unsub1()
      bus.emit('chain', 'second')
      unsub2()
      bus.emit('chain', 'third')
      
      expect(fn1).toHaveBeenCalledTimes(1)
      expect(fn1).toHaveBeenCalledWith('first')
      expect(fn2).toHaveBeenCalledTimes(2)
      expect(fn2).toHaveBeenNthCalledWith(1, 'first')
      expect(fn2).toHaveBeenNthCalledWith(2, 'second')
    })

    it('listenerCount returns correct number of listeners', () => {
      expect(bus.listenerCount('test')).toBe(0)
      
      const fn1 = vi.fn()
      const fn2 = vi.fn()
      
      bus.on('test', fn1)
      expect(bus.listenerCount('test')).toBe(1)
      
      bus.on('test', fn2)
      expect(bus.listenerCount('test')).toBe(2)
      
      bus.off('test', fn1)
      expect(bus.listenerCount('test')).toBe(1)
      
      bus.clear('test')
      expect(bus.listenerCount('test')).toBe(0)
    })
  })
})
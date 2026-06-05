import { describe, it, expect } from 'vitest'
import { buildMonthGrid } from '../src/components/CalendarWidget'

describe('buildMonthGrid', () => {
  it('always produces exactly 42 cells', () => {
    
    const cases: [number, number][] = [
      [2024, 0],  
      [2024, 1],  
      [2024, 2],  
      [2023, 1],  
      [2023, 9],  
    ]
    for (const [year, month] of cases) {
      expect(buildMonthGrid(year, month)).toHaveLength(42)
    }
  })

  it('first cell is always a Sunday', () => {
    for (let month = 0; month < 12; month++) {
      const grid = buildMonthGrid(2024, month)
      expect(grid[0].getDay()).toBe(0)   
    }
  })

  it('contains all days of the target month', () => {
    const grid = buildMonthGrid(2024, 0)  
    const inJanuary = grid.filter(d => d.getMonth() === 0 && d.getFullYear() === 2024)
    expect(inJanuary).toHaveLength(31)
  })

  it('first of the month is present in the grid', () => {
    const grid   = buildMonthGrid(2024, 2)  
    const march1 = grid.find(d => d.getMonth() === 2 && d.getDate() === 1)
    expect(march1).toBeDefined()
  })

  it('includes 29 days for February in a leap year', () => {
  const grid  = buildMonthGrid(2024, 1)
  const inFeb = grid.filter(d => d.getMonth() === 1 && d.getFullYear() === 2024)
  expect(inFeb).toHaveLength(29)
  })

  it('includes 28 days for February in a non-leap year', () => {
  const grid  = buildMonthGrid(2023, 1)
  const inFeb = grid.filter(d => d.getMonth() === 1 && d.getFullYear() === 2023)
  expect(inFeb).toHaveLength(28)
  })


  it('handles a month starting on Sunday with no leading padding', () => {

    const grid = buildMonthGrid(2023, 9)
    expect(grid[0].getMonth()).toBe(9)
    expect(grid[0].getDate()).toBe(1)
  })
})

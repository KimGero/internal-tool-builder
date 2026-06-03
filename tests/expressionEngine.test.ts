import { describe, it, expect } from 'vitest'
import { ExpressionEngine } from '../src/core/expressionEngine'

describe('evaluate — string templates', () => {
  it('returns plain strings unchanged', () => {
    expect(ExpressionEngine.evaluate('Hello World')).toBe('Hello World')
  })

  it('interpolates a variable', () => {
    expect(ExpressionEngine.evaluate('Hello {{name}}', { name: 'Kimori' }))
      .toBe('Hello Kimori')
  })

  it('evaluates arithmetic', () => {
  expect(ExpressionEngine.evaluate('Total: {{(price * 1.16).toFixed(0)}}', { price: 100 }))
    .toBe('Total: 116')
  })

  it('evaluates array length', () => {
    expect(ExpressionEngine.evaluate('{{items.length}} items', { items: [1, 2, 3] }))
      .toBe('3 items')
  })

  it('handles multiple expressions in one string', () => {
    expect(ExpressionEngine.evaluate('{{first}} {{last}}', { first: 'Stanley', last: 'Otieno' }))
      .toBe('Stanley Otieno')
  })

  it('renders [Error] for broken expressions', () => {
    expect(ExpressionEngine.evaluate('{{undefined_var.bad}}')).toBe('[Error]')
  })

  it('renders empty string for null/undefined', () => {
    expect(ExpressionEngine.evaluate('{{val}}', { val: null })).toBe('')
    expect(ExpressionEngine.evaluate('{{val}}', { val: undefined })).toBe('')
  })

  it('handles $ in values without breaking replace', () => {
    expect(ExpressionEngine.evaluate('Price: {{amount}}', { amount: '$100' }))
      .toBe('Price: $100')
  })
})

describe('evaluateRaw — actual values', () => {
  it('returns an array', () => {
    const result = ExpressionEngine.evaluateRaw('items', { items: [1, 2, 3] })
    expect(result).toEqual([1, 2, 3])
  })

  it('returns a number', () => {
    expect(ExpressionEngine.evaluateRaw('100 * 2')).toBe(200)
  })

  it('returns undefined on error', () => {
    expect(ExpressionEngine.evaluateRaw('bad.prop.chain')).toBeUndefined()
  })
})

describe('validate', () => {
  it('accepts valid expressions', () => {
    expect(ExpressionEngine.validate('1 + 1').valid).toBe(true)
    expect(ExpressionEngine.validate('items.filter(x => x.active)').valid).toBe(true)
  })

  it('rejects syntax errors', () => {
    const r = ExpressionEngine.validate('if (')
    expect(r.valid).toBe(false)
    expect(r.error).toBeDefined()
  })
})
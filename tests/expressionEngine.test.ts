import { describe, it, expect } from 'vitest';
import { ExpressionEngine } from '../src/utils/expressionEngine.js';

describe('ExpressionEngine', () => {
  it('evaluates simple variables', () => {
    expect(
      ExpressionEngine.evaluate('Hello {{name}}', { name: 'World' })
    ).toBe('Hello World');
  });

  it('evaluates math expressions', () => {
    expect(
      ExpressionEngine.evaluate('Total: {{price * 1.16}}', { price: 100 })
    ).toBe('Total: 116');
  });
});

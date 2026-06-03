import type { Context} from '../types'

const SAFE_GLOBALS: Context = {
    Math,
    Date,
    JSON,
    Array,
    String,
    Number,
    Boolean,
    Object,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
}

export class ExpressionEngine {
    private static tryEval(
    expression: string,
    context: Context,
    ): { value: unknown; threw: boolean } {
    const sandbox = { ...SAFE_GLOBALS, ...context }
    try {
        const fn = new Function(...Object.keys(sandbox), `"use strict"; return (${expression})`)
        return { value: fn(...Object.values(sandbox)), threw: false }
    }     catch {
        return { value: undefined, threw: true }
        }
    }

    static evaluate(template: string, context: Context = {}): string {
    if (!template) return ''
    const pattern = /\{\{(.*?)\}\}/g
    let result = template
    let match: RegExpExecArray | null
    while ((match = pattern.exec(template)) !== null) {
        const { value, threw } = ExpressionEngine.tryEval(match[1].trim(), context)
        const str = threw ? '[Error]' : value == null ? '' : String(value)
        result = result.replace(match[0], () => str)
    }
    return result
    }

    static evaluateRaw(expression: string, context: Context = {}): unknown {
        return ExpressionEngine.tryEval(expression, context).value
    }

    static validate(expression: string): { valid: boolean; error?: string } {
    try {
    new Function(
      ...Object.keys(SAFE_GLOBALS),
      `"use strict"; return (${expression})`
    )
    return { valid: true }
    } catch (e) {
        return { valid: false, error: (e as Error).message }
         }
    }
}

import type { Datasource, Context } from '../types';
import { ExpressionEngine } from '../core/expressionEngine';

interface CacheEntry {
    data: unknown[]
    timestamp: number
    sourceId: string
}

export interface QueryRecord {
    sourceId: string
    name: string
    timestamp: number
    durationMs: number
    rowCount: number
    error?: string
}

const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor as new (...args: string[]) 
=> (...args: unknown[]) => Promise<unknown>;

export class DataSourceManager {
    private cache: Map<string, CacheEntry> = new Map();
    private history: QueryRecord[] = [];
    private readonly MAX_HISTORY = 100
    
    async execute(source: Datasource, context: Context): Promise<unknown[]> {
        const cacheKey = `${source.id}:${JSON.stringify(context)}`;
        const ttl = source.cacheTTL ?? 30_000;
        const now = Date.now();

        const cached = this.cache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < ttl) return cached.data

        const start = Date.now()
        let data: unknown[] = []
        let errorMsg: string | undefined

        try {
            data =
                source.type === 'rest'
                    ? await this.executeRest(source, context)
                    : await this.executeJs(source, context)
                this.cache.set(cacheKey, { data, timestamp: Date.now(), sourceId: source.id })
                return data
        } catch (error) {
            errorMsg = (error as Error).message
            throw error
        } finally {
            this.addToHistory({
                sourceId: source.id,
                name: source.name,
                timestamp: start,
                durationMs: Date.now() - start,
                rowCount: data.length,
                error: errorMsg
            })

        }
    }
}

private async executeRest(source: Datasource, context: Context): Promise<unknown[]> {
    if (!source.url) throw new Error('REST data source must have a URL')

    const url = ExpressionEngine.evaluate(source.url, context)

    let extraHeaders: Record<string, string> = {}
    if (source.headers) {
        try {
            extraHeaders = JSON.parse(ExpressionEngine.evaluate(source.headers, context))
        } catch (e) {
            throw new Error('Headers must be a valid JSON')
        }

    }

    const init: RequestInit = {
        method: source.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
    }

    if (source.body && source.method !== 'GET') {
        init.body = ExpressionEngine.evaluate(source.body, context)

    }

    const response = await fetch(url, init)
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
    

    const json: unknown = await response.json()

    return Array.isArray(json) ? json : [json]
}

private async executeJs(source: Datasource, context: Context): Promise<unknown[]> {
    if (!source.code) throw new Error('JS data source must have code')

    const sandbox: Context = {
        ...context,
        fetch: globalThis.fetch,
        Math,
        Date,
        JSON,
        console, 

    }

    const fn = new AsyncFunction(...Object.keys(sandbox), '"use strict";\n${source.code}',)
    
    const result = await fn(...Object.values(sandbox))
    return Array.isArray(result) ? result : result != null ? [result] : []
}

invalidate (sourceId?: string): void {
    if (sourceId) {
        for (const [key, entry] of this.cache.entries()) {
            if (entry.sourceId === sourceId) {
                this.cache.delete(key)
            }
        }
    } else {
        this.cache.clear()
    }
}

getHistory(): QueryRecord[] {
    return [...this.history]
}

private addHistory(record: QueryRecord): void {
    this.history.push(record)
    if (this.history.length > this.MAX_HISTORY) {
        this.history.shift()
    }
}

export const dataSourceManager = new DataSourceManager()
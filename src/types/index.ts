export type Context = Record<string, unknown>

export interface AppComponent {
    id: string
    type: string
    props: Record<string, unknown>
    events: Record<string, string>
    dataSourceId?: string 
}

export interface DataSource {
    id: string
    name: string
    type: 'rest' | 'javascript'
    url?: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: string
    body?: string
    code?: string
    cacheTTL?: number
}

export interface App {
    id: string
    name: string
    components: AppComponent[]
    dataSources: DataSource[]
    createdAt: number
    updatedAt: number
}

export interface Runtime {
    state: Record<string, unknown>
    setState: (key: string, value: unknown, persist?: boolean) => void
    evaluate: (expression: string, extra?: Context) => unknown
}   

export interface ComponentDefinition {
    type: string
    label: string
    icon: string
    defaultProps: Record<string, unknown>
    defaultEvents?: Record<string, string>
}

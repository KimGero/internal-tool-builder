import { REGISTRY } from '../components/registry'
import type { AppComponent, Runtime } from '../types'

interface WidgetRendererProps {
  component: AppComponent
  runtime?: Runtime
  previewMode?: boolean
}

export function WidgetRenderer({ component, runtime, previewMode = false }: WidgetRendererProps) {
  const definition = REGISTRY[component.type]
  
  if (!definition) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        Unknown component type: {component.type}
      </div>
    )
  }

  const Widget = definition.Widget
  
  // Create a mock runtime if not provided (for preview mode)
  const effectiveRuntime = runtime || {
    state: {},
    stateVersion: 0,
    setState: () => {},
    evaluate: (expr: string) => expr,
  }

  return (
    <Widget 
      component={component} 
      runtime={effectiveRuntime}
      onEvent={(eventName: string, payload?: any) => {
        if (previewMode) {
          console.log(`[Preview] Event: ${eventName}`, payload)
        } else if (runtime) {
          // In real mode, emit to event bus
          const eventHandler = component.events?.[eventName]
          if (eventHandler && runtime.evaluate) {
            try {
              runtime.evaluate(eventHandler)
            } catch (e) {
              console.error(`Failed to execute event handler for ${eventName}:`, e)
            }
          }
        }
      }}
    />
  )
}
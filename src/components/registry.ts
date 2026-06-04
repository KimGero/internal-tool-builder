import type React from 'react'
import type { ComponentDefinition, AppComponent, Runtime } from '../types'
import { ButtonWidget, ButtonDefinition } from './ButtonWidget'
import { InputWidget, InputDefinition } from './InputWidget'
// Imports added here each day as new widgets are built

export interface WidgetProps {
  component: AppComponent
  runtime: Runtime
  onEvent: (event: string, data?: unknown) => void
}

export interface RegistryEntry extends ComponentDefinition {
  Widget: React.ComponentType<WidgetProps>
}

export const REGISTRY: Record<string, RegistryEntry> = {
  button: { ...ButtonDefinition, Widget: ButtonWidget },
  input:  { ...InputDefinition,  Widget: InputWidget  },
}

export const getComponentList = (): RegistryEntry[] => Object.values(REGISTRY)
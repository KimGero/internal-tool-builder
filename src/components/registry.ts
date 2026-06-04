import type React from 'react'
import type { ComponentDefinition, AppComponent, Runtime } from '../types'
import { ButtonWidget, ButtonDefinition } from './ButtonWidget'
import { InputWidget,  InputDefinition  } from './InputWidget'
import { TableWidget,  TableDefinition  } from './TableWidget'
import { FormWidget,   FormDefinition   } from './FormWidget'
import { ChartWidget,  ChartDefinition  } from './ChartWidget'

export interface WidgetProps {
  component: AppComponent
  runtime: Runtime
  data?: unknown[]           
  onEvent: (event: string, data?: unknown) => void
}

export interface RegistryEntry extends ComponentDefinition {
  Widget: React.ComponentType<WidgetProps>
}

export const REGISTRY: Record<string, RegistryEntry> = {
  button: { ...ButtonDefinition, Widget: ButtonWidget },
  input:  { ...InputDefinition,  Widget: InputWidget  },
  table:  { ...TableDefinition,  Widget: TableWidget  },
  form:   { ...FormDefinition,   Widget: FormWidget   },
  chart:  { ...ChartDefinition,  Widget: ChartWidget  },
}

export const getComponentList = (): RegistryEntry[] => Object.values(REGISTRY)
import type React from 'react'
import type { ComponentDefinition, AppComponent, Runtime } from '../types'
import { ButtonWidget,     ButtonDefinition     } from './ButtonWidget'
import { InputWidget,      InputDefinition      } from './InputWidget'
import { TableWidget,      TableDefinition      } from './TableWidget'
import { FormWidget,       FormDefinition       } from './FormWidget'
import { ChartWidget,      ChartDefinition      } from './ChartWidget'
import { DatePickerWidget, DatePickerDefinition } from './DatePickerWidget'
import { KanbanWidget,     KanbanDefinition     } from './KanbanWidget'
import { CalendarWidget, CalendarDefinition }   from './CalendarWidget'
import { ContainerWidget, ContainerDefinition } from './ContainerWidget'

export interface WidgetProps {
  component: AppComponent
  runtime: Runtime
  data?: unknown[]
  onEvent: (event: string, data?: unknown) => void
  children?: React.ReactNode
}

export interface RegistryEntry extends ComponentDefinition {
  Widget: React.ComponentType<WidgetProps>
}

export const REGISTRY: Record<string, RegistryEntry> = {
  button:     { ...ButtonDefinition,     Widget: ButtonWidget     },
  input:      { ...InputDefinition,      Widget: InputWidget      },
  table:      { ...TableDefinition,      Widget: TableWidget      },
  form:       { ...FormDefinition,       Widget: FormWidget       },
  chart:      { ...ChartDefinition,      Widget: ChartWidget      },
  datepicker: { ...DatePickerDefinition, Widget: DatePickerWidget },
  kanban:     { ...KanbanDefinition,     Widget: KanbanWidget     },
  calendar:  { ...CalendarDefinition,  Widget: CalendarWidget  },
  container: { ...ContainerDefinition, Widget: ContainerWidget },
}

export const getComponentList = (): RegistryEntry[] => Object.values(REGISTRY)
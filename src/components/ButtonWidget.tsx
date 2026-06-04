import React from 'react'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { ComponentDefinition } from '../types'
import type { WidgetProps } from './registry'

const VARIANTS: Record<string, string> = {
  primary:   'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
  secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
  danger:    'bg-red-600 text-white border-red-600 hover:bg-red-700',
  ghost:     'bg-transparent text-gray-700 border-transparent hover:bg-gray-100',
}

export function ButtonWidget({ component, runtime, onEvent }: WidgetProps) {
  const [loading, setLoading] = React.useState(false)

  const label   = String(runtime.evaluate(String(component.props.text ?? 'Click Me')))
  const variant = String(component.props.variant ?? 'primary')
  const isDisabled = Boolean(component.props.disabled) || loading

  const handleClick = async () => {
    setLoading(true)
    try {
      onEvent('click')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border',
        'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant] ?? VARIANTS.primary,
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {label}
    </button>
  )
}

export const ButtonDefinition: ComponentDefinition = {
  type: 'button',
  label: 'Button',
  icon: 'MousePointerClick',
  defaultProps: {
    text: 'Click Me',
    variant: 'primary',
    disabled: false,
  },
  defaultEvents: {
    click: '',
  },
}
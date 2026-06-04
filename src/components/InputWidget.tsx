import React from 'react'
import { clsx } from 'clsx'
import type { ComponentDefinition } from '../types'
import type { WidgetProps } from './registry'

export function InputWidget({ component, runtime, onEvent }: WidgetProps) {
  const label       = String(component.props.label ?? '')
  const placeholder = String(component.props.placeholder ?? '')
  const inputType   = String(component.props.type ?? 'text')
  const disabled    = Boolean(component.props.disabled)
  const binding     = String(component.props.binding ?? '')|| `_input_${component.id}` 


  const value = binding ? String(runtime.state[binding] ?? '') : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    
    const val = inputType === 'number' && raw !== '' ? Number(raw) : raw
    if (binding) runtime.setState(binding, val)
    onEvent('change', { value: val })
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type={inputType}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onBlur={(e) => onEvent('blur', { value: e.target.value })}
        onFocus={() => onEvent('focus')}
        className={clsx(
          'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm',
          'placeholder:text-gray-400',
          'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
        )}
      />
    </div>
  )
}

export const InputDefinition: ComponentDefinition = {
  type: 'input',
  label: 'Input',
  icon: 'TextCursorInput',
  defaultProps: {
    label: 'Label',
    placeholder: 'Enter value...',
    type: 'text',
    binding: 'inputValue',
    disabled: false,
  },
  defaultEvents: {
    change: '',
    blur: '',
    focus: '',
  },
}
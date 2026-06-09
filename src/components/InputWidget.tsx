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
        <label className="text-sm font-medium text-[var(--sh-ts)]">
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
          'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[var(--sh-ts)] shadow-sm',
          'placeholder:text-[var(--sh-td)]',
          'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          'disabled:cursor-not-allowed disabled:bg-[var(--sh-s)] disabled:text-[var(--sh-t)]',
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
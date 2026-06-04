import React from 'react'
import { clsx } from 'clsx'
import type { ComponentDefinition } from '../types'
import type { WidgetProps } from './registry'



export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select'
  placeholder?: string
  required?: boolean
  defaultValue?: string
  options?: Array<{ label: string; value: string }>  // select only
}

type FieldValues = Record<string, string>



const fieldClass = (hasError: boolean) =>
  clsx(
    'w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm',
    'placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
    'transition-colors',
    hasError
      ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/20'
      : 'border-gray-300 bg-white',
  )



export function FormWidget({ component, runtime, onEvent }: WidgetProps) {
  const fields      = (component.props.fields as FormField[]) ?? []
  const submitLabel = String(component.props.submitLabel ?? 'Submit')
  const showReset   = component.props.showReset === true
  const binding     = String(component.props.binding ?? '')

  
  const [values, setValues] = React.useState<FieldValues>(() => {
    const stored = binding
      ? (runtime.state[binding] as FieldValues | undefined)
      : undefined
    return Object.fromEntries(
      fields.map(f => [f.name, stored?.[f.name] ?? String(f.defaultValue ?? '')])
    )
  })

  const [errors,    setErrors]    = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState(false)

  

  const pushValues = (next: FieldValues) => {
    setValues(next)
    if (binding) runtime.setState(binding, next)
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    for (const f of fields) {
      if (f.required && !values[f.name]?.trim()) {
        next[f.name] = `${f.label} is required`
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }



  const handleChange = (name: string, raw: string) => {
    const next = { ...values, [name]: raw }
    pushValues(next)
    // Clear the error for this field as soon as the user starts correcting it
    if (errors[name]) setErrors(e => { const n = { ...e }; delete n[name]; return n })
    onEvent('fieldChange', { name, value: raw, values: next })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    pushValues(values)
    onEvent('submit', { values })
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2000)
  }

  const handleReset = () => {
    const empty = Object.fromEntries(fields.map(f => [f.name, '']))
    pushValues(empty)
    setErrors({})
    onEvent('reset', { values: empty })
  }



  const renderField = (field: FormField) => {
    const id    = `${component.id}-${field.name}`
    const value = values[field.name] ?? ''
    const error = errors[field.name]

    if (field.type === 'textarea') {
      return (
        <textarea
          id={id}
          value={value}
          placeholder={field.placeholder}
          rows={3}
          onChange={e => handleChange(field.name, e.target.value)}
          className={fieldClass(!!error)}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <select
          id={id}
          value={value}
          onChange={e => handleChange(field.name, e.target.value)}
          className={fieldClass(!!error)}
        >
          <option value="">Select…</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        id={id}
        type={field.type}
        value={value}
        placeholder={field.placeholder}
        autoComplete={field.type === 'email' ? 'email' : undefined}
        onChange={e => handleChange(field.name, e.target.value)}
        className={fieldClass(!!error)}
      />
    )
  }

  

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4"
    >
      {fields.map(field => {
        const error = errors[field.name]
        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label
              htmlFor={`${component.id}-${field.name}`}
              className="text-sm font-medium text-gray-700"
            >
              {field.label}
              {field.required && (
                <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
              )}
            </label>

            {renderField(field)}

            {error && (
              <p role="alert" className="text-xs text-red-500">
                {error}
              </p>
            )}
          </div>
        )
      })}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className={clsx(
            'inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'transition-colors',
            submitted
              ? 'bg-green-600 cursor-default'
              : 'bg-blue-600 hover:bg-blue-700',
          )}
        >
          {submitted ? '✓ Submitted' : submitLabel}
        </button>

        {showReset && (
          <button
            type="button"
            onClick={handleReset}
            className={clsx(
              'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700',
              'hover:bg-gray-50 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
            )}
          >
            Reset
          </button>
        )}
      </div>
    </form>
  )
}


export const FormDefinition: ComponentDefinition = {
  type: 'form',
  label: 'Form',
  icon: 'ClipboardList',
  defaultProps: {
    fields: [
      { name: 'name',  label: 'Name',  type: 'text',  placeholder: 'Enter your name',  required: true  },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', required: true  },
    ],
    submitLabel: 'Submit',
    binding: 'formData',
    showReset: false,
  },
  defaultEvents: {
    submit:      '',
    fieldChange: '',
    reset:       '',
  },
}
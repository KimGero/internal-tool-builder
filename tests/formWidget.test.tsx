import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FormWidget } from '../src/components/FormWidget'
import type { AppComponent, Runtime } from '../src/types'



function makeRuntime(state: Record<string, unknown> = {}): Runtime {
  return {
    state,
    stateVersion: 0,
    setState: vi.fn(),
    evaluate: vi.fn((expr: string) => expr),
  }
}

function makeComponent(overrides: Partial<AppComponent['props']> = {}): AppComponent {
  return {
    id: 'test-form',
    type: 'form',
    events: {},
    props: {
      fields: [
        { name: 'name',  label: 'Name',  type: 'text',  required: true  },
        { name: 'email', label: 'Email', type: 'email', required: false },
      ],
      submitLabel: 'Submit',
      binding: 'formData',
      showReset: false,
      ...overrides,
    },
  }
}


describe('FormWidget ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â rendering', () => {
  it('renders a field for each configured entry', () => {
    render(<FormWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders the submit button with the configured label', () => {
    render(
      <FormWidget
        component={makeComponent({ submitLabel: 'Send Message' })}
        runtime={makeRuntime()}
        onEvent={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('does not render the reset button when showReset is false', () => {
    render(<FormWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
  })

  it('renders the reset button when showReset is true', () => {
    render(
      <FormWidget component={makeComponent({ showReset: true })} runtime={makeRuntime()} onEvent={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('marks required fields with an asterisk', () => {
    render(<FormWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    const nameLabel = screen.getByText('Name', { selector: 'label' }).closest('label')
    expect(nameLabel?.textContent).toMatch(/\*/)
  })

  it('renders a select field with its options', () => {
    render(
      <FormWidget
        component={makeComponent({
          fields: [
            {
              name: 'role',
              label: 'Role',
              type: 'select',
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'User',  value: 'user'  },
              ],
            },
          ],
        })}
        runtime={makeRuntime()}
        onEvent={vi.fn()}
      />
    )
    expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'User' })).toBeInTheDocument()
  })
})

describe('FormWidget ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â initialisation from runtime state', () => {
  it('pre-fills fields from the runtime binding', () => {
    const runtime = makeRuntime({ formData: { name: 'Alice', email: 'alice@test.com' } })
    render(<FormWidget component={makeComponent()} runtime={runtime} onEvent={vi.fn()} />)
    expect(screen.getByLabelText<HTMLInputElement>(/name/i).value).toBe('Alice')
    expect(screen.getByLabelText<HTMLInputElement>(/email/i).value).toBe('alice@test.com')
  })
})

describe('FormWidget ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â field interaction', () => {
  it('fires fieldChange when a field value changes', () => {
    const onEvent = vi.fn()
    render(<FormWidget component={makeComponent()} runtime={makeRuntime()} onEvent={onEvent} />)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Bob' } })
    expect(onEvent).toHaveBeenCalledWith('fieldChange', expect.objectContaining({
      name: 'name',
      value: 'Bob',
    }))
  })

  it('calls runtime.setState with the updated values', () => {
    const runtime = makeRuntime()
    render(<FormWidget component={makeComponent()} runtime={runtime} onEvent={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Bob' } })
    expect(runtime.setState).toHaveBeenCalledWith('formData', expect.objectContaining({ name: 'Bob' }))
  })

  it('removes the field error as soon as the user starts correcting it', async () => {
    render(<FormWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)

    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

   
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'A' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('FormWidget ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â validation', () => {
  it('shows an error for empty required fields on submit', async () => {
    render(<FormWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toMatch(/name is required/i)
  })

  it('does not fire the submit event when validation fails', () => {
    const onEvent = vi.fn()
    render(<FormWidget component={makeComponent()} runtime={makeRuntime()} onEvent={onEvent} />)
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onEvent).not.toHaveBeenCalledWith('submit', expect.anything())
  })

  it('does not show errors when a non-required field is left empty', () => {
    render(<FormWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Bob' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    // email is not required ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no error for it
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('FormWidget ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â submission', () => {
  it('fires submit with all field values when form is valid', () => {
    const onEvent = vi.fn()
    render(<FormWidget component={makeComponent()} runtime={makeRuntime()} onEvent={onEvent} />)
    fireEvent.change(screen.getByLabelText(/name/i),  { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@test.com' } })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onEvent).toHaveBeenCalledWith('submit', {
      values: { name: 'Alice', email: 'alice@test.com' },
    })
  })
})

describe('FormWidget ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â reset', () => {
  it('clears all fields and fires reset event', () => {
    const onEvent = vi.fn()
    render(
      <FormWidget
        component={makeComponent({ showReset: true })}
        runtime={makeRuntime()}
        onEvent={onEvent}
      />
    )
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByLabelText<HTMLInputElement>(/name/i).value).toBe('')
    expect(onEvent).toHaveBeenCalledWith('reset', { values: expect.objectContaining({ name: '' }) })
  })
})
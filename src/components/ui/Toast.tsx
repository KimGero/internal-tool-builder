import React from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useBuilderStore } from '../../store/builderStore'

export interface ToastMessage {
  id:      string
  message: string
  type:    'success' | 'error' | 'info'
}

const BORDER: Record<ToastMessage['type'], string> = {
  success: 'border-l-[var(--ok)]',
  error:   'border-l-[var(--err)]',
  info:    'border-l-[var(--ac)]',
}

const ICON_COLOR: Record<ToastMessage['type'], string> = {
  success: 'text-[var(--ok)]',
  error:   'text-[var(--err)]',
  info:    'text-[var(--ac-t)]',
}

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }

function Toast({ toast }: { toast: ToastMessage }) {
  const removeToast = useBuilderStore(s => s.removeToast)
  const [leaving, setLeaving] = React.useState(false)
  const Icon = ICONS[toast.type]

  const dismiss = () => {
    setLeaving(true)
    setTimeout(() => removeToast(toast.id), 150)
  }

  React.useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2800)
    const t2 = setTimeout(() => removeToast(toast.id), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [toast.id, removeToast])

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'flex items-center gap-3 pl-4 pr-3 py-3',
        'rounded-lg border border-[var(--sh-b)] border-l-2',
        'bg-[var(--sh-s)] shadow-xl',
        'min-w-[260px] max-w-[340px]',
        BORDER[toast.type],
        leaving ? 'toast-out' : 'toast-in',
      )}
    >
      <Icon className={clsx('w-4 h-4 shrink-0', ICON_COLOR[toast.type])} aria-hidden />
      <span className="flex-1 text-xs text-[var(--sh-ts)]">{toast.message}</span>
      <button
        aria-label="Dismiss"
        onClick={dismiss}
        className="text-[var(--sh-td)] hover:text-[var(--sh-ts)] transition-colors p-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useBuilderStore(s => s.toasts) || []  
  if (toasts.length === 0) return null
  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end"
    >
      {toasts.map(t => <Toast key={t.id} toast={t} />)}
    </div>
  )
}
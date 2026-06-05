import { clsx } from 'clsx'
import type { Active } from '@dnd-kit/core'
import { getComponentList, REGISTRY } from '../components/registry'

interface Props {
  active: Active | null
}

export function DragOverlayContent({ active }: Props) {
  if (!active) return null

  const data = active.data.current
  if (data?.source !== 'palette') return null

  const entry = REGISTRY[data.componentType as string]
  if (!entry) return null

  return (
    <div className={clsx(
      'flex items-center gap-2.5 px-3 py-2.5 rounded-md shadow-lg',
      'bg-white border border-blue-300 text-blue-700 text-sm font-medium',
      'cursor-grabbing select-none pointer-events-none',
    )}>
      {entry.label}
    </div>
  )
}
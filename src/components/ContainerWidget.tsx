import type React from 'react'
import { clsx } from 'clsx'
import type { ComponentDefinition } from '../types'
import type { WidgetProps } from './registry'

type Layout = 'column' | 'row' | 'grid'

export function ContainerWidget({
  component,
  children,
}: WidgetProps & React.PropsWithChildren) {

  const title    = String(component.props.title      ?? '')
  const layout   = (component.props.layout   ?? 'column') as Layout
  const padding  = String(component.props.padding    ?? '16px')
  const gap      = String(component.props.gap        ?? '12px')
  const bordered = Boolean(component.props.bordered  ?? true)
  const cols = Math.max(1, Number(component.props.cols ?? 2) || 1)
  const bg       = String(component.props.background ?? '')


  const contentStyle: React.CSSProperties = {
    display:             layout === 'grid' ? 'grid' : 'flex',
    flexDirection:       layout === 'column' ? 'column' : 'row',
    flexWrap:            layout === 'row' ? 'wrap' : undefined,
    alignItems:          layout === 'row' ? 'flex-start' : undefined,
    gridTemplateColumns: layout === 'grid' ? `repeat(${cols}, minmax(0, 1fr))` : undefined,
    gap,
    padding,
    ...(bg ? { background: bg } : {}),
  }

  return (
    <div className={clsx(
      'rounded-lg overflow-hidden w-full',
      bordered && 'border border-[var(--sh-b)]',
    )}>

      {title && (
        <div className="px-4 py-2.5 bg-[var(--sh-s)] border-b border-[var(--sh-b)]">
          <h3 className="text-sm font-medium text-[var(--sh-ts)]">{title}</h3>
        </div>
      )}

      <div style={contentStyle}>
        {children ?? (
          <div className="flex items-center justify-center w-full py-10">
            <p className="text-sm text-[var(--sh-td)]">Drop components here</p>
          </div>
        )}
      </div>

    </div>
  )
}

export const ContainerDefinition: ComponentDefinition = {
  type: 'container',
  label: 'Container',
  icon: 'LayoutTemplate',
  defaultProps: {
    title:      '',
    layout:     'column',
    padding:    '16px',
    gap:        '12px',
    bordered:   true,
    cols:       2,
    background: '',
  },
  defaultEvents: {},
}
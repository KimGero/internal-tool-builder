import React from 'react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartWidget } from '../src/components/ChartWidget'
import type { AppComponent, Runtime } from '../src/types'

// ─────────────────────────────────────────────
// Recharts mock
// ResponsiveContainer queries the DOM for dimensions which jsdom
// cannot provide, so it renders nothing. Replace it with a plain
// fixed-size wrapper so the inner chart elements are always mounted.
// ─────────────────────────────────────────────

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,

    // Recharts reads DOM dimensions via getBoundingClientRect / ResizeObserver.
    // jsdom returns zeros for both, so any component that gates rendering on
    // non-zero dimensions will produce nothing.  Replace every layout-sensitive
    // piece with a minimal stub that renders unconditionally.

    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),

    // Chart containers — preserve the .recharts-wrapper class so existing
    // assertions keep working, and pass children through so series render.
    BarChart:  ({ children }: { children: React.ReactNode }) => <div className="recharts-wrapper" data-testid="bar-chart">{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div className="recharts-wrapper" data-testid="line-chart">{children}</div>,
    AreaChart: ({ children }: { children: React.ReactNode }) => <div className="recharts-wrapper" data-testid="area-chart">{children}</div>,
    PieChart:  ({ children }: { children: React.ReactNode }) => <div className="recharts-wrapper" data-testid="pie-chart">{children}</div>,

    // Series primitives — each renders a queryable element tagged with its
    // dataKey so tests can count and inspect series without depending on SVG.
    Bar:  ({ dataKey }: { dataKey: string }) => <div data-testid="series" data-key={dataKey} />,
    Line: ({ dataKey }: { dataKey: string }) => <div data-testid="series" data-key={dataKey} />,
    Area: ({ dataKey }: { dataKey: string }) => <div data-testid="series" data-key={dataKey} />,
    Pie:  ({ dataKey, children }: { dataKey: string; children?: React.ReactNode }) => (
      <div data-testid="series" data-key={dataKey}>{children}</div>
    ),

    // Decorators — safe no-ops in jsdom
    XAxis:         () => null,
    YAxis:         () => null,
    CartesianGrid: () => null,
    Tooltip:       () => null,
    Legend:        () => null,
    Cell:          () => null,
  }
})

// recharts uses ResizeObserver — must mock before rendering
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe()    {}
    unobserve()  {}
    disconnect() {}
  }
})

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function makeRuntime(state: Record<string, unknown> = {}): Runtime {
  return {
    state,
    setState: vi.fn(),
    evaluate: vi.fn((expr: string) => expr),
  }
}

function makeComponent(overrides: Partial<AppComponent['props']> = {}): AppComponent {
  return {
    id: 'test-chart',
    type: 'chart',
    events: {},
    props: {
      data:       '',
      chartType:  'bar',
      xKey:       'name',
      series:     [],
      height:     300,
      showGrid:   true,
      showLegend: true,
      ...overrides,
    },
  }
}

const SAMPLE_DATA = [
  { name: 'Jan', revenue: 4000, costs: 2400 },
  { name: 'Feb', revenue: 3000, costs: 1398 },
  { name: 'Mar', revenue: 5000, costs: 3200 },
]

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('ChartWidget — empty state', () => {
  it('shows the empty state when no data is provided', () => {
    render(<ChartWidget component={makeComponent()} runtime={makeRuntime()} onEvent={vi.fn()} />)
    expect(screen.getByLabelText('Empty chart')).toBeInTheDocument()
    expect(screen.getByText(/connect a data source/i)).toBeInTheDocument()
  })

  it('shows the empty state when canvasData is an empty array', () => {
    render(
      <ChartWidget component={makeComponent()} data={[]} runtime={makeRuntime()} onEvent={vi.fn()} />
    )
    expect(screen.getByLabelText('Empty chart')).toBeInTheDocument()
  })
})

describe('ChartWidget — data resolution', () => {
  it('prefers canvasData when provided', () => {
    const { container } = render(
      <ChartWidget
        component={makeComponent()}
        data={SAMPLE_DATA}
        runtime={makeRuntime()}
        onEvent={vi.fn()}
      />
    )
    expect(screen.queryByLabelText('Empty chart')).not.toBeInTheDocument()
    expect(container.querySelector('.recharts-wrapper')).toBeInTheDocument()
  })

  it('resolves data from a runtime state expression', () => {
    render(
      <ChartWidget
        component={makeComponent({ data: 'sales' })}
        runtime={makeRuntime({ sales: SAMPLE_DATA })}
        onEvent={vi.fn()}
      />
    )
    expect(screen.queryByLabelText('Empty chart')).not.toBeInTheDocument()
  })

  it('shows empty state when expression evaluates to a non-array', () => {
    render(
      <ChartWidget
        component={makeComponent({ data: 'badValue' })}
        runtime={makeRuntime({ badValue: 'not an array' })}
        onEvent={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Empty chart')).toBeInTheDocument()
  })
})

describe('ChartWidget — chart types smoke tests', () => {
  const types = ['bar', 'line', 'area', 'pie'] as const

  for (const chartType of types) {
    it(`renders ${chartType} chart without crashing`, () => {
      expect(() =>
        render(
          <ChartWidget
            component={makeComponent({ chartType })}
            data={SAMPLE_DATA}
            runtime={makeRuntime()}
            onEvent={vi.fn()}
          />
        )
      ).not.toThrow()
    })
  }
})

describe('ChartWidget — series auto-detection', () => {
  it('auto-detects numeric keys when series prop is empty', () => {
    // With series: [], the chart should detect 'revenue' and 'costs'
    // and render a series element for each
    render(
      <ChartWidget
        component={makeComponent({ series: [] })}
        data={SAMPLE_DATA}
        runtime={makeRuntime()}
        onEvent={vi.fn()}
      />
    )
    expect(screen.queryByLabelText('Empty chart')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('series').length).toBe(2)
  })

  it('uses explicit series config when provided', () => {
    render(
      <ChartWidget
        component={makeComponent({
          series: [{ dataKey: 'revenue', label: 'Revenue', color: '#3b82f6' }],
        })}
        data={SAMPLE_DATA}
        runtime={makeRuntime()}
        onEvent={vi.fn()}
      />
    )
    // Only one series → only one series element
    expect(screen.getAllByTestId('series').length).toBe(1)
  })
})
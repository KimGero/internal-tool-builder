import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { ExpressionEngine } from '../core/expressionEngine'
import type { ComponentDefinition } from '../types'
import type { WidgetProps } from './registry'



export interface ChartSeries {
  dataKey: string
  label?: string
  color?: string
}

type CartesianType = 'bar' | 'line' | 'area'
type ChartType = CartesianType | 'pie'



const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

const CARTESIAN_COMPONENTS: Record<CartesianType, React.ElementType> = {
  bar:  BarChart,
  line: LineChart,
  area: AreaChart,
}



export function ChartWidget({ component, data: canvasData, runtime }: WidgetProps) {
  const chartType  = (String(component.props.chartType ?? 'bar')) as ChartType
  const xKey       = String(component.props.xKey ?? 'name')
  const series     = (component.props.series as ChartSeries[]) ?? []
  const height     = Number(component.props.height ?? 300)
  const showGrid   = component.props.showGrid !== false
  const showLegend = component.props.showLegend !== false

  
  const data = React.useMemo(() => {
    if (Array.isArray(canvasData) && canvasData.length > 0) return canvasData
    const expr = String(component.props.data ?? '')
    if (!expr) return []
    const raw = ExpressionEngine.evaluateRaw(expr, runtime.state)
    return Array.isArray(raw) ? raw : []
  
  }, [canvasData, component.props.data, runtime.stateVersion]) as Record<string, unknown>[]

  
  const resolvedSeries = React.useMemo((): Required<ChartSeries>[] => {
    const base: ChartSeries[] =
      series.length > 0
        ? series
        : data.length === 0
        ? []
        : Object.entries(data[0])
            .filter(([k, v]) => k !== xKey && typeof v === 'number')
            .map(([key]) => ({ dataKey: key, label: key }))

    return base.map((s, i) => ({
      dataKey: s.dataKey,
      label:   s.label ?? s.dataKey,
      color:   s.color ?? PALETTE[i % PALETTE.length],
    }))
  }, [data, series, xKey])


  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50"
        style={{ height }}
        aria-label="Empty chart"
      >
        <p className="text-sm text-gray-400">Connect a data source to see your chart</p>
      </div>
    )
  }

  
  if (chartType === 'pie') {
    const valueKey = resolvedSeries[0]?.dataKey ?? 'value'
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius="70%"
            label={({ name, percent }) =>
              `${name} (${(percent ?? 0* 100).toFixed(0)}%)`
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    )
  }

  
  const ChartComp = CARTESIAN_COMPONENTS[chartType] ?? BarChart

  const renderSeriesElements = () =>
    resolvedSeries.map(({ dataKey, label, color }) => {
      if (chartType === 'line') {
        return (
          <Line
            key={dataKey}
            type="monotone"
            dataKey={dataKey}
            name={label}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        )
      }
      if (chartType === 'area') {
        return (
          <Area
            key={dataKey}
            type="monotone"
            dataKey={dataKey}
            name={label}
            stroke={color}
            fill={`${color}33`}   
            strokeWidth={2}
          />
        )
      }
    
      return (
        <Bar
          key={dataKey}
          dataKey={dataKey}
          name={label}
          fill={color}
          radius={[4, 4, 0, 0]}
          maxBarSize={64}
        />
      )
    })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComp data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={40} />
        <Tooltip />
        {showLegend && <Legend />}
        {renderSeriesElements()}
      </ChartComp>
    </ResponsiveContainer>
  )
}



export const ChartDefinition: ComponentDefinition = {
  type: 'chart',
  label: 'Chart',
  icon: 'BarChart2',
  defaultProps: {
    data:       '',
    chartType:  'bar',
    xKey:       'name',
    series:     [],
    height:     300,
    showGrid:   true,
    showLegend: true,
  },
  defaultEvents: {},
}
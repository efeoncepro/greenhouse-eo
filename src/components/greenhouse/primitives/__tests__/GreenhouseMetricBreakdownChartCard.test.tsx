// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseMetricBreakdownChartCard from '../GreenhouseMetricBreakdownChartCard'
import type {
  GreenhouseMetricBreakdownMetric,
  GreenhouseMetricBreakdownPoint
} from '../GreenhouseMetricBreakdownChartCard'

vi.mock('@/libs/Recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid='responsive-container'>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <svg data-testid='bar-chart'>{children}</svg>,
  Bar: ({ children }: { children: ReactNode }) => <g>{children}</g>,
  Cell: () => <g data-testid='cell' />,
  Tooltip: () => <g data-testid='tooltip' />,
  XAxis: () => <g data-testid='x-axis' />,
  YAxis: () => <g data-testid='y-axis' />
}))

const series: GreenhouseMetricBreakdownPoint[] = [
  { label: 'Mo', value: 51 },
  { label: 'Tu', value: 104 },
  { label: 'We', value: 89 },
  { label: 'Th', value: 56 },
  { label: 'Fr', value: 137 },
  { label: 'Sa', value: 73 },
  { label: 'Su', value: 96 }
]

const metrics: GreenhouseMetricBreakdownMetric[] = [
  {
    id: 'earnings',
    label: 'Earnings',
    value: '$545.69',
    icon: 'tabler-currency-dollar',
    tone: 'success',
    progress: 64
  },
  {
    id: 'profit',
    label: 'Profit',
    value: '$256.34',
    icon: 'tabler-chart-pie-2',
    tone: 'info',
    progress: 58
  },
  {
    id: 'expense',
    label: 'Expense',
    value: '$74.19',
    icon: 'tabler-brand-paypal',
    tone: 'error',
    progress: 22
  }
]

afterEach(cleanup)

describe('GreenhouseMetricBreakdownChartCard', () => {
  it('renders a KPI, weekly chart summary and metric meters', () => {
    const { getByRole, getByText, getAllByRole, getAllByTestId } = renderWithTheme(
      <GreenhouseMetricBreakdownChartCard
        title='Earning Reports'
        subtitle='Weekly Earnings Overview'
        heroValue='$468'
        deltaLabel='+4.2%'
        description={['You informed of this week', 'compared to last week']}
        series={series}
        metrics={metrics}
        kind='earningReports'
      />
    )

    expect(getByText('Earning Reports')).toBeInTheDocument()
    expect(getByText('$468')).toBeInTheDocument()
    expect(getByText('+4.2%')).toBeInTheDocument()
    expect(getByRole('img')).toHaveAccessibleName('Earning Reports, Weekly Earnings Overview. Weekly breakdown')
    expect(getByText(/Mo 51, Tu 104, We 89/)).toBeInTheDocument()
    expect(getByText('Earnings')).toBeInTheDocument()
    expect(getByText('$545.69')).toBeInTheDocument()
    expect(getAllByRole('meter')).toHaveLength(3)
    expect(getAllByTestId('cell')).toHaveLength(7)
  })
})

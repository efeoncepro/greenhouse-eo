// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseChartCard from '../GreenhouseChartCard'
import type { GreenhouseChartTab } from '../GreenhouseChartCard'

vi.mock('@/libs/Recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid='responsive-container'>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <svg data-testid='bar-chart'>{children}</svg>,
  Bar: ({ children }: { children: ReactNode }) => <g>{children}</g>,
  CartesianGrid: () => <g data-testid='grid' />,
  Cell: () => <g data-testid='cell' />,
  LabelList: () => <g data-testid='label-list' />,
  Tooltip: () => <g data-testid='tooltip' />,
  XAxis: () => <g data-testid='x-axis' />,
  YAxis: () => <g data-testid='y-axis' />
}))

const tabs: GreenhouseChartTab[] = [
  {
    id: 'orders',
    label: 'Orders',
    icon: 'tabler-shopping-cart',
    data: [
      { label: 'Jan', value: 28000 },
      { label: 'Feb', value: 10000 }
    ]
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'tabler-chart-bar',
    data: [
      { label: 'Jan', value: 22000 },
      { label: 'Feb', value: 18000 }
    ]
  },
  {
    id: 'add',
    label: 'Agregar metrica',
    icon: 'tabler-plus'
  }
]

afterEach(cleanup)

describe('GreenhouseChartCard', () => {
  it('renders tabs, chart and accessible table fallback', () => {
    const { getByRole, getByText, getAllByTestId } = renderWithTheme(
      <GreenhouseChartCard title='Earning Reports' subtitle='Yearly Earnings Overview' tabs={tabs} />
    )

    expect(getByText('Earning Reports')).toBeInTheDocument()
    expect(getByRole('tab', { name: 'Orders' })).toHaveAttribute('aria-selected', 'true')
    expect(getByRole('img')).toHaveAccessibleName(/Earning Reports, Yearly Earnings Overview. Orders/)
    expect(getByText('Orders: Jan 28k, Feb 10k')).toBeInTheDocument()
    expect(getAllByTestId('cell')).toHaveLength(2)
  })

  it('switches metric tabs and calls the add metric handler', () => {
    const onAddMetric = vi.fn()

    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseChartCard title='Earning Reports' tabs={tabs} onAddMetric={onAddMetric} />
    )

    fireEvent.click(getByRole('tab', { name: 'Sales' }))
    expect(getByRole('tab', { name: 'Sales' })).toHaveAttribute('aria-selected', 'true')
    expect(getByRole('img')).toHaveAccessibleName(/Earning Reports. Sales/)
    expect(getByText('Sales: Jan 22k, Feb 18k')).toBeInTheDocument()

    fireEvent.click(getByRole('tab', { name: 'Agregar metrica' }))
    expect(onAddMetric).toHaveBeenCalledTimes(1)
  })
})

// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseStackedDistributionChartCard from '../GreenhouseStackedDistributionChartCard'
import type { GreenhouseStackedDistributionSegment } from '../GreenhouseStackedDistributionChartCard'

vi.mock('@/libs/Recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid='responsive-container'>{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <svg data-testid='bar-chart'>{children}</svg>,
  Bar: ({ children }: { children: ReactNode }) => <g data-testid='stacked-bar'>{children}</g>,
  Tooltip: () => <g data-testid='tooltip' />,
  XAxis: () => <g data-testid='x-axis' />,
  YAxis: () => <g data-testid='y-axis' />
}))

const segments: GreenhouseStackedDistributionSegment[] = [
  {
    id: 'onTheWay',
    label: 'On the way',
    value: 39.7,
    detail: '2hr 10min',
    icon: 'tabler-car',
    tone: 'neutral'
  },
  {
    id: 'unloading',
    label: 'Unloading',
    value: 28.3,
    detail: '3hr 15min',
    icon: 'tabler-circle-arrow-down',
    tone: 'success'
  },
  {
    id: 'loading',
    label: 'Loading',
    value: 17.4,
    detail: '1hr 24min',
    icon: 'tabler-circle-arrow-up',
    tone: 'info'
  },
  {
    id: 'waiting',
    label: 'Waiting',
    value: 14.6,
    detail: '5hr 19min',
    icon: 'tabler-clock',
    tone: 'ink'
  }
]

afterEach(cleanup)

describe('GreenhouseStackedDistributionChartCard', () => {
  it('renders a stacked distribution with accessible summary and detail rows', () => {
    const { getByRole, getByText, getAllByTestId } = renderWithTheme(
      <GreenhouseStackedDistributionChartCard title='Vehicles overview' segments={segments} />
    )

    expect(getByText('Vehicles overview')).toBeInTheDocument()
    expect(getByRole('img')).toHaveAccessibleName('Vehicles overview. Distribucion por estado')
    expect(getByText(/On the way 2hr 10min, 39.7%/)).toBeInTheDocument()
    expect(getByText('3hr 15min')).toBeInTheDocument()
    expect(getByText('5hr 19min')).toBeInTheDocument()
    expect(getAllByTestId('stacked-bar')).toHaveLength(4)
  })
})

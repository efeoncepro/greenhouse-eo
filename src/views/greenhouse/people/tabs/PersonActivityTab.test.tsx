// @vitest-environment jsdom

import type { ReactElement } from 'react'

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'

import PersonActivityTab from './PersonActivityTab'

const fetchMock = vi.fn()

const testTheme = createTheme({
  palette: {
    customColors: {
      midnight: '#1f2937',
      lightAlloy: '#d1d5db'
    }
  }
} as any)

const renderWithTheme = (ui: ReactElement) =>
  render(
    <ThemeProvider theme={testTheme}>
      <CssBaseline />
      {ui}
    </ThemeProvider>
  )

vi.mock('@/components/greenhouse/NexaInsightsBlock', () => ({
  default: ({ insights, totalAnalyzed, lastAnalysis, runStatus, defaultExpanded }: {
    insights: Array<{ id: string; signalType: string; metricId: string }>
    totalAnalyzed: number
    lastAnalysis: string | null
    runStatus: string | null
    defaultExpanded?: boolean
  }) => (
    <div
      data-testid='nexa-insights-block'
      data-default-expanded={String(Boolean(defaultExpanded))}
    >
      {`${totalAnalyzed}:${runStatus ?? 'null'}:${lastAnalysis ?? 'null'}:${insights[0]?.metricId ?? 'none'}`}
    </div>
  )
}))

describe('PersonActivityTab', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders Nexa insights at the top of the activity surface from the intelligence snapshot', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/api/ico-engine/context')) {
        return {
          ok: true,
          json: async () => ({
            context: {
              totalTasks: 4,
              completedTasks: 2,
              activeTasks: 1,
              carryOverTasks: 1
            },
            metrics: [
              { metricId: 'rpa', value: 1.7, zone: null },
              { metricId: 'otd_pct', value: 72, zone: null },
              { metricId: 'ftr_pct', value: 88, zone: null },
              { metricId: 'throughput', value: 14, zone: null },
              { metricId: 'cycle_time', value: 3.2, zone: null },
              { metricId: 'stuck_assets', value: 1, zone: null },
              { metricId: 'pipeline_velocity', value: 0.8, zone: null }
            ],
            cscDistribution: []
          })
        }
      }

      if (url.includes('/api/people/member-1/intelligence')) {
        return {
          ok: true,
          json: async () => ({
            nexaInsights: {
              totalAnalyzed: 2,
              lastAnalysis: '2026-03-26T15:00:00.000Z',
              runStatus: 'succeeded',
              insights: [
                {
                  id: 'EO-AIE-0001',
                  signalType: 'root_cause',
                  metricId: 'rpa',
                  severity: 'critical',
                  explanation: '@[Ana Perez](member:member-2) está concentrando el cuello de botella en RpA.',
                  recommendedAction: 'Redistribuir carga con @[Space Alpha](space:space-1).'
                }
              ]
            }
          })
        }
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    const { container } = renderWithTheme(<PersonActivityTab memberId='member-1' />)

    await waitFor(() => {
      expect(screen.getByText('Actividad del período')).toBeInTheDocument()
    })

    const block = screen.getByTestId('nexa-insights-block')
    const gridContainer = container.querySelector('.MuiGrid-container')

    expect(block).toHaveTextContent('2:succeeded:2026-03-26T15:00:00.000Z:rpa')
    expect(block).toHaveAttribute('data-default-expanded', 'true')
    expect(gridContainer?.firstElementChild?.querySelector('[data-testid="nexa-insights-block"]')).toBe(block)
    expect(screen.getByText('Salud operativa')).toBeInTheDocument()
  })
})

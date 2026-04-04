// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import PersonIntelligenceTab from './PersonIntelligenceTab'

const fetchMock = vi.fn()

describe('PersonIntelligenceTab', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders operational usage from the canonical snapshot semantics and preserves source currency', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/api/people/member-1/intelligence')) {
        return {
          ok: true,
          json: async () => ({
            memberId: 'member-1',
            current: {
              period: { year: 2026, month: 3 },
              deliveryMetrics: [
                { metricId: 'rpa', value: 1.7, zone: null },
                { metricId: 'otd_pct', value: 72, zone: null },
                { metricId: 'ftr_pct', value: 88, zone: null },
                { metricId: 'cycle_time', value: 3.2, zone: null },
                { metricId: 'throughput', value: 14, zone: null },
                { metricId: 'pipeline_velocity', value: 0.8, zone: null },
                { metricId: 'stuck_assets', value: 1, zone: null }
              ],
              derivedMetrics: [
                { metricId: 'quality_index', value: 80, zone: 'optimal' },
                { metricId: 'dedication_index', value: 86, zone: 'optimal' },
                { metricId: 'utilization_pct', value: 86, zone: 'attention' },
                { metricId: 'cost_per_asset', value: 147857, zone: null },
                { metricId: 'cost_per_hour', value: 12937.5, zone: null }
              ],
              capacity: {
                contractedHoursMonth: 160,
                assignedHoursMonth: 160,
                usedHoursMonth: null,
                availableHoursMonth: 0,
                overcommitted: false,
                roleCategory: 'design',
                totalFteAllocation: 1,
                expectedThroughput: 20,
                capacityHealth: 'high',
                activeAssignmentCount: 1,
                usageKind: 'percent',
                usagePercent: 86
              },
              cost: {
                currency: 'USD',
                monthlyBaseSalary: 2200,
                monthlyTotalComp: 2300,
                compensationVersionId: 'cv-1',
                targetCurrency: 'CLP',
                costPerHourTarget: 12937.5
              },
              health: 'yellow',
              materializedAt: '2026-03-26T15:00:00.000Z',
              engineVersion: 'v2.0.0-person-intelligence',
              source: 'person_intelligence'
            },
            trend: [],
            meta: {
              source: 'person_intelligence',
              materializedAt: '2026-03-26T15:00:00.000Z',
              engineVersion: 'v2.0.0-person-intelligence'
            }
          })
        }
      }

      if (url.includes('/api/people/member-1/ico')) {
        return {
          ok: true,
          json: async () => ({
            metrics: [
              {
                metricId: 'rpa',
                value: 1.7,
                zone: null,
                benchmarkType: 'adapted',
                qualityGateStatus: 'healthy',
                confidenceLevel: 'high',
                qualityGateReasons: [],
                trustEvidence: { sampleSize: 14 }
              }
            ]
          })
        }
      }

      throw new Error(`Unexpected fetch call: ${url}`)
    })

    renderWithTheme(<PersonIntelligenceTab memberId='member-1' />)

    await waitFor(() => {
      expect(screen.getByText('Capacidad')).toBeInTheDocument()
    })

    expect(screen.getByText('Uso operativo')).toBeInTheDocument()
    expect(screen.getAllByText('86%').length).toBeGreaterThan(0)
    expect(screen.getByText('US$2,300')).toBeInTheDocument()
    expect(screen.getAllByText('$12.938').length).toBeGreaterThan(0)
    expect(screen.getByText('Dato confiable')).toBeInTheDocument()
    expect(screen.getByText('Benchmark adaptado · Confianza alta · Muestra 14')).toBeInTheDocument()
  })
})

// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import ClientEconomicsView from './ClientEconomicsView'

const fetchMock = vi.fn()

vi.mock('next/dynamic', () => ({
  default: () => {
    return function DynamicStub() {
      return null
    }
  }
}))

vi.mock('@core/components/option-menu', () => ({
  default: function OptionMenuStub() {
    return null
  }
}))

describe('ClientEconomicsView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows margins as unavailable when cost coverage is incomplete', async () => {
    fetchMock.mockImplementation(async (input: string) => {
      if (input.startsWith('/api/finance/intelligence/client-economics?')) {
        return {
          ok: true,
          json: async () => ({
            snapshots: [
              {
                snapshotId: 'snap-1',
                clientId: 'client-1',
                clientName: 'Sky Airline',
                periodYear: 2026,
                periodMonth: 3,
                totalRevenueClp: 13804000,
                directCostsClp: 1225,
                indirectCostsClp: 0,
                grossMarginClp: 13802775,
                grossMarginPercent: null,
                netMarginClp: 13802775,
                netMarginPercent: null,
                headcountFte: 3,
                revenuePerFte: 4601333.33,
                costPerFte: 408.33,
                hasCompleteCostCoverage: false,
                notes: 'Backfill from Codex for organization finance visibility',
                computedAt: '2026-03-20T19:42:48.185Z',
                createdAt: '2026-03-20T19:41:44.207Z',
                updatedAt: '2026-03-20T19:42:48.185Z'
              }
            ]
          })
        }
      }

      if (input === '/api/finance/intelligence/client-economics/trend?months=6') {
        return { ok: true, json: async () => ({ clients: [] }) }
      }

      throw new Error(`Unexpected fetch: ${input}`)
    })

    renderWithTheme(<ClientEconomicsView />)

    await waitFor(() => {
      expect(screen.getByText('La rentabilidad del período todavía no tiene cobertura de costos suficiente. Los ingresos sí están cargados, pero los márgenes quedan ocultos hasta que existan costos directos y/o laborales canonizados.')).toBeInTheDocument()
    })

    expect(screen.getAllByText('sin cobertura').length).toBeGreaterThan(0)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.queryByText('100.0%')).not.toBeInTheDocument()
  })
})

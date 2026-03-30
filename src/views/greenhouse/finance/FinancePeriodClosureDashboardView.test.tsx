// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import FinancePeriodClosureDashboardView from './FinancePeriodClosureDashboardView'

const fetchMock = vi.fn()

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('FinancePeriodClosureDashboardView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders periods and loads inline P&L on expand', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/cost-intelligence/periods?limit=12') {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                periodId: '2026-03',
                year: 2026,
                month: 3,
                closureStatus: 'ready',
                payrollStatus: 'exported',
                incomeStatus: 'complete',
                expenseStatus: 'complete',
                fxStatus: 'locked',
                payrollClosed: true,
                incomeClosed: true,
                expensesClosed: true,
                fxLocked: true,
                readinessPct: 100,
                isReady: true,
                snapshotRevision: 2,
                operationalCalendar: {
                  timezone: 'America/Santiago',
                  currentOperationalMonthKey: '2026-03',
                  inCurrentCloseWindow: true,
                  lastBusinessDayOfTargetMonth: '2026-03-31'
                },
                audit: {
                  closedAt: null,
                  closedBy: null,
                  reopenedAt: null,
                  reopenedBy: null,
                  reopenedReason: null,
                  updatedAt: '2026-03-30T12:00:00.000Z'
                }
              }
            ]
          })
        }
      }

      if (url === '/api/cost-intelligence/pl?year=2026&month=3&scopeType=client&limit=200') {
        return {
          ok: true,
          json: async () => ({
            snapshots: [
              {
                snapshotId: 'snap-1',
                scopeType: 'client',
                scopeId: 'client-1',
                scopeName: 'Sky Airline',
                periodYear: 2026,
                periodMonth: 3,
                periodClosed: false,
                snapshotRevision: 2,
                revenueClp: 12000000,
                laborCostClp: 3000000,
                directExpenseClp: 500000,
                overheadClp: 900000,
                totalCostClp: 4400000,
                grossMarginClp: 7600000,
                grossMarginPct: 63.3,
                headcountFte: 2.5
              }
            ]
          })
        }
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderWithTheme(<FinancePeriodClosureDashboardView canManageClosure canReopen />)

    await waitFor(() => {
      expect(screen.getByText('Cierre de período')).toBeInTheDocument()
      expect(screen.getByText('Marzo 2026')).toBeInTheDocument()
      expect(screen.getByText('Último día hábil: 31-03-2026')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Expandir 2026-03'))

    await waitFor(() => {
      expect(screen.getByText('P&L operativo por cliente')).toBeInTheDocument()
      expect(screen.getByText('Sky Airline')).toBeInTheDocument()
      expect(screen.getAllByText('Cerrar').length).toBeGreaterThan(0)
    })
  })
})

// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import MyAssignmentsView from './MyAssignmentsView'

const fetchMock = vi.fn()

describe('MyAssignmentsView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('uses member_capacity_economics summary for commercial availability and operational usage', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        assignments: [
          {
            assignmentId: 'a-1',
            clientId: 'client-sky',
            clientName: 'Sky Airline',
            fteAllocation: 1,
            hoursPerMonth: 160,
            roleTitleOverride: 'Designer',
            startDate: '2026-03-01',
            active: true
          }
        ],
        capacity: {
          periodYear: 2026,
          periodMonth: 3,
          contractedFte: 1,
          contractedHours: 160,
          assignedHours: 160,
          usageKind: 'percent',
          usedHours: null,
          usagePercent: 86,
          commercialAvailabilityHours: 0,
          operationalAvailabilityHours: null,
          targetCurrency: 'CLP',
          costPerHourTarget: 13500,
          suggestedBillRateTarget: 18225
        }
      })
    })

    renderWithTheme(<MyAssignmentsView />)

    await waitFor(() => {
      expect(screen.getByText('Mis Asignaciones')).toBeInTheDocument()
    })

    expect(screen.getByText('Horas asignadas')).toBeInTheDocument()
    expect(screen.getByText('Disponible comercial')).toBeInTheDocument()
    expect(screen.getByText('Uso operativo')).toBeInTheDocument()
    expect(screen.getByText('Índice operativo')).toBeInTheDocument()
    expect(screen.getAllByText('86%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0h').length).toBeGreaterThan(0)
  })
})

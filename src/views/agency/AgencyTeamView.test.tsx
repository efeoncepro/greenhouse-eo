// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import AgencyTeamView from './AgencyTeamView'

const fetchMock = vi.fn()

describe('AgencyTeamView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows unique members and avoids claiming 0h used when operational metrics are unavailable', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        team: {
          contractedHoursMonth: 320,
          assignedHoursMonth: 208,
          usedHoursMonth: null,
          availableHoursMonth: 112,
          overcommitted: false
        },
        members: [
          {
            memberId: 'member-1',
            displayName: 'Andres Carlosama',
            roleTitle: 'Operations Lead',
            fteAllocation: 1,
            capacityHealth: 'high',
            capacity: {
              contractedHoursMonth: 160,
              assignedHoursMonth: 160,
              usedHoursMonth: null,
              availableHoursMonth: 0,
              overcommitted: false
            }
          }
        ],
        memberCount: 1,
        hasOperationalMetrics: false,
        overcommittedCount: 0,
        overcommittedMembers: []
      })
    })

    renderWithTheme(<AgencyTeamView />)

    await waitFor(() => {
      expect(screen.getByText('1 personas · Capacidad 4 tipos')).toBeInTheDocument()
    })

    expect(screen.getByText('Sin métricas operativas')).toBeInTheDocument()
    expect(screen.getByText('Las horas usadas aún no están disponibles en este entorno. La carga comprometida excluye Efeonce interno y no reemplaza producción efectiva.')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.getByText('112h')).toBeInTheDocument()
  })
})

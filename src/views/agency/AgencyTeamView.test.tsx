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
          usageKind: 'none',
          usagePercent: null,
          overcommitted: false
        },
        members: [
          {
            memberId: 'member-1',
            displayName: 'Andres Carlosama',
            roleTitle: 'Operations Lead',
            fteAllocation: 1,
            usageKind: 'none',
            usagePercent: null,
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
      expect(screen.getByText('1 personas · Capacidad y dedicación')).toBeInTheDocument()
    })

    expect(screen.getByText('Sin métricas operativas')).toBeInTheDocument()
    expect(screen.getByText('El uso operativo aún no tiene una fuente horaria defendible en este entorno. La carga comprometida excluye Efeonce interno y no reemplaza producción efectiva.')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.getByText('112h')).toBeInTheDocument()
  })

  it('renders operational usage as percentage when the snapshot exposes an index instead of hours', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        team: {
          contractedHoursMonth: 480,
          assignedHoursMonth: 480,
          usedHoursMonth: null,
          availableHoursMonth: 0,
          usageKind: 'percent',
          usagePercent: 86,
          overcommitted: false
        },
        members: [
          {
            memberId: 'member-1',
            displayName: 'Daniela Ferreira',
            roleTitle: 'Designer',
            fteAllocation: 1,
            usageKind: 'percent',
            usagePercent: 86,
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
        hasOperationalMetrics: true,
        overcommittedCount: 0,
        overcommittedMembers: []
      })
    })

    renderWithTheme(<AgencyTeamView />)

    await waitFor(() => {
      expect(screen.getByText('1 personas · Capacidad y dedicación')).toBeInTheDocument()
    })

    expect(screen.getAllByText('Uso operativo').length).toBeGreaterThan(0)
    expect(screen.getByText('Índice operativo')).toBeInTheDocument()
    expect(screen.getAllByText('86%').length).toBeGreaterThan(0)
  })
})

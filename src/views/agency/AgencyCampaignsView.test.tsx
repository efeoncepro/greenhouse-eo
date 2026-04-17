// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import AgencyCampaignsView from './AgencyCampaignsView'

const fetchMock = vi.fn()

describe('AgencyCampaignsView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders campaigns returned by the API', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            campaignId: 'cmp-1',
            eoId: 'EO-CMP-0001',
            displayName: 'Lanzamiento Otono',
            campaignType: 'launch',
            status: 'active',
            plannedStartDate: '2026-03-01',
            plannedEndDate: '2026-03-31',
            projectCount: 3,
            budgetClp: 120000,
            spaceId: 'spc-1'
          }
        ]
      })
    })

    renderWithTheme(<AgencyCampaignsView />)

    await waitFor(() => {
      expect(screen.getByText('Lanzamiento Otono')).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/agency/campaigns')
    expect(screen.queryByText('Sin campañas registradas')).not.toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(screen.getByText('Lanzamiento')).toBeInTheDocument()
    expect(screen.getAllByText('$120.000')).toHaveLength(2)
  })

  it('falls back to the legacy campaigns route when the agency route is not available', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              campaignId: 'cmp-2',
              eoId: 'EO-CMP-0002',
              displayName: 'Sprint Invierno',
              campaignType: 'campaign',
              status: 'planning',
              plannedStartDate: '2026-06-01',
              plannedEndDate: '2026-06-20',
              projectCount: 2,
              budgetClp: 80000,
              spaceId: 'spc-2'
            }
          ]
        })
      })

    renderWithTheme(<AgencyCampaignsView />)

    await waitFor(() => {
      expect(screen.getByText('Sprint Invierno')).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/agency/campaigns')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/campaigns')
  })

  it('shows the API error instead of the empty state when the request fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'spaceId is required' })
    })

    renderWithTheme(<AgencyCampaignsView />)

    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar campañas')).toBeInTheDocument()
    })

    expect(screen.getByText('spaceId is required')).toBeInTheDocument()
    expect(screen.queryByText('Sin campañas registradas')).not.toBeInTheDocument()
  })
})

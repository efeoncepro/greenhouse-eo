// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import ServicesListView from './ServicesListView'

const fetchMock = vi.fn()

describe('ServicesListView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders services returned by the API in a react table', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            serviceId: 'svc-1',
            publicId: 'SVC-001',
            name: 'Retainer SEO',
            spaceId: 'spc-1',
            spaceName: 'Sky Airline',
            organizationId: 'org-1',
            organizationName: 'Sky',
            pipelineStage: 'active',
            lineaDeServicio: 'reach',
            servicioEspecifico: 'seo',
            modalidad: 'mensual',
            totalCost: 350000,
            currency: 'CLP',
            startDate: '2026-03-01',
            targetEndDate: '2026-12-31',
            active: true,
            status: 'active'
          }
        ],
        total: 1,
        page: 1,
        pageSize: 25
      })
    })

    renderWithTheme(<ServicesListView />)

    await waitFor(() => {
      expect(screen.getByText('Retainer SEO')).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/agency/services?page=1&pageSize=25')
    expect(screen.getByText('Sky Airline')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Reach')).toBeInTheDocument()
    expect(screen.getByText('$350.000')).toBeInTheDocument()
  })

  it('shows the empty state when the API returns no services', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        total: 0,
        page: 1,
        pageSize: 25
      })
    })

    renderWithTheme(<ServicesListView />)

    await waitFor(() => {
      expect(screen.getByText('Sin servicios')).toBeInTheDocument()
    })

    expect(screen.getByText('No se encontraron servicios con los filtros seleccionados.')).toBeInTheDocument()
  })
})

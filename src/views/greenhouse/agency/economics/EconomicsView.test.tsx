// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import EconomicsView from './EconomicsView'

const fetchMock = vi.fn()

vi.mock('next/dynamic', () => ({
  default: (loader: unknown) => {
    void loader

    return function DynamicStub() {
      return <div data-testid='chart' />
    }
  }
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

describe('EconomicsView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the space-first economics summary and service context', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        period: {
          year: 2026,
          month: 3,
          key: '2026-03',
          label: 'Mar 2026',
          periodClosed: true
        },
        totals: {
          revenueClp: 12000000,
          laborCostClp: 4200000,
          directExpenseClp: 900000,
          overheadClp: 600000,
          totalCostClp: 5700000,
          grossMarginClp: 6300000,
          grossMarginPct: 52.5,
          payrollRatioPct: 35,
          spaceCount: 1,
          activeServiceCount: 2
        },
        bySpace: [
          {
            spaceId: 'space-1',
            spaceName: 'Sky Core',
            organizationId: 'org-1',
            organizationName: 'Sky Airline',
            revenueClp: 12000000,
            laborCostClp: 4200000,
            directExpenseClp: 900000,
            overheadClp: 600000,
            totalCostClp: 5700000,
            grossMarginClp: 6300000,
            grossMarginPct: 52.5,
            payrollRatioPct: 35,
            previousRevenueClp: 10000000,
            revenueTrendPct: 20,
            periodClosed: true,
            snapshotRevision: 3,
            serviceCount: 2,
            serviceTotalContractClp: 5400000,
            serviceEconomicsStatus: 'pending_task_146',
            services: [
              {
                serviceId: 'service-1',
                publicId: 'EO-SRV-0001',
                name: 'Performance Squad',
                pipelineStage: 'active',
                lineaDeServicio: 'Agency',
                servicioEspecifico: 'Performance',
                totalCostClp: 3200000,
                currency: 'CLP',
                startDate: '2026-01-01',
                targetEndDate: '2026-06-30'
              },
              {
                serviceId: 'service-2',
                publicId: 'EO-SRV-0002',
                name: 'SEO Retainer',
                pipelineStage: 'active',
                lineaDeServicio: 'Agency',
                servicioEspecifico: 'SEO',
                totalCostClp: 2200000,
                currency: 'CLP',
                startDate: '2026-02-01',
                targetEndDate: null
              }
            ]
          }
        ],
        trends: [
          {
            periodYear: 2026,
            periodMonth: 2,
            label: 'Feb 2026',
            revenueClp: 10000000,
            totalCostClp: 5000000,
            grossMarginClp: 5000000,
            grossMarginPct: 50
          },
          {
            periodYear: 2026,
            periodMonth: 3,
            label: 'Mar 2026',
            revenueClp: 12000000,
            totalCostClp: 5700000,
            grossMarginClp: 6300000,
            grossMarginPct: 52.5
          }
        ],
        ranking: [
          {
            spaceId: 'space-1',
            spaceName: 'Sky Core',
            organizationName: 'Sky Airline',
            revenueClp: 12000000,
            grossMarginClp: 6300000,
            grossMarginPct: 52.5
          }
        ],
        partialState: {
          isPartial: true,
          messages: ['El detalle económico por servicio aún no está disponible; por ahora mostramos contexto contractual y de catálogo.']
        }
      })
    })

    renderWithTheme(<EconomicsView />)

    await waitFor(() => {
      expect(screen.getByText('Economía de la agencia')).toBeInTheDocument()
    })

    expect(screen.getByText('Ingresos del período')).toBeInTheDocument()
    expect(screen.getByText('P&L por Space')).toBeInTheDocument()
    expect(screen.getByText('Sky Core')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expandir detalle' }))

    await waitFor(() => {
      expect(screen.getByText('Detalle por servicio pendiente')).toBeInTheDocument()
    })

    expect(screen.getByText('Detalle por servicio pendiente')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir Space 360' })).toHaveAttribute('href', '/agency/spaces/space-1')
  })
})

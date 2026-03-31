// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import PlacementDetailView from './PlacementDetailView'

const fetchMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

describe('PlacementDetailView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders finance, payroll and tooling drilldowns for a provider-backed placement', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        placementId: 'placement-1',
        publicId: 'EO-PLC-0001',
        assignmentId: 'assignment-1',
        providerId: 'anthropic',
        clientName: 'Sky Airline',
        memberName: 'Daniela Ferreira',
        providerName: 'Anthropic',
        businessUnit: 'reach',
        status: 'active',
        lifecycleStage: 'live',
        billingRateAmount: 4200,
        billingRateCurrency: 'USD',
        costRateAmount: 2500000,
        costRateCurrency: 'CLP',
        payRegimeSnapshot: 'employee',
        contractTypeSnapshot: 'indefinido',
        contractStartDate: '2026-03-01',
        contractEndDate: null,
        placementNotes: 'Placement con ownership compartido entre Agency y Finance.',
        onboardingItems: [],
        events: [],
        latestSnapshot: {
          periodId: '2026-03',
          projectedRevenueClp: 3800000,
          payrollEmployerCostClp: 2100000,
          commercialLoadedCostClp: 2450000,
          toolingCostClp: 120000,
          grossMarginProxyPct: 32.1,
          snapshotStatus: 'complete'
        }
      })
    })

    renderWithTheme(<PlacementDetailView placementId='placement-1' />)

    await waitFor(() => {
      expect(screen.getByText('Placement 360')).toBeInTheDocument()
    })

    expect(screen.getByText('Snapshot económico')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver equipo' })).toHaveAttribute('href', '/agency/team')
    expect(screen.getByRole('link', { name: 'Revisar payroll' })).toHaveAttribute('href', '/hr/payroll')
    expect(screen.getByRole('link', { name: 'Abrir AI Tooling' })).toHaveAttribute('href', '/admin/ai-tools?tab=catalog&providerId=anthropic')
    expect(screen.getByText('Placement con ownership compartido entre Agency y Finance.')).toBeInTheDocument()
  })
})

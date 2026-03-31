// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import StaffAugmentationListView from './StaffAugmentationListView'

const fetchMock = vi.fn()
const pushMock = vi.fn()
const replaceMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams('')
}))

describe('StaffAugmentationListView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    pushMock.mockReset()
    replaceMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders placements returned by the API and shows placement 360 coverage', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            placementId: 'placement-1',
            publicId: 'EO-PLC-0001',
            clientName: 'Sky Airline',
            memberName: 'Daniela Ferreira',
            providerName: 'Anthropic',
            businessUnit: 'reach',
            status: 'active',
            lifecycleStage: 'live',
            billingRateAmount: 4200,
            billingRateCurrency: 'USD',
            latestSnapshotId: 'placement-1:2026-03'
          }
        ],
        total: 1,
        page: 1,
        pageSize: 25
      })
    })

    renderWithTheme(<StaffAugmentationListView />)

    await waitFor(() => {
      expect(screen.getByText('Daniela Ferreira')).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/agency/staff-augmentation/placements?page=1&pageSize=25')
    expect(screen.getByText('Sky Airline')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('360 listo')).toBeInTheDocument()
    expect(screen.getByText('Reach')).toBeInTheDocument()
  })

  it('opens the placement creation flow inline instead of mounting a blocking dialog', async () => {
    const user = userEvent.setup()

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        total: 0,
        page: 1,
        pageSize: 25
      })
    })

    renderWithTheme(<StaffAugmentationListView />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getByRole('button', { name: 'Crear placement' }))

    expect(await screen.findByText('Alta comercial-operativa sobre un assignment existente.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Buscar assignment' })).toBeInTheDocument()
  })
})

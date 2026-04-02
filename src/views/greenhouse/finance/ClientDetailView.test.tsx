// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import ClientDetailView from './ClientDetailView'

const fetchMock = vi.fn()
const useParamsMock = vi.fn()
const useRouterMock = vi.fn()
const useSessionMock = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => useParamsMock(),
  useRouter: () => useRouterMock()
}))

vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock()
}))

vi.mock('@/views/greenhouse/organizations/drawers/AddMembershipDrawer', () => ({
  default: function AddMembershipDrawerStub({
    open,
    title
  }: {
    open: boolean
    title?: string
  }) {
    if (!open) {
      return null
    }

    return <div>{title || 'Agregar persona'}</div>
  }
}))

describe('ClientDetailView', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    useParamsMock.mockReturnValue({ id: 'profile-1' })
    useRouterMock.mockReturnValue({ push: vi.fn() })
    useSessionMock.mockReturnValue({
      data: {
        user: {
          roleCodes: ['efeonce_admin']
        }
      }
    })

    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens the reusable membership drawer from financial contacts when the client has canonical organization', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        company: {
          organizationId: 'org-1',
          clientId: 'client-1',
          greenhouseClientName: 'Sky Airline',
          hubspotCompanyId: 'hub-1',
          companyName: 'Sky Airline',
          companyDomain: 'skyairline.com',
          companyCountry: 'CL',
          businessLine: 'creative',
          serviceModules: ['creative-hub']
        },
        financialProfile: {
          organizationId: 'org-1',
          clientId: 'client-1',
          clientProfileId: 'profile-1',
          hubspotCompanyId: 'hub-1',
          taxId: '76.123.456-7',
          taxIdType: 'RUT',
          legalName: 'Sky Airline SA',
          billingAddress: 'Av. Test 123',
          billingCountry: 'CL',
          paymentTermsDays: 30,
          paymentCurrency: 'CLP',
          requiresPo: false,
          requiresHes: false,
          currentPoNumber: null,
          currentHesNumber: null,
          financeContacts: [],
          specialConditions: null,
          createdBy: 'user-1',
          createdAt: '2026-04-02T00:00:00.000Z',
          updatedAt: '2026-04-02T00:00:00.000Z'
        },
        summary: {
          totalReceivable: 0,
          activeInvoicesCount: 0,
          overdueInvoicesCount: 0
        },
        invoices: [],
        deals: []
      })
    })

    renderWithTheme(<ClientDetailView />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sky Airline SA' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /contactos/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /agregar contacto/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /agregar contacto/i }))

    expect(screen.getByText('Agregar contacto financiero')).toBeInTheDocument()
  })
})

// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import CreatePlacementDialog from './CreatePlacementDialog'

const fetchMock = vi.fn()

describe('CreatePlacementDialog', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('searches lightweight placement options on demand and renders the payroll snapshot context', async () => {
    const user = userEvent.setup()

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('search=dan')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                assignmentId: 'assignment-1',
                assignmentType: 'internal',
                clientId: 'client-1',
                clientName: 'Sky Airline',
                memberId: 'member-1',
                memberName: 'Daniela Ferreira',
                organizationId: 'org-1',
                organizationName: 'Sky Org',
                label: 'Daniela Ferreira · Sky Airline',
                compensation: {
                  payRegime: 'international',
                  contractType: 'contractor',
                  costRateAmount: 2800,
                  costRateCurrency: 'USD'
                }
              }
            ],
            total: 1
          })
        }
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderWithTheme(
      <CreatePlacementDialog
        open
        onClose={() => {}}
        onCreated={() => {}}
      />
    )

    const input = screen.getByRole('combobox', { name: 'Buscar assignment' })

    await user.type(input, 'dan')

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/agency/staff-augmentation/placement-options?limit=20&search=dan')
    expect(screen.getByRole('heading', { name: 'Crear placement' })).toBeInTheDocument()

    fireEvent.click(await screen.findByText('Daniela Ferreira'))

    expect(await screen.findByText(/Sky Org · contractor · international/i)).toBeInTheDocument()
    expect(screen.getByText(/\$2\.800/i)).toBeInTheDocument()
  })

  it('preselects the requested assignment when it arrives from People', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('assignmentId=assignment-2')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                assignmentId: 'assignment-2',
                assignmentType: 'internal',
                clientId: 'client-2',
                clientName: 'Blue Express',
                memberId: 'member-1',
                memberName: 'Daniela Ferreira',
                organizationId: 'org-2',
                organizationName: 'Blue Org',
                label: 'Daniela Ferreira · Blue Express',
                compensation: {
                  payRegime: 'chile',
                  contractType: 'employee',
                  costRateAmount: 2100000,
                  costRateCurrency: 'CLP'
                }
              }
            ],
            total: 1
          })
        }
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderWithTheme(
      <CreatePlacementDialog
        open
        initialAssignmentId='assignment-2'
        onClose={() => {}}
        onCreated={() => {}}
      />
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('assignmentId=assignment-2')
    expect(await screen.findByText(/Blue Org · employee · chile/i)).toBeInTheDocument()
  })
})

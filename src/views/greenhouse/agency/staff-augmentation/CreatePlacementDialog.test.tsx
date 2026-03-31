// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
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

  it('loads lightweight placement options and renders the payroll snapshot context', async () => {
    fetchMock.mockResolvedValue({
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
    })

    renderWithTheme(
      <CreatePlacementDialog
        open
        onClose={() => {}}
        onCreated={() => {}}
      />
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/agency/staff-augmentation/placement-options')
    expect(screen.getByRole('heading', { name: 'Crear placement' })).toBeInTheDocument()
    expect(screen.getByText(/Sky Org · contractor · international/i)).toBeInTheDocument()
    expect(screen.getByText(/\$2\.800/i)).toBeInTheDocument()
  })

  it('preselects the requested assignment when it arrives from People', async () => {
    fetchMock.mockResolvedValue({
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
          },
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
        total: 2
      })
    })

    renderWithTheme(
      <CreatePlacementDialog
        open
        initialAssignmentId='assignment-2'
        onClose={() => {}}
        onCreated={() => {}}
      />
    )

    expect(await screen.findByText(/Blue Org · employee · chile/i)).toBeInTheDocument()
  })
})

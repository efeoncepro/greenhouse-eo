// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import PersonMembershipsTab from './PersonMembershipsTab'

const fetchMock = vi.fn()

describe('PersonMembershipsTab', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows Staff Aug actions from assignment signals without inventing a new identity', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            membershipId: 'membership-1',
            publicId: 'EO-MBR-001',
            organizationId: 'org-1',
            organizationName: 'Sky Org',
            spaceId: 'space-1',
            clientId: 'client-1',
            membershipType: 'team_member',
            roleLabel: 'Designer',
            department: null,
            isPrimary: false
          },
          {
            membershipId: 'membership-2',
            publicId: 'EO-MBR-002',
            organizationId: 'org-2',
            organizationName: 'Blue Org',
            spaceId: 'space-2',
            clientId: 'client-2',
            membershipType: 'team_member',
            roleLabel: 'CRM Specialist',
            department: null,
            isPrimary: false
          }
        ]
      })
    })

    renderWithTheme(
      <PersonMembershipsTab
        memberId='member-1'
        assignments={[
          {
            assignmentId: 'assignment-1',
            clientId: 'client-1',
            clientName: 'Sky Airline',
            fteAllocation: 1,
            hoursPerMonth: 160,
            roleTitleOverride: null,
            startDate: '2026-03-01',
            endDate: null,
            active: true,
            assignmentType: 'staff_augmentation',
            placementId: 'placement-1',
            placementStatus: 'active'
          },
          {
            assignmentId: 'assignment-2',
            clientId: 'client-2',
            clientName: 'Blue Express',
            fteAllocation: 0.5,
            hoursPerMonth: 80,
            roleTitleOverride: null,
            startDate: '2026-03-15',
            endDate: null,
            active: true,
            assignmentType: 'internal',
            placementId: null,
            placementStatus: null
          }
        ]}
        isAdmin
        onAddMembership={() => {}}
        onEditMembership={() => {}}
      />
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    expect(screen.getAllByText('Staff Aug')[0]).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir placement' })).toHaveAttribute('href', '/agency/staff-augmentation/placement-1')
    expect(screen.getByRole('link', { name: 'Crear placement' })).toHaveAttribute('href', '/agency/staff-augmentation/create?assignmentId=assignment-2')
  })
})

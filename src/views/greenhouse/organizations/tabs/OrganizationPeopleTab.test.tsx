// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import OrganizationPeopleTab from './OrganizationPeopleTab'

const fetchMock = vi.fn()

describe('OrganizationPeopleTab', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders staff augmentation as operating context without inventing a new membership type', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              membershipId: 'membership-1',
              publicId: 'EO-MBR-001',
              profileId: 'profile-1',
              fullName: 'Ana Staff Aug',
              canonicalEmail: 'ana@example.com',
              membershipType: 'team_member',
              roleLabel: 'Designer',
              department: 'Design',
              isPrimary: false,
              spaceId: 'space-1',
              memberId: 'member-1',
              assignedFte: 1,
              assignmentType: 'staff_augmentation',
              jobLevel: 'Senior',
              employmentType: 'full_time'
            },
            {
              membershipId: 'membership-2',
              publicId: 'EO-MBR-002',
              profileId: 'profile-2',
              fullName: 'Carla Contacto',
              canonicalEmail: 'carla@example.com',
              membershipType: 'contact',
              roleLabel: 'Marketing Lead',
              department: 'Marketing',
              isPrimary: true,
              spaceId: null,
              memberId: null,
              assignedFte: null,
              assignmentType: null,
              jobLevel: null,
              employmentType: null
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          team: {
            totalMembers: 2,
            totalFte: 1
          }
        })
      })

    renderWithTheme(<OrganizationPeopleTab organizationId='org-1' />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/organizations/org-1/memberships')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/organization/org-1/360?facets=team')
    expect(screen.getByText('Total personas')).toBeInTheDocument()
    expect(screen.getByText('FTE total')).toBeInTheDocument()
    expect(screen.getByText('Equipo Efeonce')).toBeInTheDocument()
    expect(screen.getByText('Staff Aug')).toBeInTheDocument()
    expect(screen.getAllByText('1.0')).toHaveLength(2)
    expect(screen.getByText('Senior · full_time')).toBeInTheDocument()
    expect(screen.getByLabelText('Contacto principal')).toBeInTheDocument()
  })
})

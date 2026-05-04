// @vitest-environment jsdom

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PersonDetail } from '@/types/people'
import { renderWithTheme } from '@/test/render'

import PersonProfileTab from './PersonProfileTab'

const fetchMock = vi.fn()

const detail: PersonDetail = {
  member: {
    eoId: 'EO-001',
    memberId: 'member-1',
    displayName: 'Andres Carlosama',
    publicEmail: 'andres@efeoncepro.com',
    internalEmail: null,
    avatarUrl: null,
    roleTitle: 'Senior Visual Designer',
    roleCategory: 'design',
    active: true,
    contactChannel: null,
    contactHandle: null,
    profile: {
      firstName: 'Andres',
      lastName: 'Carlosama',
      preferredName: null,
      legalName: null,
      orgRoleId: null,
      orgRoleName: null,
      professionId: null,
      professionName: null,
      seniorityLevel: null,
      employmentType: null,
      ageYears: null,
      phone: null,
      teamsUserId: null,
      slackUserId: null,
      locationCity: 'Pasto',
      locationCountry: 'CO',
      timeZone: null,
      yearsExperience: null,
      efeonceStartDate: null,
      tenureEfeonceMonths: null,
      tenureClientMonths: null,
      biography: null,
      languages: [],
      profileCompletenessPercent: 0
    },
    identityProfileId: null,
    notionUserId: null,
    azureOid: null,
    hubspotOwnerId: null
  },
  access: {
    canViewMemberships: true,
    canViewAssignments: false,
    canViewActivity: true,
    canViewCompensation: true,
    canViewPayroll: true,
    canViewFinance: true,
    canViewHrProfile: true,
    canViewAiTools: false,
    canViewIdentityContext: false,
    canViewAccessContext: false,
    canViewPaymentProfile: false,
    visibleTabs: ['profile', 'activity', 'memberships', 'economy']
  },
  summary: {
    activeAssignments: 1,
    contractedFte: 1,
    assignedFte: 1,
    totalFte: 1,
    totalHoursMonth: 160
  },
  integrations: {
    microsoftLinked: false,
    notionLinked: false,
    hubspotLinked: false,
    identityConfidence: 'basic',
    linkedProviders: []
  },
  assignments: [],
  recentPayroll: [],
  currentCompensation: null,
  operationalMetrics: null,
  financeSummary: null,
  capacity: null,
  hrContext: {
    identityProfileId: 'ip-1',
    eoId: 'EO-001',
    memberId: 'member-1',
    displayName: 'Andres Carlosama',
    email: 'andres@efeoncepro.com',
    departmentName: 'Diseño',
    jobLevel: 'senior',
    employmentType: 'full_time',
    hireDate: null,
    contractEndDate: null,
    dailyRequired: true,
    supervisorMemberId: 'member-2',
    supervisorName: 'Daniela Ferreira',
    compensation: {
      payRegime: 'international',
      currency: 'USD',
      baseSalary: 675,
      contractType: 'indefinido'
    },
    leave: {
      vacationAllowance: 15,
      vacationCarried: 2,
      vacationUsed: 3,
      vacationReserved: 1,
      vacationAvailable: 13,
      personalAllowance: 2,
      personalUsed: 1,
      pendingRequests: 1,
      approvedRequestsThisYear: 2,
      totalApprovedDaysThisYear: 4
    },
    offboarding: null
  },
  deliveryContext: null,
  identityContext: null,
  accessContext: null,
  linkedUserId: null
}

describe('PersonProfileTab', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes hire date editing in the visible profile tab', async () => {
    const user = userEvent.setup()

    const expectedFormattedDate = new Intl.DateTimeFormat('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date('2026-04-01'))

    fetchMock.mockImplementation(async (_input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({
            hireDate: '2026-04-01'
          })
        }
      }

      return {
        ok: false,
        json: async () => ({})
      }
    })

    renderWithTheme(<PersonProfileTab detail={detail} />)

    await user.click(screen.getByRole('button', { name: /editar ingreso/i }))

    const input = screen.getByLabelText('Fecha de ingreso')

    await user.clear(input)
    await user.type(input, '2026-04-01')
    await user.click(screen.getByRole('button', { name: /^guardar$/i }))

    await waitFor(() => {
      expect(screen.getByText(expectedFormattedDate)).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/hr/core/members/member-1/profile',
      expect.objectContaining({
        method: 'PATCH'
      })
    )
  })
})

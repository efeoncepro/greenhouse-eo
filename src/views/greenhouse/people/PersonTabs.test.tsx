// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import type { PersonDetail } from '@/types/people'

import PersonTabs from './PersonTabs'

const replace = vi.fn()
const hrProfileTabCapture = vi.hoisted(() => ({ current: null as unknown }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/people/andres-carlosama',
  useSearchParams: () => new URLSearchParams()
}))

vi.mock('./tabs/PersonMembershipsTab', () => ({
  default: () => <div>Memberships content</div>
}))

vi.mock('./tabs/PersonActivityTab', () => ({
  default: () => <div>Activity content</div>
}))

vi.mock('./tabs/PersonCompensationTab', () => ({
  default: () => <div>Compensation content</div>
}))

vi.mock('./tabs/PersonPayrollTab', () => ({
  default: () => <div>Payroll content</div>
}))

vi.mock('./tabs/PersonFinanceTab', () => ({
  default: () => <div>Finance content</div>
}))

vi.mock('./tabs/PersonHrProfileTab', () => ({
  default: (props: unknown) => {
    hrProfileTabCapture.current = props

    return <div>HR content</div>
  }
}))

vi.mock('./tabs/PersonAiToolsTab', () => ({
  default: () => <div>AI content</div>
}))

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
    canViewHrProfile: false,
    canViewAiTools: false,
    canViewIdentityContext: false,
    canViewAccessContext: false,
    visibleTabs: ['memberships', 'activity', 'compensation', 'payroll', 'finance']
  },
  summary: {
    activeAssignments: 1,
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
  hrContext: null,
  deliveryContext: null,
  identityContext: null,
  accessContext: null,
  linkedUserId: null
}

describe('PersonTabs', () => {
  beforeEach(() => {
    replace.mockReset()
    hrProfileTabCapture.current = null
  })

  it('keeps the pill tablist and panel inside grid rows to avoid root overflow', () => {
    const { container } = renderWithTheme(<PersonTabs detail={detail} />)

    const tablist = screen.getByRole('tablist')
    const activePanel = screen.getByRole('tabpanel')
    const liveRegion = container.querySelector('[aria-live="polite"]')

    expect(tablist.closest('.MuiGrid-root')).toBeInTheDocument()
    expect(activePanel.closest('.MuiGrid-root')).toBeInTheDocument()
    expect(container.querySelector('.MuiGrid-container')).toBeInTheDocument()
    expect(liveRegion).toHaveStyle({ width: '1px', height: '1px' })
  })

  it('passes hrContext and operational metrics into the HR profile tab', () => {
    const hrDetail: PersonDetail = {
      ...detail,
      access: {
        ...detail.access,
        canViewHrProfile: true,
        visibleTabs: ['hr-profile']
      },
      operationalMetrics: {
        rpaAvg30d: 1.8,
        otdPercent30d: 90,
        tasksCompleted30d: 12,
        tasksActiveNow: 4,
        projectBreakdown: []
      },
      hrContext: {
        identityProfileId: 'ip-1',
        eoId: 'EO-001',
        memberId: 'member-1',
        displayName: 'Andres Carlosama',
        email: 'andres@efeoncepro.com',
        departmentName: 'Diseño',
        jobLevel: 'senior',
        employmentType: 'full_time',
        hireDate: '2026-03-15',
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
        }
      }
    }

    renderWithTheme(<PersonTabs detail={hrDetail} />)

    expect(screen.getByText('HR content')).toBeInTheDocument()
    expect(hrProfileTabCapture.current).toEqual(
      expect.objectContaining({
        memberId: 'member-1',
        hrContext: expect.objectContaining({
          departmentName: 'Diseño',
          supervisorName: 'Daniela Ferreira'
        }),
        defaultOperationalMetrics: expect.objectContaining({
          rpaAvg30d: 1.8,
          otdPercent30d: 90
        })
      })
    )
  })
})

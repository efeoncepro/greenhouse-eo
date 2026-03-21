// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import type { PersonDetail } from '@/types/people'

import PersonTabs from './PersonTabs'

const replace = vi.fn()

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
  default: () => <div>HR content</div>
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
  })

  it('keeps the pill tablist and panel inside grid rows to avoid root overflow', () => {
    const { container } = renderWithTheme(<PersonTabs detail={detail} />)

    const tablist = screen.getByRole('tablist')
    const activePanel = screen.getByRole('tabpanel')

    expect(tablist.closest('.MuiGrid-root')).toBeInTheDocument()
    expect(activePanel.closest('.MuiGrid-root')).toBeInTheDocument()
    expect(container.querySelector('.MuiGrid-container')).toBeInTheDocument()
  })
})

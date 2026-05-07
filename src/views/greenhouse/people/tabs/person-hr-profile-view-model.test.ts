import { describe, expect, it } from 'vitest'

import type { IcoMetricSnapshot } from '@/lib/ico-engine/read-metrics'
import type { PersonHrContext } from '@/lib/person-360/get-person-hr'
import type { HrMemberProfile } from '@/types/hr-core'
import type { PersonOperationalMetrics } from '@/types/people'

import { buildPersonHrProfileViewModel } from './person-hr-profile-view-model'

const hrContext: PersonHrContext = {
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
  },
  offboarding: null,
  relationshipTimeline: []
}

const supplementalProfile: HrMemberProfile = {
  memberId: 'member-1',
  displayName: 'Andres Carlosama',
  email: 'andres@efeoncepro.com',
  departmentId: 'dept-other',
  departmentName: 'Ventas',
  reportsTo: 'member-9',
  reportsToName: 'Otro supervisor',
  jobLevel: 'junior',
  hireDate: '2026-01-01',
  contractEndDate: null,
  employmentType: 'contractor',
  dailyRequired: false,
  identityDocumentType: 'RUT',
  identityDocumentNumberMasked: '12.345.678-9',
  phone: '+56 9 1234 5678',
  emergencyContactName: 'Contacto',
  emergencyContactPhone: '+56 9 9999 9999',
  healthSystem: 'isapre',
  isapreName: 'Colmena',
  bankName: 'BICE',
  bankAccountType: 'corriente',
  bankAccountNumberMasked: '****1234',
  cvUrl: 'https://example.com/cv.pdf',
  linkedinUrl: 'https://linkedin.com/in/example',
  portfolioUrl: 'https://portfolio.example.com',
  skills: ['Diseño'],
  tools: ['Figma'],
  aiSuites: ['ChatGPT'],
  strengths: ['Storytelling'],
  improvementAreas: ['Priorización'],
  pieceTypes: ['Video'],
  avgMonthlyVolume: 999,
  throughputAvg30d: 999,
  rpaAvg30d: 9.99,
  otdPercent30d: 12,
  notes: 'Perfil complementario',
  updatedAt: '2026-03-21T00:00:00.000Z'
}

const icoSnapshot: IcoMetricSnapshot = {
  dimension: 'member',
  dimensionValue: 'member-1',
  dimensionLabel: 'Andres Carlosama',
  periodYear: 2026,
  periodMonth: 3,
  metrics: [
    { metricId: 'rpa', value: 1.45, zone: 'optimal' },
    { metricId: 'otd_pct', value: 92, zone: 'optimal' },
    { metricId: 'throughput', value: 18, zone: 'optimal' }
  ],
  cscDistribution: [],
  context: {
    totalTasks: 24,
    completedTasks: 18,
    activeTasks: 6,
    onTimeTasks: 16,
    lateDropTasks: 2,
    overdueTasks: 1,
    carryOverTasks: 2,
    overdueCarriedForwardTasks: 1
  },
  computedAt: '2026-03-21T00:00:00.000Z',
  engineVersion: 'v1',
  source: 'materialized'
}

const fallbackOperationalMetrics: PersonOperationalMetrics = {
  rpaAvg30d: 2.4,
  otdPercent30d: 77,
  tasksCompleted30d: 11,
  tasksActiveNow: 5,
  projectBreakdown: []
}

describe('buildPersonHrProfileViewModel', () => {
  it('prioritizes hrContext for HR master data and ICO for operational metrics', () => {
    const viewModel = buildPersonHrProfileViewModel({
      hrContext,
      supplementalProfile,
      icoSnapshot,
      fallbackOperationalMetrics
    })

    expect(viewModel.employment.departmentName).toBe('Diseño')
    expect(viewModel.employment.supervisorName).toBe('Daniela Ferreira')
    expect(viewModel.employment.jobLevel).toBe('senior')
    expect(viewModel.employment.baseSalary).toBe(675)
    expect(viewModel.personal.phone).toBe('+56 9 1234 5678')
    expect(viewModel.operational.source).toBe('ico')
    expect(viewModel.operational.volume).toBe(24)
    expect(viewModel.operational.throughput).toBe(18)
    expect(viewModel.operational.otdPercent).toBe(92)
    expect(viewModel.operational.rpa).toBe(1.45)
  })

  it('falls back to People operational metrics when ICO is unavailable', () => {
    const viewModel = buildPersonHrProfileViewModel({
      hrContext: null,
      supplementalProfile,
      icoSnapshot: null,
      fallbackOperationalMetrics
    })

    expect(viewModel.operational.source).toBe('people_operational')
    expect(viewModel.operational.periodLabel).toBe('Últimos 30 días')
    expect(viewModel.operational.volume).toBe(11)
    expect(viewModel.operational.throughput).toBeNull()
    expect(viewModel.operational.otdPercent).toBe(77)
    expect(viewModel.operational.rpa).toBe(2.4)
    expect(viewModel.personal.hasData).toBe(true)
  })

  it('labels employee history and active honorarios relationship without mutating payroll copy', () => {
    const viewModel = buildPersonHrProfileViewModel({
      hrContext: {
        ...hrContext,
        relationshipTimeline: [
          {
            relationshipId: 'pler-contractor',
            publicId: 'EO-PLR-0002',
            relationshipType: 'contractor',
            relationshipSubtype: 'honorarios',
            status: 'active',
            roleLabel: 'Diseñadora',
            effectiveFrom: '2026-05-04',
            effectiveTo: null
          },
          {
            relationshipId: 'pler-employee',
            publicId: 'EO-PLR-0001',
            relationshipType: 'employee',
            relationshipSubtype: null,
            status: 'ended',
            roleLabel: 'Diseñadora',
            effectiveFrom: '2024-01-01',
            effectiveTo: '2026-04-30'
          }
        ]
      },
      supplementalProfile: null,
      icoSnapshot: null,
      fallbackOperationalMetrics: null
    })

    expect(viewModel.employment.relationshipTimeline).toMatchObject([
      { label: 'Relación honorarios activa', statusLabel: 'Activa', statusTone: 'success' },
      { label: 'Relación laboral cerrada', statusLabel: 'Histórica', statusTone: 'warning' }
    ])
  })
})

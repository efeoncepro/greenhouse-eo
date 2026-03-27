import { describe, expect, it } from 'vitest'

import type { PayrollPeriod } from '@/types/payroll'

import { buildPayrollPeriodReadiness } from './payroll-readiness'

const attendanceDiagnostics = {
  source: 'legacy_attendance_daily_plus_hr_leave' as const,
  integrationTarget: 'microsoft_teams' as const,
  blocking: false,
  notes: [
    'La asistencia aún se resume desde attendance_daily + leave_requests.',
    'La integración futura objetivo para asistencia es Microsoft Teams.'
  ]
}

const period: PayrollPeriod = {
  periodId: '2026-03',
  year: 2026,
  month: 3,
  status: 'draft',
  calculatedAt: null,
  calculatedBy: null,
  approvedAt: null,
  approvedBy: null,
  exportedAt: null,
  ufValue: 39990,
  taxTableVersion: 'SII-2026-03',
  notes: null,
  createdAt: null
}

const compensatedMember = {
  versionId: 'member-1_v1',
  memberId: 'member-1',
  memberName: 'Andres Carlosama',
  memberEmail: 'andres@efeoncepro.com',
  memberAvatarUrl: null,
  notionUserId: null,
  version: 1,
  payRegime: 'international' as const,
  currency: 'USD' as const,
  baseSalary: 1000,
  remoteAllowance: 50,
  fixedBonusLabel: 'Responsabilidad',
  fixedBonusAmount: 75,
  bonusOtdMin: 0,
  bonusOtdMax: 100,
  bonusRpaMin: 0,
  bonusRpaMax: 50,
  afpName: null,
  afpRate: null,
  healthSystem: null,
  healthPlanUf: null,
  unemploymentRate: 0,
  contractType: 'indefinido' as const,
  hasApv: false,
  apvAmount: 0,
  effectiveFrom: '2026-03-01',
  effectiveTo: null,
  isCurrent: true,
  changeReason: 'Alta inicial',
  createdBy: null,
  createdAt: null,
  hasCompensationVersion: true
}

describe('buildPayrollPeriodReadiness', () => {
  it('is ready when there is at least one compensated member and no blockers', () => {
    const readiness = buildPayrollPeriodReadiness({
      period,
      compensationRows: [compensatedMember],
      missingKpiMemberIds: [],
      missingAttendanceMemberIds: [],
      attendanceDiagnostics
    })

    expect(readiness.ready).toBe(true)
    expect(readiness.includedMemberIds).toEqual(['member-1'])
    expect(readiness.blockingIssues).toHaveLength(0)
    expect(readiness.warnings).toHaveLength(0)
    expect(readiness.attendanceDiagnostics.blocking).toBe(false)
  })

  it('adds warnings for missing compensation, KPI, and attendance signals', () => {
    const readiness = buildPayrollPeriodReadiness({
      period,
      compensationRows: [
        compensatedMember,
        {
          ...compensatedMember,
          versionId: '',
          memberId: 'member-2',
          memberName: 'Daniela Ferreira',
          hasCompensationVersion: false
        }
      ],
      missingKpiMemberIds: ['member-1'],
      missingAttendanceMemberIds: ['member-1'],
      attendanceDiagnostics
    })

    expect(readiness.ready).toBe(true)
    expect(readiness.missingCompensationMemberIds).toEqual(['member-2'])
    expect(readiness.missingKpiMemberIds).toEqual(['member-1'])
    expect(readiness.missingAttendanceMemberIds).toEqual(['member-1'])
    expect(readiness.warnings.map(issue => issue.code)).toEqual([
      'missing_compensation',
      'missing_kpi',
      'missing_attendance_signal'
    ])
  })

  it('blocks calculation when nobody has compensation for the month', () => {
    const readiness = buildPayrollPeriodReadiness({
      period,
      compensationRows: [
        {
          ...compensatedMember,
          versionId: '',
          memberId: 'member-2',
          hasCompensationVersion: false
        }
      ],
      missingKpiMemberIds: [],
      missingAttendanceMemberIds: [],
      attendanceDiagnostics
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.blockingIssues.map(issue => issue.code)).toEqual(['no_compensated_members'])
  })

  it('blocks calculation when UF is required and missing', () => {
    const readiness = buildPayrollPeriodReadiness({
      period: {
        ...period,
        ufValue: null
      },
      compensationRows: [
        {
          ...compensatedMember,
          memberId: 'member-chile',
          payRegime: 'chile',
          currency: 'CLP',
          healthSystem: 'isapre',
          healthPlanUf: 2.1
        }
      ],
      missingKpiMemberIds: [],
      missingAttendanceMemberIds: [],
      attendanceDiagnostics
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.requiresUfValue).toBe(true)
    expect(readiness.blockingIssues.map(issue => issue.code)).toEqual(['missing_uf_value'])
  })

  it('blocks calculation when a Chile period lacks tax table version', () => {
    const readiness = buildPayrollPeriodReadiness({
      period: {
        ...period,
        taxTableVersion: null
      },
      compensationRows: [
        {
          ...compensatedMember,
          memberId: 'member-chile',
          payRegime: 'chile',
          currency: 'CLP',
          healthSystem: 'fonasa'
        }
      ],
      missingKpiMemberIds: [],
      missingAttendanceMemberIds: [],
      attendanceDiagnostics
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.blockingIssues.map(issue => issue.code)).toEqual(['missing_tax_table_version'])
  })

  it('blocks calculation when Chile tax inputs need UTM and historical UTM is unavailable', () => {
    const readiness = buildPayrollPeriodReadiness({
      period,
      compensationRows: [
        {
          ...compensatedMember,
          memberId: 'member-chile',
          payRegime: 'chile',
          currency: 'CLP',
          healthSystem: 'fonasa'
        }
      ],
      missingKpiMemberIds: [],
      missingAttendanceMemberIds: [],
      attendanceDiagnostics,
      missingUtmValue: true
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.blockingIssues.map(issue => issue.code)).toEqual(['missing_utm_value'])
  })
})

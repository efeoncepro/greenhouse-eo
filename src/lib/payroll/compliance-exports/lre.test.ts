import { describe, expect, it } from 'vitest'

import { buildLreLibroArtifact, LRE_V1_HEADERS } from './lre'
import type { ChileCompliancePeriodSnapshot, ChilePayrollComplianceEntry } from './types'

const entry = (): ChilePayrollComplianceEntry => ({
  entryId: 'entry-1',
  periodId: '2026-04',
  memberId: 'member-1',
  memberDisplayName: 'Ada Lovelace',
  memberFirstName: 'Ada',
  memberLastName: 'Lovelace Byron',
  memberLegalName: 'Ada Lovelace Byron',
  memberEmail: 'ada@example.com',
  identityProfileId: 'profile-1',
  previredSexCode: 'F',
  previredNationalityCode: '0',
  previredHealthInstitutionCode: '07',
  rutNormalized: '123456785',
  contractTypeSnapshot: 'indefinido',
  payRegime: 'chile',
  payrollVia: 'internal',
  currency: 'CLP',
  baseSalary: 1000000,
  grossTotal: 1200000,
  netTotal: 900000,
  chileAfpName: 'Habitat',
  chileAfpAmount: 120000,
  chileAfpCotizacionAmount: 100000,
  chileAfpComisionAmount: 20000,
  chileHealthSystem: 'fonasa',
  chileHealthAmount: 84000,
  chileHealthObligatoriaAmount: 84000,
  chileHealthVoluntariaAmount: 0,
  chileUnemploymentAmount: 7200,
  chileTaxAmount: 20000,
  chileApvAmount: 10000,
  chileEmployerSisAmount: 18000,
  chileEmployerCesantiaAmount: 28800,
  chileEmployerMutualAmount: 11280,
  chileTotalDeductions: 241200,
  chileTaxableBase: 1200000,
  workingDaysInPeriod: 30,
  daysAbsent: 0,
  daysOnLeave: 0,
  daysOnUnpaidLeave: 0
})

const snapshot = (): ChileCompliancePeriodSnapshot => ({
  periodId: '2026-04',
  year: 2026,
  month: 4,
  status: 'approved',
  generatedBy: 'user-1',
  spaceId: null,
  entries: [entry()],
  sourceSnapshotHash: 'source-hash'
})

describe('LRE compliance export', () => {
  it('emits semicolon CSV with headers and one data row per Chile dependent entry', () => {
    const artifact = buildLreLibroArtifact(snapshot())
    const rows = artifact.text.trim().split('\r\n')

    expect(rows).toHaveLength(2)
    expect(rows[0]).toBe(LRE_V1_HEADERS.join(';'))
    expect(rows[1].split(';')).toHaveLength(LRE_V1_HEADERS.length)
    expect(artifact.recordCount).toBe(1)
  })

  it('keeps LRE totals from payroll entries without recalculating payroll', () => {
    const artifact = buildLreLibroArtifact(snapshot())

    expect(artifact.totals.grossTotal).toBe(1200000)
    expect(artifact.totals.netTotal).toBe(900000)
    expect(artifact.totals.totalDeductions).toBe(241200)
  })
})

import { describe, expect, it } from 'vitest'

import { buildPreviredPlanillaArtifact, buildPreviredRow, resolvePreviredAfpCode } from './previred'
import type { ChileCompliancePeriodSnapshot, ChilePayrollComplianceEntry } from './types'

const baseEntry = (overrides: Partial<ChilePayrollComplianceEntry> = {}): ChilePayrollComplianceEntry => ({
  entryId: 'entry-1',
  periodId: '2026-04',
  memberId: 'member-1',
  memberDisplayName: 'Ada Lovelace',
  memberEmail: 'ada@example.com',
  identityProfileId: 'profile-1',
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
  daysOnUnpaidLeave: 0,
  ...overrides
})

const snapshot = (entries: ChilePayrollComplianceEntry[] = [baseEntry()]): ChileCompliancePeriodSnapshot => ({
  periodId: '2026-04',
  year: 2026,
  month: 4,
  status: 'approved',
  generatedBy: 'user-1',
  spaceId: null,
  entries,
  sourceSnapshotHash: 'source-hash'
})

describe('Previred compliance export', () => {
  it('maps official AFP codes without using APV institution codes', () => {
    expect(resolvePreviredAfpCode('Habitat')).toBe('05')
    expect(resolvePreviredAfpCode('PlanVital')).toBe('29')
    expect(resolvePreviredAfpCode('Unknown')).toBe('00')
  })

  it('builds formato largo variable rows with exactly 105 separator fields', () => {
    const row = buildPreviredRow(snapshot(), baseEntry())

    expect(row.split(';')).toHaveLength(105)
  })

  it('keeps Previred totals aligned with the canonical seven-component helper', () => {
    const artifact = buildPreviredPlanillaArtifact(snapshot())

    expect(artifact.validation.status).toBe('passed')
    expect(artifact.recordCount).toBe(1)
    expect(artifact.totals.previredTotal).toBe(279280)
  })

  it('fails closed when a Chile dependent entry has no verified RUT snapshot', () => {
    const artifact = buildPreviredPlanillaArtifact(snapshot([baseEntry({ rutNormalized: '' })]))

    expect(artifact.validation.status).toBe('failed')
    expect(artifact.validation.errors.join(' ')).toContain('verified CL_RUT')
  })
})

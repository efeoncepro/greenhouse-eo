import { describe, expect, it } from 'vitest'

import { buildPreviredPlanillaArtifact, buildPreviredRow, resolvePreviredAfpCode } from './previred'
import type { ChileCompliancePeriodSnapshot, ChilePayrollComplianceEntry } from './types'

const baseEntry = (overrides: Partial<ChilePayrollComplianceEntry> = {}): ChilePayrollComplianceEntry => ({
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

  it('maps official Previred positions for worker identity, period, pension, health, mutual and unemployment', () => {
    const fields = buildPreviredRow(snapshot(), baseEntry()).split(';')

    expect(fields[2]).toBe('Lovelace')
    expect(fields[3]).toBe('Byron')
    expect(fields[4]).toBe('Ada')
    expect(fields[5]).toBe('F')
    expect(fields[6]).toBe('0')
    expect(fields[8]).toBe('042026')
    expect(fields[9]).toBe('042026')
    expect(fields[10]).toBe('AFP')
    expect(fields[12]).toBe('30')
    expect(fields[17]).toBe('D')
    expect(fields[24]).toBe('N')
    expect(fields[25]).toBe('05')
    expect(fields[26]).toBe('1200000')
    expect(fields[27]).toBe('120000')
    expect(fields[28]).toBe('18000')
    expect(fields[69]).toBe('84000')
    expect(fields[70]).toBe('0')
    expect(fields[74]).toBe('07')
    expect(fields[76]).toBe('0')
    expect(fields[79]).toBe('0')
    expect(fields[96]).toBe('1200000')
    expect(fields[97]).toBe('11280')
    expect(fields[99]).toBe('1200000')
    expect(fields[100]).toBe('7200')
    expect(fields[101]).toBe('28800')
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

  it('fails closed when required Previred legal codes are missing instead of inventing them', () => {
    const artifact = buildPreviredPlanillaArtifact(snapshot([
      baseEntry({
        previredSexCode: null,
        previredNationalityCode: null,
        previredHealthInstitutionCode: null,
        chileHealthSystem: 'isapre'
      })
    ]))

    expect(artifact.validation.status).toBe('failed')
    expect(artifact.validation.errors.join(' ')).toContain('explicit Previred sex code')
    expect(artifact.validation.errors.join(' ')).toContain('explicit Previred nationality code')
    expect(artifact.validation.errors.join(' ')).toContain('health institution code')
  })
})

import { describe, expect, it } from 'vitest'

import { getSiiRetentionRate } from '@/types/hr-contracts'

import { computeContractorWithholding } from '../payables/withholding'

import { ChileHonorariosDependentDeductionError } from './errors'
import {
  assertNoDependentDeductions,
  CHILE_HONORARIOS_SUBTYPE,
  computeChileHonorariosPayout,
  DEPENDENT_DEDUCTION_KINDS,
  HONORARIOS_ALLOWED_DEDUCTION_KIND,
  resolveChileHonorariosPolicy
} from './policy'

describe('resolveChileHonorariosPolicy', () => {
  it('snapshots the versioned SII policy for the emission year (reuses payroll SSOT)', () => {
    const snapshot = resolveChileHonorariosPolicy({ emissionYear: 2026 })

    expect(snapshot.rateSnapshot).toBe(getSiiRetentionRate(2026))
    expect(snapshot.rateSnapshot).toBe(0.1525)
    expect(snapshot.policyCode).toBe('cl_honorarios_2026_15_25')
    expect(snapshot.emissionYear).toBe(2026)
    expect(snapshot.boletaFolio).toBeNull()
  })

  it('captures the boleta folio where present (trimmed)', () => {
    const snapshot = resolveChileHonorariosPolicy({ emissionYear: 2026, boletaFolio: '  1234 ' })

    expect(snapshot.boletaFolio).toBe('1234')
  })

  it('treats empty/whitespace folio as null', () => {
    expect(resolveChileHonorariosPolicy({ emissionYear: 2026, boletaFolio: '   ' }).boletaFolio).toBeNull()
    expect(resolveChileHonorariosPolicy({ emissionYear: 2026, boletaFolio: null }).boletaFolio).toBeNull()
  })

  it('tracks the gradual SII schedule across years', () => {
    expect(resolveChileHonorariosPolicy({ emissionYear: 2025 }).rateSnapshot).toBe(0.145)
    expect(resolveChileHonorariosPolicy({ emissionYear: 2027 }).rateSnapshot).toBe(0.16)
  })
})

describe('computeChileHonorariosPayout', () => {
  it('produces an SII-only breakdown identical to computeContractorWithholding (no re-impl)', () => {
    const gross = 1_000_000
    const rate = 0.1525

    const payout = computeChileHonorariosPayout({ grossAmount: gross, rateSnapshot: rate })

    const expectedWithholding = computeContractorWithholding({
      relationshipSubtype: CHILE_HONORARIOS_SUBTYPE,
      taxComplianceOwner: 'greenhouse_policy',
      taxWithholdingRateSnapshot: rate,
      grossAmount: gross
    })

    expect(payout.withholdingAmount).toBe(expectedWithholding)
    expect(payout.withholdingAmount).toBe(152_500)
    expect(payout.netPayable).toBe(847_500)
    expect(payout.deductions).toEqual([{ kind: HONORARIOS_ALLOWED_DEDUCTION_KIND, amount: 152_500 }])
  })

  it('only ever emits the sii_retention deduction kind', () => {
    const payout = computeChileHonorariosPayout({ grossAmount: 500_000, rateSnapshot: 0.1525 })

    expect(payout.deductions.every(line => line.kind === HONORARIOS_ALLOWED_DEDUCTION_KIND)).toBe(true)
  })

  it('emits no deduction line when the rate snapshot is null (degraded)', () => {
    const payout = computeChileHonorariosPayout({ grossAmount: 500_000, rateSnapshot: null })

    expect(payout.withholdingAmount).toBe(0)
    expect(payout.netPayable).toBe(500_000)
    expect(payout.deductions).toEqual([])
  })
})

describe('assertNoDependentDeductions', () => {
  it('passes for an SII-only breakdown', () => {
    expect(() => assertNoDependentDeductions(['sii_retention'])).not.toThrow()
    expect(() => assertNoDependentDeductions([])).not.toThrow()
  })

  it('throws when any dependent payroll deduction is present', () => {
    for (const kind of ['afp', 'fonasa', 'isapre', 'afc', 'sis', 'mutual', 'iusc', 'apv', 'gratificacion_legal']) {
      expect(() => assertNoDependentDeductions(['sii_retention', kind])).toThrow(
        ChileHonorariosDependentDeductionError
      )
    }
  })

  it('is case-insensitive on the deduction kind', () => {
    expect(() => assertNoDependentDeductions(['AFP'])).toThrow(ChileHonorariosDependentDeductionError)
  })

  it('exposes the offending kinds on the error', () => {
    try {
      assertNoDependentDeductions(['afp', 'isapre'])
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ChileHonorariosDependentDeductionError)
      expect((error as ChileHonorariosDependentDeductionError).offendingKinds).toEqual(['afp', 'isapre'])
      expect((error as ChileHonorariosDependentDeductionError).code).toBe(
        'honorarios_dependent_deduction_forbidden'
      )
    }
  })

  it('DEPENDENT_DEDUCTION_KINDS never includes the allowed sii_retention kind', () => {
    expect(DEPENDENT_DEDUCTION_KINDS.has(HONORARIOS_ALLOWED_DEDUCTION_KIND)).toBe(false)
  })
})

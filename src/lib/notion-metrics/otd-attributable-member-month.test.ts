import { describe, it, expect } from 'vitest'

import {
  buildMemberMonthOtdRow,
  OTD_ATTRIBUTABLE_MEMBER_MONTH_FORMULA_VERSION,
  type MemberMonthCorrectionInput
} from './otd-attributable-member-month'

const base = (over: Partial<MemberMonthCorrectionInput> = {}): MemberMonthCorrectionInput => ({
  memberId: 'm1',
  legacy: { memberId: 'm1', onTimeCount: 8, lateDropCount: 1, overdueCount: 1, otdPctLegacy: 80 },
  lateDropCandidateIds: ['t-late-1'],
  overdueCandidateIds: ['t-over-1'],
  freezeCoveredCandidateIds: ['t-late-1', 't-over-1'],
  numeratorFlipIds: [],
  denominatorDropIds: [],
  ...over
})

describe('buildMemberMonthOtdRow', () => {
  it('degrada honesto a unavailable (null+null, NUNCA 0) con cohorte vacía', () => {
    const row = buildMemberMonthOtdRow(
      base({
        legacy: { memberId: 'm1', onTimeCount: 0, lateDropCount: 0, overdueCount: 0, otdPctLegacy: null },
        lateDropCandidateIds: [],
        overdueCandidateIds: [],
        freezeCoveredCandidateIds: []
      }),
      2026,
      5
    )

    expect(row.dataStatus).toBe('unavailable')
    expect(row.otdPctLegacy).toBeNull()
    expect(row.otdPctCorrected).toBeNull()
  })

  it('marca cohort_mismatch + corregido null si los candidatos no reproducen el legacy', () => {
    const row = buildMemberMonthOtdRow(
      base({
        // legacy dice late_drop=1 pero enumeramos 3 candidatos → harness aborta
        lateDropCandidateIds: ['a', 'b', 'c'],
        freezeCoveredCandidateIds: ['a', 'b', 'c', 't-over-1']
      }),
      2026,
      5
    )

    expect(row.dataStatus).toBe('cohort_mismatch')
    expect(row.cohortReproduced).toBe(false)
    expect(row.otdPctLegacy).toBe(80) // legacy se reporta
    expect(row.otdPctCorrected).toBeNull() // pero NUNCA se confía el corregido
  })

  it('sube el OTD por mecanismo numerador (late_drop → on_time)', () => {
    const row = buildMemberMonthOtdRow(base({ numeratorFlipIds: ['t-late-1'] }), 2026, 5)

    expect(row.dataStatus).toBe('valid')
    expect(row.numeratorFlipCount).toBe(1)
    expect(row.denominatorDropCount).toBe(0)
    // (8+1)/(10) = 90
    expect(row.otdPctCorrected).toBe(90)
    expect(row.otdPctCorrected).toBeGreaterThanOrEqual(row.otdPctLegacy!)
  })

  it('sube el OTD por mecanismo denominador (overdue → carry_over sale del denominador)', () => {
    const row = buildMemberMonthOtdRow(base({ denominatorDropIds: ['t-over-1'] }), 2026, 5)

    expect(row.dataStatus).toBe('valid')
    expect(row.denominatorDropCount).toBe(1)
    // 8/(10-1) = 88.9
    expect(row.otdPctCorrected).toBe(88.9)
    expect(row.otdPctCorrected).toBeGreaterThanOrEqual(row.otdPctLegacy!)
  })

  it('combina ambos mecanismos', () => {
    const row = buildMemberMonthOtdRow(
      base({ numeratorFlipIds: ['t-late-1'], denominatorDropIds: ['t-over-1'] }),
      2026,
      5
    )

    // (8+1)/(10-1) = 100
    expect(row.otdPctCorrected).toBe(100)
  })

  it('marca no_freeze_data (lower bound) con cobertura de freeze incompleta', () => {
    const row = buildMemberMonthOtdRow(
      base({ freezeCoveredCandidateIds: ['t-late-1'] }), // falta t-over-1
      2026,
      5
    )

    expect(row.dataStatus).toBe('no_freeze_data')
    expect(row.freezeCoveredCount).toBe(1)
    expect(row.improvableCandidateCount).toBe(2)
    // sigue siendo un número honesto (lower bound), no null
    expect(row.otdPctCorrected).toBe(80)
  })

  it('cohorte sin candidatos mejorables = valid trivial (corregido == legacy)', () => {
    const row = buildMemberMonthOtdRow(
      base({
        legacy: { memberId: 'm1', onTimeCount: 5, lateDropCount: 0, overdueCount: 0, otdPctLegacy: 100 },
        lateDropCandidateIds: [],
        overdueCandidateIds: [],
        freezeCoveredCandidateIds: []
      }),
      2026,
      5
    )

    expect(row.dataStatus).toBe('valid')
    expect(row.improvableCandidateCount).toBe(0)
    expect(row.otdPctCorrected).toBe(100)
  })

  it('clampa flips a candidatos cubiertos y a su mecanismo correcto', () => {
    const row = buildMemberMonthOtdRow(
      base({
        // un flip de numerador apunta a un id que NO es candidato late_drop → se ignora
        numeratorFlipIds: ['t-late-1', 't-ghost'],
        // un drop de denominador apunta a un late_drop (mecanismo equivocado) → se ignora
        denominatorDropIds: ['t-late-1']
      }),
      2026,
      5
    )

    expect(row.numeratorFlipCount).toBe(1) // solo t-late-1
    expect(row.denominatorDropCount).toBe(0) // t-late-1 no es overdue candidate
  })

  it('respeta el invariante corrected >= legacy y versiona la fórmula', () => {
    const row = buildMemberMonthOtdRow(base({ numeratorFlipIds: ['t-late-1'] }), 2026, 5)

    expect(row.otdPctCorrected).toBeGreaterThanOrEqual(row.otdPctLegacy!)
    expect(row.formulaVersion).toBe(OTD_ATTRIBUTABLE_MEMBER_MONTH_FORMULA_VERSION)
  })
})

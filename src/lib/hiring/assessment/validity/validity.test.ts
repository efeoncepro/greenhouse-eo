import { describe, expect, it } from 'vitest'

import { pearson, resolveVerdict } from './stats'

describe('validity stats (TASK-1364)', () => {
  it('pearson: correlación perfecta, inversa y nula', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1)
    expect(pearson([1, 2, 3, 4], [5, 1, 4, 2])).not.toBeNull()
  })

  it('pearson: null honesto con n<2 o varianza cero (nunca 0 espurio)', () => {
    expect(pearson([1], [2])).toBeNull()
    expect(pearson([], [])).toBeNull()
    expect(pearson([5, 5, 5], [1, 2, 3])).toBeNull()
  })

  it('verdicts por umbral de muestra: <10 insuficiente, 10-29 preliminar, ≥30 establecida', () => {
    expect(resolveVerdict(0)).toBe('insufficient_sample')
    expect(resolveVerdict(9)).toBe('insufficient_sample')
    expect(resolveVerdict(10)).toBe('preliminary')
    expect(resolveVerdict(29)).toBe('preliminary')
    expect(resolveVerdict(30)).toBe('established')
  })
})

describe('contratos read-only / sin PII (estático)', () => {
  it('el dominio validity NUNCA escribe scores ni tablas de assessment', async () => {
    const { readFileSync } = await import('node:fs')

    for (const file of ['get-validity.ts', 'stats.ts']) {
      const source = readFileSync(`${process.cwd()}/src/lib/hiring/assessment/validity/${file}`, 'utf8')

      expect(source, `${file} debe ser read-only`).not.toMatch(/INSERT\s+INTO|UPDATE\s+greenhouse|DELETE\s+FROM/i)
    }

    // El único write del dominio es la evidencia append-only (su propia tabla).
    const evidence = readFileSync(`${process.cwd()}/src/lib/hiring/assessment/validity/evidence.ts`, 'utf8')

    expect(evidence).toMatch(/INSERT INTO greenhouse_hr\.assessment_validity_evidence/)
    expect(evidence).not.toMatch(/hiring_assessment_response|hiring_competency_result|hiring_application/)
  })

  it('el reporte agregado no expone identificadores per-candidato', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(`${process.cwd()}/src/lib/hiring/assessment/validity/get-validity.ts`, 'utf8')

    // El shape de salida (ValidityCell/Report) no lleva member_id/identity/application ids.
    const cellBlock = source.slice(source.indexOf('interface ValidityCell'), source.indexOf('interface AssessmentValidityReport'))
    const reportBlock = source.slice(source.indexOf('interface AssessmentValidityReport'), source.indexOf('interface GetAssessmentValidityInput'))

    for (const block of [cellBlock, reportBlock]) {
      expect(block).not.toMatch(/memberId|identityProfileId|applicationId|fullName|email/)
    }
  })
})

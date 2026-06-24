import { describe, expect, it } from 'vitest'

import { buildBrandTruth, detectBrandInaccuracies, hasLikelyHallucination, type BrandTruth } from '../accuracy'
import { makeFinding } from './report-fixtures'

const TRUTH: BrandTruth = buildBrandTruth({
  brandName: 'Efeonce',
  category: 'agencia de marketing',
  competitorsDeclared: ['Acme']
})

describe('growth/ai-visibility — brand accuracy detector (TASK-1238)', () => {
  it('entity_collision: marca ambigua → hallazgo; ≥2 = high (gatea)', () => {
    const one = detectBrandInaccuracies([makeFinding({ brandMentioned: 'ambiguous' })], TRUTH)

    const two = detectBrandInaccuracies(
      [makeFinding({ brandMentioned: 'ambiguous' }), makeFinding({ brandMentioned: 'ambiguous' })],
      TRUTH
    )

    expect(one.find(f => f.kind === 'entity_collision')?.confidence).toBe('medium')
    expect(two.find(f => f.kind === 'entity_collision')?.confidence).toBe('high')
    expect(hasLikelyHallucination(one)).toBe(false) // 1 ambigua NO sobre-escala
    expect(hasLikelyHallucination(two)).toBe(true) // 2 ambiguas → revisión
  })

  it('category_mismatch: marca presente con categoría declarada ausente de las asociaciones', () => {
    const mismatch = detectBrandInaccuracies(
      [makeFinding({ brandMentioned: 'yes', categoryAssociations: ['venta de software', 'fintech'] })],
      TRUTH
    )

    const ok = detectBrandInaccuracies(
      [makeFinding({ brandMentioned: 'yes', categoryAssociations: ['agencia de marketing digital'] })],
      TRUTH
    )

    expect(mismatch.find(f => f.kind === 'category_mismatch')?.confidence).toBe('medium')
    expect(ok.find(f => f.kind === 'category_mismatch')).toBeUndefined() // categoría declarada presente → sin mismatch
  })

  it('sin categoría declarada → no evalúa category_mismatch (degradación honesta)', () => {
    const truthNoCat = buildBrandTruth({ brandName: 'Efeonce', category: null, competitorsDeclared: [] })
    const result = detectBrandInaccuracies([makeFinding({ brandMentioned: 'yes', categoryAssociations: ['fintech'] })], truthNoCat)

    expect(result.find(f => f.kind === 'category_mismatch')).toBeUndefined()
  })

  it('misattribution: afirmaciones desviadas = evidencia low (no gatea sola)', () => {
    const result = detectBrandInaccuracies(
      [makeFinding({ brandMentioned: 'yes', messageDriftClaims: ['somos los más baratos'] })],
      TRUTH
    )

    expect(result.find(f => f.kind === 'misattribution')?.confidence).toBe('low')
    expect(hasLikelyHallucination(result)).toBe(false)
  })

  it('sin inexactitud → sin hallazgos; no gatea', () => {
    const clean = detectBrandInaccuracies([makeFinding({ brandMentioned: 'yes', categoryAssociations: ['agencia de marketing'] })], TRUTH)

    expect(clean).toEqual([])
    expect(hasLikelyHallucination(clean)).toBe(false)
  })

  it('es determinista: mismo input → mismos hallazgos', () => {
    const findings = [makeFinding({ brandMentioned: 'ambiguous' }), makeFinding({ brandMentioned: 'yes', categoryAssociations: ['fintech'] })]

    expect(detectBrandInaccuracies(findings, TRUTH)).toEqual(detectBrandInaccuracies(findings, TRUTH))
  })
})

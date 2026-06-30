import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  NORMALIZED_FINDING_SCHEMA_VERSION,
  createEmptyNormalizedFinding,
  isNormalizedFinding,
  validateNormalizedFinding,
  type NormalizedFinding
} from '../normalization/contracts'

const goldenSet = JSON.parse(
  readFileSync(join(__dirname, '../evals/golden-set.v1.json'), 'utf8')
) as { cases: Array<{ id: string; input: Record<string, unknown>; expectedFinding: Record<string, unknown> }> }

describe('growth/ai-visibility — NormalizedFinding contract', () => {
  it('createEmptyNormalizedFinding preserva unknown/null/[] y valida', () => {
    const empty = createEmptyNormalizedFinding({
      findingId: 'f1',
      runId: 'r1',
      promptId: 'p03',
      provider: 'openai'
    })

    expect(empty.brandMentioned).toBe('unknown')
    expect(empty.brandRank).toBeNull()
    expect(empty.competitorsMentioned).toEqual([])
    expect(empty.sentimentLabel).toBe('unknown')
    expect(empty.sentimentScore).toBeNull()
    expect(empty.commercialIntentMatch).toBe('unknown')
    expect(empty.confidence).toBe(0)
    expect(empty.schemaVersion).toBe(NORMALIZED_FINDING_SCHEMA_VERSION)
    expect(isNormalizedFinding(empty)).toBe(true)
  })

  it('rechaza shapes inválidos con mensaje sanitizado (sin raw text)', () => {
    expect(() => validateNormalizedFinding(null)).toThrow(/no es un objeto/)
    const baseValid = createEmptyNormalizedFinding({ findingId: 'f', runId: 'r', promptId: 'p', provider: 'openai' })

    expect(() => validateNormalizedFinding({ ...baseValid, brandMentioned: 'maybe' })).toThrow(/brandMentioned/)
    expect(() => validateNormalizedFinding({ ...baseValid, confidence: 2 })).toThrow(/confidence/)
    expect(() => validateNormalizedFinding({ ...baseValid, brandRank: 0 })).toThrow(/brandRank/)
    expect(() => validateNormalizedFinding({ ...baseValid, sourceTypes: ['bogus'] })).toThrow(/sourceTypes/)
    expect(() => validateNormalizedFinding({ ...baseValid, schemaVersion: 'v2' })).toThrow(/schemaVersion/)
  })

  it('acepta brandRank null y numérico >=1', () => {
    const base = createEmptyNormalizedFinding({ findingId: 'f', runId: 'r', promptId: 'p', provider: 'openai' })

    expect(isNormalizedFinding({ ...base, brandRank: null })).toBe(true)
    expect(isNormalizedFinding({ ...base, brandRank: 1 })).toBe(true)
    expect(isNormalizedFinding({ ...base, brandRank: 0 })).toBe(false)
  })

  it('CONTRATO ↔ BASELINE: cada expectedFinding del golden-set de TASK-1228 valida contra el schema V1', () => {
    expect(goldenSet.cases.length).toBeGreaterThanOrEqual(8)

    for (const c of goldenSet.cases) {
      // El golden-set no trae findingId/runId/provider top-level: vienen del input.
      const finding: Partial<NormalizedFinding> = {
        ...c.expectedFinding,
        findingId: c.id,
        runId: 'golden',
        promptId: String(c.input.promptId),
        provider: c.input.provider as NormalizedFinding['provider'],
        // trustSignal es opcional en el golden-set; normalizar a null si falta.
        trustSignal: (c.expectedFinding.trustSignal as string | undefined) ?? null
      }

      expect(() => validateNormalizedFinding(finding), `caso ${c.id}`).not.toThrow()
    }
  })
})

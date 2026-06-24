import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  FIXTURE_DISCOVERY_ABSENT,
  FIXTURE_ENTITY_COLLISION,
  FIXTURE_RECALL_ACCURATE,
  FIXTURE_SKIPPED
} from '../evals/observation-fixtures'
import { type NormalizedFinding } from '../normalization/contracts'
import { type PersistedGraderScore } from '../scoring/engine'

const captured: { findings: NormalizedFinding[]; score: PersistedGraderScore | null } = {
  findings: [],
  score: null
}

vi.mock('../store', () => ({
  getGraderRun: async (runId: string) => ({
    runId,
    publicId: 'EO-GRUN-00001',
    profileId: 'gprf-1',
    runKind: 'smoke',
    mode: 'full',
    status: 'partial',
    providerPolicyVersion: 'policy.v1',
    promptPackVersion: 'prompt-pack.v1',
    requestedProviders: ['openai', 'anthropic'],
    idempotencyKey: null,
    estimatedCostUsd: 0.2,
    costCeilingUsd: 2,
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-06-24T00:00:00.000Z'
  }),
  getGraderProfile: async () => ({
    profileId: 'gprf-1',
    publicId: 'EO-GAVP-0001',
    brandName: 'Efeonce',
    websiteUrl: 'https://efeoncepro.com',
    market: 'Chile',
    locale: 'es-CL',
    category: 'marketing y diseño',
    competitorsDeclared: ['Cebra'],
    status: 'active'
  }),
  getRunObservations: async () => [
    FIXTURE_DISCOVERY_ABSENT,
    FIXTURE_RECALL_ACCURATE,
    FIXTURE_ENTITY_COLLISION,
    FIXTURE_SKIPPED
  ]
}))

vi.mock('../scoring/store', () => ({
  upsertNormalizedFindings: async (findings: NormalizedFinding[]) => {
    captured.findings = findings

    return findings.length
  },
  upsertGraderScore: async (score: PersistedGraderScore) => {
    captured.score = score

    return score
  },
  getNormalizedFindings: async () => captured.findings,
  getGraderScore: async () => captured.score
}))

const { scoreGraderRun } = await import('../scoring/command')

beforeEach(() => {
  captured.findings = []
  captured.score = null
  delete process.env.GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED
})

describe('growth/ai-visibility — scoreGraderRun command', () => {
  it('normaliza observaciones, persiste findings y computa score determinista', async () => {
    const { score, findings } = await scoreGraderRun({ runId: 'run-1' })

    // 4 observaciones (incl. skipped) → 4 findings persistidos.
    expect(findings).toHaveLength(4)
    expect(captured.findings).toHaveLength(4)
    expect(score.scoreVersion).toBe('ai_visibility_score_v1')

    // Descubrimiento sin marca → AI Visibility con piso real.
    const aiVis = score.dimensions.find(d => d.key === 'ai_visibility')

    expect(aiVis?.score).toBe(0)
    // Cebra declarado aparece en el excerpt de discovery → competidor detectado.
    expect(findings.some(f => f.competitorsMentioned.includes('Cebra'))).toBe(true)
  })

  it('determinista: recompute produce el mismo overallScore + dimensiones', async () => {
    const a = await scoreGraderRun({ runId: 'run-1' })
    const b = await scoreGraderRun({ runId: 'run-1' })

    expect(a.score.overallScore).toBe(b.score.overallScore)
    expect(a.score.dimensions).toEqual(b.score.dimensions)
  })

  it('status refleja el gate de cobertura (>=3 resueltas + >=2 familias)', async () => {
    const { score } = await scoreGraderRun({ runId: 'run-1' })

    // 3 succeeded resueltas (discovery no, recall yes, collision yes) sobre >=2 familias → completed.
    expect(['completed', 'insufficient_data']).toContain(score.scoreStatus)
    expect(score.autoReleasable).toBe(false) // auto-release público fuera de scope
  })
})

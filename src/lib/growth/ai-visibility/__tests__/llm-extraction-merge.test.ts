import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const runProseExtractionMock = vi.fn()

vi.mock('@/lib/growth/ai-visibility/normalization/prose-extraction/router', () => ({
  runProseExtraction: (...args: unknown[]) => runProseExtractionMock(...args)
}))

import { enrichFindingWithLlm } from '@/lib/growth/ai-visibility/normalization/llm-extraction'
import { createEmptyNormalizedFinding } from '@/lib/growth/ai-visibility/normalization/contracts'
import { type GrowthAiVisibilityProviderObservation } from '@/lib/growth/ai-visibility/contracts'

const baseObservation = {
  observationId: 'obs-1',
  runId: 'run-1',
  promptId: 'p14',
  provider: 'openai',
  model: 'gpt-4.1',
  status: 'succeeded',
  answerTextHash: null,
  answerExcerpt: 'Describe a la marca como Growth Operating System.',
  citations: [],
  usage: {},
  latencyMs: 0,
  providerRequestHash: 'hash',
  rawEvidencePointer: null,
  errorCode: null,
  providerPolicyVersion: 'policy.v1',
  promptPackVersion: 'prompt-pack.v1',
  createdAt: '2026-06-29T00:00:00.000Z'
} as unknown as GrowthAiVisibilityProviderObservation

const deterministicFinding = (overrides: Partial<ReturnType<typeof createEmptyNormalizedFinding>> = {}) => ({
  ...createEmptyNormalizedFinding({ findingId: 'obs-1', runId: 'run-1', promptId: 'p14', provider: 'openai' }),
  ...overrides
})

const context = { subjectBrand: 'Efeonce', subjectDomain: 'efeoncepro.com' }

beforeEach(() => {
  runProseExtractionMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('enrichFindingWithLlm — merge semantics (TASK-1271 sobre el router)', () => {
  it('fields null (router degradó) → determinista intacto + outcome anotado (TASK-1390)', async () => {
    runProseExtractionMock.mockResolvedValue({ fields: null, metadata: { status: 'disabled', providerId: null } })

    const finding = deterministicFinding({ brandMentioned: 'no', confidence: 0.9 })
    const result = await enrichFindingWithLlm(finding, baseObservation, context)

    // Los campos deterministas quedan intactos; solo se anota el outcome del intento.
    expect(result.brandMentioned).toBe('no')
    expect(result.confidence).toBe(0.9)
    expect(result.sentimentLabel).toBe('unknown')
    expect(result.proseExtraction).toEqual({ ran: false, status: 'disabled', provider: null })
  })

  it('NO sobrescribe brandMentioned cuando el determinista ya resolvió yes/no', async () => {
    runProseExtractionMock.mockResolvedValue({
      fields: {
        brandMentioned: 'ambiguous',
        sentimentLabel: 'neutral',
        sentimentScore: null,
        categoryAssociations: [],
        messageDriftClaims: [],
        confidence: 0.7
      },
      metadata: { status: 'ok' }
    })

    const finding = deterministicFinding({ brandMentioned: 'no', confidence: 0.9 })
    const result = await enrichFindingWithLlm(finding, baseObservation, context)

    expect(result.brandMentioned).toBe('no')
    expect(result.sentimentLabel).toBe('neutral')
  })

  it('refina brandMentioned cuando el determinista quedó unknown/ambiguous', async () => {
    runProseExtractionMock.mockResolvedValue({
      fields: {
        brandMentioned: 'yes',
        sentimentLabel: 'positive',
        sentimentScore: 0.5,
        categoryAssociations: [],
        messageDriftClaims: ['drift real'],
        confidence: 0.8
      },
      metadata: { status: 'ok' }
    })

    const finding = deterministicFinding({ brandMentioned: 'unknown', confidence: 0.3 })
    const result = await enrichFindingWithLlm(finding, baseObservation, context)

    expect(result.brandMentioned).toBe('yes')
    expect(result.messageDriftClaims).toEqual(['drift real'])
    expect(result.confidence).toBe(0.8)
  })

  it('mapea los candidatos de categoría a la taxonomía gobernada; basura → no publica strings libres', async () => {
    runProseExtractionMock.mockResolvedValue({
      fields: {
        brandMentioned: 'yes',
        sentimentLabel: 'neutral',
        sentimentScore: null,
        categoryAssociations: ['una categoría inventada que no existe en la taxonomía'],
        messageDriftClaims: [],
        confidence: 0.6
      },
      metadata: { status: 'ok' }
    })

    const finding = deterministicFinding({ brandMentioned: 'unknown' })
    const result = await enrichFindingWithLlm(finding, baseObservation, context)

    // Sólo IDs canónicos pueden salir; un candidato libre no mapeado no se publica como string crudo.
    expect(result.categoryAssociations).not.toContain('una categoría inventada que no existe en la taxonomía')
  })
})

describe('TASK-1390 (ISSUE-120 Gap C) — el outcome de la extracción se anota, no se descarta', () => {
  beforeEach(() => {
    runProseExtractionMock.mockReset()
  })

  it('degradación (fields=null) → finding determinista intacto + proseExtraction con la causa', async () => {
    runProseExtractionMock.mockResolvedValue({
      fields: null,
      metadata: {
        providerId: 'anthropic',
        model: null,
        version: 'prose-extraction.v1',
        status: 'not_configured',
        costEstimateUsd: 0,
        latencyMs: 0,
        usage: null
      }
    })

    const deterministic = deterministicFinding()
    const enriched = await enrichFindingWithLlm(deterministic, baseObservation, context)

    expect(enriched.sentimentLabel).toBe('unknown') // determinista intacto
    expect(enriched.proseExtraction).toEqual({ ran: false, status: 'not_configured', provider: 'anthropic' })
  })

  it('extracción ok → proseExtraction.ran=true con provider', async () => {
    runProseExtractionMock.mockResolvedValue({
      fields: {
        brandMentioned: 'yes',
        sentimentLabel: 'positive',
        sentimentScore: 0.6,
        categoryAssociations: [],
        messageDriftClaims: [],
        confidence: 0.8
      },
      metadata: {
        providerId: 'anthropic',
        model: 'claude',
        version: 'prose-extraction.v1',
        status: 'ok',
        costEstimateUsd: 0.001,
        latencyMs: 900,
        usage: null
      }
    })

    const enriched = await enrichFindingWithLlm(deterministicFinding(), baseObservation, context)

    expect(enriched.sentimentLabel).toBe('positive')
    expect(enriched.proseExtraction).toEqual({ ran: true, status: 'ok', provider: 'anthropic' })
  })
})

import { describe, expect, it } from 'vitest'

import { type GrowthAiVisibilityProviderObservation } from '../contracts'
import { estimateObservationCostUsd, estimateRunCostUsd } from '../cost'

const obs = (over: Partial<GrowthAiVisibilityProviderObservation>): GrowthAiVisibilityProviderObservation => ({
  observationId: 'o',
  runId: 'r',
  promptId: 'p',
  provider: 'openai',
  model: 'gpt-4.1',
  status: 'succeeded',
  answerTextHash: null,
  answerExcerpt: null,
  citations: [],
  usage: {},
  latencyMs: 0,
  providerRequestHash: 'h',
  rawEvidencePointer: null,
  errorCode: null,
  providerPolicyVersion: 'policy.v1',
  promptPackVersion: 'prompt-pack.v1',
  createdAt: '2026-06-24T00:00:00.000Z',
  ...over
})

describe('growth/ai-visibility — cost estimator', () => {
  it('skipped/failed = 0 (no tokens cobrables)', () => {
    expect(estimateObservationCostUsd(obs({ status: 'skipped', usage: { input_tokens: 9999 } }))).toBe(0)
    expect(estimateObservationCostUsd(obs({ status: 'failed', usage: { input_tokens: 9999 } }))).toBe(0)
  })

  it('openai: input+output tokens × pricing', () => {
    // 1M input @ $2 + 1M output @ $8 = $10
    const cost = estimateObservationCostUsd(
      obs({ provider: 'openai', usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 } })
    )

    expect(cost).toBeCloseTo(10, 5)
  })

  it('lee claves de usage por-provider (perplexity prompt_tokens, gemini promptTokenCount)', () => {
    const perplexity = estimateObservationCostUsd(
      obs({ provider: 'perplexity', usage: { prompt_tokens: 1_000_000, completion_tokens: 0 } })
    )

    expect(perplexity).toBeCloseTo(1, 5)

    const gemini = estimateObservationCostUsd(
      obs({ provider: 'gemini', usage: { promptTokenCount: 1_000_000, candidatesTokenCount: 0 } })
    )

    expect(gemini).toBeCloseTo(0.3, 5)
  })

  it('google_ai_overview usa costo reportado por DataForSEO incluso si no hubo bloque AI', () => {
    expect(
      estimateObservationCostUsd(
        obs({ provider: 'google_ai_overview', status: 'skipped', usage: { dataforseo_cost_usd: 0.004 } })
      )
    ).toBeCloseTo(0.004, 6)
  })

  it('estimateRunCostUsd suma el conjunto', () => {
    const total = estimateRunCostUsd([
      obs({ provider: 'openai', usage: { input_tokens: 1_000_000, output_tokens: 0 } }), // $2
      obs({ provider: 'openai', status: 'skipped' }) // $0
    ])

    expect(total).toBeCloseTo(2, 5)
  })
})

import { describe, expect, it } from 'vitest'

import { type GrowthAiVisibilityProviderObservation } from '../contracts'
import { buildCitationSourceBreakdown, summarizeCitationTargets } from '../report/citation-breakdown'

const observation = (
  overrides: Partial<GrowthAiVisibilityProviderObservation>
): GrowthAiVisibilityProviderObservation => ({
  observationId: 'obs-fixture',
  runId: 'run-fixture',
  promptId: 'p01',
  provider: 'openai',
  model: 'model',
  status: 'succeeded',
  answerTextHash: null,
  answerExcerpt: null,
  citations: [],
  usage: {},
  latencyMs: 10,
  providerRequestHash: 'hash',
  rawEvidencePointer: null,
  errorCode: null,
  providerPolicyVersion: 'policy.v1',
  promptPackVersion: 'prompt-pack.v1',
  createdAt: '2026-06-24T12:00:00.000Z',
  ...overrides
})

describe('growth/ai-visibility — citation source breakdown (TASK-1268)', () => {
  it('agrega dominios registrables, motores y clasificaciones public-safe', () => {
    const breakdown = buildCitationSourceBreakdown({
      subjectDomain: 'https://www.acme.com/',
      competitorsDeclared: ['https://competitor.co.uk/path'],
      observations: [
        observation({
          provider: 'openai',
          citations: [
            { url: 'https://blog.acme.com/post', domain: 'blog.acme.com' },
            { url: 'https://news.g2.com/acme', domain: 'news.g2.com', sourceType: 'earned' },
            { url: 'https://reddit.com/r/saas/comments/1', domain: 'www.reddit.com', sourceType: 'social' }
          ]
        }),
        observation({
          provider: 'perplexity',
          citations: [
            { url: 'https://www.g2.com/products/acme/reviews', domain: 'www.g2.com' },
            { url: 'https://docs.competitor.co.uk/compare', domain: 'docs.competitor.co.uk' }
          ]
        })
      ]
    })

    expect(breakdown.totalCitations).toBe(5)
    expect(breakdown.uniqueDomains).toBe(4)
    expect(breakdown.reason).toBeNull()
    expect(breakdown.domains[0]).toEqual({
      domain: 'g2.com',
      count: 2,
      engines: ['openai', 'perplexity'],
      classification: 'third_party'
    })
    expect(breakdown.domains).toContainEqual({
      domain: 'acme.com',
      count: 1,
      engines: ['openai'],
      classification: 'own_domain'
    })
    expect(breakdown.domains).toContainEqual({
      domain: 'competitor.co.uk',
      count: 1,
      engines: ['perplexity'],
      classification: 'competitor'
    })
    expect(breakdown.domains).toContainEqual({
      domain: 'reddit.com',
      count: 1,
      engines: ['openai'],
      classification: 'ugc'
    })
  })

  it('degrada honestamente cuando no hay citas evaluables', () => {
    const breakdown = buildCitationSourceBreakdown({
      observations: [
        observation({ status: 'failed', citations: [{ url: 'https://g2.com/acme', domain: 'g2.com' }] }),
        observation({ citations: [] })
      ]
    })

    expect(breakdown).toEqual({
      domains: [],
      totalCitations: 0,
      uniqueDomains: 0,
      reason: 'sin_citas_evaluables'
    })
  })

  it('resume targets excluyendo el dominio propio', () => {
    const breakdown = buildCitationSourceBreakdown({
      subjectDomain: 'acme.com',
      observations: [
        observation({
          citations: [
            { url: 'https://acme.com', domain: 'acme.com' },
            { url: 'https://g2.com/acme', domain: 'g2.com' },
            { url: 'https://reddit.com/r/saas', domain: 'reddit.com', sourceType: 'social' }
          ]
        })
      ]
    })

    expect(summarizeCitationTargets(breakdown)).toEqual(['g2.com', 'reddit.com'])
  })
})


import { describe, expect, it } from 'vitest'

import { GROWTH_AI_VISIBILITY_EXCERPT_MAX, type GrowthAiVisibilityProviderObservation } from '../contracts'
import {
  boundedExcerpt,
  buildCitation,
  buildCitations,
  extractCitationDomain,
  normalizeDomain,
  serializeProviderObservation,
  sha256Hex
} from '../observation'

describe('growth/ai-visibility — observation helpers', () => {
  it('boundedExcerpt recorta al límite y normaliza vacíos', () => {
    expect(boundedExcerpt(null)).toBeNull()
    expect(boundedExcerpt('   ')).toBeNull()
    expect(boundedExcerpt('  hola  ')).toBe('hola')

    const long = 'a'.repeat(GROWTH_AI_VISIBILITY_EXCERPT_MAX + 200)

    expect(boundedExcerpt(long)?.length).toBe(GROWTH_AI_VISIBILITY_EXCERPT_MAX)
  })

  it('extractCitationDomain normaliza host y stripea www', () => {
    expect(extractCitationDomain('https://www.efeoncepro.com/about')).toBe('efeoncepro.com')
    expect(extractCitationDomain('https://f11.es/')).toBe('f11.es')
    expect(extractCitationDomain('not a url')).toBeNull()
  })

  it('buildCitation descarta urls no parseables y preserva dominio', () => {
    expect(buildCitation({ url: 'nope' })).toBeNull()

    const citation = buildCitation({ url: 'https://www.efeoncepro.com', title: 'Efeonce', sourceType: 'owned' })

    expect(citation).toEqual({ url: 'https://www.efeoncepro.com', domain: 'efeoncepro.com', title: 'Efeonce', sourceType: 'owned' })
  })

  it('normalizeDomain reconoce dominios pelados/urls y rechaza no-dominios', () => {
    expect(normalizeDomain('loup.cl')).toBe('loup.cl')
    expect(normalizeDomain('www.Efeoncepro.com')).toBe('efeoncepro.com')
    expect(normalizeDomain('https://bigbuda.cl/agencia')).toBe('bigbuda.cl')
    expect(normalizeDomain('Una agencia de marketing')).toBeNull()
    expect(normalizeDomain(null)).toBeNull()
  })

  it('buildCitation prioriza el domain explícito sobre el host del url (caso Gemini/Vertex)', () => {
    const citation = buildCitation({
      url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AbC',
      title: 'loup.cl',
      domain: 'loup.cl'
    })

    expect(citation?.domain).toBe('loup.cl')
    expect(citation?.url).toContain('vertexaisearch.cloud.google.com')

    const fallback = buildCitation({ url: 'https://efeoncepro.com', domain: 'no es dominio' })

    expect(fallback?.domain).toBe('efeoncepro.com')
  })

  it('buildCitations deduplica por url y descarta inválidas', () => {
    const citations = buildCitations([
      { url: 'https://efeoncepro.com' },
      { url: 'https://efeoncepro.com' },
      { url: 'https://f11.es' },
      { url: 'broken' }
    ])

    expect(citations).toHaveLength(2)
    expect(citations.map(c => c.domain)).toEqual(['efeoncepro.com', 'f11.es'])
  })

  it('sha256Hex es estable y determinista', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'))
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'))
    expect(sha256Hex('abc')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('serializeProviderObservation round-trips a JSON sin perder campos', () => {
    const observation: GrowthAiVisibilityProviderObservation = {
      observationId: 'obs-1',
      runId: 'run-1',
      promptId: 'p03',
      provider: 'openai',
      model: 'gpt-4.1',
      status: 'succeeded',
      answerTextHash: sha256Hex('respuesta'),
      answerExcerpt: 'Lista de agencias…',
      citations: [{ url: 'https://efeoncepro.com', domain: 'efeoncepro.com', sourceType: 'owned' }],
      usage: { input_tokens: 1200, output_tokens: 300 },
      latencyMs: 5400,
      providerRequestHash: sha256Hex('request'),
      rawEvidencePointer: 'gs://bucket/run-1/obs-1.json',
      errorCode: null,
      providerPolicyVersion: 'policy.v1',
      promptPackVersion: 'prompt-pack.v1',
      createdAt: '2026-06-24T00:00:00.000Z'
    }

    const serialized = serializeProviderObservation(observation)
    const roundTripped = JSON.parse(JSON.stringify(serialized))

    expect(roundTripped).toEqual(serialized)
    expect(roundTripped.observationId).toBe('obs-1')
    expect(roundTripped.citations[0].domain).toBe('efeoncepro.com')
    expect(roundTripped.usage.input_tokens).toBe(1200)
  })
})

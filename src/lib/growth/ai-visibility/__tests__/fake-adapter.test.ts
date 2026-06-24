import { describe, expect, it } from 'vitest'

import { type GrowthAiVisibilityPromptInput } from '../contracts'
import { createFakeProviderAdapter } from '../providers/fake-adapter'
import { mapHttpStatusToErrorCode, mapThrownErrorToErrorCode } from '../providers/observation-builders'
import { createProviderAdapterContext, type ProviderAdapterContext } from '../providers/types'

const PROMPT: GrowthAiVisibilityPromptInput = {
  runId: 'run-1',
  promptId: 'p03',
  promptText: '¿Cuáles son las mejores agencias de marketing y diseño en Chile?',
  locale: 'es-CL',
  market: 'Chile',
  brandName: 'Efeonce',
  websiteUrl: 'https://efeoncepro.com',
  competitorsDeclared: ['Cebra'],
  mode: 'internal_audit'
}

// Contexto determinista (clock + id fijos) para reproducibilidad.
const deterministicContext = (): ProviderAdapterContext => {
  let counter = 0

  return createProviderAdapterContext({
    providerPolicyVersion: 'policy.v1',
    promptPackVersion: 'prompt-pack.v1',
    timeoutMs: 20_000,
    maxRetries: 1,
    now: () => '2026-06-24T00:00:00.000Z',
    newObservationId: () => `obs-${++counter}`
  })
}

describe('growth/ai-visibility — fake adapter (determinista)', () => {
  it('está habilitado sin secretos y produce observación exitosa determinista', async () => {
    const adapter = createFakeProviderAdapter({ provider: 'openai' })

    expect(await adapter.isEnabled()).toBe(true)

    const a = await adapter.runPrompt(PROMPT, deterministicContext())
    const b = await adapter.runPrompt(PROMPT, deterministicContext())

    expect(a.status).toBe('succeeded')
    expect(a.provider).toBe('openai')
    expect(a.answerExcerpt).toContain('Efeonce')
    expect(a.citations.map(c => c.domain)).toEqual(['efeoncepro.com'])
    // Determinismo: mismo input + contexto equivalente → mismo hash/latencia.
    expect(a.answerTextHash).toBe(b.answerTextHash)
    expect(a.latencyMs).toBe(b.latencyMs)
    expect(a.providerRequestHash).toBe(b.providerRequestHash)
  })

  it('behavior=skip → observación skipped con errorCode provider_disabled', async () => {
    const adapter = createFakeProviderAdapter({ provider: 'gemini', behavior: 'skip' })
    const obs = await adapter.runPrompt(PROMPT, deterministicContext())

    expect(obs.status).toBe('skipped')
    expect(obs.errorCode).toBe('provider_disabled')
    expect(obs.latencyMs).toBe(0)
    expect(obs.citations).toEqual([])
  })

  it('behavior=fail → observación failed con errorCode provider_error', async () => {
    const adapter = createFakeProviderAdapter({ provider: 'perplexity', behavior: 'fail' })
    const obs = await adapter.runPrompt(PROMPT, deterministicContext())

    expect(obs.status).toBe('failed')
    expect(obs.errorCode).toBe('provider_error')
    expect(obs.answerExcerpt).toBeNull()
  })

  it('sin websiteUrl no inventa citations', async () => {
    const adapter = createFakeProviderAdapter()
    const obs = await adapter.runPrompt({ ...PROMPT, websiteUrl: null }, deterministicContext())

    expect(obs.citations).toEqual([])
  })
})

describe('growth/ai-visibility — error mapping', () => {
  it('mapHttpStatusToErrorCode', () => {
    expect(mapHttpStatusToErrorCode(429)).toBe('rate_limited')
    expect(mapHttpStatusToErrorCode(504)).toBe('timeout')
    expect(mapHttpStatusToErrorCode(408)).toBe('timeout')
    expect(mapHttpStatusToErrorCode(500)).toBe('provider_error')
    expect(mapHttpStatusToErrorCode(400)).toBe('provider_error')
  })

  it('mapThrownErrorToErrorCode clasifica abort/timeout, parse y genérico', () => {
    const abort = new Error('aborted')

    abort.name = 'AbortError'
    expect(mapThrownErrorToErrorCode(abort)).toBe('timeout')
    expect(mapThrownErrorToErrorCode(new Error('request timed out'))).toBe('timeout')
    expect(mapThrownErrorToErrorCode(new SyntaxError('bad json'))).toBe('invalid_response')
    expect(mapThrownErrorToErrorCode(new Error('boom'))).toBe('provider_error')
  })
})

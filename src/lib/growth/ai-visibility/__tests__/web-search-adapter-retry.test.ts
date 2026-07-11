import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type GrowthAiVisibilityPromptInput } from '../contracts'
import { createProviderAdapterContext, type ProviderAdapterContext } from '../providers/types'

const captureSpy = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureSpy(...args)
}))

const { backoffDelayMs, createWebSearchAdapter } = await import('../providers/web-search-adapter')
const { mapThrownErrorToErrorCode } = await import('../providers/observation-builders')

/**
 * TASK-1390 (ISSUE-120 Gap D) — retries con backoff + clasificación rate_limited
 * para SDKs sin httpStatus (Vertex). Caso real: run EO-GRUN-00045, obs Gemini gn03
 * murió con provider_error genérico al primer throttle (retries inmediatos).
 */

const PROMPT: GrowthAiVisibilityPromptInput = {
  runId: 'run-1',
  promptId: 'gn03',
  promptText: '¿Qué alternativas hay a JetSMART?',
  locale: 'es-CL',
  market: 'Chile',
  brandName: 'SKY Airline',
  websiteUrl: 'https://www.skyairline.com',
  competitorsDeclared: ['JetSMART'],
  mode: 'full'
}

const ctx = (maxRetries = 2): ProviderAdapterContext =>
  createProviderAdapterContext({
    providerPolicyVersion: 'policy.v1',
    promptPackVersion: 'prompt-pack.v1',
    timeoutMs: 20_000,
    maxRetries,
    now: () => '2026-07-11T00:00:00.000Z',
    newObservationId: () => 'obs-1'
  })

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  captureSpy.mockReset()
  process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED = 'true'
  process.env.GROWTH_AI_VISIBILITY_GEMINI_ENABLED = 'true'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('mapThrownErrorToErrorCode — clasificación rate_limited sin httpStatus', () => {
  it('RESOURCE_EXHAUSTED / quota / 429 en message o code → rate_limited', () => {
    expect(mapThrownErrorToErrorCode(new Error('8 RESOURCE_EXHAUSTED: Quota exceeded'))).toBe('rate_limited')
    expect(mapThrownErrorToErrorCode(new Error('Too Many Requests'))).toBe('rate_limited')
    expect(mapThrownErrorToErrorCode(Object.assign(new Error('denied'), { code: 429 }))).toBe('rate_limited')
    expect(mapThrownErrorToErrorCode(new Error('rate limit reached for model'))).toBe('rate_limited')
  })

  it('errores genéricos siguen siendo provider_error; timeout sigue siendo timeout', () => {
    expect(mapThrownErrorToErrorCode(new Error('internal server error'))).toBe('provider_error')
    expect(mapThrownErrorToErrorCode(new Error('request timed out'))).toBe('timeout')
  })
})

describe('backoffDelayMs — exponencial con cap y jitter acotado', () => {
  it('crece exponencialmente y respeta el cap', () => {
    for (let i = 0; i < 20; i++) {
      const a0 = backoffDelayMs(0)
      const a1 = backoffDelayMs(1)
      const a2 = backoffDelayMs(2)

      expect(a0).toBeGreaterThanOrEqual(375 * 0.99)
      expect(a0).toBeLessThanOrEqual(625)
      expect(a1).toBeGreaterThanOrEqual(1125 * 0.99)
      expect(a1).toBeLessThanOrEqual(1875)
      expect(a2).toBeLessThanOrEqual(5000) // cap 4000 + jitter 25%
    }
  })
})

describe('createWebSearchAdapter — retry con backoff', () => {
  it('throttle thrown (RESOURCE_EXHAUSTED) reintenta con sleep y puede terminar succeeded', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    let calls = 0

    const adapter = createWebSearchAdapter(
      {
        provider: 'gemini',
        defaultModel: 'gemini-test',
        isConfigured: async () => true,
        runCall: async () => {
          calls += 1

          if (calls <= 2) {
            throw new Error('8 RESOURCE_EXHAUSTED: Quota exceeded for model')
          }

          return {
            ok: true,
            httpStatus: null,
            model: 'gemini-test',
            text: 'Respuesta con alternativas.',
            citations: [{ url: 'https://skyairline.com/destinos' }],
            usage: {},
            latencyMs: 100
          }
        }
      },
      { sleep }
    )

    const observation = await adapter.runPrompt(PROMPT, ctx(2))

    expect(observation.status).toBe('succeeded')
    expect(calls).toBe(3)
    expect(sleep).toHaveBeenCalledTimes(2) // backoff entre los 3 intentos
    expect(captureSpy).toHaveBeenCalledTimes(2) // cada throw sigue yendo a Sentry
  })

  it('throttle persistente agota los intentos → observación rate_limited (ya no provider_error genérico)', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)

    const adapter = createWebSearchAdapter(
      {
        provider: 'gemini',
        defaultModel: 'gemini-test',
        isConfigured: async () => true,
        runCall: async () => {
          throw new Error('429 Too Many Requests')
        }
      },
      { sleep }
    )

    const observation = await adapter.runPrompt(PROMPT, ctx(2))

    expect(observation.status).toBe('rate_limited')
    expect(observation.errorCode).toBe('rate_limited')
    expect(sleep).toHaveBeenCalledTimes(2) // no duerme después del último intento
  })

  it('error genérico NO reintenta (comportamiento previo preservado)', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    let calls = 0

    const adapter = createWebSearchAdapter(
      {
        provider: 'gemini',
        defaultModel: 'gemini-test',
        isConfigured: async () => true,
        runCall: async () => {
          calls += 1
          throw new Error('internal provider failure')
        }
      },
      { sleep }
    )

    const observation = await adapter.runPrompt(PROMPT, ctx(2))

    expect(observation.status).toBe('failed')
    expect(observation.errorCode).toBe('provider_error')
    expect(calls).toBe(1)
    expect(sleep).not.toHaveBeenCalled()
  })
})

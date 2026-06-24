import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type GrowthAiVisibilityPromptInput } from '../contracts'
import { createProviderAdapterContext, type ProviderAdapterContext } from '../providers/types'

// Mock del cliente canónico OpenAI (no red real).
const mockRun = vi.fn()
const mockIsConfigured = vi.fn()

vi.mock('@/lib/ai/openai', () => ({
  OPENAI_RESPONSES_DEFAULT_MODEL: 'gpt-4.1',
  isOpenAIConfigured: () => mockIsConfigured(),
  runOpenAIResponsesWebSearch: (input: unknown) => mockRun(input)
}))

const captureSpy = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureSpy(...args)
}))

const { createOpenAIProviderAdapter } = await import('../providers/openai-adapter')

const PROMPT: GrowthAiVisibilityPromptInput = {
  runId: 'run-1',
  promptId: 'p03',
  promptText: '¿Cuáles son las mejores agencias en Chile?',
  locale: 'es-CL',
  market: 'Chile',
  brandName: 'Efeonce',
  websiteUrl: 'https://efeoncepro.com',
  competitorsDeclared: [],
  mode: 'full'
}

const ctx = (): ProviderAdapterContext =>
  createProviderAdapterContext({
    providerPolicyVersion: 'policy.v1',
    promptPackVersion: 'prompt-pack.v1',
    timeoutMs: 20_000,
    maxRetries: 1,
    now: () => '2026-06-24T00:00:00.000Z',
    newObservationId: () => 'obs-1'
  })

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  mockRun.mockReset()
  mockIsConfigured.mockReset()
  captureSpy.mockReset()
  delete process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED
  delete process.env.GROWTH_AI_VISIBILITY_OPENAI_ENABLED
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

const enableFlags = () => {
  process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED = 'true'
  process.env.GROWTH_AI_VISIBILITY_OPENAI_ENABLED = 'true'
}

describe('growth/ai-visibility — OpenAI adapter skip paths (sin crash)', () => {
  it('grader global OFF → skipped grader_disabled, sin llamar al provider', async () => {
    mockIsConfigured.mockResolvedValue(true)
    const obs = await createOpenAIProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('skipped')
    expect(obs.errorCode).toBe('grader_disabled')
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('provider flag OFF → skipped provider_disabled', async () => {
    process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED = 'true'
    mockIsConfigured.mockResolvedValue(true)
    const obs = await createOpenAIProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('skipped')
    expect(obs.errorCode).toBe('provider_disabled')
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('flags ON pero sin secret → skipped missing_secret', async () => {
    enableFlags()
    mockIsConfigured.mockResolvedValue(false)
    const obs = await createOpenAIProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('skipped')
    expect(obs.errorCode).toBe('missing_secret')
    expect(mockRun).not.toHaveBeenCalled()
    expect(captureSpy).not.toHaveBeenCalled()
  })
})

describe('growth/ai-visibility — OpenAI adapter execution', () => {
  it('éxito → observación normalizada con citations + hash', async () => {
    enableFlags()
    mockIsConfigured.mockResolvedValue(true)
    mockRun.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      model: 'gpt-4.1',
      text: 'Lista de agencias chilenas, incluye Cebra.',
      citations: [{ url: 'https://www.cebra.cl/', title: 'Cebra' }],
      usage: { input_tokens: 1200 },
      latencyMs: 5400
    })

    const obs = await createOpenAIProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('succeeded')
    expect(obs.model).toBe('gpt-4.1')
    expect(obs.answerExcerpt).toContain('agencias')
    expect(obs.answerTextHash).toMatch(/^[0-9a-f]{64}$/)
    expect(obs.citations).toEqual([{ url: 'https://www.cebra.cl/', domain: 'cebra.cl', title: 'Cebra' }])
  })

  it('HTTP 400 → failed provider_error sin reintento', async () => {
    enableFlags()
    mockIsConfigured.mockResolvedValue(true)
    mockRun.mockResolvedValue({
      ok: false,
      httpStatus: 400,
      model: 'gpt-4.1',
      text: null,
      citations: [],
      usage: {},
      latencyMs: 120
    })

    const obs = await createOpenAIProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('failed')
    expect(obs.errorCode).toBe('provider_error')
    expect(mockRun).toHaveBeenCalledTimes(1)
  })

  it('HTTP 429 → rate_limited con reintento acotado', async () => {
    enableFlags()
    mockIsConfigured.mockResolvedValue(true)
    mockRun.mockResolvedValue({
      ok: false,
      httpStatus: 429,
      model: 'gpt-4.1',
      text: null,
      citations: [],
      usage: {},
      latencyMs: 80
    })

    const obs = await createOpenAIProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('rate_limited')
    expect(obs.errorCode).toBe('rate_limited')
    // maxRetries=1 → intento inicial + 1 reintento = 2 llamadas.
    expect(mockRun).toHaveBeenCalledTimes(2)
  })

  it('throw (timeout) → failed timeout + captureWithDomain growth', async () => {
    enableFlags()
    mockIsConfigured.mockResolvedValue(true)
    const abort = new Error('aborted')

    abort.name = 'AbortError'
    mockRun.mockRejectedValue(abort)

    const obs = await createOpenAIProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('failed')
    expect(obs.errorCode).toBe('timeout')
    expect(captureSpy).toHaveBeenCalled()
    expect(captureSpy.mock.calls[0][1]).toBe('growth')
  })
})

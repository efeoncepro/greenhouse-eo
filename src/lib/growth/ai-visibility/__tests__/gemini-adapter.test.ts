import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type GrowthAiVisibilityPromptInput } from '../contracts'
import { createProviderAdapterContext, type ProviderAdapterContext } from '../providers/types'

const mockRun = vi.fn()
const mockConfigured = vi.fn()

vi.mock('@/lib/ai/google-genai', () => ({
  GEMINI_GROUNDED_DEFAULT_MODEL: 'gemini-2.5-flash',
  isGeminiConfigured: () => mockConfigured(),
  runGeminiGroundedSearch: (input: unknown) => mockRun(input)
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const { createGeminiProviderAdapter } = await import('../providers/gemini-adapter')

const PROMPT: GrowthAiVisibilityPromptInput = {
  runId: 'run-1',
  promptId: 'p03',
  promptText: '¿Mejores agencias en Chile?',
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
    timeoutMs: 35_000,
    maxRetries: 0,
    now: () => '2026-06-24T00:00:00.000Z',
    newObservationId: () => 'obs-1'
  })

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  mockRun.mockReset()
  mockConfigured.mockReset()
  delete process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED
  delete process.env.GROWTH_AI_VISIBILITY_GEMINI_ENABLED
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

const enable = () => {
  process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED = 'true'
  process.env.GROWTH_AI_VISIBILITY_GEMINI_ENABLED = 'true'
}

describe('growth/ai-visibility — Gemini adapter', () => {
  it('grader/provider OFF → skip limpio sin llamar Vertex', async () => {
    mockConfigured.mockReturnValue(true)
    const off = await createGeminiProviderAdapter().runPrompt(PROMPT, ctx())

    expect(off.status).toBe('skipped')
    expect(off.errorCode).toBe('grader_disabled')
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('flags ON sin project Vertex → skip missing_secret', async () => {
    enable()
    mockConfigured.mockReturnValue(false)
    const obs = await createGeminiProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('skipped')
    expect(obs.errorCode).toBe('missing_secret')
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('TASK-1233: el dominio de la citation sale del TITLE, no del redirect vertexaisearch', async () => {
    enable()
    mockConfigured.mockReturnValue(true)
    mockRun.mockResolvedValue({
      ok: true,
      model: 'gemini-2.5-flash',
      text: 'Agencias destacadas en Chile: loup, big buda, etc.',
      citations: [
        { url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AbC123', title: 'loup.cl' },
        { url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/XyZ789', title: 'bigbuda.cl' }
      ],
      usage: { promptTokenCount: 1200, candidatesTokenCount: 800 },
      latencyMs: 12000
    })

    const obs = await createGeminiProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('succeeded')
    // El dominio NO es vertexaisearch.cloud.google.com (el redirect), sino el real del title.
    expect(obs.citations.map(c => c.domain)).toEqual(['loup.cl', 'bigbuda.cl'])
    expect(obs.citations.every(c => c.domain !== 'vertexaisearch.cloud.google.com')).toBe(true)
    // Se preserva la url redirect original (trazabilidad) + el title.
    expect(obs.citations[0].url).toContain('vertexaisearch.cloud.google.com')
    expect(obs.citations[0].title).toBe('loup.cl')
  })

  it('si el dominio del sujeto aparece en un title, brandMentioned por dominio funciona', async () => {
    enable()
    mockConfigured.mockReturnValue(true)
    mockRun.mockResolvedValue({
      ok: true,
      model: 'gemini-2.5-flash',
      text: 'Efeonce es una agencia.',
      citations: [{ url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/Q', title: 'efeoncepro.com' }],
      usage: {},
      latencyMs: 9000
    })

    const obs = await createGeminiProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.citations[0].domain).toBe('efeoncepro.com')
  })
})

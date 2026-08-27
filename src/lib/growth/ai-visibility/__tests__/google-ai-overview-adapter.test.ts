import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type GrowthAiVisibilityPromptInput } from '../contracts'
import { createProviderAdapterContext, type ProviderAdapterContext } from '../providers/types'

const mockConfigured = vi.fn()
const mockPost = vi.fn()

vi.mock('@/lib/ai/dataforseo', () => ({
  DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT: '/v3/serp/google/ai_mode/live/advanced',
  isDataForSeoConfigured: () => mockConfigured(),
  postDataForSeoSerpLiveAdvanced: (input: unknown) => mockPost(input)
}))

const captureSpy = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureSpy(...args)
}))

const {
  createGoogleAiOverviewProviderAdapter,
  parseDataForSeoGoogleAiModeBlock
} = await import('../providers/google-ai-overview-adapter')

const PROMPT: GrowthAiVisibilityPromptInput = {
  runId: 'run-1',
  promptId: 'p03',
  promptText: 'Which agencies are recommended for enterprise growth in Chile?',
  locale: 'es-CL',
  market: 'Chile',
  brandName: 'Efeonce',
  websiteUrl: 'https://efeoncepro.com',
  competitorsDeclared: ['Cebra'],
  mode: 'light'
}

const ctx = (): ProviderAdapterContext =>
  createProviderAdapterContext({
    providerPolicyVersion: 'policy.v1',
    promptPackVersion: 'prompt-pack.v1',
    timeoutMs: 20_000,
    maxRetries: 0,
    now: () => '2026-06-27T00:00:00.000Z',
    newObservationId: () => 'obs-google-1'
  })

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  mockConfigured.mockReset()
  mockPost.mockReset()
  captureSpy.mockReset()
  delete process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED
  delete process.env.GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

const enable = () => {
  process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED = 'true'
  process.env.GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED = 'true'
}

const dataForSeoTasksWithAiBlock = () => [
  {
    id: 'task-1',
    status_code: 20000,
    result: [
      {
        items: [
          {
            type: 'ai_overview',
            markdown: 'Google AI Mode recommends Efeonce for enterprise growth operations in LATAM.',
            references: [
              { url: 'https://efeoncepro.com/', title: 'Efeonce', domain: 'efeoncepro.com' },
              { url: 'https://www.cebra.cl/casos', title: 'Cebra' }
            ]
          }
        ]
      }
    ]
  }
]

describe('growth/ai-visibility — Google AI Overview adapter', () => {
  it('grader/provider OFF -> skipped sin llamar DataForSEO', async () => {
    mockConfigured.mockResolvedValue(true)

    const obs = await createGoogleAiOverviewProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.provider).toBe('google_ai_overview')
    expect(obs.status).toBe('skipped')
    expect(obs.errorCode).toBe('grader_disabled')
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('flags ON sin credenciales -> missing_secret', async () => {
    enable()
    mockConfigured.mockResolvedValue(false)

    const obs = await createGoogleAiOverviewProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('skipped')
    expect(obs.errorCode).toBe('missing_secret')
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('normaliza un bloque AI Mode con citas y costo por request', async () => {
    enable()
    mockConfigured.mockResolvedValue(true)
    mockPost.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: dataForSeoTasksWithAiBlock(),
      cost: 0.004,
      latencyMs: 1400,
      secretSource: 'secret_manager'
    })

    const obs = await createGoogleAiOverviewProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('succeeded')
    expect(obs.provider).toBe('google_ai_overview')
    expect(obs.answerTextHash).toMatch(/^[0-9a-f]{64}$/)
    expect(obs.answerExcerpt).toContain('Efeonce')
    expect(obs.citations.map(c => c.domain)).toEqual(['efeoncepro.com', 'cebra.cl'])
    expect(obs.usage.dataforseo_cost_usd).toBe(0.004)
    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/v3/serp/google/ai_mode/live/advanced',
        tasks: [
          expect.objectContaining({
            keyword: PROMPT.promptText,
            location_name: 'Chile',
            language_code: 'en',
            device: 'desktop'
          })
        ]
      })
    )
  })

  it('HTTP provider error -> failed con error canonico sanitizado', async () => {
    enable()
    mockConfigured.mockResolvedValue(true)
    mockPost.mockResolvedValue({
      ok: false,
      httpStatus: 401,
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: [],
      cost: null,
      latencyMs: 90,
      secretSource: 'secret_manager'
    })

    const obs = await createGoogleAiOverviewProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('failed')
    expect(obs.errorCode).toBe('provider_error')
    expect(obs.answerExcerpt).toBeNull()
  })

  it('HTTP 200 sin bloque AI -> skipped no_ai_overview_block sin succeeded vacio', async () => {
    enable()
    mockConfigured.mockResolvedValue(true)
    mockPost.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: [{ id: 'task-1', status_code: 20000, result: [{ items: [{ type: 'organic', title: 'SERP result' }] }] }],
      cost: 0.004,
      latencyMs: 800,
      secretSource: 'secret_manager'
    })

    const obs = await createGoogleAiOverviewProviderAdapter().runPrompt(PROMPT, ctx())

    expect(obs.status).toBe('skipped')
    expect(obs.errorCode).toBe('no_ai_overview_block')
    expect(obs.answerExcerpt).toBeNull()
    expect(obs.citations).toEqual([])
    expect(obs.usage.dataforseo_cost_usd).toBe(0.004)
  })

  it('market ISO-2 mapeado (CL) -> location_code numerico, nunca location_name crudo', async () => {
    enable()
    mockConfigured.mockResolvedValue(true)
    mockPost.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: dataForSeoTasksWithAiBlock(),
      cost: 0.004,
      latencyMs: 1100,
      secretSource: 'secret_manager'
    })

    const obs = await createGoogleAiOverviewProviderAdapter().runPrompt({ ...PROMPT, market: 'CL' }, ctx())

    expect(obs.status).toBe('succeeded')
    expect(captureSpy).not.toHaveBeenCalled()

    const sentTask = mockPost.mock.calls[0][0].tasks[0]

    expect(sentTask.location_code).toBe(2152)
    expect(sentTask.location_name).toBeUndefined()
  })

  it('market ISO-2 sin mapear -> fallback US observado, nunca el codigo crudo', async () => {
    enable()
    mockConfigured.mockResolvedValue(true)
    mockPost.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: dataForSeoTasksWithAiBlock(),
      cost: 0.004,
      latencyMs: 1100,
      secretSource: 'secret_manager'
    })

    await createGoogleAiOverviewProviderAdapter().runPrompt({ ...PROMPT, market: 'BR' }, ctx())

    const sentTask = mockPost.mock.calls[0][0].tasks[0]

    expect(sentTask.location_code).toBe(2840)
    expect(sentTask.location_name).toBeUndefined()
    expect(captureSpy).toHaveBeenCalledTimes(1)
    expect(captureSpy.mock.calls[0][2]).toMatchObject({ level: 'warning', extra: expect.objectContaining({ market: 'BR' }) })
  })

  it('task DataForSEO con status_code != 20000 -> failed provider_error, NUNCA skip honesto', async () => {
    enable()
    mockConfigured.mockResolvedValue(true)
    mockPost.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: [
        {
          id: 'task-1',
          status_code: 40501,
          status_message: 'Invalid Field: location_name.',
          result: null
        }
      ],
      cost: 0,
      latencyMs: 300,
      secretSource: 'secret_manager'
    })

    const obs = await createGoogleAiOverviewProviderAdapter().runPrompt({ ...PROMPT, market: 'CL' }, ctx())

    expect(obs.status).toBe('failed')
    expect(obs.errorCode).toBe('provider_error')
    expect(obs.usage.dataforseo_status_code).toBe(40501)
    expect(captureSpy).toHaveBeenCalledTimes(1)
  })

  it('respuesta ok sin task o sin status_code -> failed invalid_response (shape roto, no skip)', async () => {
    enable()
    mockConfigured.mockResolvedValue(true)
    mockPost.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      endpoint: '/v3/serp/google/ai_mode/live/advanced',
      tasks: [{ id: 'task-1', result: [{ items: [] }] }],
      cost: 0,
      latencyMs: 250,
      secretSource: 'secret_manager'
    })

    const obs = await createGoogleAiOverviewProviderAdapter().runPrompt({ ...PROMPT, market: 'CL' }, ctx())

    expect(obs.status).toBe('failed')
    expect(obs.errorCode).toBe('invalid_response')
  })

  it('parser lock: acepta ai_overview_element y referencias heterogeneas', () => {
    const parsed = parseDataForSeoGoogleAiModeBlock([
      {
        result: [
          {
            items: [
              {
                type: 'ai_overview_element',
                text: 'Efeonce appears in the AI answer.',
                links: [{ link: 'https://www.efeoncepro.com/casos', text: 'Case study' }]
              }
            ]
          }
        ]
      }
    ])

    expect(parsed.text).toContain('Efeonce')
    expect(parsed.citations).toEqual([
      { url: 'https://www.efeoncepro.com/casos', domain: 'efeoncepro.com', title: 'Case study' }
    ])
  })
})

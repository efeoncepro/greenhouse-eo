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

  it('parser lock (shape real sandbox): references anidadas en ai_overview_element llegan a citations sin duplicar', () => {
    // Fixture derivado de una respuesta REAL del sandbox AI Mode (2026-08-27): el item
    // `ai_overview` trae `markdown` + `references[]` top-level + `items[]` anidados de tipo
    // `ai_overview_element`, cada uno con sus propias `references[]` (shape doc §4.1:
    // type/position/source/domain/url/title/text). El proveedor DUPLICA referencias arriba
    // (top ⊇ anidadas en el sandbox), pero el descenso cubre el caso donde una referencia
    // solo existe anidada.
    const parsed = parseDataForSeoGoogleAiModeBlock([
      {
        id: 'task-1',
        status_code: 20000,
        result: [
          {
            keyword: 'which agencies are recommended for enterprise growth in chile',
            type: 'ai_mode',
            item_types: ['ai_overview'],
            items: [
              {
                type: 'ai_overview',
                rank_group: 1,
                rank_absolute: 1,
                position: 'left',
                markdown: 'Enterprise growth agencies in Chile include Efeonce, known for ASaaS operations.',
                references: [
                  {
                    type: 'ai_overview_reference',
                    position: 'right',
                    source: 'Efeonce',
                    domain: 'efeoncepro.com',
                    url: 'https://efeoncepro.com/',
                    title: 'Efeonce — Agencia',
                    text: 'Efeonce is an enterprise growth agency…'
                  }
                ],
                items: [
                  {
                    type: 'ai_overview_element',
                    position: 'left',
                    title: 'Top agencies',
                    text: 'Efeonce and Cebra lead the enterprise segment.',
                    markdown: null,
                    links: null,
                    images: null,
                    references: [
                      {
                        type: 'ai_overview_reference',
                        position: 'left',
                        source: 'Efeonce',
                        domain: 'efeoncepro.com',
                        url: 'https://efeoncepro.com/',
                        title: 'Efeonce — Agencia',
                        text: 'Efeonce is an enterprise growth agency…'
                      },
                      {
                        type: 'ai_overview_reference',
                        position: 'left',
                        source: 'Cebra',
                        domain: 'cebra.cl',
                        url: 'https://www.cebra.cl/casos',
                        title: 'Casos — Cebra',
                        text: 'Casos de éxito de Cebra…'
                      }
                    ]
                  },
                  {
                    type: 'ai_overview_table_element',
                    position: 'left',
                    markdown: '| Agency | Focus |',
                    references: [
                      {
                        type: 'ai_overview_reference',
                        position: 'left',
                        source: 'Clutch',
                        domain: 'clutch.co',
                        url: 'https://clutch.co/cl/agencies',
                        title: 'Top Chile Agencies',
                        text: 'Directory of agencies in Chile…'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ])

    // Texto: SOLO el markdown del bloque padre (los textos anidados duplicarían el hash).
    expect(parsed.text).toBe('Enterprise growth agencies in Chile include Efeonce, known for ASaaS operations.')

    // Citas: top-level + anidadas (element y table), dedupe por URL (efeoncepro.com aparece
    // arriba Y anidada — una sola vez).
    expect(parsed.citations.map(c => c.domain)).toEqual(['efeoncepro.com', 'cebra.cl', 'clutch.co'])
  })

  it('parser: bloque ai_overview sin markdown usa el texto de los elementos anidados', () => {
    const parsed = parseDataForSeoGoogleAiModeBlock([
      {
        status_code: 20000,
        result: [
          {
            items: [
              {
                type: 'ai_overview',
                items: [
                  { type: 'ai_overview_element', text: 'Nested answer fragment about Efeonce.', references: [] },
                  { type: 'ai_overview_expanded_element', text: 'Expanded detail fragment.' }
                ]
              }
            ]
          }
        ]
      }
    ])

    expect(parsed.text).toBe('Nested answer fragment about Efeonce.\n\nExpanded detail fragment.')
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

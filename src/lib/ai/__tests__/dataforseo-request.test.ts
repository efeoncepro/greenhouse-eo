import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { dataForSeoBreaker } from '../dataforseo-breaker'

const mockResolveSecret = vi.fn()

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: (input: unknown) => mockResolveSecret(input)
}))

const { requestDataForSeo } = await import('../dataforseo')

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  dataForSeoBreaker.reset()
  process.env.DATAFORSEO_API_LOGIN = 'api@example.com'
  mockResolveSecret.mockResolvedValue({ source: 'env', value: 'password' })
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

describe('requestDataForSeo GET transport', () => {
  it('allows free AI Optimization discovery GETs without inventing an organization', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ cost: 0, tasks: [{ status_code: 20000, result: [{ model_name: 'live-model' }] }] })
    } as Response)

    const result = await requestDataForSeo({
      family: 'ai_optimization',
      consumer: 'aeo',
      method: 'GET',
      endpoint: '/v3/ai_optimization/chat_gpt/llm_responses/models',
      tasks: []
    })

    expect(result.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledOnce()
  })

  it('rejects an AI Optimization POST without organization attribution before fetching', async () => {
    await expect(
      requestDataForSeo({
        family: 'ai_optimization',
        consumer: 'aeo',
        method: 'POST',
        endpoint: '/v3/ai_optimization/chat_gpt/llm_responses/live',
        tasks: [{ user_prompt: 'x', model_name: 'x', max_output_tokens: 16 }]
      } as never)
    ).rejects.toThrow('exige organizationId')

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('uses the canonical auth/breaker transport without a request body', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ cost: 0, tasks: [{ status_code: 20000, result: [{ id: 'x' }] }] })
    } as Response)

    const result = await requestDataForSeo({
      family: 'serp',
      consumer: 'seo',
      method: 'GET',
      endpoint: '/v3/serp/google/organic/tasks_ready',
      tasks: []
    })

    expect(result.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.dataforseo.com/v3/serp/google/organic/tasks_ready',
      expect.not.objectContaining({ body: expect.anything() })
    )
  })

  it('retries retryable GET failures but never more than three attempts', async () => {
    const fetchMock = vi.mocked(global.fetch)

    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, headers: new Headers(), text: async () => '' } as Response)
      .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers(), text: async () => '' } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ cost: 0, tasks: [] })
      } as Response)

    await requestDataForSeo({
      family: 'serp',
      consumer: 'seo',
      method: 'GET',
      endpoint: '/v3/serp/google/organic/tasks_ready',
      tasks: []
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('never retries POST after a retryable HTTP response', async () => {
    const fetchMock = vi.mocked(global.fetch)

    fetchMock.mockResolvedValue({ ok: false, status: 503, text: async () => '' } as Response)

    await requestDataForSeo({
      family: 'serp',
      consumer: 'seo',
      method: 'POST',
      endpoint: '/v3/serp/google/organic/live/advanced',
      tasks: [{ keyword: 'x' }]
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockResolveSecret = vi.fn()

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: (input: unknown) => mockResolveSecret(input)
}))

const {
  DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT,
  checkDataForSeoConnection,
  isDataForSeoConfigured,
  postDataForSeoSerpLiveAdvanced,
  runDataForSeoGoogleAiModeSerp
} = await import('../dataforseo')

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  mockResolveSecret.mockReset()
  global.fetch = vi.fn()
  delete process.env.DATAFORSEO_API_LOGIN
  delete process.env.DATAFORSEO_API_PASSWORD
  delete process.env.DATAFORSEO_API_PASSWORD_SECRET_REF
})

afterEach(() => {
  vi.restoreAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

describe('dataforseo client', () => {
  it('reports unconfigured when login or password is missing', async () => {
    mockResolveSecret.mockResolvedValue({
      source: 'unconfigured',
      value: null,
      envVarName: 'DATAFORSEO_API_PASSWORD',
      secretRefEnvVarName: 'DATAFORSEO_API_PASSWORD_SECRET_REF',
      secretRef: null
    })

    await expect(isDataForSeoConfigured()).resolves.toBe(false)
  })

  it('posts AI Mode task with Basic auth and redacts HTTP error bodies', async () => {
    process.env.DATAFORSEO_API_LOGIN = 'api@example.com'
    mockResolveSecret.mockResolvedValue({
      source: 'secret_manager',
      value: 'test-password',
      envVarName: 'DATAFORSEO_API_PASSWORD',
      secretRefEnvVarName: 'DATAFORSEO_API_PASSWORD_SECRET_REF',
      secretRef: 'greenhouse-dataforseo-api-password'
    })

    const fetchMock = vi.mocked(global.fetch)

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ cost: 0.0012, tasks: [{ id: 'task-1', result: [{ type: 'ai_mode' }] }] })
    } as Response)

    const result = await runDataForSeoGoogleAiModeSerp({ keyword: 'mejores agencias chile' })

    expect(result.ok).toBe(true)
    expect(result.endpoint).toBe(DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT)
    expect(result.cost).toBe(0.0012)
    expect(result.tasks).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.dataforseo.com/v3/serp/google/ai_mode/live/advanced',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('api@example.com:test-password').toString('base64')}`
        }),
        body: JSON.stringify([
          {
            keyword: 'mejores agencias chile',
            location_name: 'Chile',
            language_code: 'es',
            device: 'desktop'
          }
        ])
      })
    )
  })

  it('rejects non-SERP endpoints', async () => {
    process.env.DATAFORSEO_API_LOGIN = 'api@example.com'
    mockResolveSecret.mockResolvedValue({
      source: 'env',
      value: 'test-password',
      envVarName: 'DATAFORSEO_API_PASSWORD',
      secretRefEnvVarName: 'DATAFORSEO_API_PASSWORD_SECRET_REF',
      secretRef: null
    })

    await expect(
      postDataForSeoSerpLiveAdvanced({ endpoint: '/v3/business_data/google/reviews/live', tasks: [] })
    ).rejects.toThrow('Endpoint DataForSEO no permitido')
  })

  it('returns ok=false on provider HTTP errors without throwing', async () => {
    process.env.DATAFORSEO_API_LOGIN = 'api@example.com'
    mockResolveSecret.mockResolvedValue({
      source: 'secret_manager',
      value: 'test-password',
      envVarName: 'DATAFORSEO_API_PASSWORD',
      secretRefEnvVarName: 'DATAFORSEO_API_PASSWORD_SECRET_REF',
      secretRef: 'greenhouse-dataforseo-api-password'
    })

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'secret-ish provider body'
    } as Response)

    const result = await runDataForSeoGoogleAiModeSerp({ keyword: 'x' })

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        httpStatus: 401,
        tasks: [],
        cost: null,
        secretSource: 'secret_manager'
      })
    )
  })

  it('checks account connection without SERP tasks', async () => {
    process.env.DATAFORSEO_API_LOGIN = 'api@example.com'
    mockResolveSecret.mockResolvedValue({
      source: 'secret_manager',
      value: 'test-password',
      envVarName: 'DATAFORSEO_API_PASSWORD',
      secretRefEnvVarName: 'DATAFORSEO_API_PASSWORD_SECRET_REF',
      secretRef: 'greenhouse-dataforseo-api-password'
    })

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status_code: 20000 })
    } as Response)

    const result = await checkDataForSeoConnection()

    expect(result).toEqual(expect.objectContaining({ ok: true, httpStatus: 200, secretSource: 'secret_manager' }))
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.dataforseo.com/v3/appendix/user_data',
      expect.objectContaining({ method: 'GET' })
    )
  })
})

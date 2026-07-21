import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/growth/forms/store', () => ({
  listActivePublicFormOrigins: vi.fn(),
}))

vi.mock('@/lib/growth/ai-visibility/public-delivery/read-guard', () => ({
  checkPublicReadAllowed: vi.fn(),
}))

vi.mock('@/lib/growth/ai-visibility/public-delivery/status-reader', () => ({
  readPublicGraderRunStatus: vi.fn(),
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn(),
}))

import { resetPublicFormsCorsCacheForTests } from '@/app/api/public/growth/forms/cors'
import { checkPublicReadAllowed } from '@/lib/growth/ai-visibility/public-delivery/read-guard'
import { readPublicGraderRunStatus } from '@/lib/growth/ai-visibility/public-delivery/status-reader'
import { listActivePublicFormOrigins } from '@/lib/growth/forms/store'

const mockedOrigins = vi.mocked(listActivePublicFormOrigins)
const mockedReadAllowed = vi.mocked(checkPublicReadAllowed)
const mockedReadStatus = vi.mocked(readPublicGraderRunStatus)

const THINK_ORIGIN = 'https://think.efeoncepro.com'

const callGet = async (origin = THINK_ORIGIN) => {
  const { GET } = await import('../route')

  const request = new Request('https://greenhouse.efeoncepro.com/api/public/growth/ai-visibility/run/fsub-test', {
    headers: origin ? { origin, accept: 'application/json' } : { accept: 'application/json' },
  })

  return GET(request, { params: Promise.resolve({ handle: 'fsub-test' }) })
}

const callOptions = async (origin = THINK_ORIGIN) => {
  const { OPTIONS } = await import('../route')

  const request = new Request('https://greenhouse.efeoncepro.com/api/public/growth/ai-visibility/run/fsub-test', {
    method: 'OPTIONS',
    headers: origin
      ? {
          origin,
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'accept',
        }
      : {},
  })

  return OPTIONS(request)
}

beforeEach(() => {
  resetPublicFormsCorsCacheForTests()
  mockedOrigins.mockReset()
  mockedReadAllowed.mockReset()
  mockedReadStatus.mockReset()

  mockedOrigins.mockResolvedValue([THINK_ORIGIN, 'https://efeoncepro.com', 'https://www.efeoncepro.com'])
  mockedReadAllowed.mockResolvedValue(true)
  mockedReadStatus.mockResolvedValue({
    status: 'queued',
    reportToken: null,
    reason: 'El análisis está en cola.',
    retryAfterSeconds: 5,
  })
})

describe('GET /api/public/growth/ai-visibility/run/[handle] — browser status contract', () => {
  it('emite CORS gobernado para Think en el poll del tokenized_report', async () => {
    const res = await callGet()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(THINK_ORIGIN)
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(res.headers.get('Vary')).toBe('Origin')
    expect(body).toEqual({
      status: 'queued',
      reportToken: null,
      message: 'El análisis está en cola.',
      retryAfterSeconds: 5,
    })
  })

  it('preflight GET responde 204 con ACAO para origins gobernados', async () => {
    const res = await callOptions()

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(THINK_ORIGIN)
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('content-type, accept, idempotency-key')
  })

  it('fail-closed: origin desconocido no recibe ACAO aunque el DTO sea público', async () => {
    const res = await callGet('https://evil.example')

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('rate-limit conserva headers CORS para que el browser pueda leer la recuperación', async () => {
    mockedReadAllowed.mockResolvedValue(false)
    const res = await callGet()

    expect(res.status).toBe(429)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(THINK_ORIGIN)
    expect(await res.json()).toHaveProperty('error')
  })
})

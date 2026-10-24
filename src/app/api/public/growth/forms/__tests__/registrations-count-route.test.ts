/**
 * TASK-2053 Slice 3 — Ruta pública del conteo de reservas: forma de la respuesta, errores canónicos
 * (es-CL, sin prosa inglesa), CORS, caché y rate limit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  countAcceptedRegistrations: vi.fn(),
  isFormsPublicApiEnabled: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/growth/forms/readers', () => ({
  countAcceptedRegistrations: mocks.countAcceptedRegistrations,
  REGISTRATIONS_COUNT_CACHE_TTL_MS: 600_000
}))
vi.mock('@/lib/growth/forms/flags', () => ({ isFormsPublicApiEnabled: mocks.isFormsPublicApiEnabled }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.captureWithDomain }))
vi.mock('@/app/api/public/growth/forms/cors', () => ({
  publicFormsCorsHeaders: vi.fn(async (request: Request) =>
    request.headers.get('origin') === 'https://efeoncepro.com'
      ? { Vary: 'Origin', 'Access-Control-Allow-Origin': 'https://efeoncepro.com' }
      : { Vary: 'Origin' }
  ),
  publicFormsOptionsResponse: vi.fn()
}))

import { registrationsCountRateLimiter } from '@/lib/growth/forms/public-read-rate-limit'

import { GET } from '../[formSlug]/registrations-count/route'

const call = (formSlug: string, ip = '203.0.113.10') =>
  GET(
    new Request(`https://greenhouse.efeoncepro.com/api/public/growth/forms/${formSlug}/registrations-count`, {
      headers: { origin: 'https://efeoncepro.com', 'x-forwarded-for': ip }
    }),
    { params: Promise.resolve({ formSlug }) }
  )

beforeEach(() => {
  Object.values(mocks).forEach(fn => fn.mockReset())
  mocks.isFormsPublicApiEnabled.mockReturnValue(true)
  registrationsCountRateLimiter.reset()
})

describe('GET /api/public/growth/forms/[formSlug]/registrations-count', () => {
  it('responde el conteo redondeado con CORS y caché pública de 10 min', async () => {
    mocks.countAcceptedRegistrations.mockResolvedValue({ count: 310, display: '310', shown: true })

    const response = await call('webinar-aeo')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ count: 310, display: '310', shown: true })
    expect(response.headers.get('cache-control')).toBe('public, max-age=600')
    expect(response.headers.get('access-control-allow-origin')).toBe('https://efeoncepro.com')
  })

  it('bajo el umbral responde shown=false sin número', async () => {
    mocks.countAcceptedRegistrations.mockResolvedValue({ count: null, display: null, shown: false })

    const response = await call('webinar-aeo')

    await expect(response.json()).resolves.toEqual({ count: null, display: null, shown: false })
  })

  it('formulario inexistente → 404 canónico en español', async () => {
    mocks.countAcceptedRegistrations.mockResolvedValue(null)

    const response = await call('no-existe')
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toMatchObject({ code: 'growth_form_not_found', actionable: false })
    expect(body.error).toMatch(/formulario/)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://efeoncepro.com')
  })

  it('API pública apagada → 404 sin consultar', async () => {
    mocks.isFormsPublicApiEnabled.mockReturnValue(false)

    const response = await call('webinar-aeo')

    expect(response.status).toBe(404)
    expect(mocks.countAcceptedRegistrations).not.toHaveBeenCalled()
  })

  it('un formRef con caracteres fuera del slug/UUID no llega al reader', async () => {
    const response = await call('webinar aeo;drop')

    expect(response.status).toBe(404)
    expect(mocks.countAcceptedRegistrations).not.toHaveBeenCalled()
  })

  it('rate limit por IP → 429 canónico con Retry-After', async () => {
    mocks.countAcceptedRegistrations.mockResolvedValue({ count: 310, display: '310', shown: true })

    for (let i = 0; i < 30; i += 1) expect((await call('webinar-aeo', '198.51.100.9')).status).toBe(200)

    const limited = await call('webinar-aeo', '198.51.100.9')

    expect(limited.status).toBe(429)
    await expect(limited.json()).resolves.toMatchObject({ code: 'rate_limited', actionable: true })
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
    expect((await call('webinar-aeo', '198.51.100.10')).status).toBe(200)
  })

  it('un fallo del reader se captura y responde 500 canónico sin detalle técnico', async () => {
    mocks.countAcceptedRegistrations.mockRejectedValue(new Error('connection refused at 10.0.0.1'))

    const response = await call('webinar-aeo')
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.code).toBe('internal_error')
    expect(JSON.stringify(body)).not.toContain('10.0.0.1')
    expect(mocks.captureWithDomain).toHaveBeenCalledTimes(1)
  })
})

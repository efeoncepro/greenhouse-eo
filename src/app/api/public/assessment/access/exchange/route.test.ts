import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  allowIp: vi.fn(),
  RateLimitError: class extends Error {},
}))

vi.mock('@/lib/hiring/assessment/public-session/service', () => ({
  exchangePublicAssessmentAccess: mocks.exchange,
}))
vi.mock('@/lib/hiring/assessment/public-session/abuse-guard', () => ({
  claimPublicAssessmentIpCeiling: mocks.allowIp,
  PublicAssessmentRequestRateLimitError: mocks.RateLimitError,
}))

const { POST } = await import('./route')

const access = 'a'.repeat(43)

const request = (
  origin = 'https://greenhouse.local',
  body: unknown = { access },
  cookie?: string,
) => new Request(
  'https://greenhouse.local/api/public/assessment/access/exchange',
  {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  },
)

describe('POST /api/public/assessment/access/exchange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.exchange.mockResolvedValue({
      sessionToken: 's'.repeat(43),
      session: { expiresAt: '2026-08-20T10:00:00.000Z' },
    })
    mocks.allowIp.mockResolvedValue(true)
  })

  it('rechaza Origin ausente, distinto o con prefijo engañoso antes del exchange', async () => {
    const missing = new Request('https://greenhouse.local/api/public/assessment/access/exchange', {
      method: 'POST', body: JSON.stringify({ access }), headers: { 'content-type': 'application/json' },
    })

    expect((await POST(missing)).status).toBe(403)
    expect((await POST(request('https://greenhouse.local.evil.test'))).status).toBe(403)
    expect(mocks.exchange).not.toHaveBeenCalled()
  })

  it('emite exclusivamente la cookie __Host HttpOnly segura y no expone la sesión en JSON', async () => {
    const response = await POST(request())
    const payload = await response.json()
    const cookie = response.headers.get('set-cookie') ?? ''

    expect(payload).toEqual({ ok: true })
    expect(cookie).toContain('__Host-gh-assessment-session=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=lax')
    expect(cookie).toContain('Path=/')
    expect(cookie).not.toContain('Domain=')
    expect(cookie).not.toContain('Expires=')
    expect(cookie).not.toContain('Max-Age=')
    expect(JSON.stringify(payload)).not.toContain('ssss')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it('rechaza claves extra y credenciales rotadas con una respuesta genérica sin cookie', async () => {
    expect((await POST(request(undefined, { access, poisoned: 'x' }))).status).toBe(400)

    mocks.exchange.mockResolvedValue(null)

    const rotated = await POST(request(undefined, undefined, '__Host-gh-assessment-session=session-A'))
    const payload = await rotated.json()

    expect(rotated.status).toBe(404)
    expect(rotated.headers.get('set-cookie')).toBeNull()
    expect(payload).toEqual({ ok: false, code: 'assessment_unavailable', message: 'La evaluación no está disponible.' })
  })

  it('B válido reemplaza A con una cookie B sin exponer ninguna credencial en el body', async () => {
    mocks.exchange.mockResolvedValue({
      sessionToken: 'b'.repeat(43),
      session: { expiresAt: '2026-08-20T10:00:00.000Z' },
    })

    const response = await POST(request(undefined, undefined, '__Host-gh-assessment-session=session-A'))

    expect(response.headers.get('set-cookie')).toContain(`__Host-gh-assessment-session=${'b'.repeat(43)}`)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('corta un body chunked sobredimensionado aunque no declare Content-Length', async () => {
    const oversized = new Request('https://greenhouse.local/api/public/assessment/access/exchange', {
      method: 'POST',
      headers: { origin: 'https://greenhouse.local', 'content-type': 'application/json' },
      body: JSON.stringify({ access: 'x'.repeat(9_000) }),
    })

    const response = await POST(oversized)

    expect(response.status).toBe(400)
    expect(mocks.exchange).not.toHaveBeenCalled()
  })

  it('rate-limita antes de resolver el bearer y conserva respuesta genérica', async () => {
    mocks.allowIp.mockResolvedValue(false)

    const response = await POST(request())

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(mocks.exchange).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: 'assessment_unavailable',
      message: 'La evaluación no está disponible.',
    })
  })

  it('propaga rate-limit sólo después de que el service validó el credential', async () => {
    mocks.exchange.mockRejectedValue(new mocks.RateLimitError())

    const response = await POST(request())

    expect(response.status).toBe(429)
    expect(mocks.exchange).toHaveBeenCalledWith(access)
  })
})

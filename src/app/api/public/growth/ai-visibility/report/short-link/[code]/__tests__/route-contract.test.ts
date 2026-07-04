import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1330 Slice 2 — contrato del resolve público de short links (resolve-to-token).
 *
 * La ruta devuelve `{ status: 'active', reportToken }` para que `efeonce-think` `/s/[code].astro`
 * haga `Astro.rewrite` a la página del token (render-in-place, sin duplicar el render). Verifica en
 * el borde de red: 200 activo con token, 404 desconocido, 410 revocado/expirado, 429 rate-limit, y
 * que el body NO cargue el modelo/reporte (solo status + token; el render lo hace la página del token).
 */

const guard = { allowed: true }

const resolveState = {
  value: { status: 'active', reportToken: 'grt-tok', reportId: 'grpt-1' } as {
    status: string
    reportToken: string | null
    reportId: string | null
  }
}

const trackMock = vi.fn()

vi.mock('@/lib/growth/ai-visibility/public-delivery/read-guard', () => ({
  checkPublicReadAllowed: async () => guard.allowed
}))

vi.mock('@/lib/growth/ai-visibility/report/short-link', () => ({
  resolveAiVisibilityReportShortLink: async () => resolveState.value,
  trackAiVisibilityReportShortLinkUse: (...args: unknown[]) => trackMock(...args)
}))

const callGet = async (code = 'AbCd1234EfGh') => {
  const { GET } = await import('../route')
  const request = new Request(`http://localhost/api/public/growth/ai-visibility/report/short-link/${code}`)

  return GET(request, { params: Promise.resolve({ code }) })
}

beforeEach(() => {
  guard.allowed = true
  resolveState.value = { status: 'active', reportToken: 'grt-tok', reportId: 'grpt-1' }
  trackMock.mockReset()
})

describe('GET /report/short-link/[code] — resolve-to-token (TASK-1330)', () => {
  it('activo → 200 { status, reportToken } + track best-effort, sin modelo/reporte en el body', async () => {
    const res = await callGet('AbCd1234EfGh')

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body).toEqual({ status: 'active', reportToken: 'grt-tok' })
    expect(body).not.toHaveProperty('model')
    expect(body).not.toHaveProperty('report')
    expect(trackMock).toHaveBeenCalledWith('AbCd1234EfGh')
  })

  it('desconocido → 404 sin token', async () => {
    resolveState.value = { status: 'unknown', reportToken: null, reportId: null }
    const res = await callGet('ZZZZ9999ZZZZ')

    expect(res.status).toBe(404)
    expect(await res.json()).not.toHaveProperty('reportToken')
    expect(trackMock).not.toHaveBeenCalled()
  })

  it('revocado → 410 sin token', async () => {
    resolveState.value = { status: 'revoked', reportToken: null, reportId: 'grpt-1' }
    const res = await callGet()

    expect(res.status).toBe(410)
    expect(await res.json()).not.toHaveProperty('reportToken')
  })

  it('expirado (link o reporte) → 410', async () => {
    resolveState.value = { status: 'expired', reportToken: null, reportId: 'grpt-1' }
    const res = await callGet()

    expect(res.status).toBe(410)
  })

  it('rate-limit → 429 sin resolver', async () => {
    guard.allowed = false
    const res = await callGet()

    expect(res.status).toBe(429)
    expect(await res.json()).not.toHaveProperty('reportToken')
  })
})

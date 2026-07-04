import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAMPLE_PUBLIC_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'

/**
 * TASK-1330 Slice 2 — contrato del resolve público de short links.
 *
 * Verifica en el borde de red: 200 activo con render-in-place (mismo payload headless que el token,
 * `shareFacts.reportUrl` = URL CORTA), 404 desconocido, 410 revocado/expirado, 429 rate-limit, y
 * no-leak (nunca cruza `providerFindings`/`accuracyFindings`/narrativa cruda). El token largo se
 * resuelve server-to-server y NO aparece si no corresponde.
 */

const guard = { allowed: true }

const resolveState = {
  value: { status: 'active', reportToken: 'grt-tok', reportId: 'grpt-1' } as {
    status: string
    reportToken: string | null
    reportId: string | null
  }
}

const snapshotState = {
  value: {
    reportId: 'grpt-1',
    runId: 'run-1',
    reportToken: 'grt-tok',
    asOf: '2026-05-20T12:00:00.000Z',
    expiresAt: null as string | null,
    publicReport: SAMPLE_PUBLIC_REPORT,
    brandName: 'Globe',
    runPublicId: 'EO-GRUN-00042'
  } as unknown | null
}

const trackMock = vi.fn()

vi.mock('@/lib/growth/ai-visibility/public-delivery/read-guard', () => ({
  checkPublicReadAllowed: async () => guard.allowed
}))

vi.mock('@/lib/growth/ai-visibility/report/short-link', () => ({
  resolveAiVisibilityReportShortLink: async () => resolveState.value,
  trackAiVisibilityReportShortLinkUse: (...args: unknown[]) => trackMock(...args)
}))

vi.mock('@/lib/growth/ai-visibility/report/snapshot', () => ({
  readPublicGraderReport: async () => snapshotState.value
}))

const callGet = async (code = 'AbCd1234EfGh') => {
  const { GET } = await import('../route')
  const request = new Request(`http://localhost/api/public/growth/ai-visibility/report/short-link/${code}`)

  return GET(request, { params: Promise.resolve({ code }) })
}

beforeEach(() => {
  guard.allowed = true
  resolveState.value = { status: 'active', reportToken: 'grt-tok', reportId: 'grpt-1' }
  snapshotState.value = {
    reportId: 'grpt-1',
    runId: 'run-1',
    reportToken: 'grt-tok',
    asOf: '2026-05-20T12:00:00.000Z',
    expiresAt: null,
    publicReport: SAMPLE_PUBLIC_REPORT,
    brandName: 'Globe',
    runPublicId: 'EO-GRUN-00042'
  }
  trackMock.mockReset()
})

describe('GET /report/short-link/[code] — resolve público (TASK-1330)', () => {
  it('activo → 200 render-in-place con shareFacts.reportUrl CORTO y track best-effort', async () => {
    const res = await callGet('AbCd1234EfGh')

    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.model.variant).toBe('publicWeb')
    expect(body.model.viewFacts.shareFacts.reportUrl).toBe('https://think.efeoncepro.com/s/AbCd1234EfGh')
    expect(body.header.organizationName).toBe('Globe')
    expect(trackMock).toHaveBeenCalledWith('AbCd1234EfGh')
  })

  it('activo → nunca filtra internos (no-leak por construcción de tipo)', async () => {
    const res = await callGet()
    const serialized = JSON.stringify(await res.json())

    expect(serialized).not.toContain('providerFindings')
    expect(serialized).not.toContain('accuracyFindings')
    expect(serialized).not.toContain('INTERNAL')
  })

  it('desconocido → 404', async () => {
    resolveState.value = { status: 'unknown', reportToken: null, reportId: null }
    const res = await callGet('ZZZZ9999ZZZZ')

    expect(res.status).toBe(404)
  })

  it('revocado → 410', async () => {
    resolveState.value = { status: 'revoked', reportToken: null, reportId: 'grpt-1' }
    const res = await callGet()

    expect(res.status).toBe(410)
  })

  it('expirado (link o reporte) → 410', async () => {
    resolveState.value = { status: 'expired', reportToken: null, reportId: 'grpt-1' }
    const res = await callGet()

    expect(res.status).toBe(410)
  })

  it('activo pero snapshot ausente → 410 (link muerto)', async () => {
    snapshotState.value = null
    const res = await callGet()

    expect(res.status).toBe(410)
    expect(trackMock).not.toHaveBeenCalled()
  })

  it('rate-limit → 429 sin filtrar el modelo', async () => {
    guard.allowed = false
    const res = await callGet()

    expect(res.status).toBe(429)
    expect(await res.json()).not.toHaveProperty('model')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
const captureMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

import {
  ensureAiVisibilityReportShortLink,
  resolveAiVisibilityReportShortLink,
  resolvePreferredReportUrl,
  revokeAiVisibilityReportShortLink,
  trackAiVisibilityReportShortLinkUse
} from '@/lib/growth/ai-visibility/report/short-link'

const linkRow = (over: Record<string, unknown> = {}) => ({
  short_code: 'AbCd1234EfGh',
  report_id: 'grpt-1',
  created_at: '2026-07-04T00:00:00.000Z',
  created_by_source: 'system',
  expires_at: null,
  revoked_at: null,
  revoked_reason: null,
  last_used_at: null,
  use_count: 0,
  ...over
})

const pkConflict = { code: '23505', constraint: 'grader_report_short_links_pkey' }
const activeConflict = { code: '23505', constraint: 'grader_report_short_links_active_idx' }

const past = new Date(Date.now() - 60_000).toISOString()
const future = new Date(Date.now() + 60_000).toISOString()

beforeEach(() => {
  queryMock.mockReset()
  captureMock.mockReset()
})

describe('ensureAiVisibilityReportShortLink', () => {
  it('es idempotente: devuelve el link activo existente sin insertar', async () => {
    queryMock.mockResolvedValueOnce([linkRow()])

    const link = await ensureAiVisibilityReportShortLink({ reportId: 'grpt-1' })

    expect(link.shortCode).toBe('AbCd1234EfGh')
    expect(queryMock).toHaveBeenCalledTimes(1) // solo el SELECT activo
  })

  it('crea uno nuevo cuando no hay activo', async () => {
    queryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([linkRow({ short_code: 'NewCode12345' })])

    const link = await ensureAiVisibilityReportShortLink({ reportId: 'grpt-1' })

    expect(link.shortCode).toBe('NewCode12345')
    expect(queryMock).toHaveBeenCalledTimes(2) // SELECT + INSERT
  })

  it('reintenta ante colisión de código (PK) y luego crea', async () => {
    queryMock
      .mockResolvedValueOnce([]) // SELECT activo
      .mockRejectedValueOnce(pkConflict) // INSERT colisiona el código
      .mockResolvedValueOnce([linkRow({ short_code: 'FreshCode678' })]) // INSERT con código nuevo

    const link = await ensureAiVisibilityReportShortLink({ reportId: 'grpt-1' })

    expect(link.shortCode).toBe('FreshCode678')
    expect(queryMock).toHaveBeenCalledTimes(3)
  })

  it('ante carrera de link-activo (índice parcial) re-selecciona el activo, no reintenta código', async () => {
    queryMock
      .mockResolvedValueOnce([]) // SELECT activo inicial (vacío)
      .mockRejectedValueOnce(activeConflict) // INSERT choca el índice UNIQUE parcial (otro writer ganó)
      .mockResolvedValueOnce([linkRow({ short_code: 'RacedWinner9' })]) // re-SELECT del activo

    const link = await ensureAiVisibilityReportShortLink({ reportId: 'grpt-1' })

    expect(link.shortCode).toBe('RacedWinner9')
    expect(queryMock).toHaveBeenCalledTimes(3)
  })
})

describe('resolveAiVisibilityReportShortLink', () => {
  it('código malformado → unknown sin tocar la DB', async () => {
    const result = await resolveAiVisibilityReportShortLink('short')

    expect(result.status).toBe('unknown')
    expect(result.reportToken).toBeNull()
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('código inexistente → unknown', async () => {
    queryMock.mockResolvedValueOnce([])

    const result = await resolveAiVisibilityReportShortLink('ValidCode123')

    expect(result.status).toBe('unknown')
  })

  it('activo → devuelve el token del reporte', async () => {
    queryMock.mockResolvedValueOnce([
      { report_id: 'grpt-1', link_expires_at: future, revoked_at: null, report_token: 'grt-tok', report_expires_at: future }
    ])

    const result = await resolveAiVisibilityReportShortLink('ValidCode123')

    expect(result.status).toBe('active')
    expect(result.reportToken).toBe('grt-tok')
    expect(result.reportId).toBe('grpt-1')
  })

  it('revocado → revoked, sin token', async () => {
    queryMock.mockResolvedValueOnce([
      { report_id: 'grpt-1', link_expires_at: null, revoked_at: past, report_token: 'grt-tok', report_expires_at: null }
    ])

    const result = await resolveAiVisibilityReportShortLink('ValidCode123')

    expect(result.status).toBe('revoked')
    expect(result.reportToken).toBeNull()
  })

  it('short link expirado → expired', async () => {
    queryMock.mockResolvedValueOnce([
      { report_id: 'grpt-1', link_expires_at: past, revoked_at: null, report_token: 'grt-tok', report_expires_at: null }
    ])

    const result = await resolveAiVisibilityReportShortLink('ValidCode123')

    expect(result.status).toBe('expired')
    expect(result.reportToken).toBeNull()
  })

  it('honra el expiry del REPORTE subyacente aunque el código siga activo → expired', async () => {
    queryMock.mockResolvedValueOnce([
      { report_id: 'grpt-1', link_expires_at: future, revoked_at: null, report_token: 'grt-tok', report_expires_at: past }
    ])

    const result = await resolveAiVisibilityReportShortLink('ValidCode123')

    expect(result.status).toBe('expired')
    expect(result.reportToken).toBeNull()
  })
})

describe('revokeAiVisibilityReportShortLink', () => {
  it('soft-revoke devuelve la fila revocada', async () => {
    queryMock.mockResolvedValueOnce([linkRow({ revoked_at: past, revoked_reason: 'manual' })])

    const link = await revokeAiVisibilityReportShortLink({ shortCode: 'AbCd1234EfGh', reason: 'manual' })

    expect(link?.revokedAt).toBe(past)
    expect(link?.revokedReason).toBe('manual')
  })

  it('código inexistente → null', async () => {
    queryMock.mockResolvedValueOnce([])

    const link = await revokeAiVisibilityReportShortLink({ shortCode: 'AbCd1234EfGh' })

    expect(link).toBeNull()
  })
})

describe('trackAiVisibilityReportShortLinkUse', () => {
  it('éxito: no lanza ni captura', async () => {
    queryMock.mockResolvedValueOnce([])

    await expect(trackAiVisibilityReportShortLinkUse('AbCd1234EfGh')).resolves.toBeUndefined()
    expect(captureMock).not.toHaveBeenCalled()
  })

  it('best-effort: un fallo NO se propaga, se observa', async () => {
    queryMock.mockRejectedValueOnce(new Error('db down'))

    await expect(trackAiVisibilityReportShortLinkUse('AbCd1234EfGh')).resolves.toBeUndefined()
    expect(captureMock).toHaveBeenCalledTimes(1)
  })
})

describe('resolvePreferredReportUrl (flag-gated)', () => {
  const FLAG = 'GROWTH_AI_VISIBILITY_SHORT_LINKS_ENABLED'

  afterEach(() => {
    delete process.env[FLAG]
  })

  it('flag OFF → URL larga sin tocar la DB', async () => {
    delete process.env[FLAG]

    const url = await resolvePreferredReportUrl({ reportId: 'grpt-1', reportToken: 'grt-tok' })

    expect(url).toBe('https://think.efeoncepro.com/brand-visibility/r/grt-tok')
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('flag ON + link activo → URL corta', async () => {
    process.env[FLAG] = 'true'
    queryMock.mockResolvedValueOnce([linkRow({ short_code: 'AbCd1234EfGh' })])

    const url = await resolvePreferredReportUrl({ reportId: 'grpt-1', reportToken: 'grt-tok' })

    expect(url).toBe('https://think.efeoncepro.com/s/AbCd1234EfGh')
  })

  it('flag ON + sin link activo → fallback a URL larga', async () => {
    process.env[FLAG] = 'true'
    queryMock.mockResolvedValueOnce([])

    const url = await resolvePreferredReportUrl({ reportId: 'grpt-1', reportToken: 'grt-tok' })

    expect(url).toBe('https://think.efeoncepro.com/brand-visibility/r/grt-tok')
  })
})

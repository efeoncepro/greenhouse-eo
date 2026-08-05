import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1302 Slice 3 — runGscDailySnapshotBatch + resolveDefaultCaptureDate.
 *
 * El invariante caro del batch es la resiliencia per-org: la serie GSC no se puede
 * reconstruir pasada la ventana de 16 meses, así que un token revocado de un cliente
 * NUNCA puede impedir que se capture la de los demás.
 */

vi.mock('server-only', () => ({}))

const state = {
  orgs: [] as Array<{ organizationId: string; siteUrl: string }>,
  results: new Map<string, unknown>(),
  throwFor: new Set<string>()
}

vi.mock('@/lib/growth/search-console', () => ({
  listActiveSearchConsoleOrganizations: async () => state.orgs
}))

vi.mock('../gsc-daily-materializer', () => ({
  materializeGscDailySnapshot: async (organizationId: string, captureDate: string) => {
    if (state.throwFor.has(organizationId)) throw new Error('boom')

    return (
      state.results.get(organizationId) ?? {
        ok: true,
        organizationId,
        siteUrl: 'sc-domain:x.com',
        captureDate,
        rowsWritten: 1,
        pagesFetched: 1,
        truncated: false
      }
    )
  }
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: () => undefined }))

import { resolveDefaultCaptureWindow, runGscDailySnapshotBatch } from '../gsc-daily-batch'

beforeEach(() => {
  state.orgs = []
  state.results = new Map()
  state.throwFor = new Set()
})

describe('resolveDefaultCaptureWindow', () => {
  it('cubre una VENTANA, no sólo ayer — GSC no publica D-1', () => {
    // Medido en vivo 2026-08-05: D-1 responde ok con 0 filas y recién D-2 trae datos.
    // Apuntar sólo a "ayer" escribiría un día vacío cada corrida y nunca volvería por él.
    const window = resolveDefaultCaptureWindow(5, new Date('2026-08-05T15:00:00Z'))

    expect(window).toEqual(['2026-08-04', '2026-08-03', '2026-08-02', '2026-08-01', '2026-07-31'])
  })

  it('cruza el borde de mes sin producir un día inválido', () => {
    expect(resolveDefaultCaptureWindow(3, new Date('2026-08-01T15:00:00Z'))).toEqual([
      '2026-07-31',
      '2026-07-30',
      '2026-07-29'
    ])
  })

  it('resuelve el día en Santiago, no en UTC', () => {
    // 2026-08-05T02:00Z todavía es 04-ago en Santiago (UTC-4) ⇒ la ventana arranca en el 03.
    expect(resolveDefaultCaptureWindow(1, new Date('2026-08-05T02:00:00Z'))).toEqual(['2026-08-03'])
  })

  it('nunca devuelve una ventana vacía', () => {
    expect(resolveDefaultCaptureWindow(0, new Date('2026-08-05T15:00:00Z'))).toHaveLength(1)
  })
})

describe('runGscDailySnapshotBatch — resiliencia per-org', () => {
  it('una org degradada no impide capturar las demás', async () => {
    state.orgs = [
      { organizationId: 'org-a', siteUrl: 'sc-domain:a.com' },
      { organizationId: 'org-b', siteUrl: 'sc-domain:b.com' },
      { organizationId: 'org-c', siteUrl: 'sc-domain:c.com' }
    ]
    state.results.set('org-b', { ok: false, errorCode: 'token_unhealthy', status: 'revoked' })

    const result = await runGscDailySnapshotBatch({ captureDate: '2026-08-04' })

    expect(result.orgs).toBe(3)
    expect(result.materialized).toBe(2)
    expect(result.degraded).toBe(1)
    expect(result.outcomes.find(o => o.organizationId === 'org-b')?.errorCode).toBe('token_unhealthy')
  })

  it('una org que lanza excepción no aborta el batch', async () => {
    state.orgs = [
      { organizationId: 'org-a', siteUrl: 'sc-domain:a.com' },
      { organizationId: 'org-b', siteUrl: 'sc-domain:b.com' }
    ]
    state.throwFor.add('org-a')

    const result = await runGscDailySnapshotBatch({ captureDate: '2026-08-04' })

    expect(result.failed).toBe(1)
    expect(result.materialized).toBe(1)
    expect(result.outcomes.find(o => o.organizationId === 'org-a')?.status).toBe('failed')
  })

  it('cuenta las orgs truncadas para que el caller pueda gritar', async () => {
    state.orgs = [{ organizationId: 'org-a', siteUrl: 'sc-domain:a.com' }]
    state.results.set('org-a', {
      ok: true,
      organizationId: 'org-a',
      siteUrl: 'sc-domain:a.com',
      captureDate: '2026-08-04',
      rowsWritten: 500_000,
      pagesFetched: 20,
      truncated: true
    })

    const result = await runGscDailySnapshotBatch({ captureDate: '2026-08-04' })

    expect(result.truncatedOrgs).toBe(1)
    expect(result.rowsWritten).toBe(500_000)
  })

  it('sin orgs conectadas devuelve un batch vacío, no un error', async () => {
    const result = await runGscDailySnapshotBatch({ captureDate: '2026-08-04' })

    expect(result.orgs).toBe(0)
    expect(result.materialized).toBe(0)
    expect(result.outcomes).toEqual([])
  })

  it('materializa cada día de la ventana por org, no sólo uno', async () => {
    state.orgs = [{ organizationId: 'org-a', siteUrl: 'sc-domain:a.com' }]

    const result = await runGscDailySnapshotBatch({ lookbackDays: 3 })

    expect(result.captureDates).toHaveLength(3)
    // 1 org × 3 días = 3 capturas. Sin esto, el lag de publicación de GSC dejaría la
    // serie vacía de forma permanente.
    expect(result.outcomes).toHaveLength(3)
    expect(new Set(result.outcomes.map(outcome => outcome.captureDate)).size).toBe(3)
  })

  it('un captureDate explícito fuerza un solo día (re-materialización puntual)', async () => {
    state.orgs = [{ organizationId: 'org-a', siteUrl: 'sc-domain:a.com' }]

    const result = await runGscDailySnapshotBatch({ captureDate: '2026-07-15' })

    expect(result.captureDates).toEqual(['2026-07-15'])
    expect(result.outcomes).toHaveLength(1)
  })

  it('respeta maxOrgs para poder acotar un run manual', async () => {
    state.orgs = [
      { organizationId: 'org-a', siteUrl: 'sc-domain:a.com' },
      { organizationId: 'org-b', siteUrl: 'sc-domain:b.com' }
    ]

    const result = await runGscDailySnapshotBatch({ captureDate: '2026-08-04', maxOrgs: 1 })

    expect(result.orgs).toBe(1)
  })
})

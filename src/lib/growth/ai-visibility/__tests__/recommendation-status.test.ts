import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1275 — Command/reader del estado de ejecución del Plan AEO.
 *
 * Cubre: gate self-guard (org arbitraria), validación de gap key + status + reason obligatorio,
 * idempotencia no-op real (sin history/outbox), transición real (UPSERT + history + outbox atómicos),
 * y el reader gate-agnostic con degradación honesta.
 */

vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(),
  withGreenhousePostgresTransaction: vi.fn()
}))

import { can } from '@/lib/entitlements/runtime'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import {
  RecommendationStatusError,
  readRecommendationStatuses,
  setRecommendationStatus
} from '../recommendation-status'

const ORG = 'org-aerolinea-a'
const KEY = 'low_entity_clarity'
const subject = { roleCodes: ['efeonce_account'], routeGroups: ['internal'], authorizedViews: [] } as never

const fakeClient = { query: vi.fn() }
const base = { subject, organizationId: ORG, recommendationKey: KEY, updatedBy: 'user-op-1' }

beforeEach(() => {
  vi.clearAllMocks()
  fakeClient.query.mockReset()
  vi.mocked(withGreenhousePostgresTransaction).mockImplementation(async (cb: never) =>
    (cb as (c: typeof fakeClient) => unknown)(fakeClient)
  )
})

describe('setRecommendationStatus — gate + validación', () => {
  it('forbidden sin la capability (y NO abre transacción)', async () => {
    vi.mocked(can).mockReturnValue(false)
    await expect(setRecommendationStatus({ ...base, status: 'in_progress' })).rejects.toMatchObject({
      code: 'forbidden'
    })
    expect(can).toHaveBeenCalledWith(subject, 'growth.ai_visibility.recommendation.set_status', 'execute', 'tenant')
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('invalid_recommendation_key cuando la key no está en RECOMMENDATION_GAP_KEYS', async () => {
    vi.mocked(can).mockReturnValue(true)
    await expect(
      setRecommendationStatus({ ...base, recommendationKey: 'garbage_key', status: 'done' })
    ).rejects.toMatchObject({ code: 'invalid_recommendation_key' })
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('invalid_status para un estado fuera del enum', async () => {
    vi.mocked(can).mockReturnValue(true)
    await expect(setRecommendationStatus({ ...base, status: 'wat' })).rejects.toMatchObject({
      code: 'invalid_status'
    })
  })

  it('reason_required en blocked/dismissed sin motivo', async () => {
    vi.mocked(can).mockReturnValue(true)
    await expect(setRecommendationStatus({ ...base, status: 'blocked' })).rejects.toMatchObject({
      code: 'reason_required'
    })
    await expect(setRecommendationStatus({ ...base, status: 'dismissed', reason: '  ' })).rejects.toMatchObject({
      code: 'reason_required'
    })
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('RecommendationStatusError es la clase de error del dominio', async () => {
    vi.mocked(can).mockReturnValue(false)
    await expect(setRecommendationStatus({ ...base, status: 'done' })).rejects.toBeInstanceOf(
      RecommendationStatusError
    )
  })
})

describe('setRecommendationStatus — transacción', () => {
  it('no-op real: mismo status+reason → sin history ni outbox', async () => {
    vi.mocked(can).mockReturnValue(true)
    fakeClient.query.mockResolvedValueOnce({
      rows: [{ recommendation_key: KEY, status: 'done', source_run_id: null, reason: null, updated_by: 'x', updated_at: 't' }]
    })

    const result = await setRecommendationStatus({ ...base, status: 'done' })

    expect(result.changed).toBe(false)
    expect(fakeClient.query).toHaveBeenCalledTimes(1) // solo el SELECT FOR UPDATE
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('transición real: UPSERT current + INSERT history + outbox (en la misma tx)', async () => {
    vi.mocked(can).mockReturnValue(true)
    fakeClient.query
      .mockResolvedValueOnce({ rows: [{ recommendation_key: KEY, status: 'in_progress', source_run_id: null, reason: null, updated_by: 'x', updated_at: 't0' }] }) // SELECT
      .mockResolvedValueOnce({ rows: [{ recommendation_key: KEY, status: 'done', source_run_id: 'grun-9', reason: null, updated_by: 'user-op-1', updated_at: 't1' }] }) // UPSERT RETURNING
      .mockResolvedValueOnce({ rows: [] }) // history INSERT

    const result = await setRecommendationStatus({ ...base, status: 'done', sourceRunId: 'grun-9' })

    expect(result.changed).toBe(true)
    expect(result.status.status).toBe('done')
    expect(result.status.sourceRunId).toBe('grun-9')
    expect(fakeClient.query).toHaveBeenCalledTimes(3)
    expect(publishOutboxEvent).toHaveBeenCalledTimes(1)
    const [event, passedClient] = vi.mocked(publishOutboxEvent).mock.calls[0]

    expect(event.eventType).toBe('growth.ai_visibility.recommendation_status_changed')
    expect(event.payload).toMatchObject({ fromStatus: 'in_progress', toStatus: 'done', sourceRunId: 'grun-9', organizationId: ORG })
    expect(passedClient).toBe(fakeClient) // outbox transaccional
  })

  it('primer set (sin current): fromStatus null + history + outbox', async () => {
    vi.mocked(can).mockReturnValue(true)
    fakeClient.query
      .mockResolvedValueOnce({ rows: [] }) // SELECT (no existe)
      .mockResolvedValueOnce({ rows: [{ recommendation_key: KEY, status: 'in_progress', source_run_id: null, reason: null, updated_by: 'user-op-1', updated_at: 't1' }] })
      .mockResolvedValueOnce({ rows: [] })

    const result = await setRecommendationStatus({ ...base, status: 'in_progress' })

    expect(result.changed).toBe(true)
    expect(vi.mocked(publishOutboxEvent).mock.calls[0][0].payload).toMatchObject({ fromStatus: null, toStatus: 'in_progress' })
  })
})

describe('readRecommendationStatuses — gate-agnostic + degradación honesta', () => {
  it('proyecta las filas de la org', async () => {
    vi.mocked(runGreenhousePostgresQuery).mockResolvedValue([
      { recommendation_key: KEY, status: 'blocked', source_run_id: 'grun-1', reason: 'falta aprobación', updated_by: 'u', updated_at: 't' }
    ] as never)

    const rows = await readRecommendationStatuses(ORG)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ recommendationKey: KEY, status: 'blocked', sourceRunId: 'grun-1', reason: 'falta aprobación' })
  })

  it('org sin filas → [] (sin seguimiento aún)', async () => {
    vi.mocked(runGreenhousePostgresQuery).mockResolvedValue([] as never)
    expect(await readRecommendationStatuses(ORG)).toEqual([])
  })
})

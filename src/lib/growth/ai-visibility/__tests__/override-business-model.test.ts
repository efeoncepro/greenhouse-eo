import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1289 Slice 3 — Command de override del business_model (gobernado + auditado).
 *
 * Cubre: gate self-guard (profile arbitrario), validación del enum cerrado, profile_not_found,
 * idempotencia no-op real (mismo valor ya como override → sin history/outbox), override real
 * (UPDATE current + INSERT history append-only + outbox atómicos) y el reader del historial.
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
  OverrideBusinessModelError,
  overrideProfileBusinessModel,
  readBusinessModelHistory
} from '../override-business-model'

const PROFILE = 'gp-sky'
const subject = { roleCodes: ['efeonce_account'], routeGroups: ['internal'], authorizedViews: [] } as never

const fakeClient = { query: vi.fn() }
const base = { subject, profileId: PROFILE, updatedBy: 'user-op-1' }

beforeEach(() => {
  vi.clearAllMocks()
  fakeClient.query.mockReset()
  vi.mocked(withGreenhousePostgresTransaction).mockImplementation(
    (async (cb: (c: typeof fakeClient) => unknown) => cb(fakeClient)) as never
  )
})

describe('overrideProfileBusinessModel — gate + validación', () => {
  it('forbidden sin la capability (y NO abre transacción)', async () => {
    vi.mocked(can).mockReturnValue(false)
    await expect(
      overrideProfileBusinessModel({ ...base, businessModel: 'consumer_b2c' })
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(can).toHaveBeenCalledWith(subject, 'growth.ai_visibility.profile.set_business_model', 'execute', 'tenant')
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('invalid_business_model fuera del enum cerrado', async () => {
    vi.mocked(can).mockReturnValue(true)
    await expect(
      overrideProfileBusinessModel({ ...base, businessModel: 'agency_lol' })
    ).rejects.toMatchObject({ code: 'invalid_business_model' })
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('OverrideBusinessModelError es la clase de error del dominio', async () => {
    vi.mocked(can).mockReturnValue(false)
    await expect(
      overrideProfileBusinessModel({ ...base, businessModel: 'consumer_b2c' })
    ).rejects.toBeInstanceOf(OverrideBusinessModelError)
  })

  it('profile_not_found cuando el profileId no existe', async () => {
    vi.mocked(can).mockReturnValue(true)
    fakeClient.query.mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE
    await expect(
      overrideProfileBusinessModel({ ...base, businessModel: 'consumer_b2c' })
    ).rejects.toMatchObject({ code: 'profile_not_found' })
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })
})

describe('overrideProfileBusinessModel — transacción', () => {
  it('no-op real: mismo valor ya como override → sin history ni outbox', async () => {
    vi.mocked(can).mockReturnValue(true)
    fakeClient.query.mockResolvedValueOnce({
      rows: [{ profile_id: PROFILE, organization_id: 'org-1', business_model: 'consumer_b2c', business_model_source: 'operator_override' }]
    })

    const result = await overrideProfileBusinessModel({ ...base, businessModel: 'consumer_b2c' })

    expect(result.changed).toBe(false)
    expect(fakeClient.query).toHaveBeenCalledTimes(1) // solo el SELECT FOR UPDATE
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('override real: corrige un derivado (UPDATE + history + outbox en la misma tx)', async () => {
    vi.mocked(can).mockReturnValue(true)
    fakeClient.query
      .mockResolvedValueOnce({ rows: [{ profile_id: PROFILE, organization_id: 'org-1', business_model: 'unknown', business_model_source: 'category_heuristic' }] }) // SELECT
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }) // history INSERT

    const result = await overrideProfileBusinessModel({
      ...base,
      businessModel: 'consumer_b2c',
      reason: 'es una aerolínea, no una agencia'
    })

    expect(result.changed).toBe(true)
    expect(result.businessModel).toBe('consumer_b2c')
    expect(result.source).toBe('operator_override')
    expect(fakeClient.query).toHaveBeenCalledTimes(3)
    expect(publishOutboxEvent).toHaveBeenCalledTimes(1)

    const [event, passedClient] = vi.mocked(publishOutboxEvent).mock.calls[0]

    expect(event.eventType).toBe('growth.ai_visibility.business_model_overridden')
    expect(event.payload).toMatchObject({
      fromBusinessModel: 'unknown',
      toBusinessModel: 'consumer_b2c',
      organizationId: 'org-1',
      reason: 'es una aerolínea, no una agencia'
    })
    expect(passedClient).toBe(fakeClient) // outbox transaccional
  })

  it('override desde un derivado distinto vuelve a appendear history aunque el valor coincida (no era override)', async () => {
    vi.mocked(can).mockReturnValue(true)
    // current=consumer_b2c pero source=brand_intelligence (no operator_override) → NO es no-op.
    fakeClient.query
      .mockResolvedValueOnce({ rows: [{ profile_id: PROFILE, organization_id: 'org-1', business_model: 'consumer_b2c', business_model_source: 'brand_intelligence' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const result = await overrideProfileBusinessModel({ ...base, businessModel: 'consumer_b2c' })

    expect(result.changed).toBe(true)
    expect(publishOutboxEvent).toHaveBeenCalledTimes(1)
  })
})

describe('readBusinessModelHistory', () => {
  it('proyecta el historial ordenado de un perfil', async () => {
    vi.mocked(runGreenhousePostgresQuery).mockResolvedValue([
      { from_business_model: 'unknown', to_business_model: 'consumer_b2c', to_source: 'operator_override', confidence: '1.00', reason: 'aerolínea', changed_by: 'u', changed_at: 't' }
    ] as never)

    const rows = await readBusinessModelHistory(PROFILE)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      fromBusinessModel: 'unknown',
      toBusinessModel: 'consumer_b2c',
      toSource: 'operator_override',
      confidence: 1,
      reason: 'aerolínea'
    })
  })

  it('perfil sin historial → []', async () => {
    vi.mocked(runGreenhousePostgresQuery).mockResolvedValue([] as never)
    expect(await readBusinessModelHistory(PROFILE)).toEqual([])
  })
})

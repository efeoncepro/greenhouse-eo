import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  calculateFtr: vi.fn(),
  publishOutboxEvent: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

vi.mock('@/lib/notion-metrics/calculate-ftr', () => ({
  calculateFtr: mocks.calculateFtr
}))

vi.mock('../publish-event', () => ({
  publishOutboxEvent: mocks.publishOutboxEvent
}))

import { notionFtrComputeProjection, isProductiveFtrComputePayload } from './notion-ftr-compute'

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.calculateFtr.mockReset()
  mocks.publishOutboxEvent.mockReset()
})

const validPayload = {
  schemaVersion: 1,
  taskSourceId: 'task-uuid-1',
  workspaceId: 'efeonce',
  fromStatus: 'Listo para revisión',
  toStatus: 'Cambios solicitados',
  transitionedAt: '2026-05-21T10:00:00Z',
  transitionedBy: 'user-1',
  sourceEventId: 'evt-1'
}

// FtrResult mock builder (espejo del contrato de calculate-ftr.ts).
const ftrResult = (
  value: 'pass' | 'fail' | 'not_applicable' | null,
  dataStatus: 'valid' | 'unavailable' | 'low_confidence' = 'valid',
  sourceMode: 'canonical' | 'unavailable' = 'canonical',
  rpaValue: number | null = value === 'pass' ? 0 : value === 'fail' ? 2 : null
) => ({
  value,
  dataStatus,
  sourceMode,
  rpaSnapshot: {
    value: rpaValue,
    dataStatus: dataStatus === 'low_confidence' ? 'low_confidence' : value === null ? 'unavailable' : 'valid',
    sourceMode,
    inputsUsed: { taskSourceId: 'task-uuid-1', correctionTransitionsCount: rpaValue ?? 0 },
    formulaVersion: 'rpa_v2.0'
  },
  formulaVersion: 'ftr_v1.0'
})

describe('TASK-903 Slice 1 — notion-ftr-compute productive', () => {
  describe('isProductiveFtrComputePayload predicate (defense in depth dual filter)', () => {
    it('returns true para workspaceId efeonce/sky sin demo_mode', () => {
      expect(isProductiveFtrComputePayload(validPayload)).toBe(true)
      expect(isProductiveFtrComputePayload({ ...validPayload, workspaceId: 'sky' })).toBe(true)
    })

    it('returns false cuando demo_mode === true', () => {
      expect(
        isProductiveFtrComputePayload({ ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } })
      ).toBe(false)
    })

    it('returns false para workspace no productivo', () => {
      expect(isProductiveFtrComputePayload({ ...validPayload, workspaceId: 'other' })).toBe(false)
      expect(isProductiveFtrComputePayload({ ...validPayload, workspaceId: 'demo' })).toBe(false)
    })

    it('returns false para null/undefined/non-object', () => {
      expect(isProductiveFtrComputePayload(null)).toBe(false)
      expect(isProductiveFtrComputePayload(undefined)).toBe(false)
      expect(isProductiveFtrComputePayload('string')).toBe(false)
    })
  })

  describe('extractScope', () => {
    it('extrae scope productivo válido', () => {
      expect(notionFtrComputeProjection.extractScope(validPayload)).toEqual({
        entityType: 'notion_task',
        entityId: 'task-uuid-1'
      })
    })

    it('retorna null para demo / sin taskSourceId / workspace no prod', () => {
      expect(
        notionFtrComputeProjection.extractScope({ ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } })
      ).toBeNull()
      expect(notionFtrComputeProjection.extractScope({ ...validPayload, taskSourceId: '' })).toBeNull()
      expect(notionFtrComputeProjection.extractScope({ ...validPayload, workspaceId: 'other' })).toBeNull()
    })
  })

  describe('refresh (compute + persist + chain event)', () => {
    it('emite chain event ftr_writeback_requested cuando FTR pass válido + persist exitoso', async () => {
      mocks.calculateFtr.mockResolvedValueOnce(ftrResult('pass'))
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-1' }])
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-uuid-1')

      const result = await notionFtrComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validPayload
      )

      expect(mocks.calculateFtr).toHaveBeenCalledWith({ taskSourceId: 'task-uuid-1' })
      expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'notion.task.ftr_writeback_requested',
          aggregateType: 'notion_task',
          aggregateId: 'task-uuid-1',
          payload: expect.objectContaining({ workspaceId: 'efeonce', ftrValue: 'pass', ftrDataStatus: 'valid' })
        })
      )
      const emitted = mocks.publishOutboxEvent.mock.calls[0][0]

      expect(emitted.payload).not.toHaveProperty('metadata')
      expect(result).toMatch(/^task_ftr_snapshots:efeonce:task-uuid-1:evt-1:valid$/)
    })

    it('emite chain event cuando FTR fail válido (persiste ftr_value=fail + rpa_value forensic)', async () => {
      mocks.calculateFtr.mockResolvedValueOnce(ftrResult('fail', 'valid', 'canonical', 3))
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-fail' }])
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-uuid-fail')

      await notionFtrComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        { ...validPayload, workspaceId: 'sky' }
      )

      const insertArgs = mocks.runGreenhousePostgresQuery.mock.calls[0][1] as unknown[]

      // params: [snapshotId, taskSourceId, workspaceId, ftrValue, ftrDataStatus, rpaValue, ...]
      expect(insertArgs[2]).toBe('sky')
      expect(insertArgs[3]).toBe('fail')
      expect(insertArgs[5]).toBe(3) // rpaValue forensic
    })

    it('NO emite chain event cuando ftr_data_status === unavailable (degraded honest, persiste ftr_value=null)', async () => {
      mocks.calculateFtr.mockResolvedValueOnce(ftrResult(null, 'unavailable', 'unavailable'))
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-2' }])

      const result = await notionFtrComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validPayload
      )

      const insertArgs = mocks.runGreenhousePostgresQuery.mock.calls[0][1] as unknown[]

      expect(insertArgs[3]).toBeNull() // ftr_value null
      expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
      expect(result).toMatch(/^task_ftr_snapshots:efeonce:task-uuid-1:evt-1:unavailable$/)
    })

    it('NO emite chain event cuando ftr_data_status === low_confidence (conservador, mirror RpA valid-only)', async () => {
      mocks.calculateFtr.mockResolvedValueOnce(ftrResult('pass', 'low_confidence', 'canonical', 0))
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-lc' }])

      const result = await notionFtrComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validPayload
      )

      // ftr_value=pass se persiste pero NO se escribe a Notion (solo valid dispara)
      expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
      expect(result).toMatch(/^task_ftr_snapshots:efeonce:task-uuid-1:evt-1:low_confidence$/)
    })

    it('NO emite chain event en idempotent skip (ON CONFLICT DO NOTHING)', async () => {
      mocks.calculateFtr.mockResolvedValueOnce(ftrResult('pass'))
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([]) // ON CONFLICT → empty RETURNING

      const result = await notionFtrComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validPayload
      )

      expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
      expect(result).toMatch(/idempotent/)
    })

    it('skip silente para demo payload (defense in depth)', async () => {
      const result = await notionFtrComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        { ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } }
      )

      expect(result).toBeNull()
      expect(mocks.calculateFtr).not.toHaveBeenCalled()
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('captura observability + throw cuando calculateFtr falla', async () => {
      mocks.calculateFtr.mockRejectedValueOnce(new Error('PG connection lost'))

      await expect(
        notionFtrComputeProjection.refresh({ entityType: 'notion_task', entityId: 'task-uuid-1' }, validPayload)
      ).rejects.toThrow('PG connection lost')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'error', tags: { source: 'ftr_compute', stage: 'calculate_ftr' } })
      )
    })

    it('captura observability + throw cuando persist falla', async () => {
      mocks.calculateFtr.mockResolvedValueOnce(ftrResult('pass'))
      mocks.runGreenhousePostgresQuery.mockRejectedValueOnce(new Error('CHECK constraint violated'))

      await expect(
        notionFtrComputeProjection.refresh({ entityType: 'notion_task', entityId: 'task-uuid-1' }, validPayload)
      ).rejects.toThrow('CHECK constraint violated')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'error', tags: { source: 'ftr_compute', stage: 'persist_snapshot' } })
      )
    })

    it('captura warning (NON-blocking) cuando chain event emit falla', async () => {
      mocks.calculateFtr.mockResolvedValueOnce(ftrResult('pass'))
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-3' }])
      mocks.publishOutboxEvent.mockRejectedValueOnce(new Error('outbox table locked'))

      const result = await notionFtrComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validPayload
      )

      expect(result).toBeTruthy()
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'warning', tags: { source: 'ftr_compute', stage: 'chain_event_emit' } })
      )
    })
  })

  describe('projection metadata canonical', () => {
    it('domain === delivery', () => {
      expect(notionFtrComputeProjection.domain).toBe('delivery')
    })

    it('triggerEvents === notion.task.status_transitioned (sin .demo)', () => {
      expect(notionFtrComputeProjection.triggerEvents).toEqual(['notion.task.status_transitioned'])
    })

    it('name canonical sibling-pattern (sin _demo)', () => {
      expect(notionFtrComputeProjection.name).toBe('notion_ftr_compute')
    })
  })
})

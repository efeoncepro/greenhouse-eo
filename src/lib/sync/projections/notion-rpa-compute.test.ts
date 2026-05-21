import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  calculateRpaV2: vi.fn(),
  publishOutboxEvent: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

vi.mock('@/lib/notion-metrics/calculate-rpa-v2', () => ({
  calculateRpaV2: mocks.calculateRpaV2
}))

vi.mock('../publish-event', () => ({
  publishOutboxEvent: mocks.publishOutboxEvent
}))

import { notionRpaComputeProjection, isProductiveComputePayload } from './notion-rpa-compute'

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.calculateRpaV2.mockReset()
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

describe('TASK-916 Slice 3 — notion-rpa-compute productive', () => {
  describe('isProductiveComputePayload predicate (defense in depth dual filter)', () => {
    it('returns true para workspaceId efeonce sin demo_mode', () => {
      expect(isProductiveComputePayload(validPayload)).toBe(true)
    })

    it('returns true para workspaceId sky', () => {
      expect(isProductiveComputePayload({ ...validPayload, workspaceId: 'sky' })).toBe(true)
    })

    it('returns false cuando demo_mode === true (carril demo)', () => {
      expect(
        isProductiveComputePayload({ ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } })
      ).toBe(false)
    })

    it('returns false cuando workspaceId === demo aunque sin demo_mode flag', () => {
      expect(isProductiveComputePayload({ ...validPayload, workspaceId: 'demo' })).toBe(false)
    })

    it('returns false para workspace desconocido', () => {
      expect(isProductiveComputePayload({ ...validPayload, workspaceId: 'other' })).toBe(false)
    })

    it('rechaza coersion: demo_mode "true" string igual procesa (no es === true)', () => {
      // demo_mode 'true' string !== true → no se filtra como demo → procesa si workspace prod
      expect(
        isProductiveComputePayload({ ...validPayload, metadata: { demo_mode: 'true' as unknown as boolean } })
      ).toBe(true)
    })

    it('returns false para null/undefined/non-object', () => {
      expect(isProductiveComputePayload(null)).toBe(false)
      expect(isProductiveComputePayload(undefined)).toBe(false)
      expect(isProductiveComputePayload('string')).toBe(false)
      expect(isProductiveComputePayload(42)).toBe(false)
    })
  })

  describe('extractScope (filter canonical)', () => {
    it('extrae scope productivo válido', () => {
      const scope = notionRpaComputeProjection.extractScope(validPayload)

      expect(scope).toEqual({ entityType: 'notion_task', entityId: 'task-uuid-1' })
    })

    it('retorna null para demo event (skip silente)', () => {
      const demo = { ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } }

      expect(notionRpaComputeProjection.extractScope(demo)).toBeNull()
    })

    it('retorna null para event sin taskSourceId', () => {
      expect(notionRpaComputeProjection.extractScope({ ...validPayload, taskSourceId: '' })).toBeNull()
    })

    it('retorna null para workspace no productivo', () => {
      expect(notionRpaComputeProjection.extractScope({ ...validPayload, workspaceId: 'other' })).toBeNull()
    })
  })

  describe('refresh (compute + persist + chain event)', () => {
    it('emite chain event metrics_writeback_requested cuando rpa válido y persist exitoso', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce({
        value: 2,
        dataStatus: 'valid',
        sourceMode: 'canonical',
        inputsUsed: { taskSourceId: 'task-uuid-1', correctionTransitionsCount: 2 },
        formulaVersion: 'rpa_v2.0'
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-1' }])
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-uuid-1')

      const result = await notionRpaComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validPayload
      )

      expect(mocks.calculateRpaV2).toHaveBeenCalledWith({ taskSourceId: 'task-uuid-1' })
      expect(mocks.runGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
      expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'notion.task.metrics_writeback_requested',
          aggregateType: 'notion_task',
          aggregateId: 'task-uuid-1',
          payload: expect.objectContaining({
            workspaceId: 'efeonce',
            rpaValue: 2,
            rpaDataStatus: 'valid'
          })
        })
      )
      // payload prod NO lleva metadata.demo_mode
      const emitted = mocks.publishOutboxEvent.mock.calls[0][0]

      expect(emitted.payload).not.toHaveProperty('metadata')
      expect(result).toMatch(/^task_rpa_snapshots:efeonce:task-uuid-1:evt-1:valid$/)
    })

    it('persiste workspace del payload (sky)', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce({
        value: 0,
        dataStatus: 'valid',
        sourceMode: 'canonical',
        inputsUsed: { taskSourceId: 'task-uuid-1', correctionTransitionsCount: 0 },
        formulaVersion: 'rpa_v2.0'
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-sky' }])
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-uuid-2')

      await notionRpaComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        { ...validPayload, workspaceId: 'sky' }
      )

      const insertArgs = mocks.runGreenhousePostgresQuery.mock.calls[0][1] as unknown[]

      // params: [snapshotId, taskSourceId, workspaceId, ...]
      expect(insertArgs[2]).toBe('sky')
    })

    it('NO emite chain event cuando rpaDataStatus === unavailable (degraded honest)', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce({
        value: null,
        dataStatus: 'unavailable',
        sourceMode: 'unavailable',
        inputsUsed: { taskSourceId: 'task-uuid-1', correctionTransitionsCount: 0 },
        formulaVersion: 'rpa_v2.0'
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-2' }])

      const result = await notionRpaComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validPayload
      )

      expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
      expect(result).toMatch(/^task_rpa_snapshots:efeonce:task-uuid-1:evt-1:unavailable$/)
    })

    it('NO emite chain event en idempotent skip (ON CONFLICT DO NOTHING)', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce({
        value: 1,
        dataStatus: 'valid',
        sourceMode: 'canonical',
        inputsUsed: { taskSourceId: 'task-uuid-1', correctionTransitionsCount: 1 },
        formulaVersion: 'rpa_v2.0'
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([]) // ON CONFLICT → empty RETURNING

      const result = await notionRpaComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validPayload
      )

      expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
      expect(result).toMatch(/idempotent/)
    })

    it('skip silente para demo payload (defense in depth)', async () => {
      const demo = { ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } }

      const result = await notionRpaComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        demo
      )

      expect(result).toBeNull()
      expect(mocks.calculateRpaV2).not.toHaveBeenCalled()
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('captura observability + throw cuando calculateRpaV2 falla', async () => {
      mocks.calculateRpaV2.mockRejectedValueOnce(new Error('PG connection lost'))

      await expect(
        notionRpaComputeProjection.refresh(
          { entityType: 'notion_task', entityId: 'task-uuid-1' },
          validPayload
        )
      ).rejects.toThrow('PG connection lost')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'error', tags: { source: 'rpa_compute', stage: 'calculate_rpa_v2' } })
      )
    })

    it('captura observability + throw cuando persist falla', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce({
        value: 1,
        dataStatus: 'valid',
        sourceMode: 'canonical',
        inputsUsed: { taskSourceId: 'task-uuid-1', correctionTransitionsCount: 1 },
        formulaVersion: 'rpa_v2.0'
      })
      mocks.runGreenhousePostgresQuery.mockRejectedValueOnce(new Error('CHECK constraint violated'))

      await expect(
        notionRpaComputeProjection.refresh(
          { entityType: 'notion_task', entityId: 'task-uuid-1' },
          validPayload
        )
      ).rejects.toThrow('CHECK constraint violated')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'error', tags: { source: 'rpa_compute', stage: 'persist_snapshot' } })
      )
    })

    it('captura warning (NON-blocking) cuando chain event emit falla', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce({
        value: 1,
        dataStatus: 'valid',
        sourceMode: 'canonical',
        inputsUsed: { taskSourceId: 'task-uuid-1', correctionTransitionsCount: 1 },
        formulaVersion: 'rpa_v2.0'
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-3' }])
      mocks.publishOutboxEvent.mockRejectedValueOnce(new Error('outbox table locked'))

      const result = await notionRpaComputeProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validPayload
      )

      expect(result).toBeTruthy()
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'warning', tags: { source: 'rpa_compute', stage: 'chain_event_emit' } })
      )
    })
  })

  describe('projection metadata canonical', () => {
    it('domain === delivery', () => {
      expect(notionRpaComputeProjection.domain).toBe('delivery')
    })

    it('triggerEvents incluye notion.task.status_transitioned (captura prod TASK-912)', () => {
      expect(notionRpaComputeProjection.triggerEvents).toContain('notion.task.status_transitioned')
    })

    it('NO escucha el chain event demo transition_captured.demo', () => {
      expect(notionRpaComputeProjection.triggerEvents).not.toContain('notion.task.transition_captured.demo')
    })

    it('name canonical sibling-pattern (sin sufijo _demo)', () => {
      expect(notionRpaComputeProjection.name).toBe('notion_rpa_compute')
    })
  })
})

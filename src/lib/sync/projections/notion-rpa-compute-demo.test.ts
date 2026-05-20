import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  calculateRpaV2Demo: vi.fn(),
  publishOutboxEvent: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

vi.mock('@/lib/notion-metrics/calculate-rpa-v2-demo', () => ({
  calculateRpaV2Demo: mocks.calculateRpaV2Demo
}))

vi.mock('../publish-event', () => ({
  publishOutboxEvent: mocks.publishOutboxEvent
}))

import {
  notionRpaComputeDemoProjection,
  isDemoComputePayload
} from './notion-rpa-compute-demo'

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.calculateRpaV2Demo.mockReset()
  mocks.publishOutboxEvent.mockReset()
})

const validDemoPayload = {
  schemaVersion: 1,
  taskSourceId: 'task-uuid-1',
  workspaceId: 'demo',
  fromStatus: 'Listo para revisión',
  toStatus: 'Cambios solicitados',
  transitionedAt: '2026-05-19T10:00:00Z',
  sourceEventId: 'evt-1',
  metadata: { demo_mode: true }
}

describe('TASK-913 Slice 1 — notion-rpa-compute-demo canonical', () => {
  describe('isDemoComputePayload predicate (defense in depth dual filter)', () => {
    it('returns true cuando demo_mode === true AND workspaceId === demo', () => {
      expect(isDemoComputePayload(validDemoPayload)).toBe(true)
    })

    it('returns false cuando demo_mode === false', () => {
      expect(
        isDemoComputePayload({ ...validDemoPayload, metadata: { demo_mode: false } })
      ).toBe(false)
    })

    it('returns false cuando workspaceId != demo (invariant violation upstream)', () => {
      expect(isDemoComputePayload({ ...validDemoPayload, workspaceId: 'efeonce' })).toBe(false)
    })

    it('returns false cuando metadata missing (productive event)', () => {
      const { metadata: _omit, ...rest } = validDemoPayload

      void _omit
      expect(isDemoComputePayload(rest)).toBe(false)
    })

    it('rechaza coersion: "true" string NO debe pasar como true boolean', () => {
      expect(
        isDemoComputePayload({
          ...validDemoPayload,
          metadata: { demo_mode: 'true' as unknown as boolean }
        })
      ).toBe(false)
    })

    it('returns false para null/undefined/non-object payload', () => {
      expect(isDemoComputePayload(null)).toBe(false)
      expect(isDemoComputePayload(undefined)).toBe(false)
      expect(isDemoComputePayload('string')).toBe(false)
      expect(isDemoComputePayload(42)).toBe(false)
    })
  })

  describe('extractScope (filter canonical)', () => {
    it('extrae scope demo válido', () => {
      const scope = notionRpaComputeDemoProjection.extractScope(validDemoPayload)

      expect(scope).toEqual({ entityType: 'notion_task', entityId: 'task-uuid-1' })
    })

    it('retorna null para productive event (skip silente)', () => {
      const productive = { ...validDemoPayload, metadata: { demo_mode: false } }

      expect(notionRpaComputeDemoProjection.extractScope(productive)).toBeNull()
    })

    it('retorna null para event sin taskSourceId', () => {
      const malformed = { ...validDemoPayload, taskSourceId: '' }

      expect(notionRpaComputeDemoProjection.extractScope(malformed)).toBeNull()
    })

    it('retorna null para workspaceId distinto de demo', () => {
      const wrongWorkspace = { ...validDemoPayload, workspaceId: 'sky' }

      expect(notionRpaComputeDemoProjection.extractScope(wrongWorkspace)).toBeNull()
    })
  })

  describe('refresh (compute + persist + chain event)', () => {
    it('emite chain event writeback_requested cuando rpa válido y persist exitoso', async () => {
      mocks.calculateRpaV2Demo.mockResolvedValueOnce({
        value: 2,
        dataStatus: 'valid',
        sourceMode: 'canonical',
        inputsUsed: {
          taskSourceId: 'task-uuid-1',
          correctionTransitionsCount: 2
        },
        formulaVersion: 'rpa_v2.0'
      })

      // persistRpaDemoSnapshot returns RETURNING row (inserted=true)
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-1' }])
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-uuid-1')

      const result = await notionRpaComputeDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validDemoPayload
      )

      expect(mocks.calculateRpaV2Demo).toHaveBeenCalledWith({ taskSourceId: 'task-uuid-1' })
      expect(mocks.runGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
      expect(mocks.publishOutboxEvent).toHaveBeenCalledTimes(1)
      expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'notion.task.metrics_writeback_requested.demo',
          aggregateType: 'notion_task',
          aggregateId: 'task-uuid-1',
          payload: expect.objectContaining({
            workspaceId: 'demo',
            rpaValue: 2,
            rpaDataStatus: 'valid',
            metadata: { demo_mode: true }
          })
        })
      )
      expect(result).toMatch(/^task_rpa_demo_snapshots:task-uuid-1:evt-1:valid$/)
    })

    it('NO emite chain event cuando rpaDataStatus === unavailable (degraded honest)', async () => {
      mocks.calculateRpaV2Demo.mockResolvedValueOnce({
        value: null,
        dataStatus: 'unavailable',
        sourceMode: 'unavailable',
        inputsUsed: {
          taskSourceId: 'task-uuid-1',
          correctionTransitionsCount: 0
        },
        formulaVersion: 'rpa_v2.0'
      })

      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-2' }])

      const result = await notionRpaComputeDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validDemoPayload
      )

      expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
      expect(result).toMatch(/^task_rpa_demo_snapshots:task-uuid-1:evt-1:unavailable$/)
    })

    it('NO emite chain event en idempotent skip (ON CONFLICT DO NOTHING)', async () => {
      mocks.calculateRpaV2Demo.mockResolvedValueOnce({
        value: 1,
        dataStatus: 'valid',
        sourceMode: 'canonical',
        inputsUsed: {
          taskSourceId: 'task-uuid-1',
          correctionTransitionsCount: 1
        },
        formulaVersion: 'rpa_v2.0'
      })

      // ON CONFLICT DO NOTHING → empty RETURNING (idempotent skip)
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      const result = await notionRpaComputeDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validDemoPayload
      )

      expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
      expect(result).toMatch(/idempotent/)
    })

    it('skip silente para productive payload (defense in depth)', async () => {
      const productive = { ...validDemoPayload, metadata: { demo_mode: false } }

      const result = await notionRpaComputeDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        productive
      )

      expect(result).toBeNull()
      expect(mocks.calculateRpaV2Demo).not.toHaveBeenCalled()
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('captura observability + throw cuando calculateRpaV2Demo falla', async () => {
      mocks.calculateRpaV2Demo.mockRejectedValueOnce(new Error('PG connection lost'))

      await expect(
        notionRpaComputeDemoProjection.refresh(
          { entityType: 'notion_task', entityId: 'task-uuid-1' },
          validDemoPayload
        )
      ).rejects.toThrow('PG connection lost')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          level: 'error',
          tags: { source: 'demo_rpa_compute', stage: 'calculate_rpa_v2_demo' }
        })
      )
    })

    it('captura observability + throw cuando persist falla', async () => {
      mocks.calculateRpaV2Demo.mockResolvedValueOnce({
        value: 1,
        dataStatus: 'valid',
        sourceMode: 'canonical',
        inputsUsed: {
          taskSourceId: 'task-uuid-1',
          correctionTransitionsCount: 1
        },
        formulaVersion: 'rpa_v2.0'
      })
      mocks.runGreenhousePostgresQuery.mockRejectedValueOnce(new Error('CHECK constraint violated'))

      await expect(
        notionRpaComputeDemoProjection.refresh(
          { entityType: 'notion_task', entityId: 'task-uuid-1' },
          validDemoPayload
        )
      ).rejects.toThrow('CHECK constraint violated')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          level: 'error',
          tags: { source: 'demo_rpa_compute', stage: 'persist_snapshot' }
        })
      )
    })

    it('captura warning (NON-blocking) cuando chain event emit falla', async () => {
      mocks.calculateRpaV2Demo.mockResolvedValueOnce({
        value: 1,
        dataStatus: 'valid',
        sourceMode: 'canonical',
        inputsUsed: {
          taskSourceId: 'task-uuid-1',
          correctionTransitionsCount: 1
        },
        formulaVersion: 'rpa_v2.0'
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ snapshot_id: 'snap-3' }])
      mocks.publishOutboxEvent.mockRejectedValueOnce(new Error('outbox table locked'))

      // Should NOT throw — chain emit failure is non-blocking
      const result = await notionRpaComputeDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validDemoPayload
      )

      expect(result).toBeTruthy()
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          level: 'warning',
          tags: { source: 'demo_rpa_compute', stage: 'chain_event_emit' }
        })
      )
    })
  })

  describe('projection metadata canonical', () => {
    it('domain === delivery', () => {
      expect(notionRpaComputeDemoProjection.domain).toBe('delivery')
    })

    it('triggerEvents incluye notion.task.transition_captured.demo (chain event)', () => {
      expect(notionRpaComputeDemoProjection.triggerEvents).toContain(
        'notion.task.transition_captured.demo'
      )
    })

    it('NO escucha notion.task.status_transitioned (race condition guard)', () => {
      expect(notionRpaComputeDemoProjection.triggerEvents).not.toContain(
        'notion.task.status_transitioned'
      )
    })

    it('name canonical sibling-pattern (TASK-910 mirror)', () => {
      expect(notionRpaComputeDemoProjection.name).toBe('notion_rpa_compute_demo')
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  publishOutboxEvent: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

vi.mock('../publish-event', () => ({
  publishOutboxEvent: mocks.publishOutboxEvent
}))

import {
  notionStatusTransitionCaptureDemoProjection,
  isDemoModePayload,
  __testing__
} from './notion-status-transition-capture-demo'

const { persistStatusTransitionDemo } = __testing__

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.publishOutboxEvent.mockReset()
})

const validDemoPayload = {
  schemaVersion: 1,
  taskSourceId: 'task-uuid-1',
  workspaceId: 'demo',
  fromStatus: 'En curso',
  toStatus: 'Listo para revisión',
  transitionedAt: '2026-05-19T10:00:00Z',
  transitionedBy: 'notion-user-uuid',
  sourceEventId: 'evt-1',
  metadata: { demo_mode: true }
}

describe('TASK-910 Slice 3 — notion-status-transition-capture-demo canonical', () => {
  describe('isDemoModePayload predicate (defense in depth filter)', () => {
    it('returns true cuando metadata.demo_mode === true (strict)', () => {
      expect(isDemoModePayload(validDemoPayload)).toBe(true)
    })

    it('returns false cuando metadata.demo_mode === false', () => {
      expect(isDemoModePayload({ ...validDemoPayload, metadata: { demo_mode: false } })).toBe(false)
    })

    it('returns false cuando metadata missing (productive event)', () => {
      const { metadata: _, ...rest } = validDemoPayload

      void _
      expect(isDemoModePayload(rest)).toBe(false)
    })

    it('returns false cuando metadata.demo_mode missing', () => {
      expect(isDemoModePayload({ ...validDemoPayload, metadata: {} })).toBe(false)
    })

    it('returns false cuando demo_mode truthy pero NO strictly true (anti-coersion)', () => {
      expect(
        isDemoModePayload({ ...validDemoPayload, metadata: { demo_mode: 'true' as unknown as boolean } })
      ).toBe(false)
      expect(
        isDemoModePayload({ ...validDemoPayload, metadata: { demo_mode: 1 as unknown as boolean } })
      ).toBe(false)
    })

    it('returns false cuando payload null/undefined/empty', () => {
      expect(isDemoModePayload(null)).toBe(false)
      expect(isDemoModePayload(undefined)).toBe(false)
      expect(isDemoModePayload({})).toBe(false)
    })
  })

  describe('extractScope canonical filter', () => {
    it('extrae scope canonical para payload demo válido', () => {
      const scope = notionStatusTransitionCaptureDemoProjection.extractScope(validDemoPayload)

      expect(scope).toEqual({ entityType: 'notion_task', entityId: 'task-uuid-1' })
    })

    it('SKIP event productivo (sin metadata.demo_mode=true) — defense in depth crítico', () => {
      const productivePayload = {
        ...validDemoPayload,
        workspaceId: 'efeonce',
        metadata: undefined
      }

      const scope = notionStatusTransitionCaptureDemoProjection.extractScope(productivePayload)

      expect(scope).toBeNull()
    })

    it('SKIP event con metadata.demo_mode=false', () => {
      const scope = notionStatusTransitionCaptureDemoProjection.extractScope({
        ...validDemoPayload,
        metadata: { demo_mode: false }
      })

      expect(scope).toBeNull()
    })

    it('SKIP event con demo_mode=true pero workspaceId="efeonce" (invariant violation upstream)', () => {
      const scope = notionStatusTransitionCaptureDemoProjection.extractScope({
        ...validDemoPayload,
        workspaceId: 'efeonce'
      })

      expect(scope).toBeNull()
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          tags: expect.objectContaining({ source: 'demo_status_transition_capture' })
        })
      )
    })

    it('SKIP event sin taskSourceId', () => {
      const scope = notionStatusTransitionCaptureDemoProjection.extractScope({
        ...validDemoPayload,
        taskSourceId: ''
      })

      expect(scope).toBeNull()
    })
  })

  describe('refresh canonical', () => {
    it('persiste demo transition correctly (happy path)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      await notionStatusTransitionCaptureDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        validDemoPayload as unknown as Record<string, unknown>
      )

      expect(mocks.runGreenhousePostgresQuery).toHaveBeenCalledOnce()
      const callArgs = mocks.runGreenhousePostgresQuery.mock.calls[0]
      const sql = callArgs[0] as string
      const params = callArgs[1] as unknown[]

      expect(sql).toContain('greenhouse_delivery.task_status_transitions_demo')
      expect(sql).toContain("'demo'") // CHECK constraint workspace_id='demo' hardcoded
      expect(sql).toContain('ON CONFLICT (source_event_id)')
      expect(params).toEqual([
        'task-uuid-1',
        'En curso',
        'Listo para revisión',
        '2026-05-19T10:00:00Z',
        'notion-user-uuid',
        'evt-1'
      ])
    })

    it('refresh SKIP productive event (defense in depth secondary check)', async () => {
      const result = await notionStatusTransitionCaptureDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        { ...validDemoPayload, metadata: undefined } as unknown as Record<string, unknown>
      )

      expect(result).toBeNull()
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('refresh CAPTURE error si payload missing required fields', async () => {
      const result = await notionStatusTransitionCaptureDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        { ...validDemoPayload, fromStatus: '' } as unknown as Record<string, unknown>
      )

      expect(result).toBeNull()
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          tags: expect.objectContaining({ stage: 'refresh' })
        })
      )
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('refresh re-throw error si INSERT falla (para retry exponencial canonical)', async () => {
      const dbErr = new Error('PG transient timeout')

      mocks.runGreenhousePostgresQuery.mockRejectedValueOnce(dbErr)

      await expect(
        notionStatusTransitionCaptureDemoProjection.refresh(
          { entityType: 'notion_task', entityId: 'task-uuid-1' },
          validDemoPayload as unknown as Record<string, unknown>
        )
      ).rejects.toThrow('PG transient timeout')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        dbErr,
        'integrations.notion',
        expect.objectContaining({
          tags: expect.objectContaining({ stage: 'persist' })
        })
      )
    })
  })

  describe('persistStatusTransitionDemo helper', () => {
    it('rechaza workspaceId != "demo" (defense in depth)', async () => {
      await expect(
        persistStatusTransitionDemo({
          taskSourceId: 'x',
          fromStatus: 'En curso',
          toStatus: 'Aprobado',
          transitionedAt: '2026-05-19T10:00:00Z',
          transitionedBy: null,
          sourceEventId: 'evt-x',
          workspaceId: 'efeonce' // ← invariant violation
        })
      ).rejects.toThrow(/Refuse to INSERT.*workspace_id="efeonce"/i)

      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })
  })

  describe('Projection config canonical', () => {
    it('triggerEvents listens a notion.task.status_transitioned', () => {
      expect(notionStatusTransitionCaptureDemoProjection.triggerEvents).toEqual([
        'notion.task.status_transitioned'
      ])
    })

    it('domain canonical es delivery (mismo subsystem ICO)', () => {
      expect(notionStatusTransitionCaptureDemoProjection.domain).toBe('delivery')
    })

    it('name canonical es notion_status_transition_capture_demo', () => {
      expect(notionStatusTransitionCaptureDemoProjection.name).toBe(
        'notion_status_transition_capture_demo'
      )
    })
  })

  describe('TASK-913 Slice 1 chain event emit (transition_captured.demo)', () => {
    it('emite chain event SOLO para correction transition (Listo para revisión → Cambios solicitados)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-uuid-1')

      const correctionPayload = {
        ...validDemoPayload,
        fromStatus: 'Listo para revisión',
        toStatus: 'Cambios solicitados'
      }

      await notionStatusTransitionCaptureDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        correctionPayload as unknown as Record<string, unknown>
      )

      expect(mocks.publishOutboxEvent).toHaveBeenCalledOnce()
      expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'notion.task.transition_captured.demo',
          aggregateType: 'notion_task',
          aggregateId: 'task-uuid-1',
          payload: expect.objectContaining({
            workspaceId: 'demo',
            fromStatus: 'Listo para revisión',
            toStatus: 'Cambios solicitados',
            metadata: { demo_mode: true }
          })
        })
      )
    })

    it('NO emite chain event para transitions NO de corrección (e.g. En curso → Listo para revisión)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      const nonCorrectionPayload = {
        ...validDemoPayload,
        fromStatus: 'En curso',
        toStatus: 'Listo para revisión'
      }

      await notionStatusTransitionCaptureDemoProjection.refresh(
        { entityType: 'notion_task', entityId: 'task-uuid-1' },
        nonCorrectionPayload as unknown as Record<string, unknown>
      )

      expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    })

    it('NO throw cuando chain event emit falla (non-blocking, warning capture)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      mocks.publishOutboxEvent.mockRejectedValueOnce(new Error('outbox locked'))

      const correctionPayload = {
        ...validDemoPayload,
        fromStatus: 'Listo para revisión',
        toStatus: 'Cambios solicitados'
      }

      // Should NOT throw — transition persisted, only chain event emit failed
      await expect(
        notionStatusTransitionCaptureDemoProjection.refresh(
          { entityType: 'notion_task', entityId: 'task-uuid-1' },
          correctionPayload as unknown as Record<string, unknown>
        )
      ).resolves.toBeTruthy()

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({ stage: 'chain_event_emit' })
        })
      )
    })
  })
})

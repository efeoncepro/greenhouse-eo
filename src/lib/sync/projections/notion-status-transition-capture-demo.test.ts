import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  publishOutboxEvent: vi.fn(),
  fetchDemoPageStatus: vi.fn()
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

vi.mock('@/lib/notion-metrics/notion-demo-client', () => ({
  fetchDemoPageStatus: mocks.fetchDemoPageStatus
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
  mocks.fetchDemoPageStatus.mockReset()
})

// TASK-914 — payload del trigger page_change_signal.demo (re-fetch pattern).
// NO incluye from/to: el consumer los resuelve re-fetcheando la página.
const validSignalPayload = {
  schemaVersion: 1,
  taskSourceId: 'task-uuid-1',
  workspaceId: 'demo',
  changedPropertyIds: ['estId'],
  sourceEventId: 'evt-1',
  occurredAt: '2026-05-19T10:00:00Z',
  metadata: { demo_mode: true }
}

const scope = { entityType: 'notion_task', entityId: 'task-uuid-1' }

describe('TASK-914 — notion-status-transition-capture-demo (re-fetch pattern)', () => {
  describe('isDemoModePayload predicate (defense in depth filter)', () => {
    it('returns true cuando metadata.demo_mode === true (strict)', () => {
      expect(isDemoModePayload(validSignalPayload)).toBe(true)
    })

    it('returns false cuando metadata.demo_mode === false', () => {
      expect(isDemoModePayload({ ...validSignalPayload, metadata: { demo_mode: false } })).toBe(false)
    })

    it('returns false cuando metadata missing (productive event)', () => {
      const { metadata: _, ...rest } = validSignalPayload

      void _
      expect(isDemoModePayload(rest)).toBe(false)
    })

    it('returns false cuando demo_mode truthy pero NO strictly true (anti-coersion)', () => {
      expect(
        isDemoModePayload({ ...validSignalPayload, metadata: { demo_mode: 'true' as unknown as boolean } })
      ).toBe(false)
      expect(
        isDemoModePayload({ ...validSignalPayload, metadata: { demo_mode: 1 as unknown as boolean } })
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
      expect(notionStatusTransitionCaptureDemoProjection.extractScope(validSignalPayload)).toEqual(scope)
    })

    it('SKIP event productivo (sin metadata.demo_mode=true) — defense in depth crítico', () => {
      expect(
        notionStatusTransitionCaptureDemoProjection.extractScope({
          ...validSignalPayload,
          workspaceId: 'efeonce',
          metadata: undefined
        })
      ).toBeNull()
    })

    it('SKIP event con demo_mode=true pero workspaceId="efeonce" (invariant violation upstream)', () => {
      const result = notionStatusTransitionCaptureDemoProjection.extractScope({
        ...validSignalPayload,
        workspaceId: 'efeonce'
      })

      expect(result).toBeNull()
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          tags: expect.objectContaining({ source: 'demo_status_transition_capture' })
        })
      )
    })

    it('SKIP event sin taskSourceId', () => {
      expect(
        notionStatusTransitionCaptureDemoProjection.extractScope({ ...validSignalPayload, taskSourceId: '' })
      ).toBeNull()
    })
  })

  describe('refresh canonical (re-fetch + derive from + persist-if-changed)', () => {
    it('persiste transition resolviendo to vía re-fetch + from vía PG (happy path)', async () => {
      // re-fetch devuelve el estado actual (= to)
      mocks.fetchDemoPageStatus.mockResolvedValueOnce({
        statusName: 'Listo para revisión',
        lastEditedTime: '2026-05-19T10:05:00Z',
        lastEditedBy: 'notion-user-uuid'
      })
      // deriveFromStatus: última transición registrada (= from)
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'En curso' }])
      // persist INSERT
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      const result = await notionStatusTransitionCaptureDemoProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(mocks.fetchDemoPageStatus).toHaveBeenCalledWith('task-uuid-1')
      // 2 queries: deriveFromStatus + persist INSERT
      expect(mocks.runGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
      const insertCall = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(insertCall[0]).toContain('greenhouse_delivery.task_status_transitions_demo')
      expect(insertCall[1]).toEqual([
        'task-uuid-1',
        'En curso',
        'Listo para revisión',
        '2026-05-19T10:05:00Z',
        'notion-user-uuid',
        'evt-1'
      ])
      expect(result).toContain('task_status_transitions_demo')
    })

    it('deriva from="Sin empezar" cuando NO hay transición previa', async () => {
      mocks.fetchDemoPageStatus.mockResolvedValueOnce({
        statusName: 'En curso',
        lastEditedTime: '2026-05-19T10:05:00Z',
        lastEditedBy: null
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([]) // sin transición previa
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([]) // persist

      await notionStatusTransitionCaptureDemoProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      const insertCall = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(insertCall[1][1]).toBe('Sin empezar') // fromStatus
      expect(insertCall[1][2]).toBe('En curso') // toStatus
    })

    it('NO-OP idempotente cuando el estado no cambió (from === to)', async () => {
      mocks.fetchDemoPageStatus.mockResolvedValueOnce({
        statusName: 'En curso',
        lastEditedTime: '2026-05-19T10:05:00Z',
        lastEditedBy: null
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'En curso' }])

      const result = await notionStatusTransitionCaptureDemoProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      // solo el deriveFromStatus query, NO persist
      expect(mocks.runGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
      expect(result).toContain('noop')
    })

    it('SKIP honesto cuando la página fue borrada (re-fetch 404 → null)', async () => {
      mocks.fetchDemoPageStatus.mockResolvedValueOnce(null)

      const result = await notionStatusTransitionCaptureDemoProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(result).toContain('page_deleted')
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('SKIP cuando el status no es canonical ni alias (no inventar)', async () => {
      mocks.fetchDemoPageStatus.mockResolvedValueOnce({
        statusName: 'StatusInventado',
        lastEditedTime: null,
        lastEditedBy: null
      })

      const result = await notionStatusTransitionCaptureDemoProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(result).toContain('status_unresolved')
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('normaliza legacy Sky `En feedback` → canonical `Cambios solicitados`', async () => {
      mocks.fetchDemoPageStatus.mockResolvedValueOnce({
        statusName: 'En feedback',
        lastEditedTime: '2026-05-19T10:05:00Z',
        lastEditedBy: null
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'Listo para revisión' }])
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      await notionStatusTransitionCaptureDemoProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      const insertCall = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(insertCall[1][2]).toBe('Cambios solicitados') // toStatus normalizado
    })

    it('SKIP productive event (defense in depth secondary check)', async () => {
      const result = await notionStatusTransitionCaptureDemoProjection.refresh(
        scope,
        { ...validSignalPayload, metadata: undefined } as unknown as Record<string, unknown>
      )

      expect(result).toBeNull()
      expect(mocks.fetchDemoPageStatus).not.toHaveBeenCalled()
    })

    it('re-throw cuando el re-fetch falla (retry exponencial canonical)', async () => {
      const apiErr = new Error('Notion API GET page 429')

      mocks.fetchDemoPageStatus.mockRejectedValueOnce(apiErr)

      await expect(
        notionStatusTransitionCaptureDemoProjection.refresh(
          scope,
          validSignalPayload as unknown as Record<string, unknown>
        )
      ).rejects.toThrow('429')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        apiErr,
        'integrations.notion',
        expect.objectContaining({ tags: expect.objectContaining({ stage: 'refetch' }) })
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
    it('triggerEvents listens a notion.task.page_change_signal.demo', () => {
      expect(notionStatusTransitionCaptureDemoProjection.triggerEvents).toEqual([
        'notion.task.page_change_signal.demo'
      ])
    })

    it('domain canonical es delivery (mismo subsystem ICO)', () => {
      expect(notionStatusTransitionCaptureDemoProjection.domain).toBe('delivery')
    })

    it('name canonical es notion_status_transition_capture_demo', () => {
      expect(notionStatusTransitionCaptureDemoProjection.name).toBe('notion_status_transition_capture_demo')
    })
  })

  describe('chain event emit (transition_captured.demo)', () => {
    it('emite chain event SOLO para correction (Listo para revisión → Cambios solicitados)', async () => {
      mocks.fetchDemoPageStatus.mockResolvedValueOnce({
        statusName: 'Cambios solicitados',
        lastEditedTime: '2026-05-19T10:05:00Z',
        lastEditedBy: null
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'Listo para revisión' }])
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-uuid-1')

      await notionStatusTransitionCaptureDemoProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'notion.task.transition_captured.demo',
          payload: expect.objectContaining({
            fromStatus: 'Listo para revisión',
            toStatus: 'Cambios solicitados',
            metadata: { demo_mode: true }
          })
        })
      )
    })

    it('NO emite chain event para transitions NO de corrección', async () => {
      mocks.fetchDemoPageStatus.mockResolvedValueOnce({
        statusName: 'Listo para revisión',
        lastEditedTime: '2026-05-19T10:05:00Z',
        lastEditedBy: null
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'En curso' }])
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      await notionStatusTransitionCaptureDemoProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    })

    it('NO throw cuando chain event emit falla (non-blocking)', async () => {
      mocks.fetchDemoPageStatus.mockResolvedValueOnce({
        statusName: 'Cambios solicitados',
        lastEditedTime: '2026-05-19T10:05:00Z',
        lastEditedBy: null
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'Listo para revisión' }])
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      mocks.publishOutboxEvent.mockRejectedValueOnce(new Error('outbox locked'))

      await expect(
        notionStatusTransitionCaptureDemoProjection.refresh(
          scope,
          validSignalPayload as unknown as Record<string, unknown>
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

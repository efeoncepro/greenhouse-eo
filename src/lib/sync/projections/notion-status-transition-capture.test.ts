import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PRODUCTIVE_TAREAS_DATA_SOURCE_IDS,
  DEMO_TAREAS_DATA_SOURCE_ID
} from '@/lib/notion-metrics/notion-productive-workspaces'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  publishOutboxEvent: vi.fn(),
  fetchPageStatus: vi.fn()
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

vi.mock('@/lib/space-notion/notion-client', () => ({
  fetchPageStatus: mocks.fetchPageStatus
}))

import { notionStatusTransitionCaptureProjection, isDemoModePayload } from './notion-status-transition-capture'

const EFEONCE_DS = PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.efeonce
const SKY_DS = PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.sky

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.publishOutboxEvent.mockReset()
  mocks.fetchPageStatus.mockReset()
})

const validSignalPayload = {
  schemaVersion: 1,
  taskSourceId: 'task-uuid-1',
  changedPropertyIds: ['estId'],
  parentId: EFEONCE_DS,
  sourceEventId: 'evt-1',
  occurredAt: '2026-05-21T10:00:00Z'
}

const scope = { entityType: 'notion_task', entityId: 'task-uuid-1' }

describe('TASK-912 — notion-status-transition-capture (productivo Efeonce/Sky)', () => {
  describe('isDemoModePayload defense in depth', () => {
    it('false para payload productivo (sin metadata)', () => {
      expect(isDemoModePayload(validSignalPayload)).toBe(false)
    })

    it('true cuando demo_mode === true (strict)', () => {
      expect(isDemoModePayload({ ...validSignalPayload, metadata: { demo_mode: true } })).toBe(true)
    })

    it('false para null / {} / demo_mode truthy no-estricto', () => {
      expect(isDemoModePayload(null)).toBe(false)
      expect(isDemoModePayload({})).toBe(false)
      expect(isDemoModePayload({ metadata: { demo_mode: 'true' as unknown as boolean } })).toBe(false)
    })
  })

  describe('extractScope', () => {
    it('extrae scope para payload productivo válido', () => {
      expect(notionStatusTransitionCaptureProjection.extractScope(validSignalPayload)).toEqual(scope)
    })

    it('SKIP si demo_mode=true (lo maneja el consumer demo)', () => {
      expect(
        notionStatusTransitionCaptureProjection.extractScope({ ...validSignalPayload, metadata: { demo_mode: true } })
      ).toBeNull()
    })

    it('SKIP sin taskSourceId', () => {
      expect(notionStatusTransitionCaptureProjection.extractScope({ ...validSignalPayload, taskSourceId: '' })).toBeNull()
    })
  })

  describe('refresh (re-fetch + workspace autoritativo + persist-if-changed)', () => {
    it('persiste resolviendo to (re-fetch) + workspace (parent.data_source_id) + from (PG)', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce({
        statusName: 'Listo para revisión',
        lastEditedTime: '2026-05-21T10:05:00Z',
        lastEditedBy: 'notion-user-uuid',
        parentDataSourceId: EFEONCE_DS
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'En curso' }]) // deriveFromStatus
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([]) // persist
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-1')

      const result = await notionStatusTransitionCaptureProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(mocks.fetchPageStatus).toHaveBeenCalledWith('task-uuid-1')
      expect(mocks.runGreenhousePostgresQuery).toHaveBeenCalledTimes(2)

      const insertCall = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(insertCall[0]).toContain('greenhouse_delivery.task_status_transitions')
      expect(insertCall[0]).not.toContain('task_status_transitions_demo')
      expect(insertCall[1]).toEqual([
        'task-uuid-1',
        'efeonce',
        'En curso',
        'Listo para revisión',
        '2026-05-21T10:05:00Z',
        'notion-user-uuid',
        'evt-1'
      ])
      expect(result).toContain('task_status_transitions:efeonce')
    })

    it('resuelve workspace=sky por parent.data_source_id de Sky', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce({
        statusName: 'En curso',
        lastEditedTime: '2026-05-21T10:05:00Z',
        lastEditedBy: null,
        parentDataSourceId: SKY_DS
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([]) // from = Sin empezar
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([]) // persist
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-2')

      await notionStatusTransitionCaptureProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      const insertCall = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(insertCall[1][1]).toBe('sky')
      expect(insertCall[1][2]).toBe('Sin empezar') // from
      expect(insertCall[1][3]).toBe('En curso') // to
    })

    it('SKIP cuando el workspace NO es productivo (demo data source) — garantía anti-contaminación', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce({
        statusName: 'En curso',
        lastEditedTime: '2026-05-21T10:05:00Z',
        lastEditedBy: null,
        parentDataSourceId: DEMO_TAREAS_DATA_SOURCE_ID
      })

      const result = await notionStatusTransitionCaptureProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(result).toContain('not_productive_workspace')
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('SKIP cuando parent.data_source_id desconocido (otro teamspace de la suscripción amplia)', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce({
        statusName: 'En curso',
        lastEditedTime: null,
        lastEditedBy: null,
        parentDataSourceId: '00000000-0000-0000-0000-000000000000'
      })

      const result = await notionStatusTransitionCaptureProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(result).toContain('not_productive_workspace')
    })

    it('SKIP honesto cuando la página fue borrada (404 → null)', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce(null)

      const result = await notionStatusTransitionCaptureProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(result).toContain('page_deleted')
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('SKIP cuando status no canonical ni alias (no inventar)', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce({
        statusName: 'StatusInventado',
        lastEditedTime: null,
        lastEditedBy: null,
        parentDataSourceId: EFEONCE_DS
      })

      const result = await notionStatusTransitionCaptureProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(result).toContain('status_unresolved')
    })

    it('NO-OP idempotente cuando estado no cambió (from === to)', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce({
        statusName: 'En curso',
        lastEditedTime: '2026-05-21T10:05:00Z',
        lastEditedBy: null,
        parentDataSourceId: EFEONCE_DS
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'En curso' }])

      const result = await notionStatusTransitionCaptureProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(mocks.runGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
      expect(result).toContain('noop')
    })

    it('emite notion.task.status_transitioned para TODA transición (no solo correcciones)', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce({
        statusName: 'Listo para revisión',
        lastEditedTime: '2026-05-21T10:05:00Z',
        lastEditedBy: null,
        parentDataSourceId: EFEONCE_DS
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'En curso' }])
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-3')

      await notionStatusTransitionCaptureProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'notion.task.status_transitioned',
          payload: expect.objectContaining({
            workspaceId: 'efeonce',
            fromStatus: 'En curso',
            toStatus: 'Listo para revisión'
          })
        })
      )
    })

    it('normaliza legacy `En feedback` → `Cambios solicitados` antes de persistir', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce({
        statusName: 'En feedback',
        lastEditedTime: '2026-05-21T10:05:00Z',
        lastEditedBy: null,
        parentDataSourceId: SKY_DS
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'Listo para revisión' }])
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      mocks.publishOutboxEvent.mockResolvedValueOnce('outbox-4')

      await notionStatusTransitionCaptureProjection.refresh(
        scope,
        validSignalPayload as unknown as Record<string, unknown>
      )

      expect(mocks.runGreenhousePostgresQuery.mock.calls[1][1][3]).toBe('Cambios solicitados')
    })

    it('re-throw cuando re-fetch falla (retry exponencial)', async () => {
      const apiErr = new Error('Notion API GET page 429')

      mocks.fetchPageStatus.mockRejectedValueOnce(apiErr)

      await expect(
        notionStatusTransitionCaptureProjection.refresh(
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

    it('NO throw cuando el emit del chain event falla (non-blocking)', async () => {
      mocks.fetchPageStatus.mockResolvedValueOnce({
        statusName: 'Aprobado',
        lastEditedTime: '2026-05-21T10:05:00Z',
        lastEditedBy: null,
        parentDataSourceId: EFEONCE_DS
      })
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ to_status: 'Listo para revisión' }])
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      mocks.publishOutboxEvent.mockRejectedValueOnce(new Error('outbox locked'))

      await expect(
        notionStatusTransitionCaptureProjection.refresh(
          scope,
          validSignalPayload as unknown as Record<string, unknown>
        )
      ).resolves.toBeTruthy()

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ tags: expect.objectContaining({ stage: 'chain_event_emit' }) })
      )
    })
  })

  describe('Projection config canonical', () => {
    it('triggerEvents = [notion.task.page_change_signal]', () => {
      expect(notionStatusTransitionCaptureProjection.triggerEvents).toEqual(['notion.task.page_change_signal'])
    })

    it('domain = delivery, name = notion_status_transition_capture', () => {
      expect(notionStatusTransitionCaptureProjection.domain).toBe('delivery')
      expect(notionStatusTransitionCaptureProjection.name).toBe('notion_status_transition_capture')
    })
  })
})

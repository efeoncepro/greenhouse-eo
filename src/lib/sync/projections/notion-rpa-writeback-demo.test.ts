import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  patchNotionDemoPage: vi.fn(),
  isDemoNotionWritebackConfigured: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

vi.mock('@/lib/notion-metrics/notion-demo-client', () => ({
  patchNotionDemoPage: mocks.patchNotionDemoPage,
  isDemoNotionWritebackConfigured: mocks.isDemoNotionWritebackConfigured,
  NotionDemoClientUnavailableError: class extends Error {
    constructor(msg: string) {
      super(msg)
      this.name = 'NotionDemoClientUnavailableError'
    }
  }
}))

import {
  notionRpaWritebackDemoProjection,
  __testing__
} from './notion-rpa-writeback-demo'

const { isWritebackDemoPayload, NOTION_PROPERTY_RPA_V2 } = __testing__

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.patchNotionDemoPage.mockReset()
  mocks.isDemoNotionWritebackConfigured.mockReset()
  mocks.isDemoNotionWritebackConfigured.mockReturnValue(true) // default configured
})

const validWritebackPayload = {
  schemaVersion: 1,
  taskSourceId: 'demo-task-uuid-001',
  workspaceId: 'demo',
  rpaValue: 2,
  rpaDataStatus: 'valid',
  snapshotId: 'snap-uuid-001',
  formulaVersion: 'rpa_v2.0',
  computedAt: '2026-05-19T10:00:00Z',
  metadata: { demo_mode: true }
}

const snapshotRow = {
  snapshot_id: 'snap-uuid-001',
  task_source_id: 'demo-task-uuid-001',
  rpa_value: 2,
  rpa_data_status: 'valid',
  written_to_notion_at: null,
  notion_writeback_attempt_count: 0
}

describe('TASK-913 Slice 2 — notion-rpa-writeback-demo canonical', () => {
  describe('isWritebackDemoPayload predicate (defense in depth dual filter)', () => {
    it('returns true cuando demo_mode === true AND workspaceId === demo', () => {
      expect(isWritebackDemoPayload(validWritebackPayload)).toBe(true)
    })

    it('returns false cuando workspaceId !== demo (productive shape)', () => {
      expect(
        isWritebackDemoPayload({ ...validWritebackPayload, workspaceId: 'efeonce' })
      ).toBe(false)
    })

    it('rechaza coersion "true" string', () => {
      expect(
        isWritebackDemoPayload({
          ...validWritebackPayload,
          metadata: { demo_mode: 'true' as unknown as boolean }
        })
      ).toBe(false)
    })
  })

  describe('extractScope', () => {
    it('extrae snapshot scope', () => {
      const scope = notionRpaWritebackDemoProjection.extractScope(validWritebackPayload)

      expect(scope).toEqual({ entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' })
    })

    it('retorna null para productive event', () => {
      const scope = notionRpaWritebackDemoProjection.extractScope({
        ...validWritebackPayload,
        metadata: { demo_mode: false }
      })

      expect(scope).toBeNull()
    })

    it('retorna null sin snapshotId', () => {
      const scope = notionRpaWritebackDemoProjection.extractScope({
        ...validWritebackPayload,
        snapshotId: ''
      })

      expect(scope).toBeNull()
    })
  })

  describe('refresh — happy path PATCH success', () => {
    it('re-reads snapshot, PATCH Notion, marca written exitosamente', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([snapshotRow]) // readSnapshotForWriteback
        .mockResolvedValueOnce([]) // markSnapshotWritten
      mocks.patchNotionDemoPage.mockResolvedValueOnce({ id: 'demo-task-uuid-001' })

      const result = await notionRpaWritebackDemoProjection.refresh(
        { entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' },
        validWritebackPayload
      )

      expect(mocks.patchNotionDemoPage).toHaveBeenCalledWith(
        'demo-task-uuid-001',
        { [NOTION_PROPERTY_RPA_V2]: { number: 2 } }
      )
      expect(result).toBe('rpa_writeback_demo:snap-uuid-001:written:2')

      // UPDATE markSnapshotWritten called with correct snapshot_id
      const updateCallArgs = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(updateCallArgs[0]).toContain('SET written_to_notion_at = NOW()')
      expect(updateCallArgs[1][0]).toBe('snap-uuid-001')
    })
  })

  describe('refresh — defense in depth skips', () => {
    it('skip silente cuando integration token NO configurado', async () => {
      mocks.isDemoNotionWritebackConfigured.mockReturnValueOnce(false)

      const result = await notionRpaWritebackDemoProjection.refresh(
        { entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' },
        validWritebackPayload
      )

      expect(result).toBe('rpa_writeback_demo:snap-uuid-001:skipped:unconfigured')
      expect(mocks.patchNotionDemoPage).not.toHaveBeenCalled()
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({ stage: 'config_check' })
        })
      )
    })

    it('skip silente cuando snapshot no existe (idempotent)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      const result = await notionRpaWritebackDemoProjection.refresh(
        { entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' },
        validWritebackPayload
      )

      expect(result).toBe('rpa_writeback_demo:snap-uuid-001:skipped:snapshot_missing')
      expect(mocks.patchNotionDemoPage).not.toHaveBeenCalled()
    })

    it('skip idempotente cuando snapshot ya escrito a Notion', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        { ...snapshotRow, written_to_notion_at: new Date('2026-05-19T09:00:00Z') }
      ])

      const result = await notionRpaWritebackDemoProjection.refresh(
        { entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' },
        validWritebackPayload
      )

      expect(result).toBe('rpa_writeback_demo:snap-uuid-001:idempotent:already_written')
      expect(mocks.patchNotionDemoPage).not.toHaveBeenCalled()
    })

    it('skip cuando rpa_data_status !== valid', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        { ...snapshotRow, rpa_data_status: 'unavailable', rpa_value: null }
      ])

      const result = await notionRpaWritebackDemoProjection.refresh(
        { entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' },
        validWritebackPayload
      )

      expect(result).toBe('rpa_writeback_demo:snap-uuid-001:skipped:not_writable')
      expect(mocks.patchNotionDemoPage).not.toHaveBeenCalled()
    })

    it('skip silente para productive event (defense in depth)', async () => {
      const result = await notionRpaWritebackDemoProjection.refresh(
        { entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' },
        { ...validWritebackPayload, metadata: { demo_mode: false } }
      )

      expect(result).toBeNull()
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
      expect(mocks.patchNotionDemoPage).not.toHaveBeenCalled()
    })
  })

  describe('refresh — error handling + retry policy', () => {
    it('marca snapshot failed + throw cuando PATCH Notion falla', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([snapshotRow]) // readSnapshotForWriteback
        .mockResolvedValueOnce([]) // markSnapshotFailed
      const notionErr = new Error('Notion API PATCH 429: rate limited') as Error & { status?: number }

      notionErr.status = 429
      mocks.patchNotionDemoPage.mockRejectedValueOnce(notionErr)

      await expect(
        notionRpaWritebackDemoProjection.refresh(
          { entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' },
          validWritebackPayload
        )
      ).rejects.toThrow('Notion API PATCH 429')

      // markSnapshotFailed called
      const failedCallArgs = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(failedCallArgs[0]).toContain('notion_writeback_last_error')
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          level: 'error',
          tags: expect.objectContaining({ stage: 'patch_notion' }),
          extra: expect.objectContaining({ status: 429 })
        })
      )
    })

    it('throw cuando read snapshot falla', async () => {
      mocks.runGreenhousePostgresQuery.mockRejectedValueOnce(new Error('PG connection lost'))

      await expect(
        notionRpaWritebackDemoProjection.refresh(
          { entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' },
          validWritebackPayload
        )
      ).rejects.toThrow('PG connection lost')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          level: 'error',
          tags: expect.objectContaining({ stage: 'read_snapshot' })
        })
      )
    })

    it('throw cuando markSnapshotWritten falla post-PATCH success', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([snapshotRow])
        .mockRejectedValueOnce(new Error('PG UPDATE failed'))
      mocks.patchNotionDemoPage.mockResolvedValueOnce({ id: 'demo-task-uuid-001' })

      await expect(
        notionRpaWritebackDemoProjection.refresh(
          { entityType: 'rpa_snapshot_demo', entityId: 'snap-uuid-001' },
          validWritebackPayload
        )
      ).rejects.toThrow('PG UPDATE failed')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          level: 'error',
          tags: expect.objectContaining({ stage: 'mark_written' })
        })
      )
    })
  })

  describe('projection metadata canonical', () => {
    it('domain === delivery', () => {
      expect(notionRpaWritebackDemoProjection.domain).toBe('delivery')
    })

    it('triggerEvents === notion.task.metrics_writeback_requested.demo', () => {
      expect(notionRpaWritebackDemoProjection.triggerEvents).toEqual([
        'notion.task.metrics_writeback_requested.demo'
      ])
    })

    it('name canonical sibling-pattern', () => {
      expect(notionRpaWritebackDemoProjection.name).toBe('notion_rpa_writeback_demo')
    })

    it('maxRetries === 4 (3 retries + initial)', () => {
      expect(notionRpaWritebackDemoProjection.maxRetries).toBe(4)
    })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  captureWithDomain: vi.fn(),
  patchNotionPage: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

vi.mock('@/lib/space-notion/notion-client', () => ({
  patchNotionPage: mocks.patchNotionPage
}))

import { notionRpaWritebackProjection, __testing__ } from './notion-rpa-writeback'

const { isProductiveWritebackPayload, NOTION_PROPERTY_RPA_V2 } = __testing__

const originalFlag = process.env.NOTION_RPA_WRITEBACK_ENABLED

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.patchNotionPage.mockReset()
  process.env.NOTION_RPA_WRITEBACK_ENABLED = 'true' // default ON for happy-path tests
})

afterEach(() => {
  if (originalFlag === undefined) {
    delete process.env.NOTION_RPA_WRITEBACK_ENABLED
  } else {
    process.env.NOTION_RPA_WRITEBACK_ENABLED = originalFlag
  }
})

const validPayload = {
  schemaVersion: 1,
  taskSourceId: 'efeonce-task-uuid-001',
  workspaceId: 'efeonce',
  rpaValue: 2,
  rpaDataStatus: 'valid',
  snapshotId: 'snap-uuid-001',
  formulaVersion: 'rpa_v2.0',
  computedAt: '2026-05-21T10:00:00Z'
}

const snapshotRow = {
  snapshot_id: 'snap-uuid-001',
  task_source_id: 'efeonce-task-uuid-001',
  rpa_value: 2,
  rpa_data_status: 'valid',
  written_to_notion_at: null,
  notion_writeback_attempt_count: 0
}

describe('TASK-916 Slice 4 — notion-rpa-writeback productive', () => {
  it('NOTION_PROPERTY_RPA_V2 es la propiedad prod [GH] RpA v2', () => {
    expect(NOTION_PROPERTY_RPA_V2).toBe('[GH] RpA v2')
  })

  describe('isProductiveWritebackPayload predicate (defense in depth dual filter)', () => {
    it('returns true para efeonce/sky sin demo_mode', () => {
      expect(isProductiveWritebackPayload(validPayload)).toBe(true)
      expect(isProductiveWritebackPayload({ ...validPayload, workspaceId: 'sky' })).toBe(true)
    })

    it('returns false cuando demo_mode === true', () => {
      expect(
        isProductiveWritebackPayload({ ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } })
      ).toBe(false)
    })

    it('returns false para workspace no productivo', () => {
      expect(isProductiveWritebackPayload({ ...validPayload, workspaceId: 'demo' })).toBe(false)
    })
  })

  describe('extractScope', () => {
    it('extrae snapshot scope', () => {
      expect(notionRpaWritebackProjection.extractScope(validPayload)).toEqual({
        entityType: 'rpa_snapshot',
        entityId: 'snap-uuid-001'
      })
    })

    it('retorna null para demo event', () => {
      expect(
        notionRpaWritebackProjection.extractScope({ ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } })
      ).toBeNull()
    })

    it('retorna null sin snapshotId', () => {
      expect(notionRpaWritebackProjection.extractScope({ ...validPayload, snapshotId: '' })).toBeNull()
    })
  })

  describe('gate NOTION_RPA_WRITEBACK_ENABLED', () => {
    it('skip honest cuando flag OFF (default) — NO lee PG, NO PATCH', async () => {
      delete process.env.NOTION_RPA_WRITEBACK_ENABLED

      const result = await notionRpaWritebackProjection.refresh(
        { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('rpa_writeback:snap-uuid-001:skipped:flag_disabled')
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
      expect(mocks.captureWithDomain).not.toHaveBeenCalled()
    })

    it('skip honest cuando flag es cualquier valor != "true"', async () => {
      process.env.NOTION_RPA_WRITEBACK_ENABLED = 'false'

      const result = await notionRpaWritebackProjection.refresh(
        { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('rpa_writeback:snap-uuid-001:skipped:flag_disabled')
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })
  })

  describe('refresh — happy path PATCH success (flag ON)', () => {
    it('re-reads snapshot, PATCH Notion [GH] RpA v2, marca written', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([snapshotRow]) // readSnapshotForWriteback
        .mockResolvedValueOnce([]) // markSnapshotWritten
      mocks.patchNotionPage.mockResolvedValueOnce({ id: 'efeonce-task-uuid-001' })

      const result = await notionRpaWritebackProjection.refresh(
        { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(mocks.patchNotionPage).toHaveBeenCalledWith('efeonce-task-uuid-001', {
        '[GH] RpA v2': { number: 2 }
      })
      expect(result).toBe('rpa_writeback:snap-uuid-001:written:2')

      const updateCallArgs = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(updateCallArgs[0]).toContain('SET written_to_notion_at = NOW()')
      expect(updateCallArgs[1][0]).toBe('snap-uuid-001')
    })
  })

  describe('refresh — defense in depth skips (flag ON)', () => {
    it('skip silente para demo event', async () => {
      const result = await notionRpaWritebackProjection.refresh(
        { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
        { ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } }
      )

      expect(result).toBeNull()
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })

    it('skip cuando snapshot no existe (idempotent)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      const result = await notionRpaWritebackProjection.refresh(
        { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('rpa_writeback:snap-uuid-001:skipped:snapshot_missing')
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })

    it('skip idempotente cuando ya escrito a Notion', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        { ...snapshotRow, written_to_notion_at: new Date('2026-05-21T09:00:00Z') }
      ])

      const result = await notionRpaWritebackProjection.refresh(
        { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('rpa_writeback:snap-uuid-001:idempotent:already_written')
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })

    it('skip cuando rpa_data_status !== valid', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        { ...snapshotRow, rpa_data_status: 'unavailable', rpa_value: null }
      ])

      const result = await notionRpaWritebackProjection.refresh(
        { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('rpa_writeback:snap-uuid-001:skipped:not_writable')
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })
  })

  describe('refresh — error handling + retry policy (flag ON)', () => {
    it('marca snapshot failed + throw cuando PATCH Notion falla', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([snapshotRow]) // read
        .mockResolvedValueOnce([]) // markSnapshotFailed
      const notionErr = new Error('Notion API PATCH 429: rate limited') as Error & { status?: number }

      notionErr.status = 429
      mocks.patchNotionPage.mockRejectedValueOnce(notionErr)

      await expect(
        notionRpaWritebackProjection.refresh(
          { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
          validPayload
        )
      ).rejects.toThrow('Notion API PATCH 429')

      const failedCallArgs = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(failedCallArgs[0]).toContain('notion_writeback_last_error')
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'error', tags: expect.objectContaining({ stage: 'patch_notion' }) })
      )
    })

    it('throw cuando read snapshot falla', async () => {
      mocks.runGreenhousePostgresQuery.mockRejectedValueOnce(new Error('PG connection lost'))

      await expect(
        notionRpaWritebackProjection.refresh(
          { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
          validPayload
        )
      ).rejects.toThrow('PG connection lost')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'error', tags: expect.objectContaining({ stage: 'read_snapshot' }) })
      )
    })

    it('throw cuando markSnapshotWritten falla post-PATCH success', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([snapshotRow])
        .mockRejectedValueOnce(new Error('PG UPDATE failed'))
      mocks.patchNotionPage.mockResolvedValueOnce({ id: 'efeonce-task-uuid-001' })

      await expect(
        notionRpaWritebackProjection.refresh(
          { entityType: 'rpa_snapshot', entityId: 'snap-uuid-001' },
          validPayload
        )
      ).rejects.toThrow('PG UPDATE failed')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'error', tags: expect.objectContaining({ stage: 'mark_written' }) })
      )
    })
  })

  describe('projection metadata canonical', () => {
    it('domain === delivery', () => {
      expect(notionRpaWritebackProjection.domain).toBe('delivery')
    })

    it('triggerEvents === notion.task.metrics_writeback_requested (sin .demo)', () => {
      expect(notionRpaWritebackProjection.triggerEvents).toEqual(['notion.task.metrics_writeback_requested'])
    })

    it('name canonical sibling-pattern (sin _demo)', () => {
      expect(notionRpaWritebackProjection.name).toBe('notion_rpa_writeback')
    })

    it('maxRetries === 4', () => {
      expect(notionRpaWritebackProjection.maxRetries).toBe(4)
    })
  })
})

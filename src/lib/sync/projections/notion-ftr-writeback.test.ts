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

import { notionFtrWritebackProjection, __testing__ } from './notion-ftr-writeback'

const { isProductiveFtrWritebackPayload, NOTION_PROPERTY_FTR } = __testing__

const originalFlag = process.env.NOTION_FTR_WRITEBACK_ENABLED

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.captureWithDomain.mockReset()
  mocks.patchNotionPage.mockReset()
  process.env.NOTION_FTR_WRITEBACK_ENABLED = 'true' // default ON for happy-path tests
})

afterEach(() => {
  if (originalFlag === undefined) {
    delete process.env.NOTION_FTR_WRITEBACK_ENABLED
  } else {
    process.env.NOTION_FTR_WRITEBACK_ENABLED = originalFlag
  }
})

const validPayload = {
  schemaVersion: 1,
  taskSourceId: 'efeonce-task-uuid-001',
  workspaceId: 'efeonce',
  ftrValue: 'pass' as const,
  ftrDataStatus: 'valid',
  snapshotId: 'snap-uuid-001',
  formulaVersion: 'ftr_v1.0',
  computedAt: '2026-05-24T10:00:00Z'
}

const snapshotRow = {
  snapshot_id: 'snap-uuid-001',
  task_source_id: 'efeonce-task-uuid-001',
  ftr_value: 'pass' as const,
  ftr_data_status: 'valid',
  written_to_notion_at: null,
  notion_writeback_attempt_count: 0
}

describe('TASK-903 Slice 2 — notion-ftr-writeback productive', () => {
  it('NOTION_PROPERTY_FTR es la propiedad prod [GH] FTR', () => {
    expect(NOTION_PROPERTY_FTR).toBe('[GH] FTR')
  })

  describe('isProductiveFtrWritebackPayload predicate (defense in depth dual filter)', () => {
    it('returns true para efeonce/sky sin demo_mode', () => {
      expect(isProductiveFtrWritebackPayload(validPayload)).toBe(true)
      expect(isProductiveFtrWritebackPayload({ ...validPayload, workspaceId: 'sky' })).toBe(true)
    })

    it('returns false cuando demo_mode === true', () => {
      expect(
        isProductiveFtrWritebackPayload({ ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } })
      ).toBe(false)
    })

    it('returns false para workspace no productivo', () => {
      expect(isProductiveFtrWritebackPayload({ ...validPayload, workspaceId: 'demo' })).toBe(false)
    })
  })

  describe('extractScope', () => {
    it('extrae snapshot scope', () => {
      expect(notionFtrWritebackProjection.extractScope(validPayload)).toEqual({
        entityType: 'ftr_snapshot',
        entityId: 'snap-uuid-001'
      })
    })

    it('retorna null para demo / sin snapshotId', () => {
      expect(
        notionFtrWritebackProjection.extractScope({ ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } })
      ).toBeNull()
      expect(notionFtrWritebackProjection.extractScope({ ...validPayload, snapshotId: '' })).toBeNull()
    })
  })

  describe('gate NOTION_FTR_WRITEBACK_ENABLED', () => {
    it('skip honest cuando flag OFF (default) — NO lee PG, NO PATCH', async () => {
      delete process.env.NOTION_FTR_WRITEBACK_ENABLED

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('ftr_writeback:snap-uuid-001:skipped:flag_disabled')
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
      expect(mocks.captureWithDomain).not.toHaveBeenCalled()
    })

    it('skip honest cuando flag es cualquier valor != "true"', async () => {
      process.env.NOTION_FTR_WRITEBACK_ENABLED = 'false'

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('ftr_writeback:snap-uuid-001:skipped:flag_disabled')
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })

    it('override por-cliente OFF gana sobre global ON (apaga un cliente)', async () => {
      process.env.NOTION_FTR_WRITEBACK_ENABLED = 'true'
      process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE = 'false'

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('ftr_writeback:snap-uuid-001:skipped:flag_disabled')
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
      delete process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE
    })

    it('override por-cliente ON habilita aunque el global esté OFF', async () => {
      delete process.env.NOTION_FTR_WRITEBACK_ENABLED
      process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE = 'true'
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([snapshotRow]).mockResolvedValueOnce([])
      mocks.patchNotionPage.mockResolvedValueOnce({ id: 'efeonce-task-uuid-001' })

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('ftr_writeback:snap-uuid-001:written:pass')
      expect(mocks.patchNotionPage).toHaveBeenCalled()
      delete process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE
    })
  })

  describe('refresh — happy path PATCH success (flag ON)', () => {
    it('re-reads snapshot, PATCH Notion [GH] FTR select Pass, marca written', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([snapshotRow]) // readFtrSnapshotForWriteback
        .mockResolvedValueOnce([]) // markFtrSnapshotWritten
      mocks.patchNotionPage.mockResolvedValueOnce({ id: 'efeonce-task-uuid-001' })

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(mocks.patchNotionPage).toHaveBeenCalledWith('efeonce-task-uuid-001', {
        '[GH] FTR': { select: { name: 'Pass' } }
      })
      expect(result).toBe('ftr_writeback:snap-uuid-001:written:pass')

      const updateCallArgs = mocks.runGreenhousePostgresQuery.mock.calls[1]

      expect(updateCallArgs[0]).toContain('SET written_to_notion_at = NOW()')
      expect(updateCallArgs[1][0]).toBe('snap-uuid-001')
    })

    it('PATCH select Fail cuando ftr_value=fail', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([{ ...snapshotRow, ftr_value: 'fail' }])
        .mockResolvedValueOnce([])
      mocks.patchNotionPage.mockResolvedValueOnce({ id: 'efeonce-task-uuid-001' })

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        { ...validPayload, ftrValue: 'fail' }
      )

      expect(mocks.patchNotionPage).toHaveBeenCalledWith('efeonce-task-uuid-001', {
        '[GH] FTR': { select: { name: 'Fail' } }
      })
      expect(result).toBe('ftr_writeback:snap-uuid-001:written:fail')
    })
  })

  describe('refresh — defense in depth skips (flag ON)', () => {
    it('skip silente para demo event', async () => {
      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        { ...validPayload, workspaceId: 'demo', metadata: { demo_mode: true } }
      )

      expect(result).toBeNull()
      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })

    it('skip cuando snapshot no existe (idempotent)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('ftr_writeback:snap-uuid-001:skipped:snapshot_missing')
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })

    it('skip idempotente cuando ya escrito a Notion', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        { ...snapshotRow, written_to_notion_at: new Date('2026-05-24T09:00:00Z') }
      ])

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('ftr_writeback:snap-uuid-001:idempotent:already_written')
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })

    it('skip cuando ftr_data_status !== valid', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        { ...snapshotRow, ftr_data_status: 'unavailable', ftr_value: null }
      ])

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('ftr_writeback:snap-uuid-001:skipped:not_writable')
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })

    it('skip cuando ftr_value null aunque data_status valid (no writable)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        { ...snapshotRow, ftr_value: null }
      ])

      const result = await notionFtrWritebackProjection.refresh(
        { entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' },
        validPayload
      )

      expect(result).toBe('ftr_writeback:snap-uuid-001:skipped:not_writable')
      expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    })
  })

  describe('refresh — error handling + retry policy (flag ON)', () => {
    it('marca snapshot failed + throw cuando PATCH Notion falla', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([snapshotRow]) // read
        .mockResolvedValueOnce([]) // markFtrSnapshotFailed
      const notionErr = new Error('Notion API PATCH 429: rate limited') as Error & { status?: number }

      notionErr.status = 429
      mocks.patchNotionPage.mockRejectedValueOnce(notionErr)

      await expect(
        notionFtrWritebackProjection.refresh({ entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' }, validPayload)
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
        notionFtrWritebackProjection.refresh({ entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' }, validPayload)
      ).rejects.toThrow('PG connection lost')

      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({ level: 'error', tags: expect.objectContaining({ stage: 'read_snapshot' }) })
      )
    })

    it('throw cuando markFtrSnapshotWritten falla post-PATCH success', async () => {
      mocks.runGreenhousePostgresQuery
        .mockResolvedValueOnce([snapshotRow])
        .mockRejectedValueOnce(new Error('PG UPDATE failed'))
      mocks.patchNotionPage.mockResolvedValueOnce({ id: 'efeonce-task-uuid-001' })

      await expect(
        notionFtrWritebackProjection.refresh({ entityType: 'ftr_snapshot', entityId: 'snap-uuid-001' }, validPayload)
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
      expect(notionFtrWritebackProjection.domain).toBe('delivery')
    })

    it('triggerEvents === notion.task.ftr_writeback_requested', () => {
      expect(notionFtrWritebackProjection.triggerEvents).toEqual(['notion.task.ftr_writeback_requested'])
    })

    it('name canonical sibling-pattern (sin _demo)', () => {
      expect(notionFtrWritebackProjection.name).toBe('notion_ftr_writeback')
    })

    it('maxRetries === 4', () => {
      expect(notionFtrWritebackProjection.maxRetries).toBe(4)
    })
  })
})

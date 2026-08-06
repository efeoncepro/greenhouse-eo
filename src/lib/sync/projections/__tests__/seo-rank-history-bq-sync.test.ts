import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1303 Slice 2 — reactive consumer `seo_rank_history_bq_sync`: scope válido solo con
 * seoTargetId + captureDate bien formados, re-lee PG vía el mirror (nunca confía data del
 * payload) y declara no-op honesto cuando PG no tiene filas.
 */

vi.mock('server-only', () => ({}))

const mirrorMock = vi.fn()

vi.mock('@/lib/growth/seo/rank-history-bq-mirror', () => ({
  mirrorRankSnapshotsToBq: (...args: unknown[]) => mirrorMock(...args)
}))

import { seoRankHistoryBqSyncProjection } from '../seo-rank-history-bq-sync'

beforeEach(() => {
  mirrorMock.mockReset().mockResolvedValue({ seoTargetId: 'seot-1', captureDate: '2026-08-06', rowsMirrored: 4 })
})

describe('seoRankHistoryBqSyncProjection', () => {
  it('declara trigger y domain del lane reactivo growth', () => {
    expect(seoRankHistoryBqSyncProjection.domain).toBe('growth')
    expect(seoRankHistoryBqSyncProjection.triggerEvents).toEqual(['growth.seo.rank_snapshot.captured'])
  })

  it('extractScope exige seoTargetId + captureDate YYYY-MM-DD', () => {
    expect(
      seoRankHistoryBqSyncProjection.extractScope({ seoTargetId: 'seot-1', captureDate: '2026-08-06' })
    ).toEqual({ entityType: 'seo_target', entityId: 'seot-1' })

    expect(seoRankHistoryBqSyncProjection.extractScope({ seoTargetId: 'seot-1' })).toBeNull()
    expect(seoRankHistoryBqSyncProjection.extractScope({ seoTargetId: '', captureDate: '2026-08-06' })).toBeNull()
    expect(seoRankHistoryBqSyncProjection.extractScope({ seoTargetId: 'seot-1', captureDate: 'ayer' })).toBeNull()
  })

  it('refresh re-lee PG por (target, captureDate) vía el mirror', async () => {
    const note = await seoRankHistoryBqSyncProjection.refresh(
      { entityType: 'seo_target', entityId: 'seot-1' },
      { seoTargetId: 'seot-1', captureDate: '2026-08-06', snapshotCount: 99 }
    )

    expect(mirrorMock).toHaveBeenCalledWith('seot-1', '2026-08-06')
    expect(note).toBeNull()
  })

  it('0 filas en PG → no-op declarado (replay tras prune no fabrica historia)', async () => {
    mirrorMock.mockResolvedValue({ seoTargetId: 'seot-1', captureDate: '2026-08-06', rowsMirrored: 0 })

    const note = await seoRankHistoryBqSyncProjection.refresh(
      { entityType: 'seo_target', entityId: 'seot-1' },
      { seoTargetId: 'seot-1', captureDate: '2026-08-06' }
    )

    expect(note).toContain('no-op')
  })
})

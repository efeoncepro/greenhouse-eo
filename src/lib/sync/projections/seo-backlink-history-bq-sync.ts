import 'server-only'

import { mirrorBacklinkSnapshotsToBq } from '@/lib/growth/seo/backlinks/backlink-history-bq-mirror'
import { SEO_BACKLINK_SNAPSHOT_CAPTURED_EVENT } from '@/lib/growth/seo/contracts'
import type { ProjectionDefinition } from '@/lib/sync/projection-registry'

const CAPTURE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const seoBacklinkHistoryBqSyncProjection: ProjectionDefinition = {
  name: 'seo_backlink_history_bq_sync',
  description:
    'TASK-1304 — growth.seo.backlink_snapshot.captured → MERGE seo_backlink_snapshots PG → BQ greenhouse_growth_analytics.seo_backlink_history (re-read PG, idempotente por backlink_snapshot_id)',
  domain: 'growth',
  triggerEvents: [SEO_BACKLINK_SNAPSHOT_CAPTURED_EVENT],
  extractScope: payload => {
    const seoTargetId = typeof payload.seoTargetId === 'string' ? payload.seoTargetId.trim() : ''
    const captureDate = typeof payload.captureDate === 'string' ? payload.captureDate.trim() : ''

    if (!seoTargetId || !CAPTURE_DATE_PATTERN.test(captureDate)) return null

    return { entityType: 'seo_target', entityId: seoTargetId }
  },
  refresh: async (scope, payload) => {
    const captureDate = typeof payload.captureDate === 'string' ? payload.captureDate.trim() : ''

    if (!CAPTURE_DATE_PATTERN.test(captureDate)) {
      return 'no-op: captureDate inválido en el payload'
    }

    const result = await mirrorBacklinkSnapshotsToBq(scope.entityId, captureDate)

    if (result.rowsMirrored === 0) {
      return `no-op: 0 snapshots en PG para ${scope.entityId} ${captureDate}`
    }

    return null
  },
  maxRetries: 3
}

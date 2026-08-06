import 'server-only'

/**
 * TASK-1303 — Reactive consumer: `growth.seo.rank_snapshot.captured` → MERGE de los
 * snapshots del (target, capture_date) a BigQuery `greenhouse_growth_analytics.seo_rank_history`.
 *
 * SoT split del módulo SEO (arch §4): PG = ventana caliente ~180d; BQ = historia larga.
 * Re-lee PG (NUNCA confía el payload como source of truth — el payload solo aporta las
 * coordenadas del scope) y MERGEa por `rank_snapshot_id`: idempotente, append-only.
 * Ride del lane reactivo `growth` existente (`ops-reactive-growth`), sin scheduler nuevo.
 */

import { SEO_RANK_SNAPSHOT_CAPTURED_EVENT } from '@/lib/growth/seo/contracts'
import { mirrorRankSnapshotsToBq } from '@/lib/growth/seo/rank-history-bq-mirror'
import type { ProjectionDefinition } from '@/lib/sync/projection-registry'

const CAPTURE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const seoRankHistoryBqSyncProjection: ProjectionDefinition = {
  name: 'seo_rank_history_bq_sync',
  description:
    'TASK-1303 — growth.seo.rank_snapshot.captured → MERGE seo_rank_snapshots PG → BQ greenhouse_growth_analytics.seo_rank_history (re-read PG, idempotente por rank_snapshot_id)',
  domain: 'growth',
  triggerEvents: [SEO_RANK_SNAPSHOT_CAPTURED_EVENT],
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

    const result = await mirrorRankSnapshotsToBq(scope.entityId, captureDate)

    if (result.rowsMirrored === 0) {
      // Evento sin filas en PG (p. ej. replay tras un prune de la ventana caliente):
      // se declara, no se fabrica historia.
      return `no-op: 0 snapshots en PG para ${scope.entityId} ${captureDate}`
    }

    return null
  },
  maxRetries: 3
}

/**
 * TASK-1304 — Reader canónico `readBacklinkProfile` (serie semanal del perfil de
 * enlaces).
 *
 * Sirve SIEMPRE desde `seo_backlink_snapshots` en PG (no live-per-view). La serie es
 * semanal y liviana (~52 puntos/año por target), así que V1 lee solo PG; el mirror BQ
 * (`seo_backlink_history`) existe para el modelo dimensional downstream y quedará como
 * fuente de rango largo cuando la ventana caliente PG se recorte (follow-up declarado).
 *
 * Honest degradation: sin snapshots en el rango → `no_data` (nunca ceros fabricados).
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { BacklinkProfilePoint, BacklinkProfileResult } from '../contracts'
import { isSeoModuleEnabled } from '../flags'
import { resolveSeoAsOf, seoProvenance } from '../lens'
import { resolveSantiagoCaptureDate } from '../rank-capture'

const DEFAULT_RANGE_DAYS = 365
const MAX_RANGE_DAYS = 1825

type SnapshotRow = {
  capture_date: string
  referring_domains: number | null
  backlinks_total: string | null
  domain_rank: string | null
  toxic_share: string | null
  new_lost_delta: Record<string, unknown> | null
}

const toPoint = (row: SnapshotRow): BacklinkProfilePoint => ({
  date: row.capture_date,
  referringDomains: row.referring_domains,
  backlinksTotal: row.backlinks_total !== null ? Number.parseInt(row.backlinks_total, 10) : null,
  domainRank: row.domain_rank !== null ? Number.parseFloat(row.domain_rank) : null,
  toxicShare: row.toxic_share !== null ? Number.parseFloat(row.toxic_share) : null,
  newLostDelta: row.new_lost_delta ?? {}
})

export const readBacklinkProfile = async (
  seoTargetId: string,
  options: { rangeDays?: number } = {}
): Promise<BacklinkProfileResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const rangeDays = Math.min(
    MAX_RANGE_DAYS,
    Math.max(
      1,
      typeof options.rangeDays === 'number' && Number.isFinite(options.rangeDays)
        ? Math.floor(options.rangeDays)
        : DEFAULT_RANGE_DAYS
    )
  )

  try {
    const targetRows = await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id
         FROM greenhouse_growth.seo_targets
        WHERE seo_target_id = $1`,
      [seoTargetId]
    )

    const target = targetRows[0]

    if (!target) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    // Date-math canónico: `CURRENT_DATE - integer` es DATE (nunca EXTRACT EPOCH — TASK-893).
    const rows = await runGreenhousePostgresQuery<SnapshotRow>(
      `SELECT capture_date::text AS capture_date,
              referring_domains,
              backlinks_total::text AS backlinks_total,
              domain_rank::text AS domain_rank,
              toxic_share::text AS toxic_share,
              new_lost_delta
         FROM greenhouse_growth.seo_backlink_snapshots
        WHERE seo_target_id = $1
          AND capture_date >= CURRENT_DATE - ($2::int - 1)
        ORDER BY capture_date`,
      [seoTargetId, rangeDays]
    )

    if (rows.length === 0) {
      return { ok: false, errorCode: 'no_data', status: null }
    }

    const points = rows.map(toPoint)
    const to = resolveSantiagoCaptureDate()
    const fromDate = new Date(`${to}T00:00:00Z`)

    fromDate.setUTCDate(fromDate.getUTCDate() - (rangeDays - 1))

    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      range: { from: fromDate.toISOString().slice(0, 10), to, days: rangeDays },
      points,
      // TASK-1785 — el as-of sale de las filas que ya trajimos: cero SQL nuevo. `to` es el
      // FIN DE LA VENTANA PEDIDA, no una captura, así que no sirve como as-of.
      provenance: [
        seoProvenance({
          section: 'points[]',
          source: 'dataforseo_backlinks',
          capturedAt: resolveSeoAsOf(points.map(point => point.date))
        })
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_backlink_reader' },
      extra: { seoTargetId }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}

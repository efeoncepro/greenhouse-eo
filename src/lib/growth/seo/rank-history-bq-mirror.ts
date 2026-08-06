/**
 * TASK-1303 — Mirror reactivo de `seo_rank_snapshots` → BigQuery
 * `greenhouse_growth_analytics.seo_rank_history` (historia larga del rank tracking).
 *
 * SoT split (arch SEO §4): PG guarda la ventana caliente (~180d); BQ es el SoT de la
 * historia larga. Este mirror corre como consumer reactivo del outbox
 * (`growth.seo.rank_snapshot.captured`, `WHERE status='published'`) — NUNCA inline en el
 * command ni en un route handler.
 *
 * Contrato del consumer (patrón `notion-transition-bq-sync`): re-lee PG por
 * (target, capture_date) — NUNCA confía el payload como source of truth — y MERGEa por
 * `rank_snapshot_id` (idempotente, append-only). Timestamps viajan como STRING y se
 * castean en SQL (`TIMESTAMP(@col)`) — bug class ISSUE-082.
 *
 * El dataset/tabla se crean como paso de ROLLOUT (bq mk documentado en el runbook),
 * nunca auto-create en el hot path (precedente de todos los mirrors del repo).
 */

import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const SEO_RANK_HISTORY_DATASET = 'greenhouse_growth_analytics'
export const SEO_RANK_HISTORY_TABLE = 'seo_rank_history'

type SnapshotRowForBq = {
  rank_snapshot_id: string
  seo_target_id: string
  organization_id: string
  keyword: string
  engine: string
  device: string
  capture_date: string
  position: number | null
  url: string | null
  serp_features: string
  estimated_traffic: string | null
  provider_cost: string
  source_run_id: string | null
  captured_at: string
}

const mergeSnapshotRowToBq = async (row: SnapshotRowForBq): Promise<void> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  await bigQuery.query({
    query: `MERGE \`${projectId}.${SEO_RANK_HISTORY_DATASET}.${SEO_RANK_HISTORY_TABLE}\` T
      USING (
        SELECT
          @rank_snapshot_id AS rank_snapshot_id,
          @seo_target_id AS seo_target_id,
          @organization_id AS organization_id,
          @keyword AS keyword,
          @engine AS engine,
          @device AS device,
          CAST(@capture_date AS DATE) AS capture_date,
          ${row.position !== null ? '@position' : 'CAST(NULL AS INT64)'} AS position,
          ${row.url !== null ? '@url' : 'CAST(NULL AS STRING)'} AS url,
          @serp_features AS serp_features,
          ${row.estimated_traffic !== null ? 'CAST(@estimated_traffic AS NUMERIC)' : 'CAST(NULL AS NUMERIC)'} AS estimated_traffic,
          CAST(@provider_cost AS NUMERIC) AS provider_cost,
          ${row.source_run_id !== null ? '@source_run_id' : 'CAST(NULL AS STRING)'} AS source_run_id,
          TIMESTAMP(@captured_at) AS captured_at
      ) S
      ON T.rank_snapshot_id = S.rank_snapshot_id
      WHEN NOT MATCHED THEN INSERT (
        rank_snapshot_id, seo_target_id, organization_id, keyword, engine, device,
        capture_date, position, url, serp_features, estimated_traffic, provider_cost,
        source_run_id, captured_at
      ) VALUES (
        S.rank_snapshot_id, S.seo_target_id, S.organization_id, S.keyword, S.engine,
        S.device, S.capture_date, S.position, S.url, S.serp_features,
        S.estimated_traffic, S.provider_cost, S.source_run_id, S.captured_at
      )`,
    params: {
      rank_snapshot_id: row.rank_snapshot_id,
      seo_target_id: row.seo_target_id,
      organization_id: row.organization_id,
      keyword: row.keyword,
      engine: row.engine,
      device: row.device,
      capture_date: row.capture_date,
      serp_features: row.serp_features,
      provider_cost: row.provider_cost,
      captured_at: row.captured_at,
      ...(row.position !== null ? { position: row.position } : {}),
      ...(row.url !== null ? { url: row.url } : {}),
      ...(row.estimated_traffic !== null ? { estimated_traffic: row.estimated_traffic } : {}),
      ...(row.source_run_id !== null ? { source_run_id: row.source_run_id } : {})
    },
    types: {
      rank_snapshot_id: 'STRING',
      seo_target_id: 'STRING',
      organization_id: 'STRING',
      keyword: 'STRING',
      engine: 'STRING',
      device: 'STRING',
      capture_date: 'STRING',
      serp_features: 'STRING',
      provider_cost: 'STRING',
      captured_at: 'STRING',
      ...(row.position !== null ? { position: 'INT64' } : {}),
      ...(row.url !== null ? { url: 'STRING' } : {}),
      ...(row.estimated_traffic !== null ? { estimated_traffic: 'STRING' } : {}),
      ...(row.source_run_id !== null ? { source_run_id: 'STRING' } : {})
    }
  })
}

export interface MirrorRankSnapshotsResult {
  seoTargetId: string
  captureDate: string
  rowsMirrored: number
}

/**
 * Espeja a BQ todos los snapshots de un (target, capture_date). Idempotente: el MERGE
 * por `rank_snapshot_id` hace que re-procesar el evento no duplique historia.
 */
export const mirrorRankSnapshotsToBq = async (
  seoTargetId: string,
  captureDate: string
): Promise<MirrorRankSnapshotsResult> => {
  const rows = await runGreenhousePostgresQuery<SnapshotRowForBq>(
    `SELECT s.rank_snapshot_id,
            s.seo_target_id,
            t.organization_id,
            s.keyword,
            s.engine,
            s.device,
            s.capture_date::text AS capture_date,
            s.position,
            s.url,
            s.serp_features::text AS serp_features,
            s.estimated_traffic::text AS estimated_traffic,
            s.provider_cost::text AS provider_cost,
            s.source_run_id,
            to_char(s.captured_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS captured_at
       FROM greenhouse_growth.seo_rank_snapshots s
       JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = s.seo_target_id
      WHERE s.seo_target_id = $1
        AND s.capture_date = $2::date
      ORDER BY s.keyword, s.engine, s.device`,
    [seoTargetId, captureDate]
  )

  for (const row of rows) {
    await mergeSnapshotRowToBq(row)
  }

  return { seoTargetId, captureDate, rowsMirrored: rows.length }
}

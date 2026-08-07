/**
 * TASK-1655 — Mirror de `seo_gsc_daily` → BigQuery
 * `greenhouse_growth_analytics.seo_gsc_history` (SoT del histórico GSC).
 *
 * SoT split (arch SEO §4, mismo contrato que el carril de rank): PG guarda la ventana
 * caliente operativa; **BigQuery es el source of truth de la historia larga**. Medido en
 * vivo (2026-08-07): 5 días de GSC = 27 MB en Cloud SQL con índices — 16 meses de una
 * sola org serían ~GB en la instancia OLTP compartida. El histórico pertenece a OLAP.
 *
 * Dos caminos escriben esta tabla, ambos por el MISMO MERGE idempotente:
 *   1. El batch diario (`runGscDailySnapshotBatch`) espeja cada día materializado en PG.
 *   2. El backfill (`gsc-backfill.ts`) escribe el pasado DIRECTO a BQ, sin pasar por PG —
 *      meter 16 meses en la tabla caliente sería recrear el problema que este split evita.
 *
 * Contrato ISSUE-082: los campos temporales/NUMERIC de los STRUCT viajan como STRING y se
 * castean en SQL (`CAST(@capture_date AS DATE)`, `CAST(s.r AS NUMERIC)`) — el cliente Node
 * de BigQuery escribe NULL silencioso dentro de `ARRAY<STRUCT>` con tipos temporales.
 *
 * El dataset/tabla se crean como paso de ROLLOUT (bq mk, ejecutado 2026-08-07 y
 * documentado en el runbook) — nunca auto-create en el hot path (precedente de todos los
 * mirrors del repo).
 */

import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const SEO_GSC_HISTORY_DATASET = 'greenhouse_growth_analytics'
export const SEO_GSC_HISTORY_TABLE = 'seo_gsc_history'

/**
 * Chunk del MERGE. El límite práctico es el tamaño del request (10 MB); 5.000 structs de
 * query+page van muy por debajo y mantienen cada MERGE en un solo job razonable.
 */
const MERGE_CHUNK_SIZE = 5_000

export interface GscHistoryRow {
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

/**
 * MERGE de un lote de filas de UN día/org. Idempotente por
 * `(organization_id, capture_date, query, page)` — la misma clave del UPSERT de PG — y
 * con UPDATE en match: GSC consolida sus métricas con ~48h de retraso, así que
 * re-materializar un día CORRIGE el valor en ambos stores por igual.
 */
export const mergeGscHistoryRowsToBq = async (input: {
  organizationId: string
  siteUrl: string
  captureDate: string
  rows: GscHistoryRow[]
}): Promise<number> => {
  if (input.rows.length === 0) {
    return 0
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  for (let index = 0; index < input.rows.length; index += MERGE_CHUNK_SIZE) {
    const chunk = input.rows.slice(index, index + MERGE_CHUNK_SIZE)

    await bigQuery.query({
      query: `MERGE \`${projectId}.${SEO_GSC_HISTORY_DATASET}.${SEO_GSC_HISTORY_TABLE}\` T
        USING (
          SELECT @organization_id AS organization_id,
                 @site_url AS site_url,
                 CAST(@capture_date AS DATE) AS capture_date,
                 s.q AS query,
                 s.p AS page,
                 s.c AS clicks,
                 s.i AS impressions,
                 CAST(s.r AS NUMERIC) AS ctr,
                 CAST(s.pos AS NUMERIC) AS position
            FROM UNNEST(@rows) s
        ) S
        ON T.organization_id = S.organization_id
       AND T.capture_date = S.capture_date
       AND T.query = S.query
       AND T.page = S.page
        WHEN MATCHED THEN UPDATE SET
          clicks = S.clicks,
          impressions = S.impressions,
          ctr = S.ctr,
          position = S.position,
          site_url = S.site_url,
          materialized_at = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN INSERT (
          organization_id, site_url, capture_date, query, page,
          clicks, impressions, ctr, position, materialized_at
        ) VALUES (
          S.organization_id, S.site_url, S.capture_date, S.query, S.page,
          S.clicks, S.impressions, S.ctr, S.position, CURRENT_TIMESTAMP()
        )`,
      params: {
        organization_id: input.organizationId,
        site_url: input.siteUrl,
        capture_date: input.captureDate,
        // NUMERIC como STRING dentro del STRUCT (ISSUE-082): el CAST vive en el SQL.
        rows: chunk.map(row => ({
          q: row.query,
          p: row.page,
          c: row.clicks,
          i: row.impressions,
          r: String(row.ctr),
          pos: String(row.position)
        }))
      },
      types: {
        organization_id: 'STRING',
        site_url: 'STRING',
        capture_date: 'STRING',
        rows: [{ q: 'STRING', p: 'STRING', c: 'INT64', i: 'INT64', r: 'STRING', pos: 'STRING' }]
      }
    })
  }

  return input.rows.length
}

export interface MirrorGscDailyResult {
  organizationId: string
  captureDate: string
  rowsMirrored: number
}

/**
 * Espeja a BQ un día ya materializado en PG (el camino del batch diario). Re-lee PG —
 * nunca confía un payload en memoria como source of truth (patrón del mirror de rank).
 */
export const mirrorGscDailyToBq = async (
  organizationId: string,
  captureDate: string
): Promise<MirrorGscDailyResult> => {
  interface PgDayRow extends Record<string, unknown> {
    query: string
    page: string
    clicks: string | number
    impressions: string | number
    ctr: string | number
    position: string | number
    site_url: string
  }

  const rows = await runGreenhousePostgresQuery<PgDayRow>(
    `SELECT query,
            page,
            clicks,
            impressions,
            ctr,
            position,
            site_url
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1
        AND capture_date = $2::date
      ORDER BY query, page`,
    [organizationId, captureDate]
  )

  if (rows.length === 0) {
    return { organizationId, captureDate, rowsMirrored: 0 }
  }

  const rowsMirrored = await mergeGscHistoryRowsToBq({
    organizationId,
    siteUrl: String(rows[0].site_url),
    captureDate,
    rows: rows.map(row => ({
      query: row.query,
      page: row.page,
      clicks: Number(row.clicks),
      impressions: Number(row.impressions),
      ctr: Number(row.ctr),
      position: Number(row.position)
    }))
  })

  return { organizationId, captureDate, rowsMirrored }
}

/** Fechas que YA existen en BQ para una org (el backfill las salta — resumibilidad). */
export const listGscHistoryDates = async (organizationId: string): Promise<Set<string>> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `SELECT CAST(capture_date AS STRING) AS date
              FROM \`${projectId}.${SEO_GSC_HISTORY_DATASET}.${SEO_GSC_HISTORY_TABLE}\`
             WHERE organization_id = @organization_id
             GROUP BY capture_date`,
    params: { organization_id: organizationId },
    types: { organization_id: 'STRING' }
  })

  return new Set((rows as Array<{ date: string }>).map(row => row.date))
}

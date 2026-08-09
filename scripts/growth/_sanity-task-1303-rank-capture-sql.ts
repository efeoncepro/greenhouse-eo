/**
 * TASK-1303 — sanity live (read-only) de la SQL embebida contra PG real (gate TASK-893).
 * El INSERT se valida con PREPARE/DEALLOCATE (parsea columnas/tipos sin escribir).
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

import { getGreenhousePostgresPool, runGreenhousePostgresQuery } from '@/lib/postgres/client'

const main = async () => {
  // 1. Target real
  const targets = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT seo_target_id, organization_id, root_domain, location_code, language_code, status
       FROM greenhouse_growth.seo_targets
      ORDER BY created_at ASC
      LIMIT 3`
  )

  console.log('[1] targets:', targets.map(t => `${t.seo_target_id} ${t.root_domain} ${t.status}`))

  const target = targets[0]

  if (!target) throw new Error('no hay seo_targets — sanity incompleta')

  const targetId = String(target.seo_target_id)

  // 2. Keywords vigentes
  const keywords = await runGreenhousePostgresQuery<{ keyword: string }>(
    `SELECT DISTINCT m.keyword
       FROM greenhouse_growth.seo_keyword_set_members m
       JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
      WHERE s.seo_target_id = $1
        AND m.effective_to IS NULL
      ORDER BY m.keyword`,
    [targetId]
  )

  console.log('[2] keywords vigentes:', keywords.length)

  // 3. Pre-check de combos capturados hoy
  const existing = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT keyword, engine, device
       FROM greenhouse_growth.seo_rank_snapshots
      WHERE seo_target_id = $1
        AND capture_date = $2::date`,
    [targetId, '2026-08-06']
  )

  console.log('[3] pre-check existing hoy:', existing.length)

  // 4. INSERT validado con PREPARE (sin ejecutar)
  const pool = await getGreenhousePostgresPool()
  const client = await pool.connect()

  try {
    await client.query(
      `PREPARE task1303_insert (text, text, text, text, date, int, text, jsonb, numeric, text) AS
       INSERT INTO greenhouse_growth.seo_rank_snapshots (
         seo_target_id, keyword, engine, device, capture_date,
         position, url, serp_features, provider_cost, source_run_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (seo_target_id, keyword, engine, device, capture_date) DO NOTHING`
    )
    await client.query('DEALLOCATE task1303_insert')
    console.log('[4] INSERT ON CONFLICT DO NOTHING: PREPARE ok (columnas/tipos/constraint válidos)')
  } finally {
    client.release()
  }

  // 5. Elegibilidad del batch
  const eligible = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT t.seo_target_id, t.organization_id
       FROM greenhouse_growth.seo_targets t
      WHERE t.status = 'active'
        AND EXISTS (
          SELECT 1
            FROM greenhouse_client_portal.module_assignments ma
           WHERE ma.organization_id = t.organization_id
             AND ma.module_key = $1
             AND ma.effective_to IS NULL
             AND ma.status IN ('active', 'pilot')
        )
      ORDER BY t.seo_target_id`,
    ['seo_v2']
  )

  console.log('[5] targets elegibles batch:', eligible.map(r => r.seo_target_id))

  // 6. Signal lag
  const lag = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT
       t.seo_target_id,
       (CURRENT_DATE - MAX(s.capture_date))::int AS lag_days
     FROM greenhouse_growth.seo_targets t
     LEFT JOIN greenhouse_growth.seo_rank_snapshots s
       ON s.seo_target_id = t.seo_target_id
     WHERE t.status = 'active'
       AND EXISTS (
         SELECT 1
           FROM greenhouse_client_portal.module_assignments ma
          WHERE ma.organization_id = t.organization_id
            AND ma.module_key = 'seo_v2'
            AND ma.effective_to IS NULL
            AND ma.status IN ('active', 'pilot')
       )
     GROUP BY t.seo_target_id`
  )

  console.log('[6] signal lag rows:', JSON.stringify(lag))

  // 7. Evolution PG (hot window)
  const evolution = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT keyword,
            capture_date::text AS date,
            position,
            url
       FROM greenhouse_growth.seo_rank_snapshots
      WHERE seo_target_id = $1
        AND engine = $2
        AND device = $3
        AND capture_date >= CURRENT_DATE - ($4::int - 1)
        AND keyword = ANY($5)
      ORDER BY keyword, capture_date`,
    [targetId, 'google', 'desktop', 90, ['sanity-keyword']]
  )

  console.log('[7] evolution query (con filtro ANY):', evolution.length)

  // 8. Mirror read (join + serialización)
  const mirror = await runGreenhousePostgresQuery<Record<string, unknown>>(
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
    [targetId, '2026-08-06']
  )

  console.log('[8] mirror read:', mirror.length)

  console.log('SANITY OK — 8/8 queries válidas contra PG real')
  process.exit(0)
}

main().catch(error => {
  console.error('SANITY FAILED:', error)
  process.exit(1)
})

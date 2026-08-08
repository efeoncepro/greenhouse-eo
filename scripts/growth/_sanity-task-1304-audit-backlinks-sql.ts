/**
 * TASK-1304 — Sanity live del SQL embebido de site audit + backlinks contra PG real.
 *
 * Gate TASK-893: todo SQL con COALESCE/CASE/date-math/FILTER se ejercita contra
 * PostgreSQL real antes de mergear — los mocks Vitest validan el TS, no el type
 * alignment del SQL. Ejercita: pre-checks del queue, INSERT del run, claim
 * `FOR UPDATE SKIP LOCKED` con el cómputo de `gave_up` por intervalo, UPDATE de
 * materialización, INSERT de findings, queries de ambos readers, INSERT idempotente de
 * backlink snapshot (`ON CONFLICT DO NOTHING`), re-reads de los mirrors BQ (rollup
 * `COUNT(*) FILTER`) y la query de la signal `seo.audit.stuck_tasks`.
 *
 * ⚠️ Los statements son copias de los módulos (los módulos usan el pool por dentro y no
 * verían esta transacción). Si un statement productivo cambia, actualizar acá — el
 * propósito es el type alignment contra el schema real, no el lockstep literal.
 *
 * Todo corre dentro de `withGreenhousePostgresTransaction` (cliente FIJADO — el pool
 * por-llamada rompe BEGIN/ROLLBACK, lección 25P01) y aborta con un sentinel al final:
 * cero residuo en las tablas append-only.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1304-audit-backlinks-sql.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const ROLLBACK_SENTINEL = 'sanity-rollback'

let passed = 0

const check = (label: string, condition: boolean, detail?: unknown) => {
  if (!condition) {
    throw new Error(`FAIL ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`)
  }

  passed += 1
  console.log(`  ✓ ${label}`)
}

const main = async () => {
  const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')

  try {
    await withGreenhousePostgresTransaction(async client => {
      const rows = async <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
        (await client.query(sql, params)).rows as T[]

      // Un target activo real (el dominio ya está vivo post TASK-1303).
      const targets = await rows<{ seo_target_id: string; organization_id: string; root_domain: string }>(
        `SELECT seo_target_id, organization_id, root_domain
           FROM greenhouse_growth.seo_targets
          WHERE status = 'active'
          ORDER BY created_at
          LIMIT 1`
      )

      check('target activo disponible', targets.length === 1, targets)
      const target = targets[0]

      // 1. Pre-check del queue (guard anti doble-encolado).
      await rows(
        `SELECT status, capture_date::text AS capture_date
           FROM greenhouse_growth.seo_site_audit_runs
          WHERE seo_target_id = $1
            AND (status = 'running' OR (capture_date = $2::date AND status = 'succeeded'))`,
        [target.seo_target_id, '2026-08-06']
      )
      check('queue pre-check tipa contra el schema real', true)

      // 2. INSERT del run (fase enqueue).
      const runRows = await rows<{ audit_run_id: string }>(
        `INSERT INTO greenhouse_growth.seo_site_audit_runs (
           seo_target_id, capture_date, status, provider_task_id, provider_cost, started_at
         )
         VALUES ($1, $2::date, 'running', $3, $4, NOW())
         RETURNING audit_run_id`,
        [target.seo_target_id, '2026-08-06', `sanity-task-${Date.now()}`, 0.0123]
      )

      check('INSERT del run retorna audit_run_id', runRows.length === 1)
      const auditRunId = runRows[0].audit_run_id

      // 3. Listado de pendientes del collect.
      const pending = await rows<{ audit_run_id: string }>(
        `SELECT audit_run_id
           FROM greenhouse_growth.seo_site_audit_runs
          WHERE status = 'running'
            AND provider_task_id IS NOT NULL
          ORDER BY created_at`
      )

      check('collect pending ve el run insertado', pending.some(row => row.audit_run_id === auditRunId))

      // 4. Claim atómico con cómputo de gave_up por intervalo (nunca EXTRACT EPOCH DATE-DATE).
      const claimed = await rows<{ audit_run_id: string; gave_up: boolean; capture_date: string }>(
        `SELECT r.audit_run_id,
                r.seo_target_id,
                t.organization_id,
                r.capture_date::text AS capture_date,
                r.provider_task_id,
                (NOW() - COALESCE(r.started_at, r.created_at)) >= ($2::int * INTERVAL '1 hour') AS gave_up
           FROM greenhouse_growth.seo_site_audit_runs r
           JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = r.seo_target_id
          WHERE r.audit_run_id = $1
            AND r.status = 'running'
            AND r.provider_task_id IS NOT NULL
            FOR UPDATE OF r SKIP LOCKED`,
        [auditRunId, 24]
      )

      check('claim FOR UPDATE SKIP LOCKED + gave_up boolean', claimed.length === 1 && claimed[0].gave_up === false)

      // 5. Materialización: UPDATE del run + INSERT de findings.
      await rows(
        `UPDATE greenhouse_growth.seo_site_audit_runs
            SET status = $2,
                crawled_pages = $3,
                health_score = $4,
                finished_at = NOW()
          WHERE audit_run_id = $1`,
        [auditRunId, 'succeeded', 12, 87.5]
      )
      check('UPDATE de materialización tipa (status/crawled/health)', true)

      await rows(
        `INSERT INTO greenhouse_growth.seo_site_audit_findings (audit_run_id, url, issue_type, severity, detail)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [auditRunId, 'https://sanity.example/rota', 'is_4xx_code', 'critical', JSON.stringify({ httpStatusCode: 404 })]
      )
      check('INSERT de finding pasa el CHECK de severidad', true)

      // 6. Reader del audit: último run + findings ordenados por severidad.
      const latestRun = await rows<{ audit_run_id: string; health_score: string | null }>(
        `SELECT audit_run_id,
                capture_date::text AS capture_date,
                status,
                crawled_pages,
                health_score::text AS health_score,
                to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
                to_char(finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS finished_at
           FROM greenhouse_growth.seo_site_audit_runs
          WHERE seo_target_id = $1
          ORDER BY created_at DESC
          LIMIT 1`,
        [target.seo_target_id]
      )

      check('reader: último run del target', latestRun[0]?.audit_run_id === auditRunId)

      const findings = await rows<{ severity: string }>(
        `SELECT url, issue_type, severity, detail
           FROM greenhouse_growth.seo_site_audit_findings
          WHERE audit_run_id = $1
          ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
                   issue_type, url`,
        [auditRunId]
      )

      check('reader: findings con orden por severidad', findings.length === 1 && findings[0].severity === 'critical')

      // 7. Mirror BQ del audit: re-read con rollup COUNT(*) FILTER.
      const mirrorRun = await rows<{ findings_critical: number; health_score: string | null }>(
        `SELECT r.audit_run_id,
                r.seo_target_id,
                t.organization_id,
                r.capture_date::text AS capture_date,
                r.status,
                r.crawled_pages,
                r.health_score::text AS health_score,
                r.provider_cost::text AS provider_cost,
                COUNT(*) FILTER (WHERE f.severity = 'critical')::int AS findings_critical,
                COUNT(*) FILTER (WHERE f.severity = 'warning')::int AS findings_warning,
                COUNT(*) FILTER (WHERE f.severity = 'notice')::int AS findings_notice,
                to_char(r.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS started_at,
                to_char(r.finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS finished_at
           FROM greenhouse_growth.seo_site_audit_runs r
           JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = r.seo_target_id
           LEFT JOIN greenhouse_growth.seo_site_audit_findings f ON f.audit_run_id = r.audit_run_id
          WHERE r.audit_run_id = $1
            AND r.status IN ('succeeded', 'degraded', 'failed')
          GROUP BY r.audit_run_id, r.seo_target_id, t.organization_id, r.capture_date, r.status,
                   r.crawled_pages, r.health_score, r.provider_cost, r.started_at, r.finished_at`,
        [auditRunId]
      )

      check('mirror audit: rollup FILTER por severidad', mirrorRun[0]?.findings_critical === 1)

      // 8. Signal seo.audit.stuck_tasks (el run ya no está running: 0 filas con este id).
      const stuck = await rows<{ is_warn: boolean }>(
        `SELECT
           r.audit_run_id,
           r.seo_target_id,
           (NOW() - COALESCE(r.started_at, r.created_at)) >= ($1::int * INTERVAL '1 hour') AS is_warn,
           (NOW() - COALESCE(r.started_at, r.created_at)) >= ($2::int * INTERVAL '1 hour') AS is_error
         FROM greenhouse_growth.seo_site_audit_runs r
         WHERE r.status = 'running'`,
        [6, 30]
      )

      check('signal stuck_tasks tipa (intervalos booleanos)', Array.isArray(stuck))

      // 9. Backlinks: pre-check + INSERT idempotente + serie del reader + re-read del mirror.
      await rows(
        `SELECT backlink_snapshot_id
           FROM greenhouse_growth.seo_backlink_snapshots
          WHERE seo_target_id = $1
            AND capture_date = $2::date`,
        [target.seo_target_id, '2026-08-06']
      )
      check('backlink pre-check tipa', true)

      const backlinkInsert = await rows<{ backlink_snapshot_id: string }>(
        `INSERT INTO greenhouse_growth.seo_backlink_snapshots (
           seo_target_id, capture_date, referring_domains, backlinks_total, domain_rank,
           toxic_share, new_lost_delta, provider_cost
         )
         VALUES ($1, $2::date, $3, $4, $5, $6, $7::jsonb, $8)
         ON CONFLICT (seo_target_id, capture_date) DO NOTHING
         RETURNING backlink_snapshot_id`,
        [
          target.seo_target_id,
          '2099-01-01', // fecha sentinel imposible de colisionar con capturas reales
          312,
          12480,
          38.5,
          0.22,
          JSON.stringify({ newBacklinks: 45, lostBacklinks: 12, windowDays: 30 }),
          0.045
        ]
      )

      check('backlink INSERT idempotente retorna id', backlinkInsert.length === 1)

      const conflictRows = await rows<{ backlink_snapshot_id: string }>(
        `INSERT INTO greenhouse_growth.seo_backlink_snapshots (
           seo_target_id, capture_date, referring_domains, backlinks_total, domain_rank,
           toxic_share, new_lost_delta, provider_cost
         )
         VALUES ($1, $2::date, $3, $4, $5, $6, $7::jsonb, $8)
         ON CONFLICT (seo_target_id, capture_date) DO NOTHING
         RETURNING backlink_snapshot_id`,
        [target.seo_target_id, '2099-01-01', 1, 1, 1, 0, '{}', 0]
      )

      check('re-INSERT mismo capture_date NO duplica (DO NOTHING)', conflictRows.length === 0)

      const series = await rows<{ capture_date: string }>(
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
        [target.seo_target_id, 36500]
      )

      check('reader backlinks: serie con date-math CURRENT_DATE - int', series.length >= 1)

      const mirrorBacklink = await rows<{ backlink_snapshot_id: string }>(
        `SELECT s.backlink_snapshot_id,
                s.seo_target_id,
                t.organization_id,
                s.capture_date::text AS capture_date,
                s.referring_domains,
                s.backlinks_total::text AS backlinks_total,
                s.domain_rank::text AS domain_rank,
                s.toxic_share::text AS toxic_share,
                s.new_lost_delta::text AS new_lost_delta,
                s.provider_cost::text AS provider_cost,
                to_char(s.captured_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS captured_at
           FROM greenhouse_growth.seo_backlink_snapshots s
           JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = s.seo_target_id
          WHERE s.seo_target_id = $1
            AND s.capture_date = $2::date`,
        [target.seo_target_id, '2099-01-01']
      )

      check('mirror backlinks: re-read serializado a STRING', mirrorBacklink.length === 1)

      // 10. Batch de elegibilidad (mismo predicado de vigencia del entitlement).
      await rows(
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
      check('predicado de elegibilidad del batch tipa', true)

      throw new Error(ROLLBACK_SENTINEL)
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK_SENTINEL) {
      throw error
    }
  }

  console.log(`\nOK — ${passed} checks SQL live verdes (transacción abortada, cero residuo).`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\nSANITY FAILED:', error instanceof Error ? error.message : error)
    process.exit(1)
  })

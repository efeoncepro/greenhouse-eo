/**
 * TASK-1777 — Sanity del SQL embebido contra PG REAL (gate TASK-893).
 *
 * A diferencia de los sanity de 1775/1776, acá el DML corre DENTRO de una transacción con
 * ROLLBACK deliberado: las tablas hijas cuelgan de `seo_backlink_snapshots`, y un snapshot
 * sintético committeado contaminaría la serie REAL del target (readBacklinkProfile lo
 * mostraría). Un solo client ve sus propias filas sin publicarlas.
 *
 * Ejercita: FKs + CHECKs + UNIQUEs de las 3 tablas (INSERTs verbatim del módulo), la query
 * del pase (LATERAL + EXISTS), las queries del reader y la del signal (FILTER + ::int).
 *
 * Uso (proxy Cloud SQL arriba en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1777-backlink-detail.ts
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

import {
  closeGreenhousePostgres,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '../../src/lib/postgres/client'
import { SEO_MODULE_KEYS_READ } from '../../src/lib/growth/seo/entitlement'
import { getSeoBacklinkDrilldownFailuresSignal } from '../../src/lib/reliability/queries/seo-backlink-drilldown-failures'

const fail = (message: string): never => {
  console.error(`[sanity] FALLÓ: ${message}`)
  process.exit(1)
}

class RollbackSentinel extends Error {}

const main = async () => {
  const orgs = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT organization_id FROM greenhouse_core.organizations ORDER BY organization_id LIMIT 1`
  )

  const organizationId = orgs[0]?.organization_id

  if (!organizationId) return fail('no hay organizaciones en la base')

  // ── DML en transacción con ROLLBACK (un solo client ve sus filas sin publicarlas) ──
  try {
    await withGreenhousePostgresTransaction(async client => {
      const target = await client.query(
        `INSERT INTO greenhouse_growth.seo_targets
           (organization_id, root_domain, location_code, language_code, status, created_by)
         VALUES ($1, 'task-1777-sanity.invalid', '2152', 'es', 'paused', 'sanity-task-1777')
         RETURNING seo_target_id`,
        [organizationId]
      )

      const seoTargetId = target.rows[0].seo_target_id as string

      const snapshot = await client.query(
        `INSERT INTO greenhouse_growth.seo_backlink_snapshots
           (seo_target_id, capture_date, referring_domains, backlinks_total, domain_rank,
            toxic_share, new_lost_delta, provider_cost)
         VALUES ($1, CURRENT_DATE, 100, 500, 42.5, 0.12,
                 '{"newBacklinks": 20, "lostBacklinks": 5, "windowDays": 30}'::jsonb, 0)
         RETURNING backlink_snapshot_id`,
        [seoTargetId]
      )

      const snapshotId = snapshot.rows[0].backlink_snapshot_id as string

      // Veredicto (mismo SQL del writer del módulo).
      const verdict = await client.query(
        `INSERT INTO greenhouse_growth.seo_backlink_drilldowns
           (backlink_snapshot_id, outcome, trigger_reason, referring_domain_rows, anchor_rows,
            provider_cost, error_code)
         VALUES ($1, 'drilled', 'backlink_movement', 2, 1, 0, NULL)
         ON CONFLICT ON CONSTRAINT seo_backlink_drilldowns_snapshot_unique DO NOTHING
         RETURNING backlink_drilldown_id`,
        [snapshotId]
      )

      if (verdict.rows.length !== 1) throw new Error('el veredicto no insertó')

      // Dominio referente (con movement del CHECK cerrado) + anchor (hash de 64).
      await client.query(
        `INSERT INTO greenhouse_growth.seo_backlink_referring_domains
           (backlink_snapshot_id, normalized_referring_domain, referring_domain, movement,
            rank, backlinks_to_target, backlink_spam_score, first_seen, lost_date,
            sample_url_from, sample_url_to, sample_anchor, sample_dofollow)
         VALUES ($1, 'nuevo.invalid', 'nuevo.invalid', 'new', 35.5, 2, 10.25,
                 '2026-08-20 00:00:00+00', NULL, 'https://nuevo.invalid/x', NULL, 'cliente', TRUE)
         ON CONFLICT ON CONSTRAINT seo_backlink_ref_domains_unique DO NOTHING`,
        [snapshotId]
      )

      await client.query(
        `INSERT INTO greenhouse_growth.seo_backlink_anchors
           (backlink_snapshot_id, anchor_text_hash, anchor, backlinks, referring_domains,
            rank, backlink_spam_score, first_seen)
         VALUES ($1, repeat('a', 64), 'cliente', 40, 5, 30.0, 8.5, NULL)
         ON CONFLICT ON CONSTRAINT seo_backlink_anchors_unique DO NOTHING`,
        [snapshotId]
      )

      // Un movement fuera del vocabulario DEBE romper (CHECK cerrado).
      let checkRejected = false

      try {
        await client.query('SAVEPOINT bad_movement')
        await client.query(
          `INSERT INTO greenhouse_growth.seo_backlink_referring_domains
             (backlink_snapshot_id, normalized_referring_domain, referring_domain, movement)
           VALUES ($1, 'otro.invalid', 'otro.invalid', 'renamed')`,
          [snapshotId]
        )
      } catch {
        checkRejected = true
        await client.query('ROLLBACK TO SAVEPOINT bad_movement')
      }

      if (!checkRejected) throw new Error('el CHECK de movement aceptó un cuarto valor')

      // Query del reader (verbatim del módulo) sobre las filas del tx.
      const readerVerdict = await client.query(
        `SELECT d.backlink_snapshot_id,
                s.capture_date::text AS capture_date,
                t.organization_id,
                t.root_domain,
                d.outcome,
                d.trigger_reason,
                d.error_code
           FROM greenhouse_growth.seo_backlink_drilldowns d
           JOIN greenhouse_growth.seo_backlink_snapshots s
             ON s.backlink_snapshot_id = d.backlink_snapshot_id
           JOIN greenhouse_growth.seo_targets t
             ON t.seo_target_id = s.seo_target_id
          WHERE s.seo_target_id = $1
            AND ($2::date IS NULL OR s.capture_date = $2::date)
          ORDER BY s.capture_date DESC
          LIMIT 1`,
        [seoTargetId, null]
      )

      if (readerVerdict.rows[0]?.outcome !== 'drilled') throw new Error('la query del veredicto no resolvió')

      // Query del pase (LATERAL + EXISTS + anti re-evaluación) — el snapshot YA evaluado
      // no debe aparecer.
      const passRows = await client.query(
        `SELECT s.backlink_snapshot_id
           FROM greenhouse_growth.seo_backlink_snapshots s
           JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = s.seo_target_id
           LEFT JOIN LATERAL (
             SELECT p.referring_domains
               FROM greenhouse_growth.seo_backlink_snapshots p
              WHERE p.seo_target_id = s.seo_target_id
                AND p.capture_date < s.capture_date
              ORDER BY p.capture_date DESC
              LIMIT 1
           ) prev ON TRUE
          WHERE s.seo_target_id = $1
            AND NOT EXISTS (
              SELECT 1 FROM greenhouse_growth.seo_backlink_drilldowns d
               WHERE d.backlink_snapshot_id = s.backlink_snapshot_id
            )`,
        [seoTargetId]
      )

      if (passRows.rows.length !== 0) throw new Error('el pre-check del pase re-evaluaría un snapshot con veredicto')

      console.log('[sanity] DML OK — FKs, CHECKs (movement rechazó un 4.º valor), UNIQUEs, reader y pase verificados en tx')

      throw new RollbackSentinel('rollback deliberado')
    })
  } catch (error) {
    if (!(error instanceof RollbackSentinel)) throw error
  }

  // ── SELECTs read-only contra la base real (sintaxis LATERAL/FILTER/::int en vivo) ──
  const passSyntax = await runGreenhousePostgresQuery(
    `SELECT s.backlink_snapshot_id
       FROM greenhouse_growth.seo_backlink_snapshots s
       JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = s.seo_target_id
      WHERE s.capture_date = CURRENT_DATE
        AND t.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_growth.seo_backlink_drilldowns d
           WHERE d.backlink_snapshot_id = s.backlink_snapshot_id
        )
        AND EXISTS (
          SELECT 1
            FROM greenhouse_client_portal.module_assignments ma
           WHERE ma.organization_id = t.organization_id
             AND ma.module_key = ANY($1::text[])
             AND ma.effective_to IS NULL
             AND ma.status IN ('active', 'pilot')
        )
      LIMIT 1`,
    [[...SEO_MODULE_KEYS_READ]]
  )

  console.log(`[sanity] query del pase OK contra base real (${passSyntax.length} snapshot(s) de hoy sin veredicto)`)

  const signal = await getSeoBacklinkDrilldownFailuresSignal()

  if (signal.severity === 'unknown') return fail(`signal en unknown: ${signal.summary}`)

  console.log(`[sanity] signal OK — severity=${signal.severity}: ${signal.summary}`)
  console.log('[sanity] TODO OK (rollback aplicado: cero residuo en la serie real)')
}

main()
  .catch(error => {
    console.error('[sanity] FALLÓ:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })

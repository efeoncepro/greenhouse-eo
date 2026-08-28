/**
 * TASK-1700 — Sanity live del esquema de la cola priorizada (PG real, SIN residuo).
 *
 * Corre con el proxy Cloud SQL arriba:
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/growth/_sanity-seo-work-queue-schema.ts
 *
 * 🔴 Por qué existe: un trigger `FOR EACH ROW` **no dispara sobre una tabla vacía**. Verificar
 * el append-only con un `UPDATE` que matchea cero filas devuelve éxito y deja creer que la
 * protección está puesta cuando nadie la ejercitó (falso verde documentado en el cierre de
 * TASK-1692). Acá se inserta fila real, se intenta mutarla, y recién eso prueba el trigger.
 *
 * Las tablas son append-only (DELETE prohibido), así que la limpieza no puede ser un DELETE
 * en `finally`: todo corre dentro de `withTransaction` y la transacción se aborta con un
 * sentinel. Rollback real sobre UNA conexión — el anti-patrón que evita es el BEGIN/ROLLBACK
 * cross-pool, que no es transaccional (25P01).
 */

import { withTransaction } from '../../src/lib/db'
import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import { ACTIVE_PRIORITY_SCORE_VERSION } from '../../src/lib/growth/seo/work-queue/score-versions'

const TARGET = 'seot-berel-mx'
const SENTINEL = 'sanity-task-1700-rollback'
/** Hash imposible de una corrida real: jamás colisiona con un snapshot productivo. */
const SANITY_HASH = 'sanity-task-1700-0000000000000000'

let pass = 0
let fail = 0

const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) {
    pass += 1
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    fail += 1
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const main = async () => {
  // ── 1. Estructura declarada, leída del catálogo (no del archivo de migración) ──
  const tables = await runGreenhousePostgresQuery<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'greenhouse_growth'
        AND table_name IN ('seo_work_queue_snapshots','seo_work_queue_items','seo_work_queue_decisions')
      ORDER BY table_name`
  )

  check('las 3 tablas existen', tables.length === 3, tables.map(t => t.table_name).join(', '))

  const constraints = await runGreenhousePostgresQuery<{ conname: string }>(
    `SELECT conname FROM pg_constraint
      WHERE conname IN ('seo_work_queue_snapshots_idempotency_unique',
                        'seo_work_queue_items_basis_band_score',
                        'seo_work_queue_items_aeo_requires_source_version',
                        'seo_work_queue_items_unique_subject')
      ORDER BY conname`
  )

  check('los 4 constraints load-bearing existen', constraints.length === 4, constraints.map(c => c.conname).join(', '))

  const triggers = await runGreenhousePostgresQuery<{ tgname: string }>(
    `SELECT t.tgname FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'greenhouse_growth' AND NOT t.tgisinternal
        AND t.tgname LIKE 'trg_seo_work_queue_%_append_only'
      ORDER BY t.tgname`
  )

  check('los 3 triggers append-only existen', triggers.length === 3, triggers.map(t => t.tgname).join(', '))

  // El GRANT es la SEGUNDA capa: aunque alguien dropee el trigger, runtime no puede mutar.
  const badGrants = await runGreenhousePostgresQuery<{ table_name: string; privilege_type: string }>(
    `SELECT table_name, privilege_type FROM information_schema.role_table_grants
      WHERE table_schema = 'greenhouse_growth'
        AND table_name LIKE 'seo_work_queue_%'
        AND grantee IN ('greenhouse_runtime','greenhouse_app')
        AND privilege_type IN ('UPDATE','DELETE')`
  )

  check('runtime/app NO tienen UPDATE ni DELETE (2.ª capa)', badGrants.length === 0,
    badGrants.map(g => `${g.table_name}:${g.privilege_type}`).join(', ') || 'ninguno')

  // ── 2. Comportamiento, con filas reales dentro de una tx que se aborta ──
  const organizationId = (
    await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_growth.seo_targets WHERE seo_target_id = $1`,
      [TARGET]
    )
  )[0]?.organization_id

  check('target de referencia resuelve organización', Boolean(organizationId), organizationId ?? 'sin target')

  if (!organizationId) {
    console.error('\nSin target no se puede ejercitar el comportamiento. Abortando.')
    process.exitCode = 1

    return
  }

  try {
    await withTransaction(async client => {
      const snapshot = await client.query<{ snapshot_id: string }>(
        `INSERT INTO greenhouse_growth.seo_work_queue_snapshots
           (organization_id, seo_target_id, priority_score_version, input_snapshot_hash,
            window_days, origin_health_json, item_count, materialized_by, expires_at)
         VALUES ($1, $2, $3, $4, 28, '[]'::jsonb, 0, 'sanity-1700',
                 clock_timestamp() + interval '26 hours')
         RETURNING snapshot_id`,
        [organizationId, TARGET, ACTIVE_PRIORITY_SCORE_VERSION, SANITY_HASH]
      )

      const snapshotId = snapshot.rows[0]?.snapshot_id

      check('INSERT de snapshot', Boolean(snapshotId), snapshotId)

      // Idempotencia: el MISMO (org, target, versión, hash) no puede entrar dos veces.
      let duplicateBlocked = false

      try {
        await client.query(
          `INSERT INTO greenhouse_growth.seo_work_queue_snapshots
             (organization_id, seo_target_id, priority_score_version, input_snapshot_hash,
              window_days, origin_health_json, item_count, materialized_by, expires_at)
           VALUES ($1, $2, $3, $4, 28, '[]'::jsonb, 0, 'sanity-1700',
                   clock_timestamp() + interval '26 hours')`,
          [organizationId, TARGET, ACTIVE_PRIORITY_SCORE_VERSION, SANITY_HASH]
        )
      } catch {
        duplicateBlocked = true
      }

      check('UNIQUE de idempotencia rechaza el snapshot repetido', duplicateBlocked)

      if (duplicateBlocked) {
        // El INSERT fallido aborta la tx; se reabre con un savepoint para seguir probando.
        // (Sin esto, todo lo que sigue reventaría con 25P02 y parecería otro bug.)
        throw new Error(SENTINEL)
      }

      throw new Error(SENTINEL)
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== SENTINEL) {
      check('rollback deliberado (bloque idempotencia)', false, error instanceof Error ? error.message : String(error))
    } else {
      check('rollback deliberado (bloque idempotencia)', true)
    }
  }

  // Segundo bloque: CHECKs de vocabulario + trigger, sobre filas nuevas y tx limpia.
  try {
    await withTransaction(async client => {
      const snapshot = await client.query<{ snapshot_id: string }>(
        `INSERT INTO greenhouse_growth.seo_work_queue_snapshots
           (organization_id, seo_target_id, priority_score_version, input_snapshot_hash,
            window_days, origin_health_json, item_count, materialized_by, expires_at)
         VALUES ($1, $2, $3, $4, 28, '[]'::jsonb, 1, 'sanity-1700',
                 clock_timestamp() + interval '26 hours')
         RETURNING snapshot_id`,
        [organizationId, TARGET, ACTIVE_PRIORITY_SCORE_VERSION, `${SANITY_HASH}-b`]
      )

      const snapshotId = snapshot.rows[0]!.snapshot_id

      const insertItem = async (
        origin: string,
        basis: string,
        band: number,
        score: number | null,
        sourceVersion: string | null,
        keyword: string
      ) =>
        client.query(
          `INSERT INTO greenhouse_growth.seo_work_queue_items
             (snapshot_id, origin, normalized_keyword, recommended_verb, score_basis, score_band,
              priority_score, priority_score_version, score_breakdown_json, evidence_ref,
              source_score_version, rank_in_snapshot)
           VALUES ($1, $2, $3, 'optimize', $4, $5, $6, $7, '{}'::jsonb, 'seo:gsc_query:x', $8, 1)`,
          [snapshotId, origin, keyword, basis, band, score, ACTIVE_PRIORITY_SCORE_VERSION, sourceVersion]
        )

      await insertItem('gsc_striking_distance', 'measured_incremental_clicks', 1, 340, null, 'sanity ok')

      check('item banda 1 con score entra', true)

      // 🔴 El invariante ●/◑: sin demanda medida NO se fabrica score.
      let fabricatedScoreBlocked = false

      try {
        await client.query('SAVEPOINT s1')
        await insertItem('discovery_candidate', 'no_measured_demand', 3, 480, null, 'sanity fabricado')
      } catch {
        fabricatedScoreBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT s1')
      }

      check('CHECK rechaza banda 3 CON score (volumen fabricado)', fabricatedScoreBlocked)

      let bandMismatchBlocked = false

      try {
        await client.query('SAVEPOINT s2')
        await insertItem('gsc_striking_distance', 'measured_incremental_clicks', 2, 10, null, 'sanity banda mala')
      } catch {
        bandMismatchBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT s2')
      }

      check('CHECK rechaza basis/banda inconsistentes', bandMismatchBlocked)

      let aeoWithoutVersionBlocked = false

      try {
        await client.query('SAVEPOINT s3')
        await insertItem('aeo_gap', 'no_measured_demand', 3, null, null, 'sanity aeo sin version')
      } catch {
        aeoWithoutVersionBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT s3')
      }

      check('CHECK rechaza aeo_gap sin source_score_version', aeoWithoutVersionBlocked)

      await insertItem('aeo_gap', 'no_measured_demand', 3, null, 'grader-v3', 'sanity aeo con version')

      check('aeo_gap CON source_score_version entra', true)

      let unknownOriginBlocked = false

      try {
        await client.query('SAVEPOINT s4')
        await insertItem('inventado', 'no_measured_demand', 3, null, null, 'sanity origen falso')
      } catch {
        unknownOriginBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT s4')
      }

      check('CHECK rechaza un origen fuera del vocabulario cerrado', unknownOriginBlocked)

      // ── Trigger append-only, sobre filas que EXISTEN (si no, no dispara) ──
      let itemUpdateBlocked = false

      try {
        await client.query('SAVEPOINT s5')
        await client.query(
          `UPDATE greenhouse_growth.seo_work_queue_items SET priority_score = 1
            WHERE snapshot_id = $1`,
          [snapshotId]
        )
      } catch {
        itemUpdateBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT s5')
      }

      check('trigger bloquea UPDATE sobre items (con filas reales)', itemUpdateBlocked)

      let itemDeleteBlocked = false

      try {
        await client.query('SAVEPOINT s6')
        await client.query(`DELETE FROM greenhouse_growth.seo_work_queue_items WHERE snapshot_id = $1`, [snapshotId])
      } catch {
        itemDeleteBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT s6')
      }

      check('trigger bloquea DELETE sobre items (con filas reales)', itemDeleteBlocked)

      let snapshotUpdateBlocked = false

      try {
        await client.query('SAVEPOINT s7')
        await client.query(
          `UPDATE greenhouse_growth.seo_work_queue_snapshots SET item_count = 99 WHERE snapshot_id = $1`,
          [snapshotId]
        )
      } catch {
        snapshotUpdateBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT s7')
      }

      check('trigger bloquea UPDATE sobre snapshots (con filas reales)', snapshotUpdateBlocked)

      // Decisiones: fila real + trigger.
      await client.query(
        `INSERT INTO greenhouse_growth.seo_work_queue_decisions
           (organization_id, seo_target_id, origin, normalized_keyword, decision, decided_by)
         VALUES ($1, $2, 'gsc_striking_distance', 'sanity ok', 'dismissed', 'sanity-1700')`,
        [organizationId, TARGET]
      )

      let decisionUpdateBlocked = false

      try {
        await client.query('SAVEPOINT s8')
        await client.query(
          `UPDATE greenhouse_growth.seo_work_queue_decisions SET decision = 'done'
            WHERE seo_target_id = $1 AND decided_by = 'sanity-1700'`,
          [TARGET]
        )
      } catch {
        decisionUpdateBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT s8')
      }

      check('trigger bloquea UPDATE sobre decisions (con filas reales)', decisionUpdateBlocked)

      throw new Error(SENTINEL)
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== SENTINEL) {
      check('rollback deliberado (bloque comportamiento)', false, error instanceof Error ? error.message : String(error))
    } else {
      check('rollback deliberado (bloque comportamiento)', true)
    }
  }

  // ── 3. Cero residuo: lo insertado tiene que haber desaparecido ──
  const residue = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT (
        (SELECT COUNT(*) FROM greenhouse_growth.seo_work_queue_snapshots WHERE materialized_by = 'sanity-1700')
      + (SELECT COUNT(*) FROM greenhouse_growth.seo_work_queue_decisions WHERE decided_by = 'sanity-1700')
     )::text AS n`
  )

  check('cero residuo tras los rollbacks', residue[0]?.n === '0', `filas=${residue[0]?.n}`)

  console.log(`\n${pass} ok · ${fail} fallo(s)`)
  process.exitCode = fail > 0 ? 1 : 0
}

void main()

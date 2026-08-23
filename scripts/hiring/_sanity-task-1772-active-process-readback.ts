/**
 * TASK-1772 — Readback de «proceso activo» contra PG REAL (gate TASK-893).
 *
 * Imprime, sin escribir nada:
 *   1. Los tres conteos candidatos (por etapa / por desenlace / canónico de tres ejes).
 *   2. Los cuatro cuadrantes (decision × archived_at), con procedencia.
 *   3. `awaiting_terminal` con el predicado copiado VERBATIM de la señal, y su desglose.
 *   4. Las CHECK constraints del invariante de cierre.
 *
 * Es la evidencia obligatoria ANTES y DESPUÉS del Slice 2.
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_sanity-task-1772-active-process-readback.ts
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const printTable = (label: string, rows: Record<string, unknown>[]) => {
  console.log(`\n── ${label} ──`)

  if (rows.length === 0) {
    console.log('  (sin filas)')

    return
  }

  console.table(rows)
}

/**
 * VERBATIM de `hiring-assessment-assignment-signals.ts` (métrica `awaiting_terminal`) al
 * 2026-08-23. Se copia tal cual a propósito: medir con un predicado "equivalente" reescrito a mano
 * es justo el error que esta task viene a cerrar.
 */
const AWAITING_TERMINAL_FROM = `
  FROM greenhouse_hiring.hiring_application app
  JOIN greenhouse_hiring.hiring_opening_assessment_policy p
    ON p.opening_id = app.opening_id
   AND p.state = 'enabled'
   AND p.mode = 'on_stage_entry'
 WHERE app.decision IS NULL
   AND app.stage = p.trigger_stage
   AND NOT EXISTS (
         SELECT 1 FROM greenhouse_hiring.hiring_assessment a
          WHERE a.application_id = app.application_id
            AND a.template_id = p.template_id
            AND a.method = 'candidate_test'
            AND a.status IN ('assigned', 'sent', 'in_progress', 'submitted', 'scored')
       )
   AND NOT EXISTS (
         SELECT 1 FROM greenhouse_hiring.hiring_assessment_assignment asg
          WHERE asg.application_id = app.application_id
            AND asg.policy_id = p.policy_id
            AND asg.policy_version = p.policy_version
            AND asg.trigger_stage = p.trigger_stage
            AND asg.superseded_at IS NULL
       )`

const main = async () => {
  printTable(
    '1. Los tres candidatos de «proceso activo»',
    await runGreenhousePostgresQuery(`
      SELECT
        COUNT(*) FILTER (WHERE stage NOT IN ('rejected','withdrawn','closed'))::int  AS por_etapa,
        COUNT(*) FILTER (WHERE decision IS NULL)::int                                AS por_desenlace,
        COUNT(*) FILTER (WHERE decision IS NULL AND archived_at IS NULL)::int         AS canonico_tres_ejes,
        COUNT(*)::int                                                                AS total
      FROM greenhouse_hiring.hiring_application`),
  )

  printTable(
    '2. Los cuatro cuadrantes (decision × archived_at) × procedencia',
    await runGreenhousePostgresQuery(`
      SELECT
        CASE WHEN decision IS NULL THEN 'sin desenlace' ELSE 'con desenlace' END AS desenlace,
        CASE WHEN archived_at IS NULL THEN 'no archivada' ELSE 'archivada' END   AS visibilidad,
        data_origin,
        COUNT(*)::int AS filas
      FROM greenhouse_hiring.hiring_application
      GROUP BY 1, 2, 3
      ORDER BY 1, 2, 3`),
  )

  printTable(
    '3. awaiting_terminal (predicado VERBATIM de la señal) y su desglose',
    await runGreenhousePostgresQuery(`
      SELECT
        COUNT(*)::int                                                        AS awaiting_terminal_hoy,
        COUNT(*) FILTER (WHERE app.archived_at IS NULL)::int                 AS no_archivadas,
        COUNT(*) FILTER (WHERE app.archived_at IS NULL
                           AND app.data_origin = 'real')::int                AS reales_no_archivadas,
        COUNT(*) FILTER (WHERE app.archived_at IS NOT NULL)::int             AS archivadas,
        COUNT(*) FILTER (WHERE app.data_origin <> 'real')::int               AS sinteticas
      ${AWAITING_TERMINAL_FROM}`),
  )

  printTable(
    '3b. awaiting_terminal por procedencia × visibilidad',
    await runGreenhousePostgresQuery(`
      SELECT app.data_origin,
             CASE WHEN app.archived_at IS NULL THEN 'no archivada' ELSE 'archivada' END AS visibilidad,
             COUNT(*)::int AS filas
      ${AWAITING_TERMINAL_FROM}
      GROUP BY 1, 2 ORDER BY 1, 2`),
  )

  printTable(
    '4. CHECK constraints del invariante de cierre',
    await runGreenhousePostgresQuery(`
      SELECT conname, pg_get_constraintdef(oid) AS definicion
      FROM pg_constraint
      WHERE conrelid = 'greenhouse_hiring.hiring_application'::regclass
        AND contype = 'c'
      ORDER BY conname`),
  )

  printTable(
    '5. Membresías del Banco de Talento por lifecycle_status',
    await runGreenhousePostgresQuery(`
      SELECT lifecycle_status, COUNT(*)::int AS filas
      FROM greenhouse_hiring.talent_pool_membership
      GROUP BY 1 ORDER BY 1`),
  )

  printTable(
    '6. Membresías activas SOLO por una postulación archivada (el cuadrante que nadie cubre)',
    await runGreenhousePostgresQuery(`
      SELECT m.lifecycle_status, COUNT(*)::int AS filas
      FROM greenhouse_hiring.talent_pool_membership m
      WHERE EXISTS (
              SELECT 1 FROM greenhouse_hiring.hiring_application a
               WHERE a.candidate_facet_id = m.candidate_facet_id
                 AND a.decision IS NULL AND a.archived_at IS NOT NULL)
        AND NOT EXISTS (
              SELECT 1 FROM greenhouse_hiring.hiring_application a
               WHERE a.candidate_facet_id = m.candidate_facet_id
                 AND a.decision IS NULL AND a.archived_at IS NULL)
      GROUP BY 1 ORDER BY 1`),
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

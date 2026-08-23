/**
 * TASK-1754 — Readback del vocabulario de etapas contra PG REAL (gate TASK-893).
 *
 * Imprime, en un solo pasado y sin escribir nada:
 *   1. Conteo de `hiring_application` por etapa (+ `data_origin`).
 *   2. Literales que nombra cada CHECK constraint relacionada.
 *   3. Políticas de assessment por `trigger_stage` / `mode` / `state`.
 *   4. Filas del ledger de assignment por `trigger_stage`.
 *
 * Es la evidencia obligatoria ANTES y DESPUÉS de la migración de expand/contract.
 *
 * Uso (runtime path, Cloud SQL Connector — no requiere proxy):
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_sanity-task-1754-stage-readback.ts
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

const main = async () => {
  const stages = await runGreenhousePostgresQuery<{ stage: string; data_origin: string; total: string }>(
    `SELECT stage, COALESCE(data_origin, '(null)') AS data_origin, COUNT(*)::text AS total
       FROM greenhouse_hiring.hiring_application
      GROUP BY stage, data_origin
      ORDER BY stage, data_origin`
  )

  printTable('hiring_application por etapa × data_origin', stages)

  const checks = await runGreenhousePostgresQuery<{ conname: string; definition: string }>(
    `SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'greenhouse_hiring'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%shortlisted%'
      ORDER BY c.conname`
  )

  printTable('CHECK constraints que nombran shortlisted', checks)

  const policies = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT COALESCE(trigger_stage, '(null)') AS trigger_stage, mode, state, COUNT(*)::text AS total
       FROM greenhouse_hiring.hiring_opening_assessment_policy
      GROUP BY trigger_stage, mode, state
      ORDER BY trigger_stage, mode, state`
  )

  printTable('políticas de assessment', policies)

  const ledger = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT trigger_stage, outcome, COUNT(*)::text AS total
       FROM greenhouse_hiring.hiring_assessment_assignment
      GROUP BY trigger_stage, outcome
      ORDER BY trigger_stage, outcome`
  )

  printTable('ledger de assignment', ledger)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

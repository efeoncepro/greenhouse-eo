import 'server-only'

/**
 * TASK-1174 Slice 2 — Barrido idempotente de recompute del atraso imputable
 * por-tarea en filas TERMINALES con bucket abierto (fix ISSUE-098).
 *
 * El compute M2 es event-driven (transición → recompute). Cuando una tarea se
 * vuelve terminal (`Aprobado`/`Archivado`), no hay transición futura → el bucket
 * abierto que quedó por la carrera de sync (row vs transición) NUNCA se corrige.
 * Este barrido cierra ese gap: recompone, vía el core canónico
 * `computeAttributableLatenessForTask` (que ya aplica el estado efectivo del
 * Slice 1), todas las filas del shadow cuya tarea está completada pero el bucket
 * sigue abierto.
 *
 * Idempotente (UPSERT por `task_source_id`); recompone filas YA existentes — no
 * crea data nueva ni depende del flag. Read-only por defecto (dry-run); `--apply`
 * ejecuta el recompute. Per-row resiliente (una tarea mala no aborta el barrido).
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/recompute-attributable-lateness-terminal-open.ts [--apply]
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { computeAttributableLatenessForTask } from '@/lib/sync/projections/notion-attributable-lateness-compute'
import { TASK_STATUS_CANONICAL, taskStatusSql } from '@/lib/delivery/task-status-canonical'
import { captureWithDomain } from '@/lib/observability/capture'

type TargetRow = {
  task_source_id: string
  workspace_id: string
  bucket_attributable: string
}

// Terminal = status Aprobado/Archivado (la definición precisa del bug ISSUE-098).
// NO usamos `completed_at IS NOT NULL` como proxy: una tarea en revisión
// ("Listo para revisión") puede traer completed_at por inconsistencia de la
// fuente, y su bucket abierto es CORRECTO (no es terminal por status).
const TERMINAL_STATUS_SQL = `t.task_status IN (${taskStatusSql(TASK_STATUS_CANONICAL.APROBADO)}, ${taskStatusSql(TASK_STATUS_CANONICAL.ARCHIVADO)})`

const TERMINAL_OPEN_SQL = `
  SELECT s.task_source_id, s.workspace_id, s.bucket_attributable
  FROM greenhouse_delivery.task_attributable_lateness_shadow s
  JOIN greenhouse_delivery.tasks t ON t.notion_task_id = s.task_source_id
  WHERE ${TERMINAL_STATUS_SQL}
    AND s.bucket_attributable IN ('overdue', 'carry_over')
  ORDER BY s.computed_at ASC
`

const main = async (): Promise<void> => {
  const apply = process.argv.includes('--apply')

  console.log('TASK-1174 — Barrido recompute atraso imputable (filas terminales con bucket abierto)')
  console.log(`Modo: ${apply ? 'APPLY (recompone)' : 'DRY-RUN (solo cuenta)'}`)
  console.log('='.repeat(76))

  const targets = await runGreenhousePostgresQuery<TargetRow>(TERMINAL_OPEN_SQL)

  console.log(`Filas terminales con bucket abierto (stale): ${targets.length}`)

  const byBucket = targets.reduce<Record<string, number>>((acc, r) => {
    acc[r.bucket_attributable] = (acc[r.bucket_attributable] ?? 0) + 1
    
return acc
  }, {})

  console.log(`  por bucket actual: ${JSON.stringify(byBucket)}`)

  if (!apply) {
    console.log('\nDRY-RUN: no se recompuso nada. Re-correr con --apply para corregir.')
    
return
  }

  let fixed = 0
  let unchanged = 0
  let failed = 0

  for (const target of targets) {
    try {
      const result = await computeAttributableLatenessForTask(target.task_source_id, target.workspace_id)

      // El resultado incluye el data_status; verificamos el bucket nuevo aparte.
      if (result.startsWith('skip:')) {
        unchanged += 1
        continue
      }

      fixed += 1
    } catch (error) {
      failed += 1
      captureWithDomain(error, 'delivery', {
        tags: { source: 'attributable_lateness_terminal_open_backfill' },
        extra: { taskSourceId: target.task_source_id }
      })
      console.error(`  FAIL ${target.task_source_id.slice(0, 12)}: ${error instanceof Error ? error.message : error}`)
    }
  }

  console.log(`\nRecompuestas=${fixed} · skip=${unchanged} · fallidas=${failed}`)

  // Verificación post-apply: cuántas quedan terminales-con-bucket-abierto.
  const remaining = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n
     FROM greenhouse_delivery.task_attributable_lateness_shadow s
     JOIN greenhouse_delivery.tasks t ON t.notion_task_id = s.task_source_id
     WHERE ${TERMINAL_STATUS_SQL} AND s.bucket_attributable IN ('overdue', 'carry_over')`
  )

  console.log(`Quedan terminales-con-bucket-abierto: ${remaining[0]?.n ?? 0} (objetivo: 0)`)
}

main().catch((error: unknown) => {
  console.error('Barrido falló:', error instanceof Error ? error.message : error)
  process.exit(1)
})

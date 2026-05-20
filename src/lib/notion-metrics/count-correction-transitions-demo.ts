import 'server-only'

import { query } from '@/lib/db'

import type {
  CorrectionTransitionRecord,
  CorrectionTransitionsSourceMode,
  CountCorrectionTransitionsInput,
  CountCorrectionTransitionsResult
} from './count-correction-transitions'

/**
 * TASK-913 Slice 1 — countCorrectionTransitionsDemo canonical helper V1 (demo carril paralelo).
 *
 * **Sibling físicamente separado** de `countCorrectionTransitions` (TASK-908 V1.0
 * canonical productive). Lee EXCLUSIVAMENTE de
 * `greenhouse_delivery.task_status_transitions_demo` (CHECK workspace_id='demo'
 * PG-side).
 *
 * **Por qué sibling y no parametrize table name**: defense in depth canonical.
 * Si parametrizara `tableName: 'task_status_transitions' | 'task_status_transitions_demo'`,
 * un bug futuro podría pointear el helper productivo al table demo y vice-versa.
 * Siblings físicos enforce el boundary a nivel código + lint humano (cero
 * branching). Mismo pattern que `member.is_demo` strict isolation (TASK-910).
 *
 * **Coexistencia con V1 productive garantizada** (ADR Strangler §3.1 + TASK-910
 * demo-prod isolation invariants CLAUDE.md): este helper NUNCA toca
 * `task_status_transitions` productive. La table demo NUNCA recibe transitions
 * productive (filter `metadata.demo_mode === true` upstream + CHECK
 * workspace_id='demo' PG-side).
 *
 * Cross-refs:
 * - Foundation productive: src/lib/notion-metrics/count-correction-transitions.ts
 * - Tabla demo: migration 20260519120713456 (TASK-910 Slice 0)
 * - Consumer demo: src/lib/sync/projections/notion-rpa-compute-demo.ts
 */

export type { CountCorrectionTransitionsInput, CountCorrectionTransitionsResult }

/**
 * Helper canonical demo para contar transiciones `Listo para revisión → Cambios
 * solicitados` en tabla demo physically separated. Mismo contrato semántico que
 * `countCorrectionTransitions` productive, but reads from
 * `task_status_transitions_demo`.
 *
 * Idempotente (pure read). Edge cases mirror del helper productive:
 * - taskSourceId vacío/null/whitespace → unavailable
 * - Tarea sin rows en table demo → unavailable
 * - Tarea con rows pero 0 correcciones → canonical + count=0
 * - Window invertida → 0 (no throw)
 */
export const countCorrectionTransitionsDemo = async (
  input: CountCorrectionTransitionsInput
): Promise<CountCorrectionTransitionsResult> => {
  const { taskSourceId, windowStart, windowEnd } = input

  if (!taskSourceId || typeof taskSourceId !== 'string' || taskSourceId.trim() === '') {
    return { count: 0, transitions: [], sourceMode: 'unavailable' }
  }

  const probeRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM greenhouse_delivery.task_status_transitions_demo
     WHERE task_source_id = $1
     LIMIT 1`,
    [taskSourceId]
  )

  const hasAnyTransition = Number(probeRows[0]?.count ?? 0) > 0

  if (!hasAnyTransition) {
    return { count: 0, transitions: [], sourceMode: 'unavailable' }
  }

  const correctionRows = await query<{
    transitioned_at: Date | string
    transitioned_by: string | null
  }>(
    `SELECT transitioned_at, transitioned_by
     FROM greenhouse_delivery.task_status_transitions_demo
     WHERE task_source_id = $1
       AND from_status = 'Listo para revisión'
       AND to_status   = 'Cambios solicitados'
       AND ($2::timestamptz IS NULL OR transitioned_at >= $2)
       AND ($3::timestamptz IS NULL OR transitioned_at <= $3)
     ORDER BY transitioned_at ASC`,
    [taskSourceId, windowStart ?? null, windowEnd ?? null]
  )

  const transitions: CorrectionTransitionRecord[] = correctionRows.map(row => ({
    transitionedAt:
      row.transitioned_at instanceof Date ? row.transitioned_at : new Date(row.transitioned_at),
    transitionedBy: row.transitioned_by ?? null
  }))

  return {
    count: transitions.length,
    transitions,
    sourceMode: 'canonical' as CorrectionTransitionsSourceMode
  }
}

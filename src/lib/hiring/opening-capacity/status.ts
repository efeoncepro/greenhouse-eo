import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { ClosureRunState, OpeningClosureRunStatus } from './types'

/**
 * TASK-1762 Slice 2 — estado observable de un run.
 *
 * Es la superficie que responde «¿en qué va el cierre?» sin exponer a nadie: devuelve conteos por
 * estado, nunca la lista de personas ni un motivo con PII. Los consumidores —UI de `TASK-1763`,
 * carril gobernado, dashboards— leen de acá.
 *
 * Los conteos se derivan de los items, no de un contador guardado en el run: si un item se
 * reintenta y pasa de `failed` a `decided`, el estado cambia solo.
 */

interface StatusRow extends Record<string, unknown> {
  run_id: string
  opening_id: string
  state: ClosureRunState
  cohort_size: number
  included_paused: boolean
  included_backup: boolean
  created_at: string
  completed_at: string | null
  pending: string | number
  decided: string | number
  failed: string | number
  quarantined: string | number
  skipped: string | number
}

const n = (value: string | number): number => Number(value ?? 0)

const buildStatus = (row: StatusRow): OpeningClosureRunStatus => ({
  runId: row.run_id,
  openingId: row.opening_id,
  state: row.state,
  cohortSize: n(row.cohort_size),
  pending: n(row.pending),
  decided: n(row.decided),
  failed: n(row.failed),
  quarantined: n(row.quarantined),
  skipped: n(row.skipped),
  includedPaused: row.included_paused,
  includedBackup: row.included_backup,
  createdAt: row.created_at,
  completedAt: row.completed_at
})

const STATUS_SELECT = `
  SELECT r.run_id, r.opening_id, r.state, r.cohort_size,
         r.included_paused, r.included_backup, r.created_at, r.completed_at,
         count(i.item_id) FILTER (WHERE i.state = 'pending')     AS pending,
         count(i.item_id) FILTER (WHERE i.state = 'decided')     AS decided,
         count(i.item_id) FILTER (WHERE i.state = 'failed')      AS failed,
         count(i.item_id) FILTER (WHERE i.state = 'quarantined') AS quarantined,
         count(i.item_id) FILTER (WHERE i.state = 'skipped')     AS skipped
    FROM greenhouse_hiring.hiring_opening_closure_run r
    LEFT JOIN greenhouse_hiring.hiring_opening_closure_run_item i ON i.run_id = r.run_id
`

export const readClosureRunStatus = async (runId: string): Promise<OpeningClosureRunStatus | null> => {
  const rows = await runGreenhousePostgresQuery<StatusRow>(
    `${STATUS_SELECT} WHERE r.run_id = $1
      GROUP BY r.run_id, r.opening_id, r.state, r.cohort_size,
               r.included_paused, r.included_backup, r.created_at, r.completed_at`,
    [runId]
  )

  const row = rows[0]

  return row ? buildStatus(row) : null
}

export const readLatestClosureRunForOpening = async (
  openingId: string
): Promise<OpeningClosureRunStatus | null> => {
  const rows = await runGreenhousePostgresQuery<StatusRow>(
    `${STATUS_SELECT} WHERE r.opening_id = $1
      GROUP BY r.run_id, r.opening_id, r.state, r.cohort_size,
               r.included_paused, r.included_backup, r.created_at, r.completed_at
      ORDER BY r.created_at DESC
      LIMIT 1`,
    [openingId]
  )

  const row = rows[0]

  return row ? buildStatus(row) : null
}

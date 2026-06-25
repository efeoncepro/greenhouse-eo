import 'server-only'

/**
 * TASK-1245 — Growth AI Visibility · Public run status reader (EPIC-020, server-only).
 *
 * `readPublicGraderRunStatus(handle)` es el contrato público que consume el poll del lead
 * magnet (TASK-1241): traduce el estado interno del run a un DTO BOUNDED y public-safe.
 *
 * Autorización: como NO hay sesión, el `handle` ES la auth. Por eso SOLO se resuelve por
 * handles de ALTA ENTROPÍA — `poll_token` del run (256 bits, TASK-1245) o `submission_id`
 * del motor (path convergente, `fsub-`+uuid). El `public_id` SECUENCIAL (EO-GRUN-#####)
 * NUNCA resuelve acá: es enumerable y no sirve como secreto.
 *
 * Read-only PURO: NO publica snapshots ni dispara writes (un GET público anónimo no muta).
 * El auto-publish vive en el path de finalización del worker (TASK-1245 Slice 2). El DTO
 * NUNCA contiene email/PII, raw provider text, accuracy findings ni el motivo interno de
 * `review_required` (sólo un estado de espera honesto).
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'
import { getSubmissionById } from '@/lib/growth/forms/store'

import { getLatestReportTokenForRun } from '../hubspot/report-link'
import { type GrowthAiVisibilityRunStatus } from '../contracts'
import { type PublicDeliveryState } from './finalize-delivery'

/** Estados públicos bounded del run (mapeo honesto, sin razones internas). */
export const PUBLIC_RUN_STATUSES = [
  'queued', // recibido; run aún no corre (o convergente: submission aceptado, run no encolado)
  'processing', // ejecutándose en los providers
  'ready', // snapshot publicable → reportToken disponible
  'in_review', // datos OK pero requiere revisión humana (TASK-1244); espera honesta, sin token
  'unavailable', // failed/insufficient_data → sin reporte definitivo
  'not_found', // handle no resuelve a ningún run/submission
] as const
export type PublicRunStatus = (typeof PUBLIC_RUN_STATUSES)[number]

export interface PublicRunStatusResult {
  status: PublicRunStatus
  /** Sólo en `ready`: token NO enumerable del snapshot público (TASK-1239). Null en el resto. */
  reportToken: string | null
  /** Mensaje es-CL sanitizado (sin razones internas). */
  reason: string
  /** Hint de backoff para el poll (segundos) en estados no-terminales; null en terminales. */
  retryAfterSeconds: number | null
}

const POLL_BACKOFF_SECONDS = 5

const reasonFor = (status: PublicRunStatus): string => GH_GROWTH_AI_VISIBILITY.public_status[status]

const result = (
  status: PublicRunStatus,
  reportToken: string | null = null,
): PublicRunStatusResult => ({
  status,
  reportToken,
  reason: reasonFor(status),
  retryAfterSeconds: status === 'queued' || status === 'processing' ? POLL_BACKOFF_SECONDS : null,
})

interface RunRef {
  runId: string | null
  runStatus: GrowthAiVisibilityRunStatus | null
  /** Delivery state materializado por el finalizador (TASK-1245 Slice 2). */
  deliveryState: PublicDeliveryState | null
  /** El submission existe (path convergente) aunque el run aún no se haya materializado. */
  submissionSeen: boolean
}

/**
 * Resuelve el handle a una referencia de run SIN filtrar existencia de datos sensibles.
 * Orden: poll_token (a-medida) → submission_id → run (convergente) → submission sin lead (ventana).
 */
const resolveRunRef = async (handle: string): Promise<RunRef> => {
  // 1. poll_token directo (path a-medida + cualquier run).
  const byToken = await runGreenhousePostgresQuery<{ run_id: string; status: string; public_delivery_state: string }>(
    `SELECT run_id, status, public_delivery_state FROM greenhouse_growth.grader_runs WHERE poll_token = $1 LIMIT 1`,
    [handle],
  )

  if (byToken[0]) {
    return {
      runId: byToken[0].run_id,
      runStatus: byToken[0].status as GrowthAiVisibilityRunStatus,
      deliveryState: byToken[0].public_delivery_state as PublicDeliveryState,
      submissionSeen: false,
    }
  }

  // 2. submission_id → lead → run (path convergente). El lead lo materializa el reactive consumer
  //    junto al run; si el lead ya existe pero run_id es null, el run está en cola.
  const bySubmission = await runGreenhousePostgresQuery<{
    run_id: string | null
    status: string | null
    public_delivery_state: string | null
  }>(
    `SELECT l.run_id, r.status, r.public_delivery_state
       FROM greenhouse_growth.grader_leads l
       LEFT JOIN greenhouse_growth.grader_runs r ON r.run_id = l.run_id
      WHERE l.submission_id = $1
      LIMIT 1`,
    [handle],
  )

  if (bySubmission[0]) {
    return {
      runId: bySubmission[0].run_id,
      runStatus: (bySubmission[0].status as GrowthAiVisibilityRunStatus | null) ?? null,
      deliveryState: (bySubmission[0].public_delivery_state as PublicDeliveryState | null) ?? null,
      submissionSeen: true,
    }
  }

  // 3. Ventana convergente: submission aceptado pero el reactive consumer (~5 min) aún no
  //    materializó lead/run. El submission existe → queued honesto, no 404.
  const submission = await getSubmissionById(handle)

  return { runId: null, runStatus: null, deliveryState: null, submissionSeen: submission !== null }
}

/**
 * Mapea estado interno → DTO público bounded. El `reportToken` se devuelve SÓLO cuando existe
 * un snapshot publicable (fila en `grader_reports`); su existencia es el gate de releasability
 * (el snapshot sólo se publica para gates `ready`/`partial`, TASK-1239).
 */
export const readPublicGraderRunStatus = async (handle: string): Promise<PublicRunStatusResult> => {
  const trimmed = handle.trim()

  if (!trimmed) return result('not_found')

  const ref = await resolveRunRef(trimmed)

  // Run aún no materializado (cola del path convergente) vs handle inexistente.
  if (!ref.runId) {
    return ref.submissionSeen ? result('queued') : result('not_found')
  }

  if (ref.runStatus === 'pending') return result('queued')
  if (ref.runStatus === 'running') return result('processing')

  // Terminal: un snapshot publicable (token) gana sobre todo → ready.
  const reportToken = await getLatestReportTokenForRun(ref.runId)

  if (reportToken) return result('ready', reportToken)

  // Sin token todavía: el delivery state materializado por el finalizador (Slice 2) decide el estado
  // honesto sin recomputar el gate ni filtrar el motivo interno de review_required.
  if (ref.deliveryState === 'in_review') return result('in_review')
  if (ref.deliveryState === 'unavailable') return result('unavailable')

  // delivery 'pending'/'ready'-sin-token: el finalizador aún no corrió (ventana transitoria) →
  // 'processing'. failed/skipped sin materializar → unavailable.
  if (ref.runStatus === 'failed' || ref.runStatus === 'skipped') return result('unavailable')

  return result('processing')
}

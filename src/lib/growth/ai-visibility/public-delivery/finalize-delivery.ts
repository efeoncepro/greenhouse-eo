import 'server-only'

/**
 * TASK-1245 Slice 2 — Delivery finalizer (write-side, NO on-read).
 *
 * `finalizeRunDelivery(run)` corre en el path de FINALIZACIÓN del worker (run-engine), cuando un run
 * alcanza estado terminal. Materializa `grader_runs.public_delivery_state` (lo que el status público
 * lee O(1)) y, cuando el reporte es publicable, PUBLICA el snapshot idempotente (TASK-1239). Así el
 * `GET /run/[handle]` queda read-only puro: un GET anónimo nunca dispara writes.
 *
 * Mapa gate → delivery state:
 *   - failed / skipped            → 'unavailable' (sin reporte; no se recomputa el gate)
 *   - gate ready | partial        → publica snapshot → 'ready'
 *   - gate review_required        → 'in_review' (espera humana TASK-1244; NUNCA auto-publica)
 *   - gate insufficient_data      → 'unavailable'
 *   - sin score derivable         → 'unavailable'
 *
 * BEST-EFFORT: nunca rompe la finalización del run. Si algo falla, deja `public_delivery_state` en su
 * valor previo ('pending' → el reader muestra 'processing') y emite a Sentry; el signal
 * `public_delivery_pending` (Slice 3) detecta el run estancado para recovery.
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { GraderReportError, readGraderReport } from '../report/command'
import { publishGraderReportSnapshot } from '../report/snapshot'
import { type GraderRunRow } from '../store'

export type PublicDeliveryState = 'pending' | 'ready' | 'in_review' | 'unavailable'

const setDeliveryState = async (runId: string, state: PublicDeliveryState): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.grader_runs SET public_delivery_state = $2 WHERE run_id = $1`,
    [runId, state],
  )
}

const TERMINAL_STATUSES = new Set(['succeeded', 'partial', 'failed', 'skipped'])

/**
 * Materializa el delivery state del run terminal (+ publica snapshot si es releasable). Idempotente:
 * el publish es idempotente por versión y el UPDATE converge al mismo estado. No-op si el run no es
 * terminal. Devuelve el estado materializado, o null si fue no-op o falló (best-effort).
 */
export const finalizeRunDelivery = async (run: GraderRunRow): Promise<PublicDeliveryState | null> => {
  if (!TERMINAL_STATUSES.has(run.status)) return null

  try {
    if (run.status === 'failed' || run.status === 'skipped') {
      await setDeliveryState(run.runId, 'unavailable')

      return 'unavailable'
    }

    // succeeded | partial → decidir por el gate del reporte (sin LLM; lee observaciones/score).
    let gateStatus: string

    try {
      const { report } = await readGraderReport({ runId: run.runId })

      gateStatus = report.gate.status
    } catch (error) {
      // Sin score/reporte derivable todavía → unavailable honesto (no reporte falso).
      if (error instanceof GraderReportError) {
        await setDeliveryState(run.runId, 'unavailable')

        return 'unavailable'
      }

      throw error
    }

    if (gateStatus === 'review_required') {
      await setDeliveryState(run.runId, 'in_review')

      return 'in_review'
    }

    if (gateStatus === 'insufficient_data') {
      await setDeliveryState(run.runId, 'unavailable')

      return 'unavailable'
    }

    // ready | partial → publicar snapshot idempotente + materializar ready.
    await publishGraderReportSnapshot({ runId: run.runId })
    await setDeliveryState(run.runId, 'ready')

    return 'ready'
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_finalize_delivery' },
      extra: { runId: run.runId, status: run.status },
    })

    return null
  }
}

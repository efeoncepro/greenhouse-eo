/**
 * TASK-1303 — Batch diario de captura de rankings (Cloud Scheduler → ops-worker).
 *
 * Itera los targets activos de orgs con assignment `seo_v2` vigente y corre el command
 * `captureRankSnapshot` por target con per-target resilience (patrón `gsc-daily-batch`):
 * un target que falla se registra y el batch continúa — el gate de costo del org que
 * agotó su presupuesto NUNCA puede impedir capturar la serie de los demás.
 *
 * Vive acá y no en el handler HTTP para ser testeable y reusable (el handler del worker
 * queda fino). El filtro por assignment es de ELEGIBILIDAD (no iterar orgs sin módulo);
 * el enforcement real de entitlement/budget lo hace el command vía el chokepoint.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { SEO_MODULE_KEYS_READ } from './entitlement'
import { captureRankSnapshot } from './rank-capture'

/** Actor de sistema con el que el cron ejecuta el command gobernado. */
export const SEO_RANK_CAPTURE_CRON_ACTOR = 'system:seo-rank-capture-cron'

export interface RankCaptureBatchTargetOutcome {
  seoTargetId: string
  organizationId: string
  status: 'succeeded' | 'partial' | 'degraded' | 'skipped' | 'blocked' | 'failed'
  captured: number
  alreadyCaptured: number
  budgetBlocked: number
  providerErrors: number
  breakerOpen: number
  costUsd: number
  errorCode: string | null
}

export interface RankCaptureBatchResult {
  captureDate: string | null
  targets: number
  succeededTargets: number
  partialTargets: number
  degradedTargets: number
  skippedTargets: number
  blockedTargets: number
  failedTargets: number
  snapshots: number
  costUsd: number
  outcomes: RankCaptureBatchTargetOutcome[]
}

type EligibleTargetRow = {
  seo_target_id: string
  organization_id: string
}

/**
 * Targets activos de orgs con assignment `seo_v2` vigente (mismo predicado de vigencia
 * que el resolver de entitlement: `effective_to IS NULL AND status IN (active, pilot)`).
 * La expiración NO se filtra acá: el gate la clasifica honesto (`expired`) por target.
 */
const listEligibleTargets = async (maxTargets?: number): Promise<EligibleTargetRow[]> => {
  const rows = await runGreenhousePostgresQuery<EligibleTargetRow>(
    `SELECT t.seo_target_id, t.organization_id
       FROM greenhouse_growth.seo_targets t
      WHERE t.status = 'active'
        AND EXISTS (
          SELECT 1
            FROM greenhouse_client_portal.module_assignments ma
           WHERE ma.organization_id = t.organization_id
             AND ma.module_key = ANY($1::text[])
             AND ma.effective_to IS NULL
             AND ma.status IN ('active', 'pilot')
        )
      ORDER BY t.seo_target_id`,
    [[...SEO_MODULE_KEYS_READ]]
  )

  return typeof maxTargets === 'number' && maxTargets > 0 ? rows.slice(0, maxTargets) : rows
}

export const runRankCaptureBatch = async (
  options: { captureDate?: string; maxTargets?: number } = {}
): Promise<RankCaptureBatchResult> => {
  const targets = await listEligibleTargets(options.maxTargets)
  const outcomes: RankCaptureBatchTargetOutcome[] = []

  let captureDate: string | null = options.captureDate ?? null

  for (const target of targets) {
    try {
      const result = await captureRankSnapshot(target.seo_target_id, SEO_RANK_CAPTURE_CRON_ACTOR, {
        captureDate: options.captureDate
      })

      if (result.ok) {
        captureDate = result.captureDate

        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: result.status,
          captured: result.captured,
          alreadyCaptured: result.alreadyCaptured,
          budgetBlocked: result.budgetBlocked,
          providerErrors: result.providerErrors,
          breakerOpen: result.breakerOpen,
          costUsd: result.costUsd,
          errorCode: null
        })
      } else {
        // Degradación declarada por el command (gate bloqueado, target sin keywords, …):
        // se registra con su código honesto y el batch sigue con el resto.
        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: 'blocked',
          captured: 0,
          alreadyCaptured: 0,
          budgetBlocked: 0,
          providerErrors: 0,
          breakerOpen: 0,
          costUsd: 0,
          errorCode: result.errorCode
        })
      }
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_rank_capture_batch' },
        extra: { seoTargetId: target.seo_target_id, organizationId: target.organization_id }
      })

      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status: 'failed',
        captured: 0,
        alreadyCaptured: 0,
        budgetBlocked: 0,
        providerErrors: 0,
        breakerOpen: 0,
        costUsd: 0,
        errorCode: 'unexpected_error'
      })
    }
  }

  return {
    captureDate,
    targets: targets.length,
    succeededTargets: outcomes.filter(outcome => outcome.status === 'succeeded').length,
    partialTargets: outcomes.filter(outcome => outcome.status === 'partial').length,
    degradedTargets: outcomes.filter(outcome => outcome.status === 'degraded').length,
    skippedTargets: outcomes.filter(outcome => outcome.status === 'skipped').length,
    blockedTargets: outcomes.filter(outcome => outcome.status === 'blocked').length,
    failedTargets: outcomes.filter(outcome => outcome.status === 'failed').length,
    snapshots: outcomes.reduce((total, outcome) => total + outcome.captured, 0),
    costUsd: outcomes.reduce((total, outcome) => total + outcome.costUsd, 0),
    outcomes
  }
}

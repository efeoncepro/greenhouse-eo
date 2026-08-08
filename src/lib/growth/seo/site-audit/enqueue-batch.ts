/**
 * TASK-1304 — Batch semanal de encolado de site audits (Cloud Scheduler → ops-worker).
 *
 * Itera los targets activos de orgs con assignment `seo_v1` vigente y encola un audit
 * OnPage por target con per-target resilience (patrón `rank-capture-batch`): un target
 * bloqueado por cupo/presupuesto se registra y el batch continúa. El filtro por
 * assignment es de ELEGIBILIDAD; el enforcement real lo hace el command vía el
 * chokepoint (`enforceSeoRunEntitlement`, que acá SÍ consume el cupo de audits).
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { SEO_MODULE_KEYS_READ } from '../entitlement'
import { queueSiteAudit } from './queue-audit'

/** Actor de sistema con el que el cron ejecuta el command gobernado. */
export const SEO_SITE_AUDIT_CRON_ACTOR = 'system:seo-audit-enqueue-cron'

export interface SiteAuditEnqueueTargetOutcome {
  seoTargetId: string
  organizationId: string
  /**
   * `queued` = task creada · `skipped` = idempotencia sin gasto (ya en vuelo / ya
   * capturado hoy) · `blocked` = gate (entitlement/cupo/presupuesto) · `failed` =
   * provider/breaker o error inesperado.
   */
  status: 'queued' | 'skipped' | 'blocked' | 'failed'
  auditRunId: string | null
  costUsd: number
  errorCode: string | null
}

export interface SiteAuditEnqueueBatchResult {
  targets: number
  queued: number
  skipped: number
  blocked: number
  failed: number
  costUsd: number
  outcomes: SiteAuditEnqueueTargetOutcome[]
}

type EligibleTargetRow = {
  seo_target_id: string
  organization_id: string
}

const SKIP_CODES: ReadonlySet<string> = new Set(['audit_already_running', 'already_captured_today'])

const BLOCK_CODES: ReadonlySet<string> = new Set([
  'no_entitlement',
  'expired',
  'quota_exhausted',
  'budget_exhausted',
  'disabled'
])

/** Mismo predicado de elegibilidad que el rank capture batch (vigencia del assignment). */
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

export const runSiteAuditEnqueueBatch = async (
  options: { captureDate?: string; maxTargets?: number } = {}
): Promise<SiteAuditEnqueueBatchResult> => {
  const targets = await listEligibleTargets(options.maxTargets)
  const outcomes: SiteAuditEnqueueTargetOutcome[] = []

  for (const target of targets) {
    try {
      const result = await queueSiteAudit(target.seo_target_id, SEO_SITE_AUDIT_CRON_ACTOR, {
        captureDate: options.captureDate
      })

      if (result.ok) {
        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: 'queued',
          auditRunId: result.auditRunId,
          costUsd: result.providerCostUsd,
          errorCode: null
        })
      } else {
        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: SKIP_CODES.has(result.errorCode)
            ? 'skipped'
            : BLOCK_CODES.has(result.errorCode)
              ? 'blocked'
              : 'failed',
          auditRunId: null,
          costUsd: 0,
          errorCode: result.errorCode
        })
      }
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_site_audit_enqueue_batch' },
        extra: { seoTargetId: target.seo_target_id, organizationId: target.organization_id }
      })

      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status: 'failed',
        auditRunId: null,
        costUsd: 0,
        errorCode: 'unexpected_error'
      })
    }
  }

  return {
    targets: targets.length,
    queued: outcomes.filter(outcome => outcome.status === 'queued').length,
    skipped: outcomes.filter(outcome => outcome.status === 'skipped').length,
    blocked: outcomes.filter(outcome => outcome.status === 'blocked').length,
    failed: outcomes.filter(outcome => outcome.status === 'failed').length,
    costUsd: outcomes.reduce((total, outcome) => total + outcome.costUsd, 0),
    outcomes
  }
}

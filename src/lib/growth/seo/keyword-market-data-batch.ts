/**
 * TASK-1661 — Batch MENSUAL de captura de datos de mercado (Cloud Scheduler → ops-worker).
 *
 * ⚠️ **Mensual y no diario, a propósito.** DataForSEO refresca las métricas de keyword UNA VEZ
 * AL MES siguiendo el ciclo de Google Ads. Un cron diario pagaría 30 veces por el mismo número.
 * El pre-check de frescura del command lo haría inofensivo igual, pero la cadencia correcta
 * evita depender de esa red de seguridad.
 *
 * Itera los targets activos de orgs con assignment vigente y captura por target con per-target
 * resilience (patrón `rank-capture-batch` / `site-audit/enqueue-batch`): un target bloqueado por
 * presupuesto se registra y el batch continúa — el presupuesto de un cliente no puede impedir
 * capturar el de los demás. El filtro por assignment es de ELEGIBILIDAD; el enforcement real lo
 * hace el command vía `enforceSeoRunEntitlement`.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { SEO_MODULE_KEYS_READ } from './entitlement'
import { captureKeywordMarketData, previewKeywordMarketDataCapture } from './keyword-market-data'

export interface KeywordMarketDataTargetOutcome {
  seoTargetId: string
  organizationId: string
  /**
   * `captured` = filas nuevas · `skipped` = nada que comprar (todo fresco o sin keywords) ·
   * `blocked` = gate de entitlement/presupuesto · `failed` = proveedor o error inesperado.
   */
  status: 'captured' | 'skipped' | 'blocked' | 'failed'
  keywords: number
  captured: number
  costUsd: number
  errorCode: string | null
}

export interface KeywordMarketDataBatchResult {
  targets: number
  captured: number
  skipped: number
  blocked: number
  failed: number
  costUsd: number
  /** Costo estimado agregado del dry-run. Sólo presente en modo `dryRun`. */
  estimatedCostUsd?: number
  dryRun: boolean
  outcomes: KeywordMarketDataTargetOutcome[]
}

type EligibleTargetRow = {
  seo_target_id: string
  organization_id: string
}

const BLOCK_CODES: ReadonlySet<string> = new Set([
  'no_entitlement',
  'expired',
  'quota_exhausted',
  'budget_exhausted',
  'disabled'
])

const SKIP_CODES: ReadonlySet<string> = new Set(['no_keywords', 'target_not_found'])

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

/**
 * Corre la captura de mercado sobre todos los targets elegibles.
 *
 * 🔴 `dryRun: true` NO gasta: usa el preview y reporta lo que se compraría y cuánto costaría.
 * Es el modo que exige la task antes de la primera corrida con gasto.
 */
export const runKeywordMarketDataBatch = async (
  options: { maxTargets?: number; dryRun?: boolean } = {}
): Promise<KeywordMarketDataBatchResult> => {
  const dryRun = options.dryRun === true
  const targets = await listEligibleTargets(options.maxTargets)

  const outcomes: KeywordMarketDataTargetOutcome[] = []
  let captured = 0
  let skipped = 0
  let blocked = 0
  let failed = 0
  let costUsd = 0
  let estimatedCostUsd = 0

  for (const target of targets) {
    try {
      if (dryRun) {
        const preview = await previewKeywordMarketDataCapture(target.seo_target_id)

        if (!preview.ok) {
          const status = SKIP_CODES.has(preview.errorCode) ? 'skipped' : 'blocked'

          if (status === 'skipped') skipped += 1
          else blocked += 1

          outcomes.push({
            seoTargetId: target.seo_target_id,
            organizationId: target.organization_id,
            status,
            keywords: 0,
            captured: 0,
            costUsd: 0,
            errorCode: preview.errorCode
          })
          continue
        }

        estimatedCostUsd += preview.estimatedCostUsd

        // El dry-run no compra nada, así que "captured" no aplica: se reporta lo PENDIENTE.
        if (preview.pendingKeywords === 0) skipped += 1
        else captured += 1

        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: preview.pendingKeywords === 0 ? 'skipped' : 'captured',
          keywords: preview.trackedKeywords,
          captured: preview.pendingKeywords,
          costUsd: preview.estimatedCostUsd,
          errorCode: preview.wouldBeAllowed ? null : preview.blockedReason
        })
        continue
      }

      const result = await captureKeywordMarketData(target.seo_target_id)

      if (!result.ok) {
        const status = SKIP_CODES.has(result.errorCode) ? 'skipped' : BLOCK_CODES.has(result.errorCode) ? 'blocked' : 'failed'

        if (status === 'skipped') skipped += 1
        else if (status === 'blocked') blocked += 1
        else failed += 1

        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status,
          keywords: 0,
          captured: 0,
          costUsd: 0,
          errorCode: result.errorCode
        })
        continue
      }

      costUsd += result.costUsd

      // Un proveedor caído para TODAS las keywords no es un éxito con cero filas: se declara
      // `failed` aunque el command haya devuelto ok (degradación honesta, patrón TASK-1303).
      const providerDown = result.providerErrors > 0 && result.captured === 0
      const status = providerDown ? 'failed' : result.captured > 0 ? 'captured' : 'skipped'

      if (status === 'captured') captured += 1
      else if (status === 'skipped') skipped += 1
      else failed += 1

      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status,
        keywords: result.keywords,
        captured: result.captured,
        costUsd: result.costUsd,
        errorCode: providerDown ? 'provider_error' : null
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_keyword_market_data_batch' },
        extra: { seoTargetId: target.seo_target_id }
      })

      failed += 1
      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status: 'failed',
        keywords: 0,
        captured: 0,
        costUsd: 0,
        errorCode: 'unexpected_error'
      })
    }
  }

  return {
    targets: targets.length,
    captured,
    skipped,
    blocked,
    failed,
    costUsd,
    ...(dryRun ? { estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)) } : {}),
    dryRun,
    outcomes
  }
}

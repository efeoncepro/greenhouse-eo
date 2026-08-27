/**
 * TASK-1775 — Screening de cartera vía DataForSEO Labs `bulk_traffic_estimation`.
 *
 * Contesta "de esta lista de 40 competidores, ¿cuáles son grandes de verdad?" ANTES de gastar
 * en el detalle de cada uno: hasta 1.000 dominios por request a ~USD 0.13 el barrido completo.
 * Escribe en la MISMA tabla del hecho de dominio (patrón multi-productor) con las columnas que
 * este endpoint sí puebla (`etv` + `count`, orgánico y pago) y NULL en las que no (distribución
 * de posiciones, momentum).
 *
 * Contrato de gasto (patrón TASK-1661):
 *   - pre-check de frescura ANY-SOURCE: un dominio con foto completa O screening vigente no se
 *     re-compra (ambos llevan el mismo `etv`);
 *   - `enforceSeoRunEntitlement` con el estimado del batch completo antes de la primera llamada;
 *   - dominio que el proveedor no conoce → fila con NULLs (sin ella se re-compra por siempre);
 *   - el ledger de gasto lo escribe el TRANSPORTE.
 */

import 'server-only'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'

import { enforceSeoRunEntitlement } from '../entitlement'
import { isSeoModuleEnabled } from '../flags'
import { LABS_RESULT_ROW_USD, LABS_TASK_SETUP_USD } from '../provider-pricing'
import {
  buildNullSnapshot,
  loadFreshOverviewDomains,
  normalizeOverviewDomain,
  persistDomainOverviewSnapshots,
  type SeoDomainOverviewSnapshotInput
} from './persist'

/** Máximo documentado del proveedor: 1.000 targets por request (doc as-of 2026-08-27). */
export const MAX_DOMAINS_PER_BULK_CALL = 1000

/** Shape del item de `bulk_traffic_estimation` (sólo etv + count por canal). */
export interface BulkTrafficItemRaw {
  target?: string | null
  metrics?: {
    organic?: { etv?: number | null; count?: number | null } | null
    paid?: { etv?: number | null; count?: number | null } | null
  } | null
}

const asNonNegativeInt = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null

  return Math.round(value)
}

const asNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null

  return value
}

/**
 * Proyecta un item de bulk al hecho persistible: sólo `etv`+`count`; el resto NULL — el
 * screening NUNCA finge ser la foto completa. Pura y exportada para probarse sin red.
 */
export const parseBulkTrafficItem = (
  item: BulkTrafficItemRaw,
  context: { locationCode: string; languageCode: string }
): SeoDomainOverviewSnapshotInput | null => {
  const target = typeof item.target === 'string' ? item.target.trim() : ''

  if (!target) return null

  const base = buildNullSnapshot({
    domain: target,
    locationCode: context.locationCode,
    languageCode: context.languageCode,
    captureDate: null,
    sourceEndpoint: 'bulk_traffic_estimation'
  })

  return {
    ...base,
    organic: {
      ...base.organic,
      count: asNonNegativeInt(item.metrics?.organic?.count),
      etv: asNonNegativeNumber(item.metrics?.organic?.etv)
    },
    paid: {
      count: asNonNegativeInt(item.metrics?.paid?.count),
      etv: asNonNegativeNumber(item.metrics?.paid?.etv),
      estimatedPaidTrafficCostUsd: null
    }
  }
}

/** Costo determinista del screening. Puro: preview y corrida comparten la fuente. */
export const estimateBulkTrafficCost = (
  pendingDomains: number
): { providerCalls: number; estimatedCostUsd: number; formula: string } => {
  const providerCalls = Math.ceil(pendingDomains / MAX_DOMAINS_PER_BULK_CALL)
  const total = providerCalls * LABS_TASK_SETUP_USD + pendingDomains * LABS_RESULT_ROW_USD

  return {
    providerCalls,
    estimatedCostUsd: Number(total.toFixed(6)),
    formula:
      `${providerCalls} llamada(s) × USD ${LABS_TASK_SETUP_USD} (task setup) + ` +
      `${pendingDomains} dominio(s) × USD ${LABS_RESULT_ROW_USD}`
  }
}

export type TrafficEstimationDomainStatus =
  | 'estimated'
  /** Snapshot vigente (foto o screening) dentro del ciclo: no se re-compra. */
  | 'fresh'
  /** El proveedor respondió OK pero no conoce el dominio: fila con NULLs. */
  | 'no_market_data'
  | 'budget_blocked'
  | 'provider_error'

export interface TrafficEstimationDomainOutcome {
  domain: string
  status: TrafficEstimationDomainStatus
  organicEtv: number | null
  organicCount: number | null
  errorCode: string | null
}

export type EstimateDomainTrafficResult =
  | {
      ok: true
      organizationId: string
      locationCode: string
      languageCode: string
      domains: number
      estimated: number
      fresh: number
      noMarketData: number
      budgetBlocked: number
      providerErrors: number
      providerCalls: number
      costUsd: number
      outcomes: TrafficEstimationDomainOutcome[]
    }
  | {
      ok: false
      errorCode:
        | 'disabled'
        | 'no_domains'
        | 'too_many_domains'
        | 'no_entitlement'
        | 'expired'
        | 'budget_exhausted'
        | 'quota_exhausted'
      status: null
    }

/**
 * Screening real. GASTA (poco: ~USD 0.13 por 1.000 dominios), gateado por entitlement de la
 * org que dispara. Acepta hasta 1.000 dominios por request; listas mayores se trocean.
 */
export const estimateDomainTraffic = async (input: {
  organizationId: string
  domains: readonly string[]
  locationCode: string
  languageCode: string
}): Promise<EstimateDomainTrafficResult> => {
  if (!isSeoModuleEnabled()) return { ok: false, errorCode: 'disabled', status: null }

  const byNormalized = new Map<string, string>()

  for (const raw of input.domains) {
    const normalized = normalizeOverviewDomain(raw)

    if (normalized && !byNormalized.has(normalized)) byNormalized.set(normalized, raw)
  }

  const subjects = [...byNormalized.entries()]

  if (subjects.length === 0) return { ok: false, errorCode: 'no_domains', status: null }

  // Techo defensivo de la corrida: 5 chunks del máximo del proveedor. Una lista mayor es un
  // barrido de mercado completo y merece su propia decisión de gasto, no un default.
  if (subjects.length > MAX_DOMAINS_PER_BULK_CALL * 5) {
    return { ok: false, errorCode: 'too_many_domains', status: null }
  }

  const fresh = await loadFreshOverviewDomains({
    normalizedDomains: subjects.map(([normalized]) => normalized),
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    sourceEndpoints: ['domain_rank_overview', 'historical_rank_overview', 'bulk_traffic_estimation']
  })

  const pending = subjects.filter(([normalized]) => !fresh.has(normalized))

  const outcomes: TrafficEstimationDomainOutcome[] = subjects
    .filter(([normalized]) => fresh.has(normalized))
    .map(([, raw]) => ({ domain: raw, status: 'fresh' as const, organicEtv: null, organicCount: null, errorCode: null }))

  let estimated = 0
  let noMarketData = 0
  const budgetBlocked = 0
  let providerErrors = 0
  let providerCalls = 0
  let costUsd = 0

  const finalize = (): EstimateDomainTrafficResult => ({
    ok: true,
    organizationId: input.organizationId,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    domains: subjects.length,
    estimated,
    fresh: fresh.size,
    noMarketData,
    budgetBlocked,
    providerErrors,
    providerCalls,
    costUsd: Number(costUsd.toFixed(6)),
    outcomes
  })

  if (pending.length === 0) return finalize()

  const { estimatedCostUsd } = estimateBulkTrafficCost(pending.length)

  const gate = await enforceSeoRunEntitlement(input.organizationId, {
    estimatedCostUsd,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    const reason = gate.blockedReason

    return {
      ok: false,
      errorCode:
        reason === 'expired' || reason === 'budget_exhausted' || reason === 'quota_exhausted' ? reason : 'no_entitlement',
      status: null
    }
  }

  const chunks: Array<Array<[string, string]>> = []

  for (let index = 0; index < pending.length; index += MAX_DOMAINS_PER_BULK_CALL) {
    chunks.push(pending.slice(index, index + MAX_DOMAINS_PER_BULK_CALL))
  }

  for (const chunk of chunks) {
    try {
      const response = await postDataForSeoTask({
        family: 'labs',
        endpoint: '/v3/dataforseo_labs/google/bulk_traffic_estimation/live',
        organizationId: input.organizationId,
        tasks: [
          {
            targets: chunk.map(([normalized]) => normalized),
            location_code: Number(input.locationCode),
            language_code: input.languageCode,
            // Sólo los canales que la tabla modela; cada item devuelto se cobra.
            item_types: ['organic', 'paid']
          }
        ]
      })

      const providerCostUsd = response.cost ?? 0

      providerCalls += 1
      costUsd += providerCostUsd

      const task = (response.tasks?.[0] ?? {}) as {
        status_code?: number
        result?: Array<{ items?: BulkTrafficItemRaw[] }>
      }

      if (!response.ok || task.status_code !== 20000) {
        // Proveedor caído NUNCA se disfraza de "sin dato": sin veredicto no se escribe nada.
        for (const [, raw] of chunk) {
          providerErrors += 1
          outcomes.push({
            domain: raw,
            status: 'provider_error',
            organicEtv: null,
            organicCount: null,
            errorCode: `task_status_${String(task.status_code ?? response.httpStatus)}`
          })
        }

        continue
      }

      const items = task.result?.[0]?.items ?? []
      const parsedByNormalized = new Map<string, SeoDomainOverviewSnapshotInput>()

      for (const item of items) {
        const parsed = parseBulkTrafficItem(item, {
          locationCode: input.locationCode,
          languageCode: input.languageCode
        })

        if (parsed) parsedByNormalized.set(parsed.normalizedDomain, parsed)
      }

      const snapshots: SeoDomainOverviewSnapshotInput[] = []

      for (const [normalized, raw] of chunk) {
        const found = parsedByNormalized.get(normalized)

        // 🔴 TRES estados (invariante TASK-1661): fila ausente = nunca preguntamos · fila con
        // NULL = preguntamos y no hay dato · fila con 0 = el proveedor dice tráfico cero.
        snapshots.push(
          found ??
            buildNullSnapshot({
              domain: raw,
              locationCode: input.locationCode,
              languageCode: input.languageCode,
              captureDate: null,
              sourceEndpoint: 'bulk_traffic_estimation'
            })
        )

        if (found) {
          estimated += 1
          outcomes.push({
            domain: raw,
            status: 'estimated',
            organicEtv: found.organic.etv,
            organicCount: found.organic.count,
            errorCode: null
          })
        } else {
          noMarketData += 1
          outcomes.push({ domain: raw, status: 'no_market_data', organicEtv: null, organicCount: null, errorCode: null })
        }
      }

      await persistDomainOverviewSnapshots({
        snapshots,
        capturedByOrganizationId: input.organizationId,
        providerCostUsd
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_domain_traffic_estimation' },
        extra: { organizationId: input.organizationId, chunkSize: chunk.length }
      })

      for (const [, raw] of chunk) {
        providerErrors += 1
        outcomes.push({
          domain: raw,
          status: 'provider_error',
          organicEtv: null,
          organicCount: null,
          errorCode: 'provider_unreachable'
        })
      }
    }
  }

  return finalize()
}

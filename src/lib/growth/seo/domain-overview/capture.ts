/**
 * TASK-1775 — Colector mensual de la foto de dominio vía DataForSEO Labs `domain_rank_overview`.
 *
 * Contesta lo que `readSeoOverviewKpis` no puede: cuántas keywords ranquea un dominio EN TOTAL
 * (no sólo el recorte seguido), cuánto tráfico orgánico estima el mercado y cómo se distribuye
 * su top-100 — del target Y de sus competidores declarados, que no tienen GSC ni set.
 *
 * ⚠️ **Lente ◑ estimada, NUNCA ● medida.** Nada de esta tabla se promedia, suma ni grafica en
 * la misma serie que GSC (boundary §5 de la arquitectura del módulo).
 *
 * Contrato de gasto (patrón TASK-1661 / `keyword-market-data.ts`):
 *   - pre-check de FRESCURA antes del provider — un sujeto con foto vigente NO se re-compra;
 *     el ciclo es mensual y repetir la corrida dentro del ciclo cuesta CERO;
 *   - la frescura de la foto exige una fila de `domain_rank_overview`: una fila de screening
 *     (más pobre) no ahoga la foto completa;
 *   - `enforceSeoRunEntitlement` con el estimado del batch completo + spend fence cada K;
 *   - sujeto que el proveedor no conoce → fila con NULLs (sin ella se re-compra para siempre);
 *   - `ON CONFLICT DO NOTHING`; el ledger de gasto lo escribe el TRANSPORTE.
 */

import 'server-only'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  SEO_DOMAIN_OVERVIEW_AGGREGATE_TYPE,
  SEO_DOMAIN_OVERVIEW_SNAPSHOT_CAPTURED_EVENT
} from '../contracts'
import { enforceSeoRunEntitlement, SEO_MODULE_KEYS_READ } from '../entitlement'
import { isSeoDomainOverviewEnabled, isSeoModuleEnabled } from '../flags'
import { LABS_RESULT_ROW_USD, LABS_TASK_SETUP_USD } from '../provider-pricing'
import {
  buildNullSnapshot,
  loadFreshOverviewDomains,
  normalizeOverviewDomain,
  persistDomainOverviewSnapshots,
  type SeoDomainOverviewSnapshotInput,
  type SeoDomainSideMetrics
} from './persist'

/** Espejo del patrón TASK-1303/1661: re-consulta del gate cada K llamadas cobradas. */
const SPEND_FENCE_RECHECK_EVERY = 10

const asNonNegativeInt = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null

  return Math.round(value)
}

const asNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null

  return value
}

/** Shape del bloque `metrics.organic` / `metrics.paid` del proveedor (doc as-of 2026-08-27). */
export interface DomainRankOverviewSideRaw {
  pos_1?: number | null
  pos_2_3?: number | null
  pos_4_10?: number | null
  pos_11_20?: number | null
  pos_21_30?: number | null
  pos_31_40?: number | null
  pos_41_50?: number | null
  pos_51_60?: number | null
  pos_61_70?: number | null
  pos_71_80?: number | null
  pos_81_90?: number | null
  pos_91_100?: number | null
  count?: number | null
  etv?: number | null
  estimated_paid_traffic_cost?: number | null
  is_new?: number | null
  is_up?: number | null
  is_down?: number | null
  is_lost?: number | null
}

export interface DomainRankOverviewItemRaw {
  se_type?: string
  location_code?: number | null
  language_code?: string | null
  metrics?: {
    organic?: DomainRankOverviewSideRaw | null
    paid?: DomainRankOverviewSideRaw | null
  } | null
}

/**
 * Proyecta un lado (orgánico/pago) del item del proveedor. Pura y exportada: es la pieza que
 * cambia si el proveedor cambia su shape, así que se prueba sin base ni red.
 *
 * ⚠️ Todo campo ausente se proyecta como `null`, NUNCA como 0: "el proveedor no entregó la
 * métrica" y "el dominio no ranquea" son hechos distintos.
 */
export const parseDomainOverviewSide = (side: DomainRankOverviewSideRaw | null | undefined): SeoDomainSideMetrics => {
  const raw = side ?? {}

  return {
    positions: {
      pos1: asNonNegativeInt(raw.pos_1),
      pos2_3: asNonNegativeInt(raw.pos_2_3),
      pos4_10: asNonNegativeInt(raw.pos_4_10),
      pos11_20: asNonNegativeInt(raw.pos_11_20),
      pos21_30: asNonNegativeInt(raw.pos_21_30),
      pos31_40: asNonNegativeInt(raw.pos_31_40),
      pos41_50: asNonNegativeInt(raw.pos_41_50),
      pos51_60: asNonNegativeInt(raw.pos_51_60),
      pos61_70: asNonNegativeInt(raw.pos_61_70),
      pos71_80: asNonNegativeInt(raw.pos_71_80),
      pos81_90: asNonNegativeInt(raw.pos_81_90),
      pos91_100: asNonNegativeInt(raw.pos_91_100)
    },
    count: asNonNegativeInt(raw.count),
    etv: asNonNegativeNumber(raw.etv),
    estimatedPaidTrafficCostUsd: asNonNegativeNumber(raw.estimated_paid_traffic_cost),
    isNew: asNonNegativeInt(raw.is_new),
    isUp: asNonNegativeInt(raw.is_up),
    isDown: asNonNegativeInt(raw.is_down),
    isLost: asNonNegativeInt(raw.is_lost)
  }
}

/** Proyecta el item completo al hecho persistible de la foto mensual. */
export const parseDomainRankOverviewItem = (
  item: DomainRankOverviewItemRaw,
  context: { domain: string; locationCode: string; languageCode: string }
): SeoDomainOverviewSnapshotInput => {
  const organic = parseDomainOverviewSide(item.metrics?.organic)
  const paid = parseDomainOverviewSide(item.metrics?.paid)

  return {
    normalizedDomain: normalizeOverviewDomain(context.domain),
    domain: context.domain,
    locationCode: context.locationCode,
    languageCode: context.languageCode,
    captureDate: null,
    sourceEndpoint: 'domain_rank_overview',
    organic,
    paid: {
      count: paid.count,
      etv: paid.etv,
      estimatedPaidTrafficCostUsd: paid.estimatedPaidTrafficCostUsd
    }
  }
}

/**
 * Costo determinista de una corrida: un request por sujeto (el endpoint recibe UN target), y
 * con mercado fijo el proveedor devuelve UNA fila por request. Puro: preview y captura
 * comparten esta única fuente.
 */
export const estimateDomainOverviewCost = (
  pendingSubjects: number
): { providerCalls: number; estimatedCostUsd: number; formula: string } => {
  const providerCalls = pendingSubjects
  const total = pendingSubjects * (LABS_TASK_SETUP_USD + LABS_RESULT_ROW_USD)

  return {
    providerCalls,
    estimatedCostUsd: Number(total.toFixed(6)),
    formula:
      `${pendingSubjects} sujeto(s) × (USD ${LABS_TASK_SETUP_USD} task setup + ` +
      `USD ${LABS_RESULT_ROW_USD} por fila devuelta)`
  }
}

export type DomainOverviewSubjectStatus =
  | 'captured'
  /** Foto vigente dentro del ciclo: NO se pega el proveedor, costo cero. */
  | 'fresh'
  /** El proveedor respondió OK pero no conoce el sujeto: fila con NULLs, hecho con fecha. */
  | 'no_market_data'
  | 'budget_blocked'
  | 'provider_error'

export interface DomainOverviewSubjectOutcome {
  domain: string
  status: DomainOverviewSubjectStatus
  providerCostUsd: number
  errorCode: string | null
}

type DomainOverviewBlockedReason = 'no_entitlement' | 'expired' | 'budget_exhausted' | 'quota_exhausted'

export type CaptureDomainOverviewResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      captureDate: string
      subjects: number
      captured: number
      fresh: number
      noMarketData: number
      budgetBlocked: number
      providerErrors: number
      providerCalls: number
      costUsd: number
      outcomes: DomainOverviewSubjectOutcome[]
    }
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found' | DomainOverviewBlockedReason
      status: null
    }

export type PreviewDomainOverviewResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      locationCode: string
      languageCode: string
      subjects: number
      /** Sujetos con foto dentro de la ventana de frescura: NO se vuelven a comprar. */
      fresh: number
      pendingSubjects: number
      providerCalls: number
      estimatedCostUsd: number
      /** La fórmula en texto: el preview muestra el cálculo, no sólo un número. */
      formula: string
      budgetRemainingUsd: number | null
      wouldBeAllowed: boolean
      blockedReason: string | null
    }
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found'
      status: null
    }

const mapBlockedReason = (reason: string | null): DomainOverviewBlockedReason => {
  switch (reason) {
    case 'expired':
      return 'expired'
    case 'budget_exhausted':
      return 'budget_exhausted'
    case 'quota_exhausted':
      return 'quota_exhausted'
    default:
      return 'no_entitlement'
  }
}

type ResolvedTarget = {
  seo_target_id: string
  organization_id: string
  root_domain: string
  location_code: string
  language_code: string
}

const loadTarget = async (seoTargetId: string): Promise<ResolvedTarget | null> => {
  const rows = await runGreenhousePostgresQuery<ResolvedTarget>(
    `SELECT seo_target_id, organization_id, root_domain, location_code, language_code
       FROM greenhouse_growth.seo_targets
      WHERE seo_target_id = $1
        AND status = 'active'`,
    [seoTargetId]
  )

  return rows[0] ?? null
}

/**
 * Sujetos de la corrida: el dominio del target + sus competidores VIGENTES. La foto del
 * competidor es la mitad del valor de esta capa — de un competidor no hay GSC ni set.
 */
const loadSubjects = async (target: ResolvedTarget): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ competitor_domain: string }>(
    `SELECT competitor_domain
       FROM greenhouse_growth.seo_competitors
      WHERE seo_target_id = $1
        AND effective_to IS NULL
      ORDER BY competitor_domain`,
    [target.seo_target_id]
  )

  const byNormalized = new Map<string, string>()

  for (const raw of [target.root_domain, ...rows.map(row => row.competitor_domain)]) {
    const normalized = normalizeOverviewDomain(raw)

    if (normalized && !byNormalized.has(normalized)) byNormalized.set(normalized, raw)
  }

  return [...byNormalized.values()]
}

const resolveFreshness = async (target: ResolvedTarget, subjects: string[]) => {
  const normalized = subjects.map(normalizeOverviewDomain)

  // La foto mensual sólo se considera fresca si la escribió `domain_rank_overview`: una fila
  // de screening trae ETV pero no la distribución de posiciones, y aceptarla dejaría la foto
  // completa sin capturar para siempre.
  const fresh = await loadFreshOverviewDomains({
    normalizedDomains: normalized,
    locationCode: target.location_code,
    languageCode: target.language_code,
    sourceEndpoints: ['domain_rank_overview']
  })

  return {
    fresh,
    pending: subjects.filter(subject => !fresh.has(normalizeOverviewDomain(subject)))
  }
}

/**
 * DRY RUN. Reporta qué sujetos se comprarían y cuánto costaría, sin gastar un peso. Es el
 * modo que exige la task antes de la primera corrida con gasto.
 */
export const previewDomainOverviewCapture = async (seoTargetId: string): Promise<PreviewDomainOverviewResult> => {
  if (!isSeoModuleEnabled() || !isSeoDomainOverviewEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const target = await loadTarget(seoTargetId)

  if (!target) return { ok: false, errorCode: 'target_not_found', status: null }

  const subjects = await loadSubjects(target)
  const { fresh, pending } = await resolveFreshness(target, subjects)
  const { providerCalls, estimatedCostUsd, formula } = estimateDomainOverviewCost(pending.length)

  const gate = await enforceSeoRunEntitlement(target.organization_id, {
    estimatedCostUsd,
    consumesAuditAllowance: false
  })

  return {
    ok: true,
    seoTargetId,
    organizationId: target.organization_id,
    locationCode: target.location_code,
    languageCode: target.language_code,
    subjects: subjects.length,
    fresh: fresh.size,
    pendingSubjects: pending.length,
    providerCalls,
    estimatedCostUsd,
    formula,
    budgetRemainingUsd: gate.budgetRemainingUsd ?? null,
    wouldBeAllowed: gate.allowed,
    blockedReason: gate.blockedReason ?? null
  }
}

/**
 * Captura real. GASTA. Sólo corre con ambos flags ON y tras pasar el gate de entitlement.
 * Un sujeto fresco se reporta `fresh`, no `captured` — el resumen dice la verdad del gasto.
 */
export const captureDomainOverview = async (seoTargetId: string): Promise<CaptureDomainOverviewResult> => {
  if (!isSeoModuleEnabled() || !isSeoDomainOverviewEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const target = await loadTarget(seoTargetId)

  if (!target) return { ok: false, errorCode: 'target_not_found', status: null }

  const subjects = await loadSubjects(target)
  const { fresh, pending } = await resolveFreshness(target, subjects)

  const outcomes: DomainOverviewSubjectOutcome[] = subjects
    .filter(subject => fresh.has(normalizeOverviewDomain(subject)))
    .map(subject => ({ domain: subject, status: 'fresh' as const, providerCostUsd: 0, errorCode: null }))

  const captureDate = new Date().toISOString().slice(0, 10)

  const buildSummary = (
    counters: { captured: number; noMarketData: number; budgetBlocked: number; providerErrors: number; providerCalls: number; costUsd: number }
  ): CaptureDomainOverviewResult => ({
    ok: true,
    seoTargetId,
    organizationId: target.organization_id,
    captureDate,
    subjects: subjects.length,
    captured: counters.captured,
    fresh: fresh.size,
    noMarketData: counters.noMarketData,
    budgetBlocked: counters.budgetBlocked,
    providerErrors: counters.providerErrors,
    providerCalls: counters.providerCalls,
    costUsd: Number(counters.costUsd.toFixed(6)),
    outcomes
  })

  if (pending.length === 0) {
    return buildSummary({ captured: 0, noMarketData: 0, budgetBlocked: 0, providerErrors: 0, providerCalls: 0, costUsd: 0 })
  }

  const { estimatedCostUsd } = estimateDomainOverviewCost(pending.length)

  const gate = await enforceSeoRunEntitlement(target.organization_id, {
    estimatedCostUsd,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    return { ok: false, errorCode: mapBlockedReason(gate.blockedReason), status: null }
  }

  let captured = 0
  let noMarketData = 0
  let budgetBlocked = 0
  let providerErrors = 0
  let providerCalls = 0
  let costUsd = 0
  let fenceTripped = false

  for (let index = 0; index < pending.length; index += 1) {
    const domain = pending[index]

    if (providerCalls > 0 && providerCalls % SPEND_FENCE_RECHECK_EVERY === 0 && !fenceTripped) {
      const remaining = pending.length - index

      const fence = await enforceSeoRunEntitlement(target.organization_id, {
        estimatedCostUsd: estimateDomainOverviewCost(remaining).estimatedCostUsd,
        consumesAuditAllowance: false
      })

      if (!fence.allowed) fenceTripped = true
    }

    if (fenceTripped) {
      budgetBlocked += 1
      outcomes.push({ domain, status: 'budget_blocked', providerCostUsd: 0, errorCode: 'budget_exhausted' })
      continue
    }

    try {
      const response = await postDataForSeoTask({
        family: 'labs',
        endpoint: '/v3/dataforseo_labs/google/domain_rank_overview/live',
        organizationId: target.organization_id,
        tasks: [
          {
            target: normalizeOverviewDomain(domain),
            location_code: Number(target.location_code),
            language_code: target.language_code,
            // Con mercado fijo el proveedor devuelve UNA fila; el limit acota el peor caso
            // porque cada fila devuelta se cobra.
            limit: 1
          }
        ]
      })

      const providerCostUsd = response.cost ?? 0

      providerCalls += 1
      costUsd += providerCostUsd

      const task = (response.tasks?.[0] ?? {}) as {
        status_code?: number
        result?: Array<{ items?: DomainRankOverviewItemRaw[] }>
      }

      if (!response.ok || task.status_code !== 20000) {
        // Proveedor caído NUNCA se disfraza de "sin dato": sin veredicto no se escribe nada
        // (escribir NULLs acá marcaría fresco un sujeto que jamás se observó).
        providerErrors += 1
        outcomes.push({
          domain,
          status: 'provider_error',
          providerCostUsd,
          errorCode: `task_status_${String(task.status_code ?? response.httpStatus)}`
        })
        continue
      }

      const item = task.result?.[0]?.items?.[0] ?? null

      const snapshot = item
        ? parseDomainRankOverviewItem(item, {
            domain,
            locationCode: target.location_code,
            languageCode: target.language_code
          })
        : // 🔴 El proveedor respondió bien pero no conoce el dominio: fila con NULLs, con
          // fecha. Sin ella el sujeto nunca queda "fresco" y se re-compra en cada corrida,
          // para siempre (bug de costo del smoke de TASK-1661).
          buildNullSnapshot({
            domain,
            locationCode: target.location_code,
            languageCode: target.language_code,
            captureDate: null,
            sourceEndpoint: 'domain_rank_overview'
          })

      await persistDomainOverviewSnapshots({
        snapshots: [snapshot],
        capturedByOrganizationId: target.organization_id,
        providerCostUsd
      })

      if (item) {
        captured += 1
        outcomes.push({ domain, status: 'captured', providerCostUsd, errorCode: null })
      } else {
        noMarketData += 1
        outcomes.push({ domain, status: 'no_market_data', providerCostUsd, errorCode: null })
      }
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_domain_overview_capture' },
        extra: { seoTargetId, domain }
      })

      providerErrors += 1
      outcomes.push({ domain, status: 'provider_error', providerCostUsd: 0, errorCode: 'provider_unreachable' })
    }
  }

  // El evento lleva coordenadas; el consumer re-lee PG. Sólo se emite si algo cambió de verdad.
  if (captured > 0 || noMarketData > 0) {
    await publishOutboxEvent({
      aggregateType: SEO_DOMAIN_OVERVIEW_AGGREGATE_TYPE,
      aggregateId: seoTargetId,
      eventType: SEO_DOMAIN_OVERVIEW_SNAPSHOT_CAPTURED_EVENT,
      payload: {
        seoTargetId,
        organizationId: target.organization_id,
        captureDate,
        subjects: subjects.length,
        captured,
        noMarketData,
        costUsd: Number(costUsd.toFixed(6)),
        actor: 'ops_worker'
      }
    })
  }

  return buildSummary({ captured, noMarketData, budgetBlocked, providerErrors, providerCalls, costUsd })
}

// ─── Batch (Cloud Scheduler → ops-worker) ───────────────────────────────────────────────────

export interface DomainOverviewTargetOutcome {
  seoTargetId: string
  organizationId: string
  /**
   * `captured` = compró al menos un sujeto · `skipped` = nada que comprar (todo fresco) ·
   * `blocked` = gate de entitlement/presupuesto · `failed` = proveedor o error inesperado.
   */
  status: 'captured' | 'skipped' | 'blocked' | 'failed'
  subjects: number
  captured: number
  costUsd: number
  errorCode: string | null
}

export interface DomainOverviewBatchResult {
  targets: number
  captured: number
  skipped: number
  blocked: number
  failed: number
  costUsd: number
  /** Costo estimado agregado del dry-run. Sólo presente en modo `dryRun`. */
  estimatedCostUsd?: number
  dryRun: boolean
  outcomes: DomainOverviewTargetOutcome[]
}

const BLOCK_CODES: ReadonlySet<string> = new Set([
  'no_entitlement',
  'expired',
  'quota_exhausted',
  'budget_exhausted',
  'disabled'
])

const SKIP_CODES: ReadonlySet<string> = new Set(['target_not_found'])

/** Mismo predicado de elegibilidad que los demás batches SEO (vigencia del assignment). */
const listEligibleTargets = async (maxTargets?: number): Promise<Array<{ seo_target_id: string; organization_id: string }>> => {
  const rows = await runGreenhousePostgresQuery<{ seo_target_id: string; organization_id: string }>(
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
 * Corre la foto de dominio sobre todos los targets elegibles, con per-target resilience:
 * un target bloqueado por presupuesto se registra y el batch continúa — el presupuesto de un
 * cliente no puede impedir capturar el de los demás.
 *
 * 🔴 `dryRun: true` NO gasta: usa el preview y reporta lo que se compraría y cuánto costaría.
 */
export const runDomainOverviewBatch = async (
  options: { maxTargets?: number; dryRun?: boolean } = {}
): Promise<DomainOverviewBatchResult> => {
  const dryRun = options.dryRun === true
  const targets = await listEligibleTargets(options.maxTargets)

  const outcomes: DomainOverviewTargetOutcome[] = []
  let captured = 0
  let skipped = 0
  let blocked = 0
  let failed = 0
  let costUsd = 0
  let estimatedCostUsd = 0

  for (const target of targets) {
    try {
      if (dryRun) {
        const preview = await previewDomainOverviewCapture(target.seo_target_id)

        if (!preview.ok) {
          const status = SKIP_CODES.has(preview.errorCode) ? 'skipped' : 'blocked'

          if (status === 'skipped') skipped += 1
          else blocked += 1

          outcomes.push({
            seoTargetId: target.seo_target_id,
            organizationId: target.organization_id,
            status,
            subjects: 0,
            captured: 0,
            costUsd: 0,
            errorCode: preview.errorCode
          })
          continue
        }

        estimatedCostUsd += preview.estimatedCostUsd

        if (preview.pendingSubjects === 0) skipped += 1
        else captured += 1

        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: preview.pendingSubjects === 0 ? 'skipped' : 'captured',
          subjects: preview.subjects,
          captured: preview.pendingSubjects,
          costUsd: preview.estimatedCostUsd,
          errorCode: preview.wouldBeAllowed ? null : preview.blockedReason
        })
        continue
      }

      const result = await captureDomainOverview(target.seo_target_id)

      if (!result.ok) {
        const status = SKIP_CODES.has(result.errorCode) ? 'skipped' : BLOCK_CODES.has(result.errorCode) ? 'blocked' : 'failed'

        if (status === 'skipped') skipped += 1
        else if (status === 'blocked') blocked += 1
        else failed += 1

        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status,
          subjects: 0,
          captured: 0,
          costUsd: 0,
          errorCode: result.errorCode
        })
        continue
      }

      costUsd += result.costUsd

      // Proveedor caído para TODOS los sujetos pendientes no es un éxito con cero filas:
      // se declara `failed` aunque el command haya devuelto ok (degradación honesta).
      const attempted = result.captured + result.noMarketData + result.providerErrors
      const providerDown = result.providerErrors > 0 && result.captured === 0 && result.noMarketData === 0
      const status = providerDown ? 'failed' : attempted > 0 ? 'captured' : 'skipped'

      if (status === 'captured') captured += 1
      else if (status === 'skipped') skipped += 1
      else failed += 1

      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status,
        subjects: result.subjects,
        captured: result.captured,
        costUsd: result.costUsd,
        errorCode: providerDown ? 'provider_error' : null
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_domain_overview_batch' },
        extra: { seoTargetId: target.seo_target_id }
      })

      failed += 1
      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status: 'failed',
        subjects: 0,
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
    costUsd: Number(costUsd.toFixed(6)),
    ...(dryRun ? { estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)) } : {}),
    dryRun,
    outcomes
  }
}

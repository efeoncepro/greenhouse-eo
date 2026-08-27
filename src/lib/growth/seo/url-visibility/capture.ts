/**
 * TASK-1776 — Captura de visibilidad por sujeto-página vía DataForSEO Labs `ranked_keywords`.
 *
 * UN colector para las cuatro clases de sujeto (domain/subdomain/subfolder/url): el resolver
 * decide `target` + filtros; este módulo no sabe de qué clase se trata.
 *
 * ⚠️ **El agregado `metrics` del proveedor cubre el SET COMPLETO del sujeto** (verificado
 * contra la doc 2026-08-27), independiente del `limit`: la foto (posiciones/ETV/count) sale
 * de ahí, y el `limit` acota sólo el DETALLE comprado (`top_keywords`) — es la palanca de
 * costo, no la foto.
 *
 * ⚠️ **Enriquecimiento gratuito del mercado:** cada fila trae `keyword_data.keyword_info`
 * completo, YA PAGADO. Se escribe en `seo_keyword_market_data` vía el writer compartido
 * `persistKeywordMarketData` con costo 0 (el gasto quedó atribuido a la fila de visibilidad)
 * y pre-check `loadFreshMarketKeywords` para no acumular filas que el ciclo vigente ya tiene.
 * Jamás un segundo almacén ni un INSERT propio.
 *
 * Contrato de gasto (patrón TASK-1661/1775): pre-check de frescura por sujeto (source
 * `ranked_keywords`) → gate con estimado del batch → fence cada K → NULL-row para sujeto
 * desconocido → el ledger lo escribe el TRANSPORTE.
 */

import 'server-only'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { SEO_URL_VISIBILITY_SNAPSHOT_CAPTURED_EVENT } from '../contracts'
import { parseDomainOverviewSide, type DomainRankOverviewSideRaw } from '../domain-overview/capture'
import { enforceSeoRunEntitlement, SEO_MODULE_KEYS_READ } from '../entitlement'
import { isSeoModuleEnabled, isSeoUrlVisibilityEnabled } from '../flags'
import {
  loadFreshMarketKeywords,
  parseKeywordOverviewItem,
  persistKeywordMarketData,
  type SeoKeywordMarketDatum
} from '../keyword-market-data'
import { LABS_RESULT_ROW_USD, LABS_TASK_SETUP_USD } from '../provider-pricing'
import {
  buildNullVisibilitySnapshot,
  loadFreshVisibilitySubjects,
  persistUrlVisibilitySnapshots,
  visibilityFreshnessKey,
  type SeoUrlVisibilitySnapshotInput,
  type SeoUrlVisibilityTopKeyword
} from './persist'
import {
  resolveVisibilitySubject,
  type ResolvedVisibilitySubject,
  type VisibilitySubjectKind
} from './resolve-subject'

/** Espejo del patrón TASK-1303/1661: re-consulta del gate cada K llamadas cobradas. */
const SPEND_FENCE_RECHECK_EVERY = 10

/**
 * 🔴 `limit` ES la palanca de costo: cada fila devuelta cuesta USD 0.00012 sobre un setup de
 * USD 0.012. Default conservador de 100 (~USD 0.024/sujeto); el knob permite subirlo con
 * decisión explícita, nunca "por si acaso". Clamp al máximo documentado del proveedor.
 */
export const URL_VISIBILITY_ROW_LIMIT_KNOB = 'GROWTH_SEO_URL_VISIBILITY_ROW_LIMIT'
export const URL_VISIBILITY_DEFAULT_ROW_LIMIT = 100
const PROVIDER_MAX_ROW_LIMIT = 1000

export const resolveRowLimit = (env: NodeJS.ProcessEnv = process.env): number => {
  const raw = Number(env[URL_VISIBILITY_ROW_LIMIT_KNOB])

  if (!Number.isFinite(raw) || raw <= 0) return URL_VISIBILITY_DEFAULT_ROW_LIMIT

  return Math.min(Math.floor(raw), PROVIDER_MAX_ROW_LIMIT)
}

/** Costo determinista por sujeto (peor caso: vuelven todas las filas pedidas). */
export const estimateUrlVisibilityCost = (
  pendingSubjects: number,
  rowLimit: number
): { providerCalls: number; estimatedCostUsd: number; formula: string } => {
  const total = pendingSubjects * (LABS_TASK_SETUP_USD + rowLimit * LABS_RESULT_ROW_USD)

  return {
    providerCalls: pendingSubjects,
    estimatedCostUsd: Number(total.toFixed(6)),
    formula:
      `${pendingSubjects} sujeto(s) × (USD ${LABS_TASK_SETUP_USD} task setup + ` +
      `hasta ${rowLimit} fila(s) × USD ${LABS_RESULT_ROW_USD})`
  }
}

/**
 * Shape del item de `ranked_keywords` (doc as-of 2026-08-27). El `keyword_data` tiene el
 * MISMO shape que el item de `keyword_overview`, así que se tipa con el parámetro del parser
 * canónico — si el parser cambia de contrato, esto rompe en compile, no en runtime.
 */
export interface RankedKeywordItemRaw {
  keyword_data?: Parameters<typeof parseKeywordOverviewItem>[0] | null
  ranked_serp_element?: {
    serp_item?: {
      type?: string
      rank_group?: number | null
      rank_absolute?: number | null
      url?: string | null
      relative_url?: string | null
      etv?: number | null
    } | null
  } | null
}

interface RankedKeywordsResultRaw {
  total_count?: number | null
  items_count?: number | null
  metrics?: {
    organic?: DomainRankOverviewSideRaw | null
    paid?: DomainRankOverviewSideRaw | null
  } | null
  items?: RankedKeywordItemRaw[] | null
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
 * Proyecta el `result[0]` de `ranked_keywords` al snapshot persistible + el detalle top-N +
 * los datums de mercado inline. Pura y exportada: se prueba sin base ni red.
 */
export const projectRankedKeywordsResult = (
  result: RankedKeywordsResultRaw,
  context: {
    subject: ResolvedVisibilitySubject
    locationCode: string
    languageCode: string
  }
): {
  snapshot: SeoUrlVisibilitySnapshotInput
  marketData: SeoKeywordMarketDatum[]
} => {
  const organic = parseDomainOverviewSide(result.metrics?.organic)
  const paid = parseDomainOverviewSide(result.metrics?.paid)

  const items = result.items ?? []
  const topKeywords: SeoUrlVisibilityTopKeyword[] = []
  const marketData: SeoKeywordMarketDatum[] = []
  const seenKeywords = new Set<string>()

  for (const item of items) {
    const keywordData = item.keyword_data ?? {}
    const keyword = typeof keywordData.keyword === 'string' ? keywordData.keyword.trim() : ''

    if (!keyword) continue

    const serpItem = item.ranked_serp_element?.serp_item ?? {}

    topKeywords.push({
      keyword,
      position: asNonNegativeInt(serpItem.rank_group ?? serpItem.rank_absolute),
      url: typeof serpItem.url === 'string' && serpItem.url ? serpItem.url : null,
      searchVolume: asNonNegativeInt(keywordData.keyword_info?.search_volume),
      etv: asNonNegativeNumber(serpItem.etv)
    })

    // 🔴 El `keyword_data` de ranked_keywords tiene EXACTAMENTE el shape del item de
    // `keyword_overview` (keyword + keyword_info + keyword_properties + search_intent_info +
    // avg_backlinks_info): se proyecta con el MISMO parser canónico — cero derivación paralela.
    const datum = parseKeywordOverviewItem(keywordData, {
      locationCode: context.locationCode,
      languageCode: context.languageCode
    })

    if (datum && !seenKeywords.has(datum.normalizedKeyword)) {
      seenKeywords.add(datum.normalizedKeyword)
      marketData.push(datum)
    }
  }

  return {
    snapshot: {
      subjectKind: context.subject.kind,
      normalizedSubject: context.subject.normalized,
      rawSubject: context.subject.raw,
      locationCode: context.locationCode,
      languageCode: context.languageCode,
      sourceEndpoint: 'ranked_keywords',
      organic,
      paid: { count: paid.count, etv: paid.etv },
      totalRankedKeywords: asNonNegativeInt(result.total_count),
      topKeywords: topKeywords.length > 0 ? topKeywords : null
    },
    marketData
  }
}

export type UrlVisibilitySubjectStatus =
  | 'captured'
  /** Snapshot `ranked_keywords` vigente dentro del ciclo: no se re-compra. */
  | 'fresh'
  /** El proveedor respondió OK sin metrics ni items: fila con NULLs, hecho con fecha. */
  | 'no_market_data'
  | 'invalid_subject'
  | 'budget_blocked'
  | 'provider_error'

export interface UrlVisibilitySubjectOutcome {
  subject: string
  kind: VisibilitySubjectKind | null
  status: UrlVisibilitySubjectStatus
  totalRankedKeywords: number | null
  marketRowsWritten: number
  providerCostUsd: number
  errorCode: string | null
}

type UrlVisibilityBlockedReason = 'no_entitlement' | 'expired' | 'budget_exhausted' | 'quota_exhausted'

export interface UrlVisibilitySubjectRequest {
  subject: string
  kind: VisibilitySubjectKind | string
  keepQuery?: boolean
}

export type CaptureUrlVisibilityResult =
  | {
      ok: true
      organizationId: string
      locationCode: string
      languageCode: string
      subjects: number
      captured: number
      fresh: number
      noMarketData: number
      invalid: number
      budgetBlocked: number
      providerErrors: number
      providerCalls: number
      marketRowsWritten: number
      costUsd: number
      outcomes: UrlVisibilitySubjectOutcome[]
    }
  | {
      ok: false
      errorCode: 'disabled' | 'no_subjects' | UrlVisibilityBlockedReason
      status: null
    }

const mapBlockedReason = (reason: string | null): UrlVisibilityBlockedReason => {
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

/**
 * Captura real sobre una lista explícita de sujetos declarados. GASTA. Corre donde el spend
 * recorder está cableado (ops-worker / CLI con el side-effect import).
 */
export const captureUrlVisibility = async (input: {
  organizationId: string
  subjects: readonly UrlVisibilitySubjectRequest[]
  locationCode: string
  languageCode: string
  /** Coordenada opcional para el evento outbox (el batch la pasa; on-demand puede omitirla). */
  seoTargetId?: string
  rowLimit?: number
}): Promise<CaptureUrlVisibilityResult> => {
  if (!isSeoModuleEnabled() || !isSeoUrlVisibilityEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const outcomes: UrlVisibilitySubjectOutcome[] = []
  const resolved: ResolvedVisibilitySubject[] = []
  const seen = new Set<string>()
  let invalid = 0

  for (const request of input.subjects) {
    const resolution = resolveVisibilitySubject(request)

    if (!resolution.ok) {
      invalid += 1
      outcomes.push({
        subject: request.subject,
        kind: null,
        status: 'invalid_subject',
        totalRankedKeywords: null,
        marketRowsWritten: 0,
        providerCostUsd: 0,
        errorCode: resolution.errorCode
      })
      continue
    }

    const key = visibilityFreshnessKey(resolution.subject.kind, resolution.subject.normalized)

    if (!seen.has(key)) {
      seen.add(key)
      resolved.push(resolution.subject)
    }
  }

  if (resolved.length === 0 && invalid === 0) return { ok: false, errorCode: 'no_subjects', status: null }

  const fresh = await loadFreshVisibilitySubjects({
    subjects: resolved.map(subject => ({ kind: subject.kind, normalized: subject.normalized })),
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    // La captura directa exige una fila de ranked_keywords: una de relevant_pages (sin
    // detalle de keywords) no la sustituye.
    sourceEndpoints: ['ranked_keywords']
  })

  const pending: ResolvedVisibilitySubject[] = []

  for (const subject of resolved) {
    if (fresh.has(visibilityFreshnessKey(subject.kind, subject.normalized))) {
      outcomes.push({
        subject: subject.raw,
        kind: subject.kind,
        status: 'fresh',
        totalRankedKeywords: null,
        marketRowsWritten: 0,
        providerCostUsd: 0,
        errorCode: null
      })
    } else {
      pending.push(subject)
    }
  }

  const rowLimit = Math.min(input.rowLimit && input.rowLimit > 0 ? Math.floor(input.rowLimit) : resolveRowLimit(), PROVIDER_MAX_ROW_LIMIT)

  let captured = 0
  let noMarketData = 0
  let budgetBlocked = 0
  let providerErrors = 0
  let providerCalls = 0
  let marketRowsWritten = 0
  let costUsd = 0

  const buildSummary = (): CaptureUrlVisibilityResult => ({
    ok: true,
    organizationId: input.organizationId,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    subjects: resolved.length + invalid,
    captured,
    fresh: fresh.size,
    noMarketData,
    invalid,
    budgetBlocked,
    providerErrors,
    providerCalls,
    marketRowsWritten,
    costUsd: Number(costUsd.toFixed(6)),
    outcomes
  })

  if (pending.length === 0) return buildSummary()

  const { estimatedCostUsd } = estimateUrlVisibilityCost(pending.length, rowLimit)

  const gate = await enforceSeoRunEntitlement(input.organizationId, {
    estimatedCostUsd,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    return { ok: false, errorCode: mapBlockedReason(gate.blockedReason), status: null }
  }

  let fenceTripped = false

  for (let index = 0; index < pending.length; index += 1) {
    const subject = pending[index]

    if (providerCalls > 0 && providerCalls % SPEND_FENCE_RECHECK_EVERY === 0 && !fenceTripped) {
      const remaining = pending.length - index

      const fence = await enforceSeoRunEntitlement(input.organizationId, {
        estimatedCostUsd: estimateUrlVisibilityCost(remaining, rowLimit).estimatedCostUsd,
        consumesAuditAllowance: false
      })

      if (!fence.allowed) fenceTripped = true
    }

    if (fenceTripped) {
      budgetBlocked += 1
      outcomes.push({
        subject: subject.raw,
        kind: subject.kind,
        status: 'budget_blocked',
        totalRankedKeywords: null,
        marketRowsWritten: 0,
        providerCostUsd: 0,
        errorCode: 'budget_exhausted'
      })
      continue
    }

    try {
      const task: Record<string, unknown> = {
        target: subject.providerTarget,
        location_code: Number(input.locationCode),
        language_code: input.languageCode,
        // Sólo lo que el snapshot modela; cada fila devuelta se cobra.
        item_types: ['organic', 'paid'],
        limit: rowLimit,
        order_by: ['keyword_data.keyword_info.search_volume,desc']
      }

      // Filtros del resolver (subcarpeta): server-side y GRATIS — la palanca que evita
      // comprar el dominio entero para describir una ruta.
      if (subject.providerFilters && subject.providerFilters.length > 0) {
        task.filters =
          subject.providerFilters.length === 1
            ? [...subject.providerFilters[0]]
            : subject.providerFilters.flatMap((filter, filterIndex) =>
                filterIndex === 0 ? [[...filter]] : ['and', [...filter]]
              )
      }

      const response = await postDataForSeoTask({
        family: 'labs',
        endpoint: '/v3/dataforseo_labs/google/ranked_keywords/live',
        organizationId: input.organizationId,
        tasks: [task]
      })

      const providerCostUsd = response.cost ?? 0

      providerCalls += 1
      costUsd += providerCostUsd

      const taskResult = (response.tasks?.[0] ?? {}) as {
        status_code?: number
        result?: RankedKeywordsResultRaw[]
      }

      if (!response.ok || taskResult.status_code !== 20000) {
        providerErrors += 1
        outcomes.push({
          subject: subject.raw,
          kind: subject.kind,
          status: 'provider_error',
          totalRankedKeywords: null,
          marketRowsWritten: 0,
          providerCostUsd,
          errorCode: `task_status_${String(taskResult.status_code ?? response.httpStatus)}`
        })
        continue
      }

      const result = taskResult.result?.[0] ?? null
      const hasData = Boolean(result && (result.metrics?.organic || (result.items?.length ?? 0) > 0))

      if (!result || !hasData) {
        // 🔴 Sujeto que el proveedor no conoce: fila con NULLs (sin ella se re-compra por
        // siempre — invariante TASK-1661).
        await persistUrlVisibilitySnapshots({
          snapshots: [
            buildNullVisibilitySnapshot({
              subjectKind: subject.kind,
              normalizedSubject: subject.normalized,
              rawSubject: subject.raw,
              locationCode: input.locationCode,
              languageCode: input.languageCode,
              sourceEndpoint: 'ranked_keywords'
            })
          ],
          capturedByOrganizationId: input.organizationId,
          providerCostUsd
        })

        noMarketData += 1
        outcomes.push({
          subject: subject.raw,
          kind: subject.kind,
          status: 'no_market_data',
          totalRankedKeywords: null,
          marketRowsWritten: 0,
          providerCostUsd,
          errorCode: null
        })
        continue
      }

      const { snapshot, marketData } = projectRankedKeywordsResult(result, {
        subject,
        locationCode: input.locationCode,
        languageCode: input.languageCode
      })

      await persistUrlVisibilitySnapshots({
        snapshots: [snapshot],
        capturedByOrganizationId: input.organizationId,
        providerCostUsd
      })

      // Enriquecimiento GRATUITO del mercado: sólo keywords sin captura vigente (patrón
      // top-up TASK-1664) y con costo 0 — el gasto ya quedó en la fila de visibilidad.
      let subjectMarketRows = 0

      if (marketData.length > 0) {
        const freshMarket = await loadFreshMarketKeywords(
          marketData.map(datum => datum.normalizedKeyword),
          input.locationCode,
          input.languageCode
        )

        const pendingMarket = marketData.filter(datum => !freshMarket.has(datum.normalizedKeyword))

        if (pendingMarket.length > 0) {
          const { rowsWritten } = await persistKeywordMarketData({
            data: pendingMarket,
            sourceEndpoint: 'ranked_keywords',
            capturedByOrganizationId: input.organizationId,
            providerCostUsd: 0
          })

          subjectMarketRows = rowsWritten
          marketRowsWritten += rowsWritten
        }
      }

      captured += 1
      outcomes.push({
        subject: subject.raw,
        kind: subject.kind,
        status: 'captured',
        totalRankedKeywords: snapshot.totalRankedKeywords,
        marketRowsWritten: subjectMarketRows,
        providerCostUsd,
        errorCode: null
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_url_visibility_capture' },
        extra: { organizationId: input.organizationId, subject: subject.normalized }
      })

      providerErrors += 1
      outcomes.push({
        subject: subject.raw,
        kind: subject.kind,
        status: 'provider_error',
        totalRankedKeywords: null,
        marketRowsWritten: 0,
        providerCostUsd: 0,
        errorCode: 'provider_unreachable'
      })
    }
  }

  if (captured > 0 || noMarketData > 0) {
    await publishOutboxEvent({
      aggregateType: input.seoTargetId ? 'seo_target' : 'organization',
      aggregateId: input.seoTargetId ?? input.organizationId,
      eventType: SEO_URL_VISIBILITY_SNAPSHOT_CAPTURED_EVENT,
      payload: {
        organizationId: input.organizationId,
        seoTargetId: input.seoTargetId ?? null,
        locationCode: input.locationCode,
        languageCode: input.languageCode,
        subjects: resolved.length,
        captured,
        noMarketData,
        marketRowsWritten,
        costUsd: Number(costUsd.toFixed(6)),
        actor: 'ops_worker'
      }
    })
  }

  return buildSummary()
}

// ─── Batch (Cloud Scheduler → ops-worker) ───────────────────────────────────────────────────

export interface UrlVisibilityTargetOutcome {
  seoTargetId: string
  organizationId: string
  status: 'captured' | 'skipped' | 'blocked' | 'failed'
  subjects: number
  captured: number
  marketRowsWritten: number
  costUsd: number
  errorCode: string | null
}

export interface UrlVisibilityBatchResult {
  targets: number
  captured: number
  skipped: number
  blocked: number
  failed: number
  marketRowsWritten: number
  costUsd: number
  estimatedCostUsd?: number
  dryRun: boolean
  outcomes: UrlVisibilityTargetOutcome[]
}

const BLOCK_CODES: ReadonlySet<string> = new Set([
  'no_entitlement',
  'expired',
  'quota_exhausted',
  'budget_exhausted',
  'disabled'
])

const listEligibleTargets = async (
  maxTargets?: number
): Promise<Array<{ seo_target_id: string; organization_id: string; root_domain: string; location_code: string; language_code: string }>> => {
  const rows = await runGreenhousePostgresQuery<{
    seo_target_id: string
    organization_id: string
    root_domain: string
    location_code: string
    language_code: string
  }>(
    `SELECT t.seo_target_id, t.organization_id, t.root_domain, t.location_code, t.language_code
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

const loadCompetitorDomains = async (seoTargetId: string): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ competitor_domain: string }>(
    `SELECT competitor_domain
       FROM greenhouse_growth.seo_competitors
      WHERE seo_target_id = $1
        AND effective_to IS NULL
      ORDER BY competitor_domain`,
    [seoTargetId]
  )

  return rows.map(row => row.competitor_domain)
}

/**
 * Batch mensual: por cada target elegible, captura `kind=domain` del dominio propio + sus
 * competidores vigentes. `relevant_pages`/`subdomains` NO corren acá (primitives on-demand:
 * correrlos siempre añadiría costo fijo por corrida — decisión OQ3 de la task).
 *
 * 🔴 `dryRun: true` NO gasta: reporta sujetos pendientes y costo estimado.
 */
export const runUrlVisibilityBatch = async (
  options: { maxTargets?: number; dryRun?: boolean } = {}
): Promise<UrlVisibilityBatchResult> => {
  const dryRun = options.dryRun === true
  const targets = await listEligibleTargets(options.maxTargets)
  const rowLimit = resolveRowLimit()

  const outcomes: UrlVisibilityTargetOutcome[] = []
  let captured = 0
  let skipped = 0
  let blocked = 0
  let failed = 0
  let marketRowsWritten = 0
  let costUsd = 0
  let estimatedCostUsd = 0

  for (const target of targets) {
    try {
      const competitors = await loadCompetitorDomains(target.seo_target_id)

      const subjects: UrlVisibilitySubjectRequest[] = [target.root_domain, ...competitors].map(domain => ({
        subject: domain,
        kind: 'domain' as const
      }))

      if (dryRun) {
        const resolvedSubjects = subjects
          .map(request => resolveVisibilitySubject(request))
          .filter((resolution): resolution is Extract<typeof resolution, { ok: true }> => resolution.ok)
          .map(resolution => resolution.subject)

        const fresh = await loadFreshVisibilitySubjects({
          subjects: resolvedSubjects.map(subject => ({ kind: subject.kind, normalized: subject.normalized })),
          locationCode: target.location_code,
          languageCode: target.language_code,
          sourceEndpoints: ['ranked_keywords']
        })

        const pendingCount = resolvedSubjects.filter(
          subject => !fresh.has(visibilityFreshnessKey(subject.kind, subject.normalized))
        ).length

        const estimate = estimateUrlVisibilityCost(pendingCount, rowLimit)

        estimatedCostUsd += estimate.estimatedCostUsd

        if (pendingCount === 0) skipped += 1
        else captured += 1

        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: pendingCount === 0 ? 'skipped' : 'captured',
          subjects: resolvedSubjects.length,
          captured: pendingCount,
          marketRowsWritten: 0,
          costUsd: estimate.estimatedCostUsd,
          errorCode: null
        })
        continue
      }

      const result = await captureUrlVisibility({
        organizationId: target.organization_id,
        subjects,
        locationCode: target.location_code,
        languageCode: target.language_code,
        seoTargetId: target.seo_target_id,
        rowLimit
      })

      if (!result.ok) {
        const status = BLOCK_CODES.has(result.errorCode) ? 'blocked' : 'failed'

        if (status === 'blocked') blocked += 1
        else failed += 1

        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status,
          subjects: 0,
          captured: 0,
          marketRowsWritten: 0,
          costUsd: 0,
          errorCode: result.errorCode
        })
        continue
      }

      costUsd += result.costUsd
      marketRowsWritten += result.marketRowsWritten

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
        marketRowsWritten: result.marketRowsWritten,
        costUsd: result.costUsd,
        errorCode: providerDown ? 'provider_error' : null
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_url_visibility_batch' },
        extra: { seoTargetId: target.seo_target_id }
      })

      failed += 1
      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status: 'failed',
        subjects: 0,
        captured: 0,
        marketRowsWritten: 0,
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
    marketRowsWritten,
    costUsd: Number(costUsd.toFixed(6)),
    ...(dryRun ? { estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)) } : {}),
    dryRun,
    outcomes
  }
}

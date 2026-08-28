import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { readBacklinkProfile } from '@/lib/growth/seo/backlinks/reader'
import { readSeoAeoGap } from '@/lib/growth/seo/gap/read-seo-aeo-gap'
import { normalizeMarketKeyword, readKeywordMarketDataForTarget } from '@/lib/growth/seo/keyword-market-data'
import { readKeywordOpportunities } from '@/lib/growth/seo/keyword-opportunities-reader'
import {
  readDomainOverviewForTarget,
  type ReadDomainOverviewResult
} from '@/lib/growth/seo/domain-overview/reader'
import {
  readUrlVisibility,
  readVisibilityConcentration,
  type ReadUrlVisibilityResult,
  type ReadVisibilityConcentrationResult
} from '@/lib/growth/seo/url-visibility/reader'
import { readBacklinkDetail, type BacklinkDetailResult } from '@/lib/growth/seo/backlinks/detail-reader'
import { isVisibilitySubjectKind } from '@/lib/growth/seo/url-visibility/resolve-subject'
import {
  SEO_DISCOVERY_ACTION_KINDS,
  SEO_DISCOVERY_SOURCE_KINDS,
  isDiscoveryLinkBarrierFilterLevel,
  type SeoDiscoveryActionKind,
  type SeoDiscoveryMethod,
  type SeoDiscoveryRunStatus,
  type SeoDiscoverySourceKind
} from '@/lib/growth/seo/keyword-discovery/contracts'
import {
  previewKeywordDiscovery,
  queueKeywordDiscovery,
  recordKeywordDiscoveryAction,
  type PreviewKeywordDiscoveryResult,
  type QueueKeywordDiscoveryResult,
  type RecordKeywordDiscoveryActionResult
} from '@/lib/growth/seo/keyword-discovery/queue'
import { readKeywordDiscovery, type ReadKeywordDiscoveryResult } from '@/lib/growth/seo/keyword-discovery/reader'
import { createGroundedQueryDraft, type GroundedQueryDraftResult } from '@/lib/growth/seo/grounded-query-bridge'
import { readGroundedQueryDraft, type ReadGroundedQueryDraftResult } from '@/lib/growth/seo/grounded-query-reader'
import { type TenantEntitlementSubject } from '@/lib/entitlements/types'
import type { SeoSearchIntent } from '@/lib/growth/seo/keyword-market-data'
import { resolveSeoTargetForMarket, type SeoMarketTarget } from '@/lib/growth/seo/resolve-target'
import {
  readSeoProviderSpendByConsumer,
  type SeoProviderSpendByConsumerResult
} from '@/lib/growth/seo/provider-spend'
import { readSeoPerformance } from '@/lib/growth/seo/performance/read-performance'
import { readSeoPerformanceCatalog } from '@/lib/growth/seo/performance/read-performance-catalog'
import { readRankEvolution } from '@/lib/growth/seo/rank-evolution-reader'
import { readSeoOverviewKpis } from '@/lib/growth/seo/overview/read-overview-kpis'
import { readSiteAuditReport } from '@/lib/growth/seo/site-audit/reader'
import { trackKeywords, untrackKeywords } from '@/lib/growth/seo/track-keywords'
import { declareCompetitors, retireCompetitors } from '@/lib/growth/seo/competitors'
import { readKeywordGap, type KeywordGapResult } from '@/lib/growth/seo/keyword-gap-reader'
import {
  readSerpCompetitorCandidates,
  readSerpTopResults,
  type ReadSerpTopResultsResult,
  type SerpCompetitorCandidatesResult
} from '@/lib/growth/seo/competitor-discovery'
import { isSeoKeywordIntent, SEO_KEYWORD_INTENTS } from '@/lib/growth/seo/contracts'
import type {
  BacklinkProfileResult,
  DeclareCompetitorsResult,
  RetireCompetitorsResult,
  KeywordOpportunitiesResult,
  RankEvolutionResult,
  SeoAeoGapResult,
  SeoPerformanceCatalogResult,
  SeoPerformanceMetric,
  SeoPerformanceMode,
  SeoPerformanceResult,
  SeoRankDevice,
  SiteAuditReportResult,
  TrackKeywordsResult,
  UntrackKeywordsResult
} from '@/lib/growth/seo/contracts'
import { resolveSeoEntitlement, type SeoTier } from '@/lib/growth/seo/entitlement'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { runProspectDiagnostic, type RunProspectDiagnosticResult } from '@/lib/growth/seo/prospect/command'
import { listProspectDiagnostics, readProspectDiagnostic } from '@/lib/growth/seo/prospect/reader'
import type { ProspectDiagnostic } from '@/lib/growth/seo/prospect/contracts'

/**
 * TASK-1645 — Lane ecosystem del módulo SEO (downstream de API Platform, consumido por
 * el Greenhouse MCP server y por bindings machine-authed del ecosystem).
 *
 * Full API Parity (mandato del operador 2026-08-05): NO hay lógica de dominio nueva —
 * los payloads son passthrough de los readers canónicos (`readKeywordOpportunities`,
 * `readSeoAeoGap`) que ya consumen UI y Nexa. La única responsabilidad de este lane es
 * la **derivación del sujeto máquina**: resolver la organización desde el binding y
 * aplicar el entitlement per-org ANTES de tocar el dominio.
 *
 * Modelo de acceso (Open Question 2 de la spec, resuelta en Discovery):
 * - Binding org-scoped (`organization`/`client`): la org ES la del binding. Un
 *   `organizationId` del request se valida contra el binding — NUNCA lo sobreescribe.
 * - Binding `internal` (operador máquina — gateway, Nexa interna): `organizationId`
 *   viene como query param requerido.
 * - En AMBOS casos: entitlement per-org (`module_assignments` `seo_v2` vigente) o
 *   **404 anti-oracle** — un binding sin entitlement no aprende si la org existe.
 */

const resolveOrganizationId = (
  context: ApiPlatformRequestContext,
  request: Request,
  /**
   * Org pedida por el cuerpo de un command (los POST no llevan query string). Se resuelve
   * con las MISMAS reglas de binding que el query param — una segunda vía de resolución
   * sería una segunda autoridad, y una de las dos terminaría siendo la más laxa.
   */
  requestedOverride?: string | null
): string => {
  const url = new URL(request.url)
  const requested = (requestedOverride ?? url.searchParams.get('organizationId') ?? '').trim() || null

  const bindingOrg = context.binding.organizationId

  if (bindingOrg) {
    // Binding org-scoped: la org del binding manda. Un param distinto = 404 anti-oracle
    // (no revelar si la otra org existe; el binding simplemente no la ve).
    if (requested && requested !== bindingOrg) {
      throw new ApiPlatformError('SEO resource not found for the resolved scope.', {
        statusCode: 404,
        errorCode: 'not_found'
      })
    }

    return bindingOrg
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    // Scope no-interno sin org en el binding: default-DENY (espejo knowledge).
    throw new ApiPlatformError('SEO retrieval is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  if (!requested) {
    throw new ApiPlatformError('A non-empty "organizationId" parameter is required for internal-scope bindings.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return requested
}

interface SeoLaneSubject {
  organizationId: string
  seoTargetId: string | null
  /** Dominio del target resuelto (TASK-1776: sujeto default de la visibilidad por página). */
  rootDomain: string | null
  tier: SeoTier | null
  /**
   * Mercado que ESTA respuesta sirve (ISSUE-153). Toda respuesta del lane lo declara: un
   * número de posición o de volumen sin país es ambiguo para una org multi-mercado.
   */
  servedMarket: { market: string | null; locationCode: string; languageCode: string } | null
}

/**
 * Gate del lane: flag → entitlement per-org (404 anti-oracle) → target activo.
 * Retorna `seoTargetId: null` cuando la org está entitled pero aún no tiene target
 * configurado (degradación honesta `target_not_configured`, no un 404 que mentiría).
 */
const resolveSeoLaneSubject = async (
  context: ApiPlatformRequestContext,
  request: Request,
  requestedOrganizationId?: string | null
): Promise<SeoLaneSubject> => {
  const organizationId = resolveOrganizationId(context, request, requestedOrganizationId)

  const entitlement = await resolveSeoEntitlement(organizationId)

  if (!entitlement.hasModule) {
    // Anti-oracle: sin módulo `seo_v2` vigente, el recurso "no existe" para este binding.
    throw new ApiPlatformError('SEO resource not found for the resolved scope.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  // ISSUE-153 — el mercado es una dimensión EXPLÍCITA, nunca un `LIMIT 1` silencioso.
  // `?market=MX` (ISO-2 del target) o `?market=2484` (location_code) fija el mercado; sin
  // selector, un solo activo resuelve solo y varios activos se DECLARAN en vez de elegirse.
  const url = new URL(request.url)
  const requestedMarket = url.searchParams.get('market')

  const resolution = await resolveSeoTargetForMarket(organizationId, { market: requestedMarket })

  if (resolution.status === 'multiple_markets' || resolution.status === 'market_not_found') {
    const markets = resolution.markets.map(describeMarket)

    // Machine-readable y centralizado: los 10 payloads del lane y las tools MCP lo heredan
    // sin tocarse. No es anti-oracle: los mercados son de la org que el binding ya ve.
    throw new ApiPlatformError(
      resolution.status === 'multiple_markets'
        ? 'The organization has multiple active SEO markets. Pass ?market=<ISO-2|location_code> to choose one.'
        : `No active SEO market matches "${resolution.requestedMarket}".`,
      {
        statusCode: 409,
        errorCode: resolution.status,
        details: { markets }
      }
    )
  }

  if (resolution.status === 'none') {
    return { organizationId, seoTargetId: null, rootDomain: null, tier: entitlement.tier, servedMarket: null }
  }

  return {
    organizationId,
    seoTargetId: resolution.target.seoTargetId,
    rootDomain: resolution.target.rootDomain,
    tier: entitlement.tier,
    servedMarket: describeMarket(resolution.target)
  }
}

const describeMarket = (target: SeoMarketTarget) => ({
  market: target.market,
  locationCode: target.locationCode,
  languageCode: target.languageCode
})

/** Payload honesto cuando la org está entitled pero sin target SEO configurado. */
export interface SeoTargetNotConfiguredPayload {
  ok: false
  errorCode: 'target_not_configured'
  organizationId: string
}

export type EcosystemSeoKeywordOpportunitiesPayload = KeywordOpportunitiesResult | SeoTargetNotConfiguredPayload
export type EcosystemSeoVisibility360Payload = SeoAeoGapResult | SeoTargetNotConfiguredPayload

export type EcosystemSeoKeywordMarketDataPayload =
  | {
      ok: true
      measurementKind: 'estimated_market'
      source: 'dataforseo_labs'
      market: 'available' | 'unavailable'
      locationCode: string
      languageCode: string
      freshness: { freshKeywords: number; latestCaptureDate: string | null }
      keywords: Array<{
        keyword: string
        found: boolean
        searchVolume: number | null
        keywordDifficulty: number | null
        competition: number | null
        competitionLevel: 'low' | 'medium' | 'high' | null
        coreKeyword: string | null
        providerLastUpdatedAt: string | null
      }>
    }
  | { ok: false; errorCode: 'disabled' | 'no_keywords'; status: null }
  | SeoTargetNotConfiguredPayload

/** GET /api/platform/ecosystem/growth/seo/keyword-opportunities */
export const getEcosystemSeoKeywordOpportunitiesPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoKeywordOpportunitiesPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const url = new URL(request.url)
  const rawLimit = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 50) : undefined

  const result = await readKeywordOpportunities(subject.seoTargetId, limit ? { limit } : {})

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/**
 * GET /api/platform/ecosystem/growth/seo/keyword-market-data — TASK-1661.
 *
 * Lente ◑ ESTIMADA de mercado (DataForSEO Labs), nunca la demanda medida ● de GSC. El mercado
 * (país + idioma) sale del target, no del caller: el volumen de una keyword no es global.
 *
 * ⚠️ Exige una selección EXPLÍCITA de keywords (`?keywords=a,b,c`, máximo 100). No existe el
 * modo "todas las keywords de la org": este reader es un lookup acotado, y dejarlo abierto
 * convertiría una lectura en un barrido del corpus de otro tenant.
 */
export const getEcosystemSeoKeywordMarketDataPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoKeywordMarketDataPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const url = new URL(request.url)

  const keywords = (url.searchParams.get('keywords') ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 100)

  if (keywords.length === 0) {
    return {
      data: { ok: false, errorCode: 'no_keywords', status: null },
      meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
    }
  }

  const result = await readKeywordMarketDataForTarget(subject.seoTargetId, keywords)

  if (!result) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  return {
    data: {
      ok: true,
      // Contrato de honestidad: el consumer debe poder distinguir estimado de medido.
      measurementKind: 'estimated_market',
      source: 'dataforseo_labs',
      market: result.market,
      locationCode: result.locationCode,
      languageCode: result.languageCode,
      freshness: result.freshness,
      // Se proyecta a array: un Map no sobrevive la serialización JSON.
      keywords: keywords.map(keyword => {
        const datum = result.byKeyword.get(normalizeMarketKeyword(keyword))

        return {
          keyword,
          // Ausencia = no consultado. NUNCA se rellena con 0.
          found: Boolean(datum),
          searchVolume: datum?.searchVolume ?? null,
          keywordDifficulty: datum?.keywordDifficulty ?? null,
          competition: datum?.competition ?? null,
          competitionLevel: datum?.competitionLevel ?? null,
          coreKeyword: datum?.coreKeyword ?? null,
          providerLastUpdatedAt: datum?.providerLastUpdatedAt ?? null
        }
      })
    },
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export type EcosystemSeoDomainOverviewPayload =
  | {
      ok: true
      measurementKind: 'estimated_market'
      source: 'dataforseo_labs'
      overview: ReadDomainOverviewResult & { ok: true }
    }
  | { ok: false; errorCode: 'disabled' | 'no_market_data'; status: null }
  | SeoTargetNotConfiguredPayload

/**
 * GET /api/platform/ecosystem/growth/seo/domain-overview — TASK-1775.
 *
 * Foto + trayectoria del dominio del target (default) o de un competidor (`?subject=`), con
 * la lente ◑ `estimated` y su `capturedAt`. El DTO sale del reader canónico, que NUNCA
 * selecciona `captured_by_organization_id`.
 */
export const getEcosystemSeoDomainOverviewPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoDomainOverviewPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const url = new URL(request.url)
  const requestedSubject = url.searchParams.get('subject')?.trim() || undefined
  const monthsRaw = url.searchParams.get('months')
  const historyMonths = monthsRaw && Number.isFinite(Number(monthsRaw)) ? Number(monthsRaw) : undefined

  const result = await readDomainOverviewForTarget(subject.seoTargetId, {
    subject: requestedSubject,
    historyMonths
  })

  if (!result) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  if (!result.ok) {
    // Degradación honesta: sujeto sin snapshot = no_market_data, jamás ceros fantasma.
    return {
      data: { ok: false, errorCode: 'no_market_data', status: null },
      meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
    }
  }

  return {
    data: {
      ok: true,
      measurementKind: 'estimated_market',
      source: 'dataforseo_labs',
      overview: result
    },
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export type EcosystemSeoUrlVisibilityPayload =
  | {
      ok: true
      measurementKind: 'estimated_market'
      source: 'dataforseo_labs'
      mode: 'subject'
      visibility: ReadUrlVisibilityResult & { ok: true }
    }
  | {
      ok: true
      measurementKind: 'estimated_market'
      source: 'dataforseo_labs'
      mode: 'concentration'
      concentration: ReadVisibilityConcentrationResult & { ok: true }
    }
  | { ok: false; errorCode: 'disabled' | 'no_market_data' | 'invalid_subject' | 'invalid_kind'; status: null }
  | SeoTargetNotConfiguredPayload

/**
 * GET /api/platform/ecosystem/growth/seo/url-visibility — TASK-1776.
 *
 * Dos modos sobre el mismo hecho:
 *   - sujeto (`?subject=&kind=domain|subdomain|subfolder|url[&months=]`): la foto + trayectoria
 *     de una página/subcarpeta/subdominio/dominio, propio o de un competidor. Default: el
 *     dominio del target (`kind=domain`).
 *   - concentración (`?concentration=url|subdomain[&domain=]`): qué páginas o subdominios
 *     concentran el tráfico estimado de un host.
 */
export const getEcosystemSeoUrlVisibilityPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoUrlVisibilityPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  if (!subject.seoTargetId || !subject.servedMarket) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const url = new URL(request.url)

  const meta = {
    module: 'growth.seo',
    tier: subject.tier,
    organizationId: subject.organizationId,
    servedMarket: subject.servedMarket
  }

  const rootDomain = subject.rootDomain

  if (!rootDomain) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const concentration = url.searchParams.get('concentration')

  if (concentration) {
    if (concentration !== 'url' && concentration !== 'subdomain') {
      return { data: { ok: false, errorCode: 'invalid_kind', status: null }, meta }
    }

    const result = await readVisibilityConcentration({
      domain: url.searchParams.get('domain')?.trim() || rootDomain,
      kind: concentration,
      locationCode: subject.servedMarket.locationCode,
      languageCode: subject.servedMarket.languageCode
    })

    if (!result.ok) {
      return { data: { ok: false, errorCode: result.reason, status: null }, meta }
    }

    return {
      data: { ok: true, measurementKind: 'estimated_market', source: 'dataforseo_labs', mode: 'concentration', concentration: result },
      meta
    }
  }

  const requestedKind = url.searchParams.get('kind')?.trim() || 'domain'

  if (!isVisibilitySubjectKind(requestedKind)) {
    return { data: { ok: false, errorCode: 'invalid_kind', status: null }, meta }
  }

  const monthsRaw = url.searchParams.get('months')

  const result = await readUrlVisibility({
    subject: url.searchParams.get('subject')?.trim() || rootDomain,
    kind: requestedKind,
    keepQuery: url.searchParams.get('keepQuery') === 'true',
    locationCode: subject.servedMarket.locationCode,
    languageCode: subject.servedMarket.languageCode,
    historyMonths: monthsRaw && Number.isFinite(Number(monthsRaw)) ? Number(monthsRaw) : undefined
  })

  if (!result.ok) {
    // Degradación honesta: sujeto sin snapshot = no_market_data, jamás ceros fantasma.
    return { data: { ok: false, errorCode: result.reason, status: null }, meta }
  }

  return {
    data: { ok: true, measurementKind: 'estimated_market', source: 'dataforseo_labs', mode: 'subject', visibility: result },
    meta
  }
}

/** GET /api/platform/ecosystem/growth/seo/visibility-360 — el cruce SEO↔AEO (quadrant). */
export const getEcosystemSeoVisibility360Payload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoVisibility360Payload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const result = await readSeoAeoGap(subject.seoTargetId)

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export type EcosystemSeoRankEvolutionPayload = RankEvolutionResult | SeoTargetNotConfiguredPayload

/**
 * GET /api/platform/ecosystem/growth/seo/rank-evolution — la serie temporal de
 * posiciones (TASK-1303). Passthrough del reader canónico `readRankEvolution`
 * (PG hot window ~180d / BQ para rango largo). Query params: `rangeDays`, `engine`,
 * `device`, `keywords` (CSV, máx 100).
 */
export const getEcosystemSeoRankEvolutionPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoRankEvolutionPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const url = new URL(request.url)

  const rawRange = Number(url.searchParams.get('rangeDays'))
  const rangeDays = Number.isFinite(rawRange) && rawRange > 0 ? Math.floor(rawRange) : undefined

  const rawEngine = (url.searchParams.get('engine') ?? '').trim()
  const engine = rawEngine || undefined

  const rawDevice = (url.searchParams.get('device') ?? '').trim()
  const device = rawDevice === 'desktop' || rawDevice === 'mobile' || rawDevice === 'tablet' ? (rawDevice as SeoRankDevice) : undefined

  const rawKeywords = (url.searchParams.get('keywords') ?? '').trim()

  const keywords = rawKeywords
    ? rawKeywords.split(',').map(keyword => keyword.trim()).filter(Boolean)
    : undefined

  const result = await readRankEvolution(subject.seoTargetId, { rangeDays, engine, device, keywords })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export type EcosystemSeoSiteAuditReportPayload = SiteAuditReportResult | SeoTargetNotConfiguredPayload

/**
 * GET /api/platform/ecosystem/growth/seo/site-audit-report — salud técnica del sitio
 * (TASK-1304). Passthrough del reader canónico `readSiteAuditReport` (último run o run
 * puntual con `auditRunId`). Findings agrupados por severidad; un run `running` se
 * reporta como "audit en curso" (hecho, no error).
 */
/**
 * TASK-1306 — KPIs norte del cockpit Overview (Search Console MEDIDO, agregado del período).
 *
 * Se expone en el lane ecosystem porque `readSeoOverviewKpis` proyecta algo que ninguna
 * otra tool entrega: el agregado del período con la posición PONDERADA POR IMPRESIONES y
 * la ventana previa comparable. Mandato del dominio: todo reader nuevo nace con su tool.
 */
export const getEcosystemSeoOverviewKpisPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<unknown>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  const url = new URL(request.url)
  const rawRange = Number.parseInt(url.searchParams.get('rangeDays') ?? '', 10)
  // Techo de 365: la ventana caliente de PG es ~180d; pedir más no rompe pero tampoco
  // aporta, y un número sin límite deja la puerta abierta a un escaneo caro.
  const rangeDays = Number.isFinite(rawRange) && rawRange > 0 ? Math.min(rawRange, 365) : 28

  const result = await readSeoOverviewKpis(subject.organizationId, rangeDays)

  return {
    data: { ok: true, organizationId: subject.organizationId, ...result },
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export const getEcosystemSeoSiteAuditReportPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoSiteAuditReportPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const url = new URL(request.url)
  const auditRunId = (url.searchParams.get('auditRunId') ?? '').trim() || undefined

  const result = await readSiteAuditReport(subject.seoTargetId, auditRunId)

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export type EcosystemSeoBacklinkProfilePayload = BacklinkProfileResult | SeoTargetNotConfiguredPayload

/**
 * GET /api/platform/ecosystem/growth/seo/backlink-profile — serie semanal del perfil de
 * enlaces (TASK-1304). Passthrough del reader canónico `readBacklinkProfile`.
 * Query params: `rangeDays` (default 365, máx 1825).
 */
export const getEcosystemSeoBacklinkProfilePayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoBacklinkProfilePayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const url = new URL(request.url)
  const rawRange = Number(url.searchParams.get('rangeDays'))
  const rangeDays = Number.isFinite(rawRange) && rawRange > 0 ? Math.floor(rawRange) : undefined

  const result = await readBacklinkProfile(subject.seoTargetId, rangeDays ? { rangeDays } : {})

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export type EcosystemSeoBacklinkDetailPayload = BacklinkDetailResult | SeoTargetNotConfiguredPayload

/**
 * GET /api/platform/ecosystem/growth/seo/backlink-detail — TASK-1777.
 *
 * El detalle nominal del perfil de enlaces con sus TRES estados distinguibles: `available`
 * (hay drill-down), `skipped_no_movement` ("el perfil estuvo estable" — afirmación positiva,
 * no un hueco) y `drilldown_failed` (se intentó y falló). Passthrough del reader canónico;
 * la derivación de sobre-optimización de anchors viaja YA calculada — ningún consumer la
 * recalcula. `?captureDate=YYYY-MM-DD` fija la semana; default: la más reciente evaluada.
 */
export const getEcosystemSeoBacklinkDetailPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoBacklinkDetailPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const url = new URL(request.url)
  const rawDate = url.searchParams.get('captureDate')
  const captureDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined

  const result = await readBacklinkDetail(subject.seoTargetId, captureDate ? { captureDate } : {})

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export type EcosystemSeoPerformancePayload = SeoPerformanceResult | SeoTargetNotConfiguredPayload

/**
 * GET /api/platform/ecosystem/growth/seo/performance — el rendimiento en el tiempo de un
 * SET elegido de keywords o URLs (TASK-1307, pantalla ancla §10.3).
 *
 * Passthrough del reader canónico `readSeoPerformance`: serie del chart + standings de la
 * tabla en una sola lectura. La fuente (● GSC medido / ◑ DataForSEO estimado) la deriva el
 * reader de (modo × métrica) y viaja en el payload — NUNCA se promedian entre sí.
 *
 * Query params: `mode` (keyword|url), `items` (CSV, requerido), `metric`
 * (position|clicks|impressions|ctr), `rangeDays`, `device`, `engine`.
 *
 * ⚠️ A diferencia de las otras tools del lane, ésta NO exige `seoTargetId`: en modo URL (y
 * en cualquier métrica de volumen) la lectura es puramente Search Console, anclada a la
 * organización. Bloquearla por falta de target negaría datos medidos que sí existen.
 */
export const getEcosystemSeoPerformancePayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoPerformancePayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  const url = new URL(request.url)

  const rawMode = (url.searchParams.get('mode') ?? '').trim()
  const mode: SeoPerformanceMode | undefined = rawMode === 'url' || rawMode === 'keyword' ? rawMode : undefined

  const rawMetric = (url.searchParams.get('metric') ?? '').trim()

  const metric: SeoPerformanceMetric | undefined =
    rawMetric === 'position' || rawMetric === 'clicks' || rawMetric === 'impressions' || rawMetric === 'ctr'
      ? rawMetric
      : undefined

  const rawDevice = (url.searchParams.get('device') ?? '').trim()

  const device: SeoRankDevice | undefined =
    rawDevice === 'desktop' || rawDevice === 'mobile' || rawDevice === 'tablet' ? rawDevice : undefined

  const rawRange = Number(url.searchParams.get('rangeDays'))
  const rangeDays = Number.isFinite(rawRange) && rawRange > 0 ? Math.floor(rawRange) : undefined

  const rawEngine = (url.searchParams.get('engine') ?? '').trim()

  const items = (url.searchParams.get('items') ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  const result = await readSeoPerformance(subject.organizationId, {
    mode,
    metric,
    device,
    rangeDays,
    engine: rawEngine || undefined,
    items
  })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export type EcosystemSeoPerformanceCatalogPayload = SeoPerformanceCatalogResult

/**
 * GET /api/platform/ecosystem/growth/seo/performance-catalog — qué keywords/URLs se pueden
 * elegir para comparar (TASK-1307). En modo keyword la lista es la UNIÓN de lo medido en
 * GSC y lo trackeado por rank capture: una keyword recién trackeada todavía no tiene
 * impresiones y aun así debe poder elegirse.
 *
 * Query params: `mode` (keyword|url), `windowDays`, `limit`.
 */
export const getEcosystemSeoPerformanceCatalogPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoPerformanceCatalogPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  const url = new URL(request.url)

  const rawMode = (url.searchParams.get('mode') ?? '').trim()
  const mode: SeoPerformanceMode | undefined = rawMode === 'url' || rawMode === 'keyword' ? rawMode : undefined

  const rawWindow = Number(url.searchParams.get('windowDays'))
  const windowDays = Number.isFinite(rawWindow) && rawWindow > 0 ? Math.floor(rawWindow) : undefined

  const rawLimit = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : undefined

  const result = await readSeoPerformanceCatalog(subject.organizationId, { mode, windowDays, limit })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/** Payload del entitlement per-org (chokepoint TASK-1301 como lectura). */
export interface EcosystemSeoEntitlementPayload {
  ok: true
  organizationId: string
  hasModule: boolean
  tier: SeoTier | null
  allowanceCap: number
  allowanceUsed: number
  allowanceRemaining: number
  budgetCapUsd: number
  budgetUsedUsd: number
  budgetRemainingUsd: number
  periodResetAt: string
  blockedReason: string | null
}

/**
 * GET /api/platform/ecosystem/growth/seo/entitlement — estado de tier/allowance/budget.
 *
 * A diferencia de los reads de datos, este payload NO aplica anti-oracle sobre
 * `hasModule=false`: su propósito es que un agente operador (binding interno) sepa si
 * una org está habilitada y con qué cupo ANTES de intentar operar. Un binding org-scoped
 * solo ve su propia org (misma resolución de sujeto), así que no filtra nada ajeno.
 */
export const getEcosystemSeoEntitlementPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoEntitlementPayload>> => {
  const organizationId = resolveOrganizationId(context, request)
  const entitlement = await resolveSeoEntitlement(organizationId)

  return {
    data: {
      ok: true,
      organizationId,
      hasModule: entitlement.hasModule,
      tier: entitlement.tier,
      allowanceCap: entitlement.allowanceCap,
      allowanceUsed: entitlement.allowanceUsed,
      allowanceRemaining: entitlement.allowanceRemaining,
      budgetCapUsd: entitlement.budgetCapUsd,
      budgetUsedUsd: entitlement.budgetUsedUsd,
      budgetRemainingUsd: entitlement.budgetRemainingUsd,
      periodResetAt: entitlement.periodResetAt,
      blockedReason: entitlement.blockedReason
    },
    meta: { module: 'growth.seo' }
  }
}

/**
 * ═══ TASK-1308 — `POST /api/platform/ecosystem/growth/seo/keywords/track` ═══
 *
 * El PRIMER write del lane SEO. Todo lo anterior era lectura, y eso cambia el listón:
 * seguir una keyword compromete gasto DataForSEO recurrente en la cuenta del cliente.
 *
 * 🔴 **Sólo bindings de scope `internal`.** Un binding org-scoped (cliente) puede LEER sus
 * oportunidades pero NO hacer crecer su propia factura sin una persona de Efeonce en el
 * medio. Es una decisión de least-privilege deliberada y reversible: abrirla después es
 * un cambio de una línea con su evidencia; haberla abierto de entrada no se deshace.
 *
 * El resto de las defensas NO se reimplementan acá — viven en el command `trackKeywords`
 * (techo, entitlement per-org, idempotencia, normalización, outbox). Este lane sólo deriva
 * el sujeto máquina y traduce el contrato.
 */

export interface EcosystemSeoTrackKeywordsBody {
  organizationId?: unknown
  keywords?: unknown
  /**
   * TASK-1659 — `target` | `opportunity`. Opcional: un consumer que no declara no clasifica,
   * y la membresía queda con intención `NULL` en vez de una inventada.
   */
  intent?: unknown
  /**
   * TASK-1659 — a quién se le atribuye el compromiso cuando el agente actúa por encargo. El
   * `actor` sigue siendo la máquina (procedencia real del write); esto es la autoría humana.
   */
  intentDeclaredBy?: unknown
}

export const trackEcosystemSeoKeywordsPayload = async ({
  context,
  request,
  body
}: {
  context: ApiPlatformRequestContext
  request: Request
  body: EcosystemSeoTrackKeywordsBody | null
}): Promise<ApiPlatformSuccessResult<TrackKeywordsResult | SeoTargetNotConfiguredPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Tracking SEO keywords is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const requestedOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId : null

  const keywords = Array.isArray(body?.keywords)
    ? body.keywords.filter((item): item is string => typeof item === 'string')
    : []

  if (keywords.length === 0) {
    throw new ApiPlatformError('A non-empty "keywords" array is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  // TASK-1659 — vocabulario cerrado validado en la frontera. Un valor fuera del enum es un
  // 400 explícito, no un `undefined` silencioso: el consumer tiene que enterarse de que su
  // declaración no se guardó.
  if (body?.intent !== undefined && !isSeoKeywordIntent(body.intent)) {
    throw new ApiPlatformError(`"intent" must be one of: ${SEO_KEYWORD_INTENTS.join(', ')}.`, {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const intent = body?.intent
  const intentDeclaredBy = typeof body?.intentDeclaredBy === 'string' ? body.intentDeclaredBy.trim() : ''

  const subject = await resolveSeoLaneSubject(context, request, requestedOrganizationId)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  // El actor es el CONSUMIDOR máquina, no una persona: la procedencia tiene que decir la
  // verdad sobre quién comprometió el gasto para poder auditarlo después.
  // `publicId` y no `consumerId`: la procedencia queda legible para quien audite el gasto
  // sin tener que resolver un id interno contra otra tabla.
  const result = await trackKeywords(subject.seoTargetId, keywords, `mcp:${context.consumer.publicId}`, {
    source: 'mcp',
    ...(intent ? { intent } : {}),
    ...(intent && intentDeclaredBy ? { intentDeclaredBy } : {})
  })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}


/**
 * ═══ TASK-1308 — `POST /api/platform/ecosystem/growth/seo/keywords/untrack` ═══
 *
 * La contraparte de `track` en el lane, y la que hace REVERSIBLE el compromiso de gasto
 * también para los consumers máquina: sin ella un agente podía agregar keywords al ciclo de
 * facturación y no sacarlas.
 *
 * Mismo boundary de scope `internal` que el alta. Podría argumentarse que bajar el gasto es
 * inofensivo y merece una puerta más ancha, pero no: dejar de seguir CORTA una serie de
 * medición y el histórico queda con un hueco permanente. Que quien pueda subir el gasto sea
 * el mismo que pueda cortarlo es la simetría correcta.
 */

export const untrackEcosystemSeoKeywordsPayload = async ({
  context,
  request,
  body
}: {
  context: ApiPlatformRequestContext
  request: Request
  body: EcosystemSeoTrackKeywordsBody | null
}): Promise<ApiPlatformSuccessResult<UntrackKeywordsResult | SeoTargetNotConfiguredPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Untracking SEO keywords is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const requestedOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId : null

  const keywords = Array.isArray(body?.keywords)
    ? body.keywords.filter((item): item is string => typeof item === 'string')
    : []

  if (keywords.length === 0) {
    throw new ApiPlatformError('A non-empty "keywords" array is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const subject = await resolveSeoLaneSubject(context, request, requestedOrganizationId)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const result = await untrackKeywords(subject.seoTargetId, keywords, `mcp:${context.consumer.publicId}`)

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/**
 * ═══ TASK-1662 — competidores declarados en el lane ecosystem ═══
 *
 * Mismo listón que track/untrack: declarar un competidor es un COMPROMISO DE GASTO DIFERIDO
 * (la captura de cobertura paga por cada competidor vigente en cada ciclo), así que ambos
 * commands aceptan **sólo bindings de scope `internal`** — un binding org-scoped (cliente)
 * no hace crecer su propia factura, y además el listado de competidores es información
 * comercial sensible que no cruza el boundary de org (auditoría §7: la comparativa
 * competitiva no se expone al cliente).
 *
 * Las defensas viven en los commands (`declareCompetitors`/`retireCompetitors`): autoría
 * obligatoria, techo por target, idempotencia, normalización, outbox. Este lane sólo deriva
 * el sujeto máquina y traduce el contrato.
 */

export interface EcosystemSeoCompetitorsBody {
  organizationId?: unknown
  domains?: unknown
  /** Referencia OPACA a la propuesta de máquina (p. ej. top-N de TASK-1699). Nunca FK. */
  proposalRef?: unknown
  reason?: unknown
}

export const declareEcosystemSeoCompetitorsPayload = async ({
  context,
  request,
  body
}: {
  context: ApiPlatformRequestContext
  request: Request
  body: EcosystemSeoCompetitorsBody | null
}): Promise<ApiPlatformSuccessResult<DeclareCompetitorsResult | SeoTargetNotConfiguredPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Declaring SEO competitors is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const requestedOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId : null

  const domains = Array.isArray(body?.domains)
    ? body.domains.filter((item): item is string => typeof item === 'string')
    : []

  if (domains.length === 0) {
    throw new ApiPlatformError('A non-empty "domains" array is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const proposalRef = typeof body?.proposalRef === 'string' ? body.proposalRef.trim() : ''

  const subject = await resolveSeoLaneSubject(context, request, requestedOrganizationId)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  // El actor es el CONSUMIDOR máquina — procedencia auditable del compromiso de gasto.
  const result = await declareCompetitors(subject.seoTargetId, domains, `mcp:${context.consumer.publicId}`, {
    source: 'mcp',
    ...(proposalRef ? { proposalRef } : {})
  })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export const retireEcosystemSeoCompetitorsPayload = async ({
  context,
  request,
  body
}: {
  context: ApiPlatformRequestContext
  request: Request
  body: EcosystemSeoCompetitorsBody | null
}): Promise<ApiPlatformSuccessResult<RetireCompetitorsResult | SeoTargetNotConfiguredPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Retiring SEO competitors is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const requestedOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId : null

  const domains = Array.isArray(body?.domains)
    ? body.domains.filter((item): item is string => typeof item === 'string')
    : []

  if (domains.length === 0) {
    throw new ApiPlatformError('A non-empty "domains" array is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  const subject = await resolveSeoLaneSubject(context, request, requestedOrganizationId)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const result = await retireCompetitors(subject.seoTargetId, domains, `mcp:${context.consumer.publicId}`, {
    ...(reason ? { reason } : {})
  })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/**
 * ═══ TASK-1662 — keyword gap competitivo en el lane ecosystem (lectura) ═══
 *
 * 🔴 **Sólo bindings `internal` SIN organización**, con 404 anti-oracle (mismo contrato que
 * el gasto de proveedor): la comparativa competitiva NO se expone al cliente (auditoría §7)
 * y el listado de competidores es información comercial sensible que no cruza el boundary
 * de org. Un binding org-scoped no debe poder ni confirmar que el recurso existe.
 */

export const getEcosystemSeoKeywordGapPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<KeywordGapResult | SeoTargetNotConfiguredPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal' || context.binding.organizationId) {
    throw new ApiPlatformError('SEO resource not found for the resolved scope.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const url = new URL(request.url)
  const organizationId = (url.searchParams.get('organizationId') ?? '').trim()

  if (!organizationId) {
    throw new ApiPlatformError('organizationId is required for internal bindings.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const seoCompetitorId = (url.searchParams.get('seoCompetitorId') ?? '').trim()
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)

  const subject = await resolveSeoLaneSubject(context, request, organizationId)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const result = await readKeywordGap(subject.seoTargetId, {
    ...(seoCompetitorId ? { seoCompetitorId } : {}),
    ...(Number.isFinite(rawLimit) && rawLimit > 0 ? { limit: rawLimit } : {})
  })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/**
 * ═══ TASK-1699 — top-N del SERP + candidatos a competidor en el lane ecosystem ═══
 *
 * 🔴 **Sólo bindings `internal` SIN organización, 404 anti-oracle** — el top-N del SERP de
 * las keywords de un cliente es DATO COMPETITIVO (quién ranquea en su intención) y §7 de la
 * auditoría prohíbe la comparativa competitiva client-facing. Mismo contrato que el gasto
 * de proveedor y el keyword gap.
 */

const requireInternalSeoBinding = (context: ApiPlatformRequestContext, request: Request): string => {
  if (context.binding.greenhouseScopeType !== 'internal' || context.binding.organizationId) {
    throw new ApiPlatformError('SEO resource not found for the resolved scope.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const url = new URL(request.url)
  const organizationId = (url.searchParams.get('organizationId') ?? '').trim()

  if (!organizationId) {
    throw new ApiPlatformError('organizationId is required for internal bindings.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return organizationId
}

export const getEcosystemSeoSerpTopResultsPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<ReadSerpTopResultsResult | SeoTargetNotConfiguredPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const organizationId = requireInternalSeoBinding(context, request)
  const url = new URL(request.url)

  const keyword = (url.searchParams.get('keyword') ?? '').trim()
  const from = (url.searchParams.get('from') ?? '').trim()
  const to = (url.searchParams.get('to') ?? '').trim()
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)

  const subject = await resolveSeoLaneSubject(context, request, organizationId)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const result = await readSerpTopResults(subject.seoTargetId, {
    ...(keyword ? { keyword } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(Number.isFinite(rawLimit) && rawLimit > 0 ? { limit: rawLimit } : {})
  })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export const getEcosystemSeoCompetitorCandidatesPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<SerpCompetitorCandidatesResult | SeoTargetNotConfiguredPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const organizationId = requireInternalSeoBinding(context, request)
  const url = new URL(request.url)

  const rawWindow = Number.parseInt(url.searchParams.get('windowDays') ?? '', 10)
  const rawMinKeywords = Number.parseInt(url.searchParams.get('minKeywords') ?? '', 10)
  const rawMinDays = Number.parseInt(url.searchParams.get('minDays') ?? '', 10)

  const subject = await resolveSeoLaneSubject(context, request, organizationId)

  if (!subject.seoTargetId) {
    return {
      data: { ok: false, errorCode: 'target_not_configured', organizationId: subject.organizationId },
      meta: { module: 'growth.seo', tier: subject.tier }
    }
  }

  const result = await readSerpCompetitorCandidates(subject.seoTargetId, {
    ...(Number.isFinite(rawWindow) && rawWindow > 0 ? { windowDays: rawWindow } : {}),
    ...(Number.isFinite(rawMinKeywords) && rawMinKeywords > 0 ? { minKeywords: rawMinKeywords } : {}),
    ...(Number.isFinite(rawMinDays) && rawMinDays > 0 ? { minDays: rawMinDays } : {})
  })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/**
 * ═══ TASK-1664 — keyword discovery en el lane ecosystem ═══
 *
 * Passthrough de los primitives `readKeywordDiscovery` / `queueKeywordDiscovery` /
 * `recordKeywordDiscoveryAction` — los MISMOS que consumen la route admin y (vía este lane)
 * el MCP. La lectura respeta el binding org-scoped; el write (que compromete gasto de
 * proveedor) sólo se acepta desde bindings de scope `internal`, igual que track/untrack:
 * un binding cliente puede leer sus candidatos pero no hacer crecer su propia factura.
 */

/** GET /api/platform/ecosystem/growth/seo/keyword-discovery */
export const getEcosystemSeoKeywordDiscoveryPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<ReadKeywordDiscoveryResult | { ok: false; errorCode: 'disabled'; status: null }>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  const subject = await resolveSeoLaneSubject(context, request)

  const url = new URL(request.url)

  const parseNumber = (value: string | null): number | undefined => {
    if (value === null || value.trim() === '') return undefined

    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : undefined
  }

  // Vocabulario CERRADO: un valor fuera de él se ignora (mismo criterio que el app lane), jamás
  // se pasa crudo al reader fingiendo un filtro que no existe.
  const readDiscoveryLinkBarrier = (value: string | null) => {
    const raw = value?.trim()

    return raw && isDiscoveryLinkBarrierFilterLevel(raw) ? raw : undefined
  }

  const result = await readKeywordDiscovery({
    organizationId: subject.organizationId,
    seoTargetId: subject.seoTargetId ?? undefined,
    runId: url.searchParams.get('runId')?.trim() || undefined,
    status: (url.searchParams.get('status')?.trim() || undefined) as SeoDiscoveryRunStatus | undefined,
    sourceEndpoint: (url.searchParams.get('sourceEndpoint')?.trim() || undefined) as SeoDiscoveryMethod | undefined,
    query: url.searchParams.get('query')?.trim() || undefined,
    intent: (url.searchParams.get('intent')?.trim() || undefined) as SeoSearchIntent | undefined,
    minSearchVolume: parseNumber(url.searchParams.get('minSearchVolume')),
    // ⚠️ DEPRECADO (TASK-1694): aceptado, NO aplicado, declarado en `ignoredFilters` del
    // payload — que viaja tal cual porque este lane es passthrough del primitive.
    maxDifficulty: parseNumber(url.searchParams.get('maxDifficulty')),
    maxLinkBarrier: readDiscoveryLinkBarrier(url.searchParams.get('maxLinkBarrier')),
    includeUnknownBarrier: url.searchParams.get('includeUnknownBarrier') === 'true',
    excludeTracked: url.searchParams.get('excludeTracked') === 'true',
    limit: parseNumber(url.searchParams.get('limit')),
    cursor: url.searchParams.get('cursor')
  })

  if (!result.ok && result.errorCode === 'run_not_found') {
    // Anti-oracle: un run ajeno "no existe" para este binding.
    throw new ApiPlatformError('SEO resource not found for the resolved scope.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

export interface EcosystemSeoDiscoverBody {
  organizationId?: unknown
  seoTargetId?: unknown
  market?: unknown
  seedSource?: unknown
  manualSeeds?: unknown
  mixedMeasuredSource?: unknown
  methods?: unknown
  idempotencyKey?: unknown
  preview?: unknown
  candidateId?: unknown
  actionKind?: unknown
  metadata?: unknown
}

const parseEcosystemMethods = (value: unknown): Array<{ method: SeoDiscoveryMethod; resultsPerCall?: number }> => {
  if (!Array.isArray(value)) return []

  const methods: Array<{ method: SeoDiscoveryMethod; resultsPerCall?: number }> = []

  for (const entry of value) {
    if (typeof entry === 'string') {
      methods.push({ method: entry as SeoDiscoveryMethod })

      continue
    }

    if (typeof entry === 'object' && entry !== null && typeof (entry as { method?: unknown }).method === 'string') {
      const spec = entry as { method: string; resultsPerCall?: unknown }

      methods.push({
        method: spec.method as SeoDiscoveryMethod,
        resultsPerCall: typeof spec.resultsPerCall === 'number' ? spec.resultsPerCall : undefined
      })
    }
  }

  return methods
}

/**
 * POST /api/platform/ecosystem/growth/seo/keyword-discovery — encola (o previsualiza) una
 * corrida. 🔴 Sólo bindings `internal`: comprometer gasto DataForSEO no es para bindings
 * cliente. `preview: true` = dry-run sin insert ni gasto.
 */
export const discoverEcosystemSeoKeywordsPayload = async ({
  context,
  request,
  body
}: {
  context: ApiPlatformRequestContext
  request: Request
  body: EcosystemSeoDiscoverBody | null
}): Promise<
  ApiPlatformSuccessResult<
    QueueKeywordDiscoveryResult | PreviewKeywordDiscoveryResult | { ok: false; errorCode: 'disabled'; status: null }
  >
> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Queueing SEO keyword discovery is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const requestedOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId : null
  const seedSource = typeof body?.seedSource === 'string' ? (body.seedSource as SeoDiscoverySourceKind) : null

  if (!seedSource || !SEO_DISCOVERY_SOURCE_KINDS.includes(seedSource)) {
    throw new ApiPlatformError('A valid "seedSource" is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const subject = await resolveSeoLaneSubject(context, request, requestedOrganizationId)

  const input = {
    organizationId: subject.organizationId,
    seoTargetId: subject.seoTargetId ?? undefined,
    seedSource,
    manualSeeds: Array.isArray(body?.manualSeeds)
      ? body.manualSeeds.filter((item): item is string => typeof item === 'string')
      : undefined,
    mixedMeasuredSource:
      body?.mixedMeasuredSource === 'tracked_keywords' ? ('tracked_keywords' as const) : undefined,
    methods: parseEcosystemMethods(body?.methods),
    // Actor máquina: la procedencia dice la verdad sobre quién comprometió el gasto.
    actor: `mcp:${context.consumer.publicId}`,
    idempotencyKey: typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : undefined
  }

  const result = body?.preview === true ? await previewKeywordDiscovery(input) : await queueKeywordDiscovery(input)

  if (!result.ok && (result.errorCode === 'invalid_seed' || result.errorCode === 'limit_exceeded')) {
    throw new ApiPlatformError('The discovery request is outside the allowed limits.', {
      statusCode: 400,
      errorCode: 'bad_request',
      details: { reason: result.reason ?? result.errorCode }
    })
  }

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/**
 * POST /api/platform/ecosystem/growth/seo/keyword-discovery/actions — acción append-only
 * sobre un candidato. Sólo bindings `internal` (es una decisión operativa, no de cliente).
 * JAMÁS trackea por sí sola.
 */
export const recordEcosystemSeoDiscoveryActionPayload = async ({
  context,
  request,
  body
}: {
  context: ApiPlatformRequestContext
  request: Request
  body: EcosystemSeoDiscoverBody | null
}): Promise<ApiPlatformSuccessResult<RecordKeywordDiscoveryActionResult | { ok: false; errorCode: 'disabled'; status: null }>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Recording SEO discovery actions is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const requestedOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId : null
  const candidateId = typeof body?.candidateId === 'string' ? body.candidateId.trim() : ''
  const actionKind = typeof body?.actionKind === 'string' ? (body.actionKind as SeoDiscoveryActionKind) : null

  if (!candidateId || !actionKind || !SEO_DISCOVERY_ACTION_KINDS.includes(actionKind)) {
    throw new ApiPlatformError('A "candidateId" and a valid "actionKind" are required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const subject = await resolveSeoLaneSubject(context, request, requestedOrganizationId)

  const result = await recordKeywordDiscoveryAction({
    organizationId: subject.organizationId,
    candidateId,
    actionKind,
    actor: `mcp:${context.consumer.publicId}`,
    idempotencyKey: typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
    metadata:
      typeof body?.metadata === 'object' && body?.metadata !== null ? (body.metadata as Record<string, unknown>) : undefined
  })

  if (!result.ok && result.errorCode === 'run_not_found') {
    throw new ApiPlatformError('SEO resource not found for the resolved scope.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/**
 * ═══ TASK-1666 — grounded queries (puente SEO → AEO) en el lane ecosystem ═══
 *
 * Passthrough de `createGroundedQueryDraft` / `readGroundedQueryDraft` — los MISMOS primitives
 * del app lane. Sólo bindings `internal` (V1 es operador interno; un binding cliente no prepara
 * prompts AEO).
 *
 * 🔴 Estado de authz del write en el lane máquina: el bridge y el command AEO se auto-protegen
 * con `can()` sobre un subject HUMANO (`growth.ai_visibility.prompt_set.manage`). El actor de
 * este lane es la máquina (`mcp:<consumer>`, sin roles), así que el write responde
 * `aeo_forbidden` FAIL-CLOSED hasta que exista un cliente con identidad/grants por usuario
 * (TASK-1631) — el mismo estado operativo que las tools de escritura SEO con su scope sin
 * cablear al cliente público. Se federa igual (parity + deny canary honesto), no se debilita
 * ningún gate para "hacerla andar".
 */

const machineSubject = (context: ApiPlatformRequestContext): TenantEntitlementSubject => ({
  userId: `mcp:${context.consumer.publicId}`,
  tenantType: 'efeonce_internal',
  roleCodes: [],
  primaryRoleCode: '',
  routeGroups: [],
  authorizedViews: []
})

export interface EcosystemSeoGroundedQueriesBody {
  organizationId?: unknown
  profileId?: unknown
  seoTargetId?: unknown
  discoveryRunId?: unknown
  candidateIds?: unknown
}

/** POST /api/platform/ecosystem/growth/seo/grounded-queries */
export const prepareEcosystemSeoGroundedQueriesPayload = async ({
  context,
  request,
  body
}: {
  context: ApiPlatformRequestContext
  request: Request
  body: EcosystemSeoGroundedQueriesBody | null
}): Promise<ApiPlatformSuccessResult<GroundedQueryDraftResult | { ok: false; errorCode: 'disabled'; status: null }>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Preparing grounded queries is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const requestedOrganizationId = typeof body?.organizationId === 'string' ? body.organizationId : null
  const subject = await resolveSeoLaneSubject(context, request, requestedOrganizationId)

  const profileId = typeof body?.profileId === 'string' ? body.profileId.trim() : ''
  const seoTargetId = typeof body?.seoTargetId === 'string' ? body.seoTargetId.trim() : ''
  const discoveryRunId = typeof body?.discoveryRunId === 'string' ? body.discoveryRunId.trim() : ''

  const candidateIds = Array.isArray(body?.candidateIds)
    ? body.candidateIds.filter((item): item is string => typeof item === 'string')
    : []

  if (!profileId || !seoTargetId || !discoveryRunId || candidateIds.length === 0) {
    throw new ApiPlatformError('profileId, seoTargetId, discoveryRunId and candidateIds are required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const result = await createGroundedQueryDraft({
    subject: machineSubject(context),
    organizationId: subject.organizationId,
    profileId,
    seoTargetId,
    discoveryRunId,
    candidateIds,
    createdBy: `mcp:${context.consumer.publicId}`
  })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/** GET /api/platform/ecosystem/growth/seo/grounded-queries */
export const getEcosystemSeoGroundedQueryDraftPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<ReadGroundedQueryDraftResult | { ok: false; errorCode: 'disabled'; status: null }>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Reading grounded query drafts is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const subject = await resolveSeoLaneSubject(context, request)

  const url = new URL(request.url)
  const profileId = url.searchParams.get('profileId')?.trim() ?? ''
  const setId = url.searchParams.get('setId')?.trim() ?? ''

  if (!profileId || !setId) {
    throw new ApiPlatformError('profileId and setId are required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const result = await readGroundedQueryDraft({
    subject: machineSubject(context),
    organizationId: subject.organizationId,
    profileId,
    setId
  })

  return {
    data: result,
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId, servedMarket: subject.servedMarket }
  }
}

/**
 * ═══ TASK-1709 — Lane ecosystem del diagnóstico de prospecto ═══
 *
 * El sujeto de este carril NO tiene organización (es un dominio prospecto), así que acá
 * no corre `resolveSeoLaneSubject`: el boundary es el SCOPE del binding. SOLO bindings
 * `internal` — leer y disparar: la data de prospección es inteligencia de adquisición de
 * Efeonce y jamás se sirve a un binding cliente; y el write compromete gasto real (tope
 * duro por diagnóstico + tope diario por actor, ambos dentro del command canónico).
 */

export interface EcosystemSeoProspectDiagnosticReadPayload {
  ok: boolean
  errorCode?: 'disabled'
  diagnostic?: ProspectDiagnostic
  diagnostics?: ProspectDiagnostic[]
}

export const getEcosystemSeoProspectDiagnosticPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoProspectDiagnosticReadPayload>> => {
  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Prospect diagnostics are not available for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  const url = new URL(request.url)
  const diagnosticId = url.searchParams.get('diagnosticId')

  if (diagnosticId) {
    const result = await readProspectDiagnostic({ diagnosticId })

    if (!result.ok) {
      if (result.errorCode === 'disabled') {
        return { data: { ok: false, errorCode: 'disabled' }, meta: { module: 'growth.seo' } }
      }

      throw new ApiPlatformError('Prospect diagnostic not found.', {
        statusCode: 404,
        errorCode: 'not_found'
      })
    }

    return { data: { ok: true, diagnostic: result.data }, meta: { module: 'growth.seo' } }
  }

  const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '', 10)

  const result = await listProspectDiagnostics({
    limit: Number.isFinite(limitParam) ? limitParam : undefined,
    rootDomain: url.searchParams.get('rootDomain') ?? undefined
  })

  if (!result.ok) {
    return { data: { ok: false, errorCode: 'disabled' }, meta: { module: 'growth.seo' } }
  }

  return { data: { ok: true, diagnostics: result.data }, meta: { module: 'growth.seo' } }
}

export interface EcosystemSeoProspectDiagnosticBody {
  rootDomain?: unknown
  market?: unknown
  competitorDomains?: unknown
}

export const runEcosystemSeoProspectDiagnosticPayload = async ({
  context,
  body
}: {
  context: ApiPlatformRequestContext
  body: EcosystemSeoProspectDiagnosticBody | null
}): Promise<ApiPlatformSuccessResult<RunProspectDiagnosticResult>> => {
  if (context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Running prospect diagnostics is not allowed for the resolved binding scope.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  if (!body || typeof body.rootDomain !== 'string' || typeof body.market !== 'string') {
    throw new ApiPlatformError('A "rootDomain" and a "market" are required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const competitorDomains = Array.isArray(body.competitorDomains)
    ? body.competitorDomains.filter((domain): domain is string => typeof domain === 'string').slice(0, 5)
    : undefined

  // El actor es el consumidor máquina; la confirmación humana ocurre ANTES, en la
  // superficie que propone (propose → confirm → execute) — la description de la MCP
  // tool lo exige. La procedencia queda auditable en created_by.
  const result = await runProspectDiagnostic({
    rootDomain: body.rootDomain,
    market: body.market,
    competitorDomains,
    actor: `mcp:${context.consumer.publicId}`
  })

  return { data: result, meta: { module: 'growth.seo' } }
}

export type EcosystemSeoProviderSpendPayload =
  | ({ ok: true } & SeoProviderSpendByConsumerResult)
  | { ok: false; errorCode: 'disabled'; status: null }

/**
 * TASK-1696 — GET /api/platform/ecosystem/growth/seo/provider-spend
 *
 * Gasto de proveedor del mes por organización, cortado por CONSUMIDOR (`seo` | `aeo`) y por BASE
 * DE COSTO (facturado | estimado). Passthrough del reader canónico
 * `readSeoProviderSpendByConsumer` — un primitive, muchos consumers: ninguna pantalla ni tool
 * suma gasto con SQL propio.
 *
 * 🔴 SÓLO BINDINGS `internal`, y no es una restricción de permisos sino de NATURALEZA DEL DATO:
 * esto es lo que a Efeonce le CUESTA servir a un cliente, no algo que el cliente haya consumido.
 * Un binding org-scoped que leyera su propia fila estaría leyendo nuestra estructura de costos.
 * El resto del lane resuelve la organización desde el binding cuando es org-scoped; acá esa
 * misma resolución sería la fuga. Por eso se rechaza antes de tocar el dominio, con 404
 * anti-oracle en vez de 403: un binding de cliente no debe aprender siquiera que el recurso
 * existe.
 */
export const getEcosystemSeoProviderSpendPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<EcosystemSeoProviderSpendPayload>> => {
  if (!isSeoModuleEnabled()) {
    return { data: { ok: false, errorCode: 'disabled', status: null }, meta: { module: 'growth.seo' } }
  }

  if (context.binding.greenhouseScopeType !== 'internal' || context.binding.organizationId) {
    throw new ApiPlatformError('SEO resource not found for the resolved scope.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const url = new URL(request.url)
  const organizationId = (url.searchParams.get('organizationId') ?? '').trim()

  if (!organizationId) {
    throw new ApiPlatformError('organizationId is required for internal bindings.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const result = await readSeoProviderSpendByConsumer(organizationId)

  return {
    data: { ok: true, ...result },
    meta: { module: 'growth.seo', organizationId }
  }
}

import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { readBacklinkProfile } from '@/lib/growth/seo/backlinks/reader'
import { readSeoAeoGap } from '@/lib/growth/seo/gap/read-seo-aeo-gap'
import { readKeywordOpportunities } from '@/lib/growth/seo/keyword-opportunities-reader'
import { readRankEvolution } from '@/lib/growth/seo/rank-evolution-reader'
import { readSeoOverviewKpis } from '@/lib/growth/seo/overview/read-overview-kpis'
import { readSiteAuditReport } from '@/lib/growth/seo/site-audit/reader'
import type {
  BacklinkProfileResult,
  KeywordOpportunitiesResult,
  RankEvolutionResult,
  SeoAeoGapResult,
  SeoRankDevice,
  SiteAuditReportResult
} from '@/lib/growth/seo/contracts'
import { resolveSeoEntitlement, type SeoTier } from '@/lib/growth/seo/entitlement'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

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
 * - En AMBOS casos: entitlement per-org (`module_assignments` `seo_v1` vigente) o
 *   **404 anti-oracle** — un binding sin entitlement no aprende si la org existe.
 */

const resolveOrganizationId = (context: ApiPlatformRequestContext, request: Request): string => {
  const url = new URL(request.url)
  const requested = (url.searchParams.get('organizationId') ?? '').trim() || null

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
  tier: SeoTier | null
}

/**
 * Gate del lane: flag → entitlement per-org (404 anti-oracle) → target activo.
 * Retorna `seoTargetId: null` cuando la org está entitled pero aún no tiene target
 * configurado (degradación honesta `target_not_configured`, no un 404 que mentiría).
 */
const resolveSeoLaneSubject = async (
  context: ApiPlatformRequestContext,
  request: Request
): Promise<SeoLaneSubject> => {
  const organizationId = resolveOrganizationId(context, request)

  const entitlement = await resolveSeoEntitlement(organizationId)

  if (!entitlement.hasModule) {
    // Anti-oracle: sin módulo `seo_v1` vigente, el recurso "no existe" para este binding.
    throw new ApiPlatformError('SEO resource not found for the resolved scope.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  const targets = await runGreenhousePostgresQuery<{ seo_target_id: string }>(
    `SELECT seo_target_id
       FROM greenhouse_growth.seo_targets
      WHERE organization_id = $1
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1`,
    [organizationId]
  )

  return {
    organizationId,
    seoTargetId: targets[0]?.seo_target_id ?? null,
    tier: entitlement.tier
  }
}

/** Payload honesto cuando la org está entitled pero sin target SEO configurado. */
export interface SeoTargetNotConfiguredPayload {
  ok: false
  errorCode: 'target_not_configured'
  organizationId: string
}

export type EcosystemSeoKeywordOpportunitiesPayload = KeywordOpportunitiesResult | SeoTargetNotConfiguredPayload
export type EcosystemSeoVisibility360Payload = SeoAeoGapResult | SeoTargetNotConfiguredPayload

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
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId }
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
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId }
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
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId }
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
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId }
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
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId }
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
    meta: { module: 'growth.seo', tier: subject.tier, organizationId: subject.organizationId }
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

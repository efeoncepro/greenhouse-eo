import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { readSeoAeoGap } from '@/lib/growth/seo/gap/read-seo-aeo-gap'
import { readKeywordOpportunities } from '@/lib/growth/seo/keyword-opportunities-reader'
import type { KeywordOpportunitiesResult, SeoAeoGapResult } from '@/lib/growth/seo/contracts'
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

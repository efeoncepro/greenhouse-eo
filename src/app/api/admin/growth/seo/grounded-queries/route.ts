import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { createGroundedQueryDraft, type GroundedQueryErrorCode } from '@/lib/growth/seo/grounded-query-bridge'
import { readGroundedQueryDraft } from '@/lib/growth/seo/grounded-query-reader'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1666 — `POST/GET /api/admin/growth/seo/grounded-queries`
 *
 * Contrato programático del puente SEO → grounded queries AEO (Full API Parity): la acción
 * "Preparar grounded queries" de TASK-1665 es UN cliente de esta ruta. Acá vive sólo el
 * transporte; la regla de negocio (doble capability, tenant, límites, hash, idempotencia,
 * fallback honesto) vive en `createGroundedQueryDraft` / `readGroundedQueryDraft` — los MISMOS
 * primitives que consumen Nexa, el lane ecosystem y MCP.
 *
 * El POST devuelve 201 con el draft: la corrida NO es async (la autoría es una llamada) pero el
 * resultado es un DRAFT que exige revisión humana — la respuesta jamás incluye un `active` ni
 * un run AEO.
 */

export const dynamic = 'force-dynamic'

/** El contrato del primitive se traduce 1:1 a códigos canónicos: sin prosa inventada acá. */
const ERROR_CODE_MAP: Record<GroundedQueryErrorCode, CanonicalErrorCode> = {
  grounded_query_disabled: 'seo_module_disabled',
  seo_forbidden: 'forbidden',
  aeo_forbidden: 'forbidden',
  profile_not_found: 'seo_grounded_query_not_found',
  candidate_not_found: 'seo_grounded_query_not_found',
  cross_tenant: 'seo_grounded_query_not_found',
  candidate_limit_exceeded: 'seo_discovery_invalid_input',
  duplicate_candidate: 'seo_discovery_invalid_input',
  invalid_context: 'seo_discovery_invalid_input',
  authoring_disabled: 'seo_discovery_invalid_input',
  provider_unavailable: 'seo_provider_unavailable',
  schema_invalid: 'seo_provider_unavailable',
  draft_conflict: 'internal_error',
  draft_not_found: 'seo_grounded_query_not_found'
}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return canonicalErrorResponse('seo_discovery_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const organizationId = asString(body.organizationId)
  const profileId = asString(body.profileId)
  const seoTargetId = asString(body.seoTargetId)
  const discoveryRunId = asString(body.discoveryRunId)

  const candidateIds = Array.isArray(body.candidateIds)
    ? body.candidateIds.filter((item): item is string => typeof item === 'string')
    : []

  if (!organizationId || !profileId || !seoTargetId || !discoveryRunId || candidateIds.length === 0) {
    return canonicalErrorResponse('seo_discovery_invalid_input', {
      extra: {
        reason: 'missing_required_fields',
        required: ['organizationId', 'profileId', 'seoTargetId', 'discoveryRunId', 'candidateIds']
      }
    })
  }

  try {
    const result = await createGroundedQueryDraft({
      subject: tenant,
      organizationId,
      profileId,
      seoTargetId,
      discoveryRunId,
      candidateIds,
      createdBy: tenant.userId
    })

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', {
        extra: { profileId, discoveryRunId }
      })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_grounded_queries_route' },
      extra: { organizationId, profileId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organizationId')?.trim() ?? ''
  const profileId = url.searchParams.get('profileId')?.trim() ?? ''
  const setId = url.searchParams.get('setId')?.trim() ?? ''

  if (!organizationId || !profileId || !setId) {
    return canonicalErrorResponse('seo_discovery_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['organizationId', 'profileId', 'setId'] }
    })
  }

  try {
    const result = await readGroundedQueryDraft({ subject: tenant, organizationId, profileId, setId })

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', {
        extra: { profileId, setId }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_grounded_queries_route' },
      extra: { organizationId, profileId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

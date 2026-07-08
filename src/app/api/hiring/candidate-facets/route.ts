import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  getCandidateFacetByProfile,
  hiringInvalidBodyResponse,
  hiringNotFoundResponse,
  reconcileCandidateFacet,
  toHiringErrorResponse,
} from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { ReconcileCandidateFacetInput } from '@/types/hiring'

/**
 * TASK-353 — `GET/POST /api/hiring/candidate-facets` (CandidateFacet, person-first).
 *
 * POST reconcilia la faceta de reclutamiento sobre una Person existente (upsert por
 * `identityProfileId`; una Person tiene a lo más una candidate_facet). NO crea Person —
 * la reconciliación/creación de Person desde contacto crudo es el apply público (TASK-354).
 * Gateado por `hiring.application.write` (sourcing es parte del carril de aplicación).
 * GET `?identityProfileId=` devuelve la faceta de una persona.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.read' } })
  }

  try {
    const { searchParams } = new URL(request.url)
    const identityProfileId = searchParams.get('identityProfileId')

    if (!identityProfileId) {
      return NextResponse.json(
        { error: 'Falta el parámetro identityProfileId.', code: 'hiring_invalid_input', actionable: false },
        { status: 400 },
      )
    }

    const facet = await getCandidateFacetByProfile(identityProfileId)

    if (!facet) return hiringNotFoundResponse('La persona no tiene faceta de candidato.', 'candidate_facet_not_found')
    
return NextResponse.json(facet)
  } catch (error) {
    return toHiringErrorResponse(error, 'candidate_facet_get')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.write', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.write' } })
  }

  let body: ReconcileCandidateFacetInput

  try {
    body = (await request.json()) as ReconcileCandidateFacetInput
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const facet = await reconcileCandidateFacet(body, tenant.userId)

    
return NextResponse.json(facet, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'candidate_facet_reconcile')
  }
}

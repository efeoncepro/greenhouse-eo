import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import { correctCandidateDisplayName } from '@/lib/hiring/candidate-intake/correct-display'
import { HiringNotFoundError } from '@/lib/hiring/errors'
import { getCandidateFacetById } from '@/lib/hiring/store'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1736 Slice 2 — `POST /api/hiring/candidate-facets/[candidateFacetId]/display-name`.
 *
 * Corrección HUMANA del display name de la identidad de un candidato (patrón de la ruta reveal de
 * TASK-1714). Dos puertas: sesión interna → capability `hiring.candidate.correct_display`
 * (tier gobernanza role-only). El candidato se ancla por `candidateFacetId` → `identityProfileId`;
 * NUNCA por nombre. El command escribe UPDATE + audit fuente `human` en una tx; una corrección
 * humana siempre gana sobre el automatismo de reconciliación (ADR D3.2).
 *
 * El `reason` va al audit append-only; nunca a un log de aplicación. La respuesta retorna
 * before/after al operador autorizado (misma superficie que ya ve el nombre).
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ candidateFacetId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.candidate.correct_display', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.candidate.correct_display' }
    })
  }

  const { candidateFacetId } = await params

  let body: Record<string, unknown> = {}

  try {
    body = ((await request.json()) as Record<string, unknown> | null) ?? {}
  } catch {
    body = {}
  }

  try {
    const facet = await getCandidateFacetById(candidateFacetId)

    if (!facet) {
      throw new HiringNotFoundError('El candidato no existe.', 'hiring_candidate_facet_not_found')
    }

    const result = await correctCandidateDisplayName({
      identityProfileId: facet.identityProfileId,
      correctedName: typeof body.correctedName === 'string' ? body.correctedName : '',
      reason: typeof body.reason === 'string' ? body.reason : '',
      actorUserId: tenant.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    return toHiringErrorResponse(error, 'POST /api/hiring/candidate-facets/[candidateFacetId]/display-name')
  }
}

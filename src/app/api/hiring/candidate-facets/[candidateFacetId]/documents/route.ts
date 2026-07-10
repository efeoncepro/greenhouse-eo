import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { toHiringErrorResponse } from '@/lib/hiring'
import { canAccessHiringCandidateDocument, resolveCandidateDocuments } from '@/lib/hiring/documents'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1362 — `GET /api/hiring/candidate-facets/[candidateFacetId]/documents`.
 *
 * Camino programático del paquete documental completo de un candidato: archivos
 * (CV / portafolio), enlaces (portafolio / LinkedIn) e identidad ENMASCARADA.
 * La UI del desk y Nexa son dos clientes del mismo reader — la resolución vive en
 * `src/lib/hiring/documents/**`, nunca en un componente.
 *
 * El `value_full` de un documento de identidad NO sale por acá bajo ninguna
 * condición: exige el reveal auditado (capability + reason) de TASK-784.
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ candidateFacetId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!canAccessHiringCandidateDocument(tenant)) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.read' } })
  }

  try {
    const { candidateFacetId } = await params

    return NextResponse.json(await resolveCandidateDocuments({ candidateFacetId }))
  } catch (error) {
    return toHiringErrorResponse(error, 'GET /api/hiring/candidate-facets/[candidateFacetId]/documents')
  }
}

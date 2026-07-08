import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringNotFoundResponse, toHiringErrorResponse } from '@/lib/hiring'
import { getAssessmentById, listResponses } from '@/lib/hiring/assessment'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1360 — `GET /api/hiring/assessments/[id]` (detalle interno + respuestas, read).
 * NO expone el token hash (el view model no lo lleva). Las answer_key viven en las respuestas
 * solo para el reviewer interno; el payload candidate-facing es de TASK-1363.
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.read' } })
  }

  try {
    const { id } = await params
    const assessment = await getAssessmentById(id)

    if (!assessment) return hiringNotFoundResponse('La evaluación no existe.', 'assessment_not_found')
    const responses = await listResponses(id, tenant.userId)

    
return NextResponse.json({ assessment, responses })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_detail')
  }
}

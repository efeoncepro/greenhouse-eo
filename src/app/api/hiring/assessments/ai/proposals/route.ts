import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import { listAiProposals } from '@/lib/hiring/assessment/ai'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { AiProposalKind, AiProposalStatus } from '@/types/hiring-assessment-ai'

/**
 * TASK-1361 — `GET /api/hiring/assessments/ai/proposals` (read). Cola de revisión humana.
 * Filtros: `?kind=`, `?status=`, `?targetRef=`. NO gateado por el flag (un humano siempre puede
 * revisar/drenar la cola aunque el feature esté apagado).
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.read' } })
  }

  try {
    const sp = new URL(request.url).searchParams

    const items = await listAiProposals({
      kind: (sp.get('kind') as AiProposalKind) || undefined,
      status: (sp.get('status') as AiProposalStatus) || undefined,
      targetRef: sp.get('targetRef') || undefined,
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_ai_proposals_list')
  }
}

import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import { proposeOpeningPublicCopy } from '@/lib/hiring/vacancy-ai'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1385 — `POST /api/hiring/openings/[id]/ai/propose-public-copy` (capability
 * `hiring.opening.ai_assist`). PROPONE el copy público (`public_*`) del aviso desde inputs
 * allowlist-safe (la IA nunca ve presupuesto/rate/notas internas); nada se escribe al opening
 * sin el confirm humano (`/api/hiring/assessments/ai/proposals/[id]/confirm`, capability
 * `hiring.opening.write`). Flag-gated (`HIRING_VACANCY_AI_ENABLED`): con el feature OFF
 * devuelve 409 `vacancy_ai_disabled`. Body opcional: `{ templateId? }` (competencias del
 * template de assessment como input del aviso).
 */
export const dynamic = 'force-dynamic'

interface ProposeBody {
  templateId?: string
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.opening.ai_assist', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.ai_assist' } })
  }

  const { id } = await params

  let body: ProposeBody = {}

  try {
    const text = await request.text()

    if (text.trim().length > 0) body = JSON.parse(text) as ProposeBody
  } catch {
    return NextResponse.json(
      { error: 'El body debe ser JSON válido.', code: 'hiring_invalid_input', actionable: false },
      { status: 400 },
    )
  }

  try {
    const result = await proposeOpeningPublicCopy(
      { openingId: id, templateId: typeof body.templateId === 'string' && body.templateId.trim().length > 0 ? body.templateId : undefined },
      tenant.userId,
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'vacancy_ai_propose_public_copy')
  }
}

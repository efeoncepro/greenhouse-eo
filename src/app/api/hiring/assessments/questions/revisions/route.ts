import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { reviseUnpublishedQuestion, type ReviseQuestionInput } from '@/lib/hiring/assessment/question-revisions'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')
  if (!can(tenant, 'hiring.assessment.author', 'create', 'tenant')) return canonicalErrorResponse('forbidden')
  let body: ReviseQuestionInput

  try {
    body = await request.json() as ReviseQuestionInput
    if (!body?.sourceQuestionId || !body.expectedSourceDigest || !body.question || typeof body.reason !== 'string') return hiringInvalidBodyResponse()
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    return NextResponse.json(await reviseUnpublishedQuestion(body, tenant.userId))
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_question_revision')
  }
}

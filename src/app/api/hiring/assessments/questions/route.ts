import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, toHiringErrorResponse } from '@/lib/hiring'
import { createQuestion, listQuestions } from '@/lib/hiring/assessment'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { CreateQuestionInput, ListQuestionFilters, QuestionLevel, QuestionStatus, QuestionType } from '@/types/hiring-assessment'

/**
 * TASK-1360 — `GET/POST /api/hiring/assessments/questions`. GET (read): banco interno CON answer_key
 * (nunca candidate-facing; ese payload es de TASK-1363). POST (author): la pregunta nace `draft` (SME gate).
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
    const filters: ListQuestionFilters = {}
    const competencyKey = sp.get('competencyKey')

    if (competencyKey) filters.competencyKey = competencyKey
    const level = sp.get('level')

    if (level) filters.level = level as QuestionLevel
    const type = sp.get('type')

    if (type) filters.type = type as QuestionType
    const status = sp.get('status')

    if (status) filters.status = status as QuestionStatus
    const items = await listQuestions(filters)

    
return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_questions_list')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.assessment.author', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.assessment.author' } })
  }

  let body: CreateQuestionInput

  try {
    body = (await request.json()) as CreateQuestionInput
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const question = await createQuestion(body, tenant.userId)

    
return NextResponse.json(question, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_question_create')
  }
}

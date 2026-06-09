import { NextResponse } from 'next/server'

import {
  authorizeContracting,
  mapContractingError
} from '@/lib/workforce/contracting/api-helpers'
import { createWorkforceContractingCase } from '@/lib/workforce/contracting/commands'
import { listContractingCases } from '@/lib/workforce/contracting/readers'
import {
  WorkforceContractingValidationError,
  type WorkforceContractingCaseKind,
  type WorkforceContractingCaseStatus
} from '@/lib/workforce/contracting/types'

export const dynamic = 'force-dynamic'

const CASE_KINDS: WorkforceContractingCaseKind[] = ['offer_letter', 'employment_contract']

const asString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new WorkforceContractingValidationError('invalid_input', `Campo requerido inválido: ${field}.`, 422)
  }

  return value.trim()
}

export async function GET(request: Request) {
  const { errorResponse } = await authorizeContracting('workforce.contracting.read', 'read')

  if (errorResponse) return errorResponse

  try {
    const url = new URL(request.url)
    const caseKindParam = url.searchParams.get('caseKind')
    const statusParam = url.searchParams.get('status')

    const result = await listContractingCases({
      caseKind: caseKindParam && CASE_KINDS.includes(caseKindParam as WorkforceContractingCaseKind)
        ? (caseKindParam as WorkforceContractingCaseKind)
        : undefined,
      status: statusParam ? (statusParam as WorkforceContractingCaseStatus) : undefined,
      limit: Number(url.searchParams.get('limit') ?? 50),
      offset: Number(url.searchParams.get('offset') ?? 0)
    })

    return NextResponse.json(result)
  } catch (error) {
    return mapContractingError(error, 'list')
  }
}

export async function POST(request: Request) {
  const { userId, errorResponse } = await authorizeContracting('workforce.contracting.manage', 'create')

  if (errorResponse) return errorResponse

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const caseKind = asString(body.caseKind, 'caseKind') as WorkforceContractingCaseKind

    if (!CASE_KINDS.includes(caseKind)) {
      throw new WorkforceContractingValidationError('invalid_case_kind', 'caseKind inválido.', 422)
    }

    const result = await createWorkforceContractingCase({
      caseKind,
      subjectIdentityProfileId: asString(body.subjectIdentityProfileId, 'subjectIdentityProfileId'),
      operatingEntityOrganizationId: asString(body.operatingEntityOrganizationId, 'operatingEntityOrganizationId'),
      jurisdictionPackCode: asString(body.jurisdictionPackCode, 'jurisdictionPackCode'),
      createdByUserId: userId,
      authoritativeLanguage: body.authoritativeLanguage === 'en-US' ? 'en-US' : 'es-CL',
      signableFormat: body.signableFormat === 'docx' ? 'docx' : 'pdf',
      memberId: typeof body.memberId === 'string' ? body.memberId : null,
      workRelationshipOnboardingCaseId:
        typeof body.workRelationshipOnboardingCaseId === 'string' ? body.workRelationshipOnboardingCaseId : null,
      sourceOfferCaseId: typeof body.sourceOfferCaseId === 'string' ? body.sourceOfferCaseId : null,
      targetStartDate: typeof body.targetStartDate === 'string' ? body.targetStartDate : null,
      contractTypeSnapshot: typeof body.contractTypeSnapshot === 'string' ? body.contractTypeSnapshot : null,
      payRegimeSnapshot: typeof body.payRegimeSnapshot === 'string' ? body.payRegimeSnapshot : null,
      payrollViaSnapshot: typeof body.payrollViaSnapshot === 'string' ? body.payrollViaSnapshot : null,
      legalReviewReference: typeof body.legalReviewReference === 'string' ? body.legalReviewReference : null
    })

    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 })
  } catch (error) {
    return mapContractingError(error, 'create_case')
  }
}

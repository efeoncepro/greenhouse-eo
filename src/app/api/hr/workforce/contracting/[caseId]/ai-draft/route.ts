import { NextResponse } from 'next/server'

import { authorizeContracting, mapContractingError } from '@/lib/workforce/contracting/api-helpers'
import { runContractingAiDraft } from '@/lib/workforce/contracting/ai'
import { getCaseById } from '@/lib/workforce/contracting/store'
import { WorkforceContractingValidationError } from '@/lib/workforce/contracting/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { userId, errorResponse } = await authorizeContracting('workforce.contracting.ai_draft', 'create')

  if (errorResponse) return errorResponse

  try {
    const { caseId } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const contractingCase = await getCaseById(caseId)

    if (!contractingCase) {
      throw new WorkforceContractingValidationError('case_not_found', 'Caso no encontrado.', 404)
    }

    const result = await runContractingAiDraft({
      caseId,
      documentKind: contractingCase.caseKind,
      jurisdictionPackCode: contractingCase.jurisdictionPackCode,
      contractTuple: {
        contractType: contractingCase.contractTypeSnapshot ?? '',
        payRegime: contractingCase.payRegimeSnapshot ?? '',
        payrollVia: contractingCase.payrollViaSnapshot ?? ''
      },
      facts: typeof body.facts === 'object' && body.facts !== null ? (body.facts as Record<string, unknown>) : {},
      createdByUserId: userId,
      authoritativeLanguage: contractingCase.authoritativeLanguage
    })

    // AI is advisory-only: a disabled flag or provider failure is not a 5xx.
    return NextResponse.json(result, { status: result.enabled ? 200 : 409 })
  } catch (error) {
    return mapContractingError(error, 'ai_draft')
  }
}

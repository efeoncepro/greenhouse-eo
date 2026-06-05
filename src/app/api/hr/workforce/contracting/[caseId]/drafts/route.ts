import { NextResponse } from 'next/server'

import { authorizeContracting, mapContractingError } from '@/lib/workforce/contracting/api-helpers'
import { createWorkforceContractingDraft } from '@/lib/workforce/contracting/commands'
import { validateContractingReadiness } from '@/lib/workforce/contracting/jurisdiction-packs/validate'
import { getCaseById } from '@/lib/workforce/contracting/store'
import {
  WorkforceContractingValidationError,
  type WorkforceContractingStructuredContent,
  type WorkforceContractingValidationResult
} from '@/lib/workforce/contracting/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { userId, errorResponse } = await authorizeContracting('workforce.contracting.manage', 'create')

  if (errorResponse) return errorResponse

  try {
    const { caseId } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    if (typeof body.structuredContent !== 'object' || body.structuredContent === null) {
      throw new WorkforceContractingValidationError('invalid_input', 'structuredContent es requerido.', 422)
    }

    const structuredContent = body.structuredContent as WorkforceContractingStructuredContent

    // Optional: run the jurisdiction-pack validator + persist the snapshot when the
    // caller provides the captured fact codes.
    let validationSnapshot: WorkforceContractingValidationResult | undefined

    if (Array.isArray(body.providedFactCodes)) {
      const contractingCase = await getCaseById(caseId)

      if (contractingCase) {
        validationSnapshot = validateContractingReadiness({
          jurisdictionPackCode: contractingCase.jurisdictionPackCode,
          documentKind: contractingCase.caseKind,
          contractTuple: {
            contractType: contractingCase.contractTypeSnapshot ?? '',
            payRegime: contractingCase.payRegimeSnapshot ?? '',
            payrollVia: contractingCase.payrollViaSnapshot ?? ''
          },
          structuredContent,
          providedFactCodes: body.providedFactCodes.filter((c): c is string => typeof c === 'string'),
          legalReviewReference: contractingCase.legalReviewReference
        })
      }
    }

    const result = await createWorkforceContractingDraft({
      caseId,
      structuredContent,
      createdByUserId: userId,
      source: body.source === 'imported' ? 'imported' : 'manual',
      validationSnapshot
    })

    return NextResponse.json({ ...result, validationSnapshot: validationSnapshot ?? null }, { status: 201 })
  } catch (error) {
    return mapContractingError(error, 'create_draft')
  }
}

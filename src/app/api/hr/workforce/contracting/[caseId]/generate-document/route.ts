import { NextResponse } from 'next/server'

import { authorizeContracting, mapContractingError } from '@/lib/workforce/contracting/api-helpers'
import { generateContractingDocument } from '@/lib/workforce/contracting/commands'

export const dynamic = 'force-dynamic'

// TASK-1023 — generate the signable PDF (offer O1 / contract C2) for an approved case.
export async function POST(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { userId, errorResponse } = await authorizeContracting('workforce.contracting.generate_document', 'create')

  if (errorResponse) return errorResponse

  try {
    const { caseId } = await params
    const result = await generateContractingDocument({ caseId, actorUserId: userId })

    return NextResponse.json(result)
  } catch (error) {
    return mapContractingError(error, 'generate_document')
  }
}

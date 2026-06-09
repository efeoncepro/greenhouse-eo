import { NextResponse } from 'next/server'

import { authorizeContracting, mapContractingError } from '@/lib/workforce/contracting/api-helpers'
import { sendContractingCaseToSignature } from '@/lib/workforce/contracting/signature'

export const dynamic = 'force-dynamic'

// TASK-1024 — send an approved+rendered contracting case to electronic signature (ZapSign via
// EPIC-001). Operator-initiated; the worker is the only e-signer (employer signature pre-stamped).
export async function POST(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { userId, errorResponse } = await authorizeContracting('workforce.contracting.send_signature', 'create')

  if (errorResponse) return errorResponse

  try {
    const { caseId } = await params
    const result = await sendContractingCaseToSignature({ caseId, actorUserId: userId })

    return NextResponse.json(result)
  } catch (error) {
    return mapContractingError(error, 'send_to_signature')
  }
}

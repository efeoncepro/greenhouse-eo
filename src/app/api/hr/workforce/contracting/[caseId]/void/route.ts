import { NextResponse } from 'next/server'

import { authorizeContracting, mapContractingError } from '@/lib/workforce/contracting/api-helpers'
import { voidWorkforceContractingCase } from '@/lib/workforce/contracting/commands'
import { WorkforceContractingValidationError } from '@/lib/workforce/contracting/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { userId, errorResponse } = await authorizeContracting('workforce.contracting.manage', 'update')

  if (errorResponse) return errorResponse

  try {
    const { caseId } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    if (typeof body.reason !== 'string' || body.reason.trim().length < 5) {
      throw new WorkforceContractingValidationError('invalid_input', 'reason (>= 5 caracteres) es requerido.', 422)
    }

    const result = await voidWorkforceContractingCase({ caseId, reason: body.reason, actorUserId: userId })

    return NextResponse.json(result)
  } catch (error) {
    return mapContractingError(error, 'void')
  }
}

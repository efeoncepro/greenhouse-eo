import { NextResponse } from 'next/server'

import { authorizeContracting, mapContractingError } from '@/lib/workforce/contracting/api-helpers'
import { approveWorkforceContractingDraft } from '@/lib/workforce/contracting/commands'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { userId, errorResponse } = await authorizeContracting('workforce.contracting.approve', 'approve')

  if (errorResponse) return errorResponse

  try {
    const { draftId } = await params
    const result = await approveWorkforceContractingDraft({ draftId, approvedByUserId: userId })

    return NextResponse.json(result)
  } catch (error) {
    return mapContractingError(error, 'approve')
  }
}

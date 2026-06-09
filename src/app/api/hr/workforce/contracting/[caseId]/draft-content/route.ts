import { NextResponse } from 'next/server'

import { authorizeContracting, mapContractingError } from '@/lib/workforce/contracting/api-helpers'
import { getLatestContractingDraftContent } from '@/lib/workforce/contracting/readers'

export const dynamic = 'force-dynamic'

// TASK-1021 Slice 3 — latest bilingual draft body for the Bilingual Review Desk.
export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { errorResponse } = await authorizeContracting('workforce.contracting.read', 'read')

  if (errorResponse) return errorResponse

  try {
    const { caseId } = await params
    const content = await getLatestContractingDraftContent(caseId)

    return NextResponse.json({ content })
  } catch (error) {
    return mapContractingError(error, 'draft_content')
  }
}

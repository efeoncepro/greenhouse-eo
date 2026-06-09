import { NextResponse } from 'next/server'

import { authorizeContracting, mapContractingError } from '@/lib/workforce/contracting/api-helpers'
import { getContractingCaseDetail } from '@/lib/workforce/contracting/readers'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { errorResponse } = await authorizeContracting('workforce.contracting.read', 'read')

  if (errorResponse) return errorResponse

  try {
    const { caseId } = await params
    const detail = await getContractingCaseDetail(caseId)

    if (!detail) {
      return NextResponse.json({ error: 'Caso no encontrado.', code: 'case_not_found', actionable: false }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    return mapContractingError(error, 'detail')
  }
}

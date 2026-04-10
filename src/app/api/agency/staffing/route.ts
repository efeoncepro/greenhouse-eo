import { NextResponse } from 'next/server'

import { getSpaceSkillCoverage, StaffingValidationError } from '@/lib/agency/skills-staffing'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const toErrorResponse = (error: unknown, fallback: string) => {
  if (error instanceof StaffingValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  console.error(fallback, error)

  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get('spaceId')
    const serviceId = searchParams.get('serviceId') || undefined

    if (!spaceId) {
      return NextResponse.json({ error: 'spaceId es requerido.' }, { status: 400 })
    }

    return NextResponse.json(await getSpaceSkillCoverage({ spaceId, serviceId }))
  } catch (error) {
    return toErrorResponse(error, 'Unable to load staffing recommendations.')
  }
}

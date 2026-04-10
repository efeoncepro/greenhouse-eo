import { NextResponse } from 'next/server'

import { listSkillCatalog, StaffingValidationError } from '@/lib/agency/skills-staffing'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

import type { SkillCategory } from '@/types/agency-skills'

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
    const category = (searchParams.get('category') || undefined) as SkillCategory | undefined
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const items = await listSkillCatalog({ category, activeOnly })

    return NextResponse.json({ items })
  } catch (error) {
    return toErrorResponse(error, 'Unable to load skill catalog.')
  }
}

import { NextResponse } from 'next/server'

import {
  getServiceSkillRequirementsForSpaceService,
  replaceServiceSkillRequirementsForSpaceService,
  StaffingValidationError
} from '@/lib/agency/skills-staffing'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

import type { UpsertServiceSkillRequirementInput } from '@/types/agency-skills'

export const dynamic = 'force-dynamic'

const toErrorResponse = (error: unknown, fallback: string) => {
  if (error instanceof StaffingValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  console.error(fallback, error)

  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function GET(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { serviceId } = await context.params
    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get('spaceId')

    if (!spaceId) {
      return NextResponse.json({ error: 'spaceId es requerido.' }, { status: 400 })
    }

    return NextResponse.json(await getServiceSkillRequirementsForSpaceService({ spaceId, serviceId }))
  } catch (error) {
    return toErrorResponse(error, 'Unable to load service skill requirements.')
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { serviceId } = await context.params

    const body = (await request.json().catch(() => null)) as {
      spaceId?: string
      requirements?: UpsertServiceSkillRequirementInput[]
    } | null

    if (!body?.spaceId) {
      return NextResponse.json({ error: 'spaceId es requerido.' }, { status: 400 })
    }

    if (!Array.isArray(body.requirements)) {
      return NextResponse.json({ error: 'requirements debe ser un arreglo.' }, { status: 400 })
    }

    return NextResponse.json(
      await replaceServiceSkillRequirementsForSpaceService({
        spaceId: body.spaceId,
        serviceId,
        requirements: body.requirements,
        actorUserId: tenant.userId
      })
    )
  } catch (error) {
    return toErrorResponse(error, 'Unable to update service skill requirements.')
  }
}

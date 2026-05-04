import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { reorderOnboardingTemplateItems } from '@/lib/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ templateId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_template', action: 'update', scope: 'tenant' })

    const { templateId } = await context.params
    const body = (await request.json().catch(() => null)) as { itemIds?: string[] } | null

    if (!Array.isArray(body?.itemIds)) {
      return NextResponse.json({ error: 'Invalid reorder payload.' }, { status: 400 })
    }

    const template = await reorderOnboardingTemplateItems({ templateId, itemIds: body.itemIds })

    return NextResponse.json({ template })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to reorder onboarding template items.')
  }
}

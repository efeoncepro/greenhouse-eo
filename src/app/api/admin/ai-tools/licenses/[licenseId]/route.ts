import { NextResponse } from 'next/server'

import { getAiToolLicense, updateLicense } from '@/lib/ai-tools/service'
import { toAiToolingErrorResponse } from '@/lib/ai-tools/shared'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { UpdateLicenseInput } from '@/types/ai-tools'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ licenseId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { licenseId } = await context.params
    const license = await getAiToolLicense(licenseId)

    if (!license) {
      return NextResponse.json({ error: 'AI tool license not found.' }, { status: 404 })
    }

    return NextResponse.json(license)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI tool license detail.')
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ licenseId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { licenseId } = await context.params
    const body = (await request.json().catch(() => null)) as UpdateLicenseInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await updateLicense(licenseId, body)

    return NextResponse.json(updated)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to update AI tool license.')
  }
}

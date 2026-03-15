import { NextResponse } from 'next/server'

import { createLicense, listAiToolLicenses } from '@/lib/ai-tools/service'
import { toAiToolingErrorResponse } from '@/lib/ai-tools/shared'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { CreateLicenseInput } from '@/types/ai-tools'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const status = searchParams.get('status')
    const data = await listAiToolLicenses({ memberId, status })

    return NextResponse.json(data)
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to load AI tool licenses.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as CreateLicenseInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const created = await createLicense(body, tenant.userId)

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toAiToolingErrorResponse(error, 'Unable to create AI tool license.')
  }
}

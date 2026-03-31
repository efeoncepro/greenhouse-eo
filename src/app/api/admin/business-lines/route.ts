import { NextResponse } from 'next/server'

import { loadBusinessLineMetadata } from '@/lib/business-line/metadata'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metadata = await loadBusinessLineMetadata()

  return NextResponse.json({ businessLines: metadata })
}

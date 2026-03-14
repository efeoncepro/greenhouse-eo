import { NextResponse } from 'next/server'

import { getAdminTeamMetadata, toTeamAdminErrorResponse } from '@/lib/team-admin/mutate-team'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const metadata = await getAdminTeamMetadata()

    return NextResponse.json(metadata)
  } catch (error) {
    return toTeamAdminErrorResponse(error, 'Unable to load admin team metadata.')
  }
}

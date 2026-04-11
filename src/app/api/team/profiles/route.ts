import { NextResponse } from 'next/server'

import { requireClientTenantContext } from '@/lib/tenant/authorization'
import { getClientSafeTeamProfiles, ClientSafeProfileError } from '@/lib/team/client-safe-profile'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profiles = await getClientSafeTeamProfiles(tenant.clientId)

    return NextResponse.json({ profiles })
  } catch (error) {
    if (error instanceof ClientSafeProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('GET /api/team/profiles failed:', error)

    return NextResponse.json({ error: 'Error interno al obtener perfiles del equipo.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

import { requireClientTenantContext } from '@/lib/tenant/authorization'
import { getClientSafeProfile, ClientSafeProfileError } from '@/lib/team/client-safe-profile'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { memberId } = await params

  if (!memberId || typeof memberId !== 'string') {
    return NextResponse.json({ error: 'memberId es requerido.' }, { status: 400 })
  }

  try {
    const profile = await getClientSafeProfile(memberId, tenant.clientId)

    return NextResponse.json({ profile })
  } catch (error) {
    if (error instanceof ClientSafeProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('GET /api/team/members/[memberId]/profile failed:', error)

    return NextResponse.json({ error: 'Error interno al obtener perfil del miembro.' }, { status: 500 })
  }
}

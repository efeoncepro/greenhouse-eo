import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { ROLE_CODES } from '@/config/role-codes'
import {
  ClientPortalInviteError,
  inviteClientPortalUser
} from '@/lib/client-onboarding/invite-client-portal-user'

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.roleCodes?.includes(ROLE_CODES.EFEONCE_ADMIN)) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    const { email, full_name, client_id, role_codes, tenant_type } = await request.json()

    if (!email || !full_name || !client_id) {
      return NextResponse.json({ error: 'Campos requeridos: email, full_name, client_id.' }, { status: 400 })
    }

    // Role policy (admin/invite-specific — vive en el caller, no en el helper SSOT).
    let roles: string[] = role_codes || []

    if (tenant_type === 'efeonce_internal' && !roles.includes(ROLE_CODES.COLLABORATOR)) {
      roles = [ROLE_CODES.COLLABORATOR, ...roles]
    } else if (tenant_type === 'client' && roles.length === 0) {
      roles = [ROLE_CODES.CLIENT_EXECUTIVE]
    }

    // Policy: efeonce_admin always requires collaborator (personal experience)
    if (roles.includes(ROLE_CODES.EFEONCE_ADMIN) && !roles.includes(ROLE_CODES.COLLABORATOR)) {
      roles = [ROLE_CODES.COLLABORATOR, ...roles]
    }

    const result = await inviteClientPortalUser({
      email,
      fullName: full_name,
      clientId: client_id,
      roleCodes: roles,
      actorUserId: session.user?.id || null,
      actorName: session.user.name,
      actorEmail: session.user.email,
      onExisting: 'error'
    })

    return NextResponse.json({
      success: true,
      userId: result.userId,
      message: `Invitación enviada a ${result.email}`
    })
  } catch (err) {
    if (err instanceof ClientPortalInviteError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
    }

    console.error('[admin/invite] Error:', err)

    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

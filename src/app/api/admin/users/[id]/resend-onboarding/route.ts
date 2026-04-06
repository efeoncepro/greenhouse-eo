import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { generateToken, storeToken } from '@/lib/auth-tokens'
import { sendEmail } from '@/lib/email/delivery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

type ClientUserRow = {
  user_id: string
  email: string
  full_name: string
  client_id: string
  status: string
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: userId } = await params

  try {
    // Look up user
    const rows = await runGreenhousePostgresQuery<ClientUserRow>(
      `SELECT user_id, email, full_name, client_id, status
       FROM greenhouse_core.client_users
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    const user = rows[0]

    // Only users with status 'invited' are eligible for resend
    if (user.status !== 'invited') {
      return NextResponse.json(
        {
          error: 'Este usuario no es elegible para reenvio de onboarding.',
          reason: `Estado actual: ${user.status}. Solo usuarios con estado "invited" pueden recibir reenvio.`
        },
        { status: 400 }
      )
    }

    // Generate a new 72h invite token
    const token = generateToken(
      {
        user_id: user.user_id,
        email: user.email,
        client_id: user.client_id,
        type: 'invite'
      },
      72
    )

    await storeToken(token, {
      user_id: user.user_id,
      email: user.email,
      client_id: user.client_id,
      type: 'invite'
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/auth/accept-invite?token=${token}`

    // Get inviter name from session
    const session = await getServerSession(authOptions)
    const inviterName = session?.user?.name || 'Un administrador'
    const actorEmail = session?.user?.email || undefined

    // Send email — delivery is async/best-effort
    try {
      const delivery = await sendEmail({
        emailType: 'invitation',
        domain: 'identity',
        recipients: [{ email: user.email, userId: user.user_id }],
        context: {
          inviteUrl,
          inviterName
        },
        sourceEntity: 'client_users',
        actorEmail
      })

      if (delivery.status === 'failed') {
        console.error('[admin/users/resend-onboarding] Email delivery failed:', delivery.error)
      }
    } catch (emailError) {
      console.error('[admin/users/resend-onboarding] Email send error:', emailError)
    }

    // Publish outbox event — best-effort
    try {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.userLifecycle,
        aggregateId: userId,
        eventType: EVENT_TYPES.invitationResent,
        payload: {
          userId,
          email: user.email,
          resentByUserId: tenant.userId
        }
      })
    } catch (outboxError) {
      console.error('[admin/users/resend-onboarding] Outbox publish error:', outboxError)
    }

    return NextResponse.json({ sent: true, email: user.email })
  } catch (err) {
    console.error('[admin/users/resend-onboarding] Error:', err)

    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

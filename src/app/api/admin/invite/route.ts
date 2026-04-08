import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { ROLE_CODES } from '@/config/role-codes'
import { generateToken, storeToken } from '@/lib/auth-tokens'
import { sendEmail } from '@/lib/email/delivery'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

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

    const normalizedEmail = email.trim().toLowerCase()

    // Check if email is already registered
    const existing = await runGreenhousePostgresQuery<{ user_id: string }>(
      `SELECT user_id FROM greenhouse_core.client_users WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail]
    )

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Este email ya está registrado.' }, { status: 409 })
    }

    // Resolve roles
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

    // Create user + role assignments in a transaction
    const userId = await withGreenhousePostgresTransaction(async (client) => {
      const userResult = await client.query<{ user_id: string }>(
        `INSERT INTO greenhouse_core.client_users (email, full_name, client_id, status, auth_mode, created_at)
         VALUES ($1, $2, $3, 'invited', 'credentials', now())
         RETURNING user_id`,
        [normalizedEmail, full_name, client_id]
      )

      const newUserId = userResult.rows[0].user_id

      const inviterUserId = session.user?.id || null

      for (const roleCode of roles) {
        await client.query(
          `INSERT INTO greenhouse_core.user_role_assignments (user_id, role_code, assigned_by_user_id)
           SELECT $1, role_code, $3 FROM greenhouse_core.roles WHERE role_code = $2
           ON CONFLICT DO NOTHING`,
          [newUserId, roleCode, inviterUserId]
        )
      }

      return newUserId
    })

    // Generate invite token (72h)
    const token = generateToken({
      user_id: userId,
      email: normalizedEmail,
      client_id,
      type: 'invite'
    }, 72)

    await storeToken(token, { user_id: userId, email: normalizedEmail, client_id, type: 'invite' })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/auth/accept-invite?token=${token}`
    const inviterName = session.user.name || 'Un administrador'

    // clientName, userName, locale → resolved automatically by context resolver
    const delivery = await sendEmail({
      emailType: 'invitation',
      domain: 'identity',
      recipients: [{
        email: normalizedEmail,
        userId
      }],
      context: {
        inviteUrl,
        inviterName
      },
      sourceEntity: 'client_users',
      actorEmail: session.user.email || undefined
    })

    if (delivery.status === 'failed') {
      console.error('[admin/invite] Email delivery failed:', delivery.error)
    }

    return NextResponse.json({ success: true, userId, message: `Invitación enviada a ${normalizedEmail}` })
  } catch (err) {
    console.error('[admin/invite] Error:', err)

    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

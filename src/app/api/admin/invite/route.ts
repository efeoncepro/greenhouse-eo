import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { generateToken, storeToken } from '@/lib/auth-tokens'
import { logEmail } from '@/lib/email-log'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { resend, EMAIL_FROM } from '@/lib/resend'

import InvitationEmail from '@/emails/InvitationEmail'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.roleCodes?.includes('efeonce_admin')) {
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

    if (tenant_type === 'efeonce_internal' && !roles.includes('collaborator')) {
      roles = ['collaborator', ...roles]
    } else if (tenant_type === 'client' && roles.length === 0) {
      roles = ['client_executive']
    }

    // Create user + role assignments in a transaction
    const userId = await withGreenhousePostgresTransaction(async (client) => {
      const userResult = await client.query<{ user_id: string }>(
        `INSERT INTO greenhouse_core.client_users (email, full_name, client_id, status, auth_mode, created_at)
         VALUES ($1, $2, $3, 'pending', 'credentials', now())
         RETURNING user_id`,
        [normalizedEmail, full_name, client_id]
      )

      const newUserId = userResult.rows[0].user_id

      for (const roleCode of roles) {
        await client.query(
          `INSERT INTO greenhouse_core.user_role_assignments (user_id, role_code)
           SELECT $1, role_code FROM greenhouse_core.roles WHERE role_code = $2
           ON CONFLICT DO NOTHING`,
          [newUserId, roleCode]
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

    // Get client name
    const clients = await runGreenhousePostgresQuery<{ display_name: string }>(
      `SELECT display_name FROM greenhouse_core.clients WHERE client_id = $1 LIMIT 1`,
      [client_id]
    )

    const clientName = clients[0]?.display_name || 'Greenhouse'

    try {
      const result = await resend.emails.send({
        from: EMAIL_FROM,
        to: normalizedEmail,
        subject: 'Te invitaron a Greenhouse — Efeonce',
        react: InvitationEmail({ inviteUrl, inviterName, clientName, userName: full_name })
      })

      await logEmail({
        email_to: normalizedEmail,
        email_type: 'invitation',
        user_id: userId,
        client_id,
        status: 'sent',
        resend_id: result.data?.id
      })
    } catch (err) {
      console.error('[admin/invite] Resend error:', err)

      await logEmail({
        email_to: normalizedEmail,
        email_type: 'invitation',
        user_id: userId,
        client_id,
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    }

    return NextResponse.json({ success: true, userId, message: `Invitación enviada a ${normalizedEmail}` })
  } catch (err) {
    console.error('[admin/invite] Error:', err)

    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

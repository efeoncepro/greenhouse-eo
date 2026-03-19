import { NextResponse } from 'next/server'

import { checkRateLimit, generateToken, storeToken } from '@/lib/auth-tokens'
import { logEmail } from '@/lib/email-log'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resend, EMAIL_FROM } from '@/lib/resend'

import PasswordResetEmail from '@/emails/PasswordResetEmail'

const GENERIC_MESSAGE = 'Si tu email está registrado, recibirás un enlace para restablecer tu contraseña.'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Email inválido.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Rate limit: max 3 per hour per email
    const withinLimit = await checkRateLimit(normalizedEmail, 'reset', 3)

    if (!withinLimit) {
      return NextResponse.json(
        { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo en una hora.' },
        { status: 429 }
      )
    }

    // Lookup user in PostgreSQL
    const users = await runGreenhousePostgresQuery<{
      user_id: string
      email: string
      full_name: string | null
      client_id: string | null
    }>(
      `SELECT user_id, email, full_name, client_id
       FROM greenhouse_core.client_users
       WHERE LOWER(email) = $1 AND status = 'active'
       LIMIT 1`,
      [normalizedEmail]
    )

    const user = users[0]

    if (user) {
      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        client_id: user.client_id ?? undefined,
        type: 'reset'
      }, 1)

      await storeToken(token, {
        user_id: user.user_id,
        email: user.email,
        client_id: user.client_id ?? undefined,
        type: 'reset'
      })

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'}/auth/reset-password?token=${token}`

      try {
        const result = await resend.emails.send({
          from: EMAIL_FROM,
          to: user.email,
          subject: 'Restablece tu contraseña — Greenhouse',
          react: PasswordResetEmail({ resetUrl, userName: user.full_name ?? undefined })
        })

        await logEmail({
          email_to: user.email,
          email_type: 'password_reset',
          user_id: user.user_id,
          client_id: user.client_id ?? undefined,
          status: 'sent',
          resend_id: result.data?.id
        })
      } catch (err) {
        console.error('[forgot-password] Resend error:', err)

        await logEmail({
          email_to: user.email,
          email_type: 'password_reset',
          user_id: user.user_id,
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Always return same response (anti-enumeration)
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
  } catch (err) {
    console.error('[forgot-password] Unexpected error:', err)

    return NextResponse.json({ success: false, message: 'Error interno.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

import { checkRateLimit, generateToken, storeToken } from '@/lib/auth-tokens'
import { logEmail } from '@/lib/email-log'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resend, EMAIL_FROM } from '@/lib/resend'

import PasswordResetEmail from '@/emails/PasswordResetEmail'

const GENERIC_MESSAGE = 'Si tu email está registrado, recibirás un enlace para restablecer tu contraseña.'

// Domain aliases — emails on these domains are interchangeable for lookup.
// The first domain in each group is the primary (deliverable) domain.
const DOMAIN_ALIAS_GROUPS: string[][] = [
  ['efeoncepro.com', 'efeonce.org'],
]

/** Given an email, return all alias variants to search for */
function expandEmailAliases(email: string): string[] {
  const [local, domain] = email.split('@')
  const aliases = [email]

  for (const group of DOMAIN_ALIAS_GROUPS) {
    if (group.includes(domain)) {
      for (const d of group) {
        const variant = `${local}@${d}`

        if (variant !== email) aliases.push(variant)
      }
    }
  }

  return aliases
}


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

    // Lookup user in PostgreSQL — expand aliases to match across domains
    const emailVariants = expandEmailAliases(normalizedEmail)
    const placeholders = emailVariants.map((_, i) => `$${i + 1}`).join(', ')

    const users = await runGreenhousePostgresQuery<{
      user_id: string
      email: string
      full_name: string | null
      client_id: string | null
    }>(
      `SELECT user_id, email, full_name, client_id
       FROM greenhouse_core.client_users
       WHERE LOWER(email) IN (${placeholders}) AND status = 'active'
       LIMIT 1`,
      emailVariants
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

      // Send to the email the user typed — they know where they receive mail.
      // This also handles cases where the stored email domain lacks MX records.
      const sendTo = normalizedEmail

      try {
        const result = await resend.emails.send({
          from: EMAIL_FROM,
          to: sendTo,
          subject: 'Restablece tu contraseña — Greenhouse',
          react: PasswordResetEmail({ resetUrl, userName: user.full_name ?? undefined })
        })

        await logEmail({
          email_to: sendTo,
          email_type: 'password_reset',
          user_id: user.user_id,
          client_id: user.client_id ?? undefined,
          status: 'sent',
          resend_id: result.data?.id
        })
      } catch (err) {
        console.error('[forgot-password] Resend error:', err)

        await logEmail({
          email_to: sendTo,
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

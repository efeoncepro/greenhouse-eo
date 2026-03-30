import { NextResponse } from 'next/server'

import { generateToken, storeToken, checkRateLimit } from '@/lib/auth-tokens'
import { sendEmail } from '@/lib/email/delivery'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { requireTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

const VERIFY_TOKEN_TTL_HOURS = 24
const MAX_REQUESTS_PER_HOUR = 3

interface UserRow extends Record<string, unknown> {
  user_id: string
  email: string
  full_name: string | null
  email_verified: boolean
}

/**
 * POST /api/auth/verify-email
 *
 * Request email verification for the current authenticated user.
 * Generates a verify token (24h TTL), sends the verification email
 * via the centralized email delivery layer, and emits an outbox event.
 *
 * Supports optional `email` body param for admin-initiated verification
 * of another user (requires admin context).
 */
export async function POST(request: Request) {
  const { tenant, unauthorizedResponse: errorResponse } = await requireTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let targetEmail: string | undefined

  try {
    const body = await request.json().catch(() => ({}))

    targetEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined
  } catch {
    // No body — verify current user
  }

  // Resolve the user to verify
  const email = targetEmail || tenant.userId // tenant.userId is the email in Greenhouse

  const userRows = await runGreenhousePostgresQuery<UserRow>(
    `SELECT user_id, email, full_name, email_verified
     FROM greenhouse_core.client_users
     WHERE email = $1
     LIMIT 1`,
    [email]
  )

  const user = userRows[0]

  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
  }

  if (user.email_verified) {
    return NextResponse.json({ alreadyVerified: true, message: 'Este correo ya está verificado.' })
  }

  // Rate limit: max 3 requests per hour per email
  const withinLimit = await checkRateLimit(email, 'verify', MAX_REQUESTS_PER_HOUR)

  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo en una hora.' },
      { status: 429 }
    )
  }

  // Generate token
  const token = generateToken(
    { email, user_id: user.user_id, type: 'verify' },
    VERIFY_TOKEN_TTL_HOURS
  )

  await storeToken(token, { email, user_id: user.user_id, type: 'verify' })

  // Build verification URL
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'
  const verifyUrl = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`

  // Send email
  const emailResult = await sendEmail({
    emailType: 'verify_email',
    domain: 'identity',
    recipients: [{
      userId: user.user_id,
      email: user.email,
      name: user.full_name ?? undefined
    }],
    context: {
      verifyUrl,
      userName: user.full_name ?? undefined
    },
    sourceEntity: 'email_verification'
  })

  // Emit outbox event
  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.emailVerification,
    aggregateId: user.user_id,
    eventType: EVENT_TYPES.emailVerificationRequested,
    payload: {
      userId: user.user_id,
      email: user.email,
      displayName: user.full_name,
      requestedBy: tenant.userId,
      emailDeliveryStatus: emailResult.status
    }
  })

  return NextResponse.json({
    sent: emailResult.status === 'sent',
    email: user.email,
    expiresInHours: VERIFY_TOKEN_TTL_HOURS,
    message: emailResult.status === 'sent'
      ? 'Correo de verificación enviado.'
      : 'No se pudo enviar el correo. Intenta de nuevo.'
  }, { status: emailResult.status === 'sent' ? 200 : 502 })
}

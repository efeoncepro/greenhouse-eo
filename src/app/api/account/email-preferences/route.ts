import { NextResponse } from 'next/server'

import { validateToken } from '@/lib/auth-tokens'
import { addSubscriber, removeSubscriber } from '@/lib/email/subscriptions'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, emailType, token } = body

    if (!action || !emailType) {
      return NextResponse.json({ error: 'action and emailType are required.' }, { status: 400 })
    }

    if (!['unsubscribe', 'resubscribe'].includes(action)) {
      return NextResponse.json({ error: 'action must be unsubscribe or resubscribe.' }, { status: 400 })
    }

    let recipientEmail: string | null = null

    // Auth mode 1: Token-based (from unsubscribe link in emails — no login required)
    if (token) {
      const record = await validateToken(token)

      if (!record || record.token_type !== 'unsubscribe') {
        return NextResponse.json({ error: 'Invalid or expired unsubscribe token.' }, { status: 400 })
      }

      recipientEmail = record.email
    } else {
      // Auth mode 2: Session-based (logged-in user toggling preferences)
      const { tenant, unauthorizedResponse } = await requireTenantContext()

      if (!tenant) return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      // Look up user email from userId
      const users = await runGreenhousePostgresQuery<{ email: string } & Record<string, unknown>>(
        `SELECT email FROM greenhouse_core.client_users WHERE user_id = $1 LIMIT 1`,
        [tenant.userId]
      )

      recipientEmail = users[0]?.email || null
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Could not resolve recipient email.' }, { status: 400 })
    }

    if (action === 'unsubscribe') {
      await removeSubscriber({ emailType, recipientEmail })
    } else {
      await addSubscriber({ emailType, recipientEmail })
    }

    return NextResponse.json({
      success: true,
      action,
      emailType,
      message:
        action === 'unsubscribe' ? 'You have been unsubscribed.' : 'You have been resubscribed.'
    })
  } catch (error) {
    console.error('[email-preferences] Error:', error)

    return NextResponse.json({ error: 'Internal error.' }, { status: 500 })
  }
}

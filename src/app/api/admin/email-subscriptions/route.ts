import { NextResponse } from 'next/server'

import { ensureEmailSchema } from '@/lib/email/schema'
import { addSubscriber } from '@/lib/email/subscriptions'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface SubscriptionRow extends Record<string, unknown> {
  subscription_id: string
  email_type: string
  recipient_email: string
  recipient_name: string | null
  active: boolean
  created_at: string
}

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureEmailSchema()

  const rows = await runGreenhousePostgresQuery<SubscriptionRow>(
    `
      SELECT subscription_id, email_type, recipient_email, recipient_name, active, created_at::text
      FROM greenhouse_notifications.email_subscriptions
      WHERE active = TRUE
      ORDER BY email_type, created_at
    `,
    []
  )

  return NextResponse.json({
    data: rows.map(row => ({
      subscriptionId: row.subscription_id,
      emailType: row.email_type,
      recipientEmail: row.recipient_email,
      recipientName: row.recipient_name,
      active: row.active,
      createdAt: row.created_at
    }))
  })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const emailType = typeof body.emailType === 'string' ? body.emailType.trim() : ''
  const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim().toLowerCase() : ''
  const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim() : undefined

  if (!emailType) {
    return NextResponse.json({ error: 'emailType is required.' }, { status: 400 })
  }

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return NextResponse.json({ error: 'recipientEmail must be a valid email address.' }, { status: 400 })
  }

  await addSubscriber({ emailType, recipientEmail, recipientName })

  return NextResponse.json({ created: true, emailType, recipientEmail }, { status: 201 })
}

export async function DELETE(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const subscriptionId = typeof body.subscriptionId === 'string' ? body.subscriptionId.trim() : ''

  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId is required.' }, { status: 400 })
  }

  await ensureEmailSchema()

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_notifications.email_subscriptions SET active = FALSE, updated_at = NOW() WHERE subscription_id = $1`,
    [subscriptionId]
  )

  return NextResponse.json({ deleted: true, subscriptionId })
}

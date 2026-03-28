import { NextResponse } from 'next/server'

import { ensureEmailSchema } from '@/lib/email/schema'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface EmailDeliveryRow extends Record<string, unknown> {
  delivery_id: string
  batch_id: string
  email_type: string
  domain: string
  recipient_email: string
  recipient_name: string | null
  recipient_user_id: string | null
  subject: string
  resend_id: string | null
  status: string
  has_attachments: boolean
  source_event_id: string | null
  source_entity: string | null
  actor_email: string | null
  error_message: string | null
  attempt_number: number
  created_at: string
  updated_at: string
  total_count: string
}

interface KpiRow extends Record<string, unknown> {
  sent_today: string
  failed_today: string
  pending_retry: string
  sent_7d: string
  processed_7d: string
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureEmailSchema()

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '25')))
  const emailType = searchParams.get('emailType') || ''
  const domain = searchParams.get('domain') || ''
  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''

  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (emailType) {
    conditions.push(`email_type = $${paramIndex++}`)
    params.push(emailType)
  }

  if (domain) {
    conditions.push(`domain = $${paramIndex++}`)
    params.push(domain)
  }

  if (status) {
    conditions.push(`status = $${paramIndex++}`)
    params.push(status)
  }

  if (search) {
    conditions.push(`(recipient_email ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`)
    params.push(`%${search}%`)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * pageSize

  params.push(pageSize, offset)

  const [rows, kpiRows] = await Promise.all([
    runGreenhousePostgresQuery<EmailDeliveryRow>(
      `
        SELECT
          delivery_id, batch_id, email_type, domain,
          recipient_email, recipient_name, recipient_user_id,
          subject, resend_id, status, has_attachments,
          source_event_id, source_entity, actor_email,
          error_message, attempt_number,
          created_at::text, updated_at::text,
          COUNT(*) OVER() AS total_count
        FROM greenhouse_notifications.email_deliveries
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `,
      params
    ),
    runGreenhousePostgresQuery<KpiRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'sent' AND created_at > NOW() - INTERVAL '24 hours') AS sent_today,
          COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') AS failed_today,
          COUNT(*) FILTER (WHERE status = 'failed' AND attempt_number < 3 AND created_at > NOW() - INTERVAL '1 hour') AS pending_retry,
          COUNT(*) FILTER (WHERE status = 'sent' AND created_at > NOW() - INTERVAL '7 days') AS sent_7d,
          COUNT(*) FILTER (WHERE status IN ('sent', 'failed') AND created_at > NOW() - INTERVAL '7 days') AS processed_7d
        FROM greenhouse_notifications.email_deliveries
      `,
      []
    )
  ])

  const total = Number(rows[0]?.total_count ?? 0)
  const kpi = kpiRows[0]
  const sent7d = Number(kpi?.sent_7d ?? 0)
  const processed7d = Number(kpi?.processed_7d ?? 0)

  return NextResponse.json({
    data: rows.map(row => ({
      deliveryId: row.delivery_id,
      batchId: row.batch_id,
      emailType: row.email_type,
      domain: row.domain,
      recipientEmail: row.recipient_email,
      recipientName: row.recipient_name,
      recipientUserId: row.recipient_user_id,
      subject: row.subject,
      resendId: row.resend_id,
      status: row.status,
      hasAttachments: row.has_attachments,
      sourceEventId: row.source_event_id,
      sourceEntity: row.source_entity,
      actorEmail: row.actor_email,
      errorMessage: row.error_message,
      attemptNumber: row.attempt_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    total,
    page,
    pageSize,
    kpis: {
      sentToday: Number(kpi?.sent_today ?? 0),
      failedToday: Number(kpi?.failed_today ?? 0),
      pendingRetry: Number(kpi?.pending_retry ?? 0),
      deliveryRate: processed7d > 0 ? Math.round((sent7d / processed7d) * 100) : 100
    }
  })
}

import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RETENTION_DAYS = 90

interface CountRow {
  redacted: string
}

export async function POST(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const rows = await runGreenhousePostgresQuery<CountRow & Record<string, unknown>>(`
      WITH redacted AS (
        UPDATE greenhouse_notifications.email_deliveries
        SET
          delivery_payload = '{"redacted": true}'::jsonb,
          recipient_name   = '[redacted]',
          data_redacted_at = NOW(),
          updated_at       = NOW()
        WHERE created_at < NOW() - INTERVAL '${RETENTION_DAYS} days'
          AND data_redacted_at IS NULL
        RETURNING delivery_id
      )
      SELECT COUNT(*)::text AS redacted FROM redacted
    `)

    const redactedCount = Number(rows[0]?.redacted ?? 0)

    console.info(`[email-data-retention] Redacted ${redactedCount} delivery records older than ${RETENTION_DAYS} days`)

    return NextResponse.json({
      ok: true,
      redactedCount,
      retentionDays: RETENTION_DAYS,
      ranAt: new Date().toISOString()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: message }, { status: 502 })
  }
}

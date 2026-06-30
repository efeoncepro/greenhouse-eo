import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1250 Slice 3 — DB-level idempotency ledger for the AI Visibility report email.
 *
 * One principal email per (report_id, email_type). The report snapshot is immutable +
 * versioned, so `report_id` is the canonical idempotency key. `claimReportEmailDispatch`
 * is the atomic guard: concurrent worker-publish + retry can't double-send because only
 * one INSERT wins the UNIQUE(report_id, email_type) slot. A `failed` row (or a `claimed`
 * row that went stale after a crash) can be re-claimed so a transient failure still retries.
 */
export const AI_VISIBILITY_REPORT_EMAIL_TYPE = 'ai_visibility_grader_report'

export interface ReportEmailDispatchClaim {
  claimed: boolean
  dispatchId: string | null
}

/**
 * Atomically claim the right to send. Returns `claimed: true` (+ dispatchId) ONLY when this
 * caller owns the send: either it inserted a fresh row, or it re-claimed a `failed` / stale
 * `claimed` row. A row already `sent` (or freshly `claimed` by a live worker) → `claimed: false`.
 */
export const claimReportEmailDispatch = async (input: {
  runId: string
  reportId: string
  leadId: string
  recipientEmail: string
}): Promise<ReportEmailDispatchClaim> => {
  const rows = await runGreenhousePostgresQuery<{ dispatch_id: string }>(
    `INSERT INTO greenhouse_growth.grader_report_email_dispatches
       (run_id, report_id, lead_id, email_type, recipient_email, status)
     VALUES ($1, $2, $3, $4, $5, 'claimed')
     ON CONFLICT (report_id, email_type) DO UPDATE
       SET status = 'claimed', updated_at = NOW(), reason = NULL
       WHERE grader_report_email_dispatches.status = 'failed'
          OR (grader_report_email_dispatches.status = 'claimed'
              AND grader_report_email_dispatches.updated_at < NOW() - INTERVAL '15 minutes')
     RETURNING dispatch_id`,
    [input.runId, input.reportId, input.leadId, AI_VISIBILITY_REPORT_EMAIL_TYPE, input.recipientEmail]
  )

  return { claimed: rows.length > 0, dispatchId: rows[0]?.dispatch_id ?? null }
}

export const markReportEmailDispatchSent = async (dispatchId: string, resendMessageId: string | null): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.grader_report_email_dispatches
        SET status = 'sent', resend_message_id = $2, sent_at = NOW(), updated_at = NOW(), reason = NULL
      WHERE dispatch_id = $1`,
    [dispatchId, resendMessageId]
  )
}

export const markReportEmailDispatchFailed = async (dispatchId: string, reason: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.grader_report_email_dispatches
        SET status = 'failed', reason = $2, updated_at = NOW()
      WHERE dispatch_id = $1`,
    [dispatchId, reason.slice(0, 500)]
  )
}

export const markReportEmailDispatchSkipped = async (dispatchId: string, reason: string): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.grader_report_email_dispatches
        SET status = 'skipped', reason = $2, updated_at = NOW()
      WHERE dispatch_id = $1`,
    [dispatchId, reason.slice(0, 500)]
  )
}

import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1279 — Store del audit append-only `greenhouse_growth.grader_report_send_log`.
 *
 * Una fila por DECISIÓN de envío del operador (run × recipient). `claimReportSend` es el guard
 * atómico de idempotencia (INSERT ON CONFLICT DO NOTHING sobre UNIQUE(run_id, lower(email))):
 * un segundo envío al mismo destinatario para el mismo run NO crea fila nueva ni publica evento.
 * `email_status`/`lead_status` los muta el reactive consumer de forma independiente e idempotente
 * (retry re-entra y salta el sub-paso ya completado). La fila no se borra (audit).
 */

export type ReportSendLeadType = 'expansion' | 'new_business'
export type ReportSendLegalBasis = 'legitimate_interest' | 'service_relationship'
export type ReportSendStepStatus = 'pending' | 'sent' | 'failed' | 'skipped'
export type ReportSendLeadStatus = 'pending' | 'created' | 'failed' | 'skipped'

export interface ClaimReportSendInput {
  runId: string
  organizationId: string
  recipientEmail: string
  recipientName: string | null
  leadType: ReportSendLeadType
  legalBasis: ReportSendLegalBasis
  consentRef: string | null
  requestedBy: string
}

export interface ReportSendClaim {
  /** true sólo cuando ESTA llamada insertó la fila (gana el slot). false = ya existía. */
  claimed: boolean
  sendId: string | null
}

/**
 * Reclama atómicamente el derecho a enviar. INSERT ON CONFLICT (run_id, lower(email)) DO NOTHING:
 * si la fila ya existe (envío previo al mismo destinatario para el mismo run) → claimed=false +
 * el send_id existente (idempotencia). El INSERT corre dentro de la tx del command (`client`) para
 * que el claim y el publish del outbox event sean atómicos.
 */
export const claimReportSend = async (
  input: ClaimReportSendInput,
  client: PoolClient
): Promise<ReportSendClaim> => {
  const inserted = await client.query<{ send_id: string }>(
    `INSERT INTO greenhouse_growth.grader_report_send_log
       (run_id, organization_id, recipient_email, recipient_name, lead_type, legal_basis, consent_ref, requested_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (run_id, lower(recipient_email)) DO NOTHING
     RETURNING send_id`,
    [
      input.runId,
      input.organizationId,
      input.recipientEmail,
      input.recipientName,
      input.leadType,
      input.legalBasis,
      input.consentRef,
      input.requestedBy
    ]
  )

  if (inserted.rows[0]?.send_id) {
    return { claimed: true, sendId: inserted.rows[0].send_id }
  }

  // Ya existía: recuperamos el send_id para devolver un resultado idempotente.
  const existing = await client.query<{ send_id: string }>(
    `SELECT send_id FROM greenhouse_growth.grader_report_send_log
      WHERE run_id = $1 AND lower(recipient_email) = lower($2)
      LIMIT 1`,
    [input.runId, input.recipientEmail]
  )

  return { claimed: false, sendId: existing.rows[0]?.send_id ?? null }
}

export interface ReportSendExecutionRow {
  sendId: string
  runId: string
  organizationId: string
  recipientEmail: string
  recipientName: string | null
  leadType: ReportSendLeadType
  emailStatus: ReportSendStepStatus
  leadStatus: ReportSendLeadStatus
  hubspotContactId: string | null
  hubspotCompanyId: string | null
  hubspotLeadId: string | null
}

type RawExecutionRow = {
  send_id: string
  run_id: string
  organization_id: string
  recipient_email: string
  recipient_name: string | null
  lead_type: ReportSendLeadType
  email_status: ReportSendStepStatus
  lead_status: ReportSendLeadStatus
  hubspot_contact_id: string | null
  hubspot_company_id: string | null
  hubspot_lead_id: string | null
}

/** Re-lee el send log para la ejecución del consumer (NUNCA confía en el payload del outbox). */
export const getReportSendForExecution = async (sendId: string): Promise<ReportSendExecutionRow | null> => {
  const rows = await runGreenhousePostgresQuery<RawExecutionRow>(
    `SELECT send_id, run_id, organization_id, recipient_email, recipient_name, lead_type,
            email_status, lead_status, hubspot_contact_id, hubspot_company_id, hubspot_lead_id
       FROM greenhouse_growth.grader_report_send_log
      WHERE send_id = $1
      LIMIT 1`,
    [sendId]
  )

  const row = rows[0]

  if (!row) return null

  return {
    sendId: row.send_id,
    runId: row.run_id,
    organizationId: row.organization_id,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    leadType: row.lead_type,
    emailStatus: row.email_status,
    leadStatus: row.lead_status,
    hubspotContactId: row.hubspot_contact_id,
    hubspotCompanyId: row.hubspot_company_id,
    hubspotLeadId: row.hubspot_lead_id
  }
}

export const markReportSendEmail = async (
  sendId: string,
  status: ReportSendStepStatus,
  detail: { resendMessageId?: string | null; reason?: string | null } = {}
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.grader_report_send_log
        SET email_status = $2,
            resend_message_id = COALESCE($3, resend_message_id),
            reason = $4,
            updated_at = NOW()
      WHERE send_id = $1`,
    [sendId, status, detail.resendMessageId ?? null, detail.reason ? detail.reason.slice(0, 500) : null]
  )
}

export const markReportSendLead = async (
  sendId: string,
  status: ReportSendLeadStatus,
  detail: {
    hubspotLeadId?: string | null
    hubspotContactId?: string | null
    hubspotCompanyId?: string | null
    reason?: string | null
  } = {}
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_growth.grader_report_send_log
        SET lead_status = $2,
            hubspot_lead_id = COALESCE($3, hubspot_lead_id),
            hubspot_contact_id = COALESCE($4, hubspot_contact_id),
            hubspot_company_id = COALESCE($5, hubspot_company_id),
            reason = COALESCE($6, reason),
            updated_at = NOW()
      WHERE send_id = $1`,
    [
      sendId,
      status,
      detail.hubspotLeadId ?? null,
      detail.hubspotContactId ?? null,
      detail.hubspotCompanyId ?? null,
      detail.reason ? detail.reason.slice(0, 500) : null
    ]
  )
}

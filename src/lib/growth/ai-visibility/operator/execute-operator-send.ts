import 'server-only'

/**
 * TASK-1279 — WRITE primitive del cross-sell operador (reactive consumer, lane `ops-reactive-growth`).
 *
 * Lo invoca `growthAiVisibilityOperatorSendProjection` re-leyendo el send log de PG (NUNCA confía en
 * el payload del outbox). Dos sub-pasos INDEPENDIENTES e idempotentes (marcados por separado en el
 * audit, para que un retry no re-envíe el email ya enviado):
 *  1. EMAIL: arma el adjunto PDF público-safe desde el SNAPSHOT PÚBLICO (mismo path que el lead
 *     magnet, máxima leak-safety para un externo) + lo envía vía `sendEmail` (marca Efeonce).
 *  2. LEAD: upsert Contact/Company + crea el **Lead** de HubSpot (objeto `leads`, NUNCA Deal) +
 *     setea `aeo_check_result` en la Company.
 *
 * Gate de flag (defense-in-depth del command): OFF ⇒ skip controlado (NUNCA envía, NUNCA crash).
 */

import { modelFromPublicReport } from '@/components/growth/ai-visibility/report-artifact/model'
import type { AiVisibilityReportEmailInsight } from '@/emails/AiVisibilityGraderReportEmail'
import { sendEmail } from '@/lib/email/delivery'
import { captureWithDomain } from '@/lib/observability/capture'

import { isOperatorSendEnabled } from '../flags'
import { createOperatorCrossSellLead } from '../hubspot/crm-client'
import { buildPublicReportUrl, getLatestReportTokenForRun } from '../hubspot/report-link'
import { buildAiVisibilityReportAttachment } from '../public-delivery/email/build-report-attachment'
import type { GraderReportSeverity } from '../report/contracts'
import { buildReportHeader } from '../report/report-header'
import { readPublicGraderReport, type PublishedSnapshot } from '../report/snapshot'
import { buildOperatorCrossSellPayload } from './hubspot-cross-sell-mapper'
import { getOrganizationCommercialFacts, type OrganizationCommercialFacts } from './organization-commercial-facts'
import {
  getReportSendForExecution,
  markReportSendEmail,
  markReportSendLead,
  type ReportSendExecutionRow
} from './send-log-store'

export interface OperatorSendExecuteResult {
  status: 'succeeded' | 'skipped' | 'failed'
  reason?: string
  retryable: boolean
  sendId: string
}

interface SendContext {
  row: ReportSendExecutionRow
  org: OrganizationCommercialFacts
  snapshot: PublishedSnapshot
  reportToken: string
  organizationName: string
}

type StepOutcome = { retryable: boolean; failed: boolean }

const LEVEL_LABEL_BY_SEVERITY: Record<GraderReportSeverity, string | null> = {
  optimo: 'Avanzado',
  atencion: 'Intermedio',
  critico: 'Inicial',
  sin_dato: null
}

/** Extrae el dominio corporativo de una website (sin protocolo / www / path). Null si no parsea. */
const domainFromWebsite = (websiteUrl: string | null): string | null => {
  if (!websiteUrl) return null

  try {
    const url = new URL(websiteUrl.includes('://') ? websiteUrl : `https://${websiteUrl}`)

    return url.hostname.replace(/^www\./i, '').toLowerCase() || null
  } catch {
    return null
  }
}

/** Sub-paso EMAIL (idempotente: si ya está 'sent', no re-envía). */
const runEmailStep = async (ctx: SendContext): Promise<StepOutcome> => {
  if (ctx.row.emailStatus === 'sent') return { retryable: false, failed: false }

  const gateStatus = ctx.snapshot.publicReport.gate.status

  if (gateStatus !== 'ready' && gateStatus !== 'partial') {
    await markReportSendEmail(ctx.row.sendId, 'skipped', { reason: `gated:${gateStatus}` })

    return { retryable: false, failed: false }
  }

  const model = modelFromPublicReport(ctx.snapshot.publicReport, 'attachment')
  const header = buildReportHeader({ organizationName: ctx.organizationName, asOf: ctx.snapshot.asOf })

  const attachment = await buildAiVisibilityReportAttachment({ publicReport: ctx.snapshot.publicReport, header })

  const insight: AiVisibilityReportEmailInsight | null = (() => {
    const detection = model.primaryGap?.title ?? model.recommendations[0]?.title ?? null

    const action =
      (model.primaryGap
        ? model.recommendations.find(r => r.gapKey === model.primaryGap?.gapKey)?.action
        : undefined) ??
      model.recommendations[0]?.action ??
      null

    const importance = model.headline.frame?.trim() || null

    return detection && action && importance ? { detection, importance, action } : null
  })()

  const result = await sendEmail({
    emailType: 'ai_visibility_grader_report',
    domain: 'growth',
    recipients: [{ email: ctx.row.recipientEmail, name: ctx.row.recipientName ?? undefined }],
    context: {
      organizationName: ctx.organizationName,
      scoreValue: model.overallScore,
      levelLabel: LEVEL_LABEL_BY_SEVERITY[model.overallSeverity],
      primaryGapTitle: model.primaryGap?.title ?? null,
      isPartial: gateStatus === 'partial',
      insight,
      reportUrl: buildPublicReportUrl(ctx.reportToken),
      attachmentFilename: attachment.filename,
      attachmentSizeLabel: attachment.sizeLabel,
      pdfBuffer: attachment.content,
      locale: 'es'
    },
    sourceEntity: 'growth_ai_visibility_operator_send',
    sourceEventId: ctx.row.sendId
  })

  if (result.status === 'sent') {
    await markReportSendEmail(ctx.row.sendId, 'sent', { resendMessageId: result.resendId })

    return { retryable: false, failed: false }
  }

  await markReportSendEmail(ctx.row.sendId, 'failed', { reason: `delivery_${result.status}` })

  return { retryable: result.status !== 'skipped', failed: true }
}

/** Sub-paso LEAD HubSpot (idempotente: si ya está 'created', no re-crea). */
const runLeadStep = async (ctx: SendContext): Promise<StepOutcome> => {
  if (ctx.row.leadStatus === 'created') return { retryable: false, failed: false }

  const pr = ctx.snapshot.publicReport

  const payload = buildOperatorCrossSellPayload({
    recipient: { email: ctx.row.recipientEmail, firstName: null, lastName: ctx.row.recipientName },
    organizationName: ctx.organizationName,
    organizationDomain: domainFromWebsite(ctx.org.websiteUrl),
    leadType: ctx.row.leadType,
    report: {
      overallScore: pr.overallScore,
      scoreVersion: pr.provenance.scoreVersion,
      gateStatus: pr.gate.status,
      primaryGapKey: pr.primaryGap?.gapKey ?? null,
      recommendedMotion: pr.recommendedMotion ?? null,
      competitorsDetected: pr.competitiveSov.competitors.map(competitor => competitor.name),
      lastRunAt: pr.provenance.asOfDate
    },
    reportUrl: buildPublicReportUrl(ctx.reportToken)
  })

  const result = await createOperatorCrossSellLead(payload)

  if (result.status === 'succeeded') {
    await markReportSendLead(ctx.row.sendId, 'created', {
      hubspotLeadId: result.leadId,
      hubspotContactId: result.contactId,
      hubspotCompanyId: result.companyId
    })

    return { retryable: false, failed: false }
  }

  await markReportSendLead(ctx.row.sendId, 'failed', { reason: result.errorClass ?? 'hubspot_write_failed' })

  return { retryable: result.retryable, failed: true }
}

export const executeOperatorReportSend = async (sendId: string): Promise<OperatorSendExecuteResult> => {
  if (!isOperatorSendEnabled()) {
    return { status: 'skipped', reason: 'disabled', retryable: false, sendId }
  }

  const row = await getReportSendForExecution(sendId)

  if (!row) return { status: 'skipped', reason: 'no_send_log', retryable: false, sendId }

  // Contexto compartido (token + snapshot público + org). Si el snapshot aún no existe es una
  // carrera con la publicación → retryable (no es un fallo del envío).
  const reportToken = await getLatestReportTokenForRun(row.runId)
  const snapshot = reportToken ? await readPublicGraderReport(reportToken) : null

  if (!reportToken || !snapshot) {
    return { status: 'failed', reason: 'no_snapshot', retryable: true, sendId }
  }

  const org = await getOrganizationCommercialFacts(row.organizationId)

  if (!org) return { status: 'failed', reason: 'organization_not_found', retryable: false, sendId }

  const ctx: SendContext = {
    row,
    org,
    snapshot,
    reportToken,
    organizationName: org.organizationName || 'tu organización'
  }

  let email: StepOutcome
  let lead: StepOutcome

  try {
    email = await runEmailStep(ctx)
    lead = await runLeadStep(ctx)
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_operator_send', stage: 'execute' },
      extra: { sendId }
    })

    return { status: 'failed', reason: 'exception', retryable: true, sendId }
  }

  if (email.failed || lead.failed) {
    return {
      status: 'failed',
      reason: `email_failed=${email.failed} lead_failed=${lead.failed}`,
      retryable: email.retryable || lead.retryable,
      sendId
    }
  }

  return { status: 'succeeded', retryable: false, sendId }
}

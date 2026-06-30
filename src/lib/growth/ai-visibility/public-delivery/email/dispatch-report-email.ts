import 'server-only'

import {
  modelFromPublicReport,
  type ReportArtifactModel
} from '@/components/growth/ai-visibility/report-artifact/model'
import type { ReportHeader } from '@/components/growth/ai-visibility/report-artifact/web/AiVisibilityReportArtifact'
import type { AiVisibilityReportEmailInsight } from '@/emails/AiVisibilityGraderReportEmail'
import { sendEmail } from '@/lib/email/delivery'
import { isReportEmailDeliveryEnabled } from '@/lib/growth/ai-visibility/flags'
import { buildPublicReportUrl, getLatestReportTokenForRun } from '@/lib/growth/ai-visibility/hubspot/report-link'
import { getGraderLeadForHandoff } from '@/lib/growth/ai-visibility/public-intake/store'
import { readPublicGraderReport } from '@/lib/growth/ai-visibility/report/snapshot'
import type { GraderReportSeverity } from '@/lib/growth/ai-visibility/report/contracts'
import { captureWithDomain } from '@/lib/observability/capture'

import { buildAiVisibilityReportAttachment } from './build-report-attachment'
import {
  claimReportEmailDispatch,
  markReportEmailDispatchFailed,
  markReportEmailDispatchSent
} from './dispatch-ledger'

/**
 * TASK-1250 Slice 3 — AI Visibility report email delivery command (governed, idempotent).
 *
 * Reactive consumer of the snapshot-published event (write-side, NEVER on the public status
 * GET). Resolves the consented lead + the frozen public snapshot, gates on consent + report
 * state, claims the DB-level idempotency slot, builds the public-safe PDF attachment and sends
 * via the canonical email layer. Same shape as `executeLeadHandoff`: a sequence of honest
 * skip gates, then a single governed write, returning a result the projection acts on.
 *
 * NEVER: send without consent, send a gated report (insufficient_data / unapproved
 * review_required), double-send (claim guard), or leak internal/raw fields (attachment +
 * email are built from the public DTO only).
 */
export interface ReportEmailDispatchResult {
  status: 'succeeded' | 'skipped' | 'failed'
  reason?: string
  runId: string
  retryable: boolean
}

const skipped = (runId: string, reason: string, retryable: boolean): ReportEmailDispatchResult => ({
  status: 'skipped',
  reason,
  runId,
  retryable
})

const LEVEL_LABEL_BY_SEVERITY: Record<GraderReportSeverity, string | null> = {
  optimo: 'Avanzado',
  atencion: 'Intermedio',
  critico: 'Inicial',
  sin_dato: null
}

/** One priority insight (qué detectamos / por qué importa / qué hacer ahora) from the model. */
const buildInsight = (model: ReportArtifactModel): AiVisibilityReportEmailInsight | null => {
  const detection = model.primaryGap?.title ?? model.recommendations[0]?.title ?? null

  const matchingAction = model.primaryGap
    ? model.recommendations.find(r => r.gapKey === model.primaryGap?.gapKey)?.action
    : undefined

  const action = matchingAction ?? model.recommendations[0]?.action ?? null
  const importance = model.headline.frame?.trim() || null

  if (!detection || !action || !importance) return null

  return { detection, importance, action }
}

const formatReportDate = (iso: string): string =>
  new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

const leadDisplayName = (firstName: string | null, lastName: string | null): string | undefined => {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()

  return name || undefined
}

export const dispatchAiVisibilityReportEmail = async (runId: string): Promise<ReportEmailDispatchResult> => {
  // 1. Flag gate (write-side, mirrors the HubSpot handoff): enqueue always happens; the WRITE
  //    is gated so events are not lost when the flag is flipped on. No production send before TASK-1246.
  if (!isReportEmailDeliveryEnabled()) return skipped(runId, 'disabled', false)

  // 2. Consent gate: only a consented lead receives the report. Never to absent/withdrawn consent.
  const lead = await getGraderLeadForHandoff(runId)

  if (!lead) return skipped(runId, 'no_lead', false)
  if (!lead.consent) return skipped(runId, 'no_consent', false)

  // 3. Frozen public snapshot (token → public_report_json, respects expiry). The event fires
  //    post-publish, so a missing snapshot is a tiny race → retryable.
  const reportToken = await getLatestReportTokenForRun(runId)

  if (!reportToken) return skipped(runId, 'no_snapshot', true)
  const snapshot = await readPublicGraderReport(reportToken)

  if (!snapshot) return skipped(runId, 'no_snapshot', true)

  // 4. Report-state gate: never email a gated report. Only `ready` / `partial` deliver.
  const gateStatus = snapshot.publicReport.gate.status

  if (gateStatus !== 'ready' && gateStatus !== 'partial') return skipped(runId, `gated:${gateStatus}`, false)

  // 5. DB-level idempotency claim. If we don't own the send (already sent / live claim) → skip.
  const claim = await claimReportEmailDispatch({
    runId,
    reportId: snapshot.reportId,
    leadId: lead.leadId,
    recipientEmail: lead.email
  })

  if (!claim.claimed || !claim.dispatchId) return skipped(runId, 'already_sent', false)
  const dispatchId = claim.dispatchId

  try {
    const model = modelFromPublicReport(snapshot.publicReport, 'attachment')
    const organizationName = lead.brandName
    const reportDate = formatReportDate(snapshot.asOf)

    const header: ReportHeader = {
      organizationName,
      reportDate,
      periodLabel: `Diagnóstico al ${reportDate}`
    }

    const attachment = await buildAiVisibilityReportAttachment({ publicReport: snapshot.publicReport, header })

    const result = await sendEmail({
      emailType: 'ai_visibility_grader_report',
      domain: 'growth',
      recipients: [{ email: lead.email, name: leadDisplayName(lead.firstName, lead.lastName) }],
      context: {
        organizationName,
        scoreValue: model.overallScore,
        levelLabel: LEVEL_LABEL_BY_SEVERITY[model.overallSeverity],
        primaryGapTitle: model.primaryGap?.title ?? null,
        isPartial: gateStatus === 'partial',
        insight: buildInsight(model),
        reportUrl: buildPublicReportUrl(reportToken),
        attachmentFilename: attachment.filename,
        attachmentSizeLabel: attachment.sizeLabel,
        pdfBuffer: attachment.content,
        locale: 'es'
      },
      sourceEntity: 'growth_ai_visibility_report_email',
      // Idempotency at the delivery layer too: the immutable snapshot is the source event.
      sourceEventId: snapshot.reportId
    })

    if (result.status === 'sent') {
      await markReportEmailDispatchSent(dispatchId, result.resendId)

      return { status: 'succeeded', runId, retryable: false }
    }

    // Delivery layer returned a non-sent terminal state (failed / rate_limited / skipped).
    const reason = `delivery_${result.status}`

    await markReportEmailDispatchFailed(dispatchId, result.error ? `${reason}: ${result.error}` : reason)

    // rate_limited / failed are retryable; an explicit skip (kill-switch paused) is not.
    return { status: 'failed', reason, runId, retryable: result.status !== 'skipped' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'

    await markReportEmailDispatchFailed(dispatchId, message)
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_report_email', stage: 'dispatch' },
      extra: { runId }
    })

    return { status: 'failed', reason: 'exception', runId, retryable: true }
  }
}

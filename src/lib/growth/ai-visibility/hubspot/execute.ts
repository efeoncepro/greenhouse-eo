import 'server-only'

/**
 * TASK-1242 — Growth AI Visibility · HubSpot lead handoff · WRITE primitive (execute).
 *
 * `executeLeadHandoff` es el write authoritative: lo invoca el reactive consumer (re-lee de
 * PG, NUNCA confía en el payload del outbox) y también el endpoint admin de re-trigger via
 * el mismo path. Gates duros: flag ON + lead con consent + score `ready` (releasable). Hace
 * el upsert contact/company con el cliente HubSpot in-app directo y marca `hubspot_synced_at`.
 * Idempotente: re-ejecutar converge (upsert por email/dominio + `markGraderLeadHubspotSynced`).
 */

import { isLeadHandoffEnabled } from '../flags'
import { GraderReportError, readGraderReport } from '../report/command'
import { getGraderLeadForHandoff, markGraderLeadHubspotSynced } from '../public-intake/store'
import { upsertLeadToHubSpot } from './crm-client'
import { buildHubSpotLeadHandoffPayload, type LeadHandoffFacts } from './property-mapper'
import { buildPublicReportUrl, getLatestReportTokenForRun } from './report-link'

export type LeadHandoffExecuteStatus = 'succeeded' | 'skipped' | 'failed'

export interface LeadHandoffExecuteResult {
  status: LeadHandoffExecuteStatus
  reason?: 'disabled' | 'no_lead' | 'no_consent' | 'no_score' | 'not_releasable' | string
  contactId?: string | null
  companyId?: string | null
  /** El consumer usa esto para decidir retry/dead-letter vs ack. */
  retryable: boolean
  runId: string
}

const skipped = (runId: string, reason: LeadHandoffExecuteResult['reason']): LeadHandoffExecuteResult => ({
  status: 'skipped',
  reason,
  retryable: false,
  runId,
})

export const executeLeadHandoff = async (runId: string): Promise<LeadHandoffExecuteResult> => {
  // Flag OFF → skip controlado (NUNCA escribe a HubSpot, NUNCA crash).
  if (!isLeadHandoffEnabled()) {
    return skipped(runId, 'disabled')
  }

  const lead = await getGraderLeadForHandoff(runId)

  if (!lead) return skipped(runId, 'no_lead')
  if (!lead.consent) return skipped(runId, 'no_consent')

  // Reporte + gate de honestidad: solo se sincroniza un score RELEASABLE. Mismo predicado
  // que `publishGraderReportSnapshot` (rechaza `insufficient_data`/`review_required`; `ready`
  // y `partial` son publicables). NO ser más estricto que el snapshot, o un score real +
  // publicado nunca llegaría a ventas (bug detectado en el smoke staging 2026-06-25).
  let report

  try {
    ;({ report } = await readGraderReport({ runId }))
  } catch (error) {
    if (error instanceof GraderReportError) {
      // Sin run/score aún: nada que sincronizar (no es un fallo del handoff → no dead-letter).
      return skipped(runId, 'no_score')
    }

    throw error
  }

  if (report.gate.status === 'insufficient_data' || report.gate.status === 'review_required') {
    return skipped(runId, 'not_releasable')
  }

  const reportToken = await getLatestReportTokenForRun(runId)

  const facts: LeadHandoffFacts = {
    email: lead.email,
    // Nombre/apellido aún no se capturan en el intake (sub-task aparte) → null por ahora.
    firstName: null,
    lastName: null,
    brandName: lead.brandName,
    lastSubmitAt: lead.consentAt,
    reportUrl: reportToken ? buildPublicReportUrl(reportToken) : null,
    report: {
      overallScore: report.overallScore,
      scoreVersion: report.scoreVersion,
      primaryGapKey: report.primaryGap?.gapKey ?? null,
      recommendedMotion: report.recommendedMotion,
      competitorsDetected: report.competitiveSov.competitors.map(competitor => competitor.name),
      lastRunAt: report.provenance.asOfDate,
    },
  }

  const payload = buildHubSpotLeadHandoffPayload(facts)
  const result = await upsertLeadToHubSpot(payload)

  if (result.status === 'succeeded') {
    await markGraderLeadHubspotSynced(lead.leadId)

    return { status: 'succeeded', contactId: result.contactId, companyId: result.companyId, retryable: false, runId }
  }

  return {
    status: 'failed',
    reason: result.errorClass,
    retryable: result.retryable,
    runId,
  }
}

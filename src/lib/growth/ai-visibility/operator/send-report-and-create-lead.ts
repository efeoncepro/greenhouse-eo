import 'server-only'

/**
 * TASK-1279 — Growth AI Visibility · operator cross-sell · command gobernado (Full API parity).
 *
 * `sendAeoReportAndCreateLead` es el ÚNICO camino de envío operador del informe AEO + creación
 * del **Lead de HubSpot** (objeto `leads`, asociado a Contact/Company — NUNCA un Deal). Consumers:
 * la vista operador (TASK-1276), Nexa vía propose→confirm→execute, CLI/runbook. NUNCA envía email
 * ni escribe a HubSpot inline: gatea + claima el audit (idempotencia atómica) + publica el outbox
 * event; el reactive consumer (lane `ops-reactive-growth`, `executeOperatorReportSend`) hace los
 * dos writes externos re-leyendo de PG.
 *
 * Consent gate (interés legítimo, NUNCA en frío): el tipo comercial de la org se DERIVA server-side
 * (`getOrganizationCommercialFacts`) — NUNCA se confía en el operador. Prospecto (new_business) exige
 * `consentRef` no vacío + base legal `legitimate_interest`; cliente con relación (expansion) = servicio.
 */

import { withTransaction } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { type TenantEntitlementSubject } from '@/lib/entitlements/types'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { isOperatorSendEnabled } from '../flags'
import { getLatestReportTokenForRun } from '../hubspot/report-link'
import { getClientGraderRunById } from '../store'
import { getOrganizationCommercialFacts } from './organization-commercial-facts'
import {
  GROWTH_AI_VISIBILITY_REPORT_SEND_AGGREGATE,
  GROWTH_AI_VISIBILITY_REPORT_SEND_REQUESTED_EVENT,
  type ReportSendRequestedPayload
} from './send-events'
import { claimReportSend, type ReportSendLeadType } from './send-log-store'

export type SendReportBlockedReason =
  | 'forbidden'
  | 'disabled'
  | 'invalid_recipient'
  | 'organization_not_found'
  | 'report_unavailable'
  | 'consent_required'

export type SendReportAndCreateLeadResult =
  | { status: 'queued'; sendId: string; leadType: ReportSendLeadType; idempotentHit: boolean }
  | { status: 'blocked'; reason: SendReportBlockedReason }

export interface SendReportAndCreateLeadInput {
  /** Subject autenticado (de `requireInternalTenantContext`). El command self-guarda con `can()`. */
  subject: TenantEntitlementSubject
  /** Org sujeto (cliente o prospecto). Arbitraria — gate de capability obligatorio. */
  organizationId: string
  /** Run reportable cuyo informe se envía. */
  runId: string
  /** Destinatario del informe (el contacto con quien hubo conversación previa). */
  recipient: { email: string; firstName?: string | null; lastName?: string | null }
  /** Referencia al consentimiento capturado (obligatoria para prospecto). NO es el PII crudo. */
  consentRef?: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normalizeName = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim()

  return trimmed && trimmed.length > 0 ? trimmed : null
}

export const sendAeoReportAndCreateLead = async (
  input: SendReportAndCreateLeadInput
): Promise<SendReportAndCreateLeadResult> => {
  if (!can(input.subject, 'growth.ai_visibility.lead.open', 'execute', 'tenant')) {
    return { status: 'blocked', reason: 'forbidden' }
  }

  // Flag gate al frente: el envío operador es una acción humana on-demand (sin evento auto que
  // perder), así que gatear acá es más honesto que dejar el evento encolado e inerte.
  if (!isOperatorSendEnabled()) {
    return { status: 'blocked', reason: 'disabled' }
  }

  const email = input.recipient.email?.trim().toLowerCase() ?? ''

  if (!EMAIL_RE.test(email)) {
    return { status: 'blocked', reason: 'invalid_recipient' }
  }

  const org = await getOrganizationCommercialFacts(input.organizationId)

  if (!org) {
    return { status: 'blocked', reason: 'organization_not_found' }
  }

  // El run debe existir y pertenecer a ESTA org (tenant boundary) y ser reportable
  // (getClientGraderRunById sólo devuelve succeeded/partial). El gate de releasable (gate.status)
  // lo aplica el executor antes de enviar — mismo predicado que el dispatch del lead magnet.
  const run = await getClientGraderRunById({ runId: input.runId, organizationId: input.organizationId })

  if (!run) {
    return { status: 'blocked', reason: 'report_unavailable' }
  }

  // El envío externo usa el SNAPSHOT PÚBLICO (público-safe + URL compartible). Si el run aún no
  // se publicó, no hay informe que enviar → feedback inmediato al operador (publica primero).
  const reportToken = await getLatestReportTokenForRun(input.runId)

  if (!reportToken) {
    return { status: 'blocked', reason: 'report_unavailable' }
  }

  // Tipo comercial + base legal DERIVADOS del tipo real de la org (NUNCA del operador).
  const leadType: ReportSendLeadType = org.isClient ? 'expansion' : 'new_business'
  const consentRef = normalizeName(input.consentRef)

  // Consent gate duro: prospecto (new_business) exige consentimiento capturado (interés legítimo).
  if (leadType === 'new_business' && !consentRef) {
    return { status: 'blocked', reason: 'consent_required' }
  }

  const legalBasis = org.isClient ? ('service_relationship' as const) : ('legitimate_interest' as const)

  // Claim atómico del audit + publish del evento en una sola tx (consistencia outbox).
  const claim = await withTransaction(async client => {
    const claimed = await claimReportSend(
      {
        runId: input.runId,
        organizationId: input.organizationId,
        recipientEmail: email,
        recipientName: normalizeName(
          [normalizeName(input.recipient.firstName), normalizeName(input.recipient.lastName)]
            .filter(Boolean)
            .join(' ')
        ),
        leadType,
        legalBasis,
        consentRef,
        requestedBy: input.subject.userId
      },
      client
    )

    if (!claimed.claimed || !claimed.sendId) {
      return { claimed: false, sendId: claimed.sendId }
    }

    const payload: ReportSendRequestedPayload = { schemaVersion: 1, sendId: claimed.sendId }

    await publishOutboxEvent(
      {
        aggregateType: GROWTH_AI_VISIBILITY_REPORT_SEND_AGGREGATE,
        aggregateId: claimed.sendId,
        eventType: GROWTH_AI_VISIBILITY_REPORT_SEND_REQUESTED_EVENT,
        payload
      },
      client
    )

    return { claimed: true, sendId: claimed.sendId }
  })

  if (!claim.sendId) {
    // No se pudo resolver el send (carrera improbable). Trátalo como report_unavailable.
    return { status: 'blocked', reason: 'report_unavailable' }
  }

  return { status: 'queued', sendId: claim.sendId, leadType, idempotentHit: !claim.claimed }
}

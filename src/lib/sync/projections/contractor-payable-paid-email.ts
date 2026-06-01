import 'server-only'

import { generateContractorRemittancePdf } from '@/lib/contractor-engagements/remittance/generate-contractor-remittance-pdf'
import { resolveRemittanceAdvice } from '@/lib/contractor-engagements/remittance/remittance-resolver'
import { sendEmail } from '@/lib/email/delivery'
import { getProfileNotificationRecipient } from '@/lib/notifications/person-recipient-resolver'
import { captureWithDomain } from '@/lib/observability/capture'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-981 Slice 2 — email the TASK-960 remittance ("Comprobante de Pago") to the
 * contractor when their payable is paid.
 *
 * Triggered by `workforce.contractor_payable.paid` (emitted by markPayablePaid via
 * the Slice 1 cascade). Pipeline:
 *   resolveRemittanceAdvice(payableId)  ← gates on status='paid' (re-read PG, never
 *                                          trusts the event payload)
 *   → generateContractorRemittancePdf(presentation)  → Buffer
 *   → getProfileNotificationRecipient(engagementProfileId)  → canonical email
 *   → sendEmail({ emailType: 'contractor_remittance_paid', attachments: [pdf] })
 *
 * Idempotent: sendEmail dedups via wasEmailAlreadySent(sourceEventId, sourceEntity,
 * recipientEmail) → a dispatcher retry of the same event never double-sends. The
 * `.paid` event itself fires once per payable (markPayablePaid is a no-op on retry).
 *
 * Honest degradation: if the remittance can't be resolved (not paid / issuer
 * unresolved) or the contractor has no email, the projection SKIPS (returns a
 * message) rather than failing the whole reactive batch. A genuinely transient
 * send failure throws → the dispatcher retries → dead-letter signal covers drift.
 */
export const contractorPayablePaidEmailProjection: ProjectionDefinition = {
  name: 'contractor_payable_paid_email',
  description:
    'Email the TASK-960 remittance PDF to the contractor when a payable is paid (TASK-981).',
  domain: 'finance',
  triggerEvents: [EVENT_TYPES.contractorPayablePaid],
  extractScope: payload => {
    const contractorPayableId =
      typeof payload.contractorPayableId === 'string' ? payload.contractorPayableId : null

    if (!contractorPayableId) return null

    return { entityType: 'contractor_payable', entityId: contractorPayableId }
  },
  refresh: async (scope, payload) => {
    const contractorPayableId = scope.entityId

    const resolution = await resolveRemittanceAdvice(contractorPayableId)

    if (!resolution.ok) {
      // not_paid can happen on a benign race (re-read before commit visibility);
      // issuer_unresolved / engagement_missing / not_found are data issues worth a
      // capture so ops sees them. Either way we skip — never block the batch.
      if (resolution.reason !== 'not_paid') {
        captureWithDomain(new Error(`remittance unresolved: ${resolution.reason}`), 'finance', {
          tags: { source: 'contractor_payable_paid_email' },
          extra: { contractorPayableId, reason: resolution.reason }
        })
      }

      return `contractor_payable ${contractorPayableId} remittance ${resolution.reason}; skipped`
    }

    const { presentation, engagementProfileId } = resolution

    const recipient = await getProfileNotificationRecipient(engagementProfileId)

    if (!recipient?.email) {
      // No canonical email — the contractor can still download the comprobante in-app.
      captureWithDomain(new Error('contractor has no resolvable email'), 'finance', {
        tags: { source: 'contractor_payable_paid_email' },
        extra: { contractorPayableId, engagementProfileId }
      })

      return `contractor_payable ${contractorPayableId} no recipient email; skipped`
    }

    const pdfBuffer = await generateContractorRemittancePdf(presentation)

    const netRow =
      presentation.breakdown.find(row => row.emphasis) ??
      presentation.breakdown[presentation.breakdown.length - 1]

    const locale = presentation.locale === 'en-US' ? 'en' : 'es'
    const attachmentFilename = `comprobante-pago-${presentation.number}.pdf`

    const sourceEventId =
      typeof payload._eventId === 'string' && payload._eventId.length > 0
        ? payload._eventId
        : `contractor-payable-paid:${contractorPayableId}`

    const result = await sendEmail({
      emailType: 'contractor_remittance_paid',
      domain: 'finance',
      recipients: [
        {
          email: recipient.email,
          ...(recipient.fullName ? { name: recipient.fullName } : {}),
          ...(recipient.userId ? { userId: recipient.userId } : {})
        }
      ],
      context: {
        beneficiaryName: presentation.beneficiary.name,
        remittanceNumber: presentation.number,
        netLabel: netRow?.label ?? 'Pago neto',
        netAmount: netRow?.amount ?? 0,
        netCurrency: netRow?.currency ?? 'CLP',
        paymentDateLabel: presentation.payment.dateLabel,
        paymentDateValue: presentation.payment.dateValue,
        locale,
        attachmentFilename,
        pdfBuffer
      },
      sourceEventId,
      sourceEntity: contractorPayableId
    })

    return `contractor_payable ${contractorPayableId} remittance ${presentation.number} email ${result.status}`
  },
  maxRetries: 3
}

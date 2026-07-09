import 'server-only'

/**
 * TASK-1375 — Reactive consumer: submission del motor (ebook form) → email de respaldo con
 * el link GATED de descarga. GENÉRICO: sirve para CUALQUIER ebook lead magnet — no scoped a
 * un form_id; el gate real (¿es un ebook?) es que el form tenga un `form_asset` activo, y lo
 * decide `sendEbookDeliveryEmail` re-leyendo PG (los forms sin asset son no-op barato).
 *
 * Trigger: `growth.forms.submission_accepted`. Idempotente: re-lee la submission desde PG
 * (NUNCA confía en el payload) + `sourceEventId=ebook_<submissionId>` en la delivery layer +
 * el ledger reactivo (ON CONFLICT por `entityId`). Gateado por `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`
 * (default OFF → sólo descarga on-screen). El email NO adjunta el PDF: lleva el link gated.
 */

import { FORM_SUBMISSION_ACCEPTED_EVENT } from '@/lib/growth/forms/contracts'
import { sendEbookDeliveryEmail } from '@/lib/growth/forms/ebook-delivery'
import type { ProjectionDefinition } from '@/lib/sync/projection-registry'

export const growthEbookDeliveryFromSubmissionProjection: ProjectionDefinition = {
  name: 'growth_ebook_delivery_from_submission',
  description:
    'TASK-1375 — growth.forms.submission_accepted → email de respaldo del ebook (link gated de descarga). Genérico por ebook; no-op si el form no entrega asset o el flag está OFF.',
  domain: 'growth',
  triggerEvents: [FORM_SUBMISSION_ACCEPTED_EVENT],
  extractScope: payload => {
    const submissionId = typeof payload.submissionId === 'string' ? payload.submissionId.trim() : ''

    if (!submissionId) return null

    return { entityType: 'growth_form_submission', entityId: submissionId }
  },
  refresh: async scope => sendEbookDeliveryEmail(scope.entityId),
  maxRetries: 3,
}

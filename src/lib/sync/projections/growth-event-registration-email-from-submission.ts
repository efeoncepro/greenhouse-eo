import 'server-only'

/**
 * 2026-10-24 — Reactive consumer: reserva aceptada de un evento → correo de confirmación (enlace privado de la sala +
 * `.ics`) o de lista de espera. GENÉRICO: el gate real (¿es una reserva de evento con datos del evento?) lo decide
 * `sendEventRegistrationEmail` re-leyendo PG; el resto de los formularios es no-op barato.
 *
 * Trigger: `growth.forms.submission_accepted`. Idempotente: re-lee la submission (nunca confía en el payload) +
 * `sourceEventId=event_reg_<submissionId>` en la capa de entrega + el ledger reactivo. Gateado por
 * `GROWTH_EVENT_EMAILS_ENABLED`.
 */

import { FORM_SUBMISSION_ACCEPTED_EVENT } from '@/lib/growth/forms/contracts'
import { sendEventRegistrationEmail } from '@/lib/growth/forms/event-emails'
import type { ProjectionDefinition } from '@/lib/sync/projection-registry'

export const growthEventRegistrationEmailFromSubmissionProjection: ProjectionDefinition = {
  name: 'growth_event_registration_email_from_submission',
  description:
    'growth.forms.submission_accepted (reserva de evento) → correo de confirmación con enlace y .ics, o de lista de espera. Genérico por evento; no-op si no es una reserva con datos del evento o el flag está OFF.',
  domain: 'growth',
  triggerEvents: [FORM_SUBMISSION_ACCEPTED_EVENT],
  extractScope: payload => {
    const submissionId = typeof payload.submissionId === 'string' ? payload.submissionId.trim() : ''

    if (!submissionId) return null

    return { entityType: 'growth_form_submission', entityId: submissionId }
  },
  refresh: async scope => sendEventRegistrationEmail(scope.entityId),
  maxRetries: 3
}

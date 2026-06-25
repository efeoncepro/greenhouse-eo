/**
 * TASK-1229/1230 — Growth Forms engine: dispatcher de entrega (async, NUNCA inline).
 *
 * La submission se acepta + persiste + emite outbox event en el submit handler; la
 * ENTREGA al destino corre acá, drenada por el ops-worker (Cloud Scheduler), re-leyendo
 * de PG (overlay #3 + CLAUDE.md outbox). Adapters: fake/echo (1229) + HubSpot Forms
 * secure-submit (1230). State machine de at-most-once + retry con backoff+jitter +
 * dead-letter: solo se reintentan fallas RETRYABLES, nunca una submission `delivered`.
 */
import 'server-only'

import { deliverToHubSpotForms, HUBSPOT_FORMS_ADAPTER_KIND } from './destinations/hubspot'
import {
  type FormDestinationRow,
  type FormSubmissionRow,
  getConsentSnapshot,
  insertAttempt,
  listDestinationsForVersion,
  listSubmissionsPendingDispatch,
  updateSubmissionDeliveryState,
} from './store'

/** Tope de reintentos antes de dead-letter (humano interviene). */
const MAX_DELIVERY_ATTEMPTS = 5
const BASE_BACKOFF_SECONDS = 60
const MAX_BACKOFF_SECONDS = 3600

export interface DestinationAdapterResult {
  status: 'succeeded' | 'failed' | 'skipped'
  externalId?: string | null
  httpStatus?: number | null
  errorClass?: string | null
  retryable: boolean
}

/** Adapter fake/echo: registra una entrega exitosa sin llamar a ningún proveedor. */
export const runFakeDestinationAdapter = async (
  submission: FormSubmissionRow,
  destination: FormDestinationRow,
): Promise<DestinationAdapterResult> => ({
  status: 'succeeded',
  externalId: `fake-${destination.provider}-${submission.submission_id}`,
  httpStatus: 200,
  errorClass: null,
  retryable: false,
})

/** Backoff exponencial + jitter (s). Acotado a MAX_BACKOFF_SECONDS. */
const backoffSeconds = (attempts: number): number => {
  const base = Math.min(BASE_BACKOFF_SECONDS * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_SECONDS)

  
return base + Math.floor(Math.random() * 30)
}

export interface DispatchSummary {
  processed: number
  delivered: number
  failed: number
  deadLetter: number
}

/**
 * Drena submissions listas para (re)entrega. Por cada destino habilitado corre el
 * adapter correspondiente, registra un `form_destination_attempt` (status terminal
 * que alimenta el signal dead-letter), y transiciona la submission:
 *   - todos los destinos OK → `delivered`
 *   - alguna falla NO retryable → `dead_letter`
 *   - alguna falla retryable + intentos < MAX → `retrying` + next_attempt_at (backoff)
 *   - intentos >= MAX → `dead_letter`
 *   - todos `skipped` (adapter disabled) → se deja como está (se reintenta al prender)
 */
export const dispatchPendingSubmissions = async (limit = 50): Promise<DispatchSummary> => {
  const pending = await listSubmissionsPendingDispatch(limit)
  let delivered = 0
  let failed = 0
  let deadLetter = 0

  for (const submission of pending) {
    const destinations = (await listDestinationsForVersion(submission.form_version_id)).filter(
      d => d.enabled && d.delivery_mode === 'direct',
    )

    if (destinations.length === 0) {
      // greenhouse_only / sin destino directo: entregada al ledger.
      await updateSubmissionDeliveryState(submission.submission_id, { status: 'delivered', nextAttemptAt: null })
      delivered += 1
      continue
    }

    const consent = await getConsentSnapshot(submission.submission_id)
    const newAttempts = submission.delivery_attempts + 1

    let allSucceeded = true
    let anyDeadLetter = false
    let anyRetrying = false
    let allSkipped = true

    for (const destination of destinations) {
      const result = await runDestinationAdapter(submission, consent, destination)

      if (result.status === 'skipped') {
        allSucceeded = false
        continue
      }

      allSkipped = false

      // Status terminal del attempt (alimenta growth.forms.dead_letter_count).
      let attemptStatus: string

      if (result.status === 'succeeded') {
        attemptStatus = 'succeeded'
      } else if (!result.retryable || newAttempts >= MAX_DELIVERY_ATTEMPTS) {
        attemptStatus = 'dead_letter'
        anyDeadLetter = true
        allSucceeded = false
      } else {
        attemptStatus = 'retrying'
        anyRetrying = true
        allSucceeded = false
      }

      await insertAttempt({
        submissionId: submission.submission_id,
        destinationId: destination.destination_id,
        provider: destination.provider,
        adapterVersion: destination.adapter_version,
        status: attemptStatus,
        externalId: result.externalId ?? null,
        httpStatus: result.httpStatus ?? null,
        errorClass: result.errorClass ?? null,
        retryCount: newAttempts,
      })
    }

    if (allSkipped) {
      // Adapter deshabilitado: no transicionar (se reintenta cuando se prenda el flag).
      continue
    }

    if (allSucceeded) {
      await updateSubmissionDeliveryState(submission.submission_id, { status: 'delivered', nextAttemptAt: null })
      delivered += 1
    } else if (anyDeadLetter) {
      await updateSubmissionDeliveryState(submission.submission_id, {
        status: 'dead_letter',
        deliveryAttempts: newAttempts,
        nextAttemptAt: null,
      })
      deadLetter += 1
    } else if (anyRetrying) {
      const nextAttemptAt = new Date(Date.now() + backoffSeconds(newAttempts) * 1000)

      await updateSubmissionDeliveryState(submission.submission_id, {
        status: 'retrying',
        deliveryAttempts: newAttempts,
        nextAttemptAt,
      })
      failed += 1
    }
  }

  return { processed: pending.length, delivered, failed, deadLetter }
}

/** Rutea al adapter según `adapter_kind`. */
const runDestinationAdapter = async (
  submission: FormSubmissionRow,
  consent: Awaited<ReturnType<typeof getConsentSnapshot>>,
  destination: FormDestinationRow,
): Promise<DestinationAdapterResult> => {
  if (destination.adapter_kind === 'fake_echo') {
    return runFakeDestinationAdapter(submission, destination)
  }

  if (destination.adapter_kind === HUBSPOT_FORMS_ADAPTER_KIND) {
    return deliverToHubSpotForms({ submission, consent, destination })
  }

  return { status: 'failed', errorClass: 'adapter_not_supported', httpStatus: null, retryable: false }
}

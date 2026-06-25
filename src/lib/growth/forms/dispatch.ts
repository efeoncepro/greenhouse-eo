/**
 * TASK-1229 — Growth Forms engine: dispatcher de entrega (async, NUNCA inline).
 *
 * La submission se acepta + persiste + emite outbox event en el submit handler;
 * la ENTREGA al destino corre acá, drenada por el ops-worker (Cloud Scheduler),
 * re-leyendo de PG (overlay #3 + CLAUDE.md outbox). En TASK-1229 el adapter es un
 * fake/echo: el adapter HubSpot real es TASK-1230 y se enchufa por este mismo path.
 */
import 'server-only'

import {
  type FormDestinationRow,
  type FormSubmissionRow,
  insertAttempt,
  listDestinationsForVersion,
  listSubmissionsPendingDispatch,
  updateSubmissionStatus,
} from './store'

export interface DestinationAdapterResult {
  status: 'succeeded' | 'failed'
  externalId?: string | null
  httpStatus?: number | null
  errorClass?: string | null
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
})

export interface DispatchSummary {
  processed: number
  delivered: number
  failed: number
}

/**
 * Drena submissions pendientes de entrega: por cada destino habilitado de su versión
 * corre el adapter (fake en V1), registra un `form_destination_attempt` append-only,
 * y transiciona la submission (`delivered` si todos OK, `destination_failed` si alguno
 * falla). Idempotente a nivel de no perder estado; los retries los maneja TASK-1230.
 */
export const dispatchPendingSubmissions = async (limit = 50): Promise<DispatchSummary> => {
  const pending = await listSubmissionsPendingDispatch(limit)
  let delivered = 0
  let failed = 0

  for (const submission of pending) {
    const destinations = (await listDestinationsForVersion(submission.form_version_id)).filter(
      d => d.enabled && d.delivery_mode === 'direct',
    )

    if (destinations.length === 0) {
      // greenhouse_only / sin destino directo: la submission queda entregada al ledger.
      await updateSubmissionStatus(submission.submission_id, 'delivered')
      delivered += 1
      continue
    }

    let allOk = true

    for (const destination of destinations) {
      const result =
        destination.adapter_kind === 'fake_echo'
          ? await runFakeDestinationAdapter(submission, destination)
          : ({ status: 'failed', errorClass: 'adapter_not_implemented_in_1229', httpStatus: null } as DestinationAdapterResult)

      await insertAttempt({
        submissionId: submission.submission_id,
        destinationId: destination.destination_id,
        provider: destination.provider,
        adapterVersion: destination.adapter_version,
        status: result.status,
        externalId: result.externalId ?? null,
        httpStatus: result.httpStatus ?? null,
        errorClass: result.errorClass ?? null,
      })

      if (result.status !== 'succeeded') allOk = false
    }

    await updateSubmissionStatus(submission.submission_id, allOk ? 'delivered' : 'destination_failed')
    if (allOk) delivered += 1
    else failed += 1
  }

  return { processed: pending.length, delivered, failed }
}

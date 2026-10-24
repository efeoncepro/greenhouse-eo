import 'server-only'

/**
 * TASK-1230 — Growth Forms · HubSpot Forms secure-submit adapter.
 *
 * Entrega una submission ACEPTADA del motor a la HubSpot **Forms** API:
 *   POST https://api.hsforms.com/submissions/v3/integration/secure/submit/{portalId}/{formGuid}
 *
 * Server-side only. Corre en el reactive consumer (ops-worker dispatch), NUNCA inline
 * en el route handler de submit (CLAUDE.md §Integraciones). El browser nunca conoce
 * portalId/formGuid/property names — viven en `form_destination.mapping_json` (server).
 * Reusa el token canónico (`getHubSpotAccessToken`); NUNCA un cliente HubSpot paralelo.
 *
 * Idempotencia: secure-submit NO es idempotente (cada POST crea una submission). El
 * at-most-once exitoso lo garantiza el state machine de `form_destination_attempt`
 * (dispatch): solo se reintentan attempts `failed`/retryables, nunca una `delivered`.
 */
import { isFormsHubSpotSecureSubmitEnabled } from '@/lib/growth/forms/flags'
import type { FormConsentSnapshotRow, FormDestinationRow, FormSubmissionRow } from '@/lib/growth/forms/store'
import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import { createHubSpotFormReceipt, HUBSPOT_SUBMISSION_ID_PROPERTY, type HubSpotFormReceipt } from './receipts'

import type { EnvSource } from '@/types/env-source'

export const HUBSPOT_FORMS_ADAPTER_KIND = 'hubspot_forms_secure_submit' as const
export const HUBSPOT_FORMS_ADAPTER_VERSION = 'hsforms-v3-secure-submit' as const

const HUBSPOT_SECURE_SUBMIT_BASE = 'https://api.hsforms.com/submissions/v3/integration/secure/submit'
const REQUEST_TIMEOUT_MS = 15_000

/** Resultado sanitizado del adapter (sin payloads/tokens/respuestas crudas). */
export interface HubSpotDeliveryResult {
  status: 'succeeded' | 'failed' | 'skipped'
  errorClass?: string
  httpStatus?: number | null
  externalId?: string | null
  providerReceipt?: HubSpotFormReceipt
  /** El dispatch usa esto para decidir retry vs dead-letter. */
  retryable: boolean
}

export interface HubSpotDestinationMapping {
  portalId?: string
  formGuid?: string
  /** greenhouse field key → HubSpot property name. */
  fieldMapping?: Record<string, string>
  /** Texto de consentimiento para legalConsentOptions (HubSpot lo exige). */
  consentText?: string
  /** Technical property installed in the native form; populated only from the server-generated source ID. */
  submissionIdProperty?: string
  /**
   * Suscripciones HubSpot ligadas a casillas explícitas del consentimiento. El publisher
   * resuelve `text` desde la etiqueta publicada: opcionales en formularios comerciales,
   * requeridas sólo cuando suscribirse es el propósito del formulario. Una casilla de procesamiento/comunicaciones NUNCA autoriza
   * publicidad: esto no toca `measurementContext` ni el matching publicitario.
   */
  communications?: HubSpotCommunicationMapping[]
}

/**
 * Consentimiento → subscription type de HubSpot (communication preferences). Dos fuentes:
 *   - `checkboxKey`: una casilla del consentimiento que el visitante marcó.
 *   - `consentBy: 'submission'` (2026-10-24, aprobado por el operador): el acto de suscribirse bajo un aviso visible.
 *     Sólo para presentaciones `inline_pill` de suscripción: la entrada aplica cuando el snapshot guarda el hash del
 *     aviso (`notice_text_hash`), que el servidor escribe únicamente si la versión publicada declara ese aviso.
 */
export type HubSpotCommunicationMapping = {
  /** ID del subscription type en HubSpot (`/communication-preferences/v3/definitions`). */
  subscriptionTypeId: number
  /** Texto exacto que el visitante vio (la casilla o el aviso). */
  text: string
} & ({ /** Key de la casilla en `copy_refs_json.checkboxes`. */ checkboxKey: string; consentBy?: undefined } | { consentBy: 'submission'; checkboxKey?: undefined })

export interface HubSpotCommunicationConsent {
  value: true
  subscriptionTypeId: number
  text: string
}

const isValidCommunication = (entry: unknown): entry is HubSpotCommunicationMapping => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
  const candidate = entry as Record<string, unknown>

  const source =
    candidate.consentBy === 'submission'
      ? candidate.checkboxKey === undefined
      : candidate.consentBy === undefined && typeof candidate.checkboxKey === 'string' && candidate.checkboxKey.trim().length > 0

  return (
    source &&
    typeof candidate.subscriptionTypeId === 'number' &&
    Number.isSafeInteger(candidate.subscriptionTypeId) &&
    candidate.subscriptionTypeId > 0 &&
    typeof candidate.text === 'string' &&
    candidate.text.trim().length > 0
  )
}

/** `true` si el mapping declara `communications` y alguna entrada es inválida. */
export const hasInvalidCommunicationsMapping = (mapping: HubSpotDestinationMapping): boolean =>
  mapping.communications !== undefined &&
  (!Array.isArray(mapping.communications) || !mapping.communications.every(isValidCommunication))

/**
 * Suscripciones a enviar: las casillas declaradas en el destino que el visitante MARCÓ (`checkboxes_json` guarda las
 * keys marcadas) y las de `consentBy: 'submission'` cuando el snapshot prueba que hubo aviso (`notice_text_hash`).
 * Sin casilla marcada, sin aviso o sin declaración → `[]`.
 */
export const resolveHubSpotCommunications = (
  consent: FormConsentSnapshotRow | null,
  mapping: HubSpotDestinationMapping,
): HubSpotCommunicationConsent[] => {
  if (!consent || !Array.isArray(mapping.communications)) return []

  const checked = new Set(
    (Array.isArray(consent.checkboxes_json) ? consent.checkboxes_json : []).filter((key): key is string => typeof key === 'string'),
  )

  const seen = new Set<number>()

  return mapping.communications
    .filter(isValidCommunication)
    .filter(entry => (entry.consentBy === 'submission' ? Boolean(consent.notice_text_hash) : checked.has(entry.checkboxKey)))
    .filter(entry => (seen.has(entry.subscriptionTypeId) ? false : (seen.add(entry.subscriptionTypeId), true)))
    .map(entry => ({ value: true as const, subscriptionTypeId: entry.subscriptionTypeId, text: entry.text }))
}

const asMapping = (raw: unknown): HubSpotDestinationMapping =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as HubSpotDestinationMapping) : {}

/** Clasifica el HTTP status en una clase de error sanitizada + si es retryable. */
const classify = (httpStatus: number): { errorClass: string; retryable: boolean } => {
  if (httpStatus === 400) return { errorClass: 'validation_error', retryable: false } // payload/mapping malo: reintentar no ayuda
  if (httpStatus === 401 || httpStatus === 403) return { errorClass: 'auth_error', retryable: false } // token/scope `forms`
  if (httpStatus === 404) return { errorClass: 'form_not_found', retryable: false } // portalId/formGuid inválido
  if (httpStatus === 429) return { errorClass: 'rate_limited', retryable: true }
  if (httpStatus >= 500) return { errorClass: 'hubspot_server_error', retryable: true }

  return { errorClass: 'hubspot_unexpected', retryable: false }
}

/**
 * Construye el body de secure-submit desde la submission + consent + mapping. El
 * mapping (server-side) define portalId/formGuid + los HubSpot property names; solo
 * se envían campos allowlisteados en `fieldMapping`.
 */
export const buildSecureSubmitBody = (
  submission: FormSubmissionRow,
  consent: FormConsentSnapshotRow | null,
  mapping: HubSpotDestinationMapping,
): Record<string, unknown> => {
  const values =
    submission.normalized_fields_json && typeof submission.normalized_fields_json === 'object'
      ? (submission.normalized_fields_json as Record<string, unknown>)
      : {}

  const fieldMapping = mapping.fieldMapping ?? {}

  const fields = Object.entries(fieldMapping)
    .filter(([, hsName]) => hsName !== HUBSPOT_SUBMISSION_ID_PROPERTY)
    .filter(([ghKey]) => values[ghKey] !== undefined && values[ghKey] !== null)
    .map(([ghKey, hsName]) => ({ name: hsName, value: String(values[ghKey]) }))

  const receipt = createHubSpotFormReceipt(mapping, submission.submission_id)

  if (receipt) fields.push({ name: receipt.markerProperty, value: receipt.markerValue })

  const body: Record<string, unknown> = {
    fields,
    context: {
      ...(submission.page_uri ? { pageUri: submission.page_uri } : {}),
      ...(submission.page_name ? { pageName: submission.page_name } : {}),
    },
  }

  if (consent) {
    body.legalConsentOptions = {
      consent: {
        consentToProcess: true,
        text: mapping.consentText ?? `Consentimiento otorgado (policy ${consent.consent_policy_version}).`,
        communications: resolveHubSpotCommunications(consent, mapping),
      },
    }
  }

  return body
}

export interface DeliverInput {
  submission: FormSubmissionRow
  consent: FormConsentSnapshotRow | null
  destination: FormDestinationRow
  env?: EnvSource
}

/**
 * Entrega la submission a HubSpot Forms. Gated por `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED`
 * (OFF → `skipped`, sin llamar a HubSpot). No lanza para errores esperados — los
 * devuelve clasificados; el dispatch decide retry/dead-letter.
 */
export const deliverToHubSpotForms = async (input: DeliverInput): Promise<HubSpotDeliveryResult> => {
  const env = input.env ?? process.env

  if (!isFormsHubSpotSecureSubmitEnabled(env)) {
    return { status: 'skipped', errorClass: 'hubspot_adapter_disabled', retryable: true }
  }

  if (input.destination.provider !== 'hubspot' || input.destination.adapter_kind !== HUBSPOT_FORMS_ADAPTER_KIND) {
    return { status: 'failed', errorClass: 'hubspot_destination_mismatch', retryable: false, httpStatus: null }
  }

  const mapping = asMapping(input.destination.mapping_json)

  if (!mapping.portalId || !mapping.formGuid) {
    return { status: 'failed', errorClass: 'mapping_incomplete', retryable: false, httpStatus: null }
  }

  const body = buildSecureSubmitBody(input.submission, input.consent, mapping)
  const providerReceipt = createHubSpotFormReceipt(mapping, input.submission.submission_id)

  if (mapping.submissionIdProperty !== undefined && !providerReceipt) {
    return { status: 'failed', errorClass: 'invalid_submission_id_mapping', retryable: false, httpStatus: null }
  }

  // Declaración server-side mal formada: fallar ANTES del POST no idempotente, en vez de entregar
  // el lead perdiendo en silencio una suscripción que el visitante pidió.
  if (hasInvalidCommunicationsMapping(mapping)) {
    return { status: 'failed', errorClass: 'invalid_communications_mapping', retryable: false, httpStatus: null }
  }

  if (!Array.isArray(body.fields) || !(body.fields as Array<{ name: string }>).some(field => field.name !== HUBSPOT_SUBMISSION_ID_PROPERTY)) {
    return { status: 'failed', errorClass: 'empty_field_mapping', retryable: false, httpStatus: null }
  }

  let token: string

  try {
    token = await getHubSpotAccessToken(env)
  } catch {
    // Token no configurado: no es un fallo del payload — retryable (config/secret).
    return { status: 'failed', errorClass: 'token_unavailable', retryable: true, httpStatus: null }
  }

  const url = `${HUBSPOT_SECURE_SUBMIT_BASE}/${mapping.portalId}/${mapping.formGuid}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (response.ok) {
      return {
        status: 'succeeded',
        httpStatus: response.status,
        externalId: `hsforms-${input.submission.submission_id}`,
        ...(providerReceipt ? { providerReceipt } : {}),
        retryable: false,
      }
    }

    const { errorClass, retryable } = classify(response.status)

    return { status: 'failed', errorClass, retryable, httpStatus: response.status }
  } catch (error) {
    // Timeout / red: retryable. NUNCA persistir el error crudo (puede traer payload).
    const isAbort = error instanceof Error && error.name === 'TimeoutError'

    return { status: 'failed', errorClass: isAbort ? 'timeout' : 'network_error', retryable: true, httpStatus: null }
  }
}

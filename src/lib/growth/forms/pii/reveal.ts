import 'server-only'

/**
 * TASK-1255 — Reveal gobernado de PII de un lead (Slice 3). Replica el patrón
 * person-legal-profile (TASK-784): masked por default, reveal con capability +
 * reason + audit append-only + outbox.
 *
 * El caller (route/MCP/Nexa) DEBE validar la capability `growth.forms.lead_pii.reveal`
 * ANTES de invocar — defense in depth a nivel route. Este helper NO chequea authz
 * adentro, pero EXIGE `reason` (≥ N chars) y SIEMPRE escribe el audit + outbox en una
 * transacción: no hay reveal sin rastro.
 */
import { z } from 'zod'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { FORM_LEAD_PII_REVEALED_EVENT, FORM_SUBMISSION_AGGREGATE, fieldDefinitionSchema } from '../contracts'
import { getFormVersionById, getSubmissionById } from '../store'

import { writeLeadPiiRevealAuditEntry } from './audit'
import { resolvePiiClass } from './classify'
import { decryptNationalId } from './encryption'
import { GrowthFormsPiiError } from './errors'
import { isEncryptedFieldEnvelope, type PiiFieldClass } from './types'

/** Largo mínimo de la razón de reveal (PII regulada → más estricto que identity ≥5). */
export const MIN_REVEAL_REASON_LENGTH = 10

export interface RevealSubmissionPiiInput {
  submissionId: string
  fieldKey: string
  actorUserId: string
  actorEmail?: string | null
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface RevealSubmissionPiiResult {
  submissionId: string
  fieldKey: string
  piiClass: PiiFieldClass
  /** Valor en claro (descifrado si national_id). */
  value: string
  auditId: string
  eventId: string
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

export const revealSubmissionPiiField = async (
  input: RevealSubmissionPiiInput,
): Promise<RevealSubmissionPiiResult> => {
  if (!input.actorUserId) throw new GrowthFormsPiiError('actorUserId requerido', 'reason_required', 400)

  if (!input.reason || input.reason.trim().length < MIN_REVEAL_REASON_LENGTH) {
    throw new GrowthFormsPiiError(
      `La razón del reveal debe tener al menos ${MIN_REVEAL_REASON_LENGTH} caracteres (requerida para audit).`,
      'reason_required',
      400,
    )
  }

  const submission = await getSubmissionById(input.submissionId)

  if (!submission) {
    throw new GrowthFormsPiiError(`Submission ${input.submissionId} no existe`, 'submission_not_found', 404)
  }

  const version = await getFormVersionById(submission.form_version_id)
  const parsed = version ? z.array(fieldDefinitionSchema).safeParse(version.field_schema_json) : null
  const field = parsed && parsed.success ? parsed.data.find(f => f.key === input.fieldKey) : undefined

  if (!field) {
    throw new GrowthFormsPiiError(`Campo ${input.fieldKey} no es revelable`, 'field_not_revealable', 404)
  }

  const piiClass = resolvePiiClass(field)
  const normalized = asRecord(submission.normalized_fields_json)
  const encrypted = asRecord(submission.encrypted_fields_json)

  // Resolver el valor en claro según la clase PII. non_pii NO se revela (el masked-reader
  // ya lo muestra en claro — no hay nada oculto que justifique audit).
  let value: string | null = null

  if (piiClass === 'national_id') {
    const envelope = encrypted[input.fieldKey]

    if (isEncryptedFieldEnvelope(envelope)) {
      value = await decryptNationalId(envelope)
    } else {
      // Legacy/flag-OFF: cédula en claro en el blob.
      const raw = normalized[input.fieldKey]

      value = typeof raw === 'string' ? raw : null
    }
  } else if (piiClass === 'email' || piiClass === 'phone' || piiClass === 'contact') {
    const raw = normalized[input.fieldKey]

    value = raw === null || raw === undefined ? null : String(raw)
  }

  if (value === null) {
    throw new GrowthFormsPiiError(`Campo ${input.fieldKey} no es revelable`, 'field_not_revealable', 404)
  }

  // Audit + outbox en UNA transacción: no hay reveal sin rastro.
  const { auditId, eventId } = await withTransaction(async client => {
    const auditId = await writeLeadPiiRevealAuditEntry(client, {
      submissionId: submission.submission_id,
      formId: submission.form_id,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail ?? null,
      reason: input.reason.trim(),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      revealedField: input.fieldKey,
      piiClass,
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: FORM_SUBMISSION_AGGREGATE,
        aggregateId: submission.submission_id,
        eventType: FORM_LEAD_PII_REVEALED_EVENT,
        payload: {
          submissionId: submission.submission_id,
          formId: submission.form_id,
          revealedField: input.fieldKey,
          piiClass,
          actorUserId: input.actorUserId,
          reason: input.reason.trim(),
        },
      },
      client,
    )

    return { auditId, eventId }
  })

  return { submissionId: submission.submission_id, fieldKey: input.fieldKey, piiClass, value, auditId, eventId }
}

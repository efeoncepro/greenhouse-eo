import 'server-only'

/**
 * TASK-1255 — Lectura masked-por-default de un lead (Slice 1).
 *
 * Primitive canónico (Full API Parity): un masked-reader que cockpit (TASK-1256),
 * Nexa y MCP consumen igual. El default SIEMPRE es enmascarado; el valor full de
 * la cédula sólo se obtiene por el reveal gobernado (`pii/reveal.ts`).
 *
 * national_id se resuelve cruzando la submission con el `field_schema_json` de su
 * `form_version` (el blob no es self-describing). Soporta ambos estados:
 *  - cifrado ON: el valor vive en `encrypted_fields_json[key]` (envelope) → usa el
 *    `mask` precomputado (NO descifra).
 *  - legacy/OFF: la cédula sigue en claro en `normalized_fields_json[key]` → la
 *    enmascara en la capa de lectura.
 */
import { z } from 'zod'

import { fieldDefinitionSchema, type FieldDefinition } from '../contracts'
import { getFormVersionById, getSubmissionById } from '../store'

import { resolveFieldCountry, resolvePiiClass } from './classify'
import { maskEmail, maskNationalId, maskPhone } from './mask'
import { isEncryptedFieldEnvelope, type MaskedLeadField, type MaskedLeadView } from './types'

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const asDisplayString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim() === '' ? null : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.length === 0 ? null : value.map(String).join(', ')

  return null
}

const buildMaskedField = (
  field: FieldDefinition,
  normalized: Record<string, unknown>,
  encrypted: Record<string, unknown>,
): MaskedLeadField => {
  const piiClass = resolvePiiClass(field)

  const base = {
    key: field.key,
    label: field.label ?? null,
    type: field.type,
    piiClass,
  }

  if (piiClass === 'national_id') {
    const envelope = encrypted[field.key]

    if (isEncryptedFieldEnvelope(envelope)) {
      // Cifrado ON: máscara precomputada, sin descifrar.
      return { ...base, maskedValue: envelope.mask, isEncrypted: true, isRevealable: true }
    }

    // Legacy/OFF: cédula en claro en el blob → enmascarar en lectura.
    const raw = asDisplayString(normalized[field.key])

    return {
      ...base,
      maskedValue: raw ? maskNationalId(raw, resolveFieldCountry(field)) : null,
      isEncrypted: false,
      isRevealable: Boolean(raw),
    }
  }

  if (piiClass === 'email') {
    const raw = asDisplayString(normalized[field.key])

    return { ...base, maskedValue: raw ? maskEmail(raw) : null, isEncrypted: false, isRevealable: Boolean(raw) }
  }

  if (piiClass === 'phone') {
    const raw = asDisplayString(normalized[field.key])

    return { ...base, maskedValue: raw ? maskPhone(raw) : null, isEncrypted: false, isRevealable: Boolean(raw) }
  }

  // non_pii: valor en claro (company, select, etc.). No revelable (no hay nada oculto).
  return { ...base, maskedValue: asDisplayString(normalized[field.key]), isEncrypted: false, isRevealable: false }
}

/**
 * Devuelve la vista enmascarada de un lead, o `null` si la submission no existe.
 * Si el `field_schema_json` no parsea (form legacy/corrupto), degrada honesto: no
 * proyecta valores crudos — devuelve sólo el shell sin campos.
 */
export const getSubmissionLeadMasked = async (submissionId: string): Promise<MaskedLeadView | null> => {
  const submission = await getSubmissionById(submissionId)

  if (!submission) return null

  const normalized = asRecord(submission.normalized_fields_json)
  const encrypted = asRecord(submission.encrypted_fields_json)

  const version = await getFormVersionById(submission.form_version_id)
  const parsed = version ? z.array(fieldDefinitionSchema).safeParse(version.field_schema_json) : null

  const fields: MaskedLeadField[] =
    parsed && parsed.success ? parsed.data.map(field => buildMaskedField(field, normalized, encrypted)) : []

  return {
    submissionId: submission.submission_id,
    formId: submission.form_id,
    formVersionId: submission.form_version_id,
    fields,
    createdAt: submission.created_at.toISOString(),
  }
}

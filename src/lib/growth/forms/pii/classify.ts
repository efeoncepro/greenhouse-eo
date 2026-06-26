/**
 * TASK-1255 — Clasificación PII efectiva de los campos de un form (browser-safe, puro).
 *
 * Deriva la `PiiFieldClass` desde el `FieldDefinition` (TASK-1253 `FIELD_TYPES`).
 * El blob `normalized_fields_json` NO es self-describing (sólo `fieldKey → value`),
 * así que "qué campo es national_id" se resuelve cruzando la submission con el
 * `field_schema_json` de su `form_version` (esta función).
 */
import type { FieldDefinition } from '../contracts'

import type { PiiFieldClass } from './types'

/** País por default para national_id cuando el campo no declara `validatorParams.country`. */
export const DEFAULT_NATIONAL_ID_COUNTRY = 'CL'

/** Clase PII de un campo individual. */
export const resolvePiiClass = (field: Pick<FieldDefinition, 'type'>): PiiFieldClass => {
  switch (field.type) {
    case 'national_id':
      return 'national_id'
    case 'email':
      return 'email'
    case 'tel':
      return 'phone'
    default:
      return 'non_pii'
  }
}

/** País ISO alpha-2 de un campo national_id (default `CL`). */
export const resolveFieldCountry = (field: Pick<FieldDefinition, 'validatorParams'>): string =>
  (field.validatorParams?.country || DEFAULT_NATIONAL_ID_COUNTRY).trim().toUpperCase()

/**
 * Agrupa las keys de campos por clase PII. Lo consume el split de cifrado
 * (national_id) y el masked-reader (email/phone/national_id).
 */
export interface PiiFieldKeyGroups {
  nationalId: { key: string; country: string }[]
  email: string[]
  phone: string[]
}

export const resolvePiiFieldKeys = (fields: FieldDefinition[]): PiiFieldKeyGroups => {
  const groups: PiiFieldKeyGroups = { nationalId: [], email: [], phone: [] }

  for (const field of fields) {
    const piiClass = resolvePiiClass(field)

    if (piiClass === 'national_id') {
      groups.nationalId.push({ key: field.key, country: resolveFieldCountry(field) })
    } else if (piiClass === 'email') {
      groups.email.push(field.key)
    } else if (piiClass === 'phone') {
      groups.phone.push(field.key)
    }
  }

  return groups
}

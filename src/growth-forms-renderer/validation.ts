/**
 * TASK-1231 / TASK-1253 — Growth Forms portable renderer · validación cliente (UX, no autoridad).
 *
 * El backend es la autoridad (Arch §20: `submitForm` re-valida con el MISMO registry).
 * Esta capa es solo UX: piso `forms-ux` validation timing 3-stage. SIEMPRE valida el
 * valor **crudo** (no el display enmascarado).
 *
 * TASK-1253: el formato/normalización lo decide el **validator registry canónico**
 * (`@/lib/growth/forms/validators/core`, core puro isomórfico) — la misma fuente de
 * verdad que el servidor. Paridad por construcción: aquí solo se mapea el `reasonCode`
 * a la copy es-CL/en-US del renderer. El empty/required (condicional) + maxLength + el
 * caso consent quedan en esta capa.
 */
import {
  validateFieldValue,
  type FormValidatorReasonCode,
} from '@/lib/growth/forms/validators/core'

import type { RendererFieldDefinition } from './contract'
import { isFieldRequired, type FieldValues } from './conditions'
import type { RendererSystemCopy } from './copy'

/** Mapea el reasonCode del registry canónico al mensaje es-CL/en-US del renderer. */
const reasonToMessage = (reason: FormValidatorReasonCode, copy: RendererSystemCopy): string => {
  switch (reason) {
    case 'email_format':
      return copy.errors.email
    case 'email_not_corporate':
      return copy.errors.corporate
    case 'email_disposable':
      return copy.errors.disposable
    case 'phone_format':
      return copy.errors.tel
    case 'url_format':
      return copy.errors.url
    case 'number_format':
      return copy.errors.number
    case 'date_format':
      return copy.errors.date
    case 'national_id_format':
    case 'national_id_check_digit':
      return copy.errors.nationalId
    case 'consent_required':
      return copy.errors.consentRequired
    case 'field_required':
    case 'national_id_required':
    default:
      return copy.errors.required
  }
}

const asString = (value: FieldValues[string] | undefined): string => {
  if (Array.isArray(value)) return value.join(',')
  if (typeof value === 'boolean') return value ? 'true' : ''

  return value ?? ''
}

const isEmpty = (value: FieldValues[string] | undefined): boolean => {
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'boolean') return value === false

  return (value ?? '').trim() === ''
}

/**
 * Valida un único campo contra el estado actual. Devuelve el mensaje de error es-CL
 * (o null si pasa). Recibe el valor CRUDO ya despojado de máscara.
 */
export const validateField = (
  field: RendererFieldDefinition,
  values: FieldValues,
  copy: RendererSystemCopy,
): string | null => {
  const raw = values[field.key]
  const required = isFieldRequired(field, values)

  // Consent: marcado = ok; sin marcar = mensaje específico de consentimiento (no el genérico).
  if (field.type === 'consent') {
    if (raw === true || raw === 'true') return null

    return required ? copy.errors.consentRequired : null
  }

  if (isEmpty(raw)) {
    return required ? copy.errors.required : null
  }

  const value = asString(raw)

  // Formato + normalización vía registry canónico compartido con el servidor
  // (paridad). Valida el valor CRUDO. `text`/`textarea`/`select`/etc. → validador
  // `text` (passthrough), igual que el comportamiento previo (sin chequeo de formato).
  const result = validateFieldValue(field, value)

  if (!result.valid && result.reasonCode) {
    return reasonToMessage(result.reasonCode, copy)
  }

  if (field.maxLength && value.length > field.maxLength) {
    return copy.errors.maxLength(field.maxLength)
  }

  return null
}

export type FieldErrors = Record<string, string>

/** Valida solo los campos visibles del subconjunto dado (p.ej. los del paso actual). */
export const validateFields = (
  fields: RendererFieldDefinition[],
  values: FieldValues,
  copy: RendererSystemCopy,
): FieldErrors => {
  const errors: FieldErrors = {}

  for (const field of fields) {
    if (field.type === 'hidden') continue
    const error = validateField(field, values, copy)

    if (error) errors[field.key] = error
  }

  return errors
}

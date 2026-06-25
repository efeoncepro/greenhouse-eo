/**
 * TASK-1231 — Growth Forms portable renderer · validación cliente (UX, no autoridad).
 *
 * El backend es la autoridad (Arch §20: re-valida y re-evalúa condiciones en submit).
 * Esta capa es solo UX: piso `forms-ux` validation timing 3-stage. SIEMPRE valida el
 * valor **crudo** (no el display enmascarado).
 */
import type { RendererFieldDefinition } from './contract'
import { isFieldRequired, type FieldValues } from './conditions'
import type { RendererSystemCopy } from './copy'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Teléfono CL crudo: +56 + 9 dígitos (móvil/fijo); tolerante a 8-9 dígitos.
const PHONE_CL_RE = /^\+?56\d{8,9}$/
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i

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

  switch (field.type) {
    case 'email':
      return EMAIL_RE.test(value) ? null : copy.errors.email
    case 'tel':
      return PHONE_CL_RE.test(value.replace(/\s/g, '')) ? null : copy.errors.tel
    case 'url':
      return URL_RE.test(value) ? null : copy.errors.url
    case 'number':
      return Number.isFinite(Number(value)) ? null : copy.errors.number
    default:
      break
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
